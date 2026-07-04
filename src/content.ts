import moonJson from '../content/planets/moon.json';
import marsJson from '../content/planets/mars.json';

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  behavior: 'wander' | 'chase';
  speed: number;
  count: number;
}

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
}

export interface PlanetDef {
  id: string;
  name: string;
  palette: { ground: string; sky: string; accent: string };
  terrain: { generator: string; seed: number; width: number };
  gravity: number;
  collectibles: {
    treasure: { id: string; name: string; count: number };
    food: { id: string; name: string; heals: number; count: number };
  };
  monsters: MonsterDef[];
  boss: BossDef;
}

export const PLANETS: Record<string, PlanetDef> = {
  moon: moonJson as PlanetDef,
  mars: marsJson as PlanetDef,
};

export const ORB_COLORS: Record<string, number> = {
  moon: 0xd8dce8,
  mars: 0xff6a33,
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
