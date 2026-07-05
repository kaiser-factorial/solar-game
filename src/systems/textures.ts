import Phaser from 'phaser';
import type { Character } from './save';

// Character creator palettes — 4 options per slot (PLAN.md §3.2).
export const SKINS = [0xf2d3b3, 0xd9a066, 0x8d5524, 0x5a3825];
export const HAIR_COLORS = [0x000000, 0x222233, 0x7a4a21, 0xf4c430]; // idx 0 unused (None)
export const SUITS = [0xf2f4f8, 0xe74c3c, 0x3498db, 0x2ecc71];
export const VISORS = [0x7fd4ff, 0xffcc66, 0xcc66ff, 0x223344];
export const OPTION_NAMES: Record<string, string[]> = {
  skin: ['Peach', 'Tan', 'Brown', 'Deep'],
  hair: ['None', 'Spiky', 'Bowl', 'Curly'],
  suit: ['White', 'Red', 'Blue', 'Green'],
  visor: ['Sky', 'Gold', 'Purple', 'Night'],
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

  // food (little mushroom/berry hybrid — reads as "snack")
  g.fillStyle(0xfff2d8);
  g.fillRect(7, 9, 6, 8);
  g.fillStyle(0xff5e5e);
  g.fillEllipse(10, 7, 20, 11);
  g.fillStyle(0xffffff);
  g.fillCircle(6, 6, 2);
  g.fillCircle(13, 5, 2);
  gen('food', 20, 18);

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

  g.destroy();
}

/** Build (or reuse) the player sprite for a set of creator choices. */
export function ensurePlayerTexture(scene: Phaser.Scene, ch: Character): string {
  const key = `player-${ch.skin}-${ch.hair}-${ch.suit}-${ch.visor}`;
  if (scene.textures.exists(key)) return key;

  const g = scene.add.graphics();
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
  // body
  g.fillStyle(suit);
  g.fillRoundedRect(8, 24, 20, 18, 5);
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

  g.generateTexture(key, 36, 48);
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

const BOSS_ART: Record<string, (g: Phaser.GameObjects.Graphics) => void> = {
  'the-moonster': drawMoonster,
  'the-red-baron': drawRedBaron,
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
