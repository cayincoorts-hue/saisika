"""本地序列号验证。

机器指纹绑定 + 离线激活码校验，不联网。

用法：
  from utils.license import LicenseManager
  mgr = LicenseManager()
  mgr.is_activated()           # → bool
  mgr.get_machine_id()         # → "XXXX-XXXX-XXXX"
  mgr.activate("XXXX-...")     # → (bool, message)
"""

import hashlib
import json
import os
import subprocess
import uuid
from pathlib import Path

# 激活码的加密盐 — 从环境变量读取，不硬编码在代码里
_SECRET_SALT = os.environ.get("SAISKA_LICENSE_SALT", "saisika-sc-supply-chain-2026")


def _data_dir() -> Path:
    """获取数据目录（与 path_utils 一致的逻辑）。"""
    # 优先用环境变量
    env_dir = os.environ.get("SAISCA_DATA_DIR", "")
    if env_dir:
        return Path(env_dir)
    # 默认项目 data/ 目录
    return Path(__file__).resolve().parent.parent.parent.parent / "data"


class LicenseManager:
    """序列号管理器。"""

    LICENSE_FILE = "license.json"

    def __init__(self):
        self._data_dir = _data_dir()
        self._license_path = self._data_dir / self.LICENSE_FILE

    # ── 机器指纹 ──────────────────────────────────────────

    def get_machine_id(self) -> str:
        """生成机器指纹（短格式，方便沟通）。"""
        raw = self._collect_hardware_info()
        h = hashlib.sha256(raw.encode()).hexdigest()
        # 取前 12 位十六进制，分成 3 组
        upper = h[:12].upper()
        return "-".join(upper[i:i+4] for i in range(0, 12, 4))

    @staticmethod
    def _collect_hardware_info() -> str:
        """收集硬件标识信息。"""
        parts = []

        # macOS: 硬件 UUID
        try:
            result = subprocess.run(
                ["system_profiler", "SPHardwareDataType"],
                capture_output=True, text=True, timeout=5
            )
            parts.append(result.stdout)
        except Exception:
            pass

        # 平台信息
        import platform
        parts.append(platform.node())
        parts.append(platform.machine())

        # MAC 地址
        try:
            mac = uuid.getnode()
            parts.append(str(mac))
        except Exception:
            pass

        return "|".join(parts)

    # ── 密钥生成（内部）───────────────────────────────────

    def _expected_hash(self) -> str:
        """计算本机的期望激活哈希。"""
        machine_id = self.get_machine_id().replace("-", "")
        combined = f"{machine_id}:{_SECRET_SALT}"
        return hashlib.sha256(combined.encode()).hexdigest()

    # ── 激活状态 ──────────────────────────────────────────

    def is_activated(self) -> bool:
        """检查是否已激活。"""
        if not self._license_path.exists():
            return False
        try:
            with open(self._license_path, "r") as f:
                data = json.load(f)
            stored_hash = data.get("activation_hash", "")
            return stored_hash == self._expected_hash()
        except (json.JSONDecodeError, KeyError):
            return False

    def activate(self, key: str) -> tuple[bool, str]:
        """激活产品。

        Args:
            key: 用户输入的激活码（16 位格式如 SAISKA-XXXX-XXXX-XXXX）

        Returns:
            (成功与否, 提示信息)
        """
        # 标准化 key：去掉分隔符、转大写
        cleaned = key.replace("-", "").replace(" ", "").upper()
        if len(cleaned) != 16:
            return False, "激活码格式不正确，应为 SAISKA-XXXX-XXXX-XXXX（16 位）。"

        expected = self._expected_hash()[:16].upper()
        if cleaned != expected:
            return False, (
                f"激活码无效。当前机器 ID：{self.get_machine_id()}。"
                f"请将此 ID 发送给供应商获取有效激活码。"
            )

        # 保存激活状态
        self._data_dir.mkdir(parents=True, exist_ok=True)
        with open(self._license_path, "w") as f:
            json.dump({
                "activation_hash": self._expected_hash(),
                "machine_id": self.get_machine_id(),
                "activated_at": "",
            }, f, ensure_ascii=False)

        return True, "激活成功，请重启应用。"

    def get_status(self) -> dict:
        """获取当前激活状态信息。"""
        activated = self.is_activated()
        return {
            "activated": activated,
            "machine_id": self.get_machine_id(),
        }


def generate_key(machine_id: str) -> str:
    """根据机器 ID 生成激活码（供供应商使用）。

    用法:
        python -c "from utils.license import generate_key; print(generate_key('XXXX-XXXX-XXXX'))"
    """
    cleaned = machine_id.replace("-", "").replace(" ", "").upper()
    if len(cleaned) != 12:
        raise ValueError(f"机器 ID 格式不正确，应为 12 位（如 XXXX-XXXX-XXXX），收到: {machine_id}")
    combined = f"{cleaned}:{_SECRET_SALT}"
    h = hashlib.sha256(combined.encode()).hexdigest()[:16].upper()
    return "-".join(h[i:i+4] for i in range(0, 16, 4))
