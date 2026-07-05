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

const WORLD_TILES = Math.floor(BALANCE.worldHeight / BALANCE.tile);

/**
 * Underground cave profile — a FLOOR height and a CEILING thickness per column,
 * both grown by the same zone logic as the surface generator but constrained so
 * the open corridor between them never drops below `minCorridor` tiles (so the
 * player + jumps always fit). Where floor rises and ceiling dips together you
 * get tight Mario-pipe pinches; where both pull back you get open caverns.
 *
 * Columns 0-5 are a flat, roomy spawn pad; the last 26 columns are the boss
 * arena — flat floor + a thin ceiling so the tall boss has headroom.
 */
export function generateCave(
  rng: () => number,
  cols: number,
  verticality = 0.5
): { floor: number[]; ceiling: number[] } {
  const floor: number[] = [];
  const ceiling: number[] = [];
  const minCorridor = 5; // walkable + jumpable headroom, always
  const floorMin = 2;
  const floorMax = Math.round(3 + verticality * 3); // up to 6 at v=1
  const ceilMin = 1;
  const ceilMax = Math.round(2 + verticality * 3); // up to 5 at v=1

  let f = 3;
  let c = 2;
  let fZone: Zone = 'plateau';
  let cZone: Zone = 'plateau';
  let fLeft = 0;
  let cLeft = 0;
  const pick = (): Zone => {
    const r = rng();
    const flat = Math.max(0.15, 0.5 - verticality * 0.35);
    if (r < flat) return 'plateau';
    return r < flat + (1 - flat) / 2 ? 'climb' : 'descend';
  };
  const step = (zone: Zone, v: number): number => {
    if (zone === 'climb' && rng() < 0.6 + verticality * 0.25) return v + 1;
    if (zone === 'descend' && rng() < 0.6 + verticality * 0.25) return v - 1;
    if (zone === 'plateau' && rng() < 0.25) return v + (rng() < 0.5 ? 1 : -1);
    return v;
  };

  for (let i = 0; i < cols; i++) {
    if (i < 6) {
      f = 3;
      c = 2;
    } else if (i >= cols - 26) {
      f = 3;
      c = 1;
    } else {
      if (fLeft <= 0) {
        fZone = pick();
        fLeft = 4 + Math.floor(rng() * (7 + verticality * 10));
      }
      if (cLeft <= 0) {
        cZone = pick();
        cLeft = 4 + Math.floor(rng() * (7 + verticality * 10));
      }
      fLeft--;
      cLeft--;
      f = clamp(step(fZone, f), floorMin, floorMax);
      c = clamp(step(cZone, c), ceilMin, ceilMax);
      // Never pinch the corridor shut — pull the ceiling back if it gets tight.
      if (WORLD_TILES - f - c < minCorridor) c = Math.max(ceilMin, WORLD_TILES - f - minCorridor);
    }
    floor.push(f);
    ceiling.push(c);
  }
  return { floor, ceiling };
}
