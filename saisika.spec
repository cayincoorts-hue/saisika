# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller 打包配置 — Saisca v1.3

打包命令：
    pyinstaller saisika.spec

产物：
    dist/saisika_backend/    ← onedir 模式，包含所有依赖
    或
    dist/saisika_backend     ← onefile 模式（暂不推荐，启动太慢）
"""

import sys
import platform
from pathlib import Path

# ── 路径配置 ──────────────────────────────────────────────────

PROJECT_DIR = Path(SPECPATH)
BACKEND_DIR = PROJECT_DIR / "app" / "backend"
STATIC_DIR = BACKEND_DIR / "static"
DATA_DIR = PROJECT_DIR / "data"

# ── hiddenimports ─────────────────────────────────────────────
# uvicorn + fastapi 涉及的动态导入模块

hiddenimports = [
    # uvicorn
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.http.httptools_impl",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.lifespan.auto",
    "uvicorn.lifespan.on",
    "uvicorn.logging",
    # fastapi
    "fastapi",
    "fastapi.middleware",
    "fastapi.routing",
    "fastapi.dependencies",
    "starlette",
    "pydantic",
    # services & adapters (确保都被分析到)
    "adapters",
    "adapters.excel_adapter",
    "services",
    "services.field_mapper",
    "services.data_merger",
    "services.graph_builder",
    "services.risk_engine",
    "services.analysis_engine",
    "services.prompt_builder",
    "services.result_exporter",
    "utils",
    "utils.path_utils",
    "utils.error_utils",
    "schemas",
    "schemas.mapping",
    # numpy
    "numpy",
    "numpy.random",
    "numpy.random._pickle",
    # pandas / openpyxl
    "pandas",
    "openpyxl",
    "openpyxl.cell",
]

# ── datas ─────────────────────────────────────────────────────
# (源路径, 目标路径) — 打包进应用资源

datas = [
    # React 前端构建产物
    (str(STATIC_DIR / "index.html"), "app/backend/static"),
    (str(STATIC_DIR / "favicon.png"), "app/backend/static"),
    (str(STATIC_DIR / "icons.svg"), "app/backend/static"),
]

# 静态 assets 目录（如果存在）
assets_dir = STATIC_DIR / "assets"
if assets_dir.exists():
    for f in assets_dir.iterdir():
        if f.is_file():
            datas.append((str(f), f"app/backend/static/assets"))

# 数据目录下的 known_nodes.json
known_nodes = DATA_DIR / "known_nodes.json"
if known_nodes.exists():
    datas.append((str(known_nodes), "data"))

# ── excludes ──────────────────────────────────────────────────
# 不需要打包的模块（减小体积）

excludes = [
    "tkinter",
    "matplotlib",
    "scipy",
    "PIL",
    "PyQt5",
    "PyQt6",
    "wx",
    "test",
    "setuptools",
    "distutils",
    "pip",
    "wheel",
    "pkg_resources",
]

# ── PyInstaller Analysis ──────────────────────────────────────

from PyInstaller.building.build_main import Analysis, PYZ, EXE, COLLECT

a = Analysis(
    [str(BACKEND_DIR / "packaged_app.py")],
    pathex=[str(BACKEND_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure, a.zipped_data)

# ── onedir 模式 ───────────────────────────────────────────────
# 推荐用于开发测试，启动快

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="saisika_backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="saisika_backend",
)
