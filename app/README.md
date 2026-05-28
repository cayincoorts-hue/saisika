# Saisca — 供应链风险分析系统

基于知识图谱的供应链风险识别、传播分析与可视化工具。上传 CSV/Excel 数据，自动构建供应链网络，计算节点风险评分，生成交互式 3D 关系图和文字分析结论。

## 目录

- [系统架构](#系统架构)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
  - [步骤 1：上传数据](#步骤-1上传数据)
  - [步骤 2：确认分析](#步骤-2确认分析)
  - [步骤 3：查看结果](#步骤-3查看结果)
  - [历史记录](#历史记录)
- [数据格式要求](#数据格式要求)
- [分析结果说明](#分析结果说明)
  - [数据概况](#数据概况)
  - [文字摘要](#文字摘要)
  - [风险趋势图](#风险趋势图)
  - [风险分布图](#风险分布图)
  - [高风险节点表](#高风险节点表)
  - [供应链网络 3D 关系图](#供应链网络-3d-关系图)
  - [风险传播时序图](#风险传播时序图)
  - [数据可信度](#数据可信度)
  - [下载导出](#下载导出)
- [API 接口](#api-接口)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [软件著作权](#软件著作权)

---

## 系统架构

```
┌─────────────────────┐     ┌──────────────────────────────────┐
│   浏览器（前端 SPA）   │────▶│  FastAPI 后端（localhost:8000）     │
│                      │     │                                  │
│  React + TypeScript  │◀────│  /api/upload   上传文件           │
│  ECharts             │     │  /api/analyze  分析（SSE 流式）     │
│  3D Force Graph      │     │  /api/results  获取结果           │
│                      │     │  /api/history  历史记录           │
└─────────────────────┘     └──────────────────────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  分析流水线        │
                            │                  │
                            │  读取 → 字段映射   │
                            │  → 数据合并       │
                            │  → 网络图构建     │
                            │  → 风险评分       │
                            │  → 分析组装       │
                            │  → 文本生成       │
                            └──────────────────┘
```

## 快速开始

### 环境要求

- **Python** ≥ 3.9
- **Node.js** ≥ 18
- **npm** ≥ 9

### 1. 安装后端依赖

```bash
cd backend
pip install fastapi uvicorn pandas openpyxl
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 构建前端

```bash
cd frontend
npm run build
```

构建产物输出到 `backend/static/`，由 FastAPI 直接托管。

### 4. 启动服务

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

打开浏览器访问 **http://localhost:8000**。

> **开发模式**：前端开发时也可单独启动 `cd frontend && npm run dev`，Vite 开发服务器会将 `/api` 请求代理到后端 `http://127.0.0.1:8000`。

---

## 使用指南

### 步骤 1：上传数据

1. 打开系统首页
2. 将 CSV 或 Excel（`.xlsx` / `.xls`）文件拖拽到上传区域，或点击选择文件
3. 支持同时上传多个文件，系统会自动识别文件格式
4. 点击 **"上传并继续"** 按钮

> 每个文件只识别第一个工作表（Sheet）。多工作表文件请拆分为独立文件上传。

### 步骤 2：确认分析

上传成功后进入分析确认页，系统会通过 **SSE 流式推送** 实时展示分析进度：

| 阶段 | 说明 |
|------|------|
| 读取文件 | 解析 CSV/Excel 内容 |
| 字段识别 | 自动识别节点 ID、上下游关系等关键字段 |
| 数据合并 | 将多个文件的数据统一合并 |
| 构建网络图 | 基于节点和边构建供应链拓扑图 |
| 风险评估 | 计算每个节点的风险评分 |
| 生成分析结果 | 组装可视化数据和文字结论 |

分析过程中可随时看到当前进度。完成后自动跳转到结果页。

### 步骤 3：查看结果

结果页包含以下模块（详见 [分析结果说明](#分析结果说明)）：

- 数据概况卡片
- AI 文字摘要（当前状况判断、主要原因、影响对象、建议措施、待补充信息）
- 风险趋势图
- 风险分布图
- 高风险节点表
- **供应链网络 3D 关系图**（核心功能）
- 风险传播时序图
- 数据可信度评估
- 下载导出

### 历史记录

在首页或结果页可进入 **历史记录** 页面，查看所有历史分析：

- 列表显示批次 ID、分析时间、文件数、节点数
- 鼠标在表格上移动时，离光标最近的行会拉伸弹出，远处行缩小——快速扫描定位
- 点击任意行跳转到对应的分析结果
- 支持删除历史记录（同时删除上传文件和分析结果）

---

## 数据格式要求

系统通过智能字段映射识别 CSV/Excel 中的列，建议数据包含以下字段：

### 节点表（必需）

| 字段 | 说明 | 示例 |
|------|------|------|
| 节点 ID / 名称 | 供应链实体的唯一标识 | `FAC-001`、`供应商A` |
| 层级 | 供应链层级（L1=工厂/供应商，L2=仓储/集散，L3=分销/零售） | `1`、`2`、`3` |

### 边/关系表（必需）

| 字段 | 说明 | 示例 |
|------|------|------|
| 上游节点 / 来源 | 边的起点 | `FAC-001` |
| 下游节点 / 目标 | 边的终点 | `WH-002` |
| 关系类型 | 业务关系分类 | `supply`、`distribution` |

### 可选字段

| 字段 | 说明 |
|------|------|
| 库存量 / 库存周转 | 用于计算库存健康度 |
| 交付准时率 / 延迟天数 | 用于计算交付偏差 |
| 价格波动 / 成本波动 | 用于计算波动性风险 |
| 历史风险标记 | 已知风险标签 |

> 系统会自动识别中英文列名并进行模糊匹配。不要求列名完全一致，但数据中应包含可识别的节点标识和连接关系。

---

## 分析结果说明

### 数据概况

顶部卡片展示本次分析的基本信息：文件数、数据行数、节点总数。

### 文字摘要

五段式 AI 生成文字摘要，以卡片形式呈现：

| 段落 | 内容 |
|------|------|
| 当前状况判断 | 供应链整体风险态势的概括性判断 |
| 风险主要原因 | 导致高风险的关键因素分析 |
| 影响对象 | 可能受到风险冲击的节点或环节 |
| 建议措施 | 针对性的缓解与应对建议 |
| 需要补充的数据 | 因数据不足无法判断的部分，提示改进方向 |

### 风险趋势图

折线图展示风险评分随时间的变化趋势，帮助识别风险恶化的时间窗口。

### 风险分布图

饼图/柱状图展示高、中、低风险节点的分布比例。

### 高风险节点表

列出风险评分最高的节点，包含节点名称、层级、风险等级、风险评分、相关连接数等字段。

### 供应链网络 3D 关系图

**核心可视化模块**，以三维力导向图呈现整个供应链网络：

- **节点颜色**：按层级着色（L1 青绿、L2 棕红、L3 金黄）
- **节点大小**：按连接度（上下游关系总数）缩放，连接越多节点越大
- **连线粗细**：按关系权重缩放，重要关系更粗
- **连线颜色**：基色为暖灰，高亮关系为棕红

**操作方式**：

| 操作 | 效果 |
|------|------|
| 鼠标拖拽 | 旋转视角 |
| 滚轮 | 缩放（150–500 距离范围） |
| 点击节点 | 聚焦该节点，高亮其所有连线，相机飞向节点 |
| 再次点击同一节点 | 取消聚焦 |

图下方附带 **节点连接数排名表**，点击表格行同样可聚焦对应节点。

> 坐标系原点位于节点团簇中心。3D 渲染采用 WebGL，需要浏览器支持。

### 风险传播时序图

展示风险从源头节点向下游扩散的时间线，帮助理解风险的级联传播路径。

### 数据可信度

评估本次分析所用数据的质量：
- 各维度可信度百分比（数据完整性、字段覆盖率、关系一致性等）
- 缺失字段提示
- 数据质量改进建议

### 下载导出

- **下载 JSON**：完整的分析结果（包含所有图表数据和文字结论）
- **HTML 报告**（即将支持）
- **Excel 导出**（即将支持）

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/upload` | 上传 CSV/Excel 文件（multipart） |
| `POST` | `/api/analyze?batch_id=xxx` | 开始分析（SSE 流式推送进度） |
| `GET` | `/api/results/{batch_id}` | 获取分析结果 JSON |
| `GET` | `/api/results/{batch_id}/download?format=json` | 下载结果文件 |
| `GET` | `/api/history` | 获取历史分析列表 |
| `DELETE` | `/api/history/{batch_id}` | 删除某次分析 |
| `GET` | `/api/nodes/{node_id}?batch_id=xxx` | 获取节点详情 |
| `GET` | `/api/health` | 健康检查 |

### SSE 事件类型

分析接口（`/api/analyze`）返回以下事件：

| 事件 | 说明 |
|------|------|
| `progress` | 分析进度更新，`data.stage` 为 `start/reading/mapping/merging/graph/risk/analysis/done` |
| `text` | 文字摘要段落，`data.section` 标识段落类型 |
| `complete` | 分析完成 |
| `error` | 分析出错 |

---

## 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| React Router v7 | SPA 路由 |
| ECharts 6 | 二维图表（趋势图、分布图、时序图等） |
| react-force-graph-3d | 3D 力导向图（基于 Three.js） |
| Three.js | 3D 渲染底层 |

### 后端

| 技术 | 用途 |
|------|------|
| FastAPI | Web 框架 |
| pandas | 数据处理 |
| openpyxl | Excel 文件读取 |

---

## 项目结构

```
app/
├── README.md                      # 本文件
├── frontend/                      # 前端项目
│   ├── package.json
│   ├── vite.config.ts             # Vite 配置（outDir → ../backend/static）
│   ├── index.html                 # SPA 入口 HTML
│   └── src/
│       ├── App.tsx                # 路由定义
│       ├── main.tsx               # React 入口
│       ├── pages/
│       │   ├── UploadPage.tsx     # 上传页面（步骤 1/3）
│       │   ├── ConfirmPage.tsx    # 分析确认页面（步骤 2/3）
│       │   ├── ResultPage.tsx     # 结果页面（步骤 3/3）
│       │   └── HistoryPage.tsx    # 历史记录页面
│       ├── components/
│       │   ├── layout/            # 布局组件（PageShell, SectionCard, TopNotice）
│       │   ├── upload/            # 上传组件（FileDropzone）
│       │   ├── result/            # 结果组件（SummaryPanel, RiskNodeTable, DownloadPanel 等）
│       │   └── charts/            # 图表组件
│       │       ├── ForceGraph3D.tsx          # 3D 供应链网络图
│       │       ├── NodeConnectivityTable.tsx # 节点连接排名表
│       │       ├── RiskTrendChart.tsx        # 风险趋势图
│       │       ├── RiskDistributionChart.tsx # 风险分布图
│       │       ├── PropagationTimelineChart.tsx # 风险传播时序图
│       │       └── DataConfidenceChart.tsx   # 数据可信度图
│       ├── utils/
│       │   └── api.ts             # API 调用封装
│       └── styles/
│           ├── tokens.css         # 设计令牌（CSS 自定义属性）
│           └── globals.css        # 全局样式
│
├── backend/                       # 后端项目
│   ├── main.py                    # FastAPI 应用入口
│   ├── adapters/
│   │   └── excel_adapter.py       # CSV/Excel 文件读取适配器
│   ├── services/
│   │   ├── field_mapper.py        # 字段映射与识别
│   │   ├── data_merger.py         # 多文件数据合并
│   │   ├── graph_builder.py       # 供应链网络图构建
│   │   ├── risk_engine.py         # 风险评分引擎
│   │   ├── analysis_engine.py     # 分析结果组装
│   │   ├── prompt_builder.py      # 文字摘要生成
│   │   └── result_exporter.py     # 结果导出（JSON + HTML）
│   ├── schemas/
│   │   └── mapping.py             # 数据模型定义
│   ├── utils/
│   │   └── error_utils.py         # 错误与警告收集工具
│   └── static/                    # 前端构建产物（npm run build 输出）
│
└── data/                          # 运行时数据（自动创建）
    ├── uploads/                   # 上传文件存储
    ├── results/                   # 分析结果 JSON 文件
    └── known_nodes.json           # 已知节点列表缓存
```

---

## 开发指南

### 前端开发

```bash
cd frontend
npm run dev        # 启动 Vite 开发服务器（端口 5173）
```

Vite 开发服务器自动将 `/api` 请求代理到 `http://127.0.0.1:8000`，因此需要同时启动后端。

```bash
npm run build      # 生产构建，输出到 ../backend/static/
npm run lint       # ESLint 检查
```

### 后端开发

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

`--reload` 参数使代码修改后自动重启。

### 分析流水线

整个分析流程在 `backend/main.py` 的 `/api/analyze` 端点中编排：

```
ExcelAdapter.read()
  → FieldMapper.process()
    → DataMerger.merge()
      → GraphBuilder.build()
        → RiskEngine.calculate()
          → AnalysisEngine.assemble()
            → PromptBuilder.build()
              → ResultExporter.export()
```

每个阶段通过 SSE 向客户端推送进度。阶段之间通过 Python 字典传递数据，无外部依赖。

### 风险模型

风险评分采用 **Risk × Propagation** 模型（`backend/services/risk_engine.py`）：

```
Risk = 波动性(30%) + 库存健康度(25%) + 交付偏差(25%) + 历史标记(20%)
Propagation = 网络影响度（度数 + 传播脆弱性）
Score = Risk × Propagation
```

风险等级划分：
- **高风险**：Score ≥ 0.7
- **中风险**：0.3 ≤ Score < 0.7
- **低风险**：Score < 0.3

### 注意事项

- 3D 关系图组件（`ForceGraph3D.tsx`）通过动态 `import()` 按需加载，首次渲染会显示"加载 3D 引擎..."提示
- 数据文件使用 `batch_id`（格式 `batch_YYYYMMDD_HHMMSS`）隔离不同批次
- 已知节点列表缓存在 `data/known_nodes.json`，用于辅助后续分析的字段识别
- Python 依赖（fastapi, uvicorn, pandas, openpyxl）需手动 `pip install`，暂无 `requirements.txt`

---

## 软件著作权

本系统为原创软件，可申请计算机软件著作权。核心创新点：

1. **多源异构数据自动映射**：无需固定模板，自动识别不同格式的供应链数据字段
2. **风险×传播双层评分模型**：综合节点自身风险与网络传播影响力的复合评分
3. **3D 交互式供应链拓扑可视化**：基于力导向算法的三维网络图，支持节点聚焦与关系高亮
4. **SSE 流式分析进度推送**：长时间分析任务实时反馈，避免超时断开
5. **五段式智能文字摘要**：自动生成涵盖状况判断、归因分析、影响评估、行动建议的完整报告

申请时建议将源代码（`frontend/src/` 和 `backend/` 下的所有 `.ts`/`.tsx`/`.py` 文件）作为申请材料提交。
