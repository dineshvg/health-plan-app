/* Health plan app: meals, shopping, logging and progress. Plain JS, no build step.
   Everything personal lives in plan.json (meals) and your private Google Sheet (labels, numbers). */
(() => {
  const CFG = window.APP_CONFIG;
  let MEALS = null; // built from plan.json in init()
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets openid email';
  const $ = id => document.getElementById(id);
  const state = { rules: {}, week: 1, start: null, mealDate: null, shopWeek: 0, shopView: 'list', token: null };

  /* ---------- helpers ---------- */
  const pad = n => String(n).padStart(2, '0');
  const localIso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const todayIso = () => localIso(new Date());
  const dayNum = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
  const isoFromDayNum = n => new Date(n * 86400000).toISOString().slice(0, 10);
  const shiftIso = (iso, days) => isoFromDayNum(dayNum(iso) + days);
  const weekdayIdx = iso => (new Date(dayNum(iso) * 86400000).getUTCDay() + 6) % 7; // Mon = 0
  const serialToIso = s => isoFromDayNum(Math.round(Number(s)) - 25569); // Sheets serial → ISO
  const fmtDate = iso => { if (!iso) return ''; const [, m, d] = iso.split('-'); return d + '.' + m + '.'; };
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const blank = v => v === '' || v === null || v === undefined;
  const fmtNum = (v, dec) => (blank(v) || isNaN(Number(v))) ? '–' : Number(v).toFixed(dec);
  const fmtPct = v => blank(v) || isNaN(Number(v)) ? '–' : Math.round(Number(v) * 100) + '%';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2400);
  }
  const fail = err => toast('Error: ' + (err && err.message ? err.message : err));

  /* ---------- meal plan ---------- */
  // "key" = cook that meal, "@key" = eat leftovers of it (nothing to buy).
  // On the plan's first day there are no leftovers yet, so "@key" is cooked fresh that day.
  const resolve = (x, iso) => {
    if (typeof x !== 'string') return x;
    if (x[0] !== '@') return MEALS.M[x];
    if (iso && iso === state.start) return { ...MEALS.M[x.slice(1)], firstDay: true };
    const m = MEALS.M[x.slice(1)];
    return { ...m, name: m.name + ' (leftovers)', leftover: true, buy: [] };
  };
  const appWeekIndex = iso => Math.floor((dayNum(iso) - dayNum(state.start)) / 7); // 0 = week 1
  const templateFor = iso => {
    const w = appWeekIndex(iso);
    const weeks = (MEALS.STYLES.find(x => x.key === state.style) || MEALS.STYLES[0]).weeks;
    const n = weeks.length;
    return weeks[((w % n) + n) % n][weekdayIdx(iso)];
  };

  // Food styles (cuisines): a switch in the Meals tab when the plan has more than one.
  function renderStyleSeg() {
    const el = $('styleSeg');
    el.classList.toggle('hidden', MEALS.STYLES.length < 2);
    el.innerHTML = MEALS.STYLES.map(x =>
      `<button data-style="${esc(x.key)}" class="${x.key === state.style ? 'active' : ''}">${esc(x.label)}</button>`).join('');
  }
  $('styleSeg').addEventListener('click', e => {
    const b = e.target.closest('button[data-style]'); if (!b) return;
    state.style = b.dataset.style; store.set('foodStyle', state.style);
    renderStyleSeg(); renderMeals();
  });

  function renderMeals() {
    const iso = state.mealDate;
    const t = templateFor(iso);
    const w = appWeekIndex(iso) + 1;
    $('mealDay').textContent = (iso === todayIso() ? 'Today · ' : '') + DAY_NAMES[weekdayIdx(iso)] + ' ' + fmtDate(iso);
    $('mealSub').textContent = (w >= 1 ? 'Week ' + w : 'Before week 1') + (t.training ? ' · Training day ' + t.training : (MEALS.REST_NOTE ? ' · ' + MEALS.REST_NOTE : ' · Rest day'));
    const slots = [['Breakfast', t.b], ['Lunch', t.l], ['Snack', t.s], ['Dinner', t.d]].map(([when, x]) => [when, resolve(x, iso)]);
    const kcal = slots.reduce((a, [, m]) => a + m.kcal, 0);
    const protein = slots.reduce((a, [, m]) => a + m.protein, 0);
    let html = `<div class="row between" style="margin-bottom:10px"><h2 style="margin:0">Meals</h2>
      <span class="pill accent">~${kcal.toLocaleString()} kcal · ${protein} g protein</span></div>`;
    html += slots.map(([when, m]) => `<div class="meal">
        <div class="row between"><span class="when">${when}</span><span class="muted">${m.kcal} kcal · ${m.protein} g</span></div>
        <div class="name">${esc(m.name)}</div>
        <div class="how">${esc(m.leftover ? 'Leftovers: reheat one portion you cooked earlier' + (m.freezes ? ' (or take one from the freezer)' : '') + '.' : m.how)}</div>
        ${m.firstDay ? '<div class="muted" style="margin-top:4px">First day: no leftovers yet, cook this one fresh.</div>' : ''}
        ${m.portions > 1 && !m.leftover ? `<div class="muted" style="margin-top:4px">Cook ${m.portions} portions: the rest is for later meals.</div>` : ''}
      </div>`).join('');
    if (t.batch) {
      const b = MEALS.M[t.batch];
      html += `<div class="meal"><div class="row between"><span class="when">Batch cook</span><span class="pill">for the week</span></div>
        <div class="name">${esc(b.name)}</div><div class="how">${esc(b.how)}</div></div>`;
    }
    $('mealList').innerHTML = html;
    $('mealPrep').classList.toggle('hidden', !t.prep);
    $('mealPrep').textContent = t.prep || '';
    $('mealRules').innerHTML = MEALS.RULES.map(r => '• ' + esc(r)).join('<br>') +
      [t.b, t.l, t.s, t.d].map(x => resolve(x, iso)).filter(m => m.note && !m.leftover).map(m => '<br>• ' + esc(m.note)).join('');
  }

  /* ---------- shopping ---------- */
  function shopWeekStart() {
    // Shopping week = the app week (Mon–Sun) at offset state.shopWeek from the current/next one.
    const today = todayIso();
    const base = dayNum(today) < dayNum(state.start) ? state.start : shiftIso(today, -weekdayIdx(today));
    return shiftIso(base, state.shopWeek * 7);
  }
  function roundQty(q, unit) {
    if (unit === 'g' || unit === 'ml') return q >= 1000 ? (Math.ceil(q / 100) / 10) + (unit === 'g' ? ' kg' : ' L') : Math.ceil(q / 50) * 50 + ' ' + unit;
    return Math.ceil(q) + ' ' + unit;
  }
  function weekItems(mon) {
    const agg = {};
    for (let i = 0; i < 7; i++) {
      const day = shiftIso(mon, i);
      const t = templateFor(day);
      const meals = [t.b, t.l, t.s, t.d].map(x => resolve(x, day));
      if (t.batch) meals.push(MEALS.M[t.batch]);
      meals.forEach(m => (m.buy || []).forEach(it => {
        const k = it.name + '|' + it.unit;
        agg[k] = agg[k] || { ...it, qty: 0 };
        agg[k].qty += it.qty;
      }));
    }
    return Object.values(agg);
  }
  function renderShop() {
    const mon = shopWeekStart();
    const w = appWeekIndex(mon) + 1;
    $('shopWeek').textContent = (state.shopWeek === 0 ? 'This week' : state.shopWeek === 1 ? 'Next week' : (w >= 1 ? 'Week ' + w : 'Week')) + (w >= 1 ? ' (week ' + w + ')' : '');
    $('shopDates').textContent = fmtDate(mon) + ' – ' + fmtDate(shiftIso(mon, 6)) + ' · shop on the weekend before';
    const key = 'shop:' + mon;
    const ticked = store.get(key, {});
    const low = store.get('pantry:low', {});
    const items = weekItems(mon);
    Object.keys(low).filter(n => low[n] && !items.some(i => i.name === n)).forEach(n => {
      const p = MEALS.PANTRY.find(x => x[0] === n);
      items.push({ name: n, qty: null, unit: '', cat: p ? p[1] : 'other', fromPantry: true });
    });
    items.forEach(i => { if (low[i.name]) i.low = true; }); // pantry item already needed this week
    const byCat = {};
    items.forEach(i => (byCat[i.cat] = byCat[i.cat] || []).push(i));
    const done = items.filter(i => ticked[i.name]).length;
    let html = `<div class="card"><div class="row between"><b>${done} / ${items.length} in the basket</b>
      <button class="small" id="shopReset">Clear ticks</button></div>
      <div class="muted" style="margin-top:6px">${esc(MEALS.SHOP_NOTE)}</div></div>`;
    Object.keys(MEALS.CATS).filter(c => byCat[c]).forEach(c => {
      html += `<div class="card"><h2>${MEALS.CATS[c]}</h2>` + byCat[c].sort((a, b) => a.name.localeCompare(b.name)).map(i =>
        `<label class="check ${ticked[i.name] ? 'done' : ''}"><input type="checkbox" data-item="${esc(i.name)}" ${ticked[i.name] ? 'checked' : ''}>
          <span class="label">${esc(i.name)}</span>
          <span class="qty">${i.fromPantry ? '<span class="pill warn">low</span>' : roundQty(i.qty, i.unit) + (i.low ? ' <span class="pill warn">low</span>' : '')}</span></label>`).join('') + '</div>';
    });
    $('shopList').innerHTML = html;
    $('shopReset').onclick = () => { store.set(key, {}); renderShop(); };
    $('shopList').onchange = e => {
      const n = e.target.dataset.item; if (!n) return;
      const t = store.get(key, {}); t[n] = e.target.checked; store.set(key, t); renderShop();
    };
  }
  function renderPantry() {
    const low = store.get('pantry:low', {});
    const byCat = {};
    MEALS.PANTRY.forEach(([n, c]) => (byCat[c] = byCat[c] || []).push(n));
    let html = `<div class="card muted">Keep these at home so a healthy meal is always 10 minutes away. Tick what is running low and it goes on the shopping list.</div>`;
    Object.keys(MEALS.CATS).filter(c => byCat[c]).forEach(c => {
      html += `<div class="card"><h2>${MEALS.CATS[c]}</h2>` + byCat[c].map(n =>
        `<label class="check"><input type="checkbox" data-low="${esc(n)}" ${low[n] ? 'checked' : ''}>
          <span class="label">${esc(n)}</span><span class="qty">${low[n] ? '<span class="pill warn">low</span>' : ''}</span></label>`).join('') + '</div>';
    });
    $('pantryList').innerHTML = html;
    $('pantryList').onchange = e => {
      const n = e.target.dataset.low; if (!n) return;
      const l = store.get('pantry:low', {}); l[n] = e.target.checked; store.set('pantry:low', l); renderPantry();
    };
  }
  function showShopView(v) {
    state.shopView = v;
    document.querySelectorAll('#shopSeg button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('shopList').classList.toggle('hidden', v !== 'list');
    $('pantryList').classList.toggle('hidden', v !== 'pantry');
    v === 'list' ? renderShop() : renderPantry();
  }

  /* ---------- Google sign-in + Sheets API ---------- */
  let tokenClient = null;
  const authEnabled = () => !!CFG.CLIENT_ID;
  function loadToken() {
    const t = store.get('auth', null);
    if (t && t.exp > Date.now() + 60000) { state.token = t.token; state.email = t.email; return true; }
    return false;
  }
  function setAuthUi() {
    const authed = authEnabled() && !!state.token;
    document.querySelectorAll('.authed').forEach(el => el.classList.toggle('hidden', !authed));
    document.querySelectorAll('.needs-auth').forEach(el => {
      el.classList.toggle('hidden', authed);
      el.innerHTML = authEnabled()
        ? `<div class="card"><h2>Sign in to log</h2><p class="muted">Use one of the Google accounts the tracker sheet is shared with.</p>
             <button class="primary" data-signin>Sign in with Google</button></div>`
        : `<div class="card"><h2>Logging is not set up yet</h2><p class="muted">Add your Google OAuth client ID and sheet ID to <code>config.js</code> (see the README). Meals and shopping work without it.</p></div>`;
    });
    $('account').innerHTML = authed ? `<button class="small" id="signout" title="${esc(state.email || '')}">Sign out</button>` : '';
    if (authed) $('signout').onclick = signOut;
  }
  function signIn() {
    if (!tokenClient) { toast('Google sign-in is still loading, try again in a second'); return; }
    tokenClient.requestAccessToken({ prompt: '' });
  }
  function signOut() {
    if (state.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(state.token, () => {});
    state.token = null; store.set('auth', null); setAuthUi();
  }
  window.onGisLoad = () => {
    if (!authEnabled() || !window.google?.accounts?.oauth2) return;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CFG.CLIENT_ID, scope: SCOPES,
      callback: async resp => {
        if (resp.error) { fail(resp.error); return; }
        state.token = resp.access_token;
        let email = '';
        try {
          const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + state.token } });
          email = (await r.json()).email || '';
        } catch { /* optional */ }
        state.email = email;
        store.set('auth', { token: state.token, email, exp: Date.now() + (Number(resp.expires_in) || 3600) * 1000 });
        setAuthUi(); toast('Signed in' + (email ? ' as ' + email : '')); refreshTab();
      },
    });
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-signin]')) signIn(); });

  async function api(path, opts = {}) {
    if (!state.token) throw new Error('Not signed in');
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + CFG.SHEET_ID + path, {
      ...opts, headers: { Authorization: 'Bearer ' + state.token, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (res.status === 401) { state.token = null; store.set('auth', null); setAuthUi(); throw new Error('Session expired, sign in again'); }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error?.message || res.statusText);
    return body;
  }
  const getRanges = async ranges => {
    const q = ranges.map(r => 'ranges=' + encodeURIComponent(r)).join('&');
    const r = await api('/values:batchGet?' + q + '&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER');
    return r.valueRanges.map(v => v.values || []);
  };
  const writeRanges = data => api('/values:batchUpdate', { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data }) });
  const cell = (rows, r, c) => (rows[r] && rows[r][c] !== undefined ? rows[r][c] : '');

  async function loadStart() {
    const [rows] = await getRanges(['Dashboard!B2']);
    const v = cell(rows, 0, 0);
    if (typeof v === 'number') state.start = serialToIso(v);
  }

  /* ---------- Log (Daily Log tab) ---------- */
  // Layout is fixed by column; every label comes from the sheet's own header row (it is private),
  // so nothing personal is hard-coded in this public file.
  const NUM_COLS = [3, 5, 6, 7, 8, 15, 16]; // D, F, G, H, I, P, Q
  const RULE_COLS = [9, 10, 11, 12, 13, 14]; // J–O, Y/N
  const NOTE_COL = 18; // S. E (7-day avg) and R (rules %) are formulas and never written.
  let dailyHeaders = null;
  const dailyRow = iso => {
    const row = 2 + dayNum(iso) - dayNum(state.start);
    if (row < 2 || row > 365) throw new Error('The tracker covers ' + fmtDate(state.start) + state.start.slice(0, 4) + ' to one year later');
    return row;
  };
  async function ensureDailyForm() {
    if (dailyHeaders) return;
    const [rows] = await getRanges(["'Daily Log'!A1:S1"]);
    dailyHeaders = rows[0] || [];
    const h = i => esc(dailyHeaders[i] || '');
    $('fields').innerHTML = NUM_COLS.map(i => `<div><label for="f${i}">${h(i)}</label>
      <input id="f${i}" type="number" inputmode="decimal" step="any"></div>`).join('');
    $('rules').innerHTML = RULE_COLS.map(i => `<div class="yn"><span>${h(i)}</span><span class="btns">
      <button data-rule="${i}" data-v="Y">Y</button><button data-rule="${i}" data-v="N">N</button></span></div>`).join('');
    $('notesLabel').textContent = dailyHeaders[NOTE_COL] || 'Notes';
  }
  $('rules').addEventListener('click', e => {
    const b = e.target.closest('button[data-rule]'); if (!b) return;
    state.rules[b.dataset.rule] = state.rules[b.dataset.rule] === b.dataset.v ? '' : b.dataset.v;
    paintRules();
  });
  const paintRules = () => document.querySelectorAll('#rules button').forEach(b => {
    b.className = state.rules[b.dataset.rule] === b.dataset.v ? 'on-' + b.dataset.v : '';
  });
  async function loadDay() {
    const iso = $('date').value;
    $('dayInfo').textContent = 'Loading…';
    try {
      await ensureDailyForm();
      const row = dailyRow(iso);
      const [rows] = await getRanges([`'Daily Log'!A${row}:S${row}`]);
      const v = i => cell(rows, 0, i);
      NUM_COLS.forEach(i => { $('f' + i).value = blank(v(i)) ? '' : v(i); });
      RULE_COLS.forEach(i => { state.rules[i] = v(i) || ''; });
      $('notes').value = v(NOTE_COL) || '';
      paintRules();
      $('dayInfo').textContent = `Week ${v(2) || '–'} · 7-day avg ${fmtNum(v(4), 1)} · rules ${fmtPct(v(17))}`;
    } catch (err) { $('dayInfo').textContent = ''; fail(err); }
  }
  async function saveDay() {
    const btn = $('saveDay'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const row = dailyRow($('date').value);
      const num = i => { const s = $('f' + i).value.trim(); return s === '' ? '' : Number(s); };
      const r = i => state.rules[i] || '';
      await writeRanges([
        { range: `'Daily Log'!D${row}`, values: [[num(3)]] },
        { range: `'Daily Log'!F${row}:Q${row}`, values: [[num(5), num(6), num(7), num(8), ...RULE_COLS.map(r), num(15), num(16)]] },
        { range: `'Daily Log'!S${row}`, values: [[$('notes').value]] },
      ]);
      toast('Saved ✓'); await loadDay();
    } catch (err) { fail(err); } finally { btn.disabled = false; btn.textContent = 'Save day'; }
  }

  /* ---------- Train (Workouts) + weekly review ---------- */
  function weekHeader(n) {
    const mon = shiftIso(state.start, (n - 1) * 7);
    ['W', 'R'].forEach(s => { $('weekLabel' + s).textContent = 'Week ' + n; $('weekDates' + s).textContent = fmtDate(mon) + ' – ' + fmtDate(shiftIso(mon, 6)); });
  }
  async function loadTrain() {
    const n = state.week; weekHeader(n);
    try {
      const [head, rows] = await getRanges(['Workouts!A1:K1', 'Workouts!A2:K200']);
      const lab = i => esc(cell(head, 0, i));
      const sessions = rows.map((r, i) => ({ row: i + 2, r })).filter(x => Number(x.r[0]) === n);
      $('sessions').innerHTML = sessions.length ? sessions.map(({ row, r }) => {
        const v = i => esc(blank(r[i]) ? '' : r[i]);
        const done = r[5] || '';
        return `<div class="card" data-row="${row}">
          <div class="row between"><h2 style="margin:0">${v(3)} · ${typeof r[1] === 'number' ? fmtDate(serialToIso(r[1])) : ''}</h2>
            <span class="pill ${done}">${done || 'open'}</span></div>
          <div class="muted" style="margin:4px 0 10px">${v(4)}</div>
          <div class="yn"><span>Done?</span><span class="btns">
            <button data-done="Y" class="${done === 'Y' ? 'on-Y' : ''}">Y</button><button data-done="N" class="${done === 'N' ? 'on-N' : ''}">N</button></span></div>
          <div class="grid" style="margin-top:8px">
            <div><label>${lab(6)}</label><input data-f="6" type="number" inputmode="numeric" value="${v(6)}"></div>
            <div><label>${lab(7)}</label><input data-f="7" type="number" inputmode="decimal" step="0.5" value="${v(7)}"></div>
            <div><label>${lab(8)}</label><input data-f="8" value="${v(8)}"></div>
            <div><label>${lab(9)}</label><input data-f="9" type="number" inputmode="numeric" value="${v(9)}"></div>
          </div>
          <div style="margin-top:10px"><label>${lab(10)}</label><input data-f="10" value="${v(10)}"></div>
          <div style="margin-top:10px"><button class="primary" data-save>Save session</button></div></div>`;
      }).join('') : '<div class="card muted">No sessions planned for this week yet. Weeks 13+ come with the next training block.</div>';
    } catch (err) { fail(err); }
  }
  $('sessions').addEventListener('click', async e => {
    const card = e.target.closest('.card[data-row]'); if (!card) return;
    const d = e.target.closest('button[data-done]');
    if (d) {
      const was = d.classList.contains('on-' + d.dataset.done);
      card.querySelectorAll('button[data-done]').forEach(b => { b.className = ''; });
      if (!was) d.className = 'on-' + d.dataset.done;
      return;
    }
    if (!e.target.closest('button[data-save]')) return;
    const on = card.querySelector('.on-Y, .on-N');
    const vals = [on ? on.dataset.done : ''];
    [6, 7, 8, 9, 10].forEach(i => {
      const inp = card.querySelector(`input[data-f="${i}"]`); const s = inp.value.trim();
      vals.push(inp.type === 'number' && s !== '' ? Number(s) : s);
    });
    const btn = e.target; btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const row = card.dataset.row;
      await writeRanges([{ range: `Workouts!F${row}:K${row}`, values: [vals] }]);
      toast('Session saved ✓'); await loadTrain();
    } catch (err) { fail(err); } finally { btn.disabled = false; btn.textContent = 'Save session'; }
  });

  async function loadStats() {
    const n = state.week; weekHeader(n);
    try {
      // Dashboard B4 goal, B5 latest avg, B6 lost, B7 to go, B8 progress; rows 9–13 shown with their own labels.
      const [top, miles, head, wk] = await getRanges(['Dashboard!A4:B13', 'Dashboard!A17:D20', "'Weekly Review'!A1:O1", `'Weekly Review'!A${n + 1}:O${n + 1}`]);
      const b = r => cell(top, r - 4, 1);
      const pct = Math.max(0, Math.min(1, Number(b(8)) || 0));
      $('progressBar').style.width = (pct * 100) + '%';
      $('progressText').textContent = `${Math.round(pct * 100)}% · lost ${fmtNum(b(6), 1)} · ${fmtNum(b(7), 1)} to go`;
      $('subtitle').textContent = `Now ${fmtNum(b(5), 1)} → ${b(4) || '–'}`;
      const fmtCell = v => { const num = Number(v); return blank(v) || v === '-' || isNaN(num) ? '–' : (Number.isInteger(num) ? num : num.toFixed(1)); };
      $('dashStats').innerHTML = [5, 9, 10, 11, 12, 13].map(r =>
        `<div class="stat"><span>${esc(cell(top, r - 4, 0))}</span><b>${fmtCell(b(r))}</b></div>`).join('');
      $('milestones').innerHTML = miles.map(m => `<tr><td>${esc(m[0])}<div class="muted">${typeof m[1] === 'number' ? fmtDate(serialToIso(m[1])) + serialToIso(m[1]).slice(0, 4) : ''}</div></td>
        <td class="num">${fmtNum(m[2], 1)}</td><td class="num">${fmtNum(m[3], 1)}</td></tr>`).join('');
      const hd = i => esc(cell(head, 0, i));
      const v = i => cell(wk, 0, i);
      const ch = v(4);
      const rows = [[hd(3), fmtNum(v(3), 1)], [hd(4), blank(ch) ? '–' : (ch > 0 ? '+' : '') + Number(ch).toFixed(1)],
        [hd(6), fmtNum(v(6), 1)], [hd(7), fmtNum(v(7), 1)], [hd(8), blank(v(8)) ? '–' : Math.round(v(8)).toLocaleString()],
        [hd(9), (v(9) || 0) + ' / ' + (MEALS.SESSIONS || 3)], [hd(10), fmtPct(v(10))], [hd(11), v(11) || 0]];
      if (v(12)) rows.push([hd(12), `<span class="pill ${v(12) === 'ADJUST' ? 'warn' : ''}">${esc(v(12))}</span>`]);
      $('weekStats').innerHTML = rows.map(([k, val]) => `<div class="stat"><span>${k}</span><b>${val}</b></div>`).join('');
      $('waistLabel').textContent = cell(head, 0, 5) || 'Waist (cm)';
      $('waist').value = v(5); $('win').value = v(13); $('fix').value = v(14);
      $('sheetLink').href = 'https://docs.google.com/spreadsheets/d/' + CFG.SHEET_ID + '/edit';
    } catch (err) { fail(err); }
  }
  async function saveReview() {
    const n = state.week; const r = n + 1;
    const btn = $('saveReview'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const w = $('waist').value.trim();
      await writeRanges([
        { range: `'Weekly Review'!F${r}`, values: [[w === '' ? '' : Number(w)]] },
        { range: `'Weekly Review'!N${r}:O${r}`, values: [[$('win').value, $('fix').value]] },
      ]);
      toast('Review saved ✓'); await loadStats();
    } catch (err) { fail(err); } finally { btn.disabled = false; btn.textContent = 'Save review'; }
  }

  /* ---------- tabs ---------- */
  let current = 'meals';
  function refreshTab() {
    if (current === 'meals') renderMeals();
    if (current === 'shop') showShopView(state.shopView);
    if (!state.token) return;
    if (current === 'log') loadDay();
    if (current === 'train') loadTrain();
    if (current === 'stats') loadStats();
  }
  function showTab(name) {
    current = name;
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    ['meals', 'shop', 'log', 'train', 'stats'].forEach(t => $('tab-' + t).classList.toggle('hidden', t !== name));
    store.set('tab', name);
    refreshTab();
    window.scrollTo(0, 0);
  }
  document.querySelector('nav').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });
  $('mealPrev').onclick = () => { state.mealDate = shiftIso(state.mealDate, -1); renderMeals(); };
  $('mealNext').onclick = () => { state.mealDate = shiftIso(state.mealDate, 1); renderMeals(); };
  $('shopPrev').onclick = () => { state.shopWeek -= 1; renderShop(); };
  $('shopNext').onclick = () => { state.shopWeek += 1; renderShop(); };
  $('shopSeg').onclick = e => { const b = e.target.closest('button[data-view]'); if (b) showShopView(b.dataset.view); };
  $('date').addEventListener('change', loadDay);
  $('prevDay').onclick = () => { $('date').value = shiftIso($('date').value, -1); loadDay(); };
  $('nextDay').onclick = () => { $('date').value = shiftIso($('date').value, 1); loadDay(); };
  $('saveDay').onclick = saveDay;
  $('saveReview').onclick = saveReview;
  ['W', 'R'].forEach(s => {
    $('prevWeek' + s).onclick = () => { state.week = Math.max(1, state.week - 1); refreshTab(); };
    $('nextWeek' + s).onclick = () => { state.week = Math.min(52, state.week + 1); refreshTab(); };
  });

  /* ---------- install hint ---------- */
  function installHint() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone || store.get('hint:dismissed', false)) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const el = $('installHint');
    el.innerHTML = (ios ? 'Install: tap <b>Share</b> → <b>Add to Home Screen</b>.' : 'Install: browser menu ⋮ → <b>Install app</b> / <b>Add to Home screen</b>.') +
      ' <a href="#" id="hintClose">Hide</a>';
    el.classList.remove('hidden');
    $('hintClose').onclick = ev => { ev.preventDefault(); store.set('hint:dismissed', true); el.classList.add('hidden'); };
  }

  /* ---------- init ---------- */
  async function loadPlan() {
    const p = await (await fetch('plan.json', { cache: 'no-cache' })).json();
    const styles = p.styles && p.styles.length ? p.styles : [{ key: 'default', label: 'Default', weeks: p.weeks }];
    MEALS = { M: p.meals, STYLES: styles, PANTRY: p.pantry.map(i => [i.name, i.cat]), RULES: p.rules || [], CATS: p.categories, TARGET: p.target, SESSIONS: p.sessionsPerWeek,
      REST_NOTE: p.restDayNote || '', SHOP_NOTE: p.shopNote || 'Quantities are for the planned portions: round up to pack sizes. Items marked "low" come from Keep at home.' };
    state.start = p.startDate;
    const saved = store.get('foodStyle', '');
    state.style = styles.some(x => x.key === saved) ? saved : styles[0].key;
    document.title = p.name || document.title;
    document.querySelector('header h1').textContent = p.name || 'Health plan';
  }
  async function init() {
    try { await loadPlan(); } catch (err) { fail('Could not load plan.json: ' + err.message); return; }
    const today = todayIso();
    state.mealDate = today;
    renderStyleSeg();
    $('date').value = dayNum(today) < dayNum(state.start) ? state.start : today;
    state.week = Math.max(1, Math.min(52, appWeekIndex(today) + 1));
    loadToken();
    setAuthUi();
    installHint();
    if (state.token) { try { await loadStart(); } catch (err) { fail(err); } }
    showTab(store.get('tab', 'meals'));
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
