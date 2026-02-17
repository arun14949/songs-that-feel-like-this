/**
 * Spotify OAuth Callback - Step 2
 *
 * Spotify redirects here after authorization.
 * Exchanges the authorization code for access + refresh tokens.
 *
 * GET /api/spotify/callback?code=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/spotify-oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json(
        {
          error: 'Authorization denied',
          details: error,
          message: 'You need to authorize the app to access Spotify audio features.'
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    return NextResponse.json({
      message: '✅ Spotify OAuth setup complete!',
      status: 'success',
      next_steps: [
        'Your refresh token has been stored.',
        'The app can now access Spotify audio features.',
        'All users will benefit from accurate song scoring.',
        'No further action needed - the token will auto-refresh.'
      ],
      technical_details: {
        access_token_expires_in: `${tokens.expires_in} seconds`,
        note: 'Access tokens are cached and auto-refreshed as needed.'
      }
    });

  } catch (error: any) {
    console.error('[Spotify Callback] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to complete OAuth setup',
        help: 'Try visiting /api/spotify/setup again to restart the process.'
      },
      { status: 500 }
    );
  }
}
