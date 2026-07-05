import { useEffect, useState, useSyncExternalStore } from 'react';
import type Phaser from 'phaser';
import {
  ThemeProvider,
  HealthBar,
  Splash,
  GlobalAnimation,
  type GlobalAnimationVariant,
  type GlobalAnimationTone,
} from 'puxel';
import { state } from '../systems/save';
import { getScene, subscribeScene } from './sceneStore';

/**
 * DOM overlay rendered inside game.domContainer, above the Phaser canvas.
 * Gameplay code stays Phaser-only; it just emits 'ss-scene' / 'ss-celebrate'
 * on game.events, and this component reacts. See src/react/mount.tsx.
 */
export type SceneKey = 'boot' | 'signin' | 'creator' | 'starmap' | 'planet';

interface Celebration {
  id: number;
  variant: GlobalAnimationVariant;
  tone?: GlobalAnimationTone;
}

let celebrationSeq = 0;

export function GameOverlay({ game }: { game: Phaser.Game }) {
  // useSyncExternalStore (not useState+useEffect) because 'ss-scene' can fire
  // before a React effect would have subscribed — see sceneStore.ts.
  const scene = useSyncExternalStore(subscribeScene, getScene);
  const [hearts, setHearts] = useState(() => ({ ...state.save.hearts }));
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  useEffect(() => {
    const onCelebrate = (payload: { variant: GlobalAnimationVariant; tone?: GlobalAnimationTone }) => {
      celebrationSeq += 1;
      setCelebration({ id: celebrationSeq, ...payload });
    };
    game.events.on('ss-celebrate', onCelebrate);
    const unsub = state.onChange(() => setHearts({ ...state.save.hearts }));
    return () => {
      game.events.off('ss-celebrate', onCelebrate);
      unsub();
    };
  }, [game]);

  const showHearts = scene === 'planet' || scene === 'starmap';
  const heartsTop = scene === 'starmap' ? 58 : 8;

  return (
    <ThemeProvider defaultTheme="arcade" storageKey={null}>
      {scene === 'boot' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Splash
            title="Moon Shard"
            subtitle="an interplanetary treasure hunt"
            prompt="warming up the rockets..."
            shader
          />
        </div>
      )}
      {showHearts && (
        <div
          className="px-pixelated"
          style={{ position: 'absolute', left: 16, top: heartsTop, width: 168, pointerEvents: 'none' }}
        >
          {/* cells=max so each pip is exactly one heart (the default cells=10
              is meant for percentage-style HP pools, not our small 3-10 count) */}
          <HealthBar kind="hp" value={hearts.current} max={hearts.max} cells={hearts.max} label="HP" />
        </div>
      )}
      {celebration && (
        <GlobalAnimation
          key={celebration.id}
          variant={celebration.variant}
          tone={celebration.tone}
          loop={false}
          onComplete={() => setCelebration(null)}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />
      )}
    </ThemeProvider>
  );
}
