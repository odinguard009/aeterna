#!/usr/bin/env node
// Mind map cadence (owner, 2026-10-20): docs/roadmap-data.json (statuses, next) is updated and docs/roadmap.html is
// sent to the owner every 3rd release, or in any session that changed the plan (roadmap-open.md items added/removed).
// Works in the shallow light clone: counts CHANGELOG.md release headings newer than root.updatedAt in roadmap-data.json.
// Prints one line: "MINDMAP due (...)" or "MINDMAP not due (...)". Exit code is always 0.
// Usage: node tools/mindmap_due.mjs   (run at End step 0, after the task commits, before tools/release_docs.sh)
// When due (or the plan changed): edit roadmap-data.json, set root.updatedAt to the current version, then release_docs.sh.
import { readFileSync } from 'node:fs';

const EVERY = 3;
const ver = JSON.parse(readFileSync('package.json', 'utf8')).version;
const at = JSON.parse(readFileSync('docs/roadmap-data.json', 'utf8')).root.updatedAt;
const heads = [...(readFileSync('CHANGELOG.md', 'utf8') + readFileSync('CHANGELOG-archive.md', 'utf8')).matchAll(/^## v(\d+\.\d+\.\d+)\s*$/gm)].map(m => m[1]);
const i = at ? heads.indexOf(at) : -1;
if (at === ver) console.log(`MINDMAP updated this release (updatedAt ${at}): send docs/roadmap.html`);
else if (i < 0) console.log(`MINDMAP due (updatedAt ${at || 'missing'} not found in CHANGELOG.md): update roadmap-data.json, set root.updatedAt = ${ver}, send docs/roadmap.html`);
else if (i >= EVERY) console.log(`MINDMAP due (${i} releases since ${at}): update roadmap-data.json, set root.updatedAt = ${ver}, send docs/roadmap.html`);
else console.log(`MINDMAP not due (${i} of ${EVERY} releases since ${at}): send only the game file; final message names "Mind map: v${at}" (update anyway if the plan changed this session)`);
