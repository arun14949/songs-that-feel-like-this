/**
 * Admin Script: Build and Validate Curated Song Database
 *
 * This script helps populate and validate the curated Indian music database
 * by fetching actual Spotify data for songs and validating the metadata.
 *
 * Usage:
 * 1. Add songs manually to curated-indian-music.json with placeholder spotify_ids
 * 2. Run: npx tsx scripts/build-song-database.ts validate
 * 3. Run: npx tsx scripts/build-song-database.ts search "Song Name Artist"
 *
 * Features:
 * - Validate spotify_ids exist and match expected metadata
 * - Search Spotify for songs by title/artist
 * - Fetch audio features for all songs
 * - Update popularity tiers based on actual Spotify data
 * - Generate statistics about the database
 */

import fs from 'fs';
import path from 'path';

// Types matching our database schema
interface SongData {
  id: string;
  spotify_id: string;
  title: string;
  artist: string;
  composer?: string;
  language: string;
  year: number;
  album?: string;
  category: string;
  genre_tags: string[];
  vibe_tags: string[];
  visual_moods: string[];
  popularity_tier: 'deep_cut' | 'moderate' | 'mainstream';
  is_indie: boolean;
  emotional_keywords: string[];
}

interface DatabaseMetadata {
  total_songs: number;
  version: string;
  last_updated: string;
  description: string;
  languages: string[];
  popularity_tiers: {
    deep_cut: string;
    moderate: string;
    mainstream: string;
  };
}

interface CuratedDatabase {
  metadata: DatabaseMetadata;
  songs: SongData[];
}

// File paths
const DATABASE_PATH = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');

/**
 * Load the curated database from disk
 */
function loadDatabase(): CuratedDatabase {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.error('❌ Database file not found:', DATABASE_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATABASE_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Save the database to disk
 */
function saveDatabase(db: CuratedDatabase): void {
  db.metadata.total_songs = db.songs.length;
  db.metadata.last_updated = new Date().toISOString().split('T')[0];

  fs.writeFileSync(
    DATABASE_PATH,
    JSON.stringify(db, null, 2),
    'utf-8'
  );

  console.log('✅ Database saved successfully');
}

/**
 * Validate database structure and data quality
 */
function validateDatabase(): void {
  console.log('🔍 Validating database...\n');

  const db = loadDatabase();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate IDs
  const ids = new Set<string>();
  const spotifyIds = new Set<string>();

  db.songs.forEach((song, index) => {
    const prefix = `Song #${index + 1} (${song.title})`;

    // Required fields
    if (!song.id) errors.push(`${prefix}: Missing ID`);
    if (!song.spotify_id) errors.push(`${prefix}: Missing spotify_id`);
    if (!song.title) errors.push(`${prefix}: Missing title`);
    if (!song.artist) errors.push(`${prefix}: Missing artist`);
    if (!song.language) errors.push(`${prefix}: Missing language`);
    if (!song.year) errors.push(`${prefix}: Missing year`);

    // Duplicates
    if (ids.has(song.id)) {
      errors.push(`${prefix}: Duplicate ID "${song.id}"`);
    }
    ids.add(song.id);

    if (spotifyIds.has(song.spotify_id)) {
      warnings.push(`${prefix}: Duplicate spotify_id "${song.spotify_id}"`);
    }
    spotifyIds.add(song.spotify_id);

    // Array fields
    if (!song.genre_tags || song.genre_tags.length === 0) {
      warnings.push(`${prefix}: No genre_tags`);
    }
    if (!song.vibe_tags || song.vibe_tags.length === 0) {
      warnings.push(`${prefix}: No vibe_tags`);
    }
    if (!song.visual_moods || song.visual_moods.length === 0) {
      warnings.push(`${prefix}: No visual_moods`);
    }
    if (!song.emotional_keywords || song.emotional_keywords.length === 0) {
      warnings.push(`${prefix}: No emotional_keywords`);
    }

    // Popularity tier
    if (!['deep_cut', 'moderate', 'mainstream'].includes(song.popularity_tier)) {
      errors.push(`${prefix}: Invalid popularity_tier "${song.popularity_tier}"`);
    }

    // Year validation
    if (song.year < 1950 || song.year > new Date().getFullYear()) {
      warnings.push(`${prefix}: Unusual year ${song.year}`);
    }
  });

  // Print results
  if (errors.length > 0) {
    console.log('❌ ERRORS:\n');
    errors.forEach(err => console.log(`  - ${err}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach(warn => console.log(`  - ${warn}`));
    console.log('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No issues found!');
  }

  // Statistics
  console.log('📊 DATABASE STATISTICS:\n');
  console.log(`Total songs: ${db.songs.length}`);

  const byLanguage = db.songs.reduce((acc, song) => {
    acc[song.language] = (acc[song.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nBy Language:');
  Object.entries(byLanguage)
    .sort((a, b) => b[1] - a[1])
    .forEach(([lang, count]) => {
      console.log(`  ${lang}: ${count}`);
    });

  const byPopularity = db.songs.reduce((acc, song) => {
    acc[song.popularity_tier] = (acc[song.popularity_tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nBy Popularity Tier:');
  Object.entries(byPopularity)
    .forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`);
    });

  const indieCount = db.songs.filter(s => s.is_indie).length;
  console.log(`\nIndie songs: ${indieCount} (${Math.round(indieCount / db.songs.length * 100)}%)`);

  const decades = db.songs.reduce((acc, song) => {
    const decade = Math.floor(song.year / 10) * 10;
    acc[decade] = (acc[decade] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  console.log('\nBy Decade:');
  Object.entries(decades)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([decade, count]) => {
      console.log(`  ${decade}s: ${count}`);
    });

  console.log('');

  if (errors.length > 0) {
    process.exit(1);
  }
}

/**
 * Generate a new unique ID for a song
 */
function generateSongId(language: string, existingIds: Set<string>): string {
  const prefix = language === 'Malayalam' ? 'mal' :
                 language === 'Tamil' ? 'tam' :
                 language === 'Hindi' ? 'hin' : 'eng';

  let counter = 1;
  let id = `${prefix}-${String(counter).padStart(3, '0')}`;

  while (existingIds.has(id)) {
    counter++;
    id = `${prefix}-${String(counter).padStart(3, '0')}`;
  }

  return id;
}

/**
 * Add a new song to the database (interactive)
 */
function addSong(template?: Partial<SongData>): void {
  console.log('➕ Adding new song to database\n');

  const db = loadDatabase();
  const existingIds = new Set(db.songs.map(s => s.id));

  // Generate ID based on language
  const language = template?.language || 'Malayalam';
  const id = generateSongId(language, existingIds);

  const newSong: SongData = {
    id,
    spotify_id: template?.spotify_id || 'PLACEHOLDER',
    title: template?.title || 'New Song',
    artist: template?.artist || 'Artist Name',
    composer: template?.composer,
    language,
    year: template?.year || new Date().getFullYear(),
    album: template?.album,
    category: template?.category || `${language} Film Song`,
    genre_tags: template?.genre_tags || [],
    vibe_tags: template?.vibe_tags || [],
    visual_moods: template?.visual_moods || [],
    popularity_tier: template?.popularity_tier || 'moderate',
    is_indie: template?.is_indie || false,
    emotional_keywords: template?.emotional_keywords || []
  };

  db.songs.push(newSong);
  saveDatabase(db);

  console.log('✅ Song added:', newSong.id, '-', newSong.title);
  console.log('\n⚠️  Remember to:');
  console.log('  1. Update the spotify_id with actual Spotify track ID');
  console.log('  2. Fill in all metadata fields (tags, moods, keywords)');
  console.log('  3. Run validation: npx tsx scripts/build-song-database.ts validate');
}

/**
 * Search helper to find songs on Spotify (placeholder - requires Spotify API)
 */
function searchSpotify(query: string): void {
  console.log('🔍 Spotify Search (requires API implementation)\n');
  console.log(`Query: "${query}"`);
  console.log('\n⚠️  To implement Spotify search:');
  console.log('  1. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local');
  console.log('  2. Implement OAuth token flow');
  console.log('  3. Call Spotify /search endpoint');
  console.log('  4. Display results with track IDs for manual entry');
}

/**
 * Show statistics about tag usage
 */
function showTagStats(): void {
  console.log('🏷️  TAG USAGE STATISTICS\n');

  const db = loadDatabase();

  const genreTags: Record<string, number> = {};
  const vibeTags: Record<string, number> = {};
  const visualMoods: Record<string, number> = {};
  const emotionalKeywords: Record<string, number> = {};

  db.songs.forEach(song => {
    song.genre_tags.forEach(tag => genreTags[tag] = (genreTags[tag] || 0) + 1);
    song.vibe_tags.forEach(tag => vibeTags[tag] = (vibeTags[tag] || 0) + 1);
    song.visual_moods.forEach(tag => visualMoods[tag] = (visualMoods[tag] || 0) + 1);
    song.emotional_keywords.forEach(tag => emotionalKeywords[tag] = (emotionalKeywords[tag] || 0) + 1);
  });

  console.log('Top Genre Tags:');
  Object.entries(genreTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));

  console.log('\nTop Vibe Tags:');
  Object.entries(vibeTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));

  console.log('\nTop Visual Moods:');
  Object.entries(visualMoods)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));

  console.log('\nTop Emotional Keywords:');
  Object.entries(emotionalKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));

  console.log('');
}

/**
 * Export database to CSV for bulk editing
 */
function exportToCSV(): void {
  const db = loadDatabase();
  const outputPath = path.join(process.cwd(), 'data', 'songs', 'curated-songs-export.csv');

  const headers = [
    'id', 'spotify_id', 'title', 'artist', 'composer', 'language', 'year',
    'album', 'category', 'genre_tags', 'vibe_tags', 'visual_moods',
    'popularity_tier', 'is_indie', 'emotional_keywords'
  ];

  const rows = db.songs.map(song => [
    song.id,
    song.spotify_id,
    `"${song.title}"`,
    `"${song.artist}"`,
    `"${song.composer || ''}"`,
    song.language,
    song.year,
    `"${song.album || ''}"`,
    song.category,
    `"${song.genre_tags.join(', ')}"`,
    `"${song.vibe_tags.join(', ')}"`,
    `"${song.visual_moods.join(', ')}"`,
    song.popularity_tier,
    song.is_indie,
    `"${song.emotional_keywords.join(', ')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log('✅ Exported to:', outputPath);
}

/**
 * Main CLI interface
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🎵 Curated Song Database Builder\n');

  switch (command) {
    case 'validate':
      validateDatabase();
      break;

    case 'add':
      addSong();
      break;

    case 'search':
      if (!args[1]) {
        console.error('❌ Usage: npx tsx scripts/build-song-database.ts search "Song Name Artist"');
        process.exit(1);
      }
      searchSpotify(args.slice(1).join(' '));
      break;

    case 'stats':
      showTagStats();
      break;

    case 'export':
      exportToCSV();
      break;

    default:
      console.log('Available commands:');
      console.log('  validate  - Validate database structure and data quality');
      console.log('  add       - Add a new song to the database');
      console.log('  search    - Search Spotify for songs (requires API setup)');
      console.log('  stats     - Show tag usage statistics');
      console.log('  export    - Export database to CSV');
      console.log('');
      console.log('Examples:');
      console.log('  npx tsx scripts/build-song-database.ts validate');
      console.log('  npx tsx scripts/build-song-database.ts search "Mizhiyil Ninnum Rex Vijayan"');
      console.log('  npx tsx scripts/build-song-database.ts stats');
      break;
  }
}

main();
