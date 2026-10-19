# Auto mode ("idle chain") and the scheduled prompt (single source)

**Owner, 2026-10-16 (no idle wait since 2026-10-20, was 20 minutes):** when no session is running (no waiting time after the last session), Claude continues the roadmap by itself, in auto mode, with the model the task needs. The owner switches this on and off. All rules live here, in `tools/session_gate.sh` and in skill `bs-session-runner`; the scheduled prompt only points to them.

## How it works
- TWO recurring scheduled tasks with the same prompt except the model word: "Lanjutkan roadmap otomatis - Opus" (model Opus) and "Lanjutkan roadmap otomatis - Sonnet" (model Sonnet) (see "Installed tasks" below). Each session ends with `done vX.Y.Z next=Opus|Sonnet` (the model the next roadmap item needs, as in its final hint); the gate lets only the task with that model start (no tag = Opus). This is how the model follows the weight of the work: a task has a fixed model, a run cannot change it. Every run first calls the gate `check` before any clone; a STOP run ends at once, so idle runs cost almost nothing.
- State lives in comments on issue #1 ("Auto mode switch + session lock"; the owner may pin it on GitHub, sessions cannot); the first word of a comment is its meaning: `ON` / `OFF` (switch), `LOCK` (auto session started), `MANUAL` (manual session started), `DONE vX.Y.Z` (any session finished), `UNLOCK` (early stop). Any other comment counts as owner activity.
- The gate says GO only when all hold: switch ON; no `docs/ai/chain-stop.md`; no active session (`LOCK` < 5 h or `MANUAL` < 3 h without `DONE`/`UNLOCK`); no minimum idle time (`IDLE_MIN=0`: a new session may start right after the last one ended); no daily cap on auto sessions (`MAX_AUTO_24H=0` = unlimited); fewer than 3 auto sessions since the last `v*` release or `ON` (otherwise the gate writes `OFF auto: <reason>` itself and the owner gets the result).
- "Owner response" = a manual "Lanjutkan roadmap" session (it writes `MANUAL`) or any comment by the owner on issue #1. Scheduled runs cannot see the owner's chats, so a chat message alone does not count.
- No idle wait (owner, 2026-10-20): three hourly Opus tasks at :00, :20 and :40 (the platform rejects schedules under 1 hour, so three offset tasks give a run every 20 minutes); a run starts only when the gate finds no active session.

## Owner switch (any of these)
- In a claude.ai chat of this project: `otomatis on`, `otomatis off`, `otomatis status`. Claude calls `add_repo` (push), then runs, without cloning: `gh api repos/odinguard009/aeterna/contents/tools/session_gate.sh --jq .content | base64 -d | bash -s on|off|status`, and answers with the one-line result.
- Mode hemat (owner, 2026-10-19; default ON; CLAUDE.md "Mode hemat"): `hemat on`, `hemat off`, `hemat status` work the same way with `bash -s hemat on|off|status`. Scheduled runs read it after the clone like any session (`bash tools/session_gate.sh hemat`); with HEMAT ON they run without the team agents.
- On GitHub (also the mobile app): comment `ON` or `OFF` on issue #1.
- GitHub Actions: workflow "Auto mode" -> Run workflow -> on/off.
- Hard stop (fallback, no runs at all): disable the scheduled task in the Claude app.
- Default without any switch comment: OFF.

## Rules for sessions
- Manual sessions: after `session_start.sh`, `bash tools/session_gate.sh manual` (exit 3 = an auto session is running: stop and tell the owner); at the end `bash tools/session_gate.sh done vX.Y.Z next=Opus|Sonnet` after the files are sent; on an early stop `unlock`.
- Auto (scheduled) sessions: gate `check opus|sonnet` before the clone (from the prompt), `lock` after `session_start.sh`, `switch` between tasks (OFF = finish the current commit, push, then end as usual), `done vX.Y.Z next=Opus|Sonnet` at the end, `unlock` on any early stop or error.
- Sessions never create, change or delete schedules (the app asks the owner to approve schedule changes, and the loop must not wait for the owner). Only the owner installs or removes the task.
- Roadmap empty or every item blocked: commit `docs/ai/chain-stop.md` (reason). Delete it only after the owner has answered.
- Quota / usage / rate-limit error: no retry, no schedule changes; push what is committed, handoff comment, `unlock`, stop. The next run continues.
- Model (owner, 2026-10-17): Opus only. The gate answers `check sonnet` with STOP, and the former Sonnet task now runs Opus at :58 (2026-10-17). Earlier rule, kept for history: the model was chosen by the two tasks above through `next=`. A session that finds the item heavier than its model (for example a Sonnet run whose item turns out to need engine design) does not start it: it takes a small item if one exists, otherwise it ends with `done <current version> next=Opus` without a release. Read-only data lookups go to subagents with `model: "sonnet"` as usual.
- Permission: both tasks should run with automatic approval ("Automatically approve" in the task settings, owner-only switch).
- Session name: "Ver. X.Y.Z" of the final version.

## Parallel lanes (P1, v0.63.1; opt-in)
- Session marks may carry a lane as second word: `LOCK ui`, `MANUAL card`, `UNLOCK ui`, and the lane end mark `LANEDONE <lane> <branch>`. A mark with a lane blocks only that lane; a mark without a lane blocks every lane (the single-lane flow is unchanged). `DONE vX.Y.Z` (the merge + release) and a lane-less `UNLOCK` end all marks. Staleness (5 h / 3 h), the 24-hour cap and the no-progress count work over both lanes.
- Commands: `session_gate.sh manual|lock|unlock|busy <lane>`, `lanedone <lane> lane/<lane>`, `check opus <lane>`; `bash tools/session_start.sh --lane <lane>`. Flow, file ownership and the merge step: `docs/ai/lanes/README.md`.
- The scheduled prompt below has no lane, so auto runs stay single-lane (one at a time) until the owner adds a second scheduled task for a lane; sessions never install one. Manual lanes: two chats, "Lanjutkan roadmap ui" and "Lanjutkan roadmap card".

## Installed tasks
- Changed 2026-10-17 by the owner's request (20-minute idle delay, Opus only); update this list when they change. All three use the PROMPT block with MODEL = `opus`, permission mode auto, no local device.
- `trig_01SNoK2NRwVpqyKWbGiC5yEY` "Lanjutkan roadmap otomatis - Opus :18" (hourly at minute 18 UTC), `trig_01MXrnRqD4MPpe3LFxpjHRk7` "Lanjutkan roadmap otomatis - Opus :38" (minute 38), `trig_01QwHtnej2to7n6GZp1M9aUd` "Lanjutkan roadmap otomatis - Opus :58" (minute 58; formerly the Sonnet task, switched to Opus). A `*/20` schedule was rejected (minimum 1 hour). Only one of them can start a session: the gate needs 20 idle minutes and no active LOCK/MANUAL.
- Retired and disabled: `trig_01NGbA3SCH9Qj5e8UybTpMvv` "Rantai roadmap - pengawas" (watchdog; it created one-shot schedules).

<!-- PROMPT START -->
Lanjutkan roadmap Aeterna secara otomatis (repo odinguard009/aeterna). FIRST call add_repo once (push access). Then, BEFORE any clone, run exactly: `gh api repos/odinguard009/aeterna/contents/tools/session_gate.sh --jq .content | base64 -d | bash -s check MODEL`. Unless the output starts with GO (STOP, an error or no output), end the run at once with one short Indonesian sentence and no other tool calls. On GO: make ONE light sparse clone as CLAUDE.md says, register_repo_root, run `bash tools/session_start.sh`, then `bash tools/session_gate.sh lock` (exit 3 = stop). CLAUDE.md loads automatically: do not read it again. This is a scheduled auto run: follow CLAUDE.md, skill `bs-session-runner` and `docs/ai/next-session-prompt.md` (switch check between tasks, `done vX.Y.Z next=Opus|Sonnet` at the end, `unlock` on any early stop). Send the game file and the mind map at the end. Name the session "Ver. X.Y.Z" after the final version; talk to the owner in Indonesian, short; code, docs, tests and commits in English.
<!-- PROMPT END -->
