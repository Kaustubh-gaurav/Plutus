/* Settings. Everything asked during onboarding, changeable, plus the things
   that did not belong in a first run flow.

   Every editor here is a sheet, per law 9. There are no inline forms on this
   screen, which is why it stays a plain list of rows no matter how much it
   grows. */

var ScreenSettings = (function () {

  var el = UI.el;

  function profile() { return Store.get().profile; }
  function money(paise) {
    var p = profile();
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  function row(label, value, onClick, danger) {
    return el("button.row.row--tap", { type: "button", onclick: onClick },
      el("span.row-tx",
        el("b", { text: label, style: danger ? { color: "var(--pl-danger-fg)" } : null }),
        value ? el("span", { text: value }) : null
      ),
      el("span.circle-btn.circle-btn--sunken", UI.icon("ic-right", 16))
    );
  }

  /* ── editors ────────────────────────────────────────────── */

  function amountSheet(opts) {
    var symbol = profile().currencySymbol;
    var value = opts.current || null;
    var err = el("p.form-error", { hidden: true });

    var input = el("input.amount-input", {
      type: "text", inputmode: "decimal", autocomplete: "off",
      "aria-label": opts.title, placeholder: "0",
      value: value ? String(Money.toRupees(value)) : ""
    });
    input.addEventListener("input", function () {
      value = Money.parseInput(input.value);
      err.hidden = true;
    });

    var body = el("div.sheet-form",
      el("div.amount-row", el("span.amount-sym", { text: symbol }), input),
      opts.help ? el("p.note", { text: opts.help }) : null,
      err,
      el("button.btn", {
        type: "button",
        onclick: function () {
          var r = opts.onSave(value);
          if (!r.ok) {
            err.textContent = r.errors.amount || r.errors._ || "Check that figure.";
            err.hidden = false;
            return;
          }
          UI.closeSheet();
          UI.toast(opts.done || "Saved");
        }
      }, "Save")
    );

    UI.openSheet({ title: opts.title, content: body });
    setTimeout(function () { input.focus(); }, 60);
  }

  function nameSheet() {
    var input = el("input.field-input", {
      type: "text", value: profile().name, placeholder: "Your name",
      "aria-label": "Your name", maxlength: 40
    });
    UI.openSheet({
      title: "Your name",
      content: el("div.sheet-form",
        el("label.field", el("span.field-label", { text: "Name" }), input),
        el("p.note", { text: "Only used to say hello. It never leaves this device." }),
        el("button.btn", {
          type: "button",
          onclick: function () {
            Store.setProfile({ name: input.value.trim() });
            Store.save();
            UI.closeSheet();
            App.refresh();
            UI.toast("Saved");
          }
        }, "Save")
      )
    });
    setTimeout(function () { input.focus(); }, 60);
  }

  function currencySheet() {
    var chosen = profile().currencyCode;
    var list = el("div.sheet-form");
    function paint() {
      UI.clear(list);
      CONFIG.CURRENCIES.forEach(function (c) {
        var on = c.code === chosen;
        list.appendChild(el("button.row.row--tap" + (on ? ".is-on" : ""), {
          type: "button",
          onclick: function () { chosen = c.code; paint(); }
        },
          el("span.badge.badge--lg", { style: { background: "var(--sunken)" } },
            el("b", { text: c.symbol, style: { "font-size": "15px" } })),
          el("span.row-tx", el("b", { text: c.name }), el("span", { text: c.code })),
          on ? el("span.pill.pill--ok", { text: "Selected" }) : null
        ));
      });
      list.appendChild(el("button.btn", {
        type: "button",
        onclick: function () {
          var c = CONFIG.CURRENCIES.filter(function (x) { return x.code === chosen; })[0];
          Store.setProfile({ currencyCode: c.code, currencySymbol: c.symbol, grouping: c.grouping });
          Store.save();
          UI.closeSheet();
          App.refresh();
          UI.toast("Now showing " + c.name);
        }
      }, "Use this currency"));
    }
    paint();
    UI.openSheet({ title: "Currency", content: list });
  }

  function weekStartSheet() {
    var chosen = profile().weekStartsOn;
    var body = el("div.sheet-form");
    function paint() {
      UI.clear(body);
      [[1, "Monday"], [0, "Sunday"]].forEach(function (o) {
        var on = chosen === o[0];
        body.appendChild(el("button.row.row--tap", {
          type: "button", onclick: function () { chosen = o[0]; paint(); }
        },
          el("span.row-tx", el("b", { text: o[1] })),
          on ? el("span.pill.pill--ok", { text: "Selected" }) : null
        ));
      });
      body.appendChild(el("p.note", { text: "Your weekly budget resets on this day. Past weeks are not rewritten." }));
      body.appendChild(el("button.btn", {
        type: "button",
        onclick: function () {
          Store.setProfile({ weekStartsOn: chosen });
          Store.save();
          UI.closeSheet();
          App.refresh();
          UI.toast("Week starts on " + (chosen === 1 ? "Monday" : "Sunday"));
        }
      }, "Save"));
    }
    paint();
    UI.openSheet({ title: "Week starts on", content: body });
  }

  /* ── categories ─────────────────────────────────────────── */

  function categorySheet(cat) {
    var name = cat ? cat.name : "";
    var tint = cat ? cat.tint : CONFIG.TINTS[Store.get().categories.length % CONFIG.TINTS.length];
    var err = el("p.form-error", { hidden: true });

    var input = el("input.field-input", {
      type: "text", value: name, placeholder: "Category name",
      "aria-label": "Category name", maxlength: 30
    });
    input.addEventListener("input", function () { name = input.value; err.hidden = true; });

    var tintRow = el("div.chip-row");
    function paintTints() {
      UI.clear(tintRow);
      CONFIG.TINTS.forEach(function (t) {
        tintRow.appendChild(el("button.tint-swatch" + (t === tint ? ".is-on" : ""), {
          type: "button", "aria-label": t, "aria-pressed": t === tint ? "true" : "false",
          style: { background: "var(--cat-" + t + ")" },
          onclick: function () { tint = t; paintTints(); }
        }));
      });
    }
    paintTints();

    var body = el("div.sheet-form",
      el("label.field", el("span.field-label", { text: "Name" }), input),
      el("div.field", el("span.field-label", { text: "Colour" }), tintRow),
      err,
      el("button.btn", {
        type: "button",
        onclick: function () {
          var r = cat
            ? Actions.updateCategory(cat.id, { name: name, tint: tint })
            : Actions.addCategory({ name: name, tint: tint, icon: "ic-dots" });
          if (!r.ok) { err.textContent = r.errors.name || r.errors.tint || "Check that."; err.hidden = false; return; }
          UI.closeSheet();
          UI.toast(cat ? "Category updated" : "Category added");
        }
      }, cat ? "Save changes" : "Add category")
    );

    if (cat && cat.id !== Actions.miscellaneousId()) {
      var used = Store.get().expenses.filter(function (e) { return e.categoryId === cat.id; }).length;
      body.appendChild(el("button.btn.btn--danger", {
        type: "button",
        onclick: function () {
          UI.closeSheet();
          UI.confirmAction({
            title: "Remove " + cat.name + "?",
            body: used
              ? used + (used === 1 ? " expense" : " expenses") + " will move to Miscellaneous. Nothing is deleted."
              : "Nothing is using it, so nothing else changes.",
            confirmLabel: "Remove", danger: true,
            onConfirm: function () {
              var r = Actions.removeCategory(cat.id);
              UI.toast(r.ok ? "Category removed" : (r.errors._ || "Could not remove that"));
            }
          });
        }
      }, cat.isDefault ? "Hide this category" : "Remove category"));
    }

    UI.openSheet({ title: cat ? "Edit category" : "New category", content: body });
    setTimeout(function () { input.focus(); }, 60);
  }

  function categoriesSheet() {
    var body = el("div.sheet-form");
    Store.get().categories.forEach(function (c) {
      if (c.isArchived) return;
      var used = Store.get().expenses.filter(function (e) { return e.categoryId === c.id; }).length;
      body.appendChild(el("button.row.row--tap", {
        type: "button", onclick: function () { UI.closeSheet(); setTimeout(function () { categorySheet(c); }, 260); }
      },
        el("span.badge.badge--lg", { style: { background: "var(--cat-" + c.tint + ")" } }, UI.icon(c.icon, 17)),
        el("span.row-tx",
          el("b", { text: c.name }),
          el("span", { text: used ? used + (used === 1 ? " expense" : " expenses") : "Not used yet" })
        ),
        el("span.circle-btn.circle-btn--sunken", UI.icon("ic-right", 16))
      ));
    });
    body.appendChild(el("button.btn", {
      type: "button",
      onclick: function () { UI.closeSheet(); setTimeout(function () { categorySheet(null); }, 260); }
    }, "New category"));

    UI.openSheet({ title: "Categories", content: body });
  }

  /* ── budget history ─────────────────────────────────────────
     Append only records, shown newest first. This is the visible proof that
     changing a budget today did not rewrite last month. */

  function budgetHistorySheet() {
    var list = Store.get().budgets.slice().sort(function (a, b) {
      return Dates.compare(b.effectiveFrom, a.effectiveFrom);
    });
    var body = el("div.sheet-form");
    if (!list.length) {
      body.appendChild(el("p.note", { text: "No budgets set yet." }));
    } else {
      list.forEach(function (b) {
        body.appendChild(el("div.row",
          el("span.row-tx",
            el("b", { text: money(b.amount) + " " + b.period }),
            el("span", { text: "From " + Dates.formatDisplay(b.effectiveFrom, Dates.today()) })
          )
        ));
      });
      body.appendChild(el("p.note", { text: "Budgets are never edited, only added. Each period keeps the figure that was in force at the time." }));
    }
    UI.openSheet({ title: "Budget history", content: body });
  }

  /* ── recurring rules ────────────────────────────────────────
     A rule creates expenses; it is not an expense itself. Deleting a rule
     leaves everything it already created alone, because those were real
     spending. */

  function recurringSheet(rule) {
    var cats = Actions.categories();
    var draft = {
      amount: rule ? rule.amount : null,
      categoryId: rule ? rule.categoryId : (cats.length ? cats[0].id : null),
      frequency: rule ? rule.frequency : "monthly",
      startDate: rule ? rule.startDate : Dates.today(),
      endDate: rule ? rule.endDate || "" : "",
      note: rule ? rule.note || "" : ""
    };
    var err = el("p.form-error", { hidden: true });

    var amountInput = el("input.amount-input", {
      type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": "Amount",
      placeholder: "0", value: draft.amount ? String(Money.toRupees(draft.amount)) : ""
    });
    amountInput.addEventListener("input", function () {
      draft.amount = Money.parseInput(amountInput.value);
      err.hidden = true;
    });

    var catRow = el("div.chip-row");
    function paintCats() {
      UI.clear(catRow);
      cats.forEach(function (c) {
        var on = c.id === draft.categoryId;
        catRow.appendChild(el("button.chip" + (on ? ".is-on" : ""), {
          type: "button", "aria-pressed": on ? "true" : "false",
          onclick: function () { draft.categoryId = c.id; paintCats(); }
        },
          el("span.chip-dot", { style: { background: "var(--cat-" + c.tint + ")" } }, UI.icon(c.icon, 13)),
          el("span", { text: c.name })
        ));
      });
    }
    paintCats();

    var freqSeg = el("div.seg", { role: "group", "aria-label": "How often" });
    function paintFreq() {
      UI.clear(freqSeg);
      [["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"]].forEach(function (o) {
        var on = draft.frequency === o[0];
        freqSeg.appendChild(el("button", {
          type: "button", "aria-selected": on ? "true" : "false",
          onclick: function () { draft.frequency = o[0]; paintFreq(); }
        }, o[1]));
      });
    }
    paintFreq();

    var startInput = el("input.field-input", { type: "date", value: draft.startDate, "aria-label": "Starts" });
    startInput.addEventListener("change", function () { draft.startDate = startInput.value; });
    var endInput = el("input.field-input", { type: "date", value: draft.endDate, "aria-label": "Ends" });
    endInput.addEventListener("change", function () { draft.endDate = endInput.value; });
    var noteInput = el("input.field-input", {
      type: "text", value: draft.note, placeholder: "Rent, Netflix, gym",
      "aria-label": "Note", maxlength: 200
    });
    noteInput.addEventListener("input", function () { draft.note = noteInput.value; });

    var body = el("div.sheet-form",
      el("div.amount-row", el("span.amount-sym", { text: profile().currencySymbol }), amountInput),
      el("label.field", el("span.field-label", { text: "What is it" }), noteInput),
      catRow,
      freqSeg,
      el("label.field", el("span.field-label", { text: "Starts" }), startInput),
      el("label.field",
        el("span.field-label", { text: "Ends, optional" }), endInput,
        el("span.field-help", { text: "Leave empty and it keeps going." })
      ),
      err,
      el("button.btn", {
        type: "button",
        onclick: function () {
          var r = rule ? Actions.updateRecurring(rule.id, draft) : Actions.addRecurring(draft);
          if (!r.ok) {
            err.textContent = r.errors.amount || r.errors.categoryId || r.errors.frequency ||
                              r.errors.startDate || r.errors.endDate || "Check the details.";
            err.hidden = false;
            return;
          }
          UI.closeSheet();
          UI.toast(rule ? "Rule updated" : "Rule added, and anything already due has been recorded");
        }
      }, rule ? "Save changes" : "Add rule")
    );

    if (rule) {
      body.appendChild(el("button.btn.btn--soft", {
        type: "button",
        onclick: function () {
          Actions.updateRecurring(rule.id, { isActive: !rule.isActive });
          UI.closeSheet();
          UI.toast(rule.isActive ? "Paused" : "Running again");
        }
      }, rule.isActive ? "Pause this rule" : "Start it again"));

      body.appendChild(el("button.btn.btn--danger", {
        type: "button",
        onclick: function () {
          UI.closeSheet();
          UI.confirmAction({
            title: "Delete this rule?",
            body: "Expenses it already created stay where they are. Only the rule goes.",
            confirmLabel: "Delete", danger: true,
            onConfirm: function () { Actions.removeRecurring(rule.id); UI.toast("Rule deleted"); }
          });
        }
      }, "Delete rule"));
    }

    UI.openSheet({ title: rule ? "Edit rule" : "Recurring expense", content: body });
    setTimeout(function () { amountInput.focus(); }, 60);
  }

  function recurringListSheet() {
    var rules = Store.get().recurring;
    var byId = {};
    Store.get().categories.forEach(function (c) { byId[c.id] = c; });
    var body = el("div.sheet-form");

    if (!rules.length) {
      body.appendChild(el("p.note", { text: "Rent, subscriptions, the gym. Set one up and Plutus records it for you, including anything that fell due while the app was closed." }));
    } else {
      rules.forEach(function (r) {
        var c = byId[r.categoryId];
        body.appendChild(el("button.row.row--tap", {
          type: "button",
          onclick: function () { UI.closeSheet(); setTimeout(function () { recurringSheet(r); }, 260); }
        },
          el("span.badge.badge--lg", { style: { background: "var(--cat-" + (c ? c.tint : "stone") + ")" } },
            UI.icon(c ? c.icon : "ic-repeat", 17)),
          el("span.row-tx",
            el("b", { text: r.note || (c ? c.name : "Recurring") }),
            el("span", { text: Recurring.describe(r) + (r.isActive ? "" : " · paused") })
          ),
          el("span.row-amt", { text: money(r.amount) })
        ));
      });
    }

    body.appendChild(el("button.btn", {
      type: "button",
      onclick: function () { UI.closeSheet(); setTimeout(function () { recurringSheet(null); }, 260); }
    }, "New recurring expense"));

    UI.openSheet({ title: "Recurring", content: body });
  }

  /* ── data ───────────────────────────────────────────────────
     Storage on a device can be cleared by the user, the browser, or Android
     under pressure, and there is no copy anywhere else. Export is the only
     safety net this app has.

     An installed PWA on iOS handles downloads inconsistently, so the file is
     offered as a download AND as text that can be copied, and neither path is
     the only way out. */

  function exportSheet() {
    var backup = Store.exportAll();
    var text = JSON.stringify(backup, null, 2);
    var counts = backup.data;

    var body = el("div.sheet-form",
      el("p.note", { text: "A complete copy of everything: " +
        counts.expenses.length + " expenses, " + counts.debts.length + " records, " +
        counts.goals.length + " goals, and your settings. Keep it somewhere safe." }),

      el("button.btn", {
        type: "button",
        onclick: function () {
          var blob = new Blob([text], { type: "application/json" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = "plutus-backup-" + Dates.today() + ".json";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          UI.toast("Backup downloaded");
        }
      }, "Download the file"),

      el("button.btn.btn--soft", {
        type: "button",
        onclick: function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
              function () { UI.toast("Copied. Paste it somewhere safe."); },
              function () { UI.toast("Could not copy. Use the download instead."); }
            );
          } else {
            UI.toast("Copying is not available here. Use the download instead.");
          }
        }
      }, "Copy it instead"),

      el("button.btn.btn--soft", { type: "button", onclick: importSheet }, "Restore from a backup")
    );

    UI.openSheet({ title: "Export your data", content: body });
  }

  function importSheet() {
    var area = el("textarea.field-input.textarea", {
      rows: "6", placeholder: "Paste a backup here", "aria-label": "Backup contents"
    });
    var err = el("p.form-error", { hidden: true });

    var file = el("input", { type: "file", accept: "application/json,.json", "aria-label": "Choose a backup file" });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { area.value = String(reader.result); };
      reader.readAsText(f);
    });

    UI.openSheet({
      title: "Restore a backup",
      content: el("div.sheet-form",
        el("p.note", { text: "This replaces everything currently in Plutus on this device. There is no undo, so export what you have first if it matters." }),
        el("div.field", el("span.field-label", { text: "From a file" }), file),
        el("div.field", el("span.field-label", { text: "Or paste it" }), area),
        err,
        el("button.btn.btn--danger", {
          type: "button",
          onclick: function () {
            var parsed;
            try { parsed = JSON.parse(area.value); }
            catch (e) { err.textContent = "That is not a Plutus backup."; err.hidden = false; return; }
            var r = Store.importAll(parsed);
            if (!r.ok) { err.textContent = "That backup could not be read."; err.hidden = false; return; }
            UI.closeSheet();
            App.refresh();
            UI.toast("Restored");
          }
        }, "Replace everything with this")
      )
    });
  }

  function resetSheet() {
    UI.confirmAction({
      title: "Erase everything?",
      body: "Every expense, record, goal and setting on this device goes, and there is no copy anywhere else. Export first if any of it matters.",
      confirmLabel: "Erase it all", danger: true,
      onConfirm: function () {
        Store.reset();
        App.refresh();
        location.hash = "#/";
        location.reload();
      }
    });
  }

  /* ── notification preferences ───────────────────────────── */

  function notificationSheet() {
    var st = Store.get().settings;
    var body = el("div.sheet-form");

    function toggleRow(label, help, key) {
      var on = st[key] !== false;
      return el("button.row.row--tap", {
        type: "button",
        onclick: function () {
          var patch = {};
          patch[key] = !on;
          Store.setSettings(patch);
          Store.save();
          UI.closeSheet();
          setTimeout(notificationSheet, 240);
          App.refresh();
        }
      },
        el("span.row-tx", el("b", { text: label }), el("span", { text: help })),
        el("span.pill." + (on ? "pill--ok" : "pill--sunken"), { text: on ? "On" : "Off" })
      );
    }

    body.appendChild(toggleRow("Notifications", "The master switch for everything below", "notifications"));
    body.appendChild(toggleRow("Budget alerts", "When you cross 50, 75, 90 and 100 percent", "budgetAlerts"));
    body.appendChild(toggleRow("Due date reminders", "When money you lent or owe falls due", "dueReminders"));
    body.appendChild(el("p.note", { text: "Each alert is said once per period. Crossing the same threshold again in the same month stays quiet." }));

    UI.openSheet({ title: "Notifications", content: body });
  }

  /* ── the screen ─────────────────────────────────────────── */

  function render() {
    var host = document.getElementById("screen-settings");
    if (!host) return;

    var s = Store.get();
    var p = s.profile;
    var today = Dates.today();
    var monthly = Budget.resolveForPeriod(s.budgets, Dates.monthPeriod(today));
    var weekly = Budget.resolveForPeriod(s.budgets, Dates.weekPeriod(today, p.weekStartsOn));
    var activeCats = Actions.categories().length;

    UI.clear(host);

    host.appendChild(el("header.band.band--ok",
      el("div.band-top",
        el("button.circle-btn", {
          type: "button", "aria-label": "Back to home", onclick: function () { App.go("#/"); }
        }, UI.icon("ic-back", 17)),
        el("span.band-who")
      ),
      el("h1.band-title", { text: "Settings" })
    ));

    var body = el("div.screen-body",

      el("div.card.surf--white",
        el("div.card-head", el("b", { text: "Budgets" })),
        row("Monthly budget", monthly ? money(monthly.amount) : "Not set", function () {
          amountSheet({
            title: "Monthly budget",
            current: monthly ? monthly.amount : null,
            help: "The figure you would rather not go past in a month.",
            done: "Monthly budget saved",
            onSave: function (v) { return Actions.setBudget("monthly", v); }
          });
        }),
        row("Weekly budget", weekly ? money(weekly.amount) : "Not set", function () {
          amountSheet({
            title: "Weekly budget",
            current: weekly ? weekly.amount : null,
            help: "A weekly figure catches an overspend long before the month does.",
            done: "Weekly budget saved",
            onSave: function (v) { return Actions.setBudget("weekly", v); }
          });
        }),
        row("Budget history", s.budgets.length + (s.budgets.length === 1 ? " record" : " records"), budgetHistorySheet)
      ),

      el("div.card.surf--white",
        el("div.card-head", el("b", { text: "You" })),
        row("Name", p.name || "Not set", nameSheet),
        row("Currency", p.currencyCode + "  " + p.currencySymbol, currencySheet),
        row("Week starts on", p.weekStartsOn === 1 ? "Monday" : "Sunday", weekStartSheet)
      ),

      el("div.card.surf--white",
        el("div.card-head", el("b", { text: "Spending" })),
        row("Categories", activeCats + " in use", categoriesSheet),
        row("Recurring expenses",
            s.recurring.length ? s.recurring.length + (s.recurring.length === 1 ? " rule" : " rules") : "None yet",
            recurringListSheet),
        row("Goals", s.goals.length ? s.goals.length + (s.goals.length === 1 ? " goal" : " goals") : "None yet",
            function () { App.go("#/goals"); })
      ),

      el("div.card.surf--white",
        el("div.card-head", el("b", { text: "Alerts" })),
        row("Notifications",
            s.settings.notifications === false ? "Off" : "On",
            notificationSheet)
      ),

      el("div.card.surf--white",
        el("div.card-head", el("b", { text: "Your data" })),
        row("Export or restore", "A copy you can keep", exportSheet),
        row("Erase everything", "Cannot be undone", resetSheet, true)
      ),

      el("div.card.surf--cream",
        el("div.card-head", el("b", { text: "About" })),
        row("Install as an app",
            typeof Install !== "undefined" && Install.isStandalone() ? "Already installed" : "Add it to your home screen",
            function () { Install.open(); }),
        el("div.row", el("span.row-tx",
          el("b", { text: "Version" }),
          el("span", { text: "Plutus " + CONFIG.VERSION })
        )),
        el("div.row", el("span.row-tx",
          el("b", { text: "Your data" }),
          el("span", { text: "Everything stays on this device. Nothing is sent anywhere." })
        )),
        el("a.row", { href: "privacy.html" },
          el("span.row-tx", el("b", { text: "Privacy" }), el("span", { text: "What is stored, and where" })),
          el("span.circle-btn.circle-btn--sunken", UI.icon("ic-right", 16))
        )
      )
    );

    host.appendChild(body);
  }

  return { render: render };
})();
