import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import { mulberry32 } from '../systems/rng';
import { state } from '../systems/save';
import { PLANETS, ORB_COLORS, FOOD_HEALS, hexToInt, type PlanetDef } from '../content';
import { ensurePlayerTexture } from '../systems/textures';
import { createControls } from '../input/manager';
import type { ControlScheme } from '../input/types';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { Boss } from '../entities/Boss';
import { txt, sprinkleStars, toast } from '../systems/ui';

const TILE = BALANCE.tile;
const H = BALANCE.worldHeight;

export class PlanetScene extends Phaser.Scene {
  private planetId!: string;
  private def!: PlanetDef;
  private heights: number[] = [];
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private monsters!: Phaser.Physics.Arcade.Group;
  private slashes!: Phaser.Physics.Arcade.Group;
  private player!: Player;
  private boss: Boss | null = null;
  private controls!: ControlScheme;
  private rocketX = 0;
  private spawnPoint = { x: 0, y: 0 };
  private arenaX = 0;
  private rocketHint!: Phaser.GameObjects.Text;
  private pickupsSinceFlush = 0;

  constructor() {
    super('Planet');
  }

  init(data: { planetId: string }): void {
    this.planetId = data.planetId;
  }

  create(): void {
    this.def = PLANETS[this.planetId];
    const def = this.def;
    const accent = hexToInt(def.palette.accent);
    const groundCol = hexToInt(def.palette.ground);
    const cols = def.terrain.width;
    const W = cols * TILE;

    this.physics.world.gravity.y = Math.max(380, 2600 * def.gravity);
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor(def.palette.sky);
    sprinkleStars(this, 160, 0.25, W * 0.25 + 960, H);

    // --- terrain (seeded: identical on every visit & device) ---
    const rng = mulberry32(def.terrain.seed);
    let h = 4;
    for (let i = 0; i < cols; i++) {
      if (i < 6) h = 4;
      else if (i >= cols - 26) h = 3; // flat boss arena
      else {
        const r = rng();
        if (r < 0.3) h -= 1;
        else if (r < 0.6) h += 1;
        h = Phaser.Math.Clamp(h, 2, 8);
      }
      this.heights.push(h);
    }
    this.ground = this.physics.add.staticGroup();
    for (let i = 0; i < cols; i++) {
      const hh = this.heights[i] * TILE;
      const img = this.ground.create(i * TILE + TILE / 2, H - hh / 2, 'tile') as Phaser.Physics.Arcade.Image;
      img.setDisplaySize(TILE, hh).setTint(groundCol).refreshBody();
    }
    const groundTop = (col: number) => H - this.heights[col] * TILE;

    // --- landing site ---
    this.rocketX = 3 * TILE + TILE / 2;
    this.add.image(this.rocketX, groundTop(3) - 31, 'rocket').setDepth(3);
    this.spawnPoint = { x: this.rocketX + 40, y: groundTop(3) - 60 };

    // --- player + controls ---
    const texKey = ensurePlayerTexture(this, state.character ?? { skin: 0, hair: 1, suit: 2, visor: 0 });
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y, texKey);
    this.controls = createControls(this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // --- collectibles (seeded placement) ---
    const pickups = this.physics.add.staticGroup();
    const scatter = (
      texture: string,
      tint: number | null,
      itemId: string,
      kind: 'treasure' | 'food',
      count: number
    ) => {
      for (let n = 0; n < count; n++) {
        const col = 8 + Math.floor(rng() * (cols - 38));
        const item = pickups.create(col * TILE + TILE / 2, groundTop(col) - 42, texture) as Phaser.Physics.Arcade.Image;
        if (tint !== null) item.setTint(tint);
        item.setData({ itemId, kind });
        this.tweens.add({
          targets: item,
          y: item.y - 6,
          yoyo: true,
          repeat: -1,
          duration: 700 + n * 60,
          ease: 'Sine.inOut',
        });
      }
    };
    scatter('gem', accent, def.collectibles.treasure.id, 'treasure', def.collectibles.treasure.count);
    scatter('food', null, def.collectibles.food.id, 'food', def.collectibles.food.count);

    // --- monsters (seeded spawn, lively movement) ---
    this.monsters = this.physics.add.group();
    for (const mdef of def.monsters) {
      for (let n = 0; n < mdef.count; n++) {
        const col = 12 + Math.floor(rng() * (cols - 44));
        const m = new Monster(this, col * TILE + TILE / 2, groundTop(col) - 40, mdef, accent);
        m.setCollideWorldBounds(true);
        this.monsters.add(m);
      }
    }

    // --- boss (skipped if already beaten) ---
    this.arenaX = (cols - 24) * TILE;
    if (!state.save.planets[this.planetId]?.bossDefeated) {
      this.boss = new Boss(this, (cols - 8) * TILE, groundTop(cols - 8) - 60, def.boss, accent);
      this.boss.setCollideWorldBounds(true);
    }

    // --- physics wiring ---
    this.slashes = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.monsters, this.ground);
    if (this.boss) this.physics.add.collider(this.boss, this.ground);

    this.physics.add.overlap(this.player, pickups, (_p, item) => {
      const it = item as Phaser.Physics.Arcade.Image;
      this.collect(it.getData('itemId') as string, it.getData('kind') as string, it.x, it.y);
      it.destroy();
    });
    this.physics.add.overlap(this.player, this.monsters, (_p, m) => {
      const mon = m as Monster;
      this.hurtPlayer(mon.def.damage, mon.x);
    });
    this.physics.add.overlap(this.slashes, this.monsters, (s, m) => {
      const slash = s as Phaser.Physics.Arcade.Image;
      const mon = m as Monster;
      const hits = slash.getData('hits') as Set<Monster>;
      if (hits.has(mon)) return;
      hits.add(mon);
      if (mon.hit(this.player.x)) {
        this.poof(mon.x, mon.y, accent);
        mon.destroy();
      }
    });
    if (this.boss) {
      this.physics.add.overlap(this.player, this.boss, () => {
        if (this.boss?.awake) this.hurtPlayer(def.boss.damage, this.boss.x);
      });
      this.physics.add.overlap(this.slashes, this.boss, (s, b) => {
        const slash = s as Phaser.Physics.Arcade.Image;
        const boss = b as Boss;
        const hits = slash.getData('hits') as Set<Boss>;
        if (hits.has(boss)) return;
        hits.add(boss);
        this.game.events.emit('ss-boss', { name: def.boss.name, hp: Math.max(0, boss.hp - 1), max: boss.maxHp });
        if (boss.hit(this.player.x)) this.bossDefeated();
      });
    }

    // --- extra keys (UI-level, not gameplay movement) ---
    this.input.keyboard!.on('keydown-F', () => {
      const ate = state.eatFood(FOOD_HEALS);
      if (ate) this.floaty(this.player.x, this.player.y - 40, '+1 ♥ yum!', '#8aff9e');
      else toast(this, state.save.hearts.current >= state.save.hearts.max ? 'Hearts already full!' : 'No food in your bag yet!');
    });

    this.rocketHint = txt(this, this.rocketX, groundTop(3) - 80, 'E — fly home', 14, '#ffe08a')
      .setDepth(10)
      .setVisible(false);

    this.scene.launch('HUD', { planetId: this.planetId });
    this.banner(def.name.toUpperCase(), hexToInt(def.palette.accent));
    state.flush();
  }

  private collect(itemId: string, kind: string, x: number, y: number): void {
    state.addItem(itemId);
    if (kind === 'treasure') {
      const p = state.planet(this.planetId);
      p.treasureFound = (p.treasureFound ?? 0) + 1;
    }
    this.floaty(x, y - 10, '+1', '#ffe08a');
    if (++this.pickupsSinceFlush >= 5) {
      this.pickupsSinceFlush = 0;
      state.flush();
    }
  }

  private hurtPlayer(damage: number, fromX: number): void {
    const result = this.player.hurt(damage, fromX, this.time.now);
    if (result === 'dead') {
      this.cameras.main.flash(300, 255, 60, 60);
      this.banner('OUCH! back to the rocket...', 0xff6666);
      this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
      this.player.setVelocity(0, 0);
      state.healFull(); // kid-friendly: keep everything, try again
    }
  }

  private bossDefeated(): void {
    if (!this.boss) return;
    const boss = this.boss;
    this.boss = null;
    this.game.events.emit('ss-boss', null);
    this.cameras.main.shake(400, 0.01);
    this.tweens.add({
      targets: boss,
      alpha: 0,
      scale: 0.2,
      duration: 600,
      onComplete: () => boss.destroy(),
    });
    const orb = this.physics.add.image(boss.x, boss.y - 50, 'orb').setTint(ORB_COLORS[this.planetId]).setDepth(6);
    orb.setBounce(0.5);
    this.physics.add.collider(orb, this.ground);
    this.tweens.add({ targets: orb, scale: 1.4, yoyo: true, repeat: -1, duration: 500 });
    this.physics.add.overlap(this.player, orb, () => {
      orb.destroy();
      state.addOrb(this.planetId);
      this.banner(`${this.def.name.toUpperCase()} ORB GET!  +1 ♥`, ORB_COLORS[this.planetId]);
      toast(this, 'Press E at your rocket to fly home!');
    });
  }

  private poof(x: number, y: number, tint: number): void {
    for (let i = 0; i < 6; i++) {
      const p = this.add.image(x, y, 'star').setTint(tint).setScale(3).setDepth(7);
      this.tweens.add({
        targets: p,
        x: x + (Math.random() - 0.5) * 80,
        y: y - Math.random() * 60,
        alpha: 0,
        duration: 400,
        onComplete: () => p.destroy(),
      });
    }
  }

  private floaty(x: number, y: number, s: string, color: string): void {
    const t = txt(this, x, y, s, 16, color).setDepth(20);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  private banner(s: string, tintColor = 0xffe08a): void {
    const color = '#' + tintColor.toString(16).padStart(6, '0');
    const t = txt(this, 480, 200, s, 34, color).setScrollFactor(0).setDepth(300).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.out' });
    this.time.delayedCall(2000, () =>
      this.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => t.destroy() })
    );
  }

  update(time: number): void {
    const intent = this.controls.update();

    // attack swing
    if (this.player.applyIntent(intent, time)) {
      const slash = this.slashes.create(
        this.player.x + this.player.facing * 34,
        this.player.y + 2,
        'slash'
      ) as Phaser.Physics.Arcade.Image;
      slash.setFlipX(this.player.facing < 0).setDepth(6);
      slash.setData('hits', new Set());
      this.time.delayedCall(BALANCE.attackDurationMs, () => slash.destroy());
    }

    // fly home
    const nearRocket = Math.abs(this.player.x - this.rocketX) < 60;
    this.rocketHint.setVisible(nearRocket);
    if (intent.interact && nearRocket) {
      state.save.currentPlanet = '';
      state.touch();
      state.flush();
      this.scene.stop('HUD');
      this.scene.start('StarMap');
      return;
    }

    this.monsters.children.iterate((m) => {
      (m as Monster).walk(time, this.player);
      return true;
    });

    if (this.boss) {
      if (!this.boss.awake && this.player.x > this.arenaX) {
        this.boss.wake(time);
        this.game.events.emit('ss-boss', { name: this.def.boss.name, hp: this.boss.hp, max: this.boss.maxHp });
        this.banner(`${this.def.boss.name}!!`, 0xff6666);
      }
      this.boss.act(time, this.player);
    }
  }
}
