import Phaser from 'phaser';

/** Which way a debris chunk travels — see DebrisDef.direction. */
export type DebrisDirection = 'fall' | 'horizontal';

/**
 * Hazard chunk — no gravity (predictable travel speed). 'fall' rains straight
 * down with a little sideways wobble; 'horizontal' flies flat across the
 * screen from the edge it spawned at. The texture key defaults to 'debris'
 * (white → tinted per planet) but callers can pass a full-color key like
 * 'flame' that should NOT be tinted.
 *
 * Adding a body to an Arcade physics group resets its velocity/gravity to the
 * group defaults, so the caller must add() the debris to its group FIRST and
 * then call launch() to set the motion — see PlanetScene's debris spawns.
 */
export class Debris extends Phaser.Physics.Arcade.Sprite {
  damage: number;
  direction: DebrisDirection;
  private speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    speed: number,
    damage: number,
    tint: number | null,
    texture = 'debris',
    direction: DebrisDirection = 'fall'
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = damage;
    this.direction = direction;
    this.speed = speed;
    if (tint !== null) this.setTint(tint);
    this.setDepth(6);
  }

  /** Apply gravity/velocity/spin. Call AFTER adding to a physics group. */
  launch(): this {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    if (this.direction === 'horizontal') {
      // Fly flat across the screen; the sign of `speed` picks the direction.
      body.setVelocity(this.speed, 0);
      // Face the way it's travelling so an oriented sprite (e.g. a flame) looks right.
      this.setFlipX(this.speed < 0);
    } else {
      body.setVelocity((Math.random() - 0.5) * 40, this.speed);
      this.scene.tweens.add({ targets: this, angle: 360, duration: 700 + Math.random() * 400, repeat: -1 });
    }
    return this;
  }
}
