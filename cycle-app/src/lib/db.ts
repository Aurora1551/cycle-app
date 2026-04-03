import { supabase } from './supabase'
import type { VibeKey } from '../types'

/*
  Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor):

  create table if not exists profiles (
    id uuid references auth.users primary key,
    name text, treatment text, cycle_days integer,
    components text[], vibe text, genres text[],
    current_day integer default 1,
    started_at timestamptz default now()
  );
  create table if not exists daily_content (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    day_number integer,
    quote text, quote_author text,
    song_title text, song_artist text,
    journal_prompt text, affirmation text, gratitude_prompt text,
    breathing_opening text, breathing_closing text,
    generated_at timestamptz default now(),
    unique(user_id, day_number)
  );
  create table if not exists journal_entries (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    day_number integer, content text,
    created_at timestamptz default now()
  );
  alter table profiles enable row level security;
  alter table daily_content enable row level security;
  alter table journal_entries enable row level security;
  create policy "own" on profiles for all using (auth.uid() = id);
  create policy "own" on daily_content for all using (auth.uid() = user_id);
  create policy "own" on journal_entries for all using (auth.uid() = user_id);
*/

export interface DayContent {
  quote: string
  quoteAuthor: string
  songTitle: string
  songArtist: string
  journalPrompt: string
  affirmation: string
  gratitudePrompt: string
  breathingOpening?: string
  breathingClosing?: string
}

export interface ProfileData {
  name: string
  treatment: string
  cycleDays: number
  components: string[]
  vibe: VibeKey
  genres: string[]
  currentDay: number
}

export async function saveProfile(userId: string, data: ProfileData) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    name: data.name,
    treatment: data.treatment,
    cycle_days: data.cycleDays,
    components: data.components,
    vibe: data.vibe,
    genres: data.genres,
    current_day: data.currentDay,
  })
  if (error) console.error('saveProfile error:', error)
}

export async function getDayContent(userId: string, dayNumber: number): Promise<DayContent | null> {
  const { data, error } = await supabase
    .from('daily_content')
    .select('*')
    .eq('user_id', userId)
    .eq('day_number', dayNumber)
    .single()
  if (error || !data) return null
  return {
    quote: data.quote,
    quoteAuthor: data.quote_author,
    songTitle: data.song_title,
    songArtist: data.song_artist,
    journalPrompt: data.journal_prompt,
    affirmation: data.affirmation,
    gratitudePrompt: data.gratitude_prompt,
    breathingOpening: data.breathing_opening || undefined,
    breathingClosing: data.breathing_closing || undefined,
  }
}

export async function saveDayContent(userId: string, dayNumber: number, content: DayContent) {
  const { error } = await supabase.from('daily_content').upsert({
    user_id: userId,
    day_number: dayNumber,
    quote: content.quote,
    quote_author: content.quoteAuthor,
    song_title: content.songTitle,
    song_artist: content.songArtist,
    journal_prompt: content.journalPrompt,
    affirmation: content.affirmation,
    gratitude_prompt: content.gratitudePrompt,
    breathing_opening: content.breathingOpening || null,
    breathing_closing: content.breathingClosing || null,
  })
  if (error) console.error('saveDayContent error:', error)
}

export async function saveJournalEntry(userId: string, dayNumber: number, content: string) {
  const { error } = await supabase.from('journal_entries').upsert({
    user_id: userId,
    day_number: dayNumber,
    content,
  })
  if (error) console.error('saveJournalEntry error:', error)
}

export async function updateCurrentDay(userId: string, day: number) {
  const { error } = await supabase
    .from('profiles')
    .update({ current_day: day })
    .eq('id', userId)
  if (error) console.error('updateCurrentDay error:', error)
}
