#!/usr/bin/env bash
# Session gate + auto-mode switch for Aeterna (owner, 2026-10-16: "idle chain").
# Rules: docs/ai/next-session-prompt.md. All state lives in comments on issue #1 (first word of the first line):
#   ON / OFF [reason]   auto-mode switch; newest one wins; none yet = OFF
#   LOCK                a scheduled (auto) session started; released by DONE or UNLOCK; stale after STALE_H hours
#   MANUAL              a manual "Lanjutkan roadmap" session started; released by DONE or UNLOCK; stale after MANUAL_H hours
#   DONE vX.Y.Z         a session (manual or auto) finished and sent the game file
#   UNLOCK              a session stopped early (error, quota, ~80 calls)
#   any other text      owner activity: restarts the idle timer, like a new session
# Commands (no clone needed for check/on/off/status/switch):
#   gh api repos/odinguard009/aeterna/contents/tools/session_gate.sh --jq .content | base64 -d | bash -s <command>
#   check opus|sonnet  scheduled runs, BEFORE the clone: prints "GO" or "STOP <reason>" (exit 0 either way; exit 1 = gate error, treat as STOP).
#                    Owner 2026-10-17: every session runs on Opus, so only "check opus" can GO (the Sonnet task is disabled).
#   lock             scheduled run after the clone: LOCK, exit 3 when another session is active
#   manual           manual session after session_start.sh: MANUAL, exit 3 when an auto session holds the lock
#   done vX.Y.Z next=Opus|Sonnet   end of every session (manual and auto); next= is the model the next roadmap item needs
#   unlock           early stop / error of any session
#   on | off [why]   owner switch ("otomatis on" / "otomatis off" in chat, a comment on issue #1, or the Actions workflow "Auto mode")
#   switch           prints ON or OFF (cheap; auto sessions run it between tasks)
#   status           one-line summary for the owner ("otomatis status")
#   busy             exit 3 when a LOCK or MANUAL session is active (used by session_start.sh)
R=odinguard009/aeterna; L=1
IDLE_MIN=20      # owner rule (2026-10-17, was 30): start only after 20 minutes without a session or owner activity
STALE_H=5        # a LOCK older than this is a crashed auto session
MANUAL_H=3       # a MANUAL older than this is a crashed manual session
NOPROG=3         # auto sessions without a new v* commit before the switch goes OFF by itself
MAX_AUTO_24H=6   # at most this many auto sessions (LOCK) in 24 hours
post() { gh api -X POST "repos/$R/issues/$L/comments" -f body="$1" --jq .created_at >/dev/null; }
evaluate() { # prints one line: <verdict> <reason...>; verdicts GO, STOP, AUTOOFF, plus state for status/busy
  local since comments commits
  since=$(date -u -d '-7 days' +%Y-%m-%dT%H:%M:%SZ)
  comments=$(gh api --paginate "repos/$R/issues/$L/comments?per_page=100&since=$since" --jq '.[] | [.created_at, (.body | split("\n")[0])] | @tsv') || return 1
  commits=$(gh api "repos/$R/commits?per_page=100&since=$since" --jq '.[] | [.commit.committer.date, (.commit.message | split("\n")[0])] | @tsv') || return 1
  stop_file=0; gh api "repos/$R/contents/docs/ai/chain-stop.md" >/dev/null 2>&1 && stop_file=1
  MODE="$1" WANT="${2:-}" STOP_FILE=$stop_file IDLE_MIN=$IDLE_MIN STALE_H=$STALE_H MANUAL_H=$MANUAL_H NOPROG=$NOPROG MAXA=$MAX_AUTO_24H \
  COMMENTS="$comments" COMMITS="$commits" python3 - <<'PY'
import os, re, datetime as dt
E = os.environ
now = dt.datetime.now(dt.timezone.utc)
def t(s): return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
def rows(name):
    out = []
    for line in E[name].splitlines():
        if "\t" in line:
            a, b = line.split("\t", 1); out.append((t(a), b.strip()))
    return sorted(out)
cm, co = rows("COMMENTS"), rows("COMMITS")
word = lambda b: (b.split() or [""])[0].upper()
SW, SES = {"ON", "OFF"}, {"LOCK", "MANUAL", "DONE", "UNLOCK"}
sw = [c for c in cm if word(c[1]) in SW]
switch = word(sw[-1][1]) if sw else "OFF"
sess = [c for c in cm if word(c[1]) in SES]
active = ""
if sess:
    ts, b = sess[-1]; age_h = (now - ts).total_seconds() / 3600
    if word(b) == "LOCK" and age_h < float(E["STALE_H"]): active = f"auto session running ({int(age_h*60)} min)"
    if word(b) == "MANUAL" and age_h < float(E["MANUAL_H"]): active = f"manual session running ({int(age_h*60)} min)"
acts = [c[0] for c in cm if word(c[1]) not in SW] + [c[0] for c in co]
idle = int((now - max(acts)).total_seconds() // 60) if acts else 10**6
rel = [c[0] for c in co if re.match(r"v[0-9]", c[1])]
base = max(rel[-1:] + [c[0] for c in cm if word(c[1]) in {"ON", "RESET"}][-1:] or [now - dt.timedelta(days=7)])
noprog = sum(1 for c in cm if word(c[1]) == "LOCK" and c[0] > base)
last_on = max([c[0] for c in cm if word(c[1]) == "ON"][-1:] or [now - dt.timedelta(days=7)])
auto24 = sum(1 for c in cm if word(c[1]) == "LOCK" and now - c[0] < dt.timedelta(hours=24) and c[0] > last_on)
mode = E["MODE"]
done = [c for c in cm if word(c[1]) == "DONE"]
m = re.search(r"next=(\w+)", done[-1][1], re.I) if done else None
next_model = "opus"  # owner 2026-10-17: Opus for every session; next= tags are kept for history only
want = E.get("WANT", "").lower()
if mode == "status":
    print(f"Mode otomatis: {switch} | sesi: {active or 'tidak ada'} | idle {idle} min | sesi otomatis 24 jam: {auto24}/{E['MAXA']} | tanpa rilis: {noprog}/{E['NOPROG']} | model berikutnya: {next_model}" + (" | chain-stop.md ADA" if E["STOP_FILE"] == "1" else ""))
elif mode == "switch": print(switch)
elif mode == "busy": print(("BUSY " + active) if active else "FREE")
elif E["STOP_FILE"] == "1": print("STOP chain-stop.md exists")
elif switch == "OFF": print("STOP auto mode is OFF")
elif active: print("STOP " + active)
elif noprog >= int(E["NOPROG"]): print(f"AUTOOFF no progress: {noprog} auto sessions without a new v* release")
elif idle < int(E["IDLE_MIN"]): print(f"STOP idle {idle} min < {E['IDLE_MIN']}")
elif auto24 >= int(E["MAXA"]): print(f"STOP daily cap: {auto24} auto sessions in 24 h")
elif want and want != next_model: print(f"STOP next item needs {next_model}, this task runs {want}")
else: print("GO")
PY
}
cmd=${1:-check}; shift || true
case "$cmd" in
  check)
    v=$(evaluate check "${1:-}") || { echo "STOP gate error (gh api failed)"; exit 1; }
    case "$v" in
      AUTOOFF*) post "OFF auto: ${v#AUTOOFF }. Owner: fix the cause, then 'otomatis on'." ; echo "STOP ${v#AUTOOFF } (switch set to OFF)" ;;
      *) echo "$v" ;;
    esac ;;
  lock)   v=$(evaluate busy) || exit 1; [ "${v%% *}" = BUSY ] && { echo "STOP ${v#BUSY }"; exit 3; }; post LOCK && echo locked ;;
  manual) v=$(evaluate busy) || exit 1; case "$v" in BUSY\ auto*) echo "STOP ${v#BUSY }"; exit 3 ;; esac; post MANUAL && echo "manual session marked" ;;
  done)   post "DONE ${*:-}" && echo done ;;
  unlock) post UNLOCK && echo unlocked ;;
  on)     post "ON ${*:-}" && echo "Mode otomatis: ON" ;;
  off)    post "OFF ${*:-}" && echo "Mode otomatis: OFF" ;;
  switch|status) evaluate "$cmd" || { echo "gate error (gh api failed)"; exit 1; } ;;
  busy)   v=$(evaluate busy) || exit 1; echo "$v"; [ "${v%% *}" = BUSY ] && exit 3; exit 0 ;;
  *) echo "usage: $0 check opus|sonnet|lock|manual|done vX.Y.Z next=Opus|Sonnet|unlock|on|off [why]|switch|status|busy"; exit 2 ;;
esac
