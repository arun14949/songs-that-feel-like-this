# Quick Fix: Vercel KV Setup

## ⚠️ Important
You're looking at the **node-redis SDK docs**, but you need **Vercel KV REST API** credentials instead.

---

## What You Have Now ❌
```
REDIS_URL="redis://default:...@redis-18720.crce263.ap-south-1-1.ec2.cloud.redislabs.com:18720"
```

This is a **Redis Labs connection string**, NOT Vercel KV.

## What You Need ✅
```
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="AYL..."
```

---

## Step-by-Step Fix (5 minutes)

### 1. Go to Storage Tab
**URL**: https://vercel.com/aruns-projects-470d4704/songs-that-feel-like-this/stores

### 2. Check if KV Database Exists
- Look in the "Stores" section
- Do you see a KV database listed?

**If YES**: Skip to step 4
**If NO**: Continue to step 3

### 3. Create KV Database (if needed)
1. Click **"Create Database"**
2. Select **"KV (Redis)"** (not "Redis")
3. Name it: `songs-kv` or similar
4. Region: **iad1** (Washington DC - same as your deployment)
5. Click **Create**

### 4. Get Environment Variables
1. Click on your KV database
2. Click the **".env.local" tab** at the top
3. You'll see something like:
   ```bash
   KV_REST_API_URL="https://neat-bunny-12345-us1-rest-kv.upstash.io"
   KV_REST_API_TOKEN="AYLxASQgY2JlYjRjMmE..."
   KV_REST_API_READ_ONLY_TOKEN="..."
   ```

### 5. Connect to Project
1. Still on the KV database page
2. Look for **"Connect Project"** button (usually top right)
3. Select project: **songs-that-feel-like-this**
4. Select environments: **✓ Production ✓ Preview ✓ Development**
5. Click **Connect**

This automatically adds the variables to Vercel!

### 6. Pull Variables Locally
```bash
vercel env pull .env.local --yes
```

### 7. Verify
Check that `.env.local` now has:
```bash
cat .env.local | grep KV_
```

You should see:
```
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
```

### 8. Redeploy
```bash
vercel --prod
```

---

## How to Know It Works

After redeployment, check logs. You should see:
```
✅ Vercel KV detected - using persistent storage
```

NOT:
```
⚠️  No KV storage detected - using in-memory
```

---

## Current Issue

The app code is already set up correctly for Vercel KV:
```typescript
import { kv } from '@vercel/kv';  // ✅ Already in your code
```

It's just missing the environment variables that tell it how to connect.

---

## Still Not Working?

If you can't find the Storage/Stores tab, it might be because:
1. Your Vercel plan doesn't include KV storage
2. The feature isn't enabled for your account
3. You need to upgrade to a paid plan

In that case, let me know and I can help you set up an alternative storage solution.
