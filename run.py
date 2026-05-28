"""Saisca — 供应链风险分析系统，一键启动脚本。

用法：
    python run.py              # 默认启动（localhost:8000）
    python run.py --port 3000  # 指定端口
    python run.py --reload     # 开发模式（代码变更自动重启）
"""

import argparse
import os
import sys
import webbrowser
from pathlib import Path

# 确保项目根目录在 Python 路径中
PROJECT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_DIR / "app" / "backend"
sys.path.insert(0, str(BACKEND_DIR))


def main():
    parser = argparse.ArgumentParser(description="Saisca — 供应链风险分析系统")
    parser.add_argument("--port", type=int, default=8000, help="服务端口（默认 8000）")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="绑定地址（默认 127.0.0.1）")
    parser.add_argument("--reload", action="store_true", help="开发模式，代码变更自动重启")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    print("=" * 50)
    print("  Saisca v1.2 — 供应链风险分析")
    print("=" * 50)
    print()
    print(f"  启动地址: http://{args.host}:{args.port}")
    print(f"  API 文档: http://{args.host}:{args.port}/docs")
    print()

    # 检查数据目录
    data_dir = PROJECT_DIR / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "uploads").mkdir(exist_ok=True)
    (data_dir / "results").mkdir(exist_ok=True)
    (data_dir / "templates").mkdir(exist_ok=True)

    # 扫描已有数据
    uploads = list((data_dir / "uploads").iterdir())
    results = list((data_dir / "results").glob("*.json"))
    if uploads:
        print(f"  已有上传批次: {len(uploads)}")
    if results:
        print(f"  已有分析结果: {len(results)}")
    if uploads or results:
        print()

    # 自动打开浏览器
    if not args.no_browser:
        try:
            webbrowser.open(f"http://{args.host}:{args.port}")
        except Exception:
            pass

    # 启动 uvicorn
    import uvicorn
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        app_dir=str(BACKEND_DIR),
        log_level="info",
    )


if __name__ == "__main__":
    main()
