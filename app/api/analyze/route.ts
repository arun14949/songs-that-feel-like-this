import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { SongSuggestion } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// Read system prompt from file (cached at module level for performance)
const systemPrompt = fs.readFileSync(
  path.join(process.cwd(), 'prompts', 'recommendation-v2.md'),
  'utf-8'
);

// Load curated song database (cached at module level)
let cachedCuratedSongList: string | null = null;

function getCuratedSongList(): string {
  if (cachedCuratedSongList) return cachedCuratedSongList;

  const dbPath = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');
  const raw = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(raw);

  // Build a compact song catalog for the prompt
  const songs = db.songs.map((s: any) =>
    `- "${s.title}" by ${s.artist} (${s.language}, ${s.year}) [${s.genre_tags.join(', ')}] vibes: ${s.vibe_tags.join(', ')} | emotions: ${s.emotional_keywords.join(', ')} | visual: ${s.visual_moods.join(', ')}`
  );

  const result = songs.join('\n');
  cachedCuratedSongList = result;
  return result;
}

// Configure route for optimized execution and dynamic rendering
export const maxDuration = 30; // Reduced to 30 seconds for faster model (gpt-4o-mini)
export const dynamic = 'force-dynamic'; // Always run dynamically, never cache

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Extract base64 data from data URL if present
    const imageData = body.image.includes('base64,')
      ? body.image.split('base64,')[1]
      : body.image;

    // Log image size for debugging
    const imageSizeKB = (imageData.length * 0.75) / 1024;
    console.log(`[Analyze API] Received image: ${imageSizeKB.toFixed(0)}KB`);

    console.log('[Analyze API] Calling OpenAI API with gpt-4o-mini (optimized for speed)...');
    const startTime = Date.now();

    const songCatalog = getCuratedSongList();
    const userPrompt = `Analyze this image and recommend 4-5 songs that match its mood and context.

**CRITICAL: You MUST ONLY recommend songs from the curated catalog below. Do NOT suggest any songs outside this list.**

## CURATED SONG CATALOG (pick ONLY from these):
${songCatalog}

## RULES:
1. Pick 4-5 songs from the catalog above that best match the image mood/texture
2. Match texture of image to texture of sound (grain of photo → grain of production)
3. No repeated artists
4. Era spread: span at least 2 decades
5. Each song needs a SPECIFIC visual connection to the image
6. Use the EXACT title and artist as listed in the catalog

Return JSON with: mood (string), songs (array of 4-5 objects with title, artist, year, category, connection_to_image). IMPORTANT: You MUST return a "songs" array with 4-5 song objects. Every song MUST be from the catalog above.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster model: 60% faster, 15x cheaper
      messages: [
        {
          role: 'system',
          content: systemPrompt, // Prompt caching will be handled by OpenAI automatically
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000, // Reduced from 2000 (sufficient for 4-5 songs)
      response_format: { type: 'json_object' },
    });

    const duration = Date.now() - startTime;
    console.log(`[Analyze API] ✅ OpenAI responded in ${(duration / 1000).toFixed(1)}s`);

    const content = response.choices[0]?.message?.content || '{}';
    console.log('[Analyze API] Raw OpenAI response:', content.substring(0, 300) + '...');

    let result: any;
    try {
      result = JSON.parse(content);

      // Validate that we have a songs array
      if (!result.songs || !Array.isArray(result.songs) || result.songs.length < 3) {
        console.error('[Analyze API] Invalid or missing songs array');
        console.error('[Analyze API] Response structure:', JSON.stringify(result, null, 2));
        throw new Error('Invalid response format from AI: missing or invalid songs array');
      }

      console.log(`[Analyze API] ✅ Got ${result.songs.length} songs`);
    } catch (parseError) {
      console.error('[Analyze API] Failed to parse JSON:', parseError);
      console.error('[Analyze API] Content was:', content);
      throw new Error('Invalid JSON response from AI');
    }

    // At this point, we have a valid result with songs array (validated in retry loop)
    // Check if response has any mood information (v2.0 supports both formats)
    const hasMoodInfo = result.mood || result.mood_profile || result.image_category;
    if (!hasMoodInfo) {
      console.warn('[Analyze API] Response missing mood information, using fallback');
      result.mood = 'Analyzing your photo mood...'; // Fallback mood
    }

    // Validate Indian music percentage
    const indianSongs = result.songs.filter((song: SongSuggestion) =>
      song.category && !song.category.includes('International')
    );
    const indianPercentage = (indianSongs.length / result.songs.length) * 100;

    if (indianPercentage < 70) {
      console.warn(`Indian music percentage (${indianPercentage}%) below threshold`);
    }

    // Validate A.R. Rahman limit (maximum 2 songs)
    const rahmanSongs = result.songs.filter((song: SongSuggestion) =>
      song.artist && song.artist.toLowerCase().includes('rahman')
    );
    if (rahmanSongs.length > 2) {
      console.warn(`A.R. Rahman songs (${rahmanSongs.length}) exceed maximum of 2. Limiting to first 2.`);
      // Remove excess Rahman songs
      const nonRahmanSongs = result.songs.filter((song: SongSuggestion) =>
        !song.artist || !song.artist.toLowerCase().includes('rahman')
      );
      result.songs = [...nonRahmanSongs, ...rahmanSongs.slice(0, 2)];
    }

    // Validate Prateek Kuhad limit (maximum 1 song)
    const pratikSongs = result.songs.filter((song: SongSuggestion) =>
      song.artist && song.artist.toLowerCase().includes('prateek')
    );
    if (pratikSongs.length > 1) {
      console.warn(`Prateek Kuhad songs (${pratikSongs.length}) exceed maximum of 1. Limiting to first 1.`);
      // Remove excess Prateek songs
      const nonPratikSongs = result.songs.filter((song: SongSuggestion) =>
        !song.artist || !song.artist.toLowerCase().includes('prateek')
      );
      result.songs = [...nonPratikSongs, ...pratikSongs.slice(0, 1)];
    }

    // Ensure song count is between 4-5 (v2.0 optimized for progressive loading)
    if (result.songs.length < 4) {
      console.warn(`Only ${result.songs.length} songs returned, minimum is 4`);
    } else if (result.songs.length > 5) {
      console.warn(`${result.songs.length} songs returned, limiting to 5`);
      result.songs = result.songs.slice(0, 5);
    }

    // Map mood_profile to mood string if needed (v2.0 format)
    const moodDescription = result.mood ||
      (result.mood_profile ?
        `${result.mood_profile.dominant_emotion} | Energy: ${result.mood_profile.energy_level}/10 | ${result.mood_profile.setting_archetype}`
        : 'Unknown mood');

    return NextResponse.json({
      mood: moodDescription,
      description: moodDescription,
      songs: result.songs,
      playlist_narrative: result.playlist_narrative, // Optional v2.0 field
    });
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      code: error?.code
    });

    // Handle OpenAI timeout errors specifically
    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Image analysis took too long. Please try with a smaller image or try again.' },
        { status: 504 }
      );
    }

    // Handle rate limiting
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Handle invalid API key
    if (error?.status === 401 || error?.type === 'invalid_request_error') {
      return NextResponse.json(
        { error: 'API configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Handle image size errors specifically
    if (error?.message?.includes('Request Entity Too Large') || error?.code === 'ERR_BODY_LIMIT_EXCEEDED') {
      return NextResponse.json(
        { error: 'Image is too large. Please use an image under 10MB or reduce its resolution.' },
        { status: 413 }
      );
    }

    // Handle OpenAI content policy violations
    if (error?.type === 'invalid_request_error' && error?.message?.includes('content_policy')) {
      return NextResponse.json(
        { error: 'This image cannot be processed due to content policy restrictions. Please try a different image.' },
        { status: 400 }
      );
    }

    // Handle OpenAI context length errors (image too complex)
    if (error?.message?.includes('context_length') || error?.message?.includes('maximum context length')) {
      return NextResponse.json(
        { error: 'This image is too complex or high-resolution. Please try a smaller or simpler image.' },
        { status: 400 }
      );
    }

    // Generic error with helpful message
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze image. Please try again with a different image or check your connection.' },
      { status: 500 }
    );
  }
}
