import OpenAI from 'openai';

let _openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 25000, // 25 second timeout (optimized for faster responses with gpt-4o-mini)
      maxRetries: 0, // No automatic retries (handled explicitly in route for better control)
    });
  }
  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAIClient()[prop as keyof OpenAI];
  },
});
