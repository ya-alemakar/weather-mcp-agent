import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const transcript = { checkedAt: new Date().toISOString(), mode: 'real LLM + remote MCP', turns: [] };
let sessionId;
try {
  for (const [question, expected] of [['Какая сейчас погода в Екатеринбурге?', /Екатеринбург/i], ['А в Казани?', /Казан/i]]) {
    console.log('\nПользователь:', question);
    const response = await fetch('http://127.0.0.1:3000/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, sessionId }), signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
    sessionId = events.find(e => e.type === 'session')?.sessionId;
    const calls = events.filter(e => e.type === 'mcp').map(e => e.call);
    const answer = events.find(e => e.type === 'answer');
    transcript.turns.push({ question, sessionId, events });
    for (const c of calls.filter(c => c.status !== 'requested')) console.log('[MCP]', c.city, c.tool, c.status);
    assert.ok(answer?.ok, events.find(e => e.type === 'error')?.text || answer?.text || 'Нет ответа');
    assert.match(answer.text, expected);
    assert.ok(calls.some(c => c.tool === 'weather__get_weather_forecast' && c.status === 'completed'), 'На каждом ходе нужен новый запрос погоды');
    assert.match(JSON.stringify(calls.filter(c => c.tool === 'weather__geocode_location')), expected, 'Город должен быть найден через MCP');
    console.log('Агент:', answer.text);
  }
  assert.equal(transcript.turns[0].sessionId, transcript.turns[1].sessionId, 'Второй вопрос должен продолжать ту же сессию');
  transcript.ok = true;
} catch (error) { transcript.ok = false; transcript.error = error.message; console.error(error.message); process.exitCode = 1; }
finally { await mkdir('artifacts', { recursive: true }); await writeFile('artifacts/agent-check.json', JSON.stringify(transcript, null, 2)); }
