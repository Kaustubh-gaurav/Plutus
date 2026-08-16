/* History. Everything recorded, grouped by day, newest first.

   Rows are the one list row from design.md, so an expense here looks exactly
   like an expense anywhere else in the app. Search and filtering arrive in
   Phase 8; this phase is about being able to see, correct and delete what you
   recorded, which is what makes the numbers trustworthy. */

var ScreenExpenses = (function () {

  var el = UI.el;
  var PAGE = 50;
  var shown = PAGE;

  function money(paise) {
    var p = Store.get().profile;
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  function categoriesById() {
    var map = {};
    Store.get().categories.forEach(function (c) { map[c.id] = c; });
    return map;
  }

  function methodLabel(m) {
    if (!m) return "";
    if (m === "upi") return "UPI";
    return m.charAt(0).toUpperCase() + m.slice(1);
  }

  function row(e, cats, today) {
    var cat = cats[e.categoryId];

    /* The most specific thing available becomes the title, and the subtitle
       carries whatever that title did not already say. Repeating the note on
       both lines reads as a rendering bug, because it is one. */
    var title = e.note || e.merchant || (cat ? cat.name : "Expense");
    var sub = [];
    if (cat && title !== cat.name) sub.push(cat.name);
    if (e.merchant && title !== e.merchant) sub.push(e.merchant);
    if (e.paymentMethod) sub.push(methodLabel(e.paymentMethod));

    return el("button.row.row--tap", {
      type: "button",
      "aria-label": "Edit " + money(e.amount) + (cat ? ", " + cat.name : ""),
      onclick: function () { SheetExpense.open(e.id); }
    },
      el("span.badge.badge--lg", {
        style: { background: "var(--cat-" + (cat ? cat.tint : "stone") + ")" }
      }, UI.icon(cat ? cat.icon : "ic-dots", 17)),
      el("span.row-tx",
        el("b", { text: title }),
        el("span", { text: sub.join(" · ") })
      ),
      el("span.row-amt", { text: money(e.amount) })
    );
  }

  function dayGroup(group, cats, today) {
    var card = el("div.card.surf--white");
    card.appendChild(el("div.day-head",
      el("b", { text: Dates.formatRelativeDay(group.date, today) }),
      el("span", { text: money(group.total) })
    ));
    group.items.forEach(function (e) { card.appendChild(row(e, cats, today)); });
    return card;
  }

  function render() {
    var host = document.getElementById("screen-expenses");
    if (!host) return;

    var s = Store.get();
    var today = Dates.today();
    var cats = categoriesById();

    var all = Expenses.query(s.expenses, { sortBy: "date", sortDir: "desc" }, cats);
    var monthPeriod = Dates.monthPeriod(today);
    var monthTotal = Money.sum(Expenses.inPeriod(s.expenses, monthPeriod), function (e) { return e.amount; });

    UI.clear(host);

    var header = el("header.band.band--ok",
      el("div.band-top",
        el("button.circle-btn", {
          type: "button", "aria-label": "Back to home",
          onclick: function () { App.go("#/"); }
        }, UI.icon("ic-back", 17)),
        el("span.band-who")
      ),
      el("h1.band-title", { text: "History" })
    );
    if (all.length) {
      header.appendChild(el("div.pills", { style: { "margin-top": "12px" } },
        el("span.pill.pill--glass", { text: all.length + (all.length === 1 ? " entry" : " entries") }),
        el("span.pill.pill--glass", { text: money(monthTotal) + " this month" })
      ));
    }
    host.appendChild(header);

    var body = el("div.screen-body");

    if (!all.length) {
      body.appendChild(el("div.empty",
        el("h2", { text: "Nothing recorded yet" }),
        el("p", { text: "Tap the plus to add what you just spent. Everything you record shows up here, grouped by day." }),
        el("button.btn", { type: "button", onclick: function () { SheetExpense.open(); } }, "Add your first expense")
      ));
      host.appendChild(body);
      return;
    }

    /* Paging keeps two years of history from building thousands of rows at
       once. It counts entries, not days, so a heavy day cannot blow past it. */
    var page = all.slice(0, shown);
    Expenses.groupByDay(page).forEach(function (g) { body.appendChild(dayGroup(g, cats, today)); });

    if (all.length > shown) {
      body.appendChild(el("button.btn.btn--soft", {
        type: "button",
        onclick: function () { shown += PAGE; render(); }
      }, "Show older, " + (all.length - shown) + " left"));
    }

    host.appendChild(body);
  }

  /* Leaving the screen resets paging, so coming back does not silently render
     a thousand rows because you once tapped "show older". */
  function reset() { shown = PAGE; }

  return { render: render, reset: reset };
})();
