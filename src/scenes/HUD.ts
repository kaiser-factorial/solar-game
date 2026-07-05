import Phaser from 'phaser';
import { state } from '../systems/save';
import { PLANETS, ITEMS, ORB_COLORS, FOOD_HEALS } from '../content';
import { txt } from '../systems/ui';

export class HUDScene extends Phaser.Scene {
  private planetId = '';
  private row!: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Container | null = null;
  private bossBar!: Phaser.GameObjects.Container;
  private unsub: (() => void) | null = null;

  constructor() {
    super('HUD');
  }

  init(data: { planetId: string }): void {
    this.planetId = data.planetId;
  }

  create(): void {
    this.row = this.add.container(0, 0).setDepth(100);
    this.bossBar = this.add.container(0, 0).setDepth(100).setVisible(false);
    this.render();

    this.unsub = state.onChange(() => this.render());
    this.game.events.on('ss-boss', this.onBoss, this);
    this.input.keyboard!.on('keydown-I', () => this.togglePanel());

    txt(this, 12, 528, '←→/AD move  ·  ␣ jump  ·  X attack  ·  E use  ·  F eat  ·  I bag', 13, '#9fb0d8')
      .setOrigin(0, 0.5)
      .setAlpha(0.75)
      .setDepth(100);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsub?.();
      this.game.events.off('ss-boss', this.onBoss, this);
    });
  }

  // Hearts are the React <HealthBar> overlay (src/react/GameOverlay.tsx) — this
  // row now only carries shard trophies + the treasure/food counters below.
  private render(): void {
    this.row.removeAll(true);
    state.save.orbs.forEach((id, i) => {
      this.row.add(this.add.image(936 - i * 30, 20, 'orb').setTint(ORB_COLORS[id] ?? 0xffffff));
    });

    const planet = PLANETS[this.planetId];
    if (planet) {
      const tId = planet.collectibles.treasure.id;
      const treasure = state.save.inventory[tId] ?? 0;
      const food = Object.keys(FOOD_HEALS).reduce((n, id) => n + (state.save.inventory[id] ?? 0), 0);
      this.row.add(this.add.image(24, 50, 'gem').setTint(ITEMS[tId].accent).setScale(0.8));
      this.row.add(txt(this, 56, 50, `x${treasure}`, 15).setOrigin(0, 0.5));
      this.row.add(this.add.image(110, 50, 'food').setScale(0.9));
      this.row.add(txt(this, 140, 50, `x${food}`, 15).setOrigin(0, 0.5));
    }
    if (this.panel) this.buildPanel(); // keep bag contents live while open
  }

  private onBoss(info: { name: string; hp: number; max: number } | null): void {
    this.bossBar.removeAll(true);
    if (!info) {
      this.bossBar.setVisible(false);
      return;
    }
    this.bossBar.setVisible(true);
    this.bossBar.add(txt(this, 480, 66, info.name, 18, '#ff9e9e'));
    this.bossBar.add(this.add.rectangle(480, 88, 404, 16, 0x30122a));
    const w = Math.max(0, 400 * (info.hp / info.max));
    this.bossBar.add(this.add.rectangle(280 + w / 2, 88, w, 12, 0xff3355));
  }

  private togglePanel(): void {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
      return;
    }
    this.buildPanel();
  }

  private buildPanel(): void {
    this.panel?.destroy();
    const c = this.add.container(0, 0).setDepth(150);
    c.add(this.add.rectangle(480, 270, 420, 320, 0x101530, 0.95).setStrokeStyle(2, 0x3a4a8a));
    c.add(txt(this, 480, 135, 'Your bag', 24, '#ffe08a'));

    const entries = Object.entries(state.save.inventory).filter(([, n]) => n > 0);
    if (entries.length === 0) c.add(txt(this, 480, 270, 'Nothing yet — go explore!', 16, '#9fb0d8'));

    entries.slice(0, 6).forEach(([id, n], i) => {
      const y = 180 + i * 42;
      const info = ITEMS[id];
      if (!info) return;
      const icon =
        info.kind === 'treasure'
          ? this.add.image(310, y, 'gem').setTint(info.accent)
          : this.add.image(310, y, 'food');
      c.add(icon);
      c.add(txt(this, 340, y, `${info.name}  x${n}`, 17).setOrigin(0, 0.5));
      if (info.kind === 'food') {
        const eat = txt(this, 650, y, '[eat]', 15, '#8aff9e').setOrigin(1, 0.5);
        eat.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          state.eatFood({ [id]: info.heals ?? 1 });
        });
        c.add(eat);
      }
    });
    c.add(txt(this, 480, 415, 'press I to close', 13, '#666a7a'));
    this.panel = c;
  }
}
