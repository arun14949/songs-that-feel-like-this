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
          role: 'system',
          content: 'You are an expert visual analyst who describes images with vivid, specific detail. You capture not just the mood, but the exact visual qualities, colors, lighting, time of day, weather, setting, and emotional nuances that make each image unique. You NEVER use generic descriptions - every image gets a distinct, detailed analysis.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image with SPECIFIC DETAIL. Be descriptive and unique - avoid generic terms like "peaceful" or "calm" alone.

VISUAL ANALYSIS (be very specific):
1. **Colors & Palette**: What are the dominant colors? Are they warm (oranges, reds, yellows) or cool (blues, greens, purples)? Saturated or muted? Describe the exact color palette.

2. **Lighting & Time**: What's the lighting like? (Golden hour sunset, harsh midday, soft overcast, blue hour twilight, artificial neon, candlelight, etc.) What time of day does it feel like?

3. **Setting & Environment**: Where is this? (Urban street, forest path, beach, mountains, indoor café, bedroom, city skyline, countryside, desert, etc.) Be specific about the location type.

4. **Weather & Atmosphere**: Is there rain, fog, mist, clear skies, clouds, snow, sun rays? How does weather affect the mood?

5. **Composition & Focus**: What's the main subject? Is it centered, off to the side? Is there depth, layers, leading lines? Close-up or wide shot?

6. **Energy & Movement**: Does it feel still/static or dynamic/moving? Fast-paced or slow and contemplative?

7. **Emotional Tone**: What SPECIFIC emotion does it evoke? (not just "calm" but "wistful solitude", not just "happy" but "carefree euphoria", etc.)
   - Examples: nostalgic longing, quiet melancholy, vibrant energy, eerie mystery, warm comfort, urban loneliness, natural wonder, dreamy escapism, gritty realism, romantic intimacy

8. **Temporal Feel**: Does it feel vintage (film grain, retro colors), modern (sharp digital, contemporary), or timeless?

9. **Texture & Quality**: Soft/dreamy, sharp/crisp, grainy, smooth, rough, ethereal?

Provide a 3-4 sentence description that captures these SPECIFIC details. Make it vivid and unique so that no two images would get the same description. Focus on what makes THIS image different from all others.`,
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
      max_tokens: 400,
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
