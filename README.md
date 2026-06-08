# Saisca — Offline Supply Chain Risk Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-green.svg)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![Release](https://img.shields.io/badge/release-v1.4.1-brightgreen.svg)](https://github.com/cayincoorts-hue/saisika/releases)
[![Discussions](https://img.shields.io/badge/discussions-welcome-blue.svg)](https://github.com/cayincoorts-hue/saisika/discussions)
[![CI](https://github.com/cayincoorts-hue/saisika/actions/workflows/ci.yml/badge.svg)](https://github.com/cayincoorts-hue/saisika/actions)

**Drop in Excel/CSV files. Get risk insights, reasoning trails, and actionable recommendations — all offline. No cloud. No telemetry.**

<p align="center">
  <img src="assets/screenshots/upload.png" width="30%" alt="Upload" />
  <img src="assets/screenshots/confirm.png" width="30%" alt="Confirm" />
  <img src="assets/screenshots/results.png" width="30%" alt="Results" />
</p>

---

## What It Does

| Output | Question Answered |
|--------|------------------|
| **Risk Trend Chart** | Is risk worsening or improving over time? |
| **Risk Distribution Chart** | Where is risk concentrated in the network? |
| **Propagation Timeline** | Where does risk come from, and where is it spreading? |
| **High-Risk Node Table** | Which nodes need immediate action, in what order? |
| **Data Confidence Panel** | How reliable is this analysis? What data is missing? |
| **Domain Insights** | Bullwhip effect? VMI pattern? Quick Response detected? |

Every high-risk node includes a full **6-step reasoning trail**, risk cause details with threshold comparisons, and structured action recommendations (Replenish / Reroute / Switch Supplier / Adjust Logistics / Investigate / Monitor).

**New in v1.4.1:** Light minimalist UI — clean top navigation, warm monochrome palette. Full English support with zero Chinese strings in EN mode.

## Quick Start

### One Command

```bash
pip install -r requirements.txt && python run.py
# Open http://localhost:8000
```

No Node.js setup needed — the frontend is pre-built and served by FastAPI.

### Desktop App (macOS)

Download the `.dmg` from [Releases](https://github.com/cayincoorts-hue/saisika/releases) → drag to Applications → right-click → Open.

**Free and open. No activation code required.**

### Demo Data

`demo_data/demo_scenario/` contains a 10-node supply chain simulation (26 weeks × 5 metrics). Upload all CSV files to see the full pipeline:

```bash
# After starting the server:
curl -X POST http://localhost:8000/api/upload \
  -F "files=@demo_data/demo_scenario/Nodes.csv" \
  -F "files=@demo_data/demo_scenario/Sales Order.csv" \
  -F "files=@demo_data/demo_scenario/Production.csv" \
  -F "files=@demo_data/demo_scenario/Delivery To Distributor.csv" \
  -F "files=@demo_data/demo_scenario/Factory Issue.csv"
curl -X POST "http://localhost:8000/api/analyze?batch_id=YOUR_BATCH_ID&lang=en"
```

## Architecture

```
Upload Excel/CSV
  ↓
excel_adapter      Read file → detect role (fact/node/edge)
  ↓
field_mapper       Wide-table melt → column mapping → tri-state ID
  ↓
data_merger        Cross-scenario merge → unified long table
  ↓
graph_builder      Build supply chain network → infer hierarchy
  ↓
risk_engine        Compute risk scores → annotate risk_causes
  ↓
decision_engine    Classify actions → action_type + justification
  ↓
analysis_engine    Assemble 6 result objects + domain_insights
  ↓
prompt_builder     Generate text summary (reads labels, never raw numbers)
  ↓
result_exporter    Output JSON + HTML report
```

**Key principle:** Business logic runs once at the data source. Downstream modules consume semantic labels only — never recompute from raw data.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite + ECharts + GSAP |
| Backend | Python + FastAPI + pandas + openpyxl |
| 3D Graph | Three.js + react-force-graph-3d |
| Theory | SCOR / Bullwhip Effect / VMI / QR / SC-BSC |
| Packaging | PyInstaller + Electron (macOS .dmg) |

## Privacy & Security

- **All data stored locally** in `data/` directory — never leaves your machine
- **Zero network requests** — no telemetry, no analytics, no cloud
- **Offline by design** — works on an air-gapped laptop
- Security issues? See [SECURITY.md](SECURITY.md)

## Data Format

**Long format** (recommended):
```csv
date,node_id,value
2026-01-05,S001,99.3
```

**Wide format** (auto-melted): rows as dates, columns as nodes
```csv
Date,SOS008L02P,SOS005L04P
2026-01-05,1355.0,890.2
```

Node tables: `node_id, node_name, node_type`. Edge tables: `source, target, relation_type`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and PR checklist.

## License

MIT — see [LICENSE](LICENSE).

---

<details>
<summary>中文说明</summary>

Saisca 是一款可本地部署的供应链风险分析桌面工具。导入 Excel/CSV 即可获得风险洞察、推理链条和处置建议——全部离线，无需云端。

### 快速开始

```bash
pip install -r requirements.txt && python run.py
# 浏览器访问 http://localhost:8000
```

无需安装 Node.js——前端已预构建，由 FastAPI 直接 serve。

### 演示数据

`demo_data/demo_scenario/` 含 10 节点供应链模拟数据（26 周 × 5 指标），刻意设计了牛鞭效应、VMI、QR 等经典风险特征。上传后可直接看到完整分析流程。

### 隐私

全部数据存本地 `data/` 目录。不联网，无遥测，无云端依赖。适合断网环境使用。

</details>
