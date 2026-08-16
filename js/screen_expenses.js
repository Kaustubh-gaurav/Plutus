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

  /* ── search and filtering ───────────────────────────────────
     One query object, handed to the same Expenses.query the rest of the app
     uses. If this screen filtered on its own the totals here would eventually
     disagree with the totals everywhere else. */

  var query = { search: "", categoryIds: [], sortBy: "date", sortDir: "desc" };

  function activeFilterCount() {
    return (query.search ? 1 : 0) + query.categoryIds.length + (query.sortBy !== "date" ? 1 : 0);
  }

  function filterBar(cats) {
    var searchInput = el("input.field-input.search-input", {
      type: "search", value: query.search, placeholder: "Search notes, places, categories",
      "aria-label": "Search expenses"
    });
    searchInput.addEventListener("input", function () {
      query.search = searchInput.value;
      renderList();
    });

    var chips = el("div.chip-row");
    var allOn = query.categoryIds.length === 0;
    chips.appendChild(el("button.chip" + (allOn ? ".is-on" : ""), {
      type: "button", "aria-pressed": allOn ? "true" : "false",
      onclick: function () { query.categoryIds = []; render(); }
    }, "All"));

    Object.keys(cats).forEach(function (id) {
      var c = cats[id];
      if (c.isArchived) return;
      var on = query.categoryIds.indexOf(id) !== -1;
      chips.appendChild(el("button.chip" + (on ? ".is-on" : ""), {
        type: "button", "aria-pressed": on ? "true" : "false",
        onclick: function () {
          if (on) query.categoryIds = query.categoryIds.filter(function (x) { return x !== id; });
          else query.categoryIds = query.categoryIds.concat([id]);
          render();
        }
      },
        el("span.chip-dot", { style: { background: "var(--cat-" + c.tint + ")" } }, UI.icon(c.icon, 13)),
        el("span", { text: c.name })
      ));
    });

    var sortBtn = el("button.chip", {
      type: "button",
      onclick: function () {
        query.sortBy = query.sortBy === "date" ? "amount" : "date";
        render();
      }
    }, UI.icon("ic-sort", 13), el("span", { text: query.sortBy === "date" ? "Newest" : "Largest" }));

    return el("div.filter-bar",
      el("div.field", searchInput),
      chips,
      el("div.filter-foot", sortBtn,
        activeFilterCount()
          ? el("button.chip", {
              type: "button",
              onclick: function () { query = { search: "", categoryIds: [], sortBy: "date", sortDir: "desc" }; render(); }
            }, "Clear filters")
          : null
      )
    );
  }

  var listHost = null;

  function renderList() {
    if (!listHost) return;
    var s = Store.get();
    var today = Dates.today();
    var cats = categoriesById();
    var results = Expenses.query(s.expenses, query, cats);

    UI.clear(listHost);

    if (!results.length) {
      listHost.appendChild(el("div.empty",
        el("h2", { text: "Nothing matches" }),
        el("p", { text: "Try a different search, or clear the filters." })
      ));
      return;
    }

    var total = Money.sum(results, function (e) { return e.amount; });
    listHost.appendChild(el("div.result-line",
      el("span", { text: results.length + (results.length === 1 ? " entry" : " entries") }),
      el("b", { text: money(total) })
    ));

    var page = results.slice(0, shown);
    Expenses.groupByDay(page).forEach(function (g) { listHost.appendChild(dayGroup(g, cats, today)); });

    if (results.length > shown) {
      listHost.appendChild(el("button.btn.btn--soft", {
        type: "button",
        onclick: function () { shown += PAGE; renderList(); }
      }, "Show older, " + (results.length - shown) + " left"));
    }
  }

  function render() {
    var host = document.getElementById("screen-expenses");
    if (!host) return;

    var s = Store.get();
    var today = Dates.today();
    var cats = categoriesById();

    var all = s.expenses;
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

    body.appendChild(filterBar(cats));
    listHost = el("div.result-list");
    body.appendChild(listHost);
    host.appendChild(body);
    renderList();
    App.setBandColour("ok");
    return;
  }

  /* Leaving the screen resets paging and the filters, so coming back does not
     silently render a thousand rows, or hide most of them behind a search you
     forgot you typed. */
  function reset() {
    shown = PAGE;
    query = { search: "", categoryIds: [], sortBy: "date", sortDir: "desc" };
  }

  return { render: render, reset: reset };
})();
