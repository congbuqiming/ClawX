import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MARKER = join(ROOT, 'build', '.remote-package');
const BUNDLED_OPENCLAW_DIR = join(ROOT, 'build', 'openclaw');

const targetScript = process.argv[2];

if (!targetScript) {
  console.error('Usage: node scripts/run-remote-package.mjs <pnpm-script-name>');
  process.exit(1);
}

mkdirSync(dirname(MARKER), { recursive: true });
rmSync(BUNDLED_OPENCLAW_DIR, { recursive: true, force: true });
writeFileSync(MARKER, `${targetScript}\n`, 'utf8');

const child = spawn('pnpm', ['run', targetScript], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  rmSync(MARKER, { force: true });
};

child.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  cleanup();
  throw error;
});
