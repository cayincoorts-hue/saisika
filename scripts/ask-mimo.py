#!/usr/bin/env python3
"""
Ask Mimo v2.5 for debugging help when stuck on a problem.

Usage:
    python3 scripts/ask-mimo.py "Why does git push timeout with proxy configured?"
    python3 scripts/ask-mimo.py --file error.log "What does this error mean?"
"""

import json, sys, urllib.request

MIMO_KEY = "sk-coc7pb6tda52m6rgf42iu9qvbomdrhh92utis9o6h9hrlzzm"

def ask(question: str) -> str:
    data = json.dumps({
        "model": "mimo-v2-flash",
        "max_tokens": 1000,
        "messages": [
            {"role": "system", "content": "You are a senior software engineer helping debug a FastAPI + React + TypeScript supply chain analysis tool called Saisca. The project uses Python 3.9+, pandas, ECharts, Vite. Be specific and actionable."},
            {"role": "user", "content": question}
        ]
    }).encode()

    req = urllib.request.Request(
        "https://api.xiaomimimo.com/v1/chat/completions",
        data=data,
        headers={"Authorization": f"Bearer {MIMO_KEY}", "Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["choices"][0]["message"]["content"]


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ask Mimo for debugging help")
    parser.add_argument("question", nargs="?", help="Question to ask")
    parser.add_argument("--file", help="Read question from file")
    args = parser.parse_args()

    if args.file:
        with open(args.file) as f:
            question = f.read()
    elif args.question:
        question = args.question
    else:
        question = sys.stdin.read()

    print(ask(question))
