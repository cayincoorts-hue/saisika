"""PyInstaller 打包与本地开发通用的路径解析工具。

PyInstaller 打包后：
  - 源码/资源 → sys._MEIPASS（onefile）或可执行文件目录下的 _internal/
  - 用户数据 → 可执行文件同级目录

开发模式：
  - 源码/资源 → 项目根目录
  - 用户数据 → 项目根目录下的 data/
"""

import os
import sys
from pathlib import Path


def _base_path() -> Path:
    """返回可执行文件/入口脚本所在的目录。

    PyInstaller onefile:   sys._MEIPASS  = 资源包
    PyInstaller onedir:    无 _MEIPASS，可执行文件在解压目录中
    开发模式:              入口脚本目录
    """
    # PyInstaller onefile 模式：资源临时解压到 _MEIPASS
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        return Path(meipass)

    # PyInstaller onedir 或普通运行
    exe_dir = Path(sys.executable).parent
    internal_dir = exe_dir / "_internal"
    # 松散目录模式存在 _internal/
    if internal_dir.exists():
        return internal_dir

    # 开发模式：从当前文件位置推断项目根目录（backend/utils/ → backend/ → 项目根）
    dev_base = Path(__file__).resolve().parent.parent.parent.parent
    return dev_base


def app_path(*parts: str) -> Path:
    """应用资源路径（打包后读 _MEIPASS，开发时读项目根目录）。"""
    return _base_path().joinpath(*parts)


def data_path(*parts: str) -> Path:
    """用户数据路径（始终在可执行文件同级目录下）。

    打包后：saisika.app 同级目录下的 data/
    开发时：项目根目录下的 data/
    """
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        # PyInstaller onefile：用户数据放 exe 同级
        exe_parent = Path(sys.executable).parent
        return exe_parent / "data" / Path(*parts)

    # onedir 或开发模式：相对项目根目录
    return _base_path().parent / "data" / Path(*parts)
