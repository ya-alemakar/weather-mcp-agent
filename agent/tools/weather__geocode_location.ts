import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { remote } from '../lib/remote';

export default defineTool({
  deferred: true,
  description: 'MCP geocode_location: найти координаты города. Используй первым перед запросом погоды; имя в именительном падеже.',
  inputSchema: z.object({ name: z.string(), count: z.number().int().min(1).max(100).default(1), language: z.string().default('ru') }),
  execute: input => remote('geocode_location', input),
});
