# Quick Start Guide

Get your "Songs That Feel Like This" app running in 5 minutes!

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Get API Keys (2-3 mins)

### OpenAI API Key
1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)

### Spotify API Credentials
1. Visit [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click "Create app"
3. Fill in any name and description
4. Copy Client ID and Client Secret

## Step 3: Configure Environment (30 seconds)

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your keys:

```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
SPOTIFY_CLIENT_ID=your-actual-client-id
SPOTIFY_CLIENT_SECRET=your-actual-client-secret
```

## Step 4: Run the App! (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Try It Out

1. Drag and drop any image (sunset, cityscape, nature photo, etc.)
2. Wait ~10 seconds for AI analysis
3. Get 8 song recommendations with playable Spotify previews
4. Share your results with the unique URL!

## Troubleshooting

**"Missing OPENAI_API_KEY"** → Check your .env.local file
**"Failed to analyze image"** → Verify OpenAI billing is set up
**"No songs found"** → Check Spotify credentials
**Port 3000 in use** → Try: `npm run dev -- -p 3001`

## Next Steps

- Try different types of images to see varied recommendations
- Share your results URL with friends
- Check the README.md for deployment instructions

Enjoy! 🎵
