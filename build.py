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

Idempotent: running it twice makes no further change. Pure stdlib.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTIALS = ROOT / "partials"

MARKER = re.compile(
    r"(?P<open><!-- include:(?P<name>[a-z0-9-]+) -->\n)"
    r"(?P<body>[\s\S]*?)"
    r"(?P<close>\n<!-- /include:(?P=name) -->)"
)


def sync(check_only: bool = False) -> int:
    partials: dict[str, str] = {}
    changed = 0
    missing: set[str] = set()

    for html in sorted(ROOT.glob("*.html")):
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
    sys.exit(sync(check_only="--check" in sys.argv[1:]))
