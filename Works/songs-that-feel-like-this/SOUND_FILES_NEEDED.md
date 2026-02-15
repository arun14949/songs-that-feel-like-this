# 🔊 Sound Files Required

Your app needs two audio files to work properly. Currently, the files are empty placeholders.

## Required Files

### 1. Ambient Calm Sound (`public/sounds/ambient-calm.mp3`)
**Purpose:** Background music for the home screen

**Specifications:**
- Format: MP3
- Duration: 30-60 seconds (seamless loop)
- Style: Calm, ambient, soothing
- Volume: Will play at 30%

**Suggestions:**
- Soft piano melody
- Nature sounds (gentle rain, forest ambience)
- Ambient synth pads
- Lo-fi chill beats

**Where to Download Free Sounds:**
1. **Pixabay Music** - https://pixabay.com/music/
   - Search: "ambient calm", "peaceful background", "meditation"

2. **Freesound.org** - https://freesound.org
   - Search: "ambient loop", "calm music"
   - Filter: Creative Commons 0 (no attribution required)

3. **YouTube Audio Library** - https://studio.youtube.com/
   - Genre: Ambient, Relaxing
   - Download as MP3

---

### 2. Wooden Click Sound (`public/sounds/wooden-click.mp3`)
**Purpose:** Click feedback for buttons and interactions

**Specifications:**
- Format: MP3
- Duration: < 0.5 seconds
- Style: Soft wooden tap/click
- Volume: Will play at 50%

**Suggestions:**
- Wooden tap sound
- Soft click
- Light percussion hit

**Where to Download Free Sounds:**
1. **Freesound.org** - https://freesound.org
   - Search: "wood click", "wooden tap", "soft click"
   - Filter by license: Creative Commons 0

2. **Pixabay Sound Effects** - https://pixabay.com/sound-effects/
   - Search: "click", "tap", "wood"

---

## Installation Steps

1. Download the two audio files
2. Rename them to:
   - `ambient-calm.mp3`
   - `wooden-click.mp3`
3. Replace the empty files in `/public/sounds/` directory
4. Test in your browser
5. Redeploy to Vercel: `vercel --prod`

---

## Quick Test Links

**Ambient Sounds (recommended):**
- https://pixabay.com/music/search/ambient%20calm/
- https://pixabay.com/music/beats-chill-abstract-12-159800/ (good example)

**Click Sounds (recommended):**
- https://pixabay.com/sound-effects/search/wooden%20click/
- https://freesound.org/search/?q=wooden+click&f=license%3A%22Creative+Commons+0%22

---

## Important Notes

⚠️ **Browser Autoplay Policy:**
The ambient sound will only start playing after the user's first interaction (click) on the page. This is a browser security requirement.

✅ **No Attribution Needed:**
Use Creative Commons 0 (CC0) licensed sounds so you don't need to provide attribution.

🎵 **Testing:**
After adding the files, open the browser console to check for any audio loading errors.
