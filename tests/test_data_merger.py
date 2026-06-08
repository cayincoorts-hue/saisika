import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

def test_data_merger_handles_empty_input():
    from services.data_merger import DataMerger
    result = DataMerger().merge([])
    assert result["merge_report"]["total_rows_unified"] == 0
