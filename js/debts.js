/* Lending and borrowing. Pure.

   The invariants of this file are the ones the product cannot afford to get
   wrong:

     originalAmount is never mutated. A repayment is always a new record.
     remaining is floored at zero and can never go negative.
     a repayment may never exceed the remaining balance.
     a debt with no due date can never be overdue.
     status is always recomputed, never stored.

   That last one is what makes deleting a repayment correctly move a debt back
   from Paid to Partially paid with no extra code anywhere. */

var Debts = (function () {

  function repaymentsFor(debtId, repayments) {
    return (repayments || [])
      .filter(function (r) { return r.debtId === debtId; })
      .sort(function (a, b) {
        var byDate = Dates.compare(b.date, a.date);
        if (byDate !== 0) return byDate;
        /* Two repayments on the same day must always come back in the same
           order, or the history list reshuffles itself between renders and
           "delete the first one" means something different each time. */
        var ak = String(a.createdAt || a.id), bk = String(b.createdAt || b.id);
        return ak < bk ? 1 : ak > bk ? -1 : 0;
      });
  }

  function view(debt, repayments, todayISO) {
    var mine = repaymentsFor(debt.id, repayments);
    var totalRepaid = Money.sum(mine, function (r) { return r.amount; });

    /* Floored, so a repayment recorded twice by mistake shows a settled debt
       rather than a negative balance the user has to interpret. */
    var remaining = Money.clampToZero(debt.originalAmount - totalRepaid);

    var hasDue = !!debt.dueDate && Dates.isValid(debt.dueDate);
    var daysUntilDue = hasDue ? Dates.diffDays(todayISO, debt.dueDate) : null;
    var isOverdue = hasDue && remaining > 0 && daysUntilDue < 0;

    var status;
    if (remaining === 0) status = "paid";
    else if (isOverdue) status = "overdue";
    else if (totalRepaid > 0) status = "partially_paid";
    else status = "pending";

    return {
      id: debt.id,
      direction: debt.direction,
      personName: debt.personName,
      personContact: debt.personContact || "",
      originalAmount: debt.originalAmount,
      date: debt.date,
      dueDate: debt.dueDate || "",
      note: debt.note || "",
      isArchived: !!debt.isArchived,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,

      repayments: mine,
      totalRepaid: totalRepaid,
      remaining: remaining,
      repaidPercent: Money.percentOf(totalRepaid, debt.originalAmount),
      status: status,
      label: LABELS[status],
      isOverdue: isOverdue,
      isSettled: remaining === 0,
      daysUntilDue: daysUntilDue,
      /* Only meaningful when a due date exists and money is still owed. */
      isDueSoon: hasDue && remaining > 0 && daysUntilDue !== null &&
                 daysUntilDue >= 0 && daysUntilDue <= CONFIG.DEFAULT_DUE_REMINDER_DAYS
    };
  }

  var LABELS = {
    pending: "Pending",
    partially_paid: "Partially paid",
    paid: "Paid in full",
    overdue: "Overdue"
  };

  function views(debts, repayments, todayISO, direction) {
    return (debts || [])
      .filter(function (d) { return !direction || d.direction === direction; })
      .map(function (d) { return view(d, repayments, todayISO); })
      .sort(function (a, b) {
        /* Settled records sink. Among the rest, overdue first, then whatever
           is due soonest, then most recent. What needs attention rises. */
        if (a.isSettled !== b.isSettled) return a.isSettled ? 1 : -1;
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        var ad = a.daysUntilDue, bd = b.daysUntilDue;
        if (ad !== null && bd !== null && ad !== bd) return ad - bd;
        if (ad !== null && bd === null) return -1;
        if (ad === null && bd !== null) return 1;
        return Dates.compare(b.date, a.date);
      });
  }

  function summary(allViews) {
    var owedToMe = 0, iOwe = 0, overdueCount = 0, dueSoonCount = 0, people = {};
    (allViews || []).forEach(function (v) {
      if (v.isSettled) return;
      if (v.direction === "lent") owedToMe += v.remaining;
      else iOwe += v.remaining;
      if (v.isOverdue) overdueCount++;
      if (v.isDueSoon) dueSoonCount++;
      people[v.direction + ":" + v.personName.toLowerCase()] = true;
    });
    return {
      totalOwedToMe: owedToMe,
      totalIOwe: iOwe,
      netPosition: owedToMe - iOwe,
      overdueCount: overdueCount,
      dueSoonCount: dueSoonCount,
      peopleCount: Object.keys(people).length
    };
  }

  /* The one rule that keeps repayments honest. Called by validate.js and by
     the store action, so an invalid repayment cannot be written even if a
     caller skips the form. */
  function canAcceptRepayment(v, amount, dateISO) {
    var errors = {};
    var amt = Number(amount);

    if (!isFinite(amt) || amt <= 0) errors.amount = "Enter an amount greater than zero.";
    else if (v.remaining <= 0) errors.amount = "This is already settled.";
    else if (amt > v.remaining) {
      errors.amount = "That is more than the " + Money.format(v.remaining) + " still outstanding.";
    }

    if (dateISO) {
      if (!Dates.isValid(dateISO)) errors.date = "Choose a valid date.";
      else if (Dates.compare(dateISO, v.date) < 0) {
        errors.date = "A repayment cannot be dated before the debt itself.";
      }
    }

    return Object.keys(errors).length ? { ok: false, errors: errors } : { ok: true };
  }

  return {
    view: view,
    views: views,
    summary: summary,
    canAcceptRepayment: canAcceptRepayment,
    repaymentsFor: repaymentsFor,
    LABELS: LABELS
  };
})();
