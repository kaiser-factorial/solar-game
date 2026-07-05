import moonJson from '../content/planets/moon.json';
import marsJson from '../content/planets/mars.json';
import earthJson from '../content/planets/earth.json';
import venusJson from '../content/planets/venus.json';
import mercuryJson from '../content/planets/mercury.json';
import jupiterJson from '../content/planets/jupiter.json';
import saturnJson from '../content/planets/saturn.json';
import uranusJson from '../content/planets/uranus.json';
import neptuneJson from '../content/planets/neptune.json';
import plutoJson from '../content/planets/pluto.json';

/**
 * Monster behaviors. 'wander'/'chase' are ground-bound (original set).
 * 'fly' hovers at a fixed height and drifts side to side, ignoring gravity.
 * 'hover-shoot' holds position/altitude and periodically fires a slow
 * projectile at the player. 'jumper' idles then leaps toward the player
 * on a cooldown. 'flame-dropper' is a low-hovering robot that drifts
 * slowly and drops flames straight down — unlike 'hover-shoot' it clamps
 * its altitude to stay within jump reach on every planet, so it's
 * killable everywhere. New archetypes let later planets feel different,
 * not just re-tinted Moon/Mars monsters at higher numbers.
 */
export type MonsterBehavior = 'wander' | 'chase' | 'fly' | 'hover-shoot' | 'jumper' | 'flame-dropper';

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  behavior: MonsterBehavior;
  speed: number;
  count: number;
  /** For 'fly'/'hover-shoot'/'flame-dropper': how high above its spawn point it holds. */
  flyHeight?: number;
  /** For 'hover-shoot': projectile cooldown. For 'jumper': leap cooldown. For 'flame-dropper': flame-drop cooldown. */
  actionCooldownMs?: number;
}

/**
 * Signature moves beyond the baseline walk/telegraph/charge pattern.
 * rockThrow — single aimed projectile.
 * projectileBarrage — a 3-shot spread, harder to dodge than one rock.
 * groundPound — leaps, then slams down; damages the player if caught
 *   within the landing shockwave radius.
 * summonMinions — periodically spawns reinforcements (minionMonsterId)
 *   up to maxMinions concurrent, so later fights aren't solo.
 */
export type BossSpecialType = 'rockThrow' | 'projectileBarrage' | 'groundPound' | 'summonMinions';

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  /** Cycled round-robin on the special-attack cooldown. Empty/omitted = base pattern only. */
  specials?: BossSpecialType[];
  /** Escalation thresholds beyond the base fight — 2 = one enrage at 50% hp (default), 3 = also at ~25%. */
  phases?: 2 | 3;
  /** Monster id summoned by the 'summonMinions' special. */
  minionMonsterId?: string;
  maxMinions?: number;
  /** Drops a grabbable powerup pickup the moment the boss enters its final phase — a comeback chance in a tough fight. */
  midFightPowerup?: boolean;
}

export interface DebrisDef {
  intervalMs: number;
  damage: number;
  speed: number;
  /**
   * How the debris travels. 'fall' (default) rains straight down from the
   * top of the screen; 'horizontal' flies in from a screen edge at roughly
   * player height; 'mixed' randomly picks one or the other per spawn.
   */
  direction?: 'fall' | 'horizontal' | 'mixed';
}

export interface PlanetDef {
  id: string;
  name: string;
  palette: { ground: string; sky: string; accent: string };
  terrain: {
    generator: string;
    seed: number;
    width: number;
    /** 0..1 — how dramatic the terrain's climbs/descents/platforming get. Untuned planets default low (gentle hills). */
    verticality?: number;
    /** 'surface' (default) is open sky; 'cave' is an enclosed underground level with a ceiling + tube corridors. */
    style?: 'surface' | 'cave';
  };
  gravity: number;
  collectibles: {
    treasure: { id: string; name: string; count: number };
    food: { id: string; name: string; heals: number; count: number };
    /** A one-time findable weapon pickup (e.g. the spaceblaster on Jupiter). */
    weapon?: { id: string; name: string };
  };
  monsters: MonsterDef[];
  boss: BossDef;
  hazards?: { debris?: DebrisDef };
  /** Shard-pickup celebration variant — distinct per planet so it doesn't feel copy-pasted. Defaults to 'confetti'. */
  celebration?: 'confetti' | 'burst' | 'sparkles' | 'coin-rain' | 'scanline';
}

export const PLANETS: Record<string, PlanetDef> = {
  moon: moonJson as PlanetDef,
  mars: marsJson as PlanetDef,
  earth: earthJson as PlanetDef,
  venus: venusJson as PlanetDef,
  mercury: mercuryJson as PlanetDef,
  jupiter: jupiterJson as PlanetDef,
  saturn: saturnJson as PlanetDef,
  uranus: uranusJson as PlanetDef,
  neptune: neptuneJson as PlanetDef,
  pluto: plutoJson as PlanetDef,
};

export const ORB_COLORS: Record<string, number> = {
  moon: 0xd8dce8,
  mars: 0xff6a33,
  earth: 0xe8d24a,
  venus: 0xff8a2a,
  mercury: 0xffe27a,
  jupiter: 0xf5dcae,
  saturn: 0xeaf3f7,
  uranus: 0xe8fbff,
  neptune: 0x7fe8ff,
  pluto: 0xbfe8ff,
};

export interface ItemInfo {
  name: string;
  kind: 'treasure' | 'food';
  heals?: number;
  planet: string;
  accent: number;
}

export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export const ITEMS: Record<string, ItemInfo> = {};
export const FOOD_HEALS: Record<string, number> = {};

for (const p of Object.values(PLANETS)) {
  const accent = hexToInt(p.palette.accent);
  const t = p.collectibles.treasure;
  const f = p.collectibles.food;
  ITEMS[t.id] = { name: t.name, kind: 'treasure', planet: p.id, accent };
  ITEMS[f.id] = { name: f.name, kind: 'food', heals: f.heals, planet: p.id, accent };
  FOOD_HEALS[f.id] = f.heals;
}
