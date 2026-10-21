---
name: web-design-guidelines
description: Review Aeterna UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", at the end of every UI overhaul (U) session, or before a UI change is released.
metadata:
  author: vercel (adapted for Aeterna)
  version: "1.0.0-aeterna"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines (Aeterna copy)

Adapted from vercel-labs/agent-skills `skills/web-design-guidelines` (MIT per that repo's README). The rules file `rules.md` in this folder is a snapshot of vercel-labs/web-interface-guidelines `command.md` at 434b7f9 (2026-10-05), MIT, see `LICENSE` here. Changes: the rules are read from the local snapshot (stable, works without network), and the default file set is Aeterna's UI.

## How it works
1. Read `rules.md` in this folder (all rules and the output format). Refresh the snapshot only on purpose, in its own commit: `curl -sS https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md -o .claude/skills/web-design-guidelines/rules.md`, and note the new commit/date above.
2. Files: the ones given; otherwise the screen changed in this session, out of `apps/web/styles.css`, `apps/web/index.template.html` and `apps/web/src/*.js`. Find the relevant part with `docs/ai/code-map.md` + `grep -n`; never read `index.html` or `build/`.
3. Check against every rule; output findings in the terse `file:line` format the rules ask for.
4. Aeterna filter before fixing: drop rules about frameworks we do not use (React props such as `onKeyDown`, `htmlFor`, `<Link>`, Tailwind classes: apply their intent in vanilla HTML/CSS/JS), forms with server requests, and anything `docs/DESIGN.md` decides otherwise. Fix the rest in the same session when it is part of the screen being changed; list the others in `docs/ai/roadmap-open.md` under item U.
