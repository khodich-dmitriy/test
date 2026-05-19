import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PORT = '3000';

export function createNextCommand(mode, port = PORT) {
  if (mode === 'start') {
    return ['next', 'start', './withdraw-app', '-p', port];
  }

  return ['next', 'dev', './withdraw-app', '-p', port];
}

function clearPort(port) {
  let pids = '';

  try {
    pids = execFileSync('lsof', ['-ti', `tcp:${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return;
  }

  if (!pids) {
    return;
  }

  for (const pid of pids.split('\n').filter(Boolean)) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      // Process may already be gone between discovery and kill.
    }
  }
}

function run() {
  const mode = process.argv[2] === 'start' ? 'start' : 'dev';
  const portFlagIndex = process.argv.findIndex((arg) => arg === '-p' || arg === '--port');
  const port = portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] || PORT : PORT;

  clearPort(port);

  const [command, ...args] = createNextCommand(mode, port);
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
