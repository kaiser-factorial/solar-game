// Supabase connection. The publishable key is safe to ship in client code —
// data access is protected by Row Level Security, not by key secrecy.
// Values are filled by setup; env vars override for local experiments.
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
export const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ?? '';
