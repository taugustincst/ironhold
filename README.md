# Ironhold Tower Defense

A complete, self-contained HTML5 tower defense game built for Google Play.
Live at **https://taugustincst.github.io/ironhold/** (installable PWA, works offline), deployed from this repository by GitHub Pages.

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

This game ships as a **Trusted Web Activity (TWA)**: a small Android app that opens the
PWA full-screen in Chrome (or in its own WebView on a phone without a TWA-capable browser).
The Android project is in `android/` (module `android/play`), package `com.taugustincst.ironhold`.

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

**On GitHub:** Actions → *Release (Play bundle)* → Run workflow with version `1.0.1`. With the
secrets set, it builds, checks and attaches `ironhold-1.0.1-play.aab` (versionCode 10001) to a
release tagged `play-v1.0.1`.

**Or locally** (Android SDK with platform 36, JDK 17+):

```bash
cd android
./gradlew :play:bundleRelease :play:assembleRelease -PversionCode=10001 -PversionName=1.0.1
node ../tools/check-apk.js play/build/outputs/apk/release/play-release.apk --package com.taugustincst.ironhold
# upload play/build/outputs/bundle/release/play-release.aab
```

Every upload needs a higher `versionCode` than any earlier one; 10001 is above the rejected
upload's. To try it on a phone first: `adb install play/build/outputs/apk/release/play-release.apk`.

### Resubmitting after the 1 Nov 2026 rejection

1. Merge the fix, then build the signed bundle (step 2).
2. Play Console → Ironhold → Test and release → create a new release on the track the rejected
   one was on, upload the new `.aab`, and add a release note.
3. Optional but worth it: before sending for review, check the pre-launch report for that
   release shows no crashes.
4. Publishing overview → Send changes for review. No appeal is needed: the notice says a fixed
   version resubmitted for review is the way back.

### 3. Digital Asset Links (removes the browser bar)

Chrome only hides its URL bar if the site vouches for the app. After you upload the bundle:

1. Play Console → your app → **Setup → App signing** → copy the **SHA-256 certificate fingerprint** under *App signing key certificate*.
2. Also copy the fingerprint of your *upload key* (`keytool -list -v -keystore android.keystore`), so sideloaded test builds are trusted too.
3. Add a second object to `/.well-known/assetlinks.json` in the `taugustincst.github.io` site repo, next to the Elderon entry:

```json
{"relation":["delegate_permission/common.handle_all_urls"],
 "target":{"namespace":"android_app","package_name":"com.taugustincst.ironhold",
 "sha256_cert_fingerprints":["<PLAY_APP_SIGNING_SHA256>","<UPLOAD_KEY_SHA256>"]}}
```

4. Commit and push; verify at `https://taugustincst.github.io/.well-known/assetlinks.json`.

### 4. Play Console listing checklist

- **App category**: Game → Strategy. **Content rating**: complete the IARC questionnaire (no violence beyond cartoon shapes, no user content, no purchases) → expect "Everyone".
- **Privacy policy URL**: `https://taugustincst.github.io/ironhold/privacy.html` (already written; the game collects nothing).
- **Data safety form**: "No data collected", "No data shared". Local save data never leaves the device.
- **Ads**: declare "No ads".
- **Store assets**: 512×512 icon (`icons/icon-512.png`), 1024×500 feature graphic, and at least 2 phone screenshots (take them from the live site on a phone or with Chrome DevTools device mode).
- **Target API level**: `android/play/build.gradle` targets API 36; raise `compileSdk`/`targetSdk` when Play's yearly requirement moves.
- **Pricing**: set the app as paid at upload time if you want to charge up front. A Play app cannot change from free to paid later, so decide before publishing.

### 5. Releasing updates

Game updates are just pushes to this repo: the service worker (`sw.js`) picks up new files on the next launch.
Bump `VERSION` in `sw.js` whenever you change game files so cached players get the update.
You only need a new Android build (run the Release workflow with a higher version) when the wrapper itself changes or Play requires a newer target SDK.

## Local development

```bash
npm install     # playwright, for the smoke test only
npm run serve   # http://localhost:8777/ironhold/
npm test        # headless end-to-end check
```
