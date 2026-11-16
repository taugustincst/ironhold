// The "More from AugustInnovations" list: node tests/more.test.js
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const M = require('../js/more.js'); const root = path.resolve(__dirname, '..');
const gradle = fs.readFileSync(path.join(root, 'android/play/build.gradle'), 'utf8');
const self = (gradle.match(/applicationId\s+['"]com\.taugustincst\.([a-z0-9]+)['"]/) || [])[1];
let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
t('this game is in the catalog', () => assert.ok(M.CATALOG.some(x => x.id === self), 'no catalog entry for ' + self));
const list = M.listFor(self);
t('the list leaves this game out', () => assert.ok(!list.some(x => x.id === self)));
t('only live titles with a hook are listed', () => assert.ok(list.every(x => x.live && x.hook)));
t('no prices or promo words on the screen', () => list.forEach(x => assert.ok(!/[$£€¥]|\bfree\b|\bsale\b|\bdiscount\b|\bprice\b/i.test(x.title + ' ' + x.hook), x.id)));
t('hooks fit one line of 80 characters', () => list.forEach(x => assert.ok(x.hook.length <= 80, x.id)));
t('every link is a Play listing on our package', () => list.forEach(x => assert.strictEqual(M.url(x), 'https://play.google.com/store/apps/details?id=com.taugustincst.' + x.id)));
t('every listed title has its icon in the build', () => list.forEach(x => assert.ok(fs.existsSync(path.join(root, M.icon(x))), M.icon(x))));
t('nearest genre comes first', () => { const share = x => x.tags.filter(g => M.CATALOG.find(c => c.id === self).tags.includes(g)).length; for (let i = 1; i < list.length; i++) assert.ok(share(list[i - 1]) >= share(list[i])); });
t('the 16+ title is never cross-promoted', () => assert.ok(!M.CATALOG.some(x => x.id === 'nightshift')));
console.log(`${n}/9 more-games checks passed`);
