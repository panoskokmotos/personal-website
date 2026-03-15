#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html.parser
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML_FILE = ROOT / "index.html"


class LinkParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs):
        attr = dict(attrs)
        if "id" in attr:
            self.ids.add(attr["id"])
        if tag == "a" and "href" in attr:
            self.hrefs.append(attr["href"])


def check_internal(hrefs: list[str], ids: set[str]) -> list[str]:
    errors: list[str] = []
    for href in hrefs:
        if not href.startswith("#"):
            continue
        target = href[1:]
        if target and target not in ids:
            errors.append(f"Missing internal anchor target: {href}")
    return errors


def check_external(hrefs: list[str], timeout: float) -> list[str]:
    errors: list[str] = []
    urls = sorted(
        {
            h
            for h in hrefs
            if h.startswith("http://") or h.startswith("https://")
        }
    )

    for url in urls:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "link-checker/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status >= 400:
                    errors.append(f"{resp.status} for {url}")
            continue
        except Exception:
            pass

        # Fallback to GET for servers that reject HEAD
        req = urllib.request.Request(url, method="GET", headers={"User-Agent": "link-checker/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status >= 400:
                    errors.append(f"{resp.status} for {url}")
        except Exception as exc:
            errors.append(f"Unreachable: {url} ({exc.__class__.__name__})")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Check internal and external links in index.html")
    parser.add_argument("--skip-external", action="store_true", help="Only validate internal anchors")
    parser.add_argument("--timeout", type=float, default=8.0, help="Network timeout in seconds")
    args = parser.parse_args()

    parser_html = LinkParser()
    parser_html.feed(HTML_FILE.read_text(encoding="utf-8"))

    errors = check_internal(parser_html.hrefs, parser_html.ids)
    if not args.skip_external:
        errors.extend(check_external(parser_html.hrefs, args.timeout))

    if errors:
        print("❌ Link check failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("✅ Link check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
