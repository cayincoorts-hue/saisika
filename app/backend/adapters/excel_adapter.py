"""文件读取 + 角色识别。

职责：
1. 读取用户上传的 CSV / Excel 文件
2. 识别文件角色（fact_table / node_table / edge_table / metadata_table）
3. 输出 dict 格式，直接喂给 field_mapper.process()

角色识别策略（按优先级）：
  1. 列名模式：有 node1+node2 → edge_table；有 "Node" 单列 → node_table
  2. 文件名模式：含 Edges/Nodes/Sales Order 等关键词
  3. 数据模式：多列匹配节点编码格式 → fact_table（宽表）
  4. 兜底：标记为 generic，由 field_mapper 尽力映射
"""

import os
import re
from pathlib import Path
from typing import Optional

import pandas as pd

from utils.error_utils import WarningCollector


# 节点编码模式（用于识别宽表中的产品节点列）
NODE_ID_PATTERN = re.compile(
    r"^[A-Z]{2,6}\d{2,4}[A-Z]\d{2,4}[A-Z]{0,3}$"
)

# 文件名 → 角色关键词
ROLE_KEYWORDS = {
    "edge": ["edge", "edges", "边", "关系"],
    "node_type": ["node type", "nodes type", "node_types", "节点类型"],
    "node": ["node", "nodes", "节点"],
    "fact": [
        "sales order", "production", "factory issue",
        "delivery", "销售订单", "生产", "出货", "交付",
    ],
}

# 日期列候选名
DATE_COLUMN_NAMES = {
    "date", "日期", "时间", "time", "datetime", "timestamp",
    "dt", "invoicedate", "订单日期", "出货日期",
}


class ExcelAdapter:
    """Excel/CSV 文件读取与角色识别。

    用法:
        adapter = ExcelAdapter()
        output = adapter.read("path/to/file.csv")
        # output 可直接传给 FieldMapper.process()
    """

    def __init__(self):
        self.warnings = WarningCollector()

    def read(self, file_path: str) -> dict:
        """读取单个文件，返回 adapter 输出 dict。

        Returns:
            dict 包含:
                - file_name, file_type, sheet_name
                - role: 识别结果
                - columns, sample_values, row_count
                - date_range (如果有日期列)
                - data: DataFrame
                - warnings: 读取过程中的问题
        """
        self.warnings = WarningCollector()

        path = Path(file_path)
        if not path.exists():
            self.warnings.add_error(
                type="file_not_found",
                message=f"文件不存在：{file_path}",
                suggestion="请检查文件路径是否正确。",
            )
            return self._error_output(str(path.name), str(path.suffix))

        file_type = path.suffix.lower().lstrip(".")
        if file_type not in ("csv", "xlsx", "xls"):
            self.warnings.add_error(
                type="unsupported_format",
                message=f"不支持的文件格式：.{file_type}",
                suggestion="请上传 CSV 或 Excel（.xlsx / .xls）文件。",
            )
            return self._error_output(str(path.name), file_type)

        try:
            if file_type == "csv":
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
        except Exception as e:
            self.warnings.add_error(
                type="read_error",
                message=f"无法读取文件：{e}",
                suggestion="请检查文件是否损坏或格式是否正确。",
            )
            return self._error_output(str(path.name), file_type)

        if df.empty:
            self.warnings.add_error(
                type="empty_file",
                message="文件为空，没有可读取的数据。",
                suggestion="请确认文件内容是否完整。",
            )
            return self._error_output(str(path.name), file_type)

        # 角色识别
        columns = list(df.columns.astype(str))
        role = self._identify_role(str(path.name), columns, df)

        # 提取日期范围
        date_range = self._detect_date_range(columns, df)

        return {
            "file_name": str(path.name),
            "file_type": file_type,
            "sheet_name": "",
            "role": role,
            "columns": columns,
            "sample_values": df.head(5).values.tolist(),
            "row_count": len(df),
            "date_range": date_range,
            "data": df,
            "warnings": self.warnings.to_list(),
        }

    def read_multiple(self, file_paths: list[str]) -> list[dict]:
        """批量读取多个文件。

        Returns:
            list[dict]: 每个文件的 adapter 输出 dict
        """
        results = []
        for path in file_paths:
            results.append(self.read(path))
        return results

    # ── 角色识别 ────────────────────────────────────────────

    def _identify_role(
        self, file_name: str, columns: list[str], df: pd.DataFrame
    ) -> str:
        """识别文件角色。

        优先级：
        1. 列名模式（最可靠）
        2. 文件名模式
        3. 数据模式（宽表检测）
        4. 兜底
        """
        file_lower = file_name.lower()
        col_set = {c.lower().strip() for c in columns}

        # ── 1. 列名模式 ──
        # 边表特征：有 node1 和 node2 列
        has_node1 = any("node1" in c.lower() for c in columns)
        has_node2 = any("node2" in c.lower() for c in columns)
        if has_node1 and has_node2:
            return "edge_table"

        # 有 Plant/Storage 等关系列（也是边表变体）
        if "plant" in col_set or "storage location" in col_set:
            if has_node1 and has_node2:
                return "edge_table"

        # 节点表特征：文件名含 "Nodes" 或 "Node"
        if any(kw in file_lower for kw in ROLE_KEYWORDS["node_type"]):
            return "node_table"

        # 单列 "Node" + 少量列 → 节点表
        if col_set & {"node", "节点"} and len(columns) <= 5:
            return "node_table"

        # ── 2. 文件名模式 ──
        if any(kw in file_lower for kw in ROLE_KEYWORDS["edge"]):
            return "edge_table"
        if any(kw in file_lower for kw in ROLE_KEYWORDS["node"]):
            return "node_table"
        if any(kw in file_lower for kw in ROLE_KEYWORDS["fact"]):
            return "fact_table"

        # ── 3. 数据模式：检测宽表 ──
        if self._is_wide_fact_table(columns):
            return "fact_table"

        # ── 4. 兜底 ──
        self.warnings.add_warning(
            type="role_unknown",
            message=f"无法确定文件「{file_name}」的角色，将尝试通用解析。",
            suggestion="如果解析结果不正确，请手动指定文件类型。",
        )
        return "generic"

    def _is_wide_fact_table(self, columns: list[str]) -> bool:
        """检测是否为宽表格式的事实表。

        特征：有一列是日期 + 大量列匹配节点编码格式。
        """
        if len(columns) < 3:
            return False

        node_pattern_count = 0
        date_col_count = 0

        for col in columns:
            col_lower = col.lower().strip()
            if col_lower in DATE_COLUMN_NAMES:
                date_col_count += 1
            elif NODE_ID_PATTERN.match(col.strip()):
                node_pattern_count += 1

        # 至少有一个日期列 + 大量节点编码列
        return date_col_count >= 1 and node_pattern_count >= len(columns) * 0.5

    # ── 日期范围 ────────────────────────────────────────────

    def _detect_date_range(
        self, columns: list[str], df: pd.DataFrame
    ) -> dict:
        """尝试提取日期列的范围。"""
        for col in columns:
            col_lower = col.lower().strip()
            if col_lower in DATE_COLUMN_NAMES:
                try:
                    date_series = pd.to_datetime(df[col], errors="coerce")
                    valid = date_series.dropna()
                    if len(valid) > 0:
                        return {
                            "start": valid.min().strftime("%Y-%m-%d"),
                            "end": valid.max().strftime("%Y-%m-%d"),
                            "column": col,
                        }
                except Exception:
                    continue
        return {}

    # ── 错误输出 ────────────────────────────────────────────

    def _error_output(self, file_name: str, file_type: str) -> dict:
        """当读取失败时，返回带有 errors 的输出 dict。"""
        return {
            "file_name": file_name,
            "file_type": file_type,
            "sheet_name": "",
            "role": "error",
            "columns": [],
            "sample_values": [],
            "row_count": 0,
            "date_range": {},
            "data": pd.DataFrame(),
            "warnings": self.warnings.to_list(),
            "errors": [w for w in self.warnings.to_list() if w["level"] == "error"],
        }
