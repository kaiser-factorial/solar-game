import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import {
  state,
  setRemoteSync,
  type SaveData,
  type Character,
} from '../systems/save';

export const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export const configured = () => supabase !== null;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'scout';
}
const emailFor = (name: string) => `${slugify(name)}@solarscouts.local`;
const passFor = (pin: string) => `pin:${pin}:scouts`;

async function pushNow(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  await supabase.from('scouts_saves').upsert({
    id: user.id,
    data: state.save,
    updated_at: new Date().toISOString(),
  });
  await supabase.from('scouts_profiles').upsert({
    id: user.id,
    player_name: state.playerName,
    character: state.character ?? {},
  });
}
setRemoteSync(() => {
  void pushNow().catch(() => {
    /* offline — local save still holds everything */
  });
});

async function pullRemote(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const { data: profile } = await supabase
    .from('scouts_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  const { data: saveRow } = await supabase
    .from('scouts_saves')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (saveRow?.data?.version === 1) {
    const ch = profile?.character;
    state.adopt(
      saveRow.data as SaveData,
      ch && Object.keys(ch).length ? (ch as Character) : null,
      profile?.player_name ?? state.playerName
    );
  } else {
    // First sign-in for this account: adopt local progress as the cloud save.
    state.touch();
    state.flush();
  }
}

export async function signInWithNamePin(
  name: string,
  pin: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return { ok: false, error: 'Online saves are not set up yet — play as guest!' };
  }
  const email = emailFor(name);
  const password = passFor(pin);

  const si = await supabase.auth.signInWithPassword({ email, password });
  if (si.error) {
    const su = await supabase.auth.signUp({ email, password });
    if (su.error) {
      const msg = /already|registered/i.test(su.error.message)
        ? 'Wrong PIN for that name (or the name is taken).'
        : su.error.message;
      return { ok: false, error: msg };
    }
    if (!su.data.session) {
      return {
        ok: false,
        error:
          'Almost! A grown-up needs to turn off "Confirm email" in Supabase Auth settings.',
      };
    }
  }
  state.playerName = name;
  state.authed = true;
  await pullRemote();
  return { ok: true };
}

export async function restoreSession(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    state.authed = true;
    await pullRemote();
  }
}

export async function signOutUser(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
  state.authed = false;
  state.touch();
}
