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
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const scores = (parts.length === 8 ? parts.slice(1) : parts).map(Number);
      const entry = queue.shift();
      if (entry) entry.resolve(scores);
    }
  });

  process.stderr.on('data', () => {});

  process.on('exit', () => {
    for (const entry of queue) entry.reject(new Error('Solver exited'));
  });

  let pending = Promise.resolve();

  return {
    query(moveString) {
      pending = pending.then(() =>
        new Promise((resolve, reject) => {
          const startTime = Date.now();
          queue.push({
            resolve: (result) => {
              const elapsed = Date.now() - startTime;
              console.log(`[solver.query] moveString="${moveString}" took ${elapsed}ms`);
              resolve(result);
            },
            reject,
          });
          process.stdin.write(moveString + '\n');
        })
      );
      return pending;
    },
    destroy() {
      try { process.kill(); } catch {}
    },
  };
}
