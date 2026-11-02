#!/usr/bin/env bash
# Installs an APK on a running emulator, opens it the way a player does, and
# fails if the app crashes. Play rejected Ironhold on 1 Nov 2026 because the
# app "opens, but keeps crashing"; this is that test, run before Play runs it.
#   tools/launch-test.sh <apk> [package]
set -euo pipefail
APK="$1"
PKG="${2:-com.taugustincst.ironhold}"
OUT="${LAUNCH_TEST_OUT:-launch-test}"
mkdir -p "$OUT"

adb wait-for-device
adb install -r "$APK"
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1
# Long enough for the splash, the hand-off to the browser or the WebView
# fallback, and the game's first load from the network.
sleep 30
adb exec-out screencap -p > "$OUT/after-launch.png" || true
adb logcat -d > "$OUT/logcat.txt"
adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity" | tee "$OUT/resumed.txt" || true

# A crash in the app's process is logged by AndroidRuntime with the process
# name on the line after "FATAL EXCEPTION".
if grep -A2 "FATAL EXCEPTION" "$OUT/logcat.txt" | grep -q "Process: $PKG"; then
  echo "launch-test: $PKG crashed at launch:"
  grep -A30 "FATAL EXCEPTION" "$OUT/logcat.txt" | head -60
  exit 1
fi
if grep -q "ANR in $PKG" "$OUT/logcat.txt"; then
  echo "launch-test: $PKG stopped responding at launch"
  exit 1
fi
echo "launch-test: $PKG opened and did not crash in 30 seconds"
