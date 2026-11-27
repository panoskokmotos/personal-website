#!/usr/bin/env python3
"""build.py — sync shared page chrome from a single source.

The site is plain static HTML served directly by GitHub Pages (no build step to
deploy). To avoid copy-pasting the nav, footer, tool-header, and analytics blocks
into every page, each shared region is delimited in the HTML by comment markers:

    <!-- include:nav -->
      ...markup...
    <!-- /include:nav -->

and the single source of truth for each region lives in partials/<name>.html.

Running `python build.py` rewrites the markup between every marker pair to match
its partial. Editing shared chrome is therefore: edit partials/<name>.html once,
run build.py, commit. The committed pages stay fully-rendered, valid, and
servable as-is — the markers are HTML comments and never affect output.

It also stamps one cache-buster on every local CSS/JS URL: each `?v=...` on a
same-site .css/.js reference is rewritten to ASSET_VERSION from sw.js, so the
HTML, the service worker's precache list and its cache name always agree.
`python build.py --bump` raises ASSET_VERSION first; do that whenever a CSS/JS
file changes, or returning visitors keep the cached copy (sw.js is cache-first).

Idempotent: running it twice makes no further change. Pure stdlib.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTIALS = ROOT / "partials"
SW = ROOT / "sw.js"
SW_VERSION = re.compile(r"(const ASSET_VERSION = ')(\d+)(';)")
# href/src pointing at a same-site .css/.js file (not http(s):// or //host) with a ?v= tag
ASSET_REF = re.compile(r'((?:href|src|__lazyChat)="(?!https?:|//)[^"?]+\.(?:css|js)\?v=)[0-9a-z]+(")')


def asset_version(bump: bool = False) -> str:
    text = SW.read_text()
    current = SW_VERSION.search(text).group(2)
    if not bump:
        return current
    from datetime import date
    new = str(max(int(current) + 1, int(date.today().strftime("%Y%m%d"))))
    SW.write_text(SW_VERSION.sub(lambda m: m.group(1) + new + m.group(3), text))
    print(f"ASSET_VERSION {current} -> {new}")
    return new

MARKER = re.compile(
    r"(?P<open><!-- include:(?P<name>[a-z0-9-]+) -->\n)"
    r"(?P<body>[\s\S]*?)"
    r"(?P<close>\n<!-- /include:(?P=name) -->)"
)


def sync(check_only: bool = False, bump: bool = False) -> int:
    version = asset_version(bump and not check_only)
    partials: dict[str, str] = {}
    changed = 0
    missing: set[str] = set()

    pages = sorted(ROOT.glob("*.html")) + sorted(ROOT.glob("el/**/*.html")) + sorted(ROOT.glob("tachyon/**/*.html"))
    for html in pages:
        text = html.read_text()

        def repl(m: re.Match) -> str:
            name = m.group("name")
            if name not in partials:
                pf = PARTIALS / f"{name}.html"
                if not pf.exists():
                    missing.add(name)
                    return m.group(0)  # leave untouched; reported below
                partials[name] = pf.read_text().rstrip("\n")
            return f"{m.group('open')}{partials[name]}{m.group('close')}"

        new = MARKER.sub(repl, text)
        new = ASSET_REF.sub(lambda m: f"{m.group(1)}{version}{m.group(2)}", new)
        if new != text:
            changed += 1
            if not check_only:
                html.write_text(new)
            print(f"{'would update' if check_only else 'updated'}: {html.name}")

    if missing:
        print(f"ERROR: missing partial(s): {', '.join(sorted(missing))}", file=sys.stderr)
        return 2
    if not changed:
        print("all pages already in sync.")
    return 1 if (check_only and changed) else 0


if __name__ == "__main__":
    # `python build.py --check` fails (exit 1) if anything is out of sync, for CI.
    args = sys.argv[1:]
    sys.exit(sync(check_only="--check" in args, bump="--bump" in args))
