# Stage 3: Plans 🤖

Markdown in the PRIVATE plans repo.

## `plans/training.md`

- 12 weeks in 3 phases; sessions A/B/C with warm-up and exercises (sets × reps)
- a progression rule, deload weeks 4 and 8, test week 12, and an RPE guide
- what comes after week 12 (see [weekly-loop.md](weekly-loop.md) §Next block)
- shift workers: say A→B→C is a sequence; they do the next session on any free day
- condition limits from [guardrails.md](guardrails.md)

## `plans/food.md`

- the targets from stage 2, with the working shown
- 6 simple rules
- a 2-week rotation per food style, each with a Sunday batch cook and planned leftovers
- a pantry list

## `settings.json` (the ONLY copy)

Start from the template's `tracker/settings.example.json`:

- `startDate` = plan start (a Monday)
- `privateWords`: name, city, conditions, medication, job
- `startWeight`, `goalWeight`, `goalDate`, `milestones` exactly as `targets.py` gave them (after agreement)
- `habit` (`label`, `weekly`, `freeDays`) and `drinks` label
- 6 `dailyRules` (short versions of the food rules)
- `sessions` `{dayOffset, code, focus}`, `weeks`, `tests`

It lives here because this repo is private. Point `build_tracker.py` and `validate_plan.py` at it. Never keep a second copy in the app repo.

Optional: a sleep and habit plan, a weekly rhythm.
