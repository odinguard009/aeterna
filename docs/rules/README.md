# Rules knowledge base (Q3)

`kb.json` lists official rule sections as **chunks** with stable ids, page numbers and SHA-256 fingerprints, so a citation
in the engine or in a test points at one section, and a new manual version shows which sections changed.
Tool: `tools/rules_kb.py`. Test: `tests/unit/rules_kb.test.mjs` (offline).

**Copyright:** the repo keeps ids, pages, headings, a one-sentence paraphrase in our own words and the fingerprint. It never keeps
manual text. The source text lives only in a local cache outside the repo (`~/.cache/aeterna-rules`, or `$AETERNA_RULES_CACHE`).

## Manuals
| Key | Manual | Version | Pages |
|---|---|---|---|
| `ETR` | Eternal Rule Manual, English PDF | VER.17.0 (server date 2026-03-27) | 79 |
| `STD` | Standard Comprehensive Rules, English PDF | Ver.1.0 (2026-04-01) | 24 |
| `SJP` | Standard Rule Manual, Japanese web pages | Ver.1.1 (2026-10-02) | pages 02-12 (`page` = the web page number) |

URLs and PDF hashes are in `kb.json` under `manuals`. `SJP` is a web manual (`format: "html"`, `html_pages` maps a page number to
its file): `--fetch` saves the pages into `<cache>/SJP/html/` and extracts the visible text with the ruby readings (furigana)
dropped and one line per block element; when the site refuses the shell, save the pages another way and run
`--import-html SJP`. A page that lists its own headings first uses `anchor_n` (the n-th line that starts with the anchor).
Comparison with EN 1.0 and the engine: `standard-jp-1.1.md`. The Japanese Eternal manual is Ver.17.1 (2026-05-29) and is web pages, not a
PDF; it is not chunked yet (sources table: `docs/manual-notes.md`).

## Schema (`schema: 1`)
- `manuals.<KEY>`: `title`, `version`, `url`, `pages`, `pdf_sha256` (of the PDF the fingerprints were built from), `read` (date).
- `chunks[]`, one per section:
  - `id`: `ETR:<topic>[.<sub>]` (e.g. `ETR:brave.summon`, `ETR:faq.effects-q5`) or `STD:<rule number>` (e.g. `STD:12-2-1-1`).
    Ids are **stable**: never renamed when a page moves; a removed section keeps its id with a note in the commit.
  - `manual`, `page`, optional `page_end` (pages as printed in the PDF footer = PDF page numbers for both manuals).
  - `title`: our short name for the section. `paraphrase`: one sentence, our own words.
  - Where the section is in the text: `anchor` (the heading line that starts it; omitted = top of `page`) and `until` (the
    heading that ends it; omitted = end of the last page). `STD` chunks use `cr`: the rule and all its sub-rules.
  - `sha256`: SHA-256 of the section text after `norm()` (Unicode NFKC, footers and bare page numbers dropped, all whitespace
    collapsed to one space), so a re-extraction with other line breaks keeps the fingerprint.
- `aliases[]`: `key` (a citation key) -> `to` (chunk ids) + `note`. Used when a citation's page or number moved (e.g. the
  engine cites FAQ Q3 for the immunity order, VER.17.0 numbers it Q4) and for citations by section name.
- `named[]`: `match` (literal text of an engine comment) -> `key`; for citations without a page or rule number.
- `known_gaps[]`: `key` + `reason`; a citation with no official section (house readings, rules the manual does not cover).

### Citation keys (what `--list-cited` reads from `packages/engine/src`)
`ETR p.34` (page; `pp. 34-36` and `pp. 22, 26` give one key per page; `Standard` before it on the line makes it `STD`),
`ETR p.70 Q1`, `STD 12-2-1-1` (`CR 12-2-1-1`, `Comprehensive Rules 4-8-1/4-8-2`), `ETR FAQ-effects Q5` (`FAQ Q5`), and the
`named` keys. A page key resolves to every chunk whose page range covers it; a rule number to its rule or a parent rule.

### Test citations (Q3 part 2)
Tests cite a chunk as `<id>@<pin>`, where the pin is the first 8 hex digits of the chunk's `sha256` (`--query` prints the
line to copy): a `// rules: ETR:seal@f7999858` comment above the test (or under a file's header comment) in `tests/unit`,
and a `"rules": [...]` array right after `about` in a `tests/scenarios` board. `--list-tests` scans `tests/` (not
`fixtures/` or `fuzz-cases/`) and reports `UNKNOWN` (no such chunk) and `STALE` (the section changed since the test was
written). After a manual refresh and `--build`, `K08` in `tests/unit/rules_kb.test.mjs` fails on every stale pin: re-read
the changed section, fix the test if the rule changed, then `--pin-tests` re-pins them. Cite a chunk only when the test
checks that rule; a Standard rule with no chunk yet (`known_gaps`) is cited in prose until it is chunked.

## Commands
```
python3 tools/rules_kb.py --query seal            # by id or text (id, title, paraphrase, rule number)
python3 tools/rules_kb.py --list-cited [--json]   # engine citations -> chunks; exit 1 when one is unresolved and not a known gap
python3 tools/rules_kb.py --fetch                 # download both PDFs into the cache, one text file per page (needs pdftotext)
python3 tools/rules_kb.py --check [--strict]      # recompute fingerprints; exit 1 on CHANGED/MISSING; no cache: note, exit 0 (2 with --strict)
python3 tools/rules_kb.py --build                 # write recomputed fingerprints into kb.json
python3 tools/rules_kb.py --list-tests [--json]   # test citations (id@pin): exit 1 on UNKNOWN or STALE
python3 tools/rules_kb.py --pin-tests             # re-pin STALE test citations (after re-checking those tests)
```

## Refresh (a new manual version)
1. Check the sources table in `docs/manual-notes.md`; update `manuals.<KEY>` (`url`, `version`, `pages`).
2. `--fetch`, then `--check`. `--fetch` says whether the PDF hash differs from `pdf_sha256`.
3. For each `CHANGED` chunk: read the section in the cache, update `page`/`page_end`/`anchor`/`until` and the paraphrase if the
   rule changed, and note the engine areas it touches. For `MISSING`: the heading moved or was renamed; fix `anchor`/`until`.
4. `--build`, set `pdf_sha256` and `read`, run `--list-cited`, `--list-tests` (re-check each STALE test, then `--pin-tests`)
   and `node --test tests/unit/rules_kb.test.mjs`.
5. A new engine citation that `--list-cited` reports as missing: add a chunk, an alias or (no official text) a known gap.

The extractor is `pdftotext` (poppler 24.02, `-enc UTF-8`, one page per call); another extractor may give other text and so other
fingerprints. When `--check` flags every chunk at once with an unchanged `pdf_sha256`, suspect the extractor, not the manual.
