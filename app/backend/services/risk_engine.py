"""风险分计算 + risk_causes 语义标注。

阈值唯一源头。下游模块（prompt_builder、analysis_engine、decision_engine）只读
risk_causes 标签和 risk_components，不重新计算阈值。

风险模型（第一版简化：Risk × Propagation）：
  Risk = 波动性(30%) + 库存健康度(25%) + 交付偏差(25%) + 历史标记(20%)
  Propagation = 网络影响度（度数 + 传播脆弱性）
  Score = Risk × Propagation

每节点输出 risk_causes 语义标注字段，供下游直接消费。

v1.3 新增：
  - reasoning_trail：完整推理链条（每个计算步骤 + 数据来源）
  - risk_causes_detail：每个原因附带触发阈值对比
  - domain_patterns：牛鞭效应 / VMI / QR 领域模式检测

注意：动作分类与追溯已提取到 decision_engine.py，risk_engine 只负责风险计算和原因标注。
"""

from collections import defaultdict
from typing import Optional

from utils.error_utils import WarningCollector
from utils.bilingual import tl, tlf


class RiskEngine:
    """风险引擎。

    用法:
        engine = RiskEngine()
        scores = engine.calculate(
            unified_table=unified["unified_table"],
            graph=graph,  # graph_builder 的输出
        )
    """

    def __init__(self):
        self.warnings = WarningCollector()

    # ── 阈值常量（唯一源头）─────────────────────────────────

    INVENTORY_RISK_THRESHOLD = 0.6       # 库存风险 > 此值 → "库存水位严重偏低"
    DELAY_FLAG_THRESHOLD = 0.5           # 延迟标记 > 此值 → "存在历史延迟记录"
    DELAY_VAL_THRESHOLD = 0.3            # 交期偏差 > 此值 → "存在较大交期偏差"
    VOLATILITY_THRESHOLD = 0.5           # 波动性 > 此值 → "指标波动异常偏高"

    HIGH_RISK_THRESHOLD = 0.6
    MEDIUM_RISK_THRESHOLD = 0.3

    # 领域模式检测阈值
    BULLWHIP_CV_RATIO = 1.5              # 上游 CV / 下游平均 CV > 此值 → 牛鞭效应
    VMI_CV_RATIO = 0.5                   # CV / 同类均值 CV < 此值 → VMI 模式
    QR_FREQ_THRESHOLD = 0.8              # 低频高幅 vs 高频低幅判断

    # ── 主入口 ──────────────────────────────────────────────

    def calculate(
        self,
        unified_table: list[dict],
        graph: dict,
        lang: str = "zh",
    ) -> dict:
        """计算所有节点的风险分。

        Args:
            unified_table: data_merger 输出的统一长表
            graph: graph_builder 输出的图结构

        Returns:
            dict: node_id → {
                risk_score, risk_level, priority,
                risk_components, risk_causes, propagation_coefficient,
                recommended_action,
                reasoning_trail,           # v1.3 新增
                risk_causes_detail,        # v1.3 新增
                action_type,               # v1.3 新增
                action_justification,      # v1.3 新增
            }
        """
        self.warnings = WarningCollector()

        if not unified_table:
            self.warnings.add_warning(
                type="no_data",
                message="没有数据，无法计算风险分。",
            )
            return {}

        # 1. 聚合每个节点的指标数据
        node_metrics = self._aggregate_metrics(unified_table)

        # 2. 计算各分量的原始值
        raw_scores: dict[str, dict] = {}
        for nid, metrics in node_metrics.items():
            raw_scores[nid] = self._calculate_components(nid, metrics)

        # 3. 百分位归一化：节点间互相比较
        key_map = {
            "volatility_risk_raw": "volatility_risk",
            "inventory_risk_raw": "inventory_risk",
            "delivery_delay_risk_raw": "delivery_delay_risk",
            "delay_flag_risk_raw": "delay_flag_risk",
        }
        self._normalize_by_percentile(raw_scores, key_map)

        # 4. 领域模式检测（在所有节点分数算完后，统一检测）
        domain_patterns = self._detect_domain_patterns(node_metrics, graph, raw_scores, lang)

        # 5. 结合传播系数计算最终分数
        scores = {}
        for nid, comp in raw_scores.items():
            prop_result = self._calculate_propagation(nid, graph)
            propagation = prop_result["value"]

            # Risk = 各分量加权平均
            risk = (
                comp.get("volatility_risk", 0) * 0.3 +
                comp.get("inventory_risk", 0) * 0.25 +
                comp.get("delivery_delay_risk", 0) * 0.25 +
                comp.get("delay_flag_risk", 0) * 0.2
            )
            score = risk * propagation
            score = min(score, 1.0)

            # 风险等级
            if score >= self.HIGH_RISK_THRESHOLD:
                level = "high"
            elif score >= self.MEDIUM_RISK_THRESHOLD:
                level = "medium"
            else:
                level = "low"

            # 生成语义标注
            causes = self._generate_risk_causes(comp, lang)

            # 注入领域模式标签
            if nid in domain_patterns:
                for pattern in domain_patterns[nid]:
                    causes.append(tl(pattern["label"], lang))

            # 生成原因详情（阈值对比）
            causes_detail = self._generate_risk_causes_detail(comp, domain_patterns.get(nid, []), lang)

            # 推理链条
            reasoning_trail = self._build_reasoning_trail(
                nid, node_metrics.get(nid, {}), comp, risk, propagation,
                prop_result, score, unified_table
            )

            scores[nid] = {
                "risk_score": round(score, 4),
                "risk_level": level,
                "priority": round(score * propagation, 4),
                "risk_components": {k: v for k, v in comp.items()
                                    if k in ("volatility_risk", "inventory_risk",
                                             "delivery_delay_risk", "delay_flag_risk")},
                "risk_causes": causes,
                "propagation_coefficient": round(propagation, 4),
                # v1.3 新增
                "reasoning_trail": reasoning_trail,
                "risk_causes_detail": causes_detail,
            }

        return scores

    # ── 指标聚合 ────────────────────────────────────────────

    def _aggregate_metrics(self, unified_table: list[dict]) -> dict[str, dict]:
        """按 node_id 聚合时间序列指标。

        对每个节点、每个指标：
        - 计算统计量（均值、标准差、CV）
        - 跨场景对比（如 Delivery vs Sales Order 的差异）
        - 记录数据来源文件
        """
        raw: dict[str, dict[str, dict]] = defaultdict(lambda: defaultdict(lambda: {
            "values": [], "source_files": set()
        }))

        for row in unified_table:
            nid = row.get("node_id", "")
            metric = row.get("metric_name", "")
            val = row.get("value", 0)
            source = row.get("source_file", "")
            if nid and metric:
                raw[nid][metric]["values"].append(val)
                if source:
                    raw[nid][metric]["source_files"].add(source)

        result = {}
        for nid, metric_data in raw.items():
            stats = {}
            for metric, data in metric_data.items():
                vals = data["values"]
                if not vals:
                    continue
                mean_val = sum(vals) / len(vals)
                variance = sum((v - mean_val) ** 2 for v in vals) / len(vals)
                std_val = variance ** 0.5
                cv = std_val / mean_val if mean_val > 0 else 0

                stats[metric] = {
                    "mean": round(mean_val, 2),
                    "std": round(std_val, 2),
                    "cv": round(cv, 4),
                    "total": round(sum(vals), 2),
                    "count": len(vals),
                    "source_files": sorted(data["source_files"]),
                }

            # 跨场景对比
            so_stats = stats.get("Sales Order", {})
            prod_stats = stats.get("Production", {})
            delivery_stats = stats.get("Delivery To Distributor", {})

            so_mean = so_stats.get("mean", 0)
            prod_mean = prod_stats.get("mean", 0)
            if so_mean > 0:
                stats["_so_prod_ratio"] = prod_mean / so_mean
            delivery_total = delivery_stats.get("total", 0)
            if so_mean > 0 and delivery_total > 0:
                so_count = so_stats.get("count", 1)
                stats["_delivery_per_order"] = delivery_total / (so_mean * so_count)

            result[nid] = stats

        return result

    # ── 分量计算 ────────────────────────────────────────────

    def _calculate_components(self, nid: str, metrics: dict) -> dict[str, float]:
        """计算各风险分量（原始值，后续做百分位归一化）。"""
        components = {}

        cvs = []
        for metric, stats in metrics.items():
            if metric.startswith("_"):
                continue
            cv = stats.get("cv", 0)
            if cv > 0:
                cvs.append(cv)
        raw_volatility = sum(cvs) / len(cvs) if cvs else 0
        components["volatility_risk_raw"] = round(raw_volatility, 4)
        components["inventory_risk_raw"] = round(raw_volatility, 4)

        deliv_per_order = metrics.get("_delivery_per_order", 1.0)
        if deliv_per_order > 0:
            deviation = abs(deliv_per_order - 1.0)
            components["delivery_delay_risk_raw"] = round(deviation, 4)
        else:
            components["delivery_delay_risk_raw"] = 0.0

        so_prod_ratio = metrics.get("_so_prod_ratio", 1.0)
        if so_prod_ratio > 0:
            imbalance = abs(so_prod_ratio - 1.0)
            components["delay_flag_risk_raw"] = round(imbalance, 4)
        else:
            components["delay_flag_risk_raw"] = 0.0

        return components

    @staticmethod
    def _percentile(values: list[float], pct: float) -> float:
        """计算列表的百分位数。"""
        if not values:
            return 0.0
        sorted_vals = sorted(values)
        idx = int(pct * len(sorted_vals))
        idx = min(idx, len(sorted_vals) - 1)
        return sorted_vals[idx]

    def _normalize_by_percentile(
        self, raw_scores: dict[str, dict], key_map: dict[str, str]
    ):
        """将原始分量值按百分位归一化到 0.0—1.0。"""
        raw_values: dict[str, list[float]] = defaultdict(list)
        for nid, comp in raw_scores.items():
            for raw_key in key_map.keys():
                raw_values[raw_key].append(comp.get(raw_key, 0))

        for nid, comp in raw_scores.items():
            for raw_key, norm_key in key_map.items():
                raw_val = comp.get(raw_key, 0)
                all_vals = raw_values.get(raw_key, [0])
                rank = sum(1 for v in all_vals if v < raw_val) / max(len(all_vals), 1)
                comp[norm_key] = round(rank, 4)
            for raw_key in key_map:
                comp.pop(raw_key, None)

    # ── 传播系数 ────────────────────────────────────────────

    def _calculate_propagation(self, nid: str, graph: dict) -> dict:
        """计算传播系数，返回值和分解信息。

        Returns:
            dict: {
                "value": float,
                "degree": int,
                "max_degree": int,
                "degree_factor": float,
                "level": int,
                "max_level": int,
                "position_factor": float,
                "formula": str,
            }
        """
        result = {
            "value": 1.0,
            "degree": 0,
            "max_degree": 1,
            "degree_factor": 0.0,
            "level": -1,
            "max_level": 1,
            "position_factor": 0.5,
            "formula": "",
        }

        if not graph or not graph.get("nodes"):
            result["formula"] = "无网络图，传播系数默认为 1.0"
            return result

        nodes = graph.get("nodes", [])
        node_info = None
        max_degree = 1
        node_levels = []

        for n in nodes:
            deg = n.get("in_degree", 0) + n.get("out_degree", 0)
            max_degree = max(max_degree, deg)
            node_levels.append(n.get("level", -1))
            if n["node_id"] == nid:
                node_info = n

        if not node_info:
            result["formula"] = "节点不在网络图中，传播系数默认为 1.0"
            return result

        degree = node_info.get("in_degree", 0) + node_info.get("out_degree", 0)
        level = node_info.get("level", -1)
        max_level = max(node_levels) if node_levels else 1

        degree_factor = degree / max_degree if max_degree > 0 else 0
        degree_factor = round(degree_factor, 4)

        if max_level > 0 and level >= 0:
            middle = max_level / 2
            position_factor = 1.0 - abs(level - middle) / max(max_level, 1)
        else:
            position_factor = 0.5
        position_factor = round(position_factor, 4)

        propagation = 0.5 + 0.3 * degree_factor + 0.2 * position_factor
        propagation = round(propagation, 4)

        result.update({
            "value": propagation,
            "degree": degree,
            "max_degree": max_degree,
            "degree_factor": degree_factor,
            "level": level,
            "max_level": max_level,
            "position_factor": position_factor,
            "formula": (
                f"0.5 + 0.3×({degree}/{max_degree}) + 0.2×{position_factor}"
                f" = 0.5 + {round(0.3 * degree_factor, 4)} + {round(0.2 * position_factor, 4)}"
                f" = {propagation}"
            ),
        })

        return result

    # ── 语义标注生成（阈值唯一源头）─────────────────────────

    def _generate_risk_causes(self, components: dict[str, float], lang: str = "zh") -> list[str]:
        """根据风险分量生成语义标签。

        这是系统中唯一判断阈值的地方。
        下游模块只读这些标签，不重新做数值判断。
        """
        causes = []

        inv_risk = components.get("inventory_risk", 0)
        delay_flag = components.get("delay_flag_risk", 0)
        delivery = components.get("delivery_delay_risk", 0)
        vol = components.get("volatility_risk", 0)

        if inv_risk > self.INVENTORY_RISK_THRESHOLD:
            causes.append(tl("库存水位严重偏低", lang))

        if delay_flag > self.DELAY_FLAG_THRESHOLD:
            causes.append(tl("存在历史延迟记录", lang))

        if delivery > self.DELAY_VAL_THRESHOLD:
            causes.append(tl("存在较大交期偏差", lang))

        if vol > self.VOLATILITY_THRESHOLD:
            causes.append(tl("指标波动异常偏高", lang))

        if not causes:
            if any(v > 0.2 for v in components.values()):
                causes.append(tl("多个指标存在轻度风险", lang))
            else:
                causes.append(tl("当前风险主要来自供应链网络结构性因素", lang))

        return causes

    def _generate_risk_causes_detail(
        self, components: dict[str, float], domain_patterns: list[dict], lang: str = "zh"
    ) -> list[dict]:
        """为每个风险标签附带触发阈值对比信息。"""
        details = []

        inv = components.get("inventory_risk", 0)
        if inv > self.INVENTORY_RISK_THRESHOLD:
            details.append({
                "label": tl("库存水位严重偏低", lang),
                "triggered_by": "inventory_risk",
                "actual_value": round(inv, 4),
                "threshold": self.INVENTORY_RISK_THRESHOLD,
                "excess_ratio": round((inv - self.INVENTORY_RISK_THRESHOLD) / self.INVENTORY_RISK_THRESHOLD * 100, 0),
            })

        delay_flag = components.get("delay_flag_risk", 0)
        if delay_flag > self.DELAY_FLAG_THRESHOLD:
            details.append({
                "label": tl("存在历史延迟记录", lang),
                "triggered_by": "delay_flag_risk",
                "actual_value": round(delay_flag, 4),
                "threshold": self.DELAY_FLAG_THRESHOLD,
                "excess_ratio": round((delay_flag - self.DELAY_FLAG_THRESHOLD) / self.DELAY_FLAG_THRESHOLD * 100, 0),
            })

        delivery = components.get("delivery_delay_risk", 0)
        if delivery > self.DELAY_VAL_THRESHOLD:
            details.append({
                "label": tl("存在较大交期偏差", lang),
                "triggered_by": "delivery_delay_risk",
                "actual_value": round(delivery, 4),
                "threshold": self.DELAY_VAL_THRESHOLD,
                "excess_ratio": round((delivery - self.DELAY_VAL_THRESHOLD) / self.DELAY_VAL_THRESHOLD * 100, 0),
            })

        vol = components.get("volatility_risk", 0)
        if vol > self.VOLATILITY_THRESHOLD:
            details.append({
                "label": tl("指标波动异常偏高", lang),
                "triggered_by": "volatility_risk",
                "actual_value": round(vol, 4),
                "threshold": self.VOLATILITY_THRESHOLD,
                "excess_ratio": round((vol - self.VOLATILITY_THRESHOLD) / self.VOLATILITY_THRESHOLD * 100, 0),
            })

        for pattern in domain_patterns:
            details.append({
                "label": tl(pattern["label"], lang),
                "triggered_by": pattern.get("type", "domain_pattern"),
                "actual_value": pattern.get("actual_value", ""),
                "threshold": pattern.get("threshold", ""),
                "excess_ratio": pattern.get("excess_ratio", ""),
            })

        return details

    # ── 领域模式检测 ────────────────────────────────────────

    def _detect_domain_patterns(
        self, node_metrics: dict, graph: dict, raw_scores: dict, lang: str = "zh"
    ) -> dict[str, list[dict]]:
        """供应链领域特有模式检测。

        检测三种模式：
        - 牛鞭效应：需求波动沿供应链向上游放大
        - VMI 节点：波动显著低于同类节点
        - QR 补货特征：高频小幅波动模式

        Returns:
            {node_id: [{"type": "bullwhip"|"vmi"|"qr", "label": "...", ...}]}
        """
        patterns: dict[str, list[dict]] = defaultdict(list)

        if not graph or not graph.get("nodes"):
            return patterns

        # 构建节点 → level 映射
        node_levels = {n["node_id"]: n.get("level", -1) for n in graph.get("nodes", [])}

        # 按层级分组计算平均 CV
        level_cvs: dict[int, list[float]] = defaultdict(list)
        for nid, metrics in node_metrics.items():
            avg_cv = self._avg_cv(metrics)
            if avg_cv > 0:
                level = node_levels.get(nid, -1)
                level_cvs[level].append(avg_cv)

        level_avg_cv = {}
        for lv, cvs in level_cvs.items():
            if cvs:
                level_avg_cv[lv] = sum(cvs) / len(cvs)

        # 牛鞭效应检测：比较上下游 CV
        adjacency = graph.get("adjacency", {})
        for nid, metrics in node_metrics.items():
            node_cv = self._avg_cv(metrics)
            if node_cv <= 0:
                continue

            # 获取下游邻居的平均 CV
            neighbors = adjacency.get(nid, [])
            neighbor_cvs = []
            for nb in neighbors:
                nb_cv = self._avg_cv(node_metrics.get(nb, {}))
                if nb_cv > 0:
                    neighbor_cvs.append(nb_cv)

            if neighbor_cvs:
                avg_downstream_cv = sum(neighbor_cvs) / len(neighbor_cvs)
                ratio = node_cv / avg_downstream_cv if avg_downstream_cv > 0 else 0
                if ratio > self.BULLWHIP_CV_RATIO:
                    label_zh = (
                        f"该节点存在牛鞭效应：需求波动沿供应链放大 "
                        f"（上游 CV {node_cv:.3f} / 下游平均 CV {avg_downstream_cv:.3f}"
                        f" = {ratio:.1f} 倍）"
                    )
                    label_en = (
                        f"Bullwhip effect: demand amplification upstream "
                        f"(upstream CV {node_cv:.3f} / downstream avg CV {avg_downstream_cv:.3f}"
                        f" = {ratio:.1f}x)"
                    )
                    patterns[nid].append({
                        "type": "bullwhip",
                        "label": tlf(label_zh, label_en, lang),
                        "actual_value": f"CV ratio {ratio:.1f}",
                        "threshold": f"> {self.BULLWHIP_CV_RATIO}",
                        "excess_ratio": "",
                    })

            # VMI 检测：波动显著低于同类节点
            level = node_levels.get(nid, -1)
            avg_cv_for_level = level_avg_cv.get(level, 0)
            if avg_cv_for_level > 0 and node_cv / avg_cv_for_level < self.VMI_CV_RATIO:
                patterns[nid].append({
                    "type": "vmi",
                    "label": tlf(
                        f"该节点波动显著低于同层节点 "
                        f"（CV {node_cv:.3f} / 同层平均 {avg_cv_for_level:.3f}），"
                        f"符合 VMI 信息共享模式特征",
                        f"Node volatility significantly below tier average "
                        f"(CV {node_cv:.3f} / tier avg {avg_cv_for_level:.3f}), "
                        f"consistent with VMI information-sharing pattern"
                    ),
                    "actual_value": f"CV ratio {node_cv / avg_cv_for_level:.2f}",
                    "threshold": f"< {self.VMI_CV_RATIO}",
                    "excess_ratio": "",
                })

            # QR 检测：高频小幅（CV 低、数据点多）
            total_points = sum(
                s.get("count", 0) for s in metrics.values()
                if not str(s).startswith("_") and isinstance(s, dict)
            )
            if node_cv < 0.15 and total_points > 200:
                patterns[nid].append({
                    "type": "qr",
                    "label": tlf(
                        f"该节点呈现 QR 高频补货特征："
                        f"CV {node_cv:.3f}（波动小），数据点 {total_points}（频次高）",
                        f"Quick Response (QR) pattern detected: "
                        f"CV {node_cv:.3f} (low volatility), {total_points} data points (high frequency)"
                    ),
                    "actual_value": f"CV {node_cv:.3f}",
                    "threshold": f"CV < 0.15 且数据点 > 200",
                    "excess_ratio": "",
                })

        return dict(patterns)

    @staticmethod
    def _avg_cv(metrics: dict) -> float:
        """计算节点各指标的平均 CV。"""
        cvs = []
        for key, stats in metrics.items():
            if key.startswith("_") or not isinstance(stats, dict):
                continue
            cv = stats.get("cv", 0)
            if cv > 0:
                cvs.append(cv)
        return sum(cvs) / len(cvs) if cvs else 0.0

    # ── 推理链条构建 ────────────────────────────────────────

    def _build_reasoning_trail(
        self, nid: str, metrics: dict, components: dict,
        risk: float, propagation: float, prop_result: dict,
        final_score: float, unified_table: list[dict]
    ) -> dict:
        """构建完整的推理链条，记录每个计算步骤和数据来源。"""

        # 数据来源：从 metrics 中提取
        data_sources = []
        for metric_name, stats in metrics.items():
            if metric_name.startswith("_") or not isinstance(stats, dict):
                continue
            files = stats.get("source_files", [])
            data_sources.extend(files)
        data_sources = sorted(set(data_sources))

        # 指标摘要
        metrics_summary = {}
        for metric_name, stats in metrics.items():
            if metric_name.startswith("_") or not isinstance(stats, dict):
                continue
            metrics_summary[metric_name] = {
                "mean": stats.get("mean", 0),
                "std": stats.get("std", 0),
                "cv": stats.get("cv", 0),
                "data_points": stats.get("count", 0),
                "source_files": stats.get("source_files", []),
            }

        # 分步计算过程
        vol = components.get("volatility_risk", 0)
        inv = components.get("inventory_risk", 0)
        delivery = components.get("delivery_delay_risk", 0)
        delay_flag = components.get("delay_flag_risk", 0)

        steps = [
            {
                "step": 1,
                "name": "指标聚合",
                "description": (
                    f"从 {len(data_sources)} 个文件聚合 {len(metrics_summary)} 个指标的时序数据"
                ),
                "detail": {
                    "source_files": data_sources,
                    "metrics_summary": metrics_summary,
                },
            },
            {
                "step": 2,
                "name": "分量计算",
                "description": "计算四个风险分量的原始值",
                "detail": {
                    "volatility": f"各指标平均 CV = {components.get('volatility_risk_raw', 'N/A')}（归一化前）",
                    "cross_scenario": {
                        "_so_prod_ratio": metrics.get("_so_prod_ratio", "N/A"),
                        "_delivery_per_order": metrics.get("_delivery_per_order", "N/A"),
                    },
                },
            },
            {
                "step": 3,
                "name": "百分位归一化",
                "description": "将各分量在所有节点中的排名转换为 0-1 得分",
                "detail": {
                    "volatility_risk": vol,
                    "inventory_risk": inv,
                    "delivery_delay_risk": delivery,
                    "delay_flag_risk": delay_flag,
                },
            },
            {
                "step": 4,
                "name": "风险加权",
                "description": (
                    f"Risk = {vol}×0.30 + {inv}×0.25 + {delivery}×0.25 + {delay_flag}×0.20"
                    f" = {risk:.4f}"
                ),
                "detail": {
                    "contributions": {
                        "volatility": round(vol * 0.3, 4),
                        "inventory": round(inv * 0.25, 4),
                        "delivery_delay": round(delivery * 0.25, 4),
                        "delay_flag": round(delay_flag * 0.2, 4),
                    },
                    "total_risk": round(risk, 4),
                },
            },
            {
                "step": 5,
                "name": "传播系数",
                "description": prop_result["formula"],
                "detail": {
                    "degree": prop_result["degree"],
                    "max_degree": prop_result["max_degree"],
                    "degree_factor": prop_result["degree_factor"],
                    "level": prop_result["level"],
                    "max_level": prop_result["max_level"],
                    "position_factor": prop_result["position_factor"],
                },
            },
            {
                "step": 6,
                "name": "最终评分",
                "description": (
                    f"Score = Risk × Propagation = {risk:.4f} × {propagation:.4f}"
                    f" = {final_score:.4f}"
                    f"{'（已封顶至 1.0）' if risk * propagation > 1.0 else ''}"
                ),
                "detail": {
                    "risk": round(risk, 4),
                    "propagation": propagation,
                    "raw_product": round(risk * propagation, 4),
                    "final_score": round(final_score, 4),
                },
            },
        ]

        return {
            "data_sources": data_sources,
            "metrics_summary": metrics_summary,
            "steps": steps,
            "risk_level_thresholds": {
                "high": self.HIGH_RISK_THRESHOLD,
                "medium": self.MEDIUM_RISK_THRESHOLD,
            },
        }
