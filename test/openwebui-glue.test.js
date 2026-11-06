import { execFileSync } from 'node:child_process';
import test from 'node:test';

const python = process.env.PYTHON ?? 'python3';

test('Open WebUI glue contract tests run without Open WebUI', () => {
  execFileSync(python, ['test/openwebui_glue_test.py'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
});
