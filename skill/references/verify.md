# Stages 8–9: Verify and hand over

## Stage 8: verify 🤖

All must pass before saying done:

1. Full plan check: `python3 tests/validate_plan.py --exclude … --private <settings.json>` → OK.
2. `npm install && npm test` (or with an existing Chromium: `CHROMIUM_PATH=/path/to/chromium npm test`). Runs the targets checks, the basic plan check and a 390×844 browser run with Google mocked: meals, shopping, pantry "low", log labels from the sheet, save to row `2 + days since start`, no page errors.
3. Pages workflow green; the live URL returns the app.
4. Re-read STATUS.md: every stage `done`, every Fact filled.

If any check fails, fix and re-run; don't hand over with a known failure.

## Stage 9: hand over 🤖

Deliver:

- private plans repo (STATUS.md, plans, settings.json)
- private Sheet, shared with all accounts
- public app repo + live URL
- install steps: Android Chrome ⋮ → Install app; iPhone Safari Share → Add to Home Screen
- sign-in steps (first open → Sign in with Google → allow Sheets)
- offer the weekly loop ([weekly-loop.md](weekly-loop.md)), e.g. as a Sunday scheduled task
- if the agent has memory and the person is its own user: a note with the sheet ID, repos and URL (no health details). Never store a third party's details in someone else's memory

Mark stage 9 `done` in STATUS.md.
