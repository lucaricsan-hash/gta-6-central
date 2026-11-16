import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const validUrl = url.startsWith('https://') && url.includes('.supabase.co');
const validKey = anonKey.length > 20 && !/SUA_CHAVE|SEU-PROJETO|placeholder/i.test(anonKey);

export const isSupabaseConfigured = validUrl && validKey;

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
