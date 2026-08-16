# Plutus: Implementation Plan

> Built from `context.md` (what and why) and `architecture.md` (how).
> This file is the build order. Work through it top to bottom.
> Log every deviation in `decision.md`.

Last updated: 15 August 2026
Target: a static, offline, installable app in the shape of the Timetable app. Plain HTML, CSS and JavaScript, no build step, `localStorage`, service worker, GitHub Pages.
Distribution: **GitHub Pages first, Google Play Store likely afterwards.** Phases 0 to 9 build and ship the web app. Phase 10 wraps the exact same files for Android, with no rewrite, provided the portability rules below are followed from Phase 0.

## Portability rules, non negotiable from Phase 0

These exist so the Play Store step is a packaging job rather than a rebuild. Every one of them is free now and painful to retrofit.

1. **Relative paths only.** `./css/styles.css`, never `/css/styles.css`. Absolute paths break at a GitHub Pages subpath and break again inside a native WebView.
2. **Hash routing only.** Neither GitHub Pages nor a WebView offers server rewrites.
3. **No cross origin requests.** No CDN, no web fonts, no remote icons or images. Everything ships in the repository.
4. **`store.js` is the only file that touches storage.** Swapping to native storage later must be one file.
5. **Android hardware back must work.** Overlays push a history entry on open and close on `popstate`, so back closes the sheet instead of the app.
6. **Icons include a maskable 512** from Phase 0, since that is what an Android adaptive icon and the Play listing both need.
7. **`VERSION` lives in `config.js`** and is bumped with `CACHE`, so a Play `versionCode` maps to a real build.
8. **`privacy.html` ships in the repository.** Play requires a reachable privacy policy URL. Everything stays on the device and nothing is transmitted, so the page is short and entirely true.

## How to read this plan

Ten phases. Each one is a **shippable, testable slice**, not a layer of scaffolding. Each phase lists:

* **Goal** what exists at the end that did not exist at the start
* **Why here** why this phase is in this position and not another
* **Files** created or touched
* **Tasks** the actual work
* **Done when** verifiable conditions, checked before moving on
* **Demo check** what to do on a phone to prove it works
* **Watch for** the specific ways this phase goes wrong

The ordering rule behind the whole plan: **calculations before screens, one working vertical slice before breadth.** Everything visual depends on the maths, so the maths is written and proven first. After that, each phase completes one user loop end to end rather than half finishing several.

## Working agreements for every phase

1. Bump `CACHE` in `sw.js` on every deploy. A change nobody can see is worse than no change.
2. Add a file to `SHELL` in `sw.js` **only after the file exists**. Listing a missing file makes the worker install throw and strands users on the old version.
3. Add each new script to `index.html` in dependency order. Globals load in file order.
4. Open `tests.html` and see it green before every deploy.
5. No screen computes money. If a screen needs a figure, it comes from `view.js`.
6. No placeholder that looks alive but is not. If a number is on screen it is derived from stored data.
7. Update `decision.md` at the end of each phase.

## Phase 0. Shell, install and offline

**Goal.** An empty app that installs to the home screen, opens with no signal, and navigates between blank screens.

**Why here.** Everything else gets built inside this shell. Getting install and offline right on day one avoids discovering on the last day that the service worker was wrong the whole time. This is also the phase that proves the app is an app.

**Files.** `index.html`, `css/styles.css`, `manifest.webmanifest`, `sw.js`, `icons/*`, `js/config.js`, `js/ui.js`, `js/app.js`, `README.md`

**Tasks.**

* `index.html`: head with viewport `viewport-fit=cover`, theme colour, manifest link, apple touch icon and Apple meta tags. Body with an inline SVG icon sprite, a header, one `<section class="screen" hidden>` per route, and a bottom tab bar.
* `css/styles.css`: the `:root` token block (background, card, ink levels, line, radius, status colours `--ok` `--warn` `--danger` `--neutral`, direction colours `--lent` `--borrowed`), the `[hidden] { display: none !important; }` rule at the top, base typography, the card, the screen container, the tab bar with `env(safe-area-inset-bottom)`.
* `manifest.webmanifest`: `standalone`, portrait, `start_url` and `scope` both `"./"`, theme and background colours, 192 / 512 / maskable 512 icons.
* Icons: generate the four PNG sizes from one source mark, on `--ok` teal with the `--canvas` cream wordmark, per `design.md`.
* Fonts: `fonts/jakarta-latin.woff2` and `fonts/jakarta-latin-ext.woff2` are already in the repository. Declare both `@font-face` blocks with their unicode ranges. The rupee glyph lives in the latin-ext file, so both are required.
* Tokens: copy the full `:root` block from `design.md` section 3 and 5 before writing a single component.
* `sw.js`: copy the Timetable structure. Versioned `CACHE`, `SHELL` list, `no-cache` fetch, network first with cache fallback, fall back to `index.html`, same origin GET only, skip waiting and claim clients.
* `js/config.js`: app name, `VERSION`, `SCHEMA_VERSION`, default category list, default alert thresholds, supported currencies.
* `js/ui.js`: `el()` element builder, `qs`, `on`, `show`, `hide`, `toast()`, `confirmDialog()`, `openSheet()` and `closeSheet()` with focus trap and escape to close.
* `js/app.js`: hash router, screen registry, tab bar wiring, `App.refresh()` skeleton, `DOMContentLoaded` boot, and **back button handling** so overlays push a history entry on open and close on `popstate`.
* `privacy.html`: a plain page stating that all data stays on the device and nothing is transmitted. Needed for the Play listing later, and true from the first commit.
* `README.md`: what the app is, how to run it locally, how to deploy, and the two service worker rules.

**Done when.** Every hash route shows its own blank screen. The tab bar highlights the active screen. The app installs on Android and iOS. Turning on airplane mode and reopening still loads the shell. Deep linking to `#/debts` works from a cold start. Android back moves through app history rather than closing the app. Every path in every file is relative.

**Demo check.** Install to the home screen, go offline, open from the icon, move between all six tabs, then press Android back repeatedly and confirm it walks backwards through the app before it exits.

**Watch for.** `start_url` must be relative or the installed app breaks on a GitHub Pages subpath. iOS ignores the manifest for the icon, so the Apple tags are required. Test install in a real browser, not a desktop devtools emulator.

## Phase 1. Store and persistence

**Goal.** Data survives a refresh, an app close and a phone restart.

**Why here.** Persistence is the non functional requirement most likely to be discovered broken late, and every later phase writes through it.

**Files.** `js/store.js`, `js/config.js`, `tests.html`

**Tasks.**

* `blankStore()` with the full shape from `architecture.md` section 4.
* `Store.load()`: read the key, parse defensively, field by field defaults so a partial object still boots, run migrations, seed the default categories on first run, return a blank store on corrupt JSON without overwriting the bad value.
* `Store.save()`: stringify and write, catch quota failure, return a boolean.
* `MIGRATIONS`: the ordered runner, empty at version 1.
* `Store.export()` and `Store.import()`, `Store.reset()`.
* `nextId()` using the `seq` counter, so ids are stable and readable in storage.
* Start `tests.html` with a fake storage object: round trip, corrupt payload, missing fields, quota failure.

**Done when.** Writing a value in the console, refreshing and reading it back works. A deliberately corrupted storage value boots to a blank app with a visible toast and does not destroy the corrupt value.

**Watch for.** Never spread a parsed object straight into the store. Read field by field with defaults, or a store written by an older version will be missing keys that later code assumes exist.

## Phase 2. Logic layer and test page

**Goal.** Every financial calculation in the product exists, is pure, and is proven by tests. Zero screens.

**Why here.** This is the heart of the product. Every screen is a rendering of these functions, and the spec is explicit that calculations must be deterministic, consistent and testable on their own. Writing them first means no screen ever has to be revisited because a formula changed.

**Files.** `js/money.js`, `js/dates.js`, `js/budget.js`, `js/expenses.js`, `js/analytics.js`, `js/debts.js`, `js/goals.js`, `js/alerts.js`, `js/validate.js`, `tests.html`

**Tasks in order.**

1. `money.js`: `toPaise`, `toRupees`, `sum`, `clampToZero`, `percentOf`, `format`, `formatCompact`, `parseInput`.
2. `dates.js`: `today`, `monthPeriod`, `weekPeriod`, `periodForDate`, `isWithin`, `previousPeriod`, `addDays`, `diffDays`, `formatDisplay`.
3. `budget.js`: `resolveForPeriod`, `progress`, `statusFromPercent`.
4. `expenses.js`: `query`, `inPeriod`, `groupByDay`.
5. `analytics.js`: `period`, `insights`.
6. `debts.js`: `view`, `summary`, `canAcceptRepayment`.
7. `goals.js`: `progress`.
8. `alerts.js`: `fingerprint`, `evaluate`.
9. `validate.js`: all seven validators.

**Tests to write alongside, not after.**

* Money: rounding half up, no floating point drift over a thousand additions, `percentOf` with a zero divisor returns 0 rather than `NaN`, parsing junk input returns null.
* Dates: month boundaries including February and a leap year, week boundaries for both Sunday and Monday starts, a date on a period edge, `daysElapsed` on the first and last day of a period.
* Budget: no budget set, zero budget, exactly at 100 percent, over budget, every status band boundary at 49, 50, 74, 75, 99, 100 and 101, pace risky while still under budget.
* Debts: partial repayment, several repayments summing to exactly the original, a repayment one paisa over the remaining balance is refused, no due date never overdue, an overdue debt fully repaid becomes paid, deleting a repayment moves paid back to partially paid.
* Alerts: a threshold fires once, does not refire in the same period, fires again in the next period, and respects the settings toggles.
* Validation: every rule in `context.md` section 12, both the passing and the failing case.

**Done when.** `tests.html` is green and covers every case above. No logic file references `document`, `localStorage` or `new Date()`.

**Demo check.** None. This phase has no UI, and that is the point.

**Watch for.** The temptation to skip ahead to screens. Every hour spent here removes several later. Also: `Dates.today()` is the only clock read in the entire codebase. If a second one appears, month rollover stops being testable.

## Phase 3. Onboarding and the app gate

**Goal.** A first run flow that captures who the user is and what their budgets are, and persists it.

**Why here.** It is the first real screen, it is short, and it produces the data every other screen reads. It also forces `store` and `validate` to be used in anger for the first time.

**Files.** `js/onboarding.js`, `js/components.js`, `js/view.js`, `css/styles.css`

**Tasks.**

* Steps: welcome, name, currency, monthly budget, weekly budget, week start. Currency is required, budgets can be skipped and set later.
* Progress indicator across steps, back and next, validation per step with inline errors.
* On finish: write the profile, set `onboarded`, seed default categories if absent, route to the dashboard.
* `App` gate: while `onboarded` is false, force the onboarding screen and hide the tab bar.
* First components: `statCard`, `amount`, `emptyState`, form fields, `submitBar`.

**Done when.** A fresh install walks through onboarding, the values persist across a restart, and reopening never shows onboarding again. Skipping the budget steps leaves the app in a valid state with no budget.

**Demo check.** Clear site data, reinstall, complete onboarding, force quit, reopen.

**Watch for.** Skipped budgets must produce `hasBudget: false` everywhere, not a budget of zero. A zero budget and no budget are different states and read differently on screen.

## Phase 4. Expenses, the core loop

**Goal.** Add, view, edit and delete expenses, with categories. The primary reason the app exists.

**Why here.** This is the highest frequency action in the product and everything downstream is a view of this data. Nothing else can be verified until expenses are real.

**Files.** `js/screen_expenses.js`, `js/view.js`, `js/components.js`, `js/store.js`, `css/styles.css`

**Tasks.**

* **Add expense sheet**, opened by a floating button present on every screen: a large amount keypad style input focused on open, a horizontal category picker, date defaulting to today, and optional note, merchant and payment method behind a "more" toggle. Save and close in one tap.
* `Store.addExpense`, `updateExpense`, `removeExpense`, each validating first.
* **History screen**: grouped by day with a per day total, newest first, each row showing category icon, note or category name, and amount.
* Row tap opens the edit sheet, prefilled. Delete sits inside the edit sheet behind a confirm.
* **Category management** in settings: the seeded defaults, plus create, rename, recolour and archive. Deleting a custom category reassigns its expenses to Miscellaneous after a confirm.
* Empty state on the history screen with a direct add action.
* Paging: render 50 rows, load more on scroll.

**Done when.** Adding an expense takes under five seconds from opening the app. All four operations persist across a restart. Editing an amount changes the day total immediately. Changing an expense date moves it to the correct day group. A custom category can be created from inside the add sheet without leaving it.

**Demo check.** Add six expenses across three days and two categories, edit one amount, delete one, restart the app, confirm everything is exactly as left.

**Watch for.** The add flow is the product. If it takes more than a few taps, users stop recording and the whole app fails. Keep the amount field focused on open and never hide the save button behind a scroll.

## Phase 5. Budgets and dashboard

**Goal.** The user opens the app and immediately sees what they spent, what is left, and whether they are on track.

**Why here.** Expenses now exist, so budget progress has real data to compute from. This phase turns a list into a product.

**Files.** `js/screen_dashboard.js`, `js/screen_settings.js`, `js/components.js`, `js/view.js`, `css/styles.css`

**Tasks.**

* Budget setting UI: monthly and weekly amounts, appended as new records with `effectiveFrom` rather than edited in place, plus a small budget history list.
* `Components.progressBar` and `progressRing`, driven by the status band, with a text figure beside every bar.
* Dashboard blocks in the priority order from `context.md` section 17: monthly progress, weekly progress, the two debt summary cards as placeholders reading zero until Phase 6, top spending categories, recent activity, goal progress once Phase 8 lands.
* Copy for every status: on track, approaching, near limit, at limit, exceeded, plus the pace warning.
* Empty states for no budget and no expenses that both offer the next action.

**Done when.** Adding an expense updates the monthly bar, the weekly bar, the remaining figure, the percentage and the top categories in the same interaction. Setting a budget mid month applies to the current month and leaves earlier months untouched. With no budget set, the dashboard shows spending totals and prompts to set one, with no `NaN` anywhere.

**Demo check.** Set a monthly budget of ₹25,000, add expenses totalling ₹15,000, confirm the dashboard reads ₹15,000 of ₹25,000, ₹10,000 remaining, 60 percent used, and the bar sits in the approaching band.

**Watch for.** Guard every division. Zero budget, zero days elapsed and an empty expense list must all return valid numbers.

## Phase 6. Lending and borrowing

**Goal.** The second half of the product: who owes the user, who the user owes, and partial repayments that behave correctly.

**Why here.** It is a self contained vertical slice that reuses the components built in Phases 4 and 5, and its correctness rules were already proven in Phase 2.

**Files.** `js/screen_debts.js`, `js/view.js`, `js/store.js`, `js/components.js`, `css/styles.css`

**Tasks.**

* Debts screen with two tabs, Owed to me and I owe, and two summary cards on top showing the totals for each direction.
* Debt form: person, amount, date, optional due date, optional note, direction preset by the active tab.
* Debt list rows: person, original, paid, remaining, status pill, due date, with a progress bar showing repaid against original.
* Debt detail: the full figures, the repayment history in date order, and an add repayment action.
* Repayment form validating against the remaining balance, with the maximum shown and a "settle in full" shortcut.
* Automatic status: pending, partially paid, paid, overdue. Paid records collapse into a completed group rather than cluttering the list.
* Delete a repayment and watch the status reverse correctly.
* Wire the real debt totals into the dashboard cards from Phase 5.

**Done when.** Lending ₹5,000, repaying ₹2,000, then repaying ₹3,000 walks the record through pending, partially paid and paid, with the original amount never changing and both repayments visible in the history. A repayment above the remaining balance is refused with a clear message. A debt with no due date never shows as overdue. Deleting the second repayment returns the record to partially paid with ₹3,000 outstanding.

**Demo check.** Run the Rahul and Priya examples from `context.md` sections 13 and 14 exactly as written and confirm every figure matches.

**Watch for.** The direction distinction must be visually unmistakable everywhere, including the dashboard, the summary cards and any merged activity list. Confusing "owed to me" with "I owe" is the one error this feature cannot afford.

## Phase 7. Insights and alerts

**Goal.** The app tells the user something they did not already know, and warns them before they overspend.

**Why here.** It needs a full period of real data from Phases 4 to 6 to be worth anything.

**Files.** `js/screen_insights.js`, `js/alerts.js`, `js/screen_settings.js`, `js/view.js`, `css/styles.css`

**Tasks.**

* Insights screen: period switcher (this month, last month, this week), total, transaction count, average expense, average daily spend, a category breakdown as inline SVG bars with amount and share, the top category called out, and the comparison against the previous period.
* Insight sentences from `Analytics.insights`, shown as small cards, only when their condition holds.
* Alert engine wired into `App.refresh()`: evaluate, persist new notifications, write fingerprints into `firedAlerts`.
* Notification bell in the header with an unread count, and a notification list with mark as read and clear all.
* In app banners for the urgent cases: budget exceeded, weekly budget exceeded, a debt overdue today.
* Settings: master notification toggle, budget alerts toggle, editable thresholds, due date reminders toggle and days before.

**Done when.** Crossing 50, 75, 90 and 100 percent each fire exactly once per period. Deleting an expense to drop below a threshold and then crossing it again does not refire. Turning notifications off silences everything. A debt due in three days appears as a reminder, and the same debt does not generate a new reminder every refresh.

**Demo check.** With a ₹10,000 monthly budget, add expenses of ₹5,000, ₹2,500, ₹1,500 and ₹1,000 in turn and confirm exactly four alerts appear, in order, with no duplicates.

**Watch for.** Deduplication is the whole difficulty. The fingerprint must include the period key, or every alert refires the moment the month changes and none refire when it should.

## Phase 8. Search, goals, recurring and export

**Goal.** The Should Have set from the spec.

**Why here.** The product is complete and correct without these. They are genuine improvements, not foundations, so they come after the core loop is verified.

**Files.** `js/screen_expenses.js`, `js/screen_goals.js`, `js/recurring.js`, `js/screen_settings.js`, `js/store.js`

**Tasks.**

* **Search and filter** on the history screen: a text search across note and merchant, category chips, a date range, payment method, an amount range, and sort by date or amount. An active filter summary with a one tap clear, and a result count.
* **Savings goals**: name, target, current, optional target date, a progress ring, a mark complete state, and the active goal surfaced on the dashboard.
* **Recurring rules**: amount, category, frequency, start date, optional end date. On boot, `generateDueOccurrences` creates any missed expenses and advances the cursor. Generated expenses are tagged with `recurringId` and are visibly marked in the list. A rule can be paused or deleted without touching expenses it already created.
* **Export**: a JSON backup of everything, and a CSV of expenses. Both offered as a download and as a copy to clipboard fallback, since installed PWAs on iOS handle downloads inconsistently.
* **Import**: restore from a JSON backup, validated, behind a clear warning that it replaces current data.

**Done when.** A search returns correct results across every filter combination. Running the recurring generator twice in a row creates nothing the second time. An export and a fresh import reproduce the exact same app state.

**Watch for.** Recurring generation must be idempotent. A double boot, a refresh or a reopened tab must never create a duplicate expense. The `lastGeneratedDate` cursor is what guarantees that, and it must be saved in the same write as the generated expenses.

## Phase 9. Polish, verification and deploy

**Goal.** The MVP is shippable, correct on real devices, and live.

**Files.** all

**Tasks.**

* Empty states on every screen for a brand new user, each with a clear next action.
* Error states, loading and quota banners, and a friendly failure for corrupt storage.
* Responsive pass at 360px, 390px, 430px and a tablet width. Check the tab bar against the iOS home indicator and Android gesture bar.
* Accessibility pass: focus order, focus trap in every overlay, escape closes, labels on every input, `aria-valuenow` on progress bars, 44px touch targets, status never conveyed by colour alone.
* Number formatting under stress: lakhs and crores, decimals, and long person names, none of which may break a layout.
* Run all ten acceptance flows from `context.md` section 16 by hand, on a phone, and record the results in `decision.md`.
* Run `tests.html` and confirm green.
* Deploy: bump `CACHE`, verify every `SHELL` entry exists, push to GitHub Pages, install fresh on a phone, confirm the update lands and offline still works.
* Update `README.md` and close out `decision.md`.

**Done when.** All ten acceptance flows pass on a real phone. No screen shows `NaN`, `undefined`, `Infinity` or an empty figure. The app installs, opens offline, and survives a restart with data intact.

## Phase 10. Android packaging for the Play Store

**Goal.** The same files, shipped as an Android app.

**Why here.** Only after the web app is live, verified on real phones and stable. Packaging an unfinished app means resubmitting for every fix, and a store review round trip costs days that a Pages push costs seconds.

**Prerequisite.** Phases 0 to 9 complete and deployed, and the eight portability rules at the top of this file honoured throughout. If any of them were skipped, fix them before starting here, not during.

**Decide the route first.**

* **Trusted Web Activity** via Bubblewrap or PWABuilder. The app is a shell around the live Pages URL. Updates ship by pushing to Pages, with no store review. It requires `.well-known/assetlinks.json` at the **origin root**, meaning the `kaustubh-gaurav.github.io` root repository rather than the Plutus project repository. Get that wrong and the app opens with a browser address bar visible.
* **Capacitor.** The files are copied into a native WebView container, so the app runs with no network at all and native storage, notifications and share become reachable. Updates need a store release. npm is used for the packaging tool only, never for the app.

Recommendation: **TWA first**, because updates stay as cheap as a Pages push and the app is already fully offline. Move to Capacitor only if native notifications or native storage become genuinely necessary.

**Tasks.**

* Choose the route and log the decision in `decision.md`.
* Reserve a package id, for example `io.github.kaustubhgaurav.plutus`.
* Generate the Android project. Set the app name, theme colour, splash, and the adaptive icon from the existing maskable 512.
* TWA route only: publish `.well-known/assetlinks.json` at the origin root with the release signing key fingerprint, then verify that the installed app shows no address bar.
* Create and back up the release signing key. Losing it means never updating the listing again.
* Store listing: title, short and full description, feature graphic, at least four phone screenshots, category Finance, content rating questionnaire, data safety form (declare that no data is collected or transmitted), and the privacy policy URL pointing at `privacy.html`.
* Test the release build on a physical device: install, offline launch, add an expense, force quit, reopen, confirm the data is still there.
* Internal testing track first, then production.

**Done when.** The release build installs from Play on a physical phone, opens with no address bar, works fully offline, and retains data across a force quit.

**Watch for.** The Play data safety form must match reality, and here reality is genuinely "nothing leaves the device", which is the easiest possible version of that form to fill in honestly. Also note that a WebView's storage can be cleared by Android under storage pressure, which is why the export feature from Phase 8 stops being a nicety once real users exist.

## Deploy checklist, every single time

1. `tests.html` is green.
2. Every file in `sw.js` `SHELL` exists, and every new file is listed.
3. `CACHE` in `sw.js` is bumped, and `VERSION` in `config.js` with it.
4. Every new script is in `index.html` in dependency order.
5. No absolute paths anywhere. A quick search for `src="/` and `href="/` returns nothing.
6. Push, wait for Pages, then hard reload once and reopen the installed app twice, since the new worker activates on the second open.
7. Confirm the change is actually visible on the phone, not just the desktop browser.

## Sequencing at a glance

* Phases 0 to 2 build a foundation with no visible product. This is the largest share of the risk and the smallest share of the visible progress, and it is deliberately front loaded.
* Phase 3 to 5 produce the first complete user loop: onboard, set a budget, add an expense, see progress. **After Phase 5 the app is genuinely usable**, and it is the right point to stop and get feedback.
* Phase 6 adds the second product, lending and borrowing, as a self contained slice.
* Phase 7 makes the app useful rather than merely accurate.
* Phase 8 is the Should Have set. It can be cut under time pressure without damaging the MVP.
* Phase 9 is not optional. The spec judges the product on consistency and correctness, and this is where both are proven. It ends with the app live on GitHub Pages.
* Phase 10 is optional and later. It packages the finished app for the Play Store and changes no application code, provided the portability rules were followed from the start.

## What is deliberately not being built

Bank integrations, automatic transaction syncing, investments, cryptocurrency, tax handling, credit scores, double entry accounting, family or enterprise accounts, AI financial advice and complex forecasting. All named as out of scope in the Problem Statement.

## Open dependencies

* **The visual system is settled.** `design.md` holds the palette, type scale, the twenty two components and the twelve consistency laws. Build against it from Phase 0 and review every screen against the laws before moving on. The three open design questions in `design.md` section 13 are all cheapest to answer now.
* The six open questions in `decision.md`. Only Q005, the default week start, blocks anything before Phase 2, and Monday is a safe default until answered.
