/* The add expense sheet. The most used screen in the app.

   This is the product. If recording what you just spent takes more than a
   couple of seconds nobody keeps it up, and every figure in Plutus becomes
   wrong. So: the amount is focused the moment the sheet opens, the category is
   one tap, the date defaults to today, and everything else is behind "More".

   The same sheet edits an existing expense, prefilled, with delete inside it.
   One form, not two that can drift apart. */

var SheetExpense = (function () {

  var el = UI.el;

  function money(paise) {
    var p = Store.get().profile;
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  function open(expenseId) {
    var existing = expenseId ? Store.byId("expenses", expenseId) : null;
    var today = Dates.today();

    var draft = {
      amount: existing ? existing.amount : null,
      categoryId: existing ? existing.categoryId : lastUsedCategoryId(),
      date: existing ? existing.date : today,
      note: existing ? existing.note || "" : "",
      merchant: existing ? existing.merchant || "" : "",
      paymentMethod: existing ? existing.paymentMethod || "" : ""
    };

    var errorSlot = el("p.form-error", { hidden: true });
    var form = el("div.sheet-form");

    /* ── amount, the hero ── */
    var symbol = Store.get().profile.currencySymbol;
    var amountInput = el("input.amount-input", {
      type: "text", inputmode: "decimal", autocomplete: "off",
      "aria-label": "Amount", placeholder: "0",
      value: draft.amount ? String(Money.toRupees(draft.amount)) : ""
    });
    amountInput.addEventListener("input", function () {
      var parsed = Money.parseInput(amountInput.value);
      draft.amount = parsed;
      clearError();
    });
    form.appendChild(el("div.amount-row",
      el("span.amount-sym", { text: symbol }),
      amountInput
    ));

    /* ── category, one tap ── */
    var catRow = el("div.chip-row", { role: "group", "aria-label": "Category" });
    function paintCategories() {
      UI.clear(catRow);
      Actions.categories().forEach(function (c) {
        var on = c.id === draft.categoryId;
        catRow.appendChild(el("button.chip" + (on ? ".is-on" : ""), {
          type: "button", "aria-pressed": on ? "true" : "false",
          onclick: function () { draft.categoryId = c.id; paintCategories(); clearError(); }
        },
          el("span.chip-dot", { style: { color: "var(--cat-" + c.tint + ")" } }, UI.icon(c.icon, 13)),
          el("span", { text: c.name })
        ));
      });
      catRow.appendChild(el("button.chip.chip--new", {
        type: "button", onclick: newCategory
      }, UI.icon("ic-plus", 13), el("span", { text: "New" })));
    }
    paintCategories();
    form.appendChild(catRow);

    /* ── date: two taps for the common cases, a picker for the rest ── */
    var dateInput = el("input.field-input", { type: "date", value: draft.date, "aria-label": "Date", max: today });
    dateInput.addEventListener("change", function () {
      draft.date = dateInput.value;
      paintDate();
      clearError();
    });
    var dateQuick = el("div.seg", { role: "group", "aria-label": "Date" });
    function paintDate() {
      UI.clear(dateQuick);
      [["Today", today], ["Yesterday", Dates.addDays(today, -1)]].forEach(function (o) {
        var on = draft.date === o[1];
        dateQuick.appendChild(el("button", {
          type: "button", "aria-selected": on ? "true" : "false",
          onclick: function () { draft.date = o[1]; dateInput.value = o[1]; paintDate(); }
        }, o[0]));
      });
      var custom = draft.date !== today && draft.date !== Dates.addDays(today, -1);
      dateQuick.appendChild(el("button", {
        type: "button", "aria-selected": custom ? "true" : "false",
        onclick: function () { if (dateInput.showPicker) dateInput.showPicker(); else dateInput.focus(); }
      }, custom ? Dates.formatDisplay(draft.date, today) : "Another day"));
    }
    paintDate();
    form.appendChild(dateQuick);
    form.appendChild(el("div.field-hidden", dateInput));

    /* ── everything optional, folded away ── */
    var more = el("div.more-fields", { hidden: true });
    var noteInput = el("input.field-input", {
      type: "text", value: draft.note, placeholder: "What was it for?", "aria-label": "Note", maxlength: 200
    });
    noteInput.addEventListener("input", function () { draft.note = noteInput.value; });

    var merchantInput = el("input.field-input", {
      type: "text", value: draft.merchant, placeholder: "Where", "aria-label": "Merchant", maxlength: 60
    });
    merchantInput.addEventListener("input", function () { draft.merchant = merchantInput.value; });

    var payRow = el("div.chip-row", { role: "group", "aria-label": "Payment method" });
    function paintPay() {
      UI.clear(payRow);
      CONFIG.PAYMENT_METHODS.forEach(function (m) {
        var on = draft.paymentMethod === m;
        payRow.appendChild(el("button.chip" + (on ? ".is-on" : ""), {
          type: "button", "aria-pressed": on ? "true" : "false",
          onclick: function () { draft.paymentMethod = on ? "" : m; paintPay(); }
        }, el("span", { text: m === "upi" ? "UPI" : m.charAt(0).toUpperCase() + m.slice(1) })));
      });
    }
    paintPay();

    more.appendChild(el("label.field", el("span.field-label", { text: "Note" }), noteInput));
    more.appendChild(el("label.field", el("span.field-label", { text: "Merchant" }), merchantInput));
    more.appendChild(el("div.field", el("span.field-label", { text: "Paid with" }), payRow));

    var moreToggle = el("button.more-toggle", {
      type: "button",
      onclick: function () {
        more.hidden = !more.hidden;
        moreToggle.textContent = more.hidden ? "More details" : "Fewer details";
      }
    }, "More details");
    form.appendChild(moreToggle);
    form.appendChild(more);
    form.appendChild(errorSlot);

    /* ── actions ── */
    form.appendChild(el("button.btn", { type: "button", onclick: submit },
      existing ? "Save changes" : "Add expense"));

    if (existing) {
      form.appendChild(el("button.btn.btn--danger", {
        type: "button",
        onclick: function () {
          UI.closeSheet();
          UI.confirmAction({
            title: "Delete this expense?",
            body: money(existing.amount) + " on " + Dates.formatDisplay(existing.date, today) +
                  ". Every figure that included it will update.",
            confirmLabel: "Delete", danger: true,
            onConfirm: function () {
              var r = Actions.removeExpense(existing.id);
              UI.toast(r.ok ? "Expense deleted" : "Could not delete that");
            }
          });
        }
      }, "Delete expense"));
    }

    function clearError() { errorSlot.hidden = true; }
    function showError(errors) {
      var first = errors.amount || errors.categoryId || errors.date ||
                  errors.note || errors.merchant || errors._ || "Check the details.";
      errorSlot.textContent = first;
      errorSlot.hidden = false;
    }

    function submit() {
      var payload = {
        amount: draft.amount, categoryId: draft.categoryId, date: draft.date,
        note: draft.note, merchant: draft.merchant, paymentMethod: draft.paymentMethod
      };
      var r = existing ? Actions.updateExpense(existing.id, payload) : Actions.addExpense(payload);
      if (!r.ok) { showError(r.errors); return; }
      UI.closeSheet();
      UI.toast(existing ? "Expense updated" : money(payload.amount) + " added");
    }

    /* Creating a category without leaving the flow. Someone halfway through
       recording a coffee should not have to abandon it to go and make a
       "Coffee" category in Settings. */
    function newCategory() {
      var nameInput = el("input.field-input", { type: "text", placeholder: "Category name", "aria-label": "Category name", maxlength: 30 });
      var err = el("p.form-error", { hidden: true });
      var tint = CONFIG.TINTS[Store.get().categories.length % CONFIG.TINTS.length];

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

      UI.openSheet({
        title: "New category",
        content: el("div.sheet-form",
          el("label.field", el("span.field-label", { text: "Name" }), nameInput),
          el("div.field", el("span.field-label", { text: "Colour" }), tintRow),
          err,
          el("button.btn", {
            type: "button",
            onclick: function () {
              var r = Actions.addCategory({ name: nameInput.value, tint: tint, icon: "ic-dots" });
              if (!r.ok) { err.textContent = r.errors.name || r.errors.tint || "Check that."; err.hidden = false; return; }
              draft.categoryId = r.value.id;
              UI.closeSheet();
              paintCategories();
            }
          }, "Create and use it")
        )
      });
      setTimeout(function () { nameInput.focus(); }, 60);
    }

    UI.openSheet({ title: existing ? "Edit expense" : "New expense", content: form });
    setTimeout(function () { amountInput.focus(); }, 60);
  }

  /* The category you used last is almost always the one you want next. */
  function lastUsedCategoryId() {
    var list = Store.get().expenses;
    if (list.length) {
      var newest = list[list.length - 1];
      if (Store.byId("categories", newest.categoryId)) return newest.categoryId;
    }
    var cats = Actions.categories();
    return cats.length ? cats[0].id : null;
  }

  return { open: open };
})();
