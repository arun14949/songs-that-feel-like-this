/**
 * Admin API: List all songs in curated database
 *
 * GET /api/admin/list-songs
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force Node.js runtime for fs support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Load curated database
    const dbPath = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({
        songs: [],
        metadata: { total_songs: 0 }
      });
    }

    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    return NextResponse.json({
      songs: db.songs || [],
      metadata: db.metadata || { total_songs: 0 }
    });

  } catch (error: any) {
    console.error('[Admin List Songs] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load songs' },
      { status: 500 }
    );
  }
}
