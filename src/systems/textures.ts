import Phaser from 'phaser';
import type { Character } from './save';

// Character creator palettes — 6 options per slot (PLAN.md §3.2, expanded per
// nephew feedback for "more detailed" customization: 6^6 = 46,656 combos).
export const SKINS = [0xf2d3b3, 0xd9a066, 0x8d5524, 0x5a3825, 0xffe9d6, 0x3d2314];
export const HAIR_COLORS = [0x000000, 0x222233, 0x7a4a21, 0xf4c430, 0xc0392b, 0xe8e8e8]; // idx 0 unused (None)
export const SUITS = [0xf2f4f8, 0xe74c3c, 0x3498db, 0x2ecc71, 0x9b59b6, 0xe67e22];
export const VISORS = [0x7fd4ff, 0xffcc66, 0xcc66ff, 0x223344, 0x2ecc71, 0xff6fae];
export const OPTION_NAMES: Record<string, string[]> = {
  skin: ['Peach', 'Tan', 'Brown', 'Deep', 'Fair', 'Espresso'],
  hair: ['None', 'Spiky', 'Bowl', 'Curly', 'Mohawk', 'Ponytail'],
  suit: ['White', 'Red', 'Blue', 'Green', 'Purple', 'Orange'],
  visor: ['Sky', 'Gold', 'Purple', 'Night', 'Jade', 'Bubblegum'],
  accessory: ['None', 'Star Clip', 'Bandana', 'Backpack Glow', 'Shoulder Pads', 'Antenna'],
  pattern: ['None', 'Stripe', 'Dots', 'Star', 'Bolt', 'Heart'],
};

function darken(c: number, f = 0.6): number {
  const col = Phaser.Display.Color.IntegerToColor(c);
  return Phaser.Display.Color.GetColor(
    Math.floor(col.red * f),
    Math.floor(col.green * f),
    Math.floor(col.blue * f)
  );
}

/** All shared placeholder art, drawn once. Monster/tile/gem/orb are white so planets tint them. */
export function makeCoreTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('tile')) return;
  const g = scene.add.graphics();
  const gen = (key: string, w: number, h: number) => {
    g.generateTexture(key, w, h);
    g.clear();
  };

  // ground tile
  g.fillStyle(0xffffff);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x000000, 0.25);
  g.fillRect(0, 6, 32, 26);
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(0, 0, 32, 4);
  gen('tile', 32, 32);

  // star pixel
  g.fillStyle(0xffffff);
  g.fillRect(0, 0, 2, 2);
  gen('star', 2, 2);

  // hearts
  const heartShape = (color: number, alpha = 1) => {
    g.fillStyle(color, alpha);
    g.fillCircle(6.5, 7, 5.5);
    g.fillCircle(15.5, 7, 5.5);
    g.fillTriangle(1.5, 9.5, 20.5, 9.5, 11, 19);
  };
  heartShape(0x4a1d3a);
  gen('heart-empty', 22, 20);
  heartShape(0x4a1d3a);
  g.fillStyle(0xff3355);
  g.fillCircle(6.5, 7, 4.2);
  g.fillCircle(15.5, 7, 4.2);
  g.fillTriangle(3.5, 9.5, 18.5, 9.5, 11, 17);
  gen('heart-full', 22, 20);
  heartShape(0x4a1d3a);
  g.fillStyle(0xff3355);
  g.fillCircle(6.5, 7, 4.2);
  g.fillTriangle(3.5, 9.5, 11, 9.5, 11, 17);
  g.fillRect(6.5, 5, 4.5, 6);
  gen('heart-half', 22, 20);

  // orb (white → tinted per planet)
  g.fillStyle(0xffffff, 0.22);
  g.fillCircle(12, 12, 12);
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(12, 12, 8);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(12, 12, 5);
  gen('orb', 24, 24);

  // gem (white → tinted)
  g.fillStyle(0xffffff);
  g.fillPoints(
    [
      { x: 10, y: 0 },
      { x: 20, y: 8 },
      { x: 10, y: 20 },
      { x: 0, y: 8 },
    ],
    true
  );
  g.fillStyle(0x000000, 0.18);
  g.fillTriangle(10, 0, 20, 8, 10, 20);
  gen('gem', 20, 20);

  // food (generic fallback — little mushroom/berry hybrid)
  g.fillStyle(0xfff2d8);
  g.fillRect(7, 9, 6, 8);
  g.fillStyle(0xff5e5e);
  g.fillEllipse(10, 7, 20, 11);
  g.fillStyle(0xffffff);
  g.fillCircle(6, 6, 2);
  g.fillCircle(13, 5, 2);
  gen('food', 20, 18);

  // Per-planet fruits — each level's snack is a distinct shape, keyed by its
  // food id (Planet.ts uses `food-<id>` when it exists, else the generic 'food').
  const leaf = (x: number, y: number) => {
    g.fillStyle(0x4fbf5a);
    g.fillEllipse(x, y, 8, 4);
  };
  // moon — Star Berry: a soft silver-blue five-point star
  {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 11 : 4.6;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push({ x: 11 + Math.cos(a) * r, y: 11 + Math.sin(a) * r });
    }
    g.fillStyle(0xbcd0ff);
    g.fillPoints(pts, true);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(11, 10, 3);
    gen('food-star-berry', 22, 22);
  }
  // mars — Cave Mushroom: red cap, cream stem, white spots
  g.fillStyle(0xf3e4c4);
  g.fillRect(8, 11, 6, 8);
  g.fillStyle(0xd7472e);
  g.fillEllipse(11, 8, 20, 12);
  g.fillStyle(0xffe9c8);
  g.fillCircle(7, 7, 2);
  g.fillCircle(14, 6, 1.8);
  g.fillCircle(11, 9, 1.6);
  gen('food-cave-mushroom', 22, 22);
  // earth — Honey Apple: round red apple, leaf + stem
  g.fillStyle(0x6b3b1a);
  g.fillRect(10, 2, 2, 5);
  leaf(15, 4);
  g.fillStyle(0xe23b3b);
  g.fillCircle(11, 13, 8);
  g.fillStyle(0xff8a7a, 0.7);
  g.fillCircle(8, 10, 2.5);
  gen('food-honey-apple', 22, 22);
  // jupiter — Cloud Fruit: fluffy tan cloud puff with a pink berry
  g.fillStyle(0xf5dcae);
  g.fillCircle(7, 12, 5);
  g.fillCircle(13, 12, 6);
  g.fillCircle(11, 8, 5);
  g.fillStyle(0xff7fa8);
  g.fillCircle(11, 11, 3);
  gen('food-cloud-fruit', 22, 20);
  // saturn — Gold Dust Melon: round golden melon with darker stripes
  g.fillStyle(0xe7c86a);
  g.fillCircle(11, 12, 8.5);
  g.fillStyle(0xbf9b3e);
  for (let i = -2; i <= 2; i++) g.fillRect(11 + i * 4 - 0.75, 4, 1.5, 16);
  g.fillStyle(0x6b3b1a);
  g.fillRect(10, 3, 2, 3);
  gen('food-gold-dust-melon', 22, 22);
  // uranus — Glacier Mint: pale-cyan crystal diamond with a mint leaf
  g.fillStyle(0xd6fbff);
  g.fillPoints([{ x: 11, y: 2 }, { x: 19, y: 11 }, { x: 11, y: 21 }, { x: 3, y: 11 }], true);
  g.fillStyle(0xffffff, 0.6);
  g.fillTriangle(11, 2, 19, 11, 11, 11);
  g.fillStyle(0x7fe6a6);
  g.fillEllipse(15, 5, 7, 3.5);
  gen('food-glacier-mint', 22, 22);
  // neptune — Gale Plum: deep blue-purple plum with a leaf + seam
  g.fillStyle(0x6b3b1a);
  g.fillRect(10, 2, 2, 4);
  leaf(15, 4);
  g.fillStyle(0x7a5cc9);
  g.fillCircle(11, 13, 8);
  g.fillStyle(0x4c3388, 0.8);
  g.fillRect(10.2, 6, 1.6, 14);
  gen('food-gale-plum', 22, 22);
  // pluto — Frost Berry: a cluster of three pale-ice berries
  g.fillStyle(0xbfe8ff);
  g.fillCircle(7, 14, 5);
  g.fillCircle(15, 14, 5);
  g.fillCircle(11, 8, 5);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(6, 12, 1.6);
  g.fillCircle(14, 12, 1.6);
  g.fillCircle(10, 6, 1.6);
  gen('food-frost-berry', 22, 22);

  // melee slash
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(20, 14, 38, 9);
  g.fillStyle(0xffffff, 0.4);
  g.fillEllipse(20, 14, 38, 18);
  gen('slash', 40, 28);

  // monsters (white base + dark eyes so tint colors the body, not the eyes)
  g.fillStyle(0xffffff);
  g.fillEllipse(14, 13, 26, 17);
  g.fillStyle(0x101018);
  g.fillCircle(9, 11, 2.5);
  g.fillCircle(19, 11, 2.5);
  gen('blob', 28, 22);

  g.fillStyle(0xffffff);
  g.fillRoundedRect(1, 1, 26, 26, 5);
  g.fillStyle(0x101018);
  g.fillRect(6, 9, 5, 4);
  g.fillRect(17, 9, 5, 4);
  gen('golem', 28, 28);

  // flyer — a little winged wisp, hovers and drifts
  g.fillStyle(0xffffff, 0.55);
  g.fillTriangle(0, 10, 10, 2, 10, 16);
  g.fillTriangle(30, 10, 20, 2, 20, 16);
  g.fillStyle(0xffffff);
  g.fillEllipse(15, 12, 16, 13);
  g.fillStyle(0x101018);
  g.fillCircle(11, 10, 2);
  g.fillCircle(19, 10, 2);
  gen('flyer', 30, 20);

  // shooter — a hovering eye-turret
  g.fillStyle(0xffffff);
  g.fillCircle(14, 14, 13);
  g.fillStyle(0x101018);
  g.fillCircle(14, 14, 7);
  g.fillStyle(0xffffff);
  g.fillCircle(14, 14, 3);
  g.fillStyle(0x101018, 0.6);
  g.fillRect(24, 11, 6, 6);
  gen('shooter', 30, 28);

  // jumper — spring-legged hopper
  g.fillStyle(0xffffff);
  g.fillEllipse(14, 10, 22, 15);
  g.fillRect(4, 16, 5, 8);
  g.fillRect(19, 16, 5, 8);
  g.fillStyle(0x101018);
  g.fillCircle(10, 8, 2.3);
  g.fillCircle(18, 8, 2.3);
  gen('jumper', 28, 26);

  // dropper — a boxy hovering robot with a downward nozzle/vent under its belly
  // (white body + dark eyes so the per-planet tint colors the chassis). Its
  // silhouette reads clearly apart from the round 'shooter' turret.
  g.fillStyle(0xffffff);
  g.fillRoundedRect(4, 2, 24, 18, 4); // squat rectangular body
  g.fillStyle(0x101018);
  g.fillRect(9, 8, 5, 4); // eye lenses
  g.fillRect(18, 8, 5, 4);
  g.fillStyle(0xffffff);
  g.fillRect(12, 20, 8, 4); // downward nozzle stub under the belly
  g.fillTriangle(11, 24, 21, 24, 16, 30); // vent cone the flame drips from
  g.fillStyle(0x101018, 0.5);
  g.fillRect(13, 21, 6, 1.5); // dark vent slit
  gen('dropper', 32, 32);

  // flame — a small orange/yellow teardrop of fire. FULL COLOR (never tinted),
  // so a dropped flame always reads as fire regardless of the planet accent.
  g.fillStyle(0xff7a1a); // outer flame
  g.fillTriangle(7, 0, 0, 13, 14, 13);
  g.fillEllipse(7, 13, 14, 10);
  g.fillStyle(0xffb32e); // mid flame
  g.fillTriangle(7, 4, 2, 13, 12, 13);
  g.fillEllipse(7, 13, 9, 7);
  g.fillStyle(0xffe680); // hot core
  g.fillEllipse(7, 13, 4.5, 4.5);
  gen('flame', 14, 18);

  // boss — big horned blob
  g.fillStyle(0xffffff);
  g.fillTriangle(12, 28, 22, 2, 32, 28);
  g.fillTriangle(56, 28, 66, 2, 76, 28);
  g.fillEllipse(44, 44, 84, 52);
  g.fillStyle(0x101018);
  g.fillCircle(32, 38, 5);
  g.fillCircle(56, 38, 5);
  g.fillEllipse(44, 56, 26, 9);
  gen('boss', 88, 72);

  // landing rocket
  g.fillStyle(0xe8ecf5);
  g.fillTriangle(14, 0, 2, 22, 26, 22);
  g.fillRect(4, 20, 20, 32);
  g.fillStyle(0xd23b3b);
  g.fillTriangle(2, 60, 4, 38, 12, 54);
  g.fillTriangle(26, 60, 24, 38, 16, 54);
  g.fillStyle(0x7fd4ff);
  g.fillCircle(14, 30, 5);
  gen('rocket', 28, 62);

  // debris chunk (white → tinted per planet; doubles as the boss's thrown rock)
  g.fillStyle(0xffffff);
  g.fillPoints(
    [
      { x: 9, y: 0 },
      { x: 18, y: 4 },
      { x: 20, y: 13 },
      { x: 12, y: 20 },
      { x: 3, y: 16 },
      { x: 0, y: 7 },
    ],
    true
  );
  g.fillStyle(0x000000, 0.22);
  g.fillTriangle(9, 0, 20, 13, 12, 20);
  gen('debris', 20, 20);

  g.destroy();
}

/**
 * Build (or reuse) the player sprite for a set of creator choices.
 *
 * Canvas is 36x54 — 6px taller than the original 36x48 so the Antenna
 * accessory has headroom above the helmet. Everything is drawn with the
 * ORIGINAL 0-48 coordinate space via `translateCanvas(0, 6)` so none of the
 * existing shapes needed their coordinates touched; new accessories that use
 * the headroom just draw at negative y (e.g. y=-4), which lands inside the
 * canvas once translated. Player.ts's body offset was bumped +6 to match.
 */
export function ensurePlayerTexture(scene: Phaser.Scene, ch: Character): string {
  const key = `player-${ch.skin}-${ch.hair}-${ch.suit}-${ch.visor}-${ch.accessory}-${ch.pattern}`;
  if (scene.textures.exists(key)) return key;

  const g = scene.add.graphics();
  g.translateCanvas(0, 6);
  const suit = SUITS[ch.suit];
  const skin = SKINS[ch.skin];
  const visor = VISORS[ch.visor];

  // legs + boots
  g.fillStyle(darken(suit));
  g.fillRect(11, 40, 6, 7);
  g.fillRect(19, 40, 6, 7);
  // backpack
  g.fillStyle(0x8892a8);
  g.fillRect(3, 26, 6, 12);
  if (ch.accessory === 3) {
    // backpack glow
    g.fillStyle(0x7fe0ff, 0.35);
    g.fillCircle(6, 30, 4.5);
    g.fillStyle(0xcaf6ff);
    g.fillCircle(6, 30, 2);
  }
  // body
  g.fillStyle(suit);
  g.fillRoundedRect(8, 24, 20, 18, 5);
  // suit chest pattern
  const trim = 0xffffff;
  switch (ch.pattern) {
    case 1: // stripe
      g.fillStyle(trim, 0.85);
      g.fillRect(8, 31, 20, 3);
      break;
    case 2: // dots
      g.fillStyle(trim, 0.9);
      g.fillCircle(14, 33, 1.6);
      g.fillCircle(18, 33, 1.6);
      g.fillCircle(22, 33, 1.6);
      break;
    case 3: // star
      g.fillStyle(trim, 0.9);
      g.fillPoints(
        [
          { x: 18, y: 28 },
          { x: 19.2, y: 31.2 },
          { x: 22.5, y: 31.2 },
          { x: 20, y: 33.2 },
          { x: 21, y: 36.5 },
          { x: 18, y: 34.5 },
          { x: 15, y: 36.5 },
          { x: 16, y: 33.2 },
          { x: 13.5, y: 31.2 },
          { x: 16.8, y: 31.2 },
        ],
        true
      );
      break;
    case 4: // bolt
      g.fillStyle(0xffe066, 0.95);
      g.fillPoints(
        [
          { x: 20, y: 27 },
          { x: 14, y: 34 },
          { x: 17.5, y: 34 },
          { x: 15, y: 39 },
          { x: 22, y: 32 },
          { x: 18.5, y: 32 },
        ],
        true
      );
      break;
    case 5: // heart
      g.fillStyle(0xff6f91, 0.95);
      g.fillCircle(16, 31.5, 2.4);
      g.fillCircle(20, 31.5, 2.4);
      g.fillTriangle(13.6, 32.5, 22.4, 32.5, 18, 37.5);
      break;
  }
  // shoulder pads accessory — drawn after the body so they actually show
  if (ch.accessory === 4) {
    g.fillStyle(0xb0b6c8);
    g.fillRoundedRect(4, 23, 8, 5, 2);
    g.fillRoundedRect(24, 23, 8, 5, 2);
    g.fillStyle(0xd8dce8, 0.7);
    g.fillRect(4, 23, 8, 1.5);
    g.fillRect(24, 23, 8, 1.5);
  }
  // helmet + face
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(18, 13, 12);
  g.fillStyle(skin);
  g.fillCircle(18, 13, 9.5);
  // hair (drawn over the helmet top — it's a space fishbowl, roll with it)
  const hc = HAIR_COLORS[ch.hair];
  if (ch.hair === 1) {
    g.fillStyle(hc);
    g.fillTriangle(10, 8, 13, 1, 16, 8);
    g.fillTriangle(15, 7, 18, 0, 21, 7);
    g.fillTriangle(20, 8, 23, 1, 26, 8);
  } else if (ch.hair === 2) {
    g.fillStyle(hc);
    g.fillEllipse(18, 8, 19, 10);
  } else if (ch.hair === 3) {
    g.fillStyle(hc);
    g.fillCircle(12, 7, 4);
    g.fillCircle(18, 5, 4.5);
    g.fillCircle(24, 7, 4);
  } else if (ch.hair === 4) {
    // mohawk
    g.fillStyle(hc);
    g.fillTriangle(14, 6, 18, -3, 19, 6);
    g.fillTriangle(17, 6, 20.5, -2, 22, 6);
    g.fillTriangle(20, 6, 23, -1, 25, 6);
  } else if (ch.hair === 5) {
    // ponytail — a little tuft at the back plus a tied strand
    g.fillStyle(hc);
    g.fillEllipse(18, 7, 17, 8);
    g.fillEllipse(29, 12, 6, 9);
  }
  // eyes + smile
  g.fillStyle(0x101018);
  g.fillCircle(14.5, 14, 1.7);
  g.fillCircle(21.5, 14, 1.7);
  g.fillRect(16, 18, 4, 1.5);
  // visor glass
  g.fillStyle(visor, 0.26);
  g.fillCircle(18, 13, 12);
  g.lineStyle(2, 0xffffff, 0.85);
  g.strokeCircle(18, 13, 12);

  // accessories drawn on top of the helmet/visor
  if (ch.accessory === 1) {
    // star clip on the helmet's side
    g.fillStyle(0xffd700);
    g.fillPoints(
      [
        { x: 28, y: 6 },
        { x: 29, y: 8.4 },
        { x: 31.5, y: 8.4 },
        { x: 29.5, y: 10 },
        { x: 30.2, y: 12.4 },
        { x: 28, y: 11 },
        { x: 25.8, y: 12.4 },
        { x: 26.5, y: 10 },
        { x: 24.5, y: 8.4 },
        { x: 27, y: 8.4 },
      ],
      true
    );
  } else if (ch.accessory === 2) {
    // bandana wrapped around the lower helmet
    g.fillStyle(0xc0392b);
    g.fillRect(6, 18, 24, 5);
    g.fillTriangle(6, 23, 10, 23, 5, 30);
    g.fillStyle(0xe74c3c);
    g.fillRect(6, 18, 24, 1.6);
  } else if (ch.accessory === 5) {
    // antenna — uses the new headroom above the helmet
    g.lineStyle(2, 0x8892a8, 1);
    g.lineBetween(18, 1, 18, -6);
    g.fillStyle(0xff5555);
    g.fillCircle(18, -7, 2.4);
    g.fillStyle(0xffb3b3, 0.8);
    g.fillCircle(18, -7, 1);
  }

  g.generateTexture(key, 36, 54);
  g.destroy();
  return key;
}

/* -------------------------------------------------------------------------- */
/*  Extravagant per-boss art (PLAN.md §3.4). Each boss gets its own fully      */
/*  colored sprite drawn once — big, characterful, and drawn back-to-front.    */
/*  Add a new planet's boss by adding a drawer to BOSS_ART, keyed by boss id.  */
/* -------------------------------------------------------------------------- */

export const BOSS_W = 128;
export const BOSS_H = 112;

// THE MOONSTER — a craggy moon-rock golem crowned with glowing shards.
function drawMoonster(g: Phaser.GameObjects.Graphics): void {
  // moon-shard crystals jutting from the shoulders (ties to the game's theme)
  const shard = (cx: number, cy: number, s: number) => {
    g.fillStyle(0xc7cde0);
    g.fillPoints(
      [
        { x: cx, y: cy - s },
        { x: cx + s * 0.55, y: cy },
        { x: cx, y: cy + s },
        { x: cx - s * 0.55, y: cy },
      ],
      true
    );
    g.fillStyle(0xeff3ff, 0.9);
    g.fillTriangle(cx, cy - s, cx + s * 0.55, cy, cx, cy);
  };
  shard(12, 74, 22);
  shard(116, 74, 22);
  shard(64, 6, 14);

  // jagged rock horn-crown
  g.fillStyle(0x7f8698);
  g.fillTriangle(20, 46, 30, 8, 44, 46);
  g.fillTriangle(50, 42, 64, 2, 78, 42);
  g.fillTriangle(84, 46, 98, 10, 108, 46);
  g.fillStyle(0x9aa0b2, 0.9);
  g.fillTriangle(30, 8, 34, 11, 44, 46);
  g.fillTriangle(64, 2, 68, 6, 78, 42);
  g.fillTriangle(98, 10, 102, 14, 108, 46);

  // lumpy craggy body mass
  g.fillStyle(0x8f96a8);
  g.fillEllipse(64, 74, 116, 76);
  g.fillCircle(26, 56, 18);
  g.fillCircle(50, 48, 20);
  g.fillCircle(80, 48, 20);
  g.fillCircle(104, 56, 18);
  g.fillCircle(34, 98, 16);
  g.fillCircle(64, 104, 18);
  g.fillCircle(96, 98, 16);

  // top-lit highlights
  g.fillStyle(0xb0b6c8, 0.7);
  g.fillEllipse(46, 50, 40, 14);
  g.fillEllipse(88, 52, 30, 12);

  // craters
  g.fillStyle(0x6f7688);
  g.fillEllipse(38, 66, 22, 13);
  g.fillEllipse(92, 60, 17, 11);
  g.fillCircle(66, 40, 7);
  g.fillCircle(24, 84, 6);
  g.fillStyle(0x5b6274);
  g.fillEllipse(38, 67, 12, 7);
  g.fillEllipse(92, 61, 9, 6);

  // angry rock brows
  g.fillStyle(0x565d6f);
  g.fillTriangle(34, 56, 60, 66, 60, 60);
  g.fillTriangle(94, 56, 68, 66, 68, 60);

  // glowing cyan eyes
  g.fillStyle(0x7fd4ff, 0.4);
  g.fillCircle(48, 70, 13);
  g.fillCircle(80, 70, 13);
  g.fillStyle(0xb6f0ff);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x0b2233);
  g.fillCircle(48, 72, 4);
  g.fillCircle(80, 72, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 68, 2);
  g.fillCircle(78, 68, 2);

  // jagged rock grin
  g.fillStyle(0x24293a);
  g.fillEllipse(64, 94, 54, 16);
  g.fillStyle(0xe6eaf4);
  for (let i = 0; i < 6; i++) {
    const x = 42 + i * 8;
    g.fillTriangle(x, 86, x + 8, 86, x + 4, 96);
    g.fillTriangle(x + 4, 102, x + 12, 102, x + 8, 92);
  }
}

// THE RED BARON — a fiery horned Martian warlord with a lava-cracked hide.
function drawRedBaron(g: Phaser.GameObjects.Graphics): void {
  // dark cape/collar behind
  g.fillStyle(0x611105);
  g.fillTriangle(8, 96, 64, 40, 120, 96);
  g.fillTriangle(4, 70, 30, 96, 24, 50);
  g.fillTriangle(124, 70, 98, 96, 104, 50);

  // big curved horns
  g.fillStyle(0xe0621c);
  g.fillTriangle(30, 44, 4, 2, 40, 40);
  g.fillTriangle(98, 44, 124, 2, 88, 40);
  g.fillStyle(0xffa040, 0.9);
  g.fillTriangle(4, 2, 12, 6, 40, 40);
  g.fillTriangle(124, 2, 116, 6, 88, 40);

  // crown of red crystals
  g.fillStyle(0xff5533);
  g.fillTriangle(48, 34, 54, 18, 60, 34);
  g.fillTriangle(58, 32, 64, 12, 70, 32);
  g.fillTriangle(68, 34, 74, 18, 80, 34);

  // main fiery body + pointed chin
  g.fillStyle(0xbe400f);
  g.fillEllipse(64, 74, 112, 76);
  g.fillTriangle(28, 82, 100, 82, 64, 112);
  g.fillStyle(0x7f2609);
  g.fillEllipse(64, 90, 96, 36);

  // shoulder spikes
  g.fillStyle(0xbe400f);
  g.fillTriangle(10, 60, 22, 48, 26, 74);
  g.fillTriangle(118, 60, 106, 48, 102, 74);

  // molten lava cracks
  g.lineStyle(3, 0xff9a2e, 1);
  g.lineBetween(40, 58, 34, 92);
  g.lineBetween(40, 74, 30, 78);
  g.lineBetween(90, 58, 96, 92);
  g.lineBetween(90, 74, 100, 78);
  g.lineBetween(64, 96, 64, 110);
  g.lineStyle(2, 0xffd24a, 0.9);
  g.lineBetween(41, 60, 36, 84);

  // flame tufts on the shoulders
  const flame = (x: number) => {
    g.fillStyle(0xff6a1a);
    g.fillTriangle(x - 8, 60, x + 8, 60, x, 34);
    g.fillStyle(0xffc23a);
    g.fillTriangle(x - 4, 58, x + 4, 58, x, 42);
  };
  flame(18);
  flame(110);

  // heavy angry brows
  g.fillStyle(0x4a0d02);
  g.fillTriangle(34, 54, 60, 66, 60, 58);
  g.fillTriangle(94, 54, 68, 66, 68, 58);

  // glowing yellow slit eyes
  g.fillStyle(0xffcc33, 0.45);
  g.fillCircle(48, 70, 12);
  g.fillCircle(80, 70, 12);
  g.fillStyle(0xffe680);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x2a0a00);
  g.fillEllipse(48, 71, 5, 10);
  g.fillEllipse(80, 71, 5, 10);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 67, 2);
  g.fillCircle(78, 67, 2);

  // fanged maw
  g.fillStyle(0x1a0500);
  g.fillEllipse(64, 94, 50, 16);
  g.fillStyle(0xfff0d6);
  g.fillTriangle(46, 86, 54, 86, 50, 98);
  g.fillTriangle(74, 86, 82, 86, 78, 98);
  g.fillTriangle(58, 102, 66, 102, 62, 90);
}

// THE BRAMBLE WARDEN — a hulking thorn-and-vine golem rooted in mossy growth.
function drawBrambleWarden(g: Phaser.GameObjects.Graphics): void {
  // woven vine loops behind the shoulders
  g.fillStyle(0x1e5c38);
  g.fillEllipse(18, 62, 26, 40);
  g.fillEllipse(110, 62, 26, 40);

  // thorn horn-crown
  g.fillStyle(0x2f7d4f);
  g.fillTriangle(24, 46, 32, 6, 44, 46);
  g.fillTriangle(52, 42, 64, 2, 76, 42);
  g.fillTriangle(84, 46, 96, 8, 104, 46);
  g.fillStyle(0x3f9863, 0.9);
  g.fillTriangle(32, 6, 36, 10, 44, 46);
  g.fillTriangle(64, 2, 68, 7, 76, 42);
  g.fillTriangle(96, 8, 100, 12, 104, 46);

  // lumpy woven vine body mass
  g.fillStyle(0x2f7d4f);
  g.fillEllipse(64, 74, 114, 74);
  g.fillCircle(28, 56, 17);
  g.fillCircle(50, 46, 19);
  g.fillCircle(80, 46, 19);
  g.fillCircle(102, 56, 17);

  // gnarled root feet fading into the mass
  g.fillStyle(0x1e5c38);
  g.fillTriangle(30, 96, 40, 110, 48, 96);
  g.fillTriangle(80, 96, 88, 110, 98, 96);
  g.fillEllipse(64, 100, 60, 20);

  // mossy top-lit highlights
  g.fillStyle(0x4fae76, 0.7);
  g.fillEllipse(46, 50, 38, 13);
  g.fillEllipse(88, 52, 28, 11);

  // bark cracks / shadow lumps
  g.fillStyle(0x1c4a2c);
  g.fillEllipse(38, 66, 20, 12);
  g.fillEllipse(92, 60, 16, 10);
  g.fillCircle(66, 40, 6);

  // glowing yellow flower/berry accents
  g.fillStyle(0xe8d24a, 0.5);
  g.fillCircle(20, 40, 8);
  g.fillCircle(108, 44, 7);
  g.fillStyle(0xe8d24a);
  g.fillCircle(20, 40, 4);
  g.fillCircle(108, 44, 3.5);

  // heavy angry thorn brows
  g.fillStyle(0x14371f);
  g.fillTriangle(34, 56, 60, 66, 60, 60);
  g.fillTriangle(94, 56, 68, 66, 68, 60);

  // glowing amber eyes (contrast against green)
  g.fillStyle(0xff8c1a, 0.4);
  g.fillCircle(48, 70, 13);
  g.fillCircle(80, 70, 13);
  g.fillStyle(0xffc266);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x3a1400);
  g.fillCircle(48, 72, 4);
  g.fillCircle(80, 72, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 68, 2);
  g.fillCircle(78, 68, 2);

  // thorny jagged mouth
  g.fillStyle(0x14371f);
  g.fillEllipse(64, 94, 52, 15);
  g.fillStyle(0xcfe8a0);
  for (let i = 0; i < 5; i++) {
    const x = 44 + i * 9;
    g.fillTriangle(x, 87, x + 7, 87, x + 3.5, 96);
  }
}

// STORMLORD GANYMEDE — a banded gas-giant storm elemental crackling with lightning.
function drawStormlordGanymede(g: Phaser.GameObjects.Graphics): void {
  // lightning-bolt crown
  g.fillStyle(0xf5dcae);
  g.fillPoints(
    [
      { x: 58, y: 6 }, { x: 70, y: 6 }, { x: 62, y: 26 }, { x: 72, y: 26 }, { x: 54, y: 48 }, { x: 60, y: 28 }, { x: 50, y: 28 },
    ],
    true
  );
  g.fillStyle(0xc98a3c);
  g.fillTriangle(18, 48, 30, 10, 42, 48);
  g.fillTriangle(86, 48, 98, 10, 110, 48);
  g.fillStyle(0xf5dcae, 0.9);
  g.fillTriangle(30, 10, 34, 14, 42, 48);
  g.fillTriangle(98, 10, 102, 14, 110, 48);

  // swirling banded body (Jupiter-style horizontal bands)
  g.fillStyle(0xc98a3c);
  g.fillEllipse(64, 74, 116, 76);
  g.fillStyle(0x3a2410, 0.55);
  g.fillEllipse(64, 54, 108, 12);
  g.fillEllipse(64, 90, 100, 14);
  g.fillStyle(0xf5dcae, 0.55);
  g.fillEllipse(64, 64, 104, 11);
  g.fillEllipse(64, 100, 84, 10);
  g.fillStyle(0x3a2410, 0.4);
  g.fillEllipse(64, 76, 110, 10);

  // shoulder storm-band spikes
  g.fillStyle(0xc98a3c);
  g.fillTriangle(8, 62, 22, 48, 24, 76);
  g.fillTriangle(120, 62, 106, 48, 104, 76);

  // Great-Red-Spot-like vortex swirl on the body
  g.fillStyle(0x8a4a24, 0.7);
  g.fillEllipse(92, 82, 26, 17);
  g.fillStyle(0xf5dcae, 0.5);
  g.fillEllipse(96, 79, 14, 8);
  g.fillStyle(0x3a2410, 0.6);
  g.fillEllipse(88, 85, 10, 6);

  // crackling lightning veins
  g.lineStyle(3, 0xf5dcae, 0.9);
  g.lineBetween(36, 50, 30, 78);
  g.lineBetween(36, 62, 42, 66);
  g.lineBetween(92, 50, 98, 78);
  g.lineStyle(2, 0xffffff, 0.8);
  g.lineBetween(37, 52, 32, 74);

  // heavy storm brows
  g.fillStyle(0x241708);
  g.fillTriangle(34, 56, 60, 66, 60, 60);
  g.fillTriangle(94, 56, 68, 66, 68, 60);

  // glowing storm-white eyes
  g.fillStyle(0xf5dcae, 0.45);
  g.fillCircle(48, 70, 13);
  g.fillCircle(80, 70, 13);
  g.fillStyle(0xfff6e2);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x3a2410);
  g.fillCircle(48, 72, 4);
  g.fillCircle(80, 72, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 68, 2);
  g.fillCircle(78, 68, 2);

  // wide swirling vortex maw
  g.fillStyle(0x241708);
  g.fillEllipse(64, 94, 54, 17);
  g.fillStyle(0xc98a3c, 0.8);
  g.fillEllipse(64, 94, 38, 11);
  g.fillStyle(0x3a2410);
  g.fillEllipse(64, 95, 20, 6);
}

// CRONUS WARDEN — a regal ringed guardian of gold and ice.
function drawCronusWarden(g: Phaser.GameObjects.Graphics): void {
  // signature flat halo ring, behind the body
  g.fillStyle(0xeaf3f7, 0.35);
  g.fillEllipse(64, 76, 128, 22);
  g.fillStyle(0xeaf3f7, 0.55);
  g.fillEllipse(64, 76, 128, 10);

  // regal crown
  g.fillStyle(0xd8c090);
  g.fillTriangle(46, 40, 54, 8, 62, 40);
  g.fillTriangle(64, 38, 64, 2, 76, 38);
  g.fillTriangle(66, 40, 74, 8, 82, 40);
  g.fillStyle(0xeaf3f7, 0.9);
  g.fillCircle(54, 12, 3.5);
  g.fillCircle(64, 6, 3.5);
  g.fillCircle(74, 12, 3.5);

  // golden armored/crystalline body
  g.fillStyle(0xd8c090);
  g.fillEllipse(64, 74, 112, 74);
  g.fillCircle(30, 56, 16);
  g.fillCircle(98, 56, 16);

  // ring-shard shoulder spikes
  g.fillStyle(0xeaf3f7);
  g.fillTriangle(6, 76, 22, 62, 26, 86);
  g.fillTriangle(122, 76, 106, 62, 102, 86);
  g.fillStyle(0xd8c090, 0.9);
  g.fillTriangle(22, 62, 26, 66, 26, 86);
  g.fillTriangle(106, 62, 102, 66, 102, 86);

  // faceted armor highlights
  g.fillStyle(0xf3e8c8, 0.7);
  g.fillEllipse(46, 50, 36, 13);
  g.fillEllipse(88, 52, 28, 11);

  // engraved armor shadow lines
  g.fillStyle(0xb39c68);
  g.fillEllipse(38, 66, 20, 12);
  g.fillEllipse(92, 60, 16, 10);
  g.lineStyle(2, 0xb39c68, 0.9);
  g.lineBetween(64, 44, 64, 88);

  // heavy golden brows
  g.fillStyle(0x8a7444);
  g.fillTriangle(34, 56, 60, 66, 60, 60);
  g.fillTriangle(94, 56, 68, 66, 68, 60);

  // glowing pale-cyan eyes
  g.fillStyle(0xaef0ff, 0.45);
  g.fillCircle(48, 70, 13);
  g.fillCircle(80, 70, 13);
  g.fillStyle(0xeaf3f7);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x1c2a2e);
  g.fillCircle(48, 72, 4);
  g.fillCircle(80, 72, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 68, 2);
  g.fillCircle(78, 68, 2);

  // stern regal mouth
  g.fillStyle(0x5c4d2e);
  g.fillEllipse(64, 94, 50, 15);
  g.fillStyle(0xeaf3f7);
  for (let i = 0; i < 5; i++) {
    const x = 45 + i * 8.5;
    g.fillTriangle(x, 88, x + 6, 88, x + 3, 96);
  }

  // front arc of the ring, drawn last so a bright edge crosses in front of
  // the shoulders (rings wrap both behind and in front of a real planet) —
  // two thin arcs low and to the sides, clear of the face entirely.
  g.fillStyle(0xeaf3f7, 0.9);
  g.fillEllipse(18, 92, 34, 8);
  g.fillEllipse(110, 92, 34, 8);
  g.fillStyle(0xd8c090, 0.9);
  g.fillEllipse(18, 92, 34, 4);
  g.fillEllipse(110, 92, 34, 4);
}

// CRYOVEX, THE SHARD KING — an angular ice-crystal king armored in faceted shards.
function drawCryovexShardKing(g: Phaser.GameObjects.Graphics): void {
  // jagged crystal crown
  g.fillStyle(0xbfe9f0);
  g.fillTriangle(20, 46, 30, 6, 42, 46);
  g.fillTriangle(50, 42, 64, 0, 78, 42);
  g.fillTriangle(86, 46, 98, 8, 108, 46);
  g.fillStyle(0xe8fbff, 0.9);
  g.fillTriangle(30, 6, 34, 10, 42, 46);
  g.fillTriangle(64, 0, 68, 5, 78, 42);
  g.fillTriangle(98, 8, 102, 12, 108, 46);

  // faceted angular armor body (triangles, not lumps)
  g.fillStyle(0x8fd0dc);
  g.fillTriangle(64, 40, 20, 68, 64, 112);
  g.fillTriangle(64, 40, 108, 68, 64, 112);
  g.fillStyle(0xbfe9f0);
  g.fillTriangle(64, 40, 28, 62, 64, 100);
  g.fillTriangle(64, 40, 100, 62, 64, 100);

  // faceted shoulder shard spikes
  g.fillStyle(0xe8fbff);
  g.fillTriangle(8, 66, 24, 50, 26, 82);
  g.fillTriangle(120, 66, 104, 50, 102, 82);
  g.fillStyle(0xbfe9f0, 0.9);
  g.fillTriangle(24, 50, 26, 56, 26, 82);
  g.fillTriangle(104, 50, 102, 56, 102, 82);

  // icy facet highlights
  g.fillStyle(0xe8fbff, 0.8);
  g.fillTriangle(64, 40, 46, 58, 64, 76);
  g.fillTriangle(64, 40, 82, 58, 64, 76);

  // deep facet cracks/shadows
  g.fillStyle(0x4a90a4);
  g.fillTriangle(38, 70, 54, 82, 40, 98);
  g.fillTriangle(90, 70, 74, 82, 88, 98);
  g.lineStyle(2, 0x2c6478, 0.9);
  g.lineBetween(64, 40, 64, 108);
  g.lineBetween(34, 66, 64, 78);
  g.lineBetween(94, 66, 64, 78);

  // heavy icy brows
  g.fillStyle(0x2c6478);
  g.fillTriangle(34, 56, 60, 66, 60, 60);
  g.fillTriangle(94, 56, 68, 66, 68, 60);

  // glowing cold blue eyes
  g.fillStyle(0x4ad4ff, 0.45);
  g.fillCircle(48, 70, 13);
  g.fillCircle(80, 70, 13);
  g.fillStyle(0xe8fbff);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x0d1b2e);
  g.fillCircle(48, 72, 4);
  g.fillCircle(80, 72, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 68, 2);
  g.fillCircle(78, 68, 2);

  // faceted diamond mouth
  g.fillStyle(0x0d1b2e);
  g.fillTriangle(64, 84, 42, 96, 64, 108);
  g.fillTriangle(64, 84, 86, 96, 64, 108);
  g.fillStyle(0xe8fbff);
  g.fillTriangle(64, 90, 52, 96, 64, 102);
  g.fillTriangle(64, 90, 76, 96, 64, 102);
}

// THE MAELSTROM WARDEN — a deep-sea storm leviathan veined with electric cyan cracks.
function drawMaelstromWarden(g: Phaser.GameObjects.Graphics): void {
  // fin/tentacle shoulder appendages behind
  g.fillStyle(0x0a0e24);
  g.fillTriangle(6, 90, 26, 42, 34, 92);
  g.fillTriangle(122, 90, 102, 42, 94, 92);
  g.fillTriangle(2, 68, 18, 96, 22, 60);
  g.fillTriangle(126, 68, 110, 96, 106, 60);

  // dark navy crown spikes
  g.fillStyle(0x141a3d);
  g.fillTriangle(24, 46, 34, 10, 46, 46);
  g.fillTriangle(52, 42, 64, 4, 76, 42);
  g.fillTriangle(82, 46, 94, 10, 104, 46);

  // main dark leviathan body mass
  g.fillStyle(0x141a3d);
  g.fillEllipse(64, 74, 114, 76);
  g.fillCircle(30, 56, 17);
  g.fillCircle(98, 56, 17);
  g.fillCircle(34, 98, 15);
  g.fillCircle(94, 98, 15);

  // swirling whirlpool motif on the chest
  g.fillStyle(0x0a0e24, 0.8);
  g.fillEllipse(64, 84, 30, 22);
  g.fillStyle(0x7fe8ff, 0.35);
  g.fillEllipse(64, 84, 22, 15);
  g.fillStyle(0x0a0e24, 0.9);
  g.fillEllipse(64, 84, 12, 8);

  // bright cyan glowing cracks/veins
  g.lineStyle(3, 0x7fe8ff, 0.9);
  g.lineBetween(38, 56, 30, 90);
  g.lineBetween(38, 70, 46, 76);
  g.lineBetween(90, 56, 98, 90);
  g.lineBetween(90, 70, 82, 76);
  g.lineStyle(2, 0xd8fbff, 0.9);
  g.lineBetween(39, 58, 33, 84);

  // heavy angry brows
  g.fillStyle(0x05081a);
  g.fillTriangle(34, 56, 60, 66, 60, 60);
  g.fillTriangle(94, 56, 68, 66, 68, 60);

  // glowing bright cyan eyes
  g.fillStyle(0x7fe8ff, 0.45);
  g.fillCircle(48, 70, 13);
  g.fillCircle(80, 70, 13);
  g.fillStyle(0xd8fbff);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x05081a);
  g.fillCircle(48, 72, 4);
  g.fillCircle(80, 72, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 68, 2);
  g.fillCircle(78, 68, 2);

  // wide dark maw with cyan-highlighted teeth
  g.fillStyle(0x05081a);
  g.fillEllipse(64, 94, 56, 18);
  g.fillStyle(0x7fe8ff);
  for (let i = 0; i < 6; i++) {
    const x = 42 + i * 8;
    g.fillTriangle(x, 86, x + 8, 86, x + 4, 96);
    g.fillTriangle(x + 4, 102, x + 12, 102, x + 8, 92);
  }
}

// THE KUIPER WARDEN — the finale boss: an ancient frozen comet-king trailing ice shards.
function drawKuiperWarden(g: Phaser.GameObjects.Graphics): void {
  // asymmetric comet-tail shard chain streaming off the back, fading in size
  const tail = (x: number, y: number, s: number) => {
    g.fillStyle(0xbfe8ff, 0.55);
    g.fillTriangle(x, y - s, x + s * 0.4, y, x, y + s);
  };
  tail(14, 40, 22);
  tail(2, 56, 16);
  tail(-6, 72, 11);
  tail(108, 34, 14);
  tail(120, 48, 9);

  // crown of ice shards
  g.fillStyle(0x141a2e);
  g.fillTriangle(24, 46, 34, 8, 46, 46);
  g.fillTriangle(52, 42, 64, 2, 76, 42);
  g.fillTriangle(82, 46, 94, 8, 104, 46);
  g.fillStyle(0xbfe8ff, 0.9);
  g.fillTriangle(34, 8, 38, 12, 46, 46);
  g.fillTriangle(64, 2, 68, 7, 76, 42);
  g.fillTriangle(94, 8, 98, 12, 104, 46);

  // dark rocky/icy frozen-asteroid body mass
  g.fillStyle(0x141a2e);
  g.fillEllipse(64, 74, 114, 76);
  g.fillCircle(28, 56, 17);
  g.fillCircle(100, 56, 17);
  g.fillCircle(34, 98, 15);
  g.fillCircle(94, 98, 15);

  // icy top-lit highlights
  g.fillStyle(0x2a3550, 0.8);
  g.fillEllipse(46, 50, 36, 13);
  g.fillEllipse(88, 52, 26, 11);

  // deep frozen craters/cracks
  g.fillStyle(0x0b0f1e);
  g.fillEllipse(38, 66, 20, 12);
  g.fillEllipse(92, 60, 16, 10);
  g.fillCircle(66, 40, 6);

  // heavy ancient brows
  g.fillStyle(0x0b0f1e);
  g.fillTriangle(34, 56, 60, 66, 60, 60);
  g.fillTriangle(94, 56, 68, 66, 68, 60);

  // glowing pale-blue eyes with extra outer halo ring (final-boss treatment)
  g.fillStyle(0xbfe8ff, 0.25);
  g.fillCircle(48, 70, 17);
  g.fillCircle(80, 70, 17);
  g.fillStyle(0xbfe8ff, 0.45);
  g.fillCircle(48, 70, 13);
  g.fillCircle(80, 70, 13);
  g.fillStyle(0xe8fbff);
  g.fillCircle(48, 70, 8);
  g.fillCircle(80, 70, 8);
  g.fillStyle(0x03040a);
  g.fillCircle(48, 72, 4);
  g.fillCircle(80, 72, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(46, 68, 2);
  g.fillCircle(78, 68, 2);

  // dark cracked maw with ice-blue highlighted cracks
  g.fillStyle(0x03040a);
  g.fillEllipse(64, 94, 54, 17);
  g.fillStyle(0x1c2440);
  for (let i = 0; i < 5; i++) {
    const x = 45 + i * 8.5;
    g.fillTriangle(x, 88, x + 6, 88, x + 3, 96);
  }
  g.lineStyle(2, 0xbfe8ff, 0.9);
  g.lineBetween(50, 88, 46, 100);
  g.lineBetween(78, 88, 82, 100);
}

const BOSS_ART: Record<string, (g: Phaser.GameObjects.Graphics) => void> = {
  'the-moonster': drawMoonster,
  'the-red-baron': drawRedBaron,
  'bramble-warden': drawBrambleWarden,
  'stormlord-ganymede': drawStormlordGanymede,
  'cronus-warden': drawCronusWarden,
  'cryovex-shard-king': drawCryovexShardKing,
  'maelstrom-warden': drawMaelstromWarden,
  'the-kuiper-warden': drawKuiperWarden,
};

/** Build (or reuse) a boss's sprite. Falls back to the generic blob for unknown ids. */
export function ensureBossTexture(scene: Phaser.Scene, bossId: string): string {
  const key = `boss-${bossId}`;
  if (scene.textures.exists(key)) return key;
  const drawer = BOSS_ART[bossId];
  if (!drawer) return 'boss';
  const g = scene.add.graphics();
  drawer(g);
  g.generateTexture(key, BOSS_W, BOSS_H);
  g.destroy();
  return key;
}
