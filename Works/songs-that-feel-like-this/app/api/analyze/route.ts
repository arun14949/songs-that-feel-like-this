import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

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
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and describe its emotional atmosphere and mood. Consider:
- Visual elements (colors, lighting, composition)
- The feeling or emotion it evokes
- The energy level (calm, energetic, melancholic, uplifting)
- Any narrative or story suggested

Provide a 2-3 sentence description focusing on the emotional vibe.`,
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
      max_tokens: 300,
    });

    const mood = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      mood,
      description: mood,
    });
  } catch (error: any) {
    console.error('Error analyzing image:', error);

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze image. Please try again.' },
      { status: 500 }
    );
  }
}
