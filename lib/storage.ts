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
      connectTimeout: 10000, // 10 second connection timeout
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[Redis] Max retry attempts reached');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000); // Exponential backoff
      },
    });

    // Add error handler
    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    console.log('✅ Redis detected - using persistent storage (ioredis)');
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redisClient = null;
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
        // Check if Redis is connected
        if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
          console.warn(`[Redis] Client not ready (status: ${redisClient.status}), falling back to in-memory`);
          recommendations.set(id, recommendation);
        } else {
          try {
            await redisClient.setex(key, expiration, JSON.stringify(recommendation));
            console.log(`✅ Saved recommendation ${id} to Redis (ioredis)`);
          } catch (redisError: any) {
            console.error(`[Redis] Save error: ${redisError.message}, falling back to in-memory`);
            recommendations.set(id, recommendation);
          }
        }
      } else {
        // Use Vercel KV REST API
        await kv.set(key, recommendation, { ex: expiration });
        console.log(`✅ Saved recommendation ${id} to Vercel KV (REST)`);
      }
    } catch (error: any) {
      console.error(`Error saving to KV/Redis (${error.message}), falling back to in-memory`);
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
        // Check if Redis is connected
        if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
          console.warn(`[Redis] Client not ready (status: ${redisClient.status}), checking in-memory`);
          recommendation = recommendations.get(id) || null;
        } else {
          try {
            const data = await redisClient.get(key);
            if (data) {
              recommendation = JSON.parse(data);
              console.log(`✅ Retrieved recommendation ${id} from Redis (ioredis)`);
            } else {
              console.log(`Recommendation ${id} not found in Redis, checking in-memory fallback`);
              recommendation = recommendations.get(id) || null;
            }
          } catch (redisError: any) {
            console.error(`[Redis] Get error: ${redisError.message}, checking in-memory`);
            recommendation = recommendations.get(id) || null;
          }
        }
      } else {
        // Use Vercel KV REST API
        recommendation = await kv.get<Recommendation>(key);
        if (recommendation) {
          console.log(`✅ Retrieved recommendation ${id} from Vercel KV (REST)`);
        } else {
          console.log(`Recommendation ${id} not found in Vercel KV`);
        }
      }

      return recommendation;
    } catch (error: any) {
      console.error(`Error reading from KV/Redis (${error.message}), checking in-memory`);
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
