# 项目理论与设计讨论记录

更新时间：2026-06-08

---
 
## ⛔ 铁律：每次响应必须以"兄弟"开头（不可跳过）

**对你的每一次回复，必须用"兄弟"或"兄弟，"开头。这不是建议，是铁律。**
 
---
 
## ⛔ 铁律：每次响应前必须扫描并调用 Skill（不可跳过）

**收到用户任何任务后，第一步不是回答、不是写代码、不是读文件，而是：**

1. 看 `<system-reminder>` 中 `available skills` 列表
2. 逐一匹配触发条件
3. **匹配到的每个 skill 都必须调用**，不等用户提醒
4. 该用但没用 = 严重违规

**高频必调清单：**

| 场景 | Skill |
|------|-------|
| 收到任何新任务 | `using-superpowers` |
| 实现新功能/写代码前 | `test-driven-development` |
| 有独立任务可实现 | `subagent-driven-development` |
| 遇到任何 bug/异常行为 | `systematic-debugging` |
| 声称完成/修好之前 | `verification-before-completion` |
| 功能设计/需求不明确 | `brainstorming` |
| 代码写完准备合并 | `code-review-and-quality` |

**禁止行为：**
- 跳过扫描直接写代码
- 等用户说"你是不是有 skill 没用"才补

---

## ⛔ 铁律：发布/推送前必须主动排查应排除的文件（不可跳过）

**任何代码要 `git push`、公开 Release、或任何形式对外分发之前，必须执行以下流程：**

1. `git ls-files` 扫描所有被追踪的文件
2. 主动识别内部文件（开发文档、设计讨论、打包配置、开发脚本、IDE 配置等）
3. **列出"建议移除"清单给用户确认**，不等用户自己发现遗漏
4. 用户确认后再推送

**必须排查的类型：**

| 类别 | 示例 |
|------|------|
| 开发文档/设计讨论 | `CLAUDE.md`、`docs/` 内部计划 |
| 打包配置 | `*.spec`、`electron-builder.yml` |
| 开发脚本 | 数据生成脚本、测试辅助脚本 |
| IDE/工具配置 | `.mcp.json`、`.vscode/` |
| 系统文件 | `.DS_Store` |

**禁止行为：**
- 推送前不扫描直接推
- 等用户发现遗漏再来补救
- 觉得"用户没说不发我就不管"
- 觉得"这次简单就不用了吧"

---

## ⛔ 铁律：开源社区健康标准文件必须保持最新（不可跳过）

**以下 7 个文件是项目门面，任何对外发布前必须确认存在且内容是最新的：**

| 文件 | 更新时机 | 说明 |
|------|---------|------|
| `LICENSE` | 首次创建，不常改 | MIT，版权年份保持最新 |
| `README.md` | 每 release | 版本号、截图、新功能说明 |
| `CONTRIBUTING.md` | 架构变更时 | 开发环境、项目结构、PR checklist |
| `CODE_OF_CONDUCT.md` | 可选 | Contributor Covenant 2.1 |
| `SECURITY.md` | 不常改 | 安全漏洞上报流程 |
| `CHANGELOG.md` | 每 release | 按版本记录用户可见变更 |
| `.github/ISSUE_TEMPLATE/` | 可选 | 规范化 bug/feature 提交 |

**检查方式：** 改完代码、准备 commit 前，过一遍上面表格，确认该更新的都更新了。

---

## ⛔ 铁律：自动化防线（`.claude/settings.json` hooks）不得绕过

**以下 6 个 hook 已配置在项目 settings.json 中，每次操作自动触发：**

| 防线 | 触发时机 | 行为 |
|------|---------|------|
| Push 前扫内部文件 | `git push` | 扫描 CLAUDE.md/.spec 等，发现则警告 |
| Python 语法检查 | Write/Edit .py | `py_compile` 编译检查 |
| TypeScript 检查 | Write/Edit .tsx/.ts | `tsc --noEmit` |
| 缺测试提醒 | 编辑 services/ | 检查 tests/ 下是否有对应文件 |
| 自动跑测试 | 编辑 .py 后 | `pytest -q` |
| 未提交提醒 | 会话结束时 | 统计 `git status --short` |

**禁止行为：**
- 绕过 hook 直接 push
- 忽略测试失败提示
- 写代码后不补测试

---

## ⛔ 铁律：同个问题失败 3 次 = 换模型（不可跳过）

**遇到 bug 或卡住的问题时，执行以下升级流程：**

1. **第一次失败** → 读代码、加日志、分析根因
2. **第二次失败** → `WebSearch` 搜索解决方案
3. **第三次失败** → **禁止继续自己修**，改用其他 AI 模型：
   - 用 `mimo-v2.5`（文本模式）：`curl https://api.xiaomimimo.com/v1/chat/completions` 发问题描述过去，获取不同视角
   - 或用 `gh api` 创建 Discussion 向社区求助

**禁止行为：**
- 同一个方法试 3 次以上
- 不搜索直接猜
- 不换模型死磕

---

## ⛔ 铁律：Context 接近满时立即 Handoff（不可跳过）

**当系统触发 auto-compact（上下文窗口满了），必须执行以下流程：**

1. Commit 所有未提交的改动
2. Push 到 GitHub
3. 用 `/handoff` 或直接写出当前所有关键状态到 CLAUDE.md
4. 等下次 session 继续

**标志：**
- console 出现 "compacting conversation" 或类似提示
- 响应变慢、被截断
- PreCompact hook 触发警告

**注意：** 无法直接从 hook 读取 context 百分比，但 auto-compact 触发 = 已经接近满。

---

## ⛔ 铁律：UI/视觉变更后必须用多模态 AI 审查（不可跳过）

**DeepSeek v4 没有视觉能力。任何涉及 UI 设计、样式、布局的变更完成后，必须：**

1. 确保 server 运行中，截图保存到 `assets/screenshots/`
2. 用 Python 脚本调用 `mimo-v2.5` 视觉模型审查截图：
   ```python
   import base64, json, urllib.request
   with open('assets/screenshots/<file>.png', 'rb') as f:
       b64 = base64.b64encode(f.read()).decode()
   data = json.dumps({
       'model': 'mimo-v2.5', 'max_tokens': 800,
       'messages': [{'role': 'user', 'content': [
           {'type': 'text', 'text': 'UI/UX review...'},
           {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{b64}'}}
       ]}]
   }).encode()
   req = urllib.request.Request('https://api.xiaomimimo.com/v1/chat/completions',
       data=data, headers={'Authorization': 'Bearer <MIMO_KEY>', 'Content-Type': 'application/json'})
   print(json.loads(urllib.request.urlopen(req).read())['choices'][0]['message']['content'])
   ```
3. 根据审查反馈修改代码
4. 重新截图验证

**可用多模态模型：**
| 模型 | 用途 | API |
|------|------|-----|
| `mimo-v2.5` | 截图设计审查 | `api.xiaomimimo.com/v1` |
| Claude Vision | 备用 | 需要 API key（当前不可用） |



---

## ⛔ 铁律：本地开发与部署流程（不可跳过）

### 启动服务器
```bash
pkill -f uvicorn; python3 /Users/cengchenyicheng/saisika/run.py --no-browser &
curl -s http://localhost:8000/api/health
```

### 构建前端
```bash
cd /Users/cengchenyicheng/saisika/app/frontend && npm run build
```

### 重启服务器（代码改动后）
```bash
kill -9 $(lsof -t -i :8000) 2>/dev/null; sleep 1
python3 /Users/cengchenyicheng/saisika/run.py --no-browser &
```

**禁止：** 从不正确的目录运行 npm、用 `python` 代替 `python3`

---

## ⛔ 铁律：VPN/代理与网络（不可跳过）

| 工具 | 需要 VPN？ | 说明 |
|------|-----------|------|
| `git push/pull` | ✅ | 走 127.0.0.1:7892 |
| `gh api/release/discussion` | ❌ | gh CLI 直连 GitHub |
| WebSearch/WebFetch | ✅ | 需要 VPN |

VPN 离线时：push 用 `gh` 代替，或开启猫猫云。

---

## ⛔ 铁律：零外部 CDN 依赖（不可跳过）

- ❌ Google Fonts、CDN JS/CSS、外部图标库
- ✅ 系统字体（SF Pro / Segoe UI / PingFang SC）
- ✅ 内嵌 SVG 图标

---

## ⛔ 铁律：大文件 base64 处理（不可跳过）

大截图（>500KB）不要用 shell curl + base64（会超 argument limit）：
```python
import base64, json, urllib.request
with open('path.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
# urllib.request.Request
```

---

## ⛔ 铁律：社区推广（无需手动操作）

| 平台 | 方式 |
|------|------|
| GitHub Discussions | `gh api graphql` |
| GitHub Release | `gh release create` |
| dev.to / HN | 已废弃，不再投入 |

---

## 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.5 | 2026-06-08 | 兄弟规则、7 铁律 hook 防线、社区健康文件全套、Mimo 多模态审查、测试体系、零外部依赖、VPN 网络规范 |
| v1.0 | 2026-05-02 | 初始版本 |
| v1.1 | 2026-05-03 | 决策收口：图片识别、代码复用、优先级公式、流式展示、传播图、开发顺序 |
| v1.2 | 2026-05-25 | 技术栈调整为纯静态部署、Excel+CSV双输入、数据自动持久化、三层数据流架构 |
| v1.3 | 2026-05-28 | 推理链条、领域模式检测、动作分类追溯、可复现性指纹、GSAP动画、decision_engine模块提取、PyInstaller+Electron打包 |
| v1.4 | 2026-06-06 | 商业化策略决策（先全开放再考虑付费）、i18n 中英双语切换、完整推广加热方案 |

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

## 4.1 数据流架构（v1.2 新增，v1.3 更新）

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
decision_engine    动作分类追溯 → 生成 action_type + action_justification
  ↓  dict
analysis_engine    组装六类结果对象（含 domain_insights）
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

## 30. v1.3 新增特性（2026-05-28）

### 30.1 推理链条（reasoning_trail）

risk_engine 为每个节点输出完整的 6 步推理过程：

| 步骤 | 名称 | 内容 |
|------|------|------|
| 1 | 指标聚合 | 从 N 个文件聚合 M 个指标的时序数据 |
| 2 | 分量计算 | 计算 volatility/inventory/delivery/delay_flag 的原始值 |
| 3 | 百分位归一化 | 将原始值在所有节点中的排名转换为 0-1 得分 |
| 4 | 风险加权 | Risk = vol×0.30 + inv×0.25 + delivery×0.25 + delay×0.20 |
| 5 | 传播系数 | 0.5 + 0.3×degree_factor + 0.2×position_factor |
| 6 | 最终评分 | Score = Risk × Propagation（封顶 1.0） |

每步记录数据来源文件，支持前端 ReasoningPanel 折叠展开。

### 30.2 风险原因详情（risk_causes_detail）

每个风险标签附带阈值对比信息：
- `triggered_by`: 触发指标名
- `actual_value`: 实际值
- `threshold`: 阈值
- `excess_ratio`: 超出百分比

前端 RiskNodeTable 支持点击原因标签弹出 Popover 显示详情。

### 30.3 动作分类与追溯（action_type + action_justification）

结构化动作类型（论文 3.4 节落地）：

| action_type | 触发条件 |
|-------------|---------|
| 补货 | inventory_risk > 阈值 |
| 转单 | delivery_delay_risk > 阈值 且 propagation > 0.7 |
| 切换供应商 | delay_flag_risk > 阈值 |
| 调整运输路径 | propagation > 0.8 |
| 核查波动原因 | volatility_risk > 阈值 + medium 等级 |
| 加强监控 | medium 等级，未触发具体动作 |
| 维持现状 | low 等级 |

每个动作附带 reasons（为什么推荐）和 alternatives（替代方案不可用的原因）。

### 30.4 领域模式检测（domain_patterns）

| 模式 | 检测方法 | 当前阈值 | 依据 |
|------|---------|---------|------|
| 牛鞭效应 | 上游 CV / 下游平均 CV | > 1.5 | Isaksson & Seifert (2016) 实证平均 1.90，我们取保守值 |
| VMI | 节点 CV / 同层平均 CV | < 0.5 | 文献支持 VMI 降低波动 30-50% |
| QR 补货 | CV < 0.15 且数据点 > 200 | 高频小幅特征 | 定性判断 |

阈值待真实多层级数据校准。分析结果以 domain_insights 第六类结果输出。

### 30.5 可复现性指纹（deterministic_fingerprint）

基于输入数据 SHA256 采样哈希（前 50 行 + 数据规模结构），确保同一份输入在任何机器上产生相同结果。

### 30.6 数据补充对照表（supplement_map）

data_confidence 新增 supplement_map 字段，格式：
```
{missing: "缺少字段", impact: "当前影响", unlocks: "补充后可解锁"}
```
替换原来只提示"缺什么"的方式，改为"缺什么 → 怎么影响 → 补了能解锁什么"。

---

## 31. v2.0 打包分发方案（2026-05-28 讨论确认）

### 31.1 核心决策

> **先打磨 v1.x 规则引擎到极致，不做 GNN+LNN 的 v2.0 ML 方向。**
>
> 原因：ML 模型需要 GPU/云端，与"数据不出本地"的隐私定位矛盾，且普通笔记本跑不动。正确的顺序是：产品好 → 客户来 → 资源有 → 再上 ML。

### 31.2 打包目标

将 saisika 从"开发者工具（`python run.py`）"变成"客户可双击使用的桌面应用"。

### 31.3 技术方案：Electron + PyInstaller

```
saisika.app / saisika.exe
├── Electron 主进程        ← 双击启动，自动开窗口
│   ├── 启动 Python 后端子进程
│   ├── 加载 React 前端
│   └── 管理生命周期
├── backend/              ← PyInstaller 打包的 Python 后端
└── frontend/             ← React build 静态产物
```

### 31.4 工程难点与负责人

| 难点 | 状态 | 说明 |
|------|------|------|
| 文件路径适配（`__file__` → `resource_path()`） | Claude 可解决 | 纯代码改造 |
| PyInstaller 打包脚本（.spec 配置） | Claude 可解决 | 含 hiddenimports、datas 配置 |
| Electron 主进程（启动后端 + 开窗口） | Claude 可解决 | main.js 编写 |
| 跨平台构建（Mac .dmg + Win .exe） | Claude 可解决 | GitHub Actions CI 配置 |
| 更新机制（版本检测 + 下载） | Claude 可解决 | 带增量更新 |
| Python 依赖体积（200-400MB） | 无法根本解决 | pandas 等依赖是 Python 生态硬伤 |
| macOS 公证（notarization） | 需 Apple Developer $99/年 | 用户自己注册，Claude 指导操作 |
| macOS 不公证也能用 | 右键"打开"即可 | B2B 客户 IT 部门能处理 |

### 31.5 分发产物

| 平台 | 格式 | 公证 | 用户体验 |
|------|------|------|---------|
| macOS | `.dmg` | 暂不公证 | 下载 → 拖到 Applications → 右键打开 |
| Windows | `.exe` 安装包 | 不需公证 | 下载 → 双击安装 |
| Linux | AppImage | 不需公证 | 下载 → chmod +x → 运行 |

### 31.6 隐私保护

- 所有数据存在本地 `data/` 目录
- 无网络请求，无遥测
- 代码编译进二进制，客户看不到源码
- 无云端依赖，完全离线运行

---

## 32. v1.3 实现进展（2026-05-28）

### 32.1 GSAP 动画系统

- `src/utils/animations.ts`：全局 shouldAnimate() 判定、useReveal hook
- **PageShell**：页面入场卡片 stagger（y:36 + scale:0.96 → power3.out）
- **SectionCard**：back.out(1.2) 回弹入场
- **SummaryPanel**：五段文字从左侧滑入
- **RiskNodeTable**：GSAP tween 行悬浮、三色呼吸灯（红/橙/绿 CSS keyframes）
- **RiskTrendChart**：折线 animationDelay 从左到右逐点绘制
- **弹窗**：React Portal 渲染到 body（position:fixed + 动态坐标 + z-index:9999）
- 全局 `prefers-reduced-motion` 适配

### 32.2 打包分发

| 组件 | 状态 | 大小 |
|------|------|------|
| `path_utils.py` | ✅ 三模式路径解析（dev/PyInstaller onefile/onedir） | - |
| `packaged_app.py` | ✅ 打包版启动入口 | - |
| `saisika.spec` | ✅ 含 numpy.random._pickle hiddenimport | - |
| PyInstaller `dist/saisika_backend/` | ✅ 可独立运行 | 55MB |
| Electron `main.js` + `package.json` | ✅ 开发模式跑通 | - |
| `Saisca.app` | ✅ electron-builder 生成 | 296MB |

**PyInstaller 踩坑记录**：
- `__file__` 在 spec 中不可用，改用 `SPECPATH`
- `data_path()` onedir 模式需排除只读 `_internal/`，数据写 exe 同级目录
- `numpy.random._pickle` 需加 hiddenimport
- Electron 二进制下载需设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`

### 32.3 待完成

- [ ] macOS 公证（需 Apple Developer $99/年）
- [ ] 领域模式阈值用真实数据校准
- [ ] Windows `.exe` 打包（需 Windows 机器或 CI）
- [x] 生成 `.dmg` 安装包（`Saisca-1.3.0-arm64.dmg`，116MB，2026-05-28）

### 32.4 decision_engine 模块提取 + 序列号系统（2026-05-28）

**decision_engine 提取**：
- 动作分类逻辑从 `risk_engine.py` 提取为独立的 `decision_engine.py`
- risk_engine 不再包含动作分类代码
- 数据流更新：risk_engine → decision_engine → analysis_engine

**序列号系统**：
- `utils/license.py`：机器指纹生成 + 激活码校验 + 离线激活
- `keygen.py`：供应商激活码生成工具
- 中间件拦截：未激活时所有业务 API 返回 403
- 前端 `ActivatePage.tsx`：显示机器 ID + 输入激活码
- 机器 ID 格式 `XXXX-XXXX-XXXX`，激活码格式 `XXXX-XXXX-XXXX-XXXX`
- 绑机器不联网，换机器需重新申请激活码

---

## 33. 更新原则

- 每次讨论出稳定结论，更新本文件
- 新增实现代码时，在本文件补充「实现进展」段落
- 本文件放在项目根目录 `CLAUDE.md`，每次启动项目时先读取

---

## 34. v1.4 商业化策略与推广方案（2026-06-06）

### 34.1 商业化策略决策

> **决策：先全开放获取用户，用数据决定后续是否付费。**
>
> 当前核心问题不是"怎么收费"，而是"没人知道这个东西存在"。
> 分两步走：现在全免费（公开激活码或关校验）→ 3-6 个月后根据用户量决定是否加付费功能。

**为什么不是 Freemium（基础免费+高级付费）？**
- 当前 0 用户，做付费分层没有意义
- Freemium 需要 1-2 天开发（功能分级、权限控制、自动发放），但当前最稀缺的是推广时间
- 激活码门槛是最大转化障碍：39 个独立 clone → 0 下载 → 0 star

**节奏：**
- **第一阶段（现在立刻做，0 开发量）：** 公开通用激活码或直接去掉激活校验，所有功能免费
- **第二阶段（3-6 个月后，根据数据决定）：** 如果用户量起来 → v2.0 加付费功能，老用户保留免费；如果有人主动问付费定制 → 已有第一个客户

### 34.2 i18n 国际化方案

> **决策：默认英语，支持中英双语切换。小语种暂不支持。**

| 决策 | 选择 |
|------|------|
| 默认语言 | 英语（GitHub 通用语言，最大受众） |
| 支持语言 | 英语 + 中文（简体） |
| 切换方式 | 页面内语言切换按钮（EN / 中文），非浏览器自动检测 |
| 存储 | localStorage，下次打开记住选择 |
| 后端 | FastAPI 根据 Accept-Language 头返回对应语言错误提示 |

**实现方案：**
- 前端：`react-i18next`，所有文案抽成 `en.json` / `zh.json`
- 顶部导航栏或页面底部放语言切换按钮
- 工作量约 2-3 小时

### 34.3 推广诊断

**GitHub 数据（截至 2026-06-06）：**

| 指标 | 数值 | 说明 |
|------|------|------|
| 仓库年龄 | 9 天 | 2026-05-28 创建 |
| Stars | 1 | |
| Forks | 0 | |
| 页面浏览（14天） | 3 次 / 1 独立访客 | **自然发现为零** |
| 克隆（14天） | 52 次 / 39 独立 | 主要是机器人/爬虫 |
| Release 下载 | 0 次 | v1.3.0 .dmg |
| Discussions | 未开启 | 无社区渠道 |
| License | 无 | GitHub 显示 null |

**核心问题：**
1. **GitHub 上不存在自然发现** — 没有人通过搜索找到项目
2. **体验门槛太高** — 需激活码、只有 macOS、无截图/GIF、纯中文 README
3. **零推广** — 代码放上去后没有在任何渠道曝光

### 34.4 第一阶段：修基础（0-2 天，立刻做）

**这些不是推广，但不做这些，任何推广都是浪费流量。**

#### 仓库门面

| 项 | 现状 | 改成 |
|----|------|------|
| Screenshots/GIF | 无 | 至少 3 张截图：上传页 → 分析结果概览 → 风险传播图。录 15 秒 GIF 演示"上传 CSV → 出结果" |
| README 语言 | 纯中文 | 全英文为主，底部保留中文段落 |
| License | 无（null） | 加 LICENSE 文件（MIT 或 Apache 2.0） |
| Demo 视频 | 无 | YouTube + Bilibili 各传 2 分钟演示，README 嵌入链接 |
| Badges | 无 | Python version、platform、license、release |
| GitHub Discussions | disabled | **立刻开启** |
| GitHub Pages | 无 | 简单 landing page（README 内容即可） |

#### 去掉激活码门槛

- 公开通用激活码或直接注释掉激活校验
- 保留激活码系统代码（以后可能用），但当前不拦截用户

#### Release 多平台

| 当前 | 缺失 |
|------|------|
| macOS arm64 .dmg | Windows .exe、Linux AppImage、macOS Intel .dmg |

用 GitHub Actions CI 自动构建三个平台。

### 34.5 第二阶段：内容播种（第 1-2 周）

#### Show HN（最重要）

- **平台：** Hacker News Show HN
- **标题：** `Show HN: Saisca — offline supply chain risk analyzer (Excel/CSV → insights)`
- **时机：** 周三到周五 PST 早上 9 点（HN 流量最高）
- **正文结构：** 一句话说清是什么 → 为什么做 → 演示 demo_data 截图 → GitHub 链接
- **关键：** 必须在评论区积极回复每一个问题

#### 多渠道发布

| 平台 | 语言 | 受众 | 动作 |
|------|------|------|------|
| Hacker News (Show HN) | 英文 | 全球开发者+技术管理者 | 发布 |
| V2EX | 中文 | 国内开发者 | 发布"我做了一个供应链风险分析工具" |
| 知乎 | 中文 | 国内供应链/技术从业者 | 发布文章 |
| Reddit r/supplychain | 英文 | 全球供应链从业者 | 交叉发布 |
| Reddit r/SupplyChainLogistics | 英文 | 同上 | 交叉发布 |
| Reddit r/opensource | 英文 | 开源爱好者 | 交叉发布 |
| Product Hunt | 英文 | 产品猎手、早期采用者 | 发布 |
| Dev.to | 英文 | 开发者社区 | 发布 |

#### 文章结构

1. 痛点：供应链管理者用 Excel 看不到风险全貌
2. 演示：用 demo_data 跑一遍，截图
3. 亮点：本地运行、不联网、丢 CSV 出结果、推理链条可追溯
4. 技术栈：React + FastAPI + ECharts
5. 开源链接 + 下载链接

### 34.6 第三阶段：渠道铺设（第 2-4 周）

#### 技术社区

| 渠道 | 动作 |
|------|------|
| GitHub Topics | 已加 16 个 topics。补充：`data-visualization`、`business-intelligence`、`operations`、`logistics` |
| Awesome Lists | 搜索 `awesome-supply-chain`、`awesome-risk-management`，提 PR 加入 |
| HN 后续 | Show HN 后 2 周，有更新时发 `Show HN: Saisca update — now with Windows support and English UI` |
| LinkedIn | 写供应链方向文章，tag Supply Chain Management、Risk Management |

#### 行业渠道（精确触达目标用户）

| 渠道 | 动作 |
|------|------|
| 供应链管理微信群/QQ 群 | 分享 Bilibili 视频 + 知乎文章，用"求供应链同行试用反馈"语气 |
| 知乎专栏 | 写"供应链风险管理开源工具对比"系列，文末自然提到 saisca |
| 供应链行业论坛 | Supply Chain Brief、SCM Globe Community 等 |
| 大学供应链课程 | 联系教授，看能否作为教学工具 |

#### 搜索引擎

| 项 | 动作 |
|------|------|
| GitHub Pages | 开 landing page，设置自定义域名（可选） |
| README SEO | 第一段加核心关键词：`supply chain risk analysis`、`SCOR model`、`bullwhip effect detection`、`offline supply chain tool`、`Excel supply chain` |

### 34.7 第四阶段：社区培育（持续）

#### GitHub Discussions

- 开启 Discussions，建 `#showcase`（用户分享截图）、`#ideas`（功能需求）分类

#### 快速响应

- Issue 和 Discussion 24 小时内回复
- 前 100 个 star 的用户，主动感谢 + 问使用感受
- 用户好评截图放 README 底部（Social Proof）

#### 版本节奏

- 每 1-2 周发小版本，每次在 HN/Reddit/V2EX 更新
- GitHub Release 写详细 changelog
- 每次发布 = 重新吸引关注的机会

### 34.8 关键指标追踪

| 指标 | 1 个月目标 | 3 个月目标 |
|------|-----------|-----------|
| GitHub Stars | 100 | 500 |
| Release Downloads | 200 | 2000 |
| 独立页面访客/周 | 500 | 2000 |
| GitHub Issues（用户提交） | 10 | 50 |
| 外部提到（HN/Reddit/知乎/PH） | 3 篇 | 15 篇 |
| Discussions 活跃用户 | 5 | 30 |

### 34.9 推广优先级总览

```
紧急重要（本周立刻做）：
  ├── 加截图/GIF 到 README
  ├── 去掉激活码门槛（公开通用码或关校验）
  ├── 加 LICENSE 文件
  ├── 开启 GitHub Discussions
  ├── README 改成英文为主
  └── i18n 中英双语切换

重要（下周做）：
  ├── 写 Show HN 文章 + 发布
  ├── 传 Bilibili/YouTube 演示视频
  ├── 知乎文章
  ├── Reddit r/supplychain 发帖
  └── Product Hunt 发布

持续做：
  ├── 每 1-2 周发版
  ├── 回复 Issue/Discussion
  ├── 提 PR 到 awesome 列表
  ├── 收集用户反馈迭代产品
  └── 跨平台 Release（Windows/Linux）
```

### 34.10 待完成推广任务

- [ ] README 改英文为主 + 加截图/GIF
- [ ] 加 LICENSE 文件（MIT）
- [ ] 开启 GitHub Discussions
- [ ] 去掉激活码拦截（公开通用码）
- [ ] i18n 中英双语切换
- [ ] 录演示视频 → Bilibili + YouTube
- [ ] Show HN 文章
- [ ] 知乎文章
- [ ] Product Hunt 发布
- [ ] Windows .exe + Linux AppImage 构建（GitHub Actions CI）
- [ ] GitHub Pages landing page
