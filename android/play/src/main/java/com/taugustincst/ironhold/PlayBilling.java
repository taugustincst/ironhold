package com.taugustincst.ironhold;

import android.app.Activity;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * The one-time full-game unlock (Frostvale Fork, Ashlands Gauntlet and Endless mode), sold through Google Play Billing.
 *
 * <p>The page talks to this class as {@code window.AndroidBilling} (see
 * js/billing.js) and hears back through {@code window.__billingEvent(json)}.
 * Play does the selling, the payment and the receipt; the app only asks
 * whether the product is owned. Nothing about the purchase leaves the phone
 * except Play's own traffic, and there is no server of ours.
 *
 * <p>Every completed purchase is acknowledged here, on the device: Play
 * refunds a purchase that is not acknowledged within three days.
 */
final class PlayBilling implements PurchasesUpdatedListener {

    private static final String TAG = "IRONHOLDBilling";

    private final Activity activity;
    private final WebView webView;
    private final BillingClient client;
    private String productId;
    private ProductDetails details;
    private boolean connecting;
    private final List<Runnable> waiting = new ArrayList<>();

    PlayBilling(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.client = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
    }

    // ------------------------------------------------------------ from the page

    /** Connects to Play, then reports the product's price and whether it is owned. */
    @JavascriptInterface
    public void start(String product) {
        productId = product;
        activity.runOnUiThread(this::connectThenRefresh);
    }

    /** Opens Play's purchase sheet for the product. */
    @JavascriptInterface
    public void buy(String product) {
        productId = product;
        activity.runOnUiThread(() -> {
            if (details == null) {
                // Not loaded yet (or Play was unreachable): try again, then buy.
                whenReady(() -> queryDetails(() -> {
                    if (details == null) {
                        event("error", "message", "The purchase could not be started. Check that Google Play is signed in, then try again.");
                    } else {
                        launch();
                    }
                }));
            } else {
                launch();
            }
        });
    }

    /** Asks Play again which products are owned (restore after a reinstall). */
    @JavascriptInterface
    public void restore(String product) {
        productId = product;
        activity.runOnUiThread(() -> whenReady(this::queryOwned));
    }

    // --------------------------------------------------------------- internals

    private void connectThenRefresh() {
        whenReady(() -> {
            queryDetails(null);
            queryOwned();
        });
    }

    private void whenReady(Runnable then) {
        if (client.isReady()) {
            then.run();
            return;
        }
        // A tap that arrives while the first connection is still being made
        // waits for it rather than being dropped (which left the page busy).
        waiting.add(then);
        if (connecting) {
            return;
        }
        connecting = true;
        client.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                activity.runOnUiThread(() -> {
                    connecting = false;
                    List<Runnable> run = new ArrayList<>(waiting);
                    waiting.clear();
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        event("ready");
                        for (Runnable r : run) {
                            r.run();
                        }
                    } else {
                        Log.w(TAG, "setup failed: " + result.getResponseCode() + " " + result.getDebugMessage());
                        event("unavailable", "message", "Google Play is not available on this device right now.");
                    }
                });
            }

            @Override
            public void onBillingServiceDisconnected() {
                // The next start, buy or restore connects again.
                activity.runOnUiThread(() -> {
                    connecting = false;
                    if (!waiting.isEmpty()) {
                        waiting.clear();
                        event("unavailable", "message", "Google Play is not available on this device right now.");
                    }
                });
            }
        });
    }

    private void queryDetails(Runnable then) {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(productId)
                                .setProductType(BillingClient.ProductType.INAPP)
                                .build()))
                .build();
        client.queryProductDetailsAsync(params, (result, detailsResult) -> {
            List<ProductDetails> list = detailsResult.getProductDetailsList();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null && !list.isEmpty()) {
                details = list.get(0);
                ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
                if (offer != null) {
                    event("price", "price", offer.getFormattedPrice());
                }
            } else {
                Log.w(TAG, "no product details for " + productId + ": " + result.getResponseCode() + " " + result.getDebugMessage());
            }
            if (then != null) {
                activity.runOnUiThread(then);
            }
        });
    }

    private void queryOwned() {
        client.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (result, purchases) -> {
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        // Unknown, not "not owned": the page keeps what it last knew.
                        Log.w(TAG, "purchase query failed: " + result.getResponseCode());
                        return;
                    }
                    boolean owned = false;
                    boolean pending = false;
                    for (Purchase p : purchases) {
                        if (!p.getProducts().contains(productId)) {
                            continue;
                        }
                        if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            owned = true;
                            acknowledge(p);
                        } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                            pending = true;
                        }
                    }
                    event("owned", "owned", owned, "pending", pending);
                });
    }

    private void launch() {
        BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(details)
                                .build()))
                .build();
        BillingResult result = client.launchBillingFlow(activity, params);
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            queryOwned();
        } else if (code != BillingClient.BillingResponseCode.OK) {
            event("error", "message", "The purchase could not be started (" + code + ").");
        }
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase p : purchases) {
                if (!p.getProducts().contains(productId)) {
                    continue;
                }
                if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    acknowledge(p);
                    event("purchased");
                } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    event("pending");
                }
            }
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            event("cancelled");
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            queryOwned();
        } else {
            event("error", "message", "The purchase did not go through (" + code + "). Nothing was charged.");
        }
    }

    private void acknowledge(Purchase p) {
        if (p.isAcknowledged()) {
            return;
        }
        client.acknowledgePurchase(
                AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                r -> Log.i(TAG, "acknowledged: " + r.getResponseCode()));
    }

    /** Sends {type, product, key1, value1, ...} to the page. */
    private void event(String type, Object... kv) {
        JSONObject o = new JSONObject();
        try {
            o.put("type", type);
            o.put("product", productId);
            for (int i = 0; i + 1 < kv.length; i += 2) {
                o.put(String.valueOf(kv[i]), kv[i + 1]);
            }
        } catch (JSONException e) {
            return;
        }
        final String js = "window.__billingEvent&&window.__billingEvent(" + JSONObject.quote(o.toString()) + ")";
        activity.runOnUiThread(() -> {
            if (!activity.isDestroyed()) {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    void destroy() {
        client.endConnection();
    }
}
