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
