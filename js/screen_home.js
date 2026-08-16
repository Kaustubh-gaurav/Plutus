/* Home. Layout L1: the band carries the answer, everything else supports it.

   Phase 3 builds the band and the weekly card, because onboarding can now set
   a budget and a screen that still said "Not set" would be stating something
   false. The tiles, the day by day chart and the category card arrive with
   real expenses in Phases 4 and 5.

   Nothing here computes money. Every figure comes from Budget.progress. */

var ScreenHome = (function () {

  var el = UI.el;

  function money(paise) {
    var p = Store.get().profile;
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  function greeting(profile, today) {
    var hour = new Date().getHours();
    var part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return profile.name ? part + ", " + profile.name : part;
  }

  /* The band's colour IS the budget state. design.md decision two. */
  function band(profile, monthly, today) {
    var head = el("div.band-top",
      el("button.avatar", {
        type: "button", "aria-label": "Settings",
        onclick: function () { App.go("#/settings"); }
      }, (profile.name || "P").trim().charAt(0).toUpperCase()),
      el("span.band-who",
        el("b", { text: greeting(profile, today) }),
        el("span", { text: Dates.formatRelativeDay(today, today) + ", " + Dates.formatDisplay(today, today) })
      ),
      el("button.circle-btn", { type: "button", "aria-label": "Notifications" }, UI.icon("ic-bell", 17))
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

    /* The headline answers the product's question directly: what can I still
       spend. Over budget, it flips to how far past you are. */
    nodes.push(el("span.big", {
      text: monthly.overspend > 0
        ? money(monthly.overspend) + " over"
        : money(monthly.remaining) + " left"
    }));

    var seg = Budget.barSegments(monthly);
    nodes.push(el("div.bar-wrap", { style: { "margin-top": "12px" } },
      el("div.bar-label", { style: { opacity: ".85" } },
        el("span", { text: money(monthly.spent) + " of " + money(monthly.budget) }),
        el("span", { text: Math.round(monthly.percentUsed) + "%" })
      ),
      el("div.bar", {
        role: "progressbar",
        "aria-valuenow": String(Math.round(monthly.percentUsed)),
        "aria-valuemin": "0", "aria-valuemax": "100",
        "aria-label": "Monthly budget used"
      },
        el("i.fill--cur", { style: { width: seg.inside + "%" } }),
        seg.over > 0 ? el("i.fill--cur.fill--over", { style: { width: seg.over + "%" } }) : null
      )
    ));

    var pills = el("div.pills", { style: { "margin-top": "11px" } },
      el("span.pill.pill--glass", { text: monthly.label })
    );
    if (monthly.period.daysLeft > 0 && monthly.overspend === 0) {
      pills.appendChild(el("span.pill.pill--glass", {
        text: money(monthly.safeDailyRemaining) + " a day for " + monthly.period.daysLeft +
              " day" + (monthly.period.daysLeft === 1 ? "" : "s")
      }));
    } else if (monthly.overspend > 0) {
      pills.appendChild(el("span.pill.pill--glass", {
        text: monthly.period.daysLeft + " day" + (monthly.period.daysLeft === 1 ? "" : "s") + " still to go"
      }));
    }
    nodes.push(pills);
    return nodes;
  }

  function weeklyCard(weekly) {
    if (!weekly.hasBudget) return null;
    var seg = Budget.barSegments(weekly);
    return el("div.card.surf--warn",
      el("div.card-head",
        el("b", { text: "This week" }),
        el("span.pill.pill--dark", { text: Math.round(weekly.percentUsed) + "% used" })
      ),
      el("div.bar-wrap",
        el("div.bar-label",
          el("span", { text: money(weekly.spent) + " of " + money(weekly.budget) }),
          el("span", {
            text: weekly.overspend > 0 ? money(weekly.overspend) + " over" : money(weekly.remaining) + " left"
          })
        ),
        el("div.bar", {
          role: "progressbar",
          "aria-valuenow": String(Math.round(weekly.percentUsed)),
          "aria-valuemin": "0", "aria-valuemax": "100",
          "aria-label": "Weekly budget used"
        },
          el("i.fill--ink", { style: { width: seg.inside + "%" } }),
          seg.over > 0 ? el("i.fill--ink.fill--over", { style: { width: seg.over + "%" } }) : null
        )
      )
    );
  }

  function emptyExpenses() {
    return el("div.empty",
      el("h2", { text: "Nothing recorded yet" }),
      el("p", { text: "Tap the plus to add what you just spent. It takes a couple of seconds." })
    );
  }

  function render() {
    var host = document.getElementById("screen-home");
    if (!host) return;

    var s = Store.get();
    var today = Dates.today();
    var monthPeriod = Dates.monthPeriod(today);
    var weekPeriod = Dates.weekPeriod(today, s.profile.weekStartsOn);

    var monthly = Budget.progress(
      (Budget.resolveForPeriod(s.budgets, monthPeriod) || {}).amount || null, s.expenses, monthPeriod);
    var weekly = Budget.progress(
      (Budget.resolveForPeriod(s.budgets, weekPeriod) || {}).amount || null, s.expenses, weekPeriod);

    UI.clear(host);

    var header = el("header.band");
    band(s.profile, monthly, today).forEach(function (n) { header.appendChild(n); });
    host.appendChild(header);

    var body = el("div.screen-body",
      weeklyCard(weekly),
      s.expenses.length ? null : emptyExpenses()
    );
    host.appendChild(body);

    /* The band colour follows the state, and so does the status bar. */
    App.setBandColour(monthly.hasBudget ? monthly.surface : "ok");
  }

  return { render: render };
})();
