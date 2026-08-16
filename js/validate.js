/* Validation. Pure.

   Every rule is called twice on purpose: by the form, which shows friendly
   inline messages, and by the store action, which refuses to write an invalid
   record even if a caller skipped the form. The second call is what keeps bad
   data out when a future screen forgets the first.

   Messages are written for the person reading them. They say what is wrong
   and what to do, never "invalid input". */

var Validate = (function () {

  var MAX_AMOUNT = 100000000000; /* one hundred crore in paise. a sanity bound,
                                    not a limit anyone will meet honestly */

  function result(errors) {
    return Object.keys(errors).length ? { ok: false, errors: errors } : { ok: true };
  }

  function checkAmount(errors, amount, field, label) {
    var n = Number(amount);
    if (amount === null || amount === undefined || amount === "" || !isFinite(n)) {
      errors[field] = "Enter " + label + ".";
    } else if (n <= 0) {
      errors[field] = label.charAt(0).toUpperCase() + label.slice(1) + " must be more than zero.";
    } else if (n > MAX_AMOUNT) {
      errors[field] = "That is larger than this app can handle. Check the figure.";
    } else if (Math.round(n) !== n) {
      errors[field] = "Amounts are whole paise.";
    }
  }

  function checkDate(errors, date, field, opts) {
    opts = opts || {};
    if (!date) { errors[field] = "Choose a date."; return; }
    if (!Dates.isValid(date)) { errors[field] = "That is not a real date."; return; }
    if (opts.today && Dates.compare(date, opts.today) > 0) {
      errors[field] = "That date is in the future.";
    }
    if (opts.notBefore && Dates.compare(date, opts.notBefore) < 0) {
      errors[field] = opts.notBeforeMessage || "That date is too early.";
    }
  }

  function expense(draft, categories, todayISO) {
    var errors = {};
    checkAmount(errors, draft.amount, "amount", "an amount");
    checkDate(errors, draft.date, "date", { today: todayISO });

    if (!draft.categoryId) errors.categoryId = "Pick a category.";
    else {
      var found = (categories || []).some(function (c) { return c.id === draft.categoryId; });
      if (!found) errors.categoryId = "That category no longer exists.";
    }

    if (draft.note && String(draft.note).length > 200) {
      errors.note = "Keep the note under 200 characters.";
    }
    if (draft.merchant && String(draft.merchant).length > 60) {
      errors.merchant = "Keep this under 60 characters.";
    }
    if (draft.paymentMethod && CONFIG.PAYMENT_METHODS.indexOf(draft.paymentMethod) === -1) {
      errors.paymentMethod = "Pick one of the listed payment methods.";
    }
    return result(errors);
  }

  /* A budget below what has already been spent is allowed, because it is
     sometimes the honest number. The caller warns rather than blocks. */
  function budget(draft) {
    var errors = {};
    checkAmount(errors, draft.amount, "amount", "a budget");
    if (draft.period !== "monthly" && draft.period !== "weekly") {
      errors.period = "A budget is either monthly or weekly.";
    }
    if (draft.effectiveFrom) checkDate(errors, draft.effectiveFrom, "effectiveFrom", {});
    return result(errors);
  }

  function category(draft, existing) {
    var errors = {};
    var name = String(draft.name || "").trim();
    if (!name) errors.name = "Give the category a name.";
    else if (name.length > 30) errors.name = "Keep the name under 30 characters.";
    else {
      var clash = (existing || []).some(function (c) {
        return c.id !== draft.id && !c.isArchived &&
               c.name.trim().toLowerCase() === name.toLowerCase();
      });
      if (clash) errors.name = "You already have a category with that name.";
    }
    if (draft.tint && CONFIG.TINTS.indexOf(draft.tint) === -1) {
      errors.tint = "Pick one of the available colours.";
    }
    return result(errors);
  }

  function debt(draft, todayISO) {
    var errors = {};
    var name = String(draft.personName || "").trim();
    if (!name) errors.personName = "Who is this with?";
    else if (name.length > 50) errors.personName = "Keep the name under 50 characters.";

    if (draft.direction !== "lent" && draft.direction !== "borrowed") {
      errors.direction = "Say whether you lent this or borrowed it.";
    }
    checkAmount(errors, draft.originalAmount, "originalAmount", "an amount");
    checkDate(errors, draft.date, "date", { today: todayISO });

    if (draft.dueDate) {
      checkDate(errors, draft.dueDate, "dueDate", {
        notBefore: draft.date,
        notBeforeMessage: "The due date cannot be before the date of the loan."
      });
    }
    if (draft.note && String(draft.note).length > 200) {
      errors.note = "Keep the note under 200 characters.";
    }
    return result(errors);
  }

  /* Delegates the balance rule to debts.js so there is one definition of what
     a repayment may be, not two that can drift apart. */
  function repayment(draft, debtView) {
    var errors = {};
    if (!debtView) { errors.amount = "That record no longer exists."; return result(errors); }

    var check = Debts.canAcceptRepayment(debtView, draft.amount, draft.date);
    if (!check.ok) for (var k in check.errors) errors[k] = check.errors[k];
    if (!draft.date) errors.date = "Choose a date.";
    return result(errors);
  }

  function goal(draft, todayISO) {
    var errors = {};
    var name = String(draft.name || "").trim();
    if (!name) errors.name = "What are you saving for?";
    else if (name.length > 40) errors.name = "Keep the name under 40 characters.";

    checkAmount(errors, draft.targetAmount, "targetAmount", "a target");

    if (draft.targetDate) {
      if (!Dates.isValid(draft.targetDate)) errors.targetDate = "That is not a real date.";
      else if (todayISO && Dates.compare(draft.targetDate, todayISO) < 0) {
        errors.targetDate = "Pick a date in the future.";
      }
    }
    return result(errors);
  }

  function contribution(draft, goalView) {
    var errors = {};
    if (!goalView) { errors.amount = "That goal no longer exists."; return result(errors); }
    var check = Goals.canAcceptContribution(goalView, draft.amount, draft.date);
    if (!check.ok) for (var k in check.errors) errors[k] = check.errors[k];
    if (!draft.date) errors.date = "Choose a date.";
    return result(errors);
  }

  function recurring(draft, categories) {
    var errors = {};
    checkAmount(errors, draft.amount, "amount", "an amount");
    if (!draft.categoryId) errors.categoryId = "Pick a category.";
    else if (!(categories || []).some(function (c) { return c.id === draft.categoryId; })) {
      errors.categoryId = "That category no longer exists.";
    }
    if (["weekly", "monthly", "yearly"].indexOf(draft.frequency) === -1) {
      errors.frequency = "Choose weekly, monthly or yearly.";
    }
    checkDate(errors, draft.startDate, "startDate", {});
    if (draft.endDate) {
      checkDate(errors, draft.endDate, "endDate", {
        notBefore: draft.startDate,
        notBeforeMessage: "The end date cannot be before the start date."
      });
    }
    return result(errors);
  }

  function profile(draft) {
    var errors = {};
    if (draft.name !== undefined && String(draft.name).length > 40) {
      errors.name = "Keep the name under 40 characters.";
    }
    if (draft.currencyCode !== undefined) {
      var known = CONFIG.CURRENCIES.some(function (c) { return c.code === draft.currencyCode; });
      if (!known) errors.currencyCode = "Pick one of the listed currencies.";
    }
    if (draft.weekStartsOn !== undefined && draft.weekStartsOn !== 0 && draft.weekStartsOn !== 1) {
      errors.weekStartsOn = "A week starts on Sunday or Monday.";
    }
    return result(errors);
  }

  return {
    expense: expense, budget: budget, category: category,
    debt: debt, repayment: repayment,
    goal: goal, contribution: contribution,
    recurring: recurring, profile: profile,
    MAX_AMOUNT: MAX_AMOUNT
  };
})();
