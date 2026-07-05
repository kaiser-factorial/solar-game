// Verify the kid sign-in flow against the live Supabase project.
// Requires "Confirm email" to be OFF in Supabase Auth settings.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wfrxfhpiuxofmfdjpuvv.supabase.co',
  'sb_publishable_LgrswfOZ6Ujk9k9UzVir7Q_ZmEnX0LO'
);

const email = 'scout-testkid@test.example.com';
const password = 'pin:1234:scouts';

const su = await supabase.auth.signUp({ email, password });
console.log('signUp error:', su.error?.message ?? 'none');
console.log('signUp session:', su.data.session ? 'YES' : 'NO');

const si = await supabase.auth.signInWithPassword({ email, password });
console.log('signIn error:', si.error?.message ?? 'none');
console.log('signIn session:', si.data.session ? 'YES' : 'NO');

if (si.data.session) {
  const save = { version: 1, orbs: ['moon'], hearts: { max: 4, current: 4 } };
  const up = await supabase
    .from('scouts_saves')
    .upsert({ id: si.data.user.id, data: save });
  console.log('save upsert error:', up.error?.message ?? 'none');
  const read = await supabase
    .from('scouts_saves')
    .select('data')
    .eq('id', si.data.user.id)
    .maybeSingle();
  console.log('save readback orbs:', JSON.stringify(read.data?.data?.orbs));
}
