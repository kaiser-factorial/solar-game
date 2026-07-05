import { useEffect, useState } from 'react';
import type Phaser from 'phaser';
import { Icon, Button } from 'puxel';
import type { Character } from '../systems/save';

const SLOTS: (keyof Character)[] = ['skin', 'hair', 'suit', 'visor', 'accessory', 'pattern'];
const SLOT_LABELS: Record<keyof Character, string> = {
  skin: 'Skin',
  hair: 'Hair',
  suit: 'Suit',
  visor: 'Visor',
  accessory: 'Accessory',
  pattern: 'Pattern',
};

interface SyncPayload {
  ch: Character;
  names: Record<string, string[]>;
}

/**
 * Chrome for the character creator — Phaser owns only the live sprite
 * preview (necessarily canvas-rendered); this panel is the interactive UI,
 * mirroring the Settings dialog's split. Phaser is the source of truth for
 * `ch` (it also has to regenerate the preview texture), so this just emits
 * intents and re-renders from the 'ss-creator-sync' echo — same one-way
 * data flow as the rest of the Phaser<->React bridge in this app.
 */
export function CharacterCreatorPanel({ game }: { game: Phaser.Game }) {
  const [sync, setSync] = useState<SyncPayload | null>(null);

  useEffect(() => {
    const onSync = (payload: SyncPayload) => setSync(payload);
    game.events.on('ss-creator-sync', onSync);
    return () => {
      game.events.off('ss-creator-sync', onSync);
    };
  }, [game]);

  if (!sync) return null;
  const { ch, names } = sync;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: '"Courier New", monospace',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 335,
          top: 165,
          right: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 28,
          rowGap: 14,
          pointerEvents: 'auto',
        }}
      >
        {SLOTS.map((slot) => (
          <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9fb0d8' }}>
            <span style={{ width: 72, fontSize: 15 }}>{SLOT_LABELS[slot]}</span>
            <Button
              icon
              size="sm"
              aria-label={`Previous ${SLOT_LABELS[slot]}`}
              onClick={() => game.events.emit('ss-creator-cycle', { slot, dir: -1 })}
            >
              <Icon name="angle-left" />
            </Button>
            <span style={{ width: 88, textAlign: 'center', color: '#eaf2ff', fontSize: 14 }}>
              {names[slot]?.[ch[slot]] ?? ''}
            </span>
            <Button
              icon
              size="sm"
              aria-label={`Next ${SLOT_LABELS[slot]}`}
              onClick={() => game.events.emit('ss-creator-cycle', { slot, dir: 1 })}
            >
              <Icon name="angle-right" />
            </Button>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 78,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
        {/* Deliberately small/unassuming per feedback — kids didn't know what
            the old giant dice button meant, so it shouldn't compete visually
            with the real call to action below. */}
        <Button variant="ghost" size="sm" onClick={() => game.events.emit('ss-creator-randomize')}>
          🎲 Randomize
        </Button>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 24,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
        <Button variant="primary" size="lg" pixel onClick={() => game.events.emit('ss-creator-done')}>
          🚀 BLAST OFF!
        </Button>
      </div>
    </div>
  );
}
