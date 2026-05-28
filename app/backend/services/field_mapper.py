"""字段映射 + 宽表 melt + 三态识别。

第一个实现的后端模块（按设计文档第 27.5 节开发顺序）。
接收 excel_adapter 的整个输出 dict，内部自己取需要的字段。

核心职责：
1. 将原始列名映射到系统标准字段（三态：identified / pending / unrecognized）
2. 对事实表（宽表）：识别日期列 → melt 为长表
3. 对节点表/边表：映射列 + 校验
4. 收集所有 warnings，不静默处理
"""

import re
from datetime import datetime
from typing import Optional

import pandas as pd

from schemas.mapping import (
    STANDARD_FIELDS,
    REQUIRED_FIELDS,
    FieldMapping,
    MappingResult,
    MappingStatus,
)
from utils.error_utils import WarningCollector, ErrorLevel


# ── 标准字段的关键词别名（用于高置信匹配）──────────────────────────
# 顺序敏感：越靠前的别名置信度越高
FIELD_ALIASES: dict[str, list[str]] = {
    "time": [
        "date", "日期", "时间", "time", "datetime", "timestamp", "dt",
        "invoicedate", "订单日期", "出货日期",
    ],
    "node_id": [
        "node_id", "节点id", "节点编码", "node", "节点", "id",
        "编码", "code", "stockcode",
    ],
    "node_name": [
        "node_name", "节点名称", "名称", "name", "名字", "品名",
    ],
    "node_type": [
        "node_type", "节点类型", "类型", "type", "category", "类别",
    ],
    "upstream_node_id": [
        "upstream", "上游", "上游节点", "supplier", "供应商",
        "from_node", "来源", "source", "node1",
    ],
    "downstream_node_id": [
        "downstream", "下游", "下游节点", "customer", "客户",
        "to_node", "目标", "target", "node2",
    ],
    "sku": [
        "sku", "物料", "物料编码", "product", "产品", "material",
        "item", "stock_code", "stockcode",
    ],
    "inventory": [
        "inventory", "库存", "库存量", "stock", "inventory_qty",
        "库存数量", "stock_qty",
    ],
    "lead_time": [
        "lead_time", "交期", "提前期", "leadtime", "lt", "lead",
    ],
    "delivery_delay": [
        "delivery_delay", "延迟", "交期偏差", "到货偏差", "delay",
        "偏差", "交付延迟", "延期",
    ],
    "order_qty": [
        "order_qty", "订单量", "订单数量", "order", "订购量",
    ],
    "delivery_qty": [
        "delivery_qty", "交付量", "交付数量", "delivery", "delivered",
        "出货量", "发货量",
    ],
    "risk_flag": [
        "risk_flag", "风险标记", "延迟标记", "异常", "flag", "风险",
    ],
    "region": [
        "region", "区域", "地区", "地点", "location", "site",
        "plant", "工厂", "country", "国家", "storage", "仓库",
    ],
}

# 歧义字段：即使匹配上也只能设为 pending（设计文档第 16.4 节）
AMBIGUOUS_ALIASES: dict[str, list[str]] = {
    "数量": ["order_qty", "delivery_qty", "inventory"],
    "日期": ["time"],
    "状态": ["risk_flag", "node_type"],
    "类型": ["node_type", "sku"],
}

# 日期列识别：列名匹配 + 值模式验证
DATE_PATTERNS = [
    re.compile(r"^\d{4}-\d{2}-\d{2}"),           # 2023-01-01
    re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}"),  # 2023-01-01 00:00:00
    re.compile(r"^\d{4}/\d{2}/\d{2}"),           # 2023/01/01
    re.compile(r"^\d{2}/\d{2}/\d{4}"),           # 01/01/2023
]

# 节点编码模式：用于在宽表中识别产品节点列
NODE_ID_PATTERN = re.compile(
    r"^[A-Z]{2,6}\d{2,4}[A-Z]\d{2,4}[A-Z]{0,3}$",  # 如 SOS008L02P
)

# 去重后缀模式：pandas 自动加的 .1 后缀
DEDUP_SUFFIX = re.compile(r"^(.*)\.(\d+)$")


class FieldMapper:
    """字段映射器。

    接收 excel_adapter 的整个输出 dict，内部自己取需要的字段。
    字段取不到时报错，不使用默认值。

    用法:
        mapper = FieldMapper(known_nodes=["SOS008L02P", ...])
        result = mapper.process(adapter_output)
    """

    def __init__(self, known_nodes: Optional[list[str]] = None):
        """
        Args:
            known_nodes: 已知的节点编码列表（用于校验列名是否为节点 ID）。
                         可以来自 Nodes.csv，后续通过 data_merger 传入。
        """
        self.known_nodes: set[str] = set(known_nodes) if known_nodes else set()
        self.warnings = WarningCollector()

    # ── 主入口 ──────────────────────────────────────────────

    def process(self, adapter_output: dict) -> MappingResult:
        """主处理流程。

        Args:
            adapter_output: excel_adapter 的输出 dict，必须包含:
                - file_name: str
                - file_type: str
                - role: str
                - columns: list[str]
                - sample_values: list[list] (前 5 行样例)
                - data: list[list] 或 pandas DataFrame（全部数据）

        Returns:
            MappingResult: 包含映射结果、melt 后的数据、warnings
        """
        self.warnings = WarningCollector()

        # 取必要字段，取不到直接报错
        file_name = self._require(adapter_output, "file_name")
        file_type = self._require(adapter_output, "file_type", "csv")
        role = self._require(adapter_output, "role", "fact_table")
        columns = self._require(adapter_output, "columns")
        sample_values = self._require(adapter_output, "sample_values", [])
        all_data = adapter_output.get("data", [])

        # 构建列名 → 样例值的映射
        col_samples = self._build_samples(columns, sample_values)

        result = MappingResult(
            file_name=file_name,
            sheet_name=adapter_output.get("sheet_name", ""),
            source_type=file_type,
            role=role,
        )

        # 按角色分派处理
        if role == "fact_table":
            self._process_fact_table(result, columns, col_samples, all_data)
        elif role == "node_table":
            self._process_node_table(result, columns, col_samples, all_data)
        elif role == "edge_table":
            self._process_edge_table(result, columns, col_samples, all_data)
        else:
            self._process_generic(result, columns, col_samples)

        # 汇总 warnings
        result.warnings = self.warnings.to_list()

        # 检查必填字段（按角色区分）
        mapped_fields = {m.mapped_field for m in result.mappings if m.status == MappingStatus.IDENTIFIED}
        result.unmet_requirements = self._check_requirements(role, mapped_fields, result.metric_name)
        result.can_start_analysis = len(result.unmet_requirements) == 0

        return result

    # ── 角色分发 ────────────────────────────────────────────

    def _process_fact_table(
        self, result: MappingResult, columns: list[str],
        col_samples: dict, all_data
    ):
        """处理事实表（宽表）：识别日期列 → melt 余下列为 node_id。"""
        result.metric_name = self._extract_metric_name(result.file_name)

        date_col = self._detect_date_column(columns, col_samples)

        for col in columns:
            mapping = FieldMapping(original_column=col, sample_values=col_samples.get(col, []))
            if col == date_col:
                mapping.mapped_field = "time"
                mapping.status = MappingStatus.IDENTIFIED
                mapping.confidence = 0.95
            else:
                self._classify_fact_column(col, mapping)
            result.mappings.append(mapping)

        self._check_duplicate_columns(columns)

        # 执行 melt：将宽表转为长表
        if date_col and all_data is not None and len(all_data) > 0:
            result.melted_data = self._melt_fact_table(
                columns, date_col, result.metric_name, result.file_name, all_data
            )

    def _process_node_table(
        self, result: MappingResult, columns: list[str],
        col_samples: dict, all_data
    ):
        """处理节点表：逐列映射到标准字段 + 产出标准化节点数据。"""
        for col in columns:
            mapping = FieldMapping(original_column=col, sample_values=col_samples.get(col, []))
            matched_field, confidence = self._match_column_to_field(col)

            if confidence >= 0.8:
                mapping.mapped_field = matched_field
                mapping.status = MappingStatus.IDENTIFIED
                mapping.confidence = confidence
            elif confidence >= 0.4:
                mapping.mapped_field = matched_field
                mapping.status = MappingStatus.PENDING
                mapping.confidence = confidence
                self.warnings.add_warning(
                    type="pending_field",
                    message=f"字段「{col}」暂映射为 {matched_field}，置信度较低，请确认。",
                    column=col,
                    suggestion=f"请确认「{col}」是否对应标准字段「{matched_field}」。",
                )
            else:
                mapping.mapped_field = ""
                mapping.status = MappingStatus.UNRECOGNIZED
                mapping.confidence = 0.0
                self.warnings.add_warning(
                    type="unrecognized_field",
                    message=f"字段「{col}」无法自动识别，请手动指定。",
                    column=col,
                    suggestion=f"请为「{col}」选择一个标准字段，或标记为「不参与分析」。",
                )

            if self._is_ambiguous(col):
                mapping.status = MappingStatus.PENDING
                mapping.confidence = min(mapping.confidence, 0.5)
                self.warnings.add_warning(
                    type="ambiguous_field",
                    message=f"字段「{col}」存在歧义，可能对应多个标准字段，请确认。",
                    column=col,
                )

            result.mappings.append(mapping)

        # 产出标准化节点数据
        if all_data is not None and len(all_data) > 0:
            result.node_data = self._extract_node_data(columns, result.mappings, all_data)

    def _process_edge_table(
        self, result: MappingResult, columns: list[str],
        col_samples: dict, all_data
    ):
        """处理边表：识别 node1/node2/relation_type，不假设方向。"""
        for col in columns:
            mapping = FieldMapping(original_column=col, sample_values=col_samples.get(col, []))
            matched_field, confidence = self._match_column_to_field(col)

            if confidence >= 0.8:
                mapping.mapped_field = matched_field
                mapping.status = MappingStatus.IDENTIFIED
                mapping.confidence = confidence
            elif confidence >= 0.4:
                mapping.mapped_field = matched_field
                mapping.status = MappingStatus.PENDING
                mapping.confidence = confidence
                self.warnings.add_warning(
                    type="pending_field",
                    message=f"边表字段「{col}」暂映射为 {matched_field}，请确认。",
                    column=col,
                )
            else:
                mapping.mapped_field = ""
                mapping.status = MappingStatus.UNRECOGNIZED
                mapping.confidence = 0.0

            result.mappings.append(mapping)

        mapped = {m.mapped_field for m in result.mappings if m.status == MappingStatus.IDENTIFIED}
        if "upstream_node_id" not in mapped and "downstream_node_id" not in mapped:
            self.warnings.add_warning(
                type="edge_missing_nodes",
                message="边表缺少明确的上下游节点列，将保留 relation_type 但不假设方向。",
            )

        # 产出标准化边数据
        if all_data is not None and len(all_data) > 0:
            result.edge_data = self._extract_edge_data(columns, result.mappings, all_data)

    def _process_generic(
        self, result: MappingResult, columns: list[str], col_samples: dict
    ):
        """处理未识别角色的文件：尽力映射。"""
        for col in columns:
            mapping = FieldMapping(original_column=col, sample_values=col_samples.get(col, []))
            matched_field, confidence = self._match_column_to_field(col)

            if confidence >= 0.6:
                mapping.mapped_field = matched_field
                mapping.status = MappingStatus.PENDING
                mapping.confidence = confidence
            else:
                mapping.status = MappingStatus.UNRECOGNIZED

            result.mappings.append(mapping)

        self.warnings.add_warning(
            type="unknown_role",
            message=f"文件角色未明确识别，字段映射结果仅供参考。",
        )

    # ── 列匹配逻辑 ──────────────────────────────────────────

    def _match_column_to_field(self, column: str) -> tuple[str, float]:
        """将原始列名匹配到标准字段。

        Returns:
            (standard_field, confidence): 标准字段名和置信度 0.0—1.0
        """
        col_lower = column.lower().strip()

        best_field = ""
        best_score = 0.0

        for field, aliases in FIELD_ALIASES.items():
            for alias in aliases:
                score = self._similarity(col_lower, alias.lower())
                if score > best_score:
                    best_score = score
                    best_field = field

        # 降低歧义字段的置信度
        if self._is_ambiguous(column):
            best_score = min(best_score, 0.5)

        return best_field, best_score

    def _similarity(self, a: str, b: str) -> float:
        """计算两个字符串的相似度。

        规则：
        - 完全匹配 → 1.0
        - a 包含 b 或 b 包含 a → 0.8
        - 关键词重叠 → 按重叠比例
        """
        if a == b:
            return 1.0
        if a in b or b in a:
            # 长度差异太大不算是真包含（避免 "type" 匹配到 "node_type"）
            if min(len(a), len(b)) / max(len(a), len(b)) >= 0.5:
                return 0.85
            return 0.6
        # 检查是否有共同的关键词片段
        if len(a) >= 2 and len(b) >= 2:
            if a[:3] == b[:3]:
                return 0.6
        return 0.0

    def _is_ambiguous(self, column: str) -> bool:
        """检查列名是否为歧义字段（设计文档第 16.4 节）。"""
        col_lower = column.lower().strip()
        return col_lower in AMBIGUOUS_ALIASES

    def _classify_fact_column(self, col: str, mapping: FieldMapping):
        """对宽表中的非日期列做分类：是节点 ID 还是未知列。"""
        # 先看是否匹配已知节点列表
        if col in self.known_nodes:
            mapping.mapped_field = "node_id"
            mapping.node_id = col
            mapping.status = MappingStatus.IDENTIFIED
            mapping.confidence = 1.0
            return

        # 检查是否为带 .1 后缀的去重列
        dedup_match = DEDUP_SUFFIX.match(col)
        if dedup_match:
            base_name = dedup_match.group(1)
            if base_name in self.known_nodes:
                mapping.mapped_field = "node_id"
                mapping.node_id = base_name
                mapping.status = MappingStatus.IDENTIFIED
                mapping.confidence = 0.9
                return

        # 用模式匹配检查是否像节点编码
        if NODE_ID_PATTERN.match(col):
            mapping.mapped_field = "node_id"
            mapping.node_id = col
            mapping.status = MappingStatus.IDENTIFIED
            mapping.confidence = 0.8
            if col not in self.known_nodes:
                self.warnings.add_warning(
                    type="unmatched_node",
                    message=f"列名「{col}」看起来像节点编码，但不在已知节点列表中。",
                    column=col,
                    suggestion="请确认该节点是否为新节点，或是否需要添加到节点清单。",
                )
            return

        # 无法识别为节点 ID
        mapping.mapped_field = ""
        mapping.status = MappingStatus.UNRECOGNIZED
        mapping.confidence = 0.0
        self.warnings.add_warning(
            type="unmatched_node",
            message=f"列名「{col}」无法识别为已知节点编码。",
            column=col,
            suggestion="请确认此列是否为节点 ID，或标记为「不参与分析」。",
        )

    # ── 日期列检测 ──────────────────────────────────────────

    def _detect_date_column(
        self, columns: list[str], col_samples: dict
    ) -> Optional[str]:
        """检测哪个列是日期列。

        策略：先按列名匹配，再按值验证。
        """
        candidates = []

        date_aliases = {"date", "日期", "时间", "time", "datetime", "timestamp",
                        "dt", "invoicedate", "订单日期", "出货日期"}

        for col in columns:
            score = 0.0
            col_lower = col.lower().strip()

            # 列名检查
            if col_lower in date_aliases:
                score += 0.4
            elif any(alias in col_lower for alias in date_aliases):
                score += 0.2

            # 值检查：看样例值是否像日期
            samples = col_samples.get(col, [])
            if samples:
                date_count = sum(
                    1 for s in samples
                    if s is not None and self._looks_like_date(str(s))
                )
                if date_count >= len(samples) * 0.6:
                    score += 0.6

            if score > 0:
                candidates.append((col, score))

        if not candidates:
            self.warnings.add_error(
                type="missing_date_column",
                message="未检测到日期列，无法进行时序分析。",
                suggestion="请确认数据中是否包含日期列，并手动指定。",
            )
            # 尝试默认用第一列
            if columns:
                return columns[0]
            return None

        # 返回得分最高的
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    @staticmethod
    def _looks_like_date(value: str) -> bool:
        """检查字符串值是否像日期。"""
        for pattern in DATE_PATTERNS:
            if pattern.match(value.strip()):
                return True
        # 尝试直接解析
        for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d", "%m/%d/%Y"]:
            try:
                datetime.strptime(value.strip(), fmt)
                return True
            except ValueError:
                continue
        return False

    # ── 宽表 melt ───────────────────────────────────────────

    def _melt_fact_table(
        self, columns: list[str], date_col: str,
        metric_name: str, file_name: str, all_data
    ) -> list[dict]:
        """将宽表 melt 为长表。

        输入（宽表）:
            Date | SOS008L02P | SOS005L04P | ...
        输出（长表）:
            [
                {"date": "2023-01-01", "node_id": "SOS008L02P", "value": 1355.0,
                 "metric_name": "Sales Order", "source_file": "Sales Order.csv"},
                ...
            ]
        """
        melted = []
        node_cols = [c for c in columns if c != date_col]

        # 如果是 pandas DataFrame
        if hasattr(all_data, "columns"):
            date_idx = list(all_data.columns).index(date_col)
            for _, row in all_data.iterrows():
                date_val = str(row.iloc[date_idx])[:10]  # 只取日期部分
                for col in node_cols:
                    val = row[col]
                    if pd.isna(val) or val == 0:
                        continue
                    node_id = self._normalize_node_id(col)
                    melted.append({
                        "date": date_val,
                        "node_id": node_id,
                        "value": float(val),
                        "metric_name": metric_name,
                        "source_file": file_name,
                    })
        # 如果是 list of lists
        elif isinstance(all_data, list) and len(all_data) > 0:
            date_idx = columns.index(date_col)
            for row in all_data:
                date_val = str(row[date_idx])[:10]
                for i, col in enumerate(columns):
                    if col == date_col:
                        continue
                    val = row[i] if i < len(row) else None
                    if val is None or val == 0:
                        continue
                    node_id = self._normalize_node_id(col)
                    melted.append({
                        "date": date_val,
                        "node_id": node_id,
                        "value": float(val),
                        "metric_name": metric_name,
                        "source_file": file_name,
                    })

        return melted

    @staticmethod
    def _normalize_node_id(column_name: str) -> str:
        """归一化节点 ID：去掉 pandas 自动加的 .1 后缀。"""
        m = DEDUP_SUFFIX.match(column_name.strip())
        if m:
            return m.group(1)
        return column_name.strip()

    def _extract_node_data(
        self, columns: list[str], mappings: list[FieldMapping], all_data
    ) -> list[dict]:
        """从节点表提取标准化节点数据。"""
        col_map = {m.original_column: m.mapped_field for m in mappings if m.mapped_field}
        result = []
        if hasattr(all_data, "columns"):
            for _, row in all_data.iterrows():
                item = {}
                for col in columns:
                    field = col_map.get(col, "")
                    if field:
                        item[field] = row[col]
                    else:
                        item[col] = row[col]
                result.append(item)
        elif isinstance(all_data, list) and len(all_data) > 0:
            for row in all_data:
                item = {}
                for i, col in enumerate(columns):
                    val = row[i] if i < len(row) else None
                    field = col_map.get(col, "")
                    if field:
                        item[field] = val
                    else:
                        item[col] = val
                result.append(item)
        return result

    def _extract_edge_data(
        self, columns: list[str], mappings: list[FieldMapping], all_data
    ) -> list[dict]:
        """从边表提取标准化边数据，保留 relation_type，不假设方向。"""
        col_map = {m.original_column: m.mapped_field for m in mappings if m.mapped_field}
        result = []
        if hasattr(all_data, "columns"):
            for _, row in all_data.iterrows():
                item = {}
                for col in columns:
                    field = col_map.get(col, "")
                    val = row[col]
                    if field:
                        item[field] = val
                    elif col not in ("GroupCode", "SubGroupCode"):
                        item[col] = val
                # 加入上下文：从哪个维度定义的关系（Plant/Storage Location/Group）
                context_field = str(columns[0]) if columns else ""
                if context_field not in ("node1", "node2"):
                    item["context"] = context_field
                    item["context_value"] = str(row[context_field]) if context_field in row else ""
                result.append(item)
        elif isinstance(all_data, list) and len(all_data) > 0:
            for row in all_data:
                item = {}
                for i, col in enumerate(columns):
                    val = row[i] if i < len(row) else None
                    field = col_map.get(col, "")
                    if field:
                        item[field] = val
                    elif col not in ("GroupCode", "SubGroupCode"):
                        item[col] = val
                result.append(item)
        return result

    # ── 辅助方法 ────────────────────────────────────────────

    def _check_requirements(
        self, role: str, mapped_fields: set[str], metric_name: str
    ) -> list[str]:
        """按文件角色检查必填字段是否满足。

        不同角色需要不同的必填字段组合：
        - fact_table: time + node_id + 至少一个 risk_metric（由 metric_name 隐含）
        - node_table: node_id + node_name + node_type
        - edge_table: upstream_node_id + downstream_node_id（或 node1 + node2）
        """
        unmet = []

        if role == "fact_table":
            if "time" not in mapped_fields:
                unmet.append("time")
            if "node_id" not in mapped_fields:
                unmet.append("node_id")
            # 事实表的 risk_metric 由 metric_name 提供，只要能从文件名提取就算满足
            if not metric_name:
                unmet.append("risk_metric")

        elif role == "node_table":
            for f in ["node_id", "node_name", "node_type"]:
                if f not in mapped_fields:
                    unmet.append(f)

        elif role == "edge_table":
            has_up = "upstream_node_id" in mapped_fields
            has_down = "downstream_node_id" in mapped_fields
            if not has_up and not has_down:
                unmet.append("upstream_node_id")
                unmet.append("downstream_node_id")
            elif not has_up:
                unmet.append("upstream_node_id")
            elif not has_down:
                unmet.append("downstream_node_id")

        else:
            # 未识别角色的文件：至少要有 node_id
            if "node_id" not in mapped_fields:
                unmet.append("node_id")

        return unmet

    def _extract_metric_name(self, file_name: str) -> str:
        """从文件名提取指标名称。

        例如:
            "Sales Order.csv" → "Sales Order"
            "Production .csv" → "Production"
            "Delivery To distributor.csv" → "Delivery To Distributor"
        """
        # 去掉扩展名
        name = file_name.rsplit(".", 1)[0] if "." in file_name else file_name
        # 去掉尾部空格和数字后缀 如 " (1)"
        name = re.sub(r"\s*\(\d+\)\s*$", "", name)
        # 去掉首尾空格
        name = name.strip()
        # 首字母大写格式化
        if name:
            name = " ".join(
                word[0].upper() + word[1:].lower() if len(word) > 1 else word.upper()
                for word in name.split()
            )
        return name

    def _check_duplicate_columns(self, columns: list[str]):
        """检查带 .1 后缀的重复列名，标记为 duplicate_column。"""
        for col in columns:
            m = DEDUP_SUFFIX.match(col)
            if m:
                base_name = m.group(1)
                if base_name in columns:
                    self.warnings.add_warning(
                        type="duplicate_column",
                        message=f"列名「{col}」疑似为「{base_name}」的重复列（pandas 自动添加后缀）。",
                        column=col,
                        suggestion=f"请确认「{col}」与「{base_name}」的关系：是同一指标的不同度量口径，还是数据重复？",
                    )

    @staticmethod
    def _build_samples(columns: list[str], sample_values: list[list]) -> dict[str, list]:
        """将行列数据转为 列名 → 样例值 的映射。"""
        if not sample_values or not columns:
            return {}
        result = {}
        for i, col in enumerate(columns):
            vals = []
            for row in sample_values[:5]:
                if i < len(row):
                    vals.append(row[i])
            result[col] = vals
        return result

    @staticmethod
    def _require(adapter_output: dict, key: str, default=None):
        """从 adapter 输出中取字段。取不到且无默认值时报错。"""
        if key in adapter_output:
            return adapter_output[key]
        if default is not None:
            return default
        raise KeyError(
            f"field_mapper 需要 adapter_output['{key}']，但 excel_adapter 的输出中没有该字段。"
            f"请检查 excel_adapter 的输出结构是否完整。"
        )
