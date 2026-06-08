"""Tests for bilingual translation layer."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

from utils.bilingual import tl, tlf


def test_tl_zh_returns_chinese():
    assert tl("库存水位严重偏低", "zh") == "库存水位严重偏低"
    assert tl("补货", "zh") == "补货"


def test_tl_en_returns_english():
    assert tl("库存水位严重偏低", "en") == "Critically low inventory"
    assert tl("补货", "en") == "Replenish Inventory"
    assert tl("维持现状", "en") == "Maintain Status Quo"


def test_tl_unknown_returns_as_is():
    assert tl("some unknown text", "en") == "some unknown text"
    assert tl("another thing", "zh") == "another thing"


def test_tlf_zh():
    result = tlf("中文测试", "English test", "zh")
    assert result == "中文测试"


def test_tlf_en():
    result = tlf("中文测试", "English test", "en")
    assert result == "English test"


def test_tlf_default_is_zh():
    result = tlf("默认中文", "Default English")
    assert result == "默认中文"


def test_risk_causes_all_have_translations():
    from utils.bilingual import RISK_CAUSES
    for zh, en in RISK_CAUSES.items():
        assert tl(zh, "en") == en
        assert tl(zh, "zh") == zh


def test_actions_all_have_translations():
    from utils.bilingual import ACTIONS
    for zh, en in ACTIONS.items():
        assert tl(zh, "en") == en
        assert tl(zh, "zh") == zh


def test_supplements_all_have_translations():
    from utils.bilingual import SUPPLEMENTS, MISSING_REASONS
    for zh, en in {**SUPPLEMENTS, **MISSING_REASONS}.items():
        assert tl(zh, "en") == en
