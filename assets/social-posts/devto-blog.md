# I Built an Offline Supply Chain Risk Analyzer That Runs on a Laptop

**How I turned SCOR model theory + FastAPI + React into a desktop app supply chain managers can actually use.**

---

## The Problem

Most supply chain teams manage risk in Excel. They have CSV exports from ERP systems, spreadsheets from suppliers, and quarterly reports from logistics partners. Finding the signal in that noise — which node is at risk, where the bullwhip effect is amplifying, who needs immediate action — is near impossible without a dedicated tool.

The tools that exist are either:
- Enterprise SaaS (expensive, cloud-dependent, long procurement cycles)
- Academic papers (not executable)
- Generic BI tools (Tableau, Power BI) that require heavy data modeling before you see anything useful

## What Saisca Does

Saisca is a desktop app. You drop in your Excel/CSV files, and it:

1. **Auto-maps fields** — recognizes node IDs, timestamps, risk metrics, relationships
2. **Builds a supply chain graph** — nodes, edges, tier hierarchy
3. **Computes risk scores** — volatility, inventory health, delivery reliability, delay flags
4. **Detects domain patterns** — Bullwhip Effect, VMI, Quick Response
5. **Generates a full reasoning trail** — every risk score shows the 6-step calculation
6. **Recommends actions** — replenish, reroute, switch supplier, adjust logistics, investigate

All offline. No cloud. No data leaving the laptop.

## The Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Backend** | FastAPI + pandas | Fast, reliable CSV/Excel parsing, API-first design |
| **Frontend** | React + TypeScript + Vite | Clean SPA, zero Node.js needed at runtime |
| **Charts** | ECharts | Rich supply chain visualization out of the box |
| **Desktop shell** | Electron + PyInstaller | One double-click to launch |
| **Theory** | SCOR Model, Bullwhip Effect, VMI, QR, SC-BSC | Academic framework → executable software |

## Key Design Decisions

### 1. Business logic runs once, downstream only reads labels

The risk engine computes scores and annotates `risk_causes` ("inventory too low"), `action_type` ("replenish"), and `action_justification`. Downstream modules (prompt builder, report exporter) only read these semantic labels — never recompute from raw data. This keeps the reasoning traceable and consistent.

### 2. Wide-to-long table melting

Supply chain data comes in two formats: long (date, node_id, value) and wide (rows = dates, columns = nodes). The field mapper automatically detects and melts wide tables, preserving metric names from file names.

### 3. No silent data loss

Every warning, every unrecognized column, every duplicate is collected and surfaced. The data confidence panel tells users exactly what's missing and what they'd unlock by providing it.

## What's Next

- Windows + Linux builds (currently macOS only)
- Online demo page (so people can try without downloading)
- More domain patterns (inventory bullwhip, lead time variability propagation)

## Try It

- **GitHub:** [github.com/cengchenyicheng/saisika](https://github.com/cengchenyicheng/saisika)
- **Download:** [Releases](https://github.com/cengchenyicheng/saisika/releases)
- **License:** MIT

---

*Feedback from anyone in supply chain, logistics, or operations — I'd love to hear what data formats you work with and what risk patterns you care about.*
