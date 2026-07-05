import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import { state } from '../systems/save';
import type { InputIntent } from '../input/types';
import { audio } from '../systems/audio';

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing = 1;
  private nextAttackAt = 0;
  private invulnUntil = 0;
  private hitstunUntil = 0;
  private poweredUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 42);
    // Texture is 54px tall now (was 48) — 6px of headroom above the helmet
    // for the Antenna accessory — so the offset shifts down to match.
    body.setOffset(8, 10);
    this.setDepth(5);
  }

  /** True while a full-health mushroom/berry powerup is active. */
  isPowered(time: number): boolean {
    return time < this.poweredUntil;
  }

  /** Eating food at full health grants a temporary speed + attack boost instead of doing nothing. */
  activatePower(time: number): void {
    this.poweredUntil = time + BALANCE.powerupMs;
    this.setTint(0xffe066);
  }

  /** Returns true when this frame starts an attack swing. */
  applyIntent(intent: InputIntent, time: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.poweredUntil > 0 && time >= this.poweredUntil) {
      this.poweredUntil = 0;
      this.clearTint();
    }
    if (intent.moveX !== 0) {
      this.facing = intent.moveX > 0 ? 1 : -1;
      this.setFlipX(this.facing < 0);
    }
    // Skip the movement override during hitstun — otherwise this line stomps
    // the knockback velocity hurt() just set, on the very next frame.
    if (time >= this.hitstunUntil) {
      const speedMult = this.isPowered(time) ? BALANCE.powerupSpeedMult : 1;
      body.setVelocityX(intent.moveX * BALANCE.playerSpeed * speedMult);
    }
    if (intent.jump && body.blocked.down) {
      // Fixed launch velocity — peak height now genuinely depends on each
      // planet's own gravity (see BALANCE.jumpVelocity for why).
      body.setVelocityY(-BALANCE.jumpVelocity);
      audio.sfx('jump');
    }
    if (intent.attack && time >= this.nextAttackAt) {
      this.nextAttackAt = time + BALANCE.attackCooldownMs;
      return true;
    }
    return false;
  }

  hurt(amount: number, fromX: number, time: number): 'dead' | 'hit' | 'immune' {
    if (time < this.invulnUntil) return 'immune';
    this.invulnUntil = time + BALANCE.iframesMs;
    this.hitstunUntil = time + BALANCE.hitstunMs;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.x < fromX ? -BALANCE.knockback : BALANCE.knockback, -220);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      yoyo: true,
      repeat: 5,
      duration: BALANCE.iframesMs / 12,
      onComplete: () => this.setAlpha(1),
    });
    return state.damage(amount) ? 'dead' : 'hit';
  }
}
