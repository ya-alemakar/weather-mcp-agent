import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { Client } from 'eve/client';
import { collectCall, hasWeather, NO_WEATHER } from './lib/trace.mjs';

const client = new Client({ baseUrl: 'http://127.0.0.1:2000' });
const sessions = new Map();
const files = { '/': ['public/index.html', 'text/html'], '/app.js': ['public/app.js', 'text/javascript'], '/style.css': ['public/style.css', 'text/css'] };

const server = http.createServer(async (req, res) => {
  const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  try {
    if (req.method === 'GET' && req.url === '/api/status') {
      return json(200, { configured: Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY), model: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL || 'gpt-6.1-sol') : (process.env.WEATHER_MODEL || 'openai/gpt-6.1-sol') });
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(403, { error: 'Недопустимый источник запроса' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 10000) return json(413, { error: 'Слишком длинный запрос' }); }
      let data;
      try { data = JSON.parse(body); } catch { return json(400, { error: 'Некорректный JSON' }); }
      if (typeof data.message !== 'string' || !data.message.trim() || data.message.length > 2000) return json(400, { error: 'Введите вопрос длиной до 2000 символов' });
      if (!process.env.OPENAI_API_KEY && !process.env.AI_GATEWAY_API_KEY) return json(503, { error: 'Добавьте OPENAI_API_KEY в .env и перезапустите npm start. Погодный MCP не требует ключа.' });
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
      const send = event => { if (!res.destroyed) res.write(JSON.stringify(event) + '\n'); };
      const calls = new Map();
      let session;
      let timer;
      try {
        let delivery;
        if (data.sessionId) {
          session = sessions.get(data.sessionId);
          if (!session) throw new Error('Сессия устарела. Нажмите «Новый чат».');
          delivery = await session.send(data.message);
        } else {
          ({ session, delivery } = await client.sessions.create({ message: data.message }));
        }
        send({ type: 'session', sessionId: delivery.sessionId });
        // Keep only the server-issued ID. Context is retained by eve, not reconstructed from the browser.
        sessions.set(delivery.sessionId, session);
        timer = setTimeout(() => { void session.cancel().catch(() => {}); }, 90000);
        for await (const event of delivery.stream()) {
          const call = collectCall(calls, event);
          if (call) { send({ type: 'mcp', call }); console.log('[MCP]', JSON.stringify(call)); }
        }
        const result = await delivery.result();
        if (result.status === 'failed') throw new Error('Ошибка модели или соединения. Проверьте ключ, баланс и подключение к интернету.');
        const ok = result.status === 'completed' && hasWeather(calls);
        send({ type: 'answer', text: ok ? result.reply : NO_WEATHER, ok });
      } catch (error) {
        console.error('[AGENT]', error.message);
        send({ type: 'error', text: error.message });
      } finally { clearTimeout(timer); res.end(); }
      return;
    }
    if (req.method === 'GET' && files[req.url]) {
      const [path, type] = files[req.url];
      const content = await readFile(new URL(path, import.meta.url));
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); res.end(content); return;
    }
    json(404, { error: 'Не найдено' });
  } catch (error) { if (!res.headersSent) json(500, { error: 'Ошибка приложения' }); else res.end(); console.error(error.message); }
});
server.listen(3000, '127.0.0.1', () => console.log('Чат: http://127.0.0.1:3000'));
