let sessionId;
let busy = false;
const $ = id => document.getElementById(id);
const calls = new Map();
function message(text, role) {
  const el = document.createElement('article'); el.className = role; el.textContent = text;
  $('messages').append(el); $('messages').scrollTop = $('messages').scrollHeight; return el;
}
function renderTrace() {
  $('trace').replaceChildren();
  for (const call of calls.values()) {
    const el = document.createElement('div'); el.className = 'call';
    const name = document.createElement('strong'); name.textContent = call.tool;
    const status = document.createElement('p');
    status.textContent = (call.city ? `Город: ${call.city} · ` : '') + ({ requested: 'Запрос отправлен…', completed: '✓ Результат получен', failed: 'Ошибка сервера' }[call.status] || call.status);
    const detail = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Параметры и ответ';
    const raw = document.createElement('pre'); raw.textContent = JSON.stringify({ arguments: call.input, result: call.output, error: call.error }, null, 2);
    detail.append(summary, raw); el.append(name, status, detail); $('trace').append(el);
  }
}
async function submit(text) {
  if (busy || !text.trim()) return;
  busy = true;
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  $('message').disabled = true; $('message').value = '';
  message(text, 'user'); const pending = message('Агент получает данные…', 'assistant');
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) });
    if (!res.ok) throw new Error((await res.json()).error);
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    const handle = event => {
      if (event.type === 'session') sessionId = event.sessionId;
      if (event.type === 'mcp') { calls.set(event.call.id, event.call); renderTrace(); }
      if (event.type === 'answer' || event.type === 'error') { pending.textContent = event.text; pending.className = event.type === 'error' || !event.ok ? 'assistant error' : 'assistant'; }
    };
    while (true) {
      const { value, done } = await reader.read(); buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) if (line.trim()) handle(JSON.parse(line));
      if (done) { if (buffer.trim()) handle(JSON.parse(buffer)); break; }
    }
  } catch (error) { pending.textContent = error.message || 'Ошибка соединения с приложением'; pending.className = 'assistant error'; }
  finally { busy = false; for (const b of document.querySelectorAll('button')) b.disabled = false; $('message').disabled = false; $('message').focus(); }
}
$('form').addEventListener('submit', event => { event.preventDefault(); void submit($('message').value); });
document.querySelectorAll('[data-question]').forEach(b => b.addEventListener('click', () => void submit(b.dataset.question)));
$('reset').addEventListener('click', () => { sessionId = undefined; calls.clear(); $('trace').textContent = 'Вызовов пока нет'; $('messages').replaceChildren(); message('Новый разговор. Для какого города узнать погоду?', 'assistant'); });
fetch('/api/status').then(r => r.json()).then(s => { $('status').textContent = s.configured ? `Модель: ${s.model} · контекст разговора включён` : 'Для запуска модели добавьте OPENAI_API_KEY в .env и перезапустите npm start.'; }).catch(() => { $('status').textContent = 'Не удалось проверить настройку приложения'; });
