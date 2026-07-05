import Phaser from 'phaser';
import { BALANCE } from '../systems/balance';
import { mulberry32 } from '../systems/rng';
import { generateHeights, maxJumpTiles } from '../systems/terrain';
import { state } from '../systems/save';
import { PLANETS, ORB_COLORS, FOOD_HEALS, hexToInt, type PlanetDef } from '../content';
import { ensurePlayerTexture } from '../systems/textures';
import { createControls } from '../input/manager';
import type { ControlScheme, InputIntent } from '../input/types';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { Boss } from '../entities/Boss';
import { Debris } from '../entities/Debris';
import { txt, sprinkleStars, toast } from '../systems/ui';
import { audio, type TrackName } from '../systems/audio';

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
  private rocketSprite!: Phaser.GameObjects.Image;
  private spawnPoint = { x: 0, y: 0 };
  private arenaX = 0;
  private rocketHint!: Phaser.GameObjects.Text;
  private pickupsSinceFlush = 0;
  private treasureComplete = false;
  private debris!: Phaser.Physics.Arcade.Group;
  private bossRocks!: Phaser.Physics.Arcade.Group;
  private contactSafeUntil = new WeakMap<Phaser.GameObjects.GameObject, number>();
  private swordHitSafeUntil = new WeakMap<Phaser.GameObjects.GameObject, number>();
  private accentColor = 0xffffff;

  constructor() {
    super('Planet');
  }

  init(data: { planetId: string }): void {
    this.planetId = data.planetId;
  }

  create(): void {
    this.game.events.emit('ss-scene', 'planet');
    this.def = PLANETS[this.planetId];
    const def = this.def;
    const accent = hexToInt(def.palette.accent);
    this.accentColor = accent;
    // Don't re-play the "all collected!" celebration if this planet was already
    // cleared on a previous visit.
    this.treasureComplete =
      (state.planet(this.planetId).treasureFound ?? 0) >= def.collectibles.treasure.count;
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
    this.heights = generateHeights(rng, cols, def.terrain.verticality ?? 0.2);
    this.ground = this.physics.add.staticGroup();
    for (let i = 0; i < cols; i++) {
      const hh = this.heights[i] * TILE;
      const img = this.ground.create(i * TILE + TILE / 2, H - hh / 2, 'tile') as Phaser.Physics.Arcade.Image;
      img.setDisplaySize(TILE, hh).setTint(groundCol).refreshBody();
    }
    const groundTop = (col: number) => H - this.heights[col] * TILE;

    // --- floating platforms (verticality — separate from base ground, so
    //     existing collectible/monster placement math is untouched).
    //     stepsAbove is scaled to THIS planet's actual jump reach — a fixed
    //     "3-5 tiles up" would be unreachable on a heavy planet like Jupiter
    //     (~2.5 tile jump) and wastefully modest on a floaty one like Pluto. ---
    const jumpTiles = maxJumpTiles(def.gravity);
    const platformMaxSteps = Math.max(2, Math.floor(jumpTiles * 0.65));
    for (let i = 10; i < cols - 30; ) {
      if (rng() < BALANCE.platformChance) {
        const width = 2 + Math.floor(rng() * 3);
        const stepsAbove = 2 + Math.floor(rng() * Math.max(1, platformMaxSteps - 1));
        let highestTop = H;
        for (let c = i; c < i + width && c < cols; c++) highestTop = Math.min(highestTop, groundTop(c));
        const platformY = highestTop - stepsAbove * TILE;
        for (let c = i; c < i + width && c < cols; c++) {
          const img = this.ground.create(c * TILE + TILE / 2, platformY, 'tile') as Phaser.Physics.Arcade.Image;
          img.setDisplaySize(TILE, TILE).setTint(groundCol).refreshBody();
        }
        i += width + BALANCE.platformMinGapCols + Math.floor(rng() * (BALANCE.platformMaxGapCols - BALANCE.platformMinGapCols));
      } else {
        i += 4;
      }
    }

    // --- landing site ---
    this.rocketX = 3 * TILE + TILE / 2;
    this.rocketSprite = this.add.image(this.rocketX, groundTop(3) - 31, 'rocket').setDepth(3);
    this.spawnPoint = { x: this.rocketX + 40, y: groundTop(3) - 60 };

    // --- player + controls ---
    const texKey = ensurePlayerTexture(
      this,
      state.character ?? { skin: 0, hair: 1, suit: 2, visor: 0, accessory: 0, pattern: 0 }
    );
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
    // Each planet's fruit has its own shape (texture 'food-<id>'); fall back to
    // the generic snack sprite for any food without a bespoke drawing yet.
    const foodTex = this.textures.exists(`food-${def.collectibles.food.id}`)
      ? `food-${def.collectibles.food.id}`
      : 'food';
    scatter(foodTex, null, def.collectibles.food.id, 'food', def.collectibles.food.count);

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
      this.boss = new Boss(this, (cols - 8) * TILE, groundTop(cols - 8) - 70, def.boss, accent);
      this.boss.setCollideWorldBounds(true);
      // Confine to the flat arena — it never jumps, so if it wandered into
      // the bumpy overworld terrain it could get physically wedged against
      // a step and never reach the player again.
      this.boss.setArenaBounds(this.arenaX, (cols - 3) * TILE);
    }

    // --- hazards: debris (data-driven per planet). 'fall' rains from the top,
    //     'horizontal' flies in from a screen edge at player height, 'mixed'
    //     rolls one or the other each spawn. Group defaults to no gravity so
    //     debris keeps its predictable authored speed — adding a body to an
    //     Arcade group otherwise re-enables gravity from the world default,
    //     which would accelerate falling debris and drag horizontal debris down. ---
    this.debris = this.physics.add.group({ allowGravity: false });
    if (def.hazards?.debris) {
      const hz = def.hazards.debris;
      this.time.addEvent({
        delay: hz.intervalMs,
        loop: true,
        callback: () => {
          const cam = this.cameras.main;
          const mode =
            hz.direction === 'mixed'
              ? Math.random() < 0.5
                ? 'horizontal'
                : 'fall'
              : hz.direction ?? 'fall';
          if (mode === 'horizontal') {
            // Fly in from just off the left or right camera edge, at a height
            // band around the player, heading across the view.
            const fromLeft = Math.random() < 0.5;
            const x = fromLeft ? cam.worldView.x - 20 : cam.worldView.right + 20;
            const y = this.player.y + (Math.random() - 0.5) * 80;
            const vx = (fromLeft ? 1 : -1) * hz.speed;
            this.spawnDebris(new Debris(this, x, y, vx, hz.damage, accent, 'debris', 'horizontal'));
          } else {
            const x = cam.worldView.x + Math.random() * cam.worldView.width;
            this.spawnDebris(new Debris(this, x, -20, hz.speed, hz.damage, accent, 'debris', 'fall'));
          }
        },
      });
    }
    this.bossRocks = this.physics.add.group();
    this.events.on(
      'boss-special',
      (payload: {
        type: string;
        x: number;
        y: number;
        targetX?: number;
        targetY?: number;
        minionId?: string;
        max?: number;
      }) => {
        if (!this.player) return;
        switch (payload.type) {
          case 'rockThrow':
            this.spawnRock(payload.x, payload.y, this.player.x, this.player.y, accent);
            break;
          case 'projectileBarrage': {
            const baseAngle = Math.atan2(
              (payload.targetY ?? this.player.y) - payload.y,
              (payload.targetX ?? this.player.x) - payload.x
            );
            const spread = Phaser.Math.DegToRad(BALANCE.bossBarrageSpreadDeg);
            for (const off of [-spread, 0, spread]) {
              const a = baseAngle + off;
              this.spawnRock(
                payload.x,
                payload.y,
                payload.x + Math.cos(a) * 200,
                payload.y + Math.sin(a) * 200,
                accent
              );
            }
            break;
          }
          case 'groundPound': {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, payload.x, payload.y);
            if (dist < BALANCE.bossGroundPoundRadius) {
              this.hurtPlayer(BALANCE.bossGroundPoundDamage, payload.x);
            }
            break;
          }
          case 'summonMinions': {
            const mdef = def.monsters.find((m) => m.id === payload.minionId);
            if (!mdef) break;
            const activeMinions = this.monsters.getChildren().filter((m) => m.active && m.getData('isMinion')).length;
            const toSpawn = Math.max(0, (payload.max ?? 2) - activeMinions);
            for (let n = 0; n < toSpawn; n++) {
              const spawnX = payload.x + (n - toSpawn / 2) * 48;
              const m = new Monster(this, spawnX, payload.y - 60, mdef, accent);
              m.setCollideWorldBounds(true).setData('isMinion', true);
              this.monsters.add(m);
              this.poof(spawnX, payload.y - 60, accent);
            }
            break;
          }
          case 'powerupDrop':
            this.spawnMidFightPowerup(payload.x, payload.y);
            break;
        }
      }
    );
    this.events.on(
      'monster-special',
      (payload: { type: string; x: number; y: number; targetX: number; targetY: number }) => {
        if (payload.type === 'shoot') {
          this.spawnRock(payload.x, payload.y, payload.targetX, payload.targetY, accent);
        } else if (payload.type === 'drop-flame') {
          // A flame falls straight down and joins the debris group, so it
          // already collides with the ground, overlaps (and damages) the
          // player, and is swept off-world. Full-color 'flame' texture: no tint.
          this.spawnDebris(new Debris(this, payload.x, payload.y, BALANCE.flameDropSpeed, 1, null, 'flame', 'fall'));
        }
      }
    );

    // --- physics wiring ---
    this.slashes = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.monsters, this.ground);
    if (this.boss) this.physics.add.collider(this.boss, this.ground);
    this.physics.add.collider(this.debris, this.ground, (d) => {
      const deb = this.arcadeObject<Debris>(d);
      this.poof(deb.x, deb.y, accent);
      deb.destroy();
    });
    this.physics.add.overlap(this.player, this.debris, (_p, d) => {
      const deb = this.arcadeObject<Debris>(d);
      if (!deb.active) return;
      this.hurtPlayer(deb.damage, deb.x);
      this.poof(deb.x, deb.y, accent);
      deb.destroy();
    });
    this.physics.add.overlap(this.player, this.bossRocks, (_p, r) => {
      const rock = this.arcadeObject<Phaser.Physics.Arcade.Image>(r);
      if (!rock.active) return;
      this.hurtPlayer(BALANCE.bossRockDamage, rock.x);
      this.poof(rock.x, rock.y, accent);
      rock.destroy();
    });
    this.physics.add.collider(this.bossRocks, this.ground, (r) => {
      const rock = this.arcadeObject<Phaser.Physics.Arcade.Image>(r);
      this.poof(rock.x, rock.y, accent);
      rock.destroy();
    });

    this.physics.add.overlap(this.player, pickups, (_p, item) => {
      const it = item as Phaser.Physics.Arcade.Image;
      this.collect(it.getData('itemId') as string, it.getData('kind') as string, it.x, it.y);
      it.destroy();
    });
    // Slash-vs-enemy overlaps are registered before the player-vs-enemy touch
    // overlaps below so a hit that lands this frame calls protectPlayerFrom()
    // in time — Arcade Physics runs overlap callbacks in registration order
    // within a single step, and touch-damage must see that same-frame flag.
    this.physics.add.overlap(this.slashes, this.monsters, (s, m) => {
      const slash = this.arcadeObject<Phaser.Physics.Arcade.Image>(s);
      const mon = this.arcadeObject<Monster>(m);
      this.hitMonsterWithSlash(slash, mon);
    });
    if (this.boss) {
      this.physics.add.overlap(this.slashes, this.boss, (s, b) => {
        const slash = this.arcadeObject<Phaser.Physics.Arcade.Image>(s);
        void b;
        const boss = this.boss;
        if (!boss) return;
        if (!boss.active) return;
        this.hitBossWithSlash(slash, boss);
      });
    }
    this.physics.add.overlap(this.player, this.monsters, (_p, m) => {
      const mon = this.arcadeObject<Monster>(m);
      // Falling onto a lil guy from above = a Mario-style stomp.
      // Use Arcade body bounds instead of sprite centers so short/offset bodies
      // still count when the player visually lands on top.
      if (this.isStomping(mon)) {
        (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(-BALANCE.stompBounce);
        audio.sfx('stomp');
        this.floaty(mon.x, mon.y - 20, 'SQUISH!', '#ffe08a');
        this.protectPlayerFrom(mon);
        if (mon.hit(this.player.x, BALANCE.stompDamage)) {
          this.poof(mon.x, mon.y, accent);
          mon.destroy();
        }
        return;
      }
      if (this.isPlayerProtectedFrom(mon)) return;
      this.hurtPlayer(mon.def.damage, mon.x);
    });
    if (this.boss) {
      this.physics.add.overlap(this.player, this.boss, () => {
        if (this.boss?.awake && !this.isPlayerProtectedFrom(this.boss)) {
          this.hurtPlayer(def.boss.damage, this.boss.x);
        }
      });
    }

    // --- extra keys (UI-level, not gameplay movement) ---
    this.input.keyboard!.on('keydown-F', () => {
      const result = state.eatFood(FOOD_HEALS);
      if (result?.kind === 'healed') {
        audio.sfx('eat');
        this.floaty(this.player.x, this.player.y - 40, '+1 ♥ yum!', '#8aff9e');
      } else if (result?.kind === 'powerup') {
        this.grantPowerup();
      } else {
        audio.sfx('denied');
        toast(this, 'No food in your bag yet!');
      }
    });
    this.input.keyboard!.on('keydown-M', () => {
      toast(this, audio.toggle() ? 'Sound ON' : 'Sound OFF');
    });
    // Eating from the HUD bag panel (a different scene) at full health
    // routes here the same way, so the buff always lands on the real player.
    this.game.events.on('ss-activate-power', this.grantPowerup, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('ss-activate-power', this.grantPowerup, this);
      // Phaser reuses the scene instance and does NOT clear this.events listeners
      // on shutdown — without this, every planet re-entry stacks another
      // 'boss-special'/'monster-special' handler, so one boss volley fires N
      // times (N× rocks, N× damage) and eventually buries the frame rate.
      this.events.off('boss-special');
      this.events.off('monster-special');
    });

    this.rocketHint = txt(this, this.rocketX, groundTop(3) - 80, 'E — fly home', 14, '#ffe08a')
      .setDepth(10)
      .setVisible(false);

    this.scene.launch('HUD', { planetId: this.planetId });
    this.banner(def.name.toUpperCase(), hexToInt(def.palette.accent));
    audio.music(this.planetId as TrackName);
    state.flush();
  }

  private collect(itemId: string, kind: string, x: number, y: number): void {
    state.addItem(itemId);
    audio.sfx('pickup');
    if (kind === 'treasure') {
      const p = state.planet(this.planetId);
      const goal = this.def.collectibles.treasure.count;
      p.treasureFound = (p.treasureFound ?? 0) + 1;
      const found = Math.min(p.treasureFound, goal);
      // Show progress toward the level's goal on every pickup, then a big
      // "you got them all!" moment when the set is complete.
      this.floaty(x, y - 10, `${found}/${goal}`, '#ffe08a');
      if (found >= goal && !this.treasureComplete) {
        this.treasureComplete = true;
        this.game.events.emit('ss-celebrate', { variant: 'sparkles', tone: 'success' });
        this.banner(`ALL ${goal} ${this.def.collectibles.treasure.name.toUpperCase()}!`, this.accentColor);
        state.flush();
      }
    } else {
      this.floaty(x, y - 10, '+1', '#8aff9e');
    }
    if (++this.pickupsSinceFlush >= 5) {
      this.pickupsSinceFlush = 0;
      state.flush();
    }
  }

  /** Eating food at full health powers you up instead of being wasted. */
  private grantPowerup(): void {
    this.player.activatePower(this.time.now);
    audio.sfx('eat');
    this.game.events.emit('ss-celebrate', { variant: 'sparkles', tone: 'success' });
    this.floaty(this.player.x, this.player.y - 40, 'POWERED UP!', '#ffe066');
    toast(this, 'Speed & attack boosted for a bit!');
  }

  /**
   * Add a debris/flame hazard to the shared group, THEN launch it — a body
   * added to an Arcade group inherits the group's velocity/gravity defaults, so
   * the authored motion has to be (re)applied after add(), not before.
   */
  private spawnDebris(deb: Debris): void {
    this.debris.add(deb);
    deb.launch();
  }

  /** One rock arcing toward (targetX, targetY) — shared by rockThrow and projectileBarrage. */
  private spawnRock(x: number, y: number, targetX: number, targetY: number, tint: number): void {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const rock = this.physics.add.image(x, y, 'debris').setTint(tint).setDepth(6);
    const body = rock.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setVelocity((dx / dist) * BALANCE.bossRockSpeed, (dy / dist) * BALANCE.bossRockSpeed - 160);
    this.tweens.add({ targets: rock, angle: 360, duration: 500, repeat: -1 });
    this.bossRocks.add(rock);
  }

  /** A boss entering its toughest phase drops a grabbable comeback powerup. */
  private spawnMidFightPowerup(x: number, y: number): void {
    const orb = this.physics.add.image(x, y, 'orb').setTint(0xffe066).setDepth(6);
    orb.setBounce(0.4);
    this.physics.add.collider(orb, this.ground);
    this.tweens.add({ targets: orb, scale: 1.5, yoyo: true, repeat: -1, duration: 400 });
    this.physics.add.overlap(this.player, orb, () => {
      if (!orb.active) return;
      orb.destroy();
      this.grantPowerup();
    });
    this.time.delayedCall(12000, () => {
      if (orb.active) {
        this.tweens.add({ targets: orb, alpha: 0, duration: 500, onComplete: () => orb.destroy() });
      }
    });
  }

  private hurtPlayer(damage: number, fromX: number): void {
    const result = this.player.hurt(damage, fromX, this.time.now);
    if (result === 'hit') audio.sfx('hurt');
    if (result === 'dead') {
      audio.sfx('die');
      this.cameras.main.flash(300, 255, 60, 60);
      this.banner('OUCH! back to the rocket...', 0xff6666);
      this.player.setPosition(this.spawnPoint.x, this.spawnPoint.y);
      this.player.setVelocity(0, 0);
      state.healFull(); // kid-friendly: keep everything, try again
    }
  }

  private protectPlayerFrom(enemy: Phaser.GameObjects.GameObject): void {
    this.contactSafeUntil.set(enemy, this.time.now + BALANCE.enemyHitContactCooldownMs);
  }

  private isPlayerProtectedFrom(enemy: Phaser.GameObjects.GameObject): boolean {
    return this.time.now < (this.contactSafeUntil.get(enemy) ?? 0);
  }

  private canTakeSwordHit(enemy: Phaser.GameObjects.GameObject): boolean {
    if (this.time.now < (this.swordHitSafeUntil.get(enemy) ?? 0)) return false;
    this.swordHitSafeUntil.set(enemy, this.time.now + BALANCE.attackDurationMs);
    return true;
  }

  private isStomping(mon: Monster): boolean {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body | null;
    const monsterBody = mon.body as Phaser.Physics.Arcade.Body | null;
    if (!playerBody || !monsterBody || !mon.active) return false;
    const falling = playerBody.velocity.y > BALANCE.stompMinFallSpeed || playerBody.deltaY() > 0;
    const aboveMonster = playerBody.bottom <= monsterBody.center.y + BALANCE.stompTopTolerance;
    const centeredAbove = playerBody.center.y < monsterBody.center.y;
    return falling && aboveMonster && centeredAbove;
  }

  private arcadeObject<T extends Phaser.GameObjects.GameObject>(
    value: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
  ): T {
    return ((value as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody).gameObject ?? value) as T;
  }

  private slashHits<T extends Phaser.GameObjects.GameObject>(slash: Phaser.Physics.Arcade.Image): Set<T> {
    const slashWithHits = slash as Phaser.Physics.Arcade.Image & { __hits?: Set<Phaser.GameObjects.GameObject> };
    let hits = slashWithHits.__hits as Set<T> | undefined;
    if (!hits) {
      hits = new Set<T>();
      slashWithHits.__hits = hits as Set<Phaser.GameObjects.GameObject>;
    }
    return hits;
  }

  private hitMonsterWithSlash(slash: Phaser.Physics.Arcade.Image, mon: Monster): void {
    const hits = this.slashHits<Monster>(slash);
    if (hits.has(mon) || !mon.active) return;
    hits.add(mon);
    if (!this.canTakeSwordHit(mon)) return;
    this.protectPlayerFrom(mon);
    const damage = this.player.isPowered(this.time.now) ? 2 : 1;
    if (mon.hit(this.player.x, damage)) {
      this.poof(mon.x, mon.y, this.accentColor);
      mon.destroy();
    }
  }

  private hitBossWithSlash(slash: Phaser.Physics.Arcade.Image, boss: Boss): void {
    const hits = this.slashHits<Boss>(slash);
    if (hits.has(boss) || !boss.active) return;
    hits.add(boss);
    if (!this.canTakeSwordHit(boss)) return;
    this.protectPlayerFrom(boss);
    const damage = this.player.isPowered(this.time.now) ? 2 : 1;
    const defeated = boss.hit(this.player.x, damage);
    this.game.events.emit('ss-boss', { name: this.def.boss.name, hp: Math.max(0, boss.hp), max: boss.maxHp });
    if (defeated) this.bossDefeated();
  }

  private slashOverlaps(slash: Phaser.Physics.Arcade.Image, target: Phaser.GameObjects.GameObject): boolean {
    const a = slash.body as Phaser.Physics.Arcade.Body | null;
    const b = (target.body as Phaser.Physics.Arcade.Body | null) ?? null;
    if (!a || !b) return false;
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private scanSlashHits(slash: Phaser.Physics.Arcade.Image): void {
    // Snapshot the list first: a killing blow here calls mon.destroy(), which
    // removes it from this.monsters mid-iteration. Phaser's Set.iterate caches
    // the length, so a same-scan removal makes it read an undefined entry on the
    // next index and throw — which kills the whole game loop (a hard freeze,
    // music still playing). More likely mid-fight when minions crowd the player.
    for (const mon of this.monsters.getChildren().slice() as Monster[]) {
      if (mon?.active && this.slashOverlaps(slash, mon)) this.hitMonsterWithSlash(slash, mon);
    }
    if (this.boss && this.slashOverlaps(slash, this.boss)) {
      this.hitBossWithSlash(slash, this.boss);
    }
  }

  private attackDirection(intent: InputIntent): { x: number; y: number } {
    if (intent.aimY !== 0) return { x: 0, y: intent.aimY };
    if (intent.aimX !== 0) return { x: intent.aimX, y: 0 };
    return { x: this.player.facing, y: 0 };
  }

  private createSlash(intent: InputIntent): void {
    const dir = this.attackDirection(intent);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let x = body.center.x;
    let y = body.center.y;
    if (dir.x !== 0) {
      x = body.center.x + dir.x * BALANCE.attackReach;
      y = body.center.y;
    } else if (dir.y > 0) {
      y = body.bottom + BALANCE.attackReach / 2;
    } else if (dir.y < 0) {
      y = body.top - BALANCE.attackReach / 2;
    }
    const slash = this.slashes.create(
      x,
      y,
      'slash'
    ) as Phaser.Physics.Arcade.Image;
    (slash as Phaser.Physics.Arcade.Image & { __hits: Set<Phaser.GameObjects.GameObject> }).__hits = new Set();
    slash.setDepth(6);
    slash.setFlipX(dir.x < 0);
    slash.setAngle(dir.y !== 0 ? 90 : 0);
    if (dir.y < 0) slash.setFlipX(false).setFlipY(true);
    // Keep the gameplay hitbox generous for kid-friendly timing in every aim direction.
    (slash.body as Phaser.Physics.Arcade.Body).setSize(46, 46);
    this.scanSlashHits(slash);
    this.time.delayedCall(30, () => {
      if (slash.active) this.scanSlashHits(slash);
    });
    this.time.delayedCall(BALANCE.attackDurationMs, () => slash.destroy());
  }

  private bossDefeated(): void {
    if (!this.boss) return;
    const boss = this.boss;
    this.boss = null;
    this.game.events.emit('ss-boss', null);
    const body = boss.body as Phaser.Physics.Arcade.Body | null;
    body?.stop();
    body?.setEnable(false);
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
      const orbX = orb.x;
      orb.destroy();
      state.addOrb(this.planetId);
      audio.sfx('orb');
      this.game.events.emit('ss-celebrate', { variant: this.def.celebration ?? 'confetti', tone: 'success' });
      this.banner(`${this.def.name.toUpperCase()} SHARD GET!  +1 ♥`, ORB_COLORS[this.planetId]);
      this.relocateRocket(orbX);
      toast(this, 'Your ride is here — press E to fly home!');
    });
  }

  /** No more trekking back across the whole level — the rocket comes to you. */
  private relocateRocket(x: number): void {
    const col = Phaser.Math.Clamp(Math.round(x / TILE), 0, this.heights.length - 1);
    const groundY = H - this.heights[col] * TILE;
    this.rocketX = x;
    this.rocketSprite.setPosition(x, groundY - 31).setAlpha(0).setScale(0.4);
    this.tweens.add({ targets: this.rocketSprite, alpha: 1, scale: 1, duration: 500, ease: 'Back.out' });
    this.rocketHint.setPosition(x, groundY - 80);
    this.poof(x, groundY - 20, this.accentColor);
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

  private activeBanner?: Phaser.GameObjects.Text;
  private banner(s: string, tintColor = 0xffe08a): void {
    // Only one banner on screen at a time — otherwise landing on a planet and
    // immediately rushing the boss arena stacks the "<PLANET>" and "<BOSS>!!"
    // banners at the same spot into unreadable overlapping text.
    this.activeBanner?.destroy();
    const color = '#' + tintColor.toString(16).padStart(6, '0');
    const t = txt(this, 480, 200, s, 34, color).setScrollFactor(0).setDepth(300).setScale(0.3);
    this.activeBanner = t;
    t.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.activeBanner === t) this.activeBanner = undefined;
    });
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.out' });
    this.time.delayedCall(2000, () =>
      this.tweens.add({ targets: t, alpha: 0, duration: 400, onComplete: () => t.destroy() })
    );
  }

  update(time: number): void {
    const intent = this.controls.update();

    // attack swing
    if (this.player.applyIntent(intent, time)) {
      audio.sfx('attack');
      this.createSlash(intent);
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
      (m as Monster).act(time, this.player);
      return true;
    });

    if (this.boss) {
      if (!this.boss.awake && this.player.x > this.arenaX) {
        this.boss.wake(time);
        audio.sfx('boss');
        this.game.events.emit('ss-boss', { name: this.def.boss.name, hp: this.boss.hp, max: this.boss.maxHp });
        this.banner(`${this.def.boss.name}!!`, 0xff6666);
      }
      this.boss.act(time, this.player);
    }

    // sweep any debris/rocks that missed the ground collider and fell out of the
    // world — plus horizontal debris that has flown clear off the sides.
    // Snapshot first — destroying an object mid-iterate would corrupt the
    // group's cached-length iteration and crash the game loop (same footgun as
    // scanSlashHits); this runs every frame with constantly-moving debris.
    const worldW = this.physics.world.bounds.width;
    const sweep = (g: Phaser.Physics.Arcade.Group) => {
      for (const o of g.getChildren().slice()) {
        const obj = o as Phaser.GameObjects.Sprite;
        if (!obj.active) continue;
        if (obj.y > H + 100 || obj.x < -100 || obj.x > worldW + 100) obj.destroy();
      }
    };
    sweep(this.debris);
    sweep(this.bossRocks);
  }
}
