# After launch: weekly review, changes, next block

Always start by reading the private STATUS.md.

## Weekly review

1. Read the sheet's Daily Log and Weekly Review tabs (connector, or ask for an export).
2. Report briefly: 7-day average weight trend, rules %, workouts done, sleep, the habit.
3. If the Weekly Review says **ADJUST** (3 flat weeks): suggest ONE change: −100–150 kcal (re-run `targets.py` logic: never below BMR) or +2,000 steps/day. Not both.
4. Watch for hard-stop signs from [guardrails.md](guardrails.md) (e.g. losing much faster than planned, very low intake notes). If present, pause the deficit and suggest a GP.
5. Append one line to STATUS.md §Log (date, trend, change if any). Roll lines older than 8 weeks into one summary line.

## Change the plan

1. Edit `app/plan.json` (public) and the private plans/settings to match.
2. Number changes go through `targets.py`, then agreement, then STATUS.md.
3. Validator with `--private` → OK; `npm test`; bump `VERSION` in `app/sw.js`; read the diff; push; Pages green.
4. Log the change in STATUS.md.

## Next block (week 11+)

1. Offer the next 12-week block: same structure, progressed loads, new test week.
2. Update `plans/training.md`; append Workouts rows (weeks 13–24) to the sheet without moving existing rows.
3. If the goal is reached: offer a maintenance block (`targets.py` with goal weight = current weight).
4. Log in STATUS.md.
