"""Tests for risk engine — core scoring logic."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

from services.risk_engine import RiskEngine


def test_risk_engine_init():
    engine = RiskEngine()
    assert engine is not None
    assert engine.INVENTORY_RISK_THRESHOLD == 0.6
    assert engine.HIGH_RISK_THRESHOLD == 0.6


def test_empty_input_returns_empty():
    engine = RiskEngine()
    result = engine.calculate(unified_table=[], graph={})
    assert result == {}


def test_risk_thresholds_are_consistent():
    """Thresholds must stay constant — they're the single source of truth."""
    engine = RiskEngine()
    assert engine.INVENTORY_RISK_THRESHOLD == 0.6
    assert engine.DELAY_FLAG_THRESHOLD == 0.5
    assert engine.DELAY_VAL_THRESHOLD == 0.3
    assert engine.VOLATILITY_THRESHOLD == 0.5
    assert engine.HIGH_RISK_THRESHOLD == 0.6
    assert engine.MEDIUM_RISK_THRESHOLD == 0.3


def test_domain_pattern_thresholds():
    engine = RiskEngine()
    assert engine.BULLWHIP_CV_RATIO == 1.5
    assert engine.VMI_CV_RATIO == 0.5
    assert engine.QR_FREQ_THRESHOLD == 0.8
