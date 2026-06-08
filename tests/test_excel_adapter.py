import sys, tempfile, os; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "backend"))

def test_excel_adapter_reads_csv():
    from adapters.excel_adapter import ExcelAdapter
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write("col1,col2\n1,2\n3,4\n"); p = f.name
    try: assert ExcelAdapter().read(p)["role"] is not None
    finally: os.unlink(p)

def test_excel_adapter_handles_missing_file():
    from adapters.excel_adapter import ExcelAdapter
    assert ExcelAdapter().read("/nonexistent/f.csv")["role"] == "error"
