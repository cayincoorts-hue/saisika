import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

def test_graph_builder_handles_empty_input():
    from services.graph_builder import GraphBuilder
    graph = GraphBuilder().build(nodes=[], edges=[])
    assert graph["graph_meta"]["node_count"] == 0

def test_graph_builder_builds_from_nodes():
    from services.graph_builder import GraphBuilder
    graph = GraphBuilder().build(
        nodes=[{"node_id":"A","node_name":"Alpha"},{"node_id":"B","node_name":"Beta"}],
        edges=[{"source":"A","target":"B"}])
    assert graph["graph_meta"]["node_count"] >= 2
