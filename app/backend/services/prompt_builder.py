"""五段文字结论生成。

只读 risk_causes 等语义标注字段，不重新用原始数字做阈值判断。
这是之前 bug 的教训——业务判断逻辑只在 risk_engine 里定义一次。

五段结构（设计文档第 17 节）：
1. 当前判断
2. 主要原因
3. 影响对象
4. 建议动作
5. 还需补充

v1.3 更新：
- _main_causes 按网络层级分组归因
- _recommended_actions 利用 action_justification 说明动作条件
"""

from collections import defaultdict


class PromptBuilder:
    """文字结论生成器。

    只消费语义化标注（risk_causes、risk_level 等），不碰原始数值。

    用法:
        builder = PromptBuilder()
        text = builder.build(scores=risk_scores, graph=graph, confidence=...)
    """

    def build(
        self,
        scores: dict,
        graph: dict = None,
        confidence: dict = None,
    ) -> dict:
        """生成五段文字结论。

        Args:
            scores: risk_engine 输出的 node_id → risk_info
            graph: graph_builder 输出的图结构（可选）
            confidence: data_confidence 信息（可选）

        Returns:
            dict: 五段文字，每段一个字符串
        """
        node_scores = scores or {}

        return {
            "current_judgment": self._current_judgment(node_scores),
            "main_causes": self._main_causes(node_scores, graph),
            "impact_targets": self._impact_targets(node_scores, graph),
            "recommended_actions": self._recommended_actions(node_scores),
            "need_more": self._need_more(confidence),
        }

    # ── 第一段：当前判断 ────────────────────────────────────

    def _current_judgment(self, node_scores: dict) -> str:
        """基于风险等级分布做总体判断。"""
        if not node_scores:
            return "暂无足够数据对供应链风险状态做出判断，请先补充节点数据和风险指标。"

        high = sum(1 for s in node_scores.values() if s.get("risk_level") == "high")
        medium = sum(1 for s in node_scores.values() if s.get("risk_level") == "medium")
        low = sum(1 for s in node_scores.values() if s.get("risk_level") == "low")
        total = len(node_scores)

        high_ratio = high / total if total > 0 else 0

        if high_ratio >= 0.3:
            return (
                f"当前供应链网络存在较严重的风险聚集现象。"
                f"在 {total} 个被评估节点中，{high} 个处于高风险状态，"
                f"{medium} 个处于中风险状态。建议立即启动高风险节点的应急预案。"
            )
        elif high > 0:
            return (
                f"当前供应链网络整体风险可控，但存在 {high} 个高风险节点需要重点关注。"
                f"另外 {medium} 个节点处于中风险状态，建议加强监控频率。"
            )
        elif medium > 0:
            return (
                f"当前供应链网络未发现高风险节点，{medium} 个节点处于中风险状态。"
                f"整体风险水平较低，建议保持现有监控节奏。"
            )
        else:
            return (
                f"当前供应链网络运行平稳，{total} 个被监控节点均处于低风险状态。"
                f"建议定期复查以保持风险可见性。"
            )

    # ── 第二段：主要原因 ────────────────────────────────────

    def _main_causes(self, node_scores: dict, graph: dict = None) -> str:
        """统计主要原因，并按网络层级分组归因。

        关键设计：只读 risk_causes 标签，不做任何数值判断。
        """
        if not node_scores:
            return "当前未获得风险原因数据，请补充相关字段后重新分析。"

        # 构建 node_id → level 映射
        node_levels = {}
        if graph and graph.get("nodes"):
            for n in graph["nodes"]:
                node_levels[n["node_id"]] = n.get("level", -1)

        # 统计：cause → {level_group → count}
        cause_stats: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for nid, s in node_scores.items():
            level = node_levels.get(nid, -1)
            if level >= 0:
                level_group = f"第{level}层"
            else:
                level_group = "未分层"

            for cause in s.get("risk_causes", []):
                cause_stats[cause][level_group] += 1

        if not cause_stats:
            return "当前风险主要来自供应链网络结构性因素，未检测到特定的单一风险原因。"

        # 按总出现次数排序
        sorted_causes = sorted(
            cause_stats.items(),
            key=lambda x: sum(x[1].values()),
            reverse=True,
        )

        parts = []
        for cause, level_groups in sorted_causes:
            total = sum(level_groups.values())
            # 如果只有一层，不分组
            if len(level_groups) == 1:
                group_label = list(level_groups.keys())[0]
                parts.append(f"{cause}（{total} 个节点，集中在 {group_label}）")
            else:
                # 按层排序
                sorted_groups = sorted(level_groups.items(), key=lambda x: x[0])
                group_texts = [f"{label} {count} 个" for label, count in sorted_groups]
                parts.append(f"{cause}（{total} 个节点：{'，'.join(group_texts)}）")

        return "；".join(parts) + "。"

    # ── 第三段：影响对象 ────────────────────────────────────

    def _impact_targets(self, node_scores: dict, graph: dict = None) -> str:
        """识别受影响最严重的节点及其在网络中的位置。"""
        if not node_scores:
            return "暂无数据确定受影响的具体对象。"

        sorted_nodes = sorted(
            node_scores.items(),
            key=lambda x: x[1].get("risk_score", 0),
            reverse=True,
        )
        top3 = sorted_nodes[:3]

        if not top3 or top3[0][1].get("risk_score", 0) == 0:
            return "当前未发现显著受影响的对象。"

        parts = []
        for nid, info in top3:
            level = info.get("risk_level", "low")
            level_text = {"high": "高风险", "medium": "中风险", "low": "低风险"}.get(level, level)
            causes = "、".join(info.get("risk_causes", [])) or "综合性风险"
            prop = info.get("propagation_coefficient", 1.0)
            spread = "具有较强的网络传播效应" if prop > 0.7 else "传播影响相对可控"
            action_type = info.get("action_type", "")
            action_text = f"，建议动作：{action_type}" if action_type else ""

            parts.append(
                f"节点 {nid}（{level_text}，评分 {info.get('risk_score', 0):.3f}）："
                f"{causes}，{spread}{action_text}"
            )

        return "影响最显著的节点：\n" + "\n".join(
            f"  {i+1}. {p}" for i, p in enumerate(parts)
        )

    # ── 第四段：建议动作 ────────────────────────────────────

    def _recommended_actions(self, node_scores: dict) -> str:
        """汇总优先处置建议，说明动作的触发条件。"""
        if not node_scores:
            return "暂无足够信息生成处置建议。"

        high_nodes = [
            (nid, s) for nid, s in node_scores.items()
            if s.get("risk_level") == "high"
        ]
        medium_nodes = [
            (nid, s) for nid, s in node_scores.items()
            if s.get("risk_level") == "medium"
        ]

        high_nodes.sort(key=lambda x: x[1].get("priority", 0), reverse=True)
        medium_nodes.sort(key=lambda x: x[1].get("priority", 0), reverse=True)

        parts = []

        if high_nodes:
            parts.append(f"优先处理 {len(high_nodes)} 个高风险节点：")
            for nid, s in high_nodes[:5]:
                action_type = s.get("action_type", "")
                justification = s.get("action_justification", {})
                reasons = justification.get("reasons", [])
                reason_text = f"（触发条件：{'；'.join(reasons)}）" if reasons else ""
                parts.append(
                    f"  • {nid} → {action_type}{reason_text}"
                )
        elif medium_nodes:
            parts.append(f"当前无高风险节点，建议关注 {len(medium_nodes)} 个中风险节点：")
            for nid, s in medium_nodes[:3]:
                action_type = s.get("action_type", "")
                justification = s.get("action_justification", {})
                reasons = justification.get("reasons", [])
                reason_text = f"（触发条件：{'；'.join(reasons)}）" if reasons else ""
                parts.append(
                    f"  • {nid} → {action_type}{reason_text}"
                )
        else:
            parts.append("当前无需紧急处置动作，维持正常运行监控即可。")

        return "\n".join(parts)

    # ── 第五段：还需补充 ────────────────────────────────────

    def _need_more(self, confidence: dict = None) -> str:
        """基于数据可信度生成补充建议。

        不只说"缺数据"，必须说明"补什么"和"补了之后能多生成什么"。
        """
        if not confidence:
            return (
                "当前分析基于已上传的数据完成。为进一步提升分析质量，建议补充以下数据：\n"
                "  • 节点关系字段（上游/下游节点 ID）— 补充后可生成完整的风险传播路径图\n"
                "  • 库存字段 — 补充后可精确评估库存健康度和缺货风险\n"
                "  • 交期偏差字段 — 补充后可评估供应商交付可靠性和延迟传播风险"
            )

        # 优先使用 supplement_map（v1.3 新增）
        supplement_map = confidence.get("supplement_map", [])
        if supplement_map:
            parts = ["以下数据补充后可进一步提升分析完整度："]
            for item in supplement_map:
                parts.append(
                    f"  • {item['missing']} → 当前影响：{item['impact']}；"
                    f"补充后可解锁：{item['unlocks']}"
                )
            return "\n".join(parts)

        messages = confidence.get("messages", [])
        if not messages:
            return "当前数据覆盖度良好，所有图表均可正常生成。建议保持数据更新频率。"

        return "以下数据补充后可进一步提升分析完整度：\n" + "\n".join(
            f"  • {m}" for m in messages
        )
