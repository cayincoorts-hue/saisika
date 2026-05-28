"""动作建议生成。

基于风险评分和网络结构，为每个节点生成结构化动作建议。
不重新计算风险阈值——只消费 risk_engine 输出的 risk_components 和 risk_level。

v1.3：动作分类与追溯（论文 3.4 节落地）
  - action_type：结构化动作类型（补货/转单/切换供应商/调整运输路径/核查波动原因/加强监控/维持现状）
  - action_justification：为什么推荐此动作 + 替代方案不可用的原因
  - recommended_action：面向管理层的处置建议文案
"""


class DecisionEngine:
    """动作建议生成器。

    用法:
        engine = DecisionEngine()
        scores = engine.decide(scores=risk_scores, graph=graph)
    """

    # 动作分类阈值
    # 这些阈值与 risk_engine 中的风险阈值对应，但语义不同：
    # risk_engine 阈值 → "是否存在风险"
    # decision_engine 阈值 → "是否应该采取行动"
    INVENTORY_ACTION_THRESHOLD = 0.6
    DELAY_VAL_ACTION_THRESHOLD = 0.3
    DELAY_FLAG_ACTION_THRESHOLD = 0.5
    VOLATILITY_ACTION_THRESHOLD = 0.5
    PROPAGATION_TRANSFER_THRESHOLD = 0.7
    PROPAGATION_REROUTE_THRESHOLD = 0.8

    def decide(self, scores: dict, graph: dict = None) -> dict:
        """为每个节点生成动作建议。

        Args:
            scores: risk_engine 输出的 node_id → risk_info
            graph: graph_builder 输出的图结构

        Returns:
            dict: 更新后的 scores，每个节点增加 action_type / action_justification / recommended_action
        """
        if not scores:
            return scores

        graph = graph or {}

        for nid, s in scores.items():
            level = s.get("risk_level", "low")
            components = s.get("risk_components", {})
            propagation = s.get("propagation_coefficient", 1.0)

            action_type = self._classify_action_type(level, components, propagation)
            recommended_action = self._recommend_action(level, action_type)
            action_justification = self._build_action_justification(
                nid, components, propagation, level, action_type, graph
            )

            s["action_type"] = action_type
            s["recommended_action"] = recommended_action
            s["action_justification"] = action_justification

        return scores

    def _classify_action_type(
        self, level: str, components: dict, propagation: float
    ) -> str:
        """将风险等级和原因映射为结构化动作类型。"""
        if level == "low":
            return "维持现状"

        inv = components.get("inventory_risk", 0)
        delay_flag = components.get("delay_flag_risk", 0)
        delivery = components.get("delivery_delay_risk", 0)
        vol = components.get("volatility_risk", 0)

        if inv > self.INVENTORY_ACTION_THRESHOLD:
            return "补货"

        if delivery > self.DELAY_VAL_ACTION_THRESHOLD and propagation > self.PROPAGATION_TRANSFER_THRESHOLD:
            return "转单"

        if delay_flag > self.DELAY_FLAG_ACTION_THRESHOLD:
            return "切换供应商"

        if propagation > self.PROPAGATION_REROUTE_THRESHOLD:
            return "调整运输路径"

        if level == "medium":
            if vol > self.VOLATILITY_ACTION_THRESHOLD:
                return "核查波动原因"
            return "加强监控"

        return "维持现状"

    def _build_action_justification(
        self, nid: str, components: dict, propagation: float,
        level: str, action_type: str, graph: dict
    ) -> dict:
        """构建动作追溯信息。"""
        justification = {
            "action_type": action_type,
            "reasons": [],
            "alternatives": [],
        }

        inv = components.get("inventory_risk", 0)
        delivery = components.get("delivery_delay_risk", 0)
        delay_flag = components.get("delay_flag_risk", 0)
        vol = components.get("volatility_risk", 0)

        if action_type == "补货":
            justification["reasons"].append(
                f"库存风险分 {inv} > 阈值 {self.INVENTORY_ACTION_THRESHOLD}"
            )
            if propagation < self.PROPAGATION_TRANSFER_THRESHOLD:
                justification["alternatives"].append(
                    f"转单（当前不适用：网络传播系数 {propagation} < {self.PROPAGATION_TRANSFER_THRESHOLD}，影响范围有限）"
                )
            else:
                justification["alternatives"].append(
                    f"转单（当前网络传播系数 {propagation} > {self.PROPAGATION_TRANSFER_THRESHOLD}，可考虑同步转单降低传播风险）"
                )

        elif action_type == "转单":
            justification["reasons"].append(
                f"交期偏差风险 {delivery} > 阈值 {self.DELAY_VAL_ACTION_THRESHOLD}，"
                f"且传播系数 {propagation} > {self.PROPAGATION_TRANSFER_THRESHOLD}"
            )

        elif action_type == "切换供应商":
            justification["reasons"].append(
                f"历史延迟标记 {delay_flag} > 阈值 {self.DELAY_FLAG_ACTION_THRESHOLD}"
            )
            justification["alternatives"].append(
                "转单（当前不适用：需先确认替代供应商的交期能力）"
            )

        elif action_type == "调整运输路径":
            justification["reasons"].append(
                f"传播系数 {propagation} > {self.PROPAGATION_REROUTE_THRESHOLD}，该节点在网络中处于关键位置"
            )

        elif action_type == "核查波动原因":
            justification["reasons"].append(
                f"波动性 {vol} > 阈值 {self.VOLATILITY_ACTION_THRESHOLD}"
            )

        elif action_type == "加强监控":
            justification["reasons"].append("中风险等级，尚未触发具体动作阈值")

        else:
            justification["reasons"].append("低风险等级，维持现有监控频率")

        return justification

    def _recommend_action(self, level: str, action_type: str) -> str:
        """根据动作类型生成处置建议文案。"""
        action_texts = {
            "补货": "启动补货计划，根据库存消耗速率确定补货批量和优先级。",
            "转单": "评估替代供应商交期能力，将部分订单重分配至可用供应源。",
            "切换供应商": "评估备选供应商质量与交期记录，启动供应商切换评估流程。",
            "调整运输路径": "核查该节点在网络中的关键程度，评估替代运输路径的可行性。",
            "核查波动原因": "核查指标波动原因，确认是否为季节性因素或偶发事件。",
            "加强监控": "提高监控频率，持续关注指标变化趋势。",
            "维持现状": "维持正常监控节奏，定期复查。",
        }
        return action_texts.get(action_type, "维持正常监控节奏，定期复查。")
