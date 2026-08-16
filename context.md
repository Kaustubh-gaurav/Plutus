# Plutus: Project Context

> This is the single reference document for the Plutus MVP.
> It captures what the product is, how it is structured, what the data looks like,
> what the rules are, and in what order the MVP gets built.
> Read this before touching any code. Update it whenever a decision changes.

Last updated: 15 August 2026
Status: pre implementation (spec analysed, nothing built yet)

## 1. Product in one line

A simple personal money companion that answers "what did I spend, what do I have left, am I on track, who owes me, and who do I owe" without feeling like accounting software.

## 2. The two problems being solved

**Problem A: everyday spending visibility.**
People know roughly what they earn and roughly what they should spend, but they lose track of small daily purchases (food, coffee, transport, shopping, subscriptions). Halfway through a ₹30,000 month they may already be at ₹22,000 and not know it. Spreadsheets need manual formulas, banking apps only show transactions, and heavier finance apps bury the user in investments, taxes and jargon.

**Problem B: informal money between people.**
Lending to friends, borrowing, splitting bills, paying for someone, partial repayments. This lives in WhatsApp threads, notes apps and memory, so balances become uncertain: "I lent Rahul ₹5,000, he paid ₹2,000 back, does he still owe ₹3,000?"

Plutus handles both in one app, and keeps a hard, visible distinction between money owed **to** the user and money owed **by** the user.

## 3. Core experience loop

```
Set a goal  →  Spend money  →  Record the expense  →  See progress  →  Adjust  →  Reach the goal
```

The user must never have to calculate anything. If the budget is ₹25,000 and spending is ₹15,000, the app says: ₹15,000 / ₹25,000 spent, ₹10,000 remaining, 60% of budget used, and shows that as a progress bar.

## 4. Design principles

1. **Progress, not ledgers.** Every number is paired with a visual state (on track, approaching, over).
2. **Fast capture.** Adding an expense is the most frequent action in the app and must take a few seconds. It gets a permanent, always reachable entry point.
3. **One source of truth.** Nothing is precomputed and stored. Totals, remainders and percentages are always derived from the raw records.
4. **Transparent maths.** Simple, deterministic, rule based calculations. No AI advisor, no forecasting models in the MVP.
5. **Nothing fake.** No screen shows a number that is not computed from real stored data. Seed data is only for empty state previews and development.
6. **Logic separate from UI.** Budget maths, debt maths and analytics live in pure functions that can be tested with no React involved.

## 5. Technology decisions

Confirmed on 15 August 2026: Plutus is built the same way as the Timetable app that is already live.

* **Platform:** a static, offline first, installable web app (PWA). Mobile first, installs to the home screen, runs standalone, works with no signal.
* **Distribution:** GitHub Pages first. The Play Store is the likely next step, so the app is written from day one to be wrappable for Android with no rewrite. See section 5a.
* **Stack:** plain HTML, CSS and JavaScript. **No build step, no bundler, no npm, no framework.** Files load as ordinary `<script>` tags in a fixed order and define globals.
* **Routing:** hash based, one page with every screen as a hidden section. GitHub Pages serves static files, so path routing would need a server rewrite.
* **Styling:** one stylesheet, semantic tokens in a `:root` block. The palette, type scale, components and consistency laws are specified in `design.md`.
* **State:** one in memory `STORE` object, rebuilt view models on every change. Nothing derived is cached.
* **Persistence:** `localStorage` under a single namespaced key, behind `store.js`, which is the only file that touches storage. IndexedDB is the named upgrade path.
* **Offline:** a service worker precaching the shell, plus a web app manifest and icons.
* **Charts:** inline SVG drawn by hand. No chart library, nothing to download.
* **Money:** stored as integers in the smallest currency unit (paise) to avoid floating point drift. Formatted for display only at the edge.
* **Testing:** `tests.html`, a browser page with a small assert harness that exercises the logic files. Logic coverage matters more than screen coverage at MVP stage.
* **Deploy:** static files pushed to GitHub Pages. No build, no CI, no secrets.

Why this stack: it matches the app the user already ships and maintains, it has no toolchain to break, it deploys by pushing files, and it loads instantly on a phone. The cost is no type checker and no component framework, so the discipline a framework would enforce is enforced by the layer rules in section 6 instead.

## 5a. Distribution path: GitHub Pages now, Play Store later

Step one is GitHub Pages. Step two, if it happens, is the Google Play Store. The same static files serve both, wrapped in an Android shell rather than rewritten. Two routes stay open:

* **Trusted Web Activity**, generated with Bubblewrap or PWABuilder. The store listing points at the live URL, so a deploy to Pages updates the installed app with no store review. It requires a `.well-known/assetlinks.json` at the **origin root**, which for `kaustubh-gaurav.github.io` means the root user site repository, not the Plutus project repository.
* **Capacitor**, which packages the files into a native WebView shell. Nothing is fetched from the network, the app works with no origin verification, and native storage and notifications become available. npm is used for the packaging tool only, never for the app itself.

The choice between them can be made later. What must be true **now**, because retrofitting any of it is expensive:

1. **Every path is relative** (`./css/styles.css`, never `/css/styles.css`). Absolute paths break at a GitHub Pages subpath and break again inside a native WebView.
2. **Hash routing only.** No server rewrites are available in either target.
3. **Nothing is fetched from another origin.** No CDN, no web fonts, no remote icons. Everything ships in the repository.
4. **`store.js` is the only file that touches storage**, so swapping `localStorage` for a native store is one file.
5. **The Android hardware back button is handled** through history, so back navigates within the app instead of closing it.
6. **Icons are produced at maskable 512** from the start, which is what both an Android adaptive icon and a Play listing need.
7. **A `VERSION` constant lives in `config.js`**, so a Play `versionCode` maps to something real.
8. **A privacy policy page ships with the app.** Play requires a reachable privacy policy URL, and since this app stores everything on device and sends nothing anywhere, that page is short and entirely true.

## 6. Application architecture

Four layers, strict one way dependencies. Screens may read logic through the view model, logic may never reach back.

```
Plutus/
  index.html              one page, every screen a hidden section
  manifest.webmanifest
  sw.js                   offline shell, bump CACHE on every deploy
  tests.html              logic test runner
  css/styles.css          tokens first, then components, then screens
  icons/
  js/
    config.js             default categories, thresholds, currencies
                          ── LOGIC. pure. no DOM, no storage, no clock ──
    money.js              paise maths, rounding, formatting
    dates.js              period boundaries, keys, day counts
    budget.js             progress, status bands, pace
    expenses.js           query, filter, sort, group by day
    analytics.js          category totals, averages, insights
    debts.js              debt views, remaining, status, summaries
    goals.js              goal progress
    recurring.js          occurrence generation
    alerts.js             threshold detection, fingerprints, dedupe
    validate.js           every form rule
                          ── DATA ──
    store.js              load, save, migrate, actions, export, import
                          ── VIEW MODEL ──
    view.js               assembles derived data for each screen
                          ── UI ──
    ui.js                 DOM helpers, sheet, modal, toast, confirm
    components.js         progress bar, stat card, list row, status pill
    onboarding.js
    screen_dashboard.js  screen_expenses.js  screen_debts.js
    screen_insights.js   screen_goals.js     screen_settings.js
    app.js                boot, hash router, navigation, add button
```

Rules that keep this honest:

* Logic files touch nothing else. No `document`, no `localStorage`, no clock. They take arguments and return values, which is what makes them testable.
* `store.js` holds data only. It loads, saves, validates shape and migrates. It never computes a total.
* `view.js` is the only file that calls logic functions. Screens never do arithmetic on money.
* Script order in `index.html` is load bearing, and every file must also be listed in the service worker shell.

## 7. Core data models

All amounts are integers in paise. All dates are ISO strings (`YYYY-MM-DD`) for calendar dates and full ISO timestamps for audit fields.

```ts
type ID = string
type Paise = number
type ISODate = string      // 2026-08-15
type ISODateTime = string  // 2026-08-15T10:32:00.000Z

interface UserProfile {
  id: ID
  name: string
  currencyCode: string          // INR by default
  currencySymbol: string        // ₹
  weekStartsOn: 0 | 1           // 0 Sunday, 1 Monday
  onboardingCompleted: boolean
  createdAt: ISODateTime
}

interface Category {
  id: ID
  name: string
  icon: string
  color: string
  isDefault: boolean            // default categories cannot be deleted, only hidden
  isArchived: boolean
  createdAt: ISODateTime
}

interface Expense {
  id: ID
  amount: Paise                 // must be > 0
  categoryId: ID
  date: ISODate
  note?: string
  merchant?: string
  paymentMethod?: PaymentMethod
  recurringRuleId?: ID          // set when generated from a recurring rule
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

type PaymentMethod = 'cash' | 'upi' | 'card' | 'netbanking' | 'wallet' | 'other'

interface Budget {
  id: ID
  period: 'monthly' | 'weekly'
  amount: Paise
  effectiveFrom: ISODate        // budgets are versioned, never edited in place
  createdAt: ISODateTime
}

interface Debt {
  id: ID
  direction: 'lent' | 'borrowed'   // lent = they owe me, borrowed = I owe them
  personName: string
  personContact?: string
  originalAmount: Paise            // never mutated by repayments
  date: ISODate
  dueDate?: ISODate
  note?: string
  isArchived: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

interface Repayment {
  id: ID
  debtId: ID
  amount: Paise                    // must be > 0 and <= remaining balance
  date: ISODate
  note?: string
  createdAt: ISODateTime
}

type DebtStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue'

interface SavingsGoal {
  id: ID
  name: string
  targetAmount: Paise
  currentAmount: Paise
  targetDate?: ISODate
  isCompleted: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

interface RecurringRule {
  id: ID
  amount: Paise
  categoryId: ID
  frequency: 'weekly' | 'monthly' | 'yearly'
  startDate: ISODate
  endDate?: ISODate
  note?: string
  lastGeneratedDate?: ISODate      // cursor so occurrences are never duplicated
  isActive: boolean
}

interface AppNotification {
  id: ID
  type: NotificationType
  title: string
  body: string
  relatedId?: ID                   // budget period key, debt id, goal id
  periodKey?: string               // 2026-08 or 2026-W33, used for dedupe
  createdAt: ISODateTime
  readAt?: ISODateTime
}

type NotificationType =
  | 'budget_threshold_50' | 'budget_threshold_75'
  | 'budget_threshold_90' | 'budget_exceeded'
  | 'weekly_threshold' | 'weekly_exceeded'
  | 'debt_due_soon' | 'debt_overdue'
  | 'goal_reached'

interface Settings {
  notificationsEnabled: boolean
  budgetAlertsEnabled: boolean
  budgetThresholds: number[]       // default [50, 75, 90, 100]
  dueDateRemindersEnabled: boolean
  dueReminderDaysBefore: number    // default 3
}
```

### Derived, never stored

These are computed on read and must never be written to storage:

* Total spent for any period
* Remaining budget
* Percentage used
* Category totals and top category
* Debt total repaid, remaining balance, status
* Goal progress percentage
* Net position (owed to me minus owed by me)

## 8. Application state

One provider per slice, all mounted above the router.

* `ProfileContext`: user profile, currency, week start, onboarding flag.
* `ExpenseContext`: expenses, categories, CRUD actions, active filter state.
* `BudgetContext`: budget history, current monthly and weekly budget resolution.
* `DebtContext`: debts, repayments, CRUD actions, repayment actions.
* `GoalContext`: savings goals and contributions.
* `NotificationContext`: generated alerts, read state, dedupe registry.
* `SettingsContext`: preferences and toggles.

Every context hydrates from its repository on mount and writes through on every mutation, so a refresh never loses data. Selectors are exported as hooks (`useMonthlyBudgetProgress`, `useDebtSummary`, `useCategoryBreakdown`) and all of them delegate to `domain/` functions.

## 9. Core business logic

### Budgets and progress

```
periodExpenses      = expenses where date falls inside the period
spent               = sum(periodExpenses.amount)
remaining           = max(budget - spent, 0)
overspend           = max(spent - budget, 0)
percentUsed         = budget > 0 ? (spent / budget) * 100 : 0
averageDailySpend   = spent / daysElapsedInPeriod
projectedTotal      = averageDailySpend * totalDaysInPeriod
safeDailyRemaining  = remaining / daysLeftInPeriod
```

Status bands, used for both the bar colour and the copy:

* `starting`: 0% used
* `on_track`: under 50%
* `approaching`: 50% to 74%
* `near_limit`: 75% to 99%
* `at_limit`: exactly 100%
* `exceeded`: over 100%

Pace matters as much as the raw number: if `projectedTotal > budget` the user is warned even while still under budget.

### Periods

* Monthly period runs from the 1st to the last day of the calendar month. Key format `YYYY-MM`.
* Weekly period respects `weekStartsOn`. Key format `YYYY-Www`.
* Periods are computed from the current date at read time. Nothing rolls over, nothing is archived, nothing is overwritten. Historical expenses stay queryable forever because the period is derived from the expense date, not stamped on it.

### Budget versioning

Budgets are append only records with an `effectiveFrom` date. The budget applying to any period is the most recent record whose `effectiveFrom` is on or before the period start. This means changing the budget today does not silently rewrite last month's history.

### Debts

```
totalRepaid = sum(repayments for that debt)
remaining   = originalAmount - totalRepaid       // never below zero
status:
  remaining == 0                          → paid
  totalRepaid > 0 and remaining > 0       → partially_paid  (or overdue if past due)
  totalRepaid == 0 and dueDate < today    → overdue
  otherwise                               → pending
```

`originalAmount` is immutable once repayments exist. A repayment is a new record, never an edit to the debt. That is what makes the payment history possible.

Summaries:

```
totalOwedToMe = sum(remaining for direction 'lent' and status != 'paid')
totalIOwe     = sum(remaining for direction 'borrowed' and status != 'paid')
netPosition   = totalOwedToMe - totalIOwe
```

### Analytics

Per period: total spending, spending by category (amount and share of total), highest spending category, transaction count, average expense, average daily spend, comparison against the previous period.

Insights are template driven and fire only when their condition holds:

* "Food is your highest spending category this month" when one category holds the top slot.
* "You have used 80% of your monthly budget" at each crossed threshold.
* "You are spending faster than usual" when projected total exceeds budget.
* "You spent 20% less than last month" on a favourable period comparison.

### Goals

`progress = min(currentAmount / targetAmount * 100, 100)`, marked complete when current reaches target.

## 10. Screens and routes

* `/onboarding`: name, currency, monthly budget, weekly budget, week start. Skippable steps except currency.
* `/`: Dashboard.
* `/expenses`: transaction history with search, filter, sort.
* `/expenses/new` and `/expenses/:id/edit` : expense form (modal on desktop, sheet on mobile).
* `/insights`: category breakdown, trends, period comparison.
* `/debts`: tabbed: Owed to me / I owe, with summary cards on top.
* `/debts/new` and `/debts/:id` : debt detail with repayment history and add repayment action.
* `/goals`: savings goals list and progress.
* `/budget`: set and review monthly and weekly budgets, plus budget history.
* `/settings`: currency, categories, recurring rules, notification preferences, data export, reset.

Global: a persistent add expense button reachable from every screen, and a notification centre in the header.

### Dashboard contents, in priority order

1. Monthly budget progress: budget, spent, remaining, percent, status.
2. Weekly budget progress, same shape.
3. Two debt summary cards: total owed to me, total I owe.
4. Top spending categories for the current month.
5. Recent activity: latest expenses and latest repayments in one merged, time ordered list.
6. Active goal progress.
7. Any live alerts (approaching limit, overdue debts, due soon).

The dashboard shows what the user can act on. It is not a dump of every available statistic.

## 11. Reusable components

* `ProgressBar`: value, max, status band, optional label. The visual backbone of the app.
* `ProgressRing`: same contract, circular, used for goals.
* `StatCard`: label, primary value, optional secondary line and trend.
* `AmountText`: formats paise into the user's currency, handles sign and colour by direction.
* `CategoryChip`: icon, colour, name.
* `ExpenseListItem`, `ExpenseForm`, `CategoryPicker`, `AmountInput`, `DatePicker`
* `DebtCard`: person, original, paid, remaining, status pill, due date.
* `DebtStatusPill`, `RepaymentForm`, `RepaymentHistoryList`
* `GoalCard`, `FilterBar`, `SearchInput`, `EmptyState`, `Sheet`, `Modal`, `Toast`, `ConfirmDialog`
* `PeriodSelector`: switch between months or weeks when browsing history.

## 12. Validation rules

**Expense:** amount required, numeric, greater than zero, at most 2 decimal places, upper sanity bound with a confirm step for very large values. Category required and must exist. Date required, valid, not in the future beyond today. Note at most 200 characters.

**Budget:** amount required, greater than zero. Warn but allow when the new budget is below what is already spent this period.

**Category:** name required, 1 to 30 characters, unique case insensitively. Default categories cannot be deleted. Deleting a custom category requires reassigning its expenses or moving them to Miscellaneous.

**Debt:** person name required, 1 to 50 characters. Original amount required and greater than zero. Date required. Due date, if present, must not be before the debt date.

**Repayment:** amount required, greater than zero, and **must not exceed the remaining balance**. Date required, must not be before the debt date. A repayment cannot be added to a debt already marked paid.

**Goal:** name required. Target amount greater than zero. Current amount at least zero and not greater than target. Target date, if present, in the future.

**Recurring rule:** amount greater than zero, category required, frequency required, start date required, end date after start date if present.

Every form shows inline errors, disables submit while invalid, and preserves user input on failure.

## 13. Notifications

Triggered by evaluation after any mutation that can change a threshold, plus once on app load.

* Budget thresholds at 50%, 75%, 90% and 100% for both monthly and weekly budgets.
* Budget exceeded, separately for monthly and weekly.
* Debt due soon, fired `dueReminderDaysBefore` days ahead.
* Debt overdue, on the day it passes.
* Goal reached.

**Dedupe is mandatory.** Each notification carries a `periodKey` plus type, and a fired registry prevents the same alert repeating within the same period. If spending drops back under a threshold and crosses it again inside the same period, it does not refire. All alerts respect the settings toggles, and reminders can be switched off entirely.

## 14. Edge cases to handle explicitly

* Brand new user with no budget, no expenses, no debts. Every screen needs a real empty state with a clear next action.
* Budget set to zero or never set. Show spending totals without dividing by zero.
* Expense edited: amount, category or date changed. Every dependent total recalculates because nothing was cached.
* Expense deleted. Same, including the case where deleting drops the user back under a threshold.
* Expense moved across a month or week boundary by a date edit. It leaves one period's totals and joins another.
* Category deleted while expenses reference it.
* Repayment exceeding the remaining balance. Blocked at validation.
* Repayment on an already paid debt. Blocked.
* Repayment deleted or edited. Status recomputes and may move from paid back to partially paid.
* Multiple repayments settling a debt exactly to zero.
* Debt with no due date. Never treated as overdue.
* Overdue debt that is then fully repaid. Status becomes paid, not overdue.
* Budget changed mid period. Applies to the current period, does not rewrite past periods.
* Month rollover and week rollover while the app is open. Period keys recompute from the current date.
* Very large amounts (lakhs and crores). Formatting must not break the layout.
* Decimal amounts and rounding. Integer paise storage removes the drift entirely.
* Duplicate person names in debts. Allowed, treated as separate records, never merged silently.
* Storage quota exceeded or corrupt stored JSON. Fail into a recoverable state rather than a blank app.
* Time zone shifts. All calendar dates stored as local date strings, not UTC timestamps.

## 15. MVP build phases

**Phase 0: foundation**
Project scaffold, TypeScript config, Tailwind theme tokens, folder structure, storage adapter with schema versioning, repositories, seed data.

**Phase 1: domain logic and tests**
`money`, `periods`, `budget`, `debts`, `analytics`, `goals`, `validation`. Written and unit tested before any screen exists. This is the part everything else depends on.

**Phase 2: shell and onboarding**
App layout, navigation, routing, providers. Onboarding flow that captures name, currency, monthly budget, weekly budget and week start, then persists them.

**Phase 3: expenses**
Categories with defaults and custom creation. Expense create, edit, delete. Fast add flow. Transaction history list.

**Phase 4: budgets and dashboard**
Budget setting and versioning. Monthly and weekly progress. Dashboard assembled from real selectors. Progress components.

**Phase 5: lending and borrowing**
Debt create and list, split by direction. Debt detail. Repayments with full history. Status resolution and summary cards.

**Phase 6: insights and alerts**
Category breakdown, top category, averages, period comparison, template insights. Threshold alerts with dedupe. Notification centre and preferences.

**Phase 7: should have set**
Search, filtering, sorting. Savings goals. Recurring expense rules with occurrence generation. JSON and CSV export.

**Phase 8: polish and verification**
Empty states, loading states, error states, responsive passes, accessibility pass (labels, focus order, contrast, keyboard reachability), end to end flow verification.

## 16. Acceptance flows to verify before calling the MVP done

1. Onboarding → set budget → add expense → dashboard reflects it immediately.
2. Add expense → category total updates → monthly and weekly progress both update.
3. Create lending record → add partial repayment → remaining balance and status update → add final repayment → status becomes Paid.
4. Create borrowing record → add repayment → "I owe" summary drops by the repaid amount.
5. Cross a budget threshold → correct alert fires exactly once → repeat the action → no duplicate alert.
6. Edit an expense amount → total, remaining, category total, percentage and insights all update.
7. Delete an expense → every dependent figure updates and nothing is left stale.
8. Change an expense date into the previous month → it leaves this month's totals and appears in history for the old month.
9. Refresh the browser at any point → all data still present and identical.
10. Open every screen as a brand new user → sensible empty states, no crashes, no NaN, no division by zero.

## 17. Out of scope for the MVP

Do not build unless explicitly asked: bank integrations, automatic transaction syncing, investments, crypto, tax handling, credit scores, double entry accounting, family or enterprise accounts, AI financial advice, complex forecasting.

## 18. Open questions

* The visual system is settled and lives in `design.md`, drawn from the Plutus Figma inspiration board on 16 August 2026. Three calls remain open there: the palette lane, the name clash with an existing UK fintech, and Indian number grouping.
* Multi currency: MVP assumes one currency chosen at onboarding, no conversion.
* Accounts and sync: MVP is local only, single device. The repository layer exists so a backend can be added later without rewriting features.
