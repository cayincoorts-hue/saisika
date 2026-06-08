"""Tests for prompt builder — bilingual text summary generation."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

from services.prompt_builder import PromptBuilder


def make_scores():
    return {
        "N1": {"risk_level": "high", "risk_score": 0.8, "risk_causes": ["库存水位严重偏低"], "propagation_coefficient": 0.8, "action_type": "补货", "action_justification": {"reasons": ["库存风险分 0.8 > 阈值 0.6"]}},
        "N2": {"risk_level": "medium", "risk_score": 0.45, "risk_causes": ["存在较大交期偏差"], "propagation_coefficient": 0.6, "action_type": "加强监控", "action_justification": {"reasons": []}},
        "N3": {"risk_level": "low", "risk_score": 0.15, "risk_causes": [], "propagation_coefficient": 0.3, "action_type": "维持现状", "action_justification": {"reasons": []}},
    }


def make_scores_en():
    """Scores with English risk_causes labels."""
    return {
        "N1": {"risk_level": "high", "risk_score": 0.8, "risk_causes": ["Critically low inventory"], "propagation_coefficient": 0.8, "action_type": "Replenish Inventory", "action_justification": {"reasons": ["Inventory risk 0.8 > threshold 0.6"]}},
        "N2": {"risk_level": "medium", "risk_score": 0.45, "risk_causes": ["Significant lead time deviation"], "propagation_coefficient": 0.6, "action_type": "Increase Monitoring", "action_justification": {"reasons": []}},
        "N3": {"risk_level": "low", "risk_score": 0.15, "risk_causes": [], "propagation_coefficient": 0.3, "action_type": "Maintain Status Quo", "action_justification": {"reasons": []}},
    }


def test_build_returns_five_sections():
    pb = PromptBuilder(lang="en")
    result = pb.build(make_scores())
    assert "current_judgment" in result
    assert "main_causes" in result
    assert "impact_targets" in result
    assert "recommended_actions" in result
    assert "need_more" in result


def test_english_output_differs_from_chinese():
    pb_en = PromptBuilder(lang="en")
    pb_zh = PromptBuilder(lang="zh")
    scores = make_scores()
    assert pb_en.build(scores)["current_judgment"] != pb_zh.build(scores)["current_judgment"]


def test_empty_scores_returns_fallback():
    pb = PromptBuilder(lang="en")
    result = pb.build({})
    assert "Insufficient" in result["current_judgment"]


def test_main_causes_aggregates_risk_causes():
    pb = PromptBuilder(lang="en")
    result = pb.build(make_scores_en())
    assert "Critically low inventory" in result["main_causes"]
