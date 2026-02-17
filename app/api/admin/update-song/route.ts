/**
 * Admin API: Update song metadata in curated database
 *
 * PUT /api/admin/update-song
 * Body: { id, ...updated fields }
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force Node.js runtime for fs support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const updatedSong = await request.json();

    if (!updatedSong.id) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Load current database
    const dbPath = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find song index
    const songIndex = db.songs.findIndex((s: any) => s.id === updatedSong.id);

    if (songIndex === -1) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    // Update the song (preserve spotify_id, title, artist, etc.)
    db.songs[songIndex] = {
      ...db.songs[songIndex],
      language: updatedSong.language,
      genre_tags: updatedSong.genre_tags,
      vibe_tags: updatedSong.vibe_tags,
      visual_moods: updatedSong.visual_moods,
      emotional_keywords: updatedSong.emotional_keywords,
      is_indie: updatedSong.is_indie,
    };

    // Update metadata
    db.metadata.last_updated = new Date().toISOString().split('T')[0];

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');

    console.log(`[Admin] ✅ Updated song: ${db.songs[songIndex].title} (ID: ${updatedSong.id})`);

    return NextResponse.json({
      success: true,
      song: db.songs[songIndex],
    });

  } catch (error: any) {
    console.error('[Admin Update Song] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update song' },
      { status: 500 }
    );
  }
}
