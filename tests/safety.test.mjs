import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasWeather, collectCall } from '../lib/trace.mjs';
import { withMcp } from '../lib/mcp.mjs';

test('нет данных, ошибка MCP или только геокодирование не разрешают ответ с погодой', () => {
  for (const call of [
    { tool: 'weather__geocode_location', status: 'completed', output: { results: [] } },
    { tool: 'weather__get_weather_forecast', status: 'failed', output: { current_weather: { temperature: 10 } } },
    { tool: 'weather__get_weather_forecast', status: 'completed', output: { isError: true, content: [] } },
    { tool: 'weather__get_weather_forecast', status: 'completed', output: {} },
  ]) assert.equal(hasWeather(new Map([['call', call]])), false);
  assert.equal(hasWeather(new Map()), false);
});

test('успешный реальный формат MCP позволяет использовать данные, включая 0 °C', () => {
  assert.equal(hasWeather(new Map([['call', {
    tool: 'weather__get_weather_forecast', status: 'completed',
    output: { content: [{ type: 'text', text: JSON.stringify({ current_weather: { temperature: 0, windspeed: 1 } }) }] },
  }]])), true);
});

test('недоступный MCP отклоняет подключение без выдуманных значений', async () => {
  await assert.rejects(withMcp(() => assert.fail('Не должно вызываться'), 'http://127.0.0.1:1/mcp'));
});

test('город в журнале погоды берётся из результата геокодирования', () => {
  const calls = new Map();
  collectCall(calls, { type: 'call.requested', data: { callId: 'geo', capability: { name: 'weather__geocode_location' }, input: { name: 'Казань' } } });
  collectCall(calls, { type: 'call.settled', data: { callId: 'geo', outcome: 'completed', output: { results: [{ name: 'Казань', latitude: 55.79, longitude: 49.12 }] } } });
  const call = collectCall(calls, { type: 'call.requested', data: { callId: 'weather', capability: { name: 'weather__get_weather_forecast' }, input: { latitude: 55.79, longitude: 49.12 } } });
  assert.equal(call.city, 'Казань');
});
