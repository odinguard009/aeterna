# Auto mode ("idle chain") and the scheduled prompt (single source)

**Owner, 2026-10-16:** when no session is running and nothing happened for 30 minutes after the last session (manual or automatic) sent its game file, Claude continues the roadmap by itself, in auto mode, with the model the task needs. The owner switches this on and off. All rules live here, in `tools/session_gate.sh` and in skill `bs-session-runner`; the scheduled prompt only points to them.

## How it works
- TWO recurring scheduled tasks with the same prompt except the model word: "Lanjutkan roadmap otomatis - Opus" (model Opus) and "Lanjutkan roadmap otomatis - Sonnet" (model Sonnet) (see "Installed tasks" below). Each session ends with `done vX.Y.Z next=Opus|Sonnet` (the model the next roadmap item needs, as in its final hint); the gate lets only the task with that model start (no tag = Opus). This is how the model follows the weight of the work: a task has a fixed model, a run cannot change it. Every run first calls the gate `check` before any clone; a STOP run ends at once, so idle runs cost almost nothing.
- State lives in comments on issue #1 ("Auto mode switch + session lock"; the owner may pin it on GitHub, sessions cannot); the first word of a comment is its meaning: `ON` / `OFF` (switch), `LOCK` (auto session started), `MANUAL` (manual session started), `DONE vX.Y.Z` (any session finished), `UNLOCK` (early stop). Any other comment counts as owner activity.
- The gate says GO only when all hold: switch ON; no `docs/ai/chain-stop.md`; no active session (`LOCK` < 5 h or `MANUAL` < 3 h without `DONE`/`UNLOCK`); the newest activity (session comment, owner comment or commit on `main`) is at least 30 minutes old; fewer than 6 auto sessions in 24 h since the last `ON`; fewer than 3 auto sessions since the last `v*` release or `ON` (otherwise the gate writes `OFF auto: <reason>` itself and the owner gets the result).
- "Owner response" = a manual "Lanjutkan roadmap" session (it writes `MANUAL`) or any comment by the owner on issue #1. Scheduled runs cannot see the owner's chats, so a chat message alone does not count.
- The real delay is 30 minutes plus up to one schedule interval (1 hour): 30 to 90 minutes.

## Owner switch (any of these)
- In a claude.ai chat of this project: `otomatis on`, `otomatis off`, `otomatis status`. Claude calls `add_repo` (push), then runs, without cloning: `gh api repos/odinguard009/aeterna/contents/tools/session_gate.sh --jq .content | base64 -d | bash -s on|off|status`, and answers with the one-line result.
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
- Model: chosen by the two tasks above through `next=`. A session that finds the item heavier than its model (for example a Sonnet run whose item turns out to need engine design) does not start it: it takes a small item if one exists, otherwise it ends with `done <current version> next=Opus` without a release. Read-only data lookups go to subagents with `model: "sonnet"` as usual.
- Permission: both tasks should run with automatic approval ("Automatically approve" in the task settings, owner-only switch).
- Session name: "Ver. X.Y.Z" of the final version.

## Installed tasks
- Installed 2026-10-16 by the owner's request (ids, interval, approval mode below; update this list when they change).
- When the owner removes or re-creates them, use the PROMPT block with MODEL replaced by `opus` or `sonnet`.
- `trig_01MXrnRqD4MPpe3LFxpjHRk7` "Lanjutkan roadmap otomatis - Opus" (model claude-opus-5-5, `check opus`) and `trig_01QwHtnej2to7n6GZp1M9aUd` "Lanjutkan roadmap otomatis - Sonnet" (model claude-sonnet-5-5, `check sonnet`): both hourly at minute 38 UTC (:38 WIB), permission mode auto, no local device. The minimum interval is 1 hour (a 30-minute cron was rejected), so an auto run starts 30 to 90 minutes after the last activity.
- Retired and disabled: `trig_01NGbA3SCH9Qj5e8UybTpMvv` "Rantai roadmap - pengawas" (watchdog; it created one-shot schedules).

<!-- PROMPT START -->
Lanjutkan roadmap Aeterna secara otomatis (repo odinguard009/aeterna). FIRST call add_repo once (push access). Then, BEFORE any clone, run exactly: `gh api repos/odinguard009/aeterna/contents/tools/session_gate.sh --jq .content | base64 -d | bash -s check MODEL`. Unless the output starts with GO (STOP, an error or no output), end the run at once with one short Indonesian sentence and no other tool calls. On GO: make ONE light sparse clone as CLAUDE.md says, register_repo_root, run `bash tools/session_start.sh`, then `bash tools/session_gate.sh lock` (exit 3 = stop). CLAUDE.md loads automatically: do not read it again. This is a scheduled auto run: follow CLAUDE.md, skill `bs-session-runner` and `docs/ai/next-session-prompt.md` (switch check between tasks, `done vX.Y.Z next=Opus|Sonnet` at the end, `unlock` on any early stop). Send the game file and the mind map at the end. Name the session "Ver. X.Y.Z" after the final version; talk to the owner in Indonesian, short; code, docs, tests and commits in English.
<!-- PROMPT END -->
