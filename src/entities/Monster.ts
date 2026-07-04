import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import type { MonsterDef } from '../content';
import type { Player } from './Player';

export class Monster extends Phaser.Physics.Arcade.Sprite {
  def: MonsterDef;
  hp: number;
  private dir = 1;
  private nextTurnAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: MonsterDef, tint: number) {
    super(scene, x, y, def.behavior === 'chase' ? 'golem' : 'blob');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.setTint(tint);
    this.setDepth(4);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width - 6, this.height - 4);
  }

  walk(time: number, player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !this.active) return;
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

  /** Returns true when the monster dies. */
  hit(fromX: number): boolean {
    this.hp -= 1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.x < fromX ? -180 : 180, -160);
    this.scene.tweens.add({ targets: this, alpha: 0.3, yoyo: true, duration: 60, repeat: 2 });
    return this.hp <= 0;
  }
}
