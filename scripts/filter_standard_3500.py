#!/usr/bin/env python3
"""Filter the imported dictionary against a GitHub-hosted Gaokao 3500 list."""
from __future__ import annotations

import csv
import io
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORDS_FILE = ROOT / "data" / "words.json"
STANDARD_URL = "https://raw.githubusercontent.com/busiyiworld/maimemo-export/main/exported/translation/%E6%98%9F%E7%81%AB%E6%8A%97%E9%81%97%E5%BF%98%E9%AB%98%E8%80%83%E8%8B%B1%E8%AF%AD3500%E8%AF%8D.csv"
USER_AGENT = "Junior-Study-standard-vocabulary-filter/1.0"


def load_standard_words() -> set[str]:
    request = urllib.request.Request(STANDARD_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        text = response.read().decode("utf-8-sig")
    words: set[str] = set()
    for row in csv.reader(io.StringIO(text, newline="")):
        if row and row[0].strip():
            words.add(row[0].strip().casefold())
    return words


def main() -> None:
    standard_words = load_standard_words()
    imported = json.loads(WORDS_FILE.read_text(encoding="utf-8"))
    filtered = [
        item for item in imported
        if str(item.get("spelling", "")).strip().casefold() in standard_words
    ]
    WORDS_FILE.write_text(
        json.dumps(filtered, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "standardWords": len(standard_words),
        "before": len(imported),
        "after": len(filtered),
        "removed": len(imported) - len(filtered),
        "output": str(WORDS_FILE),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
