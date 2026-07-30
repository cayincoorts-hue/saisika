#!/usr/bin/env python3
"""
Saisca 一键多发脚本
用法:
  python scripts/auto_post.py reddit-opensource   # 发 r/opensource
  python scripts/auto_post.py reddit-python        # 发 r/Python
  python scripts/auto_post.py v2ex                 # 发 V2EX
  python scripts/auto_post.py devto                # 发 Dev.to
  python scripts/auto_post.py all                  # 按顺序全部发（带间隔）

前置：复制 scripts/.env.example → scripts/.env，填好三个平台的密钥
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from datetime import datetime

# --- 代理配置（Clash 默认端口 7892）---
PROXY_URL = "http://127.0.0.1:7892"

# Reddit / Dev.to 走代理；V2EX 直连
PROXY_PLATFORMS = {"reddit-opensource", "reddit-python", "devto"}

def enable_proxy():
    os.environ["HTTP_PROXY"] = PROXY_URL
    os.environ["HTTPS_PROXY"] = PROXY_URL

def disable_proxy():
    os.environ.pop("HTTP_PROXY", None)
    os.environ.pop("HTTPS_PROXY", None)

# --- 加载 .env ---
SCRIPT_DIR = Path(__file__).parent
ENV_FILE = SCRIPT_DIR / ".env"

def load_env():
    """从 .env 文件加载配置"""
    config = {}
    if not ENV_FILE.exists():
        print(f"❌ 缺少配置文件: {ENV_FILE}")
        print(f"   请复制 .env.example → .env 并填入密钥")
        sys.exit(1)
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                config[key.strip()] = val.strip()
    return config

env = load_env()

# ============================================================
# 发帖内容
# ============================================================

POSTS = {
    "reddit-opensource": {
        "subreddit": "opensource",
        "title": "Show r/opensource: Saisca — offline supply chain risk analysis (Excel → insights, bullwhip detection, MIT)",
        "body": """Just open-sourced this under MIT. Supply chain risk analyzer that runs fully offline. Drop Excel/CSV → automatic risk scoring → reasoning trails → action recommendations. React + FastAPI + ECharts. Electron desktop app.

https://github.com/cayincoorts-hue/saisika""",
        "flair": None,
        "first_comment": "Tech details for the curious: the backend auto-detects wide vs long table formats and melts wide tables automatically. Risk scores use a 6-step reasoning trail (metric aggregation → component calc → percentile → weighting → propagation → final score). Every single decision is traceable. Happy to answer questions!",
    },
    "reddit-python": {
        "subreddit": "Python",
        "title": "Built a FastAPI + pandas supply chain risk analyzer — completely offline, runs on any laptop",
        "body": """Tech stack: FastAPI backend, React frontend, pandas for data processing, ECharts for visualization, packaged as Electron desktop app.

Key engineering decisions:
- Wide-to-long table auto-melting for supply chain CSV formats
- Business logic computed once, downstream only reads semantic labels
- All warnings collected and surfaced (no silent data loss)
- Full 6-step reasoning trail for every risk score

https://github.com/cayincoorts-hue/saisika""",
        "flair": "Showcase",
        "first_comment": "The most interesting engineering challenge was auto-melting wide tables (rows=dates, columns=nodes) into long format (date, node_id, value, metric_name). Supply chain data is notoriously inconsistent. The field mapper handles 3-state recognition: identified / pending / unrecognized. Fuzzy matches go to pending for user confirmation instead of guessing. Built with FastAPI + pandas, frontend is React + ECharts, all packaged into Electron. Would love feedback on the approach!",
    },
    "v2ex": {
        "node": "create",
        "title": "我做了一个离线供应链风险分析桌面工具，求供应链同行试用来反馈",
        "body": """Saisca，一个可以本地运行的供应链风险分析工具。丢 Excel/CSV 进去，自动识别字段、计算风险评分、检测牛鞭效应/VMI/QR 模式，给出推理过程和建议动作。

技术栈：React + FastAPI + pandas + ECharts
完全离线，数据不出本地，MIT 开源

GitHub：https://github.com/cayincoorts-hue/saisika
下载：https://github.com/cayincoorts-hue/saisika/releases

求供应链/物流/运营方向的朋友试用来给反馈！""",
    },
    "devto": {
        "title": "I Built an Offline Supply Chain Risk Analyzer That Runs on a Laptop",
        "tags": ["python", "react", "opensource", "datascience", "tutorial"],
        "body": """**How I turned SCOR model theory + FastAPI + React into a desktop app supply chain managers can actually use.**

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

- **GitHub:** [github.com/cayincoorts-hue/saisika](https://github.com/cayincoorts-hue/saisika)
- **Download:** [Releases](https://github.com/cayincoorts-hue/saisika/releases)
- **License:** MIT

---

*Feedback from anyone in supply chain, logistics, or operations — I'd love to hear what data formats you work with and what risk patterns you care about.*""",
    },
}

# ============================================================
# Reddit 发帖（使用 PRAW）
# ============================================================

def post_reddit(platform_key: str):
    """使用 PRAW 发 Reddit 帖子"""
    try:
        import praw
    except ImportError:
        print("❌ 需要安装 praw: pip install praw")
        sys.exit(1)

    post = POSTS[platform_key]
    subreddit_name = post["subreddit"]

    reddit = praw.Reddit(
        client_id=env["REDDIT_CLIENT_ID"],
        client_secret=env["REDDIT_CLIENT_SECRET"],
        username=env["REDDIT_USERNAME"],
        password=env["REDDIT_PASSWORD"],
        user_agent="saisca-auto-poster/1.0 (by /u/cayincoorts)",
    )

    # 验证身份
    try:
        me = reddit.user.me()
        print(f"✅ Reddit 登录成功: u/{me.name}")
    except Exception as e:
        print(f"❌ Reddit 登录失败: {e}")
        sys.exit(1)

    subreddit = reddit.subreddit(subreddit_name)

    # 选 flair
    flair_id = None
    if post.get("flair"):
        try:
            for template in subreddit.flair.link_templates:
                if template["text"].lower() == post["flair"].lower():
                    flair_id = template["id"]
                    break
        except Exception:
            pass

    # 发帖
    print(f"📤 正在发帖到 r/{subreddit_name} ...")
    kwargs = {"title": post["title"], "selftext": post["body"]}
    if flair_id:
        kwargs["flair_id"] = flair_id

    submission = subreddit.submit(**kwargs)
    print(f"✅ 发帖成功: https://reddit.com{submission.permalink}")

    # 发首评
    if post.get("first_comment"):
        time.sleep(5)  # 等帖子生效
        comment = submission.reply(post["first_comment"])
        print(f"✅ 首评已发: https://reddit.com{comment.permalink}")

    return {
        "platform": f"r/{subreddit_name}",
        "url": f"https://reddit.com{submission.permalink}",
        "id": submission.id,
    }


# ============================================================
# V2EX 发帖
# ============================================================

def post_v2ex():
    """使用 V2EX API 发帖"""
    token = env.get("V2EX_TOKEN", "")
    if not token:
        print("❌ 缺少 V2EX_TOKEN")
        sys.exit(1)

    post = POSTS["v2ex"]

    print(f"📤 正在发帖到 V2EX (节点: {post['node']}) ...")

    resp = requests.post(
        "https://www.v2ex.com/api/v2/topics",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": post["title"],
            "content": post["body"],
            "node_name": post["node"],
        },
        timeout=30,
    )

    data = resp.json()
    if resp.status_code == 200 and data.get("result"):
        topic = data["result"]
        url = f"https://www.v2ex.com/t/{topic['id']}"
        print(f"✅ V2EX 发帖成功: {url}")
        return {"platform": "V2EX", "url": url, "id": topic["id"]}
    else:
        print(f"❌ V2EX 发帖失败 [{resp.status_code}]: {data}")
        return None


# ============================================================
# Dev.to 发帖
# ============================================================

def post_devto():
    """使用 Dev.to API 发帖"""
    api_key = env.get("DEVTO_API_KEY", "")
    if not api_key:
        print("❌ 缺少 DEVTO_API_KEY")
        sys.exit(1)

    post = POSTS["devto"]

    print("📤 正在发帖到 Dev.to ...")

    resp = requests.post(
        "https://dev.to/api/articles",
        headers={"api-key": api_key, "Content-Type": "application/json"},
        json={
            "article": {
                "title": post["title"],
                "body_markdown": post["body"],
                "published": True,
                "tags": post["tags"],
            }
        },
        timeout=30,
    )

    if resp.status_code in (200, 201):
        data = resp.json()
        url = data.get("url", f"https://dev.to/cayincoorts")
        print(f"✅ Dev.to 发帖成功: {url}")
        return {"platform": "Dev.to", "url": url, "id": data.get("id")}
    else:
        print(f"❌ Dev.to 发帖失败 [{resp.status_code}]: {resp.text[:500]}")
        return None


# ============================================================
# 主入口
# ============================================================

def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/auto_post.py <platform>")
        print("  reddit-opensource  — r/opensource")
        print("  reddit-python      — r/Python")
        print("  v2ex               — V2EX")
        print("  devto              — Dev.to")
        print("  all                — 全部按顺序发（含间隔）")
        sys.exit(1)

    target = sys.argv[1]
    results = []

    if target == "all":
        print("=" * 60)
        print("🚀 Saisca 全平台一键发布")
        print(f"   开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        # 1. r/opensource（走代理）
        print("\n[1/4] r/opensource")
        enable_proxy()
        r = post_reddit("reddit-opensource")
        results.append(r)

        # 2. V2EX（直连）
        print("\n[2/4] V2EX")
        disable_proxy()
        r = post_v2ex()
        results.append(r)

        # 3. 等 30 分钟
        print("\n⏳ 等待 30 分钟后发 r/Python（防 Reddit spam）...")
        for i in range(30, 0, -1):
            print(f"   剩余 {i} 分钟...", end="\r")
            time.sleep(60)

        # 4. r/Python（走代理）
        print("\n[3/4] r/Python")
        enable_proxy()
        r = post_reddit("reddit-python")
        results.append(r)

        # 5. Dev.to（走代理）
        print("\n[4/4] Dev.to")
        enable_proxy()
        r = post_devto()
        results.append(r)

    elif target in PROXY_PLATFORMS:
        enable_proxy()
        if target == "reddit-opensource":
            r = post_reddit("reddit-opensource")
        elif target == "reddit-python":
            r = post_reddit("reddit-python")
        elif target == "devto":
            r = post_devto()
        results.append(r)
    elif target == "v2ex":
        disable_proxy()
        r = post_v2ex()
        results.append(r)
    else:
        print(f"❌ 未知平台: {target}")
        sys.exit(1)

    # 汇总
    print("\n" + "=" * 60)
    print("📊 发帖结果汇总:")
    for r in results:
        if r:
            print(f"   ✅ {r['platform']}: {r['url']}")
    print(f"   完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 保存结果到文件
    log_file = SCRIPT_DIR / "post_results.json"
    existing = []
    if log_file.exists():
        with open(log_file) as f:
            try:
                existing = json.load(f)
            except json.JSONDecodeError:
                pass
    existing.extend([r for r in results if r])
    with open(log_file, "w") as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)
    print(f"\n📝 结果已保存到 {log_file}")


if __name__ == "__main__":
    main()
