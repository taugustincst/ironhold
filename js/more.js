/* More from AugustInnovations: the studio's other games, each linked to its
   Google Play listing. No prices, no ads, no tracking: the screen makes no
   network call of its own and records nothing. It lives in the main menu only,
   never inside play, which is what keeps the "Contains ads" answer at No.

   A title shows only while `live` is true. Turn it on once its listing is
   public, or the link opens Play's "not found" page. Elderon is live but
   stays off until its icon is in icons/more/. The 16+ Night Shift is left
   out on purpose, because these games are rated for younger players.
   Same file in every game. */
(function (root) {
  'use strict';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.taugustincst.';
  var CATALOG = [
    { id: 'elderon', title: 'Elderon', hook: 'Tactical RPG: tempo turns, jobs, height and facing. Offline, no ads.', tags: ['strategy', 'rpg'], live: false },
    { id: 'ironhold', title: 'Ironhold Tower Defense', hook: 'Offline tower defense: 120 waves, 3 maps, 5 towers, bosses. No ads, no IAP.', tags: ['strategy'], live: true },
    { id: 'lostproperty', title: 'Lost Property Office', hook: 'Every lost thing has a story. Check claims against the log and stamp.', tags: ['deduction', 'story', 'cozy'], live: true },
    { id: 'apothecary', title: 'The Night Apothecary', hook: 'Diagnose by description. A deduction shop game: 30 nights, 40 herbs, 3 endings.', tags: ['deduction', 'shop', 'story', 'cozy'], live: true },
    { id: 'mended', title: 'Mended: Repair Shop', hook: "Run your own repair shop. Diagnose, quote, order parts and win a street's trust.", tags: ['deduction', 'shop', 'cozy'], live: true },
    { id: 'keepthelight', title: 'Keep the Light', hook: 'An incremental that ends. One lighthouse, 1890 to 1990, a century in a logbook.', tags: ['incremental', 'story', 'cozy'], live: true },
    { id: 'openstall', title: 'Open Stall: Market Builder', hook: 'Lay out a market stall, find the combos, pay the fee, buy the shop on the square.', tags: ['shop', 'builder', 'cozy'], live: false },
    { id: 'cartographer', title: "Cartographer's Apprentice", hook: 'Not a quiz. A geography deduction game: evidence, atlas, expedition, career.', tags: ['deduction', 'educational'], live: false },
    { id: 'blackpool', title: 'The 9:15 to Blackpool', hook: 'Casebook deduction. Six closed cases, real evidence, confirmed in threes.', tags: ['deduction', 'mystery', 'story'], live: false }
  ];

  function url(t) { return PLAY + t.id; }
  function icon(t) { return 'icons/more/' + t.id + '.png'; }

  // The other live titles, nearest genre first: most shared tags, then catalog order.
  function listFor(selfId, catalog) {
    catalog = catalog || CATALOG;
    var me = catalog.filter(function (t) { return t.id === selfId; })[0];
    var mine = me ? me.tags : [];
    return catalog
      .map(function (t, i) { return { t: t, i: i, n: t.tags.filter(function (g) { return mine.indexOf(g) >= 0; }).length }; })
      .filter(function (x) { return x.t.id !== selfId && x.t.live && x.t.hook; })
      .sort(function (a, b) { return b.n - a.n || a.i - b.i; })
      .map(function (x) { return x.t; });
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Fills `el` with one row per title and returns how many there are.
  function render(el, selfId) {
    var list = listFor(selfId);
    el.innerHTML = list.map(function (t) {
      return '<li><a class="more-row" href="' + esc(url(t)) + '" target="_blank" rel="noopener" data-app="' + esc(t.id) + '">' +
        '<img class="more-icon" src="' + esc(icon(t)) + '" alt="" width="48" height="48">' +
        '<span class="more-text"><b class="more-title">' + esc(t.title) + '</b><span class="more-hook">' + esc(t.hook) + '</span>' +
        '<span class="more-store">Google Play</span></span></a></li>';
    }).join('');
    return list.length;
  }

  var api = { CATALOG: CATALOG, listFor: listFor, url: url, icon: icon, render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MoreGames = api;
})(this);
