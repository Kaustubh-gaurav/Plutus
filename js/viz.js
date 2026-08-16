/* Data visualisation. Hand drawn SVG, no chart library, nothing fetched.

   The reference treats data as the hero: a ring gauge, a sweeping arc with a
   glowing endpoint, small heatmap bars bleeding to a tile edge. These are
   those pieces, built once so every screen draws them identically.

   Everything here is presentation only. It takes numbers and returns nodes,
   and never decides what a number means. */

var Viz = (function () {

  var SVG = "http://www.w3.org/2000/svg";
  var uid = 0;

  function svgEl(name, attrs) {
    var n = document.createElementNS(SVG, name);
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ── ring gauge ─────────────────────────────────────────────
     A 270 degree arc, stroked twice: the track, then the value. The gap at
     the bottom is what makes it read as a gauge rather than a pie. */
  function ring(percent, opts) {
    opts = opts || {};
    var LEN = 358;                       /* the arc's own length */
    var pct = Math.max(0, Math.min(percent, 100));

    var svg = svgEl("svg", { viewBox: "0 0 200 176", class: "ring", "aria-hidden": "true" });
    var d = "M46.3,153.7 A76,76 0 1 1 153.7,153.7";

    svg.appendChild(svgEl("path", {
      d: d, fill: "none", stroke: opts.track || "var(--sunken)",
      "stroke-width": opts.width || 14, "stroke-linecap": "round"
    }));

    var value = svgEl("path", {
      d: d, fill: "none", stroke: opts.colour || "var(--s-ok)",
      "stroke-width": opts.width || 14, "stroke-linecap": "round",
      "stroke-dasharray": String(LEN),
      "stroke-dashoffset": String(LEN * (1 - pct / 100))
    });
    /* The soft bloom around the stroke, which is most of why the reference
       reads as lit rather than printed. */
    value.setAttribute("filter", "url(#ringGlow" + (++uid) + ")");
    var defs = svgEl("defs", {});
    var f = svgEl("filter", { id: "ringGlow" + uid, x: "-30%", y: "-30%", width: "160%", height: "160%" });
    f.appendChild(svgEl("feGaussianBlur", { stdDeviation: "3.4", result: "b" }));
    var merge = svgEl("feMerge", {});
    merge.appendChild(svgEl("feMergeNode", { in: "b" }));
    merge.appendChild(svgEl("feMergeNode", { in: "SourceGraphic" }));
    f.appendChild(merge);
    defs.appendChild(f);
    svg.appendChild(defs);
    svg.appendChild(value);
    return svg;
  }

  /* ── sweeping arc ───────────────────────────────────────────
     The hero curve from the reference: a line that rises left to right, with
     a lit dot at the end sitting where you are now. The height of the end
     point is the fraction given, so the curve itself carries the meaning. */
  function arc(fraction, opts) {
    opts = opts || {};
    var W = 390, H = 124;
    var f = Math.max(0, Math.min(fraction, 1));

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", "aria-hidden": "true" });
    var id = ++uid;

    var defs = svgEl("defs", {});
    var grad = svgEl("linearGradient", { id: "arcG" + id, x1: "0", y1: "0", x2: "1", y2: "0" });
    grad.appendChild(svgEl("stop", { offset: "0", "stop-color": opts.colour || "var(--s-ok)", "stop-opacity": ".15" }));
    grad.appendChild(svgEl("stop", { offset: ".55", "stop-color": opts.colour || "var(--s-ok)", "stop-opacity": ".85" }));
    grad.appendChild(svgEl("stop", { offset: "1", "stop-color": opts.colour || "var(--s-ok)", "stop-opacity": "1" }));
    defs.appendChild(grad);

    var glow = svgEl("filter", { id: "arcF" + id, x: "-20%", y: "-60%", width: "140%", height: "220%" });
    glow.appendChild(svgEl("feGaussianBlur", { stdDeviation: "6", result: "b" }));
    var m = svgEl("feMerge", {});
    m.appendChild(svgEl("feMergeNode", { in: "b" }));
    m.appendChild(svgEl("feMergeNode", { in: "SourceGraphic" }));
    glow.appendChild(m);
    defs.appendChild(glow);
    svg.appendChild(defs);

    /* The curve always sweeps the full width. Where it ends vertically is
       the number: full means high on the right, empty means nearly flat. */
    var endY = H - 22 - (H - 58) * f;
    var d = "M0," + (H - 6) +
            " C " + (W * 0.34) + "," + (H - 10) +
            " " + (W * 0.62) + "," + (endY + 26) +
            " " + (W - 26) + "," + endY;

    svg.appendChild(svgEl("path", {
      d: d, fill: "none", stroke: "url(#arcG" + id + ")",
      "stroke-width": "6", "stroke-linecap": "round", filter: "url(#arcF" + id + ")"
    }));

    /* The endpoint: a haloed dot, the single brightest thing on the screen. */
    svg.appendChild(svgEl("circle", {
      cx: W - 26, cy: endY, r: "13", fill: opts.colour || "var(--s-ok)", opacity: ".18"
    }));
    svg.appendChild(svgEl("circle", {
      cx: W - 26, cy: endY, r: "6.5", fill: opts.colour || "var(--s-ok)", filter: "url(#arcF" + id + ")"
    }));
    return svg;
  }

  /* ── spark bars ─────────────────────────────────────────────
     The small block chart that bleeds to a tile's edge. Values are scaled to
     the tallest, and the tallest is picked out in the accent. */
  function spark(values, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "spark";
    var max = values.reduce(function (m, v) { return Math.max(m, v); }, 0);
    values.forEach(function (v) {
      var bar = document.createElement("i");
      var pct = max > 0 ? Math.max((v / max) * 100, v > 0 ? 8 : 4) : 4;
      bar.style.height = pct + "%";
      if (max > 0 && v === max && v > 0) bar.className = "is-peak";
      wrap.appendChild(bar);
    });
    return wrap;
  }

  /* ── day strip ──────────────────────────────────────────────
     Seven days with a tick over each: lit when something was recorded that
     day, dim when nothing was. The selected day is ringed. */
  function dayStrip(days, selected, onPick) {
    var wrap = document.createElement("div");
    wrap.className = "daystrip";
    days.forEach(function (day) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-selected", day.date === selected ? "true" : "false");
      b.setAttribute("aria-label", day.label + ", " + (day.total > 0 ? "spent" : "nothing recorded"));

      var tick = document.createElement("span");
      tick.className = "tick" + (day.total > 0 ? " is-on" : "");
      var d = document.createElement("span");
      d.className = "d";
      d.textContent = day.short;

      b.appendChild(tick);
      b.appendChild(d);
      b.addEventListener("click", function () { onPick(day.date); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  return { ring: ring, arc: arc, spark: spark, dayStrip: dayStrip };
})();
