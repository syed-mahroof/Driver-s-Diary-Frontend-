import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const folder = mkdtempSync(join(tmpdir(), 'diary-tests-'));
const file = join(folder, 'tests.cjs');
try {
  const result = await build({ entryPoints: ['tests/workspace.test.jsx'], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false, loader: { '.png': 'dataurl', '.css': 'empty' }, define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"' } });
  writeFileSync(file, result.outputFiles[0].contents);
  process.exitCode = spawnSync(process.execPath, ['--test', file], { stdio: 'inherit' }).status ?? 1;
} finally {
  try { unlinkSync(file); } catch {}
  rmdirSync(folder);
}
