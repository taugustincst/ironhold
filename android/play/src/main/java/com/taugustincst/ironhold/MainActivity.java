package com.taugustincst.ironhold;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;

/**
 * Ironhold: one full-screen WebView playing the game from the app's assets.
 *
 * <p>WebViewAssetLoader serves assets/www over a synthetic https origin, so
 * the page behaves as it would on a secure site (localStorage keeps the
 * player's progress between launches) without any network access.
 *
 * <p>The page's console goes to logcat under the tag "IRONHOLDWeb", and once
 * the page has loaded the activity logs "IRONHOLD_READY" with the number of
 * elements on it: the emulator launch test fails without that line, so a
 * build whose game does not load can never be uploaded.
 */
public class MainActivity extends Activity {

    private static final String TAG = "IRONHOLD";
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/www/index.html";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // The handler sits at "/" so that /www/index.html opens the asset
        // www/index.html. Registered at "/www/" it would open "index.html",
        // which does not exist, and the WebView would show an error page:
        // that is what got Bubble Pop's first upload rejected.
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        // Debug builds only: lets tests read the page over DevTools.
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView = new WebView(this);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                String line = msg.message() + " (" + msg.sourceId() + ":" + msg.lineNumber() + ")";
                if (msg.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    Log.e(TAG + "Web", line);
                } else {
                    Log.i(TAG + "Web", line);
                }
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                // A link to a folder ("./", as privacy.html's link back to
                // the game) means its index.html, as on any web server.
                String path = url.getPath();
                if (HOST.equals(url.getHost()) && path != null && path.endsWith("/")) {
                    url = url.buildUpon().path(path + "index.html").build();
                }
                return assetLoader.shouldInterceptRequest(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (HOST.equals(url.getHost())) {
                    return false;   // the game's own pages, privacy.html included
                }
                // Anything else (a mail link, an outside page) goes to the
                // phone's own apps; the game itself never leaves its assets.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (RuntimeException e) {
                    Log.w(TAG, "no app opens " + url);
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    Log.e(TAG, TAG + "_LOAD_ERROR " + error.getErrorCode() + " " + error.getDescription() + " " + request.getUrl());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame()) {
                    Log.e(TAG, TAG + "_LOAD_ERROR http " + response.getStatusCode() + " " + request.getUrl());
                } else {
                    Log.w(TAG, TAG + "_MISSING http " + response.getStatusCode() + " " + request.getUrl());
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript("document.querySelectorAll('body *').length", count ->
                        Log.i(TAG, TAG + "_READY elements=" + count + " " + url));
            }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        setContentView(webView);
        enterFullScreen();
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private void enterFullScreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterFullScreen();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    /** Back goes back a page (privacy policy to game); on the game itself it leaves the app. */
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
