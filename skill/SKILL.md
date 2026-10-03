---
name: health-plan-to-app
description: Turn someone's health goals into training/food plans, a Google Sheet tracker and an installable phone app (PWA) with daily meals, shopping list and logging. Use when asked to build a fitness/diet plan with tracking or an app.
---

# Health plan → tracker → app

Template repo: https://github.com/dineshvg/health-plan-app (public). Reuse it; don't rewrite the app.
Read its `README.md` (plan.json schema), `tracker/LAYOUT.md` (cell contract) and `tracker/settings.example.json` before starting.

## 0. Guardrails (always)
- Not medical advice. If the person mentions a condition (heart/BP, diabetes, pregnancy, sleep disorders, eating disorder, injuries, medication), add "check with your GP first" and keep targets conservative. Refuse crash goals: if the goal needs more than ~1 % of body weight per week, say so and propose a later date.
- Privacy: two places, never mixed.
  - **Public** (app repo, published by GitHub Pages): `app/` only, meaning meals, weeks, pantry, rules and categories. Keep `name` generic. No weights, goal, dates of goals, conditions, habits, family or schedule details.
  - **Private**: the plans repo, `tracker/settings.json` (git-ignored) and the Google Sheet. Weights, milestones, the habit, rule names and goals go here. The app reads every log, train and stats label from the sheet's header rows after sign-in.
  - Before every push: `python tests/validate_plan.py --private <settings.json>` must pass. Also read the diff for anything personal.
- Never ask for or commit a client secret. The OAuth client ID is public by design.

## 1. Interview (one message, then default the rest)
Ask about:
- age, sex, height, weight, and goal + date
- city/country (shops, units)
- equipment (gym/home/none), training days per week and minutes
- job/activity, family and schedule constraints
- food limits (diet, allergies, dislikes, cooking time, budget)
- health conditions, sleep
- one habit to cut (smoking, snacks, alcohol…)
- which Google accounts need access, and their GitHub username

If something goes unanswered, pick a sensible default, say which one you picked, and continue.

## 2. Numbers (show the person the working)
- BMR with Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age, then +5 for men or −161 for women.
- Activity factor:
  - 1.2: desk job, little exercise
  - 1.375: desk job + 2–3 workouts per week
  - 1.55: active job, or 4–5 workouts per week
  - 1.725: very active
- Daily deficit:
  - needed = kg to lose × 7700 ÷ days to goal date
  - use max(250, min(500, needed))
  - if needed > 750, the date is unrealistic, so propose a later one
  - never below BMR
  - for muscle gain, use a surplus of +200–300 instead
- Protein: 1.6–2.0 g per kg of goal weight.
- Milestones: up to 4, on a straight line from start to goal at the planned weekly rate.

## 3. Plans (Markdown in a PRIVATE repo, e.g. `<user>/<name>-plans`)
- `plans/training.md`:
  - 12 weeks in 3 phases, sessions A/B/C with warm-up and exercises (sets × reps)
  - a progression rule, deload weeks 4 and 8, test week 12, and an RPE guide
  - what comes after week 12 (see §8)
- `plans/food.md`:
  - the targets from §2, with the working shown
  - 6 simple rules
  - a 2-week rotation with a Sunday batch cook and planned leftovers
  - a pantry list
- `tracker/settings.json`: the private tracker settings (see §5). It is fine here because this repo is private.
- Optional: a sleep and habit plan, and a weekly rhythm.

## 4. App data: `app/plan.json` (public repo)
Create the person's own public repo from the template ("Use this template", or ask them to create an empty public repo and copy the template in). Replace ALL example meals:
- `meals`: kcal, protein, a short `how`, and `buy` items `{name, qty, unit, cat}` per time it's cooked (local product names). Set `portions` when it's cooked for later.
- `weeks`: 2 weeks (Mon..Sun) of `{training?, b, l, s, d, prep?, batch?}`. `"@key"` means leftovers of that meal. Daily totals, leftovers included, within ±10 % of `target`; protein ≥ 90 % of target.
  - Plan a Sunday batch cook that feeds Monday's leftovers.
  - On `startDate` itself the app cooks an `@` meal fresh.
- `categories`: shopping aisles in store order. Rename the keys and labels to fit the diet, e.g. "Eggs, tofu & soy" for vegetarians.
- `pantry`, `rules`, `startDate` (a Monday), `sessionsPerWeek`, `shopNote` (local shops, round up to pack sizes).
- Validate: `python tests/validate_plan.py --exclude <diet/allergy words> --private <settings.json>` must print OK.

## 5. Tracker (private Google Sheet)
- Write `tracker/settings.json` from `settings.example.json`:
  - `startDate` = plan start
  - start/goal weight, goal date and milestones (from §2)
  - the habit (`label`, `weekly`, `freeDays`) and the drinks label
  - 6 `dailyRules` (short versions of the food rules)
  - `sessions` `{dayOffset, code, focus}` and the number of `weeks`
  - `tests`
- With the Google Sheets connector: create the spreadsheet and reproduce `tracker/build_tracker.py`'s layout exactly:
  - tabs and every row, column and formula as in `tracker/LAYOUT.md`
  - conditional-format rules: one sheet per request
  - set the locale and timezone
  - add Y/N data validation
  - verify the formulas: write sample rows, read them back, then clear them
- Without a connector: run `python tracker/build_tracker.py tracker/settings.json` and give the person the .xlsx to upload with "Save as Google Sheets".
- Rename headers freely to fit the person (labels come from row 1), but never move columns.
- Share the sheet as Editor with every account from the interview, and put its ID in `app/config.js` `SHEET_ID`.

## 6. Sign-in + hosting (the person does the clicks; give exact steps)
- Google Cloud:
  1. Create a new project and enable the Google Sheets API.
  2. Set up the consent screen as External/Testing, with test users.
  3. Under Clients, create a Web application with the origin `https://<user>.github.io`.
  4. They send you the Client ID; put it in `CLIENT_ID` in `app/config.js`.
- In the repo: Settings → Pages → Source: GitHub Actions. The included workflow deploys `app/` on every push.
  - The app URL is `https://<user>.github.io/<repo>/`.
  - Private repos can't use free Pages.
- Bump `VERSION` in `app/sw.js` on every deploy.
- Don't use Google Apps Script web apps for logging. On phones signed into several Google accounts they fail with "Sorry, unable to open the file".

## 7. Test before saying done
Run `npm install && npm test`, or with an existing Chromium: `CHROMIUM_PATH=/path/to/chromium node tests/smoke.js`. It covers:
- the plan checks
- a 390×844 browser run with Google mocked: meals, shopping, pantry "low", log labels from the sheet, save to row `2 + days since start`, and no page errors

After pushing, confirm the Pages workflow is green.

## 8. Weekly loop and next block
- Offer a Sunday routine:
  - read Daily Log + Weekly Review
  - report the 7-day average trend, rules %, workouts, sleep and the habit
  - if "ADJUST" (3 flat weeks): suggest ONE change (−100–150 kcal or +2,000 steps/day)
- In week 11, offer the next 12-week block:
  - same structure, progressed loads, new test week
  - append Workouts rows (weeks 13–24) to the sheet
- When the plan changes:
  - edit `plan.json` (public) and the private docs
  - re-run the tests, bump the service-worker version, push

## Deliverables
- private plans repo (plans + settings.json)
- private Sheet, shared with all accounts
- public app repo + live URL
- install steps (Android ⋮ → Install app; iPhone Share → Add to Home Screen)
- sign-in steps
- a memory note with the sheet ID, repos and URL
