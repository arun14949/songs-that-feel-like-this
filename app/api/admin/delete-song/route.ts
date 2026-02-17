/**
 * Admin API: Delete song from curated database
 *
 * DELETE /api/admin/delete-song
 * Body: { song_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force Node.js runtime for fs support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const { song_id } = await request.json();

    if (!song_id) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // Load current database
    const dbPath = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find song
    const songIndex = db.songs.findIndex((s: any) => s.id === song_id);

    if (songIndex === -1) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    // Store song info for logging
    const deletedSong = db.songs[songIndex];

    // Remove song
    db.songs.splice(songIndex, 1);

    // Update metadata
    db.metadata.total_songs = db.songs.length;
    db.metadata.last_updated = new Date().toISOString().split('T')[0];

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');

    console.log(`[Admin] ✅ Deleted song: ${deletedSong.title} by ${deletedSong.artist} (ID: ${song_id})`);

    return NextResponse.json({
      success: true,
      deleted_song: deletedSong,
      total_songs: db.songs.length,
    });

  } catch (error: any) {
    console.error('[Admin Delete Song] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete song' },
      { status: 500 }
    );
  }
}
