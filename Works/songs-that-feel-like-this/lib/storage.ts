import { nanoid } from 'nanoid';
import type { Recommendation } from './types';

// WARNING: In-memory storage - recommendations will be lost on server restart/redeployment
// For production, migrate to Vercel KV, Upstash Redis, or a database
const recommendations = new Map<string, Recommendation>();

export async function saveRecommendation(
  data: Omit<Recommendation, 'id' | 'createdAt'>
): Promise<string> {
  const id = nanoid(10);
  const recommendation: Recommendation = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
  };

  recommendations.set(id, recommendation);
  return id;
}

export async function getRecommendation(
  id: string
): Promise<Recommendation | null> {
  return recommendations.get(id) || null;
}
