/* Expense querying. Pure.

   One filter pipeline, used by the history screen, the insights screen, the
   budget maths and any export. If two of them filtered separately they would
   eventually disagree, and a user would see one total on one screen and a
   different total on another. */

var Expenses = (function () {

  function inPeriod(list, period) {
    return (list || []).filter(function (e) {
      return Dates.isValid(e.date) && Dates.isWithin(e.date, period);
    });
  }

  function matchesText(e, needle, categoriesById) {
    if (!needle) return true;
    var hay = [
      e.note || "",
      e.merchant || "",
      categoriesById && categoriesById[e.categoryId] ? categoriesById[e.categoryId].name : ""
    ].join(" ").toLowerCase();
    return hay.indexOf(needle) !== -1;
  }

  function query(list, q, categoriesById) {
    q = q || {};
    var needle = q.search ? String(q.search).trim().toLowerCase() : "";
    var out = (list || []).filter(function (e) {
      if (!matchesText(e, needle, categoriesById)) return false;
      if (q.categoryIds && q.categoryIds.length && q.categoryIds.indexOf(e.categoryId) === -1) return false;
      if (q.paymentMethods && q.paymentMethods.length &&
          q.paymentMethods.indexOf(e.paymentMethod || "other") === -1) return false;
      if (q.from && Dates.compare(e.date, q.from) < 0) return false;
      if (q.to && Dates.compare(e.date, q.to) > 0) return false;
      if (typeof q.minAmount === "number" && e.amount < q.minAmount) return false;
      if (typeof q.maxAmount === "number" && e.amount > q.maxAmount) return false;
      return true;
    });

    var by = q.sortBy === "amount" ? "amount" : "date";
    var dir = q.sortDir === "asc" ? 1 : -1;
    out.sort(function (a, b) {
      var av = by === "amount" ? a.amount : a.date;
      var bv = by === "amount" ? b.amount : b.date;
      if (av === bv) {
        /* A stable tiebreak, so two expenses on the same day never swap
           places between renders. */
        return String(a.createdAt || a.id) < String(b.createdAt || b.id) ? 1 * dir : -1 * dir;
      }
      return av < bv ? -1 * dir : 1 * dir;
    });
    return out;
  }

  /* [{ date, items, total }], newest day first, for the history screen. */
  function groupByDay(list) {
    var buckets = {};
    var order = [];
    (list || []).forEach(function (e) {
      if (!buckets[e.date]) { buckets[e.date] = []; order.push(e.date); }
      buckets[e.date].push(e);
    });
    order.sort(function (a, b) { return a < b ? 1 : a > b ? -1 : 0; });
    return order.map(function (d) {
      return {
        date: d,
        items: buckets[d],
        total: Money.sum(buckets[d], function (e) { return e.amount; })
      };
    });
  }

  /* One entry per day of the period, zeros included, for the day by day
     chart on Home. The chart must show a flat Wednesday, not skip it. */
  function dailyTotals(list, period) {
    var totals = {};
    inPeriod(list, period).forEach(function (e) {
      totals[e.date] = (totals[e.date] || 0) + (Number(e.amount) || 0);
    });
    var days = [];
    for (var i = 0; i < period.totalDays; i++) {
      var d = Dates.addDays(period.start, i);
      days.push({ date: d, total: totals[d] || 0 });
    }
    return days;
  }

  return {
    inPeriod: inPeriod,
    query: query,
    groupByDay: groupByDay,
    dailyTotals: dailyTotals
  };
})();
