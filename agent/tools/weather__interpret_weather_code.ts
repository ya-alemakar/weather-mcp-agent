import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { remote } from '../lib/remote';

export default defineTool({
  deferred: true,
  description: 'MCP interpret_weather_code: расшифровать WMO-код погодных условий из реального прогноза.',
  inputSchema: z.object({ weather_code: z.number().int().min(0).max(99) }),
  execute: input => remote('interpret_weather_code', input),
});
