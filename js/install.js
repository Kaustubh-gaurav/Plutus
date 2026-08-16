/* Installing Plutus to the home screen.

   Two very different paths, because the platforms disagree:

   Chrome and Edge fire beforeinstallprompt, which must be captured and held.
   The event can only be used once, and only in response to a real tap, so it
   is stashed here and spent when the user asks for it.

   iOS Safari fires nothing at all and offers no API. The only route is Share
   then Add to Home Screen, so there the honest thing is to show the steps
   rather than a button that cannot work. */

var Install = (function () {

  var deferred = null;
  var installed = false;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
           window.navigator.standalone === true;
  }

  function isIOS() {
    var ua = navigator.userAgent || "";
    var iOSDevice = /iPad|iPhone|iPod/.test(ua);
    /* An iPad on recent iPadOS reports itself as a Mac, and the touch point
       count is the only thing that gives it away. */
    var iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return iOSDevice || iPadOS;
  }

  /* True when there is something useful to offer: either a real prompt we are
     holding, or an iOS device where the manual steps apply. */
  function available() {
    if (isStandalone() || installed) return false;
    return !!deferred || isIOS();
  }

  function listen() {
    window.addEventListener("beforeinstallprompt", function (e) {
      /* Without this the browser shows its own mini bar at its own moment.
         Holding the event means the offer appears where it makes sense. */
      e.preventDefault();
      deferred = e;
      if (typeof App !== "undefined") App.refresh();
    });

    window.addEventListener("appinstalled", function () {
      installed = true;
      deferred = null;
      if (typeof UI !== "undefined") UI.toast("Plutus is on your home screen");
      if (typeof App !== "undefined") App.refresh();
    });
  }

  /* Spends the held event. It cannot be reused, so it is dropped either way. */
  function promptNow() {
    if (!deferred) return;
    var e = deferred;
    deferred = null;
    e.prompt();
    if (e.userChoice && e.userChoice.then) {
      e.userChoice.then(function (choice) {
        if (choice && choice.outcome === "accepted") installed = true;
        if (typeof App !== "undefined") App.refresh();
      });
    }
  }

  function dismiss() {
    Store.setSettings({ installDismissed: true });
    Store.save();
    if (typeof App !== "undefined") App.refresh();
  }

  function isDismissed() {
    return Store.get().settings.installDismissed === true;
  }

  /* The sheet. On iOS it is instructions; everywhere else it is a button. */
  function open() {
    var el = UI.el;

    if (isStandalone()) {
      UI.openSheet({
        title: "Already installed",
        content: el("div.sheet-form",
          el("p.note", { text: "You are running Plutus from your home screen right now." }),
          el("button.btn", { type: "button", onclick: function () { UI.closeSheet(); } }, "Close")
        )
      });
      return;
    }

    var body = el("div.sheet-form",
      el("p.note", { text: "Plutus installs like an app: its own icon, no browser bars, and it opens with no signal. It is the same app, nothing is downloaded from a store, and your data stays exactly where it is." })
    );

    if (deferred) {
      body.appendChild(el("button.btn", {
        type: "button",
        onclick: function () { UI.closeSheet(); promptNow(); }
      }, "Add to home screen"));
    } else if (isIOS()) {
      body.appendChild(el("div.steps",
        step("1", "Tap the Share button at the bottom of Safari."),
        step("2", "Scroll down and choose Add to Home Screen."),
        step("3", "Tap Add. Plutus appears with your other apps.")
      ));
      body.appendChild(el("p.note", { text: "Safari is the only browser on iPhone that can do this, so if you are in Chrome, open plutus in Safari first." }));
    } else {
      body.appendChild(el("div.steps",
        step("1", "Open your browser menu."),
        step("2", "Choose Install app, or Add to Home screen."),
        step("3", "Confirm, and Plutus gets its own icon.")
      ));
      body.appendChild(el("p.note", { text: "Some browsers only offer this after you have visited a couple of times." }));
    }

    body.appendChild(el("button.btn.btn--soft", {
      type: "button", onclick: function () { UI.closeSheet(); }
    }, "Not now"));

    UI.openSheet({ title: "Install Plutus", content: body });

    function step(n, text) {
      var e = UI.el;
      return e("div.step",
        e("span.step-n", { text: n }),
        e("span", { text: text })
      );
    }
  }

  return {
    listen: listen,
    open: open,
    available: available,
    isStandalone: isStandalone,
    isIOS: isIOS,
    dismiss: dismiss,
    isDismissed: isDismissed,
    promptNow: promptNow
  };
})();
