# Contributing to Saisca

Thank you for your interest in contributing. Saisca is an offline supply chain risk analyzer built with FastAPI + React + TypeScript.

## Before You Start

1. **Search existing issues and discussions** — your idea or bug may already be tracked.
2. **Open a Discussion first** for feature requests, so we can align on scope before you write code.
3. For bugs, open an issue with steps to reproduce.

## Development Setup

```bash
git clone https://github.com/cayincoorts-hue/saisika.git
cd saisika
pip install -r requirements.txt
cd app/frontend && npm install && cd ../..
python run.py
```

Open http://localhost:8000 — requires Python 3.9+ and Node.js 18+.

## Project Structure

```
app/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── adapters/            # File readers (Excel/CSV)
│   ├── services/            # Business logic pipeline
│   │   ├── field_mapper.py
│   │   ├── graph_builder.py
│   │   ├── risk_engine.py   # Threshold constants — single source of truth
│   │   ├── decision_engine.py
│   │   ├── analysis_engine.py
│   │   ├── prompt_builder.py
│   │   └── ...
│   ├── utils/               # Error handling, path, license, bilingual
│   └── static/              # Built frontend assets
├── frontend/
│   └── src/
│       ├── pages/           # Upload, Confirm, Mapping, Result
│       ├── components/      # Reusable UI
│       ├── i18n/locales/    # en.json, zh.json
│       └── styles/          # tokens.css, globals.css
tests/                       # Pytest test suite
```

## Rules Engine Principle

The most important architectural rule: **business logic runs once at the data source**. Risk thresholds are defined ONLY in `risk_engine.py`. Downstream modules (`prompt_builder`, `analysis_engine`, `decision_engine`) read semantic labels — never recompute from raw numbers.

This keeps reasoning traceable, consistent, and auditable.

## Pull Request Checklist

- [ ] Code follows the project's architectural principle (logic at source, labels downstream)
- [ ] New backend logic has corresponding tests in `tests/`
- [ ] Frontend text uses i18n keys (`t('key.name')`) — no hardcoded English or Chinese strings
- [ ] Both `en.json` and `zh.json` are updated if new keys are added
- [ ] `npm run build` succeeds (TypeScript compilation)
- [ ] `python3 -m pytest tests/` passes

## Commit Style

- `feat:` new feature
- `fix:` bug fix
- `design:` UI/style changes
- `docs:` documentation
- `refactor:` restructuring without behavior change

Example: `fix: remove Google Fonts — blocks rendering in China`

---

Questions? Open a [Discussion](https://github.com/cayincoorts-hue/saisika/discussions).
