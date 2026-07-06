import OpenAI from 'openai';
import { env } from './env.js';

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}
