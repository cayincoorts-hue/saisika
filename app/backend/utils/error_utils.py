"""统一错误格式和 warnings 收集器。

设计原则（CLAUDE.md 第 20 节）：
- 能问清楚的，问客户 → warning + pending
- 跑不通的，报错 → error
- 设计之外的，坦诚说明 → unavailable
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ErrorLevel(str, Enum):
    ERROR = "error"            # 阻断性错误
    WARNING = "warning"        # 非阻断警告
    INFO = "info"              # 补充信息


@dataclass
class AppIssue:
    """统一的问题/警告/错误结构。"""
    level: ErrorLevel
    type: str                  # 例如 "unmatched_node", "duplicate_column", "missing_field"
    message: str               # 人类可读的描述
    detail: str = ""           # 可选的技术细节
    column: str = ""           # 相关的原始列名（如果适用）
    suggestion: str = ""       # 建议用户做什么


class WarningCollector:
    """贯穿整个解析流程的 warnings 收集器。

    每个模块处理完后往里面追加 issues，最终汇总给用户。
    """

    def __init__(self):
        self.issues: list[AppIssue] = []

    def add(self, level: ErrorLevel, type: str, message: str,
            column: str = "", detail: str = "", suggestion: str = ""):
        self.issues.append(AppIssue(
            level=level,
            type=type,
            message=message,
            column=column,
            detail=detail,
            suggestion=suggestion,
        ))

    def add_error(self, type: str, message: str, **kwargs):
        """添加快阻断性错误。"""
        self.add(ErrorLevel.ERROR, type, message, **kwargs)

    def add_warning(self, type: str, message: str, **kwargs):
        """添加非阻断警告。"""
        self.add(ErrorLevel.WARNING, type, message, **kwargs)

    def add_info(self, type: str, message: str, **kwargs):
        """添加补充信息。"""
        self.add(ErrorLevel.INFO, type, message, **kwargs)

    def has_errors(self) -> bool:
        return any(i.level == ErrorLevel.ERROR for i in self.issues)

    def get_errors(self) -> list[AppIssue]:
        return [i for i in self.issues if i.level == ErrorLevel.ERROR]

    def get_warnings(self) -> list[AppIssue]:
        return [i for i in self.issues if i.level == ErrorLevel.WARNING]

    def to_list(self) -> list[dict]:
        """转为可序列化的 dict 列表。"""
        return [
            {
                "level": i.level.value,
                "type": i.type,
                "message": i.message,
                "detail": i.detail,
                "column": i.column,
                "suggestion": i.suggestion,
            }
            for i in self.issues
        ]

    def __bool__(self) -> bool:
        return len(self.issues) > 0

    def __len__(self) -> int:
        return len(self.issues)
