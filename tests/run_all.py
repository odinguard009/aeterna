#!/usr/bin/env python3
"""One command for the regression, with a short summary (only failing test lines are printed).
  python3 tests/run_all.py                       -> fixtures + every suite + legacy + 30 sims (the full pre-release run)
  python3 tests/run_all.py --only by_doing,mitra      -> just these suites (substring match), no legacy, no sims (quick check while working)
  python3 tests/run_all.py --part 1              -> part 1 of 3 (suites split so each part fits a 10-minute tool call); --part legacy / --part sims
  python3 tests/run_all.py --sims 10             -> number of CPU-vs-CPU games (split over Red-vs-white, Red mirror, white mirror)
Writes tests/last-run.json (per suite: passed/total and the failing test names). Exit code 1 when anything failed."""
import argparse, json, os, re, shutil, subprocess, sys, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SUITES = os.path.join(ROOT, 'tests', 'suites')
NO_FIXTURES = {'cleanup_review_tests', 'seed_replay_tests', 'card_image_strips_tests', 'by_doing_trigger_loop_tests', 'void_supply_rules_tests'}          # these must run without the TST prototype cards
LEGACY = ['effect_scenarios', 'scenario_prompts', 'magic_flow', 'burst_layout', 'hscroll_layout', 'standard_steps', 'deck_formats', 'modal_pick_flow']   # legacy/imp and legacy/sizes removed 2026-10-19
def suites():
    return sorted(f[:-3] for f in os.listdir(SUITES) if f.endswith('.py') and not f.endswith('_sims.py') and f != 'waits.py')   # waits.py: helper (v0.87.0)
def run(cmd, env_fixtures, timeout=900):
    env = dict(os.environ)
    if env_fixtures: env['PYTHONPATH'] = os.path.join(ROOT, 'tests')
    else: env.pop('PYTHONPATH', None)
    t0 = time.time()
    try: out = subprocess.run(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout).stdout   # stderr too, so a crash (Traceback) is never read as a pass
    except subprocess.TimeoutExpired as e: out = (e.stdout or b'').decode() if isinstance(e.stdout, bytes) else (e.stdout or ''); out += '\nTIMEOUT'
    return out, round(time.time() - t0)
def summarize(name, out):
    ok = len(re.findall(r'^PASS', out, re.M)); fails = [l[:160] for l in out.splitlines() if l.startswith('FAIL') and not l.startswith('FAILS []')]
    crash = 'Traceback' in out or 'TIMEOUT' in out or (ok == 0 and not fails)     # a suite that ran no check at all is broken
    m = re.search(r'TOTAL (\d+)/(\d+)', out)
    total = int(m.group(2)) if m else ok + len(fails)
    if crash: fails.append('CRASH: ' + ' | '.join(out.strip().splitlines()[-2:])[:200])
    return {'passed': ok, 'total': total, 'fails': fails}
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only'); ap.add_argument('--part'); ap.add_argument('--sims', type=int, default=None)
    a = ap.parse_args()
    subprocess.run([sys.executable, os.path.join(ROOT, 'tests', 'make_fixtures.py')], cwd=ROOT, capture_output=True)
    names, do_legacy, sims = suites(), True, 30 if a.sims is None else a.sims
    if a.only:
        keys = [k.strip() for k in a.only.split(',') if k.strip()]; names = [n for n in names if any(k in n for k in keys)]; do_legacy = False; sims = a.sims or 0
    if a.part:
        if a.part in ('1', '2', '3'): k = int(a.part); names = names[(k - 1) * len(names) // 3: k * len(names) // 3]; do_legacy = False; sims = 0
        elif a.part == 'legacy': names = []; sims = 0
        elif a.part == 'sims': names = []; do_legacy = False
    report, bad = {}, False
    for n in names:
        out, s = run([sys.executable, os.path.join(SUITES, n + '.py')], n not in NO_FIXTURES)
        r = summarize(n, out); r['sec'] = s; report[n] = r
        flag = 'ok ' if not r['fails'] else 'BAD'; bad |= bool(r['fails'])
        print(f"{flag} {n}: {r['passed']}/{r['total']} ({s}s)"); [print('    ' + f) for f in r['fails'][:8]]
    if do_legacy:
        s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()          # test copy with the default format Eternal (product default: Standard since v0.97.0)
        t = s.replace("let FORMAT = 'standard';", "let FORMAT = 'eternal';", 1); assert t != s
        open('/mnt/user-data/outputs/aeterna-v0.11.1.html', 'w', encoding='utf-8').write(t)
        for n in LEGACY:
            out, s = run([sys.executable, os.path.join(ROOT, 'tests', 'legacy', n + '.py')], True)
            r = summarize('legacy/' + n, out); r['sec'] = s; report['legacy/' + n] = r; bad |= bool(r['fails'])
            print(f"{'ok ' if not r['fails'] else 'BAD'} legacy/{n}: {r['passed']} passed ({s}s)"); [print('    ' + f) for f in r['fails'][:8]]
        for f in os.listdir(ROOT):
            if f.endswith('.png'): os.remove(os.path.join(ROOT, f))       # legacy suites drop screenshots in the repo root
    if sims:
        plan = [('red_cpu_sims.py', [str((sims + 2) // 3), 'A', 'white']), ('red_cpu_sims.py', [str((sims + 1) // 3), 'B', 'mirror']), ('mitra_sims.py', [str(sims // 3), 'M', 'mirror'])]
        for script, args in plan:
            if args[0] == '0': continue
            out, s = run([sys.executable, os.path.join(SUITES, script)] + args, False, timeout=1800)
            line = [l for l in out.splitlines() if l.startswith(args[1] + ' ')]
            try:
                d = json.loads(line[-1].split(' ', 2)[2]); good = d['games'] == d['finished'] and not d['inv'] and not d['errs'] and not d.get('stuck')
            except Exception: d, good = {'raw': out[-300:]}, False
            report[f'sims/{script}:{args[2]}'] = {'passed': d.get('finished', 0), 'total': d.get('games', 0), 'fails': [] if good else [json.dumps(d)[:300]], 'sec': s}
            bad |= not good
            print(f"{'ok ' if good else 'BAD'} sims {script} {args[2]}: {d.get('finished')}/{d.get('games')} finished, invariant errors {len(d.get('inv', []))}, page errors {len(d.get('errs', []))} ({s}s)")
    report['_meta'] = {'version': re.search(r"const VERSION = '([^']+)'", open(os.path.join(ROOT, 'index.html')).read()).group(1), 'time': time.strftime('%Y-%m-%d %H:%M'), 'args': vars(a)}
    path = os.path.join(ROOT, 'tests', 'last-run.json')
    try: old = json.load(open(path)) if a.part else {}
    except Exception: old = {}
    old.update(report); json.dump(old, open(path, 'w'), indent=1)
    t = sum(r['total'] for k, r in report.items() if k != '_meta'); f = sum(len(r['fails']) for k, r in report.items() if k != '_meta')
    print(f"SUMMARY {t - f}/{t} checks ok, {f} failing")
    sys.exit(1 if bad else 0)
if __name__ == '__main__':
    main()
