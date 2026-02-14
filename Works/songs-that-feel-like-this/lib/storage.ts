import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import type { Recommendation } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'recommendations');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function saveRecommendation(
  data: Omit<Recommendation, 'id' | 'createdAt'>
): Promise<string> {
  await ensureDataDir();

  const id = nanoid(10);
  const recommendation: Recommendation = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
  };

  const filePath = path.join(DATA_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(recommendation, null, 2));

  return id;
}

export async function getRecommendation(
  id: string
): Promise<Recommendation | null> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as Recommendation;
  } catch (error) {
    return null;
  }
}
