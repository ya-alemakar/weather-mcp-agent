import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { remote } from '../lib/remote';

export default defineTool({
  deferred: true,
  description: 'MCP get_weather_forecast: реальные текущие условия и прогноз Open-Meteo. Координаты бери из geocode_location. Для текущей погоды current_weather=true, ветер wind_speed_unit=ms.',
  inputSchema: z.object({
    latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
    temperature_unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
    wind_speed_unit: z.enum(['kmh', 'ms', 'mph', 'kn']).default('ms'),
    timezone: z.string().default('auto'), forecast_days: z.number().int().min(1).max(16).default(1),
    current_weather: z.boolean().default(true), hourly: z.string().optional(), daily: z.string().optional(),
  }),
  execute: input => remote('get_weather_forecast', input),
});
