# Ironhold Tower Defense

A complete, self-contained HTML5 tower defense game, sold on Google Play as a paid app with the
whole game inside it. The website (https://taugustincst.github.io/ironhold/) is its store page;
once the store-page change is merged it no longer serves the playable game.

## Game

- 3 maps (Greenfield Pass, Frostvale Fork with two converging roads, Ashlands Gauntlet) with progressive unlocks
- 40-wave campaign per map, bosses every 10 waves, then Endless mode
- 5 tower types, each with 3 upgrade levels: Archer, Cannon (splash), Frost (slow), Tesla (chain lightning), Flame (burn)
- 7 enemy types including flying and armored units, selectable targeting modes, sell/refund
- Early-call bonus, 1×/2×/3× speed, pause, auto-pause on background, Android back button support
- Progress, stars, and in-progress runs saved on device (no accounts, no network calls, no ads)
- Synthesized sound effects (WebAudio, no asset downloads)
- No build step and no dependencies: `index.html`, `style.css`, `game.js`, `sw.js`, `manifest.webmanifest`

Tuning lives at the top of `game.js` (`MAP_DEFS`, `TOWER_DEFS`, `ENEMY_DEFS`, `buildWave`).

## Publishing to Google Play

The Play app carries the whole game: `android/play` packs `index.html`, `game.js`, `style.css`,
the icons and the privacy policy into the APK and opens them full screen in a WebView
(`https://appassets.androidplatform.net/www/index.html`, served by AndroidX WebViewAssetLoader).
It asks for no permissions, not even internet. Package `com.taugustincst.ironhold`. Versions
before 1.1.0 were a Trusted Web Activity that opened the website instead.

The first upload was a wrapper generated outside this repository, and Play rejected it on
1 Nov 2026 under Broken Functionality ("The app opens, but it keeps crashing"). That wrapper
is replaced by `android/play`, which is built, checked and launched on an emulator by
`.github/workflows/android.yml` on every change. Its manifest names no `Application` class:
the same kind of generated wrapper got Chronicles of Elderon rejected the same day because it
named one its dex did not contain. Do not go back to `bubblewrap build` or PWABuilder output.

### 1. The upload key

Play only accepts bundles signed with the key that signed the listing's first upload. That
keystore came with whichever tool built the first bundle (Bubblewrap writes `android.keystore`;
PWABuilder's download has `signing.keystore` and `signing-key-info.txt`). Use that one; do not
make a new one. If it is lost, request an upload key reset in Play Console → Setup → App signing.

Either put it in the repository's Actions secrets (`ANDROID_UPLOAD_KEYSTORE` as base64,
`ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`),
or create `android/keystore.properties` locally (ignored by git, never commit it):

```properties
storeFile=/path/to/the/upload.keystore
storePassword=...
keyAlias=...
keyPassword=...
```

### 2. Build the app bundle

**On GitHub:** Actions → *Release (Play bundle)* → Run workflow with version `1.1.0`. With the
secrets set, it builds, checks and attaches `ironhold-1.1.0-play.aab` (versionCode 10100) to a
release tagged `play-v1.1.0`.

**Or locally** (Android SDK with platform 36, JDK 17+):

```bash
cd android
./gradlew :play:bundleRelease :play:assembleRelease -PversionCode=10100 -PversionName=1.1.0
node ../tools/check-apk.js play/build/outputs/apk/release/play-release.apk --package com.taugustincst.ironhold
# upload play/build/outputs/bundle/release/play-release.aab
```

Every upload needs a higher `versionCode` than any earlier one; 10100 is above every earlier
upload's. To try it on a phone first: `adb install play/build/outputs/apk/release/play-release.apk`.

### Resubmitting after the 1 Nov 2026 rejection

1. Merge the fix, then build the signed bundle (step 2).
2. Play Console → Ironhold → Test and release → create a new release on the track the rejected
   one was on, upload the new `.aab`, and add a release note.
3. Optional but worth it: before sending for review, check the pre-launch report for that
   release shows no crashes.
4. Publishing overview → Send changes for review. No appeal is needed: the notice says a fixed
   version resubmitted for review is the way back.

### 3. No asset links needed

The app no longer opens the website, so `assetlinks.json` needs no entry for it.

### 4. Play Console listing checklist

- **App category**: Game → Strategy. **Content rating**: complete the IARC questionnaire (no violence beyond cartoon shapes, no user content, no purchases) → expect "Everyone".
- **Privacy policy URL**: `https://taugustincst.github.io/ironhold/privacy.html` (already written; the game collects nothing).
- **Data safety form**: "No data collected", "No data shared". Local save data never leaves the device.
- **Ads**: declare "No ads".
- **Store assets**: 512×512 icon (`icons/icon-512.png`), 1024×500 feature graphic, and at least 2 phone screenshots (in `store/`).
- **Target API level**: `android/play/build.gradle` targets API 36; raise `compileSdk`/`targetSdk` when Play's yearly requirement moves.
- **Pricing**: set the app as paid at upload time if you want to charge up front. A Play app cannot change from free to paid later, so decide before publishing.

### 5. Releasing updates

The game ships inside the app, so a game change reaches players only in a new Play release: run
the Release workflow with a higher version (1.1.1, 1.2.0 and so on) and upload the bundle.

### 6. The website

`.github/workflows/pages.yml` deploys the repository to Pages. The store-page change replaces it
with only `site/index.html` (the store page), `privacy.html`, the store graphics and a `sw.js` that
clears the offline copy of the game earlier visitors installed. Merge that change only after
version 1.1.0 is live on Play, because the 1.0.x app opens the website.

## Local development

```bash
npm install     # playwright, for the smoke test only
npm run serve   # http://localhost:8777/ironhold/
npm test        # headless end-to-end check
```
