#!/usr/bin/env bash
# Session gate + auto-mode switch for Aeterna (owner, 2026-10-16: "idle chain").
# Rules: docs/ai/next-session-prompt.md. All state lives in comments on issue #1 (first word of the first line):
#   ON / OFF [reason]   auto-mode switch; newest one wins; none yet = OFF
#   LOCK                a scheduled (auto) session started; released by DONE or UNLOCK; stale after STALE_H hours
#   MANUAL              a manual "Lanjutkan roadmap" session started; released by DONE or UNLOCK; stale after MANUAL_H hours
#   DONE vX.Y.Z         a session (manual or auto) finished and sent the game file; ends every session, lanes included
#   UNLOCK [lane]       a session stopped early (error, quota, ~80 calls); with a lane it ends only that lane
#   LANEDONE lane branch  a lane session finished its branch (no release yet; the merge step ends with DONE)
#   HEMAT ON / HEMAT OFF  token-saving switch (owner, 2026-10-19); newest one wins; none yet = ON. ON = the pre-v0.68 session
#                       (single main session, read-only subagents only as CLAUDE.md "Mode hemat" says); OFF = team session (v0.68)
# Lanes (P1, v0.63.1; opt-in): LOCK/MANUAL/UNLOCK may carry a lane as second word (ui | card). A start with a lane
#   blocks only that lane; a start without a lane blocks everything (the single-lane flow, unchanged).
#   any other text      owner activity: restarts the idle timer, like a new session
# Commands (no clone needed for check/on/off/status/switch):
#   gh api repos/odinguard009/aeterna/contents/tools/session_gate.sh --jq .content | base64 -d | bash -s <command>
#   check opus|sonnet  scheduled runs, BEFORE the clone: prints "GO" or "STOP <reason>" (exit 0 either way; exit 1 = gate error, treat as STOP).
#                    Owner 2026-10-17: every session runs on Opus, so only "check opus" can GO (the Sonnet task is disabled).
#   check opus [lane]  with a lane only sessions of that lane (or without a lane) count as "running"
#   lock [lane]      scheduled run after the clone: LOCK, exit 3 when another session is active (in that lane)
#   manual [lane]    manual session after session_start.sh: MANUAL, exit 3 when an auto session holds the lock (in that lane)
#   done vX.Y.Z next=Opus|Sonnet   end of every session (manual and auto) and of the lane merge; next= is the model the next roadmap item needs
#   lanedone <lane> <branch>  end of a lane session (its branch is pushed, the merge step releases)
#   unlock [lane]    early stop / error of any session (of that lane)
#   on | off [why]   owner switch ("otomatis on" / "otomatis off" in chat, a comment on issue #1, or the Actions workflow "Auto mode")
#   switch           prints ON or OFF (cheap; auto sessions run it between tasks)
#   hemat [on|off|status]  token-saving switch ("hemat on" / "hemat off" / "hemat status" in chat); prints "Mode hemat: ON|OFF";
#                    every session reads it at the start (team or not) and prints it in the final summary
#   status           one-line summary for the owner ("otomatis status")
#   busy [lane]      exit 3 when a LOCK or MANUAL session is active (in that lane; used by session_start.sh)
# Offline test: GATE_FIXTURE=1 with COMMENTS / COMMITS (tab-separated "time<TAB>first line") and GATE_NOW skips gh
#   for the evaluator (tests/unit/gate_lanes.test.mjs); posting commands still need gh.
R=odinguard009/aeterna; L=1
LANES="ui card"
lane_ok() { [ -z "${1:-}" ] || case " $LANES " in *" $1 "*) return 0 ;; *) echo "unknown lane '$1' (use: $LANES)" >&2; return 1 ;; esac; }
IDLE_MIN=20      # owner rule (2026-10-17, was 30): start only after 20 minutes without a session or owner activity
STALE_H=5        # a LOCK older than this is a crashed auto session
MANUAL_H=3       # a MANUAL older than this is a crashed manual session
NOPROG=3         # auto sessions without a new v* commit before the switch goes OFF by itself
MAX_AUTO_24H=0   # max auto sessions (LOCK) in 24 hours; 0 = unlimited (owner, 2026-10-20)
post() { gh api -X POST "repos/$R/issues/$L/comments" -f body="$1" --jq .created_at >/dev/null; }
evaluate() { # prints one line: <verdict> <reason...>; verdicts GO, STOP, AUTOOFF, plus state for status/busy
  local since comments commits stop_file
  if [ "${GATE_FIXTURE:-}" = 1 ]; then
    comments="${COMMENTS:-}"; commits="${COMMITS:-}"; stop_file="${STOP_FILE:-0}"
  else
    since=$(date -u -d '-7 days' +%Y-%m-%dT%H:%M:%SZ)
    comments=$(gh api --paginate "repos/$R/issues/$L/comments?per_page=100&since=$since" --jq '.[] | [.created_at, (.body | split("\n")[0])] | @tsv') || return 1
    commits=$(gh api "repos/$R/commits?per_page=100&since=$since" --jq '.[] | [.commit.committer.date, (.commit.message | split("\n")[0])] | @tsv') || return 1
    stop_file=0; gh api "repos/$R/contents/docs/ai/chain-stop.md" >/dev/null 2>&1 && stop_file=1
  fi
  MODE="$1" WANT="${2:-}" LANE="${3:-}" LANES="$LANES" STOP_FILE=$stop_file IDLE_MIN=$IDLE_MIN STALE_H=$STALE_H MANUAL_H=$MANUAL_H NOPROG=$NOPROG MAXA=$MAX_AUTO_24H \
  COMMENTS="$comments" COMMITS="$commits" python3 - <<'PY'
import os, re, datetime as dt
E = os.environ
def t(s): return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
def rows(name):
    out = []
    for line in E[name].splitlines():
        if "\t" in line:
            a, b = line.split("\t", 1); out.append((t(a), b.strip()))
    return sorted(out)
now = t(E["GATE_NOW"]) if E.get("GATE_NOW") else dt.datetime.now(dt.timezone.utc)
cm, co = rows("COMMENTS"), rows("COMMITS")
word = lambda b: (b.split() or [""])[0].upper()
SW, SES = {"ON", "OFF"}, {"LOCK", "MANUAL", "DONE", "UNLOCK", "LANEDONE"}
LANES = E["LANES"].split()
sw = [c for c in cm if word(c[1]) in SW]
switch = word(sw[-1][1]) if sw else "OFF"
def lane_of(b):
    p = b.split()
    return p[1].lower() if len(p) > 1 and p[1].lower() in LANES else ""
# running sessions per scope ("" = no lane = whole repo): starts add, ends remove (DONE and a lane-less UNLOCK end all)
run = {}
for ts, b in cm:
    w, ln = word(b), lane_of(b)
    if w in {"LOCK", "MANUAL"}: run[ln] = (w, ts)
    elif w == "DONE" or (w == "UNLOCK" and not ln): run = {}
    elif w in {"UNLOCK", "LANEDONE"} and ln: run.pop(ln, None)
def alive(k):
    w, ts = run[k]; age_h = (now - ts).total_seconds() / 3600
    return age_h < float(E["STALE_H"] if w == "LOCK" else E["MANUAL_H"])
lane = E.get("LANE", "").lower()
scopes = [k for k in run if alive(k) and (not lane or k in ("", lane))]
def desc(k):
    w, ts = run[k]
    return f"{'auto' if w == 'LOCK' else 'manual'} session{(' (' + k + ' lane)') if k else ''} running ({int((now - ts).total_seconds() // 60)} min)"
active = "; ".join(desc(k) for k in sorted(scopes, key=lambda k: (run[k][0] != "LOCK", k)))  # auto first: "BUSY auto" = an auto session holds a lock
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
    print(f"Mode otomatis: {switch} | sesi: {active or 'tidak ada'} | idle {idle} min | sesi otomatis 24 jam: {auto24}/{E['MAXA'] if int(E['MAXA']) else 'tanpa batas'} | tanpa rilis: {noprog}/{E['NOPROG']} | model berikutnya: {next_model}" + (" | chain-stop.md ADA" if E["STOP_FILE"] == "1" else ""))
elif mode == "switch": print(switch)
elif mode == "busy": print(("BUSY " + active) if active else "FREE")
elif E["STOP_FILE"] == "1": print("STOP chain-stop.md exists")
elif switch == "OFF": print("STOP auto mode is OFF")
elif active: print("STOP " + active)
elif noprog >= int(E["NOPROG"]): print(f"AUTOOFF no progress: {noprog} auto sessions without a new v* release")
elif idle < int(E["IDLE_MIN"]): print(f"STOP idle {idle} min < {E['IDLE_MIN']}")
elif int(E["MAXA"]) > 0 and auto24 >= int(E["MAXA"]): print(f"STOP daily cap: {auto24} auto sessions in 24 h")
elif want and want != next_model: print(f"STOP next item needs {next_model}, this task runs {want}")
else: print("GO")
PY
}
hemat_state() { # newest "HEMAT ON|OFF" comment on issue #1 (whole history: the switch can be older than 7 days); none = ON
  local rows
  if [ "${GATE_FIXTURE:-}" = 1 ]; then rows=$(printf '%s\n' "${COMMENTS:-}" | cut -f2-)
  else rows=$(gh api --paginate "repos/$R/issues/$L/comments?per_page=100" --jq '.[] | .body | split("\n")[0]') || return 1; fi
  printf '%s\n' "$rows" | grep -iE '^HEMAT[[:space:]]+(ON|OFF)\b' | tail -1 | awk '{v=toupper($2)} END {print (v=="OFF" ? "OFF" : "ON")}'
}
cmd=${1:-check}; shift || true
case "$cmd" in
  check)
    lane_ok "${2:-}" || exit 2
    v=$(evaluate check "${1:-}" "${2:-}") || { echo "STOP gate error (gh api failed)"; exit 1; }
    case "$v" in
      AUTOOFF*) post "OFF auto: ${v#AUTOOFF }. Owner: fix the cause, then 'otomatis on'." ; echo "STOP ${v#AUTOOFF } (switch set to OFF)" ;;
      *) echo "$v" ;;
    esac ;;
  lock)   lane_ok "${1:-}" || exit 2; v=$(evaluate busy "" "${1:-}") || exit 1; [ "${v%% *}" = BUSY ] && { echo "STOP ${v#BUSY }"; exit 3; }; post "LOCK${1:+ $1}" && echo "locked${1:+ ($1 lane)}" ;;
  manual) lane_ok "${1:-}" || exit 2; v=$(evaluate busy "" "${1:-}") || exit 1; case "$v" in BUSY\ auto*) echo "STOP ${v#BUSY }"; exit 3 ;; esac; post "MANUAL${1:+ $1}" && echo "manual session marked${1:+ ($1 lane)}" ;;
  done)   post "DONE ${*:-}" && echo done ;;
  lanedone) lane_ok "${1:-}" && [ -n "${1:-}" ] || { echo "usage: $0 lanedone <lane> <branch>"; exit 2; }; post "LANEDONE $1 ${2:-lane/$1}" && echo "lane $1 done" ;;
  unlock) lane_ok "${1:-}" || exit 2; post "UNLOCK${1:+ $1}" && echo "unlocked${1:+ ($1 lane)}" ;;
  on)     post "ON ${*:-}" && echo "Mode otomatis: ON" ;;
  off)    post "OFF ${*:-}" && echo "Mode otomatis: OFF" ;;
  hemat)  case "${1:-status}" in
            on|ON)   post "HEMAT ON ${*:2}" && echo "Mode hemat: ON" ;;
            off|OFF) post "HEMAT OFF ${*:2}" && echo "Mode hemat: OFF" ;;
            status)  v=$(hemat_state) || { echo "gate error (gh api failed)"; exit 1; }; echo "Mode hemat: $v" ;;
            *) echo "usage: $0 hemat on|off|status"; exit 2 ;;
          esac ;;
  switch|status) evaluate "$cmd" || { echo "gate error (gh api failed)"; exit 1; } ;;
  busy)   lane_ok "${1:-}" || exit 2; v=$(evaluate busy "" "${1:-}") || exit 1; echo "$v"; [ "${v%% *}" = BUSY ] && exit 3; exit 0 ;;
  *) echo "usage: $0 check opus [lane]|lock [lane]|manual [lane]|done vX.Y.Z next=Opus|lanedone <lane> <branch>|unlock [lane]|on|off [why]|hemat on|off|status|switch|status|busy [lane]  (lanes: $LANES)"; exit 2 ;;
esac
