import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import type { BossDef, BossSpecialType } from '../content';
import type { Player } from './Player';
import { ensureBossTexture } from '../systems/textures';

/**
 * Walks at you; telegraphs (flashing pause), then charges — the baseline
 * every boss has. On top of that, bosses can define `specials` (cycled
 * round-robin on a cooldown), extra `phases` (2 = one enrage at 50% hp,
 * 3 = also a mid-escalation at ~66%), and `minionMonsterId`/`maxMinions`
 * for periodic reinforcements. See content.ts for the full schema.
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  def: BossDef;
  hp: number;
  maxHp: number;
  awake = false;
  private mode: 'walk' | 'telegraph' | 'charge' | 'pound-up' | 'pound-fall' = 'walk';
  private modeUntil = 0;
  private chargeDir = 1;
  private phase = 1;
  private auraColor = 0xffffff;
  private arenaMinX = -Infinity;
  private arenaMaxX = Infinity;
  private nextSpecialAt = 0;
  private specialIdx = 0;
  private nextMinionAt = 0;
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
  private shockwave(color: number, scaleTo: number, x = this.x, y = this.y): void {
    const ring = this.scene.add.circle(x, y, 22, color, 0);
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

  /**
   * Confines the boss to its (flat, obstacle-free) arena so it can never
   * wander into the bumpy overworld terrain and get physically wedged
   * against a step it has no way to climb (it never jumps over terrain).
   */
  setArenaBounds(minX: number, maxX: number): void {
    this.arenaMinX = minX;
    this.arenaMaxX = maxX;
  }

  wake(time: number): void {
    if (this.awake) return;
    this.awake = true;
    this.modeUntil = time + 1800;
    this.nextSpecialAt = time + BALANCE.bossRockCooldownMs;
    this.nextMinionAt = time + BALANCE.bossMinionCooldownMs;
    // dramatic entrance — non-physics flourishes only
    this.shockwave(this.auraColor, 7);
    this.scene.cameras.main.shake(250, 0.008);
  }

  /** 1 = base fight. Escalates as HP drops, up to def.phases (default 2). */
  private phaseFor(hpFraction: number): number {
    const totalPhases = this.def.phases ?? 2;
    if (totalPhases >= 3 && hpFraction <= 0.34) return 3;
    if (hpFraction <= 0.5) return 2;
    return 1;
  }

  private escalate(newPhase: number): void {
    this.phase = newPhase;
    this.setTint(0xff6b6b);
    this.scene.time.delayedCall(450, () => this.clearTint());
    if (this.glow) {
      this.scene.tweens.add({ targets: this.glow, outerStrength: 10, duration: 300, yoyo: true, repeat: 2 });
    }
    this.shockwave(0xff5533, 5);
    this.scene.cameras.main.shake(200, 0.006);
    if (this.def.midFightPowerup && newPhase === (this.def.phases ?? 2)) {
      this.scene.events.emit('boss-special', { type: 'powerupDrop', x: this.x, y: this.y - 60 });
    }
  }

  act(time: number, player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !this.active || !this.awake) return;
    const hpFraction = this.hp / this.maxHp;
    const newPhase = this.phaseFor(hpFraction);
    if (newPhase > this.phase) this.escalate(newPhase);
    const phaseMult = 1 + (this.phase - 1) * 0.35; // 1.0 / 1.35 / 1.7 across phases 1/2/3
    const speed = this.def.speed * phaseMult;

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
          this.modeUntil = time + BALANCE.bossChargeCooldownMs / phaseMult;
        }
        break;
      case 'pound-up':
        if (time > this.modeUntil) {
          this.mode = 'pound-fall';
        }
        break;
      case 'pound-fall':
        if (body.blocked.down) {
          this.shockwave(0xffaa33, 6);
          this.scene.cameras.main.shake(180, 0.01);
          this.scene.events.emit('boss-special', { type: 'groundPound', x: this.x, y: this.y });
          this.mode = 'walk';
          this.modeUntil = time + BALANCE.bossChargeCooldownMs / phaseMult;
        }
        break;
    }

    // Hard clamp, on top of the per-mode logic above: never let physics
    // substeps or a fast charge carry the boss past its arena.
    if (this.x < this.arenaMinX) {
      this.x = this.arenaMinX;
      if (body.velocity.x < 0) body.setVelocityX(0);
    } else if (this.x > this.arenaMaxX) {
      this.x = this.arenaMaxX;
      if (body.velocity.x > 0) {
        body.setVelocityX(0);
        if (this.mode === 'charge') {
          this.mode = 'walk';
          this.modeUntil = time + BALANCE.bossChargeCooldownMs / phaseMult;
        }
      }
    }

    const specials = this.def.specials ?? [];
    if (specials.length > 0 && this.mode === 'walk' && time > this.nextSpecialAt) {
      this.nextSpecialAt = time + BALANCE.bossRockCooldownMs / phaseMult;
      this.fireSpecial(specials[this.specialIdx % specials.length], player);
      this.specialIdx += 1;
    }

    if (this.def.minionMonsterId && time > this.nextMinionAt) {
      this.nextMinionAt = time + BALANCE.bossMinionCooldownMs / phaseMult;
      this.scene.events.emit('boss-special', {
        type: 'summonMinions',
        x: this.x,
        y: this.y,
        minionId: this.def.minionMonsterId,
        max: this.def.maxMinions ?? 2,
      });
    }
  }

  private fireSpecial(type: BossSpecialType, player: Player): void {
    switch (type) {
      case 'rockThrow':
        this.scene.events.emit('boss-special', { type: 'rockThrow', x: this.x, y: this.y - 20 });
        break;
      case 'projectileBarrage':
        this.scene.events.emit('boss-special', {
          type: 'projectileBarrage',
          x: this.x,
          y: this.y - 20,
          targetX: player.x,
          targetY: player.y,
        });
        break;
      case 'groundPound':
        this.mode = 'pound-up';
        this.modeUntil = this.scene.time.now + 260;
        (this.body as Phaser.Physics.Arcade.Body).setVelocityY(-420);
        break;
      case 'summonMinions':
        // handled on its own independent cooldown above (minionMonsterId), not the specials cycle
        break;
    }
  }

  /** Returns true when the boss dies. */
  hit(fromX: number, damage = 1): boolean {
    this.hp -= damage;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.velocity.x += this.x < fromX ? -60 : 60;
    this.scene.tweens.add({ targets: this, alpha: 0.4, yoyo: true, duration: 50, repeat: 1 });
    return this.hp <= 0;
  }
}
