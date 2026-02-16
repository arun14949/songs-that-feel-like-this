import { NextRequest, NextResponse } from 'next/server';
import { saveRecommendation } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.mood || !body.songs) {
      return NextResponse.json(
        { error: 'Mood and songs are required' },
        { status: 400 }
      );
    }

    const id = await saveRecommendation({
      mood: body.mood,
      songs: body.songs,
      allSongSuggestions: body.allSongSuggestions,  // Store ALL AI suggestions for progressive loading
      imageUrl: body.imageUrl,  // Include the uploaded image
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error saving recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to save recommendation' },
      { status: 500 }
    );
  }
}
