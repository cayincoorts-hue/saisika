# Changelog

Notable changes to Saisca. Versions follow `MAJOR.MINOR.PATCH`.

---

## v1.4.1 (2026-06-07)

### Design
- **Light minimalist editorial UI** — warm monochrome palette, top navigation
- Removed sidebar; replaced with clean top nav bar
- Ultra-flat cards, 1px borders, muted pastel accents
- Zero external font dependencies (SF Pro / Segoe UI system stacks)

### Features
- **Full bilingual pipeline** — risk engine, decision engine, analysis engine all output English when `lang=en`
- Zero Chinese strings in EN mode
- **Scenario engine** — "Try Change" to edit node parameters and run A/B comparisons

### Fixes
- Google Fonts removed from HTML and CSS (was causing blank screen in China)
- Domain pattern labels properly translated (VMI, Bullwhip, QR)
- Data confidence title localized
- "Analyze New Data" button i18n fix

---

## v1.4.0 (2026-05-28 to 2026-06-06)

### Design
- Dark dashboard theme (v3, replaced in v1.4.1)
- Sidebar layout with Glassmorphism

### Features
- Bilingual backend pipeline (`PromptBuilder` with zh/en support)
- Scenario comparison engine (node parameter editing)
- I18n components (AppShell, Navbar, Footer, ForceGraph3D, GraphInterpretation)
- GSAP animation system (scroll-reveal, stagger cards, count-up, risk pulse)
- Decision engine extracted as standalone module
- License activation system

### Infrastructure
- GitHub Actions CI for macOS builds
- PyInstaller + Electron packaging
- Cross-platform path utilities
- Social post drafts (Show HN, dev.to, Reddit, V2EX)

---

## v1.3.0 (2026-05-28)

- **GSAP animation system** — `animations.ts` with stagger cards, useReveal hook, countUp, pulseRisk
- **Decision engine** — extracted from risk_engine as standalone module
- **Packaging** — PyInstaller .spec + Electron main.js + electron-builder
- **License system** — machine fingerprint + activation key (disabled in v1.4)
- **Demo dataset** — `demo_data/demo_scenario/` with documented scenarios
- Reasoning trail (6-step calculation per node)
- Risk causes detail with threshold comparison
- Domain pattern detection (Bullwhip, VMI, QR)
- Deterministic fingerprint for reproducibility

---

## v1.2.0 (2026-05-25)

- Tech stack finalized: React + TypeScript + FastAPI + ECharts
- Excel + CSV dual input support
- Data persistence in `data/` directory
- Three-layer data flow architecture
- Wide-table melting and cross-scenario merging
- Business logic single-source principle
- Memory-adaptive node limits (500-2000 nodes)
- Project directory restructured

---

## v1.1.0 (2026-05-03)

- Five-chart result output specification
- Priority formula: Risk × Propagation
- Streaming text output (per-paragraph, 0.3s interval)
- Field auto-recognition with three-state identification
- 15 required/suggested field definitions
- Code reuse strategy from open-source references
- Image recognition deferred to v2
