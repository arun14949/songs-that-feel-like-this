import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { SongSuggestion } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.mood) {
      return NextResponse.json(
        { error: 'Mood description is required' },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a music expert who recommends songs based on emotional vibes and moods. You return only valid JSON arrays.',
        },
        {
          role: 'user',
          content: `Based on this emotional vibe: "${body.mood}"

Recommend 8 songs that perfectly match this feeling. Consider:
- Tempo and energy that matches the mood
- Lyrical themes (if applicable)
- Instrumentation and production style
- Overall atmosphere

Return ONLY a JSON array in this exact format (no markdown, no code blocks, just the JSON):
[
  {"title": "Song Name", "artist": "Artist Name"},
  {"title": "Another Song", "artist": "Another Artist"}
]

No additional text, just the JSON array.`,
        },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || '';

    // Clean up the response - remove markdown code blocks if present
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let songs: SongSuggestion[];
    try {
      songs = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse JSON:', cleanedContent);
      return NextResponse.json(
        { error: 'Failed to parse song recommendations' },
        { status: 500 }
      );
    }

    // Validate the array
    if (!Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid song recommendations format' },
        { status: 500 }
      );
    }

    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Error recommending songs:', error);

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate recommendations. Please try again.' },
      { status: 500 }
    );
  }
}
