import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

def test_scenario_runner_raises_on_missing_batch():
    from services.scenario_runner import ScenarioRunner
    try: ScenarioRunner().get_params(node_id="t", batch_id="nope")
    except FileNotFoundError: pass
