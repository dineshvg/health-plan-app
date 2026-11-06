# Stage 1: Interview 👤

One message with all questions, grouped. Then default whatever goes unanswered, say which default you picked, and continue.

## Ask

| Group | Fields | Default if unanswered |
|---|---|---|
| Body & goal | age, sex, height, weight, goal weight + date | none: age, sex, height, weight and goal are required |
| Place | city/country (shops, units) | metric, local supermarkets |
| Training | equipment (gym/home/none), days per week, minutes per session | home, 3 days, 45 min |
| Life | job/activity, family and schedule constraints | desk job → lower activity factor |
| Food | diet, allergies, dislikes, cooking time, budget | omnivore, 30 min weekdays, mid budget |
| Cuisines | one or two they like (each becomes a food style) | one everyday style from local supermarket food |
| Health | conditions, medication, pregnancy/breastfeeding, sleep | ask again once if blank; never default |
| Habits | one habit to cut; alcohol per week | snacks outside the plan; 0 |
| Accounts | exact Google accounts that need access; GitHub username; app repo name | accounts can't be defaulted; repo `health-plan` |

## Before leaving the stage

- Check every answer against [guardrails.md](guardrails.md) hard stops.
- Create the private plans repo (e.g. `<user>/<name>-plans`), or ask the person to create it if you can't. Copy `templates/STATUS.md` into it, fill the Facts and Interview sections (no health detail), mark stage 1 `done`.
