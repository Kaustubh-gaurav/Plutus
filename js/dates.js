/* Dates and periods. Pure, with one deliberate exception.

   Dates.today() is the ONLY clock read in the whole codebase. Every other
   function here takes today as an argument. That is what makes a month
   rollover, a week rollover and an overdue transition into a test rather than
   something you wait until next Tuesday to find out about.

   Calendar dates are "YYYY-MM-DD" strings in local time, never UTC
   timestamps. An expense recorded at 11pm on the 31st belongs to that month
   wherever the phone happens to be, and a UTC timestamp would move it. */

var Dates = (function () {

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /* Local midnight, never UTC. new Date("2026-08-16") parses as UTC and can
     land on the 15th west of Greenwich, which is exactly the sort of bug that
     shows up only for some users. */
  function toDate(iso) {
    var p = String(iso).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function fromDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function isValid(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return false;
    var d = toDate(iso);
    return fromDate(d) === iso;
  }

  function addDays(iso, n) {
    var d = toDate(iso);
    d.setDate(d.getDate() + n);
    return fromDate(d);
  }

  /* Whole days from a to b. Positive when b is later. */
  function diffDays(a, b) {
    return Math.round((toDate(b) - toDate(a)) / 86400000);
  }

  function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  function daysInMonth(year, month0) {
    return new Date(year, month0 + 1, 0).getDate();
  }

  /* ISO week number, used for the weekly period key. Thursday decides which
     year a week belongs to, which is what stops the last week of December and
     the first week of January colliding. */
  function isoWeek(iso) {
    var d = toDate(iso);
    var day = (d.getDay() + 6) % 7;          /* Monday = 0 */
    d.setDate(d.getDate() - day + 3);        /* the Thursday of this week */
    var year = d.getFullYear();
    var firstThursday = new Date(year, 0, 4);
    var fday = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - fday + 3);
    var week = 1 + Math.round((d - firstThursday) / (7 * 86400000));
    return { year: year, week: week };
  }

  function buildPeriod(kind, start, end, todayISO) {
    var totalDays = diffDays(start, end) + 1;
    var elapsed;
    if (compare(todayISO, start) < 0) elapsed = 0;
    else if (compare(todayISO, end) > 0) elapsed = totalDays;
    else elapsed = diffDays(start, todayISO) + 1;

    var key;
    if (kind === "monthly") {
      key = start.slice(0, 7);
    } else {
      var w = isoWeek(start);
      key = w.year + "-W" + pad(w.week);
    }

    return {
      kind: kind,
      key: key,
      start: start,
      end: end,
      totalDays: totalDays,
      daysElapsed: elapsed,
      daysLeft: Math.max(totalDays - elapsed, 0),
      isCurrent: compare(todayISO, start) >= 0 && compare(todayISO, end) <= 0
    };
  }

  function monthPeriod(todayISO) {
    var d = toDate(todayISO);
    var y = d.getFullYear(), m = d.getMonth();
    var start = y + "-" + pad(m + 1) + "-01";
    var end = y + "-" + pad(m + 1) + "-" + pad(daysInMonth(y, m));
    return buildPeriod("monthly", start, end, todayISO);
  }

  /* weekStartsOn: 0 Sunday, 1 Monday. Monday is the default. */
  function weekPeriod(todayISO, weekStartsOn) {
    var startsOn = weekStartsOn === 0 ? 0 : 1;
    var d = toDate(todayISO);
    var back = (d.getDay() - startsOn + 7) % 7;
    var start = addDays(todayISO, -back);
    return buildPeriod("weekly", start, addDays(start, 6), todayISO);
  }

  /* The period a given date falls in, which is how an expense finds its month
     without anything being stamped on the record. */
  function periodForDate(dateISO, kind, weekStartsOn) {
    return kind === "weekly" ? weekPeriod(dateISO, weekStartsOn) : monthPeriod(dateISO);
  }

  function isWithin(dateISO, period) {
    return compare(dateISO, period.start) >= 0 && compare(dateISO, period.end) <= 0;
  }

  function previousPeriod(period, weekStartsOn) {
    var dayBefore = addDays(period.start, -1);
    return period.kind === "weekly"
      ? weekPeriod(dayBefore, weekStartsOn)
      : monthPeriod(dayBefore);
  }

  var MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* "16 August", or "16 August 2025" when it is not the current year. */
  function formatDisplay(iso, todayISO) {
    if (!isValid(iso)) return "";
    var d = toDate(iso);
    var text = d.getDate() + " " + MONTHS[d.getMonth()];
    if (todayISO && iso.slice(0, 4) !== String(todayISO).slice(0, 4)) text += " " + d.getFullYear();
    return text;
  }

  /* "Today", "Yesterday", then the date. Day headers in the history list read
     far better this way than as three identical looking dates. */
  function formatRelativeDay(iso, todayISO) {
    if (!isValid(iso)) return "";
    if (iso === todayISO) return "Today";
    if (iso === addDays(todayISO, -1)) return "Yesterday";
    var gap = diffDays(iso, todayISO);
    if (gap > 0 && gap < 7) return DAYS[toDate(iso).getDay()];
    return formatDisplay(iso, todayISO);
  }

  function monthName(periodKey) {
    var p = String(periodKey).split("-");
    var m = Number(p[1]) - 1;
    return MONTHS[m] || "";
  }

  return {
    today: today,
    isValid: isValid,
    addDays: addDays,
    diffDays: diffDays,
    compare: compare,
    monthPeriod: monthPeriod,
    weekPeriod: weekPeriod,
    periodForDate: periodForDate,
    isWithin: isWithin,
    previousPeriod: previousPeriod,
    formatDisplay: formatDisplay,
    formatRelativeDay: formatRelativeDay,
    monthName: monthName,
    isoWeek: isoWeek,
    daysInMonth: daysInMonth
  };
})();
