import Phaser from 'phaser';

/** Falling hazard chunk — no gravity (predictable fall speed), just drifts and spins. */
export class Debris extends Phaser.Physics.Arcade.Sprite {
  damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, damage: number, tint: number) {
    super(scene, x, y, 'debris');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = damage;
    this.setTint(tint).setDepth(6);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocity((Math.random() - 0.5) * 40, speed);
    scene.tweens.add({ targets: this, angle: 360, duration: 700 + Math.random() * 400, repeat: -1 });
  }
}
