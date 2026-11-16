// Headless smoke test: node tests/smoke.js http://localhost:8777/ironhold/
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:8777/ironhold/';
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await p.goto(base); await p.waitForTimeout(500);
  check('title screen lists maps', (await p.locator('.mapbtn').count()) === 3);
  check('the title screen offers More games', await p.isVisible('#btn-more'));
  await p.click('#btn-more'); await p.waitForSelector('#screen-more:not([hidden])');
  { const rows = await p.$$eval('#more-list a', as => as.map(a => ({ href: a.href, t: a.textContent }))); check('More games lists the other live games with a Play link each', rows.length >= 2 && rows.every(r => r.href.startsWith('https://play.google.com/store/apps/details?id=com.taugustincst.') && !r.href.endsWith('.ironhold') && !/[$£€]/.test(r.t)), JSON.stringify(rows.map(r => r.href.split('.').pop()))); }
  check('every other-game icon loads', await p.evaluate(() => Promise.all([...document.querySelectorAll('#more-list img')].map(i => i.decode().then(() => i.naturalWidth > 0, () => false))).then(a => a.length > 0 && a.every(Boolean))));
  await p.click('#btn-more-back'); check('Back returns to the title', await p.isVisible('#screen-title') && await p.isHidden('#screen-more'));
  check('More games is not reachable from the pause screen', (await p.locator('#screen-pause #btn-more, #app #btn-more').count()) === 0);
  // Game over with no towers
  await p.click('.mapbtn'); await p.evaluate(() => { const H = window.__ironhold; H.G.speed = 3; H.G.lives = 2; H.startWave(true); });
  await p.waitForFunction(() => !document.querySelector('#screen-end').hidden, null, { timeout: 60000 });
  check('game over screen after losing lives', (await p.textContent('#end-title')).includes('fallen'));
  await p.click('#btn-end-menu'); await p.waitForTimeout(200);
  // Build, clear a wave, save, reload, continue
  await p.click('.mapbtn'); await p.evaluate(() => { const H = window.__ironhold; H.G.gold = 500; H.buyTower('archer', 2, 2); H.buyTower('cannon', 2, 0); H.G.speed = 3; H.startWave(true); });
  await p.waitForFunction(() => window.__ironhold.G.phase === 'countdown', null, { timeout: 60000 });
  const before = await p.evaluate(() => ({ w: window.__ironhold.G.wave, t: window.__ironhold.G.towers.length }));
  await p.click('#btn-pause'); await p.click('#btn-quit'); await p.waitForTimeout(300); await p.reload(); await p.waitForTimeout(400);
  check('continue button offered after quitting between waves', await p.isVisible('#btn-continue'));
  await p.click('#btn-continue'); await p.waitForTimeout(200);
  const after = await p.evaluate(() => ({ w: window.__ironhold.G.wave, t: window.__ironhold.G.towers.length }));
  check('saved run restores wave and towers', before.w === after.w && before.t === after.t, JSON.stringify(after));
  // Tap to select a cell and buy via the panel
  const r = await p.evaluate(() => { const c = document.querySelector('#c').getBoundingClientRect(); return { x: c.left + c.width * (6.5 / 13), y: c.top + c.height * (0.5 / 13) }; });
  await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(100);
  check('tapping a free tile opens the build menu', (await p.locator('#panel-left .card-t').count()) === 5);
  const tBefore = await p.evaluate(() => window.__ironhold.G.towers.length);
  await p.click('#panel-left [data-build="archer"]'); await p.waitForTimeout(100);
  check('buying from the panel places a tower', (await p.evaluate(() => window.__ironhold.G.towers.length)) === tBefore + 1);
  // Victory
  await p.evaluate(() => { const H = window.__ironhold, G = H.G; G.wave = 39; G.gold = 99999; const free = []; for (let i = 0; i < G.map.cells.length; i++) if (G.map.cells[i] === 0) free.push(i); free.slice(0, 50).forEach((i, k) => H.buyTower(['tesla', 'cannon', 'archer', 'frost'][k % 4], i % 13, Math.floor(i / 13))); G.towers.forEach(t => t.lv = 2); G.speed = 3; H.startWave(true); });
  await p.waitForFunction(() => !document.querySelector('#screen-end').hidden, null, { timeout: 120000 });
  check('victory after wave 40', (await p.textContent('#end-title')).includes('Victory') && await p.isVisible('#btn-endless'));
  await p.click('#btn-endless'); await p.waitForTimeout(200);
  check('endless mode continues', await p.evaluate(() => window.__ironhold.G.endless && window.__ironhold.G.phase === 'countdown'));
  check('no page errors, console errors or failed requests', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(failures ? `${failures} FAILED` : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
