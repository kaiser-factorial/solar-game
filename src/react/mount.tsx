import Phaser from 'phaser';
import { createRoot } from 'react-dom/client';
import { GameOverlay } from './GameOverlay';
import { initSceneStore } from './sceneStore';
import 'puxel/styles.css';

/**
 * Mounts the React/Puxel overlay into Phaser's own managed DOM container
 * (game.domContainer), so it inherits the exact same scale/position
 * transform Phaser applies to keep the canvas fitted — no manual math.
 */
export function mountReactOverlay(game: Phaser.Game): void {
  const attach = () => {
    const container = game.domContainer;
    if (!container) return; // dom.createContainer wasn't enabled — nothing to mount into
    // Registered before React exists, so it can never miss an early scene emit.
    initSceneStore(game);
    let root = container.querySelector('#react-overlay-root') as HTMLDivElement | null;
    if (!root) {
      root = document.createElement('div');
      root.id = 'react-overlay-root';
      Object.assign(root.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
      container.appendChild(root);
    }
    createRoot(root).render(<GameOverlay game={game} />);
  };
  game.events.once(Phaser.Core.Events.READY, attach);
}
