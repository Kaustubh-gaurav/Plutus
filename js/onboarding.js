/* Onboarding. The first screen made of real data.

   Five questions, one per step, each one thing on the screen. Only the
   currency is compulsory, because someone who has not decided on a budget yet
   should still be able to start recording expenses. Everything asked here can
   be changed later in Settings, and the copy says so.

   design.md: no nav, a band that fills the screen, one field, an ink button. */

var Onboarding = (function () {

  var el = UI.el;

  /* What the user has answered so far. Nothing is written to the store until
     the last step, so backing out halfway leaves no half configured profile. */
  var draft = null;
  var stepIndex = 0;

  function reset() {
    var p = Store.get().profile;
    draft = {
      name: p.name || "",
      currencyCode: p.currencyCode || "INR",
      monthly: null,
      weekly: null,
      weekStartsOn: typeof p.weekStartsOn === "number" ? p.weekStartsOn : CONFIG.DEFAULT_WEEK_START
    };
    stepIndex = 0;
  }

  function currency() {
    for (var i = 0; i < CONFIG.CURRENCIES.length; i++) {
      if (CONFIG.CURRENCIES[i].code === draft.currencyCode) return CONFIG.CURRENCIES[i];
    }
    return CONFIG.CURRENCIES[0];
  }

  function money(paise) {
    var c = currency();
    return Money.format(paise, c.symbol, c.grouping);
  }

  /* ── the steps ──────────────────────────────────────────── */

  var STEPS = [

    { id: "welcome", skippable: false, render: function () {
        return [
          el("h1.ob-question", { text: "Plutus" }),
          el("p.ob-help", { text: "Know what you spent, what is left, and who owes you. Everything stays on this device and nothing is sent anywhere." }),
          el("div.ob-marks",
            mark("ic-wallet", "Track what you spend"),
            mark("ic-chart", "See where it goes"),
            mark("ic-people", "Settle up with people")
          )
        ];
      }, next: "Get started" },

    { id: "name", skippable: true, render: function () {
        return [
          el("h1.ob-question", { text: "What should I call you?" }),
          el("p.ob-help", { text: "Only used to say hello. It never leaves the device." }),
          textField("Your name", draft.name, function (v) { draft.name = v; }, "given-name")
        ];
      } },

    { id: "currency", skippable: false, render: function () {
        var wrap = el("div.ob-choices");
        CONFIG.CURRENCIES.forEach(function (c) {
          var on = c.code === draft.currencyCode;
          wrap.appendChild(el("button.ob-choice" + (on ? ".is-on" : ""), {
            type: "button",
            "aria-pressed": on ? "true" : "false",
            onclick: function () { draft.currencyCode = c.code; render(); }
          },
            el("b.ob-choice-sym", { text: c.symbol }),
            el("span.ob-choice-name", { text: c.name })
          ));
        });
        return [
          el("h1.ob-question", { text: "Which currency?" }),
          el("p.ob-help", { text: "Every amount in the app is shown in this." }),
          wrap
        ];
      } },

    { id: "monthly", skippable: true, render: function () {
        return [
          el("h1.ob-question", { text: "What is your monthly budget?" }),
          el("p.ob-help", { text: "The figure you would rather not go past in a month. You can skip this and set it later." }),
          amountField(draft.monthly, function (v) { draft.monthly = v; }),
          hint()
        ];
      } },

    { id: "weekly", skippable: true, render: function () {
        var suggested = draft.monthly ? Math.round(draft.monthly / 4.345) : null;
        var nodes = [
          el("h1.ob-question", { text: "And for a week?" }),
          el("p.ob-help", { text: "A weekly figure catches an overspend long before the month does." }),
          amountField(draft.weekly, function (v) { draft.weekly = v; })
        ];
        if (suggested && draft.weekly === null) {
          nodes.push(el("button.ob-suggest", {
            type: "button",
            onclick: function () { draft.weekly = suggested; render(); }
          }, "Use " + money(suggested) + ", which is your monthly budget spread evenly"));
        }
        nodes.push(hint());
        return nodes;
      } },

    { id: "week", skippable: false, render: function () {
        var options = [[1, "Monday"], [0, "Sunday"]];
        var wrap = el("div.ob-choices.ob-choices--wide");
        options.forEach(function (o) {
          var on = draft.weekStartsOn === o[0];
          wrap.appendChild(el("button.ob-choice" + (on ? ".is-on" : ""), {
            type: "button",
            "aria-pressed": on ? "true" : "false",
            onclick: function () { draft.weekStartsOn = o[0]; render(); }
          }, el("span.ob-choice-name", { text: o[1] })));
        });
        return [
          el("h1.ob-question", { text: "When does your week start?" }),
          el("p.ob-help", { text: "Your weekly budget resets on this day." }),
          wrap
        ];
      }, next: "Finish" }
  ];

  /* ── small pieces ───────────────────────────────────────── */

  function mark(icon, text) {
    return el("div.ob-mark", el("span.ob-mark-badge", UI.icon(icon, 18)), el("span", { text: text }));
  }

  function textField(label, value, onInput, autocomplete) {
    var input = el("input.ob-input", {
      type: "text", value: value || "", placeholder: label,
      "aria-label": label, maxlength: 40, autocomplete: autocomplete || "off"
    });
    input.addEventListener("input", function () { onInput(input.value.trim()); });
    return el("div.ob-field", input);
  }

  /* The amount input is the one place a user types money, so it is the hero
     of the step: big, prefixed with the symbol, numeric keypad on a phone. */
  function amountField(paise, onChange) {
    var c = currency();
    var input = el("input.ob-amount", {
      type: "text", inputmode: "decimal", autocomplete: "off",
      "aria-label": "Amount",
      placeholder: "0",
      value: paise === null || paise === undefined ? "" : String(Money.toRupees(paise))
    });
    var error = el("p.ob-error", { hidden: true });

    input.addEventListener("input", function () {
      var raw = input.value.trim();
      if (raw === "") { onChange(null); error.hidden = true; return; }
      var parsed = Money.parseInput(raw);
      if (parsed === null || parsed <= 0) {
        onChange(null);
        error.textContent = "Enter an amount, or skip this for now.";
        error.hidden = false;
      } else {
        onChange(parsed);
        error.hidden = true;
      }
    });

    return el("div.ob-field.ob-field--amount",
      el("div.ob-amount-row", el("span.ob-amount-sym", { text: c.symbol }), input),
      error
    );
  }

  function hint() {
    return el("p.ob-hint", { text: "You can change this at any time in Settings." });
  }

  /* ── render ─────────────────────────────────────────────── */

  function render() {
    var host = document.getElementById("screen-onboarding");
    if (!host) return;
    UI.clear(host);

    var step = STEPS[stepIndex];
    var body = el("div.ob-body");
    step.render().forEach(function (n) { body.appendChild(n); });

    var dots = el("div.ob-dots");
    STEPS.forEach(function (s, i) {
      dots.appendChild(el("span.ob-dot" + (i === stepIndex ? ".is-on" : "") + (i < stepIndex ? ".is-done" : "")));
    });

    var actions = el("div.ob-actions",
      el("button.btn.ob-next", { type: "button", onclick: advance }, step.next || "Continue"),
      step.skippable ? el("button.ob-skip", { type: "button", onclick: skip }, "Skip for now") : null
    );

    var top = el("div.ob-top",
      stepIndex > 0
        ? el("button.circle-btn", { type: "button", "aria-label": "Back", onclick: back }, UI.icon("ic-back", 17))
        : el("span.ob-spacer"),
      dots
    );

    host.appendChild(el("div.ob-inner", top, body, actions));

    var first = host.querySelector("input");
    if (first) first.focus();
  }

  function back() { if (stepIndex > 0) { stepIndex--; render(); } }
  function skip() {
    var step = STEPS[stepIndex];
    if (step.id === "monthly") draft.monthly = null;
    if (step.id === "weekly") draft.weekly = null;
    if (step.id === "name") draft.name = "";
    advance(true);
  }

  function advance(skipping) {
    if (stepIndex < STEPS.length - 1) { stepIndex++; render(); return; }
    finish();
  }

  /* ── finish ─────────────────────────────────────────────────
     Everything is written in one go, then the store is saved once. If the
     write is refused, the user is told and stays put rather than being sent
     to a dashboard that will forget them. */

  function finish() {
    var c = currency();
    var today = Dates.today();

    var check = Validate.profile({
      name: draft.name, currencyCode: draft.currencyCode, weekStartsOn: draft.weekStartsOn
    });
    if (!check.ok) { UI.toast("Something in that is not right. Check the details."); return; }

    Store.setProfile({
      name: draft.name,
      currencyCode: c.code,
      currencySymbol: c.symbol,
      grouping: c.grouping,
      weekStartsOn: draft.weekStartsOn,
      onboarded: true
    });

    if (draft.monthly) {
      Store.insert("budgets", {
        period: "monthly", amount: draft.monthly,
        effectiveFrom: Dates.monthPeriod(today).start
      }, "bud");
    }
    if (draft.weekly) {
      Store.insert("budgets", {
        period: "weekly", amount: draft.weekly,
        effectiveFrom: Dates.weekPeriod(today, draft.weekStartsOn).start
      }, "bud");
    }

    var saved = Store.save();
    if (!saved) {
      UI.banner("This device would not let Plutus save. Nothing you enter will be kept.");
    }

    App.leaveOnboarding();
    UI.toast(draft.name ? "Welcome, " + draft.name : "You are set up");
  }

  function start() { reset(); render(); }

  return { start: start, render: render };
})();
