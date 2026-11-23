export const NO_WEATHER = 'Не удалось получить актуальную погоду через MCP. Попробуйте повторить запрос позже. Температуру и погодные условия без данных сервиса я сообщить не могу.';

export function collectCall(calls, event) {
  const d = event.data;
  if (event.type === 'call.requested' && d.capability?.name?.startsWith('weather__')) {
    let city = d.input?.name;
    if (!city && d.input?.latitude !== undefined) {
      for (const previous of calls.values()) {
        if (previous.tool !== 'weather__geocode_location' || previous.status !== 'completed') continue;
        const geo = parseOutput(previous.output);
        city = geo?.results?.find(p => Math.abs(p.latitude - d.input.latitude) < 0.01 && Math.abs(p.longitude - d.input.longitude) < 0.01)?.name || city;
      }
    }
    calls.set(d.callId, { id: d.callId, tool: d.capability.name, city, input: d.input, status: 'requested' });
  }
  if (event.type === 'call.settled' && calls.has(d.callId)) {
    Object.assign(calls.get(d.callId), { status: d.outcome, output: d.output, error: d.error });
  }
  return event.type === 'call.requested' || event.type === 'call.settled' ? calls.get(d.callId) : undefined;
}

function parseOutput(output) {
  if (typeof output === 'string') { try { return JSON.parse(output); } catch { return null; } }
  if (output?.structuredContent) return parseOutput(output.structuredContent);
  if (output?.content) {
    for (const part of output.content) if (part.type === 'text') { const value = parseOutput(part.text); if (value) return value; }
    return null;
  }
  return output;
}

export function hasWeather(calls) {
  return [...calls.values()].some(c => c.tool === 'weather__get_weather_forecast' && c.status === 'completed' && validForecast(c.output));
}

function validForecast(output) {
  if (!output || output.isError) return false;
  if (output.current_weather && Number.isFinite(output.current_weather.temperature)) return true;
  if (output.structuredContent && validForecast(output.structuredContent)) return true;
  if (output.daily?.time?.length || output.hourly?.time?.length) return true;
  if (Array.isArray(output.content)) return output.content.some(p => p.type === 'text' && validForecast(p.text));
  if (typeof output === 'string') {
    try { return validForecast(JSON.parse(output)); } catch { return false; }
  }
  return false;
}
