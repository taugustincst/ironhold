# Ironhold on Google Play: free with one unlock

From 1.2.0, Ironhold Tower Defense is free to install. Greenfield Pass, all 40 waves, is free and complete. One in-app purchase, the product `full_unlock`, opens Frostvale Fork, Ashlands Gauntlet and Endless mode for good. There is nothing else to buy and no ads.

This replaces the 2026-10-28 plan of a $2.99 paid download, following Taylor's 2026-11-07 rule that every game is free with a paid unlock.

## How it works

- **The unlock** is `android/play/.../PlayBilling.java` (Google Play Billing 8) and `js/billing.js`, the same code Keep the Light ships. The page asks Play for the price and whether `full_unlock` is owned, opens Play's purchase sheet, and acknowledges each purchase on the phone (Play refunds a purchase that is not acknowledged within three days). Ownership is remembered on the phone so the game opens unlocked offline. There is no server.
- **No price is written in the game.** The button shows the price Play reports, in the player's own currency.
- **Players of the paid download keep everything.** A save written by 1.1.x or earlier (save format v2) marks that player as a paid-download owner, and 1.2.0 never locks them out. A paid-download player who reinstalled and lost their save would see the free map only; Play has no way for the app to ask whether someone bought the old paid app, so answer those players with a promo code for `full_unlock` (Monetize > Promo codes).
- **Outside the Play app** (a browser) there is no store, so the unlock screen says the full game is in the Google Play edition.
- Map progression is unchanged: once unlocked, wave 15 on one map still opens the next.

## Release order (do these in this order)

The switch from paid to free can't be undone, so the unlock has to be live before the app goes free.

1. **Score it.** Folder's eval must give 1.2.0 at least 8.5 (Taylor's rule) before anything below.
2. **Build and upload 1.2.0 to Internal testing** with the Release workflow (version 1.2.0, versionCode 10200). Play only lets you create an in-app product once a bundle that uses Play Billing has been uploaded.
3. **Create the in-app product**: Monetize > Products > In-app products > Create product. Product ID `full_unlock` (exactly this; the app asks for it by name and the ID can never be reused). Name "The full game". Description "Frostvale Fork, Ashlands Gauntlet and Endless mode. One purchase, nothing else to buy." Price $2.99, the old download price. Activate it.
4. **Test the purchase** on a phone with a license-tester account: buy, reinstall, Restore purchase.
5. **App content**: in-app purchases: yes; data safety: no data collected or shared by the app (the purchase is held by Google Play; answer the form's purchase questions as you go); content rating: redo the questionnaire's in-app purchase answer (yes, no random items).
6. **Store listing**: update the description from `store/listing.md` (it no longer says "no purchases").
7. **Switch the app to free**: Monetize > App pricing > Free. Play allows this once and never back. Taylor approved it on 2026-11-18, to happen only after steps 1 to 6.
8. **Promote 1.2.0 to Production** in the same session as step 7, so no one installs the free app before the build with the unlock is live.
