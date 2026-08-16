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

  /* ── debts and repayments ───────────────────────────────────
     The invariants live in debts.js. These actions enforce them on the way
     in, so an invalid repayment cannot be written even by a caller that
     skipped the form. */

  function addDebt(draft) {
    var check = Validate.debt(draft, Dates.today());
    if (!check.ok) return fail(check.errors);

    var r = Store.insert("debts", {
      direction: draft.direction,
      personName: String(draft.personName).trim(),
      personContact: (draft.personContact || "").trim(),
      originalAmount: draft.originalAmount,
      date: draft.date,
      dueDate: draft.dueDate || "",
      note: (draft.note || "").trim(),
      isArchived: false
    }, "debt");

    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function updateDebt(id, patch) {
    var existing = Store.byId("debts", id);
    if (!existing) return fail({ _: "That record no longer exists." });

    var merged = {
      direction: patch.direction !== undefined ? patch.direction : existing.direction,
      personName: patch.personName !== undefined ? String(patch.personName).trim() : existing.personName,
      originalAmount: patch.originalAmount !== undefined ? patch.originalAmount : existing.originalAmount,
      date: patch.date !== undefined ? patch.date : existing.date,
      dueDate: patch.dueDate !== undefined ? patch.dueDate : existing.dueDate,
      note: patch.note !== undefined ? String(patch.note).trim() : existing.note
    };
    var check = Validate.debt(merged, Dates.today());
    if (!check.ok) return fail(check.errors);

    /* Editing the original amount below what has already come back would put
       the record into a state the maths cannot describe. */
    var repaid = Money.sum(Debts.repaymentsFor(id, Store.get().repayments), function (r) { return r.amount; });
    if (merged.originalAmount < repaid) {
      return fail({ originalAmount: "That is less than the " + Money.format(repaid) + " already repaid." });
    }

    var r = Store.update("debts", id, merged);
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  /* Deleting a debt takes its repayments with it. Leaving them behind would
     orphan records that can never be reached or corrected again. */
  function removeDebt(id) {
    var keep = Store.get().repayments.filter(function (r) { return r.debtId !== id; });
    Store.get().repayments.length = 0;
    keep.forEach(function (r) { Store.get().repayments.push(r); });

    var r = Store.remove("debts", id);
    if (!r.ok && r.error) return fail({ _: "That record no longer exists." });
    var out = saved(r, null);
    App.refresh();
    return out;
  }

  function addRepayment(debtId, draft) {
    var debt = Store.byId("debts", debtId);
    if (!debt) return fail({ _: "That record no longer exists." });

    var view = Debts.view(debt, Store.get().repayments, Dates.today());
    var check = Validate.repayment(draft, view);
    if (!check.ok) return fail(check.errors);

    var r = Store.insert("repayments", {
      debtId: debtId,
      amount: draft.amount,
      date: draft.date,
      note: (draft.note || "").trim()
    }, "rep");

    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function removeRepayment(id) {
    var r = Store.remove("repayments", id);
    if (!r.ok && r.error) return fail({ _: "That repayment no longer exists." });
    var out = saved(r, null);
    App.refresh();
    return out;
  }

  /* ── goals and contributions ────────────────────────────────
     A goal is a debt turned around, so the shape is deliberately the same. */

  function addGoal(draft) {
    var check = Validate.goal(draft, Dates.today());
    if (!check.ok) return fail(check.errors);
    var r = Store.insert("goals", {
      name: String(draft.name).trim(),
      targetAmount: draft.targetAmount,
      targetDate: draft.targetDate || "",
      note: (draft.note || "").trim()
    }, "goal");
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function updateGoal(id, patch) {
    var existing = Store.byId("goals", id);
    if (!existing) return fail({ _: "That goal no longer exists." });
    var merged = {
      name: patch.name !== undefined ? String(patch.name).trim() : existing.name,
      targetAmount: patch.targetAmount !== undefined ? patch.targetAmount : existing.targetAmount,
      targetDate: patch.targetDate !== undefined ? patch.targetDate : existing.targetDate,
      note: patch.note !== undefined ? patch.note : existing.note
    };
    var check = Validate.goal(merged, Dates.today());
    if (!check.ok) return fail(check.errors);
    var r = Store.update("goals", id, merged);
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function removeGoal(id) {
    var keep = Store.get().contributions.filter(function (c) { return c.goalId !== id; });
    Store.get().contributions.length = 0;
    keep.forEach(function (c) { Store.get().contributions.push(c); });
    var r = Store.remove("goals", id);
    if (!r.ok && r.error) return fail({ _: "That goal no longer exists." });
    var out = saved(r, null);
    App.refresh();
    return out;
  }

  function addContribution(goalId, draft) {
    var goal = Store.byId("goals", goalId);
    if (!goal) return fail({ _: "That goal no longer exists." });
    var view = Goals.view(goal, Store.get().contributions, Dates.today());
    var check = Validate.contribution(draft, view);
    if (!check.ok) return fail(check.errors);
    var r = Store.insert("contributions", {
      goalId: goalId, amount: draft.amount, date: draft.date, note: (draft.note || "").trim()
    }, "con");
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function removeContribution(id) {
    var r = Store.remove("contributions", id);
    if (!r.ok && r.error) return fail({ _: "That contribution no longer exists." });
    var out = saved(r, null);
    App.refresh();
    return out;
  }

  /* ── recurring rules ────────────────────────────────────────
     Generation is idempotent: the cursor advances in the same write as the
     expenses it created, so a double boot cannot duplicate anything. */

  function addRecurring(draft) {
    var check = Validate.recurring(draft, categories());
    if (!check.ok) return fail(check.errors);
    var r = Store.insert("recurring", {
      amount: draft.amount, categoryId: draft.categoryId, frequency: draft.frequency,
      startDate: draft.startDate, endDate: draft.endDate || "",
      note: (draft.note || "").trim(), lastGeneratedDate: "", isActive: true
    }, "rec");
    var out = saved(r, r.value);
    runRecurring();
    App.refresh();
    return out;
  }

  function updateRecurring(id, patch) {
    var existing = Store.byId("recurring", id);
    if (!existing) return fail({ _: "That rule no longer exists." });
    var r = Store.update("recurring", id, patch);
    var out = saved(r, r.value);
    App.refresh();
    return out;
  }

  function removeRecurring(id) {
    var r = Store.remove("recurring", id);
    if (!r.ok && r.error) return fail({ _: "That rule no longer exists." });
    var out = saved(r, null);
    App.refresh();
    return out;
  }

  /* Creates any occurrences that fell due while the app was closed. Running
     it twice in a row must create nothing the second time. */
  function runRecurring() {
    var today = Dates.today();
    var made = 0;
    Store.get().recurring.forEach(function (rule) {
      if (!rule.isActive) return;
      var dues = Recurring.generateDueOccurrences(rule, today);
      dues.forEach(function (date) {
        Store.insert("expenses", {
          amount: rule.amount, categoryId: rule.categoryId, date: date,
          note: rule.note || "", merchant: "", paymentMethod: "", recurringId: rule.id
        }, "exp");
        made++;
      });
      if (dues.length) {
        Store.update("recurring", rule.id, { lastGeneratedDate: dues[dues.length - 1] });
      }
    });
    if (made) Store.save();
    return made;
  }

  return {
    addExpense: addExpense,
    updateExpense: updateExpense,
    removeExpense: removeExpense,
    addDebt: addDebt,
    updateDebt: updateDebt,
    removeDebt: removeDebt,
    addRepayment: addRepayment,
    removeRepayment: removeRepayment,
    addGoal: addGoal,
    updateGoal: updateGoal,
    removeGoal: removeGoal,
    addContribution: addContribution,
    removeContribution: removeContribution,
    addRecurring: addRecurring,
    updateRecurring: updateRecurring,
    removeRecurring: removeRecurring,
    runRecurring: runRecurring,
    addCategory: addCategory,
    updateCategory: updateCategory,
    removeCategory: removeCategory,
    setBudget: setBudget,
    categories: categories,
    miscellaneousId: miscellaneousId
  };
})();
