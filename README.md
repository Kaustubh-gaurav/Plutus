# Plutus

A personal money app. It answers four questions: what did I spend, what do I have left, who owes me, and who do I owe.

Static, offline first, installable. No build step, no bundler, no npm, no framework. Plain HTML, CSS and JavaScript, `localStorage`, a service worker, deployed as static files to GitHub Pages.

Everything stays on the device. There is no server, no account and no sync.

## Running it

There is nothing to build. Open `index.html` in a browser and it works.

The service worker and the manifest need a real origin, so to test install and offline behaviour, serve the folder:

```
python -m http.server 8731
```

Then open `http://127.0.0.1:8731`. To try it on a phone on the same network, use the machine's IP rather than `127.0.0.1`.

## Layout

```
index.html               one page, every screen a hidden section
privacy.html             required for the Play listing, and true from day one
manifest.webmanifest
sw.js                    offline shell. read the two rules at the top
css/styles.css           tokens first, then components. surfaces last, on purpose
fonts/                   Inter, two variable subsets, 133KB. Both needed: the rupee sign is in latin-ext
icons/
js/config.js             constants. loaded first
js/ui.js                 DOM helpers, sheets, toasts, confirms
js/app.js                boot and hash router. loaded last
```

Scripts load in dependency order and define globals. **Order is load bearing**, and every file must also appear in `SHELL` in `sw.js`.

## The documents

* `context.md` what the product is and why
* `architecture.md` how the code is put together
* `design.md` the visual system, and the twelve laws a screen is reviewed against
* `implementation.md` the build order, phase by phase
* `decision.md` every decision, change and open question, appended never rewritten

Read `design.md` before touching anything visual, and `implementation.md` before starting a phase.

## Deploying

Every single time:

1. Open `tests.html` and confirm it is green. (Arrives in Phase 2.)
2. Check every file listed in `SHELL` in `sw.js` actually exists.
3. Bump `CACHE` in `sw.js` and `VERSION` in `js/config.js`.
4. Confirm any new script is in `index.html` in dependency order.
5. Confirm there are no absolute paths. Searching for `src="/` and `href="/` must return nothing.
6. Push. Then reopen the installed app twice, because the new worker activates on the second open.

Skipping step 3 is how you ship a change that nobody can see.

## Why it is built this way

Because it has to install on a phone, open with no signal, and survive being ignored for a month. A toolchain that can break is a toolchain that will break, so there isn't one. The trade off is no type checker, which is paid for with a pure logic layer, validation on every write path, and a browser test page.

The Android and Play Store path is written up in `implementation.md` Phase 10. The eight portability rules at the top of that file are what keep it available, and they are cheap now and expensive later.
