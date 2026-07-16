#!/usr/bin/env python3
"""Shared PostHog initialisation helpers for CLI scripts."""

import atexit
import json
import os
import uuid
from pathlib import Path


def _load_dotenv() -> None:
    """Load .env if python-dotenv is available; no-op otherwise."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv()


_ID_FILE = Path.home() / ".posthog_panoskokmotos_dev_id"


def get_developer_id() -> str:
    """Return a stable UUID for this developer machine, creating one if needed."""
    if _ID_FILE.exists():
        try:
            data = json.loads(_ID_FILE.read_text())
            if "developer_id" in data:
                return data["developer_id"]
        except Exception:
            pass
    dev_id = f"dev_{uuid.uuid4().hex[:12]}"
    _ID_FILE.write_text(json.dumps({"developer_id": dev_id}))
    return dev_id


def initialize_posthog() -> "Posthog | None":
    """Create and return a PostHog instance, or None if unavailable.

    Returns None (and emits no events) when the optional ``posthog`` /
    ``python-dotenv`` dependencies are not installed, or when no project
    token is configured. This keeps the instrumented scripts runnable in
    environments that have not installed the analytics dependencies (e.g. CI).
    """
    _load_dotenv()
    try:
        from posthog import Posthog
    except ImportError:
        return None
    token = os.getenv("POSTHOG_PROJECT_TOKEN")
    if not token:
        return None
    client = Posthog(
        token,
        host=os.getenv("POSTHOG_HOST", "https://us.i.posthog.com"),
        debug=os.getenv("POSTHOG_DEBUG", "False").lower() == "true",
        enable_exception_autocapture=True,
    )
    atexit.register(client.shutdown)
    return client
