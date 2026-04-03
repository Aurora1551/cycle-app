export interface DayContent {
  quote: string
  quoteAuthor: string
  songTitle: string
  songArtist: string
  songSpotifySearch?: string
  journalPrompt: string
  affirmation: string
  gratitudePrompt: string
  breathingOpening?: string
  breathingClosing?: string
}

export interface ProfileData {
  id: string
  name: string
  treatment: string
  cycleDays: number
  components: string[]
  vibe: string
  genres: string[]
  currentDay: number
}

export async function saveProfile(data: ProfileData) {
  try {
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (err) {
    console.error('saveProfile error:', err)
  }
}

export async function getProfile(userId: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(userId)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function saveJournalEntry(userId: string, dayNumber: number, content: string) {
  try {
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, dayNumber, content }),
    })
  } catch (err) {
    console.error('saveJournal error:', err)
  }
}

export async function deleteAccount(userId: string) {
  try {
    await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
  } catch (err) {
    console.error('deleteAccount error:', err)
  }
}
