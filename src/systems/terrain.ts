import { BALANCE } from './balance';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Zone = 'climb' | 'descend' | 'plateau';

/**
 * How high (in tiles) a jump actually reaches on a planet with this gravity —
 * mirrors the gravity.y formula in Planet.ts's create(). Used to scale
 * floating-platform placement so platforms stay reachable even on heavy
 * planets (tiny jumps) and don't feel wasted on light ones (huge jumps).
 */
export function maxJumpTiles(gravity: number): number {
  const gravityY = Math.max(380, 2600 * gravity);
  const peakPx = (BALANCE.jumpVelocity * BALANCE.jumpVelocity) / (2 * gravityY);
  return peakPx / BALANCE.tile;
}

/**
 * Seeded ground-height profile (one tile-height value per column). Replaces
 * the old "mild ±1 random bump" generator with real, sustained climb/descend
 * runs — a valley emerges naturally from a descend zone followed by a climb
 * zone, a hill from climb followed by descend. `verticality` (0..1) scales
 * how long/steep those runs get and how tall/deep the overall range is;
 * height still only ever changes by at most 1 tile per column, so every
 * step stays jumpable regardless of how dramatic the planet is overall.
 *
 * Columns 0-5 are always a flat spawn pad, and the last 26 columns are
 * always the flat boss arena — neither is touched by zone generation.
 */
export function generateHeights(rng: () => number, cols: number, verticality = 0.2): number[] {
  const heights: number[] = [];
  const minH = 2;
  // Capped conservatively: at verticality=1, maxH=13 tiles (416px) still leaves
  // ~124px of sky above the tallest peak in the fixed 540px-tall world.
  const maxH = Math.round(8 + verticality * 5); // 8 at v=0, up to 13 at v=1
  let h = 4;
  let zone: Zone = 'plateau';
  let zoneLeft = 0;

  const pickZone = (): Zone => {
    const r = rng();
    const plateauChance = Math.max(0.15, 0.55 - verticality * 0.4);
    if (r < plateauChance) return 'plateau';
    return r < plateauChance + (1 - plateauChance) / 2 ? 'climb' : 'descend';
  };

  for (let i = 0; i < cols; i++) {
    if (i < 6) {
      h = 4;
    } else if (i >= cols - 26) {
      h = 3;
    } else {
      if (zoneLeft <= 0) {
        zone = pickZone();
        zoneLeft = 5 + Math.floor(rng() * (8 + verticality * 12));
      }
      zoneLeft--;
      if (zone === 'climb' && rng() < 0.65 + verticality * 0.2) h += 1;
      else if (zone === 'descend' && rng() < 0.65 + verticality * 0.2) h -= 1;
      else if (zone === 'plateau' && rng() < 0.3) h += rng() < 0.5 ? 1 : -1;
      h = clamp(h, minH, maxH);
    }
    heights.push(h);
  }
  return heights;
}
