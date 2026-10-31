import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const matrixPath = new URL('odd/traceability.md', root);

const staleMarkers = ['commit pending', 'native review pending'];

async function ticketFiles(directory) {
  const entries = await readdir(new URL(directory, root), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const issues = new URL(`${directory}/${entry.name}/issues/`, root);
    let issueEntries;
    try {
      issueEntries = await readdir(issues, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const issue of issueEntries) {
      if (issue.isDirectory() || !/^\d\d-.+\.md$/.test(issue.name)) continue;
      files.push(`${directory}/${entry.name}/issues/${issue.name}`);
    }
  }
  return files.sort();
}

test('the traceability matrix carries no stale commit or review marker', async () => {
  const matrix = await readFile(matrixPath, 'utf8');
  for (const marker of staleMarkers) {
    assert.equal(matrix.includes(marker), false, `odd/traceability.md still contains "${marker}"`);
  }
});

test('every resolved tracker ticket is referenced by the traceability matrix', async () => {
  const matrix = await readFile(matrixPath, 'utf8');
  const unresolved = [];
  for (const file of await ticketFiles('.scratch')) {
    const ticket = await readFile(new URL(file, root), 'utf8');
    if (!/^Status: resolved$/imu.test(ticket)) continue;
    if (!matrix.includes(file)) unresolved.push(file);
  }
  assert.deepEqual(unresolved, [], 'resolved tickets missing from odd/traceability.md');
});
