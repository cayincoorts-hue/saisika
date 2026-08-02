"""Generate a frozen demo fixture from demo_data using the real analysis pipeline.

Reads only demo_data/demo_scenario/*.csv, runs the full backend analysis
(ExcelAdapter → FieldMapper → DataMerger → GraphBuilder → RiskEngine →
DecisionEngine → AnalysisEngine → PromptBuilder), scrubs timestamps and
paths, validates structure, and writes the display-safe result to the
frontend fixtures directory.

Usage:
    python scripts/generate_demo_fixture.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Ensure backend modules are importable
BACKEND_DIR = Path(__file__).resolve().parent.parent / "app" / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from adapters.excel_adapter import ExcelAdapter
from services.field_mapper import FieldMapper
from services.data_merger import DataMerger
from services.graph_builder import GraphBuilder
from services.risk_engine import RiskEngine
from services.decision_engine import DecisionEngine
from services.analysis_engine import AnalysisEngine
from services.prompt_builder import PromptBuilder

DEMO_DATA_DIR = Path(__file__).resolve().parent.parent / "demo_data" / "demo_scenario"
FIXTURE_DIR = Path(__file__).resolve().parent.parent / "app" / "frontend" / "src" / "demo" / "fixtures"
FIXTURE_JSON = FIXTURE_DIR / "result.json"

FIXED_TIMESTAMP = "2026-06-15T12:00:00+08:00"


def validate_fixture(result: dict) -> None:
    """Validate that a demo fixture has the structure needed for the tour."""
    graph = result.get("visuals", {}).get("propagation_timeline", {})
    if not graph.get("nodes") or not graph.get("edges"):
        raise ValueError("demo fixture requires connected graph data")
    insights = result.get("visuals", {}).get("domain_insights", {})
    if insights.get("status") not in ("available", "ok"):
        raise ValueError("demo fixture requires available domain insights")


def _scrub(value):
    """Recursively remove timestamps, absolute paths, and batch ids."""
    if isinstance(value, dict):
        return {k: _scrub(v) for k, v in value.items() if k not in ("timestamp", "created_at", "batch_id")}
    if isinstance(value, list):
        return [_scrub(v) for v in value]
    if isinstance(value, str):
        # Replace any absolute path with a placeholder
        value = re.sub(r"/[^\s\"]+/(demo_data|uploads|results|backend)[^\s\"]*", "<demo>", value)
        # Replace batch-like ids
        value = re.sub(r"batch_\d{8}_\d{6}", "demo_batch", value)
        # Normalise ISO timestamps to the fixed value
        value = re.sub(
            r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*[+\-]\d{2}:?\d{2}",
            FIXED_TIMESTAMP,
            value,
        )
        return value
    return value


def generate() -> dict:
    """Run the real analysis pipeline on demo data and return the scrubbed result."""
    csv_files = sorted(DEMO_DATA_DIR.glob("*.csv"))
    if not csv_files:
        raise RuntimeError(f"No CSV files found in {DEMO_DATA_DIR}")

    adapter = ExcelAdapter()
    mapper = FieldMapper(known_nodes=[])
    map_results = []

    for f in csv_files:
        adapter_out = adapter.read(str(f))
        if adapter_out["role"] == "error":
            continue
        map_result = mapper.process(adapter_out)
        map_results.append(map_result)

    if not map_results:
        raise RuntimeError("No valid files were parsed from demo data")

    merger = DataMerger()
    unified = merger.merge(map_results)

    gb = GraphBuilder()
    graph = gb.build(nodes=unified["nodes"], edges=unified["edges"])

    engine = RiskEngine()
    scores = engine.calculate(unified_table=unified["unified_table"], graph=graph, lang="zh")

    dec_engine = DecisionEngine()
    scores = dec_engine.decide(scores=scores, graph=graph, lang="zh")

    ae = AnalysisEngine()
    analysis = ae.assemble(
        unified_table=unified["unified_table"],
        scores=scores,
        graph=graph,
        merge_report=unified["merge_report"],
        lang="zh",
    )
    pb = PromptBuilder(lang="zh")
    text = pb.build(
        scores=scores,
        graph=graph,
        confidence=analysis["visuals"]["data_confidence"],
    )
    analysis["text_summary"] = text

    scrubbed = _scrub(analysis)
    validate_fixture(scrubbed)
    return scrubbed


def main() -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    result = generate()
    with open(FIXTURE_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Fixture written to {FIXTURE_JSON}")
    print(f"  nodes: {len(result.get('visuals', {}).get('propagation_timeline', {}).get('nodes', []))}")
    print(f"  edges: {len(result.get('visuals', {}).get('propagation_timeline', {}).get('edges', []))}")


if __name__ == "__main__":
    main()
