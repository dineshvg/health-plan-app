# Stages 6–7: Sign-in and hosting

## Stage 6: the person's checklist 👤

Send ONE message with every click still needed, numbered, with exact names. Include only what applies (e.g. skip the sheet upload if the connector built it).

1. **Google Cloud** ([console.cloud.google.com](https://console.cloud.google.com)):
   1. New project → APIs & Services → Library → enable **Google Sheets API**.
   2. OAuth consent screen: External, Testing; add every interview account as a **test user**.
   3. Clients → Create client → **Web application**; Authorized JavaScript origin `https://<user>.github.io`.
   4. Send me the **Client ID** (never the client secret).
2. **GitHub**: app repo → Settings → Pages → Source: **GitHub Actions**. (Private repos can't use free Pages.)
3. **Sheet** (only if built as .xlsx): upload, Save as Google Sheets, share as Editor, send the URL.

Record what's done in STATUS.md as answers arrive. Stage is done when you have the Client ID and Pages is set.

## Stage 7: wire and deploy 🤖

1. `app/config.js`: `CLIENT_ID`, `SHEET_ID`.
2. Bump `VERSION` in `app/sw.js` (every deploy, so phones update).
3. Validator with `--private` → OK; read the diff; push to `main`.
4. The included workflow deploys `app/`. Confirm it is green (`gh run list --workflow pages.yml -L 1`).
5. App URL: `https://<user>.github.io/<repo>/` → STATUS.md Facts.

Don't use Google Apps Script web apps for logging: on phones signed into several Google accounts they fail with "Sorry, unable to open the file".
