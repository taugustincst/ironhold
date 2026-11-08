# Ironhold 2.0 — "The Forge Update" — Upgrade Plan

**Game:** Ironhold Tower Defense · package `com.taugustincst.ironhold`
**Current live build:** 1.1.0 (versionCode 10100), paid $2.99 on Google Play
**Target build:** 2.0.0 (versionCode 20000), free update for existing buyers, price stays $2.99
**Status:** PLAN ONLY — no code written. Build from this document alone.
**Repo:** `taugustincst/ironhold` (local clone `~/workspace/ironhold-play/repo`)

---

## 1. Pitch and the before/after

Ironhold 1.1.0 is a complete but compact tower defense: three maps, five towers, seven enemy types, one way to play each map. Ironhold 2.0 doubles the game and gives it a memory. A second campaign act adds three new maps and 120 new waves; two new towers and three new enemies break the strategies that trivialize the current build (the Tesla wall, the single-target boss melt); a permanent Forge — bought with the stars players already earn — lets players reshape the game's rules between runs and unlocks three Commander abilities they fire by hand during a run; Veteran and Ironhold difficulty tiers plus per-map challenge modifiers give conquered maps a second life; and a Daily Stand mode turns the game's existing seeded RNG into a fresh offline challenge every day. Every promise on the current store listing stays true: no ads, no in-app purchases, no accounts, no analytics, no network calls — the whole game still lives inside the app and plays fully offline.

| Content | 1.1.0 (live) | 2.0.0 (this plan) |
|---|---|---|
| Maps | 3 | **6** (Act I: 3 · Act II: 3 new) |
| Campaign waves | 120 (40/map) | **240** (40/map) |
| Towers | 5 (Archer, Cannon, Frost, Tesla, Flame) | **7** (+ Ballista, Mortar) |
| Enemy types | 7 | **10** (+ Shieldbearer, Mender, Splitter) |
| Bosses | Warlord, waves 10/20/30/40 | Warlord + escorts, + new Act II boss **the Siegebreaker** |
| Modes | Campaign, Endless | Campaign, Endless (rebalanced), **Daily Stand** |
| Meta-progression | Stars (display only) | **The Forge** — star-bought permanent upgrade tree |
| In-run powers | None | **3 Commander abilities** (Barrage, Frost Nova, War Chest) |
| Difficulty | One per map (`diff` scalar) | **Normal / Veteran / Ironhold** tiers per map |
| Challenge modifiers | None | **2 per map** (12 mastery marks to earn) |
| Max earnable stars/marks | 9 stars | **18 stars + 12 mastery marks = 30 Forge currency** |

Every number in the right-hand column is a ship gate: if a row isn't true of the release candidate, the update isn't done.

---

## 2. Ground rules inherited from 1.1.0 (do not break)

These are facts of the shipped game, verified in `game.js` / `README.md` / `store/listing.md` on 2026-11-07:

- **Architecture.** One vanilla HTML5 game: `index.html`, `style.css`, `game.js` (718 lines), no build step, no dependencies. The Android app (`android/play`) bundles the game files under `assets/www` in a WebView and asks for **no permissions, not even internet**. Stay inside this: no frameworks, no new files beyond what the existing packager already carries (if a new asset file is truly needed, it must be added to the `android/play` asset list and verified with `tools/check-apk.js`).
- **Data-driven tuning.** All balance lives at the top of `game.js`: `MAP_DEFS`, `TOWER_DEFS`, `ENEMY_DEFS`, `buildWave(n, map)`. New content goes in as new defs and `buildWave` branches, in the same style.
- **Deterministic seeds already exist.** `mulberry32(seed)` drives wave-group shuffle (`n * 7919 + map.seed`) and map decoration. The Daily Stand (§3.6) is built on this, not on any new RNG.
- **Saves.** `localStorage` key `SAVE_KEY = 'ironhold.v1'` (the key *name* says v1; the profile *stamp* inside is `v: 2`). `loadProfile()` rebuilds the profile field-by-field with fail-soft sanitizers (`sanitizeBest`, `sanitizeRun`, `saneNum`). §4 extends exactly this pattern.
- **Test API.** `window.__ironhold = { G, newGame, startWave, buyTower, addTower, MAP_DEFS, TOWER_DEFS, ENEMY_DEFS, buildWave, enterGame, showScreen }`. `tests/smoke.js` (Playwright) drives the whole game through it. Every feature below names the test-API surface it must expose; if it isn't reachable through `__ironhold`, it isn't done.
- **Existing numbers the plan builds on.** Sell refund 70% of invested. Stars: 1–3 per map, awarded **only on victory**, by lives left (≥75% → 3, ≥40% → 2, else 1). Map unlock: reach wave 15 on the previous map. Boss leak costs 5 lives (normal leak 1). Boss waves are every 10th wave, boss count `1 + floor(n/30)`. Early-call bonus: `2 gold × seconds remaining` on the inter-wave countdown. Wave-clear bonus `20 + 3 × wave`.
- **Known 1.1.0 defects this plan fixes as part of scope** (from `~/workspace/ironhold-play/moe-review-2026-10-28.md`, still true in the shipped code): Tesla L3 is the best efficiency in the game and late game collapses to "Tesla wall + one Frost"; boss waves are income/HP *troughs* vs their neighbours; Endless hits an arithmetic wall around waves 55–65 (quadratic `hpMul` vs capped player power); losing at wave 37 discards ~an hour with no checkpoint; enemy art is circles on a rail despite the existing `wob` animation clock.

---

## 3. Feature specs

### 3.1 The Forge — permanent upgrade tree (CENTERPIECE, meta system)

**What it is.** A new screen reachable from the title screen ("The Forge"). Stars stop being decorative: every star and mastery mark the player has ever earned is a permanent currency (earned total, never subtracted from the record — spending tracks separately, see §4). The Forge is a tree of **15 nodes** in 3 branches of 5. Buying a node is permanent; a full respec is free from the title screen, but **only between runs** (never while `profile.run` exists), so a build is a commitment for the run you're planning, not a mid-wave toggle.

**Branches and nodes** (costs in stars/marks; effects are exact):

*Artillery branch (damage):*
1. **Sharpened Heads** (1) — all towers +8% damage.
2. **Heavy Loads** (2) — Cannon and Mortar splash radius +15%.
3. **Overcharge** (3) — Tesla chain decay improves: damage multiplier per jump 0.72 → 0.80 (applied *after* the §3.4 Tesla rebalance sets the base to 0.62; this node makes a built Tesla better than a 1.1.0 Tesla, a naked one worse — by design).
4. **Long Draw** (3) — Archer and Ballista range +0.4 cells.
5. **Siegebreaker Rounds** (3) — all towers deal +25% damage to bosses.

*Wardens branch (economy & defense):*
6. **Deep Coffers** (1) — +40 starting gold on every map.
7. **Salvage Crews** (1) — sell refund 70% → 85%.
8. **War Taxes** (3) — wave-clear bonus +50% (30 + 4.5/wave, rounded down).
9. **Reinforced Gate** (2) — +4 lives on every map; a boss leak costs 4 instead of 5.
10. **Early Muster** (3) — early-call bonus doubled (2 → 4 gold per second remaining).

*Command branch (unlocks and empowers §3.2):*
11. **Signal Fires** (1) — unlocks **Barrage**.
12. **Winter Stores** (1) — unlocks **Frost Nova**.
13. **War Chest** (2) — unlocks the **War Chest** ability.
14. **Drilled Crews** (2) — all ability cooldowns −25%.
15. **High Commander** (3) — abilities gain a second charge (charges refill one at a time on the normal cooldown).

Total tree cost: **31**. Total earnable: **30** (18 campaign stars + 12 mastery marks, §3.5). A completionist cannot buy the whole tree — at least one point of nodes always stays unbought, so the last choice never stops mattering. Nodes 11–13 are the only ones whose absence changes the HUD (ability buttons simply don't exist until unlocked).

**How it applies.** Effects are read at `newGame()` into `G.forge` (a resolved stats object: `dmgMul`, `splashMul`, `chainDecay`, `rangeBonus: {archer, ballista}`, `bossMul`, `startGold`, `sellRate`, `clearBonusMul`, `extraLives`, `bossLeak`, `earlyMul`, `abilities: [...]`, `cdMul`, `charges`). Combat code reads `G.forge` — never the profile directly — so a restored run behaves identically to a fresh one with the same Forge. **Forge effects do not apply in Daily Stand** (§3.6), which is the roster's pure-skill leaderboard-against-yourself mode.

**Acceptance criteria.**
- `__ironhold.FORGE_DEFS` exposes all 15 nodes with id, branch, cost, and a machine-checkable effect key.
- Smoke test: fresh profile → Forge screen lists 15 nodes, all unaffordable at 0 stars; grant 30 stars via `profile` fixture → buy one node per branch → start Greenfield → assert `G.gold === MAP_DEFS[0].gold + 40` with Deep Coffers bought, and `G.forge.dmgMul === 1.08` with Sharpened Heads bought.
- Smoke test: attempt respec while `profile.run` exists → refused with a toast; quit the run → respec succeeds and spent total returns to 0.
- Balance gate: with the full tree bought, a scripted reference defense (the victory fixture from `tests/smoke.js`, wave-40 Greenfield) still leaks at least one enemy before wave 40 if the player places nothing after wave 20 — i.e. the Forge helps, it does not autopilot. (If this is too fiddly to assert automatically, assert the weaker form: total Forge damage multipliers compound to ≤ ×1.45 vs base — 1.08 × 1.25 boss-only excluded — checked arithmetically from `FORGE_DEFS`.)

### 3.2 Commander abilities — active powers inside a run

**What they are.** Buttons on the game HUD (right panel, above Start Wave), unlocked via the Command branch. Each has a cooldown in seconds of *game* time (pauses and game-over freeze cooldowns; speed multiplies them like everything else). Targeted abilities enter a targeting state: the next canvas tap fires the ability at that point instead of selecting.

1. **Barrage** (unlock: Signal Fires). Tap a point: after 0.5 s, 5 shells land over 1.0 s in a 1.6-cell radius, each dealing 120 damage with the cannon splash rule (ground and air? — **ground only**, it's artillery). Cooldown 75 s.
2. **Frost Nova** (unlock: Winter Stores). No target: every enemy on the field is slowed 60% for 4 s (bosses: 25% for 4 s, reusing the existing boss-slow discount pattern in the frost projectile code) and takes 15 damage. Cooldown 90 s.
3. **War Chest** (unlock: War Chest node). No target: +150 gold immediately. Cooldown 120 s. (Deliberately the weakest per-use — it's the flexible one.)

Charges: 1 each by default; High Commander (§3.1 node 15) makes it 2. An ability with 0 charges shows its refill countdown on the button.

**Acceptance criteria.**
- `__ironhold.ABILITY_DEFS` exposes the 3 abilities with cooldown/damage constants; `__ironhold.fireAbility(id, x, y)` exists for tests.
- Smoke test: with Signal Fires bought, start a wave, spawn a grunt via a started wave, `fireAbility('barrage', grunt.x, grunt.y)`, advance game time 2 s at 3× speed → grunt is dead or has lost ≥ 120 effective HP (armor-adjusted); button reports cooldown > 70 s remaining.
- Smoke test: without the unlock nodes, ability buttons are absent from the DOM (not merely disabled).
- Targeting state cancels on pause, on map exit, and on tapping a UI button; it never consumes a tower-placement tap (placement requires the build panel flow, which targeting state blocks with a toast "Tap the field to fire, or tap the ability again to cancel").

### 3.3 Two new towers

Both fill a real hole in the current five: nothing pierces, and nothing out-ranges the road. All numbers are starting tuning in the exact `TOWER_DEFS` shape; the balance gates below are the contract, the numbers may move ±15% to meet them.

**Ballista** — `ballista`, color `#e3c565`, projectile `bolt2`. *"A heavy bolt that spears through the whole column. Hits air."* air: true, ground: true.
- L1: cost 130, range 4.6, dmg 34, rate 0.8 — L2: cost 150, range 5.0, dmg 62, rate 0.85 — L3: cost 240, range 5.4, dmg 115, rate 0.9, and the bolt pierces one additional target beyond the line (width +50%).
- Mechanic: on fire, the bolt travels in a straight line from the tower through the target to max range; **every** enemy whose centre is within 0.45 cells of the line takes full damage (no falloff). Implemented as a fast projectile with a `pierce: true` flag that doesn't despawn on hit and tracks already-hit enemy ids — the existing projectile loop's per-hit bookkeeping is the only new machinery.
- Strategy it forces: placement at the end of long straights becomes a real decision vs. bend coverage; it's the anti-Shieldbearer tower (§3.4) because a bolt down the column hits shield sides and backs as the line bends.

**Mortar** — `mortar`, color `#7a8899`, projectile `shell`. *"Lobs shells clean over the fight. Cannot hit anything close."* air: false, ground: true.
- L1: cost 160, range 5.5, **minRange 2.2**, dmg 55, rate 0.5, splash 1.3 — L2: cost 190, range 6.0, minRange 2.2, dmg 105, rate 0.55, splash 1.5 — L3: cost 300, range 6.5, minRange 2.0, dmg 200, rate 0.6, splash 1.8, shells leave a burning patch (burn 10/s for 2 s, reusing the flame burn fields).
- Mechanic: the existing `ball` projectile already flies to a target point with an arc (`prog` + `h`) — Mortar is that projectile with a longer flight, a bigger splash, and a targeting rule: `pickTarget` skips enemies closer than `minRange × CELL`. The dead zone is drawn as a red inner ring whenever the tower is selected or being placed (extend `drawRange` with an optional inner radius).
- Strategy it forces: back-line placement behind your front towers; a Mortar with no front line is dead gold when runners slip through — it punishes greed.

`TOWER_ORDER` becomes `['archer','cannon','frost','tesla','flame','ballista','mortar']`; the build panel and the smoke test's "5 build cards" assertion update to 7.

**Acceptance criteria.**
- Smoke test: place a Ballista at the end of Greenfield's first straight, start wave 1, assert via `G.towers[0].dmg` that a single shot damaged ≥ 2 enemies (pierce) during the wave.
- Smoke test: place a Mortar, spawn coverage — assert `pickTarget` never returns an enemy within minRange: drive a grunt to within 1.5 cells and assert the Mortar's `target` stays null while a grunt at 4 cells is targeted.
- Balance gate (scripted sim through the test API, no UI): on Greenfield, a 600-gold defense of *only* Ballistas and a 600-gold defense of *only* Mortars must each fail to clear wave 15 with all lives intact — neither new tower may be a dominant pure strategy. (The 1.1.0 Tesla failure mode is the thing being guarded against.)

### 3.4 Three new enemies — and the fixes to the old seven's math

New types go into `ENEMY_DEFS` in the same shape; each has exactly one new mechanic, implemented at the one place the engine already touches that concern.

**Shieldbearer** — `shield`, *"A walking wall. Its shield turns hits from the front — flank it, splash it, burn it."*
- Stats: hp 260, speed 0.95, reward 16, armor 2, r 13, color `#c96a2e`, `shield: true`.
- Mechanic (in `hitEnemy`): if the damage source has a position (tower or projectile origin) and the angle between the enemy's facing (`e.ang`, its direction of travel) and the direction *to* the source is within ±55°, damage is reduced by 70% (after armor). Splash damage (cannon/mortar impact point as source) uses the impact point's angle the same way — a shell landing *behind* the shield bypasses it. Burn damage over time (`e.burn` ticks, source `null`) always bypasses. Frost slow is unaffected.
- Why it changes play: head-on tower rows along a straight stop working; bends, crossfire, splash placement and Flame's burn all gain value. Ballista down a bending column hits backs.

**Mender** — `mender`, *"Patches up the column around it. Kill it first — if you can reach it."*
- Stats: hp 150, speed 1.15, reward 18, armor 0, r 11, color `#7ed491`, `heal: 14` (HP per second to allies within 1.6 cells, not itself, not other Menders, capped at each ally's `maxHp`; bosses receive 25% of the rate).
- Mechanic (in `updateEnemies`): a 0.5 s tick applies healing; healed enemies flash green briefly (reuse `hitT` with a negative/green render flag — render detail in §3.7).
- Why it changes play: it is the first enemy whose value is positional, not personal. 'Strongest' targeting ignores it; players must focus it with placement or a Barrage. It makes chip damage decay — burst and Frost uptime matter more.

**Splitter** — `splitter`, *"It does not die. It multiplies."*
- Stats: hp 190, speed 1.05, reward 10, armor 0, r 14, color `#b04f8a`, `splits: 3`.
- Mechanic (in `killEnemy`): on death, spawn 3 **Mites** at its position with its current path distance (small random offsets along the path). **Mite** — `mite`: hp 22, speed 2.6, reward 1, armor 0, r 7, color `#d98ab5`. Mites don't split. Kill gold for a Splitter is deliberately low; the mites carry the rest.
- Why it changes play: single-target overkill (a Mortar shell, a Barrage) converts one kill into three fast leaks; splash and chain (Tesla, Cannon, Frost L3 splash) gain value; it punishes exactly the burst the Mender rewards — the two together make wave composition a real puzzle.

**Wave integration.** `buildWave` gains an Act II schedule (used by the §3.5 maps and by Endless past wave 40 on all maps): shield from wave 8 of an Act II map, mender from wave 12, splitter from wave 16, mixed compositions (shield front + mender behind is a scripted group, not shuffle luck) from wave 20. Act I maps keep their current composition in campaign (their identity is the tutorial arc) but Endless on any map uses the full roster from wave 41.

**Balance fixes to existing content** (from the MoE roadmap, now in scope):
- **Tesla rebalance:** chain decay 0.72 → **0.62**, chain jump range 1.8 → **1.6** cells. (Forge node 3 restores a *built* Tesla past its 1.1.0 power; §3.1.)
- **Boss waves stop being troughs:** boss-wave groups gain an escort pack scaled to the wave (`add('knight', n/5, …)` already exists; add `add('runner', n/2, …)` — exists — **plus** a second escort group of the map's newest unlocked type and a +25% reward scaler on boss waves). Net effect to verify, not assume: total boss-wave HP and income within ±20% of the average of waves n−1 and n+1.
- **Endless curve:** for n > 40, replace the quadratic term with linear growth: `hpMul(n) = hpMul(40) × (1 + 0.22 × (n − 40))`, and enemy rewards scale `× (1 + 0.05 × (n − 40))` so the economy doesn't starve. The wave-55–65 arithmetic wall becomes a slope.
- **Frost overwrite bug** (one-line guard noted in the MoE review): a weaker slow must never overwrite a stronger active slow in its final 0.3 s; fold into the frost apply condition.

**Acceptance criteria.**
- Unit-style asserts via test API: spawn a Shieldbearer, hit it from directly ahead with a 100-damage tower hit → HP loss ≤ 30 + armor adjustment; hit from directly behind → full damage (minus armor). Burn tick → full damage.
- Mender: two grunts at 50% HP beside a Mender regain HP over 3 s; a Mender beside another Mender does not.
- Splitter: killing one produces exactly 3 mites at the same path distance ±0.3 cells; mites killed produce none.
- Boss-wave parity check scripted for waves 10/20/30/40 on Greenfield (HP and reward totals vs neighbours, ±20%).
- Endless: `buildWave(60, greenfield).hpMul` is less than the 1.1.0 formula's value at 60 (31.3 × diff) and greater than at 40 — assert both numerically.

### 3.5 Act II — three new maps, difficulty tiers, challenge modifiers

**The maps.** Appended to `MAP_DEFS` — **append-only is a hard rule** (§4: saved runs store `mapIdx` positionally; existing indices 0–2 must never move). Same 13×13 grid, same def shape, progressive unlocks continue the chain (reach wave 15 on Ashlands → map 4; and so on). Difficulty scalars continue the 1.0 / 1.18 / 1.38 progression.

4. **Emberdeep Crossing** (`emberdeep`, diff 1.55, gold 280, seed 41, waves 40) — a river map: a horizontal water band crosses the middle; theme gains a real `water` color (the Greenfield def already carries a `water: null` theme field — use it). The road crosses the water at **one bridge cell column**; decorations can't spawn in water; a second short path rejoins after the bridge. Teaching map for Shieldbearers (the bridge straight is a head-on trap; the banks are crossfire).
5. **The Spiral Warren** (`warren`, diff 1.72, gold 300, seed 53, waves 40) — a spiral path winding inward to a central gate: the same towers cover the road three times at different ranges; Mortar's dead zone and Ballista's lines both invert their usual value. Teaching map for Splitters (the spiral packs enemies densely — splash heaven, mite flood on every splitter death).
6. **Twin Gates** (`twingates`, diff 1.9, gold 320, seed 67, waves 40) — two fully separate paths with **separate gates and a shared lives pool** (leak from either costs the same lives; Frostvale's converging paths are the tutorial for this). Boss waves send a Warlord down one path and the new boss down the other. The roster's final exam.

**New boss — the Siegebreaker** (`siege`, Act II boss): hp 2100, speed 0.6, reward 220, armor 9, r 22, color `#4a2f18`, `boss: true`, `splits: 0`. One new mechanic: at 50% HP it **slams** — every tower within 2.0 cells is disabled for 5 s (towers render cracked/dark, don't fire, cooldowns pause; implemented as `t.stunT` checked in `updateTowers`). It appears on Act II boss waves (alternating with Warlord by map: Emberdeep Warlord, Warren Siegebreaker, Twin Gates both) and in Endless past wave 50.

**Difficulty tiers.** Every map gains two replay tiers, unlocked by conquering it on the tier below:
- **Veteran:** enemy HP ×1.35, armored types +1 armor, rewards ×1.2. Conquering awards **1 mastery mark** for the map.
- **Ironhold:** enemy HP ×1.7, speeds ×1.08, boss waves gain a second boss (the map's other boss type), rewards ×1.45. Conquering awards **1 mastery mark**.
- Tiers are chosen on the map-select button (a tier toggle appears once unlocked); `profile.best` records stars **per tier** (a Normal 3-star doesn't pretend to be an Ironhold 3-star — §4), while campaign stars for Forge currency count the best tier result per map once (no double-counting: currency = best stars per map across tiers + mastery marks).
- Implementation: a `TIER_DEFS` table read by `newGame(mapIdx, run, tier)`; `buildWave` receives the tier's hp/armor adjustments via the compiled map object so wave math stays in one place.

**Challenge modifiers.** Two optional mutators per map, chosen at run start, each worth **1 mastery mark** the first time that map is conquered with it active (marks: 2 modifiers × 6 maps = 12):
- **Armored Column** — every enemy gains +3 armor; flying enemies +1.
- **Gold Rush** — rewards ×1.5, enemy speed ×1.25.
- (One roster-wide pair, deliberately: per-map unique modifiers are content debt; these two recombine with tiers to make 6 maps × 3 tiers × 3 modifier states = 54 distinct campaign challenges from 6 maps of geometry.)
- Modifiers are incompatible with Daily Stand and don't stack with each other (one at a time).

**Acceptance criteria.**
- `MAP_DEFS.length === 6`; indices 0–2 are byte-identical defs to 1.1.0 (assert by id order `['greenfield','frostvale','ashlands', …]`).
- Each Act II map: scripted full-campaign sim (the smoke-test victory pattern: generous gold, max-level mixed towers) reaches a Victory screen — proves the map is *beatable in principle*; and a no-towers run loses — proves the path/gate wiring leaks correctly.
- Twin Gates: leak on path B reduces the same lives pool; boss wave 10 spawns exactly 2 bosses, one per path.
- Siegebreaker: at ≤50% HP, a tower within 2.0 cells stops firing for 5 s ±0.5 s; a tower at 2.5 cells is unaffected.
- Tier math: `buildWave(20, warrenVeteran).hpMul === buildWave(20, warren).hpMul × 1.35` (±rounding); conquering on Veteran (via the victory fixture at tier 1) sets the map's mastery mark and unlocks Ironhold tier.
- Modifier mark: conquering Greenfield with Armored Column active (victory fixture with generous setup) awards exactly 1 mark, once; repeating awards 0.

### 3.6 Daily Stand — the offline daily challenge

**What it is.** One deterministic challenge per calendar day, generated entirely on-device: seed = `YYYYMMDD` of the device's local date, fed to the existing `mulberry32`. The seed picks: one of the 6 maps (rotation by seed, including locked maps — Daily Stand is also the demo of maps a new player hasn't unlocked), a fixed 20-wave run, one challenge modifier from the §3.5 pair (or none), and **Forge disabled** (pure skill; §3.1). Lives 20, starting gold = the map's standard +10%.

**Stakes, all local.** The profile records, per date seed: attempted (bool), best wave, won (bool), and lives left if won. The title screen shows today's Stand with its map and modifier ("Daily Stand — Twin Gates · Gold Rush"), a streak counter (consecutive days won), and yesterday's result. There is no server, no comparison to other players, nothing leaves the device — the listing's promises hold word for word. Missing a day just breaks the streak; there is no punishment mechanic and nothing to buy back (there is nothing to buy, full stop).

**Acceptance criteria.**
- Determinism: two fresh profiles on the same date produce the identical Stand (same map id, modifier, and `buildWave` group composition for waves 1–20) — assert by generating with a fixed injected date through the test API (`__ironhold.dailyFor('2026-11-08')` returns the descriptor without touching the real clock).
- Date rollover: `dailyFor` for two consecutive dates differs in seed; the descriptor never includes a Forge effect.
- A won Stand writes exactly one record under its date key; replaying the same day updates best-wave only upward and never double-counts the streak.

### 3.7 Quality of life and polish (the asks 1.1.0 players actually have)

Each item is small; together they're the difference between "content pack" and "2.0". All are drawn from the MoE review's UX/Polish items so they are known-true asks, not invented ones.

1. **Defeat checkpoint.** On defeat at wave ≥ 10, the end screen offers **"Retry from wave N−4"** (N = the wave you fell on): restarts the run at that wave with the tower layout snapshotted at that wave's start (the run saver already snapshots per wave-clear — store the last four wave-start snapshots in the run object, ring-buffered), gold reset to the snapshot's gold, lives restored to the snapshot's lives. One checkpoint retry per run per wave-band (using it consumes it for that band; you can earn a new one 10 waves later). *Acceptance:* scripted defeat at wave 14 → retry offered at wave 10 → restored towers/gold/lives equal the wave-10 snapshot exactly.
2. **Next-wave preview.** The Start Wave button's panel shows the incoming wave's composition icons/counts ("Next: Grunts ×24 · Wisps ×8 · ⚠ Boss") from `buildWave` before the wave starts — including during the countdown. *Acceptance:* preview text for wave 10 on Greenfield contains "Boss".
3. **Upgrade deltas in the tower panel.** Selecting a tower shows current → next stats ("Dmg 11→21 · Rng 3.2→3.6") and one line naming its targeting mode in plain words. Data already exists in `TOWER_DEFS`; this is rendering only. *Acceptance:* panel DOM for a level-0 Archer contains "11→21".
4. **Full refund while planning.** A tower that has never fired sells at 100% during the `ready`/`countdown` phase (70% rule otherwise, or Forge's 85%). Track `t.fired` (set in `fire()`). *Acceptance:* buy → sell before wave start returns full cost; buy → fire once → sell returns the standard rate.
5. **Per-level tower visuals + a real gate.** Level 2 adds a trim ring in the tower's color-dark; level 3 adds the gold pips the MoE review described. The gate markers stop being colored dots: draw a simple stone gate (two posts + lintel) at each path end, spawn portal at each start. Theme-aware decorations: Frostvale gets pines in snow tones and bare rocks, Ashlands gets charred stumps and embers — `compileMap` deco kinds gain a per-theme palette instead of one green set for all. *Acceptance:* visual/staged-screenshot check (§5); code-side, `compileMap(frostvale).decos` kinds ⊆ the frost palette set.
6. **Enemy animation pass.** Use the existing `wob` clock: enemies bob ±1.5px and tilt toward travel direction; each type gets a distinguishing silhouette detail drawn from its def (knight: helm crest; drake/wisp: wing flicker via wob phase; shieldbearer: shield arc drawn on its facing side — which the §3.4 mechanic needs players to *see* anyway; boss: crown/spikes). *Acceptance:* shieldbearer's shield renders on the facing side — verified by staged screenshot, not by eye alone.
7. **Sound toggle in the pause menu** (currently title-screen only) and **restart confirmation** on Restart Map. *Acceptance:* both controls exist and function in the smoke test's pause flow.

**Explicitly not in this section:** a music loop (MoE Polish #5) — desirable, but synthesized music that doesn't annoy across 240 waves is its own project; it is a non-goal for 2.0 (§6) rather than a rushed bullet.

---

## 4. Save compatibility — v1.1.0 (profile v2) → 2.0 (profile v3)

**Principles.** Nothing earned is lost; nothing is reinterpreted; a corrupt field degrades to its default, never to a wiped profile. The existing code already works this way — 2.0 extends the pattern, it does not replace it.

**Mechanics.**
- `SAVE_KEY` stays `'ironhold.v1'`. Renaming the key would orphan every existing save; the key name is not the version.
- Profile stamp bumps: `profile.v = 3` on save. `loadProfile()` accepts stamps 2 and 3 (and anything else by rebuilding field-by-field, as today).
- **Append-only `MAP_DEFS`.** New maps go at indices 3, 4, 5. Saved runs store `mapIdx` positionally and `sanitizeRun` bounds-checks against `MAP_DEFS.length` — appending keeps every v2 run valid; reordering would corrupt them. This is a code-review gate, not a hope.
- **New profile fields, all defaulted by sanitizers in the existing style:**
  - `forge: { nodes: [] , spent: 0 }` — `sanitizeForge`: keep only ids present in `FORGE_DEFS`, dedupe, recompute `spent` from node costs (never trust the stored number).
  - `mastery: {}` — per map id: `{ veteran: bool, ironhold: bool, mods: { armored: bool, goldrush: bool } }`, sanitized per-flag booleans.
  - `best` entries gain optional `tier` detail: stored shape becomes `{ wave, stars, won, byTier: { '0': {stars, won}, '1': {…}, '2': {…} } }`. `sanitizeBest` migrates a v2 entry by treating its `{wave, stars, won}` as the tier-0 record. Forge currency is *derived*, never stored: `earned = Σ best-stars-per-map (any tier) + Σ mastery marks`; spendable = earned − forge.spent.
  - `daily: {}` — per date key `{ best, won, lives }`, plus `streak: { count, lastWonDate }`, sanitized by key format (`/^\d{8}$/`) and `saneNum` ranges. Cap stored daily entries at the most recent 90 keys to keep the profile small.
  - `run` gains optional fields, all optional in `sanitizeRun`: `tier` (0–2, default 0), `mod` (null | 'armored' | 'goldrush'), `snaps` (the §3.7 checkpoint ring buffer — tower arrays sanitized by the same per-tower rules as the main run; a bad snapshot drops the snapshot, not the run), `abilityState` (charges/cooldown remaining per ability id, `saneNum`-clamped). A v2 run has none of these and must restore as a Normal, unmodified run with full ability charges — bit-for-bit the 1.1.0 experience.
- **Mid-run saves across the update.** A player who updates mid-run keeps the run: towers reference types by key (`TOWER_DEFS[t.t]`), tower level clamps to `lv.length − 1` (unchanged: all existing towers keep exactly 3 levels — the new towers are new keys, not new levels on old keys), targeting modes validated against `TARGET_MODES` (unchanged list).
- **What a v2 player sees on first 2.0 launch:** same title screen, same stars on the same maps, their in-progress run still offered on Continue; the Forge button is new, and their 9 existing stars are immediately spendable (a day-one veteran can buy ~a third of the tree — that's the retention hook of the whole update).

**Acceptance criteria.**
- Fixture test (in `tests/smoke.js` style): write a literal v2 profile JSON (3 maps of best entries incl. stars/won, a mid-run save on Frostvale with one tower of each of the 5 types, sound off) into `localStorage` before the game script runs → load 2.0 → assert: all best entries identical in wave/stars/won; the run restores with 5 towers at identical cells/levels/modes; `profile.v === 3` after the next save; `forge.spent === 0`; daily/mastery empty objects; sound still off.
- Corruption test: the same fixture with `forge.nodes: ['bogus', 'deep-coffers', 'deep-coffers']` and `run.tier: 99` → loads with nodes `['deep-coffers']`, tier clamped to 0–2 range rule (invalid → 0), run intact.
- Downgrade note (document, don't build): a profile saved by 2.0 (v3) loaded by 1.1.0 would lose the new fields (1.1.0 rebuilds the profile from known fields only) but keep best/run — acceptable, Play doesn't downgrade users in practice.

---

## 5. Build sequence

Five phases. Each phase ends green (`npm test` — the Playwright smoke suite, extended per phase — plus the Android CI emulator launch test) and independently demonstrable through the test API. Order puts the riskiest system first: if the Forge isn't fun, 2.0's centerpiece changes while the cheap content is still unbuilt.

**Phase 1 — Save v3 + the Forge + Commander abilities (the new systems).**
Profile v3 migration + sanitizers + fixture tests (§4 lands *first*, before any feature reads the new fields). Forge screen + `FORGE_DEFS` + effect resolution into `G.forge`. Ability HUD, targeting state, three abilities, `ABILITY_DEFS`, test-API exposure. All on the existing 3 maps/5 towers — deliberately no new content, so system bugs can't hide behind content bugs. *Exit gate:* §3.1, §3.2, §4 acceptance criteria all pass.

**Phase 2 — New combat content + balance surgery.**
Ballista, Mortar (incl. min-range rendering), Shieldbearer, Mender, Splitter/Mites; Tesla rebalance; boss-escort parity; Endless curve; frost-overwrite guard. Act II wave schedule wired into Endless only (campaign maps land in Phase 3). *Exit gate:* §3.3, §3.4 acceptance criteria incl. the two no-dominant-strategy sims.

**Phase 3 — Act II + tiers + modifiers.**
Three maps (append-only), Siegebreaker + stun, tier system (`TIER_DEFS`, per-tier best records, map-select tier toggle), challenge modifiers + mastery marks, Forge currency derivation switched to the full formula (stars + marks). *Exit gate:* §3.5 acceptance criteria incl. all three maps' beatable-in-principle sims.

**Phase 4 — Daily Stand + QoL pack.**
Daily Stand (descriptor, title-screen card, streaks), defeat checkpoint, wave preview, upgrade deltas, planning-phase full refund, per-level tower visuals, gate art, theme palettes, enemy animation pass, pause-menu sound toggle, restart confirmation. *Exit gate:* §3.6, §3.7 acceptance criteria.

**Phase 5 — Store and release (§6).** No new features; fixes only for what the pre-launch report and staged screenshots catch.

**Sequencing note for whoever schedules this:** Phases 1–4 are one `game.js` — they cannot be parallel-built by two builders editing the same file. They are sequential by design; each phase's exit gate is the next phase's starting condition.

---

## 6. Store and launch notes

**Version.** `versionName 2.0.0`, `versionCode 20000` (above 10100 and every earlier upload). Free update to existing buyers; store price unchanged at $2.99. **Do not** touch the price or the paid/free status — a Play app cannot go free→paid, and Ironhold's whole pitch is one fair price.

**Release flow** (mirrors how 1.1.0 shipped, per `README.md` §Publishing):
1. Merge the 2.0 work to `main`; Android CI (`.github/workflows/android.yml`) must be green — it builds, `tools/check-apk.js`-verifies, and emulator-launches the bundle on every change.
2. Actions → **Release (Play bundle)** → run with version `2.0.0`, using the **existing** upload key (repo Actions secrets `ANDROID_UPLOAD_KEYSTORE` etc., or local `android/keystore.properties` — the key that signed the listing's first upload; never generate a new one). Output: `ironhold-2.0.0-play.aab`, release tagged `play-v2.0.0`.
3. Local verification before Console: `check-apk.js` against the release APK (package `com.taugustincst.ironhold`, game files present under `assets/www`), plus the full `tests/smoke.js` suite against the exact bundled files.
4. Play Console → Ironhold → Test and release: create the 2.0.0 release on the production track, upload the `.aab`, release notes (below). Check the **pre-launch report** shows no crashes before sending for review.
5. Publishing overview → Send changes for review. **This step is Tj's go-ahead** — everything before it is preparation; nothing in this plan authorizes submission.
6. Post-release: verify the live listing shows 2.0.0 and the new copy; play one real wave on a phone from the store build (the 1.0.1 lesson: the wrapper that wasn't tested is the wrapper that crashes).

**Release notes (in-app "What's new", ≤500 chars):**
> IRONHOLD 2.0 — THE FORGE UPDATE. A whole second campaign: 3 new maps and 120 new waves. 2 new towers (Ballista, Mortar), 3 new enemies, a new boss. Spend your stars in the Forge on permanent upgrades and unlock Commander abilities. Veteran & Ironhold difficulties, challenge modifiers, and a Daily Stand challenge — fresh every day, still fully offline. No ads. No purchases. Ever.

**Updated listing copy** — replace the middle sections of `store/listing.md`; the NO ADS section and the honesty framing stay verbatim. Every claim below must be true of the release candidate (they are, if §3 shipped whole):
- Short description (≤80 chars): `Offline tower defense: 240 waves, 6 maps, 7 towers, bosses. No ads, no IAP.` (75 chars)
- New section headers: **SIX MAPS, 240 WAVES** (Act I + Act II named) · **SEVEN TOWERS, THREE LEVELS EACH** (+ Ballista: *"Spears a whole column"*; Mortar: *"Lobs shells over the fight — mind the dead zone"*) · **TEN KINDS OF TROUBLE** (+ Shieldbearer, Mender, Splitter named with their one-line counters) · **THE FORGE** (stars buy permanent upgrades; Commander abilities) · **BUILT FOR REPLAY** (Veteran & Ironhold tiers, challenge modifiers, Endless, Daily Stand — *"a new challenge every day, generated on your device"*).
- Keep the **STILL GROWING** section — 2.0 is the receipt that the promise was kept.

**Screenshots.** The store set is currently 5 staged 720×1280 shots in `store/`. 2.0 needs a new set of 6, staged through `window.__ironhold` the same way (deterministic states, not lucky gameplay): (1) Emberdeep bridge crossfire with Shieldbearers mid-column; (2) the Forge screen with several nodes bought; (3) a Barrage landing (targeting state visible); (4) Twin Gates boss wave, both bosses on screen; (5) the Spiral Warren with Mortars behind the line (dead-zone ring visible); (6) map select showing 6 maps, tiers, and star/mastery counts. Feature graphic: refresh the existing 1024×500 with the Act II palette rather than replacing the identity.

**Console declarations — unchanged, re-verify don't redo:** Data safety stays "No data collected / No data shared" (Daily Stand and Forge are on-device only — this is why §3.6 forbids any server design). Ads declaration stays "No ads". Content rating: the Siegebreaker's slam and new enemies change no questionnaire answer (cartoon violence, nothing else) — re-run the IARC questionnaire only if the Console prompts. Target audience stays 13+, not Designed for Families. Privacy policy URL unchanged (`https://taugustincst.github.io/ironhold/privacy.html`) — its text already covers local-only storage; no edit needed.

---

## 7. Risks and non-goals

**Risks.**
- **Balance compounding.** Forge multipliers × 2 new towers × tier scalars can quietly trivialize or wall content. Mitigations are built into the plan as gates (§3.1 compounding cap, §3.3 no-dominant-strategy sims, §3.4 boss parity, §3.5 beatable-in-principle sims) — they are acceptance criteria, not aspirations. If a gate fails, tune numbers before adding anything.
- **Single-file contention.** `game.js` grows from ~720 to an estimated ~1,400 lines. Two builders in the same file will collide; phases are sequential (§5). Resist splitting the file mid-upgrade — the packager and smoke tests assume the current layout; a refactor is a separate project.
- **Save corruption is the only unforgivable bug.** A paid game that eats a veteran's 3-star profile gets one-star reviews that never heal. §4's fixture tests run from Phase 1 onward, and the append-only `MAP_DEFS` rule is a review gate on every phase.
- **Budget-phone performance.** More enemy types, healing ticks, pierce bookkeeping and Act II density all cost frame time in `pickTarget`/`updateEnemies` (the MoE review already flags O(n²) retargeting). If Phase 2's sims show frame drops on the emulator launch test's device class, the approved mitigations are the MoE's own: squared distances in range checks and staggered retargeting — behavior-identical, in scope.
- **Scope creep toward the network.** Any feature that "would be better with a server" (real leaderboards, shared daily results, cloud saves) is out — not deferred, out (§7 non-goals). The store listing's promises are the product.
- **Play review.** A content update to a paid app re-enters review; the 1.1.0 crash-rejection history means the pre-launch report check (§6 step 4) is mandatory, not optional.

**Explicit non-goals.** No ads. No in-app purchases (including "support the dev" tips). No accounts, sign-in, analytics, telemetry, or crash reporting that phones home. No network calls of any kind — the Android manifest keeps zero permissions. No online leaderboards, no multiplayer, no cloud save, no user-generated content. No price change and no free→paid games. No new framework, build step, or engine port; no iOS version in this upgrade. No synthesized music loop (deferred as its own project, §3.7). No resetting, rebalancing-away, or expiring of anything a 1.1.0 player has earned. No per-map unique challenge modifiers beyond the roster-wide pair (§3.5). No changes to Elderon, Bubble Pop, or the shell games — this plan is Ironhold only.

---

## Appendix A — Test-API additions required

`window.__ironhold` gains: `FORGE_DEFS`, `ABILITY_DEFS`, `TIER_DEFS`, `MODIFIER_DEFS`, `fireAbility(id, x, y)`, `dailyFor(dateStr)`, `buyForgeNode(id)`, `respecForge()`, and `profile` (read access, for fixture assertions). Everything else in the 1.1.0 API stays untouched — the existing smoke test must pass unmodified except for the build-panel card count (5 → 7) and any assertion that counts maps (3 → 6).

## Appendix B — Numbers that define "worth $2.99"

- Content volume: **2× maps, 2× campaign waves** (120 → 240), **+40% towers** (5 → 7), **+43% enemy types** (7 → 10).
- Replay volume: 6 maps × 3 tiers × 3 modifier states = **54 distinct campaign challenges** (vs 3 in 1.1.0), plus Endless on every map and a Daily Stand that never repeats a seed.
- Progression: 30 earnable Forge currency against a 31-point tree — a system a 1.1.0 veteran engages with *on first launch of 2.0*, because their 9 banked stars are already spendable.
- Price per campaign wave: $2.99 / 240 ≈ **1.2¢** — the listing never says this, but it's the arithmetic behind "worth the price": 2.0 doubles the game for the same one-time $2.99 and charges existing owners nothing.
