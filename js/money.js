/* Money. Pure. No DOM, no storage, no clock.

   Every amount in Plutus is an integer number of paise. Rupees exist only
   where the user types and where text is rendered. A one paisa disagreement
   between two screens destroys trust in a money app, and floating point
   arithmetic produces exactly that, so it never gets the chance. */

var Money = (function () {

  /* 1234.56 -> 123456. Rounds half up.
     The toFixed step matters: 1234.565 * 100 is 123456.49999999999 in binary
     floating point, so a bare Math.round would give 123456 and quietly lose a
     paisa. Fixing to six places first puts the value back where it belongs. */
  function toPaise(rupees) {
    var n = Number(rupees);
    if (!isFinite(n)) return 0;
    return Math.round(Number((n * 100).toFixed(6)));
  }

  function toRupees(paise) {
    return (Number(paise) || 0) / 100;
  }

  function sum(list, pick) {
    var total = 0;
    for (var i = 0; i < (list || []).length; i++) {
      var v = pick ? pick(list[i]) : list[i];
      total += Number(v) || 0;
    }
    return Math.round(total);
  }

  function clampToZero(paise) {
    var n = Number(paise) || 0;
    return n > 0 ? n : 0;
  }

  /* Returns 0 rather than NaN or Infinity when there is no whole. Every
     screen in this app can be reached before a budget exists, so this is the
     normal case and not an edge case. */
  function percentOf(part, whole) {
    var w = Number(whole) || 0;
    if (w <= 0) return 0;
    return ((Number(part) || 0) / w) * 100;
  }

  /* Indian grouping: the last three digits, then twos.
     125000 -> "1,25,000". International grouping is threes throughout. */
  function groupDigits(intString, grouping) {
    var s = String(intString);
    if (grouping !== "IN") return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (s.length <= 3) return s;
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }

  /* Decimals appear only when there are any. Most amounts people record are
     whole rupees, and ".00" on every figure is noise on a small screen. */
  function format(paise, symbol, grouping) {
    var n = Math.round(Number(paise) || 0);
    var negative = n < 0;
    n = Math.abs(n);

    var whole = Math.floor(n / 100);
    var rem = n % 100;
    var text = groupDigits(whole, grouping || "IN");
    if (rem > 0) text += "." + (rem < 10 ? "0" + rem : String(rem));

    return (negative ? "-" : "") + (symbol === undefined ? "₹" : symbol) + text;
  }

  /* For tiles and chart labels, where the full figure will not fit.
     Indian scale: thousand, lakh, crore. */
  function formatCompact(paise, symbol, grouping) {
    var n = Math.abs(Math.round(Number(paise) || 0));
    var rupees = n / 100;
    var sign = (Number(paise) || 0) < 0 ? "-" : "";
    var sym = symbol === undefined ? "₹" : symbol;

    function trim(v) {
      var s = v.toFixed(1);
      return s.slice(-2) === ".0" ? s.slice(0, -2) : s;
    }

    if (grouping !== "IN") {
      if (rupees >= 1e9) return sign + sym + trim(rupees / 1e9) + "B";
      if (rupees >= 1e6) return sign + sym + trim(rupees / 1e6) + "M";
      if (rupees >= 1e3) return sign + sym + trim(rupees / 1e3) + "K";
      return format(Math.round(n / 100) * 100, sym, grouping);
    }
    if (rupees >= 1e7) return sign + sym + trim(rupees / 1e7) + "Cr";
    if (rupees >= 1e5) return sign + sym + trim(rupees / 1e5) + "L";
    if (rupees >= 1e3) return sign + sym + trim(rupees / 1e3) + "k";
    /* Under a thousand there is nothing to abbreviate, but the paise still go:
       this is the compact form, and "829.67" next to "5k" reads as a bug. */
    return format(Math.round(n / 100) * 100, sym, grouping);
  }

  /* What someone typed, turned into paise, or null if it is not a number.
     Tolerant of the currency symbol, grouping commas, spaces and a stray
     trailing dot, because people type all of those. More than two decimal
     places is rounded rather than rejected, since refusing "10.005" helps
     nobody. */
  function parseInput(text) {
    if (typeof text === "number") return isFinite(text) ? toPaise(text) : null;
    if (typeof text !== "string") return null;

    var cleaned = text.replace(/[₹$€£,\s]/g, "");
    if (cleaned === "" || cleaned === "." || cleaned === "-") return null;
    if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;

    var n = Number(cleaned);
    if (!isFinite(n)) return null;
    return toPaise(n);
  }

  return {
    toPaise: toPaise,
    toRupees: toRupees,
    sum: sum,
    clampToZero: clampToZero,
    percentOf: percentOf,
    format: format,
    formatCompact: formatCompact,
    parseInput: parseInput
  };
})();
