// Stable per-device user identifier for server-side data (Spotify tokens, push
// subscriptions, favourites, journal, etc.).
//
// Priority:
//   1. Account email if the user has created/logged into an account.
//   2. A random UUID generated on first launch and persisted in localStorage.
//
// Why not the user's name? Names aren't unique (two Sarahs collide) and users
// can change them in Settings (which would orphan all their server-side data).
//
// When to call: anywhere you're about to send `userId` to the server.

const DEVICE_ID_KEY = 'cycle_device_id'
const EMAIL_KEY = 'cycle_account_email'

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    // Prefer crypto.randomUUID when available; fall back for older browsers.
    id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getAppUserId(): string {
  const email = localStorage.getItem(EMAIL_KEY)
  if (email && email.trim()) return email.trim().toLowerCase()
  return getDeviceId()
}
