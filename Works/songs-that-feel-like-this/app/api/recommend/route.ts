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
          content: 'You are a music curator who recommends songs based on visual and emotional vibes, similar to the r/musicsuggestions and r/songsforthispicture communities on Reddit. You understand how music can capture the essence of an image - its colors, lighting, mood, atmosphere, and emotional tone. You recommend diverse music across all genres that truly matches the feeling of what you see.',
        },
        {
          role: 'user',
          content: `Based on this image's emotional vibe and atmosphere: "${body.mood}"

Recommend 8 songs that perfectly capture this visual feeling. Think like the Reddit r/musicsuggestions community - match the VIBE, not just the literal description.

Consider these aspects:
- Visual atmosphere: lighting, colors, time of day/night, weather
- Emotional tone: nostalgic, melancholic, euphoric, peaceful, energetic, mysterious, etc.
- Sonic qualities: tempo, instrumentation, production style that matches the visual aesthetic
- Era and style: does the image feel vintage, modern, dreamy, gritty?

Genre Guidelines (be flexible based on what TRULY matches):
- Indie/Alternative (Arctic Monkeys, The 1975, Tame Impala, Cigarettes After Sex, Clairo)
- Indie Folk/Acoustic (Sufjan Stevens, Bon Iver, Phoebe Bridgers, Fleet Foxes)
- Dream Pop/Shoegaze (Beach House, Slowdive, Cocteau Twins, M83)
- R&B/Soul (Frank Ocean, SZA, Daniel Caesar, Steve Lacy, Kali Uchis)
- Electronic/Ambient (Tycho, ODESZA, Boards of Canada, Jon Hopkins)
- Indian Music when it fits: A.R. Rahman, Anirudh, Prateek Kuhad, Ritviz, When Chai Met Toast
- Classic Rock/Oldies if the vibe is vintage (The Smiths, Fleetwood Mac, Mazzy Star)
- Modern Pop if upbeat/colorful (Lauv, LANY, The Neighbourhood)

IMPORTANT:
- Prioritize genre/mood match over regional preferences
- Avoid forcing Indian music if it doesn't match the vibe
- Think: "What would the Reddit community recommend for this image?"
- Mix popular and lesser-known artists
- Consider the sonic texture, not just lyrics

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
