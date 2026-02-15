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
   - Minimum 75% Indian songs (at least 4 out of 5-10 songs)
   - If clearly Indian setting/context: 85% Indian (at least 7-8 out of 10)

2. **Prioritize These Categories**:
   - **Coke Studio** (Pakistan/India): Prioritize heavily for fusion, indie vibes
   - **Indian Indie**: When Chai Met Toast, Prateek Kuhad, Lifafa, Ankur Tewari, Parvaaz, etc.
   - **Regional Cinema OSTs**: Malayalam (Sushin Shyam, Bijibal), Tamil (Santhosh Narayanan, Anirudh), Telugu, Kannada films
   - **Film Soundtracks**: Bollywood when mood-appropriate (NOT generic party songs)
   - **Film Scores**: Background scores from Indian cinema

3. **A.R. Rahman Limit**: STRICT MAXIMUM of 2 tracks TOTAL. No exceptions. If you include A.R. Rahman, count carefully and ensure you don't exceed 2 songs.

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
- Return 5-10 songs total (aim for 8 songs for best experience)
- Minimum 75% Indian (85% if clearly Indian setting)
- MAXIMUM 2 A.R. Rahman songs (strictly enforced)
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
              text: 'Analyze this image and recommend 5-10 songs (aim for 8) that match its mood and context. Follow the Indian-music-first approach with cultural intelligence. STRICT LIMIT: Maximum 2 A.R. Rahman songs only.',
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

    // Ensure song count is between 5-10
    if (result.songs.length < 5) {
      console.warn(`Only ${result.songs.length} songs returned, minimum is 5`);
    } else if (result.songs.length > 10) {
      console.warn(`${result.songs.length} songs returned, limiting to 10`);
      result.songs = result.songs.slice(0, 10);
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
