#!/usr/bin/env python3
"""Switch the public display name between the neutral codename and the original names.

Usage:
  python3 tools/brand.py --neutral [--map FILE]   original names -> neutral text
  python3 tools/brand.py --restore [--map FILE]   neutral text -> original names (planned for v1.0)
  python3 tools/brand.py --check   [--map FILE]   exit 1 unless neutral -> restore -> neutral is byte-identical (works on copies)

The mapping file is NOT in this repo: it lives in the owner's private vault repo (brand/brand-data.json,
key "mapping"). Copy it to brand/brand-data.json here (git-ignored) before running.
Mapping: {"mapping": [{"brand": "...", "neutral": "...", "files": ["glob", ...], "exclude": ["glob", ...]}, ...]}.
Rules: whole strings only, case-sensitive; identifiers, storage keys, test ids, card data and URLs are never
listed. --neutral refuses a file that already contains a neutral string, so --restore cannot touch text that
was not produced by --neutral.
"""
import argparse, fnmatch, json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent


def load(map_path):
    p = pathlib.Path(map_path)
    if not p.is_absolute():
        p = ROOT / p
    if not p.exists():
        sys.exit(f"[brand] mapping not found: {p} (copy brand/brand-data.json from the private vault repo)")
    pairs = json.loads(p.read_text(encoding="utf-8"))["mapping"]
    for m in pairs:
        if not m["brand"] or not m["neutral"] or m["brand"] == m["neutral"]:
            sys.exit(f"[brand] bad pair: {m}")
    return pairs


def tracked(root):
    out = subprocess.run(["git", "ls-files", "-co", "--exclude-standard"], cwd=root, capture_output=True, text=True, check=True).stdout
    return [f for f in out.split("\n") if f]


def plan(root, pairs):
    """file -> list of pairs that apply to it, longest strings first."""
    files = tracked(root)
    per = {}
    for m in pairs:
        for f in files:
            if any(fnmatch.fnmatchcase(f, g) for g in m["files"]) and not any(fnmatch.fnmatchcase(f, g) for g in m.get("exclude", [])):
                per.setdefault(f, []).append(m)
    return per


def apply(root, pairs, direction):
    src, dst = ("brand", "neutral") if direction == "neutral" else ("neutral", "brand")
    changed = 0
    per = sorted(plan(root, pairs).items())
    if direction == "neutral":  # check every file before writing any, so a refusal leaves the tree untouched
        for f, ms in per:
            s = (root / f).read_text(encoding="utf-8")
            clash = [m["neutral"] for m in ms if m["neutral"] in s]
            if clash:
                sys.exit(f"[brand] {f} already contains neutral text {clash!r}: refuse (restore would change it); nothing was written")
    for f, ms in per:
        p = root / f
        s = p.read_text(encoding="utf-8")
        o = s
        for m in sorted(ms, key=lambda m: -len(m[src])):
            s = s.replace(m[src], m[dst])
        if s != o:
            p.write_bytes(s.encode("utf-8"))
            changed += 1
    print(f"[brand] {direction}: {changed} files changed")


def check(pairs):
    """Round trip on two temporary copies: current -> restore -> neutral must equal current, and the
    restored copy -> neutral -> restore must equal the restored copy."""
    with tempfile.TemporaryDirectory() as tmp:
        a = pathlib.Path(tmp) / "a"
        shutil.copytree(ROOT, a, ignore=shutil.ignore_patterns("node_modules", "build"), symlinks=True)
        files = sorted(plan(a, pairs))
        start = {f: (a / f).read_bytes() for f in files}
        apply(a, pairs, "restore")
        restored = {f: (a / f).read_bytes() for f in files}
        apply(a, pairs, "neutral")
        bad = [f for f in files if (a / f).read_bytes() != start[f]]
        apply(a, pairs, "restore")
        bad += [f for f in files if (a / f).read_bytes() != restored[f]]
    if bad:
        sys.exit(f"[brand] round trip NOT byte-identical: {sorted(set(bad))}")
    print(f"[brand] round trip byte-identical ({len(files)} files)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--neutral", action="store_true")
    g.add_argument("--restore", action="store_true")
    g.add_argument("--check", action="store_true")
    ap.add_argument("--map", default="brand/brand-data.json")
    a = ap.parse_args()
    pairs = load(a.map)
    if a.check:
        check(pairs)
    else:
        apply(ROOT, pairs, "neutral" if a.neutral else "restore")
