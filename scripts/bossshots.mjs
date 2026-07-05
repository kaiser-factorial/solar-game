import puppeteer from 'puppeteer-core';

const SHOTS = process.argv[2] ?? '.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-first-run', '--window-size=1024,600', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 600 });
const logs = [];
page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

async function bossOn(planetId, tag) {
  // Skip straight past sign-in + creator into the planet, then to the boss.
  await page.evaluate((pid) => {
    const g = window.__game;
    const st = { skin: 1, hair: 3, suit: 2, visor: 0 };
    const save = JSON.parse(localStorage.getItem('solar-scouts-v1') || '{}');
    // ensure mars is unlocked for its boss
    const data = { save: { version: 1, settings: { controls: 'keyboard', sound: 'off' }, hearts: { max: 4, current: 4 }, orbs: [], currentPlanet: '', inventory: {}, planets: { moon: { bossDefeated: false } } }, character: st, playerName: 'Kiddo' };
    localStorage.setItem('solar-scouts-v1', JSON.stringify(data));
  }, planetId);
  await page.evaluate((pid) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => { if (s.scene.key !== 'Boot') g.scene.stop(s.scene.key); });
    g.scene.start('Planet', { planetId: pid });
  }, planetId);
  await sleep(1400);
  // walk player into the boss arena, then stand right next to the boss for the photo
  await page.evaluate(() => {
    const p = window.__game.scene.getScene('Planet');
    p.player.setPosition(p.arenaX + 130, 260);
  });
  await sleep(400);
  await page.evaluate(() => {
    const p = window.__game.scene.getScene('Planet');
    if (p.boss) {
      p.player.setPosition(p.boss.x - 110, p.boss.y);
      p.cameras.main.centerOn(p.boss.x - 40, p.boss.y);
    }
  });
  await sleep(2000);
  await page.screenshot({ path: `${SHOTS}/boss-${tag}.png` });
  // enrage: knock boss to half hp
  await page.evaluate(() => {
    const p = window.__game.scene.getScene('Planet');
    if (p.boss) { p.boss.hp = Math.floor(p.boss.maxHp / 2); }
  });
  await sleep(1400);
  await page.screenshot({ path: `${SHOTS}/boss-${tag}-enraged.png` });
}

try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 20000 });
  await sleep(2500);
  await bossOn('moon', 'moonster');
  await bossOn('mars', 'redbaron');
} finally {
  console.log('LOGS:', logs.join('\n') || 'clean');
  await browser.close();
}
