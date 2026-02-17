/**
 * Spotify OAuth Setup - Step 1
 *
 * Visit this endpoint to initiate the OAuth flow.
 * You'll be redirected to Spotify to authorize the app.
 *
 * GET /api/spotify/setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, isOAuthSetup } from '@/lib/spotify-oauth';

export async function GET(request: NextRequest) {
  try {
    // Check if already set up
    const isSetup = await isOAuthSetup();

    if (isSetup) {
      return NextResponse.json({
        message: 'Spotify OAuth is already configured!',
        status: 'ready',
        next_step: 'You can now use the v2.0 scoring API with full audio features.',
      });
    }

    // Generate authorization URL
    const authUrl = getAuthorizationUrl();

    // Redirect to Spotify authorization page
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error('[Spotify Setup] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to initiate OAuth setup',
        help: 'Make sure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set in .env.local'
      },
      { status: 500 }
    );
  }
}
