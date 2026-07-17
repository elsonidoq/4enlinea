#!/usr/bin/env node
// Like select_win_to_draw but bucket by forwardDistance register of the WIN.
// fwd = 43 - 2*|bestScore| - len.  immediate(<=2) / forced(3..12) / zugzwang(>12)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../../c4solver-wrapper.js';
import { playGame } from '../../../gameSampling.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');
readFileSync(join(root, '.env'), 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});
function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

const nGames = Number(process.argv[2] ?? 120);
const seed = Number(process.argv[3] ?? 4242);
const rng = mulberry32(seed);
const solver = createSolverProcess();
const buckets = { immediate: [], forced: [], zugzwang: [] };
try {
  for (let g = 0; g < nGames; g++) {
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores, player } = pos;
      let best=-Infinity,bestCol=-1; const drawCols=[];
      for (let c=0;c<7;c++){const s=scores[c]; if(s===-1000)continue; if(s>best){best=s;bestCol=c;} if(s===0)drawCols.push(c);}
      if (best>0 && drawCols.length>0){
        const fwd = 43 - 2*Math.abs(best) - ms.length;
        const reg = fwd<=2?'immediate':fwd<=12?'forced':'zugzwang';
        buckets[reg].push({ms,len:ms.length,player,bestCol,bestScore:best,fwd,drawCols});
      }
    }
  }
  for (const reg of ['forced','immediate','zugzwang']) {
    const seen=new Set(); const u=buckets[reg].filter(f=>{if(seen.has(f.ms))return false;seen.add(f.ms);return true;});
    u.sort((a,b)=>a.fwd-b.fwd);
    console.log(`\n##### ${reg} (${u.length} uniq) #####`);
    for (const f of u.slice(0,25)) console.log(JSON.stringify(f));
  }
} finally { solver.destroy(); }
