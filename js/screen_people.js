/* People. Money you lent, money you borrowed, and every repayment kept.

   The one error this feature cannot make is blurring the two directions, so
   they are separated by a word, an arrow and a colour, every time, and the
   two summary tiles are always both on screen.

   Debt detail lives in a sheet rather than a route, so the list stays behind
   it and closing feels like putting something down rather than navigating. */

var ScreenPeople = (function () {

  var el = UI.el;
  var direction = "lent";

  function profile() { return Store.get().profile; }
  function money(paise) {
    var p = profile();
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  function initialTint(name) {
    /* Deterministic from the name, so Rahul is always the same colour. */
    var sum = 0;
    for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return CONFIG.TINTS[sum % CONFIG.TINTS.length];
  }

  function statusPill(v) {
    if (v.status === "paid") return el("span.pill.pill--ok", { text: "Paid in full" });
    if (v.status === "overdue") {
      var days = Math.abs(v.daysUntilDue);
      return el("span.pill.pill--danger", { text: "Overdue by " + days + (days === 1 ? " day" : " days") });
    }
    if (v.status === "partially_paid") return el("span.pill.pill--warn", { text: "Partially paid" });
    if (v.isDueSoon) {
      return el("span.pill.pill--warn", {
        text: v.daysUntilDue === 0 ? "Due today" : "Due in " + v.daysUntilDue + (v.daysUntilDue === 1 ? " day" : " days")
      });
    }
    return el("span.pill.pill--sunken", { text: "Pending" });
  }

  function debtCard(v, today) {
    var surface = v.isSettled ? "surf--muted" : v.isOverdue ? "surf--danger" : "surf--card";
    var barFill = v.isOverdue ? "fill--cur" : v.status === "partially_paid" ? "fill--warn" : "fill--ok";

    return el("button.card.card--tap." + surface, {
      type: "button",
      "aria-label": v.personName + ", " + money(v.remaining) + " outstanding",
      onclick: function () { SheetDebt.detail(v.id); }
    },
      el("div.row",
        el("span.badge.badge--lg", {
          style: v.isOverdue
            ? { background: "var(--glass-dark)", color: "var(--ink)" }
            : { background: "var(--cat-" + initialTint(v.personName) + ")", color: "var(--on-accent)" }
        }, el("b", { text: v.personName.trim().charAt(0).toUpperCase() })),
        el("span.row-tx",
          el("b", { text: v.personName }),
          el("span", {
            text: v.dueDate
              ? "Due " + Dates.formatDisplay(v.dueDate, today)
              : (v.direction === "lent" ? "Lent " : "Borrowed ") + Dates.formatDisplay(v.date, today)
          })
        ),
        el("span.row-amt", { text: money(v.remaining) },
          el("small", { text: "of " + money(v.originalAmount) }))
      ),
      el("div.bar-wrap",
        el("div.bar-label",
          statusPill(v),
          el("span", { text: Math.round(v.repaidPercent) + "% back" })
        ),
        el("div.bar", {
          role: "progressbar", "aria-valuenow": String(Math.round(v.repaidPercent)),
          "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "Repaid"
        },
          el("i." + barFill, { style: { width: Math.max(v.repaidPercent, v.repaidPercent > 0 ? 3 : 0) + "%" } })
        )
      )
    );
  }

  function render() {
    var host = document.getElementById("screen-people");
    if (!host) return;

    var s = Store.get();
    var today = Dates.today();
    var all = Debts.views(s.debts, s.repayments, today);
    var summary = Debts.summary(all);
    var shown = all.filter(function (v) { return v.direction === direction; });

    UI.clear(host);

    var header = el("header.band.band--flat",
      el("div.band-top",
        el("button.circle-btn", {
          type: "button", "aria-label": "Back to home", onclick: function () { App.go("#/"); }
        }, UI.icon("ic-back", 17)),
        el("span.band-who"),
        el("button.circle-btn", {
          type: "button", "aria-label": "Add a record", onclick: function () { SheetDebt.open(null, direction); }
        }, UI.icon("ic-plus", 17))
      ),
      el("h1.band-title", { text: "People" }),
      el("div.tiles", { style: { "margin-top": "14px" } },
        el("div.tile.surf--ok",
          el("span.tile-v", { text: money(summary.totalOwedToMe) }),
          el("span.tile-l", { text: "Owed to you" })
        ),
        el("div.tile.surf--owe",
          el("span.tile-v", { text: money(summary.totalIOwe) }),
          el("span.tile-l", { text: "You owe" })
        )
      )
    );
    host.appendChild(header);

    var seg = el("div.seg", { role: "group", "aria-label": "Direction" });
    [["lent", "Owed to you"], ["borrowed", "You owe"]].forEach(function (o) {
      var on = direction === o[0];
      seg.appendChild(el("button", {
        type: "button", "aria-selected": on ? "true" : "false",
        onclick: function () { direction = o[0]; render(); }
      }, o[1]));
    });

    var body = el("div.screen-body", seg);

    if (!shown.length) {
      body.appendChild(el("div.empty",
        el("h2", { text: direction === "lent" ? "Nobody owes you anything" : "You do not owe anyone" }),
        el("p", {
          text: direction === "lent"
            ? "Record money you lend and Plutus keeps the original amount, every repayment, and what is left."
            : "Record money you borrow so you know what is still outstanding and when it is due."
        }),
        el("button.btn", {
          type: "button", onclick: function () { SheetDebt.open(null, direction); }
        }, direction === "lent" ? "Record money you lent" : "Record money you borrowed")
      ));
    } else {
      var open = shown.filter(function (v) { return !v.isSettled; });
      var settled = shown.filter(function (v) { return v.isSettled; });
      open.forEach(function (v) { body.appendChild(debtCard(v, today)); });

      if (settled.length) {
        body.appendChild(el("div.group-head",
          el("b", { text: "Settled" }),
          el("span", { text: settled.length + (settled.length === 1 ? " record" : " records") })
        ));
        settled.forEach(function (v) { body.appendChild(debtCard(v, today)); });
      }
    }

    host.appendChild(body);
    App.setBandColour("flat");
  }

  function setDirection(d) { direction = d; }

  return { render: render, setDirection: setDirection };
})();
