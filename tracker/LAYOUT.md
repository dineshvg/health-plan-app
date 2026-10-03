# Tracker layout

The app reads and writes cells **by position**, and reads every label from the sheet itself.
Rename headers freely (that is how you make it yours), but keep columns and rows where they are.

| Tab | Cells | Used by the app |
|---|---|---|
| Dashboard | B2 start date (a Monday) · B3 start weight · B4 goal | B2 decides which plan week is "week 1" |
| Dashboard | A5:B13 | Stats card (B5 latest 7-day avg, B6 lost, B7 to go, B8 progress 0–1; rows 9–13 shown with their own labels) |
| Dashboard | A17:D20 | Milestones (name, date, target, actual) |
| Daily Log | row 1 headers, rows 2–365 = one row per day from B2 | Log tab. Writes D, F–Q, S. Never writes E (7-day avg) or R (rules %), which are formulas |
| Daily Log | D weight · F steps · G habit to cut (count) · H sleep h · I sleep quality 1–5 · J–O six Y/N rules · P drinks · Q water L · S notes | Field labels = row-1 headers |
| Workouts | A week · B date · C phase · D session · E focus | Train tab lists rows whose A = selected week |
| Workouts | F done Y/N · G–K five free fields (default: minutes, RPE, key lift, rounds/laps, notes) | Written by the Train tab; G–K labels = row-1 headers |
| Weekly Review | row = week + 1; D, E, G–M formulas, row-1 headers as labels | Stats "week in numbers" |
| Weekly Review | F waist · N win · O fix | Written by the Sunday review |

`build_tracker.py` creates exactly this layout from your private settings file (start from `settings.example.json`).
