import sys, tempfile, os; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

def test_result_exporter_export_creates_file():
    from services.result_exporter import ResultExporter
    with tempfile.TemporaryDirectory() as tmpdir:
        r = ResultExporter(output_dir=tmpdir).export({"meta":{"version":"test"},"visuals":{}}, batch_id="test_e")
        assert os.path.exists(r["json_path"])

def test_result_exporter_scan_finds_nothing_in_empty_dir():
    from services.result_exporter import ResultExporter
    with tempfile.TemporaryDirectory() as tmpdir:
        assert ResultExporter(output_dir=tmpdir).scan_existing() == []
