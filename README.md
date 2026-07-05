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
- **E** — use (fly home at your rocket) · **F** — eat food · **I** — bag · **M** — sound on/off
- Beat a planet's boss → earn its shard **+1 heart**, and unlock the next world.
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

Live at https://kaiser-factorial.github.io/solar-game/ — Moon + Mars playable,
character creator, star map with animated orbits + greyed-out locked planets,
hearts/shards HUD, seeded terrain, stomp attack, per-boss art (The Moonster /
The Red Baron) with wake/enrage effects, composed 8-bit music + SFX, name+PIN
auth via Supabase ("catchall" project — table setup + RLS done). **Name+PIN
sign-in is fully working** — verified directly against the live project
(`node scripts/authtest.mjs`): sign-up, sign-in, and the save round-trip all
succeed with a real session. (An earlier note here said "Confirm email" might
still be blocking this — that's now confirmed stale, whether because it was
already off or got flipped along the way; either way, it works.)

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
