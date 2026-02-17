import { nanoid } from 'nanoid';
import { kv } from '@vercel/kv';
import type { Recommendation } from './types';
import Redis from 'ioredis';

// Use Vercel KV for persistent storage
// Fallback to in-memory if KV is not configured (for local development)
const recommendations = new Map<string, Recommendation>();

// Check for Vercel KV REST API or traditional Redis URL
const hasVercelKV = !!(process.env.KV_REST_API_URL || process.env.KV_URL);
const hasRedisURL = !!process.env.REDIS_URL;
const useKV = hasVercelKV || hasRedisURL;

// Initialize Redis client if using REDIS_URL
let redisClient: Redis | null = null;
if (hasRedisURL && !hasVercelKV) {
  try {
    redisClient = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });
    console.log('✅ Redis detected - using persistent storage (ioredis)');
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
  }
}

// Log KV configuration status on module load
if (hasVercelKV) {
  console.log('✅ Vercel KV detected - using persistent storage (REST API)');
} else if (!useKV) {
  console.warn('⚠️  No KV storage detected - using in-memory (recommendations will be lost on restart)');
}

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
      const key = `recommendation:${id}`;
      const expiration = 60 * 60 * 24 * 7; // 7 days

      // Use ioredis if REDIS_URL is set and Vercel KV is not available
      if (redisClient) {
        await redisClient.setex(key, expiration, JSON.stringify(recommendation));
        console.log(`Saved recommendation ${id} to Redis (ioredis)`);
      } else {
        // Use Vercel KV REST API
        await kv.set(key, recommendation, { ex: expiration });
        console.log(`Saved recommendation ${id} to Vercel KV (REST)`);
      }
    } catch (error) {
      console.error('Error saving to KV/Redis, falling back to in-memory:', error);
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
      const key = `recommendation:${id}`;
      let recommendation: Recommendation | null = null;

      // Use ioredis if REDIS_URL is set and Vercel KV is not available
      if (redisClient) {
        const data = await redisClient.get(key);
        if (data) {
          recommendation = JSON.parse(data);
          console.log(`Retrieved recommendation ${id} from Redis (ioredis)`);
        } else {
          console.log(`Recommendation ${id} not found in Redis`);
        }
      } else {
        // Use Vercel KV REST API
        recommendation = await kv.get<Recommendation>(key);
        if (recommendation) {
          console.log(`Retrieved recommendation ${id} from Vercel KV (REST)`);
        } else {
          console.log(`Recommendation ${id} not found in Vercel KV`);
        }
      }

      return recommendation;
    } catch (error) {
      console.error('Error reading from KV/Redis, falling back to in-memory:', error);
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
