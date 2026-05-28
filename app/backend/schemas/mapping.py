"""字段映射阶段的数据结构定义。

三态识别：identified（已识别）、pending（待确认）、unrecognized（未识别）
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class MappingStatus(str, Enum):
    IDENTIFIED = "identified"
    PENDING = "pending"
    UNRECOGNIZED = "unrecognized"


# 系统内部标准字段列表（按设计文档第 16.1 节）
STANDARD_FIELDS: list[str] = [
    "time",
    "node_id",
    "node_name",
    "node_type",
    "upstream_node_id",
    "downstream_node_id",
    "sku",
    "inventory",
    "lead_time",
    "delivery_delay",
    "order_qty",
    "delivery_qty",
    "risk_flag",
    "region",
]

# 开始分析前必须满足的关键字段（设计文档第 19.5 节）
REQUIRED_FIELDS: list[str] = [
    "time",
    "node_id",
    "node_name",
    "node_type",
    "risk_metric",
]


@dataclass
class FieldMapping:
    """单列的映射结果。"""
    original_column: str
    mapped_field: str = ""
    status: MappingStatus = MappingStatus.UNRECOGNIZED
    sample_values: list = field(default_factory=list)
    node_id: Optional[str] = None          # 当此列被识别为节点 ID 列时
    confidence: float = 0.0                # 识别置信度 0.0—1.0


@dataclass
class MappingResult:
    """整份文件的字段映射结果。"""
    file_name: str
    sheet_name: str = ""
    source_type: str = ""                  # "csv" | "excel"
    role: str = ""                         # "fact_table" | "node_table" | "edge_table" | "metadata_table"
    mappings: list[FieldMapping] = field(default_factory=list)
    metric_name: str = ""                  # 从文件名提取的指标名称（事实表用）
    warnings: list[dict] = field(default_factory=list)
    unmet_requirements: list[str] = field(default_factory=list)
    can_start_analysis: bool = False
    melted_data: list[dict] = field(default_factory=list)  # fact_table melt 后的长表数据
    node_data: list[dict] = field(default_factory=list)     # node_table 标准化数据
    edge_data: list[dict] = field(default_factory=list)     # edge_table 标准化数据
