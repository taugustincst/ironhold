'use strict';
/* Ironhold Tower Defense — © AugustInnovations LLC */

const CELL = 48, TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const $ = s => document.querySelector(s);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ================= DATA ================= */
const MAP_DEFS = [
  { id: 'greenfield', name: 'Greenfield Pass', desc: 'A winding country road. Good place to learn.', cols: 13, rows: 13, diff: 1.0, gold: 180, lives: 20, waves: 40, seed: 11, rocks: 9,
    theme: { grass: ['#4f8a3c', '#4a8238', '#558f41'], path: '#c9a86a', edge: '#9d7f47', water: null },
    paths: [[[-1, 1], [3, 1], [3, 5], [8, 5], [8, 2], [11, 2], [11, 9], [4, 9], [4, 12], [13, 12]]] },
  { id: 'frostvale', name: 'Frostvale Fork', desc: 'Two roads converge. Split your defenses wisely.', cols: 13, rows: 13, diff: 1.18, gold: 230, lives: 20, waves: 40, seed: 23, rocks: 8,
    theme: { grass: ['#c9d8e2', '#bccbd6', '#d4e1ea'], path: '#8fa4b5', edge: '#5f7382' },
    paths: [[[-1, 2], [4, 2], [4, 6], [7, 6], [7, 10], [10, 10], [10, 3], [13, 3]],
            [[-1, 11], [4, 11], [4, 6], [7, 6], [7, 10], [10, 10], [10, 3], [13, 3]]] },
  { id: 'ashlands', name: 'Ashlands Gauntlet', desc: 'A long, brutal march through burned earth.', cols: 13, rows: 13, diff: 1.38, gold: 260, lives: 20, waves: 40, seed: 37, rocks: 10,
    theme: { grass: ['#5a4a46', '#52433f', '#63524d'], path: '#2f2a2a', edge: '#7a3b2b' },
    paths: [[[6, -1], [6, 2], [1, 2], [1, 6], [11, 6], [11, 9], [3, 9], [3, 12], [13, 12]]] },
];

const TOWER_DEFS = {
  archer: { name: 'Archer', color: '#8fd14f', desc: 'Fast arrows. Hits air.', air: true, ground: true, proj: 'arrow',
    lv: [{ cost: 70, range: 3.2, dmg: 11, rate: 2.4 }, { cost: 80, range: 3.6, dmg: 21, rate: 2.8 }, { cost: 130, range: 4.1, dmg: 40, rate: 3.3 }] },
  cannon: { name: 'Cannon', color: '#b57c4a', desc: 'Splash damage. Ground only.', air: false, ground: true, proj: 'ball',
    lv: [{ cost: 110, range: 2.8, dmg: 36, rate: 0.65, splash: 1.0 }, { cost: 130, range: 3.0, dmg: 64, rate: 0.72, splash: 1.15 }, { cost: 210, range: 3.3, dmg: 120, rate: 0.8, splash: 1.35 }] },
  frost: { name: 'Frost', color: '#6fd3f2', desc: 'Slows enemies. Hits air.', air: true, ground: true, proj: 'frost',
    lv: [{ cost: 90, range: 2.7, dmg: 6, rate: 1.3, slow: 0.35, slowT: 2 }, { cost: 110, range: 3.0, dmg: 11, rate: 1.5, slow: 0.45, slowT: 2.5 }, { cost: 170, range: 3.3, dmg: 18, rate: 1.7, slow: 0.55, slowT: 3, splash: 0.9 }] },
  tesla: { name: 'Tesla', color: '#c9a2ff', desc: 'Chain lightning. Hits air.', air: true, ground: true, proj: 'bolt',
    lv: [{ cost: 150, range: 2.8, dmg: 26, rate: 1.0, chain: 2 }, { cost: 170, range: 3.0, dmg: 46, rate: 1.1, chain: 3 }, { cost: 280, range: 3.3, dmg: 84, rate: 1.25, chain: 4 }] },
  flame: { name: 'Flame', color: '#ff7b3a', desc: 'Burns nearby foes. Ground only.', air: false, ground: true, proj: 'flame',
    lv: [{ cost: 120, range: 1.9, dmg: 6, rate: 7, burn: 5, burnT: 3 }, { cost: 150, range: 2.1, dmg: 10, rate: 7, burn: 9, burnT: 3 }, { cost: 230, range: 2.3, dmg: 17, rate: 7, burn: 15, burnT: 3.5 }] },
};
const TOWER_ORDER = ['archer', 'cannon', 'frost', 'tesla', 'flame'];
const TARGET_MODES = ['first', 'last', 'strong', 'weak'];
const TARGET_LABEL = { first: 'First', last: 'Last', strong: 'Strongest', weak: 'Weakest' };

const ENEMY_DEFS = {
  grunt: { name: 'Grunt', hp: 42, speed: 1.5, reward: 6, armor: 0, r: 11, color: '#d14b3c' },
  runner: { name: 'Runner', hp: 26, speed: 3.0, reward: 7, armor: 0, r: 9, color: '#e8b53a' },
  wisp: { name: 'Wisp', hp: 48, speed: 2.1, reward: 9, armor: 0, r: 9, color: '#9ad8ff', fly: true },
  brute: { name: 'Brute', hp: 175, speed: 1.0, reward: 14, armor: 3, r: 15, color: '#8a4fb0' },
  knight: { name: 'Knight', hp: 120, speed: 1.3, reward: 13, armor: 7, r: 12, color: '#aab6c4' },
  drake: { name: 'Drake', hp: 230, speed: 1.7, reward: 20, armor: 2, r: 13, color: '#3fd0a0', fly: true },
  boss: { name: 'Warlord', hp: 1500, speed: 0.75, reward: 160, armor: 6, r: 20, color: '#2a2a33', boss: true },
};

function buildWave(n, map) {
  const groups = [];
  const hpMul = (1 + 0.13 * (n - 1) + 0.0065 * (n - 1) * (n - 1)) * map.diff;
  const add = (type, count, gap) => groups.push({ type, count: Math.max(1, Math.round(count)), gap });
  if (n % 10 === 0) {
    add('knight', 3 + n / 5, 0.7);
    add('boss', 1 + Math.floor(n / 30), 3.5);
    add('runner', n / 2, 0.35);
  } else {
    const base = 6 + n * 1.35;
    add('grunt', base * 0.6, 0.75);
    if (n >= 3) add('runner', base * 0.35, 0.4);
    if (n >= 5) add('wisp', base * 0.25, 0.6);
    if (n >= 8) add('brute', n * 0.35, 1.2);
    if (n >= 12) add('knight', n * 0.3, 0.9);
    if (n >= 18) add('drake', n * 0.2, 1.0);
    if (n >= 25) add('grunt', base * 0.4, 0.28);
    if (n >= 32) add('brute', n * 0.25, 0.8);
  }
  const rng = mulberry32(n * 7919 + map.seed);
  for (let i = groups.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [groups[i], groups[j]] = [groups[j], groups[i]]; }
  return { groups, hpMul };
}

/* ================= MAP COMPILE ================= */
function compileMap(def) {
  const cells = new Array(def.rows * def.cols).fill(0); // 0 free, 1 road, 2 blocked
  const paths = def.paths.map(wps => {
    const pts = wps.map(([c, r]) => ({ x: (c + 0.5) * CELL, y: (r + 0.5) * CELL }));
    for (let i = 0; i < wps.length - 1; i++) {
      const [x0, y0] = wps[i], [x1, y1] = wps[i + 1];
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
      let x = x0, y = y0;
      for (let guard = 0; guard < 100; guard++) {
        if (x >= 0 && y >= 0 && x < def.cols && y < def.rows) cells[y * def.cols + x] = 1;
        if (x === x1 && y === y1) break;
        x += dx; y += dy;
      }
    }
    const segs = []; let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const L = dist(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y); segs.push(L); total += L; }
    return { pts, segs, total };
  });
  const rng = mulberry32(def.seed), decos = [];
  for (let t = 0; t < 600 && decos.length < def.rocks; t++) {
    const c = Math.floor(rng() * def.cols), r = Math.floor(rng() * def.rows), i = r * def.cols + c;
    if (cells[i] === 0) { cells[i] = 2; decos.push({ c, r, kind: rng() < 0.5 ? 'rock' : 'tree', v: rng() }); }
  }
  return Object.assign({}, def, { cells, paths, decos, W: def.cols * CELL, H: def.rows * CELL });
}
function pathPos(path, d) {
  let i = 0;
  while (i < path.segs.length - 1 && d > path.segs[i]) { d -= path.segs[i]; i++; }
  const a = path.pts[i], b = path.pts[i + 1], t = clamp(d / path.segs[i], 0, 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ang: Math.atan2(b.y - a.y, b.x - a.x) };
}

/* ================= AUDIO ================= */
const Sfx = {
  ctx: null, on: true, master: null, noise: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.6, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ctx = null; }
  },
  tone(f0, f1, dur, type, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  burst(dur, vol, fc, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(fc, t); f.frequency.exponentialRampToValueAtTime(100, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  play(name) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'arrow': this.tone(900, 300, 0.08, 'triangle', 0.12); break;
      case 'cannon': this.tone(120, 40, 0.25, 'square', 0.25); this.burst(0.25, 0.3, 900); break;
      case 'frost': this.tone(1400, 2200, 0.12, 'sine', 0.1); break;
      case 'bolt': this.burst(0.12, 0.25, 4000); this.tone(2400, 200, 0.15, 'sawtooth', 0.12); break;
      case 'flame': this.burst(0.1, 0.05, 600); break;
      case 'boom': this.burst(0.45, 0.5, 1500); this.tone(90, 30, 0.4, 'sine', 0.3); break;
      case 'die': this.tone(500, 150, 0.15, 'square', 0.08); break;
      case 'leak': this.tone(300, 90, 0.5, 'sawtooth', 0.25); break;
      case 'build': this.tone(400, 700, 0.12, 'triangle', 0.2); this.tone(600, 1000, 0.12, 'triangle', 0.15, 0.08); break;
      case 'upgrade': [0, 0.08, 0.16].forEach((d, i) => this.tone(500 + i * 200, 700 + i * 250, 0.12, 'triangle', 0.18, d)); break;
      case 'sell': this.tone(700, 300, 0.2, 'triangle', 0.18); break;
      case 'wave': this.tone(220, 330, 0.3, 'sawtooth', 0.18); this.tone(330, 440, 0.4, 'sawtooth', 0.18, 0.2); break;
      case 'win': [0, 0.15, 0.3, 0.45].forEach((d, i) => this.tone([523, 659, 784, 1046][i], [523, 659, 784, 1046][i], 0.35, 'triangle', 0.22, d)); break;
      case 'lose': [0, 0.25, 0.5].forEach((d, i) => this.tone([400, 320, 220][i], [380, 300, 120][i], 0.45, 'sawtooth', 0.2, d)); break;
      case 'tap': this.tone(800, 800, 0.04, 'square', 0.05); break;
      case 'deny': this.tone(200, 150, 0.15, 'square', 0.12); break;
    }
  },
};

/* ================= SAVE ================= */
const SAVE_KEY = 'ironhold.v1';
let profile = { best: {}, sound: true, run: null, seenHelp: false };
function loadProfile() { try { const p = JSON.parse(localStorage.getItem(SAVE_KEY)); if (p && typeof p === 'object') profile = Object.assign(profile, p); } catch (e) { } Sfx.on = profile.sound !== false; }
function saveProfile() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); } catch (e) { } }

/* ================= GAME STATE ================= */
const canvas = $('#c'), ctx = canvas.getContext('2d');
let G = null, bgCanvas = null, viewScale = 1, dpr = 1, screen = 'title', lastT = 0, raf = 0;
let hudCache = { gold: null, lives: null, wave: null, speed: null, panel: '' };

function newGame(mapIdx, run) {
  const map = compileMap(MAP_DEFS[mapIdx]);
  G = {
    mapIdx, map, towers: [], enemies: [], projs: [], fx: [], texts: [],
    wave: 0, gold: map.gold, lives: map.lives, speed: 1, paused: false,
    phase: 'ready', // ready | wave | countdown | over
    queue: [], spawnT: 0, countdown: 0, endless: false, kills: 0, time: 0,
    sel: null, // {kind:'cell',c,r} | {kind:'tower',t}
    shake: 0, won: false,
  };
  if (run) {
    G.wave = run.wave; G.gold = run.gold; G.lives = run.lives; G.endless = !!run.endless; G.kills = run.kills || 0;
    for (const t of run.towers) { if (TOWER_DEFS[t.t]) addTower(t.t, t.c, t.r, t.l, t.m, true); }
    G.phase = 'ready';
  }
  buildBackground();
  hudCache = { gold: null, lives: null, wave: null, speed: null, panel: '' };
  G.sel = null; updatePanel(true); resize();
}
function saveRun() {
  if (!G || G.phase === 'over') return;
  profile.run = { mapIdx: G.mapIdx, wave: G.wave, gold: G.gold, lives: G.lives, endless: G.endless, kills: G.kills,
    towers: G.towers.map(t => ({ t: t.type, c: t.c, r: t.r, l: t.lv, m: t.mode })) };
  saveProfile();
}
function clearRun() { profile.run = null; saveProfile(); }

/* ================= TOWERS ================= */
function towerStats(t) { return TOWER_DEFS[t.type].lv[t.lv]; }
function towerInvested(t) { let s = 0; for (let i = 0; i <= t.lv; i++) s += TOWER_DEFS[t.type].lv[i].cost; return s; }
function addTower(type, c, r, lv = 0, mode = 'first', silent = false) {
  const t = { type, c, r, lv, mode, x: (c + 0.5) * CELL, y: (r + 0.5) * CELL, cd: 0, ang: -Math.PI / 2, target: null, flameOn: 0, kills: 0, dmg: 0 };
  G.towers.push(t); G.map.cells[r * G.map.cols + c] = 3;
  if (!silent) { Sfx.play('build'); puff(t.x, t.y, '#ffffff', 10); }
  return t;
}
function towerAt(c, r) { return G.towers.find(t => t.c === c && t.r === r); }
function canAfford(cost) { return G.gold >= cost; }
function buyTower(type, c, r) {
  const cost = TOWER_DEFS[type].lv[0].cost;
  if (!canAfford(cost)) { toast('Not enough gold'); Sfx.play('deny'); return; }
  if (G.map.cells[r * G.map.cols + c] !== 0) return;
  G.gold -= cost; const t = addTower(type, c, r); G.sel = { kind: 'tower', t }; updatePanel(true);
}
function upgradeTower(t) {
  const def = TOWER_DEFS[t.type]; if (t.lv >= def.lv.length - 1) return;
  const cost = def.lv[t.lv + 1].cost;
  if (!canAfford(cost)) { toast('Not enough gold'); Sfx.play('deny'); return; }
  G.gold -= cost; t.lv++; Sfx.play('upgrade'); puff(t.x, t.y, def.color, 14); updatePanel(true);
}
function sellTower(t) {
  const v = Math.floor(towerInvested(t) * 0.7);
  G.gold += v; G.towers.splice(G.towers.indexOf(t), 1); G.map.cells[t.r * G.map.cols + t.c] = 0;
  floatText(t.x, t.y, '+' + v, '#ffcc4d'); Sfx.play('sell'); G.sel = null; updatePanel(true);
}
function pickTarget(t, st) {
  const def = TOWER_DEFS[t.type], R = st.range * CELL; let best = null, bv = 0;
  for (const e of G.enemies) {
    if (e.dead || (e.fly && !def.air) || (!e.fly && !def.ground)) continue;
    if (dist(t.x, t.y, e.x, e.y) > R + e.r * 0.5) continue;
    let v;
    switch (t.mode) { case 'last': v = -e.d; break; case 'strong': v = e.hp; break; case 'weak': v = -e.hp; break; default: v = e.d; }
    if (best === null || v > bv) { best = e; bv = v; }
  }
  return best;
}
function updateTowers(dt) {
  for (const t of G.towers) {
    const st = towerStats(t), def = TOWER_DEFS[t.type];
    t.cd -= dt;
    if (t.target && (t.target.dead || dist(t.x, t.y, t.target.x, t.target.y) > st.range * CELL + t.target.r)) t.target = null;
    if (!t.target || t.mode !== 'first' || t.type === 'tesla') { const n = pickTarget(t, st); if (n) t.target = n; }
    if (t.target) {
      const want = Math.atan2(t.target.y - t.y, t.target.x - t.x);
      let da = want - t.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      t.ang += clamp(da, -12 * dt, 12 * dt);
      if (t.cd <= 0) { t.cd = 1 / st.rate; fire(t, st, def); }
    }
    if (t.type === 'flame') t.flameOn = t.target ? Math.min(1, t.flameOn + dt * 6) : Math.max(0, t.flameOn - dt * 4);
  }
}
function fire(t, st, def) {
  const e = t.target;
  switch (def.proj) {
    case 'arrow': G.projs.push({ kind: 'arrow', x: t.x, y: t.y, tgt: e, spd: 560, dmg: st.dmg, src: t, ang: t.ang }); Sfx.play('arrow'); break;
    case 'ball': G.projs.push({ kind: 'ball', x: t.x, y: t.y, sx: t.x, sy: t.y, tgt: e, tx: e.x, ty: e.y, spd: 330, dmg: st.dmg, splash: st.splash * CELL, src: t, prog: 0 }); Sfx.play('cannon'); G.shake = Math.max(G.shake, 2); break;
    case 'frost': G.projs.push({ kind: 'frost', x: t.x, y: t.y, tgt: e, spd: 440, dmg: st.dmg, slow: st.slow, slowT: st.slowT, splash: (st.splash || 0) * CELL, src: t }); Sfx.play('frost'); break;
    case 'bolt': {
      const hit = [e]; let cur = e, dmg = st.dmg;
      hitEnemy(cur, dmg, t);
      for (let i = 0; i < st.chain; i++) {
        let nx = null, nd = 1e9;
        for (const o of G.enemies) { if (o.dead || hit.includes(o)) continue; const d = dist(cur.x, cur.y, o.x, o.y); if (d < CELL * 1.8 && d < nd) { nd = d; nx = o; } }
        if (!nx) break; dmg *= 0.72; hit.push(nx); hitEnemy(nx, dmg, t); cur = nx;
      }
      G.fx.push({ kind: 'bolt', pts: [{ x: t.x, y: t.y }, ...hit.map(h => ({ x: h.x, y: h.y }))], life: 0.14, max: 0.14, color: def.color });
      Sfx.play('bolt'); break;
    }
    case 'flame': {
      const R = st.range * CELL;
      for (const o of G.enemies) {
        if (o.dead || o.fly) continue;
        if (dist(t.x, t.y, o.x, o.y) <= R + o.r * 0.5) {
          const a = Math.atan2(o.y - t.y, o.x - t.x); let da = a - t.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          if (Math.abs(da) < 0.6) { hitEnemy(o, st.dmg, t); o.burn = Math.max(o.burn, st.burn); o.burnT = st.burnT; }
        }
      }
      for (let i = 0; i < 3; i++) { const a = t.ang + (Math.random() - 0.5) * 0.7, s = 120 + Math.random() * 160; G.fx.push({ kind: 'p', x: t.x + Math.cos(t.ang) * 14, y: t.y + Math.sin(t.ang) * 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: R / s * 0.9, max: R / s * 0.9, color: Math.random() < 0.5 ? '#ff9a3a' : '#ffd23a', size: 5 + Math.random() * 5, fade: true, grow: true }); }
      if (Math.random() < 0.35) Sfx.play('flame'); break;
    }
  }
}

/* ================= ENEMIES ================= */
function spawnEnemy(type, pathIdx) {
  const d = ENEMY_DEFS[type], path = G.map.paths[pathIdx % G.map.paths.length];
  const hp = Math.round(d.hp * G.waveInfo.hpMul);
  const start = pathPos(path, 0);
  G.enemies.push({ type, def: d, path, d: 0, x: start.x, y: start.y, ang: start.ang, hp, maxHp: hp, r: d.r, fly: !!d.fly, boss: !!d.boss,
    armor: d.armor, speed: d.speed, reward: d.reward, slow: 0, slowT: 0, burn: 0, burnT: 0, dead: false, wob: Math.random() * TAU, hitT: 0 });
}
function hitEnemy(e, dmg, src) {
  if (e.dead) return;
  const real = Math.max(1, dmg - e.armor);
  e.hp -= real; e.hitT = 0.08; if (src) src.dmg += real;
  if (e.hp <= 0) killEnemy(e, src);
}
function killEnemy(e, src) {
  e.dead = true; G.kills++; if (src) src.kills++;
  G.gold += e.reward; floatText(e.x, e.y - e.r, '+' + e.reward, '#ffcc4d');
  puff(e.x, e.y, e.def.color, e.boss ? 40 : 10);
  Sfx.play(e.boss ? 'boom' : 'die'); if (e.boss) G.shake = 8;
}
function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.hitT > 0) e.hitT -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burn * dt; if (Math.random() < dt * 12) G.fx.push({ kind: 'p', x: e.x + (Math.random() - .5) * e.r, y: e.y, vx: (Math.random() - .5) * 20, vy: -40 - Math.random() * 30, life: 0.4, max: 0.4, color: '#ff8c3a', size: 4, fade: true }); if (e.hp <= 0) { killEnemy(e, null); continue; } if (e.burnT <= 0) e.burn = 0; }
    const v = e.speed * CELL * (1 - e.slow);
    e.d += v * dt; e.wob += dt * 10;
    if (e.d >= e.path.total) { leak(e); continue; }
    const p = pathPos(e.path, e.d); e.x = p.x; e.y = p.y; e.ang = p.ang;
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}
function leak(e) {
  e.dead = true; const n = e.boss ? 5 : 1; G.lives = Math.max(0, G.lives - n); G.shake = 6; Sfx.play('leak');
  floatText(e.x, e.y, '-' + n + ' life', '#ff6b6b');
  if (G.lives <= 0) gameOver(false);
}

/* ================= PROJECTILES & FX ================= */
function updateProjs(dt) {
  for (const p of G.projs) {
    if (p.done) continue;
    if (p.kind === 'ball') {
      if (p.tgt && !p.tgt.dead) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
      const L = dist(p.sx, p.sy, p.tx, p.ty) || 1; p.prog += p.spd * dt / L;
      if (p.prog >= 1) {
        p.done = true; p.x = p.tx; p.y = p.ty;
        for (const e of G.enemies) if (!e.dead && !e.fly && dist(p.x, p.y, e.x, e.y) <= p.splash + e.r * 0.5) hitEnemy(e, p.dmg, p.src);
        G.fx.push({ kind: 'ring', x: p.x, y: p.y, r: p.splash, life: 0.3, max: 0.3, color: '#ffb347' }); puff(p.x, p.y, '#ffb347', 12); puff(p.x, p.y, '#555', 6); Sfx.play('boom'); G.shake = Math.max(G.shake, 3);
      } else { p.x = p.sx + (p.tx - p.sx) * p.prog; p.y = p.sy + (p.ty - p.sy) * p.prog; p.h = Math.sin(p.prog * Math.PI) * L * 0.25; }
      continue;
    }
    if (p.tgt && !p.tgt.dead) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
    else if (p.tx === undefined) { p.done = true; continue; }
    const dx = p.tx - p.x, dy = p.ty - p.y, L = Math.hypot(dx, dy), step = p.spd * dt;
    if (L <= step + 4) {
      p.done = true;
      if (p.tgt && !p.tgt.dead) {
        hitEnemy(p.tgt, p.dmg, p.src);
        if (p.kind === 'frost') {
          const apply = e => { if (p.slow > e.slow || e.slowT < 0.3) { e.slow = p.slow; } e.slowT = Math.max(e.slowT, p.slowT); };
          apply(p.tgt); if (p.splash) for (const e of G.enemies) if (!e.dead && e !== p.tgt && dist(p.tx, p.ty, e.x, e.y) <= p.splash) apply(e);
          puff(p.tx, p.ty, '#bfefff', 6);
        } else puff(p.tx, p.ty, '#fff', 3);
      }
    } else { p.x += dx / L * step; p.y += dy / L * step; p.ang = Math.atan2(dy, dx); }
  }
  G.projs = G.projs.filter(p => !p.done);
}
function puff(x, y, color, n) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 140; G.fx.push({ kind: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, max: 0.6, color, size: 2 + Math.random() * 4, fade: true, drag: true }); }
}
function floatText(x, y, txt, color) { G.texts.push({ x, y, txt, color, life: 0.9 }); }
function updateFx(dt) {
  for (const f of G.fx) {
    f.life -= dt;
    if (f.kind === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; if (f.drag) { f.vx *= 0.9; f.vy *= 0.9; } }
  }
  G.fx = G.fx.filter(f => f.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y -= 30 * dt; }
  G.texts = G.texts.filter(t => t.life > 0);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 20);
}

/* ================= WAVES ================= */
function startWave(early) {
  if (G.phase === 'over') return;
  if (G.phase === 'countdown' && early) { const b = Math.ceil(G.countdown) * 2; if (b > 0) { G.gold += b; toast('Early bonus +' + b + ' gold'); } }
  G.wave++; G.waveInfo = buildWave(G.wave, G.map);
  G.queue = []; let t = 0, pi = 0;
  for (const g of G.waveInfo.groups) { for (let i = 0; i < g.count; i++) { G.queue.push({ type: g.type, at: t, path: pi++ }); t += g.gap; } t += 1.2; }
  G.spawnT = 0; G.phase = 'wave'; Sfx.play('wave');
  toast((G.wave % 10 === 0 ? '⚠ Boss wave ' : 'Wave ') + G.wave);
  updatePanel(true);
}
function updateWave(dt) {
  if (G.phase === 'wave') {
    G.spawnT += dt;
    while (G.queue.length && G.queue[0].at <= G.spawnT) { const q = G.queue.shift(); spawnEnemy(q.type, q.path); }
    if (!G.queue.length && !G.enemies.length) waveCleared();
  } else if (G.phase === 'countdown') {
    G.countdown -= dt; if (G.countdown <= 0) startWave(false);
  }
}
function waveCleared() {
  const bonus = 20 + G.wave * 3; G.gold += bonus; toast('Wave ' + G.wave + ' cleared  +' + bonus + ' gold');
  const b = profile.best[G.map.id] || { wave: 0, stars: 0 };
  if (G.wave > b.wave) b.wave = G.wave; profile.best[G.map.id] = b;
  if (G.wave >= G.map.waves && !G.endless) { gameOver(true); return; }
  G.phase = 'countdown'; G.countdown = 18; saveRun(); updatePanel(true);
}
function starsFor(lives, max) { return lives >= max * 0.75 ? 3 : lives >= max * 0.4 ? 2 : 1; }
function gameOver(won) {
  G.phase = 'over'; G.won = won; clearRun();
  const b = profile.best[G.map.id] || { wave: 0, stars: 0 };
  if (won) { b.stars = Math.max(b.stars, starsFor(G.lives, G.map.lives)); b.won = true; }
  b.wave = Math.max(b.wave, G.wave); profile.best[G.map.id] = b; saveProfile();
  Sfx.play(won ? 'win' : 'lose');
  setTimeout(() => {
    $('#end-title').textContent = won ? 'Victory!' : 'The gate has fallen';
    $('#end-stars').textContent = won ? '★'.repeat(starsFor(G.lives, G.map.lives)) + '☆'.repeat(3 - starsFor(G.lives, G.map.lives)) : '';
    $('#end-text').textContent = won ? `You held ${G.map.name} for all ${G.map.waves} waves with ${G.lives} lives left. ${G.kills} enemies slain.`
      : `You reached wave ${G.wave} on ${G.map.name} and slew ${G.kills} enemies. Best: wave ${b.wave}.`;
    $('#btn-endless').hidden = !won;
    showScreen('end');
  }, won ? 900 : 1200);
}

/* ================= MAIN LOOP ================= */
function tick(now) {
  raf = requestAnimationFrame(tick);
  const dtRaw = Math.min(0.05, (now - lastT) / 1000 || 0); lastT = now;
  if (!G || screen !== 'game') return;
  if (!G.paused && G.phase !== 'over') {
    let dt = dtRaw * G.speed;
    const steps = Math.ceil(dt / 0.025);
    for (let i = 0; i < steps; i++) { const s = dt / steps; G.time += s; updateWave(s); updateEnemies(s); updateTowers(s); updateProjs(s); updateFx(s); }
  } else if (G.phase === 'over') { updateFx(dtRaw); updateProjs(dtRaw); }
  render(); updateHud();
}

/* ================= RENDER ================= */
function buildBackground() {
  const m = G.map, rng = mulberry32(m.seed * 3 + 1);
  bgCanvas = document.createElement('canvas'); bgCanvas.width = m.W; bgCanvas.height = m.H;
  const b = bgCanvas.getContext('2d');
  for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
    b.fillStyle = m.theme.grass[Math.floor(rng() * 3)]; b.fillRect(c * CELL, r * CELL, CELL, CELL);
    for (let i = 0; i < 3; i++) { b.fillStyle = 'rgba(0,0,0,' + (0.04 + rng() * 0.05) + ')'; b.fillRect(c * CELL + rng() * CELL, r * CELL + rng() * CELL, 3 + rng() * 6, 2 + rng() * 3); }
  }
  b.strokeStyle = 'rgba(0,0,0,0.08)'; b.lineWidth = 1;
  for (let c = 0; c <= m.cols; c++) { b.beginPath(); b.moveTo(c * CELL + .5, 0); b.lineTo(c * CELL + .5, m.H); b.stroke(); }
  for (let r = 0; r <= m.rows; r++) { b.beginPath(); b.moveTo(0, r * CELL + .5); b.lineTo(m.W, r * CELL + .5); b.stroke(); }
  b.lineCap = 'round'; b.lineJoin = 'round';
  for (const p of m.paths) {
    b.beginPath(); b.moveTo(p.pts[0].x, p.pts[0].y); for (const q of p.pts.slice(1)) b.lineTo(q.x, q.y);
    b.strokeStyle = m.theme.edge; b.lineWidth = CELL * 0.82; b.stroke();
    b.strokeStyle = m.theme.path; b.lineWidth = CELL * 0.66; b.stroke();
  }
  for (const p of m.paths) { b.strokeStyle = 'rgba(0,0,0,0.12)'; b.lineWidth = 2; b.setLineDash([6, 10]); b.beginPath(); b.moveTo(p.pts[0].x, p.pts[0].y); for (const q of p.pts.slice(1)) b.lineTo(q.x, q.y); b.stroke(); b.setLineDash([]); }
  for (const p of m.paths) { // gate markers
    const s = p.pts[0], e = p.pts[p.pts.length - 1];
    drawGate(b, s.x, s.y, '#b03a2e'); drawGate(b, e.x, e.y, '#2f6fb0');
  }
  for (const d of m.decos) {
    const x = (d.c + .5) * CELL, y = (d.r + .5) * CELL;
    if (d.kind === 'rock') {
      b.fillStyle = 'rgba(0,0,0,.25)'; b.beginPath(); b.ellipse(x + 3, y + 8, 16, 9, 0, 0, TAU); b.fill();
      b.fillStyle = '#8c8c8c'; b.beginPath(); b.moveTo(x - 16, y + 8); b.lineTo(x - 10, y - 8); b.lineTo(x + 2, y - 14); b.lineTo(x + 14, y - 4); b.lineTo(x + 16, y + 8); b.closePath(); b.fill();
      b.fillStyle = '#b5b5b5'; b.beginPath(); b.moveTo(x - 10, y - 8); b.lineTo(x + 2, y - 14); b.lineTo(x + 6, y - 2); b.closePath(); b.fill();
    } else {
      b.fillStyle = 'rgba(0,0,0,.25)'; b.beginPath(); b.ellipse(x + 4, y + 12, 14, 7, 0, 0, TAU); b.fill();
      b.fillStyle = '#5b3a1e'; b.fillRect(x - 3, y, 6, 14);
      const g = ['#2f7a3a', '#3b8f45', '#276a32'];
      for (let i = 0; i < 3; i++) { b.fillStyle = g[i]; b.beginPath(); b.moveTo(x, y - 20 + i * 7); b.lineTo(x - 14 + i * 2, y + 2 + i * 4); b.lineTo(x + 14 - i * 2, y + 2 + i * 4); b.closePath(); b.fill(); }
    }
  }
}
function drawGate(b, x, y, color) {
  b.fillStyle = color; b.beginPath(); b.arc(x, y, CELL * 0.28, 0, TAU); b.fill();
  b.fillStyle = 'rgba(255,255,255,.7)'; b.beginPath(); b.arc(x, y, CELL * 0.12, 0, TAU); b.fill();
}
function render() {
  const m = G.map;
  ctx.setTransform(dpr * viewScale, 0, 0, dpr * viewScale, 0, 0);
  if (G.shake > 0) ctx.translate((Math.random() - .5) * G.shake, (Math.random() - .5) * G.shake);
  ctx.drawImage(bgCanvas, 0, 0);
  // selection / range
  if (G.sel) {
    if (G.sel.kind === 'cell') {
      const { c, r } = G.sel; ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      if (G.hoverType) drawRange((c + .5) * CELL, (r + .5) * CELL, TOWER_DEFS[G.hoverType].lv[0].range * CELL, TOWER_DEFS[G.hoverType].color);
    } else if (G.sel.kind === 'tower' && G.towers.includes(G.sel.t)) {
      const t = G.sel.t; drawRange(t.x, t.y, towerStats(t).range * CELL, TOWER_DEFS[t.type].color);
    }
  }
  // ground enemies shadows + bodies
  const ground = G.enemies.filter(e => !e.fly), air = G.enemies.filter(e => e.fly);
  for (const e of ground) drawEnemy(e);
  for (const t of G.towers) drawTower(t);
  for (const p of G.projs) drawProj(p);
  for (const e of air) drawEnemy(e);
  for (const f of G.fx) drawFx(f);
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const t of G.texts) { ctx.globalAlpha = clamp(t.life / 0.4, 0, 1); ctx.fillStyle = '#000'; ctx.fillText(t.txt, t.x + 1, t.y + 1); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y); }
  ctx.globalAlpha = 1;
  if (G.phase === 'countdown') { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(m.W / 2 - 70, 6, 140, 22); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.fillText('Next wave in ' + Math.ceil(G.countdown) + 's', m.W / 2, 22); }
  if (G.paused) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, m.W, m.H); }
}
function drawRange(x, y, R, color) {
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fillStyle = color + '2a'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
}
function drawTower(t) {
  const def = TOWER_DEFS[t.type], x = t.x, y = t.y;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 5, 19, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a4350'; roundRect(x - 18, y - 18, 36, 36, 7); ctx.fill();
  ctx.fillStyle = '#56637a'; roundRect(x - 14, y - 14, 28, 28, 5); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(t.ang);
  switch (t.type) {
    case 'archer':
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2d4a12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(6, 0, 9, -1.3, 1.3); ctx.stroke();
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8.5, -8.5); ctx.lineTo(8.5, 8.5); ctx.stroke();
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(16, 0); ctx.stroke(); break;
    case 'cannon':
      ctx.fillStyle = '#2a2a2a'; roundRect(-4, -6, 24, 12, 3); ctx.fill();
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(19, 0, 5, 0, TAU); ctx.fill(); break;
    case 'frost':
      ctx.fillStyle = def.color; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e9fbff'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + G.time * 2; ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } ctx.closePath(); ctx.fill(); break;
    case 'tesla':
      ctx.fillStyle = '#5a3d8a'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = def.color; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 4 + i * 3, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2.5 + Math.sin(G.time * 12) * 1, 0, TAU); ctx.fill(); break;
    case 'flame':
      ctx.fillStyle = '#7a2e12'; roundRect(-2, -5, 20, 10, 3); ctx.fill();
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); break;
  }
  ctx.restore();
  for (let i = 0; i <= t.lv; i++) { ctx.fillStyle = '#ffcc4d'; ctx.beginPath(); ctx.arc(x - 12 + i * 6, y + 16, 2.2, 0, TAU); ctx.fill(); }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawEnemy(e) {
  const x = e.x, y = e.y + (e.fly ? -10 + Math.sin(e.wob) * 2 : 0), r = e.r;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + (e.fly ? 10 : 5), r, r * 0.55, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(e.ang);
  const col = e.hitT > 0 ? '#ffffff' : e.color || e.def.color;
  if (e.fly) { ctx.fillStyle = col; const f = Math.sin(e.wob * 2) * 4; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-10, -r - f); ctx.lineTo(4, -3); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-10, r + f); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill(); }
  if (e.boss) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffcc4d'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#ffcc4d'; ctx.beginPath(); ctx.moveTo(-8, -r + 2); ctx.lineTo(-5, -r - 8); ctx.lineTo(0, -r + 1); ctx.lineTo(5, -r - 8); ctx.lineTo(8, -r + 2); ctx.closePath(); ctx.fill(); }
  else if (e.type === 'knight') { ctx.fillStyle = col; roundRect(-r, -r, r * 2, r * 2, 4); ctx.fill(); ctx.fillStyle = '#5c6775'; ctx.fillRect(-r + 3, -3, r * 2 - 6, 6); }
  else if (e.type === 'brute') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(-4, -4, r * 0.5, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.3, 2, 0, TAU); ctx.arc(r * 0.45, r * 0.3, 2, 0, TAU); ctx.fill();
  ctx.restore();
  if (e.slow > 0) { ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke(); }
  if (e.burnT > 0) { ctx.strokeStyle = '#ff8c3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke(); }
  if (e.hp < e.maxHp) { const w = r * 2 + 6, h = 4, hx = x - w / 2, hy = y - r - 10; ctx.fillStyle = '#111'; ctx.fillRect(hx, hy, w, h); ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#6fd18a' : e.hp / e.maxHp > 0.25 ? '#ffcc4d' : '#ff6b6b'; ctx.fillRect(hx, hy, w * clamp(e.hp / e.maxHp, 0, 1), h); }
}
function drawProj(p) {
  ctx.save();
  if (p.kind === 'arrow') { ctx.translate(p.x, p.y); ctx.rotate(p.ang || 0); ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(3, -3); ctx.lineTo(3, 3); ctx.closePath(); ctx.fill(); }
  else if (p.kind === 'ball') { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 6, 3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x, p.y - (p.h || 0), 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(p.x - 2, p.y - (p.h || 0) - 2, 2, 0, TAU); ctx.fill(); }
  else if (p.kind === 'frost') { ctx.translate(p.x, p.y); ctx.rotate(G.time * 8); ctx.fillStyle = '#bfefff'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawFx(f) {
  const a = clamp(f.life / f.max, 0, 1);
  if (f.kind === 'p') { ctx.globalAlpha = f.fade ? a : 1; ctx.fillStyle = f.color; const s = f.grow ? f.size * (2 - a) : f.size * a; ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(0.5, s), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  else if (f.kind === 'ring') { ctx.globalAlpha = a; ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - a * 0.6), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  else if (f.kind === 'bolt') {
    ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < f.pts.length - 1; i++) { const p = f.pts[i], q = f.pts[i + 1]; ctx.moveTo(p.x, p.y); const n = 4; for (let k = 1; k <= n; k++) { const t = k / n; ctx.lineTo(p.x + (q.x - p.x) * t + (k < n ? (Math.random() - .5) * 10 : 0), p.y + (q.y - p.y) * t + (k < n ? (Math.random() - .5) * 10 : 0)); } }
    ctx.stroke(); ctx.strokeStyle = f.color; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
  }
}

/* ================= UI ================= */
function resize() {
  if (!G) return;
  const st = $('#stage'), m = G.map, sw = st.clientWidth, sh = st.clientHeight;
  if (!sw || !sh) return;
  viewScale = Math.min(sw / m.W, sh / m.H); dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = Math.floor(m.W * viewScale) + 'px'; canvas.style.height = Math.floor(m.H * viewScale) + 'px';
  canvas.width = Math.floor(m.W * viewScale * dpr); canvas.height = Math.floor(m.H * viewScale * dpr);
}
function updateHud() {
  const g = Math.floor(G.gold); if (g !== hudCache.gold) { hudCache.gold = g; $('#hud-gold b').textContent = g; if (G.sel && G.sel.kind !== 'none') updatePanel(false); }
  if (G.lives !== hudCache.lives) { hudCache.lives = G.lives; $('#hud-lives b').textContent = G.lives; }
  const wv = G.wave + (G.endless ? '' : '/' + G.map.waves); if (wv !== hudCache.wave) { hudCache.wave = wv; $('#hud-wave b').textContent = wv; }
  if (G.speed !== hudCache.speed) { hudCache.speed = G.speed; $('#btn-speed').textContent = G.speed + '×'; }
  const wb = $('#btn-wave');
  let txt = G.phase === 'ready' ? (G.wave === 0 ? 'Start<small>wave 1</small>' : 'Next wave<small>wave ' + (G.wave + 1) + '</small>')
    : G.phase === 'countdown' ? 'Call early<small>+' + Math.ceil(G.countdown) * 2 + ' gold</small>'
    : G.phase === 'wave' ? 'Wave ' + G.wave + '<small>' + (G.queue.length + G.enemies.length) + ' left</small>' : '—';
  if (txt !== wb.dataset.t) { wb.dataset.t = txt; wb.innerHTML = txt; wb.disabled = G.phase === 'wave' || G.phase === 'over'; }
}
function updatePanel(force) {
  const left = $('#panel-left'); let key, html = '';
  if (!G) return;
  if (G.sel && G.sel.kind === 'cell') {
    key = 'cell' + Math.floor(G.gold);
    html = TOWER_ORDER.map(k => { const d = TOWER_DEFS[k], c = d.lv[0].cost; return `<button class="card-t ${c > G.gold ? 'poor' : ''}" data-build="${k}" title="${d.desc}"><span class="sw" style="background:${d.color}"></span><span class="nm">${d.name}</span><span class="cost">${c}</span></button>`; }).join('');
  } else if (G.sel && G.sel.kind === 'tower' && G.towers.includes(G.sel.t)) {
    const t = G.sel.t, d = TOWER_DEFS[t.type], s = towerStats(t), nx = d.lv[t.lv + 1];
    key = 'tower' + t.c + ',' + t.r + ':' + t.lv + ':' + t.mode + ':' + Math.floor(G.gold);
    const extra = s.splash ? ` · Splash ${s.splash.toFixed(1)}` : s.slow ? ` · Slow ${Math.round(s.slow * 100)}%` : s.chain ? ` · Chains ${s.chain}` : s.burn ? ` · Burn ${s.burn}/s` : '';
    html = `<div class="info"><h3>${d.name} <span style="color:var(--muted);font-weight:500">Lv ${t.lv + 1}</span></h3>
      <div class="stats"><span>Dmg ${s.dmg}</span><span>Rate ${s.rate}/s</span><span>Range ${s.range}</span>${extra ? '<span>' + extra.slice(3) + '</span>' : ''}<span>Kills ${t.kills}</span></div>
      <div class="acts">${nx ? `<button data-up="1" ${nx.cost > G.gold ? 'disabled' : ''}>Upgrade <span style="color:var(--gold)">${nx.cost}</span></button>` : '<button disabled>Max level</button>'}
      <button data-mode="1">Target: ${TARGET_LABEL[t.mode]}</button><button data-sell="1">Sell +${Math.floor(towerInvested(t) * 0.7)}</button></div></div>`;
  } else { key = 'hint'; html = `<div class="hint">${G.wave === 0 ? 'Tap an empty tile to build a tower, then start the wave.' : 'Tap a tile to build, or a tower to upgrade.'}</div>`; }
  if (!force && key === hudCache.panel) return; hudCache.panel = key; left.innerHTML = html;
}
$('#panel-left').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !G) return; Sfx.init();
  if (b.dataset.build && G.sel && G.sel.kind === 'cell') buyTower(b.dataset.build, G.sel.c, G.sel.r);
  else if (G.sel && G.sel.kind === 'tower') { const t = G.sel.t; if (b.dataset.up) upgradeTower(t); else if (b.dataset.sell) sellTower(t); else if (b.dataset.mode) { t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length]; t.target = null; Sfx.play('tap'); updatePanel(true); } }
});
$('#panel-left').addEventListener('pointerover', e => { const b = e.target.closest('[data-build]'); if (G) G.hoverType = b ? b.dataset.build : null; });
$('#panel-left').addEventListener('pointerleave', () => { if (G) G.hoverType = null; });
canvas.addEventListener('pointerdown', e => {
  if (!G || screen !== 'game' || G.paused) return; Sfx.init();
  const rect = canvas.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * G.map.W, y = (e.clientY - rect.top) / rect.height * G.map.H;
  const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
  if (c < 0 || r < 0 || c >= G.map.cols || r >= G.map.rows) return;
  const v = G.map.cells[r * G.map.cols + c];
  G.hoverType = null;
  if (v === 3) { const t = towerAt(c, r); G.sel = { kind: 'tower', t }; Sfx.play('tap'); }
  else if (v === 0) { G.sel = { kind: 'cell', c, r }; Sfx.play('tap'); }
  else { G.sel = null; }
  updatePanel(true);
});
$('#btn-wave').addEventListener('click', () => { if (!G) return; Sfx.init(); if (G.phase === 'ready' || G.phase === 'countdown') startWave(true); });
$('#btn-speed').addEventListener('click', () => { if (!G) return; G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; Sfx.play('tap'); });
$('#btn-pause').addEventListener('click', () => pauseGame());
$('#btn-resume').addEventListener('click', () => { showScreen('game'); G.paused = false; });
$('#btn-restart').addEventListener('click', () => { clearRun(); newGame(G.mapIdx); showScreen('game'); });
$('#btn-quit').addEventListener('click', () => { if (G.phase !== 'wave') saveRun(); goTitle(); });
$('#btn-retry').addEventListener('click', () => { newGame(G.mapIdx); showScreen('game'); });
$('#btn-end-menu').addEventListener('click', () => goTitle());
$('#btn-endless').addEventListener('click', () => { G.endless = true; G.phase = 'countdown'; G.countdown = 18; G.won = false; saveRun(); showScreen('game'); toast('Endless mode: how far can you go?'); });
$('#btn-continue').addEventListener('click', () => { const r = profile.run; if (!r || !MAP_DEFS[r.mapIdx]) return; Sfx.init(); newGame(r.mapIdx, r); enterGame(); });
$('#btn-howto').addEventListener('click', () => showScreen('howto'));
$('#btn-howto-back').addEventListener('click', () => showScreen('title'));
$('#btn-sound').addEventListener('click', () => { Sfx.on = !Sfx.on; profile.sound = Sfx.on; saveProfile(); $('#btn-sound').textContent = 'Sound: ' + (Sfx.on ? 'On' : 'Off'); Sfx.init(); Sfx.play('tap'); });
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden && G && screen === 'game' && G.phase !== 'over') pauseGame(); });
document.addEventListener('keydown', e => { if (!G || screen !== 'game') return; if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('#btn-wave').click(); } else if (e.key === 'Escape' || e.key === 'p') pauseGame(); else if (e.key === 'f') $('#btn-speed').click(); });

function pauseGame() { if (!G || G.phase === 'over' || screen !== 'game') return; G.paused = true; showScreen('pause'); }
function showScreen(name) {
  screen = name;
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('#app').hidden = !(name === 'game' || name === 'pause' || name === 'end');
  if (name !== 'game') $('#screen-' + name).hidden = false;
  if (name === 'game') { resize(); requestAnimationFrame(resize); }
  if (name === 'title') renderTitle();
}
let inGameHistory = false;
function enterGame() { if (!inGameHistory) { try { history.pushState({ game: 1 }, ''); } catch (e) { } inGameHistory = true; } showScreen('game'); if (!profile.seenHelp) { profile.seenHelp = true; saveProfile(); toast('Tap a tile to build a tower'); } }
function goTitle() { if (inGameHistory) { inGameHistory = false; try { history.back(); return; } catch (e) { } } showScreen('title'); }
window.addEventListener('popstate', () => { inGameHistory = false; if (screen === 'game' || screen === 'pause' || screen === 'end') { if (G && G.phase !== 'wave' && G.phase !== 'over') saveRun(); showScreen('title'); } });

function renderTitle() {
  const list = $('#map-list'); list.innerHTML = '';
  MAP_DEFS.forEach((m, i) => {
    const b = profile.best[m.id] || { wave: 0, stars: 0 };
    const prev = i === 0 ? null : (profile.best[MAP_DEFS[i - 1].id] || { wave: 0 });
    const locked = prev && prev.wave < 15;
    const btn = document.createElement('button'); btn.className = 'mapbtn' + (locked ? ' locked' : '');
    const th = mapThumb(m);
    btn.innerHTML = `<img class="thumb" alt="" src="${th}"><span class="mt"><b>${m.name}</b><span>${locked ? 'Reach wave 15 on ' + MAP_DEFS[i - 1].name + ' to unlock' : m.desc}</span>${b.wave ? `<span>Best: wave ${b.wave}${b.won ? ' · Conquered' : ''}</span>` : ''}</span><span class="st">${b.won ? '★'.repeat(b.stars) + '☆'.repeat(3 - b.stars) : ''}</span>`;
    btn.disabled = locked;
    btn.addEventListener('click', () => { Sfx.init(); clearRun(); newGame(i); enterGame(); });
    list.appendChild(btn);
  });
  const r = profile.run; const cb = $('#btn-continue');
  cb.hidden = !(r && MAP_DEFS[r.mapIdx]);
  if (!cb.hidden) cb.textContent = `Continue ${MAP_DEFS[r.mapIdx].name} · wave ${r.wave + 1}`;
  $('#btn-sound').textContent = 'Sound: ' + (Sfx.on ? 'On' : 'Off');
}
const thumbCache = {};
function mapThumb(def) {
  if (thumbCache[def.id]) return thumbCache[def.id];
  const m = compileMap(def), cv = document.createElement('canvas'), s = 6; cv.width = m.cols * s; cv.height = m.rows * s; const b = cv.getContext('2d');
  b.fillStyle = def.theme.grass[0]; b.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < m.cells.length; i++) { const v = m.cells[i]; if (!v) continue; b.fillStyle = v === 1 ? def.theme.path : '#777'; b.fillRect((i % m.cols) * s, Math.floor(i / m.cols) * s, s, s); }
  return thumbCache[def.id] = cv.toDataURL();
}
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1800); }

/* ================= BOOT ================= */
loadProfile();
showScreen('title');
lastT = performance.now(); raf = requestAnimationFrame(tick);
if ('serviceWorker' in navigator && location.protocol === 'https:') { window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { })); }
window.__ironhold = { get G() { return G; }, newGame, startWave, buyTower, addTower, MAP_DEFS, TOWER_DEFS, ENEMY_DEFS, buildWave, enterGame, showScreen };
