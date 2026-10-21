// v0.59.8 (F1): the match fuzzer runs in the GitHub Regression workflow (job "fuzz"), so rare bugs are found without session tokens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/game.mjs';

const wf = readFileSync(join(ROOT, '.github/workflows/regression.yml'), 'utf8');
const job = wf.split(/^  fuzz:\s*$/m)[1] || '';

test('F598-01 Regression has a fuzz job with a dispatch input (default 20, 0 skips it)', () => {
  assert.ok(job.length > 0, 'job fuzz');
  assert.match(wf, /fuzz:\n\s+description: [^\n]+\n\s+default: '20'/);
  assert.ok(job.includes("github.event.inputs.fuzz != '0'"));
});
test('F598-02 the fuzz job runs tools/fuzz.mjs with the run count and a run-id seed, failing on any bad match', () => {
  assert.match(job, /node tools\/fuzz\.mjs --runs "\$n" --seed "\$\(\( \$\{\{ github\.run_id \}\} % 1000000000 \)\)"/);
  assert.ok(job.includes('exit 1'));
  assert.ok(job.includes('::error::'), 'failing lines become annotations (raw logs are not readable from sessions)');
});
test('F598-03 new failing cases are kept as the run artifact fuzz-cases', () => {
  assert.ok(job.includes('upload-artifact@v4'));
  assert.ok(job.includes('name: fuzz-cases'));
  assert.ok(job.includes('path: tests/fuzz-cases/*.json'));
  assert.ok(job.includes('if: failure()'));
});
