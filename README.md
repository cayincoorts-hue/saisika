# Saisca — 供应链风险分析系统

面向供应链管理者，可本地部署、支持 Excel/CSV 导入的风险分析桌面工具。不依赖云端，数据不出本地。

## 分析输出

每次分析产出六类结果：

| 结果 | 回答的问题 |
|------|-----------|
| **风险趋势图** | 风险是在加剧还是缓解？ |
| **风险分布图** | 整体风险集中在哪一层？ |
| **风险传播时序图** | 风险从哪里来、往哪里扩散？ |
| **高风险节点表** | 具体哪些节点需要立即处理、按什么顺序？ |
| **数据可信度** | 这次分析的结论有多可信、缺了什么数据？ |
| **供应链领域洞察** | 是否存在牛鞭效应、VMI、QR 等经典模式？ |

每个高风险节点附带完整的 **推理链条**（6 步计算过程）、**原因详情**（触发指标 + 阈值对比）、以及 **结构化的处置建议**（补货/转单/切换供应商/调整运输路径/核查波动/加强监控）。

## 快速开始

### 方式一：桌面应用（双击即用）

下载 `.dmg` → 拖入 Applications → 启动 Saisca。首次启动右键打开。

### 方式二：开发者模式

```bash
pip install -r requirements.txt
python run.py
open http://localhost:8000
```

首次使用需激活。输入界面显示的机器 ID，联系供应商获取激活码。

## 演示数据

`demo_data/demo_scenario/` 包含一套专门设计的 10 节点供应链模拟数据（26 周 × 5 指标）：

| 文件 | 说明 |
|------|------|
| `Sales Order.csv` | 下游订单需求（长格式：date, node_id, value） |
| `Production.csv` | 工厂产量 |
| `Delivery To Distributor.csv` | 配送中心交付量 |
| `Factory Issue.csv` | 供应商出货量 |
| `Inventory.csv` | 各节点库存水平（后 10 周 S002 骤降） |
| `Nodes.csv` | 节点属性（名称、类型、层级、区域） |
| `Edges.csv` | 供应链关系（含风险链路标记） |
| `Node Types.csv` | 节点类型说明 |
| `README.md` | 场景设计说明 |

**刻意设计的风险特征**：

- S002 华东零部件供应商 → 库存骤降 + 交付中断 → 高风险节点
- P001 深圳制造工厂 → 上游波动放大 → 牛鞭效应
- D001 华南配送中心 → 波动显著低于同层 → VMI 模式
- R002 上海零售商 → 高频小幅稳定需求 → QR 特征

## 项目结构

```
app/
  backend/           Python 后端（FastAPI）
    adapters/        文件读取与角色识别
    services/        业务逻辑（field_mapper → data_merger → graph_builder
                     → risk_engine → decision_engine → analysis_engine
                     → prompt_builder）
    utils/           工具函数（路径解析、license 验证）
    static/          前端构建产物
  frontend/          React 前端（TypeScript + Vite）
    pages/           四个页面 + 激活页
    components/      图表、布局、结果组件
demo_data/           演示数据集
datasets/            原始数据集（不提交 git）
electron/            Electron 桌面壳
keygen.py            激活码生成工具
generate_demo_data.py 演示数据生成脚本
run.py               一键启动入口
saisika.spec         PyInstaller 打包配置
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React + TypeScript + Vite + ECharts + GSAP |
| 后端 | Python + FastAPI + pandas + openpyxl |
| 图布局 | Three.js + react-force-graph-3d |
| 大模型 | Ollama（仅用于解释层，不替代风险引擎） |
| 打包 | PyInstaller + Electron + electron-builder |
| 理论框架 | SCOR / 牛鞭效应 / VMI / QR / SC-BSC |

## 数据格式

系统接受两种格式的事实表：

**长格式**（推荐）：`date, node_id, value`
```
date,node_id,value
2026-01-05,S001,99.3
```

**宽格式**：行为日期，列为节点编码
```
Date,SOS008L02P,SOS005L04P
2026-01-05,1355.0,890.2
```

节点表需包含：`node_id, node_name, node_type`。边表需包含：`source, target`。

## 隐私

- 全部数据存本地 `data/` 目录
- 不联网，无遥测，无云端依赖
- 后端编译为二进制，保护代码逻辑

## 许可证

专有软件。未经授权不得分发。
