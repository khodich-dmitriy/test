import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ALLOWED_APP_DIRS = new Set(['withdraw-app', 'support-admin']);

export function getNextBuildDirectory(appDir) {
  return path.join(process.cwd(), appDir, '.next');
}

export function createCleanBuildCommand(appDir) {
  return ['next', 'build', `./${appDir}`];
}

function resolveAppDir(value) {
  if (ALLOWED_APP_DIRS.has(value)) {
    return value;
  }

  throw new Error(`Unsupported app directory: ${value || '(empty)'}`);
}

function cleanNextBuild(appDir) {
  rmSync(getNextBuildDirectory(appDir), {
    force: true,
    recursive: true
  });
}

function run() {
  const appDir = resolveAppDir(process.argv[2]);
  cleanNextBuild(appDir);

  const [command, ...args] = createCleanBuildCommand(appDir);
  const child = spawn(command, args, {
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
