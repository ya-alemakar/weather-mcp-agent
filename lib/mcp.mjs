import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const MCP_URL = process.env.WEATHER_MCP_URL || 'https://weather.chukai.io/mcp';

export async function withMcp(fn, url = MCP_URL) {
  const client = new Client({ name: 'weather-agent-check', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(url)), { timeout: 20000 });
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

export function unpack(result) {
  if (result.isError) throw new Error(JSON.stringify(result.content));
  if (result.structuredContent) return result.structuredContent;
  const content = result.content?.filter(p => p.type === 'text').map(p => p.text).join('\n');
  if (!content) throw new Error('MCP вернул пустой результат');
  return JSON.parse(content);
}
