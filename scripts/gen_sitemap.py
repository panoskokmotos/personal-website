#!/usr/bin/env python3
"""Refresh sitemap.xml <lastmod> dates from each page's real last git-commit date,
so they never go stale by hand. Preserves the URL list, changefreq, and priority.

Usage: python scripts/gen_sitemap.py   (run after content changes; or wire into CI)
"""
import datetime
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SITEMAP = REPO / "sitemap.xml"
BASE = "https://panoskokmotos.com/"
TODAY = datetime.date.today().isoformat()


def git_last_modified(fname: str) -> str:
    """Last commit date (YYYY-MM-DD) that touched the file; TODAY if unknown."""
    r = subprocess.run(["git", "log", "-1", "--format=%cs", "--", fname],
                       cwd=REPO, capture_output=True, text=True)
    return r.stdout.strip() or TODAY


def loc_to_file(loc: str) -> str:
    path = loc.replace(BASE, "").strip()
    return "index.html" if path in ("", "/") else path


def main():
    text = SITEMAP.read_text()
    changed = 0

    def repl(m: re.Match) -> str:
        nonlocal changed
        block = m.group(0)
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        if not loc:
            return block
        fname = loc_to_file(loc.group(1))
        date = git_last_modified(fname) if (REPO / fname).exists() else TODAY
        new = re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{date}</lastmod>", block)
        if new != block:
            changed += 1
        return new

    text = re.sub(r"<url>[\s\S]*?</url>", repl, text)
    SITEMAP.write_text(text)
    print(f"sitemap.xml: refreshed lastmod on {changed} URL(s) from git history")


if __name__ == "__main__":
    main()
