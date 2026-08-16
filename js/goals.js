/* Savings goals. Pure.

   A goal is a debt turned around: a target, and a history of amounts put
   towards it. Contributions are their own append only records for the same
   reason repayments are, so the target is never overwritten and the user can
   see every deposit they made. One model, two directions. */

var Goals = (function () {

  function contributionsFor(goalId, contributions) {
    return (contributions || [])
      .filter(function (c) { return c.goalId === goalId; })
      .sort(function (a, b) {
        var byDate = Dates.compare(b.date, a.date);
        if (byDate !== 0) return byDate;
        var ak = String(a.createdAt || a.id), bk = String(b.createdAt || b.id);
        return ak < bk ? 1 : ak > bk ? -1 : 0;
      });
  }

  function view(goal, contributions, todayISO) {
    var mine = contributionsFor(goal.id, contributions);
    var saved = Money.sum(mine, function (c) { return c.amount; });
    var target = Number(goal.targetAmount) || 0;

    var remaining = Money.clampToZero(target - saved);
    var percent = Math.min(Money.percentOf(saved, target), 100);
    var isComplete = target > 0 && saved >= target;

    var hasTargetDate = !!goal.targetDate && Dates.isValid(goal.targetDate);
    var daysLeft = hasTargetDate ? Dates.diffDays(todayISO, goal.targetDate) : null;

    /* What they would need to put aside each month to land on time. Null
       rather than Infinity when the date has passed or there is no date, so
       the screen shows nothing instead of nonsense. */
    var perMonthNeeded = null;
    if (hasTargetDate && daysLeft > 0 && remaining > 0) {
      /* Rounded UP to whole rupees: this is what you must put aside to arrive
         on time, so rounding down would quietly miss the target. */
      perMonthNeeded = Math.ceil(remaining / Math.max(daysLeft / 30, 1) / 100) * 100;
    }

    return {
      id: goal.id,
      name: goal.name,
      targetAmount: target,
      targetDate: goal.targetDate || "",
      note: goal.note || "",
      createdAt: goal.createdAt,

      contributions: mine,
      saved: saved,
      remaining: remaining,
      percent: percent,
      isComplete: isComplete,
      daysLeft: daysLeft,
      isOverdue: hasTargetDate && !isComplete && daysLeft !== null && daysLeft < 0,
      perMonthNeeded: perMonthNeeded,
      status: isComplete ? "complete" : "saving"
    };
  }

  function views(goals, contributions, todayISO) {
    return (goals || [])
      .map(function (g) { return view(g, contributions, todayISO); })
      .sort(function (a, b) {
        if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
        if (a.daysLeft !== null && b.daysLeft !== null && a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft;
        }
        return b.percent - a.percent;
      });
  }

  /* A contribution may take a goal past its target, unlike a repayment, which
     may not exceed what is owed. Saving more than you planned is not an error. */
  function canAcceptContribution(v, amount, dateISO) {
    var errors = {};
    var amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) errors.amount = "Enter an amount greater than zero.";
    if (dateISO && !Dates.isValid(dateISO)) errors.date = "Choose a valid date.";
    return Object.keys(errors).length ? { ok: false, errors: errors } : { ok: true };
  }

  return {
    view: view,
    views: views,
    contributionsFor: contributionsFor,
    canAcceptContribution: canAcceptContribution
  };
})();
