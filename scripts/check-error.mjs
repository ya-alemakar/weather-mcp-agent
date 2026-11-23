import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const response = await fetch('http://127.0.0.1:3000/api/chat', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Какая сейчас погода в Екатеринбурге?' }), signal: AbortSignal.timeout(120000),
});
assert.ok(response.ok);
const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
const answer = events.find(e => e.type === 'answer');
assert.equal(answer?.ok, false);
assert.match(answer.text, /Не удалось получить/);
assert.doesNotMatch(answer.text, /\d+\s*°/);
assert.ok(events.some(e => e.type === 'mcp' && e.call.status === 'failed'));
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/error-check.json', JSON.stringify({ checkedAt: new Date().toISOString(), ok: true, events }, null, 2));
console.log('Проверка отказа MCP пройдена:', answer.text);
