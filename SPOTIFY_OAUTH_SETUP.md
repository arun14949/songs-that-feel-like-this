# Spotify OAuth Setup Guide

This guide walks you through setting up server-side OAuth authentication for Spotify, enabling access to the audio features API for the v2.0 scoring system.

## Why OAuth?

The Spotify audio features API requires user authentication (OAuth), not just client credentials. By setting up **server-side OAuth**, you authenticate once as the app owner, and all users benefit from accurate song scoring without needing to log in.

---

## One-Time Setup (5 minutes)

### Step 1: Update Spotify App Settings

1. Go to https://developer.spotify.com/dashboard
2. Click on your app ("songs-that-feel-like-this" or similar)
3. Click **"Edit Settings"**
4. Add these **Redirect URIs**:
   ```
   http://localhost:3000/api/spotify/callback
   https://songs-that-feel-like-this.vercel.app/api/spotify/callback
   ```
5. Click **"Save"**

### Step 2: Run the OAuth Flow

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Visit the setup URL** in your browser:
   ```
   http://localhost:3000/api/spotify/setup
   ```

3. **You'll be redirected to Spotify** to authorize the app
   - Click **"Agree"** to grant permissions
   - You'll be redirected back to `/api/spotify/callback`

4. **You'll see a success message** with your refresh token

### Step 3: Store the Refresh Token

The callback page will show you a refresh token. You have two options:

**Option A: Store in Redis** (Recommended - automatic if you have Redis)
- If you have `REDIS_URL` set, the token is auto-stored
- No action needed!

**Option B: Store in .env.local** (Manual - if no Redis)
- Copy the refresh token from the success message
- Add it to `.env.local`:
  ```bash
  SPOTIFY_REFRESH_TOKEN="your_refresh_token_here"
  ```
- Restart your dev server

---

## Verify Setup

Check if OAuth is working:

```bash
curl http://localhost:3000/api/spotify/setup
```

**Expected response if already set up:**
```json
{
  "message": "Spotify OAuth is already configured!",
  "status": "ready"
}
```

---

## Test the V2.0 Pipeline

Now you can test the full scoring system:

```bash
npx tsx scripts/test-v2-pipeline.ts
```

This should complete successfully with:
- ✅ Image analysis working
- ✅ Candidate generation working
- ✅ Audio features fetched from Spotify
- ✅ Scoring and constraints applied
- ✅ Final 4-5 tracks returned

---

## Production Deployment

When deploying to Vercel:

1. **Add the production redirect URI** to your Spotify app:
   ```
   https://your-domain.vercel.app/api/spotify/callback
   ```

2. **Run the OAuth flow on production**:
   - Visit: `https://your-domain.vercel.app/api/spotify/setup`
   - Authorize the app
   - The refresh token will be stored in Redis (if `REDIS_URL` is set)

3. **OR manually add the refresh token** to Vercel environment variables:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add: `SPOTIFY_REFRESH_TOKEN = your_token_here`
   - Redeploy

---

## How It Works

### Token Lifecycle

1. **Refresh Token** (long-lived, stored permanently)
   - Obtained once during OAuth setup
   - Stored in Redis or .env.local
   - Used to get new access tokens

2. **Access Token** (short-lived, 1 hour)
   - Auto-generated from refresh token
   - Cached in memory
   - Auto-refreshed when expired

3. **API Requests**
   - Each Spotify API call uses the current access token
   - If token expired, auto-refreshes before request
   - Fully transparent to the application

### Security

- ✅ Refresh token stored securely (Redis or env var)
- ✅ Access tokens cached in memory only
- ✅ No user data exposed
- ✅ OAuth scopes limited to what's needed
- ✅ Users never see authentication flow

---

## Troubleshooting

### "No refresh token found"

**Problem:** The OAuth setup hasn't been completed yet.

**Solution:** Visit `/api/spotify/setup` and complete the authorization flow.

---

### "Token refresh failed: 400"

**Problem:** The refresh token is invalid or expired.

**Solution:** Re-run the OAuth setup to get a new refresh token.

---

### "403 Forbidden" from Spotify API

**Problem:** Using client credentials instead of OAuth tokens.

**Solution:** Make sure `lib/spotify-features.ts` imports from `./spotify-oauth`.

---

### Redirect URI mismatch

**Problem:** The redirect URI in your Spotify app doesn't match the callback URL.

**Solution:**
1. Check Spotify Dashboard → Your App → Edit Settings → Redirect URIs
2. Make sure it includes: `http://localhost:3000/api/spotify/callback`
3. Save changes and try again

---

## FAQ

**Q: Do users need to log in with Spotify?**
A: No! You (the app owner) authenticate once. All users benefit automatically.

**Q: What if my refresh token expires?**
A: Refresh tokens don't expire unless revoked. If needed, just re-run the OAuth setup.

**Q: Can I use this on Vercel?**
A: Yes! Just complete the OAuth flow once on production (or set SPOTIFY_REFRESH_TOKEN env var).

**Q: What Spotify scopes do I need?**
A: Currently: `user-read-private`, `user-read-email`. These are minimal scopes for authentication.

**Q: Is this secure?**
A: Yes. The refresh token is stored server-side only, never exposed to clients.

---

## Next Steps

Once OAuth is set up:

1. ✅ Test the v2.0 pipeline locally
2. ✅ Verify audio features are fetched correctly
3. ✅ Deploy to production
4. ✅ Run OAuth setup on production (or set env var)
5. ✅ Enjoy accurate song recommendations! 🎵

---

**Need help?** Check the console logs for detailed error messages, or re-run the setup process.
