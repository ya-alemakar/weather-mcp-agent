import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// MCP client only: connects to the existing public server; never starts a server.
export async function remote(name: string, args: Record<string, unknown>) {
  const client = new Client({ name: 'weather-agent', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(process.env.WEATHER_MCP_URL || 'https://weather.chukai.io/mcp')), { timeout: 20000 });
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 25000 });
    if (result.isError) throw new Error(JSON.stringify(result.content));
    return result;
  } finally { await client.close().catch(() => {}); }
}
