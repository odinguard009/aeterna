// Lane order 2 K : 1 U/I (owner, 2026-10-20): tools/lane_next.mjs decides the next lane from CHANGELOG.md and roadmap-open.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lanesOf, nextLane } from '../../tools/lane_next.mjs';

const log = (...lanes) => '# Changelog\n\nintro\n\n' + lanes.map((l, i) => `## v0.9.${lanes.length - i}\n${l ? `- Lane: ${l}\n` : ''}- notes\n`).join('\n');
const open = '## F\n- **F1 effect schema (minor):** x\n';
const closed = '## F\n- Then: plan W\n';

test('LN01 the lane is read from the first Lane bullet; a release without one counts as U/I', () => {
  assert.deepEqual(lanesOf(log('K', 'U/I', null)), ['K', 'U/I', 'U/I']);
});

test('LN02 phase F open: always U/I', () => {
  assert.equal(nextLane(log('K', 'K'), open).lane, 'U/I');
});

test('LN03 after phase F: K, K, U/I cycle', () => {
  assert.equal(nextLane(log('U/I'), closed).lane, 'K');
  assert.equal(nextLane(log('K', 'U/I'), closed).lane, 'K');
  assert.equal(nextLane(log('K', 'K', 'U/I'), closed).lane, 'U/I');
  assert.equal(nextLane(log('U/I', 'K', 'K'), closed).lane, 'K');
});

test('LN04 an empty changelog starts with K once phase F is closed', () => {
  assert.equal(nextLane('# Changelog\n', closed).lane, 'K');
});
