import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

console.log('\n============================================================');
console.log('🚀 Starting ClaimEase Full-Stack System (FastAPI + Vite)');
console.log('============================================================\n');

async function isBackendRunning() {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/db/status', { signal: AbortSignal.timeout(600) });
    return res.ok;
  } catch {
    return false;
  }
}

function getPythonPath() {
  const isWin = process.platform === 'win32';
  const venvWin = resolve('backend/venv/Scripts/python.exe');
  const venvUnix = resolve('backend/venv/bin/python');

  if (isWin && existsSync(venvWin)) return venvWin;
  if (!isWin && existsSync(venvUnix)) return venvUnix;
  return isWin ? 'python' : 'python3';
}

async function main() {
  let backendProc = null;
  const running = await isBackendRunning();

  if (running) {
    console.log('✓ Local FastAPI backend already active on http://127.0.0.1:8000');
  } else {
    const pythonPath = getPythonPath();
    console.log(`⚡ Spawning FastAPI backend using: ${pythonPath}`);
    backendProc = spawn(pythonPath, ['backend/run.py'], {
      stdio: 'inherit',
      shell: false,
      cwd: process.cwd()
    });

    backendProc.on('error', (err) => {
      console.error('❌ Failed to start Python backend:', err.message);
    });

    // Wait up to 5 seconds for backend to become ready
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (await isBackendRunning()) {
        console.log('✓ FastAPI backend is ready and listening on http://127.0.0.1:8000');
        break;
      }
    }
  }

  console.log('⚡ Starting Vite Frontend on http://localhost:3000\n');
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const viteProc = spawn(npxCmd, ['vite'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  const cleanup = () => {
    console.log('\nStopping ClaimEase services...');
    if (backendProc && !backendProc.killed) {
      try { backendProc.kill(); } catch {}
    }
    if (viteProc && !viteProc.killed) {
      try { viteProc.kill(); } catch {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  viteProc.on('close', (code) => {
    cleanup();
  });
}

main().catch((err) => {
  console.error('Fatal error starting dev environment:', err);
  process.exit(1);
});
