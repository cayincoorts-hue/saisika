"""Test the demo fixture generator validates structure correctly."""
from scripts.generate_demo_fixture import validate_fixture


def test_demo_fixture_has_graph_and_domain_insights():
    fixture = {
        "input_summary": {"file_count": 7, "node_count": 10},
        "visuals": {
            "propagation_timeline": {
                "nodes": [{"id": "F01"}],
                "edges": [{"source": "F01", "target": "D01"}],
            },
            "domain_insights": {"status": "available"},
        },
    }
    validate_fixture(fixture)


def test_rejects_empty_edges():
    fixture = {
        "input_summary": {"file_count": 7, "node_count": 10},
        "visuals": {
            "propagation_timeline": {
                "nodes": [{"id": "F01"}],
                "edges": [],
            },
            "domain_insights": {"status": "available"},
        },
    }
    import pytest
    with pytest.raises(ValueError, match="connected graph"):
        validate_fixture(fixture)


def test_rejects_missing_domain_insights():
    fixture = {
        "input_summary": {"file_count": 7, "node_count": 10},
        "visuals": {
            "propagation_timeline": {
                "nodes": [{"id": "F01"}],
                "edges": [{"source": "F01", "target": "D01"}],
            },
            "domain_insights": {"status": "unavailable"},
        },
    }
    import pytest
    with pytest.raises(ValueError, match="domain insights"):
        validate_fixture(fixture)
