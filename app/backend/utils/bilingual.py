"""Shared bilingual label translation for all backend services.

Instead of duplicating translation maps in every module, define all
engine-generated labels here with Chinese and English variants.

Usage:
    from utils.bilingual import tl, BL
    risk_causes = [tl("库存水位严重偏低", lang)]
"""

# ── Risk cause labels ───────────────────────────────────────
RISK_CAUSES = {
    "库存水位严重偏低": "Critically low inventory",
    "存在历史延迟记录": "History of delivery delays",
    "存在较大交期偏差": "Significant lead time deviation",
    "指标波动异常偏高": "Abnormally high metric volatility",
    "当前风险主要来自供应链网络结构性因素": "Risk primarily from network structural factors",
    "多个指标存在轻度风险": "Minor risk across multiple indicators",
}

# ── Domain pattern labels ───────────────────────────────────
DOMAIN_PATTERNS = {
    "该节点存在牛鞭效应：需求波动沿供应链放大": "Bullwhip effect: demand fluctuation amplified upstream",
    "该节点波动显著低于同层节点": "Node volatility significantly below tier average",
    "符合 VMI 信息共享模式特征": "Consistent with VMI information-sharing pattern",
    "高频小批量需求稳定，呈现 QR 补货特征": "High-frequency small-batch stable demand, QR pattern",
}

# ── Action type labels ──────────────────────────────────────
ACTIONS = {
    "补货": "Replenish Inventory",
    "转单": "Reroute Orders",
    "切换供应商": "Switch Supplier",
    "调整运输路径": "Adjust Logistics Route",
    "核查波动原因": "Investigate Volatility",
    "加强监控": "Increase Monitoring",
    "维持现状": "Maintain Status Quo",
}

# ── Action justification reasons ────────────────────────────
ACTION_REASONS = {
    "库存风险分": "Inventory risk",
    "交期偏差风险": "Delivery deviation risk",
    "历史延迟标记": "Historical delay flag",
    "波动性风险": "Volatility risk",
    "网络传播系数": "Network propagation coefficient",
    "阈值": "threshold",
    "> 阈值": "> threshold",
    "当前不适用：网络传播系数": "Not applicable: propagation coefficient",
    "影响范围有限": "limited impact scope",
    "可考虑同步转单降低传播风险": "Consider concurrent rerouting to reduce propagation risk",
    "大于转单阈值且网络传播系数高，建议转单降低影响扩散": "Exceeds reroute threshold with high propagation — reroute to contain spread",
    "超标，建议核查备用供应商": "Exceeds threshold, verify backup suppliers",
    "当前不适用：需先确认替代供应商的交期能力": "Not applicable: confirm alternative supplier lead time first",
    "当前不适用：需确认替代运输路径的可靠性": "Not applicable: confirm alternative route reliability first",
    "超标，建议核查并加强监控频率": "Exceeds threshold, investigate and increase monitoring",
    "风险处于可控范围，无需添加额外动作": "Risk within controllable range, no additional action needed",
}

# ── Supplement map labels ───────────────────────────────────
SUPPLEMENTS = {
    "缺少时间字段，无法生成时序分析。": "Missing time field — temporal analysis unavailable.",
    "缺少节点关系字段，无法展示传播路径。": "Missing node relationship fields — propagation path unavailable.",
    "缺少风险指标字段，无法计算风险评分。": "Missing risk indicator fields — risk scoring unavailable.",
    "节点关系字段": "Node relationship fields",
    "补充后可获得风险趋势图。": "Add to unlock risk trend chart.",
    "补充后可获得完整的传播网络图。": "Add to unlock full propagation network graph.",
    "补充后可获得风险排名和分布。": "Add to unlock risk ranking and distribution.",
    "无法展示风险传播路径": "Cannot display risk propagation path",
    "完整传播网络图、替代路径分析": "Full propagation graph, alternative path analysis",
    "库存字段": "Inventory fields",
    "库存健康度评估精度受限": "Inventory health assessment limited",
    "精确库存风险评估、补货时机建议": "Precise inventory risk, replenishment timing",
    "交期偏差字段": "Lead time deviation fields",
    "供应商交付可靠性评估精度受限": "Supplier reliability assessment limited",
    "延迟传播风险分析、供应商切换建议": "Delay propagation analysis, supplier switch suggestions",
}

# ── Missing reason labels ───────────────────────────────────
MISSING_REASONS = {
    "缺少时间字段，暂时无法可靠生成风险趋势图。": "Time field missing — cannot reliably generate risk trend chart.",
    "缺少节点关系字段，暂时无法可靠生成传播路径。": "Node relationship fields missing — cannot reliably generate propagation paths.",
    "未检测到可用的风险指标字段，暂时只能生成基础结构预览。": "No usable risk metric fields detected — can only generate basic structure preview.",
    "当前没有节点达到中高风险等级。": "No nodes currently at medium or high risk level.",
    "缺少风险评分数据。": "Risk score data unavailable.",
}

# ── Misc engine labels ──────────────────────────────────────
MISC = {
    "全网风险趋势": "Network Risk Trend",
    "风险分布": "Risk Distribution",
    "高风险节点详情": "High-Risk Node Details",
    "传播时序图": "Propagation Timeline",
    "数据可信度": "Data Confidence",
    "节点数": "Nodes",
    "风险评分": "Risk Score",
    "未分层": "Unassigned",
    "时间字段": "Time Field",
    "节点标识": "Node ID",
    "节点关系": "Node Relations",
    "风险指标": "Risk Metrics",
    "风险趋势图": "Risk Trend Chart",
    "风险分布图": "Risk Distribution Chart",
    "高风险节点表": "High-Risk Node Table",
    "供应链领域洞察": "Supply Chain Domain Insights",
    "无法生成风险趋势图": "Cannot generate risk trend chart",
    "无法展示风险传播路径": "Cannot display risk propagation path",
    "无法计算风险评分和排名": "Cannot calculate risk scores and ranking",
    "风险排名、风险分布图、高风险节点表": "Risk ranking, distribution chart, high-risk node table",
    "风险指标字段": "Risk indicator fields",
    "补充后可获得风险排名和分布。": "Add to unlock risk ranking and distribution.",
}


def tl(text: str, lang: str = "zh") -> str:
    """Translate a single label to the requested language.

    If the label is not in any translation map, return as-is.
    """
    if lang == "zh":
        return text

    # Search all dictionaries
    for d in [RISK_CAUSES, DOMAIN_PATTERNS, ACTIONS, ACTION_REASONS,
              SUPPLEMENTS, MISSING_REASONS, MISC]:
        if text in d:
            return d[text]

    return text


def tlf(zh_text: str, en_text: str, lang: str = "zh") -> str:
    """Translate a formatted/literal string with explicit English alternative.

    Use this when the Chinese text contains dynamic values that won't
    match in the static translation dictionaries.
    """
    return zh_text if lang == "zh" else en_text
