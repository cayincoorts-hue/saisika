import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

def test_field_mapper_processes_empty_adapter_output():
    from services.field_mapper import FieldMapper
    result = FieldMapper(known_nodes=[]).process({"role":"node_table","file_name":"test.csv","rows":[],"columns":[]})
    assert result is not None
