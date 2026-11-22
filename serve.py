#!/usr/bin/env python3
"""Serve the site locally for development.

Usage: python serve.py [port]   (default port 4173, matching the README)
Serves the directory this file lives in — no machine-specific paths.
"""
import http.server
import sys
from functools import partial
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
DIRECTORY = str(Path(__file__).resolve().parent)

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    """Serve /about as about.html, like GitHub Pages does in production."""
    def translate_path(self, path):
        p = super().translate_path(path)
        if not Path(p).exists() and Path(p + ".html").exists():
            return p + ".html"
        return p

Handler = partial(CleanURLHandler, directory=DIRECTORY)

if __name__ == "__main__":
    print(f"Serving {DIRECTORY} at http://127.0.0.1:{PORT}  (Ctrl+C to stop)")
    http.server.test(HandlerClass=Handler, port=PORT, bind="127.0.0.1")
