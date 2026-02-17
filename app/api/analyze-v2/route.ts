/**
 * Image Analysis API - V2.0 Scoring Architecture
 *
 * Analyzes image and returns structured emotional/visual traits (ImageAnalysis)
 * instead of direct song suggestions. This output is used by the scoring pipeline
 * in /api/recommend to generate candidates and rank them objectively.
 *
 * POST /api/analyze-v2
 * Body: { image: string (base64) }
 * Response: { analysis: ImageAnalysis }
 */

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { ImageAnalysis } from '@/lib/types';

// Configure route
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * System prompt for image analysis (v2.0)
 * Focuses on extracting structured traits, not song recommendations
 */
const ANALYSIS_PROMPT = `You are an expert at analyzing images and extracting emotional and visual characteristics.

Your task: Analyze the uploaded image and extract structured information about its mood, energy, and visual aesthetic.

Return JSON with these fields:

1. **mood** (string): Hyper-specific emotion description
   - NOT generic like "sad" or "happy"
   - Examples: "the ache of missing something you never had", "reckless joy of cutting class on a warm afternoon", "stillness of a house at 5am before anyone wakes"

2. **target_energy** (number 0-1): Intensity/activity level
   - 0.0-0.3: Low energy (calm, peaceful, sleepy)
   - 0.4-0.6: Medium energy (contemplative, walking pace)
   - 0.7-1.0: High energy (intense, fast-paced, energetic)

3. **target_valence** (number 0-1): Musical positiveness/happiness
   - 0.0-0.3: Negative/melancholic
   - 0.4-0.6: Neutral/bittersweet
   - 0.7-1.0: Positive/joyful

4. **texture** (string): Visual grain/aesthetic
   - Examples: "warm-grainy-analog", "cold-digital-crisp", "hazy-dreamlike", "raw-grainy"
   - Match photo grain → production grain

5. **color_temperature** (string): Warm or cool tones
   - Examples: "golden-amber", "cool-blue-grey", "saturated-vivid", "high-contrast-dark"

6. **era_preference** (string): Decade that matches the aesthetic
   - Format: "1990s", "2000s", "2010s", "2020s"
   - Consider visual style, fashion, photography technique

7. **language_bias** (array of strings): Preferred languages based on visual context
   - Malayalam: Kerala landscapes, backwaters, traditional settings
   - Tamil: Tamil Nadu landscapes, urban Chennai, Kollywood aesthetics
   - Hindi: North Indian settings, Bollywood vibes
   - English: International settings, modern urban, indie aesthetics
   - Return 1-3 languages in priority order

8. **vibe_tags** (array of strings): 5-8 mood/genre keywords
   - Examples: ["indie", "nostalgic", "monsoon"], ["energetic", "urban", "modern"], ["folk", "rural", "earthy"]
   - Use specific, evocative tags

**Image Types:**
- **Selfies**: Match facial expression and setting (gym = energetic, cozy bed = lo-fi)
- **Scenery**: Kerala backwaters = Malayalam, Tamil landscapes = Tamil music
- **Vehicles**: Royal Enfield = Malayalam/Tamil road anthems, sports car = bass-heavy
- **Food/drink**: Chai+rain = monsoon melodies, coffee shop = indie folk
- **Urban**: City night = moody electronic, rooftop = contemplative
- **Nature**: Forest = folk, ocean = ambient, mountains = vast atmospheric

Return ONLY valid JSON. No markdown, no code blocks, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Extract base64 data
    const imageData = body.image.includes('base64,')
      ? body.image.split('base64,')[1]
      : body.image;

    const imageSizeKB = (imageData.length * 0.75) / 1024;
    console.log(`[Analyze V2 API] Received image: ${imageSizeKB.toFixed(0)}KB`);

    console.log('[Analyze V2 API] Calling OpenAI for image analysis...');
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: ANALYSIS_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and extract the structured emotional and visual traits.',
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
      max_tokens: 500, // Smaller than song recommendations
      response_format: { type: 'json_object' },
    });

    const duration = Date.now() - startTime;
    console.log(`[Analyze V2 API] ✅ OpenAI responded in ${(duration / 1000).toFixed(1)}s`);

    const content = response.choices[0]?.message?.content || '{}';
    console.log('[Analyze V2 API] Raw response:', content.substring(0, 200) + '...');

    let analysis: ImageAnalysis;
    try {
      const parsed = JSON.parse(content);

      // Validate required fields
      if (!parsed.mood || typeof parsed.target_energy !== 'number' || typeof parsed.target_valence !== 'number') {
        console.error('[Analyze V2 API] Missing required fields:', parsed);
        throw new Error('Invalid analysis format: missing required fields');
      }

      // Ensure valid ranges
      analysis = {
        mood: parsed.mood,
        target_energy: Math.max(0, Math.min(1, parsed.target_energy)),
        target_valence: Math.max(0, Math.min(1, parsed.target_valence)),
        texture: parsed.texture || 'neutral',
        color_temperature: parsed.color_temperature || 'neutral',
        era_preference: parsed.era_preference || '2010s',
        language_bias: Array.isArray(parsed.language_bias) ? parsed.language_bias : ['Malayalam', 'Tamil'],
        vibe_tags: Array.isArray(parsed.vibe_tags) ? parsed.vibe_tags : [],
      };

      console.log('[Analyze V2 API] ✅ Analysis extracted:', {
        mood: analysis.mood.substring(0, 50) + '...',
        energy: analysis.target_energy,
        valence: analysis.target_valence,
        languages: analysis.language_bias.join(', '),
        vibe_tags: analysis.vibe_tags.join(', '),
      });

    } catch (parseError) {
      console.error('[Analyze V2 API] Failed to parse JSON:', parseError);
      console.error('[Analyze V2 API] Content was:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return NextResponse.json({
      analysis,
      debug: {
        duration_ms: duration,
        model: 'gpt-4o-mini',
      }
    });

  } catch (error: any) {
    console.error('[Analyze V2 API] Error:', error);

    // Handle specific error types
    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Analysis took too long. Please try with a smaller image.' },
        { status: 504 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'API configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
