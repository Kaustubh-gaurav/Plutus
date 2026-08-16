/* Home, version 5: a bento grid.

   The reference's idea is that a tile's size is how important the thing
   inside it is, and that the data itself is the decoration. So:

     the big tall tile   what you have left, with the month drawn under it
     the small tile      what you have spent
     the ring tile       how much of the budget is gone
     the day strip       this week, tap a day to read it
     the list            what you spent that day

   Nothing here computes money. Every figure comes from the logic layer. */

var ScreenHome = (function () {

  var el = UI.el;
  var picked = null;   /* the day being read. null means today */

  function profile() { return Store.get().profile; }
  function money(paise) {
    var p = profile();
    return Money.format(paise, p.currencySymbol, p.grouping);
  }
  function compact(paise) {
    var p = profile();
    return Money.formatCompact(paise, p.currencySymbol, p.grouping);
  }

  function greeting(name) {
    var hour = new Date().getHours();
    var part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return name ? part + ", " + name : part;
  }

  /* ── header ── */

  function header(p, today, unread) {
    return el("header.band",
      el("div.band-top",
        el("button.avatar", {
          type: "button", "aria-label": "Settings", onclick: function () { App.go("#/settings"); }
        }, (p.name || "P").trim().charAt(0).toUpperCase()),
        el("span.band-who",
          el("b", { text: greeting(p.name) }),
          el("span", { text: Dates.formatRelativeDay(today, today) + ", " + Dates.formatDisplay(today, today) })
        ),
        el("button.circle-btn" + (unread ? ".has-dot" : ""), {
          type: "button", "aria-label": unread ? unread + " unread notifications" : "Notifications",
          onclick: function () { Notifications.open(); }
        }, UI.icon("ic-bell", 17))
      ),
      el("h1.band-title", { text: Dates.monthName(Dates.monthPeriod(today).key) })
    );
  }

  /* ── the bento ──────────────────────────────────────────────
     Three tiles: what is left, what is spent, and how far through the
     budget you are. The left tile is tall because "what can I still
     spend" is the question the product exists to answer. */

  function bento(monthly, dailyTotals) {
    if (!monthly.hasBudget) {
      return el("div.bento",
        el("div.bento-tile.bento-tile--wide",
          el("span.tile-label", { text: "Monthly budget" }),
          el("span.tile-figure", { text: "Not set" }),
          el("p.note", { style: { "margin-top": "6px" } },
            "Set a budget and every figure in the app starts working."),
          el("button.btn-pill", {
            type: "button", style: { "margin-top": "12px", "align-self": "flex-start" },
            onclick: function () { App.go("#/settings"); }
          }, UI.icon("ic-plus", 15), el("span", { text: "Set a budget" }))
        )
      );
    }

    var over = monthly.overspend > 0;

    var leftTile = el("div.bento-tile.bento-tile--tall" + (over ? ".surf--danger" : ""),
      el("span.tile-mark", { style: over ? { color: "var(--s-danger)" } : null },
         UI.icon(over ? "ic-alert" : "ic-wallet", 18)),
      el("span.tile-label", { text: over ? "Over budget" : "Left to spend" }),
      el("span.tile-figure", {
        text: over ? money(monthly.overspend) : money(monthly.remaining),
        style: over ? { color: "var(--s-danger)" } : null
      }),
      el("span.tile-label", {
        text: over
          ? monthly.period.daysLeft + " day" + (monthly.period.daysLeft === 1 ? "" : "s") + " still to go"
          : money(monthly.safeDailyRemaining) + " a day for " + monthly.period.daysLeft +
            " day" + (monthly.period.daysLeft === 1 ? "" : "s")
      }),
      el("div.tile-foot.tile-bleed", Viz.spark(dailyTotals.map(function (d) { return d.total; })))
    );

    var spentTile = el("div.bento-tile",
      el("span.tile-mark", UI.icon("ic-chart", 17)),
      el("span.tile-label", { text: "Spent" }),
      el("span.tile-figure", { text: compact(monthly.spent) }),
      el("span.tile-label", {
        text: monthly.transactionCount + (monthly.transactionCount === 1 ? " entry" : " entries")
      })
    );

    var ringColour = monthly.status === "exceeded" || monthly.status === "at_limit" ? "var(--s-danger)"
                   : monthly.status === "near_limit" ? "var(--s-warn)" : "var(--s-ok)";
    var ringTile = el("div.bento-tile",
      el("div.ring-wrap", { style: { margin: "2px 0" } },
        Viz.ring(Math.min(monthly.percentUsed, 100), { colour: ringColour, width: 13 }),
        el("div.ring-mid",
          el("b", { text: Math.round(monthly.percentUsed) + "%" }),
          el("span", { text: "used" })
        )
      )
    );

    return el("div.bento", leftTile, spentTile, ringTile);
  }

  /* ── the week, and the day you tapped ── */

  function weekSection(s, weekPeriod, today, cats) {
    var totals = Expenses.dailyTotals(s.expenses, weekPeriod);
    var names = ["S", "M", "T", "W", "T", "F", "S"];
    var days = totals.map(function (d) {
      var parts = d.date.split("-");
      var dow = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay();
      return { date: d.date, total: d.total, short: names[dow], label: Dates.formatDisplay(d.date, today) };
    });

    var selected = picked || today;
    var strip = Viz.dayStrip(days, selected, function (date) {
      picked = date;
      render();
    });

    var dayExpenses = Expenses.query(
      s.expenses.filter(function (e) { return e.date === selected; }),
      { sortBy: "date", sortDir: "desc" }, cats
    );
    var dayTotal = Money.sum(dayExpenses, function (e) { return e.amount; });

    var card = el("div.card.surf--card",
      el("div.card-head",
        el("b", { text: Dates.formatRelativeDay(selected, today) }),
        el("span.pill.pill--sunken", { text: money(dayTotal) })
      )
    );

    if (!dayExpenses.length) {
      card.appendChild(el("p.note", { text: "Nothing recorded on this day." }));
    } else {
      dayExpenses.slice(0, 5).forEach(function (e) {
        var cat = cats[e.categoryId];
        card.appendChild(el("button.row.row--tap", {
          type: "button",
          "aria-label": "Edit " + money(e.amount) + (cat ? ", " + cat.name : ""),
          onclick: function () { SheetExpense.open(e.id); }
        },
          el("span.badge.badge--lg", { style: { color: "var(--cat-" + (cat ? cat.tint : "stone") + ")" } },
            UI.icon(cat ? cat.icon : "ic-dots", 18)),
          el("span.row-tx",
            el("b", { text: e.note || (cat ? cat.name : "Expense") }),
            el("span", { text: cat ? cat.name : "" })
          ),
          el("span.row-amt", { text: money(e.amount) })
        ));
      });
      if (dayExpenses.length > 5) {
        card.appendChild(el("button.btn-pill", {
          type: "button", style: { "align-self": "flex-start" },
          onclick: function () { App.go("#/expenses"); }
        }, el("span", { text: "See all " + dayExpenses.length })));
      }
    }

    return [strip, card];
  }

  /* ── people, only once there is someone ── */

  function directionTiles(summary) {
    if (summary.totalOwedToMe === 0 && summary.totalIOwe === 0) return null;
    return el("div.tiles",
      el("button.tile.surf--ok.tile--tap", {
        type: "button", onclick: function () { App.go("#/people"); }
      },
        el("span.tile-v", { text: money(summary.totalOwedToMe) }),
        el("span.tile-l", { text: "Owed to you" })
      ),
      el("button.tile.surf--owe.tile--tap", {
        type: "button", onclick: function () { App.go("#/people"); }
      },
        el("span.tile-v", { text: money(summary.totalIOwe) }),
        el("span.tile-l", { text: "You owe" })
      )
    );
  }

  /* ── where it went ── */

  function categoryCard(analysis, cats) {
    if (!analysis.byCategory.length) return null;
    var byId = {};
    cats.forEach(function (c) { byId[c.id] = c; });

    var card = el("div.card.surf--card",
      el("div.card-head",
        el("b", { text: "Where it went" }),
        el("button.circle-btn.circle-btn--sunken", {
          type: "button", "aria-label": "See all insights",
          onclick: function () { App.go("#/insights"); }
        }, UI.icon("ic-right", 16))
      )
    );

    analysis.byCategory.slice(0, 4).forEach(function (c) {
      var cat = byId[c.categoryId];
      var hue = "var(--cat-" + (cat ? cat.tint : "stone") + ")";
      card.appendChild(el("div.cat-line",
        el("div.row",
          el("span.badge.badge--lg", { style: { color: hue } }, UI.icon(cat ? cat.icon : "ic-dots", 18)),
          el("span.row-tx",
            el("b", { text: cat ? cat.name : "Uncategorised" }),
            el("span", { text: Math.round(c.share) + "% · " + c.count + (c.count === 1 ? " entry" : " entries") })
          ),
          el("span.row-amt", { text: money(c.total) })
        ),
        el("div.bar", el("i", { style: { width: Math.max(c.share, 2) + "%", background: hue } }))
      ));
    });
    return card;
  }

  function insightCard(insights) {
    if (!insights.length) return null;
    var top = insights[0];
    var surface = top.tone === "danger" ? "surf--danger" : top.tone === "warn" ? "surf--warn" : "surf--feature";
    return el("div.card." + surface, el("p.note", { text: top.text }));
  }

  function installCard() {
    if (typeof Install === "undefined") return null;
    if (!Install.available() || Install.isDismissed()) return null;
    return el("div.card.surf--card.install-card",
      el("div.card-head",
        el("b", { text: "Keep Plutus on your home screen" }),
        el("button.circle-btn.circle-btn--sunken", {
          type: "button", "aria-label": "Not now", onclick: function () { Install.dismiss(); }
        }, UI.icon("ic-close", 15))
      ),
      el("p.note", { text: "Its own icon, no browser bars, and it opens with no signal." }),
      el("button.btn", { type: "button", onclick: function () { Install.open(); } }, "Add it")
    );
  }

  /* ── render ── */

  function render() {
    var host = document.getElementById("screen-home");
    if (!host) return;

    var s = Store.get();
    var today = Dates.today();
    var monthPeriod = Dates.monthPeriod(today);
    var weekPeriod = Dates.weekPeriod(today, s.profile.weekStartsOn);

    var monthlyBudget = Budget.resolveForPeriod(s.budgets, monthPeriod);
    var monthly = Budget.progress(monthlyBudget ? monthlyBudget.amount : null, s.expenses, monthPeriod);

    var cats = {};
    s.categories.forEach(function (c) { cats[c.id] = c; });

    var summary = Debts.summary(Debts.views(s.debts, s.repayments, today));

    var prevPeriod = Dates.previousPeriod(monthPeriod, s.profile.weekStartsOn);
    var analysis = Analytics.analyse(s.expenses, monthPeriod, s.expenses, prevPeriod);
    var insights = Analytics.insights(analysis, monthly, s.categories,
                                      s.profile.currencySymbol, s.profile.grouping);

    var unread = s.notifications.filter(function (n) { return !n.readAt; }).length;

    UI.clear(host);
    host.appendChild(header(s.profile, today, unread));

    var body = el("div.screen-body");
    /* Several of these sections return null when they have nothing to say,
       and appendChild(null) throws where UI.el would simply skip it. */
    function add(node) { if (node) body.appendChild(node); }

    add(bento(monthly, Expenses.dailyTotals(s.expenses, monthPeriod)));

    if (s.expenses.length) {
      weekSection(s, weekPeriod, today, cats).forEach(add);
    } else {
      add(el("div.empty",
        el("h2", { text: "Nothing recorded yet" }),
        el("p", { text: "Tap the plus to add what you just spent. It takes a couple of seconds." }),
        el("button.btn", { type: "button", onclick: function () { SheetExpense.open(); } }, "Add your first expense")
      ));
    }

    add(directionTiles(summary));
    add(categoryCard(analysis, s.categories));
    add(insightCard(insights));
    add(installCard());

    host.appendChild(body);
    App.setBandColour(monthly.hasBudget ? monthly.surface : "ok");
  }

  function reset() { picked = null; }

  return { render: render, reset: reset };
})();
