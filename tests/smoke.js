// Phone-size smoke test for app/ with Google sign-in and the Sheets API mocked.
//   npm install            (installs playwright)
//   npm test               (or: CHROMIUM_PATH=/path/to/chromium node tests/smoke.js)
// Checks: no page errors; Meals shows 4 meals and totals; Shop groups items and shows pantry "low"
// items; Log reads labels from the sheet header and saves to row 2 + days since the start date.
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const APP = path.join(__dirname, '..', 'app');
const plan = JSON.parse(fs.readFileSync(path.join(APP, 'plan.json'), 'utf8'));
const DAY = 86400000;
const START = Date.parse(plan.startDate + 'T00:00:00Z');
const TODAY = new Date(START + 9 * DAY); // Wednesday of week 2
const todayIso = TODAY.toISOString().slice(0, 10);
const serial = ms => Math.round(ms / DAY) + 25569; // Sheets date serial
const expectedRow = 2 + 9;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(APP, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(APP) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const fails = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails.push(msg); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; const posts = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(t => {
    const R = Date; const off = t - R.now();
    window.Date = class extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])); } static now() { return R.now() + off; } };
  }, Date.parse(todayIso + 'T09:00:00'));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={CLIENT_ID:'test',SHEET_ID:'test'};" }));
  await page.route('https://accounts.google.com/**', r => r.fulfill({ contentType: 'text/javascript',
    body: "window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken:()=>o.callback({access_token:'T',expires_in:3600})}),revoke:()=>{}}}};" }));
  await page.route('https://www.googleapis.com/**', r => r.fulfill({ json: { email: 'test@example.com' } }));
  await page.route('https://sheets.googleapis.com/**', r => {
    if (r.request().method() === 'POST') { posts.push(JSON.parse(r.request().postData())); return r.fulfill({ json: {} }); }
    const ranges = new URL(r.request().url()).searchParams.getAll('ranges');
    const head = n => [Array.from({ length: n }, (_, i) => 'H' + i)];
    r.fulfill({ json: { valueRanges: ranges.map(rg => {
      if (rg === 'Dashboard!B2') return { values: [[serial(START)]] };
      if (rg === "'Daily Log'!A1:S1") return { values: head(19) };
      if (rg.startsWith("'Daily Log'!A")) return { values: [[serial(TODAY.getTime()), 'Wed', 2, 80]] };
      return { values: [] };
    }) } });
  });

  await page.goto(base);
  await page.waitForTimeout(400);
  check((await page.locator('#mealList .meal').count()) >= 4, 'Meals shows 4 meals');
  check(/kcal/.test(await page.textContent('#mealList .pill')), 'Meals shows day totals');

  // Food styles: with more than one, the switch changes the meals and the shopping list follows.
  const styles = plan.styles || [];
  if (styles.length > 1) {
    const before = await page.locator('#mealList .meal .name').allTextContents();
    await page.click(`#styleSeg button[data-style="${styles[1].key}"]`);
    const after = await page.locator('#mealList .meal .name').allTextContents();
    check(before.join() !== after.join(), `Style switch shows ${styles[1].label} meals`);
    await page.click('nav button[data-tab=shop]');
    const items = (await page.locator('#shopList .card').allTextContents()).join(' ');
    const used = st => new Set(st.weeks.flat().flatMap(d => [d.b, d.l, d.s, d.d, d.batch]).filter(Boolean).map(k => k.replace(/^@/, '')));
    const first = used(styles[0]);
    const only = [...used(styles[1])].filter(k => !first.has(k)).map(k => plan.meals[k]).filter(m => (m.buy || []).length);
    const names = only.flatMap(m => m.buy.map(b => b.name)).filter(n => !items.includes(n) === false);
    check(only.length === 0 || names.length > 0, 'Shopping list follows the selected style');
    await page.click('nav button[data-tab=meals]');
    await page.click(`#styleSeg button[data-style="${styles[0].key}"]`);
  } else {
    check(await page.locator('#styleSeg.hidden').count() === 1, 'Style switch hidden with one style');
  }

  await page.click('nav button[data-tab=shop]');
  check((await page.locator('#shopList .card h2').count()) >= 2, 'Shop groups items by category');
  await page.click('#shopSeg button[data-view=pantry]');
  await page.locator('#pantryList input[type=checkbox]').last().check();
  await page.click('#shopSeg button[data-view=list]');
  check((await page.locator('#shopList .pill.warn').count()) >= 1, 'Pantry "low" item appears on the shopping list');

  await page.click('nav button[data-tab=log]');
  await page.click('[data-signin]');
  await page.waitForTimeout(400);
  check((await page.textContent('#fields')).includes('H3'), 'Log labels come from the sheet header');
  await page.fill('#f3', '79.5');
  await page.click('#saveDay');
  await page.waitForTimeout(400);
  const ranges = (posts[0] && posts[0].data.map(d => d.range)) || [];
  check(ranges.includes(`'Daily Log'!D${expectedRow}`), `Log saves to row ${expectedRow} (got ${ranges.join(', ') || 'nothing'})`);

  check(errors.length === 0, 'No page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `${fails.length} check(s) failed` : 'All checks passed');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
