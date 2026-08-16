/* Alerts. Pure and idempotent.

   The engine returns only alerts whose fingerprint is not already in the
   fired registry. The caller writes the returned fingerprints back and saves.
   That is the entire deduplication mechanism, and it is why crossing 75
   percent, dropping under it by deleting an expense, then crossing it again
   in the same month fires once and not twice.

   The fingerprint always carries the period key. Without it every alert would
   refire the moment the month changed, and none would fire when it should. */

var Alerts = (function () {

  function fingerprint(type, scope) {
    return type + ":" + scope;
  }

  function budgetAlerts(progress, kindLabel, settings, fired, out) {
    if (!progress.hasBudget) return;

    var thresholds = (settings.thresholds || CONFIG.DEFAULT_THRESHOLDS)
      .slice()
      .sort(function (a, b) { return a - b; });

    /* Only the highest threshold actually crossed is announced. Someone who
       records a large expense in one go should get "you are over budget", not
       four notifications in a row saying 50, 75, 90 and 100. */
    var highest = null;
    for (var i = 0; i < thresholds.length; i++) {
      if (progress.percentUsed >= thresholds[i]) highest = thresholds[i];
    }
    if (highest === null) return;

    var isOver = progress.percentUsed > CONFIG.BANDS.LIMIT;
    var type = isOver ? "budget_exceeded" : "budget_threshold_" + highest;
    var fp = fingerprint(kindLabel + "_" + type, progress.period.key);
    if (fired[fp]) return;

    out.push({
      type: type,
      fingerprint: fp,
      tone: isOver ? "danger" : highest >= CONFIG.BANDS.NEAR ? "warn" : "neutral",
      title: isOver
        ? "Over your " + kindLabel + " budget"
        : highest + " percent of your " + kindLabel + " budget used",
      body: isOver
        ? "You are over by " + Money.format(progress.overspend) + ", with " +
          progress.period.daysLeft + " day" + (progress.period.daysLeft === 1 ? "" : "s") + " left."
        : Money.format(progress.remaining) + " left for the rest of the " +
          (kindLabel === "weekly" ? "week" : "month") + ".",
      periodKey: progress.period.key
    });
  }

  function debtAlerts(debtViews, settings, fired, todayISO, out) {
    if (!settings.dueReminders) return;
    var window = typeof settings.dueReminderDays === "number"
      ? settings.dueReminderDays : CONFIG.DEFAULT_DUE_REMINDER_DAYS;

    (debtViews || []).forEach(function (v) {
      if (v.isSettled || !v.dueDate) return;

      var who = v.direction === "lent" ? v.personName + " owes you" : "You owe " + v.personName;

      if (v.daysUntilDue < 0) {
        /* Scoped to the due date, not to today, so an overdue debt announces
           itself once rather than every single morning. */
        var fpOver = fingerprint("debt_overdue", v.id + ":" + v.dueDate);
        if (fired[fpOver]) return;
        out.push({
          type: "debt_overdue", fingerprint: fpOver, tone: "danger",
          title: "Overdue: " + v.personName,
          body: who + " " + Money.format(v.remaining) + ", due " +
                Dates.formatDisplay(v.dueDate, todayISO) + ".",
          relatedId: v.id
        });
        return;
      }

      if (v.daysUntilDue <= window) {
        var fpSoon = fingerprint("debt_due_soon", v.id + ":" + v.dueDate);
        if (fired[fpSoon]) return;
        out.push({
          type: "debt_due_soon", fingerprint: fpSoon, tone: "warn",
          title: v.daysUntilDue === 0 ? "Due today: " + v.personName
                                      : "Due in " + v.daysUntilDue + " day" + (v.daysUntilDue === 1 ? "" : "s") + ": " + v.personName,
          body: who + " " + Money.format(v.remaining) + ".",
          relatedId: v.id
        });
      }
    });
  }

  function goalAlerts(goalViews, fired, out) {
    (goalViews || []).forEach(function (g) {
      if (!g.isComplete) return;
      var fp = fingerprint("goal_reached", g.id);
      if (fired[fp]) return;
      out.push({
        type: "goal_reached", fingerprint: fp, tone: "ok",
        title: g.name + " reached",
        body: "You have saved the full " + Money.format(g.targetAmount) + ".",
        relatedId: g.id
      });
    });
  }

  /* ctx: { monthly, weekly, debtViews, goalViews, settings, today, fired } */
  function evaluate(ctx) {
    var out = [];
    var settings = ctx.settings || {};
    var fired = ctx.fired || {};

    if (settings.notifications === false) return out;

    if (settings.budgetAlerts !== false) {
      if (ctx.monthly) budgetAlerts(ctx.monthly, "monthly", settings, fired, out);
      if (ctx.weekly) budgetAlerts(ctx.weekly, "weekly", settings, fired, out);
    }
    debtAlerts(ctx.debtViews, settings, fired, ctx.today, out);
    goalAlerts(ctx.goalViews, fired, out);

    return out;
  }

  return { evaluate: evaluate, fingerprint: fingerprint };
})();
