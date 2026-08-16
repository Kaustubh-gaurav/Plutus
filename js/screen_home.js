/* Home. Layout L1 with the day by day chart above the categories.

   Order, top to bottom: band, weekly card, direction tiles, day by day chart,
   where it went, one insight. The screen reads outward in time: the month,
   then the week, then the days, then where the money actually went.

   Nothing here computes money. Every figure comes from the logic layer. */

var ScreenHome = (function () {

  var el = UI.el;

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

  /* ── band. its colour is the budget state ── */

  function band(p, monthly, today, unread) {
    var head = el("div.band-top",
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
    );

    var nodes = [head, el("span.band-eyebrow", { text: Dates.monthName(monthly.period.key) + " budget" })];

    if (!monthly.hasBudget) {
      nodes.push(el("span.big", { text: "Not set" }));
      nodes.push(el("p.note", { style: { "margin-top": "8px" } },
        "Set a budget and every figure in the app starts working."));
      nodes.push(el("button.pill.pill--white", {
        type: "button", style: { "margin-top": "12px" },
        onclick: function () { App.go("#/settings"); }
      }, "Set a monthly budget"));
      return nodes;
    }

    nodes.push(el("span.big", {
      text: monthly.overspend > 0 ? money(monthly.overspend) + " over" : money(monthly.remaining) + " left"
    }));

    var seg = Budget.barSegments(monthly);
    /* This bar sits inside the band, and the band is already the status
       colour: teal, then mustard, then red at the limit. A red bar on a red
       band would be invisible, so here the fill stays currentColor and the
       whole band carries the warning instead. */
    nodes.push(el("div.bar-wrap", { style: { "margin-top": "12px" } },
      el("div.bar-label", { style: { opacity: ".85" } },
        el("span", { text: money(monthly.spent) + " of " + money(monthly.budget) }),
        el("span", { text: Math.round(monthly.percentUsed) + "%" })
      ),
      el("div.bar", {
        role: "progressbar", "aria-valuenow": String(Math.round(monthly.percentUsed)),
        "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "Monthly budget used"
      },
        el("i.fill--cur", { style: { width: seg.inside + "%" } }),
        seg.over > 0 ? el("i.fill--cur.fill--over", { style: { width: seg.over + "%" } }) : null
      )
    ));

    var pills = el("div.pills", { style: { "margin-top": "11px" } },
      el("span.pill.pill--glass", { text: monthly.label })
    );
    if (monthly.overspend > 0) {
      pills.appendChild(el("span.pill.pill--glass", {
        text: monthly.period.daysLeft + " day" + (monthly.period.daysLeft === 1 ? "" : "s") + " still to go"
      }));
    } else if (monthly.period.daysLeft > 0) {
      pills.appendChild(el("span.pill.pill--glass", {
        text: money(monthly.safeDailyRemaining) + " a day for " + monthly.period.daysLeft +
              " day" + (monthly.period.daysLeft === 1 ? "" : "s")
      }));
    }
    nodes.push(pills);
    return nodes;
  }

  /* ── weekly ── */

  function weeklyCard(weekly) {
    if (!weekly.hasBudget) return null;
    var seg = Budget.barSegments(weekly);
    var atLimit = weekly.status === "at_limit" || weekly.status === "exceeded";
    /* On dark every card is the same surface, so the bar is the only thing
       carrying state and it can follow the shared mapping directly: accent,
       then amber, then red at the limit. */
    var fill = "fill--" + Budget.fillForStatus(weekly.status);
    return el("div.card.surf--card",
      el("div.card-head",
        el("b", { text: "This week" }),
        el("span.pill." + (atLimit ? "pill--danger" : "pill--sunken"),
           { text: Math.round(weekly.percentUsed) + "% used" })
      ),
      el("div.bar-wrap",
        el("div.bar-label",
          el("span", { text: money(weekly.spent) + " of " + money(weekly.budget) }),
          el("span", { text: weekly.overspend > 0 ? money(weekly.overspend) + " over" : money(weekly.remaining) + " left" })
        ),
        el("div.bar", {
          role: "progressbar", "aria-valuenow": String(Math.round(weekly.percentUsed)),
          "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "Weekly budget used"
        },
          el("i." + fill, { style: { width: seg.inside + "%" } }),
          seg.over > 0 ? el("i." + fill + ".fill--over", { style: { width: seg.over + "%" } }) : null
        )
      )
    );
  }

  /* ── the two directions. never colour alone: a word, an arrow, a colour ── */

  function directionTiles(summary) {
    if (summary.totalOwedToMe === 0 && summary.totalIOwe === 0) return null;
    return el("div.tiles",
      el("button.tile.surf--ok.tile--tap", {
        type: "button", onclick: function () { App.go("#/people"); }
      },
        el("span.badge", UI.icon("ic-up", 15)),
        el("span.tile-v", { text: money(summary.totalOwedToMe) }),
        el("span.tile-l", { text: "Owed to you" })
      ),
      el("button.tile.surf--owe.tile--tap", {
        type: "button", onclick: function () { App.go("#/people"); }
      },
        el("span.badge", UI.icon("ic-down", 15)),
        el("span.tile-v", { text: money(summary.totalIOwe) }),
        el("span.tile-l", { text: "You owe" })
      )
    );
  }

  /* ── day by day, the current week ──────────────────────────
     Every day of the period gets a bar, zeros included. A flat Wednesday is
     information; a missing Wednesday is a bug. */

  function dayChart(expenses, weekPeriod, weekly, today) {
    var days = Expenses.dailyTotals(expenses, weekPeriod);
    var max = days.reduce(function (m, d) { return Math.max(m, d.total); }, 0);
    if (max === 0) return null;

    var overDay = weekly.hasBudget ? Math.round(weekly.budget / 7) : null;
    var bars = el("div.bars");
    days.forEach(function (d) {
      var pct = max > 0 ? Math.max((d.total / max) * 100, d.total > 0 ? 6 : 2) : 2;
      var heavy = overDay !== null && d.total > overDay;
      var isToday = d.date === today;
      bars.appendChild(el("div.bar-day" + (isToday ? ".is-today" : ""),
        el("em", { text: d.total > 0 ? compact(d.total) : "" }),
        el("i" + (heavy ? ".fill--warn" : ".fill--ok"), {
          style: { height: pct + "%" },
          title: Dates.formatDisplay(d.date, today) + ", " + money(d.total)
        }),
        el("span", { text: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(d.date.split("-")[0], Number(d.date.split("-")[1]) - 1, d.date.split("-")[2]).getDay()] })
      ));
    });

    return el("div.card.surf--card",
      el("div.card-head",
        el("b", { text: "This week, day by day" }),
        overDay !== null ? el("span.pill.pill--sunken", { text: compact(overDay) + " a day" }) : null
      ),
      bars
    );
  }

  /* ── where it went ── */

  function categoryCard(analysis, cats, monthPeriod) {
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
      card.appendChild(el("div.cat-line",
        el("div.row",
          el("span.badge.badge--lg", { style: { color: "var(--cat-" + (cat ? cat.tint : "stone") + ")" } },
            UI.icon(cat ? cat.icon : "ic-dots", 17)),
          el("span.row-tx",
            el("b", { text: cat ? cat.name : "Uncategorised" }),
            el("span", { text: Math.round(c.share) + "% of the month · " + c.count + (c.count === 1 ? " entry" : " entries") })
          ),
          el("span.row-amt", { text: money(c.total) })
        ),
        el("div.bar", el("i.fill--ok", { style: { width: Math.max(c.share, 2) + "%" } }))
      ));
    });
    return card;
  }

  /* ── install ────────────────────────────────────────────────
     Offered once, dismissible for good. An app that nags to be installed is
     an app people uninstall. */

  function installCard() {
    if (typeof Install === "undefined") return null;
    if (!Install.available() || Install.isDismissed()) return null;
    return el("div.card.surf--feature.install-card",
      el("div.card-head",
        el("b", { text: "Keep Plutus on your home screen" }),
        el("button.circle-btn", {
          type: "button", "aria-label": "Not now",
          onclick: function () { Install.dismiss(); }
        }, UI.icon("ic-close", 15))
      ),
      el("p.note", { text: "Its own icon, no browser bars, and it opens with no signal." }),
      el("button.btn.btn--onink", { type: "button", onclick: function () { Install.open(); } },
        "Add it")
    );
  }

  /* ── one insight, the most useful thing the app can say right now ── */

  function insightCard(insights) {
    if (!insights.length) return null;
    var top = insights[0];
    /* One edge, not a slab. Every insight is the same dark card; only the
       rule down its left side changes. */
    var surface = top.tone === "danger" ? "surf--danger"
                : top.tone === "warn" ? "surf--warn"
                : top.tone === "ok" ? "surf--ok" : "surf--feature";
    return el("div.card." + surface,
      el("div.card-head", el("b", { text: headlineFor(top) })),
      el("p.note", { text: top.text })
    );
  }

  function headlineFor(insight) {
    switch (insight.id) {
      case "over-budget": return "Over for the month";
      case "pace": return "Slow down a little";
      case "near": return "Getting close";
      case "top-category": return "Your biggest category";
      case "busiest-day": return "Your heaviest day";
      case "vs-previous": return "Against last period";
      default: return "Worth knowing";
    }
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
    var weeklyBudget = Budget.resolveForPeriod(s.budgets, weekPeriod);
    var monthly = Budget.progress(monthlyBudget ? monthlyBudget.amount : null, s.expenses, monthPeriod);
    var weekly = Budget.progress(weeklyBudget ? weeklyBudget.amount : null, s.expenses, weekPeriod);

    var debtViews = Debts.views(s.debts, s.repayments, today);
    var summary = Debts.summary(debtViews);

    var prevPeriod = Dates.previousPeriod(monthPeriod, s.profile.weekStartsOn);
    var analysis = Analytics.analyse(s.expenses, monthPeriod, s.expenses, prevPeriod);
    var insights = Analytics.insights(analysis, monthly, s.categories, s.profile.currencySymbol, s.profile.grouping);

    var unread = s.notifications.filter(function (n) { return !n.readAt; }).length;

    UI.clear(host);

    var header = el("header.band");
    band(s.profile, monthly, today, unread).forEach(function (n) { header.appendChild(n); });
    host.appendChild(header);

    var body = el("div.screen-body",
      weeklyCard(weekly),
      installCard(),
      directionTiles(summary),
      dayChart(s.expenses, weekPeriod, weekly, today),
      categoryCard(analysis, s.categories, monthPeriod),
      insightCard(insights),
      s.expenses.length ? null : el("div.empty",
        el("h2", { text: "Nothing recorded yet" }),
        el("p", { text: "Tap the plus to add what you just spent. It takes a couple of seconds." }),
        el("button.btn", { type: "button", onclick: function () { SheetExpense.open(); } }, "Add your first expense")
      )
    );
    host.appendChild(body);

    App.setBandColour(monthly.hasBudget ? monthly.surface : "ok");
  }

  return { render: render };
})();
