# Moon Shard 🌙

A space-exploration game designed and named by two excellent nephews (and
their aunt). Explore the planets, collect treasure, fight monsters, beat each
world's boss to win its **shard** — and one day, jump to another solar system
for the hardest boss of all.

Live here: https://kaiser-factorial.github.io/solar-game/

Full design + roadmap: [PLAN.md](PLAN.md)

## Play

- **Move** — arrows or WASD · **Jump** — space (stomp lil monsters!) · **Attack** — X or J
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

### Known bugs — reported by playtesting, not yet fixed

1. **Stomp sometimes damages the player instead of the monster.** Jumping on
   a monster occasionally registers as the player taking a hit rather than a
   clean stomp, even when it visually looks like a from-above landing. Likely
   a race/ordering issue between the stomp-detection overlap and the regular
   damage overlap in `src/scenes/Planet.ts` (both are registered on the same
   `player`↔`monsters` overlap pair — check whether the stomp velocity/position
   check is too strict, or whether both callbacks can fire in the same frame).
2. **Game froze on attacking The Moonster.** First reported attack against a
   boss locked up the game. Not yet reproduced/diagnosed — needs a repro
   (attack timing, boss HP at time of hit, browser console errors) before
   guessing at a fix. Prime suspects: `src/entities/Boss.ts` (the `hit()` /
   enrage path added when boss art shipped) or the overlap callback in
   `src/scenes/Planet.ts` that calls `boss.hit()` and emits `ss-boss`.

Next session: reproduce both with the browser console open (or via
`scripts/playtest.mjs`) before changing code — especially the freeze, since
"attacked and froze" could be anything from an infinite loop in `Boss.act()`
to an uncaught exception stopping the Phaser update loop silently.

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
