import OpenAI from 'openai';

let _openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 55000, // 55 second timeout for vision API calls (allows processing of large/complex images)
      maxRetries: 1, // Single retry on transient failures (reduces total wait time)
    });
  }
  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAIClient()[prop as keyof OpenAI];
  },
});
