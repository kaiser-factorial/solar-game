import Phaser from 'phaser';
import { state } from '../systems/save';
import { signOutUser } from '../lib/supabase';
import { txt, makeButton } from '../systems/ui';

const SCHEMES = [
  { id: 'keyboard', label: 'Keyboard (arrows / WASD)', ready: true },
  { id: 'mouse', label: 'Mouse', ready: false },
  { id: 'face', label: 'FaceMesh 🎥 (head tilt + open mouth!)', ready: false },
  { id: 'hand', label: 'HandMesh 🎥 (wave your hand!)', ready: false },
];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    this.add
      .rectangle(480, 270, 960, 540, 0x000000, 0.7)
      .setInteractive(); // swallow clicks under the panel
    this.add.rectangle(480, 270, 560, 420, 0x101530).setStrokeStyle(2, 0x3a4a8a);

    txt(this, 480, 95, 'Settings', 30, '#ffe08a');
    txt(this, 480, 135, 'Controls', 20, '#9fb0d8');

    SCHEMES.forEach((s, i) => {
      const y = 170 + i * 38;
      const active = state.save.settings.controls === s.id;
      txt(this, 250, y, active ? '●' : '○', 18, active ? '#7fd4ff' : '#3a4a8a').setOrigin(0, 0.5);
      txt(this, 280, y, s.label, 17, s.ready ? '#eaf2ff' : '#666a7a').setOrigin(0, 0.5);
      if (!s.ready) txt(this, 710, y, 'coming soon', 13, '#666a7a').setOrigin(1, 0.5);
    });

    txt(
      this,
      480,
      330,
      'Camera controls run only on your computer —\nno video is ever recorded or sent anywhere.',
      13,
      '#666a7a'
    );

    txt(
      this,
      480,
      380,
      state.authed
        ? `Playing as ${state.playerName} — progress saved online ✓`
        : `Playing as guest — progress saved on this computer`,
      15,
      '#9fb0d8'
    );

    if (state.authed) {
      makeButton(this, 480, 420, 'Sign out', () => {
        void signOutUser().then(() => {
          this.scene.stop('StarMap');
          this.scene.stop();
          this.scene.start('SignIn');
        });
      }, 16);
    } else {
      makeButton(this, 480, 420, 'Sign in / make account', () => {
        this.scene.stop('StarMap');
        this.scene.stop();
        this.scene.start('SignIn');
      }, 16);
    }

    makeButton(this, 480, 460, 'Close', () => this.scene.stop(), 16);
  }
}
