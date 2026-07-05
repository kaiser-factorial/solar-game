// Verifies the boot "who's playing?" flow end-to-end against a running dev
// server: first-time visitors get the sign-in form; returning players get a
// "Welcome back, <name>" panel with Continue (keeps progress) and New player
// (confirm -> sign out + local wipe -> back to the form for a different kid).
// Usage: node scripts/welcometest.mjs <screenshot-dir>   (needs `npm run dev`)
import puppeteer from 'puppeteer-core';

const SHOTS = process.argv[2] ?? '.';
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

const activeScenes = () => page.evaluate(() =>
  window.__game.scene.getScenes(true).map((s) => s.scene.key));
const domHas = (id) => page.evaluate((id) => !!document.getElementById(id), id);

const results = [];
const check = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

// ---- 1. FIRST-TIME visitor: fresh localStorage -> sign-in FORM (not welcome) ----
await page.goto('http://localhost:5173?cb=' + Date.now(), { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2600); // splash (700ms) + boot
check('first-time: on SignIn scene', (await activeScenes()).includes('SignIn'));
check('first-time: shows the name field (form, not welcome)', await domHas('ss-name'));
check('first-time: no Continue button', !(await domHas('ss-continue')));
await page.screenshot({ path: `${SHOTS}/welcome-1-firsttime-form.png` });

// become a guest named Milo, make a character, reach the star map, then define progress
await page.evaluate(() => { document.getElementById('ss-name').value = 'Milo'; document.getElementById('ss-guest').click(); });
await sleep(900);
check('first-time guest: reached CharacterCreator', (await activeScenes()).includes('CharacterCreator'));
await page.evaluate(() => {
  const cc = window.__game.scene.getScene('CharacterCreator');
  cc.ch = { skin: 2, hair: 1, suit: 3, visor: 1, accessory: 0, pattern: 0 };
  cc.refresh(); cc.done();
});
await sleep(1000);
check('first-time guest: reached StarMap', (await activeScenes()).includes('StarMap'));
// give Milo some progress so we can prove Continue preserves it
await page.evaluate(() => {
  window.__game.registry; // noop
  const st = window.__gameState || null; void st;
});
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('solar-scouts-v1'));
  s.save.planets = { moon: { bossDefeated: true } };
  s.save.orbs = ['moon'];
  localStorage.setItem('solar-scouts-v1', JSON.stringify(s));
});

// ---- 2. RETURNING player: reload -> WELCOME BACK panel with Milo ----
await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2600);
check('returning: on SignIn scene', (await activeScenes()).includes('SignIn'));
check('returning: shows Continue button', await domHas('ss-continue'));
check('returning: shows New player button', await domHas('ss-new'));
check('returning: NO raw name field yet', !(await domHas('ss-name')));
const nameShown = await page.evaluate(() => document.querySelector('.ss-welcome-name')?.textContent);
check('returning: greets by name (Milo)', nameShown === 'Milo', `got="${nameShown}"`);
await page.screenshot({ path: `${SHOTS}/welcome-2-returning.png` });

// ---- 2a. CONTINUE -> StarMap, progress intact ----
await page.evaluate(() => document.getElementById('ss-continue').click());
await sleep(1200);
check('continue: reached StarMap', (await activeScenes()).includes('StarMap'));
const orbsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('solar-scouts-v1')).save.orbs);
check('continue: kept Milo progress (moon orb)', Array.isArray(orbsAfter) && orbsAfter.includes('moon'), `orbs=${JSON.stringify(orbsAfter)}`);

// ---- 3. NEW PLAYER: reload -> welcome -> New player -> confirm -> reset to form ----
await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
await sleep(2600);
check('newplayer: back on welcome (returning)', await domHas('ss-continue'));
await page.evaluate(() => document.getElementById('ss-new').click());
await sleep(200);
check('newplayer: confirm step shows Yes button', await domHas('ss-new-yes'));
check('newplayer: confirm step shows Cancel', await domHas('ss-new-cancel'));
await page.screenshot({ path: `${SHOTS}/welcome-3-confirm.png` });
// cancel first, verify it returns to main
await page.evaluate(() => document.getElementById('ss-new-cancel').click());
await sleep(150);
const mainVisibleAfterCancel = await page.evaluate(() => getComputedStyle(document.getElementById('ss-main')).display !== 'none');
check('newplayer: Cancel returns to Continue/New', mainVisibleAfterCancel);
// now actually go new
await page.evaluate(() => document.getElementById('ss-new').click());
await sleep(150);
await page.evaluate(() => document.getElementById('ss-new-yes').click());
await sleep(1400);
check('newplayer: reset to sign-in form (name field back)', await domHas('ss-name'));
check('newplayer: no Continue button anymore', !(await domHas('ss-continue')));
const clearedLocal = await page.evaluate(() => localStorage.getItem('solar-scouts-v1'));
check('newplayer: local save wiped', clearedLocal === null, `local=${clearedLocal}`);
await page.screenshot({ path: `${SHOTS}/welcome-4-newplayer-form.png` });

console.log('\nERRORS:', errs.length ? errs.join('\n') : 'clean');
const allPass = results.every((r) => r.pass) && errs.length === 0;
console.log('ALL WELCOME-FLOW CHECKS PASS:', allPass);
await browser.close();
process.exit(allPass ? 0 : 1);
