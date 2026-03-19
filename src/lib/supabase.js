import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey)
export const supabaseConfigError =
  'Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env (reinicia el servidor despues de cambiarlas).'

export const supabase = supabaseReady ? createClient(supabaseUrl, supabaseAnonKey) : null
