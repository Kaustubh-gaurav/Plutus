/* Budgets and progress. Pure.

   Budgets are append only records carrying an effectiveFrom date. Changing
   this month's budget must never rewrite last month's history, so the budget
   in force for a period is the most recent record effective on or before that
   period started. Nothing is edited in place, ever. */

var Budget = (function () {

  function resolveForPeriod(budgets, period) {
    var best = null;
    for (var i = 0; i < (budgets || []).length; i++) {
      var b = budgets[i];
      if (b.period !== period.kind) continue;
      if (Dates.compare(b.effectiveFrom, period.start) > 0) continue;
      if (!best || Dates.compare(b.effectiveFrom, best.effectiveFrom) > 0) best = b;
      else if (best && b.effectiveFrom === best.effectiveFrom &&
               String(b.createdAt) > String(best.createdAt)) best = b;
    }
    return best;
  }

  /* Bands come from CONFIG so the bar colour, the status pill and the alert
     copy can never disagree about what "approaching" means. */
  function statusFromPercent(percent, hasBudget) {
    if (!hasBudget) return "no_budget";
    if (percent > CONFIG.BANDS.LIMIT) return "exceeded";
    if (percent === CONFIG.BANDS.LIMIT) return "at_limit";
    if (percent >= CONFIG.BANDS.NEAR) return "near_limit";
    if (percent >= CONFIG.BANDS.ON_TRACK) return "approaching";
    if (percent <= 0) return "starting";
    return "on_track";
  }

  /* The surface colour that goes with a status. design.md decision two: the
     Home band is the budget state, so this mapping lives in one place. */
  function surfaceForStatus(status) {
    if (status === "exceeded" || status === "at_limit") return "danger";
    if (status === "near_limit" || status === "approaching") return "warn";
    return "ok";
  }

  var LABELS = {
    no_budget: "No budget set",
    starting: "Nothing spent yet",
    on_track: "On track",
    approaching: "Approaching",
    near_limit: "Close to the limit",
    at_limit: "At the limit",
    exceeded: "Over budget"
  };

  function progress(budgetAmount, expenses, period) {
    var hasBudget = typeof budgetAmount === "number" && budgetAmount > 0;
    var budget = hasBudget ? budgetAmount : 0;

    var inPeriod = Expenses.inPeriod(expenses, period);
    var spent = Money.sum(inPeriod, function (e) { return e.amount; });

    var remaining = Money.clampToZero(budget - spent);
    var overspend = Money.clampToZero(spent - budget);
    var percentUsed = Money.percentOf(spent, budget);

    /* Guard every division. A period can be looked at before it has started,
       which makes daysElapsed zero, and a brand new user has no budget at
       all. Both are normal, and neither may produce NaN. */
    var elapsed = period.daysElapsed > 0 ? period.daysElapsed : 0;
    var averageDailySpend = elapsed > 0 ? Math.round(spent / elapsed) : 0;
    var projectedTotal = elapsed > 0 ? Math.round(averageDailySpend * period.totalDays) : spent;
    /* Floored to whole rupees, and floored rather than rounded. This is an
       allowance, not a measurement: a user who spends exactly this much every
       remaining day must land inside the budget, and rounding up would put
       them over it. */
    var safeDailyRemaining = period.daysLeft > 0
      ? Math.floor(remaining / period.daysLeft / 100) * 100
      : remaining;

    var status = statusFromPercent(percentUsed, hasBudget);

    return {
      hasBudget: hasBudget,
      budget: budget,
      spent: spent,
      remaining: remaining,
      overspend: overspend,
      percentUsed: percentUsed,
      status: status,
      label: LABELS[status],
      surface: surfaceForStatus(status),
      transactionCount: inPeriod.length,
      averageDailySpend: averageDailySpend,
      projectedTotal: projectedTotal,
      safeDailyRemaining: safeDailyRemaining,
      /* Spending fast enough to finish over budget while still inside it.
         Noticing this is the whole point of the product, so it is a first
         class figure rather than something inferred at the call site. */
      isPaceRisky: hasBudget && overspend === 0 && projectedTotal > budget,
      period: period
    };
  }

  /* How much of the bar is inside the budget, and how much is overspend.
     The overspend segment carries the hatch. Both are percentages of the
     drawn bar, not of the budget, so they always add up to 100. */
  function barSegments(p) {
    if (!p.hasBudget || p.spent <= 0) return { inside: 0, over: 0 };
    if (p.overspend <= 0) return { inside: Math.min(p.percentUsed, 100), over: 0 };
    var insideShare = (p.budget / p.spent) * 100;
    return { inside: insideShare, over: 100 - insideShare };
  }

  return {
    resolveForPeriod: resolveForPeriod,
    statusFromPercent: statusFromPercent,
    surfaceForStatus: surfaceForStatus,
    progress: progress,
    barSegments: barSegments,
    LABELS: LABELS
  };
})();
