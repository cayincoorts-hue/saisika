"""Saisca 打包版启动入口。

本地开发用 run.py，打包分发用此文件（PyInstaller 编译后由 Electron 调起）。
"""

import os
import uvicorn

from utils.path_utils import data_path
from main import app


def main():
    host = os.environ.get("SAISCA_HOST", "127.0.0.1")
    port = int(os.environ.get("SAISCA_PORT", "8000"))

    for d in ("uploads", "results", "templates"):
        data_path(d).mkdir(parents=True, exist_ok=True)

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="warning",
    )


if __name__ == "__main__":
    main()
