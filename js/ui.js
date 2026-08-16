/* Plutus UI helpers. DOM only. No business logic, no storage, no money maths.
   Everything here is generic enough that a screen never needs to reach for
   document directly. */

var UI = (function () {

  /* ── element building ───────────────────────────────────── */

  /* el("div.card.surf--ok", { onclick: fn }, child, child, "text")
     A tag with dot separated classes, an optional attribute object, then any
     number of children. Strings become text nodes, null and false are skipped
     so `cond && el(...)` reads naturally at the call site. */
  function el(spec, attrs) {
    var parts = String(spec).split(".");
    var node = document.createElement(parts.shift() || "div");
    if (parts.length) node.className = parts.join(" ");

    var start = 1;
    if (attrs && typeof attrs === "object" && !(attrs instanceof Node) && !Array.isArray(attrs)) {
      start = 2;
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k.indexOf("on") === 0 && typeof v === "function") {
          node.addEventListener(k.slice(2), v);
        } else if (k === "style" && typeof v === "object") {
          for (var s in v) node.style.setProperty(s, v[s]);
        } else node.setAttribute(k, v === true ? "" : v);
      }
    }

    for (var i = start; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }

  function append(parent, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(parent, c); }); return; }
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  /* An icon from the sprite in index.html. One family, one box, one stroke. */
  function icon(name, size) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size || 22);
    svg.setAttribute("height", size || 22);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + name);
    svg.appendChild(use);
    return svg;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ── toast, for things that went right ──────────────────── */

  var toastTimer = null;
  function toast(message) {
    var node = qs("#toast");
    node.textContent = message;
    node.hidden = false;
    /* the browser needs a frame with the element visible before the
       transition will run, otherwise it snaps into place */
    requestAnimationFrame(function () { node.setAttribute("data-open", "true"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.removeAttribute("data-open");
      setTimeout(function () { node.hidden = true; }, 220);
    }, 2600);
  }

  /* ── banner, for things that are still wrong ─────────────
     Storage refusing to save is the worst thing that can happen in this app,
     so it never gets a toast that disappears. It stays until it is fixed. */

  function banner(message) {
    var node = qs("#banner");
    node.textContent = message;
    node.hidden = false;
  }
  function clearBanner() { qs("#banner").hidden = true; }

  /* ── sheets. every form in this app is one ───────────────
     Android back must close the sheet rather than leave the app, so opening
     one pushes a history entry and closing pops it. */

  var openSheets = [];

  function openSheet(opts) {
    var scrim = qs("#scrim");
    var host = qs("#sheet");
    clear(host);

    host.appendChild(el("span.sheet-grab"));
    if (opts.title) host.appendChild(el("h2.sheet-title", { text: opts.title }));
    if (opts.content) append(host, opts.content);

    scrim.hidden = false;
    host.hidden = false;
    host.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      scrim.setAttribute("data-open", "true");
      host.setAttribute("data-open", "true");
    });

    var record = {
      onClose: opts.onClose || null,
      lastFocus: document.activeElement,
      pushed: false
    };
    openSheets.push(record);

    history.pushState({ plutusSheet: openSheets.length }, "");
    record.pushed = true;

    var focusable = firstFocusable(host);
    if (focusable) focusable.focus();
    document.addEventListener("keydown", onKeydown, true);
    return record;
  }

  function closeSheet(fromPop) {
    var record = openSheets.pop();
    if (!record) return;

    var scrim = qs("#scrim");
    var host = qs("#sheet");
    scrim.removeAttribute("data-open");
    host.removeAttribute("data-open");
    host.setAttribute("aria-hidden", "true");
    setTimeout(function () {
      if (!openSheets.length) { scrim.hidden = true; host.hidden = true; clear(host); }
    }, 240);

    if (!openSheets.length) document.removeEventListener("keydown", onKeydown, true);
    if (record.lastFocus && record.lastFocus.focus) record.lastFocus.focus();
    if (record.onClose) record.onClose();

    /* If the close came from a back gesture the entry is already gone.
       Popping again here would navigate the app backwards, which is the bug
       this branch exists to prevent. */
    if (!fromPop && record.pushed) history.back();
  }

  function sheetIsOpen() { return openSheets.length > 0; }

  function onKeydown(e) {
    if (e.key === "Escape") { e.preventDefault(); closeSheet(); return; }
    if (e.key !== "Tab") return;
    var host = qs("#sheet");
    var items = qsa("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])", host)
      .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function firstFocusable(root) {
    return qs("input, button, select, textarea, [tabindex]:not([tabindex='-1'])", root);
  }

  /* ── confirm, for anything destructive ──────────────────── */

  function confirmAction(opts) {
    var body = el("div.sheet-form",
      el("p.note", { text: opts.body || "" }),
      el("button.btn." + (opts.danger ? "btn--danger" : ""), {
        type: "button",
        onclick: function () { closeSheet(); if (opts.onConfirm) opts.onConfirm(); }
      }, opts.confirmLabel || "Confirm"),
      el("button.btn.btn--soft", { type: "button", onclick: function () { closeSheet(); } }, "Cancel")
    );
    openSheet({ title: opts.title || "Are you sure", content: body });
  }

  return {
    el: el, icon: icon, clear: clear, qs: qs, qsa: qsa,
    toast: toast, banner: banner, clearBanner: clearBanner,
    openSheet: openSheet, closeSheet: closeSheet, sheetIsOpen: sheetIsOpen,
    confirmAction: confirmAction
  };
})();
