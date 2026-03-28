import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isValid = typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http')

export const supabase = isValid
  ? createClient(supabaseUrl, supabaseAnonKey || '')
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

export const supabaseEnabled = isValid
