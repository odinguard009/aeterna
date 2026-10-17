// Loads Playwright for the Node tests: the local node_modules (CI) or the global install (Claude's workspace).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
export async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* fall back to the global install */ }
  const root = execSync('npm root -g').toString().trim();
  return createRequire(root + '/')('playwright');
}
