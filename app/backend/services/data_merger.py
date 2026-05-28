"""跨场景合并 + 重复文件标记。

职责：
1. 接收多个 field_mapper 的 MappingResult
2. 将同一场景的多文件标记为 different_measurement_basis
3. 跨场景合并所有事实表 melted_data → 统一长表
4. 合并节点数据和边数据

设计原则：
- 假设 role 已由 excel_adapter 识别、字段已由 field_mapper 映射
- 本模块只做合并，不做新的字段识别或阈值判断
- 所有异常情况进入 warnings，不静默处理
"""

from collections import defaultdict
from typing import Optional

from schemas.mapping import MappingResult
from utils.error_utils import WarningCollector


class DataMerger:
    """跨场景数据合并器。

    用法:
        merger = DataMerger()
        unified = merger.merge(mapping_results)  # list of MappingResult
    """

    def __init__(self):
        self.warnings = WarningCollector()

    # ── 主入口 ──────────────────────────────────────────────

    def merge(self, results: list[MappingResult]) -> dict:
        """合并多个文件的映射结果。

        Args:
            results: field_mapper 为每个文件产出的 MappingResult 列表

        Returns:
            dict:
                - unified_table: 统一长表（所有场景的 melted_data 合并）
                - nodes: 合并后的节点数据
                - edges: 合并后的边数据
                - merge_report: 合并报告（标记了什么、合并了什么）
                - warnings: 合并过程中的问题
        """
        self.warnings = WarningCollector()

        if not results:
            self.warnings.add_error(
                type="no_input",
                message="没有可合并的数据。请先上传并解析文件。",
            )
            return self._empty_result()

        # 按角色分组
        fact_results = [r for r in results if r.role == "fact_table"]
        node_results = [r for r in results if r.role == "node_table"]
        edge_results = [r for r in results if r.role == "edge_table"]

        # 1. 处理事实表：分组 + 标记重复 + 合并
        unified_table, measurement_basis = self._merge_fact_tables(fact_results)

        # 2. 合并节点数据
        nodes = self._merge_node_tables(node_results)

        # 3. 合并边数据
        edges = self._merge_edge_tables(edge_results)

        merge_report = {
            "total_files": len(results),
            "fact_tables": len(fact_results),
            "node_tables": len(node_results),
            "edge_tables": len(edge_results),
            "scenarios_merged": len(set(r.metric_name for r in fact_results if r.metric_name)),
            "measurement_basis_groups": measurement_basis,
            "total_rows_unified": len(unified_table),
            "total_nodes": len(nodes),
            "total_edges": len(edges),
        }

        return {
            "unified_table": unified_table,
            "nodes": nodes,
            "edges": edges,
            "merge_report": merge_report,
            "warnings": self.warnings.to_list(),
        }

    # ── 事实表合并 ──────────────────────────────────────────

    def _merge_fact_tables(
        self, fact_results: list[MappingResult]
    ) -> tuple[list[dict], list[dict]]:
        """合并事实表的 melted_data。

        同一 metric_name 的文件被视为同一场景。
        如果同场景有多个文件，数值不同则标记 different_measurement_basis。
        """
        # 按 metric_name 分组
        groups: dict[str, list[MappingResult]] = defaultdict(list)
        for r in fact_results:
            key = r.metric_name or r.file_name
            groups[key].append(r)

        all_data: list[dict] = []
        measurement_basis: list[dict] = []

        for metric, group in groups.items():
            if len(group) == 1:
                # 只有一个文件，直接加入
                for item in group[0].melted_data:
                    item["measurement_basis"] = "default"
                all_data.extend(group[0].melted_data)
            else:
                # 多个文件同场景 → 检查是重复还是不同口径
                self._handle_duplicate_scenario(group, metric, all_data, measurement_basis)

        return all_data, measurement_basis

    def _handle_duplicate_scenario(
        self, group: list[MappingResult], metric: str,
        all_data: list[dict], basis_list: list[dict]
    ):
        """处理同一场景下的多个文件。

        通过比较数值比例判断是 duplicate 还是 different_measurement_basis。
        """
        # 给每个文件一个 basis 标签
        bases = []
        for i, r in enumerate(group):
            if i == 0:
                label = "default"
            else:
                label = f"basis_{i + 1}"
            bases.append({"file": r.file_name, "basis": label, "metric": metric})

            for item in r.melted_data:
                item["measurement_basis"] = label
            all_data.extend(r.melted_data)

        # 比较同场景文件间的数值比例，标记不同口径
        if len(group) >= 2:
            self._compare_measurement_basis(group, metric, bases)

        basis_list.extend(bases)

    def _compare_measurement_basis(
        self, group: list[MappingResult], metric: str, bases: list[dict]
    ):
        """比较同场景两个文件的数值比例。

        如果两个文件的同节点同日数值比例不同（不是简单的倍数关系），
        则标记为 different_measurement_basis。
        """
        if len(group) < 2:
            return

        r1, r2 = group[0], group[1]
        # 取共有的 (日期, node_id) 值对
        d1 = {(item["date"], item["node_id"]): item["value"]
              for item in r1.melted_data}
        d2 = {(item["date"], item["node_id"]): item["value"]
              for item in r2.melted_data}
        common_keys = set(d1) & set(d2)

        if not common_keys:
            self.warnings.add_warning(
                type="no_overlap",
                message=f"场景「{metric}」的两个文件没有共同时点的数据，无法比较。",
            )
            return

        # 计算比值
        ratios = []
        for key in list(common_keys)[:100]:  # 采样100个点
            if d1[key] != 0 and d2[key] != 0:
                ratios.append(d2[key] / d1[key])

        if not ratios:
            return

        avg_ratio = sum(ratios) / len(ratios)
        # 判断是否为常数倍：CV < 0.1 表示干净的比例关系
        variance = sum((r - avg_ratio) ** 2 for r in ratios) / len(ratios)
        cv = (variance ** 0.5) / avg_ratio if avg_ratio != 0 else 999

        if cv < 0.1:
            self.warnings.add_info(
                type="consistent_ratio",
                message=f"场景「{metric}」的两个文件呈稳定的 {avg_ratio:.3f} 倍关系，可能为同一口径的不同批次数据。",
            )
        else:
            self.warnings.add_warning(
                type="different_measurement_basis",
                message=(
                    f"场景「{metric}」的两个文件数值比例不一致（CV={cv:.2f}），"
                    f"标记为不同度量口径。请确认两文件的关系。"
                ),
                suggestion="请在字段映射确认页确认这两个文件是否应合并或分开处理。",
            )

    # ── 节点数据合并 ────────────────────────────────────────

    def _merge_node_tables(
        self, node_results: list[MappingResult]
    ) -> list[dict]:
        """合并多个节点表中的节点数据。

        同一个 node_id 可以对应多个属性（如多个 Plant 或 Storage Location），
        不强制一对一（设计原则）。
        """
        if not node_results:
            return []

        # 简单策略：拼接所有 node_data
        all_nodes = []
        for r in node_results:
            all_nodes.extend(r.node_data)

        # 按 node_id 归并
        merged: dict[str, dict] = {}
        for item in all_nodes:
            nid = item.get("node_id") or item.get("Node") or ""
            if not nid:
                continue
            if nid not in merged:
                merged[nid] = {"node_id": nid}
            # 合并属性（列表形式，保留多值）
            for k, v in item.items():
                if k in ("node_id", "Node"):
                    continue
                mapped_key = k  # 使用标准字段名或原始列名
                if mapped_key not in merged[nid]:
                    merged[nid][mapped_key] = v
                elif merged[nid][mapped_key] != v:
                    # 已有不同值 → 转为列表
                    existing = merged[nid][mapped_key]
                    if not isinstance(existing, list):
                        merged[nid][mapped_key] = [existing]
                    if v not in merged[nid][mapped_key]:
                        merged[nid][mapped_key].append(v)

        return list(merged.values())

    # ── 边数据合并 ──────────────────────────────────────────

    def _merge_edge_tables(
        self, edge_results: list[MappingResult]
    ) -> list[dict]:
        """合并多个边表中的边数据。

        保留 relation_type 和 context（如 Plant、Storage Location）。
        不假设 node1→node2 的方向。
        """
        all_edges = []
        for r in edge_results:
            all_edges.extend(r.edge_data)
        return all_edges

    # ── 辅助 ──────────────────────────────────────────────

    def _empty_result(self) -> dict:
        return {
            "unified_table": [],
            "nodes": [],
            "edges": [],
            "merge_report": {
                "total_files": 0,
                "fact_tables": 0,
                "node_tables": 0,
                "edge_tables": 0,
                "scenarios_merged": 0,
                "measurement_basis_groups": [],
                "total_rows_unified": 0,
                "total_nodes": 0,
                "total_edges": 0,
            },
            "warnings": self.warnings.to_list(),
        }
