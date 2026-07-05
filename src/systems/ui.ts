import Phaser from 'phaser';
import { audio } from './audio';

export const FONT = '"Courier New", monospace';

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 18,
  color = '#eaf2ff'
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color })
    .setOrigin(0.5);
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  cb: () => void,
  size = 20
): Phaser.GameObjects.Text {
  const t = txt(scene, x, y, label, size)
    .setPadding(14, 8, 14, 8)
    .setStyle({ backgroundColor: '#1c3f7a' });
  t.setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      audio.sfx('click');
      cb();
    })
    .on('pointerover', () => t.setStyle({ backgroundColor: '#2a58a8' }))
    .on('pointerout', () => t.setStyle({ backgroundColor: '#1c3f7a' }));
  return t;
}

/** Decorative background stars (cosmetic randomness is fine — terrain is seeded). */
export function sprinkleStars(
  scene: Phaser.Scene,
  n = 90,
  scrollFactor = 0,
  width = 960,
  height = 540
): void {
  for (let i = 0; i < n; i++) {
    scene.add
      .image(Math.random() * width, Math.random() * height, 'star')
      .setAlpha(0.25 + Math.random() * 0.7)
      .setScale(1 + Math.random() * 1.5)
      .setScrollFactor(scrollFactor)
      .setDepth(-10);
  }
}

export function toast(scene: Phaser.Scene, msg: string): void {
  const t = txt(scene, 480, 470, msg, 18, '#ffe08a')
    .setScrollFactor(0)
    .setDepth(200)
    .setAlpha(0);
  scene.tweens.add({
    targets: t,
    alpha: 1,
    y: 455,
    duration: 200,
    yoyo: true,
    hold: 1400,
    onComplete: () => t.destroy(),
  });
}
