import { useEffect, useState, useSyncExternalStore } from 'react';
import type Phaser from 'phaser';
import { Dialog, Radio, Switch, ThemeSwitcher, Icon, Button, Fieldset } from 'puxel';
import { state } from '../systems/save';
import { audio } from '../systems/audio';
import { signOutUser } from '../lib/supabase';
import { isSettingsOpen, setSettingsOpen, subscribeSettings } from './settingsStore';

const SCHEMES = [
  { id: 'keyboard', label: 'Keyboard (arrows / WASD)', ready: true },
  { id: 'mouse', label: 'Mouse', ready: false },
  { id: 'face', label: 'FaceMesh 🎥 (head tilt + open mouth!)', ready: false },
  { id: 'hand', label: 'HandMesh 🎥 (wave your hand!)', ready: false },
] as const;

/** Sends every active scene back to SignIn — same navigation Settings used to do as a Phaser scene. */
function goToSignIn(game: Phaser.Game): void {
  game.scene.getScenes(true).forEach((s) => {
    if (s.scene.key !== 'Boot') game.scene.stop(s.scene.key);
  });
  game.scene.start('SignIn');
}

export function SettingsPanel({ game }: { game: Phaser.Game }) {
  const open = useSyncExternalStore(subscribeSettings, isSettingsOpen);
  const [soundOn, setSoundOn] = useState(audio.enabled);
  const [authed, setAuthed] = useState(state.authed);

  useEffect(() => {
    // audio.toggle() can also be triggered by the M key mid-game — stay in sync.
    const unsub = state.onChange(() => {
      setSoundOn(audio.enabled);
      setAuthed(state.authed);
    });
    return unsub;
  }, []);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={() => setSettingsOpen(false)} title="Settings">
      <Fieldset title="Controls" align="left">
        {SCHEMES.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Radio
              name="control-scheme"
              arcade
              disabled={!s.ready}
              checked={state.save.settings.controls === s.id}
              onChange={() => {
                if (!s.ready) return;
                state.save.settings.controls = s.id;
                state.touch();
              }}
              label={s.label}
            />
            {!s.ready && <span style={{ fontSize: 12, opacity: 0.6 }}>coming soon</span>}
          </div>
        ))}
        <p style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
          Camera controls run only on your computer — no video is ever recorded or sent anywhere.
        </p>
      </Fieldset>

      <Fieldset title="Sound" align="left">
        <Switch
          label="Sound"
          checked={soundOn}
          onChange={() => setSoundOn(audio.toggle())}
        />
      </Fieldset>

      <Fieldset title="Theme" align="left">
        <ThemeSwitcher label="Pick a look:" />
      </Fieldset>

      <Fieldset title="Account" align="left">
        <p style={{ fontSize: 14, marginBottom: 10 }}>
          {authed
            ? `Playing as ${state.playerName} — progress saved online ✓`
            : 'Playing as guest — progress saved on this computer'}
        </p>
        {authed ? (
          <Button
            variant="secondary"
            onClick={() => {
              void signOutUser().then(() => {
                setSettingsOpen(false);
                goToSignIn(game);
              });
            }}
          >
            <Icon name="user" /> Sign out
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              setSettingsOpen(false);
              goToSignIn(game);
            }}
          >
            <Icon name="user" /> Sign in / make account
          </Button>
        )}
      </Fieldset>

      <Button variant="ghost" onClick={() => setSettingsOpen(false)} style={{ marginTop: 8 }}>
        <Icon name="times" /> Close
      </Button>
    </Dialog>
  );
}
