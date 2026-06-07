"""五段文字结论生成（中英双语）。

只读 risk_causes 等语义标注字段，不重新用原始数字做阈值判断。

五段结构（设计文档第 17 节）：
1. 当前判断 / Current Judgment
2. 主要原因 / Main Causes
3. 影响对象 / Impact Targets
4. 建议动作 / Recommended Actions
5. 还需补充 / Data Gaps
"""

from collections import defaultdict


class PromptBuilder:
    """文字结论生成器（中英双语）。

    Args:
        lang: 'zh' 或 'en'，默认 'zh'
    """

    def __init__(self, lang: str = "zh"):
        self.lang = lang

    def build(self, scores: dict, graph: dict = None, confidence: dict = None) -> dict:
        """生成五段文字结论。"""
        node_scores = scores or {}
        return {
            "current_judgment": self._current_judgment(node_scores),
            "main_causes": self._main_causes(node_scores, graph),
            "impact_targets": self._impact_targets(node_scores, graph),
            "recommended_actions": self._recommended_actions(node_scores),
            "need_more": self._need_more(confidence),
        }

    # ── Helpers ────────────────────────────────────────────

    def _zh(self, zh_text: str, en_text: str) -> str:
        return zh_text if self.lang == "zh" else en_text

    # ── 第一段：当前判断 ────────────────────────────────────

    def _current_judgment(self, node_scores: dict) -> str:
        if not node_scores:
            return self._zh(
                "暂无足够数据对供应链风险状态做出判断，请先补充节点数据和风险指标。",
                "Insufficient data to assess supply chain risk. Please provide node data and risk metrics.",
            )

        high = sum(1 for s in node_scores.values() if s.get("risk_level") == "high")
        medium = sum(1 for s in node_scores.values() if s.get("risk_level") == "medium")
        low = sum(1 for s in node_scores.values() if s.get("risk_level") == "low")
        total = len(node_scores)
        high_ratio = high / total if total > 0 else 0

        if high_ratio >= 0.3:
            return self._zh(
                f"当前供应链网络存在较严重的风险聚集现象。"
                f"在 {total} 个被评估节点中，{high} 个处于高风险状态，"
                f"{medium} 个处于中风险状态。建议立即启动高风险节点的应急预案。",
                f"Significant risk concentration detected in the supply chain network. "
                f"Among {total} assessed nodes, {high} are at high risk and "
                f"{medium} at medium risk. Immediate contingency plans recommended for high-risk nodes.",
            )
        elif high > 0:
            return self._zh(
                f"当前供应链网络整体风险可控，但存在 {high} 个高风险节点需要重点关注。"
                f"另外 {medium} 个节点处于中风险状态，建议加强监控频率。",
                f"Overall supply chain risk is manageable, but {high} high-risk nodes require attention. "
                f"An additional {medium} nodes are at medium risk — increase monitoring frequency.",
            )
        elif medium > 0:
            return self._zh(
                f"当前供应链网络未发现高风险节点，{medium} 个节点处于中风险状态。"
                f"整体风险水平较低，建议保持现有监控节奏。",
                f"No high-risk nodes detected. {medium} nodes at medium risk. "
                f"Overall risk level is low — maintain current monitoring cadence.",
            )
        else:
            return self._zh(
                f"当前供应链网络运行平稳，{total} 个被监控节点均处于低风险状态。"
                f"建议定期复查以保持风险可见性。",
                f"Supply chain network is stable — all {total} monitored nodes are at low risk. "
                f"Periodic review recommended to maintain visibility.",
            )

    # ── 第二段：主要原因 ────────────────────────────────────

    def _main_causes(self, node_scores: dict, graph: dict = None) -> str:
        if not node_scores:
            return self._zh(
                "当前未获得风险原因数据，请补充相关字段后重新分析。",
                "No risk cause data available. Please add relevant fields and re-analyze.",
            )

        node_levels = {}
        if graph and graph.get("nodes"):
            for n in graph["nodes"]:
                node_levels[n["node_id"]] = n.get("level", -1)

        cause_stats = defaultdict(lambda: defaultdict(int))
        for nid, s in node_scores.items():
            level = node_levels.get(nid, -1)
            level_group = self._zh(f"第{level}层", f"Tier {level}") if level >= 0 else self._zh("未分层", "Unassigned")
            for cause in s.get("risk_causes", []):
                cause_stats[cause][level_group] += 1

        if not cause_stats:
            return self._zh(
                "当前风险主要来自供应链网络结构性因素，未检测到特定的单一风险原因。",
                "Risk primarily stems from structural network factors — no single dominant cause detected.",
            )

        sorted_causes = sorted(cause_stats.items(), key=lambda x: sum(x[1].values()), reverse=True)
        parts = []
        for cause, level_groups in sorted_causes:
            total = sum(level_groups.values())
            if len(level_groups) == 1:
                group_label = list(level_groups.keys())[0]
                parts.append(self._zh(
                    f"{cause}（{total} 个节点，集中在 {group_label}）",
                    f"{cause} ({total} nodes, concentrated in {group_label})",
                ))
            else:
                sorted_groups = sorted(level_groups.items(), key=lambda x: x[0])
                group_texts = [self._zh(f"{label} {count} 个", f"{label}: {count}") for label, count in sorted_groups]
                parts.append(self._zh(
                    f"{cause}（{total} 个节点：{'，'.join(group_texts)}）",
                    f"{cause} ({total} nodes: {', '.join(group_texts)})",
                ))

        sep = self._zh("；", "; ")
        end = self._zh("。", ".")
        return sep.join(parts) + end

    # ── 第三段：影响对象 ────────────────────────────────────

    def _impact_targets(self, node_scores: dict, graph: dict = None) -> str:
        if not node_scores:
            return self._zh(
                "暂无数据确定受影响的具体对象。",
                "Insufficient data to determine impacted targets.",
            )

        sorted_nodes = sorted(node_scores.items(), key=lambda x: x[1].get("risk_score", 0), reverse=True)
        top3 = sorted_nodes[:3]

        if not top3 or top3[0][1].get("risk_score", 0) == 0:
            return self._zh(
                "当前未发现显著受影响的对象。",
                "No significantly impacted targets detected.",
            )

        level_map_zh = {"high": "高风险", "medium": "中风险", "low": "低风险"}
        level_map_en = {"high": "High Risk", "medium": "Medium Risk", "low": "Low Risk"}

        parts = []
        for nid, info in top3:
            level = info.get("risk_level", "low")
            level_text = level_map_zh.get(level, level) if self.lang == "zh" else level_map_en.get(level, level)
            causes = "、".join(info.get("risk_causes", [])) or self._zh("综合性风险", "Multiple factors")
            prop = info.get("propagation_coefficient", 1.0)
            spread = self._zh(
                "具有较强的网络传播效应" if prop > 0.7 else "传播影响相对可控",
                "Strong network propagation effect" if prop > 0.7 else "Propagation impact is manageable",
            )
            action_type = info.get("action_type", "")
            action_text = self._zh(
                f"，建议动作：{action_type}" if action_type else "",
                f", Recommended action: {action_type}" if action_type else "",
            )
            parts.append(
                self._zh(
                    f"节点 {nid}（{level_text}，评分 {info.get('risk_score', 0):.3f}）：{causes}，{spread}{action_text}",
                    f"Node {nid} ({level_text}, Score {info.get('risk_score', 0):.3f}): {causes}, {spread}{action_text}",
                )
            )

        header = self._zh("影响最显著的节点：", "Most Impacted Nodes:")
        return header + "\n" + "\n".join(f"  {i+1}. {p}" for i, p in enumerate(parts))

    # ── 第四段：建议动作 ────────────────────────────────────

    def _recommended_actions(self, node_scores: dict) -> str:
        if not node_scores:
            return self._zh(
                "暂无足够信息生成处置建议。",
                "Insufficient information to generate action recommendations.",
            )

        high_nodes = [(nid, s) for nid, s in node_scores.items() if s.get("risk_level") == "high"]
        medium_nodes = [(nid, s) for nid, s in node_scores.items() if s.get("risk_level") == "medium"]
        high_nodes.sort(key=lambda x: x[1].get("priority", 0), reverse=True)
        medium_nodes.sort(key=lambda x: x[1].get("priority", 0), reverse=True)

        parts = []
        if high_nodes:
            parts.append(self._zh(
                f"优先处理 {len(high_nodes)} 个高风险节点：",
                f"Prioritize {len(high_nodes)} high-risk nodes:",
            ))
            for nid, s in high_nodes[:5]:
                action_type = s.get("action_type", "")
                justification = s.get("action_justification", {})
                reasons = justification.get("reasons", [])
                reason_text = self._zh(
                    f"（触发条件：{'；'.join(reasons)}）" if reasons else "",
                    f" (Trigger: {', '.join(reasons)})" if reasons else "",
                )
                parts.append(f"  • {nid} → {action_type}{reason_text}")
        elif medium_nodes:
            parts.append(self._zh(
                f"当前无高风险节点，建议关注 {len(medium_nodes)} 个中风险节点：",
                f"No high-risk nodes. Monitor {len(medium_nodes)} medium-risk nodes:",
            ))
            for nid, s in medium_nodes[:3]:
                action_type = s.get("action_type", "")
                justification = s.get("action_justification", {})
                reasons = justification.get("reasons", [])
                reason_text = self._zh(
                    f"（触发条件：{'；'.join(reasons)}）" if reasons else "",
                    f" (Trigger: {', '.join(reasons)})" if reasons else "",
                )
                parts.append(f"  • {nid} → {action_type}{reason_text}")
        else:
            parts.append(self._zh(
                "当前无需紧急处置动作，维持正常运行监控即可。",
                "No urgent actions required. Maintain normal operations monitoring.",
            ))

        return "\n".join(parts)

    # ── 第五段：还需补充 ────────────────────────────────────

    def _need_more(self, confidence: dict = None) -> str:
        if not confidence:
            return self._zh(
                "当前分析基于已上传的数据完成。为进一步提升分析质量，建议补充以下数据：\n"
                "  • 节点关系字段（上游/下游节点 ID）— 补充后可生成完整的风险传播路径图\n"
                "  • 库存字段 — 补充后可精确评估库存健康度和缺货风险\n"
                "  • 交期偏差字段 — 补充后可评估供应商交付可靠性和延迟传播风险",
                "Analysis completed with available data. To improve analysis quality, consider adding:\n"
                "  • Node relationship fields (upstream/downstream node IDs) — enables full risk propagation mapping\n"
                "  • Inventory fields — enables precise inventory health and shortage risk assessment\n"
                "  • Delivery deviation fields — enables supplier reliability and delay propagation assessment",
            )

        supplement_map = confidence.get("supplement_map", [])
        if supplement_map:
            parts = [self._zh(
                "以下数据补充后可进一步提升分析完整度：",
                "The following data would further improve analysis completeness:",
            )]
            for item in supplement_map:
                parts.append(self._zh(
                    f"  • {item['missing']} → 当前影响：{item['impact']}；补充后可解锁：{item['unlocks']}",
                    f"  • {item['missing']} → Current impact: {item['impact']}; Unlocks: {item['unlocks']}",
                ))
            return "\n".join(parts)

        messages = confidence.get("messages", [])
        if not messages:
            return self._zh(
                "当前数据覆盖度良好，所有图表均可正常生成。建议保持数据更新频率。",
                "Data coverage is adequate — all charts can be generated. Maintain regular data updates.",
            )

        header = self._zh(
            "以下数据补充后可进一步提升分析完整度：",
            "The following data would further improve analysis completeness:",
        )
        return header + "\n" + "\n".join(f"  • {m}" for m in messages)
