# Moon Shard 🌙

A space-exploration game designed and named by two excellent nephews (and
their aunt). Explore the planets, collect treasure, fight monsters, beat each
world's boss to win its **shard** — and one day, jump to another solar system
for the hardest boss of all.

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
