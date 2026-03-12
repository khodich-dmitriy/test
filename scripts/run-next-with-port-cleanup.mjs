import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PORT = '3000';

export function createNextCommand(mode) {
  if (mode === 'start') {
    return ['next', 'start'];
  }

  return ['next', 'dev'];
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

  clearPort(PORT);

  const [command, ...args] = createNextCommand(mode);
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
