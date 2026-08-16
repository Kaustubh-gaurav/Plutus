/* Debt sheets: create or edit a record, see its detail, add a repayment.

   The rules that matter are all in debts.js and are enforced there, not here.
   This file's job is to make them legible: the maximum a repayment can be is
   shown before it is typed, and settling in full is one tap. */

var SheetDebt = (function () {

  var el = UI.el;

  function profile() { return Store.get().profile; }
  function money(paise) {
    var p = profile();
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  /* ── create and edit ────────────────────────────────────── */

  function open(debtId, presetDirection) {
    var existing = debtId ? Store.byId("debts", debtId) : null;
    var today = Dates.today();

    var draft = {
      direction: existing ? existing.direction : (presetDirection || "lent"),
      personName: existing ? existing.personName : "",
      originalAmount: existing ? existing.originalAmount : null,
      date: existing ? existing.date : today,
      dueDate: existing ? existing.dueDate || "" : "",
      note: existing ? existing.note || "" : ""
    };

    var err = el("p.form-error", { hidden: true });
    function fail(errors) {
      err.textContent = errors.personName || errors.originalAmount || errors.date ||
                        errors.dueDate || errors.note || errors._ || "Check the details.";
      err.hidden = false;
    }

    var dirSeg = el("div.seg", { role: "group", "aria-label": "Direction" });
    function paintDir() {
      UI.clear(dirSeg);
      [["lent", "I lent it"], ["borrowed", "I borrowed it"]].forEach(function (o) {
        var on = draft.direction === o[0];
        dirSeg.appendChild(el("button", {
          type: "button", "aria-selected": on ? "true" : "false",
          onclick: function () { draft.direction = o[0]; paintDir(); }
        }, o[1]));
      });
    }
    paintDir();

    var amountInput = el("input.amount-input", {
      type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": "Amount",
      placeholder: "0", value: draft.originalAmount ? String(Money.toRupees(draft.originalAmount)) : ""
    });
    amountInput.addEventListener("input", function () {
      draft.originalAmount = Money.parseInput(amountInput.value);
      err.hidden = true;
    });

    var nameInput = el("input.field-input", {
      type: "text", value: draft.personName, placeholder: "Their name",
      "aria-label": "Their name", maxlength: 50
    });
    nameInput.addEventListener("input", function () { draft.personName = nameInput.value; err.hidden = true; });

    var dateInput = el("input.field-input", { type: "date", value: draft.date, max: today, "aria-label": "Date" });
    dateInput.addEventListener("change", function () { draft.date = dateInput.value; });

    var dueInput = el("input.field-input", { type: "date", value: draft.dueDate, "aria-label": "Due date" });
    dueInput.addEventListener("change", function () { draft.dueDate = dueInput.value; });

    var noteInput = el("input.field-input", {
      type: "text", value: draft.note, placeholder: "What was it for?", "aria-label": "Note", maxlength: 200
    });
    noteInput.addEventListener("input", function () { draft.note = noteInput.value; });

    var form = el("div.sheet-form",
      dirSeg,
      el("div.amount-row", el("span.amount-sym", { text: profile().currencySymbol }), amountInput),
      el("label.field", el("span.field-label", { text: "Who with" }), nameInput),
      el("label.field", el("span.field-label", { text: "Date" }), dateInput),
      el("label.field",
        el("span.field-label", { text: "Due date, optional" }), dueInput,
        el("span.field-help", { text: "Without one, this is never marked overdue." })
      ),
      el("label.field", el("span.field-label", { text: "Note, optional" }), noteInput),
      err,
      el("button.btn", {
        type: "button",
        onclick: function () {
          var r = existing ? Actions.updateDebt(existing.id, draft) : Actions.addDebt(draft);
          if (!r.ok) { fail(r.errors); return; }
          if (!existing) ScreenPeople.setDirection(draft.direction);
          UI.closeSheet();
          App.refresh();
          UI.toast(existing ? "Record updated" : "Record added");
        }
      }, existing ? "Save changes" : "Add record")
    );

    if (existing) {
      form.appendChild(el("button.btn.btn--danger", {
        type: "button",
        onclick: function () {
          UI.closeSheet();
          UI.confirmAction({
            title: "Delete this record?",
            body: "Every repayment recorded against " + existing.personName + " goes with it. This cannot be undone.",
            confirmLabel: "Delete", danger: true,
            onConfirm: function () {
              var r = Actions.removeDebt(existing.id);
              UI.toast(r.ok ? "Record deleted" : "Could not delete that");
            }
          });
        }
      }, "Delete record"));
    }

    UI.openSheet({
      title: existing ? "Edit record" : (presetDirection === "borrowed" ? "Money you borrowed" : "Money you lent"),
      content: form
    });
    setTimeout(function () { amountInput.focus(); }, 60);
  }

  /* ── detail ─────────────────────────────────────────────────
     The original amount, what came back, what is left, and every repayment
     with its date. This is the screen that answers "did he still owe me
     three thousand", which is the reason the feature exists. */

  function detail(debtId) {
    var s = Store.get();
    var debt = Store.byId("debts", debtId);
    if (!debt) return;
    var today = Dates.today();
    var v = Debts.view(debt, s.repayments, today);

    var who = v.direction === "lent" ? v.personName + " owes you" : "You owe " + v.personName;

    var body = el("div.sheet-form",
      el("div.detail-hero",
        el("span.detail-label", { text: who }),
        el("b.detail-figure", { text: money(v.remaining) }),
        el("span.detail-sub", { text: "of " + money(v.originalAmount) + (v.dueDate ? " · due " + Dates.formatDisplay(v.dueDate, today) : "") })
      ),

      el("div.tiles.tiles--3",
        el("div.tile.surf--cream", el("span.tile-v", { text: money(v.originalAmount) }), el("span.tile-l", { text: "Original" })),
        el("div.tile.surf--cream", el("span.tile-v", { text: money(v.totalRepaid) }), el("span.tile-l", { text: "Paid back" })),
        el("div.tile.surf--cream", el("span.tile-v", { text: money(v.remaining) }), el("span.tile-l", { text: "Remaining" }))
      ),

      el("div.bar-wrap",
        el("div.bar-label",
          el("span", { text: Math.round(v.repaidPercent) + "% back" }),
          el("span", { text: v.label })
        ),
        el("div.bar", el("i.fill--ok", { style: { width: Math.max(v.repaidPercent, 0) + "%" } }))
      )
    );

    if (v.note) body.appendChild(el("p.note", { text: v.note }));

    if (!v.isSettled) {
      body.appendChild(el("button.btn", {
        type: "button", onclick: function () { UI.closeSheet(); setTimeout(function () { repayment(v.id); }, 260); }
      }, v.direction === "lent" ? "Record a repayment" : "Record a payment you made"));
    }

    if (v.repayments.length) {
      var list = el("div.card.surf--white",
        el("div.card-head", el("b", { text: "History" }))
      );
      v.repayments.forEach(function (r) {
        list.appendChild(el("div.row",
          el("span.badge.badge--lg", { style: { background: "var(--pl-ok-bg)" } }, UI.icon("ic-check", 16)),
          el("span.row-tx",
            el("b", { text: money(r.amount) }),
            el("span", { text: Dates.formatDisplay(r.date, today) + (r.note ? " · " + r.note : "") })
          ),
          el("button.circle-btn.circle-btn--sunken", {
            type: "button", "aria-label": "Delete this repayment",
            onclick: function (ev) {
              ev.stopPropagation();
              UI.closeSheet();
              UI.confirmAction({
                title: "Delete this repayment?",
                body: money(r.amount) + " will go back onto the outstanding balance.",
                confirmLabel: "Delete", danger: true,
                onConfirm: function () {
                  Actions.removeRepayment(r.id);
                  UI.toast("Repayment removed");
                }
              });
            }
          }, UI.icon("ic-close", 15))
        ));
      });
      body.appendChild(list);
    }

    body.appendChild(el("button.btn.btn--soft", {
      type: "button", onclick: function () { UI.closeSheet(); setTimeout(function () { open(v.id); }, 260); }
    }, "Edit this record"));

    UI.openSheet({ title: v.personName, content: body });
  }

  /* ── repayment ──────────────────────────────────────────────
     The maximum is shown before anything is typed, and settling in full is
     one tap, because that is the common case. */

  function repayment(debtId) {
    var s = Store.get();
    var debt = Store.byId("debts", debtId);
    if (!debt) return;
    var today = Dates.today();
    var v = Debts.view(debt, s.repayments, today);

    var draft = { amount: null, date: today, note: "" };
    var err = el("p.form-error", { hidden: true });

    var amountInput = el("input.amount-input", {
      type: "text", inputmode: "decimal", autocomplete: "off",
      "aria-label": "Repayment amount", placeholder: "0"
    });
    amountInput.addEventListener("input", function () {
      draft.amount = Money.parseInput(amountInput.value);
      err.hidden = true;
    });

    var dateInput = el("input.field-input", {
      type: "date", value: today, min: v.date, max: today, "aria-label": "Date"
    });
    dateInput.addEventListener("change", function () { draft.date = dateInput.value; });

    var body = el("div.sheet-form",
      el("div.amount-row", el("span.amount-sym", { text: profile().currencySymbol }), amountInput),
      el("p.note", { text: money(v.remaining) + " is still outstanding." }),
      el("button.chip", {
        type: "button",
        onclick: function () {
          draft.amount = v.remaining;
          amountInput.value = String(Money.toRupees(v.remaining));
          err.hidden = true;
        }
      }, "Settle in full, " + money(v.remaining)),
      el("label.field", el("span.field-label", { text: "Date" }), dateInput),
      err,
      el("button.btn", {
        type: "button",
        onclick: function () {
          var r = Actions.addRepayment(v.id, draft);
          if (!r.ok) {
            err.textContent = r.errors.amount || r.errors.date || r.errors._ || "Check that.";
            err.hidden = false;
            return;
          }
          UI.closeSheet();
          var after = Debts.view(Store.byId("debts", v.id), Store.get().repayments, today);
          UI.toast(after.isSettled ? "Settled in full" : money(after.remaining) + " still outstanding");
        }
      }, "Record it")
    );

    UI.openSheet({ title: v.direction === "lent" ? "Repayment from " + v.personName : "Payment to " + v.personName, content: body });
    setTimeout(function () { amountInput.focus(); }, 60);
  }

  return { open: open, detail: detail, repayment: repayment };
})();
