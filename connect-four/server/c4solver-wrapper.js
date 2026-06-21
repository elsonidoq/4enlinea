import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BINARY_PATH = join(__dirname, 'c4solver');
const BOOK_PATH = join(__dirname, '7x6.book');

export function createSolverProcess() {
  if (!existsSync(BOOK_PATH)) throw new Error('Opening book not found: ' + BOOK_PATH);
  const process = spawn(BINARY_PATH, ['-a', '-b', BOOK_PATH], { cwd: __dirname });
  const queue = [];
  let buffer = '';

  process.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      const entry = queue.shift();
      if (!entry) continue;
      if (!trimmed) {
        entry.reject(new Error('Invalid position: "' + entry.moveString + '"'));
        continue;
      }
      const parts = trimmed.split(/\s+/);
      const scores = (parts.length === 8 ? parts.slice(1) : parts).map(Number);
      entry.resolve(scores);
    }
  });

  process.stderr.on('data', () => {});

  process.on('exit', () => {
    for (const entry of queue) entry.reject(new Error('Solver exited'));
  });

  let pending = Promise.resolve();

  return {
    query(moveString, timeoutMs = 30000) {
      let callerResolve, callerReject;
      const callerPromise = new Promise((res, rej) => { callerResolve = res; callerReject = rej; });

      pending = pending.then(() =>
        new Promise((chainResolve) => {
          const startTime = Date.now();
          let settled = false;

          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            const err = new Error(`[solver.query] TIMEOUT after ${timeoutMs}ms — moveString="${moveString}"`);
            console.error(err.message);
            chainResolve();
            callerReject(err);
          }, timeoutMs);

          queue.push({
            moveString,
            resolve: (result) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              chainResolve();
              callerResolve(result);
            },
            reject: (err) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              chainResolve();
              callerReject(err);
            },
          });
          // Move strings in this codebase use 0-indexed columns (0-6).
          // c4solver requires 1-indexed columns (1-7), so convert here — the only place.
          const solverInput = moveString.split('').map(ch => (parseInt(ch, 10) + 1).toString()).join('');
          process.stdin.write(solverInput + '\n');
        })
      );

      return callerPromise;
    },
    destroy() {
      try { process.kill(); } catch {}
    },
  };
}
