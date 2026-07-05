// Supabase connection. The publishable key is safe to ship in client code —
// data access is protected by Row Level Security, not by key secrecy.
// Env vars override for local experiments against another project.
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://ennsyajamfuslvbkunns.supabase.co';
export const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ??
  'sb_publishable_NqdxkwshFOmdYQRrGDK8mA_1FMGseAu';
