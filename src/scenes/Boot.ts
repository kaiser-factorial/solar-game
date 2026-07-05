import Phaser from 'phaser';
import { makeCoreTextures } from '../systems/textures';
import { state } from '../systems/save';
import { restoreSession } from '../lib/supabase';
import { txt, sprinkleStars } from '../systems/ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    makeCoreTextures(this);
    state.loadLocal();
    sprinkleStars(this);
    txt(this, 480, 250, 'MOON SHARD', 52, '#ffe08a');
    const loading = txt(this, 480, 310, 'warming up the rockets...', 18, '#9fb0d8');
    this.tweens.add({ targets: loading, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });

    restoreSession()
      .catch(() => {
        /* offline is fine — local save carries the day */
      })
      .finally(() => {
        this.scene.start(state.character ? 'StarMap' : 'SignIn');
      });
  }
}
