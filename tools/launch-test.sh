#!/usr/bin/env bash
# Installs the Play edition on a running emulator, opens it the way a player
# (or a Play reviewer) does, and fails unless the game actually loads.
#
# A launch that merely doesn't crash is not a pass: Play rejected Bubble
# Pop's first upload because the app opened onto the WebView's error page
# instead of the game. So besides a crash or a hang this fails when the page
# never reports itself loaded (MainActivity logs IRONHOLD_READY once it has),
# when the page has nothing on it, when it failed to load, when a file it
# asks for is missing from the APK, or when its script throws.
#   tools/launch-test.sh <apk> [package]
set -uo pipefail
APK="$1"
PKG="${2:-com.taugustincst.ironhold}"
OUT="${LAUNCH_TEST_OUT:-launch-test}"
mkdir -p "$OUT"

fail() { echo "launch-test: FAIL: $*"; exit 1; }

adb wait-for-device
adb install -r "$APK" || fail "the APK did not install"
adb shell pm clear "$PKG" >/dev/null 2>&1 || true
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 15
adb exec-out screencap -p > "$OUT/after-launch.png" || true
adb logcat -d > "$OUT/logcat.txt"
adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity" | tee "$OUT/resumed.txt" || true

if grep -A2 "FATAL EXCEPTION" "$OUT/logcat.txt" | grep -q "Process: $PKG"; then
  grep -A30 "FATAL EXCEPTION" "$OUT/logcat.txt" | head -60
  fail "$PKG crashed at launch"
fi
grep -q "ANR in $PKG" "$OUT/logcat.txt" && fail "$PKG stopped responding at launch"
grep -q "Error opening asset path" "$OUT/logcat.txt" && fail "the asset loader could not open a packaged file"
if grep -q "IRONHOLD_LOAD_ERROR" "$OUT/logcat.txt"; then
  grep "IRONHOLD_LOAD_ERROR" "$OUT/logcat.txt"
  fail "the game's page did not load"
fi
if grep "IRONHOLD_MISSING" "$OUT/logcat.txt" | grep -v "/sw.js" | grep -q .; then
  grep "IRONHOLD_MISSING" "$OUT/logcat.txt"
  fail "the page asked for a file the APK does not carry"
fi
if grep -E "E IRONHOLDWeb|IRONHOLDWeb.*Uncaught" "$OUT/logcat.txt" | grep -v "sw.js" | grep -q .; then
  grep -E "IRONHOLDWeb" "$OUT/logcat.txt" | head -20
  fail "the game's script reported an error"
fi
READY=$(grep -o "IRONHOLD_READY elements=[0-9]*" "$OUT/logcat.txt" | tail -1)
[ -n "$READY" ] || fail "the game's page never finished loading (no IRONHOLD_READY line)"
N="${READY##*=}"
[ "${N:-0}" -ge 10 ] || fail "the page loaded nearly empty ($N elements)"
adb shell pidof "$PKG" >/dev/null || fail "$PKG is no longer running"
echo "launch-test: $PKG loaded the game ($N elements on the page) and is still running"
