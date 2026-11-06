# Stage 4: App data, `app/plan.json` 🤖

Full schema with an example: the template's `README.md` §`plan.json` schema.

## Create the person's public repo

From the template ("Use this template", `gh repo create <user>/<repo> --public --template dineshvg/health-plan-app`), or ask them to create an empty public repo and copy the template in. Free GitHub Pages needs a public repo.

## Replace ALL example meals

- `meals`: `kcal`, `protein`, a short `how`, and `buy` items `{name, qty, unit, cat}` per time it's cooked (local product names). `portions` when cooked for later. Optional `freezes`, `note` (shown when the meal is on the menu).
- `styles`: one per cuisine from the interview, `{key, label, weeks}`. With a single style you may use top-level `weeks` instead.
  - `weeks`: 2 weeks (Mon..Sun) of `{training?, b, l, s, d, prep?, batch?}`. `"@key"` = leftovers of that meal.
  - Every day, leftovers included: kcal within ±10 % of `target.kcal`, protein ≥ 90 % of `target.protein` and at most `target.proteinMax` (set it to `protein.max` from `targets.py`; the validator checks it), in every style.
  - Styles share `meals`, `pantry` and `target`; reuse snacks and breakfasts across styles where it fits. Real dishes of that cuisine from ingredients local shops sell (name a specialist shop in `shopNote` if needed).
  - Each style keeps the same training weekdays and its own Sunday batch → Monday leftovers chain.
  - On `startDate` itself the app cooks an `@` meal fresh.
- `categories`: shopping aisles in store order; rename keys and labels to fit the diet (e.g. "Eggs, tofu & soy").
- `training` letters on the same weekdays as `settings.json` `sessions` `dayOffset`s (the validator checks).
- `pantry`, `rules` (generic, see guardrails §Privacy), `startDate` (a Monday), `target` (from stage 2), `sessionsPerWeek`, `shopNote`, `restDayNote`.

## Done when

```bash
python3 tests/validate_plan.py --exclude <diet/allergy words, English and local language> --private <path/to/settings.json>
```

prints OK. Fix the plan, not the validator.
