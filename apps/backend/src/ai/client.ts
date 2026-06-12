import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-haiku-4-5-20251001';

let _client: Anthropic | null = null;

export const getAnthropicClient = (): Anthropic => {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const stripJsonFences = (text: string): string => {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}
