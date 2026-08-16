# Plutus: Design System

> The visual source of truth. `context.md` is product, `architecture.md` is code structure, `implementation.md` is order, `decision.md` is history.
> Anything on screen that is not in this file does not exist.

Last updated: 17 August 2026
**Version 3, dark.** Source: four new reference images in the Plutus Figma file, `hRrczeduKiRMrK1x9l5yzc`, from the DoMORE case study.

**Why there is a version 3.** New inspiration replaced the old board. The direction inverts almost every surface decision from version 2 and keeps every structural one.

Ground: warm cream becomes near black `#121416`.
Cards: saturated colour blocks become one dark surface with a hairline.
Accent: teal, mustard, rose and periwinkle become one acid lime, plus a warning and a breach.
Radius: 24 on cards becomes 14, and pills become 10px rectangles on buttons.
Buttons: pill and sentence case become rectangle, uppercase and tracked.
Tabs: a sunken segmented pill becomes an underline.
Band: a colour block on every screen becomes Home only, with every other screen flat.

**What did not change**, because none of it was ever about the palette: money as integer paise, nothing derived is stored, the status bands, colour never carrying meaning alone, every form in a sheet, one component one appearance, and a 44px minimum target.

## 0. The palette, sampled not guessed

Taken from the reference pixels rather than estimated.

```
--canvas    #121416    behind every screen
--surface   #1E2021    every card
--surface-2 #282A2C    sheets, inputs, raised things
--line      #34383A    the only border
--ink       #FFFFFF    --ink-2 #A7ADB0    --ink-3 #8D9295
--on-accent #101314    text on any bright fill

--s-ok      #C2F854    the brand AND the healthy state
--s-warn    #FFC24B    approaching
--s-danger  #FF5C5C    at or past the limit, overdue
--s-owe     #A99BFF    money you owe
```

Every pairing was measured, not eyeballed. Lime on canvas is 14.8 to 1, ink on lime 15.0, ink on amber 11.6, ink on danger 6.2, ink on periwinkle 7.8, and `--ink-3` is 5.9. The first `--ink-3` tried measured 4.26 and was rejected for being under the threshold for small text.

**Category colour moved.** On cream, a category was a pastel circle. On dark, pastel circles turn to mud, so the category hue is now the **icon** and the badge behind it stays neutral. Ten hues, unchanged in meaning.

## 1. What the board actually does
## 1. What the board actually does

**Version 3.** The reference is a near black app with a single acid lime accent. Lime appears as full width primary buttons with uppercase labels, as a banner block with dark text on it, as the active tab underline, as the selected state on a tile, and as highlighted words in a headline. Everything else is dark grey on darker grey, separated by hairlines rather than by colour. Radii are small. Text is white with grey secondaries.

The discipline that makes it work is restraint: **one loud colour, used only where something is actionable or urgent.** That is the same discipline version 2 had, pointed at a different palette.

*(The paragraph below describes the previous board and is kept because it explains decisions still in force.)*

Screen one of the old board carried a rose header block, a white card, a mustard block and a teal player in a single screen. Saturated blocks of colour, several to a screen, were that direction's whole identity.

**Taken:**

* A full bleed colour band at the top of the screen, curved off at the bottom, with content pulled up to overlap it.
* Cards that are colour, not white boxes with a hairline.
* One enormous number as the hero of a screen.
* Rounded square icon badges, alongside circular buttons and avatars.
* Black pill buttons, dark cards, and a dark floating tab bar with the active item in a filled circle.
* The stat tile row, the Weekly and Month segmented control, circular arrow actions at a card's corner.
* The diagonal hatch texture from the leaderboard rows.
* Chunky proportions: large radii, heavy weights, generous padding.

**Rejected:**

* Illustrations, mascots, confetti, stars and dotted paths. They carry a children's education product and they are all assets to load, which the offline rule forbids.
* Photographic avatars. People are initial avatars, section 7.
* Arbitrary colour. In the board, a card is pink because pink looked good there. Here every surface colour has a fixed job, section 3.

## 2. The three decisions

**One. Colour is the identity, and every colour has a job.**
Six surfaces: teal, mustard, rose, periwinkle, ink and cream or white. A card's colour says what it is, and it never changes because a screen needed variety. Periwinkle means money you owe, on every screen, forever.

**Two. The Home band's colour is the budget state.**
Under half the budget it is teal. Past half it is mustard. Past the budget it is rose. The boldest colour in the app is doing the most important job in the app, and the user reads their position before they read a single number. This is the one place colour changes, and it changes for a reason.

**Three. Loud does not mean loose.**
Four saturated surfaces make it easier, not harder, for screens to drift apart. So the grammar is fixed: band, content pulled up over it, floating nav. Same on every screen. Two loud surfaces per screen maximum. One component, one appearance.

## 3. Colour

### Surfaces

```
--canvas   #FBF5E7   behind every screen, always
--cream    #FDF8EC   sheets and quiet cards
--white    #FFFFFF   lists and charts, where figures must stay legible
--teal     #1F6259   on track, owed to you, paid            text: --on-teal
--amber    #F0A93E   approaching, due soon, active nav      text: --on-amber
--rose     #D33E58   over budget, overdue, the add button   text: #FFF3F4
--peri     #8E8BEE   money you owe, and nothing else        text: --on-peri
--ink      #1A1720   nav, primary buttons, feature cards    text: --on-teal
--sunken   #EFE6D2   tracks and inactive segments on light surfaces

--on-teal  #F6F0DE   --on-amber #2A1A02   --on-peri #151046
```

Text colour follows the surface and never the other way round. Dark ink on mustard, cream and periwinkle. Light on teal, rose and ink. Rose was deepened from the board's `#E8576B` to `#D33E58` so that white text on it clears 4.5 to 1.

### Category tints

Ten, used only as a rounded square badge behind a category icon, never as a card fill, so they can never be mistaken for a surface with a meaning.

```
sky #D6E4F2   lilac #E5DCF4   sage #DCE7CE   clay #F5DAC6   sand #EFE4CA
plum #EEDAE6  stone #E5E1D8   mint #D2E8DE   apricot #F7E0CC  denim #DAE0EF
```

Custom categories pick from these ten, never from a free colour picker.

### The hatch

`repeating-linear-gradient(115deg, rgba(255,255,255,.55) 0 4px, transparent 4px 9px)`, lifted from the board's leaderboard rows. It has exactly one meaning: **the part of a bar that is overspend**. It is never decoration.

## 4. Type

**Inter**, self hosted as two variable woff2 subsets in `fonts/`, 133KB together. The rupee glyph U+20B9 lives in the latin-ext file, so both are required, exactly as with the face this replaced. Fallback is the system stack.

Changed from Plus Jakarta Sans on 17 August 2026 at the user's request. Inter is the more neutral face of the two: a larger x height, tighter apertures, and a lower profile at display sizes, so the same headline reads slightly wider and slightly calmer. It costs 133KB against Jakarta's 49KB, because its variable file spans 100 to 900 and its latin-ext subset is large. That is a one time cost on a cached shell.

Inter's letterforms are optically smaller at the same point size, so the display sizes keep their negative tracking and nothing else moved.

Every element that renders money or a percentage sets `font-variant-numeric: tabular-nums`. Figures jitter without it, and figures that jitter are figures nobody trusts.

```
display-xl  44 / 800  -0.04em   the one hero figure per screen
display     29 / 800  -0.03em   screen titles in the band
title       16 / 800  -0.02em   card titles
amount      15 / 800            every figure in a row
body        14 / 700  -0.01em   row titles
label       11 / 700            captions and sublines, often at 60 percent opacity
eyebrow     10 / 700  +0.11em   uppercase, inside the band only
```

Weights are heavy throughout. The board has almost nothing under 600, and lightness is what made version 1 look like a different product.

## 5. Space, shape and elevation

**Spacing.** 4, 6, 8, 11, 12, 16, 18, 22, 26. Screen gutter 18. Card padding 16. Gap between cards 12.

**Radius.**

```
phone shell   38    the mockup frame only
band bottom   30    and sheets at the top
card          24
tile          22
badge         13    rounded square, icons and initials
pill         999    chips, buttons, bars, avatars, nav
```

**Elevation.** Flat. Colour separates surfaces, so no card carries a shadow or a border. Only the floating nav and open sheets cast one.

## 6. Screen skeleton

```
┌──────────────────────────────┐
│  BAND, full bleed to the top │  header row, then title or hero figure
│  curved off at the bottom    │  colour: teal, except Home, which follows budget state
├──────────────────────────────┤
│  content, pulled up 26px     │  18px gutter, 12px between cards
│  to overlap the band         │
│  96px bottom spacer          │
├──────────────────────────────┤
│  dark floating nav           │  4 tabs plus a raised rose add button
└──────────────────────────────┘
```

Every screen. The band is the signature, and a screen without one is a bug.

**Navigation.** Home, History, add, People, Insights. The add button is rose and raised, reachable from anywhere. Goals and Settings are one tap deeper, from the Home avatar and the Goals card, because six tabs would shrink every target.

## 7. Components

**Band.** Full bleed, radius 30 at the bottom. Holds a header row, then either a screen title or an eyebrow plus a hero figure plus a bar plus up to two glass pills. Teal everywhere except Home.

**Card.** Radius 24, padding 16, one of the six surfaces, no border, no shadow. Optional title row with a single circular action at the right.

**Tile.** Radius 22, a rounded square badge, a figure at 21px weight 800, a label. Always in a row of two or three.

**Progress bar.** 11px, fully round, track at 13 percent ink on light surfaces and 26 percent white on dark ones. Fill is the status colour, or `--ink` on mustard, or `currentColor` on the band. Overspend is a second segment carrying the hatch. **Always paired with the figure row above it.**

**Row.** A 38px rounded square badge, a title at 14px weight 700, a subline at 11px, and a right aligned amount at 15px weight 800 with an optional smaller line beneath. Expenses, debts, repayments and recurring rules all use it.

**Pill.** Radius full, 10.5px weight 800. Five kinds: dark, white, glass at 24 percent white for use on a colour band, soft status tint, and sunken.

**Segmented control.** Sunken track, white active pill.

**Circle button.** 36px. Glass on a band, sunken on a light surface, ink when primary.

**Avatar.** Initials only, never a photograph. A rounded square badge in one of the ten tints, chosen from a hash of the name, so Rahul is always mustard.

**Sheet.** Cream, radius 30 at the top, a grabber, and a full width ink button at the bottom. **Every form in the app is a sheet.**

**Amount input.** The sheet's hero. 48px weight 800 with the rupee sign at 24px and 42 percent opacity, autofocused, numeric keypad.

**Charts.** Inline SVG. Bars with radius 9 and a value above each. Overspending days carry the hatch.

**Empty state.** A geometric mark built from the band and bar shapes, a title, one line, one ink button. No illustrations.

## 8. Screen compositions

**Home.** Layout L1, chosen 16 August 2026. Band in the budget state colour: greeting, avatar, bell, eyebrow, the remaining figure, the monthly bar, two glass pills. Then, in this order:

1. the weekly card in mustard,
2. the two direction tiles in teal and periwinkle,
3. **the day by day bar chart for the current week**, in a white card,
4. the category card, "Where it went",
5. an ink card carrying the single most useful insight, when there is one.

The day by day chart was lifted from layout L3 at the user's request. It sits directly above the category card, so the screen reads outward in time: the month, then the week, then the days, then where it all went.

**History.** Teal band with the title and a search field. White cards grouped by day with a day total, rows inside.

**Insights.** Mustard band with the title and two dark pills carrying the headline figures. White chart cards. A teal card carrying the one sentence insight.

**People.** Teal band with the title and the two direction tiles, one glass and one periwinkle. Then the segmented control, then one card per person: white when pending or partially paid, rose when overdue, cream when settled.

**Debt detail.** Band in teal or rose depending on overdue, carrying the person's name and the remaining figure. Three tiles for original, repaid and remaining. A white card of repayment history. An ink button to add a repayment.

**Goals.** Teal band. One card per goal with a ring.

**Settings.** Teal band. Cream cards of rows.

**Onboarding.** No nav. A full screen band that fills the whole screen, one question per step, one field, an ink button.

## 9. The laws

Loud surfaces make drift easier, so these carry more weight than in version 1. A design review is these twelve, in order, against the screen.

1. **Home opens with a bright band; every other screen opens flat.** On cream a dark band read as a block. On near black a dark band on a dark canvas is an invisible rectangle, so only Home, where the budget state is worth shouting, carries a colour block. Everywhere else it is a hairline under a title.
2. **One surface, one accent.** Cards are all `--surface`. Colour appears on the Home band, on primary buttons, on bars, on selected chips and on status pills. A new colour needs a new job first.
3. **A surface colour means one thing.** Periwinkle is money you owe, everywhere, always.
4. **Only the Home band changes colour.** Teal, mustard, rose, driven by the budget. Every other block keeps its colour forever.
5. **Text colour follows the surface.** Dark on mustard, cream and periwinkle. Light on teal, rose and ink.
6. **Every bar carries its numbers**, and overspend is always the hatch, never a different colour.
7. **One card, one radius.** 14 on cards, 12 on tiles, 10 on buttons and badges, 18 on sheets, full round on pills and chips.
8. **Figures are weight 800**, tabular, no exceptions.
9. **Every form is a sheet.**
10. **Direction is never colour alone.** Owed to you and you owe carry a word, an arrow and a colour, all three.
11. **Two loud surfaces per screen, maximum.** The band counts as one. Everything else is cream or white, or the screen becomes noise.
12. **Nothing loads from the network.** No font CDN, no remote images, no icon fonts.

## 10. Accessibility

* Colour is never the only carrier of meaning. Every status carries a word, every direction carries an arrow.
* White on rose `#D33E58` and on teal `#1F6259` both clear 4.5 to 1. Ink on mustard and on periwinkle clear it comfortably. These pairings are fixed and must not be improvised.
* Glass pills at 24 percent white are for short labels on a band only, never for a value.
* Minimum touch target 44px, nav items 52px.
* Bars carry `role="progressbar"`, `aria-valuenow` and a text equivalent.
* Sheets trap focus, close on escape and on Android back.
* `prefers-reduced-motion` disables every transition.

## 11. Motion

* Taps: 120ms ease out, background and a scale to 0.98.
* Sheets: 240ms slide with a fading scrim.
* Progress bars: 400ms ease out on width, so adding an expense visibly moves the bar.
* **The band changing colour: 500ms cross fade.** Crossing 50 percent or going over budget should be felt. This is the one piece of motion that carries meaning.
* Screen changes: 160ms cross fade. Nothing loops, nothing pulses.

## 12. Out of scope

Dark mode, custom category colour picking, photographs, illustrations, and any personalisation. One product, one look.

## 13. Open

1. **Is this the level of colour intended.** This is the top board at full strength. The bottom board instead would mean periwinkle and orange leading, sand rather than cream, and a navy nav.
2. **The Home band changing colour.** The boldest idea here, and the one deliberate exception to strict screen to screen sameness.
3. **Number grouping.** Indian grouping assumed, `1,25,000` rather than `125,000`.
