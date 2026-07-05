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
auth via Supabase ("catchall" project — table setup + RLS done; **still
pending: turn off "Confirm email" in that project's Auth settings**, otherwise
sign-in returns no session).

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
