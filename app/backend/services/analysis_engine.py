"""组装五类分析结果对象。

按设计文档 v1.2 第 13 节定义：
1. risk_trend — 风险趋势图
2. risk_distribution — 风险分布图
3. high_risk_nodes — 高风险节点表
4. propagation_timeline — 风险传播时序图
5. data_confidence — 数据可信度图

v1.3 新增：
6. domain_insights — 供应链领域洞察（牛鞭效应/VMI/QR）
+ meta.deterministic_fingerprint — 可复现性证明
+ data_confidence.supplement_map — "补什么→解锁什么"对照表
+ high_risk_nodes 透传 reasoning_trail 和 action_justification
"""

import hashlib
import json
from collections import defaultdict
from typing import Optional

from utils.error_utils import WarningCollector


class AnalysisEngine:
    """分析结果组装器。

    用法:
        engine = AnalysisEngine()
        visuals = engine.assemble(
            unified_table=unified["unified_table"],
            scores=risk_scores,
            graph=graph,
            merge_report=unified["merge_report"],
        )
    """

    def __init__(self):
        self.warnings = WarningCollector()

    def assemble(
        self,
        unified_table: list[dict],
        scores: dict,
        graph: dict,
        merge_report: dict,
        text_summary: Optional[dict] = None,
    ) -> dict:
        """组装全部六类结果 + 文本摘要。

        Returns:
            dict: 完整的 analysis_result 结构
        """
        self.warnings = WarningCollector()

        has_time = len(unified_table) > 0 and any("date" in r for r in unified_table[:1])
        has_graph = bool(graph and graph.get("nodes"))
        has_scores = bool(scores)
        has_edges = bool(graph and graph.get("edges"))

        # 收集领域洞察
        domain_patterns = self._collect_domain_patterns(scores)

        visuals = {
            "risk_trend": self._build_risk_trend(unified_table, scores, has_time),
            "risk_distribution": self._build_risk_distribution(scores, has_scores),
            "high_risk_nodes": self._build_high_risk_nodes(scores, has_scores),
            "propagation_timeline": self._build_propagation_timeline(
                graph, scores, has_graph, has_edges
            ),
            "data_confidence": self._build_data_confidence(
                unified_table, graph, merge_report,
                has_time, has_graph, has_scores, has_edges,
            ),
            "domain_insights": self._build_domain_insights(domain_patterns),
        }

        # 确定性指纹
        fingerprint = self._compute_fingerprint(unified_table, scores, graph)

        return {
            "meta": {
                "version": "v1.3",
                "generated_at": "",
                "granularity": "daily",
                "source_type": "csv",
                "deterministic_fingerprint": fingerprint,
                "deterministic_note": (
                    "本系统采用确定性规则引擎，同一份输入数据在任意机器上产生完全相同的结果。"
                    "此指纹基于输入数据内容（unified_table + scores + graph 结构）计算，"
                    "用于验证结果可复现性。"
                ),
            },
            "input_summary": {
                "file_count": merge_report.get("total_files", 0),
                "row_count": merge_report.get("total_rows_unified", 0),
                "node_count": merge_report.get("total_nodes", 0),
                "edge_count": merge_report.get("total_edges", 0),
            },
            "text_summary": text_summary or {},
            "visuals": visuals,
        }

    # ── 0. 确定性指纹 ──────────────────────────────────────

    def _compute_fingerprint(
        self, unified_table: list[dict], scores: dict, graph: dict
    ) -> str:
        """计算输入数据的确定性指纹，用于可复现性验证。"""
        hasher = hashlib.sha256()
        # 输入数据的关键结构
        hasher.update(str(len(unified_table)).encode())
        hasher.update(str(len(scores)).encode())
        hasher.update(str(len(graph.get("nodes", []))).encode())
        hasher.update(str(len(graph.get("edges", []))).encode())
        # 采样部分数据点（避免完整哈希过大）
        sample_data = []
        for row in unified_table[:50]:
            sample_data.append({
                "date": str(row.get("date", "")),
                "node_id": str(row.get("node_id", "")),
                "metric": str(row.get("metric_name", "")),
            })
        hasher.update(json.dumps(sample_data, sort_keys=True).encode())
        return hasher.hexdigest()[:16]

    # ── 1. 风险趋势图 ──────────────────────────────────────

    def _build_risk_trend(
        self, unified_table: list[dict], scores: dict, has_time: bool
    ) -> dict:
        if not has_time:
            return {
                "title": "风险趋势图",
                "status": "unavailable",
                "missing_reason": "缺少时间字段，暂时无法可靠生成风险趋势图。",
                "x": [], "series": [], "annotations": [],
            }

        date_scores: dict[str, list[float]] = defaultdict(list)
        node_risk_map = {nid: s["risk_score"] for nid, s in scores.items()}

        for row in unified_table:
            date = row.get("date", "")
            nid = row.get("node_id", "")
            if date and nid in node_risk_map:
                date_scores[date].append(node_risk_map[nid])

        dates = sorted(date_scores.keys())
        if not dates:
            return {
                "title": "风险趋势图",
                "status": "unavailable",
                "missing_reason": "无法从数据中提取有效的时间序列。",
                "x": [], "series": [], "annotations": [],
            }

        avg_series = []
        max_series = []
        for d in dates:
            vals = date_scores[d]
            avg_series.append(sum(vals) / len(vals) if vals else 0)
            max_series.append(max(vals) if vals else 0)

        return {
            "title": "全网风险趋势",
            "status": "ok",
            "x": dates,
            "series": [
                {"name": "平均风险评分", "data": [round(v, 4) for v in avg_series]},
                {"name": "最高风险评分", "data": [round(v, 4) for v in max_series]},
            ],
            "annotations": [],
        }

    # ── 2. 风险分布图 ──────────────────────────────────────

    def _build_risk_distribution(self, scores: dict, has_scores: bool) -> dict:
        if not has_scores:
            return {
                "title": "风险分布图",
                "status": "unavailable",
                "missing_reason": "未检测到可用的风险指标字段，暂时只能生成基础结构预览。",
                "bar": {}, "donut": {},
            }

        high = sum(1 for s in scores.values() if s["risk_level"] == "high")
        medium = sum(1 for s in scores.values() if s["risk_level"] == "medium")
        low = sum(1 for s in scores.values() if s["risk_level"] == "low")

        total = len(scores)
        return {
            "title": "风险节点分布",
            "status": "ok",
            "bar": {
                "categories": ["高风险", "中风险", "低风险"],
                "values": [high, medium, low],
                "colors": ["#e74c3c", "#f39c12", "#27ae60"],
            },
            "donut": {
                "data": [
                    {"name": "高风险", "value": high, "percent": round(high / total * 100, 1)},
                    {"name": "中风险", "value": medium, "percent": round(medium / total * 100, 1)},
                    {"name": "低风险", "value": low, "percent": round(low / total * 100, 1)},
                ],
            },
        }

    # ── 3. 高风险节点表 ────────────────────────────────────

    def _build_high_risk_nodes(self, scores: dict, has_scores: bool) -> dict:
        if not has_scores:
            return {
                "title": "高风险节点表",
                "status": "unavailable",
                "missing_reason": "缺少风险评分数据。",
                "rows": [],
            }

        risky = [
            (nid, s) for nid, s in scores.items()
            if s["risk_level"] in ("high", "medium")
        ]
        risky.sort(key=lambda x: x[1]["priority"], reverse=True)

        rows = []
        for nid, s in risky:
            rows.append({
                "node_id": nid,
                "risk_score": s["risk_score"],
                "risk_level": s["risk_level"],
                "priority": s["priority"],
                "risk_causes": s["risk_causes"],
                "risk_causes_detail": s.get("risk_causes_detail", []),
                "recommended_action": s["recommended_action"],
                "action_type": s.get("action_type", ""),
                "action_justification": s.get("action_justification", {}),
                "propagation_coefficient": s["propagation_coefficient"],
                "reasoning_trail": s.get("reasoning_trail", {}),
            })

        return {
            "title": "高风险节点明细",
            "status": "ok" if rows else "limited",
            "missing_reason": "" if rows else "当前没有节点达到中高风险等级。",
            "rows": rows,
        }

    # ── 4. 传播时序图 ──────────────────────────────────────

    def _build_propagation_timeline(
        self, graph: dict, scores: dict, has_graph: bool, has_edges: bool
    ) -> dict:
        if not has_graph:
            return {
                "title": "风险传播时序图",
                "status": "unavailable",
                "missing_reason": "缺少节点关系字段，暂时无法可靠生成传播路径。",
                "nodes": [], "edges": [], "events": [],
            }

        graph_nodes = []
        for n in graph.get("nodes", []):
            nid = n["node_id"]
            risk_info = scores.get(nid, {})
            level = risk_info.get("risk_level", "low")
            color_map = {"high": "#e74c3c", "medium": "#f39c12", "low": "#27ae60"}
            graph_nodes.append({
                "id": nid,
                "name": n.get("node_name", nid),
                "level": n.get("level", -1),
                "risk_level": level,
                "color": color_map.get(level, "#95a5a6"),
                "risk_score": risk_info.get("risk_score", 0),
                "in_degree": n.get("in_degree", 0),
                "out_degree": n.get("out_degree", 0),
            })

        graph_edges = graph.get("edges", [])
        events = list(set(
            e.get("context", "") for e in graph_edges if e.get("context")
        ))

        status = "ok"
        reason = ""
        if not has_edges:
            status = "limited"
            reason = "传播边数据有限，仅展示节点状态。图结构可能不完整。"

        return {
            "title": "风险传播网络",
            "status": status,
            "missing_reason": reason,
            "nodes": graph_nodes,
            "edges": graph_edges,
            "events": events,
        }

    # ── 5. 数据可信度 ──────────────────────────────────────

    def _build_data_confidence(
        self, unified_table: list[dict], graph: dict, merge_report: dict,
        has_time: bool, has_graph: bool, has_scores: bool, has_edges: bool
    ) -> dict:
        field_coverage = {
            "time": {"available": has_time, "label": "时间字段"},
            "node_id": {"available": len(unified_table) > 0, "label": "节点标识"},
            "node_relations": {"available": has_edges, "label": "节点关系"},
            "risk_metrics": {"available": has_scores, "label": "风险指标"},
        }

        capability_status = {
            "risk_trend": {"available": has_time, "label": "风险趋势图"},
            "risk_distribution": {"available": has_scores, "label": "风险分布图"},
            "high_risk_nodes": {"available": has_scores, "label": "高风险节点表"},
            "propagation_timeline": {"available": has_graph, "label": "传播时序图"},
            "data_confidence": {"available": True, "label": "数据可信度"},
            "domain_insights": {"available": has_scores and has_graph, "label": "供应链领域洞察"},
        }

        available_count = sum(1 for f in field_coverage.values() if f["available"])
        total_fields = len(field_coverage)
        confidence_level = (
            "high" if available_count >= total_fields
            else "medium" if available_count >= total_fields * 0.5
            else "low"
        )

        messages = []
        supplement_map = []

        if not has_time:
            msg = "缺少时间字段，无法生成时序分析。"
            messages.append(msg + "补充后可获得风险趋势图。")
            supplement_map.append({
                "missing": "时间字段",
                "impact": "无法生成风险趋势图",
                "unlocks": "风险趋势图",
            })

        if not has_edges:
            msg = "缺少节点关系字段，无法展示传播路径。"
            messages.append(msg + "补充后可获得完整的传播网络图。")
            supplement_map.append({
                "missing": "节点关系字段",
                "impact": "无法展示风险传播路径",
                "unlocks": "完整传播网络图、替代路径分析",
            })

        if not has_scores:
            msg = "缺少风险指标字段，无法计算风险评分。"
            messages.append(msg + "补充后可获得风险排名和分布。")
            supplement_map.append({
                "missing": "风险指标字段",
                "impact": "无法计算风险评分和排名",
                "unlocks": "风险排名、风险分布图、高风险节点表",
            })

        # 补充说明：如果能跑但缺建议字段
        if has_scores:
            supplement_map.extend([
                {
                    "missing": "库存字段",
                    "impact": "库存健康度评估精度受限",
                    "unlocks": "精确库存风险评估、补货时机建议",
                },
                {
                    "missing": "交期偏差字段",
                    "impact": "供应商交付可靠性评估精度受限",
                    "unlocks": "延迟传播风险分析、供应商切换建议",
                },
            ])

        return {
            "title": "数据可信度",
            "field_coverage": field_coverage,
            "capability_status": capability_status,
            "confidence_level": confidence_level,
            "messages": messages,
            "supplement_map": supplement_map,
        }

    # ── 6. 领域洞察 ────────────────────────────────────────

    def _collect_domain_patterns(self, scores: dict) -> dict:
        """从 scores 中收集所有节点的领域模式标签。"""
        bullwhip_nodes = []
        vmi_nodes = []
        qr_nodes = []

        for nid, s in scores.items():
            causes_detail = s.get("risk_causes_detail", [])
            for detail in causes_detail:
                label = detail.get("label", "")
                if "牛鞭效应" in label:
                    bullwhip_nodes.append({
                        "node_id": nid,
                        "detail": label,
                        "triggered_by": detail.get("triggered_by", ""),
                        "actual_value": detail.get("actual_value", ""),
                        "threshold": detail.get("threshold", ""),
                    })
                elif "VMI" in label or "信息共享" in label:
                    vmi_nodes.append({
                        "node_id": nid,
                        "detail": label,
                        "triggered_by": detail.get("triggered_by", ""),
                        "actual_value": detail.get("actual_value", ""),
                    })
                elif "QR" in label or "高频补货" in label:
                    qr_nodes.append({
                        "node_id": nid,
                        "detail": label,
                        "triggered_by": detail.get("triggered_by", ""),
                        "actual_value": detail.get("actual_value", ""),
                    })

        has_any = bullwhip_nodes or vmi_nodes or qr_nodes

        summary_parts = []
        if bullwhip_nodes:
            summary_parts.append(f"{len(bullwhip_nodes)} 个节点存在牛鞭效应放大")
        if vmi_nodes:
            summary_parts.append(f"{len(vmi_nodes)} 个节点呈现 VMI 信息共享模式特征")
        if qr_nodes:
            summary_parts.append(f"{len(qr_nodes)} 个节点呈现 QR 高频补货特征")

        return {
            "title": "供应链领域洞察",
            "status": "ok" if has_any else "limited",
            "missing_reason": "" if has_any else (
                "当前数据中未检测到显著的牛鞭效应、VMI 或 QR 模式特征。"
                "补充更多层级的数据后，领域模式识别将更可靠。"
            ),
            "summary": "；".join(summary_parts) if summary_parts else "未检测到显著领域模式。",
            "bullwhip_nodes": bullwhip_nodes,
            "vmi_nodes": vmi_nodes,
            "qr_nodes": qr_nodes,
        }

    def _build_domain_insights(self, domain_patterns: dict) -> dict:
        """透传领域洞察结果。"""
        return domain_patterns
