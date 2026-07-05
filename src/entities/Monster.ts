import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import type { MonsterDef } from '../content';
import type { Player } from './Player';

const TEXTURE_BY_BEHAVIOR: Record<MonsterDef['behavior'], string> = {
  wander: 'blob',
  chase: 'golem',
  fly: 'flyer',
  'hover-shoot': 'shooter',
  jumper: 'jumper',
  'flame-dropper': 'dropper',
};

/**
 * The flame-dropper clamps its hover to this many tiles above its spawn ground
 * regardless of the JSON flyHeight, so a jump + up-aimed slash can always reach
 * it — even on the heaviest planet (Jupiter's jump peaks at ~2.5 tiles).
 */
const FLAME_DROP_MAX_TILES = 2;

export class Monster extends Phaser.Physics.Arcade.Sprite {
  def: MonsterDef;
  hp: number;
  private dir = 1;
  private nextTurnAt = 0;
  private nextActionAt = 0;
  private homeY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: MonsterDef, tint: number) {
    super(scene, x, y, TEXTURE_BY_BEHAVIOR[def.behavior] ?? 'blob');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    // Flame-droppers clamp their hover low enough to stay killable on every
    // planet; other flyers honour their JSON flyHeight as-is.
    const hoverTiles =
      def.behavior === 'flame-dropper'
        ? Math.min(def.flyHeight ?? FLAME_DROP_MAX_TILES, FLAME_DROP_MAX_TILES)
        : def.flyHeight ?? 0;
    this.homeY = y - hoverTiles * BALANCE.tile;
    this.nextActionAt = 800 + Math.random() * (def.actionCooldownMs ?? 2000);
    this.setTint(tint);
    this.setDepth(4);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width - 6, this.height - 4);
    if (def.behavior === 'fly' || def.behavior === 'hover-shoot' || def.behavior === 'flame-dropper') {
      body.setAllowGravity(false);
      this.y = this.homeY;
    }
  }

  act(time: number, player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !this.active) return;
    switch (this.def.behavior) {
      case 'wander':
      case 'chase':
        this.groundMove(time, body, player);
        break;
      case 'fly':
        this.flyMove(time, body);
        break;
      case 'hover-shoot':
        this.hoverAndShoot(time, body, player);
        break;
      case 'jumper':
        this.jumpMove(time, body, player);
        break;
      case 'flame-dropper':
        this.flameDropMove(time, body);
        break;
    }
  }

  private groundMove(time: number, body: Phaser.Physics.Arcade.Body, player: Player): void {
    const chasing =
      this.def.behavior === 'chase' &&
      Math.abs(player.x - this.x) < BALANCE.monsterAggroRange &&
      Math.abs(player.y - this.y) < 120;
    if (chasing) {
      this.dir = player.x > this.x ? 1 : -1;
    } else if (time > this.nextTurnAt || body.blocked.left || body.blocked.right) {
      if (body.blocked.left) this.dir = 1;
      else if (body.blocked.right) this.dir = -1;
      else this.dir = Math.random() < 0.5 ? -1 : 1;
      this.nextTurnAt = time + 1400 + Math.random() * 1600;
    }
    body.setVelocityX(this.dir * this.def.speed * (chasing ? 1.5 : 1));
    this.setFlipX(this.dir < 0);
  }

  /** Drifts side to side at a fixed altitude, ignoring gravity entirely. */
  private flyMove(time: number, body: Phaser.Physics.Arcade.Body): void {
    if (time > this.nextTurnAt) {
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.nextTurnAt = time + 900 + Math.random() * 1200;
    }
    body.setVelocityX(this.dir * this.def.speed);
    body.setVelocityY((this.homeY - this.y) * 4); // gentle spring back to hover height
    this.setFlipX(this.dir < 0);
  }

  /** Holds altitude near its spawn point and periodically fires at the player. */
  private hoverAndShoot(time: number, body: Phaser.Physics.Arcade.Body, player: Player): void {
    body.setVelocityX(Math.sin(time / 600) * this.def.speed * 0.4);
    body.setVelocityY((this.homeY - this.y) * 4);
    this.setFlipX(player.x < this.x);
    if (time > this.nextActionAt) {
      this.nextActionAt = time + (this.def.actionCooldownMs ?? 2400);
      this.scene.events.emit('monster-special', { type: 'shoot', x: this.x, y: this.y, targetX: player.x, targetY: player.y });
    }
  }

  /**
   * Hovers LOW (clamped in the constructor to a reachable height) and drifts
   * side to side calmly, dropping a flame straight down on a cooldown. Being
   * within jump reach is the whole point — it's a normal Monster with hp, so a
   * jump + up-aimed slash kills it on any planet.
   */
  private flameDropMove(time: number, body: Phaser.Physics.Arcade.Body): void {
    if (time > this.nextTurnAt) {
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.nextTurnAt = time + 1400 + Math.random() * 1400;
    }
    body.setVelocityX(this.dir * this.def.speed * 0.5); // calmer drift than a plain flyer
    body.setVelocityY((this.homeY - this.y) * 4); // spring back to hover height
    this.setFlipX(this.dir < 0);
    if (time > this.nextActionAt) {
      this.nextActionAt = time + (this.def.actionCooldownMs ?? 2400);
      this.scene.events.emit('monster-special', { type: 'drop-flame', x: this.x, y: this.y });
    }
  }

  /** Idles, then leaps toward the player on a cooldown — ground-bound but unpredictable. */
  private jumpMove(time: number, body: Phaser.Physics.Arcade.Body, player: Player): void {
    if (body.blocked.down) body.setVelocityX(0);
    if (time > this.nextActionAt && body.blocked.down) {
      this.nextActionAt = time + (this.def.actionCooldownMs ?? 1800);
      const dir = player.x > this.x ? 1 : -1;
      body.setVelocity(dir * this.def.speed, -320);
      this.setFlipX(dir < 0);
    }
  }

  /** Returns true when the monster dies. */
  hit(fromX: number, damage = 1): boolean {
    this.hp -= damage;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.x < fromX ? -180 : 180, -160);
    this.scene.tweens.add({ targets: this, alpha: 0.3, yoyo: true, duration: 60, repeat: 2 });
    return this.hp <= 0;
  }
}
