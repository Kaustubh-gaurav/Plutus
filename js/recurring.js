/* Recurring rules. Pure.

   The whole difficulty here is idempotence. A rule must never create the same
   expense twice, no matter how many times the app is opened, refreshed or
   restored from cache. The cursor, lastGeneratedDate, is what guarantees it:
   only dates strictly after the cursor and on or before today are returned,
   and the caller advances the cursor in the same write. */

var Recurring = (function () {

  function addMonths(iso, n) {
    var p = iso.split("-");
    var y = Number(p[0]), m = Number(p[1]) - 1, d = Number(p[2]);
    var target = new Date(y, m + n, 1);
    /* The 31st of a month followed by a 30 day month lands on the last day of
       that month rather than spilling into the next one. A rent day of the
       31st must not silently become the 1st. */
    var maxDay = Dates.daysInMonth(target.getFullYear(), target.getMonth());
    target.setDate(Math.min(d, maxDay));
    var mm = target.getMonth() + 1;
    var dd = target.getDate();
    return target.getFullYear() + "-" + (mm < 10 ? "0" + mm : mm) + "-" + (dd < 10 ? "0" + dd : dd);
  }

  function step(iso, frequency) {
    if (frequency === "weekly") return Dates.addDays(iso, 7);
    if (frequency === "yearly") return addMonths(iso, 12);
    return addMonths(iso, 1);
  }

  function nextOccurrence(rule, afterISO) {
    var date = rule.startDate;
    var guard = 0;
    while (Dates.compare(date, afterISO) <= 0 && guard++ < 5000) {
      date = step(date, rule.frequency);
    }
    if (rule.endDate && Dates.compare(date, rule.endDate) > 0) return null;
    return date;
  }

  /* Every occurrence that has fallen due and has not been created yet. */
  function generateDueOccurrences(rule, todayISO) {
    var out = [];
    if (!rule || !rule.isActive) return out;
    if (!Dates.isValid(rule.startDate)) return out;

    var cursor = rule.lastGeneratedDate || "";
    var date = rule.startDate;
    var guard = 0;

    while (Dates.compare(date, todayISO) <= 0 && guard++ < 5000) {
      var afterCursor = !cursor || Dates.compare(date, cursor) > 0;
      var beforeEnd = !rule.endDate || Dates.compare(date, rule.endDate) <= 0;
      if (afterCursor && beforeEnd) out.push(date);
      if (rule.endDate && Dates.compare(date, rule.endDate) > 0) break;
      date = step(date, rule.frequency);
    }
    return out;
  }

  function describe(rule) {
    var every = rule.frequency === "weekly" ? "Every week"
              : rule.frequency === "yearly" ? "Every year" : "Every month";
    return every + ", from " + Dates.formatDisplay(rule.startDate) +
           (rule.endDate ? " until " + Dates.formatDisplay(rule.endDate) : "");
  }

  return {
    nextOccurrence: nextOccurrence,
    generateDueOccurrences: generateDueOccurrences,
    describe: describe,
    addMonths: addMonths
  };
})();
