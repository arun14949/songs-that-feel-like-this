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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and recommend 8-10 songs that match its mood and context. Follow the comprehensive v2.0 recommendation rules including: (1) Texture matching (grain of photo → grain of production), (2) Blacklist compliance (38 overused songs forbidden), (3) Popularity spread (max 2 mainstream, min 3 deep cuts), (4) Era spread (min 3 decades), (5) No repeated artists, (6) Visual connection for each song (not generic mood matching). Apply the Reddit taste test: would this get upvoted on r/musicsuggestions?',
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
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    // Validate response structure (v2.0 supports both mood and mood_profile)
    if (!result.mood && !result.mood_profile) {
      throw new Error('Invalid response format from AI: missing mood or mood_profile');
    }
    if (!result.songs || !Array.isArray(result.songs)) {
      throw new Error('Invalid response format from AI: missing songs array');
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

    // Ensure song count is between 8-10 (v2.0 increased from 5-6)
    if (result.songs.length < 8) {
      console.warn(`Only ${result.songs.length} songs returned, minimum is 8`);
    } else if (result.songs.length > 10) {
      console.warn(`${result.songs.length} songs returned, limiting to 10`);
      result.songs = result.songs.slice(0, 10);
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
