# Ironhold Tower Defense

A complete, self-contained HTML5 tower defense game built for Google Play.
Live at **https://taugustincst.github.io/ironhold/** (installable PWA, works offline).

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

This game ships as a **Trusted Web Activity (TWA)**: a tiny Android app that opens the
PWA full-screen in Chrome, exactly like the existing Elderon app on this site.
The config for Bubblewrap is in `android/twa-manifest.json`.

### 1. One-time setup

```bash
npm i -g @bubblewrap/cli
cd ironhold/android
bubblewrap init --manifest https://taugustincst.github.io/ironhold/manifest.webmanifest
```

Bubblewrap will install a JDK and Android SDK on first run, read the values in
`twa-manifest.json`, and create a signing keystore (`android.keystore`) if one does not exist.
Keep the keystore and its passwords safe and out of git (`android/.gitignore` already excludes it).

### 2. Build the app bundle

```bash
cd ironhold/android
bubblewrap build
```

This produces `app-release-bundle.aab` (upload this) and `app-release-signed.apk` (for local testing:
`adb install app-release-signed.apk`).

### 3. Digital Asset Links (removes the browser bar)

Chrome only hides its URL bar if the site vouches for the app. After you upload the bundle:

1. Play Console → your app → **Setup → App signing** → copy the **SHA-256 certificate fingerprint** under *App signing key certificate*.
2. Also copy the fingerprint of your *upload key* (`keytool -list -v -keystore android.keystore`), so sideloaded test builds are trusted too.
3. Add a second object to `/.well-known/assetlinks.json` next to the Elderon entry:

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
- **Target API level**: Bubblewrap keeps `targetSdk` current with Play's yearly requirement; re-run `bubblewrap update` before each release.
- **Pricing**: set the app as paid at upload time if you want to charge up front. A Play app cannot change from free to paid later, so decide before publishing.

### 5. Releasing updates

Game updates are just pushes to this repo: the service worker (`sw.js`) picks up new files on the next launch.
Bump `VERSION` in `sw.js` whenever you change game files so cached players get the update.
You only need a new Android build (bump `appVersionCode` and `appVersionName` in `twa-manifest.json`, then `bubblewrap build`) when the wrapper itself changes or Play requires a newer target SDK.

## Local development

Any static server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000/ironhold/
```
