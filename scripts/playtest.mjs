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

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 20000 });
  await sleep(2500);
  await shot('01-signin');

  // guest flow
  await page.evaluate(() => {
    const n = document.getElementById('ss-name');
    if (n) n.value = 'Testo';
    document.getElementById('ss-guest')?.click();
  });
  await sleep(900);
  await shot('02-creator');

  // pick a look and blast off
  await page.evaluate(() => {
    const g = window.__game;
    const cc = g.scene.getScene('CharacterCreator');
    cc.ch = { skin: 1, hair: 3, suit: 2, visor: 0, accessory: 5, pattern: 3 };
    cc.refresh();
  });
  await sleep(300);
  await shot('03-creator-custom');
  await page.evaluate(() => window.__game.scene.getScene('CharacterCreator').done());
  await sleep(1200);
  await shot('04-starmap');

  // land on the moon
  await page.evaluate(() =>
    window.__game.scene.getScene('StarMap').scene.start('Planet', { planetId: 'moon' })
  );
  await sleep(1500);
  await shot('05-moon-landing');

  // walk right, jump, attack
  await page.keyboard.down('ArrowRight');
  await sleep(1400);
  await page.keyboard.press('Space');
  await sleep(600);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('KeyX');
  await sleep(400);
  await shot('06-moon-explore');

  // stomp test: drop the player onto a monster from above — it should take damage
  const stomp = await page.evaluate(async () => {
    const p = window.__game.scene.getScene('Planet');
    for (let attempt = 0; attempt < 4; attempt++) {
      const m = p.monsters.getChildren().find((x) => x.active);
      if (!m) return 'no-monster';
      const before = p.monsters.countActive();
      const hpBefore = m.hp;
      m.def.speed = 0;
      m.setVelocity(0, 0);
      m.body.reset(m.x, m.y);
      p.player.body.reset(m.x, m.y - 80);
      p.player.setVelocity(0, 250);
      await new Promise((r) => setTimeout(r, 900));
      const result = { attempt, before, after: p.monsters.countActive(), hpBefore, hpAfter: m.active ? m.hp : 'dead' };
      if (result.after === result.before - 1 || result.hpAfter === 'dead' || result.hpAfter < result.hpBefore) {
        return result;
      }
    }
    return 'no-stomp-hit';
  });
  console.log('STOMP-TEST', JSON.stringify(stomp));
  // Success = the TARGET monster died/took damage from the stomp. The overall
  // active-count check only catches "stomp did nothing" (after > before - 1);
  // it tolerates after < before - 1, since unseeded monster wander (Math.random(),
  // not the deterministic terrain RNG) occasionally drifts a second monster into
  // the drop zone by chance — an incidental extra kill, not a broken stomp.
  const targetDied = stomp !== 'no-monster' && stomp !== 'no-stomp-hit' && stomp.hpAfter === 'dead';
  const targetDamaged =
    stomp !== 'no-monster' && stomp !== 'no-stomp-hit' && typeof stomp.hpAfter === 'number' && stomp.hpAfter < stomp.hpBefore;
  if (stomp === 'no-monster' || stomp === 'no-stomp-hit' || (!targetDied && !targetDamaged) || stomp.after > stomp.before - 1) {
    throw new Error(`Stomp regression: ${JSON.stringify(stomp)}`);
  }

  // teleport to the boss arena to test the fight
  await page.evaluate(() => {
    const g = window.__game;
    const p = g.scene.getScene('Planet');
    p.player.setPosition(p.arenaX + 120, 300);
  });
  await sleep(1800);
  await shot('07-moon-boss');

  const firstBossSwing = await page.evaluate(async () => {
    const p = window.__game.scene.getScene('Planet');
    const boss = p.boss;
    if (!boss) return 'no-boss';
    p.player.setPosition(boss.x - 48, boss.y + 14);
    p.player.setVelocity(0, 0);
    p.player.facing = 1;
    const before = boss.hp;
    await new Promise((r) => setTimeout(r, 80));
    return { before, after: boss.hp, active: boss.active };
  });
  await page.keyboard.down('KeyX');
  await sleep(80);
  await page.keyboard.up('KeyX');
  await sleep(450);
  const firstBossSwingResult = await page.evaluate((beforeResult) => {
    const p = window.__game.scene.getScene('Planet');
    const boss = p.boss;
    if (!boss || beforeResult === 'no-boss') return beforeResult;
    return { ...beforeResult, after: boss.hp, active: boss.active };
  }, firstBossSwing);
  console.log('BOSS-FIRST-SWING', JSON.stringify(firstBossSwingResult));
  if (
    firstBossSwingResult === 'no-boss' ||
    !firstBossSwingResult.active ||
    firstBossSwingResult.after !== firstBossSwingResult.before - 1
  ) {
    throw new Error(`Boss first-swing regression: ${JSON.stringify(firstBossSwingResult)}`);
  }

  const bossDownSwing = await page.evaluate(async () => {
    const p = window.__game.scene.getScene('Planet');
    const boss = p.boss;
    if (!boss) return 'no-boss';
    p.player.body.reset(boss.x, boss.y - 78);
    p.player.setVelocity(0, 180);
    boss.body.reset(boss.x, boss.y);
    boss.setVelocity(0, 0);
    const before = boss.hp;
    const hurtBefore = p.player.invulnUntil ?? 0;
    await new Promise((r) => setTimeout(r, 80));
    return { before, after: boss.hp, active: boss.active, hurtBefore, hurtAfter: p.player.invulnUntil ?? 0 };
  });
  await page.keyboard.down('ArrowDown');
  await page.keyboard.down('KeyX');
  await sleep(80);
  await page.keyboard.up('KeyX');
  await sleep(650);
  await page.keyboard.up('ArrowDown');
  const bossDownSwingResult = await page.evaluate((beforeResult) => {
    const p = window.__game.scene.getScene('Planet');
    const boss = p.boss;
    if (!boss || beforeResult === 'no-boss') return beforeResult;
    return { ...beforeResult, after: boss.hp, active: boss.active, hurtAfter: p.player.invulnUntil ?? 0 };
  }, bossDownSwing);
  console.log('BOSS-DOWN-SWING', JSON.stringify(bossDownSwingResult));
  if (
    bossDownSwingResult === 'no-boss' ||
    !bossDownSwingResult.active ||
    bossDownSwingResult.after !== bossDownSwingResult.before - 1 ||
    bossDownSwingResult.hurtAfter !== bossDownSwingResult.hurtBefore
  ) {
    throw new Error(`Boss down-swing regression: ${JSON.stringify(bossDownSwingResult)}`);
  }

  // hammer the boss with direct hits to verify the defeat flow
  await page.evaluate(() => {
    const p = window.__game.scene.getScene('Planet');
    if (p.boss) {
      while (p.boss.hp > 1) p.boss.hit(0);
    }
  });
  await page.keyboard.press('KeyX');
  await sleep(500);
  await page.evaluate(() => {
    const p = window.__game.scene.getScene('Planet');
    if (p.boss) {
      p.game.events.emit('ss-boss', null);
      while (!p.boss.hit(0)) {} // finish him
      p.bossDefeated();
    }
  });
  await sleep(1500);
  await shot('08-moon-orb');

  // grab the orb by walking onto it
  await page.evaluate(() => {
    const p = window.__game.scene.getScene('Planet');
    const st = JSON.parse(localStorage.getItem('solar-scouts-v1') ?? '{}');
    window.__pre = st.save?.hearts?.max;
  });
  await page.keyboard.down('ArrowRight');
  await sleep(1500);
  await page.keyboard.up('ArrowRight');
  await sleep(800);
  await shot('09-after-orb');

  // check save state + mars palette
  const summary = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('solar-scouts-v1') ?? '{}');
    return {
      preMaxHearts: window.__pre,
      save: st.save,
      character: st.character,
      name: st.playerName,
    };
  });
  console.log('SAVE-SUMMARY', JSON.stringify(summary, null, 2));

  await page.evaluate(() =>
    window.__game.scene.getScene('Planet').scene.start('Planet', { planetId: 'mars' })
  );
  await sleep(1500);
  await shot('10-mars');
  await page.keyboard.down('ArrowRight');
  await sleep(1200);
  await page.keyboard.up('ArrowRight');
  await shot('11-mars-explore');

  // back to star map — mars should now be unlocked + moon orb badge
  await page.evaluate(() =>
    window.__game.scene.getScene('Planet').scene.start('StarMap')
  );
  await sleep(1000);
  await shot('12-starmap-progress');
} finally {
  console.log('CONSOLE-LOGS:\n' + logs.filter((l) => !l.startsWith('[log]')).join('\n'));
  await browser.close();
}
