/* Plutus boot and router. Loaded last, so everything it touches exists.

   One page, every screen a hidden section, hash routing. Hash rather than a
   path because GitHub Pages serves static files and an Android WebView has no
   server either, so there is nowhere to put a rewrite rule. */

var App = (function () {

  var current = null;

  /* ── router ─────────────────────────────────────────────── */

  function routeFor(hash) {
    var clean = (hash || "").split("?")[0];
    for (var i = 0; i < CONFIG.ROUTES.length; i++) {
      if (CONFIG.ROUTES[i].hash === clean) return CONFIG.ROUTES[i];
    }
    return CONFIG.ROUTES[0];
  }

  function go(hash) {
    if (location.hash === hash) { render(); return; }
    location.hash = hash;
  }

  function onHashChange() {
    /* A hash change while a sheet is open means the back gesture was meant
       for the sheet. Close it and stay put. */
    if (UI.sheetIsOpen()) UI.closeSheet(true);
    render();
  }

  /* ── the onboarding gate ────────────────────────────────────
     Until the profile says otherwise, the whole app is one screen. The nav is
     hidden rather than disabled, because a tab bar you cannot use is worse
     than no tab bar at all. */

  function needsOnboarding() {
    return !Store.get().profile.onboarded;
  }

  function showOnboarding() {
    UI.qsa(".screen").forEach(function (n) { n.hidden = n.id !== "screen-onboarding"; });
    document.body.setAttribute("data-onboarding", "true");
    Onboarding.start();
  }

  function leaveOnboarding() {
    document.body.removeAttribute("data-onboarding");
    go("#/");
    render();
  }

  function render() {
    if (needsOnboarding()) { showOnboarding(); return; }

    var route = routeFor(location.hash);
    current = route;

    UI.qsa(".screen").forEach(function (node) {
      node.hidden = node.id !== route.id;
    });

    UI.qsa(".nav-tab").forEach(function (tab) {
      var on = tab.getAttribute("data-tab") === route.tab;
      if (on) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });

    document.title = route.title === "Home"
      ? CONFIG.APP_NAME
      : route.title + " · " + CONFIG.APP_NAME;

    if (route.id !== "screen-expenses" && typeof ScreenExpenses !== "undefined") ScreenExpenses.reset();
    if (route.id !== "screen-insights" && typeof ScreenInsights !== "undefined") ScreenInsights.reset();

    window.scrollTo(0, 0);
    refresh();
  }

  /* ── refresh ────────────────────────────────────────────────
     Called after every mutation. From Phase 4 this rebuilds the visible
     screen from a freshly built view model, which is what guarantees no
     screen can ever show a stale figure. Right now the screens are static
     placeholders, so it only keeps the chrome honest. */

  function refresh() {
    if (needsOnboarding()) return;
    /* Each screen rebuilds itself from a fresh read of the store. That is what
       guarantees no screen can show a stale figure: there is nothing cached to
       go stale. Screens arrive phase by phase; until one exists, its static
       empty state stands. */
    /* Alerts are evaluated after every change, and the engine is idempotent,
       so this can run on every refresh without ever producing a duplicate. */
    if (typeof Notifications !== "undefined") Notifications.evaluate();

    var SCREENS = {
      "screen-home": typeof ScreenHome !== "undefined" ? ScreenHome : null,
      "screen-expenses": typeof ScreenExpenses !== "undefined" ? ScreenExpenses : null,
      "screen-people": typeof ScreenPeople !== "undefined" ? ScreenPeople : null,
      "screen-insights": typeof ScreenInsights !== "undefined" ? ScreenInsights : null,
      "screen-goals": typeof ScreenGoals !== "undefined" ? ScreenGoals : null,
      "screen-settings": typeof ScreenSettings !== "undefined" ? ScreenSettings : null
    };
    var screen = current ? SCREENS[current.id] : null;
    if (screen) { screen.render(); return; }

    setBandColour();
  }

  /* The status bar should match the band it sits under, otherwise the top of
     an installed app looks detached. The band colour is the budget state from
     Phase 4 onward; until then it is the resting teal. */
  function setBandColour(state) {
    var band = current ? document.querySelector("#" + current.id + " .band") : null;
    var cls = state ? "band--" + state : "band--ok";
    if (band) {
      band.classList.remove("band--ok", "band--warn", "band--danger");
      band.classList.add(cls);
    }
    /* Only the over budget band is filled, so only it changes the status bar. */
    var colour = getComputedStyle(document.documentElement)
      .getPropertyValue(state === "danger" ? "--s-danger" : "--canvas")
      .trim();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && colour) meta.setAttribute("content", colour);
  }

  /* ── back button ────────────────────────────────────────────
     Android hardware back must move through the app before it leaves it.
     Sheets push their own history entry, so a back press with a sheet open
     lands here first and closes the sheet instead of changing route. */

  function onPopState(e) {
    if (UI.sheetIsOpen()) {
      var fromSheet = !e.state || !e.state.plutusSheet;
      if (fromSheet) { UI.closeSheet(true); return; }
    }
    render();
  }

  /* ── boot ───────────────────────────────────────────────── */

  function boot() {
    Store.load();
    reportStorageState();

    /* Anything that fell due while the app was closed is created now. The
       generator is idempotent, so a second boot creates nothing. */
    if (typeof Actions !== "undefined" && typeof Recurring !== "undefined") Actions.runRecurring();

    if (!location.hash) location.replace("#/");

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);

    UI.qsa(".nav-tab").forEach(function (tab) {
      tab.addEventListener("click", function () { go(tab.getAttribute("data-route")); });
    });

    var add = document.getElementById("add-expense");
    if (add) {
      add.addEventListener("click", function () { SheetExpense.open(); });
    }

    if (typeof Install !== "undefined") Install.listen();

    registerServiceWorker();
    render();
    document.body.removeAttribute("data-booting");
  }

  /* Storage failures are never swallowed. A corrupt value is said once, and a
     device that will not accept writes gets a banner that stays up, because
     silently failing to save someone's financial records is the worst thing
     this app could do. */
  function reportStorageState() {
    var err = Store.loadError();
    if (err === "corrupt") {
      UI.banner("Your saved data could not be read, so Plutus has started empty. The old data has not been deleted.");
    } else if (err === "storage-unavailable") {
      UI.banner("This browser is not allowing storage, so nothing you enter will be kept. Private browsing usually causes this.");
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    /* Relative path on purpose. An absolute path breaks at a GitHub Pages
       subpath and breaks again inside a native WebView. */
    navigator.serviceWorker.register("./sw.js").catch(function (err) {
      console.warn("Service worker did not register:", err);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);

  return {
    go: go, refresh: refresh, setBandColour: setBandColour,
    leaveOnboarding: leaveOnboarding,
    route: function () { return current; }
  };
})();
