# Solar Scouts — Game Plan & Architecture

**Status:** Proposed
**Date:** 2026-07-04
**Author:** Corina + nephews (game design), Claude (architecture)
**Audience:** This document is written so a coding agent can pick it up and build the MVP, then continue through the later phases without further design input.

*(Working title — the nephews get final naming rights.)*

---

## 1. Vision

A cozy-but-adventurous 2D browser game where kids create a character version of themselves, explore the planets of the solar system, collect planet-specific treasures, fight monsters, and defeat a boss on each world to earn that planet's **orb** and an extra **heart**. The journey ends with a jump to another solar system and the hardest boss in the game.

**Design pillars** (every feature should serve at least one):

1. **Exploration first** — planets should feel different and be fun to just walk around on.
2. **Visible progress** — orbs, hearts, and collectibles that a kid can show off ("look how far I got!").
3. **Playable in minutes** — loads in a browser tab, no install, works on a laptop at home.
4. **Easy to extend** — new planets are *data*, not code, so adding content stays cheap.

### Kid ideas → features (traceability)

| Nephews' / Corina's idea | Feature in this plan |
|---|---|
| "Make your own character version of yourself" | Character creator (§3.2) |
| "Explore game like Fortnite" / explore planets in space | Per-planet explorable maps + star map travel (§3.1, §3.6) |
| "Monsters on the planets that we have to fight" | Monsters with simple combat (§3.4) |
| Collect things, different per planet (precious object, weapons, food) | Data-driven collectibles: treasure / weapons / food (§3.5) |
| Per-planet orb after boss, hearts from bosses, heart row at top | Boss → orb + heart reward, hearts HUD (§3.3, §3.4) |
| A boss per planet, maybe Moon/Earth/Kuiper belt, super-moon bosses | Boss roster with phased rollout (§3.4, §6) |
| "Start at the moon & float to other planets, then jump to another solar system for the hardest boss" | Progression route (§3.6) |
| Corina: handle the planets' non-linear orbits | Orbital star map — see decision in §3.6 |
| Sign in & keep playing at home / save progress | Supabase auth + cloud saves (§4, §5) |
| Corina: facemesh/handmesh controls, with a toggle vs. arrows/WASD/mouse | Swappable control schemes incl. webcam face/hand tracking (§3.7) |

---

## 2. Constraints

- **Time:** MVP as fast as possible — nephews are visiting now. Target: a playable, deployed MVP in one focused build session; everything else is follow-up phases.
- **Platform:** web browser (desktop keyboard first; touch controls are a later phase).
- **Players:** children — sign-in must not require them to own an email address, and the game must be forgiving (no permadeath, generous checkpoints).
- **Team:** one developer (plus coding agents). Familiar with JavaScript/canvas (prior p5.js game). Keep the stack small.
- **Cost:** free tiers only (Supabase free tier, Vercel hobby).

---

## 3. Game Design

### 3.1 Core loop

```
Star map → land on planet → explore → collect (treasure / weapons / food)
        → fight monsters → find & defeat boss → earn ORB + HEART
        → back to star map → travel to next reachable planet → repeat
Final: jump to another solar system → hardest boss → credits
```

### 3.2 Character creator

Kid picks: skin tone, hair style + color, spacesuit color, helmet visor color. Rendered as a small layered sprite (base body + hair layer + suit tint). Saved to their profile. MVP keeps it to ~4 options per slot; more options are cheap to add later because it's just palette/layer data.

### 3.3 Player stats & HUD

- **Hearts row** (top-left, Zelda-style): start with 3 hearts, +1 per boss defeated. Monsters deal half- or full-heart damage. At 0 hearts, respawn at the planet's landing site keeping items (kid-friendly).
- **Orb row** (top-right): one slot per celestial body, fills as bosses fall. This is the "trophy shelf."
- **Inventory** (simple grid, toggle with `I` or a button): collected treasure, weapons, food. Food restores hearts when eaten.

### 3.4 Monsters & combat

- 2–3 monster types per planet (data-driven: sprite, speed, HP, damage, movement pattern — `wander`, `chase`, `hop`).
- Combat is simple and readable: melee swing (space) and/or a projectile blaster (found as a weapon pickup). Knockback + brief invulnerability flashes so it never feels unfair.
- **Boss per celestial body**: bigger sprite, more HP, one telegraphed special attack, 2 phases max. Defeat → orb + heart + a shower of that planet's treasure.
- Boss roster grows by phase (§6): MVP has Moon + Mars bosses; later Earth, the gas giants, "super-moon" bosses for planets with many moons (Jupiter/Saturn), a Kuiper Belt boss at Pluto's edge, and the final other-solar-system boss.

### 3.5 Planets & collectibles — content as data

**Each planet is a JSON file, not code.** This is the single most important architectural decision for "keep improving after the visit": adding Venus is a content task, not a programming task.

```jsonc
// content/planets/mars.json (illustrative)
{
  "id": "mars",
  "name": "Mars",
  "palette": { "ground": "#c1440e", "sky": "#2b0f0a", "accent": "#e8a87c" },
  "terrain": { "generator": "hills", "seed": 42, "width": 240 },
  "gravity": 0.38,
  "collectibles": {
    "treasure": { "id": "red-crystal", "name": "Red Crystal", "count": 12 },
    "weapon":   { "id": "dust-blaster", "name": "Dust Blaster" },
    "food":     { "id": "cave-mushroom", "name": "Cave Mushroom", "heals": 1 }
  },
  "monsters": [
    { "id": "dust-mite", "hp": 2, "damage": 0.5, "behavior": "wander" },
    { "id": "rock-golem", "hp": 4, "damage": 1, "behavior": "chase" }
  ],
  "boss": { "id": "the-red-baron", "name": "The Red Baron", "hp": 20, "phases": 2 }
}
```

Planet maps: **side-view platformer terrain, procedurally generated from a seed** (deterministic — same seed = same planet every visit, so it feels like a real place). Per-planet gravity is a free fun physics lever (moon-hopping vs. heavy Jupiter moons).

Art strategy for MVP: programmatic/placeholder sprites (tinted shapes + simple pixel sprites generated at build time or drawn once). Real pixel art is a later phase — and drawing monsters is a great activity to do *with* the nephews.

### 3.6 Progression & the orbit problem

**Route (merging both ideas):** start at the **Moon** (nephew's idea — perfect tutorial: low gravity, weak monsters, first boss), drop to **Earth** for boss #2, then travel *outward*: Mars → asteroid belt (hazard zone, no boss) → Jupiter → Saturn → Uranus → Neptune → Pluto → **Kuiper Belt boss** → final **jump to another solar system** for the hardest boss (nephew's ending, verbatim). Corina's "work toward the sun" instinct is preserved in reverse — difficulty ramps as you get farther from home, which reads intuitively.

**The non-linearity question** (planets aren't actually in a line): the answer is the **star map screen**. Planets are drawn *on their orbits, in motion around the sun*. Decision, in two stages:

- **MVP:** the star map shows real animated orbits (it's just circles and `sin/cos` — cheap and gorgeous), but progression is a **fixed unlock order**. Beat a boss → next body on the route becomes clickable. Simple, predictable, shippable.
- **Phase 3 ("orbital travel"):** Corina's idea becomes real — after each boss you can travel to the **2–3 nearest bodies given current orbital positions**, so different playthroughs take different routes. Fuel/food costs scale with distance. This is a pure star-map upgrade; nothing in the planet gameplay changes, which is why it's safe to defer.

This split is the recommended way to honor the idea without blocking the MVP on orbital math and route-balancing.

### 3.7 Controls — swappable input schemes (keyboard / mouse / face / hand)

**Core rule: gameplay code never reads devices.** Every scheme is an implementation of one interface that emits a normalized **`InputIntent`** each frame:

```ts
interface InputIntent {
  moveX: number;      // -1..1
  jump: boolean;
  attack: boolean;
  interact: boolean;  // pick up / talk / eat
}
```

Player, monsters-aggro, menus — everything consumes `InputIntent`. Swapping schemes is then a settings change, not a refactor. Schemes:

| Scheme | Mapping (defaults — tune with the nephews) | Phase |
|---|---|---|
| **Keyboard** | Arrows *and* WASD both always live (no sub-toggle needed); Space = jump, X/J = attack, E = interact | MVP |
| **Mouse** | Hold left/right of character = move, click on character = jump, click on monster = attack | MVP if trivial, else Phase 2 |
| **FaceMesh** 🎥 | Tilt head left/right = move, open mouth = jump, raise eyebrows = attack | Phase 2 |
| **HandMesh** 🎥 | Hand x-position steers, make a fist = attack, flick hand upward = jump | Phase 2 |

**Toggle:** a settings panel (gear icon on the star map + pause menu) lists all schemes; choice is hot-swappable at runtime and persisted in the save blob (`settings.controls`). Webcam schemes request camera permission on first selection; if denied, unsupported, or tracking is lost mid-game (kid walks away!), the game **falls back to keyboard automatically** — webcam input augments, never gates.

**Tech:** MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) — `FaceLandmarker` (its blendshape outputs give mouth-open/eyebrow-raise scores directly, no landmark math needed) and `HandLandmarker`. Runs as WASM/WebGPU **entirely in the browser** — video frames never leave the device, nothing is recorded or uploaded. Put a friendly line in the settings panel for parents: *"the camera magic happens only on your computer."*

**Performance:** run detection on a downscaled (~320px) video at ~24–30 fps, decoupled from Phaser's update loop; smooth the signals (a little hysteresis on mouth/fist thresholds so jumps don't stutter); pause detection when the tab is hidden or a non-webcam scheme is active.

**Phasing rationale:** the MVP ships the `InputIntent` abstraction + keyboard (and the settings toggle UI, with webcam schemes visible but marked "coming soon" if the MVP session runs short). Face/hand land in Phase 2 as a contained task — new input classes, zero gameplay changes. Building the abstraction on day one is what makes that cheap.

---

## 4. Stack — Decision Record

### Decision summary

| Layer | Choice |
|---|---|
| Game engine | **Phaser 3** (TypeScript) |
| Build tool | **Vite** |
| Backend / auth / DB | **Supabase** (Auth + Postgres + RLS) — no custom server code |
| Hosting | **Vercel** (static site; hobby tier) |
| Art (MVP) | Programmatic placeholder sprites |
| Webcam tracking (Phase 2) | **MediaPipe Tasks Vision** — FaceLandmarker + HandLandmarker, in-browser WASM |

### Option A — Phaser 3 + Vite + TypeScript ✅ chosen

| Dimension | Assessment |
|---|---|
| Complexity | Low-Med — scenes, sprites, arcade physics, input, camera, tilemaps all built in |
| Cost | Free, MIT |
| Fit for this game | Excellent — 2D platformer/explore is Phaser's home turf |
| Team familiarity | New API, but same JS/canvas mental model as p5.js; enormous docs/examples corpus (agents build Phaser games very reliably) |

**Pros:** arcade physics (gravity per scene = per-planet gravity for free), scene system maps 1:1 to our screens (Boot → CharacterCreator → StarMap → Planet → Boss), huge community.
**Cons:** some framework learning curve vs. raw p5.js.

### Option B — p5.js (the familiar choice)

**Pros:** Corina already knows it; zero new concepts.
**Cons:** no physics, no camera, no scene management, no sprite/animation system — we'd hand-roll all of it. For a multi-screen game with combat and platforming, that's *slower* to MVP despite the familiarity. Right tool for the last game, wrong tool for this one.

### Option C — Godot (web export)

**Pros:** full game editor, great for big ambitions.
**Cons:** heavy web exports (slow loads on kid laptops), a whole new editor + GDScript to learn, harder for coding agents to iterate on. Overkill.

### Backend: Option A — Supabase ✅ chosen

| Dimension | Assessment |
|---|---|
| Complexity | Low — auth + database with zero server code; the game talks to it via `supabase-js` |
| Cost | Free tier is far beyond this game's needs |
| Fit | Auth + one saves table is exactly the "small backend" requested |
| Tooling | Supabase MCP is already connected in Corina's environment — agents can create the schema directly |

**Alternatives considered:** Firebase (comparable, but Postgres + SQL + RLS beats Firestore rules for clarity, and Supabase is already wired into this environment); custom Node/Express server (strictly more code to write, host, and secure for zero benefit at this scale).

### Webcam tracking: MediaPipe Tasks Vision ✅ chosen

**Pros:** actively maintained, fast (WASM with GPU delegate), and `FaceLandmarker` ships **blendshape scores** (mouth-open, brow-raise, etc.) out of the box — exactly the signals §3.7 needs, no landmark geometry to hand-code. All client-side; zero backend or privacy surface.
**Alternatives:** ml5.js (friendly and p5-familiar, but it wraps these same models with an extra layer we don't need outside p5); raw TensorFlow.js facemesh/handpose models (lower-level, effectively superseded by MediaPipe Tasks). If Corina wants to prototype gesture mappings in a familiar sandbox first, ml5.js sketches are a fine scratchpad — the thresholds transfer.

### Hosting: Vercel ✅ chosen (GitHub Pages as fallback)

Static Vite build, so either works. Vercel wins on preview deploys ("try this new planet at this URL before it goes live") and the Vercel tooling already available in this environment. GitHub Pages stays a fine fallback since the portfolio already lives there. **Note:** Vercel CLI isn't installed yet — `npm i -g vercel` before first deploy.

### Kid-friendly sign-in (important detail)

Kids don't have email addresses. Scheme: the game shows a **"Who's playing?"** screen — kid types a **player name + 4-digit PIN**. Under the hood the client maps this to Supabase email/password auth as `<name>@solarscouts.local` with the PIN as password (email confirmation disabled in Supabase settings). Zero custom backend, feels like a game, not a bank login. Family-scale threat model: fine. *(Phase 2 nicety: emoji-based secret codes instead of PINs.)*

---

## 5. Data Model & Save Strategy

Two tables. Keep it this simple until it hurts.

```sql
-- who is playing
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null unique,
  character jsonb not null default '{}',   -- creator choices
  created_at timestamptz default now()
);

-- one row per player: the entire game state as a JSON blob
create table saves (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',        -- see shape below
  updated_at timestamptz default now()
);

-- RLS: players read/write only their own rows
alter table profiles enable row level security;
alter table saves enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own save"    on saves    for all using (auth.uid() = id);
```

**Save blob shape** (client-owned; versioned for future migrations):

```jsonc
{
  "version": 1,
  "settings": { "controls": "keyboard" },   // "keyboard" | "mouse" | "face" | "hand"
  "hearts": { "max": 4, "current": 3 },
  "orbs": ["moon", "earth"],
  "currentPlanet": "mars",
  "inventory": { "red-crystal": 7, "dust-blaster": 1, "cave-mushroom": 2 },
  "planets": { "moon": { "bossDefeated": true, "treasureFound": 12 } }
}
```

**Save policy:** autosave (debounced upsert) on the moments that matter — planet arrival, boss defeat, collectible milestones, inventory use — plus on tab close via `visibilitychange`. Game is fully playable offline/logged-out; signing in just makes progress portable. A JSON-blob save is the right call at this scale: no migrations while the game design is still being invented weekly with the nephews. Revisit (normalize tables) only if leaderboards/multiplayer arrive in Phase 5.

---

## 6. Roadmap

### Phase 0 — Scaffold (same session as MVP)
- [ ] Vite + TypeScript + Phaser project in this repo; `npm run dev` works
- [ ] Supabase project: tables + RLS from §5, email confirmation off
- [ ] Deploy pipeline to Vercel (or GitHub Pages fallback); game reachable at a URL

### Phase 1 — MVP 🎯 *"nephews can play tonight"*
- [ ] Character creator (4 slots × ~4 options), choices persist
- [ ] "Who's playing?" sign-in (name + PIN) + guest mode
- [ ] `InputIntent` abstraction (§3.7) + keyboard scheme; settings panel with controls toggle (webcam schemes listed as "coming soon")
- [ ] **Two playable bodies: Moon (tutorial) and Mars** — generated terrain, per-planet gravity, palette from planet JSON
- [ ] Walk/jump/melee combat; 2 monster types per planet
- [ ] Collectibles: 1 treasure + 1 food per planet; inventory; food heals
- [ ] 1 boss per planet → orb + heart on defeat
- [ ] HUD: hearts row, orb row
- [ ] Star map with animated orbits; fixed unlock order (Moon → Earth *locked "coming soon"* → Mars)
- [ ] Cloud save + resume from any browser

**MVP acceptance test:** a kid on a different computer can open the URL, sign in with their name + PIN, see their character, and continue from where they left off — beating the Mars boss earns an orb that's still there tomorrow.

### Phase 2 — More world *(first week after the visit)*
- Earth + Jupiter; weapon pickups (blaster projectile combat); more creator options; sound effects + music toggle; monster art drawn with the nephews (scan/photograph drawings → sprites!)
- **FaceMesh + HandMesh control schemes** (§3.7): MediaPipe integration, gesture mappings, auto-fallback to keyboard, mouse scheme if it didn't make the MVP

### Phase 3 — Orbital travel
- Star map upgrade per §3.6: nearest-2–3-bodies travel based on live orbital positions; travel costs (food as fuel); Saturn/Uranus/Neptune

### Phase 4 — Endgame
- Pluto + Kuiper Belt boss; super-moon bosses (Jupiter/Saturn); **the jump to another solar system + hardest final boss**; credits naming the designers (the nephews)

### Phase 5 — Stretch
- Touch controls (play on tablets); "postcards" (screenshot a moment, save to profile); asynchronous multiplayer touches (see flags other family members planted); new solar systems as fresh content packs

---

## 7. Repo Layout & Handoff Notes (for the building agent)

```
explore-game/
├── PLAN.md                  ← this file
├── index.html
├── src/
│   ├── main.ts              # Phaser game config + scene registry
│   ├── scenes/              # Boot, SignIn, CharacterCreator, StarMap, Planet, Boss, UI(HUD overlay), Settings
│   ├── input/               # InputIntent interface; keyboard.ts, mouse.ts, face.ts, hand.ts (MediaPipe)
│   ├── systems/             # combat.ts, terrain.ts (seeded gen), save.ts, inventory.ts
│   ├── entities/            # Player, Monster, Boss, Collectible
│   └── lib/supabase.ts      # client + auth helpers (name+PIN ↔ pseudo-email mapping)
├── content/
│   └── planets/             # moon.json, mars.json, ... (§3.5 schema)
└── public/assets/           # sprites, audio (placeholder-generated for MVP)
```

Build guidance:
1. **Build in Phase order.** Get a character walking on the Moon before touching Supabase; auth/saves slot in cleanly once the loop is fun.
2. **Everything tunable goes in planet JSON or a `balance.ts` constants file** — Corina will tune numbers with the nephews.
3. **Deterministic terrain from seeds** — planets must look identical on every visit and every device.
4. Guest mode must never block play: if Supabase is unreachable, play continues on `localStorage` and syncs later.
5. Keep sprites swappable (one folder, consistent naming) so nephew-drawn art can drop in during Phase 2.
6. **Gameplay code reads `InputIntent` only** — never `cursors.left.isDown` inside an entity. This is the contract that makes the face/hand schemes a drop-in later.

## 8. Consequences

- **Easier:** adding planets/monsters/bosses (JSON), tuning with the kids, deploying previews, agents iterating on a mainstream stack.
- **Harder:** anything real-time multiplayer later (Supabase Realtime exists, but the save model would need normalizing — accepted trade-off).
- **Revisit when:** the nephews want to play *together* live (Phase 5+), or save blobs need cross-version migrations (add a `version` migration function then — the field is already there).
