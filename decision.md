# Plutus: Decision Log

> Running log of everything decided, requested and changed on this project.
> Append only. Newest entries at the bottom of each section.
> Nothing is deleted. If a decision is reversed, the old entry stays and gets marked **SUPERSEDED** with a pointer to the entry that replaced it.

**How to use this file**

* Every request from Kaustubh gets logged under **Requests**.
* Every technical or product choice gets logged under **Decisions** with an ID (`D001`, `D002`, ...).
* Every change applied to files or behaviour gets logged under **Changes**.
* Anything unresolved goes to **Open questions** and moves out when answered.
* Update this file at the end of every working session, before saying a task is done.

## Standing rules and preferences

These apply to all work on Plutus until told otherwise.

* **R1.** No dashes anywhere in written copy. No hyphen, no en dash, no em dash. Applies to documentation, UI copy and commit messages. Code identifiers and package names are exempt.
* **R2.** Do not build placeholder functionality that looks like it works but does not persist or calculate real data.
* **R3.** Business logic stays separate from presentation so budgets, progress, repayments and analytics are testable on their own.
* **R4.** No feature from the "Future / Do Not Prioritize" list gets built unless explicitly asked for.
* **R5.** Seed and sample data are for development and empty state previews only, never presented as the user's real data.
* **R6.** `context.md` is the product source of truth, `architecture.md` is the technical source of truth, `decision.md` is the history. Keep all three current.

## Requests

Everything asked for, in order.

### 2026 08 15

**REQ 001.** Create a new folder called Plutus inside the project directory, treat it as an MVP build, and create a `context.md` inside it derived from the supplied Problem Statement.
Status: done.

**REQ 002.** Continue after the first attempt was interrupted.
Status: done.

**REQ 003.** Generate a detailed `architecture.md` using `context.md`, and create a `decision.md` that logs all decisions made, all changes requested, and everything asked for on this project.
Status: done.

**REQ 004.** Make a phase wise implementation plan in `implementation.md`, using `context.md` and `architecture.md`, keeping in mind that it is an app.
Asked what "app" meant. Answer: **"you have access to timetable app right? it's like that."**
Read as: build it the way the Timetable app is built. Inspected `project/timetable` and confirmed the shape: vanilla HTML, CSS and JavaScript, no build step, no npm, plain `<script>` tags with globals, `localStorage` under one key, a service worker offline shell, a web app manifest, deployed to GitHub Pages.
Status: done.

**REQ 006.** "Take this Figma file. It has the design inspirations for the app... act as a senior product designer and make decisions in that way... ensure the app has a consistent design and there should not be any variations in the designs on one screen and the other."
Figma file `hRrczeduKiRMrK1x9l5yzc`, which turned out to hold a single pinned inspiration collage of six screens from two education apps rather than a design file.
Status: done. `design.md` and `design-preview.html` created, visual system settled, D041 to D049 logged.

**REQ 007.** "The app name will be Plutus."
Status: done. Folder renamed from `project/SpendWise` to `project/Plutus`, and every occurrence replaced across all documents including the storage key, now `plutus.v1`.

**REQ 008.** "The design does not follow the inspiration."
Version 1 rejected. Correctly: it stripped the colour blocking out of the reference and produced white cards on cream. Rebuilt as version 2.
Status: done. D050 to D054 logged, `design.md` rewritten, `design-preview.html` rebuilt.

**REQ 009.** "Show me the example of the other colour direction as well, keep both of them side by side. Also what are these symbols? And the second question's answer is yes."
Status: done. `design-directions.html` built, the band following the budget state confirmed as D053, and the symbols answered: the monospace labels under the swatches are CSS custom property names, where the leading double dash is the language's syntax for declaring a variable.

**REQ 010.** "Let's go with A."
Direction A locked: cream canvas, teal, mustard, rose, periwinkle. Q012 closed, D056 logged, and the token block written into `css/styles.css`.
Status: done. Phase 0 started, then paused for REQ 011.

**REQ 011.** "Can you also explore more design layouts, again keep them side by side."
Status: done. `design-layouts.html` built with four Home layouts in the locked palette.

**REQ 012.** "I liked the first option the most, but in the third option there is a graph with the heading This week day by day. I want that graph in the first option, just above the Where it went section. Now please start building."
Status: done for the layout decision, and Phase 0 is built.

**REQ 013.** "Contribution history, Indian grouping, and Monday." Plus the repository: `https://github.com/Kaustubh-gaurav/Plutus`.
Status: done. All three settled as D062 to D064, Phase 1 built and pushed.

**REQ 014.** "Done." (GitHub Pages enabled.) Then: build Phase 2.
Status: done. The site is live and the logic layer is built and tested.

**REQ 015.** "Start the next phase, also in the figma file add all the icons that you will need, I'll give them to you afterwards."
Status: done. 47 icons drawn into a new "Icons for build" page in the Figma file, and Phase 3 built.

**REQ 016.** "Next phase." Build Phase 4, expenses.
Status: done. Add, edit, delete, categories and history, with 127 tests passing.

**REQ 005.** "First we will deploy it on github and then we might go on playstore, so keep the stack decision like that."
Read as: keep the static PWA stack, and make sure the Play Store remains reachable later without a rewrite.
Status: done. Portability rules added to all four documents and a Phase 10 added to `implementation.md`.

## Decisions

Each entry: what was decided, why, and where it lives.

### Product scope

**D001. Build the MVP scope from the Problem Statement Must Have list only.**
Onboarding, currency, monthly and weekly budgets, expense CRUD, categories including custom ones, dashboard, progress indicators, transaction history, basic analytics, lending, borrowing, partial repayments, debt status, due dates, basic notifications.
Why: the spec is explicit about what the MVP is and what to defer.
Recorded in: `context.md` section 15, sections 17 and 18.

**D002. Should Have items land in Phase 7, after the core loop works.**
Search, filtering, recurring expenses, savings goals, export, notification preferences.
Why: none of them are useful until expenses, budgets and debts are real.

**D003. Bank integrations, investments, crypto, tax, credit score, accounting, family accounts, AI advice and forecasting are out of scope.**
Why: named as "do not prioritize" in the spec.

### Architecture

**D004. Client only, single user, offline capable web app. No backend in the MVP.**
Why: nothing in the spec needs a server, and skipping it removes auth, hosting and sync from the critical path.
Trade off accepted: single device, and clearing browser data destroys everything. Mitigated by putting data export in Phase 7.

**D005. ~~Stack is React 18, TypeScript, Vite, Tailwind, React Router, `date-fns`, Vitest.~~**
**SUPERSEDED by D027** on 15 August 2026. It was logged as an assumption pending confirmation, and the confirmation went the other way.

**D006. ~~State is React Context plus reducers, one slice per domain.~~**
**SUPERSEDED by D029.** There is no React, so state is one in memory `STORE` object.

**D007. Four layer architecture with one way dependencies.**
Still stands, with the technology under each layer changed by D027. Screens → view model → logic and store. Screens never do arithmetic on money.
Why: if any screen can compute money itself, two screens will eventually disagree. One funnel guarantees one answer.
Recorded in: `architecture.md` section 2.

**D008. ~~Persistence is localStorage behind a repository layer, one collection key per entity.~~**
**SUPERSEDED by D030.** One namespaced key holding one object, following the Timetable pattern. The repository boundary survives as `store.js` being the only file that touches storage.

**D009. A schema version and a migration runner exist from day one, even with zero migrations.**
Why: the first schema change should not require inventing the mechanism under pressure.

### Data model and calculation

**D010. All money is stored as integer paise. Rupees exist only at the input and formatting boundaries.**
Why: floating point drift of even one paisa between two screens destroys trust in a money app.

**D011. Nothing derived is ever stored.**
Totals, remaining budget, percentages, category totals, debt balances, debt status and goal progress are all computed on read from raw records.
Why: the spec demands a single source of truth and forbids stale duplicated values. This is the rule that makes edit and delete correctness automatic instead of manual.

**D012. Budgets are append only records with an `effectiveFrom` date, never edited in place.**
The budget applying to a period is the latest record effective on or before that period's start.
Why: changing this month's budget must not silently rewrite last month's history.

**D013. Periods are derived from dates, never stamped onto entities.**
Month key `YYYY-MM`, week key `YYYY-Www`, week start configurable Sunday or Monday.
Why: editing an expense date then moves it between periods with zero data fixup.

**D014. `Debt.originalAmount` is immutable. Repayments are separate append only records in their own collection.**
Debt status is always recomputed, never stored.
Why: the spec requires a full repayment history and forbids overwriting the original amount. It also means deleting a repayment correctly moves a debt from Paid back to Partially Paid on its own.

**D015. A repayment may never exceed the remaining balance, and remaining is floored at zero.**
A debt with no due date can never be Overdue.

**D016. No domain function reads the clock. Today is always passed in, via `lib/clock.ts` at the edges.**
Why: month rollover, week rollover and overdue transitions become directly testable instead of something you wait for.

**D017. Budget status bands are fixed:** starting at 0, on track below 50, approaching 50 to 74, near limit 75 to 99, at limit exactly 100, exceeded above 100.
`ProgressBar` receives the status rather than deriving it, so the band logic exists in exactly one place.

**D018. Alerts are deduplicated by a fingerprint of type plus period key, held in a persisted fired set.**
Why: the spec forbids duplicate or excessive notifications. Crossing 75 percent, dropping under it via a delete, then crossing again in the same period fires once.

**D019. Insights are template driven with guard clauses. No model, no scoring, no prediction.**
Why: the spec asks for simple transparent calculations rather than AI generated advice in the MVP.

**D020. Pace is surfaced alongside the raw number.** If projected total exceeds budget the user is warned even while still under budget.
Why: the core problem is not knowing you are spending too fast until it is too late.

### Build order

**D021. ~~Nine phases, domain logic and its tests before any screen.~~**
**SUPERSEDED by D038.** The principle survived, the phase list was rebuilt for the static PWA stack and extended to eleven phases.

**D022. Ten acceptance flows must pass before the MVP is called done.**
Recorded in: `context.md` section 16.

### Design

**D023. ~~No visual identity is invented before the UI reference images arrive.~~**
**SUPERSEDED by D041 to D049** on 16 August 2026, when the inspiration was supplied. The token discipline survives: every colour, spacing, radius and type value lives in one `:root` block.

**D024. Mobile first, responsive to desktop.** Below `md`: single column, bottom tab bar, sheets. At `md` and above: two column dashboard, side navigation, modals.

**D025. Add expense is a permanent, always reachable action on every screen, rendered as an overlay so nothing unmounts.**
Why: it is the highest frequency action in the app and accurate records depend on it staying fast.

**D026. The dashboard shows only actionable information,** in priority order: monthly progress, weekly progress, the two debt summary cards, top categories, recent activity, goal progress, live alerts.
Why: the spec explicitly says not to display every available statistic.

### Platform and stack, revised 15 August 2026

Triggered by REQ 004 and REQ 005. Everything in this block replaces the earlier framework assumptions. **No calculation rule changed**, because the logic layer never depended on the framework, which is the payoff for having separated it in the first place.

**D027. The stack is plain HTML, CSS and JavaScript. No build step, no bundler, no npm, no framework, no TypeScript.**
Files load as ordinary `<script>` tags in a fixed order and define globals.
Why: the user pointed at the Timetable app as the model, and it is built exactly this way. It has no toolchain to break, it deploys by pushing files, it loads instantly on a phone, and it works from `file://` as well as from a server. Confirmed by reading `project/timetable` rather than assuming.
Replaces: D005.
Recorded in: `context.md` section 5, `architecture.md` section 1.

**D028. It is a PWA: service worker offline shell, web app manifest, installable to the home screen, standalone display.**
The service worker is copied in structure from the Timetable one, which already solved the real problems: a versioned `CACHE` that must be bumped on every deploy, a `SHELL` list where a missing file breaks install for everyone, `no-cache` fetches so the GitHub Pages ten minute `max-age` cannot serve stale files, and network first with a cache fallback.
Answers: Q003.

**D029. State is one in memory `STORE` object, with view models rebuilt on every change.**
`App.refresh()` re renders the visible screen from a freshly built view model after every mutation.
Why: full re render of one section is simple and cannot drift out of sync with the data. There is no incremental DOM patching to get wrong. The expense list pages at 50 rows as the one escape hatch for unbounded growth.
Replaces: D006.

**D030. Storage is a single namespaced key, `plutus.v1`, holding one object.**
Why: this app stores no images, so the whole dataset is a few hundred KB of text at most. One atomic read, one atomic write and a trivial export are worth more than partial writes at this scale. `store.js` remains the only file that touches storage, which preserves the seam that mattered.
Replaces: D008.

**D031. Hash routing, one page, every screen a hidden `<section>`.**
Why: GitHub Pages serves static files and a native WebView has no server either, so path routing would need a rewrite rule that neither target offers. Hash routing also means no page reload, so the add expense overlay can open over any screen with nothing unmounting.

**D032. `[hidden] { display: none !important; }` at the top of the stylesheet, permanently.**
Why: any later rule that sets a display value silently beats the browser default for `[hidden]`. It caused two separate bugs in the Timetable app, an invisible overlay that ate every tap and a badge that would not clear. One rule kills the class.

**D033. Icons are an inline SVG sprite. No icon font, no icon requests.**
Charts are hand drawn inline SVG. No chart library.
Why: works offline by construction, and nothing is fetched from another origin, which D035 requires anyway.

**D034. Testing is `tests.html`, a browser page with a small assert harness over the logic files.**
Why: there is no npm, so there is no Vitest. The logic layer is still tested exhaustively, dates are still injected, and opening the page is a required step before every deploy.
Replaces: the Vitest half of D005.

**D035. Distribution is GitHub Pages first, Google Play Store likely second, with the same files wrapped rather than rewritten.**
Two routes stay open, chosen later: a Trusted Web Activity via Bubblewrap or PWABuilder, where the app is a shell around the live URL and updates ship as a Pages push with no store review; or Capacitor, which packages the files into a native WebView with native storage and notifications available. Current recommendation is TWA first, since the app is already fully offline and update cost stays near zero.
Why: the user stated the plan explicitly in REQ 005.
Recorded in: `context.md` section 5a, `architecture.md` section 8, `implementation.md` Phase 10.

**D036. Eight portability rules are binding from Phase 0**, because retrofitting any of them is expensive:
relative paths only, hash routing only, zero cross origin requests, `store.js` as the only storage caller, Android hardware back handled through history, a maskable 512 icon from the start, a `VERSION` constant in `config.js`, and a `privacy.html` shipped in the repository.
Why: each one is free while the app is empty and painful once there are forty files. The TWA `assetlinks.json` gotcha is noted specifically: it must sit at the **origin root**, meaning the `kaustubh-gaurav.github.io` root repository, not the Plutus project repository.

**D037. `Dates.today()` is the only clock read in the entire codebase.**
Every other function takes today as an argument.
Why: month rollover, week rollover and overdue transitions become tests instead of things you wait for. Restates D016 in the vanilla structure.

**D038. Eleven phases, calculations before screens, one working vertical slice before breadth.**
0 shell install and offline, 1 store and persistence, 2 logic layer and test page, 3 onboarding, 4 expenses, 5 budgets and dashboard, 6 lending and borrowing, 7 insights and alerts, 8 should have set, 9 polish verification and Pages deploy, 10 Android packaging.
**The app is genuinely usable after Phase 5**, which is the natural point to stop and get feedback.
Replaces: D021.
Recorded in: `implementation.md`.

**D039. Phase 10 happens only after the web app is live and verified on real phones.**
Why: packaging an unfinished app means a store review round trip for every fix, which costs days where a Pages push costs seconds.

### Product name

**D040. The app is called Plutus.**
Given by the user in REQ 007. The Figma inspiration file was already named Plutus, so the name predates this decision.
Consequences, all applied: the folder is `project/Plutus`, the storage key is `plutus.v1`, the repository and therefore the Pages URL should be `Plutus`, and an eventual Android package id would be `io.github.kaustubhgaurav.plutus`.

### Visual system, 16 August 2026

The Figma file holds one pinned collage of six screens from two education apps, in two palettes: a top board in cream, rose, mustard and deep teal, and a bottom board in orange, periwinkle and sand with a dark floating tab bar. The brief was to act as a senior product designer, decide, and guarantee no variation between screens.

**D041. Take the language, not the compositions.**
Adopted: flat saturated blocks, large radii, one enormous hero number per screen, the three stat tile row, the Weekly and Month segmented control, circular arrow actions at a card's top right, the dark floating tab bar, charts with rounded caps and a black tooltip pill, the greeting header, uppercase eyebrows, avatar stacks with a plus counter.
Rejected: illustrations and mascots, photographic avatars, decorative confetti and stars, and the mustard dominance.
Why: the inspiration is a children's education product. Its warmth transfers. Its playfulness does not survive contact with someone's money.

**D042. The canvas is always cream. Colour lives in cards, never in screen backgrounds.**
The inspiration gives each screen its own background colour. That is a portfolio shot, and it is exactly the variation the user asked to eliminate. The teal hero card appears on Home and nowhere else.
Why: this single rule is what makes seven screens read as one app while keeping the inspiration's warmth. It is the most consequential decision in `design.md`.

**D043. Colour is semantic and never decorative.**
`--ok` teal is healthy and doubles as the brand, `--warn` amber is a warning, `--danger` rose is a breach, `--owe` indigo is money the user owes, and ten reserved category tints appear only as a circle behind an icon.
Why: someone who learns that an amber bar means getting close must be able to trust that lesson on every screen. Amber therefore cannot also be decoration, which is why the inspiration's mustard was dropped.

**D044. Money owed by the user gets its own hue, and direction is never colour alone.**
Owed to the user and owed by the user are separated by a word, an icon and a colour, all three, every time.
Why: confusing the two directions is the one error this product cannot afford.

**D045. Typeface is Plus Jakarta Sans, self hosted, two variable woff2 subsets, 49KB total.**
Already downloaded into `Plutus/fonts/`. The rupee glyph U+20B9 sits in the latin-ext subset rather than latin, so both files are required. Every element rendering money sets `font-variant-numeric: tabular-nums`.
Why: the inspiration's character lives almost entirely in its geometric bold sans, and a system stack would lose it. Self hosting keeps the no cross origin rule and full offline behaviour intact. The weights turned out to be one variable file per subset rather than three static ones, which halved the budget.

**D046. Four tabs plus a raised centre add button. Goals and Settings are not tabs.**
Home, History, add, People, Insights. Settings opens from the Home avatar, Goals from its dashboard card.
Why: six tabs would shrink every target and bury the two things used constantly. The inspiration uses four plus a highlighted centre for the same reason.

**D047. Every form in the app is a bottom sheet. There are no form screens.**
Why: it removes an entire class of visual inconsistency, and it keeps add expense one tap from anywhere without unmounting the current screen.

**D048. Twelve consistency laws, written as a checkable review list.**
One canvas, one hero, one card, semantic colour, every bar carries its numbers, direction never colour alone, every form a sheet, one row, one button, one icon family, spacing from the scale, nothing from the network.
Why: the primary ask was no variation between screens. A principle nobody can check is only a preference. A design review is these twelve, in order, against the screen.

**D049. No dark mode in the MVP.**
Why: the palette is warm and light by design, and a second theme doubles every design review. All tokens already sit in one `:root` block, so adding it later is a token edit rather than a rewrite.

### Visual system version 2, 16 August 2026

**D050. Version 1 was wrong, and this is why.**
"No variation between screens" was read as a reason to drain the colour. The result was white cards with hairline borders on a cream canvas and one teal accent: a competent generic finance app that had nothing to do with the board supplied. The board's identity is saturated colour blocks, several to a single screen. Screen one alone carries a rose header, a white card, a mustard block and a teal player.
Correction: consistency comes from the system being identical, not from the palette being absent. The colour goes back to full strength and the consistency moves into the laws.
Supersedes: the "colour lives in cards, never in screen backgrounds" half of D042.

**D051. Every screen opens with a full bleed colour band.**
It bleeds to the top edge behind the header, curves off at the bottom at radius 30, and the content is pulled up 26px to overlap it. This is the board's strongest signature and version 1 had none of it.
Why: it gives every screen the same silhouette, so the app reads as one product even though the blocks inside differ.

**D052. Six surfaces, each with a fixed job. Cards are colour, not white boxes.**
Teal, mustard, rose, periwinkle, ink, and cream or white. Periwinkle is money the user owes, everywhere, and is never used for variety.
Why: this is what makes the app look like the reference while staying checkable. The board picks colours because they look good in a portfolio shot. A product cannot.
Note: rose was deepened from the board's `#E8576B` to `#D33E58` so white text on it clears 4.5 to 1.

**D053. The Home band's colour is the budget state.**
Teal under 50 percent, mustard past 50, rose past the budget, with a 500ms cross fade between them.
Why: the boldest colour in the app now does the most important job in the app. The user reads their position before reading a single figure. It is also the deliberate exception to strict screen to screen sameness, and it is worth it because the change carries meaning.

**D053a. CONFIRMED by the user on 16 August 2026.** The Home band follows the budget state. D053 is settled, not provisional.

**D054. The hatch means overspend, and nothing else.**
A 115 degree repeating gradient lifted from the board's leaderboard rows, used only on the segment of a bar beyond the budget.
Why: it gives overspend a second signal beyond colour, which the accessibility rule requires anyway.

**D055. Type gets heavier.** Weight 800 on every figure and card title, 700 on row titles. The board has almost nothing under 600, and lightness was a large part of why version 1 read as a different product.

### Layout, 16 August 2026

**D056. Direction A is locked.** Cream canvas, teal, mustard, rose, periwinkle, ink. Chosen by the user from the A against B comparison. Closes Q012, and with it the last thing blocking Phase 0.

**D057. Home uses layout L1, the hero figure.**
The band carries the greeting, an eyebrow, the remaining amount at 44px, the monthly bar and two glass pills. Below it the weekly card, the two direction tiles, and the category card.
Why: it makes the one question the product exists to answer the biggest thing on the screen, and it degrades gracefully. A brand new user with no history still sees a complete and correct screen, which none of the data heavy layouts manage.
Rejected for now, with reasons: L2's arc gauge is the most distinctive but eats the vertical space that the categories need, L3's three figures reads as a dashboard and the spec explicitly says this must not feel like a spreadsheet, and L4's pace line is the most useful of the four but needs a month of history before it says anything.

**D058. L4's pace strip is added to the Home band in Phase 7, not now.**
The band is a component rather than a layout, so the trend can be dropped into it later without disturbing anything around it.

**D059. L2's arc is kept for the savings goal screen.**
A ring is the natural shape for a goal, and vertical space is not contested there.

**D060. Two cascade rules are now part of the system, because both bugs have already happened.**
First: surface classes live in one block at the very bottom of the stylesheet. Components set their own background, and at equal specificity the later rule wins, so a teal tile silently became a white tile still carrying cream text.
Second: text inside a surface must declare `color: inherit`. An element selector such as `p {}` beats inheritance, so a paragraph inside a coloured card kept the document's paragraph colour and rendered nearly invisible on mustard.
Both are written into `css/styles.css` as comments at the point where they matter.

**D061. Home is layout L1, with L3's day by day chart inserted above the category card.**
Order on Home: band, weekly card, direction tiles, day by day chart, categories, insight.
Why the position works: the screen now reads outward in time. The month in the band, then the week, then the individual days, then where the money actually went. The chart also gives Home something to say in the gap between "a budget exists" and "there is a month of history", which was L1's one weak spot.
Confirms: D057, with the one addition. Supersedes nothing.

### Data and formatting, 16 August 2026

**D062. Savings goal contributions are their own append only records, exactly like repayments.**
A `contributions` collection keyed by `goalId`. A goal keeps `targetAmount` and never has its history overwritten.
Why: it makes goals and debts the same idea in two directions, so one mental model and one set of tests covers both. Answers Q006.

**D063. Indian number grouping.** `1,25,000` rather than `125,000`. Stored on the profile as `grouping: "IN"` so a different currency can carry a different rule later. Answers Q011.

**D064. The week starts on Monday.** Configurable per profile, Monday is the default. Answers Q005.

**D065. The repository is `Kaustubh-gaurav/Plutus`.** Answers Q008. Pages will serve it at `kaustubh-gaurav.github.io/Plutus/`, which is also the TWA scope if that route is taken later.

### Phase 2, the logic layer, 16 August 2026

**D066. Only the highest budget threshold actually crossed is announced.**
Recording one large expense that jumps from 40 to 105 percent produces one alert saying you are over budget, not four in a row saying 50, 75, 90 and 100.
Why: the spec asks for no duplicate or excessive notifications, and four alerts from one action is exactly that.

**D067. A debt alert's fingerprint is scoped to the due date, not to today.**
`debt_overdue:d1:2026-09-10` rather than anything carrying today's date.
Why: scoping it to today would make an overdue debt announce itself every single morning, which trains people to ignore notifications.

**D068. Goal contributions may take a goal past its target, unlike repayments.**
A repayment above the outstanding balance is refused. A contribution above the target is not.
Why: overpaying a debt is a mistake, saving more than you planned is not.

**D069. `Dates.today()` is the only clock read in the codebase, and it is the one impure function in the logic layer.**
Every other function takes today as an argument, which is what makes month rollover, week rollover and overdue transitions testable directly. The tests exercise 31 December to 1 January, February in a leap year and not, and both week start days.

**D070. Calendar dates are local date strings, never UTC timestamps.**
`new Date("2026-08-16")` parses as UTC and lands on the 15th west of Greenwich. Every date is parsed to local midnight instead.
Why: an expense recorded at 11pm on the 31st must belong to that month wherever the phone is.

### Phase 3, onboarding, 16 August 2026

**D071. Only the currency is compulsory in onboarding.**
Name, monthly budget and weekly budget can all be skipped. Nothing is written to the store until the final step, so backing out halfway leaves no half configured profile.
Why: someone who has not decided on a budget should still be able to start recording expenses today. A budget wall on first run loses the user before the app has shown them anything.

**D072. The safe daily allowance is floored, not rounded.**
`₹19,000` over 15 days shows `₹1,266` a day, not `₹1,266.67` and not `₹1,267`.
Why: this figure is an allowance, not a measurement. Someone who spends exactly it every remaining day must land inside the budget, and rounding up quietly puts them over. Caught by looking at a render, and now has its own test.

**D073. Home renders from the store as of Phase 3, earlier than planned.**
Onboarding can now set a budget, and the static Home markup still said "Not set", which is a screen stating something false. The band and the weekly card are real; the tiles, the day by day chart and the category card arrive with real expenses in Phases 4 and 5.
Why: rule R2. A screen that looks alive and is not is worse than an empty one.

**D074. The Figma icon sheet is the handoff format for icons.**
A page named "Icons for build" holds all 47 icons in five sections, each drawn at 24 by 24 with the id the code uses printed underneath. Categories are shown inside their real tinted badge, since that is the only place they appear.
Why: naming each cell after the code id means a redrawn icon drops straight in with no mapping table.

### Phase 4, expenses, 16 August 2026

**D075. A new layer, `actions.js`, sits between the screens and the store.**
Screens never call `Store.insert` directly. Every write goes through an action that validates with the logic layer, mutates through the store, saves, and returns `{ ok, errors }` so a form can show inline messages.
Why: `store.js` stays a pure data layer with no opinion about what is valid, while there is still exactly one validated path from an intention to a saved record. Architecture had validation living inside the store actions; this is cleaner and keeps the data layer free of logic dependencies.

**D076. Deleting a category reassigns its expenses to Miscellaneous in the same write.**
A default category is archived rather than deleted, because the seed set is data the app depends on. Miscellaneous itself cannot be removed, since it is where everything else goes.
Why: there must be no moment where an expense points at a category that is gone. Tested by asserting zero orphans afterwards.

**D077. Setting a budget twice in the same period replaces that record rather than stacking another.**
Append only across periods, replace within one. Otherwise a user who taps twice leaves two records with the same `effectiveFrom` and the resolver has to break the tie by creation time.

**D078. The category used last is preselected in the add sheet.**
Why: expense entry is the highest frequency action in the app, and the next expense is very often in the same category as the last one. It saves a tap on the most repeated action there is.

**D079. A category can be created without leaving the add sheet.**
Someone halfway through recording a coffee should not have to abandon it, go to Settings, make a category, and start again.

**D080. A history row's title is the most specific thing available, and the subtitle carries only what the title did not already say.**
Found by looking at a render: rows were printing "Lunch at Anand" as the title and "Lunch at Anand · Food · UPI" underneath it. Repeating the note on both lines reads as a bug because it is one.

## Changes applied

### 2026 08 15

**C001.** Created folder `project/Plutus/`.

**C002.** Created `context.md`: product framing, the two problems, core loop, design principles, technology decisions, layered architecture, full TypeScript data models, business logic formulas, screens and routes, reusable components, validation rules, notification rules, 26 edge cases, 9 build phases, 10 acceptance flows, out of scope list, open questions.

**C003.** Rewrote all em dashes in `context.md` as colons and replaced ASCII arrows with unicode arrows, to comply with rule R1.

**C004.** Created `architecture.md`: system overview and layer diagram with enforced import rules, the add expense data flow end to end, full file manifest, complete domain layer API signatures, storage keys and migration strategy, repository contract, provider stack and context template, selector catalogue, route tree, component contracts, styling system, performance notes, error handling, testing strategy, accessibility, extension points, and known constraints stated openly.

**C005.** Created `decision.md`, this file.

**C006.** Read `project/timetable` to confirm how the reference app is actually built before planning anything: `index.html` with ordered `<script>` tags, `js/store.js` on one `localStorage` key, `sw.js` with a versioned cache and a shell list, `manifest.webmanifest`, tokens in a `:root` block, inline SVG sprite, no build step.

**C007.** Rewrote `architecture.md` for the static PWA stack. Layer diagram, file layout, script order, single key store shape, full logic API, view model layer, one page router, render cycle, service worker rules, `tests.html` strategy, extension points and constraints. Every calculation rule carried over unchanged.

**C008.** Rewrote `context.md` sections 5 and 6 for the new stack and file layout.

**C009.** Created `implementation.md`: eleven phases, each with goal, position rationale, files, tasks, verifiable done conditions, a phone demo check and named failure modes. Plus working agreements, a deploy checklist, a sequencing summary and open dependencies.

**C010.** Added the Play Store path across all four documents after REQ 005: `context.md` section 5a, `architecture.md` section 8, the portability rules block and Phase 10 in `implementation.md`, and D035 to D039 here.

**C011.** Read the Figma file. It holds one image node, a pinned inspiration collage, rather than a structured design. Downloaded and analysed it.

**C012.** Created `design.md`: what was taken from the inspiration and what was rejected, the three shaping decisions, the colour system with reserved status and category scales, the type scale, spacing, radius and elevation, the shared screen skeleton, twenty two components, the composition of every screen, the twelve consistency laws, accessibility, motion, out of scope, and three open questions.

**C013.** Downloaded Plus Jakarta Sans as two variable woff2 subsets into `Plutus/fonts/`, 49KB total, after checking which subset carries the rupee glyph.

**C014.** Created `design-preview.html`, a rendered specimen with the real typeface inlined: palette swatches, type scale, three phone screens, a component board and the twelve laws. Published as an artifact so it can be reviewed on a phone.

**C015.** Renamed `project/SpendWise` to `project/Plutus` and replaced the name across every document, including the storage key which is now `plutus.v1`.

**C016.** Pointed `context.md`, `architecture.md` and `implementation.md` at `design.md`, replaced the stale notes about waiting for UI references, and added the font files and the token block to the Phase 0 task list.

**C017.** Rebuilt `design-preview.html` as version 2: colour blocked, four phone screens including Home shown twice, on track and over budget, to prove the same blocks hold when the state changes. Rendered locally and checked.

**C018.** Caught and fixed an inconsistency in the rebuild before publishing: on the overdue debt card the bar was drawn full width with the hatch while reading zero percent repaid, when on every other debt card the fill means repaid. Same component, two meanings. The bar is now empty there.

**C019.** Rewrote `design.md` as version 2: what the board actually does, the three decisions, six surfaces with fixed jobs, the hatch, a heavier type scale, the band skeleton, the component list and the twelve laws rewritten for colour.

**C020.** Built `design-directions.html`, an A against B comparison. The two columns share one set of markup, generated from a single template and rendered twice, so the only difference between them is the variable block. Direction B is the bottom board: periwinkle, orange, coral and navy on sand. Both palettes were adjusted for contrast, A's rose deepened from `#E8576B` to `#D33E58` and B's orange red deepened to `#CF3F2C`, so every text pairing clears 4.5 to 1.

**C021.** Built `design-layouts.html`: four Home layouts side by side in the locked palette, sharing components and laws so only the composition differs, plus the trade offs and a recommendation.

**C022.** Wrote `css/styles.css`, the Phase 0 foundation: the full token block for direction A, both self hosted font faces with their unicode ranges, the band, cards, tiles, bars, rows, pills, segmented control, buttons, the floating nav, sheets, toasts and the failure banner.

**C023.** Fixed two cascade bugs found while rendering the layouts, and hardened `css/styles.css` against both. See D060.

**C024.** Built Phase 0. `index.html` with the icon sprite and all six screens as hidden sections, `js/config.js`, `js/ui.js`, `js/app.js`, `manifest.webmanifest`, `sw.js`, `privacy.html`, `README.md`, and the four app icons generated from the real typeface.

**C025.** Verified Phase 0 over a real HTTP origin rather than `file://`, since the service worker and the manifest need one. Every shell file returns 200, the router shows the right screen for each hash, the active tab is marked, the version string is injected, and the boot flag is cleared, which proves the JavaScript ran without throwing.

**C026.** Fixed two defects found in that first render: the Home avatar referenced a class that had never been written, and the Settings privacy row rendered as a default blue underlined link because anchor styling is element level and beat the row component. Both are now in `css/styles.css`.

**C027.** Built Phase 1, `js/store.js`: one key, one object, field by field hydration, the migration runner, id counter, category seeding, generic collection helpers, profile and settings writers, and export, import and reset.

**C028.** Built `tests.html`, a browser test page with a thirty line harness and no npm. 33 cases covering a fresh device, surviving a restart, a value written by an older build, a corrupt value, storage that refuses to write, the collection helpers, repayments and contributions as separate records, and an export and import round trip. All green.

**C029.** Wired the store into boot, and surfaced its two failure states in the interface: a corrupt value and a device that will not accept writes both raise a banner that stays up.

**C030.** Initialised the repository, committed Phase 0 and Phase 1, and pushed to `Kaustubh-gaurav/Plutus`.

**C031.** Built Phase 2, the whole logic layer: `money.js`, `dates.js`, `expenses.js`, `budget.js`, `analytics.js`, `debts.js`, `goals.js`, `alerts.js`, `validate.js`. All pure, no DOM, no storage, no clock.

**C032.** Grew `tests.html` from 33 cases to **107**, all passing. Covers paise rounding against binary floating point drift, Indian grouping, month and week boundaries including a leap year and a new year crossing, every status band boundary, budget resolution by `effectiveFrom`, the full debt lifecycle including deleting a repayment to reverse a settlement, alert deduplication across periods, and every validation rule in both directions.

**C033.** Cleaned three things before committing rather than after: a positional `arguments[3]` in `analytics.js` became a named parameter, and two test expectations that were clever rather than readable were rewritten.

**C034.** Wired all nine logic files into `index.html` in dependency order and into the service worker shell, bumped `CACHE` to `plutus-v2` and `VERSION` to `0.2.0`, and verified every shell entry exists before pushing.

**C035.** GitHub Pages is live at `https://kaustubh-gaurav.github.io/Plutus/`.

**C036.** Built the Figma icon sheet: a new page in `hRrczeduKiRMrK1x9l5yzc` with 47 icons across navigation and chrome, actions, money and state, the thirteen categories, and payment methods.

**C037.** Built Phase 3, `js/onboarding.js`: five steps, the gate in `app.js`, and the full screen band treatment from `design.md`. Verified by driving the whole flow headless and reading back what was written: profile, currency, week start and both budget records with the right `effectiveFrom` dates.

**C038.** Built `js/screen_home.js` so Home reads the store. Verified in all four budget states, and confirmed the band colour and the status bar follow the state, teal to mustard to rose, with the hatch marking overspend.

**C039.** Found and fixed the daily allowance rounding, see D072. 108 tests passing.

**C040.** Built Phase 4: `js/actions.js` the validated write path, `js/sheet_expense.js` the add and edit sheet, `js/screen_expenses.js` the history screen, and the form styles.

**C041.** Verified the whole loop by driving the real interface headless rather than calling functions directly: opened the sheet, typed an amount, picked a category, saved, and watched the Home band fall from ₹25,000 to ₹19,000 to ₹17,500. Then edited an entry from ₹1,500 to ₹12,000 and watched the band drop to ₹7,000 and change colour from teal to mustard. Then deleted one and watched it climb back. Then deleted a category and confirmed zero orphaned expenses.

**C042.** Fixed two rendering defects found in that pass: history rows printed the note twice, and payment methods rendered lowercase.

**C043.** Tests up to **127**, adding the write path: valid writes persist, invalid ones are refused and write nothing, a refused edit leaves the record alone, an edit moves every dependent figure, category deletion never orphans, defaults archive rather than delete, and budgets stay append only.

## Open questions

Move an item out of this section, into Decisions, as soon as it is answered.

**Q001. ~~UI reference images have not been supplied.~~ ANSWERED 16 August 2026.** Inspiration collage supplied in the Plutus Figma file. The system is settled in `design.md` and rendered in `design-preview.html`. See D041 to D049.

**Q012. ~~A or B.~~ ANSWERED 16 August 2026: A.** See D056.

**Q012 note.** Both are built and rendered in `design-directions.html`. A is cream and teal from the top board, B is sand and periwinkle from the bottom board. Recommendation is A, because teal to rose is a much longer journey than periwinkle to coral, so a healthy month looks calm and an overspent one genuinely lands. B is warmer and closer to the bottom board's energy, at the cost of a smaller gap between fine and not fine. **This is the last thing blocking Phase 0.**

**Q013. ~~The Home band changing colour with the budget state.~~ ANSWERED yes, 16 August 2026.** See D053.

**Q009. Palette lane.** The warm cream, teal, amber and rose lane was chosen over the bottom board's orange and periwinkle, because those three hues map onto healthy, warning and breach with no forcing, and cream reads calmer under dense figures. Swapping is the token block plus a fresh status mapping, and now is the cheapest moment to do it.

**Q010. Name clash.** A UK fintech trades as Plutus. Irrelevant to a GitHub Pages release, worth a search before a Play Store listing.

**Q011. ~~Number grouping.~~ ANSWERED: Indian grouping.** See D063.

**Q002. ~~Stack was assumed, not specified.~~ ANSWERED 15 August 2026.** Vanilla static PWA in the Timetable shape. See D027.

**Q003. ~~Platform.~~ ANSWERED 15 August 2026.** Installable PWA first on GitHub Pages, Android wrapper later. See D028 and D035.

**Q004. Multi currency.** MVP assumes one currency chosen at onboarding with no conversion. Confirm that is enough.

**Q005. ~~Week cycle default.~~ ANSWERED: Monday.** See D064.

**Q006. ~~Savings goals funding.~~ ANSWERED: contributions keep a history.** See D062.

**Q007. Android wrapper route.** TWA or Capacitor, per D035. Recommendation is TWA, but it does not need deciding until Phase 10. If TWA wins, the `assetlinks.json` file has to go in the `kaustubh-gaurav.github.io` root repository, so that repository needs to stay available.

**Q008. ~~Repository and URL.~~ ANSWERED: Kaustubh-gaurav/Plutus.** See D065.
