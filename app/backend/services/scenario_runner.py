"""场景对比运行器。

接收参数变更列表，在 DataFrame 层面应用修改后重跑 pipeline，
对比原始结果和修改后结果的差异。
"""

import copy
import json
from pathlib import Path
from typing import Optional

from utils.path_utils import data_path


class ScenarioRunner:
    """场景对比运行器。"""

    def __init__(self):
        self.upload_dir = data_path("uploads")
        self.result_dir = data_path("results")

    def get_params(self, node_id: str, batch_id: str) -> dict:
        """获取节点的可调参数及当前值。"""
        result_path = self.result_dir / f"{batch_id}.json"
        if not result_path.exists():
            raise FileNotFoundError(f"批次 {batch_id} 的分析结果不存在")

        with open(result_path, "r") as f:
            data = json.load(f)

        current = self._extract_current_params(node_id, data)

        return {
            "node_id": node_id,
            "params": [
                {
                    "name": "supplier_count",
                    "type": "integer",
                    "current": current["supplier_count"],
                    "min": 1,
                    "max": 10,
                },
                {
                    "name": "inventory_strategy",
                    "type": "enum",
                    "current": current["inventory_strategy"],
                    "options": ["VMI", "安全库存", "按订单补货"],
                },
                {
                    "name": "replenishment_frequency",
                    "type": "enum",
                    "current": current["replenishment_frequency"],
                    "options": ["高频小批(QR)", "标准", "低频大批"],
                },
                {
                    "name": "transport_path",
                    "type": "enum",
                    "current": current["transport_path"],
                    "options": ["直发", "经中转仓"],
                },
            ],
        }

    def _extract_current_params(self, node_id: str, data: dict) -> dict:
        """从分析结果中推断节点的当前参数值。"""
        result = {
            "supplier_count": 1,
            "inventory_strategy": "按订单补货",
            "replenishment_frequency": "标准",
            "transport_path": "直发",
        }

        high_risk = data.get("visuals", {}).get("high_risk_nodes", {}).get("rows", [])
        for row in high_risk:
            if row.get("node_id") == node_id:
                causes_detail = row.get("risk_causes_detail", [])
                all_labels = " ".join(
                    [c.get("label", "") for c in causes_detail] + row.get("risk_causes", [])
                )
                if "VMI" in all_labels or "信息共享" in all_labels:
                    result["inventory_strategy"] = "VMI"
                elif row.get("action_type") == "补货":
                    result["inventory_strategy"] = "安全库存"

                prop = row.get("propagation_coefficient", 1.0)
                if prop > 0.8:
                    result["transport_path"] = "经中转仓"
                break

        graph_nodes = data.get("visuals", {}).get("propagation_timeline", {}).get("nodes", [])
        for n in graph_nodes:
            if n.get("id") == node_id:
                degree = n.get("in_degree", 0) + n.get("out_degree", 0)
                if degree >= 3:
                    result["supplier_count"] = min(degree, 10)
                elif degree >= 1:
                    result["supplier_count"] = degree
                break

        return result

    def _compute_diff(self, original: dict, modified: dict, changes: list) -> dict:
        """计算原始和修改后场景的差异。"""
        param_labels = {
            "supplier_count": "供应商数量",
            "inventory_strategy": "库存策略",
            "replenishment_frequency": "补货频率",
            "transport_path": "运输路径",
        }
        change_descriptions = []
        for ch in changes:
            label = param_labels.get(ch["param"], ch["param"])
            change_descriptions.append(f"{label}: → {ch['to_value']}")

        orig_rows = original.get("visuals", {}).get("high_risk_nodes", {}).get("rows", [])
        mod_rows = modified.get("visuals", {}).get("high_risk_nodes", {}).get("rows", [])

        orig_scores = {r["node_id"]: r.get("risk_score", 0) for r in orig_rows}
        mod_scores = {r["node_id"]: r.get("risk_score", 0) for r in mod_rows}

        risk_score_changes = {}
        affected_nodes = set()
        for ch in changes:
            affected_nodes.add(ch["node_id"])

        all_ids = set(orig_scores.keys()) | set(mod_scores.keys())
        for nid in sorted(all_ids):
            from_score = orig_scores.get(nid, 0)
            to_score = mod_scores.get(nid, 0)
            delta = round(to_score - from_score, 4)
            if abs(delta) > 0.0001:
                risk_score_changes[nid] = {
                    "from": round(from_score, 4),
                    "to": round(to_score, 4),
                    "delta": delta,
                }
                affected_nodes.add(nid)

        deltas = [c["delta"] for c in risk_score_changes.values()]
        total_delta = sum(deltas) if deltas else 0
        if total_delta < -0.01:
            trend = "improved"
        elif total_delta > 0.01:
            trend = "worsened"
        else:
            trend = "unchanged"

        return {
            "changes": change_descriptions,
            "risk_score_changes": risk_score_changes,
            "affected_nodes": sorted(affected_nodes),
            "trend": trend,
        }

    def _apply_changes(self, unified: dict, changes: list) -> dict:
        """在统一数据层面应用参数变更。深拷贝后修改。"""
        unified = copy.deepcopy(unified)
        unified_table = unified.get("unified_table", [])
        nodes = unified.get("nodes", [])
        edges = unified.get("edges", [])

        by_node = {}
        for ch in changes:
            nid = ch["node_id"]
            if nid not in by_node:
                by_node[nid] = {}
            by_node[nid][ch["param"]] = ch["to_value"]

        for nid, params in by_node.items():
            if "supplier_count" in params:
                self._adjust_supplier_count(unified_table, nodes, nid, int(params["supplier_count"]))
            if "inventory_strategy" in params:
                self._adjust_inventory_strategy(unified_table, nid, params["inventory_strategy"])
            if "replenishment_frequency" in params:
                self._adjust_replenishment_frequency(unified_table, nid, params["replenishment_frequency"])
            if "transport_path" in params:
                self._adjust_transport_path(edges, nid, params["transport_path"])

        return unified

    def _adjust_supplier_count(self, table: list, nodes: list, nid: str, target_count: int):
        supplier_nodes = [n for n in nodes if str(n.get("node_type", "")).lower() in ("supplier", "供应商")]
        current_count = len(supplier_nodes)
        if current_count == 0 or target_count >= current_count:
            return
        to_remove = supplier_nodes[target_count:]
        remove_ids = {n["node_id"] for n in to_remove}
        table[:] = [row for row in table if row.get("node_id") not in remove_ids]

    def _adjust_inventory_strategy(self, table: list, nid: str, strategy: str):
        for row in table:
            if row.get("node_id") != nid:
                continue
            val = row.get("value", 0)
            if strategy == "VMI" and abs(val) > 1:
                row["value"] = val * 0.65
            elif strategy == "安全库存" and abs(val) > 1:
                row["value"] = val * 0.85

    def _adjust_replenishment_frequency(self, table: list, nid: str, freq: str):
        for row in table:
            if row.get("node_id") != nid:
                continue
            val = row.get("value", 0)
            if freq == "高频小批(QR)" and val > 0:
                row["value"] = val * 0.6
            elif freq == "低频大批" and val > 0:
                row["value"] = val * 1.5

    def _adjust_transport_path(self, edges: list, nid: str, path: str):
        if path == "直发":
            edges[:] = [
                e for e in edges
                if not (
                    (e.get("target") == nid and "中转" in str(e.get("context", "")))
                    or (e.get("source") == nid and "中转" in str(e.get("context", "")))
                )
            ]
        elif path == "经中转仓":
            for e in edges:
                if e.get("target") == nid or e.get("source") == nid:
                    if not e.get("context"):
                        e["context"] = "经中转仓"

    def run_comparison(self, batch_id: str, changes: list) -> dict:
        """运行场景对比。

        Args:
            batch_id: 批次 ID
            changes: [{node_id, param, to_value}, ...]

        Returns:
            {original_scenario, modified_scenario, diff}

        优先从原始上传文件重跑 pipeline；若文件不存在，则用已存储结果估算。
        """
        batch_dir = self.upload_dir / batch_id
        csv_files = []
        if batch_dir.exists():
            csv_files = sorted(
                list(batch_dir.glob("*.csv"))
                + list(batch_dir.glob("*.xlsx"))
                + list(batch_dir.glob("*.xls"))
            )

        if csv_files:
            original_analysis = self._run_pipeline(csv_files, changes=None)
            modified_analysis = self._run_pipeline(csv_files, changes=changes)
        else:
            # 无原始上传文件时，用存储结果估算差异
            stored = self._load_stored_result(batch_id)
            if stored is None:
                raise FileNotFoundError(f"批次 {batch_id} 的上传文件和分析结果均不存在")
            original_analysis = stored
            modified_analysis = self._estimate_modified(stored, changes)

        diff = self._compute_diff(original_analysis, modified_analysis, changes)

        return {
            "original_scenario": self._summarize(original_analysis),
            "modified_scenario": self._summarize(modified_analysis),
            "diff": diff,
        }

    def _estimate_modified(self, stored: dict, changes: list) -> dict:
        """无原始文件时，基于存储结果估算参数变更后的效果。"""
        modified = copy.deepcopy(stored)

        by_node = {}
        for ch in changes:
            nid = ch["node_id"]
            if nid not in by_node:
                by_node[nid] = {}
            by_node[nid][ch["param"]] = ch["to_value"]

        rows = modified.get("visuals", {}).get("high_risk_nodes", {}).get("rows", [])
        for nid, params in by_node.items():
            for row in rows:
                if row["node_id"] == nid:
                    multiplier = 1.0
                    if params.get("inventory_strategy") == "VMI":
                        multiplier = 0.75
                    elif params.get("inventory_strategy") == "安全库存":
                        multiplier = 0.90
                    elif params.get("replenishment_frequency") == "高频小批(QR)":
                        multiplier = 0.80
                    elif params.get("replenishment_frequency") == "低频大批":
                        multiplier = 1.15

                    row["risk_score"] = round(row["risk_score"] * multiplier, 4)

                    if params.get("transport_path") == "直发":
                        row["propagation_coefficient"] = max(0.5, (row.get("propagation_coefficient", 1.0) - 0.1))

                    prev_level = row.get("risk_level", "low")
                    new_score = row["risk_score"]
                    if new_score >= 0.6:
                        row["risk_level"] = "high"
                    elif new_score >= 0.3:
                        row["risk_level"] = "medium"
                    else:
                        row["risk_level"] = "low"

                    # 添加估算标记
                    row["_estimated"] = True
                    break

        # 同样更新分布数据
        dist = modified.get("visuals", {}).get("risk_distribution", {}).get("donut", {})
        if dist.get("data"):
            high = sum(1 for r in rows if r.get("risk_level") == "high")
            medium = sum(1 for r in rows if r.get("risk_level") == "medium")
            low = sum(1 for r in rows if r.get("risk_level") == "low")
            dist["data"] = [
                {"name": "高风险", "value": high, "percent": 0},
                {"name": "中风险", "value": medium, "percent": 0},
                {"name": "低风险", "value": low, "percent": 0},
            ]

        return modified

    def _run_pipeline(self, files: list, changes: Optional[list]) -> dict:
        """跑完整分析 pipeline。"""
        from adapters.excel_adapter import ExcelAdapter
        from services.field_mapper import FieldMapper
        from services.data_merger import DataMerger
        from services.graph_builder import GraphBuilder
        from services.risk_engine import RiskEngine
        from services.decision_engine import DecisionEngine
        from services.analysis_engine import AnalysisEngine

        adapter = ExcelAdapter()
        mapper = FieldMapper(known_nodes=[])
        merger = DataMerger()
        gb = GraphBuilder()
        risk_engine = RiskEngine()
        dec_engine = DecisionEngine()
        ae = AnalysisEngine()

        map_results = []
        for f in files:
            adapter_out = adapter.read(str(f))
            if adapter_out["role"] == "error":
                continue
            map_result = mapper.process(adapter_out)
            map_results.append(map_result)

        unified = merger.merge(map_results)

        if changes:
            unified = self._apply_changes(unified, changes)

        graph = gb.build(nodes=unified["nodes"], edges=unified["edges"])
        scores = risk_engine.calculate(unified_table=unified["unified_table"], graph=graph)
        scores = dec_engine.decide(scores=scores, graph=graph)

        return ae.assemble(
            unified_table=unified["unified_table"],
            scores=scores,
            graph=graph,
            merge_report=unified["merge_report"],
        )

    @staticmethod
    def _summarize(analysis: dict) -> dict:
        """提取场景摘要。"""
        return {
            "meta": analysis.get("meta", {}),
            "input_summary": analysis.get("input_summary", {}),
            "visuals": analysis.get("visuals", {}),
            "text_summary": analysis.get("text_summary", {}),
        }

    def _load_stored_result(self, batch_id: str) -> Optional[dict]:
        """加载已存储的分析结果。"""
        result_path = self.result_dir / f"{batch_id}.json"
        if result_path.exists():
            with open(result_path, "r") as f:
                return json.load(f)
        return None
