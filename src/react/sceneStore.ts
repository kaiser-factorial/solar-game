import type Phaser from 'phaser';
import type { SceneKey } from './GameOverlay';

/**
 * Plain module-level store for the active scene. Read via useSyncExternalStore
 * (not useState+useEffect), because React's effect commit is asynchronous
 * relative to Phaser's synchronous event dispatch — a fast Boot->StarMap
 * transition can otherwise emit 'ss-scene' before a useEffect subscription
 * even exists.
 *
 * Initialized to 'boot' rather than null: Phaser's own internal "start the
 * first scene" listener is registered on Core.Events.READY *during*
 * `new Phaser.Game()`, before mountReactOverlay() (called after construction
 * returns) gets to add its own READY listener. Listeners fire in
 * registration order, so Boot's create() — and its 'ss-scene' emit — always
 * runs before initSceneStore()'s listener below exists. Boot is always the
 * first scene by construction, so hardcoding it here is correct, not a guess.
 */
let current: SceneKey | null = 'boot';
const listeners = new Set<() => void>();

export function initSceneStore(game: Phaser.Game): void {
  game.events.on('ss-scene', (key: SceneKey) => {
    current = key;
    listeners.forEach((l) => l());
  });
}

export function getScene(): SceneKey | null {
  return current;
}

export function subscribeScene(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
