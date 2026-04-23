import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Scores for the empty board (solver hangs on empty input).
// Center-favoring, symmetric, approximate.
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

// ── Solver process ────────────────────────────────────────────────────────────

class Connect4Solver {
  constructor() {
    const binaryPath = join(__dirname, 'c4solver');
    console.log(`[solver] binary: ${binaryPath}`);
    console.log(`[solver] cwd:    ${__dirname}`);

    this.process = spawn(binaryPath, ['-a'], { cwd: __dirname });
    this.queue = []; // pending { resolve, reject }
    this.buffer = '';

    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        console.log(`[solver stdout] ${trimmed}`);
        const parts = trimmed.split(/\s+/);
        // format: "{moves} s1 s2 s3 s4 s5 s6 s7"
        // parts[0] is the echoed move string, parts[1..7] are scores
        const scores = parts.slice(1).map(Number);
        const entry = this.queue.shift();
        if (entry) entry.resolve(scores);
      }
    });

    this.process.stderr.on('data', (data) => {
      console.log(`[solver stderr] ${data.toString().trim()}`);
    });

    this.process.on('exit', (code) => {
      console.error(`[solver] exited with code ${code}`);
      for (const entry of this.queue) entry.reject(new Error('Solver exited'));
    });
  }

  query(moves) {
    // Serialize: only send next query after previous one resolves
    this.pending = (this.pending || Promise.resolve()).then(() =>
      new Promise((resolve, reject) => {
        this.queue.push({ resolve, reject });
        console.log(`[solver] sending: "${moves}"`);
        this.process.stdin.write(moves + '\n');
      })
    );
    return this.pending;
  }
}

const solver = new Connect4Solver();

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/ping', (_req, res) => res.json({ ok: true }));

app.post('/api/scores', async (req, res) => {
  const { moves } = req.body;
  if (typeof moves !== 'string') {
    return res.status(400).json({ error: 'moves must be a string' });
  }

  // Empty board: solver hangs, return hardcoded center-favoring scores
  if (moves === '') {
    return res.json({ scores: EMPTY_BOARD_SCORES });
  }

  try {
    console.log(`[api] /api/scores moves="${moves}"`);
    const t0 = Date.now();
    const scores = await solver.query(moves);
    console.log(`[api] done in ${Date.now()-t0}ms → ${scores}`);
    res.json({ scores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Connect4 server running on port ${PORT}`));
