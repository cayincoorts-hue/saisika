"""Tests for decision engine — action classification and justification."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

from services.decision_engine import DecisionEngine
from utils.bilingual import tl


def make_score(level="low", inv=0, delay_flag=0, delivery=0, vol=0, propagation=1.0):
    return {
        "risk_level": level,
        "risk_components": {
            "inventory_risk": inv,
            "delay_flag_risk": delay_flag,
            "delivery_delay_risk": delivery,
            "volatility_risk": vol,
        },
        "propagation_coefficient": propagation,
    }


def test_low_risk_maintains_status():
    engine = DecisionEngine()
    scores = {"N1": make_score("low")}
    result = engine.decide(scores)
    assert tl(result["N1"]["action_type"], "en") == "Maintain Status Quo"


def test_high_inventory_triggers_replenish():
    engine = DecisionEngine()
    scores = {"N1": make_score("high", inv=0.8)}
    result = engine.decide(scores)
    assert tl(result["N1"]["action_type"], "en") == "Replenish Inventory"


def test_medium_delay_flag_triggers_switch():
    engine = DecisionEngine()
    scores = {"N1": make_score("medium", delay_flag=0.7)}
    result = engine.decide(scores)
    assert tl(result["N1"]["action_type"], "en") == "Switch Supplier"


def test_medium_volatility_triggers_investigate():
    engine = DecisionEngine()
    scores = {"N1": make_score("medium", vol=0.7, propagation=0.5)}
    result = engine.decide(scores)
    assert tl(result["N1"]["action_type"], "en") == "Investigate Volatility"


def test_medium_no_specific_trigger_defaults_to_monitor():
    engine = DecisionEngine()
    scores = {"N1": make_score("medium", vol=0.4, propagation=0.5)}
    result = engine.decide(scores)
    assert tl(result["N1"]["action_type"], "en") == "Increase Monitoring"


def test_justification_has_reasons():
    engine = DecisionEngine()
    scores = {"N1": make_score("high", inv=0.8)}
    result = engine.decide(scores)
    j = result["N1"]["action_justification"]
    assert len(j["reasons"]) > 0


def test_decide_preserves_existing_keys():
    engine = DecisionEngine()
    scores = {"N1": {**make_score("high", inv=0.8), "custom_field": 42}}
    result = engine.decide(scores)
    assert result["N1"]["custom_field"] == 42
    assert "action_type" in result["N1"]


def test_decide_with_bilingual_english():
    engine = DecisionEngine()
    scores = {"N1": make_score("high", inv=0.8)}
    result = engine.decide(scores, lang="en")
    assert result["N1"]["action_type"] == "Replenish Inventory"
    assert "Initiate" in result["N1"]["recommended_action"]
