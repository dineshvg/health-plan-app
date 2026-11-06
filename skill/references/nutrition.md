# Stage 2: Targets 🤖→👤

## Run the script

```bash
python3 scripts/targets.py --sex m --age 41 --height 180 --weight 92 --goal-weight 82 \
  --start <next Monday> --goal-date <their date> --activity desk-light [--cautious] [--harder]
```

- Exit 2 = refused: explain `reason` to the person and follow [guardrails.md](guardrails.md). Don't work around it.
- `--cautious` for any condition in guardrails §Conditions.
- `--harder` only after the person accepts a harder plan (needed 500–750 kcal/day).

## Activity factor

| Key | Factor | Who |
|---|---|---|
| `desk` | 1.2 | desk job, little exercise |
| `desk-light` | 1.375 | desk job + 2–3 workouts per week |
| `feet` | 1.55 | on-your-feet job (nurse, retail, trades) or 4–5 workouts per week |
| `very` | 1.725 | very active |

If unsure between two, pick the lower one and say so.

## What the script does (so you can explain it)

- BMR, Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age, +5 men / −161 women. TDEE = BMR × factor.
- needed = kg to lose × 7700 ÷ days from start to goal date.

  | needed | deficit |
  |---|---|
  | ≤ 250 | 250 (they arrive early, fine) |
  | 250–500 | needed |
  | 500–750 | 500, date slips; up to 750 with `--harder` |
  | > 750, or > 1 % body weight/week (≈ weight × 11) | unrealistic: 500 and a new date |

- Target = TDEE − deficit, never below BMR. Gain: +250 surplus.
- Protein 1.6–2.0 g per kg goal weight (`use` = 1.8).
- Up to 4 milestones on a straight line from start to the agreed goal date.

## Agree, then record

Show the person the working (BMR → TDEE → deficit → target, rate kg/week, the date). They **agree** the date and kcal before stage 3. Put `targetKcal`, `protein.use`, `goalDate` and `milestones` in STATUS.md; they feed `settings.json` and `plan.json` `target`.
