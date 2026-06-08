import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

def test_analysis_engine_assembles_with_no_data():
    from services.analysis_engine import AnalysisEngine
    result = AnalysisEngine().assemble([], {}, {}, {"total_files": 0}, lang="en")
    assert "meta" in result and "visuals" in result
    assert result["visuals"]["data_confidence"]["confidence_level"] == "low"

def test_analysis_engine_english_labels():
    from services.analysis_engine import AnalysisEngine
    result = AnalysisEngine().assemble([], {}, {}, {"total_files": 0}, lang="en")
    assert result["visuals"]["data_confidence"]["title"] == "Data Confidence"
