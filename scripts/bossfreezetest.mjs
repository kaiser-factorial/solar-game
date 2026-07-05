// Regression test for the boss-fight FREEZE bugs:
//  A) scanSlashHits destroyed a monster mid-iteration (Phaser caches the
//     iterate length -> undefined.active -> TypeError -> dead game loop).
//  B) the per-frame debris/rock sweep destroyed objects mid-iteration (same crash).
//  C) 'boss-special'/'monster-special' scene listeners leaked on every planet
//     re-entry, so one boss volley eventually fired N times and buried the fps.
// Usage: node scripts/bossfreezetest.mjs   (needs `npm run dev`)
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-first-run', '--window-size=1024,600'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 600 });
const errs = [];
page.on('pageerror', (e) => errs.push(`[PAGEERROR] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errs.push(`[CONSOLE.ERR] ${m.text()}`); });

await page.goto('http://localhost:5173?cb=' + Date.now(), { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2600);
const frame = () => page.evaluate(() => window.__game?.loop?.frame ?? -1);
const results = [];
const check = (n, c, x = '') => { results.push(!!c); console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); };

const land = (pid) => page.evaluate((pid) => {
  const g = window.__game;
  const data = { save: { version: 1, settings: { controls: 'keyboard', sound: 'off' }, hearts: { max: 20, current: 20 }, orbs: [], currentPlanet: '', inventory: {}, planets: { moon:{bossDefeated:true},mars:{bossDefeated:true},earth:{bossDefeated:true},jupiter:{bossDefeated:true},saturn:{bossDefeated:true},uranus:{bossDefeated:true},neptune:{bossDefeated:true} } }, character: { skin:1,hair:1,suit:1,visor:0,accessory:0,pattern:0 }, playerName: 'Reg' };
  localStorage.setItem('solar-scouts-v1', JSON.stringify(data));
  g.scene.getScenes(true).forEach((s) => { if (s.scene.key !== 'Boot') g.scene.stop(s.scene.key); });
  g.scene.start('Planet', { planetId: pid });
}, pid);

// ---- A) kill several monsters with ONE slash scan (destroy-mid-iterate) ----
await land('saturn');
await sleep(1200);
const beforeA = await frame();
await page.evaluate(() => {
  const p = window.__game.scene.getScene('Planet');
  // cluster 6 one-hp monsters right on top of the player so a single swing's
  // scanSlashHits kills several during its iteration
  const mdef = { id: 'reg-mob', name: 'Reg Mob', hp: 1, damage: 0, behavior: 'wander', speed: 0, count: 0 };
  const ctor = p.monsters.getChildren()[0]?.constructor;
  for (let i = 0; i < 6; i++) {
    const m = new ctor(p, p.player.x + (i - 3) * 6, p.player.y, mdef, 0xffffff);
    p.monsters.add(m);
  }
});
await page.keyboard.press('KeyX');
await sleep(120);
await page.keyboard.press('KeyX');
await sleep(120);
await page.keyboard.down('ArrowRight'); await page.keyboard.press('KeyX'); await page.keyboard.up('ArrowRight');
await sleep(400);
const afterA = await frame();
check('A: no crash killing a cluster mid-scan', errs.length === 0, errs.join(' | '));
check('A: game loop still advancing', afterA > beforeA, `${beforeA}->${afterA}`);

// ---- B) sweep: many rocks fall out of the world in one frame ----
const errsBeforeB = errs.length;
const beforeB = await frame();
await page.evaluate(() => {
  const p = window.__game.scene.getScene('Planet');
  for (let i = 0; i < 8; i++) {
    const r = p.physics.add.image(200 + i * 10, 2000, 'debris');
    p.bossRocks.add(r); // y=2000 is well past the world floor -> swept next frames
  }
});
await sleep(500);
const afterB = await frame();
check('B: no crash sweeping many out-of-world rocks', errs.length === errsBeforeB, errs.slice(errsBeforeB).join(' | '));
check('B: game loop still advancing', afterB > beforeB, `${beforeB}->${afterB}`);

// ---- C) listener leak: re-enter the planet repeatedly ----
let counts = [];
for (let i = 0; i < 6; i++) {
  await land('jupiter');
  await sleep(500);
  const c = await page.evaluate(() => {
    const p = window.__game.scene.getScene('Planet');
    return { boss: p.events.listenerCount('boss-special'), mon: p.events.listenerCount('monster-special') };
  });
  counts.push(c);
}
console.log('listener counts per re-entry:', JSON.stringify(counts));
const noLeak = counts.every((c) => c.boss === 1 && c.mon === 1);
check('C: boss/monster-special listeners stay at 1 across 6 re-entries', noLeak, JSON.stringify(counts.map(c=>c.boss)));

console.log('\nERRORS:', errs.length ? errs.join('\n') : 'clean');
const allPass = results.every(Boolean);
console.log('ALL FREEZE-REGRESSION CHECKS PASS:', allPass);
await browser.close();
process.exit(allPass ? 0 : 1);
