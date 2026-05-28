#!/usr/bin/env python3
"""激活码生成工具（供供应商使用）。

用法:
    python keygen.py <机器ID>

示例:
    python keygen.py ABCD-1234-5678
    → 激活码: SAISKA-XXXX-XXXX-XXXX
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app", "backend"))

from utils.license import generate_key

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python keygen.py <机器ID>")
        print("示例: python keygen.py ABCD-1234-5678")
        sys.exit(1)

    machine_id = sys.argv[1]
    try:
        key = generate_key(machine_id)
        print(f"机器 ID: {machine_id}")
        print(f"激活码:   {key}")
        print()
        print("将此激活码发送给客户，客户在激活页面输入即可完成激活。")
    except ValueError as e:
        print(f"错误: {e}")
        sys.exit(1)
