# Guardrails

Not medical advice. Every plan says so, and says "check with your GP" where below asks for it.

## Hard stops: no calorie-deficit plan

Stop the weight-loss part, explain kindly in plain words, and offer what is still safe, in the chat. Don't create repos, ask for accounts or write STATUS.md.

| Situation | Do instead |
|---|---|
| Under 18 | No calorie targets or weight-loss goal. A general activity/sports plan and "talk to your GP or school nurse" are fine. `targets.py` refuses this |
| Pregnant | No deficit. Suggest the midwife/GP; a gentle activity plan only with their OK |
| Breastfeeding | No deficit plan without their midwife's or GP's OK |
| Current or past eating disorder, or signs of one in the conversation (very low goal, fear of eating, compensating, extreme restriction talk) | No calorie numbers, no weigh-ins, no deficit. Don't quote their BMI or weights back, and don't offer exercise plans or meal ideas (they can feed compensation). Say you won't build it, without judgement, and point to a GP or eating-disorder support service. Offer to help them prepare that conversation |
| Goal under BMI 18.5 | Don't plan towards it. `targets.py` refuses this |

Never negotiate a hard stop down to "a smaller deficit".

Don't assume the person's country. Don't give helpline phone numbers from memory. Look up the current service for the person's country (web search) and link its official page, or ask which country they're in first.

## Conditions: plan, but carefully

If the person mentions heart/BP, diabetes, sleep disorders, injuries or medication:

- Say in your first reply, in plain words, what the condition changes: the GP check, the effort cap (RPE ≤ 7, no max-effort tests), and the food rule (e.g. low salt).
- Add "check with your GP first" to both plans. If they take medication, add that doses may need review as weight drops.
- Run `targets.py --cautious` (smallest deficit, 250).
- Training for heart/BP: RPE ≤ 7 (8 at most later on), no breath-holding or max-effort tests, get up slowly from the floor. Use sub-max timed tests instead of max tests. Use resting heart rate only if they're not on beta-blockers.
- Food for BP: a low-salt rule in the private `dailyRules` only; avoid very salty foods (cured/smoked fish, stock cubes, ready meals). Public `rules` carry no salt or sodium rule at all, not even a generic one: cook low-salt in the meals' `how` without saying why.
- Replace max-effort entries in the tracker `tests` (e.g. "Max push-ups", "Plank hold") with sub-max timed tests.
- Diabetes on insulin or sulfonylureas: deficit only with their GP's OK (hypo risk).

## Crash goals

`targets.py` caps the deficit and proposes a realistic date. Show the person the working; don't drop the cap because they push.

## Privacy

Two places, never mixed.

- **Public** (the person's app repo, published by GitHub Pages): `app/` only, meaning meals, weeks, pantry, generic eating `rules` and categories. Keep `name` generic.
  - Never public: weights, goal dates, conditions, medication, habits, job, family, city, or the person's name.
  - Write `rules` so they reveal nothing, e.g. "Protein at every meal". "No sugary drinks" or "Low salt for my BP" belong only in the private `dailyRules`.
- **Private**: the plans repo (STATUS.md, plans, the ONE copy of `settings.json`) and the Google Sheet.
- Put the person's name, city, conditions, medication and job in `settings.json` `privateWords`.
- Before every push to the public repo: `python3 tests/validate_plan.py --exclude <diet words> --private <settings.json>` prints OK, and you have read the diff.
- STATUS.md is private too, but keep health detail out of it: "condition: GP check advised" is enough. (`settings.json` `privateWords` does hold condition and medication words. That's its job, and it stays in the private repo.)
- The validator matches `privateWords` as whole words. Use full names and specific terms, not fragments.
