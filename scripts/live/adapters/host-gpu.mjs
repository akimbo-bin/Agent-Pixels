// Live adapter: this machine's GPU load (nvidia-smi). Busy above 5% utilisation.
import { execFile } from 'node:child_process';

export const read = () => new Promise(res => execFile('nvidia-smi',
  ['--query-gpu=name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'], { timeout: 4000 },
  (err, out) => {
    if (err) return res({ state: 'unknown', why: 'nvidia-smi unavailable' });
    const [name, util, used, total] = out.trim().split(',').map(s => s.trim());
    res({
      state: Number(util) > 5 ? 'running' : 'idle', detail: name, updatedAt: Date.now(),
      metrics: [{ label: 'GPU', value: Number(util), max: 100, unit: '%' }, { label: 'VRAM', value: Number(used), max: Number(total), unit: 'MiB' }],
    });
  }));
