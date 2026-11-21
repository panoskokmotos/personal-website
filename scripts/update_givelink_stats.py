#!/usr/bin/env python3
"""Write assets/givelink-stats.json: live Givelink nonprofit counts for the island lanterns.

Reads the public feed (https://be.givelink.app/data, ~5 MB) and keeps only counts,
so the homepage loads a few bytes instead of the whole feed. No names or donor data.

Usage: python3 scripts/update_givelink_stats.py
"""
import datetime, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
req = urllib.request.Request("https://be.givelink.app/data", headers={"Accept-Language": "en", "User-Agent": "panoskokmotos.com stats"})
with urllib.request.urlopen(req, timeout=60) as r:
    data = json.load(r)

live = [c for c in data.get("charities", []) if c.get("live")]
stats = {
    "liveNonprofits": len(live),
    "us": sum(1 for c in live if c.get("region") == "US"),
    "gr": sum(1 for c in live if c.get("region") == "GR"),
    # Platform totals (counts only, no money — public-number rule)
    "donations": (data.get("liveStats") or {}).get("totalDonations"),
    "products": (data.get("liveStats") or {}).get("totalProducts"),
    "people": (data.get("liveStats") or {}).get("peopleImpacted"),
    "updated": datetime.date.today().isoformat(),
}
out = ROOT / "assets" / "givelink-stats.json"
out.write_text(json.dumps(stats) + "\n")
print(out, stats)
