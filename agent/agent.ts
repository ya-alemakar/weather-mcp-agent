import { defineAgent } from 'eve';
import { openai } from 'eve/models/openai';

export default defineAgent({
  model: process.env.OPENAI_API_KEY
    ? openai(process.env.OPENAI_MODEL || 'gpt-6.1-sol')
    : (process.env.WEATHER_MODEL || 'openai/gpt-6.1-sol'),
  defaultTools: false,
  limits: { sessionTimeoutMs: 60 * 60 * 1000 },
});
