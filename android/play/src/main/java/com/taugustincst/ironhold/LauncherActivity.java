package com.taugustincst.ironhold;

/**
 * Opens Ironhold's site as a Trusted Web Activity.
 *
 * <p>Everything is in the library's activity and the manifest's metadata:
 * the URL, the colours, the splash screen, the fallback. This subclass exists
 * so the app has a class of its own to name, the way Bubblewrap's projects
 * do, and as the place for any launch-time hook later.
 */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
}
