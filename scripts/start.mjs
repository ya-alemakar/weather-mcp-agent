import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const eveBin = fileURLToPath(new URL('../node_modules/eve/bin/eve.js', import.meta.url));
const children = [];
let closing = false;
function stop() { if (closing) return; closing = true; for (const child of children) child.kill(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
const eve = spawn(process.execPath, [eveBin, 'dev', '--no-ui', '--no-default-extensions', '--port', '2000'], {
  stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, EVE_TELEMETRY_DISABLED: '1' },
});
children.push(eve);
let started = false;
let output = '';
eve.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  output += chunk.toString();
  if (!started && output.includes('[DEV] ready at')) {
    started = true;
    const web = spawn(process.execPath, ['server.mjs'], { stdio: 'inherit', env: process.env });
    children.push(web);
    web.on('exit', code => { stop(); process.exitCode = code || 0; });
  }
  output = output.slice(-3000);
});
eve.on('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
eve.on('exit', code => { stop(); process.exitCode = code || 0; });
