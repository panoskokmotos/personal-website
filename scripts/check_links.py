#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html.parser
import pathlib
import socket
import sys
import urllib.error
import urllib.request

# Only these mean the link is actually dead. Social sites routinely answer CI
# bots with 403/429/999 or time out, which says nothing about the link itself.
DEAD_STATUSES = {404, 410}

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


def _fetch_status(url: str, method: str, timeout: float) -> int:
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "link-checker/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as exc:
        return exc.code


def check_external(hrefs: list[str], timeout: float) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    urls = sorted(
        {
            h
            for h in hrefs
            if h.startswith("http://") or h.startswith("https://")
        }
    )

    for url in urls:
        try:
            status = _fetch_status(url, "HEAD", timeout)
            if status >= 400:
                # Some servers reject HEAD; GET is the authoritative answer
                status = _fetch_status(url, "GET", timeout)
        except urllib.error.URLError as exc:
            if isinstance(exc.reason, socket.gaierror):
                errors.append(f"Domain does not resolve: {url}")
            else:
                warnings.append(f"Unreachable: {url} ({exc.reason})")
            continue
        except Exception as exc:
            warnings.append(f"Unreachable: {url} ({exc.__class__.__name__})")
            continue

        if status in DEAD_STATUSES:
            errors.append(f"{status} for {url}")
        elif status >= 400:
            warnings.append(f"{status} for {url} (likely bot-blocked; not failing)")
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Check internal and external links in index.html")
    parser.add_argument("--skip-external", action="store_true", help="Only validate internal anchors")
    parser.add_argument("--timeout", type=float, default=8.0, help="Network timeout in seconds")
    args = parser.parse_args()

    parser_html = LinkParser()
    parser_html.feed(HTML_FILE.read_text(encoding="utf-8"))

    errors = check_internal(parser_html.hrefs, parser_html.ids)
    warnings: list[str] = []
    if not args.skip_external:
        ext_errors, warnings = check_external(parser_html.hrefs, args.timeout)
        errors.extend(ext_errors)

    if warnings:
        print("⚠️  Link warnings (not failing the build):")
        for w in warnings:
            print(f"- {w}")

    if errors:
        print("❌ Link check failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("✅ Link check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
