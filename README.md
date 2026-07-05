# Moon Shard 🌙

A space-exploration game designed and named by two excellent nephews (and
their aunt). Explore the planets, collect treasure, fight monsters, beat each
world's boss to win its **shard** — and one day, jump to another solar system
for the hardest boss of all.

Live here: https://kaiser-factorial.github.io/solar-game/

Full design + roadmap: [PLAN.md](PLAN.md)

## Play

- **Move/Aim** — arrows or WASD · **Jump** — space (stomp lil monsters!) · **Attack** — X or J
  while holding a direction
- **B** — fire the **Spaceblaster** (once you've found it on Jupiter)
- **E** — use (fly home at your rocket) · **F** — eat food · **I** — bag · **M** — sound on/off
- Beat a planet's boss → earn its shard **+1 heart**, and unlock the next world.
  The map **branches at Earth**: go inward underground (Venus → Mercury) or
  outward along the main spine (Mars → Jupiter → … → Pluto).
- Sign in with just a **name + 4-digit PIN** to keep progress across computers,
  or play as guest (saves on this computer).

## Develop

```bash
npm install
npm run dev        # local game at http://localhost:5173
npm run build      # type-check + production build to dist/
node scripts/playtest.mjs /tmp   # automated browser playtest w/ screenshots
```

Deploys to GitHub Pages automatically on push to `main`.

## Status (as of 2026-07-05)

### Latest round — feedback batch + a shipped freeze fix

- **Fixed a game-breaking boss-fight freeze** (was live). Two bugs behind one
  symptom (total freeze, music kept playing = the render loop died on an
  uncaught exception): (1) a sword/blaster killing a monster destroyed it
  *mid-iteration*, and (2) the per-frame debris/rock sweep destroyed objects
  mid-iteration — both corrupt Phaser's cached-length group iteration into an
  `undefined.active` throw. Plus a scene-event listener leak that piled up N×
  rocks over many landings. Guarded by `scripts/bossfreezetest.mjs`.
- **10 worlds, branching map.** Added **Venus & Mercury** as enclosed
  **underground cave** levels (real floor+ceiling tube corridors, glowing
  crystals, no sky) with their own bosses + music. The map now **branches at
  Earth**: inward underground (Venus → Mercury) or outward (Mars → … → Pluto).
- **Boss encounters** now seal the arena behind you (a shimmering energy wall —
  no fleeing mid-fight; mid-fight deaths respawn inside) and swap in dedicated
  **battle music** the moment you reach the boss.
- **Killable flame-dropper robots** that hover in reach and drop fire, plus
  **horizontal flying debris** — replacing the old "unkillable, sourceless"
  falling hazards on several worlds.
- **Spaceblaster** — a functional ranged weapon found on Jupiter (press **B**).
- **Per-planet fruit shapes** and an **X/X shard goal** counter with an
  "all collected!" celebration per world.
- **"Who's playing?" boot screen** — the loading board now shows every visit,
  then offers Continue vs. New player so two kids can keep separate saves.

Smoke-tested live across all 10 planets (each loads clean, boss art renders,
loop stays live, zero page errors) after the batch.


Live at https://kaiser-factorial.github.io/solar-game/ — **all 8 worlds now
playable**: Moon → Mars → Earth → Jupiter → Saturn → Uranus → Neptune → Pluto
& the Kuiper Belt, each unlocked by beating the previous world's boss. Plus:
character creator, star map with animated orbits + greyed-out locked planets,
hearts/shards HUD, seeded terrain, stomp attack, bespoke per-boss art for all
8 bosses with wake/enrage effects, composed 8-bit music + SFX (a distinct
chiptune per planet), name+PIN auth via Supabase ("catchall" project — table
setup + RLS done). **Name+PIN sign-in is fully working** — verified directly
against the live project (`node scripts/authtest.mjs`): sign-up, sign-in, and
the save round-trip all succeed with a real session. (An earlier note here said
"Confirm email" might still be blocking this — that's now confirmed stale,
whether because it was already off or got flipped along the way; either way, it
works.)

### "Who's playing?" — the boot flow now offers Continue vs. New player

The loading board (Puxel `<Splash>`) now shows on **every** visit, then hands
off to a who's-playing screen instead of silently dropping a returning guest
straight into their save (which also quietly locked one save slot). A returning
player sees **"Welcome back, &lt;name&gt;"** with **Continue** (keep going) and
**New player**; a first-timer sees the usual name+PIN / guest form. **New
player** confirms, then signs out any online session and clears the local slot
so the next kid starts clean — and, for guests, explains that one computer holds
only one guest game and nudges toward a name + PIN each, which is what actually
lets two nephews keep separate progress (each name+PIN is its own cloud save).
Covered by `scripts/welcometest.mjs`.

### The full solar system (Moon/Mars → 6 new worlds)

Each new planet is a `content/planets/*.json` file (data, not code) with its own
palette, music, monsters, boss, collectibles, and — new this round — **real
relative gravity** and an escalating difficulty curve:

- **Real planetary gravity.** Jump is now a fixed launch *velocity*, so peak
  height genuinely falls out of each world's gravity (`peak = v²/2g`). Heavy
  worlds (Jupiter, g≈0.95) give short, grounded hops; light ones (Moon 0.17,
  Pluto 0.19) let you soar. Values are hand-curated to preserve the real
  *ordering* while staying inside the 540px world height (literal real ratios
  would rocket Pluto off-screen and pin Jupiter's jumps to nearly zero). Floating
  platforms scale their height to each world's actual jump reach
  (`terrain.ts maxJumpTiles()`), so nothing is ever unreachable.
- **Varied verticality.** A zone-based generator (`src/systems/terrain.ts`)
  produces real sustained climbs/descents/plateaus, scaled by each planet's
  `verticality` (Earth 0.4 → Pluto 0.8), instead of flat ground with mild bumps.
- **Monster archetypes.** Beyond the original wander/chase: `fly` (ignores
  gravity, drifts), `hover-shoot` (holds altitude, fires slow aimed shots),
  and `jumper` (leaps at you on a cooldown). Later planets mix 3 types.
- **Boss escalation.** A generalized system (`BossDef`): `specials` (rockThrow /
  projectileBarrage / groundPound / summonMinions, cycled round-robin), 2–3
  `phases` that visibly enrage at HP thresholds, `minionMonsterId`/`maxMinions`
  for summoned reinforcements, and `midFightPowerup` (a comeback pickup that
  drops when the boss hits its final phase). The Moon/Mars bosses are
  deliberately left simple; difficulty ramps from there to the Kuiper Warden.
- **Distinct celebrations.** Shard pickup rotates the Puxel `GlobalAnimation`
  variant per planet (confetti / coin-rain / scanline …) so it never feels
  copy-pasted.

**Verified by a 7-agent live playtester panel** (one agent per new planet + one
for the star-map unlock chain), each driving the real game in a browser — not
reading source. All 7 came back passing: palettes, terrain verticality, gravity/
jump math, every monster archetype, debris hazards, and every boss (specials
firing, phase escalation at the right HP fractions, minion caps, mid-fight
powerups, defeat → orb → celebration) all checked out against each planet's JSON.
Debris spawning was independently re-confirmed clean on all six hazard planets
after the panel (the panel's shared-machine CPU contention had made it hard for
the agents to observe live). Two real issues found and fixed along the way:

- **Boss down-swing dealt phantom damage.** Arcade Physics runs overlap
  callbacks in registration order within a step, and the player-vs-boss
  touch-damage overlap was registered *before* the slash-hit overlap — so a
  clean downward hit registered damage to the boss but the same-frame touch
  check hadn't yet seen the "just hit it" protection flag, and hurt the player
  anyway. Fixed by registering the slash overlaps first. (`scripts/playtest.mjs`
  asserts this: a down-swing that lands must not change the player's i-frame
  timer.)
- **Banners could overlap.** Landing on a planet then immediately rushing the
  boss arena stacked the "&lt;PLANET&gt;" and "&lt;BOSS&gt;!!" banners at the same
  screen position into unreadable text. Now each banner clears the previous one.

### Recently fixed from playtesting

1. **Stomps now favor the player.** Jumping onto a monster uses Arcade body
   bounds with a forgiving top-hit window, so visually from-above landings
   squish the monster instead of damaging the player.
2. **The Moonster first-swing freeze is fixed.** The boss slash overlap now
   handles Phaser body-vs-sprite callback values, initializes slash hit-tracking
   defensively, and disables the boss body immediately on defeat.

`scripts/playtest.mjs` now asserts both regressions: controlled stomp must damage
or remove a monster, and the first keyboard swing against The Moonster must
reduce boss HP without a page error.

### Playtester panel results (7 agents, one per dimension)

Ran combat/stomping, platforming, star map & UI, audio, character creator,
boss fights end-to-end, and save/auth as independent agents, each driving the
live game directly (not just reading source). Six of seven came back clean;
one real bug found and fixed:

- **Knockback was getting overwritten within a single frame.** `Player.
  applyIntent()` unconditionally called `setVelocityX(moveX * speed)` every
  frame with no awareness of a recent `hurt()` knockback — so holding a
  direction key toward whatever just hit you completely cancelled the
  push-back, and even with no key held it zeroed out almost immediately.
  Fixed with a short (`BALANCE.hitstunMs = 220`) window after getting hurt
  during which the movement-input override is skipped, so the knockback is
  actually felt. Verified directly: `hitstunUntil` = hit-time + 220ms, and
  `body.velocity.x` held at the full knockback value for that entire window
  before movement input resumes.
- Everything else — stomping, i-frames, jump arcs across both planets'
  gravity, star map hover/lock states, HUD lifecycle across scene bounces,
  music track switching + no orphaned audio nodes, character creator's full
  256-combination cycle, both boss fights end-to-end (including re-confirming
  the earlier ground-sink and first-swing-freeze fixes haven't regressed),
  and the save/auth flow (including real sign-up/sign-in against the live
  project) — came back with zero findings.

### New: Puxel UI overlay (React, layered on top of Phaser)

A friend's [Puxel](https://lumpenspace.github.io/puxel/) component library (a
"brutalist retro" React UI kit) is now integrated as a DOM overlay on top of
the Phaser canvas — mounted into `game.domContainer` so it auto-inherits
Phaser's scale/position transform, no manual coordinate math:

- **Boot splash** — the old hand-drawn "MOON SHARD" text is now Puxel's
  `<Splash>` with an animated dithered `shader` background (held for a minimum
  700ms so it's actually visible — the real boot check often resolves in
  single-digit ms and would otherwise flash invisibly).
- **Hearts HUD** — replaced the hand-drawn heart icons with Puxel's segmented
  `<HealthBar>` (`cells={hearts.max}` so each pip is exactly one heart — the
  component's default `cells=10` is meant for percentage-style HP pools, not
  our small 3–10 count).
- **Shard celebration** — picking up a planet's shard now triggers a
  `<GlobalAnimation variant="confetti">` burst.
- **CRT scanlines** — a permanent `.px-crt` overlay div across the whole game
  (`index.html`), purely cosmetic.

New architecture: `src/react/` — `GameOverlay.tsx` (the component tree),
`mount.tsx` (mounts it into `game.domContainer` on Phaser's `READY` event),
`sceneStore.ts` (see the callout below). Scenes emit `game.events.emit('ss-scene', ...)`
on `create()`; Planet.ts also emits `'ss-celebrate'` on shard pickup.

**A real bug found and fixed along the way, worth knowing about:** Phaser's
own "start the first scene" listener is registered on `Core.Events.READY`
*during* `new Phaser.Game()` construction — before `mountReactOverlay()` (called
after construction returns) can add its own `READY` listener. Since listeners
fire in registration order, Boot's `create()` — and its first `ss-scene` emit
— always runs before React's listener exists, so a plain `useState`+`useEffect`
subscription permanently misses that first emission. Fixed by reading through
`useSyncExternalStore` against a tiny external store (`sceneStore.ts`) that's
pre-seeded to `'boot'` (which is always correct, since Boot is always the
first scene by construction) rather than relying on catching that race at all.
Caught by building a 100ms-resolution timeline of `activeScenes` vs. overlay
DOM content, not by staring at a screenshot.

**Not done tonight** (scope call, not a blocker): the "go full in" mandate
covered the above; `puxel`'s `SpriteAvatar` (for the character creator) and
reskinning the sign-in form with Puxel's `Input`/`Button` were left out —
the creator's hand-drawn per-choice sprite is core to "make a version of
yourself" and swapping it for a generic avatar isn't obviously a win, and the
sign-in form is currently a raw Phaser DOM-element string, not a React tree,
so reskinning it is a separate, larger lift. Also worth knowing: `puxel` is
very early (v0.1.2, no license file yet) and adds ~130KB gzip to the bundle
(react + react-dom + puxel) — fine for a family hobby project, just not a
free lunch.

### Playtest feedback round (played it live, gave 6 notes)

1. **Full-health food is now a powerup, not a no-op.** Eating at max hearts
   grants a temporary speed + attack boost (`BALANCE.powerupMs`, tinted gold,
   sparkle celebration) instead of doing nothing — food is never wasted.
2. **Falling debris hazard**, per-planet via `content/planets/*.json`'s new
   `hazards.debris` (interval/damage/speed) — `src/entities/Debris.ts`.
3. **Floating platforms for verticality.** A second terrain pass adds
   occasional 2–4-tile platforms 3–5 tiles above the local ground —
   deliberately layered on top of, not replacing, the base terrain, so
   existing collectible/monster placement math is untouched.
4. **Fixed a real bug: the boss could get stuck outside its arena.** Nothing
   previously stopped it wandering into the bumpy overworld terrain while
   chasing the player — and since it never jumps, a tall step could wedge it
   in place, unable to reach the player at all (exploitable: attack it
   through the terrain with impunity). `Boss.setArenaBounds()` now hard-clamps
   it to the flat arena, which is guaranteed obstacle-free by construction.
5. **The Red Baron has a signature move: a thrown rock projectile**
   (`BossDef.special: 'rockThrow'`, mars.json only — The Moonster is
   deliberately unchanged, as asked).
6. **The rocket now flies to you after a shard pickup**, instead of making
   you walk back across the whole level — `relocateRocket()`.

All six verified directly (not just read): debris spawn/cleanup timing over a
9s window, floating platforms confirmed structurally disconnected from the
base terrain (not just varied hill height), the arena clamp tested by forcing
the boss 500px outside its bounds, the powerup's inventory/heart math, and
the rock-throw firing on Mars but never on Moon.

### Where things live

- `content/planets/*.json` — planets are **data, not code**: palette, gravity,
  monsters, boss, collectibles. Add a planet by adding a JSON file and
  registering it in `src/content.ts` + the star map.
- `src/systems/balance.ts` — every gameplay number, ready to tune with the kids.
- `src/input/` — control schemes behind the `InputIntent` interface
  (keyboard now; FaceMesh/HandMesh land here in Phase 2).
- `src/systems/audio.ts` — all 8-bit music + SFX, synthesized in WebAudio
  (no sound files; per-planet chiptunes are composed as note data).
- Backend: Supabase (`scouts_profiles`, `scouts_saves` tables, RLS-protected)
  in the shared "catchall" project. Config in `src/lib/config.ts`.

Made with Phaser 3 + Vite + TypeScript + Supabase.
