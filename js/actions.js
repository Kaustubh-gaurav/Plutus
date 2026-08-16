/* Actions. The only way anything is written.

   This sits between the screens and the store: it validates with the logic
   layer, mutates through the store, then tells the app to re render. Screens
   never call Store.insert directly, so there is exactly one path from an
   intention to a saved record, and every one of them is validated.

   Every action returns { ok: true, value } or { ok: false, errors }, so a form
   can show inline messages rather than guessing what went wrong. */

var Actions = (function () {

  function fail(errors) { return { ok: false, errors: errors }; }

  function saved(result, value) {
    /* The store reports whether the write actually landed. A refused write is
       never swallowed: the user is told, and told in a banner that stays. */
    if (result && result.ok === false && result.error) return fail({ _: result.error });
    if (!Store.save()) {
      UI.banner("This device would not let Plutus save. Recent changes are only in memory.");
      return { ok: true, value: value, persisted: false };
    }
    UI.clearBanner();
    return { ok: true, value: value, persisted: true };
  }

  function categories() { return Store.get().categories.filter(function (c) { return !c.isArchived; }); }

  function miscellaneousId() {
    var all = Store.get().categories;
    for (var i = 0; i < all.length; i++) {
      if (all[i].name.toLowerCase() === "miscellaneous") return all[i].id;
    }
    return all.length ? all[0].id : null;
  }

  /* ── expenses ───────────────────────────────────────────── */

  function addExpense(draft) {
    var today = Dates.today();
    var check = Validate.expense(draft, categories(), today);
    if (!check.ok) return fail(check.errors);

    var r = Store.insert("expenses", {
      amount: draft.amount,
      categoryId: draft.categoryId,
      date: draft.date,
      note: (draft.note || "").trim(),
      merchant: (draft.merchant || "").trim(),
      paymentMethod: draft.paymentMethod || "",
      recurringId: draft.recurringId || ""
    }, "exp");

    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function updateExpense(id, patch) {
    var existing = Store.byId("expenses", id);
    if (!existing) return fail({ _: "That expense no longer exists." });

    var merged = {
      amount: patch.amount !== undefined ? patch.amount : existing.amount,
      categoryId: patch.categoryId !== undefined ? patch.categoryId : existing.categoryId,
      date: patch.date !== undefined ? patch.date : existing.date,
      note: patch.note !== undefined ? patch.note : existing.note,
      merchant: patch.merchant !== undefined ? patch.merchant : existing.merchant,
      paymentMethod: patch.paymentMethod !== undefined ? patch.paymentMethod : existing.paymentMethod
    };

    var check = Validate.expense(merged, categories(), Dates.today());
    if (!check.ok) return fail(check.errors);

    var r = Store.update("expenses", id, merged);
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function removeExpense(id) {
    var r = Store.remove("expenses", id);
    if (!r.ok && r.error) return fail({ _: "That expense no longer exists." });
    var out = saved(r, null);
    App.refresh();
    return out;
  }

  /* ── categories ─────────────────────────────────────────── */

  function addCategory(draft) {
    var check = Validate.category(draft, Store.get().categories);
    if (!check.ok) return fail(check.errors);

    var r = Store.insert("categories", {
      name: String(draft.name).trim(),
      icon: draft.icon || "ic-dots",
      tint: draft.tint || CONFIG.TINTS[Store.get().categories.length % CONFIG.TINTS.length],
      isDefault: false,
      isArchived: false
    }, "cat");

    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function updateCategory(id, patch) {
    var existing = Store.byId("categories", id);
    if (!existing) return fail({ _: "That category no longer exists." });
    var merged = {
      name: patch.name !== undefined ? String(patch.name).trim() : existing.name,
      icon: patch.icon !== undefined ? patch.icon : existing.icon,
      tint: patch.tint !== undefined ? patch.tint : existing.tint,
      id: id
    };
    var check = Validate.category(merged, Store.get().categories);
    if (!check.ok) return fail(check.errors);

    var r = Store.update("categories", id, { name: merged.name, icon: merged.icon, tint: merged.tint });
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  /* Deleting a category must never orphan an expense. Its expenses are
     reassigned to Miscellaneous first, in the same write, so there is no
     moment where an expense points at a category that is gone.
     A default category is archived rather than deleted, because the seed set
     is data the app relies on. */
  function removeCategory(id) {
    var cat = Store.byId("categories", id);
    if (!cat) return fail({ _: "That category no longer exists." });

    var fallback = miscellaneousId();
    if (cat.id === fallback) return fail({ _: "Miscellaneous cannot be removed, it is where other categories go." });

    var moved = 0;
    Store.get().expenses.forEach(function (e) {
      if (e.categoryId === id) { e.categoryId = fallback; moved++; }
    });
    Store.get().recurring.forEach(function (r) {
      if (r.categoryId === id) r.categoryId = fallback;
    });

    if (cat.isDefault) Store.update("categories", id, { isArchived: true });
    else Store.remove("categories", id);

    var out = saved(null, { movedExpenses: moved });
    App.refresh();
    return out;
  }

  /* ── budgets ────────────────────────────────────────────────
     Append only. A new record with today's period start, never an edit, so
     last month keeps the budget that was actually in force at the time. */

  function setBudget(period, amount) {
    var check = Validate.budget({ period: period, amount: amount });
    if (!check.ok) return fail(check.errors);

    var today = Dates.today();
    var start = period === "weekly"
      ? Dates.weekPeriod(today, Store.get().profile.weekStartsOn).start
      : Dates.monthPeriod(today).start;

    /* Setting the same period twice in one cycle replaces that record rather
       than stacking a second one with the same effectiveFrom. */
    var existing = Store.get().budgets.filter(function (b) {
      return b.period === period && b.effectiveFrom === start;
    });
    if (existing.length) {
      var r0 = Store.update("budgets", existing[0].id, { amount: amount });
      var out0 = saved(r0, r0.value);
      App.refresh();
      return out0;
    }

    var r = Store.insert("budgets", { period: period, amount: amount, effectiveFrom: start }, "bud");
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  return {
    addExpense: addExpense,
    updateExpense: updateExpense,
    removeExpense: removeExpense,
    addCategory: addCategory,
    updateCategory: updateCategory,
    removeCategory: removeCategory,
    setBudget: setBudget,
    categories: categories,
    miscellaneousId: miscellaneousId
  };
})();
