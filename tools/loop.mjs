// One-call work loop: build -> lint -> quick tests, printing only what decides the next step.
// Usage: npm run -s loop        (exit code 0 = all green)
import { spawnSync } from 'node:child_process';

const run = (args) => spawnSync(process.execPath, args, { encoding: 'utf8' });
const tail = (s, n) => s.trim().split('\n').slice(-n).join('\n');

const steps = [
  ['build', ['tools/build.mjs']],
  ['lint', ['tools/lint.mjs']],
  ['brand guard', ['tools/brand_guard.mjs']],
  ['quick tests', ['tools/quick-tests.mjs']],
];

for (const [name, args] of steps) {
  const r = run(args);
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.status !== 0) {
    const fails = out.split('\n').filter((l) => /^not ok|^# (pass|fail)|Error|error:/.test(l));
    console.log(`[loop] ${name} FAILED\n${(fails.length ? fails.slice(0, 20).join('\n') : tail(out, 15))}`);
    process.exit(1);
  }
  if (name === 'quick tests') {
    const pass = out.match(/^# pass (\d+)/m);
    console.log(`[loop] build ok, lint clean, quick tests ${pass ? pass[1] + ' passed' : 'ok'}`);
  }
}
