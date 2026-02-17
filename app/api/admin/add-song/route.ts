/**
 * Admin API: Add song to curated database
 *
 * POST /api/admin/add-song
 * Body: { spotify_id, title, artist, ... }
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force Node.js runtime for fs support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const songData = await request.json();

    // Validate required fields
    if (!songData.spotify_id || !songData.title || !songData.artist || !songData.language) {
      return NextResponse.json(
        { error: 'Missing required fields: spotify_id, title, artist, language' },
        { status: 400 }
      );
    }

    // Load current database
    const dbPath = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Check if song already exists
    const exists = db.songs.some((s: any) => s.spotify_id === songData.spotify_id);
    if (exists) {
      return NextResponse.json(
        { error: 'Song already exists in database' },
        { status: 400 }
      );
    }

    // Generate ID (language prefix + number)
    const languagePrefix = songData.language.toLowerCase().substring(0, 3);
    const existingSongsWithPrefix = db.songs.filter((s: any) =>
      s.id.startsWith(languagePrefix)
    ).length;
    const newId = `${languagePrefix}-${String(existingSongsWithPrefix + 1).padStart(3, '0')}`;

    // Determine popularity tier (if popularity is provided)
    let popularityTier = 'moderate';
    if (songData.popularity) {
      if (songData.popularity < 40) popularityTier = 'deep_cut';
      else if (songData.popularity > 80) popularityTier = 'mainstream';
    }

    // Create new song entry
    const newSong = {
      id: newId,
      spotify_id: songData.spotify_id,
      title: songData.title,
      artist: songData.artist,
      composer: songData.composer || songData.artist,
      language: songData.language,
      year: songData.year || new Date().getFullYear(),
      album: songData.album || 'Unknown',
      category: `${songData.language} Film Song`,
      genre_tags: songData.genre_tags || [],
      vibe_tags: songData.vibe_tags || [],
      visual_moods: songData.visual_moods || [],
      popularity_tier: popularityTier,
      is_indie: songData.is_indie || false,
      emotional_keywords: songData.emotional_keywords || [],
    };

    // Add to database
    db.songs.push(newSong);
    db.metadata.total_songs = db.songs.length;
    db.metadata.last_updated = new Date().toISOString().split('T')[0];

    // Update languages list
    if (!db.metadata.languages.includes(songData.language)) {
      db.metadata.languages.push(songData.language);
    }

    // Write back to file
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');

    console.log(`[Admin] ✅ Added song: ${newSong.title} by ${newSong.artist} (ID: ${newSong.id})`);

    return NextResponse.json({
      success: true,
      song: newSong,
      total_songs: db.songs.length,
    });

  } catch (error: any) {
    console.error('[Admin Add Song] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add song' },
      { status: 500 }
    );
  }
}
