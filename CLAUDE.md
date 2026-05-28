# 项目理论与设计讨论记录

更新时间：2026-05-25

---

## 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-05-02 | 初始版本 |
| v1.1 | 2026-05-03 | 决策收口：图片识别、代码复用、优先级公式、流式展示、传播图、开发顺序 |
| v1.2 | 2026-05-25 | 技术栈调整为纯静态部署、Excel+CSV双输入、数据自动持久化、三层数据流架构 |

---

## 1. 当前项目定位

本项目不以论文发表为优先目标，而是转向一个可开源、可本地部署、可被普通供应链管理者直接试用的网页工具。

项目目标：

> 做一个可本地部署、支持 Excel/CSV 导入、面向供应链管理者、能用可视化解释风险与建议的开源网页工具。

---

## 2. 当前产品方向共识

- 产品形态：本地后端 + 浏览器界面
- 第一阶段先做网页，不先做原生 App
- 页面风格干净、易传播，允许适度 UI 动画
- 目标用户：非技术管理者，不是算法工程师
- 用户最关心的四件事：
  1. 我怎么导数据
  2. 哪里有风险
  3. 为什么有风险
  4. 我该怎么办

---

## 3. 输入与部署约束

### 3.1 输入优先级

1. Excel + CSV ← **第一版同时支持**
2. API / 数据库 ← 第三阶段
3. 外部事件数据接入 ← 第三阶段

> **决策（v1.1）：图片识别不在第一版实现。**（原因同 v1.1）

### 3.2 部署约束

- 目标机器：内存 12—16GB 的普通笔记本（Mac / Windows / Linux 均需支持）
- 不依赖云端，数据不出本地
- 启动方式：`python run.py`，浏览器访问 `http://localhost:8000`
- 前端 React 项目构建产物为静态文件，FastAPI 直接 serve，用户无需安装 Node.js

### 3.3 数据持久化（v1.2 新增）

- 默认自动存储到项目 `data/` 目录
- 目录结构：
  ```
  data/
  ├── uploads/           ← 用户上传的原始文件（按批次）
  ├── results/           ← 分析结果 JSON（按批次）
  └── templates/         ← 历史映射模板
  ```
- 系统启动时自动扫描 `data/uploads/`，发现未处理批次提示用户继续
- 用户可在设置中关闭自动存储或切换目录

---

## 4. 顶层架构共识

三层逻辑：

1. 看见风险
2. 理解风险
3. 处理风险

对应系统层次：

- **数据与证据层**
  - Excel/CSV 导入
  - 数据清洗
  - 关系抽取
- **风险状态层**
  - 图结构传播
  - 时序状态演化
  - 节点与链路风险评分
- **决策与解释层**
  - 建议动作生成
  - 风险原因解释
  - 面向管理层的摘要输出

---

## 4.1 数据流架构（v1.2 新增）

```
用户上传 Excel/CSV
  ↓
excel_adapter      读文件 → 识别角色（事实表/节点表/边表/元数据表）
  ↓  dict
field_mapper       宽表 melt → 列名映射 node_id → 三态识别 → 收集 warnings
  ↓  dict
data_merger        跨场景合并 → 统一长表 → 标记 different_measurement_basis
  ↓  dict
graph_builder      节点+边 → 供应链网络图 → 推断层次关系
  ↓  dict
risk_engine        计算风险分 → 生成 risk_causes 语义标注（阈值唯一源头）
  ↓  dict
analysis_engine    组装五类结果对象
  ↓  dict
prompt_builder     从 risk_causes 生成文字结论（只读语义标注，不碰原始数字）
  ↓
result_exporter    输出 JSON + HTML 报告
```

每一步的 warnings 汇聚传递，不静默丢弃。

---

## 5. 页面级 MVP 共识

第一版四个页面：

1. 数据导入页（UploadPage）
2. 文件理解确认页（ConfirmPage）
3. 字段映射确认页（MappingPage）
4. 结果页（ResultPage）

最关键的四类输出：

- 风险图
- 链路图
- 时间趋势
- 建议动作

---

## 6. 理论框架整理

| 模型 | 作用 | 在数据中的体现 |
|------|------|--------------|
| SCOR | 流程本体、角色分类、指标体系 | Sheet 结构和列名 |
| 牛鞭效应 | 定义风险和噪声如何沿链路放大 | 时序数据生成逻辑，上游 CV > 下游 |
| VMI | 定义信息共享和补货控制权 | 节点属性字段，VMI 节点波动小 |
| QR | 定义补货频率、批量和响应节奏 | 补货策略字段，QR=高频小批 |
| SC-BSC | 定义最终动作建议的评价框架 | 输出报告 KPI 四维度 |

---

## 7. 节点权重与多维模型

### 7.1 五维向量

不把节点重要性压成单一数字，使用五维向量：

1. 供给稳定性
2. 库存健康度
3. 履约时效
4. 传播脆弱性
5. 处置灵活性

### 7.2 优先级公式

```
Priority = Risk × Impact × Propagation × (1 - Controllability) × Confidence
```

> **决策（v1.1）：任意维度缺失或为 0 时，系统报错，不输出 Priority。**
>
> 处理规则：
> - 任意维度值为 0 或无法计算 → 触发 `error` 状态
> - 错误提示：`节点 [X] 的 [维度名称] 数据缺失或为零，无法计算优先级评分，请补充对应字段。`
> - 受影响节点在结果表中标红，不显示优先级数值
> - 其余节点正常显示，不因为部分节点报错而中断整体分析
>
> **第一版简化方案：先只计算 `Risk × Propagation` 两个维度。**

---

## 8. 大模型在系统中的位置

大模型放在**解释层**，不替代核心风险引擎。

| 大模型负责 | 大模型不负责 |
|-----------|------------|
| 风险解释 | 最终风险打分主逻辑 |
| 管理层摘要 | 最终动作求解主逻辑 |
| What-if 问答 | |
| 报告生成 | |

---

## 9. 代码复用策略

> **决策（v1.1）：度小满相关代码可以复用。**
>
> 依据：代码来自公开开源渠道，许可证允许复用。
> 方式：按结构改写，不整段原样复制，保持代码清晰可维护。

| 原始文件 | 对应后端模块 | 用途 |
|---------|-------------|------|
| `cli_demo.py` | `llm_adapter.py` | 本地模型接入层 |
| `conversation.py` | `prompt_template.py` | 对话模板与上下文组织 |
| `FinanceIQ/src/utils.py` | `eval/eval_utils.py` | 输出解析、评测辅助 |
| `FinanceIQ/src/hf_causal_model.py` | `eval/evaluate_model.py` | 离线模型验证 |

---

## 10. 项目目录结构（v1.2 更新）

```
供应链风控本地网页项目/
  docs/
  reference_code/
  app/
    frontend/
      src/
        pages/
          UploadPage.tsx
          ConfirmPage.tsx
          MappingPage.tsx
          ResultPage.tsx
        components/
          layout/
            PageShell.tsx
            SectionCard.tsx
            TopNotice.tsx
          upload/
            FileDropzone.tsx
            InputSummaryCard.tsx
          mapping/
            FieldMappingTable.tsx
            MappingStatusBadge.tsx
            RequiredFieldPanel.tsx
          result/
            SummaryPanel.tsx
            RiskNodeTable.tsx
            DownloadPanel.tsx
            CapabilityHintPanel.tsx
          charts/
            RiskTrendChart.tsx
            RiskDistributionChart.tsx
            PropagationTimelineChart.tsx
            DataConfidenceChart.tsx
            ChartStateBlock.tsx
        styles/
          globals.css
          tokens.css
          charts.css
        utils/
    backend/
      main.py
      run.py                    # 一键启动入口（项目根目录）
      adapters/
        excel_adapter.py        # 读 Excel/CSV，输出角色+原始数据
        llm_adapter.py          # 本地模型接入
      services/
        field_mapper.py         # 字段映射 + 宽表 melt + 三态识别
        data_merger.py          # 跨场景合并 + 重复文件标记
        graph_builder.py        # 构建供应链网络图
        risk_engine.py          # 风险计算 + risk_causes 语义标注
        decision_engine.py      # 动作建议生成
        analysis_engine.py      # 组装五类结果对象
        prompt_builder.py       # 文字结论（只读语义标注，不重复计算）
        result_exporter.py      # 导出 JSON + HTML
        prompt_template.py      # 对话模板
      schemas/
        upload.py
        mapping.py
        result.py
      utils/
        file_utils.py
        error_utils.py
      static/                   # 前端 React 构建产物 + ECharts
        index.html
        assets/
        lib/
  data/
    uploads/                    # 用户原始文件（按批次）
    results/                    # 分析结果 JSON（按批次）
    templates/                  # 历史映射模板
  CLAUDE.md                     # 项目记忆文件（每次启动先读取）
```

### 10.1 前端分层原则

- `pages/`：页面级文件，4个，对应流程四步
- `components/`：复用组件，按功能分4组
- `styles/`：全局样式，3个文件，风格不散落在组件里
- `utils/`：前端通用工具

### 10.2 后端分层原则

- `main.py`：FastAPI 入口，注册路由，serve 静态文件
- `run.py`：一键启动脚本，放在项目根目录
- `adapters/`：接外部输入，只负责读进来、转成内部格式
- `services/`：业务逻辑层，每个模块负责一个独立步骤
- `schemas/`：请求和响应结构
- `utils/`：后端工具函数
- **模块接口原则**：下游模块接收上游模块的整个输出 dict，内部自己取需要的字段。字段取不到时报错，不静默用默认值。

### 10.3 样式变量

```css
--color-bg-page
--color-bg-card
--color-text-primary
--color-text-secondary
--color-border
--color-ok
--color-limited
--color-error
--color-unavailable
--color-risk-high
--color-risk-mid
--color-risk-low
--duration-stream
```

### 10.4 ChartStateBlock 渲染规则

| 状态 | 渲染行为 |
|------|---------|
| `ok` | 正常渲染图表 |
| `limited` | 渲染图表 + 底部附短提示 |
| `unavailable` | 不渲染图表，显示原因说明 |
| `error` | 红色报错，阻断该卡片 |

---

## 11. 待继续讨论的问题

- 标准字段下拉框的最终顺序
- `风险指标` 在前端如何作为聚合概念显示
- 模板指纹的归一化规则细节

---

## 12. 技术选型（v1.2 更新）

### 12.1 输入处理

- Excel + CSV：`pandas + openpyxl`，直接解析
- 图片识别：**第一版不实现**
- 前端上传入口：支持 Excel（.xlsx/.xls）和 CSV（.csv）

### 12.2 模型策略

- 大模型：负责解释、摘要和辅助理解，不替代风险引擎
- 本地模型接入：优先 Ollama，保留 transformers 适配
- 图片理解模型（Qwen2.5-VL）：**第一版不接入**

### 12.3 前端技术

- 前端框架：React + TypeScript + Vite（构建产物为纯静态文件）
- 图表引擎：ECharts（内嵌在 `static/lib/`，零外部依赖）
- 传播图：第一版 ECharts graph 静态快照 + 时间滑块；第二阶段引入 Cytoscape.js
- 部署方式：`npm run build` 后产物放入 `backend/static/`，FastAPI 直接 serve
- 用户体验：用户只需 `python run.py`，浏览器访问 `localhost:8000`

### 12.4 后端技术

- Web 框架：Python + FastAPI
- 数据解析：pandas + openpyxl
- 数据交换：JSON
- 流式推送：SSE（Server-Sent Events）

---

## 13. 第一版结果输出

第一版固定输出五类结果：

1. **风险趋势图（risk_trend）**：时间轴上各节点/全网平均风险评分的变化曲线，回答"风险是在加剧还是缓解"
2. **风险分布图（risk_distribution）**：当前时刻高/中/低风险节点的数量分布，含柱状图和环形图，回答"整体风险集中在哪一层"
3. **风险传播时序图（propagation_timeline）**：静态快照 + 时间滑块，节点按风险等级着色，回答"风险从哪里来、往哪里扩散"
4. **高风险节点表（high_risk_nodes）**：中高风险节点明细表，含风险评分、风险等级、优先级、推荐处置动作，回答"具体哪些节点需要立即处理、按什么顺序"
5. **数据可信度图（data_confidence）**：字段覆盖情况、各图表能否生成的能力状态一览，回答"这次分析的结论有多可信、缺了什么数据"

### 13.1 固定补充提示

每次输出固定提示三类补充信息：

1. 补字段
2. 补图片（第二版启用）
3. 补业务说明

提示原则：

- 不只说"缺数据"
- 必须说明"补什么"
- 必须说明"补了之后能多生成什么"

---

## 14. 输出与提示原则

> 系统只基于已提供证据输出结论；信息不足时，明确说明缺失项、原因与影响，不做无依据推断。

统一表达风格（示例）：

- `缺少时间字段，因此暂时无法可靠生成风险趋势图。`
- `缺少节点关系字段，因此暂时无法可靠生成传播路径。`
- `未提供物料标识，分析将停留在节点层。`
- `未检测到可用的风险指标字段，暂时只能生成基础结构预览。`

---

## 15. 第一版最小字段集

### 15.1 必须项

- `节点ID`
- `节点名称`
- `节点类型`
- `时间`
- `至少一个风险指标字段`

### 15.2 建议项

- `上游节点ID`
- `下游节点ID`
- `物料 / SKU`
- `库存`
- `交期 / 到货偏差`
- `订单量 / 交付量`
- `区域 / 地点`
- `补货模式 / VMI / QR`

---

## 16. 字段自动识别规则

### 16.1 系统内部标准字段

```
time, node_id, node_name, node_type,
upstream_node_id, downstream_node_id,
sku, inventory, lead_time, delivery_delay,
order_qty, delivery_qty, risk_flag, region
```

### 16.2 识别状态（三态）

| 状态 | 含义 |
|------|------|
| identified（已识别） | 高置信，自动映射 |
| pending（待确认） | 模糊字段，需用户确认 |
| unrecognized（未识别） | 无法匹配，需用户手动指定 |

### 16.3 识别原则

- 只自动映射高置信字段
- 模糊字段不硬猜，进入「待确认」
- 识别不稳就让用户确认

### 16.4 必须人工确认的常见情况

| 原始字段 | 歧义原因 |
|---------|---------|
| `数量` | 不清楚是订单量、交付量还是库存 |
| `日期` | 不清楚是下单日、交付日还是到货日 |
| `状态` | 不清楚是订单状态、运输状态还是风险状态 |
| `类型` | 不清楚是节点类型、物料类型还是业务类型 |

---

## 17. 即时文字输出结构

> **决策（v1.1）：延迟 2 秒后开始流式展示。**
>
> 具体行为：
> - 用户完成字段映射确认并点击「开始分析」
> - 前端显示分析中状态（进度条或加载动画）
> - 等待 2 秒后开始流式输出文字结论
> - 流式单位：按段落（每段完整内容一次性推出），不逐字符推送
> - 五段按顺序依次推出，每段之间有 0.3 秒间隔

五段式结构：

1. 当前判断
2. 主要原因
3. 影响对象
4. 建议动作
5. 还需补充

---

## 18. 宽表处理规则（v1.2 新增）

### 18.1 宽表 melt

- 日级宽表（行为日期，列为节点）自动转为长表（日期 + node_id + 数值 + metric_name）
- `metric_name` 优先来自文件名（如 Sales Order、Production、Factory Issue、Delivery To Distributor）

### 18.2 跨场景合并

- 不同场景的宽表 melt 后合并成一张统一长表
- 同场景重复文件标记 `different_measurement_basis`，不自动合并数值

### 18.3 重复列名

- 出现 `POP001L12P.1` 等去重后缀时，标记为 `duplicate_column`，留给用户判断

### 18.4 扩展性预留

- 不硬编码维度列，支持未来加入 Region、Customer 等字段

---

## 19. 业务判断不重复原则（v1.2 新增）

> **业务判断逻辑只在数据源头计算一次，下游模块只消费语义化标注，绝不重新用原始数据再做判断。**

示例：`risk_engine` 输出 `risk_causes` 字段：

```python
risk_causes = []
if inventory_risk > 0.6:
    risk_causes.append("库存水位严重偏低")
if delay_flag_risk > 0.5:
    risk_causes.append("存在历史延迟记录")
if delay_val_risk > 0.3:
    risk_causes.append("存在较大交期偏差")
scores[nid]["risk_causes"] = risk_causes
```

`prompt_builder` 只读标签，不碰数字：

```python
def _main_causes(node_scores):
    cause_counts = {}
    for s in node_scores.values():
        for c in s.get("risk_causes", []):
            cause_counts[c] = cause_counts.get(c, 0) + 1
    return "；".join(parts) + "。"
```

---

## 20. 暴露问题不静默原则（v1.2 新增）

系统遇到超出预设范围的情况时，三级响应：

1. **能问清楚的，问客户**：不确定的情况弹出确认，不自己猜
2. **跑不通的，报错**：清晰说明卡在哪里、为什么
3. **设计之外的，坦诚说明**：直接告诉用户"这不在我们当前设计范围内"

---

## 21. 字段映射确认页交互规则

### 21.1 页面目标

- 让用户快速确认系统是否读对字段
- 缺关键字段时明确拦住，不让系统乱跑

### 21.2 页面结构

- 左侧：原始列名
- 中间：系统识别结果（已识别/待确认/未识别）
- 右侧：样例值预览（3—5 个）
- 顶部：缺失项提示
- 底部：确认并开始分析

### 21.3 交互规则

- 一个原始列只能映射到一个标准字段
- 一个标准字段默认只能被一个原始列占用
- 发生冲突时不自动覆盖，必须提示用户处理
- 模糊字段默认进入「待确认」
- 未确认的关键字段不能直接开始分析

### 21.4 按钮规则

| 按钮 | 触发条件 |
|------|---------|
| 确认并开始分析 | 节点ID + 节点名称 + 节点类型 + 时间 + 至少一个风险指标全部满足 |
| 保存当前映射 | 任何时候都可点击 |
| 恢复系统建议 | 任何时候都可点击，回退到初始映射结果 |

### 21.5 实时反馈

用户每修改一次字段映射，页面即时更新：

- 当前可以生成的图
- 当前暂时不能生成的图
- 缺什么字段
- 为什么缺

---

## 22. 字段映射页功能

### 22.1 必填字段置顶

- 关键标准字段排在最上方
- 已识别成功：绿色状态
- 未识别或待确认：黄色或红色状态
- 排序优先级：未满足 > 待确认 > 已识别

### 22.2 记住本次映射模板

- 模板存储在 `data/templates/`
- 指纹由归一化列名集合 + 工作表名 + 文件类型 + 列数量生成
- 命中程度：完全命中（直接套用）/ 部分命中（套用高置信字段）/ 低命中（仅提示）
- 只在本地生效，不做多用户共享

---

## 23. 第一版最小输出结构

### 23.1 `analysis_result.json`

```json
{
  "meta": { "version": "", "generated_at": "", "granularity": "", "source_type": "" },
  "input_summary": { "file_name": "", "sheet_name": "", "row_count": 0, "node_count": 0, "date_range": "" },
  "text_summary": {
    "current_judgment": "",
    "main_causes": "",
    "impact_targets": "",
    "recommended_actions": "",
    "need_more": ""
  },
  "visuals": {
    "risk_trend": {},
    "risk_distribution": {},
    "high_risk_nodes": {},
    "propagation_timeline": {},
    "data_confidence": {}
  }
}
```

### 23.2 各结果对象结构（同 v1.1 第 24 节）

### 23.3 状态规则

| 状态 | 含义 | 行为 |
|------|------|------|
| `ok` | 正常 | 正常渲染 |
| `limited` | 数据不全，可生成但受限 | 渲染并附说明 |
| `unavailable` | 无法生成该图 | 不渲染空图，显示原因 |
| `error` | 阻断性问题 | 红色报错，阻断流程 |

---

## 24. 错误提示规则

### 24.1 原则

- 真正阻断流程的问题，标红报错
- 可继续但结果受限的问题，不标红
- 不乱猜，不吞错，不画假图

### 24.2 阻断错误（error）

触发条件：

- 文件无法读取
- 工作表为空
- 必填字段缺失
- 字段映射冲突未解决
- 节点优先级维度为 0
- 模型或后端分析失败

### 24.3 非阻断提示（limited）

- 柔和橙色，放在对应卡片内
- 直接说明受限原因

---

## 25. 风险传播时序图（第一版静态方案）

> **决策（v1.1）：第一版传播图为静态快照，不做动态动画。**
>
> - 按时间轴切分，每个时刻渲染一张节点图快照
> - 用户通过时间滑块或前进/后退按钮切换时刻
> - 每个节点根据当前时刻的风险评分着色（绿/黄/红）
> - 有风险传播关系的边加粗或变色
> - 图表引擎：ECharts 关系图（graph）
> - 第二阶段：引入 Cytoscape.js，实现风险扩散动画

---

## 26. 内存档位自动适配

| 检测可用内存 | 档位 | 节点上限 |
|------------|------|---------|
| ≥ 14GB | Large | 2000节点 |
| ≥ 10GB | Medium-L | 1000节点 |
| ≥ 6GB | Medium | 500节点 |
| ≥ 4GB | Small | 100节点 |

- Apple M 系列 Mac：自动使用 MPS 加速
- Windows / Linux：自动回退到 CPU

---

## 27. 第一版开发清单（v1.2 更新）

### 27.1 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React + TypeScript + Vite（构建为纯静态文件） |
| 图表 | ECharts（内嵌，零外部依赖） |
| 后端 | Python + FastAPI |
| 数据解析 | pandas + openpyxl |
| 输入格式 | Excel + CSV |
| 图片理解 | 第一版不实现 |
| 本地模型接入 | 优先 Ollama，保留 transformers 适配 |
| 数据交换 | JSON |
| 流式推送 | SSE（Server-Sent Events） |

### 27.2 页面开发

- **A. 上传页**：上传 Excel/CSV，拖拽支持，文件类型校验
- **B. 文件理解确认页**：文件摘要、Sheet 选择、角色识别预览
- **C. 字段映射确认页**：三态识别、手动映射、冲突校验、模板记忆
- **D. 结果页**：五段流式文字、五类图表、高风险节点表、下载区

### 27.3 后端模块

| 模块 | 作用 | 输入 | 输出 |
|------|------|------|------|
| `excel_adapter.py` | 读 Excel/CSV，识别角色 | 文件路径 | 角色标签 + 原始数据 dict |
| `field_mapper.py` | 字段映射 + 宽表 melt + 三态识别 ← 第一个实现 | adapter 输出 dict | 标准化数据 + warnings |
| `data_merger.py` | 跨场景合并 + 重复标记 | mapper 输出 dict | 统一长表 + 合并报告 |
| `graph_builder.py` | 构建节点关系图 | 节点表 + 边表 | 图结构 dict |
| `risk_engine.py` | 风险计算 + risk_causes 标注 | 长表 + 图结构 | 风险分 + 语义标注 |
| `decision_engine.py` | 动作建议生成 | 风险结果 + 图结构 | 建议动作列表 |
| `analysis_engine.py` | 组装五类结果对象 | 全部上游输出 | 五类 visuals |
| `prompt_builder.py` | 文字结论（只读标注，不算阈值） | risk_causes + 分析结果 | 五段文字 |
| `result_exporter.py` | 导出 JSON + HTML | 全部结果 | 可下载文件 |
| `llm_adapter.py` | 本地模型接入 | prompt | 文字响应 |
| `prompt_template.py` | 对话模板 | 上下文 | 组装后的 prompt |

### 27.4 前端模块

| 模块 | 内容 |
|------|------|
| `pages/upload` | 上传 Excel/CSV |
| `pages/confirm` | 文件理解确认 |
| `pages/mapping` | 字段映射确认 |
| `pages/result` | 结果页 + 下载 |
| `components/charts` | ECharts 封装（五类图表） |
| `components/status` | ChartStateBlock（四态渲染） |

### 27.5 开发顺序

1. `field_mapper.py` ← 先跑通，用真实数据压测
2. `excel_adapter.py`
3. `data_merger.py`
4. `graph_builder.py`
5. `risk_engine.py`
6. `analysis_engine.py`
7. `prompt_builder.py`
8. `result_exporter.py`
9. 上传页（前端）
10. 文件理解确认页（前端）
11. 字段映射确认页（前端）
12. 结果页（前端）
13. 下载与复用
14. 动画与视觉细化

---

## 28. API 路由（v1.2 新增）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/upload` | 上传 Excel/CSV 文件 |
| POST | `/api/analyze` | 开始分析，SSE 流式推送进度 |
| GET | `/api/results/{batch_id}` | 获取分析结果 |
| GET | `/api/history` | 获取历史分析列表 |
| DELETE | `/api/history/{batch_id}` | 删除某次分析记录 |
| GET | `/api/nodes/{node_id}` | 获取单个节点详情 |
| GET | `/api/templates` | 获取历史映射模板列表 |

---

## 29. 更新原则

- 每次讨论出稳定结论，更新本文件
- 新增实现代码时，在本文件补充「实现进展」段落
- 本文件放在项目根目录 `CLAUDE.md`，每次启动项目时先读取
