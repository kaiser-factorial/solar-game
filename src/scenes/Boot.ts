import Phaser from 'phaser';
import { makeCoreTextures } from '../systems/textures';
import { state } from '../systems/save';
import { restoreSession } from '../lib/supabase';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    makeCoreTextures(this);
    state.loadLocal();
    // Title/loading visual is the React <Splash> overlay (src/react/GameOverlay.tsx) —
    // just keep the canvas dark behind it.
    this.game.events.emit('ss-scene', 'boot');

    // A local (no-session) restoreSession() resolves in single-digit ms, which
    // would make the splash flash invisibly — hold it for a minimum beat so it's
    // actually seen, without punishing genuinely slow connections (they just
    // wait for whichever finishes last, same as before).
    const minSplashMs = new Promise<void>((resolve) => this.time.delayedCall(700, resolve));
    Promise.all([
      restoreSession().catch(() => {
        /* offline is fine — local save carries the day */
      }),
      minSplashMs,
    ]).then(() => {
      this.scene.start(state.character ? 'StarMap' : 'SignIn');
    });
  }
}
