/* The one-time unlock, bought through Google Play.
   In the Play edition the app gives the page window.AndroidBilling (android/play/.../PlayBilling.java):
   start(id) connects and reports price and ownership, buy(id) opens Play's purchase sheet, restore(id)
   asks Play again. Play answers through window.__billingEvent(json). Outside the Play app there is no
   store, so the unlock shows as unavailable. Ownership is cached on the phone so the game opens unlocked
   offline; Play's own answer always wins when it gives one. */
(function (root) {
'use strict';
function createBilling(opts) {
  const key = opts.storageKey, product = opts.productId, bridge = root.AndroidBilling || null;
  const st = { product, available: !!bridge, ready: false, owned: false, pending: false, busy: false, price: null, error: null };
  try { st.owned = root.localStorage.getItem(key) === '1'; } catch (e) { /* storage off: not owned until Play says so */ }
  const listeners = [];
  const emit = () => { for (const f of listeners) { try { f(st); } catch (e) { /* a listener's problem, not the store's */ } } };
  const setOwned = v => { st.owned = !!v; try { root.localStorage.setItem(key, st.owned ? '1' : '0'); } catch (e) { } };
  function handle(m) {
    if (!m || typeof m !== 'object' || (m.product && m.product !== product)) return;
    switch (m.type) {
      case 'ready': st.ready = true; st.error = null; break;
      case 'unavailable': st.ready = false; st.busy = false; st.error = String(m.message || 'Google Play is not available right now.'); break;
      case 'price': st.price = typeof m.price === 'string' ? m.price.slice(0, 24) : null; break;
      case 'owned': setOwned(m.owned === true); st.pending = m.pending === true; st.busy = false; break;
      case 'purchased': setOwned(true); st.pending = false; st.busy = false; st.error = null; break;
      case 'pending': st.pending = true; st.busy = false; break;
      case 'cancelled': st.busy = false; break;
      case 'error': st.busy = false; st.error = String(m.message || 'Something went wrong with Google Play.').slice(0, 200); break;
      default: return;
    }
    emit();
  }
  root.__billingEvent = function (json) { let m = json; if (typeof json === 'string') { try { m = JSON.parse(json); } catch (e) { return; } } handle(m); };
  const api = {
    state: st,
    onChange(f) { listeners.push(f); },
    start() { if (bridge) { try { bridge.start(product); } catch (e) { handle({ type: 'unavailable' }); } } },
    buy() { if (!bridge || st.owned) return false; st.busy = true; st.error = null; emit(); try { bridge.buy(product); } catch (e) { handle({ type: 'error', message: 'The purchase could not be started.' }); } return true; },
    restore() { if (!bridge) return false; st.busy = true; st.error = null; emit(); try { bridge.restore(product); } catch (e) { handle({ type: 'error', message: 'Google Play could not be asked just now.' }); } setTimeout(() => { if (st.busy) { st.busy = false; emit(); } }, 8000); return true; }
  };
  return api;
}
root.createBilling = createBilling;
})(typeof window !== 'undefined' ? window : globalThis);
