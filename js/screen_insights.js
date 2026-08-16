/* Insights. What the numbers mean, rather than what they are.

   Everything here is derived at read time from the same logic the rest of the
   app uses, so a figure on this screen can never disagree with the same
   figure on Home. The period switcher moves through real periods, so last
   month is genuinely last month's data and not a rescaled guess. */

var ScreenInsights = (function () {

  var el = UI.el;
  var kind = "monthly";
  var offset = 0;   /* 0 is the current period, 1 is the one before it */

  function profile() { return Store.get().profile; }
  function money(paise) {
    var p = profile();
    return Money.format(paise, p.currencySymbol, p.grouping);
  }
  function compact(paise) {
    var p = profile();
    return Money.formatCompact(paise, p.currencySymbol, p.grouping);
  }

  function periodAt(back) {
    var s = Store.get();
    var today = Dates.today();
    var p = kind === "weekly" ? Dates.weekPeriod(today, s.profile.weekStartsOn) : Dates.monthPeriod(today);
    for (var i = 0; i < back; i++) p = Dates.previousPeriod(p, s.profile.weekStartsOn);
    return p;
  }

  function periodLabel(p) {
    if (kind === "monthly") {
      return offset === 0 ? "This month" : offset === 1 ? "Last month"
           : Dates.monthName(p.key) + " " + p.key.slice(0, 4);
    }
    return offset === 0 ? "This week" : offset === 1 ? "Last week"
         : Dates.formatDisplay(p.start) + " to " + Dates.formatDisplay(p.end);
  }

  function barChart(days, period, today) {
    var max = days.reduce(function (m, d) { return Math.max(m, d.total); }, 0);
    if (max === 0) return null;
    var wrap = el("div.bars" + (days.length > 10 ? ".bars--dense" : ""));
    days.forEach(function (d, i) {
      var pct = Math.max((d.total / max) * 100, d.total > 0 ? 6 : 2);
      /* A month is 31 bars. Labelling every one of them produces a solid line
         of digits nobody can read, so a long period labels every fifth day,
         the ends, and today. */
      var dense = days.length > 10;
      var label = !dense || i === 0 || i === days.length - 1 || d.date === today || (i + 1) % 5 === 0
        ? String(Number(d.date.slice(-2))) : "";
      /* Only the tallest few bars carry a value, or the same thing happens
         to the figures above them. */
      var showValue = !dense || d.total >= max * 0.6;
      wrap.appendChild(el("div.bar-day" + (d.date === today ? ".is-today" : ""),
        el("em", { text: d.total > 0 && showValue ? compact(d.total) : "" }),
        el("i.fill--ok", { style: { height: pct + "%" }, title: Dates.formatDisplay(d.date) + ", " + money(d.total) }),
        el("span", { text: label })
      ));
    });
    return wrap;
  }

  function render() {
    var host = document.getElementById("screen-insights");
    if (!host) return;

    var s = Store.get();
    var today = Dates.today();
    var period = periodAt(offset);
    var previous = Dates.previousPeriod(period, s.profile.weekStartsOn);

    var analysis = Analytics.analyse(s.expenses, period, s.expenses, previous);
    var budgetRecord = Budget.resolveForPeriod(s.budgets, period);
    var progress = Budget.progress(budgetRecord ? budgetRecord.amount : null, s.expenses, period);
    var insights = Analytics.insights(analysis, progress, s.categories, s.profile.currencySymbol, s.profile.grouping);

    var byId = {};
    s.categories.forEach(function (c) { byId[c.id] = c; });

    UI.clear(host);

    /* The band is mustard here, a fixed identity colour for this screen. Only
       the Home band changes colour, per law 4. */
    var header = el("header.band.band--flat",
      el("div.band-top",
        el("button.circle-btn", {
          type: "button", "aria-label": "Back to home", onclick: function () { App.go("#/"); }
        }, UI.icon("ic-back", 17)),
        el("span.band-who")
      ),
      el("h1.band-title", { text: "Insights" }),
      el("div.pills", { style: { "margin-top": "12px" } },
        el("span.pill.pill--dark", { text: analysis.count + (analysis.count === 1 ? " entry" : " entries") }),
        el("span.pill.pill--dark", { text: compact(analysis.averageDailySpend) + " a day" })
      )
    );
    host.appendChild(header);

    var seg = el("div.seg", { role: "group", "aria-label": "Period" });
    [["weekly", "Weekly"], ["monthly", "Monthly"]].forEach(function (o) {
      var on = kind === o[0];
      seg.appendChild(el("button", {
        type: "button", "aria-selected": on ? "true" : "false",
        onclick: function () { kind = o[0]; offset = 0; render(); }
      }, o[1]));
    });

    var stepper = el("div.stepper",
      el("button.circle-btn.circle-btn--sunken", {
        type: "button", "aria-label": "Earlier period",
        onclick: function () { offset++; render(); }
      }, UI.icon("ic-back", 16)),
      el("b", { text: periodLabel(period) }),
      el("button.circle-btn.circle-btn--sunken", {
        type: "button", "aria-label": "Later period", disabled: offset === 0 ? "" : null,
        style: offset === 0 ? { opacity: ".35" } : null,
        onclick: function () { if (offset > 0) { offset--; render(); } }
      }, UI.icon("ic-right", 16))
    );

    var body = el("div.screen-body", seg, stepper);

    if (!analysis.count) {
      body.appendChild(el("div.empty",
        el("h2", { text: "Nothing in this period" }),
        el("p", { text: "Once there are a few expenses here, this is where the pattern in them shows up." })
      ));
      host.appendChild(body);
      App.setBandColour("flat");
      return;
    }

    body.appendChild(el("div.tiles.tiles--3",
      el("div.tile.surf--card", el("span.tile-v", { text: compact(analysis.total) }), el("span.tile-l", { text: "Spent" })),
      el("div.tile.surf--card", el("span.tile-v", { text: String(analysis.count) }), el("span.tile-l", { text: "Entries" })),
      el("div.tile.surf--card", el("span.tile-v", { text: compact(analysis.averageExpense) }), el("span.tile-l", { text: "Average" }))
    ));

    if (progress.hasBudget) {
      var seg2 = Budget.barSegments(progress);
      body.appendChild(el("div.card.surf--card",
        el("div.card-head",
          el("b", { text: "Against the budget" }),
          el("span.pill." + (progress.status === "exceeded" ? "pill--danger" : progress.status === "near_limit" ? "pill--warn" : "pill--ok"),
             { text: progress.label })
        ),
        el("div.bar-wrap",
          el("div.bar-label",
            el("span", { text: money(progress.spent) + " of " + money(progress.budget) }),
            el("span", { text: Math.round(progress.percentUsed) + "%" })
          ),
          el("div.bar",
            el("i.fill--" + Budget.fillForStatus(progress.status), { style: { width: seg2.inside + "%" } }),
            seg2.over > 0 ? el("i.fill--danger.fill--over", { style: { width: seg2.over + "%" } }) : null
          )
        )
      ));
    }

    var chart = barChart(Expenses.dailyTotals(s.expenses, period), period, today);
    if (chart) {
      body.appendChild(el("div.card.surf--card",
        el("div.card-head",
          el("b", { text: "Day by day" }),
          analysis.busiestDay
            ? el("span.pill.pill--sunken", { text: "Heaviest " + Dates.formatDisplay(analysis.busiestDay.date, today) })
            : null
        ),
        chart
      ));
    }

    var cats = el("div.card.surf--card", el("div.card-head", el("b", { text: "Where it went" })));
    analysis.byCategory.forEach(function (c) {
      var cat = byId[c.categoryId];
      cats.appendChild(el("div.cat-line",
        el("div.row",
          el("span.badge.badge--lg", { style: { color: "var(--cat-" + (cat ? cat.tint : "stone") + ")" } },
            UI.icon(cat ? cat.icon : "ic-dots", 17)),
          el("span.row-tx",
            el("b", { text: cat ? cat.name : "Uncategorised" }),
            el("span", { text: Math.round(c.share) + "% · " + c.count + (c.count === 1 ? " entry" : " entries") })
          ),
          el("span.row-amt", { text: money(c.total) })
        ),
        el("div.bar", el("i.fill--ok", { style: { width: Math.max(c.share, 2) + "%" } }))
      ));
    });
    body.appendChild(cats);

    insights.forEach(function (i) {
      var surface = i.tone === "danger" ? "surf--danger" : i.tone === "warn" ? "surf--warn"
                  : i.tone === "ok" ? "surf--ok" : "surf--muted";
      body.appendChild(el("div.card." + surface, el("p.note", { text: i.text })));
    });

    host.appendChild(body);
    App.setBandColour("flat");
  }

  function reset() { kind = "monthly"; offset = 0; }

  return { render: render, reset: reset };
})();
