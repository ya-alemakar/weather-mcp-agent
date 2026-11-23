import { mkdir, writeFile } from 'node:fs/promises';
import { withMcp, unpack, MCP_URL } from '../lib/mcp.mjs';

const log = { checkedAt: new Date().toISOString(), endpoint: MCP_URL, mode: 'MCP integration check; no LLM', calls: [] };
try {
  await withMcp(async client => {
    const list = await client.listTools();
    log.tools = list.tools.map(t => t.name);
    console.log('MCP подключён:', MCP_URL, '\nИнструменты:', log.tools.join(', '));
    for (const city of ['Екатеринбург', 'Казань']) {
      const call = async (name, args) => {
        console.log(`[MCP] ${city} → ${name}`, args);
        const raw = await client.callTool({ name, arguments: args }, undefined, { timeout: 25000 });
        const data = unpack(raw);
        log.calls.push({ city, tool: name, arguments: args, received: true, data });
        return data;
      };
      const geo = await call('geocode_location', { name: city, language: 'ru', count: 1 });
      const place = geo.results?.[0];
      if (!place) throw new Error(`Город ${city} не найден`);
      const data = await call('get_weather_forecast', {
        latitude: place.latitude, longitude: place.longitude,
        current_weather: true, wind_speed_unit: 'ms', temperature_unit: 'celsius', timezone: 'auto', forecast_days: 1,
      });
      if (!data.current_weather) throw new Error('Нет текущей погоды');
      console.log('Результат:', JSON.stringify(data.current_weather), data.current_weather_units);
    }
  });
  log.ok = true;
} catch (error) {
  log.ok = false;
  log.error = error.message;
  console.error('Не удалось получить погоду:', error.message);
  process.exitCode = 1;
} finally {
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/mcp-check.json', JSON.stringify(log, null, 2));
}
