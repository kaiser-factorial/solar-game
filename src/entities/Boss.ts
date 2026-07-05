import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import type { BossDef } from '../content';
import type { Player } from './Player';
import { ensureBossTexture } from '../systems/textures';

/** Walks at you; telegraphs (flashing pause), then charges. Phase 2 at half HP: faster, shorter rests. */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  def: BossDef;
  hp: number;
  maxHp: number;
  awake = false;
  private mode: 'walk' | 'telegraph' | 'charge' = 'walk';
  private modeUntil = 0;
  private chargeDir = 1;
  private enraged = false;
  private auraColor = 0xffffff;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private glow: any = null;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef, tint: number) {
    super(scene, x, y, ensureBossTexture(scene, def.id));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = this.maxHp = def.hp;
    this.auraColor = tint;
    this.setDepth(4);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bw = Math.round(this.width * 0.7);
    const bh = Math.round(this.height * 0.5);
    body.setSize(bw, bh);
    body.setOffset(Math.round((this.width - bw) / 2), this.height - bh);
    // Menacing aura (WebGL only; art still reads great on canvas).
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.glow = (this as any).postFX?.addGlow?.(tint, 5, 0, false, 0.1, 14);
    } catch {
      /* no postFX pipeline — skip */
    }
  }

  /**
   * A visual-only shockwave ring. IMPORTANT: never scale/tween the boss sprite
   * itself for drama — scaling an Arcade sprite also scales its collision body,
   * which shoves it into the ground tiles and ejects it through the floor.
   */
  private shockwave(color: number, scaleTo: number): void {
    const ring = this.scene.add.circle(this.x, this.y, 22, color, 0);
    ring.setStrokeStyle(4, color, 0.9).setDepth(3);
    this.scene.tweens.add({
      targets: ring,
      scale: scaleTo,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });
  }

  wake(time: number): void {
    if (this.awake) return;
    this.awake = true;
    this.modeUntil = time + 1800;
    // dramatic entrance — non-physics flourishes only
    this.shockwave(this.auraColor, 7);
    this.scene.cameras.main.shake(250, 0.008);
  }

  private enrage(): void {
    this.enraged = true;
    this.setTint(0xff6b6b);
    this.scene.time.delayedCall(450, () => this.clearTint());
    if (this.glow) {
      this.scene.tweens.add({
        targets: this.glow,
        outerStrength: 10,
        duration: 300,
        yoyo: true,
        repeat: 2,
      });
    }
    this.shockwave(0xff5533, 5);
    this.scene.cameras.main.shake(200, 0.006);
  }

  act(time: number, player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !this.active || !this.awake) return;
    const phase2 = this.hp <= this.maxHp / 2;
    if (phase2 && !this.enraged) this.enrage();
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
