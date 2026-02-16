# Songs That Feel Like This

Upload an image and discover songs that match its vibe. AI-powered music recommendations based on visual mood and atmosphere.

## Features

- 🎨 **Image Analysis**: Upload any image and GPT-4 Vision analyzes its emotional atmosphere
- 🎵 **AI Song Recommendations**: Get 8 song recommendations that perfectly match the image's mood
- 🎧 **Spotify Integration**: Preview songs with embedded players and open full tracks in Spotify
- 🔗 **Shareable Results**: Each recommendation gets a unique URL you can share
- 📱 **Responsive Design**: Works beautifully on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4 Vision for image analysis and song recommendations
- **Music API**: Spotify API for track data and embeds
- **Storage**: JSON file storage (MVP)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API account with GPT-4 Vision access
- Spotify Developer account

### 1. Get API Keys

**OpenAI API Key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Make sure you have access to GPT-4 Vision (requires billing setup)

**Spotify API Credentials:**
1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy the Client ID and Client Secret

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your API keys:

```env
OPENAI_API_KEY=sk-proj-your-key-here
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Upload Image**: User uploads an image via drag-and-drop or file picker
2. **AI Analysis**: GPT-4 Vision analyzes the image's mood, colors, lighting, and emotional vibe
3. **Song Generation**: GPT-4 recommends 8 songs that match the analyzed mood
4. **Spotify Enrichment**: Spotify API fetches track data, album art, and embed URLs
5. **Save & Share**: Recommendation is saved with a unique ID and can be shared via URL

## Project Structure

```
├── app/
│   ├── api/                   # API routes
│   │   ├── analyze/           # Image analysis endpoint
│   │   ├── recommend/         # Song recommendation endpoint
│   │   ├── spotify/           # Spotify data enrichment
│   │   ├── save/              # Save recommendation
│   │   └── recommendations/   # Fetch saved recommendation
│   ├── recommendations/[id]/  # Shareable results page
│   └── page.tsx               # Home page
├── components/
│   ├── ImageUploader.tsx      # Drag-drop image upload
│   ├── SongRecommendations.tsx # Song grid display
│   ├── SpotifyPlayer.tsx      # Embedded Spotify player
│   ├── ShareButton.tsx        # Copy/share functionality
│   └── LoadingState.tsx       # Loading animations
├── lib/
│   ├── openai.ts              # OpenAI client setup
│   ├── spotify.ts             # Spotify API client
│   ├── storage.ts             # Recommendation persistence
│   └── types.ts               # TypeScript interfaces
└── data/recommendations/      # JSON storage

```

## API Routes

- `POST /api/analyze` - Analyzes uploaded image and returns mood description
- `POST /api/recommend` - Generates song recommendations based on mood
- `POST /api/spotify` - Enriches songs with Spotify data
- `POST /api/save` - Saves recommendation and returns unique ID
- `GET /api/recommendations/[id]` - Retrieves saved recommendation

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 Vision | Yes |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID | Yes |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret | Yes |

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

**Important**: For production, consider migrating from JSON file storage to a database (Vercel KV, Postgres, etc.)

### Build for Production

```bash
npm run build
npm start
```

## Future Enhancements

- [ ] Add mood explanation ("Why these songs match")
- [ ] User accounts to save recommendation history
- [ ] Create Spotify playlists directly (requires user OAuth)
- [ ] Multiple image upload for collage analysis
- [ ] Genre/era filters
- [ ] Social sharing with auto-generated OG images
- [ ] Migrate to database (Vercel KV/Postgres)
- [ ] Analytics tracking
- [ ] A/B test different prompts

## License

MIT

## Acknowledgments

- Inspired by [r/musicsuggestions](https://www.reddit.com/r/musicsuggestions/)
- Powered by OpenAI GPT-4 Vision and Spotify
