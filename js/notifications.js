/* Notifications. The alert engine is pure and lives in alerts.js; this file
   runs it, persists what it produced, and shows the results.

   The engine returns only alerts whose fingerprint is not already in the
   fired registry, so evaluate can be called on every refresh without ever
   producing a duplicate. */

var Notifications = (function () {

  var el = UI.el;

  function money(paise) {
    var p = Store.get().profile;
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  /* Called from App.refresh, so any change that could cross a threshold is
     evaluated immediately after it lands. */
  function evaluate() {
    var s = Store.get();
    var today = Dates.today();
    var monthPeriod = Dates.monthPeriod(today);
    var weekPeriod = Dates.weekPeriod(today, s.profile.weekStartsOn);

    var monthlyBudget = Budget.resolveForPeriod(s.budgets, monthPeriod);
    var weeklyBudget = Budget.resolveForPeriod(s.budgets, weekPeriod);

    var fresh = Alerts.evaluate({
      monthly: Budget.progress(monthlyBudget ? monthlyBudget.amount : null, s.expenses, monthPeriod),
      weekly: Budget.progress(weeklyBudget ? weeklyBudget.amount : null, s.expenses, weekPeriod),
      debtViews: Debts.views(s.debts, s.repayments, today),
      goalViews: Goals.views(s.goals, s.contributions, today),
      settings: s.settings,
      today: today,
      fired: s.firedAlerts
    });

    if (!fresh.length) return 0;

    fresh.forEach(function (a) {
      s.notifications.unshift({
        id: Store.nextId("note"),
        type: a.type,
        tone: a.tone,
        title: a.title,
        body: a.body,
        relatedId: a.relatedId || "",
        periodKey: a.periodKey || "",
        createdAt: new Date().toISOString(),
        readAt: ""
      });
      /* The fingerprint goes into the registry in the same write, which is
         what stops the same alert firing twice. */
      s.firedAlerts[a.fingerprint] = today;
    });

    /* Older than the last fifty is noise nobody will scroll to. */
    if (s.notifications.length > 50) s.notifications.length = 50;

    Store.save();
    return fresh.length;
  }

  function unreadCount() {
    return Store.get().notifications.filter(function (n) { return !n.readAt; }).length;
  }

  function toneClass(tone) {
    return tone === "danger" ? "pill--danger" : tone === "warn" ? "pill--warn"
         : tone === "ok" ? "pill--ok" : "pill--sunken";
  }

  function open() {
    var s = Store.get();
    var list = s.notifications;
    var body = el("div.sheet-form");

    if (!list.length) {
      body.appendChild(el("div.empty",
        el("h2", { text: "Nothing to tell you" }),
        el("p", { text: "Plutus speaks up when you cross a budget threshold, or when money you lent falls due." })
      ));
    } else {
      list.forEach(function (n) {
        body.appendChild(el("div.note-row" + (n.readAt ? "" : ".is-unread"),
          el("div.row",
            el("span.row-tx",
              el("b", { text: n.title }),
              el("span", { text: n.body })
            ),
            el("span.pill." + toneClass(n.tone), { text: relative(n.createdAt) })
          )
        ));
      });
      body.appendChild(el("button.btn.btn--soft", {
        type: "button",
        onclick: function () {
          Store.get().notifications.length = 0;
          Store.save();
          UI.closeSheet();
          App.refresh();
        }
      }, "Clear all"));
    }

    /* Opening the centre marks everything read: the badge exists to say
       "there is something new", and there no longer is. */
    var now = new Date().toISOString();
    var changed = false;
    list.forEach(function (n) { if (!n.readAt) { n.readAt = now; changed = true; } });
    if (changed) Store.save();

    UI.openSheet({
      title: "Notifications", content: body,
      onClose: function () { App.refresh(); }
    });
  }

  function relative(iso) {
    var then = String(iso).slice(0, 10);
    var today = Dates.today();
    if (then === today) return "Today";
    if (then === Dates.addDays(today, -1)) return "Yesterday";
    return Dates.formatDisplay(then, today);
  }

  return { evaluate: evaluate, open: open, unreadCount: unreadCount };
})();
