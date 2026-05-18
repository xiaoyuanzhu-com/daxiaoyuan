#!/usr/bin/env python3
"""
Fetch school logos from zh.wikipedia.org and save next to each school's JSON.

Usage:
  scripts/fetch_logos.py                  # process all schools missing <id>.svg
  scripts/fetch_logos.py pku tsinghua     # process specific ids
  scripts/fetch_logos.py --force pku      # re-fetch even if <id>.svg exists

Logic per school:
  1. read data/schools/cn/<id>.json -> name (Chinese)
  2. fetch wikitext section 0 from zh.wikipedia.org parse API
  3. regex-extract first [[File:...]] referenced by a logo-ish field
     (SealImage/校徽/校標/校标/徽章/logo/emblem/crest)
  4. fallback: prop=images filtered for Logo|Emblem|Crest|校徽
  5. download via Special:FilePath/<filename> (302 to real hash-path)
  6. reject if the SVG embeds raster (<image> tag) — those are scans
  7. save to data/schools/cn/<id>.svg

Prints a final summary; nothing else writes outside data/schools/cn/.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data" / "schools" / "cn"

UA = "dadaxiaoyuan-logo-fetcher/1.0 (https://github.com/iloahz/dadaxiaoyuan)"
WIKI_API = "https://zh.wikipedia.org/w/api.php"
FILEPATH = "https://zh.wikipedia.org/wiki/Special:FilePath/"

LOGO_FIELD_RE = re.compile(
    r"\|\s*(?:SealImage|校徽|校標|校标|徽章|logo|emblem|crest|图像|圖像)\s*=\s*"
    r"(?:\[\[File:)?\s*([^|\]\n}]+?\.(?:svg|png|jpe?g|gif))",
    re.IGNORECASE,
)
# `image` is ambiguous (could be campus photo) — only trust it for .svg files
LOGO_IMAGE_FIELD_RE = re.compile(
    r"\|\s*image\s*=\s*(?:\[\[File:)?\s*([^|\]\n}]+?\.svg)",
    re.IGNORECASE,
)


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def wiki_get_json(params: dict) -> dict:
    qs = urllib.parse.urlencode(params)
    return json.loads(http_get(f"{WIKI_API}?{qs}").decode("utf-8"))


def find_logo_filename(school_name: str) -> tuple[str | None, str]:
    """Returns (filename, source) — source is 'infobox' or '' (not found)."""
    try:
        data = wiki_get_json({
            "action": "parse",
            "page": school_name,
            "prop": "wikitext",
            "section": "0",
            "format": "json",
            "redirects": "1",
        })
    except Exception:
        return None, ""
    wt = data.get("parse", {}).get("wikitext", {}).get("*")
    if not wt:
        return None, ""
    for regex, label in ((LOGO_FIELD_RE, "infobox"), (LOGO_IMAGE_FIELD_RE, "infobox-image")):
        m = regex.search(wt)
        if not m:
            continue
        name = m.group(1).strip().replace(" ", "_")
        if name.lower().startswith("file:"):
            name = name[5:]
        return name, label
    return None, ""


def download_svg(filename: str) -> tuple[bytes | None, str]:
    """Returns (body, status) — status is 'ok' | 'network-fail' | 'not-svg'."""
    url = FILEPATH + urllib.parse.quote(filename)
    try:
        body = http_get(url)
    except Exception:
        return None, "network-fail"
    head = body[:200].lstrip().lower()
    if not (head.startswith(b"<?xml") or head.startswith(b"<svg")):
        return None, "not-svg"
    return body, "ok"


def is_raster_svg(body: bytes) -> bool:
    # raster-embedded SVGs use <image ...> tags; pure vectors don't
    return re.search(rb"<image\b", body) is not None


def process(school_id: str, force: bool) -> str:
    """Returns one of: ok, exists, no-wiki, no-logo, raster, download-fail."""
    json_path = DATA_DIR / f"{school_id}.json"
    svg_path = DATA_DIR / f"{school_id}.svg"
    if not json_path.exists():
        return "no-json"
    if svg_path.exists() and not force:
        return "exists"
    name = json.loads(json_path.read_text())["name"]
    filename, source = find_logo_filename(name)
    if not filename:
        return "no-logo"
    body, dl_status = download_svg(filename)
    if body is None:
        return f"{dl_status}({filename})"
    if is_raster_svg(body):
        return f"raster-embedded({filename})"
    svg_path.write_bytes(body)
    return f"ok({source}:{filename})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    if args.ids:
        ids = args.ids
    else:
        ids = sorted(
            p.stem for p in DATA_DIR.glob("*.json")
            if not (DATA_DIR / f"{p.stem}.svg").exists()
        )

    totals: dict[str, int] = {}
    unresolved: dict[str, list[str]] = {}
    for i, sid in enumerate(ids, 1):
        result = process(sid, args.force)
        bucket = result.split("(")[0]
        totals[bucket] = totals.get(bucket, 0) + 1
        if bucket != "ok" and bucket != "exists":
            unresolved.setdefault(bucket, []).append(sid)
        print(f"[{i:3d}/{len(ids)}] {sid:20s} {result}", flush=True)
        time.sleep(0.2)  # be polite to Wikipedia API

    print("\nsummary:")
    for k in sorted(totals):
        print(f"  {k:20s} {totals[k]}")
    for bucket, sids in unresolved.items():
        print(f"\n{bucket} ({len(sids)}):")
        print("  " + " ".join(sids))


if __name__ == "__main__":
    main()
