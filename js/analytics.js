/* Spending analysis and insights. Pure.

   Simple, transparent, rule based. No model, no scoring, no prediction. If a
   condition holds, a sentence appears. If it does not, nothing appears. The
   spec is explicit that the MVP should not attempt AI generated advice, and a
   wrong sentence about someone's money costs more than a missing one. */

var Analytics = (function () {

  function analyse(expenses, period, previousExpenses, previousPeriod) {
    var items = Expenses.inPeriod(expenses, period);
    var total = Money.sum(items, function (e) { return e.amount; });
    var count = items.length;

    var byCategoryMap = {};
    items.forEach(function (e) {
      var key = e.categoryId || "uncategorised";
      if (!byCategoryMap[key]) byCategoryMap[key] = { categoryId: key, total: 0, count: 0 };
      byCategoryMap[key].total += Number(e.amount) || 0;
      byCategoryMap[key].count += 1;
    });

    var byCategory = Object.keys(byCategoryMap).map(function (k) {
      var row = byCategoryMap[k];
      row.share = Money.percentOf(row.total, total);
      return row;
    }).sort(function (a, b) { return b.total - a.total; });

    var elapsed = period.daysElapsed > 0 ? period.daysElapsed : 0;

    var changeVsPrevious = null;
    if (previousExpenses) {
      var prevPeriod = previousPeriod || null;
      var prevTotal = prevPeriod
        ? Money.sum(Expenses.inPeriod(previousExpenses, prevPeriod), function (e) { return e.amount; })
        : Money.sum(previousExpenses, function (e) { return e.amount; });
      /* No previous spending means no comparison, rather than a meaningless
         "up 100 percent" on somebody's first month. */
      if (prevTotal > 0) changeVsPrevious = ((total - prevTotal) / prevTotal) * 100;
    }

    return {
      period: period,
      total: total,
      count: count,
      averageExpense: count > 0 ? Math.round(total / count) : 0,
      averageDailySpend: elapsed > 0 ? Math.round(total / elapsed) : 0,
      byCategory: byCategory,
      topCategory: byCategory.length ? byCategory[0] : null,
      busiestDay: busiestDay(items),
      changeVsPrevious: changeVsPrevious
    };
  }

  function busiestDay(items) {
    var totals = {};
    items.forEach(function (e) { totals[e.date] = (totals[e.date] || 0) + (Number(e.amount) || 0); });
    var best = null;
    Object.keys(totals).forEach(function (d) {
      if (!best || totals[d] > best.total) best = { date: d, total: totals[d] };
    });
    return best;
  }

  function nameOf(categories, id) {
    for (var i = 0; i < (categories || []).length; i++) {
      if (categories[i].id === id) return categories[i].name;
    }
    return "Uncategorised";
  }

  /* Each insight is a guard clause. Tone maps onto a surface, so the caller
     never picks a colour by hand. Returned newest concern first. */
  function insights(analysis, monthly, categories, symbol, grouping) {
    var out = [];
    var fmt = function (p) { return Money.format(p, symbol, grouping); };

    if (!analysis || analysis.count === 0) return out;

    if (monthly && monthly.hasBudget && monthly.status === "exceeded") {
      out.push({
        id: "over-budget", tone: "danger",
        text: "You are " + fmt(monthly.overspend) + " over your monthly budget, with " +
              monthly.period.daysLeft + " day" + (monthly.period.daysLeft === 1 ? "" : "s") + " still to go."
      });
    } else if (monthly && monthly.isPaceRisky) {
      out.push({
        id: "pace", tone: "warn",
        text: "At " + fmt(monthly.averageDailySpend) + " a day you finish the month around " +
              fmt(monthly.projectedTotal - monthly.budget) + " over. " +
              fmt(monthly.safeDailyRemaining) + " a day keeps you inside it."
      });
    } else if (monthly && monthly.hasBudget && monthly.status === "near_limit") {
      out.push({
        id: "near", tone: "warn",
        text: "You have used " + Math.round(monthly.percentUsed) + " percent of your monthly budget."
      });
    }

    if (analysis.topCategory && analysis.byCategory.length > 1) {
      out.push({
        id: "top-category", tone: "neutral",
        text: nameOf(categories, analysis.topCategory.categoryId) + " is your biggest category, " +
              fmt(analysis.topCategory.total) + ", " + Math.round(analysis.topCategory.share) +
              " percent of everything you spent."
      });
    }

    if (analysis.busiestDay && analysis.count > 3 && analysis.busiestDay.total > analysis.averageDailySpend * 2) {
      out.push({
        id: "busiest-day", tone: "neutral",
        text: Dates.formatDisplay(analysis.busiestDay.date) + " was your heaviest day, " +
              fmt(analysis.busiestDay.total) + "."
      });
    }

    if (typeof analysis.changeVsPrevious === "number") {
      var pct = Math.round(Math.abs(analysis.changeVsPrevious));
      if (pct >= 10) {
        out.push({
          id: "vs-previous", tone: analysis.changeVsPrevious < 0 ? "ok" : "neutral",
          text: analysis.changeVsPrevious < 0
            ? "You have spent " + pct + " percent less than last period."
            : "You have spent " + pct + " percent more than last period."
        });
      }
    }

    return out;
  }

  return { analyse: analyse, insights: insights, busiestDay: busiestDay };
})();
