/* Goals. A debt turned around: a target, and a history of what went in.

   The ring from layout L2 lives here rather than on Home, because a goal is
   the one place where a ring is the natural shape and vertical space is not
   being fought over. */

var ScreenGoals = (function () {

  var el = UI.el;
  var SVG = "http://www.w3.org/2000/svg";

  function profile() { return Store.get().profile; }
  function money(paise) {
    var p = profile();
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  /* A 270 degree arc, stroked twice: the track, then the progress. */
  function ring(percent, tone) {
    var LEN = 358;
    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 200 176");
    svg.setAttribute("class", "ring");
    svg.setAttribute("aria-hidden", "true");

    ["track", "value"].forEach(function (which) {
      var path = document.createElementNS(SVG, "path");
      path.setAttribute("d", "M46.3,153.7 A76,76 0 1 1 153.7,153.7");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", "16");
      path.setAttribute("stroke-linecap", "round");
      if (which === "track") {
        path.setAttribute("stroke", "var(--sunken)");
      } else {
        path.setAttribute("stroke", "var(--s-ok)");
        path.setAttribute("stroke-dasharray", String(LEN));
        path.setAttribute("stroke-dashoffset", String(LEN * (1 - Math.min(percent, 100) / 100)));
      }
      svg.appendChild(path);
    });
    return svg;
  }

  function goalCard(v, today) {
    return el("div.card.surf--card",
      el("div.card-head",
        el("b", { text: v.name }),
        v.isComplete
          ? el("span.pill.pill--ok", { text: "Reached" })
          : v.isOverdue
            ? el("span.pill.pill--danger", { text: "Date passed" })
            : v.daysLeft !== null
              ? el("span.pill.pill--sunken", { text: v.daysLeft + (v.daysLeft === 1 ? " day left" : " days left") })
              : null
      ),
      el("div.ring-wrap",
        ring(v.percent, v.isComplete ? "complete" : "saving"),
        el("div.ring-mid",
          el("b", { text: money(v.saved) }),
          el("span", { text: "of " + money(v.targetAmount) })
        )
      ),
      el("div.bar-label",
        el("span", { text: Math.round(v.percent) + "% saved" }),
        el("span", { text: v.isComplete ? "Nothing left to put in" : money(v.remaining) + " to go" })
      ),
      v.perMonthNeeded
        ? el("p.note", { text: money(v.perMonthNeeded) + " a month gets you there in time." })
        : null,
      el("div.btn-row",
        el("button.btn", {
          type: "button", onclick: function () { SheetGoal.contribute(v.id); }
        }, "Add to it"),
        el("button.btn.btn--soft", {
          type: "button", onclick: function () { SheetGoal.detail(v.id); }
        }, "Details")
      )
    );
  }

  function render() {
    var host = document.getElementById("screen-goals");
    if (!host) return;

    var s = Store.get();
    var today = Dates.today();
    var views = Goals.views(s.goals, s.contributions, today);

    UI.clear(host);

    host.appendChild(el("header.band.band--flat",
      el("div.band-top",
        el("button.circle-btn", {
          type: "button", "aria-label": "Back to home", onclick: function () { App.go("#/"); }
        }, UI.icon("ic-back", 17)),
        el("span.band-who"),
        el("button.circle-btn", {
          type: "button", "aria-label": "New goal", onclick: function () { SheetGoal.open(null); }
        }, UI.icon("ic-plus", 17))
      ),
      el("h1.band-title", { text: "Goals" })
    ));

    var body = el("div.screen-body");

    if (!views.length) {
      body.appendChild(el("div.empty",
        el("h2", { text: "No goals yet" }),
        el("p", { text: "Saving for something specific makes it much easier to leave the money alone." }),
        el("button.btn", { type: "button", onclick: function () { SheetGoal.open(null); } }, "Start a goal")
      ));
    } else {
      views.forEach(function (v) { body.appendChild(goalCard(v, today)); });
    }

    host.appendChild(body);
    App.setBandColour("flat");
  }

  return { render: render };
})();

/* ── goal sheets ───────────────────────────────────────────── */

var SheetGoal = (function () {

  var el = UI.el;

  function money(paise) {
    var p = Store.get().profile;
    return Money.format(paise, p.currencySymbol, p.grouping);
  }

  function open(goalId) {
    var existing = goalId ? Store.byId("goals", goalId) : null;
    var draft = {
      name: existing ? existing.name : "",
      targetAmount: existing ? existing.targetAmount : null,
      targetDate: existing ? existing.targetDate || "" : ""
    };
    var err = el("p.form-error", { hidden: true });

    var amountInput = el("input.amount-input", {
      type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": "Target",
      placeholder: "0", value: draft.targetAmount ? String(Money.toRupees(draft.targetAmount)) : ""
    });
    amountInput.addEventListener("input", function () {
      draft.targetAmount = Money.parseInput(amountInput.value);
      err.hidden = true;
    });

    var nameInput = el("input.field-input", {
      type: "text", value: draft.name, placeholder: "What are you saving for?",
      "aria-label": "Goal name", maxlength: 40
    });
    nameInput.addEventListener("input", function () { draft.name = nameInput.value; err.hidden = true; });

    var dateInput = el("input.field-input", {
      type: "date", value: draft.targetDate, min: Dates.today(), "aria-label": "Target date"
    });
    dateInput.addEventListener("change", function () { draft.targetDate = dateInput.value; });

    var form = el("div.sheet-form",
      el("div.amount-row", el("span.amount-sym", { text: Store.get().profile.currencySymbol }), amountInput),
      el("label.field", el("span.field-label", { text: "Name" }), nameInput),
      el("label.field",
        el("span.field-label", { text: "Target date, optional" }), dateInput,
        el("span.field-help", { text: "Without one there is no deadline, just a target." })
      ),
      err,
      el("button.btn", {
        type: "button",
        onclick: function () {
          var r = existing ? Actions.updateGoal(existing.id, draft) : Actions.addGoal(draft);
          if (!r.ok) {
            err.textContent = r.errors.name || r.errors.targetAmount || r.errors.targetDate || "Check the details.";
            err.hidden = false;
            return;
          }
          UI.closeSheet();
          UI.toast(existing ? "Goal updated" : "Goal started");
        }
      }, existing ? "Save changes" : "Start saving")
    );

    if (existing) {
      form.appendChild(el("button.btn.btn--danger", {
        type: "button",
        onclick: function () {
          UI.closeSheet();
          UI.confirmAction({
            title: "Delete " + existing.name + "?",
            body: "Every contribution recorded against it goes too. This cannot be undone.",
            confirmLabel: "Delete", danger: true,
            onConfirm: function () { Actions.removeGoal(existing.id); UI.toast("Goal deleted"); }
          });
        }
      }, "Delete goal"));
    }

    UI.openSheet({ title: existing ? "Edit goal" : "New goal", content: form });
    setTimeout(function () { amountInput.focus(); }, 60);
  }

  function contribute(goalId) {
    var goal = Store.byId("goals", goalId);
    if (!goal) return;
    var today = Dates.today();
    var v = Goals.view(goal, Store.get().contributions, today);
    var draft = { amount: null, date: today };
    var err = el("p.form-error", { hidden: true });

    var amountInput = el("input.amount-input", {
      type: "text", inputmode: "decimal", autocomplete: "off",
      "aria-label": "Amount to add", placeholder: "0"
    });
    amountInput.addEventListener("input", function () {
      draft.amount = Money.parseInput(amountInput.value);
      err.hidden = true;
    });

    var body = el("div.sheet-form",
      el("div.amount-row", el("span.amount-sym", { text: Store.get().profile.currencySymbol }), amountInput),
      el("p.note", { text: v.isComplete
        ? "Already there. Anything more is over the target, which is allowed."
        : money(v.remaining) + " left to reach " + money(v.targetAmount) + "." }),
      !v.isComplete ? el("button.chip", {
        type: "button",
        onclick: function () {
          draft.amount = v.remaining;
          amountInput.value = String(Money.toRupees(v.remaining));
        }
      }, "Finish it, " + money(v.remaining)) : null,
      err,
      el("button.btn", {
        type: "button",
        onclick: function () {
          var r = Actions.addContribution(goalId, draft);
          if (!r.ok) { err.textContent = r.errors.amount || "Check that."; err.hidden = false; return; }
          UI.closeSheet();
          var after = Goals.view(Store.byId("goals", goalId), Store.get().contributions, today);
          UI.toast(after.isComplete ? goal.name + " reached" : money(after.remaining) + " to go");
        }
      }, "Add it")
    );

    UI.openSheet({ title: "Add to " + goal.name, content: body });
    setTimeout(function () { amountInput.focus(); }, 60);
  }

  function detail(goalId) {
    var goal = Store.byId("goals", goalId);
    if (!goal) return;
    var today = Dates.today();
    var v = Goals.view(goal, Store.get().contributions, today);

    var body = el("div.sheet-form",
      el("div.detail-hero",
        el("span.detail-label", { text: "Saved so far" }),
        el("b.detail-figure", { text: money(v.saved) }),
        el("span.detail-sub", { text: "of " + money(v.targetAmount) + (v.targetDate ? " by " + Dates.formatDisplay(v.targetDate, today) : "") })
      )
    );

    if (v.contributions.length) {
      var list = el("div.card.surf--card", el("div.card-head", el("b", { text: "Contributions" })));
      v.contributions.forEach(function (c) {
        list.appendChild(el("div.row",
          el("span.badge.badge--lg", { style: { background: "var(--pl-ok-bg)" } }, UI.icon("ic-up", 16)),
          el("span.row-tx", el("b", { text: money(c.amount) }), el("span", { text: Dates.formatDisplay(c.date, today) })),
          el("button.circle-btn.circle-btn--sunken", {
            type: "button", "aria-label": "Remove this contribution",
            onclick: function () {
              UI.closeSheet();
              UI.confirmAction({
                title: "Remove this contribution?",
                body: money(c.amount) + " will come back off the total.",
                confirmLabel: "Remove", danger: true,
                onConfirm: function () { Actions.removeContribution(c.id); UI.toast("Contribution removed"); }
              });
            }
          }, UI.icon("ic-close", 15))
        ));
      });
      body.appendChild(list);
    } else {
      body.appendChild(el("p.note", { text: "Nothing put in yet." }));
    }

    body.appendChild(el("button.btn.btn--soft", {
      type: "button", onclick: function () { UI.closeSheet(); setTimeout(function () { open(goalId); }, 260); }
    }, "Edit this goal"));

    UI.openSheet({ title: goal.name, content: body });
  }

  return { open: open, contribute: contribute, detail: detail };
})();
