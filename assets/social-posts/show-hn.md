# Show HN: Saisca — offline supply chain risk analyzer (Excel/CSV → insights)

I built Saisca, an open-source desktop tool that helps supply chain managers spot risks by just dropping in their Excel/CSV files. It runs completely offline — no cloud, no data leaving the machine.

**What it does:**
- Upload your supply chain data (Excel/CSV) → automatic field mapping → risk analysis with 6 result types
- Detects patterns like the Bullwhip Effect, VMI, and Quick Response replenishment
- Each high-risk node gets a full 6-step reasoning trail showing exactly how the score was calculated
- Generates actionable recommendations: replenish, reroute, switch supplier, adjust logistics, investigate

**Why I built it:**
Most supply chain risk tools are either enterprise SaaS (expensive, cloud-dependent) or academic papers (not usable). I wanted something a supply chain manager can run on their laptop — drop in files, get answers, no IT department needed.

**Tech stack:** React + FastAPI + ECharts + pandas. Packaged as an Electron desktop app (macOS .dmg available, Windows/Linux coming).

**Demo data included** — a 10-node supply chain with intentionally engineered risks (inventory crash, bullwhip amplification, VMI pattern).

GitHub: https://github.com/cayincoorts-hue/saisika
Download: https://github.com/cayincoorts-hue/saisika/releases

Feedback welcome — especially from anyone in supply chain or logistics!
