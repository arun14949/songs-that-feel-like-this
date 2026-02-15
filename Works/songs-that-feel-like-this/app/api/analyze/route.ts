import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { SongSuggestion } from '@/lib/types';

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
          content: `You are an expert music curator specializing in Indian music with deep cultural intelligence. You recommend songs that match image moods with exceptional regional awareness and contextual sensitivity.

# STEP 1: IMAGE UNDERSTANDING

Analyze the image thoroughly:
- **Emotional Tone**: What mood does it convey? (nostalgia, joy, melancholy, energy, romance, mystery, etc.)
- **Environmental Cues**: Location type (beach, city, mountains, rain, night, etc.), weather, lighting, time of day
- **Entity Recognition**: Identify any visible celebrities, movie scenes, recognizable landmarks, vehicles (especially F1/racing cars), regional markers
- **Cultural Context**: Is this clearly an Indian setting? (Kerala backwaters, Chennai streets, Mumbai skyline, etc.) Or Western/International?

# CORE RECOMMENDATION RULES

1. **Indian Music Minimum**:
   - Minimum 75% Indian songs (9 out of 12 minimum)
   - If clearly Indian setting/context: 85% Indian (10-11 out of 12-15)

2. **Prioritize These Categories**:
   - **Coke Studio** (Pakistan/India): Prioritize heavily for fusion, indie vibes
   - **Indian Indie**: When Chai Met Toast, Prateek Kuhad, Lifafa, Ankur Tewari, Parvaaz, etc.
   - **Regional Cinema OSTs**: Malayalam (Sushin Shyam, Bijibal), Tamil (Santhosh Narayanan, Anirudh), Telugu, Kannada films
   - **Film Soundtracks**: Bollywood when mood-appropriate (NOT generic party songs)
   - **Film Scores**: Background scores from Indian cinema

3. **A.R. Rahman Limit**: Maximum 2 tracks unless STRONGLY justified by image context

4. **Avoid**: Generic Bollywood party songs, overplayed tracks, predictable choices

# SPECIAL CONTEXT RULES

**Celebrity/Movie Scene Detection**:
- If image shows Bollywood/regional cinema actor or movie scene:
  - Recommend songs from THEIR movies first (2-3 tracks)
  - Then add mood-matching regional tracks

**Motorsports/F1 Context**:
- If F1 car, racing, motorsports visible:
  - Include racing cinema scores: Rush (Hans Zimmer), Ford v Ferrari (Marco Beltrami)
  - Add high-energy Indian tracks: Coke Studio bangers, Bloodywood, indie rock

**Weather-Based**:
- **Rain**: Romantic Malayalam/Tamil tracks (Sushin Shyam, Hesham Abdul Wahab), Bollywood monsoon classics
- **Sea/Beach/Coastal**: Breezy Malayalam indie, Tamil coastal vibes, Goan chill
- **Snow/Mountains**: Himachali folk, Kashmir references, ethereal indie
- **Night City**: Moody Indian indie, urban loneliness tracks (Prateek Kuhad, Lifafa)

**Regional Intelligence**:
- **Kerala vibes**: Prioritize Malayalam cinema (Sushin Shyam, Bijibal, Rex Vijayan), When Chai Met Toast
- **Tamil Nadu**: Santhosh Narayanan, Anirudh Ravichander, indie Tamil
- **Karnataka**: Kannada indie, Raghu Dixit
- **Northeast**: Menwhopause, Taba Chake
- **Mumbai/Urban**: Hindi indie, underground hip-hop

# OUTPUT FORMAT

Return a JSON object with:
{
  "mood": "Brief 2-3 sentence description of image analysis",
  "songs": [
    {
      "title": "Song Name",
      "artist": "Artist Name",
      "language": "Malayalam/Tamil/Hindi/English/Punjabi/etc",
      "category": "Coke Studio / Indian Indie / Regional OST / Film Soundtrack / International / Film Score",
      "reason": "One sentence explaining why this matches the image mood/context"
    }
  ]
}

**Requirements**:
- Return 12-15 songs total
- Minimum 75% Indian (85% if clearly Indian setting)
- Each song MUST have all 5 fields filled
- Reason should reference image specifics (lighting, mood, setting, etc.)
- Diverse mix across languages and regions

RESPOND ONLY WITH VALID JSON. NO MARKDOWN, NO ADDITIONAL TEXT.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and recommend 12-15 songs that match its mood and context. Follow the Indian-music-first approach with cultural intelligence.',
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

    // Validate response structure
    if (!result.mood || !result.songs || !Array.isArray(result.songs)) {
      throw new Error('Invalid response format from AI');
    }

    // Validate Indian music percentage
    const indianSongs = result.songs.filter((song: SongSuggestion) =>
      song.category && !song.category.includes('International')
    );
    const indianPercentage = (indianSongs.length / result.songs.length) * 100;

    if (indianPercentage < 70) {
      console.warn(`Indian music percentage (${indianPercentage}%) below threshold`);
    }

    return NextResponse.json({
      mood: result.mood,
      description: result.mood,
      songs: result.songs,
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
