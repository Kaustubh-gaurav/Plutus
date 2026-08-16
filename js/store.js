/* Plutus store. The only file in the app that touches storage.

   Everything lives in one object under one key. Collections at this scale are
   a few hundred KB of text at most and there are no images anywhere, so one
   atomic read, one atomic write and a trivial export are worth more than
   partial writes.

   This file holds data and nothing else. It does not compute a total, a
   remaining balance or a status. Those are derived on read, every time, by the
   logic layer. If a number can be derived, deriving it is the only correct
   implementation.

   Keeping this the sole storage caller is also what makes a later swap to
   IndexedDB, or to Capacitor's native storage on Android, a one file job. */

var Store = (function () {

  /* ── the backend. localStorage in the app, a fake object in tests ── */

  var backend = (function () {
    try {
      var probe = "plutus.probe";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (e) {
      /* Private mode, or storage disabled entirely. The app still runs, it
         just forgets everything when it closes, and says so. */
      return null;
    }
  })();

  var backendOverride = null;
  function store() { return backendOverride || backend; }

  /* Tests inject a fake storage object and a fixed clock. Nothing else uses
     these two, and nothing in the app may call them. */
  function __setBackend(obj) { backendOverride = obj; }
  function __setNow(fn) { nowFn = fn; }

  var nowFn = function () { return new Date().toISOString(); };
  function now() { return nowFn(); }

  /* ── shape ──────────────────────────────────────────────── */

  function blankStore() {
    return {
      schemaVersion: CONFIG.SCHEMA_VERSION,
      profile: {
        name: "",
        currencyCode: "INR",
        currencySymbol: "₹",
        grouping: "IN",           /* Indian grouping: 1,25,000 not 125,000 */
        weekStartsOn: CONFIG.DEFAULT_WEEK_START,
        onboarded: false,
        createdAt: ""
      },
      settings: {
        notifications: true,
        budgetAlerts: true,
        thresholds: CONFIG.DEFAULT_THRESHOLDS.slice(),
        dueReminders: true,
        dueReminderDays: CONFIG.DEFAULT_DUE_REMINDER_DAYS,
        installDismissed: false
      },
      categories: [],
      expenses: [],
      budgets: [],        /* append only, each carries effectiveFrom */
      debts: [],
      repayments: [],     /* append only, keyed by debtId. never edits a debt */
      goals: [],
      contributions: [],  /* append only, keyed by goalId. same shape of idea
                             as repayments, so a goal keeps its history */
      recurring: [],
      notifications: [],
      firedAlerts: {},    /* fingerprint -> ISO timestamp. the dedupe registry */
      seq: 1
    };
  }

  var STORE = blankStore();

  /* Set when the stored value could not be parsed. The app shows this once,
     and the corrupt value is deliberately NOT overwritten, so nothing is
     destroyed silently and the data can still be recovered by hand. */
  var loadError = null;
  var saveBlocked = false;

  /* ── reading ────────────────────────────────────────────────
     Never spread a parsed object into the store. Read field by field with a
     default, or a store written by an older build arrives missing keys that
     the rest of the app assumes are present. */

  function str(v, d) { return typeof v === "string" ? v : d; }
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function bool(v, d) { return typeof v === "boolean" ? v : d; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  function hydrate(raw) {
    var b = blankStore();
    var s = obj(raw);
    var p = obj(s.profile);
    var t = obj(s.settings);

    return {
      schemaVersion: num(s.schemaVersion, b.schemaVersion),
      profile: {
        name: str(p.name, b.profile.name),
        currencyCode: str(p.currencyCode, b.profile.currencyCode),
        currencySymbol: str(p.currencySymbol, b.profile.currencySymbol),
        grouping: str(p.grouping, b.profile.grouping),
        weekStartsOn: p.weekStartsOn === 0 ? 0 : 1,
        onboarded: bool(p.onboarded, false),
        createdAt: str(p.createdAt, "")
      },
      settings: {
        notifications: bool(t.notifications, true),
        budgetAlerts: bool(t.budgetAlerts, true),
        thresholds: Array.isArray(t.thresholds) && t.thresholds.length
          ? t.thresholds.slice() : b.settings.thresholds,
        dueReminders: bool(t.dueReminders, true),
        dueReminderDays: num(t.dueReminderDays, b.settings.dueReminderDays),
        installDismissed: bool(t.installDismissed, false)
      },
      categories: arr(s.categories),
      expenses: arr(s.expenses),
      budgets: arr(s.budgets),
      debts: arr(s.debts),
      repayments: arr(s.repayments),
      goals: arr(s.goals),
      contributions: arr(s.contributions),
      recurring: arr(s.recurring),
      notifications: arr(s.notifications),
      firedAlerts: obj(s.firedAlerts),
      seq: num(s.seq, 1)
    };
  }

  /* ── migrations ─────────────────────────────────────────────
     Ordered steps, each taking the whole object and returning it. Version 1
     has none. The runner exists from day one so the first schema change does
     not mean inventing the mechanism under pressure. */

  var MIGRATIONS = [
    /* { from: 1, to: 2, run: function (s) { ...; return s; } } */
  ];

  function migrate(s) {
    var guard = 0;
    while (s.schemaVersion < CONFIG.SCHEMA_VERSION && guard++ < 50) {
      var step = null;
      for (var i = 0; i < MIGRATIONS.length; i++) {
        if (MIGRATIONS[i].from === s.schemaVersion) { step = MIGRATIONS[i]; break; }
      }
      if (!step) { s.schemaVersion = CONFIG.SCHEMA_VERSION; break; }
      s = step.run(s);
      s.schemaVersion = step.to;
    }
    return s;
  }

  /* ── load and save ──────────────────────────────────────── */

  function load() {
    loadError = null;
    var backendRef = store();
    if (!backendRef) {
      STORE = blankStore();
      seedIfEmpty();
      loadError = "storage-unavailable";
      return STORE;
    }

    var rawText = null;
    try { rawText = backendRef.getItem(CONFIG.STORE_KEY); } catch (e) { rawText = null; }

    if (rawText === null || rawText === undefined || rawText === "") {
      STORE = blankStore();
      STORE.profile.createdAt = now();
      seedIfEmpty();
      save();
      return STORE;
    }

    var parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      /* Do NOT save over this. A blank store is written only when the user
         acts, so a corrupt value stays on disk and stays recoverable. */
      STORE = blankStore();
      seedIfEmpty();
      loadError = "corrupt";
      return STORE;
    }

    STORE = migrate(hydrate(parsed));
    seedIfEmpty();
    return STORE;
  }

  function save() {
    var backendRef = store();
    if (!backendRef) { saveBlocked = true; return false; }
    try {
      backendRef.setItem(CONFIG.STORE_KEY, JSON.stringify(STORE));
      saveBlocked = false;
      return true;
    } catch (e) {
      /* Quota exceeded, or storage refused the write. Silently failing to
         save financial data is the worst outcome this app has, so the caller
         must surface this and never swallow it. */
      saveBlocked = true;
      return false;
    }
  }

  /* ── ids ────────────────────────────────────────────────────
     A counter rather than a uuid, so ids stay short and readable when you are
     looking at the raw stored JSON trying to work out what went wrong. */

  function nextId(prefix) {
    var n = STORE.seq || 1;
    STORE.seq = n + 1;
    return (prefix || "id") + "_" + n;
  }

  /* ── seeding ────────────────────────────────────────────────
     The default categories are real data the app depends on, not sample
     content. Nothing else is ever seeded: no fake expenses, no demo debts. */

  function seedIfEmpty() {
    if (STORE.categories.length) return;
    STORE.categories = CONFIG.DEFAULT_CATEGORIES.map(function (c) {
      return {
        id: nextId("cat"),
        name: c.name,
        icon: c.icon,
        tint: c.tint,
        isDefault: true,
        isArchived: false,
        createdAt: now()
      };
    });
  }

  /* ── generic collection helpers ─────────────────────────────
     Entity actions with validation arrive with validate.js in Phase 2. These
     are the plumbing underneath them: they stamp ids and timestamps, mutate,
     save, and report whether the write actually landed. */

  function collection(name) {
    if (!Object.prototype.hasOwnProperty.call(STORE, name) || !Array.isArray(STORE[name])) {
      throw new Error("Unknown collection: " + name);
    }
    return STORE[name];
  }

  function insert(name, record, idPrefix) {
    var list = collection(name);
    var stamped = {};
    for (var k in record) if (Object.prototype.hasOwnProperty.call(record, k)) stamped[k] = record[k];
    stamped.id = stamped.id || nextId(idPrefix || name.slice(0, 3));
    stamped.createdAt = stamped.createdAt || now();
    stamped.updatedAt = stamped.createdAt;
    list.push(stamped);
    var ok = save();
    return { ok: ok, value: stamped };
  }

  function update(name, id, patch) {
    var list = collection(name);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k) && k !== "id" && k !== "createdAt") {
          list[i][k] = patch[k];
        }
      }
      list[i].updatedAt = now();
      return { ok: save(), value: list[i] };
    }
    return { ok: false, error: "not-found" };
  }

  function remove(name, id) {
    var list = collection(name);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list.splice(i, 1);
        return { ok: save() };
      }
    }
    return { ok: false, error: "not-found" };
  }

  function byId(name, id) {
    var list = collection(name);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function where(name, predicate) {
    return collection(name).filter(predicate);
  }

  /* ── profile and settings ───────────────────────────────── */

  function setProfile(patch) {
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k) &&
          Object.prototype.hasOwnProperty.call(STORE.profile, k)) {
        STORE.profile[k] = patch[k];
      }
    }
    if (!STORE.profile.createdAt) STORE.profile.createdAt = now();
    return { ok: save(), value: STORE.profile };
  }

  function setSettings(patch) {
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k) &&
          Object.prototype.hasOwnProperty.call(STORE.settings, k)) {
        STORE.settings[k] = patch[k];
      }
    }
    return { ok: save(), value: STORE.settings };
  }

  /* ── export, import, reset ──────────────────────────────────
     Storage on a device can be cleared by the user, by the browser, or by
     Android under pressure, and there is no copy anywhere else. Export is the
     only safety net this app has, which is why it exists from Phase 1 rather
     than being left to the end. */

  function exportAll() {
    return {
      app: CONFIG.APP_NAME,
      version: CONFIG.VERSION,
      schemaVersion: STORE.schemaVersion,
      exportedAt: now(),
      data: JSON.parse(JSON.stringify(STORE))
    };
  }

  function importAll(backup) {
    var payload = obj(backup).data ? backup.data : backup;
    if (!payload || typeof payload !== "object") return { ok: false, error: "unreadable" };
    var next = migrate(hydrate(payload));
    if (!Array.isArray(next.expenses) || !Array.isArray(next.categories)) {
      return { ok: false, error: "unreadable" };
    }
    STORE = next;
    seedIfEmpty();
    return { ok: save(), value: STORE };
  }

  function reset() {
    STORE = blankStore();
    STORE.profile.createdAt = now();
    seedIfEmpty();
    return { ok: save() };
  }

  return {
    /* state */
    get: function () { return STORE; },
    loadError: function () { return loadError; },
    saveBlocked: function () { return saveBlocked; },

    /* lifecycle */
    load: load, save: save, reset: reset,
    exportAll: exportAll, importAll: importAll,

    /* collections */
    insert: insert, update: update, remove: remove, byId: byId, where: where,
    nextId: nextId,

    /* profile */
    setProfile: setProfile, setSettings: setSettings,

    /* test seams. never called by the app */
    __blankStore: blankStore,
    __hydrate: hydrate,
    __setBackend: __setBackend,
    __setNow: __setNow,
    __setStore: function (s) { STORE = s; }
  };
})();
