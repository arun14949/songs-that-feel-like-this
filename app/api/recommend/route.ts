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
          content: 'You are an expert music curator who recommends diverse, unique songs based on visual and emotional vibes. You have deep knowledge of music across ALL genres, eras, and cultures. You NEVER repeat the same songs - each recommendation is fresh and carefully matched to the specific image mood. You think like the r/musicsuggestions community but with access to a vast music library spanning decades and continents.',
        },
        {
          role: 'user',
          content: `Based on this image's emotional vibe and atmosphere: "${body.mood}"

Recommend 8 UNIQUE songs that perfectly capture this visual feeling. CRITICAL: These must be DIFFERENT songs - do not default to the same tracks. Be creative and dig deep into your music knowledge.

Analyze the image deeply:
- VISUAL ATMOSPHERE: What are the colors? Is it warm/cold, bright/dark, natural/urban, day/night?
- EMOTIONAL CORE: What's the PRIMARY emotion? (nostalgia, joy, melancholy, peace, energy, mystery, longing, hope, solitude, wonder)
- SONIC TEXTURE: What instruments/sounds would match? (acoustic guitar, synths, strings, piano, drums, electronic beats, ambient sounds)
- TEMPORAL FEELING: Does it feel vintage (60s-90s), modern (2000s-2010s), contemporary (2015+), or timeless?
- ENERGY LEVEL: Calm/meditative, moderate/flowing, upbeat/energetic, intense/powerful?

Genre Diversity - Draw from across music history and cultures:

**Indie/Alternative:**
Arctic Monkeys, The 1975, Tame Impala, Cigarettes After Sex, Clairo, Mac DeMarco, Japanese Breakfast, Men I Trust, The Marias, Alvvays, Mitski, Soccer Mommy, Snail Mail, Still Woozy, Rex Orange County, Wallows, Omar Apollo, Gus Dapperton, Current Joys, The Backseat Lovers

**Indie Folk/Singer-Songwriter:**
Bon Iver, Sufjan Stevens, Phoebe Bridgers, Fleet Foxes, Iron & Wine, The National, Hozier, Gregory Alan Isakov, The Oh Hellos, The Head and the Heart, Vance Joy, Of Monsters and Men, Daughter, Ben Howard, José González, The Paper Kites, Angus & Julia Stone, Lord Huron, Novo Amor, The Tallest Man on Earth

**Dream Pop/Shoegaze/Ethereal:**
Beach House, Slowdive, Cocteau Twins, M83, Mazzy Star, The xx, Explosions in the Sky, Grouper, Washed Out, Wild Nothing, DIIV, Real Estate, Mild High Club, Crumb, Weyes Blood, Cigarettes After Sex, Alvvays, Japanese Breakfast

**R&B/Soul/Neo-Soul:**
Frank Ocean, SZA, Daniel Caesar, Steve Lacy, Kali Uchis, H.E.R., Summer Walker, Jorja Smith, Snoh Aalegra, Brent Faiyaz, Lucky Daye, Mahalia, Ravyn Lenae, Sabrina Claudio, Kehlani, Jhené Aiko, Blood Orange, Childish Gambino, Anderson .Paak, Solange

**Electronic/Ambient/Downtempo:**
Tycho, ODESZA, Boards of Canada, Jon Hopkins, Bonobo, Four Tet, Caribou, Ólafur Arnalds, Nils Frahm, Kiasmos, Maribou State, Tourist, Lane 8, Bicep, Floating Points, Apparat, Moderat, Rival Consoles, Emancipator, Frameworks

**Indian/South Asian (when culturally/sonically appropriate):**
A.R. Rahman, Anirudh Ravichander, Prateek Kuhad, Ritviz, When Chai Met Toast, Lifafa, Nucleya, Ankur Tewari, Jasleen Royal, Prabh Deep, Bloodywood, The Local Train, Sid Sriram, Armaan Malik, Divine, Naezy, Sez on the Beat, Seedhe Mundi

**Classic/Vintage (60s-90s):**
The Smiths, Fleetwood Mac, Radiohead, Nirvana, Pink Floyd, The Cure, Joy Division, New Order, Talking Heads, R.E.M., Pixies, The Velvet Underground, Nick Drake, Elliott Smith, Jeff Buckley, Portishead, Massive Attack, The Stone Roses, Oasis, Blur

**Modern Pop/Alt-Pop:**
Lauv, LANY, The Neighbourhood, Billie Eilish, Khalid, Halsey, Troye Sivan, Conan Gray, Lorde, The 1975, Shawn Mendes, FINNEAS, mxmtoon, girl in red, Gracie Abrams, Reneé Rapp, Olivia Rodrigo, Sabrina Carpenter, Tate McRae

**Alternative/Experimental:**
Radiohead, Björk, Animal Collective, Grimes, FKA twigs, James Blake, Aphex Twin, Fever Ray, The Knife, Nicolas Jaar, Portishead, Massive Attack, Sigur Rós, Mogwai, Godspeed You! Black Emperor

**Folk/Americana/Country:**
Fleet Foxes, Iron & Wine, Bon Iver, The Lumineers, Mumford & Sons, The Avett Brothers, Tyler Childers, Colter Wall, Sturgill Simpson, Jason Isbell, Kacey Musgraves, Margo Price, Sierra Ferrell

**Hip-Hop/Rap (mood-dependent):**
Kendrick Lamar, J. Cole, Travis Scott, Tyler, The Creator, Mac Miller, Kid Cudi, Isaiah Rashad, JID, Saba, Noname, Earl Sweatshirt, Vince Staples, Denzel Curry, Joey Bada$$, A$AP Rocky

**Jazz/Neo-Jazz (sophisticated vibes):**
Kamasi Washington, Hiatus Kaiyote, Alfa Mist, BADBADNOTGOOD, Thundercat, Robert Glasper, Esperanza Spalding, Nubya Garcia, Yussef Dayes, Tom Misch

CRITICAL RULES:
1. **NO REPEATS**: Every recommendation must be a UNIQUE song. Do not suggest "Holocene" by Bon Iver every time.
2. **MATCH THE SPECIFIC VIBE**: If the image is bright and energetic, don't recommend slow sad songs. If it's dark and moody, don't recommend upbeat pop.
3. **VARIETY IN ARTISTS**: Don't suggest multiple songs from the same artist unless absolutely necessary.
4. **DIG DEEP**: Include lesser-known tracks, B-sides, deep cuts - not just the most popular songs.
5. **CULTURAL SENSITIVITY**: Only include Indian/regional music if it genuinely matches the sonic/emotional vibe.
6. **TEMPORAL ACCURACY**: Match the era - vintage vibes get vintage songs, modern aesthetics get contemporary tracks.
7. **MIX POPULAR & INDIE**: Balance well-known tracks with hidden gems.

Return ONLY a JSON array in this exact format (no markdown, no code blocks, just the JSON):
[
  {"title": "Song Name", "artist": "Artist Name"},
  {"title": "Another Song", "artist": "Another Artist"}
]

No additional text, just the JSON array.`,
        },
      ],
      temperature: 0.9, // Increased for more variety
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
