import { nanoid } from 'nanoid';
import { kv } from '@vercel/kv';
import type { Recommendation } from './types';

// Use Vercel KV for persistent storage
// Fallback to in-memory if KV is not configured (for local development)
const recommendations = new Map<string, Recommendation>();
const useKV = !!process.env.KV_REST_API_URL;

export async function saveRecommendation(
  data: Omit<Recommendation, 'id' | 'createdAt'>
): Promise<string> {
  const id = nanoid(10);
  const recommendation: Recommendation = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
  };

  if (useKV) {
    try {
      // Store in Vercel KV with 7-day expiration
      await kv.set(`recommendation:${id}`, recommendation, { ex: 60 * 60 * 24 * 7 });
      console.log(`Saved recommendation ${id} to Vercel KV`);
    } catch (error) {
      console.error('Error saving to KV, falling back to in-memory:', error);
      recommendations.set(id, recommendation);
    }
  } else {
    // Fallback to in-memory for local development
    recommendations.set(id, recommendation);
    console.log(`Saved recommendation ${id} to in-memory storage (local dev mode)`);
  }

  return id;
}

export async function getRecommendation(
  id: string
): Promise<Recommendation | null> {
  if (useKV) {
    try {
      const recommendation = await kv.get<Recommendation>(`recommendation:${id}`);
      if (recommendation) {
        console.log(`Retrieved recommendation ${id} from Vercel KV`);
        return recommendation;
      }
      console.log(`Recommendation ${id} not found in Vercel KV`);
      return null;
    } catch (error) {
      console.error('Error reading from KV, falling back to in-memory:', error);
      return recommendations.get(id) || null;
    }
  } else {
    // Fallback to in-memory for local development
    const recommendation = recommendations.get(id) || null;
    if (recommendation) {
      console.log(`Retrieved recommendation ${id} from in-memory storage (local dev mode)`);
    }
    return recommendation;
  }
}
