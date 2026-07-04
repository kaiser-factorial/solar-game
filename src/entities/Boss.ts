import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import type { BossDef } from '../content';
import type { Player } from './Player';

/** Walks at you; telegraphs (flashing pause), then charges. Phase 2 at half HP: faster, shorter rests. */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  def: BossDef;
  hp: number;
  maxHp: number;
  awake = false;
  private mode: 'walk' | 'telegraph' | 'charge' = 'walk';
  private modeUntil = 0;
  private chargeDir = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef, tint: number) {
    super(scene, x, y, 'boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = this.maxHp = def.hp;
    this.setTint(tint);
    this.setDepth(4);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(78, 46);
    body.setOffset(5, 24);
  }

  wake(time: number): void {
    if (this.awake) return;
    this.awake = true;
    this.modeUntil = time + 1800;
  }

  act(time: number, player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !this.active || !this.awake) return;
    const phase2 = this.hp <= this.maxHp / 2;
    const speed = this.def.speed * (phase2 ? 1.5 : 1);

    switch (this.mode) {
      case 'walk':
        this.chargeDir = player.x > this.x ? 1 : -1;
        body.setVelocityX(this.chargeDir * speed);
        this.setFlipX(this.chargeDir < 0);
        if (time > this.modeUntil) {
          this.mode = 'telegraph';
          this.modeUntil = time + BALANCE.bossTelegraphMs;
        }
        break;
      case 'telegraph':
        body.setVelocityX(0);
        this.setAlpha(Math.sin(time / 40) > 0 ? 1 : 0.45);
        if (time > this.modeUntil) {
          this.setAlpha(1);
          this.mode = 'charge';
          this.modeUntil = time + 700;
          this.chargeDir = player.x > this.x ? 1 : -1;
          this.setFlipX(this.chargeDir < 0);
        }
        break;
      case 'charge':
        body.setVelocityX(this.chargeDir * speed * BALANCE.bossChargeSpeedMult);
        if (time > this.modeUntil || body.blocked.left || body.blocked.right) {
          this.mode = 'walk';
          this.modeUntil =
            time + BALANCE.bossChargeCooldownMs * (phase2 ? 0.6 : 1);
        }
        break;
    }
  }

  /** Returns true when the boss dies. */
  hit(fromX: number): boolean {
    this.hp -= 1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x += this.x < fromX ? -60 : 60;
    this.scene.tweens.add({ targets: this, alpha: 0.4, yoyo: true, duration: 50, repeat: 1 });
    return this.hp <= 0;
  }
}
