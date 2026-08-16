# Plutus: Technical Architecture

> Companion to `context.md`.
> `context.md` says **what** the product is and **why**. This file says **how** the code is built.
> `implementation.md` says **in what order**. `decision.md` is the history.
> Any structural decision recorded here must also be logged in `decision.md`.

Last updated: 15 August 2026
Status: specification. No code written yet.
**Revision note:** this file was rewritten on 15 August 2026 when the platform was confirmed as a static offline PWA in the shape of the Timetable app. The previous version assumed React, TypeScript, Vite and Tailwind. Every calculation rule below survived that change unaltered, because the logic layer never depended on the framework.

## 1. Platform and stack

Plutus is a **static, offline first, installable web app**, built the same way as the Timetable app that is already live:

* Plain HTML, CSS and JavaScript. **No build step, no bundler, no npm, no framework.**
* Files are loaded as ordinary `<script>` tags in a fixed order. Each file defines globals. No ES modules, so the app runs from `file://` as well as from a server.
* All state in `localStorage` under one namespaced key.
* A service worker caches the shell so the app opens with no signal.
* A web app manifest plus icons, so it installs to the home screen and runs standalone with no browser chrome.
* Deployed as static files to GitHub Pages.

There is no server, no account and no sync. Everything happens on the device.

Why this stack: it matches the Timetable app the user already ships and maintains, it has zero toolchain to break, it deploys by pushing files, and it loads instantly on a phone. The cost is that there is no type checker and no component framework, so the discipline that a framework would enforce has to be enforced by structure instead. Sections 3 and 5 are that structure.

## 2. Layers

Four layers, one way dependencies, exactly as before. Only the technology under each one changed.

```
                    ┌───────────────────────────────┐
                    │        SCREENS                │
                    │  screen_*.js, onboarding.js   │
                    │  build DOM, bind events       │
                    └───────────────┬───────────────┘
                                    │ read view models, call actions
                    ┌───────────────▼───────────────┐
                    │        VIEW MODEL             │
                    │  view.js: assembles everything│
                    │  a screen needs, in one call  │
                    └───────┬───────────────┬───────┘
                            │               │
              calls pure fn │               │ reads / writes
                    ┌───────▼───────┐ ┌─────▼─────────┐
                    │     LOGIC     │ │     STORE     │
                    │ money, dates, │ │  store.js,    │
                    │ budget, debts,│ │  localStorage │
                    │ analytics ... │ │               │
                    └───────────────┘ └───────────────┘
```

Rules, enforced by review because there is no linter boundary plugin here:

* **Logic files touch nothing else.** No `document`, no `localStorage`, no `Date.now()`, no globals from other layers. They take arguments and return values. This is what makes them testable in `tests.html`.
* **`store.js` holds data only.** It loads, saves, validates shape and migrates. It never computes a total.
* **`view.js` is the only place logic functions are called.** Screens never do arithmetic on money.
* **Screens only build DOM and bind events.** A screen that wants a number asks `view.js` for it.

The reason for the third rule is the same reason as before: if a screen can compute `remaining` itself, two screens will eventually compute it slightly differently and show different numbers. One funnel, one answer.

## 3. File layout

```
Plutus/
├── index.html                 one page, all screens as hidden sections
├── manifest.webmanifest
├── sw.js                      offline shell, CACHE version to bump
├── tests.html                 logic test runner, opens in a browser
├── README.md
├── context.md
├── architecture.md
├── implementation.md
├── decision.md
├── icons/
│   ├── icon-180.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── css/
│   └── styles.css             tokens in :root, then components, then screens
└── js/
    ├── config.js              constants: default categories, thresholds, currencies
    │
    │   ── LOGIC. Pure. No DOM, no storage, no clock. ──
    ├── money.js               paise maths, rounding, formatting input
    ├── dates.js               period boundaries, keys, day counts
    ├── budget.js              progress, status bands, pace
    ├── expenses.js            query, filter, sort, group by day
    ├── analytics.js           category totals, averages, insights
    ├── debts.js               debt views, remaining, status, summaries
    ├── goals.js               goal progress
    ├── recurring.js           occurrence generation
    ├── alerts.js              threshold detection, fingerprints, dedupe
    ├── validate.js            every form rule
    │
    │   ── DATA ──
    ├── store.js               load, save, migrate, actions, export, import
    │
    │   ── VIEW MODEL ──
    ├── view.js                assembles derived data for each screen
    │
    │   ── UI ──
    ├── ui.js                  DOM helpers, formatting, sheet, modal, toast, confirm
    ├── components.js          progress bar, stat card, list row, status pill, empty state
    ├── onboarding.js
    ├── screen_dashboard.js
    ├── screen_expenses.js
    ├── screen_debts.js
    ├── screen_insights.js
    ├── screen_goals.js
    ├── screen_settings.js
    └── app.js                 boot, hash router, navigation, global add button
```

### Script order is load bearing

Globals are defined in file order, so `index.html` must load them in dependency order and `sw.js` must list every one of them in `SHELL`:

```
config → money → dates → budget → expenses → analytics → debts → goals
       → recurring → alerts → validate → store → view → ui → components
       → onboarding → screen_* → app
```

`app.js` is last because it boots. Nothing runs at load time except `store.js` reading storage into memory and `app.js` starting the router on `DOMContentLoaded`.

## 4. Data model and storage

### One key, one object

```js
const STORE_KEY = "plutus.v1"
```

Everything lives in a single JSON object under that key, following the Timetable pattern. Collections at MVP scale are small (a few hundred KB of text at most, and there are no images anywhere in this app) so the simplicity of one atomic read, one atomic write and a trivial export is worth more than partial writes.

```js
function blankStore() {
  return {
    schemaVersion: 1,
    profile: {            // set during onboarding
      name: "",
      currencyCode: "INR",
      currencySymbol: "₹",
      weekStartsOn: 1,    // 0 Sunday, 1 Monday
      onboarded: false,
      createdAt: "",
    },
    settings: {
      notifications: true,
      budgetAlerts: true,
      thresholds: [50, 75, 90, 100],
      dueReminders: true,
      dueReminderDays: 3,
    },
    categories: [],       // seeded with the defaults on first run
    expenses: [],
    budgets: [],          // append only, each with effectiveFrom
    debts: [],
    repayments: [],       // separate collection, keyed by debtId
    goals: [],
    recurring: [],
    notifications: [],    // generated alerts, newest first
    firedAlerts: {},      // fingerprint -> ISO timestamp, the dedupe registry
    seq: 1,               // counter behind generated ids
  }
}
```

### Record shapes

Amounts are **integers in paise**. Dates are `"YYYY-MM-DD"` strings. Timestamps are full ISO strings.

```js
// category
{ id, name, icon, color, isDefault, isArchived, createdAt }

// expense
{ id, amount, categoryId, date, note, merchant, paymentMethod,
  recurringId, createdAt, updatedAt }

// budget            append only, never edited in place
{ id, period: "monthly" | "weekly", amount, effectiveFrom, createdAt }

// debt              direction "lent" = they owe me, "borrowed" = I owe them
{ id, direction, personName, personContact, originalAmount, date,
  dueDate, note, isArchived, createdAt, updatedAt }

// repayment         append only, never edits the debt
{ id, debtId, amount, date, note, createdAt }

// goal
{ id, name, targetAmount, currentAmount, targetDate, isCompleted,
  createdAt, updatedAt }

// recurring rule
{ id, amount, categoryId, frequency: "weekly"|"monthly"|"yearly",
  startDate, endDate, note, lastGeneratedDate, isActive }

// notification
{ id, type, title, body, relatedId, periodKey, createdAt, readAt }
```

### Never stored

Computed on read, every time, from the records above:

total spent for a period, remaining budget, percent used, average daily spend, projected total, category totals, top category, total repaid, remaining debt, debt status, net position, goal progress.

If a number can be derived, deriving it is the only correct implementation. This single rule is what makes edit, delete, category change, month rollover and repayment deletion all behave correctly with no extra code.

### store.js API

```js
STORE                       // the in memory object, the single source of truth
Store.load()                // hydrate from localStorage, run migrations, seed defaults
Store.save()                // write through, returns false if storage refused
Store.export()              // full backup object
Store.import(backup)        // replace everything, validated first
Store.reset()               // wipe, back to blank plus seeded categories

Store.addExpense(draft)     // validates, stamps id and timestamps, saves, returns result
Store.updateExpense(id, patch)
Store.removeExpense(id)
Store.addCategory(draft) / updateCategory / archiveCategory
Store.setBudget(period, amount, effectiveFrom)
Store.addDebt(draft) / updateDebt / removeDebt
Store.addRepayment(draft)   // refuses if it would exceed the remaining balance
Store.removeRepayment(id)
Store.addGoal / updateGoal / removeGoal
Store.addRecurring / updateRecurring / removeRecurring
Store.markNotificationRead(id) / clearNotifications()
```

Every mutating action follows the same four steps: **validate, mutate `STORE`, `save()`, then `App.refresh()`.** They return `{ ok: true, value }` or `{ ok: false, errors }` so the calling form can show inline messages rather than failing silently. An action never writes an invalid record, even if a caller skipped the form validation.

### Failure behaviour

* Corrupt JSON in storage returns a blank store rather than crashing, and raises a visible toast saying data could not be read. It does **not** overwrite the corrupt value until the user acts, so nothing is destroyed silently.
* `save()` returns `false` on a quota failure. The caller shows a persistent banner. Silently failing to save financial data is the worst possible outcome and is never allowed.
* Every read of a collection defaults to an empty array, so a partially written store still boots.

### Migrations

`STORE.schemaVersion` is compared against `SCHEMA_VERSION` on load, and each step in an ordered `MIGRATIONS` list runs in turn. Version 1 has no steps. The runner exists from day one so the first schema change does not require inventing the mechanism under pressure.

## 5. Logic layer

Every function here is pure: same inputs, same outputs, no DOM, no storage, no clock. Today is always passed in as an argument. That is what makes month rollover, week rollover and overdue transitions testable directly instead of something you wait for.

### money.js

```js
Money.toPaise(rupees)          // 1234.56 -> 123456, rounds half up
Money.toRupees(paise)
Money.sum(list, pick)
Money.clampToZero(p)
Money.percentOf(part, whole)   // returns 0 when whole is 0, never NaN
Money.format(paise, symbol)    // "₹12,345" / "₹12,345.50" only when paise are non zero
Money.formatCompact(paise)     // "₹1.2L" for tight tiles
Money.parseInput(text)         // user typing, tolerant, returns paise or null
```

All money is an integer number of paise. Rupees exist only where the user types and where text is rendered. This kills floating point drift permanently, which matters because a one paisa disagreement between two screens destroys trust in a money app.

### dates.js

```js
Dates.today()                                  // the ONLY clock read in the app
Dates.monthPeriod(todayISO)                    // { kind, key, start, end, totalDays, daysElapsed, daysLeft }
Dates.weekPeriod(todayISO, weekStartsOn)
Dates.periodForDate(dateISO, kind, weekStartsOn)
Dates.isWithin(dateISO, period)
Dates.previousPeriod(period, weekStartsOn)
Dates.addDays / Dates.diffDays / Dates.formatDisplay
```

Period keys are `"2026-08"` and `"2026-W33"`. Periods are always derived from a date and never stamped onto a record, which is why editing an expense date moves it between months with zero data fixup.

`Dates.today()` is the single exception to the no clock rule, and it exists precisely so every other function can stay pure. Tests override it.

### budget.js

```js
Budget.resolveForPeriod(budgets, period)   // latest record effective on or before period.start
Budget.progress(budgetAmount, expenses, period)
Budget.statusFromPercent(percent, hasBudget)
```

`progress` returns:

```js
{ budget, spent, remaining, overspend, percentUsed, status,
  averageDailySpend, projectedTotal, safeDailyRemaining,
  isPaceRisky, hasBudget }
```

Status bands, used for the bar colour, the pill text and the alert copy alike:

`no_budget`, `starting` at 0, `on_track` below 50, `approaching` 50 to 74, `near_limit` 75 to 99, `at_limit` exactly 100, `exceeded` above 100.

`isPaceRisky` is true when the projected total exceeds the budget while the user is still under it. Surfacing pace is the point of the product: the failure being solved is not noticing you are spending too fast until it is too late.

Budgets are append only records with an `effectiveFrom` date, so changing this month's budget never rewrites last month's history.

### expenses.js, analytics.js

```js
Expenses.query(list, { search, categoryIds, from, to, paymentMethods,
                       minAmount, maxAmount, sortBy, sortDir })
Expenses.inPeriod(list, period)
Expenses.groupByDay(list)        // [{ date, items, total }]

Analytics.period(expenses, period, previousExpenses)
// -> { total, count, averageExpense, averageDailySpend,
//      byCategory: [{ categoryId, total, share, count }],
//      topCategory, changeVsPrevious }
Analytics.insights(analysis, progress, categories)
// -> [{ id, tone, text }]
```

Filtering is one pipeline, so the history screen, the insights screen and any export produce identical results from identical criteria.

Insights are template driven with guard clauses. If a condition holds, the sentence appears. There is no model, no scoring, no prediction.

### debts.js

```js
Debts.view(debt, repayments, todayISO)
// -> debt fields plus { totalRepaid, remaining, status, repayments,
//                       isOverdue, daysUntilDue }
Debts.summary(views)
// -> { totalOwedToMe, totalIOwe, netPosition, overdueCount, dueSoonCount }
Debts.canAcceptRepayment(view, amount)   // -> { ok } | { ok:false, errors }
```

Invariants that live here and nowhere else:

* `originalAmount` is never mutated. A repayment is always a new record.
* `remaining` is floored at zero and can never go negative.
* A repayment may never exceed the remaining balance.
* A debt with no `dueDate` can never be overdue.
* Status is always recomputed, never stored, so deleting or editing a repayment moves a debt back from Paid to Partially Paid automatically.

### alerts.js

```js
Alerts.fingerprint(type, scope)     // "budget_75:2026-08"
Alerts.evaluate({ monthly, weekly, debtViews, goals, settings,
                  today, firedAlerts })
// -> array of notification objects whose fingerprints are not already fired
```

Pure and idempotent. The caller writes the returned fingerprints into `STORE.firedAlerts` and saves. This is the whole deduplication mechanism, and it is why crossing 75 percent, dropping back under it by deleting an expense, then crossing it again in the same month fires once and not twice.

### validate.js

```js
Validate.expense(draft, categories)
Validate.budget(draft, spentSoFar)
Validate.category(draft, existing)
Validate.debt(draft)
Validate.repayment(draft, debtView)
Validate.goal(draft)
Validate.recurring(draft)
// each returns { ok: true } or { ok: false, errors: { field: message } }
```

Called twice on purpose: by the form for friendly inline messages, and by the store action so an invalid record can never be written.

## 6. View model layer

`view.js` is the seam between logic and screens. It reads `STORE`, calls logic functions and returns everything a screen needs in one object. It is the only file allowed to call both.

```js
View.dashboard()   // { monthly, weekly, debtSummary, topCategories,
                   //   recentActivity, activeGoal, alerts, isEmpty }
View.expenses(q)   // { groups, total, count, categories, activeFilters, isEmpty }
View.insights(kind, offset)
View.debts(direction)
View.debtDetail(id)
View.goals()
View.settings()
View.categoriesById()      // lookup map built once per render
View.recentActivity(limit) // expenses and repayments merged, sorted by date
```

Nothing is cached across renders except lookup maps built inside a single call. Every view model is rebuilt from `STORE` on every refresh, which is what guarantees no screen can ever show a stale figure.

`View.recentActivity` merges expenses and repayments into one time ordered list, which is what the dashboard needs and what neither collection can produce alone.

## 7. UI layer

### One page, hidden sections

`index.html` contains every screen as a `<section class="screen" hidden>`. The router shows one and hides the rest. There is no page navigation, so state never reloads and the add expense overlay can open over any screen.

An inline SVG sprite at the top of the body holds every icon, exactly as Timetable does. No icon requests, no icon font, works offline by construction.

```css
[hidden] { display: none !important; }
```

That rule is not optional. Any later rule that sets a display value silently beats the browser default for `[hidden]` and leaves an element on screen while its hidden property reads true. It caused two separate bugs in the Timetable app: an invisible overlay that swallowed every tap, and a badge that would not clear. Stated once, at the top, it kills the whole class of bug.

### Router

```js
#/            dashboard
#/expenses    history, search, filter, sort
#/insights    category breakdown and trends
#/debts       tabs: owed to me | I owe
#/debt/:id    debt detail and repayment history
#/goals
#/settings
```

Hash routing, because GitHub Pages serves static files and path routing would need a server rewrite. `app.js` listens to `hashchange`, shows the matching section, calls that screen's `render()` and updates the navigation state.

Forms are overlays rather than routes: the add and edit expense sheet, the debt form, the repayment form and the goal form all open over the current screen so nothing unmounts and nothing scrolls away.

Until `profile.onboarded` is true, the router forces the onboarding flow and hides the navigation.

### Render cycle

```js
App.refresh()   // called after every mutation
  ├─ re-run the alert engine, persist any new notifications
  ├─ render the current screen from its view model
  └─ update nav badges and the notification bell
```

Screens re render by rebuilding their section's inner DOM from the view model. At MVP data volumes that is well under a frame, and it removes an entire category of bug: there is no incremental DOM patching to get wrong, so the screen cannot drift out of sync with the data. The exception is the expense list, which appends in pages of 50 rather than rebuilding thousands of rows.

### components.js

Small factory functions that return elements. They receive already computed values and never compute money.

```js
Components.progressBar({ value, max, status, label })
Components.progressRing({ percent, status, label })
Components.statCard({ label, value, sub, tone })
Components.amount(paise, { direction })
Components.listRow({ icon, title, sub, right, onClick })
Components.statusPill(status, dueDate)
Components.categoryChip(category)
Components.emptyState({ icon, title, body, actionLabel, onAction })
```

`progressBar` takes `status` rather than deriving it from `value / max`, so the band logic exists in exactly one place, `Budget.statusFromPercent`, and cannot drift between the bar, the pill and the alert text.

### Styling

One stylesheet, tokens first, in the Timetable shape:

```css
:root {
  --bg, --card, --ink, --ink-2, --ink-3, --line, --radius,
  --ok, --warn, --danger, --neutral,        /* budget status semantics */
  --lent, --borrowed,                       /* direction semantics */
  ... category colours
}
```

Components reference semantic tokens, never raw hex. The full token set, the type scale and the component inventory are specified in `design.md`, which is the visual source of truth. Retheming means editing the token block, not the components.

Mobile first. A phone width single column with a bottom tab bar is the primary target, since this is an installed app opened one handed while paying for something. Above a tablet breakpoint the dashboard goes two column and the tab bar moves to the side. Safe area insets are respected (`viewport-fit=cover` plus `env(safe-area-inset-bottom)`) so the tab bar clears the iPhone home indicator.

## 8. Offline, install and deployment

### sw.js

Copied in structure from the Timetable service worker, which already solved the real problems:

* `CACHE` is a versioned string. **It must be bumped on every deploy**, otherwise phones keep serving the old copy. This is the single most common way to ship a change that nobody sees.
* `SHELL` lists every file to precache. **Listing a file that does not exist makes install throw and strands every user on the old version.** Add the file first, then the entry.
* Requests are made with `cache: "no-cache"` so GitHub Pages' ten minute `max-age` cannot quietly serve stale files, while the ETag still allows a cheap 304.
* Fetch strategy is network first with cache fallback, falling back to `index.html` so a deep hash link still opens offline.
* Only same origin GET requests are intercepted.

### manifest.webmanifest

`standalone` display, portrait, `start_url` and `scope` both `"./"` so it works from a project subpath on GitHub Pages, theme and background colours matching the app background, plus 192, 512 and maskable 512 icons. `apple-touch-icon` and the Apple meta tags go in `index.html` because iOS ignores the manifest for those.

### Deploy

Static files pushed to a GitHub repository with Pages enabled. No build, no CI, no secrets. The deploy checklist lives in `implementation.md` Phase 9.

### Android and the Play Store

GitHub Pages is step one. The Play Store is the planned step two, reached by wrapping these same files rather than rewriting them. Two routes, decided later:

* **Trusted Web Activity** via Bubblewrap or PWABuilder. The Android app is a thin shell around the live URL, so a push to Pages updates installed apps with no store review. It needs `.well-known/assetlinks.json` served from the **origin root**, which on `kaustubh-gaurav.github.io` means the root user site repository rather than the Plutus project repository. Without that file the app shows a browser address bar and fails to feel native.
* **Capacitor**, which copies the files into a native WebView container. No origin verification, no network dependency at all, and native storage, notifications and share become available. npm is used for the packaging tool only. The app itself still has no build step.

Constraints this places on the code from Phase 0 onward, all of them cheap now and expensive later:

* **Relative paths everywhere.** `./css/styles.css`, never `/css/styles.css`. Absolute paths break at a Pages subpath and break again under a `file://` style WebView origin.
* **Hash routing only.** Neither target offers server rewrites.
* **Zero cross origin requests.** No CDN, no web fonts, no remote images. Everything is in the repository, which the inline SVG sprite and system font stack already guarantee.
* **`store.js` stays the only file touching storage**, so a swap to Capacitor Preferences or SQLite is one file. A WebView's `localStorage` can be cleared by the OS under storage pressure, which makes the export feature in Phase 8 matter more, not less.
* **Hardware back button.** Android back must move through app history rather than closing the app. Hash routing plus `history.pushState` on overlay open gives this for free, provided overlays push a history entry and close on `popstate`.
* **Maskable 512 icon from the start**, since that is what an Android adaptive icon and the Play listing both need.
* **`VERSION` in `config.js`**, so a Play `versionCode` maps to a real thing and support requests can be pinned to a build.
* **A privacy policy page in the repository.** Play requires a reachable privacy policy URL. This app keeps everything on device and transmits nothing, so the page is short and completely honest.
* **Play's minimum functionality policy.** A wrapper around a genuinely useful offline app is fine and is exactly what TWA exists for. A wrapper around a bookmark is not. Nothing here changes for that, it is simply worth knowing before submission.

## 9. Testing

There is no npm, so there is no Vitest. Testing is a browser page instead, which costs nothing and runs anywhere:

* **`tests.html`** loads the logic files plus a thirty line assert harness and prints pass and fail counts with the failing case names.
* **The logic layer is tested exhaustively.** Budget maths, period boundaries and rollovers, debt status transitions, repayment limits, alert deduplication, recurring cursors, money rounding, every validation rule. Dates are injected, so a month rollover is a test, not a wait.
* **The store is tested** against a fake storage object, including corrupt payloads and quota failures.
* **Screens are checked by hand** against the ten acceptance flows in `context.md` section 16.

Opening `tests.html` and seeing it green is a required step before every deploy.

## 10. Performance

* Adding an expense is the hot path and is entirely synchronous: validate, mutate, save, re render one section.
* Only the visible screen renders. Hidden sections keep their last DOM until they are shown again.
* Category lookups are built as a map once per render rather than searched per row.
* The expense history pages in blocks of 50 with an incremental load, so two years of records do not build thousands of rows at once.
* The insights charts are inline SVG drawn from the same view model. No chart library, nothing to download.

## 11. Accessibility

Semantic landmarks, real `<button>` elements for everything tappable, labelled inputs, visible focus, overlays that trap focus and close on escape, `role="progressbar"` with `aria-valuenow` and a text figure beside every bar, colour never used as the only signal since every status pill carries words, and 44px minimum touch targets. Contrast gets checked against the tokens once the visual direction lands.

## 12. Extension points

Deliberate seams, so later features do not force a rewrite:

* **Backend sync.** `store.js` is the only file that touches `localStorage`. Making its load and save asynchronous and pointing them at an API touches one file.
* **IndexedDB.** Same seam, and the named upgrade path if the 5MB storage ceiling is ever approached.
* **Recurring automation.** The rule model and the occurrence cursor exist from Phase 8; turning on generation at boot is a hook, not a redesign.
* **Push notifications.** The alert engine already emits structured, deduplicated notification objects. The service worker consumes the same output.
* **Multi currency.** Amounts are integers plus a currency code on the profile. Per transaction currency is one field plus a conversion function in `money.js`.
* **Framework migration.** Every logic file is pure and framework free. If this ever becomes a React or React Native app, `js/*.js` logic files port across untouched and only the screens are rewritten.

## 13. Known constraints, chosen not discovered

* `localStorage` caps around 5MB and holds strings only. This app stores no images, so that is tens of thousands of transactions, but it is a real ceiling and IndexedDB is the named escape.
* One device, one user. Clearing browser data destroys everything, which is exactly why export sits in Phase 8 rather than the backlog.
* No type checker. The mitigations are the layer rules, the validation functions on every write path and the logic test page.
* A full section re render on every change is simple and correct but not free. It is the right trade at this data volume and the paging escape hatch is already in place for the one list that could grow without bound.
* Edited expenses overwrite their previous values, so there is no audit trail in the MVP. Repayments are immutable, so debts do have one. Adding history everywhere would mean an append only event log, which nothing in the current model precludes.
