// Supabase connection ("catchall" project). The publishable key is safe to
// ship in client code — data access is protected by Row Level Security, not
// by key secrecy. Env vars override for local experiments.
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://wfrxfhpiuxofmfdjpuvv.supabase.co';
export const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ??
  'sb_publishable_LgrswfOZ6Ujk9k9UzVir7Q_ZmEnX0LO';
