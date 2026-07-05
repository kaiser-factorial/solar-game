import { BALANCE } from './balance';

export interface Character {
  skin: number;
  hair: number;
  suit: number;
  visor: number;
}

export interface PlanetProgress {
  bossDefeated?: boolean;
  treasureFound?: number;
}

export interface SaveData {
  version: 1;
  settings: { controls: 'keyboard' | 'mouse' | 'face' | 'hand'; sound?: 'on' | 'off' };
  hearts: { max: number; current: number };
  orbs: string[];
  currentPlanet: string;
  inventory: Record<string, number>;
  planets: Record<string, PlanetProgress>;
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: { controls: 'keyboard', sound: 'on' },
    hearts: { max: BALANCE.startHearts, current: BALANCE.startHearts },
    orbs: [],
    currentPlanet: '',
    inventory: {},
    planets: {},
  };
}

type Handler = () => void;

const LOCAL_KEY = 'solar-scouts-v1';

/** Registered by lib/supabase.ts to avoid a circular import. */
export let remoteSync: (() => void) | null = null;
export function setRemoteSync(fn: () => void) {
  remoteSync = fn;
}

class GameState {
  save: SaveData = defaultSave();
  character: Character | null = null;
  playerName = 'Scout';
  authed = false;

  private handlers: Handler[] = [];
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  onChange(fn: Handler): () => void {
    this.handlers.push(fn);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== fn);
    };
  }

  /** Persist locally, notify UI, and debounce a cloud sync. */
  touch() {
    try {
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({
          save: this.save,
          character: this.character,
          playerName: this.playerName,
        })
      );
    } catch {
      /* storage full/blocked — game keeps playing in memory */
    }
    for (const h of [...this.handlers]) h();
    if (this.authed && remoteSync) {
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => remoteSync && remoteSync(), 1200);
    }
  }

  /** Immediate cloud push (used on important beats + tab hide). */
  flush() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
    if (this.authed && remoteSync) remoteSync();
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.save?.version === 1) this.save = { ...defaultSave(), ...parsed.save };
      if (parsed.character) this.character = parsed.character;
      if (parsed.playerName) this.playerName = parsed.playerName;
    } catch {
      /* corrupt save — start fresh rather than crash */
    }
  }

  /** Adopt a save pulled from the cloud. */
  adopt(save: SaveData, character: Character | null, playerName: string) {
    this.save = { ...defaultSave(), ...save };
    if (character) this.character = character;
    this.playerName = playerName || this.playerName;
    this.touch();
  }

  planet(id: string): PlanetProgress {
    if (!this.save.planets[id]) this.save.planets[id] = {};
    return this.save.planets[id];
  }

  addItem(id: string, n = 1) {
    this.save.inventory[id] = (this.save.inventory[id] ?? 0) + n;
    this.touch();
  }

  addOrb(planetId: string) {
    if (!this.save.orbs.includes(planetId)) this.save.orbs.push(planetId);
    this.save.hearts.max = Math.min(this.save.hearts.max + 1, BALANCE.maxHeartsCap);
    this.save.hearts.current = this.save.hearts.max;
    this.planet(planetId).bossDefeated = true;
    this.touch();
    this.flush();
  }

  damage(amount: number): boolean {
    this.save.hearts.current = Math.max(0, this.save.hearts.current - amount);
    this.touch();
    return this.save.hearts.current <= 0;
  }

  healFull() {
    this.save.hearts.current = this.save.hearts.max;
    this.touch();
  }

  /** Eat one unit of any food in the bag. Returns the food id eaten, or null. */
  eatFood(foods: Record<string, number>): string | null {
    if (this.save.hearts.current >= this.save.hearts.max) return null;
    for (const [id, heals] of Object.entries(foods)) {
      if ((this.save.inventory[id] ?? 0) > 0) {
        this.save.inventory[id] -= 1;
        this.save.hearts.current = Math.min(
          this.save.hearts.max,
          this.save.hearts.current + heals
        );
        this.touch();
        return id;
      }
    }
    return null;
  }
}

export const state = new GameState();

// Push the latest progress when the tab is hidden or closed.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') state.flush();
  });
}
