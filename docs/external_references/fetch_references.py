#!/usr/bin/env python3
"""
Fetch raw HTML from Connect Four reference URLs and save to this directory.
Run from anywhere; files are written next to this script.

Usage:
    python3 docs/external_references/fetch_references.py
"""

import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone

SCRIPT_DIR = Path(__file__).parent

URLS = [
    ("tromp_c4_resources.html",       "https://tromp.github.io/c4/c4.html"),
    ("tromp_allen_expert_play.html",  "https://tromp.github.io/c4.html"),
    ("wikipedia_connect_four.html",   "https://en.wikipedia.org/wiki/Connect_Four"),
    ("wikibooks_connect_four.html",   "https://en.wikibooks.org/wiki/Connect_Four"),
    ("weakc4_explanation.html",       "https://2swap.github.io/WeakC4/explanation/"),
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; research-fetch/1.0; "
        "+https://github.com/elsonidoq/cuatro_en_linea)"
    )
}

def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()

def main():
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    results = []

    for filename, url in URLS:
        out_path = SCRIPT_DIR / filename
        print(f"Fetching {url} ...", end=" ", flush=True)
        try:
            content = fetch(url)
            # Prepend a comment with fetch metadata (HTML comment won't break parsing)
            header = (
                f"<!-- fetch_references.py | url: {url} | fetched: {fetched_at} -->\n"
            ).encode()
            out_path.write_bytes(header + content)
            print(f"OK ({len(content):,} bytes) → {out_path.name}")
            results.append((filename, url, "OK", len(content)))
        except urllib.error.HTTPError as e:
            print(f"HTTP {e.code} {e.reason}")
            results.append((filename, url, f"HTTP {e.code}", 0))
        except Exception as e:
            print(f"ERROR: {e}")
            results.append((filename, url, f"ERROR: {e}", 0))

    print("\nSummary:")
    for filename, url, status, size in results:
        flag = "✓" if status == "OK" else "✗"
        print(f"  {flag} {filename:45s}  {status}  ({size:,} bytes)")

if __name__ == "__main__":
    main()
