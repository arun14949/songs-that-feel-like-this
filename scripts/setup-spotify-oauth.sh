#!/bin/bash

# Spotify OAuth Setup Script
# Automates the setup process for server-side OAuth

echo "🎵 Spotify OAuth Setup for V2.0 Scoring Architecture"
echo "=================================================="
echo ""

# Check if dev server is running
if ! pgrep -f "next dev" > /dev/null; then
    echo "⚠️  Dev server not running."
    echo "Starting dev server..."
    npm run dev &
    sleep 5
fi

echo "✅ Dev server is running"
echo ""

# Check if already set up
echo "Checking OAuth status..."
RESPONSE=$(curl -s http://localhost:3000/api/spotify/setup 2>/dev/null)

if echo "$RESPONSE" | grep -q "already configured"; then
    echo "✅ Spotify OAuth is already configured!"
    echo ""
    echo "You're ready to use the v2.0 scoring API."
    echo "Run: npx tsx scripts/test-v2-pipeline.ts"
    exit 0
fi

echo ""
echo "📋 Setup Instructions:"
echo "====================="
echo ""
echo "1. First, update your Spotify App settings:"
echo "   - Go to: https://developer.spotify.com/dashboard"
echo "   - Click your app → Edit Settings"
echo "   - Add Redirect URI: http://localhost:3000/api/spotify/callback"
echo "   - Click Save"
echo ""
echo "2. Then, open this URL in your browser:"
echo ""
echo "   🔗 http://localhost:3000/api/spotify/setup"
echo ""
echo "3. Authorize the app when Spotify asks"
echo ""
echo "4. You'll be redirected to a success page"
echo ""
echo "5. If you don't have Redis, copy the refresh token and add to .env.local:"
echo "   SPOTIFY_REFRESH_TOKEN=\"your_token_here\""
echo ""
echo "=================================================="
echo ""
echo "Opening setup URL in your browser..."
sleep 2

# Try to open in browser (works on macOS, Linux with xdg-open, WSL with explorer.exe)
if command -v open > /dev/null; then
    open "http://localhost:3000/api/spotify/setup"
elif command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000/api/spotify/setup"
elif command -v explorer.exe > /dev/null; then
    explorer.exe "http://localhost:3000/api/spotify/setup"
else
    echo "Could not open browser automatically."
    echo "Please visit: http://localhost:3000/api/spotify/setup"
fi

echo ""
echo "⏳ Waiting for you to complete the authorization..."
echo "(Press Ctrl+C if you've already completed it)"
echo ""

# Wait for setup to complete
while true; do
    sleep 5
    RESPONSE=$(curl -s http://localhost:3000/api/spotify/setup 2>/dev/null)
    if echo "$RESPONSE" | grep -q "already configured"; then
        echo ""
        echo "✅ Setup complete!"
        echo ""
        echo "🎯 Next steps:"
        echo "  1. Test the v2.0 pipeline: npx tsx scripts/test-v2-pipeline.ts"
        echo "  2. If successful, you're ready to deploy!"
        echo ""
        break
    fi
done
