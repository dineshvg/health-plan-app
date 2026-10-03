---
name: health-plan-to-app
description: Turn someone's health goals into training/food plans, a Google Sheet tracker and an installable phone app (PWA) with daily meals, shopping list and logging. Use when asked to build a fitness/diet plan with tracking or an app.
---

# Health plan → tracker → app

Template repo: https://github.com/dineshvg/health-plan-app (public). Everything below reuses it; don't rewrite the app.
Read its `README.md` (plan.json schema) and `tracker/LAYOUT.md` (cell contract) before starting.

## 0. Guardrails (always)
- Not medical advice. If the person mentions a condition (heart/BP, diabetes, pregnancy, sleep disorders, eating disorder, injuries, medication), add "check with your GP first" and keep targets conservative: fat loss ≤ 0.5–0.75 kg/week, never below estimated BMR, no hard intervals before clearance.
- Privacy: the app repo is public. Personal details (weights, conditions, habits, family, schedule) go ONLY in the private plans repo and the private Google Sheet. Before every push to the public repo, grep it for them. Habit names, rule names and goals belong in sheet headers, which the app reads after sign-in.
- Never ask for or commit a client secret. The OAuth client ID is public by design.

## 1. Interview (one message, then default the rest)
Age, sex, height, weight, goal + date, city/country (shops, units), equipment (gym/home/none), days/week + minutes, family and schedule constraints, food limits (diet, allergies, dislikes, cooking time, budget), health conditions, sleep, one habit to cut (smoking, snacks, alcohol…), Google accounts that need access, GitHub username.
Unanswered: pick a sensible default, say which, continue.

## 2. Plans (Markdown in a PRIVATE repo, e.g. `<user>/<name>-plans`)
- Training: 12 weeks in 3 phases, sessions A/B/C with warm-up, exercises (sets × reps), progression rule, deload weeks 4 and 8, test week 12, RPE guide.
- Food: kcal = Mifflin-St Jeor × activity − 400–500; protein 1.6–2.0 g/kg goal weight; 6 simple rules; a 2-week rotation with batch cooking and planned leftovers; pantry list.
- Optional: sleep and habit plan, weekly rhythm.

## 3. App data: `app/plan.json`
Create the person's own public repo from the template ("Use this template" — or ask them to create an empty public repo and copy the template in). Fill `plan.json`:
- `meals`: each with kcal, protein, short `how`, `buy` items `{name, qty, unit, cat}` per cooking (local product names), `portions` if cooked for later.
- `weeks`: 2 weeks (Mon..Sun) of `{training?, b, l, s, d, prep?, batch?}`; `"@key"` = leftovers. Daily totals within ±10 % of `target`.
- `pantry`, `rules`, `categories`, `startDate` (next Monday), `sessionsPerWeek`.
- `tracker`: start/goal weight, goal date, ≤ 4 milestones, the habit (`label`, `weekly`, `freeDays`), drinks label, 6 `dailyRules`, sessions `{dayOffset, code, focus}`, weeks, tests.
Validate: every meal key referenced in `weeks` exists; JSON parses.
Keep `name` generic and keep personal details out (see guardrails).

## 4. Tracker (private Google Sheet)
- With the Google Sheets connector: create the spreadsheet and reproduce `tracker/build_tracker.py`'s layout exactly (tabs Dashboard, Daily Log, Workouts, Weekly Review, Tests & Photos; same rows/columns/formulas). Gotchas: conditional-format rules one sheet per request; set locale + timezone; Y/N data validation; verify formulas by writing sample rows, reading them back, then clearing.
- Without a connector: run `python tracker/build_tracker.py`, give the person the .xlsx to upload and "Save as Google Sheets".
- Share the sheet as Editor with every account from the interview. Put its ID in `app/config.js` `SHEET_ID`.

## 5. Sign-in + hosting (the person does the clicks; give exact steps)
- Google Cloud: new project → enable Google Sheets API → consent screen External/Testing + test users → Clients → Web application, origin `https://<user>.github.io` → they send you the Client ID → `CLIENT_ID` in `app/config.js`.
- Repo Settings → Pages → Source: GitHub Actions. The included workflow deploys `app/` on push. App URL: `https://<user>.github.io/<repo>/`. (Private repos can't use free Pages.)
- Bump `VERSION` in `app/sw.js` on every deploy.
- Don't use Google Apps Script web apps for logging: on phones with several Google accounts they fail with "Sorry, unable to open the file".

## 6. Test before saying done
Serve `app/` locally, open at 390×844 in Playwright (Chromium), mock `accounts.google.com/gsi/client` and `sheets.googleapis.com`: no page errors; Meals shows today's 4 meals and totals; Shop lists the week grouped by category and pantry "low" items appear; Log save sends `values:batchUpdate` to row `2 + days since start`. After pushing, confirm the Pages workflow is green.

## 7. Weekly loop
Offer a Sunday routine: read Daily Log + Weekly Review, report 7-day average trend, rules %, workouts, sleep, habit. If "ADJUST" (3 flat weeks): suggest one change (−100–150 kcal or +2,000 steps/day). When the plan changes, edit `plan.json` (public repo) and the private plan docs, bump the SW version, push.

## Deliverables
Private plans repo · private Sheet shared with all accounts · public app repo + live URL · install steps (Android ⋮ → Install app; iPhone Share → Add to Home Screen) · sign-in steps · memory note with sheet ID, repos, URL.
