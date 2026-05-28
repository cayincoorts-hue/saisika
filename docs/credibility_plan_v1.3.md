# 推理透明化改造方案 v1.3

> 2026-05-28 | 基于现有代码，不重构，只加字段

## 目标

将风险分析的每一步推理过程保留并展示，让用户能追溯任何一个结论来自哪个文件的哪个计算步骤。

## 改动范围

| # | 文件 | 改动 | 约行数 |
|---|------|------|--------|
| 1 | `risk_engine.py` | reasoning_trail + risk_causes_detail + action_justification + domain_patterns | +160 |
| 2 | `prompt_builder.py` | _main_causes 层级归因 + _recommended_actions 条件对应 | +40 |
| 3 | `analysis_engine.py` | 透传新字段 + domain_insights + fingerprint + supplement_map | +65 |
| 4 | `result_exporter.py` | HTML 加推理区和领域洞察区 | +35 |
| 5 | **新建** `ReasoningPanel.tsx` | 推理过程展示面板 | +120 |
| 6 | `RiskNodeTable.tsx` | 原因标签可点击展开 | +30 |
| 7 | `CapabilityHintPanel.tsx` | 改为字段→解锁映射表 | +20 |

不改：main.py / field_mapper.py / data_merger.py / graph_builder.py / 其他前端组件

## 核心设计

### 1. reasoning_trail（推理链条）

每个节点输出完整的计算过程，包含中间值、公式、数据来源。语言风格：客观陈述计算步骤，引用数据来源文件。

### 2. risk_causes_detail（原因追溯）

每个风险标签附带：触发它的具体数值、阈值、超出幅度。

### 3. action_justification（动作追溯，论文 3.4 节落地）

五种动作类型（维持现状/补货/转单/切换供应商/调整运输路径），每种附带触发条件和可选替代方案。

### 4. domain_patterns（领域模式检测）

- 牛鞭效应：上游 CV > 下游 CV × 1.5
- VMI 节点：波动显著低于同类均值
- QR 补货特征：高频小幅波动

### 5. deterministic_fingerprint（可复现性证明）

基于输入数据内容的哈希值，证明同一数据、同一规则、同一结果。

### 6. 前端推理面板

可展开的层级缩进展示，默认收起。每个高风险节点可逐层追溯。
