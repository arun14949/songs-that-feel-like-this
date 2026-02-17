# Vercel KV Setup Guide

## Issue
Your deployment is failing because Vercel KV environment variables are not configured:
- Missing: `KV_REST_API_URL`
- Missing: `KV_REST_API_TOKEN`

This causes the app to fall back to in-memory storage, which loses all recommendations on restart.

## Error from Logs
```
Error reading from KV, falling back to in-memory:
Error: @vercel/kv: Missing required environment variables KV_REST_API_URL and KV_REST_API_TOKEN
```

---

## Solution: Set Up Vercel KV Storage

### Step 1: Create Vercel KV Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: **songs-that-feel-like-this**
3. Go to the **Storage** tab
4. Click **Create Database**
5. Select **KV (Redis)**
6. Choose a name (e.g., `songs-kv-db`)
7. Select region: **Washington, D.C., USA (East) - iad1** (same as your deployment region)
8. Click **Create**

### Step 2: Connect KV to Your Project

After creating the KV database:

1. Click on the newly created KV database
2. Go to the **.env.local** tab
3. You'll see environment variables like:
   ```
   KV_REST_API_URL="https://..."
   KV_REST_API_TOKEN="..."
   KV_REST_API_READ_ONLY_TOKEN="..."
   ```
4. Click **Connect Project**
5. Select your project: **songs-that-feel-like-this**
6. Select environments: **Production**, **Preview**, **Development**
7. Click **Connect**

This will automatically add the environment variables to your Vercel project.

### Step 3: Redeploy

After connecting, redeploy your project:

```bash
vercel --prod
```

Or wait for the next automatic deployment.

---

## Alternative: Manual Setup

If you prefer to set up manually:

1. Get the KV credentials from your Vercel KV dashboard
2. Add them to Vercel using the CLI:

```bash
# Add KV_REST_API_URL
vercel env add KV_REST_API_URL production

# Add KV_REST_API_TOKEN
vercel env add KV_REST_API_TOKEN production

# Repeat for preview and development if needed
```

3. Redeploy:
```bash
vercel --prod
```

---

## Verification

After setup, check the deployment logs. You should see:
```
✅ Vercel KV detected - using persistent storage
```

Instead of:
```
⚠️  No KV storage detected - using in-memory
```

---

## Why This Matters

**Without Vercel KV:**
- Recommendations are stored in memory
- All recommendations are lost when the server restarts
- Users can't share recommendation links
- Links return 404 errors

**With Vercel KV:**
- Recommendations persist for 7 days
- Share links work reliably
- Better user experience
- Production-ready storage

---

## Current Status

Based on logs, you have `REDIS_URL` but not the KV REST API credentials. Vercel KV requires the REST API endpoints to work properly with Edge Functions.

Follow the steps above to complete the setup.
