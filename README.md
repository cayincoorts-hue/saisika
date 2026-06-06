# Saisca — Supply Chain Risk Analysis System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-green.svg)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![Release](https://img.shields.io/badge/release-v1.4.0-brightgreen.svg)](https://github.com/cayincoorts-hue/saisika/releases)

A locally-deployable supply chain risk analysis tool for supply chain managers. Import Excel/CSV, get risk insights, reasoning trails, and actionable recommendations — all offline, no cloud dependency.

> **📹 [Watch Demo (YouTube)](https://youtube.com/)** · **[Bilibili 演示视频](https://bilibili.com/)**

<p align="center">
  <img src="assets/screenshots/upload.png" width="30%" alt="Upload Page" />
  <img src="assets/screenshots/confirm.png" width="30%" alt="Confirm Page" />
  <img src="assets/screenshots/results.png" width="30%" alt="Results Page" />
</p>

## What It Does

| Output | Answers the Question |
|--------|---------------------|
| **Risk Trend Chart** | Is risk worsening or improving over time? |
| **Risk Distribution Chart** | Where is risk concentrated across the supply chain? |
| **Propagation Timeline** | Where does risk come from and spread to? |
| **High-Risk Node Table** | Which nodes need immediate action, in what order? |
| **Data Confidence** | How reliable is this analysis? What data is missing? |
| **Domain Insights** | Bullwhip effect, VMI, QR patterns detected? |

Each high-risk node includes a full **6-step reasoning trail**, **risk cause details** (trigger metrics + threshold comparisons), and **structured action recommendations** (replenish / reroute / switch supplier / adjust logistics / investigate / monitor).

## Quick Start

### Desktop App (Double-click to Launch)

Download the latest `.dmg` from [GitHub Releases](https://github.com/cayincoorts-hue/saisika/releases) → drag to Applications → launch Saisca. (First launch: right-click → Open.)

**Now free and open — no activation code required.**

### Run from Source

```bash
git clone https://github.com/cayincoorts-hue/saisika.git
cd saisika
pip install -r requirements.txt
python run.py
# Open http://localhost:8000
```

## Demo Data

`demo_data/demo_scenario/` contains a purpose-built 10-node supply chain simulation (26 weeks × 5 metrics):

| File | Description |
|------|-------------|
| `Sales Order.csv` | Downstream demand (long format: date, node_id, value) |
| `Production.csv` | Factory output |
| `Delivery To Distributor.csv` | Distribution center deliveries |
| `Factory Issue.csv` | Supplier shipments |
| `Inventory.csv` | Node inventory levels (S002 sharp drop in last 10 weeks) |
| `Nodes.csv` | Node attributes (name, type, tier, region) |
| `Edges.csv` | Supply chain relationships (risk links marked) |
| `Node Types.csv` | Node type descriptions |
| `README.md` | Scenario design notes |

**Engineered risk characteristics:**

- S002 East China Parts Supplier → inventory crash + delivery disruption → **high-risk node**
- P001 Shenzhen Factory → upstream volatility amplification → **bullwhip effect**
- D001 South China DC → volatility significantly lower than peers → **VMI pattern**
- R002 Shanghai Retailer → high-frequency small-batch stable demand → **QR pattern**

## Architecture

```
User uploads Excel/CSV
  ↓
excel_adapter      Read file → detect role (fact/node/edge/metadata)
  ↓
field_mapper       Wide-table melt → column mapping → tri-state identification
  ↓
data_merger        Cross-scenario merge → mark duplicate measurement bases
  ↓
graph_builder      Build supply chain network → infer tier hierarchy
  ↓
risk_engine        Compute risk scores → annotate risk_causes
  ↓
decision_engine    Classify actions → generate action_type + justification
  ↓
analysis_engine    Assemble 6 result objects (including domain_insights)
  ↓
prompt_builder     Generate text conclusions (reads annotations, never raw numbers)
  ↓
result_exporter    Output JSON + HTML report
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite + ECharts + GSAP |
| Backend | Python + FastAPI + pandas + openpyxl |
| Graph Layout | Three.js + react-force-graph-3d |
| LLM (optional) | Ollama (explanation layer only, not risk engine) |
| Packaging | PyInstaller + Electron + electron-builder |
| Theory | SCOR / Bullwhip Effect / VMI / QR / SC-BSC |

## Data Format

The system accepts two fact-table formats:

**Long format** (recommended): `date, node_id, value`
```csv
date,node_id,value
2026-01-05,S001,99.3
```

**Wide format**: rows as dates, columns as node codes
```csv
Date,SOS008L02P,SOS005L04P
2026-01-05,1355.0,890.2
```

Node tables need: `node_id, node_name, node_type`. Edge tables need: `source, target`.

## Privacy

- All data stored locally in `data/` directory
- No internet connection, no telemetry, no cloud dependency
- Backend compiled to binary for code logic protection

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<details>
<summary>中文说明</summary>

# Saisca — 供应链风险分析系统

面向供应链管理者，可本地部署、支持 Excel/CSV 导入的风险分析桌面工具。不依赖云端，数据不出本地。

## 分析输出

| 结果 | 回答的问题 |
|------|-----------|
| 风险趋势图 | 风险是在加剧还是缓解？ |
| 风险分布图 | 整体风险集中在哪一层？ |
| 风险传播时序图 | 风险从哪里来、往哪里扩散？ |
| 高风险节点表 | 哪些节点需要立即处理、按什么顺序？ |
| 数据可信度 | 结论有多可信、缺了什么数据？ |
| 供应链领域洞察 | 是否存在牛鞭效应、VMI、QR 等经典模式？ |

## 快速开始

从 [GitHub Releases](https://github.com/cayincoorts-hue/saisika/releases) 下载 `.dmg` → 拖入 Applications → 右键打开。

**现已免费开放，无需激活码。**

## 演示数据

`demo_data/demo_scenario/` 含 10 节点供应链模拟数据（26 周 × 5 指标），刻意设计了牛鞭效应、VMI、QR 等经典风险特征。

## 隐私

全部数据存本地 `data/` 目录。不联网，无遥测，无云端依赖。

## 许可证

MIT License。详见 [LICENSE](LICENSE)。

</details>
