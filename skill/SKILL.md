---
name: health-plan-to-app
description: Turn someone's health goals into training/food plans, a Google Sheet tracker and an installable phone app (PWA) with daily meals, shopping list and logging, then run the weekly review and plan changes. Use when asked to build a fitness/diet plan with tracking or an app, or to resume, review or change one built with this skill.
---

# Health plan → tracker → app

Template repo: https://github.com/dineshvg/health-plan-app (public). Reuse it; don't rewrite the app.

## How to think about this

- **Two worlds, never mixed.** The **public app** (`app/`, served by GitHub Pages) knows meals, weeks, pantry and generic rules. The **private side** (plans repo + Google Sheet) knows the person: weights, dates, conditions, habits, name. The app reads every personal label from the sheet after sign-in. When unsure where something goes, it is private.
- **`plan.json` is a contract**, not prose. The validator and the smoke test enforce it; if they pass, the app works.
- **Numbers come from a script.** `scripts/targets.py` computes BMR, TDEE, deficit, protein, milestones and a realistic date. Never do this arithmetic by hand, and never "adjust" its output silently.
- **`STATUS.md` is the map.** It lives in the private plans repo, records each stage's state and every fact later stages need (repo names, sheet ID, URL, agreed numbers). Any session can resume from it. Update it at the end of every stage, before doing anything else.
- **Person vs agent.** Stages are marked 👤 (needs the person: answers, clicks, consent) or 🤖 (agent alone). Do all 🤖 work you can, then hand the person **one** checklist of clicks, not a drip of requests.

## Hard stops (check before any numbers)

Read [references/guardrails.md](references/guardrails.md) in full before the interview. In short, **no calorie-deficit plan** when the person is under 18, pregnant, has or had an eating disorder (or the conversation suggests one), or wants a goal under BMI 18.5. Say so kindly in plain words and offer what is still safe. `targets.py` refuses some of these (exit 2); the rest are your job.

- **Order:** the hard-stop questions (age, pregnancy/breastfeeding, eating-disorder history, conditions and medication) are asked in the interview. Show **no kcal or protein numbers** until they are answered. Before that you may run `targets.py` as a preview and tell the person in words whether their date is realistic, including the realistic date it gives.
- **A hard stop ends the build:** don't create repos, don't ask for Google or GitHub accounts, don't write STATUS.md. Give the safe alternative in the chat (e.g. an activity plan without calorie numbers).

## Modes

Pick one from the request, then follow it. If a `STATUS.md` exists for this person, never start `new`.

| Mode | When | Do |
|---|---|---|
| `new` | No plan yet | Stages 1→9 below |
| `resume` | A STATUS.md exists with open stages | Read it, report where things stand in 2-3 lines, continue at the first stage not `done` |
| `weekly-review` | Sunday check-in | [references/weekly-loop.md](references/weekly-loop.md) §Weekly review |
| `change-plan` | Swap meals, change days, new cuisine, new numbers | [references/weekly-loop.md](references/weekly-loop.md) §Change the plan |
| `next-block` | Week 11+ of a 12-week block | [references/weekly-loop.md](references/weekly-loop.md) §Next block |

## Stages (mode `new`)

Copy [templates/STATUS.md](templates/STATUS.md) into the private plans repo at stage 1 and keep it current.

| # | Stage | Who | Read | Done when |
|---|---|---|---|---|
| 1 | Interview | 👤 | [guardrails](references/guardrails.md), [interview](references/interview.md) | Every field answered or a stated default; hard stops checked; private plans repo exists with STATUS.md |
| 2 | Targets | 🤖→👤 | [nutrition](references/nutrition.md) | `targets.py` ran; working shown; person **agreed** the date and kcal; numbers in STATUS.md |
| 3 | Plans | 🤖 | [plans](references/plans.md) | `plans/training.md`, `plans/food.md`, private `settings.json` written |
| 4 | App data | 🤖 | [plan-schema](references/plan-schema.md) | Person's public repo has their `app/plan.json`; full validator prints OK |
| 5 | Tracker | 🤖 | [tracker](references/tracker.md) | Sheet built (connector) or `.xlsx` ready; formulas verified |
| 6 | Person's clicks | 👤 | [hosting](references/hosting.md) | One checklist sent; Client ID received; sheet shared; Pages source set |
| 7 | Wire + deploy | 🤖 | [hosting](references/hosting.md) | `config.js` filled, `VERSION` bumped, pushed, Pages workflow green |
| 8 | Verify | 🤖 | [verify](references/verify.md) | All checks pass; live URL loads |
| 9 | Hand over | 🤖 | [verify](references/verify.md) §Hand over | Deliverables sent; STATUS.md says `done`; weekly loop offered |

If the person goes quiet mid-stage, write STATUS.md first, then stop with a one-line "here's where we are, here's what I need".

## Never

- Never put anything personal in `app/` or the public repo, even in a commit message. Run the validator with `--private` before **every** push and read the diff.
- Never ask for or commit a client secret. The OAuth Client ID is public by design.
- Never move tracker columns; the app reads cells by position ([tracker](references/tracker.md)).
- Never use Google Apps Script web apps for logging (they fail on phones with several Google accounts).
- Never present the plan as medical advice.

## Scripts

| Script | Where | Use |
|---|---|---|
| `targets.py` | this skill's `scripts/` | Stage 2 and any number change |
| `validate_plan.py` | template `tests/` (copy in `scripts/`) | Stage 4, before every push |
| `build_tracker.py` | template `tracker/` (copy in `scripts/`) | Stage 5 without a Sheets connector |
| `smoke.js` | template `tests/` | Stage 8 (`npm test`) |
