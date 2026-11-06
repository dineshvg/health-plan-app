# Stage 5: Tracker (private Google Sheet) 🤖

Cell contract: the template's `tracker/LAYOUT.md`. The app reads and writes **by position**: rename headers freely (labels come from row 1), never move columns or rows.

## With a Google Sheets connector

Reproduce `tracker/build_tracker.py`'s layout exactly:

1. Create the spreadsheet; set locale and timezone.
2. Tabs, every row, column and formula as in `LAYOUT.md` / `build_tracker.py`.
3. Conditional-format rules: one sheet per request.
4. Y/N data validation.
5. Verify formulas: write sample rows, read them back, then clear them.
6. Share as Editor with every account the person gave.

## Without a connector

```bash
pip install openpyxl
python3 tracker/build_tracker.py <plans-repo>/settings.json <plans-repo>/tracker.xlsx
```

Always pass the output path: the default (`tracker/tracker.xlsx`) is inside the public app repo, and the file holds weights and dates. No extra formula check is needed on this path; `build_tracker.py` is the reference layout. Give the person the `.xlsx`; their stage-6 checklist then includes: upload to Drive → open with Google Sheets → File → Save as Google Sheets → share as Editor with the accounts → send the sheet URL.

## Record

Sheet ID in STATUS.md Facts as soon as it exists (stage 5 with a connector; stage 6 when the person sends the URL). It goes into `app/config.js` `SHEET_ID` at stage 7.
