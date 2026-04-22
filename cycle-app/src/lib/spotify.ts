/**
 * Spotify OAuth 2.0 with PKCE + track search helpers
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://developer.spotify.com/dashboard and log in.
 * 2. Create a new app called "Cycle" (or any name you like).
 * 3. In the app's settings, add your redirect URI to "Redirect URIs":
 *    - For local dev: http://localhost:5173/auth/spotify/callback
 *    - For production: https://your-domain.com/auth/spotify/callback
 * 4. Copy the Client ID from the Spotify dashboard.
 * 5. Set the following environment variables:
 *    - Frontend (Vite):  VITE_SPOTIFY_CLIENT_ID=<your client id>
 *    - Backend (Node):   SPOTIFY_CLIENT_ID=<your client id>
 *                        SPOTIFY_REDIRECT_URI=<your full redirect URI>
 *
 * Without these steps the OAuth flow will not work.
 */

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string || ''
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string || `${window.location.origin}/auth/spotify/callback`
// Minimum scopes needed — we only display the user's name and deep-link to tracks.
// Dropped: user-read-email (unused), user-modify-playback-state + streaming (Premium-only, unused).
// Existing users with the old broader grant are unaffected; their tokens stay valid.
const SPOTIFY_SCOPES = 'user-read-private'

// Debug: log what we got
console.log('[Spotify] Client ID:', SPOTIFY_CLIENT_ID ? SPOTIFY_CLIENT_ID.substring(0, 8) + '...' : 'EMPTY')
console.log('[Spotify] Configured:', !!SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_ID !== 'your-spotify-client-id')

if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === 'your-spotify-client-id') {
  console.warn('[Spotify] VITE_SPOTIFY_CLIENT_ID is not set or is still the placeholder value. Spotify integration will be disabled.')
}

// --- PKCE helpers ---

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, v => chars[v % chars.length]).join('')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  return crypto.subtle.digest('SHA-256', encoder.encode(plain))
}

function base64urlencode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// --- Public API ---

/** Returns true if Spotify Client ID is properly configured */
export function isSpotifyConfigured(): boolean {
  return !!SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_ID !== 'your-spotify-client-id'
}

/**
 * Starts the Spotify OAuth flow with PKCE and CSRF state.
 * Saves code_verifier and state to sessionStorage so the callback can verify them.
 */
export async function startSpotifyAuth(): Promise<void> {
  if (!isSpotifyConfigured()) {
    console.error('[Spotify] Cannot start auth — VITE_SPOTIFY_CLIENT_ID is not configured.')
    return
  }

  const codeVerifier = generateRandomString(64)
  const codeChallenge = base64urlencode(await sha256(codeVerifier))
  const state = generateRandomString(32)

  // Store verifier + state for callback
  sessionStorage.setItem('spotify_code_verifier', codeVerifier)
  localStorage.setItem('spotify_auth_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

/**
 * Verifies the state parameter from the Spotify callback.
 * Returns true if it matches what we stored, false otherwise.
 */
export function verifySpotifyState(returnedState: string | null): boolean {
  const savedState = localStorage.getItem('spotify_auth_state')
  if (!returnedState || !savedState || returnedState !== savedState) {
    console.error('[Spotify] State mismatch — possible CSRF attack.')
    return false
  }
  localStorage.removeItem('spotify_auth_state')
  return true
}

export async function handleSpotifyCallback(code: string, userId: string): Promise<{ success: boolean; displayName?: string; error?: string }> {
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier')
  if (!codeVerifier) return { success: false, error: 'No code verifier found' }

  try {
    const res = await fetch('/api/spotify/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri: SPOTIFY_REDIRECT_URI,
        userId,
      }),
    })

    const data = await res.json()
    sessionStorage.removeItem('spotify_code_verifier')

    if (data.success) {
      return { success: true, displayName: data.spotifyDisplayName }
    }
    return { success: false, error: data.error || 'Exchange failed' }
  } catch (err: any) {
    sessionStorage.removeItem('spotify_code_verifier')
    return { success: false, error: err.message }
  }
}

export async function getSpotifyStatus(userId: string): Promise<{ connected: boolean; displayName?: string }> {
  try {
    const res = await fetch(`/api/spotify/status/${encodeURIComponent(userId)}`)
    return await res.json()
  } catch {
    return { connected: false }
  }
}

export async function disconnectSpotify(userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/spotify/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

export interface SpotifyTrackResult {
  found: boolean
  trackId?: string
  trackUri?: string
  trackUrl?: string
  trackName?: string
  trackArtist?: string
}

export async function searchSpotifyTrack(userId: string, songTitle: string, songArtist: string): Promise<SpotifyTrackResult> {
  try {
    const res = await fetch('/api/spotify/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, query: `${songTitle} ${songArtist}` }),
    })
    // Server tells us the user needs to reconnect (token revoked or expired beyond refresh)
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}))
      if (data.reauth) {
        localStorage.setItem('spotify_connected', '0')
        localStorage.removeItem('spotify_display_name')
        localStorage.setItem('spotify_auth_error', 'Your Spotify session expired — reconnect to keep using it.')
      }
      return { found: false }
    }
    return await res.json()
  } catch {
    return { found: false }
  }
}
