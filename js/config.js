/* Plutus configuration. Constants only, no logic, no state.
   Loaded first, so everything below may rely on these being present. */

var CONFIG = {
  APP_NAME: "Plutus",

  /* Bump VERSION together with CACHE in sw.js on every deploy. An Android
     versionCode is derived from this, so it must only ever go up. */
  VERSION: "3.2.0",

  /* Bump only when the shape of the stored object changes, and add a
     migration step in store.js at the same time. */
  SCHEMA_VERSION: 1,

  STORE_KEY: "plutus.v1",

  /* Week can start on Sunday (0) or Monday (1). Monday is the default and is
     what the period maths uses until the user says otherwise. */
  DEFAULT_WEEK_START: 1,

  /* Alerts fire once per period at each of these, and never twice.
     See alerts.js, Phase 7. */
  DEFAULT_THRESHOLDS: [50, 75, 90, 100],
  DEFAULT_DUE_REMINDER_DAYS: 3,

  CURRENCIES: [
    { code: "INR", symbol: "₹", name: "Indian rupee", grouping: "IN" },
    { code: "USD", symbol: "$", name: "US dollar", grouping: "INTL" },
    { code: "EUR", symbol: "€", name: "Euro", grouping: "INTL" },
    { code: "GBP", symbol: "£", name: "Pound sterling", grouping: "INTL" },
    { code: "AED", symbol: "د.إ", name: "UAE dirham", grouping: "INTL" },
    { code: "JPY", symbol: "¥", name: "Japanese yen", grouping: "INTL" }
  ],

  /* The ten category tints from design.md. A custom category picks one of
     these and never a free colour, so nobody can build a category that reads
     as a warning. Icons refer to symbols in the sprite in index.html. */
  TINTS: ["sky", "lilac", "sage", "clay", "sand", "plum", "stone", "mint", "apricot", "denim"],

  DEFAULT_CATEGORIES: [
    { name: "Food",          icon: "ic-food",    tint: "sky" },
    { name: "Groceries",     icon: "ic-basket",  tint: "sage" },
    { name: "Shopping",      icon: "ic-bag",     tint: "lilac" },
    { name: "Apparel",       icon: "ic-shirt",   tint: "plum" },
    { name: "Transport",     icon: "ic-bus",     tint: "denim" },
    { name: "Entertainment", icon: "ic-film",    tint: "apricot" },
    { name: "Bills",         icon: "ic-receipt", tint: "stone" },
    { name: "Utilities",     icon: "ic-plug",    tint: "sand" },
    { name: "Health",        icon: "ic-heart",   tint: "mint" },
    { name: "Education",     icon: "ic-book",    tint: "sky" },
    { name: "Travel",        icon: "ic-plane",   tint: "clay" },
    { name: "Subscriptions", icon: "ic-repeat",  tint: "lilac" },
    { name: "Miscellaneous", icon: "ic-dots",    tint: "stone" }
  ],

  PAYMENT_METHODS: ["cash", "upi", "card", "netbanking", "wallet", "other"],

  /* Status bands, in percent. design.md section 3. The band colour on Home
     is driven by these, so they live in exactly one place. */
  BANDS: { ON_TRACK: 50, NEAR: 75, LIMIT: 100 },

  /* Routes. The router in app.js reads this and nothing else. */
  ROUTES: [
    { hash: "#/",         id: "screen-home",     tab: "home",     title: "Home" },
    { hash: "#/expenses", id: "screen-expenses", tab: "expenses", title: "History" },
    { hash: "#/people",   id: "screen-people",   tab: "people",   title: "People" },
    { hash: "#/insights", id: "screen-insights", tab: "insights", title: "Insights" },
    { hash: "#/goals",    id: "screen-goals",    tab: null,       title: "Goals" },
    { hash: "#/settings", id: "screen-settings", tab: null,       title: "Settings" }
  ]
};
