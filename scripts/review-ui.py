#!/usr/bin/env python3
"""
Multimodal UI review — send screenshots to Mimo v2.5 for design critique.

Usage:
    python3 scripts/review-ui.py assets/screenshots/results.png
    python3 scripts/review-ui.py assets/screenshots/upload.png --prompt "Check for spacing issues"

Output: prints AI review to stdout, saves to assets/screenshots/<name>-review.md
"""

import base64, json, sys, urllib.request
from pathlib import Path
from datetime import datetime

MIMO_KEY = "sk-coc7pb6tda52m6rgf42iu9qvbomdrhh92utis9o6h9hrlzzm"

DEFAULT_PROMPT = """You are a senior UI/UX designer reviewing a web app screenshot.
Rate the design 1-10 and provide specific, actionable feedback:
1. Overall cleanliness and professionalism
2. Spacing and layout issues
3. Color harmony and contrast
4. Typography and readability
5. Top 3 concrete improvements (be specific)

Reply in Chinese. Be critical and specific — don't just say "looks good"."""

def review_screenshot(image_path: str, prompt: str = None) -> str:
    path = Path(image_path)
    if not path.exists():
        print(f"Error: {path} not found", file=sys.stderr)
        sys.exit(1)

    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    data = json.dumps({
        "model": "mimo-v2.5",
        "max_tokens": 800,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt or DEFAULT_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
            ]
        }]
    }).encode()

    req = urllib.request.Request(
        "https://api.xiaomimimo.com/v1/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {MIMO_KEY}",
            "Content-Type": "application/json"
        }
    )
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    content = result["choices"][0]["message"]["content"]

    # Save review
    review_path = path.parent / f"{path.stem}-review.md"
    with open(review_path, "w") as f:
        f.write(f"# UI Review: {path.name}\n")
        f.write(f"Date: {datetime.now().isoformat()}\n\n")
        f.write(content)

    return content


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Multimodal UI review")
    parser.add_argument("image", help="Path to screenshot PNG")
    parser.add_argument("--prompt", help="Custom review prompt")
    args = parser.parse_args()
    print(review_screenshot(args.image, args.prompt))
