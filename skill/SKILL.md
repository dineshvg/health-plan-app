---
name: health-plan-to-app
description: Turn someone's health goals into training/food plans, a Google Sheet tracker and an installable phone app (PWA) with daily meals, shopping list and logging. Use when asked to build a fitness/diet plan with tracking or an app.
---

# Health plan → tracker → app

Template repo: https://github.com/dineshvg/health-plan-app (public). Reuse it; don't rewrite the app.
Read its `README.md` (plan.json schema), `tracker/LAYOUT.md` (cell contract) and `tracker/settings.example.json` before starting.

## 0. Guardrails (always)
- Not medical advice. If the person mentions a condition (heart/BP, diabetes, pregnancy, sleep disorders, eating disorder, injuries, medication):
  - Add "check with your GP first" to both plans. If they take medication, add that doses may need review as weight drops.
  - Use the smallest deficit from §2.
  - Training for heart/BP: RPE ≤ 7 (8 at most later on), no breath-holding or max-effort tests, and get up slowly from the floor. Use sub-max timed tests instead of max tests. Use resting heart rate only if they're not on beta-blockers.
  - Food for BP: add a low-salt rule and avoid very salty foods (cured/smoked fish, stock cubes, ready meals).
- Refuse crash goals (see §2).
- Privacy: two places, never mixed.
  - **Public** (app repo, published by GitHub Pages): `app/` only, meaning meals, weeks, pantry, generic eating `rules` and categories. Keep `name` generic.
    - Never public: weights, goal dates, conditions, medication, habits, job, family, city, or the person's name.
    - Write `rules` so they reveal nothing about the person, e.g. "Protein at every meal". "No cigarettes" or "Low salt for my BP" belong only in the private `dailyRules`.
  - **Private**: the plans repo (including the ONE copy of the tracker settings file) and the Google Sheet. The app reads every log, train and stats label from the sheet's header rows after sign-in.
  - Put the person's name, city, conditions and job in the settings `privateWords` list.
  - Before every push: `python3 tests/validate_plan.py --exclude <diet words> --private <settings.json>` must print OK. It scans every text in `plan.json`. Also read the diff for anything personal.
- Never ask for or commit a client secret. The OAuth client ID is public by design.

## 1. Interview (one message, then default the rest)
Ask about:
- age, sex, height, weight, and goal + date
- city/country (shops, units)
- equipment (gym/home/none), training days per week and minutes
- job/activity, family and schedule constraints
- food limits (diet, allergies, dislikes, cooking time, budget)
- health conditions, sleep
- one habit to cut (smoking, snacks, sugary drinks…), and alcohol per week
- the exact Google account addresses that need access (they can't be defaulted), and their GitHub username and the app repo name

If something goes unanswered, pick a sensible default, say which one you picked, and continue.

## 2. Numbers (show the person the working)
- BMR with Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age, then +5 for men or −161 for women.
- Activity factor:
  - 1.2: desk job, little exercise
  - 1.375: desk job + 2–3 workouts per week
  - 1.55: on-your-feet job (nurse, retail, trades) or 4–5 workouts per week
  - 1.725: very active
  - If unsure between two, pick the lower one and say so.
- Daily deficit:
  - needed = kg to lose × 7700 ÷ days from `startDate` to the goal date
  - Pick the deficit from `needed`:

    | needed | deficit to use |
    |---|---|
    | ≤ 250 | 250 (they'll arrive early, which is fine) |
    | 250–500 | needed |
    | 500–750 | 500 by default; say the goal date slips and give the projected date, or use up to 750 if they accept a harder plan |
    | > 750, or more than 1 % of body weight per week (≈ weight × 11 kcal/day) | the date is unrealistic: propose the date that a 500 deficit gives |
  - Target kcal = TDEE − deficit, never below BMR.
  - For muscle gain, use a surplus of +200–300 instead.
- Projected rate = deficit × 7 ÷ 7700 kg/week.
- Protein: 1.6–2.0 g per kg of goal weight.
- Milestones: up to 4, on a straight line from start weight on `startDate` to goal weight on the goal date (the agreed one, after any change above).
- Write `goalDate` as that agreed date.

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
- `settings.json`: the ONLY copy of the tracker settings (see §5). It is fine here because this repo is private. Point `build_tracker.py` and `validate_plan.py` at it. Don't keep a second copy in the app repo.
- Optional: a sleep and habit plan, and a weekly rhythm.

## 4. App data: `app/plan.json` (public repo)
Create the person's own public repo from the template ("Use this template", or ask them to create an empty public repo and copy the template in). Replace ALL example meals:
- `meals`: kcal, protein, a short `how`, and `buy` items `{name, qty, unit, cat}` per time it's cooked (local product names). Set `portions` when it's cooked for later.
- `weeks`: 2 weeks (Mon..Sun) of `{training?, b, l, s, d, prep?, batch?}`. `"@key"` means leftovers of that meal. Daily totals, leftovers included, within ±10 % of `target`; protein ≥ 90 % of target.
  - Plan a Sunday batch cook that feeds Monday's leftovers.
  - On `startDate` itself the app cooks an `@` meal fresh.
- `categories`: shopping aisles in store order. Rename the keys and labels to fit the diet, e.g. "Eggs, tofu & soy" for vegetarians.
- `training` letters must sit on the same weekdays as the settings `sessions` `dayOffset`s. The validator checks this. For shift workers, say in the plan that A→B→C is a sequence: they do the next session on any free day.
- `pantry`, `rules` (generic, see §0), `startDate` (a Monday), `sessionsPerWeek`, `shopNote` (local shops, round up to pack sizes), `restDayNote`. Optional meal fields: `freezes`, and `note` (shown when that meal is on the menu, e.g. for a flexible meal).
- Validate: `python3 tests/validate_plan.py --exclude <diet/allergy words, English and local language> --private <settings.json>` must print OK.

## 5. Tracker (private Google Sheet)
- Write the private `settings.json` from `settings.example.json`:
  - `startDate` = plan start
  - `privateWords`: the person's name, city, conditions, medication and job
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
- Without a connector: run `python3 tracker/build_tracker.py <settings.json>` and give the person the .xlsx to upload with "Save as Google Sheets".
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
1. The full plan check from §4: `python3 tests/validate_plan.py --exclude … --private …`.
2. `npm install && npm test`, or with an existing Chromium: `CHROMIUM_PATH=/path/to/chromium node tests/smoke.js`. It runs the basic plan check (no flags) plus a 390×844 browser run with Google mocked: meals, shopping, pantry "low", log labels from the sheet, save to row `2 + days since start`, and no page errors.

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
