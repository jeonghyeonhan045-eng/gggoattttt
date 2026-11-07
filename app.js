/* 오운완 (formerly IRON LOG) — app logic. Storage keys keep the ironlog_ prefix so existing records carry over. */
'use strict';

/* =====================================================================
   1. utils
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
const today = () => toKey(new Date());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const r1 = n => Math.round(n * 10) / 10;
const trimNum = n => String(+(+n).toFixed(2));
const fmtInt = n => Math.round(n || 0).toLocaleString('ko-KR');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const LB = 0.45359237;
const toKg = (w, u) => (u === 'lb' ? w * LB : w);
const fromKg = (kg, u) => (u === 'lb' ? kg / LB : kg);
const norm = s => String(s || '').toLowerCase().replace(/[\s·()\/\-]/g, '');
/* 초성 search: "ㄹㄱㅇㅅㅌㅅ" matches "레그 익스텐션" */
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const chosung = s => Array.from(norm(s)).map(c => { const k = c.charCodeAt(0) - 0xAC00; return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c; }).join('');
const isChoQuery = q => q.length > 0 && Array.from(q).every(c => CHO.includes(c));
function matchQ(text, q) { if (!q) return true; const t = norm(text); return t.includes(q) || (isChoQuery(q) && chosung(text).includes(q)); }
const mcls = m => 'm-' + (MKEY[m] || 'full');
const mName = m => (m === '다리' ? '하체' : m);
const mtag = m => `<span class="mtag ${mcls(m)}">${esc(mName(m))}</span>`;
const fmtSec = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
function dateLabel(k) {
  const t = today();
  if (k === t) return '오늘';
  if (k === addDays(t, -1)) return '어제';
  if (k === addDays(t, 1)) return '내일';
  const d = fromKey(k);
  return `${d.getMonth() + 1}/${d.getDate()} (${WD[d.getDay()]})`;
}
const shortDate = k => { const d = fromKey(k); return `${d.getMonth() + 1}/${d.getDate()}`; };
const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);

/* =====================================================================
   2. storage (v2) + migration from the earlier single-file version
   ===================================================================== */
/* the diet tab is hidden for now; its code and saved meals stay so it can come back */
const SHOW_DIET = false;
const KEY = 'ironlog_v2';
const PHOTO_KEY = 'ironlog_photos_v2';
const DEFAULTS = () => ({
  v: 2,
  settings: { unit: 'kg', goals: { kcal: 2200, p: 140, c: 250, f: 60 }, bw: null, rest: 90, autoRest: true, theme: 'auto', notify: true },
  customEq: [], customFoods: [], fav: [], eqUnit: {}, recentFoods: [], days: {}, inbody: [], routines: [], prog: null,
  timer: { endAt: null, dur: 90, paused: null },
});
let DB;
let PHOTOS = {};

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

function load() {
  const raw = lsGet(KEY);
  if (raw) {
    try {
      const d = JSON.parse(raw);
      // keep the defaults' nested objects before merging: Object.assign(def, d) would replace them with the stored ones
      const def = DEFAULTS(), defSettings = def.settings, defTimer = def.timer;
      DB = Object.assign(def, d);
      DB.settings = Object.assign(defSettings, d.settings || {});
      DB.settings.goals = Object.assign(DEFAULTS().settings.goals, (d.settings || {}).goals || {});
      DB.timer = Object.assign(defTimer, d.timer || {});
    } catch (e) { DB = DEFAULTS(); }
  } else {
    DB = DEFAULTS();
    migrateV1();
    save();
  }
  try { PHOTOS = JSON.parse(lsGet(PHOTO_KEY) || '{}') || {}; } catch (e) { PHOTOS = {}; }
}

function migrateV1() {
  const j = k => { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } };
  const old = j('ironlog_data_v1');
  const goals = j('ironlog_goals_v1');
  const ceq = j('ironlog_custom_eq_v1');
  const ib = j('ironlog_inbody_v1');
  const rest = parseInt(lsGet('ironlog_rest_dur_v1'), 10);
  const unit = lsGet('ironlog_unit_v1');
  if (goals) Object.assign(DB.settings.goals, goals);
  if (rest > 0) DB.settings.rest = rest;
  if (unit === 'kg' || unit === 'lb') DB.settings.unit = unit;
  if (Array.isArray(ceq)) {
    DB.customEq = ceq.map(e => {
      const m = e.m === '프리웨이트' ? ((TYPE_INFO[e.type] || {}).m || '전신') : (e.m || '전신');
      return { id: e.id, name: e.name, brand: e.brand || '내 기구', m, type: e.type || inferType(e.name, m) || e.name, custom: true };
    });
  }
  if (old && typeof old === 'object') {
    for (const k of Object.keys(old)) {
      const o = old[k] || {};
      const sets = (o.workouts || []).map(w => {
        const t = w.type || inferType(w.name, w.m) || w.name;
        const m = w.m === '프리웨이트' ? ((TYPE_INFO[t] || {}).m || '전신') : w.m;
        const u = w.unit || 'kg';
        return { id: uid(), eq: w.eqId, name: w.name, brand: w.brand, m, type: t, w: +w.weight || 0, u, kg: w.weightKg != null ? w.weightKg : toKg(+w.weight || 0, u), r: +w.reps || 0, t: w.t || 0 };
      });
      const meals = (o.meals || []).map(m => ({ id: uid(), name: m.n, slot: '간식', qty: 1, mode: 'srv', k: m.k, p: m.p, c: m.c, f: m.f, t: m.t || 0 }));
      const done = (o.doneMuscles || []).filter(m => m !== '프리웨이트');
      if (sets.length || meals.length || done.length) DB.days[k] = { sets, meals, done };
    }
  }
  if (Array.isArray(ib)) {
    DB.inbody = ib.map(e => {
      const id = 'ib' + uid();
      if (e.photo) PHOTOS[id] = e.photo;
      return { id, date: e.date, weight: e.weight, muscle: e.muscle, fatKg: e.fatKg, fatPct: e.fatPct, hasPhoto: !!e.photo };
    });
    lsSet(PHOTO_KEY, JSON.stringify(PHOTOS));
  }
}

let _cache = {};
function bump() { _cache = {}; }
function memo(key, fn) { if (!(key in _cache)) _cache[key] = fn(); return _cache[key]; }
function save() {
  bump();
  if (!lsSet(KEY, JSON.stringify(DB))) toast('저장 공간이 부족해요. 설정에서 백업 후 오래된 사진을 지워주세요.');
}
function savePhotos() { return lsSet(PHOTO_KEY, JSON.stringify(PHOTOS)); }

const EMPTY_DAY = Object.freeze({ sets: [], meals: [], done: [], check: {} });
function dayRO(k) { return DB.days[k] || EMPTY_DAY; }
function day(k) {
  if (!DB.days[k]) DB.days[k] = { sets: [], meals: [], done: [], check: {} };
  const d = DB.days[k];
  d.sets = d.sets || []; d.meals = d.meals || []; d.done = d.done || []; d.check = d.check || {};
  return d;
}

/* =====================================================================
   3. domain helpers
   ===================================================================== */
function allEq() {
  return memo('allEq', () => BUILTIN_EQ.concat(DB.customEq.map(e => Object.assign({}, e, { kind: e.m === '유산소' ? 'cardio' : 'custom', custom: true }))));
}
function eqById(id) {
  return memo('eqMap', () => { const m = {}; for (const e of allEq()) m[e.id] = e; return m; })[id];
}
const typeOfEq = e => e.type || inferType(e.name, e.m) || e.name;
const isCardioType = t => !!(TYPE_INFO[t] && TYPE_INFO[t].cardio);
const isCardioSet = s => s.mins != null || isCardioType(s.type);
const unitFor = eqId => DB.eqUnit[eqId] || DB.settings.unit || 'kg';
const setKg = s => (s.kg != null ? s.kg : toKg(+s.w || 0, s.u || 'kg'));
// Epley estimate. Reps capped at 15 — estimates get unreliable beyond that.
const e1rm = (kg, r) => (kg > 0 ? kg * (1 + Math.min(r, 15) / 30) : 0);
const setE1 = s => e1rm(setKg(s), +s.r || 0);
const fmtSetW = s => (+s.w > 0 ? `${trimNum(s.w)}${s.u || 'kg'}` : '맨몸');
const fmtSetFull = s => isCardioSet(s)
  ? `${trimNum(s.mins)}분${s.km ? ` · ${trimNum(s.km)}km` : ''}${s.kcal ? ` · ${fmtInt(s.kcal)}kcal` : ''}`
  : `${fmtSetW(s)} × ${s.r}${s.u === 'lb' && +s.w > 0 ? ` (${r1(setKg(s))}kg)` : ''}`;

function allSets() {
  return memo('allSets', () => {
    const out = [];
    for (const k of Object.keys(DB.days).sort()) {
      for (const s of (DB.days[k].sets || [])) out.push(Object.assign({ date: k }, s));
    }
    return out;
  });
}
function setsBetween(a, b) { return allSets().filter(s => s.date >= a && s.date <= b); }

/* best set (by e1RM, then reps for bodyweight) */
function better(a, b) {
  if (!b) return true;
  const ea = setE1(a), eb = setE1(b);
  if (ea !== eb) return ea > eb;
  return (+a.r || 0) > (+b.r || 0);
}
function prOfEq(eqId) {
  return memo('pr:' + eqId, () => { let best = null; for (const s of allSets()) if (s.eq === eqId && !isCardioSet(s) && better(s, best)) best = s; return best; });
}
function prOfType(type) {
  return memo('prt:' + type, () => { let best = null; for (const s of allSets()) if (s.type === type && !isCardioSet(s) && better(s, best)) best = s; return best; });
}
/* ids of sets that beat every earlier set on the same equipment (first-ever set excluded) */
function prFlags() {
  return memo('prFlags', () => {
    // A PR is the day's best set beating every earlier day on that equipment
    // (a later set out-repping an earlier one in the same session is not a PR).
    const best = {}, flags = new Set(), byDay = {};
    for (const s of allSets()) { if (isCardioSet(s)) continue; ((byDay[s.date] = byDay[s.date] || {})[s.eq] = byDay[s.date][s.eq] || []).push(s); }
    for (const k of Object.keys(byDay).sort()) {
      for (const [eq, list] of Object.entries(byDay[k])) {
        let top = null; for (const s of list) if (better(s, top)) top = s;
        if (best[eq] && better(top, best[eq])) flags.add(top.id);
        if (!best[eq] || better(top, best[eq])) best[eq] = top;
      }
    }
    return flags;
  });
}
function lastSetOfEq(eqId) {
  return memo('lastByEq', () => { const m = {}; for (const s of allSets()) m[s.eq] = s; return m; })[eqId];
}
/* most recent earlier session's sets for this equipment */
function prevSessionOfEq(eqId, beforeKey) {
  const list = allSets().filter(s => s.eq === eqId && s.date < beforeKey);
  if (!list.length) return null;
  const d = list[list.length - 1].date;
  return { date: d, sets: list.filter(s => s.date === d) };
}
function musclesOfDay(k) {
  const d = dayRO(k);
  const auto = new Set((d.sets || []).map(s => s.m).filter(Boolean));
  const all = new Set([...auto, ...(d.done || [])]);
  return { auto, all: MUSCLES.filter(m => all.has(m)) };
}
function trainedDay(k) { const d = dayRO(k); return (d.sets && d.sets.length > 0) || (d.done && d.done.length > 0); }

function allFoods() { return memo('allFoods', () => DB.customFoods.concat(FOODS)); }
function foodById(id) { return memo('foodMap', () => { const m = {}; for (const f of allFoods()) m[f.id] = f; return m; })[id]; }
function mealTotals(meals) {
  const t = { k: 0, p: 0, c: 0, f: 0 };
  for (const m of meals || []) { t.k += +m.k || 0; t.p += +m.p || 0; t.c += +m.c || 0; t.f += +m.f || 0; }
  return t;
}
/* all body-weight readings (daily check-in + InBody), oldest first */
function weightSeries() {
  return memo('wseries', () => {
    const m = {};
    for (const e of DB.inbody) if (e.weight) m[e.date] = +e.weight;
    for (const k of Object.keys(DB.days)) { const c = (DB.days[k].check || {}); if (c.bw) m[k] = +c.bw; }
    return Object.keys(m).sort().map(k => ({ date: k, w: m[k] }));
  });
}
function latestBodyweight() {
  const ws = weightSeries();
  if (ws.length && daysBetween(ws[ws.length - 1].date, today()) <= 21) return ws[ws.length - 1].w;
  if (DB.settings.bw) return +DB.settings.bw;
  return ws.length ? ws[ws.length - 1].w : null;
}
/* weekly change from 7-day averages (smooths day-to-day water swings) */
function weightTrend() {
  const ws = weightSeries(); if (ws.length < 4) return null;
  const t = today(), pts = ws.filter(x => x.date >= addDays(t, -20) && x.date <= t);
  const cur = pts.length ? pts.slice(-3).reduce((a, x) => a + x.w, 0) / Math.min(3, pts.length) : null;
  if (pts.length < 6 || daysBetween(pts[0].date, pts[pts.length - 1].date) < 10) return { cur };
  // least-squares slope over the last 3 weeks, in kg per day
  const xs = pts.map(x => daysBetween(pts[0].date, x.date)), ys = pts.map(x => x.w), n = pts.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const d = den ? num / den * 7 : 0;
  return { cur, d, pct: d / my * 100 };
}

/* =====================================================================
   4. native bridge (Capacitor plugins are used only when present)
   ===================================================================== */
const Cap = window.Capacitor;
const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());
const P = {};
// No bundler: create plugin proxies explicitly (capacitor.js provides registerPlugin)
if (isNative && typeof Cap.registerPlugin === 'function') {
  for (const n of ['App', 'LocalNotifications', 'Filesystem', 'Share', 'Haptics']) {
    try { if (!Cap.isPluginAvailable || Cap.isPluginAvailable(n)) P[n] = Cap.registerPlugin(n); } catch (e) {}
  }
}
let notifPermAsked = false;

async function scheduleRestNotif(sec) {
  if (!isNative || !P.LocalNotifications || !DB.settings.notify) return;
  try {
    if (!notifPermAsked) { notifPermAsked = true; await P.LocalNotifications.requestPermissions(); }
    await P.LocalNotifications.cancel({ notifications: [{ id: 101 }] });
    await P.LocalNotifications.schedule({ notifications: [{ id: 101, title: '휴식 끝', body: '다음 세트를 시작하세요', schedule: { at: new Date(Date.now() + sec * 1000), allowWhileIdle: true } }] });
  } catch (e) { /* notifications are optional */ }
}
async function cancelRestNotif() {
  if (!isNative || !P.LocalNotifications) return;
  try { await P.LocalNotifications.cancel({ notifications: [{ id: 101 }] }); } catch (e) {}
}
function haptic(ms) {
  try { if (isNative && P.Haptics) P.Haptics.vibrate({ duration: ms || 300 }); else if (navigator.vibrate) navigator.vibrate(ms || 300); } catch (e) {}
}

/* =====================================================================
   5. rest timer (wall-clock based: survives tab switches and app backgrounding)
   ===================================================================== */
let timerIv = null, audioCtx = null;
function ensureAudio() {
  try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {}
}
function beep() {
  try {
    ensureAudio(); if (!audioCtx) return;
    [0, .22, .44].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 880; g.gain.value = .18;
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + .14);
    });
  } catch (e) {}
}
function timerRemain() {
  const t = DB.timer;
  if (t.paused != null) return t.paused;
  if (!t.endAt) return null;
  return Math.max(0, (t.endAt - Date.now()) / 1000);
}
function timerStart(sec) {
  ensureAudio();
  DB.timer = { endAt: Date.now() + sec * 1000, dur: sec, paused: null };
  save(); scheduleRestNotif(sec); timerLoop();
}
function timerToggle() {
  const t = DB.timer;
  if (t.paused != null) { t.endAt = Date.now() + t.paused * 1000; scheduleRestNotif(t.paused); t.paused = null; }
  else if (t.endAt) { t.paused = timerRemain(); t.endAt = null; cancelRestNotif(); }
  save(); timerLoop();
}
function timerStop() { DB.timer.endAt = null; DB.timer.paused = null; save(); cancelRestNotif(); timerLoop(); }
function timerAdd(d) {
  const t = DB.timer;
  if (t.paused != null) t.paused = Math.max(0, t.paused + d);
  else if (t.endAt) { t.endAt = Math.max(Date.now() + 1000, t.endAt + d * 1000); t.dur = Math.max(t.dur, d > 0 ? t.dur + d : t.dur); scheduleRestNotif(timerRemain()); }
  save(); renderTimer();
}
/* minutes since the first set of today's session, shown while you are training.
   Hidden when the sets look like they were logged afterwards, or the session was finished. */
function elapsedTxt(k) {
  if (k !== today()) return '';
  const d = dayRO(k), ts = (d.sets || []).map(s => s.t).filter(Boolean).sort((a, b) => a - b);
  if (!ts.length || d.fin) return '';
  const now = Date.now(), first = ts[0], last = ts[ts.length - 1];
  const loggedLive = ts.length < 2 || last - first >= (ts.length - 1) * 20000; // batch entry = seconds apart
  if (!loggedLive || now - last > 45 * 60000 || now - first > 4 * 3600000) return '';
  const m = Math.max(1, Math.round((now - first) / 60000));
  return ` · <b>${m}분째</b>`;
}
setInterval(() => { const el = document.getElementById('wk-elapsed'); if (el && state.tab === 'workout') el.innerHTML = elapsedTxt(state.date); }, 30000);
function timerLoop() {
  clearInterval(timerIv);
  if (DB.timer.endAt) {
    timerIv = setInterval(() => {
      if (DB.timer.endAt && Date.now() >= DB.timer.endAt) { DB.timer.endAt = null; save(); clearInterval(timerIv); timerDone(); }
      renderTimer();
    }, 250);
  }
  renderTimer();
}
function timerDone() {
  beep(); haptic(500);
  const bar = $('#timerbar');
  bar.classList.remove('hidden'); bar.classList.add('done');
  $('#tb-time').textContent = '0:00'; $('#tb-lbl').textContent = '휴식 끝!'; $('#tb-prog').style.width = '100%';
  $('#tb-toggle').textContent = '다시';
  toast('휴식 끝 — 다음 세트!');
  setTimeout(() => { bar.classList.remove('done'); if (!DB.timer.endAt && DB.timer.paused == null) renderTimer(); }, 6000);
}
function renderTimer() {
  const bar = $('#timerbar');
  const r = timerRemain();
  const active = r != null;
  const fr = $('#fx-rest-t'); if (fr) { if (r == null) fxRender(); else fr.textContent = fmtSec(Math.ceil(r)); }
  const st = $('#sheet-timer');
  if (st) {
    const show = active && state.sheet && (state.sheet.kind === 'set' || state.sheet.kind === 'cardio');
    st.classList.toggle('hidden', !show);
    if (show) { $('#st-time').textContent = fmtSec(Math.ceil(r)); st.classList.toggle('low', r <= 10); }
  }
  if (!active) {
    if (!bar.classList.contains('done')) { bar.classList.add('hidden'); document.body.classList.remove('has-timer'); }
    return;
  }
  bar.classList.remove('hidden', 'done'); document.body.classList.add('has-timer');
  $('#tb-time').textContent = fmtSec(Math.ceil(r));
  const paused = DB.timer.paused != null;
  $('#tb-lbl').textContent = paused ? '일시정지' : '휴식 중';
  $('#tb-toggle').textContent = paused ? '계속' : '멈춤';
  const dur = DB.timer.dur || 1;
  $('#tb-prog').style.width = `${Math.min(100, (1 - r / dur) * 100)}%`;
}

/* =====================================================================
   6. UI infrastructure
   ===================================================================== */
const state = {
  tab: 'workout', date: today(),
  eqView: 'move', eqM: '전체', eqQ: '',
  calM: today().slice(0, 7), statP: '28', checkOpen: false,
  sheet: null,
};

/* in-app confirm (native confirm() is blocked in some web views) */
function askConfirm(msg, yesLabel, onYes) {
  const box = document.createElement('div');
  box.className = 'cfm';
  box.innerHTML = `<div class="cfm-card" role="alertdialog" aria-modal="true"><div class="cfm-msg">${esc(msg)}</div>
    <div class="grid2"><button class="btn" data-x="no">취소</button><button class="btn primary ${/삭제|초기화|바꾸/.test(yesLabel) ? 'danger-fill' : ''}" data-x="yes">${esc(yesLabel)}</button></div></div>`;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add('on'));
  syncHistory();
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-x]');
    if (!b && e.target !== box) return;
    e.stopPropagation(); box.remove();
    if (b && b.dataset.x === 'yes') onYes();
    syncHistory();
  });
}

let toastT = null;
function toast(msg, undoAct) {
  const t = $('#toast'); t.textContent = ''; const m = document.createElement('span'); m.className = 'tmsg'; m.textContent = msg; t.appendChild(m); t.classList.add('on');
  if (undoAct) { const b = document.createElement('button'); b.className = 'toast-undo'; b.dataset.act = undoAct; b.textContent = '되돌리기'; t.appendChild(b); }
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), undoAct ? 5000 : 2200);
}

function applyTheme() {
  const th = DB.settings.theme, root = document.documentElement;
  if (th === 'auto') { if (root.dataset.appTheme) { root.removeAttribute('data-theme'); delete root.dataset.appTheme; } }
  else { root.setAttribute('data-theme', th); root.dataset.appTheme = '1'; }
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = getComputedStyle(root).getPropertyValue('--card').trim() || '#ffffff';
}
const CHECK_SVG = '<svg class="icon ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
/* no paper citations or long how-it-works notes on the screens (the list stays in 설정 → 참고 논문) */
const CITE_RE = /\s*[(（][^()（）]*?[A-Z][A-Za-z&.' -]+(?:외|et al\.?)?\s*\d{4}[^()（）]*[)）]/g;
function stripCitations(root) {
  if (state.sheet && state.sheet.kind === 'settings' && root.id === 'sheet-body') return;
  root.querySelectorAll('.src').forEach(n => n.remove());
  root.querySelectorAll('details.more').forEach(d => { const sm = d.querySelector('summary'); if (sm && /읽는 법|계산 방법|근거/.test(sm.textContent)) d.remove(); });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => /\d{4}|근거/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const hits = []; while (walker.nextNode()) hits.push(walker.currentNode);
  const STUDY_SENT = /[^.。]*\b[A-Z][a-z]+(?:\s*외|\s*et al\.?)?\s+(?:19|20)\d\d\b[^.。]*[.。]?/g;
  for (const n of hits) n.nodeValue = n.nodeValue.replace(CITE_RE, '').replace(/\s*근거\s*[:：].*$/, '').replace(STUDY_SENT, '');
  root.querySelectorAll('.note').forEach(n => { const t = n.textContent.trim(); if (!t || /논문|연구|메타|MET/.test(t) || t.length > 110) n.remove(); });
}
function decorateHeads(root) {
  stripCitations(root);
  // the tab's first title is the screen's h1
  if (root.id === 'main') {
    const first = root.querySelector('.sec-h h2, .calhead h2');
    if (first) { const h1 = document.createElement('h1'); h1.innerHTML = first.innerHTML; h1.className = first.className; first.replaceWith(h1); }
  }
  // keep heading levels sequential (h1 → h2 → h3) without changing how they look
  if (root.id === 'main') {
    let last = 0;
    for (const h of [...root.querySelectorAll('h1, h2, h3, h4')]) {
      const lv = +h.tagName[1];
      if (last && lv > last + 1) { const n = document.createElement('h' + (last + 1)); n.innerHTML = h.innerHTML; n.className = (h.className + ' as-h' + lv).trim(); for (const a of h.attributes) if (a.name !== 'class') n.setAttribute(a.name, a.value); h.replaceWith(n); last = last + 1; }
      else last = lv;
    }
  }
  // "✓" set in text reads as an emoji on some phones: draw it instead
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.includes('✓') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const hits = []; while (walker.nextNode()) hits.push(walker.currentNode);
  for (const n of hits) {
    const span = document.createElement('span');
    span.innerHTML = n.nodeValue.split('✓').map(t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])).join(CHECK_SVG);
    n.replaceWith(...span.childNodes);
  }
}

function render() {
  $$('.nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  const dn = $('#datenav');
  dn.classList.toggle('hidden', !(state.tab === 'workout' || state.tab === 'diet'));
  const t = today();
  $('#datelabel').innerHTML = state.date === t ? '오늘' : `${esc(dateLabel(state.date))}<small>오늘로</small>`;
  const main = $('#main');
  const views = { workout: viewWorkout, diet: viewDiet, records: viewRecords, analysis: viewAnalysis, body: viewBody };
  main.innerHTML = views[state.tab]();
  decorateHeads(main);
  if (state.tab === 'workout') renderEqList();
  renderTimer();
  syncHistory();
}

/* ---------- back button (web/PWA) ----------
   Android's back button walks browser history; with no entries of our own it closes the app.
   Entries we keep: a base guard (so back on the main screen asks "press again to exit"),
   one while another tab is shown, one while a sheet or dialog is open.
   Chrome skips entries pushed without a user tap, so the base guard is added on the first tap. */
const hist = { pushed: 0, ignore: 0, tapped: false };
function wantedDepth() { return (hist.tapped ? 1 : 0) + (state.tab !== 'workout' ? 1 : 0) + (state.sheet || document.querySelector('.cfm') ? 1 : 0); }
function syncHistory() {
  if (isNative) return; // the native back button is handled by the App plugin
  const want = wantedDepth();
  try {
    while (hist.pushed < want) { history.pushState({ ow: hist.pushed + 1 }, ''); hist.pushed++; }
    if (hist.pushed > want) { hist.ignore++; history.go(want - hist.pushed); hist.pushed = want; }
  } catch (e) {}
}
document.addEventListener('click', () => { hist.tapped = true; if (hist.pushed < wantedDepth()) syncHistory(); }, true);
window.addEventListener('popstate', () => {
  if (hist.ignore > 0) { hist.ignore--; return; }
  hist.pushed = Math.max(0, hist.pushed - 1);
  const cfm = document.querySelector('.cfm'); if (cfm) { cfm.remove(); syncHistory(); return; }
  if (state.sheet) { closeSheet(); return; }
  if (state.tab !== 'workout') { state.tab = 'workout'; render(); window.scrollTo(0, 0); return; }
  // main screen: the guard entry was just used up. Next back within 2.5s leaves the app.
  toast('뒤로 버튼을 한 번 더 누르면 앱이 닫혀요'); // the guard comes back on the next tap
});

/* ---------- bottom sheet ---------- */
function openSheet(kicker, title, bodyHtml, sheetState) {
  state.sheet = sheetState || { kind: 'generic' };
  $('#sheet-k').textContent = kicker || '';
  $('#sheet-title').textContent = title || '';
  $('#sheet-body').innerHTML = bodyHtml; decorateHeads($('#sheet-body'));
  $('#sheet-body').scrollTop = 0;
  const sc = $('#scrim'), sh = $('#sheet');
  sh.classList.toggle('tall', state.sheet.kind === 'picker');
  const tm = state.sheet.kind === 'tutorial'; sh.classList.toggle('tutmode', tm); sc.classList.toggle('tutmode', tm); if (!tm) { sh.classList.remove('top'); const sp = $('#tut-spot'); if (sp) sp.className = ''; }
  sc.classList.remove('hidden'); sh.classList.remove('hidden');
  requestAnimationFrame(() => { sc.classList.add('on'); sh.classList.add('on'); });
  syncHistory();
}
function setSheetBody(html, keepScroll) {
  const b = $('#sheet-body'); const st = b.scrollTop;
  b.innerHTML = html; decorateHeads(b); b.scrollTop = keepScroll ? st : 0;
}
function closeSheet() {
  if (!state.sheet) return;
  state.sheet = null;
  const sc = $('#scrim'), sh = $('#sheet');
  sc.classList.remove('on'); sh.classList.remove('on');
  { const sp = $('#tut-spot'); if (sp) { sp.className = ''; sp.dataset.act = ''; } sh.style.maxHeight = ''; }
  setTimeout(() => { if (!state.sheet) { sc.classList.add('hidden'); sh.classList.add('hidden'); } }, 240);
  syncHistory();
}

/* ---------- charts (inline SVG; single-series, tap/hover tooltips) ---------- */
function barPath(x, y, w, h, r) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
/* vertical bars. items: [{label, v, tip, hl}] */
function barChart(items, opts = {}) {
  const W = 340, H = opts.h || 150, padL = 26, padB = 20, padT = 8;
  const max = Math.max(opts.min || 1, ...items.map(i => i.v || 0)) * 1.12;
  const n = items.length, slot = (W - padL) / n, bw = Math.min(28, slot * .58);
  const y = v => padT + (H - padT - padB) * (1 - v / max);
  const ticks = niceTicks(max, 3);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '막대 차트')}">`;
  for (const t of ticks) s += `<line class="grid" x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${padL - 4}" y="${y(t) + 3}" text-anchor="end">${fmtInt(t)}</text>`;
  if (opts.ref != null && opts.ref > 0) s += `<line x1="${padL}" x2="${W}" y1="${y(opts.ref)}" y2="${y(opts.ref)}" stroke="var(--ink3)" stroke-dasharray="4 4"/>`;
  items.forEach((it, i) => {
    const cx = padL + slot * i + slot / 2, v = it.v || 0, top = y(v), h = (H - padB) - top;
    const color = it.hl ? 'var(--acc)' : (opts.color || 'color-mix(in srgb, var(--acc) 55%, var(--card2))');
    s += `<path d="${barPath(cx - bw / 2, top, bw, h, 4)}" fill="${color}"/>`;
    s += `<text class="axis" x="${cx}" y="${H - 5}" text-anchor="middle">${esc(it.label)}</text>`;
    s += `<rect class="hit" data-tip="${esc(it.tip || '')}" x="${cx - slot / 2}" y="${padT}" width="${slot}" height="${H - padT - padB}"/>`;
  });
  return `<div class="chart">${s}</svg></div>`;
}
/* line chart over dates. pts: [{date, y, tip}] */
function lineChart(pts, opts = {}) {
  const W = 340, H = opts.h || 120, padL = 34, padR = 10, padB = 18, padT = 10;
  const vals = pts.map(p => p.y);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const span = hi - lo; lo -= span * .15; hi += span * .15;
  const t0 = fromKey(pts[0].date).getTime(), t1 = fromKey(pts[pts.length - 1].date).getTime();
  const x = d => (t1 === t0 ? (padL + W - padR) / 2 : padL + (W - padL - padR) * (fromKey(d).getTime() - t0) / (t1 - t0));
  const y = v => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '추이 차트')}">`;
  for (const v of [lo + (hi - lo) * .2, lo + (hi - lo) * .8]) s += `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${padL - 4}" y="${y(v) + 3}" text-anchor="end">${r1(v)}</text>`;
  const color = opts.color || 'var(--acc)';
  s += `<polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p => `${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')}"/>`;
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    s += `<circle cx="${x(p.date)}" cy="${y(p.y)}" r="${last ? 4.5 : 3.5}" fill="${color}" stroke="var(--card)" stroke-width="2"/>`;
    s += `<circle class="hit" data-tip="${esc(p.tip)}" cx="${x(p.date)}" cy="${y(p.y)}" r="14"/>`;
  });
  s += `<text class="axis" x="${padL}" y="${H - 3}">${shortDate(pts[0].date)}</text><text class="axis" x="${W - padR}" y="${H - 3}" text-anchor="end">${shortDate(pts[pts.length - 1].date)}</text>`;
  return `<div class="chart">${s}</svg></div>`;
}
function sparkline(vals, opts = {}) {
  const W = 96, H = 28, pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
  if (pts.length < 2) return `<span class="small muted">—</span>`;
  const ys = pts.map(p => p[1]); let lo = Math.min(...ys), hi = Math.max(...ys); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const x = i => 3 + (W - 6) * i / (vals.length - 1), y = v => 3 + (H - 6) * (1 - (v - lo) / (hi - lo));
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline fill="none" stroke="${opts.color || 'var(--ink2)'}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ')}"/><circle cx="${x(last[0])}" cy="${y(last[1])}" r="3" fill="${opts.color || 'var(--ink2)'}"/></svg>`;
}
function niceTicks(max, n) {
  if (max <= 0) return [0];
  const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const out = []; for (let v = 0; v <= max; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
let tipEl = null;
function showTip(target) {
  const chart = target.closest('.chart'); const txt = target.getAttribute('data-tip');
  if (!chart || !txt) return;
  hideTip();
  const cr = chart.getBoundingClientRect(), tr = target.getBoundingClientRect();
  tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.textContent = txt;
  chart.appendChild(tipEl);
  const left = Math.min(Math.max(tr.left + tr.width / 2 - cr.left, 50), cr.width - 50);
  tipEl.style.left = left + 'px'; tipEl.style.top = Math.max(0, tr.top - cr.top + (target.tagName === 'circle' ? 10 : 0)) + 'px';
}
function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }

/* ---------- web app install hint (web only) ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (state.tab === 'workout') render(); });
/* iPhone Safari (not the home-screen app) may clear site data after 7 days without a visit */
function iosBrowser() {
  if (isNative) return false;
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  return ios && !standalone;
}
function protectStorage() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).then(p => { state.persisted = !!p; }).catch(() => {}); } catch (e) {}
}
function installHint() {
  if (isNative || (lsGet('ironlog_hint_off') && !(iosBrowser() && allSets().length))) return '';
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) return '';
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /kakaotalk|instagram|fban|fbav|line\//i.test(ua);
  let msg;
  if (inApp) msg = ios ? '카톡 안에서는 설치가 안 돼요. 오른쪽 아래 <b>⋯ → 다른 브라우저로 열기(Safari)</b> 후 홈 화면에 추가하세요.' : '카톡 안에서는 설치가 안 돼요. 오른쪽 위 <b>⋮ → 다른 브라우저로 열기</b> 후 설치하세요.';
  else if (ios) msg = '<b>홈 화면에 추가해서 쓰세요.</b> Safari에서 그냥 쓰면 7일 동안 안 열었을 때 기록이 지워질 수 있어요. Safari 아래 <b>공유 버튼(□↑) → 홈 화면에 추가</b>. 기록은 홈 화면 앱과 Safari에 따로 저장되니 처음부터 홈 화면 앱으로 쓰세요.';
  else if (deferredInstall) msg = '홈 화면에 앱으로 설치하면 주소창 없이 바로 열려요.';
  else return '';
  return `<section class="card hintcard"><div class="row" style="align-items:flex-start"><div style="flex:1;font-size: 13px;line-height:1.55">${msg}</div>
    <button class="iconbtn" style="width:30px;height:30px" data-act="hint-off" aria-label="안내 닫기">✕</button></div>
    ${!inApp && !ios && deferredInstall ? '<button class="btn primary block" style="margin-top:10px" data-act="pwa-install">앱 설치</button>' : ''}</section>`;
}

/* =====================================================================
   7. VIEW — 운동
   ===================================================================== */
/* ---------- routines: reuse a past session as today's checklist ---------- */
function pastSessions(beforeKey, limit) {
  const byDate = {};
  for (const s of allSets()) { if (s.date >= beforeKey || isCardioSet(s)) continue; (byDate[s.date] = byDate[s.date] || []).push(s); }
  const out = [], seen = new Set();
  for (const k of Object.keys(byDate).sort().reverse()) {
    const eqs = []; for (const s of byDate[k]) if (!eqs.includes(s.eq)) eqs.push(s.eq);
    const sig = eqs.slice().sort().join('|');
    if (seen.has(sig)) continue; seen.add(sig);
    const mus = []; for (const s of byDate[k]) if (s.m && !mus.includes(s.m)) mus.push(s.m);
    out.push({ k, eqs, mus, n: byDate[k].length });
    if (out.length >= (limit || 8)) break;
  }
  return out;
}
function planHtml(k) {
  const d = dayRO(k), plan = d.plan;
  if (!plan || !plan.eqs || !plan.eqs.length) {
    return '';
  }
  const todays = d.sets || [];
  let doneN = 0;
  const rows = plan.eqs.map(id => {
    const e = eqById(id); if (!e) return '';
    const prev = prevSessionOfEq(id, k);
    const tg = plan.tg && plan.tg[id];
    const target = tg ? tgSets(tg) : prev ? prev.sets.length : 3;
    const did = todays.filter(s => s.eq === id).length;
    const done = did >= target; if (done) doneN++;
    const lastTxt = prev ? (isCardioSet(prev.sets[0]) ? fmtSetFull(prev.sets[0]) : `${fmtSetW(prev.sets[0])} × ${prev.sets.map(s => s.r).join('·')}`) : '첫 기록';
    return `<div class="plan-row ${done ? 'done' : ''}" data-act="open-set" data-eq="${esc(id)}">
      <span class="ck">${done ? '✓' : did ? did : ''}</span>
      <div class="main"><div class="nm">${esc(e.name)}</div><div class="meta">${tg ? `<b class="tgt">목표 ${esc(tg)}</b> · ` : ''}지난번 ${esc(lastTxt)}</div></div>
      <span class="cnt num">${did}/${target}</span></div>`;
  }).join('');
  const src = plan.label ? esc(plan.label) : `${shortDate(plan.from)} 운동 기준`;
  if (doneN === plan.eqs.length && !state.planOpen) return `<button class="plandone" data-act="plan-open"><span class="ck">✓</span><span><b>계획 완료 ${doneN}/${plan.eqs.length}</b><span class="small muted" style="display:block">${src}</span></span><span class="small muted" style="margin-left:auto">펼치기 ▾</span></button>`;
  return `<div class="sec-h"><h2>${k === today() ? '오늘' : esc(dateLabel(k))} 계획</h2><span class="aside">${doneN}/${plan.eqs.length} 완료 · ${src}</span></div>
    <section class="card plan">${rows}
      <div class="row" style="margin-top:8px">${plan.prog ? (() => { const P = PROGRAMS.find(x => x.id === plan.prog), dd = P && P.days.find(x => plan.label && plan.label.endsWith(x.t)); return `<button class="btn sm ghost" data-act="prog-open" data-p="${esc(plan.prog)}">ⓘ 포인트</button>${dd ? `<a class="btn sm ghost" href="${ytLink(dayQuery(P, dd))}" target="_blank" rel="noopener">▶ 영상</a>` : ''}`; })() : ''}<button class="btn sm ghost" data-act="routines-open">다른 루틴</button><button class="btn sm ghost" style="margin-left:auto" data-act="plan-clear">계획 지우기</button></div></section>`;
}
function openRoutineSheet() {
  const list = pastSessions(state.date, 8);
  openSheet('지난 운동 불러오기', '어떤 운동을 할까요?', list.length ? list.map(x => {
    const names = x.eqs.map(id => (eqById(id) || {}).name).filter(Boolean);
    return `<button class="routine-opt" data-act="routine-pick" data-k="${x.k}" data-first="${esc(x.eqs[0])}">
      <div class="row between"><b>${esc(dateLabel(x.k))}</b><span class="small muted">${x.eqs.length}종목 · ${x.n}세트</span></div>
      <div class="row" style="gap:4px;flex-wrap:wrap;margin:4px 0">${x.mus.map(mtag).join('')}</div>
      <div class="small muted">${esc(names.join(' · '))}</div></button>`;
  }).join('') : '<div class="empty">아직 기록된 운동이 없어요.</div>', { kind: 'routine' });
}

/* Korean particle by final consonant: jo('벤치프레스','이','가') → '벤치프레스가' (English/digits: treated by sound-less rule → second form) */
function jo(w, a, b) { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); }
/* ---------- finishing a workout: summary, body map, feedback ---------- */
function sessionReport(k) {
  const d = dayRO(k), sets = d.sets || [], str = sets.filter(s => !isCardioSet(s));
  const E = bodyEnergy(), ex = dayExercise(k, E.bw);
  const ts = sets.map(s => s.t).filter(Boolean).sort((a, b) => a - b);
  const mins = ts.length > 1 ? Math.round((ts[ts.length - 1] - ts[0]) / 60000) + 2 : null;
  const vol = str.reduce((a, s) => a + setKg(s) * (+s.r || 0), 0);
  const reg = {};
  for (const s of str) { const e = eqById(s.eq) || s; for (const [r, v] of Object.entries(regionsOf(e.name || s.name, s.type || e.type, s.m || e.m, s.grip))) reg[r] = (reg[r] || 0) + v; }
  const flags = prFlags(), prs = str.filter(s => flags.has(s.id));
  // each exercise vs. its previous session (best estimated 1RM)
  const byEq = {}; for (const s of str) (byEq[s.eq] = byEq[s.eq] || []).push(s);
  const cmp = Object.entries(byEq).map(([eq, list]) => {
    const prev = prevSessionOfEq(eq, k), best = Math.max(...list.map(setE1));
    const pb = prev ? Math.max(...prev.sets.map(setE1)) : null;
    const e = eqById(eq) || list[0], name = e.name, u = list[list.length - 1].u || 'kg';
    const next = progressionHint(e, { date: k, sets: list }, u);
    const row = { eq, name, list, prev, next, u };
    if (!pb || !best) return { ...row, st: 'new' };
    const pct = (best - pb) / pb;
    const st = pct >= 0.01 ? 'up' : pct <= -0.03 ? 'down' : 'same', order = st === 'down' ? orderShift(eq, k, prev.date) : null;
    return { ...row, st: order ? 'order' : st, pct, order };
  });
  // rest between sets of the same exercise, from the log times (only when logged live)
  const gaps = [];
  for (const list of Object.values(byEq)) { const t = list.map(s => s.t).filter(Boolean).sort((a, b) => a - b); for (let i = 1; i < t.length; i++) { const g = (t[i] - t[i - 1]) / 1000; if (g >= 20 && g <= 900) gaps.push(g); } }
  gaps.sort((a, b) => a - b);
  const rest = gaps.length >= 3 ? gaps[Math.floor(gaps.length / 2)] : null;
  const groups = STRENGTH_MUSCLES.filter(m => str.some(s => s.m === m));
  const [wa, wb] = weekRange(0, k), wk = muscleVolume(setsBetween(wa, wb));
  const wkCar = setsBetween(wa, wb).filter(isCardioSet).reduce((a, s) => a + (+s.mins || 0), 0);
  return { sets, str, mins, vol, ex, reg, prs, cmp, groups, wk, wkCar, rest, car: sets.filter(isCardioSet) };
}
function finishHtml(k) {
  const R = sessionReport(k), d = dayRO(k), c = d.check || {};
  const max = Math.max(0, ...Object.values(R.reg));
  const ranked = Object.entries(R.reg).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]);
  const fb = [];
  if (R.str.length) {
    const dirG = R.groups.map(m => `${mName(m)} ${R.str.filter(s => s.m === m).length}`).join(' · ');
    const main = ranked.filter(([r, v]) => !ASSIST_REG.has(r) && v >= Math.max(1.5, ranked[0][1] * 0.5)).slice(0, 4).map(([r]) => REGIONS[r]);
    const also = ranked.filter(([r]) => !ASSIST_REG.has(r) && !main.includes(REGIONS[r])).slice(0, 4).map(([r]) => REGIONS[r]);
    const kind = (() => { const has = m => R.groups.includes(m); const up = ['가슴', '어깨', '팔', '등'].filter(has).length;
      if (has('다리') && up >= 2) return '전신'; if (has('다리')) return '하체'; if (has('가슴') && !has('등')) return '밀기(가슴·어깨·삼두)'; if (has('등') && !has('가슴')) return '당기기(등·이두)'; return '상체'; })();
    const assist = ranked.filter(([r]) => ASSIST_REG.has(r)).map(([r]) => REGIONS[r]);
    fb.push(['good', `오늘은 ${kind} 운동 · ${dirG}세트`, `가장 많이 쓴 곳은 ${jo(`${main.join(', ') || REGIONS[ranked[0][0]]}${also.length ? `, 같이 쓴 곳은 ${also.join(', ')}` : ''}`, '이에요', '예요')}.${assist.length ? ` ${assist.join('·')}도 협응근으로 같이 쓰였어요.` : ''} 위 그림에서 진할수록 많이 쓴 곳이에요.`]);
  }
  if (R.prs.length) fb.push(['good', `PR ${R.prs.length}개`, `${[...new Set(R.prs.map(s => (eqById(s.eq) || s).name))].slice(0, 3).join(', ')}에서 최고 기록을 넘었어요.`]);
  const up = R.cmp.filter(x => x.st === 'up'), dn = R.cmp.filter(x => x.st === 'down'), same = R.cmp.filter(x => x.st === 'same'), nw = R.cmp.filter(x => x.st === 'new');
  if (up.length + dn.length + same.length) {
    const lv = dn.length > up.length ? 'warn' : up.length ? 'good' : 'info';
    fb.push([lv, `지난번보다 ↑${up.length} · =${same.length} · ↓${dn.length}`, dn.length > up.length
      ? `${jo(dn.slice(0, 2).map(x => x.name).join(', '), '이', '가')} 지난번보다 낮았어요(추정 1RM 기준). 하루 이틀은 흔한 일이에요. 2주 넘게 이어지면 잠·식사·볼륨을 점검하세요. 종목별 숫자는 아래에 있어요.`
      : up.length ? `${jo(up.slice(0, 2).map(x => x.name).join(', '), '이', '가')} 지난번보다 올랐어요. 근육이 늘고 있다는 가장 확실한 신호예요. 종목별 숫자는 아래에 있어요.`
      : '지난번과 비슷하게 했어요. 아래 종목별 "다음번"대로 한 칸씩 올려보세요.']);
  }
  if (nw.length) fb.push(['info', `처음 한 종목 ${nw.length}개`, `${nw.slice(0, 3).map(x => x.name).join(', ')} — 오늘 기록이 다음번 비교 기준이 돼요.`]);
  if (R.groups.length) {
    // this week so far (last 7 days) for the groups trained today
    const W = R.groups.map(m => { const v = R.wk.vol[m], [lo, hi] = volRange(m); return { m, v, lo, hi, st: v < lo ? 'low' : v > hi ? 'high' : 'ok' }; });
    const low = W.filter(x => x.st === 'low'), high = W.filter(x => x.st === 'high');
    fb.push([low.length ? 'info' : 'good', `최근 7일 누적 · ${W.map(x => `${mName(x.m)} ${r1(x.v)}`).join(' · ')}세트`,
      low.length ? `${low.map(x => `${jo(mName(x.m), '은', '는')} ${r1(x.lo - x.v)}세트`).join(', ')} 더 하면 효과적인 범위(근육당 주 ${low[0].lo}세트 이상)에 들어가요. 이번 주 남은 운동에서 나눠 채우면 돼요.`
        : high.length ? `${high.map(x => mName(x.m)).join(', ')} 볼륨이 높은 편이에요. 효과는 더 있지만 회복이 따라오는지 보세요.` : '오늘 한 부위들은 이번 주 효과적인 범위 안이에요.', 'Schoenfeld 2017 · Pelland 2024']);
  }
  if (R.rest != null && R.str.length >= 6) {
    const rr = Math.round(R.rest / 5) * 5, rs = rr >= 60 ? `${Math.floor(rr / 60)}분${rr % 60 ? ` ${rr % 60}초` : ''}` : `${rr}초`, big = R.str.some(s => ['스쿼트', '데드리프트', '벤치프레스', '레그 프레스', '로우', '숄더 프레스'].includes(s.type));
    if (R.rest < 75 && big && goalKey() !== 'health') fb.push(['info', `세트 사이 휴식 평균 ${rs}`, '휴식 길이 자체가 근육 성장에 주는 차이는 크지 않아요. 다만 스쿼트·벤치·로우처럼 무거운 종목은 짧게 쉬면 다음 세트 횟수가 떨어지니, 횟수가 많이 줄면 2분 정도 쉬어보세요.', 'ACSM 2026 · Singer 2024']);
    else if (R.rest > 240) fb.push(['info', `세트 사이 휴식 평균 ${rs}`, '충분히 쉬었어요. 시간이 부족한 날엔 보조 종목만 1–2분으로 줄여도 효과 차이는 작아요.', 'Singer 2024']);
    else fb.push(['good', `세트 사이 휴식 평균 ${rs}`, '근성장에 무난한 범위예요(1분 이상이면 충분하고, 큰 운동은 2–3분).', 'Singer 2024']);
  }
  if (R.mins && R.mins > 100 && R.str.length) fb.push(['info', `운동 시간 ${R.mins}분`, '세트 사이 휴식이 길었거나 종목이 많았어요. 시간이 부족하면 보조 종목을 줄이고 메인 종목에 집중하세요.']);
  const gk = goalKey();
  if (goalBase(gk) === 'cut' && R.str.length) fb.push(['info', `목표: ${GOALS[gk].l}`, '감량 중엔 무게를 지키는 게 근육 유지의 핵심이에요. 오늘 무게가 지난번만큼 나왔다면 잘 하고 있는 거예요.']);
  if ((gk === 'health' || goalBase(gk) === 'cut') && !R.car.length) fb.push(['info', '유산소 없음', '목표에 맞게 걷기·사이클을 20–30분 더하면 주 150분 권장량을 채우기 쉬워요.']);
  const carMin = R.car.reduce((a, s) => a + (+s.mins || 0), 0);
  if (carMin) { const wkCar = R.wkCar; fb.push([wkCar >= 150 ? 'good' : 'info', `유산소 ${trimNum(carMin)}분 · 최근 7일 ${trimNum(wkCar)}분`, wkCar >= 150 ? '건강 권장량(주 150–300분)을 채웠어요.' : `건강 권장량은 주 150–300분이에요. ${trimNum(150 - wkCar)}분 남았어요.`, 'WHO 2020']); }
  const tiles = R.str.length ? [[R.mins ? `${R.mins}분` : '–', '운동 시간'], [`${R.str.length}`, '세트'], [R.vol ? fmtInt(R.vol) : '–', '볼륨 kg'], [fmtInt(R.ex.total), 'kcal 소모']]
    : [[`${trimNum(carMin)}분`, '유산소'], [`${R.car.length}`, '종목'], [fmtInt(R.ex.carK), 'kcal 소모'], [fmtInt(R.ex.total), '총 소모']];
  return `<div class="tiles fin-tiles">${tiles.map(([v, l]) => `<div class="tile"><div class="k">${l}</div><div class="v">${v}</div></div>`).join('')}</div>
    ${ranked.length ? `<div class="sec-h" style="margin-top:12px"><h2 style="font-size: 15px">오늘 쓴 부위</h2><span class="aside">진할수록 많이</span></div>
      <div class="bodymaps fin-maps">${bodySvg('front', R.reg, max, '앞')}${bodySvg('back', R.reg, max, '뒤')}</div>
      <div class="fin-rank">${ranked.slice(0, 6).map(([r, v], i) => `<span><b>${i + 1}</b> ${REGIONS[r]} <i>${r1(v)}</i></span>`).join('')}</div>` : ''}
    ${fb.length ? `<div class="sec-h" style="margin-top:12px"><h2 style="font-size: 15px">피드백</h2></div>
      ${fb.map(([lv, t, dd, src]) => `<div class="mixtip"><b><span class="status ${lv}">${ICON[lv]}</span> ${esc(t)}</b><div class="d">${esc(dd)}</div>${src ? `<div class="src">근거: ${esc(src)}</div>` : ''}</div>`).join('')}` : ''}
    ${R.cmp.length ? `<div class="sec-h" style="margin-top:12px"><h2 style="font-size: 15px">종목별</h2><span class="aside">오늘 · 지난번 · 다음번</span></div>
      ${R.cmp.map(x => { const txt = l => { const w = l.map(s => fmtSetW(s)), same = w.every(v => v === w[0]); return same ? `${w[0]} × ${l.map(s => s.r).join('·')}` : l.map(s => fmtSetFull(s)).join(' / '); };
        const tag = x.st === 'up' ? `<span class="status good">↑ +${Math.round(x.pct * 100) || 1}%</span>` : x.st === 'order' ? `<span class="status info">↓ ${Math.round(x.pct * 100)}% · 순서 ${x.order.from}→${x.order.to}번째</span>` : x.st === 'down' ? `<span class="status warn">↓ ${Math.round(x.pct * 100)}%</span>` : x.st === 'same' ? '<span class="status info">= 비슷</span>' : '<span class="status info">첫 기록</span>';
        return `<div class="fin-ex"><div class="nm">${esc(x.name)} ${tag}</div>
          <div class="d">오늘 ${esc(txt(x.list))}${x.prev ? `<br><span class="muted">지난번 ${esc(txt(x.prev.sets))} · ${esc(shortDate(x.prev.date))}</span>` : ''}</div>
          ${x.next ? `<div class="nx">다음번 <b class="num">${esc(sgTxt(x.next, x.u, eqById(x.eq) || x.list[0]))}</b> — ${esc(x.next.why.replace(/^지난번/, '오늘').replace('(지난번 ', '(오늘 '))}</div>` : ''}</div>`; }).join('')}` : ''}
    <div class="sec-h" style="margin-top:12px"><h2 style="font-size: 15px">오늘 컨디션</h2><span class="aside">디로딩 판단에 쓰여요 · 선택</span></div>
    <div class="scale">${[1, 2, 3, 4, 5].map(n => `<button class="${c.cond === n ? 'on' : ''}" data-act="fin-cond" data-v="${n}">${n}</button>`).join('')}</div>
    <div class="note" style="margin-top:4px">1 = 매우 힘듦 · 5 = 아주 좋음</div>
    ${k === today() ? `<div class="sec-h" style="margin-top:12px"><h2 style="font-size: 15px">다음 운동</h2></div>${recCardHtml(k)}` : ''}
    ${(() => { const days = Object.keys(DB.days).filter(trainedDay).length, lb = DB.settings.lastBackup, since = lb ? daysBetween(lb, today()) : null;
      const ios = iosBrowser(), due = ios ? days >= 3 && (since == null || since >= 7) : days >= 12 && (since == null || since >= 30);
      return !isNative && due ? `<div class="infobox" style="margin-top:12px"><div class="k">백업</div>기록이 ${days}일치 쌓였어요${lb ? ` (마지막 백업 ${since}일 전)` : ''}. ${ios ? 'Safari에서 쓰고 있어서 7일 동안 안 열면 기록이 지워질 수 있어요. 홈 화면에 추가해서 쓰고, 백업 코드도 저장해 두세요.' : '기록은 이 브라우저에만 있어서 폰을 바꾸거나 인터넷 기록을 지우면 사라질 수 있어요.'}<button class="btn sm block" style="margin-top:8px" data-act="export">백업 코드 저장하기</button></div>` : ''; })()}
    ${k === state.date && d.fin ? `<div class="grid2" style="margin-top:14px"><button class="btn" data-act="day-resume">이어서 하기</button><button class="btn primary" data-act="sheet-close">완료</button></div>` : `<button class="btn primary block" style="margin-top:14px" data-act="sheet-close">닫기</button>`}`;
}
function openFinish(k) { state.sheet = { kind: 'finish', k }; openSheet(k === today() ? '오늘 운동 마무리' : dateLabel(k), '수고했어요', finishHtml(k), state.sheet); }
function viewWorkout() {
  const k = state.date, d = dayRO(k), S = DB.settings;
  const c = d.check || {};
  const checkVal = (c.cond || c.sleep || c.sore || c.bw) ? [c.cond ? `컨디션 ${c.cond}` : '', c.sleep ? `수면 ${trimNum(c.sleep)}h` : '', c.sore ? `근육통 ${c.sore}` : '', c.bw ? `${trimNum(c.bw)}kg` : ''].filter(Boolean).join(' · ') : '기록 안 함';
  const mus = musclesOfDay(k);
  const scale = (field, val) => `<div class="scale">${[1, 2, 3, 4, 5].map(n => `<button class="${val === n ? 'on' : ''}" data-act="check" data-f="${field}" data-v="${n}">${n}</button>`).join('')}</div>`;
  const sets = d.sets || [];
  const hasPlan = !!(d.plan && d.plan.eqs && d.plan.eqs.length);
  const firstTime = !allSets().length && !hasPlan;
  const P0 = DB.prog && PROGRAMS.find(p => p.id === DB.prog.id);
  const nextDay = P0 && P0.days[progDay(P0, DB.prog.next)];

  let h = installHint();

  // 1) today's workout + the main action
  if (k === today() && !d.fin && fxList().length) h += `<button class="btn primary block fxbtn" data-act="focus-open">▶ 운동 모드 — 한 종목씩 크게</button>`;
  h += `<div class="sec-h" style="${installHint() ? '' : 'margin-top:6px'}"><h2>${k === today() ? '오늘의 운동' : esc(dateLabel(k)) + ' 운동'}</h2><span class="aside">${sets.length ? `${sets.filter(s => !isCardioSet(s)).length}세트` : ''}<span id="wk-elapsed">${elapsedTxt(k)}</span></span></div>
  ${sets.length && d.fin ? `<section class="card fincard"><div class="row between" style="gap:10px"><div><b>✓ ${k === today() ? '오늘' : ''} 운동 완료</b><div class="small muted">${(() => { const R = sessionReport(k); return [R.mins ? `${R.mins}분` : '', `${R.str.length}세트`, R.car.length ? `유산소 ${trimNum(R.car.reduce((a, s) => a + (+s.mins || 0), 0))}분` : ''].filter(Boolean).join(' · '); })()}</div></div>
      <button class="btn sm primary" data-act="fin-open">요약·피드백</button></div>
      <button class="linkbtn" style="margin-top:6px" data-act="day-resume">↺ 이어서 하기 (마무리 취소)</button></section>`
    : ''}
  ${P0 && !hasPlan && !sets.length ? `<section class="card nextcard"><div class="row between" style="gap:10px">
      <div style="min-width:0"><div class="small muted">진행 중 · ${esc(P0.name)}</div><div style="font-weight:800;font-size: 16px">오늘은 ${esc(nextDay.t)}</div>
      <div class="small muted" style="margin-top:2px">${new Set(nextDay.ex.map(x => x[0])).size}종목 · ${esc([...new Set(nextDay.ex.map(([id]) => (eqById(id) || {}).name).filter(Boolean))].slice(0, 3).join(', '))}…</div></div>
      <button class="btn primary" data-act="prog-start" data-p="${P0.id}" data-d="${progDay(P0, DB.prog.next)}">시작</button></div></section>` : ''}
  ${!sets.length && !hasPlan && k === today() ? recCardHtml(k) : ''}
  <div class="cta-row two ${sets.length && d.fin ? 'hidden' : ''}">
    <button class="btn primary big" data-act="picker-open"><span style="font-size: 20px;line-height:1">+</span> 운동 추가</button>
    <button class="btn big" data-act="routines-open"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg> 루틴</button>
  </div>`;
  h += planHtml(k);
  if (sets.length) {
    const order = [], groups = {};
    for (const s of sets) { if (!groups[s.eq]) { groups[s.eq] = []; order.push(s.eq); } groups[s.eq].push(s); }
    const flags = prFlags();
    const fix = state.fix && Date.now() - state.fix.at < 5 * 60 * 1000 ? state.fix : null;
    // the exercise in progress = the one you opened, else the one you logged last
    const lastSet = sets.reduce((a, x) => (!a || (x.t || 0) >= (a.t || 0) ? x : a), null);
    const activeEq = state.openEq === '-' ? null : state.openEq && groupsHas(sets, state.openEq) ? state.openEq : lastSet && lastSet.eq;
    h += '<div class="eqsheet">';
    for (const id of order) {
      const g = groups[id], f = g[0], e = eqById(id) || { name: f.name, brand: f.brand, m: f.m };
      const cardio = isCardioSet(f);
      const vol = g.reduce((a, s) => a + setKg(s) * (+s.r || 0), 0);
      if (id !== activeEq) {
        h += `<div class="card group compact" data-act="eq-expand" data-eq="${esc(id)}">
          <div class="gh"><div><div class="b">${esc(e.brand || '')} ${mtag(f.m)}</div><div class="t">${esc(e.name)}</div></div>
            <div class="r">${cardio ? `${trimNum(g.reduce((a, s) => a + (+s.mins || 0), 0))}분` : `${g.length}세트`} ▾</div></div>
          <div class="setchips">${g.map(s => `<span>${esc(fmtSetFull(s))}${flags.has(s.id) ? ' <b class="prb">PR</b>' : ''}</span>`).join('')}</div></div>`;
        continue;
      }
      h += `<div class="card group">
        <div class="gh" data-act="eq-expand" data-eq="${esc(id)}">
          <div><div class="b">${esc(e.brand || '')} ${mtag(f.m)}</div><div class="t">${esc(e.name)}</div></div>
          <div class="r">${cardio ? `${trimNum(g.reduce((a, s) => a + (+s.mins || 0), 0))}분` : `${g.length}세트${vol ? `<br>${fmtInt(vol)}kg` : ''}`}</div>
        </div>
        ${g.map((s, i) => `<div class="setrow" ${cardio ? '' : `data-act="set-edit" data-eq="${esc(id)}" data-id="${esc(s.id)}"`}>
            <span class="n">${i + 1}</span>
            <span class="w">${esc(fmtSetFull(s))}${flags.has(s.id) ? '<span class="prb">PR</span>' : ''}${s.rir != null ? ` <span class="small muted">RIR ${s.rir === 4 ? '4+' : s.rir}</span>` : ''}</span>
            <span class="e">${!cardio && setE1(s) ? `1RM≈${r1(setE1(s))}kg` : ''}</span>
            <button class="x" data-act="set-del" data-id="${esc(s.id)}" aria-label="세트 삭제">×</button>
          </div>${fix && fix.id === s.id ? fixStrip(s) : ''}`).join('')}
        ${cardio ? `<button class="btn sm block addmore" data-act="open-set" data-eq="${esc(id)}">+ 기록 추가</button>`
          : `<div class="quickrow"><button class="btn primary" data-act="set-quick" data-eq="${esc(id)}">✓ 세트 끝 <span class="qs">${esc(fmtSetFull(g[g.length - 1]))}</span></button><button class="btn" data-act="open-set" data-eq="${esc(id)}">다르게</button></div>`}
      </div>`;
    }
    h += '</div>';
    if (!d.fin) h += `<button class="btn block finbtn" data-act="day-finish">✓ ${k === today() ? '오늘' : '이날'} 운동 마무리하기</button>`;
  }

  if (sets.length && k === today()) h += `<div class="sec-h"><h2>다음 운동</h2></div>` + recCardHtml(k);

  // 2) rest timer
  h += `<div class="sec-h"><h2>휴식 타이머</h2></div>
  <section class="card timercard">
    <div class="row between"><div class="tlabel num">${fmtSec(S.rest)}</div>
      <button class="btn primary sm" data-act="timer-start" data-s="${S.rest}">▶ 시작</button></div>
    <div class="presets">${[45, 60, 90, 120, 150, 180, 240].map(s => `<button class="chip ${s === S.rest ? 'on' : ''}" data-act="rest-default" data-s="${s}">${fmtSec(s)}</button>`).join('')}</div>
  </section>`;

  // 3) optional extras
  h += `<div style="margin-top:22px"></div>
  <details class="check" ${state.checkOpen ? 'open' : ''}>
    <summary>컨디션 체크<span class="val">${esc(checkVal)}</span></summary>
    <div class="body">
      <div class="flabel">전반적 컨디션</div>${scale('cond', c.cond)}<div class="scale-lbl"><span>최악</span><span>최상</span></div>
      <div class="flabel">근육통</div>${scale('sore', c.sore)}<div class="scale-lbl"><span>없음</span><span>심함</span></div>
      <div class="grid2">
        <div><div class="flabel">지난밤 수면 (시간)</div>
        <input type="number" inputmode="decimal" step="0.5" min="0" max="16" placeholder="예: 6.5" value="${c.sleep != null ? c.sleep : ''}" data-on="check-sleep"></div>
        <div><div class="flabel">아침 체중 (kg)</div>
        <input type="number" inputmode="decimal" step="0.1" min="20" max="300" placeholder="${latestBodyweight() || '예: 72.4'}" value="${c.bw != null ? c.bw : ''}" data-on="check-bw"></div>
      </div>
    </div>
  </details>
  <details class="check" style="margin-top:8px" ${state.musOpen ? 'open' : ''} data-k="mus">
    <summary>부위만 체크<span class="val">${mus.all.length ? esc(mus.all.join(' · ')) : '–'}</span></summary>
    <div class="body">
    <div class="chips">${STRENGTH_MUSCLES.concat(['유산소', '전신']).map(m => {
      const on = mus.all.includes(m), auto = mus.auto.has(m);
      return `<button class="chip ${on ? 'done' : ''} ${auto ? 'auto' : ''}" data-act="done-toggle" data-m="${esc(m)}">${on ? '✓ ' : ''}${esc(mName(m))}</button>`;
    }).join('')}</div></div>
  </details>`;
  return h;
}

const groupsHas = (sets, eq) => sets.some(s => s.eq === eq);
/* right after "세트 끝": confirm how many reps it really was, one tap */
function fixStrip(s) {
  const r = +s.r, opts = [];
  for (let x = Math.max(1, r - 3); x <= r + 2; x++) opts.push(x);
  return `<div class="fixstrip"><div class="q">몇 개 했어요? <span class="muted">쉬는 동안 맞춰주세요</span></div>
    <div class="fx-r">${opts.map(x => `<button class="${x === r ? 'on' : ''}" data-act="fix-r" data-id="${esc(s.id)}" data-r="${x}">${x}</button>`).join('')}</div>
    <div class="row" style="gap:6px;margin-top:6px"><span class="small muted">무게</span>
      <button class="btn sm" data-act="fix-w" data-id="${esc(s.id)}" data-d="-1">−</button><b class="num">${trimNum(s.w)}${s.u}</b><button class="btn sm" data-act="fix-w" data-id="${esc(s.id)}" data-d="1">+</button>
      <button class="btn sm primary" style="margin-left:auto" data-act="fix-ok">맞아요</button></div></div>`;
}

/* ---------- routines: my saved routines + well-known programs ---------- */
const tgSets = t => String(t).split('+').reduce((a, part) => { part = part.trim(); return a + (/^\d+\/\d+\/\d+/.test(part) ? 3 : parseInt(part, 10) || 0); }, 0) || 3;
/* ---------- workout mode: one exercise at a time, big buttons, rest timer in the same screen ---------- */
function fxList() {
  const d = dayRO(state.date), plan = d.plan, done = (d.sets || []).filter(s => !isCardioSet(s));
  const ids = plan && plan.eqs && plan.eqs.length ? plan.eqs.slice() : [];
  for (const s of done) if (!ids.includes(s.eq)) ids.push(s.eq);
  return ids.filter(id => { const e = eqById(id) || eqOrRecord(id); return e && e.kind !== 'cardio'; });
}
function fxTarget(id) {
  const d = dayRO(state.date), tg = d.plan && d.plan.tg && d.plan.tg[id], prev = prevSessionOfEq(id, state.date);
  return { tg, n: tg ? tgSets(tg) : prev ? prev.sets.length : 3, prev };
}
function fxPrefill() {
  const F = state.fx, id = fxList()[F.i]; if (!id) return;
  const e = eqById(id) || eqOrRecord(id), u = unitFor(id), todays = (dayRO(state.date).sets || []).filter(s => s.eq === id);
  const { prev } = fxTarget(id), last = todays[todays.length - 1];
  const sg = !last && prev ? progressionHint(e, prev, u) : null;
  const src = last || (sg ? { w: sg.w, r: sg.r, u } : prev ? prev.sets[0] : null);
  F.w = src ? (src.u === u || !src.u ? +src.w || 0 : r1(fromKg(setKg(src), u))) : 0; F.r = src ? +src.r || 10 : 10; F.sg = sg;
}
function openFocus() {
  const L = fxList(); if (!L.length) { toast('먼저 운동을 추가하세요'); return; }
  const todays = dayRO(state.date).sets || [];
  let i = L.findIndex(id => todays.filter(s => s.eq === id).length < fxTarget(id).n); if (i < 0) i = L.length - 1;
  state.fx = { i }; fxPrefill();
  openSheet('운동 모드', '지금 할 운동', focusHtml(), { kind: 'focus' });
}
function focusHtml() {
  const F = state.fx, L = fxList(), id = L[F.i]; if (!id) return '<div class="empty">운동이 없어요</div>';
  const e = eqById(id) || eqOrRecord(id), u = unitFor(id), bw = e.bw || BW_NEXT[id], { tg, n, prev } = fxTarget(id);
  const did = (dayRO(state.date).sets || []).filter(s => s.eq === id);
  const step = u === 'lb' ? 5 : 2.5, rem = timerRemain();
  const lastTxt = prev ? `${fmtSetW(prev.sets[0])} × ${prev.sets.map(s => s.r).join('·')}` : '첫 기록';
  return `<div class="fx">
    <div class="fx-top"><span class="small muted">${F.i + 1} / ${L.length} 종목</span><button class="linkbtn" data-act="open-set" data-eq="${esc(id)}">자세히 기록 ›</button></div>
    <div class="fx-name">${esc(e.name)}</div>
    <div class="small muted">${tg ? `목표 ${esc(tg)} · ` : ''}지난번 ${esc(lastTxt)}</div>
    <div class="fx-dots">${Array.from({ length: Math.max(n, did.length) }, (_, k) => `<span class="${k < did.length ? 'on' : ''}">${k < did.length ? esc(`${did[k].w > 0 ? trimNum(did[k].w) : ''}${did[k].w > 0 ? '×' : ''}${did[k].r}`) : k + 1}</span>`).join('')}</div>
    ${rem != null ? `<div class="fx-rest" id="fx-rest"><span class="small">휴식</span><b class="num" id="fx-rest-t">${fmtSec(Math.ceil(rem))}</b>
        <div class="row" style="gap:6px"><button class="btn sm" data-act="fx-add15">+15초</button><button class="btn sm" data-act="fx-skip">건너뛰기</button></div></div>` : ''}
    ${bw ? '' : `<div class="fx-step"><span class="lb">무게 ${u}</span><button class="btn" data-act="fx-w" data-d="${-step}" aria-label="무게 줄이기">−</button><b class="num">${trimNum(F.w)}</b><button class="btn" data-act="fx-w" data-d="${step}" aria-label="무게 늘리기">+</button></div>`}
    <div class="fx-step"><span class="lb">횟수</span><button class="btn" data-act="fx-r" data-d="-1" aria-label="횟수 줄이기">−</button><b class="num">${F.r}</b><button class="btn" data-act="fx-r" data-d="1" aria-label="횟수 늘리기">+</button></div>
    ${F.sg && !did.length ? `<div class="small muted" style="text-align:center">${esc(F.sg.why)}</div>` : ''}
    <button class="btn primary block fx-go" data-act="fx-done">✓ ${did.length + 1}세트 완료</button>
    <div class="grid2" style="margin-top:8px"><button class="btn" data-act="fx-move" data-d="-1" ${F.i ? '' : 'disabled'}>← 이전 종목</button><button class="btn" data-act="fx-move" data-d="1" ${F.i < L.length - 1 ? '' : 'disabled'}>다음 종목 →</button></div>
  </div>`;
}
const fxRender = () => { if (state.sheet && state.sheet.kind === 'focus') setSheetBody(focusHtml(), true); };
function startPlan(list, label, from) {
  // list: [[eqId, target]]; the same exercise twice (5/3/1 main + 5×10) becomes one row with both targets
  const eqs = [], tg = {};
  let swapped = 0;
  for (const [id0, t] of list) { const id = gymSwap(id0); if (id !== id0) swapped++; if (!eqById(id)) continue; if (!eqs.includes(id)) { eqs.push(id); tg[id] = t; } else tg[id] += ` + ${t}`; }
  day(state.date).plan = { from: from || state.date, eqs, tg, label };
  if (swapped) setTimeout(() => toast(`내 헬스장에 없는 기구 ${swapped}개를 같은 운동으로 바꿨어요`), 1600);
  state.planOpen = false; state.openEq = null;
  save(); closeSheet(); render(); window.scrollTo(0, 0);
  toast(`${label} · ${eqs.length}종목 · 종목을 눌러 기록하세요`);
}
function routinesHtml() {
  const P0 = DB.prog && PROGRAMS.find(p => p.id === DB.prog.id);
  const d = dayRO(state.date), todays = d.sets || [];
  const TAB = state.rtTab || 'rec';
  let h = '';
  if (P0) {
    const nx = progDay(P0, DB.prog.next), nd = P0.days[nx];
    h += `<section class="card nextcard" style="margin-bottom:10px"><div class="small muted">진행 중</div>
      <div class="row between" style="gap:8px;margin-top:2px"><b style="font-size: 16px">${esc(P0.name)}</b><button class="btn sm ghost" data-act="prog-open" data-p="${P0.id}">보기</button></div>
      <div class="grid2" style="margin-top:10px"><button class="btn primary" data-act="prog-start" data-p="${P0.id}" data-d="${nx}">다음: ${esc(nd.t)}${P0.rep ? ` · ${progWeek(P0, DB.prog.next)}주차` : ''}</button><button class="btn" data-act="prog-stop">그만하기</button></div></section>`;
  }
  // four tabs instead of one long page
  h += `<div class="seg rttabs">${[['rec', '추천'], ['bw', '집에서'], ['all', '전체'], ['mine', '내 루틴']].map(([v, l]) => `<button class="${TAB === v ? 'on' : ''}" data-act="rt-tab" data-v="${v}">${l}</button>`).join('')}</div>`;
  const isPro = p => /선수 루틴|Heavy Duty|트레이너 루틴/.test(p.who);
  const card = (p, extra) => `<button class="progcard" data-act="prog-open" data-p="${p.id}">
      <div class="row between" style="gap:8px"><b>${esc(p.name)}</b><span class="small muted" style="flex:0 0 auto">${esc(p.per)}</span></div>
      <div class="small muted" style="margin-top:3px"><b class="tier t${p.tier || 2}">${esc(p.lv)}</b> ${esc(p.why || p.who)}</div>${extra || ''}</button>`;

  if (TAB === 'rec') {
    const pf = DB.settings.profile || {}, sex = pf.sex, R = recPrograms();
    const seg = (act, cur, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${cur == v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
    h += R.map(({ p, why }) => card(p, `<div class="small recwhy">${esc(why)}</div>`)).join('');
    h += `<details class="more"><summary>${esc([pf.exp != null ? EXP_OPTS[pf.exp][1] : '경력', pf.freq ? `주 ${FREQ_L[pf.freq]}` : '주 횟수', sex ? (sex === 'f' ? '여성' : '남성') : '성별'].join(' · '))} 바꾸기</summary>
      <div class="rtpf" style="margin-top:8px">
        <div><span class="small muted">경력</span>${seg('rt-exp', pf.exp, EXP_OPTS.map(([, l], i) => [i, l]))}</div>
        <div><span class="small muted">주 횟수</span>${seg('rt-freq', pf.freq, Object.entries(FREQ_L))}</div>
        <div><span class="small muted">성별</span>${seg('rt-sex', sex, [['f', '여성'], ['m', '남성']])}</div>
      </div></details>`;
    return h;
  }
  if (TAB === 'bw') {
    return h + PROGRAMS.filter(p => p.bw).sort((a, b) => (a.tier || 2) - (b.tier || 2)).map(p => card(p)).join('');
  }
  if (TAB === 'mine') {
    h += DB.routines.length ? DB.routines.map(r => `<div class="myrt"><button class="main" data-act="my-start" data-id="${r.id}"><b>${esc(r.name)}</b>
        <div class="small muted">${r.list.length}종목 · ${esc(r.list.slice(0, 3).map(([id]) => (eqById(id) || {}).name).filter(Boolean).join(', '))}${r.list.length > 3 ? '…' : ''}</div></button>
        <button class="x" data-act="my-del" data-id="${r.id}" aria-label="루틴 삭제">×</button></div>`).join('')
      : '<div class="small muted" style="margin:4px 0 8px">저장한 루틴이 없어요.</div>';
    if (todays.length || (d.plan && d.plan.eqs && d.plan.eqs.length)) h += `<div class="row" style="margin-top:8px;gap:6px"><input id="rt-name" placeholder="예: 월요일 가슴·삼두" maxlength="20"><button class="btn" style="flex:0 0 auto" data-act="my-save">오늘 운동 저장</button></div>`;
    if (pastSessions(state.date, 1).length) h += `<button class="btn block ghost" style="margin-top:8px" data-act="routine-load">↻ 지난 운동 그대로 불러오기</button>`;
    return h;
  }
  // all: by body part, or every program by level
  const M = state.rtM || '전체';
  h += `<div class="chips rtchips">${['전체', '가슴', '등', '어깨', '하체', '엉덩이', '팔', '전신'].map(m => `<button class="chip ${m === M ? 'on' : ''}" data-act="rt-m" data-m="${m}">${m}</button>`).join('')}</div>`;
  if (M !== '전체') {
    const days = [];
    for (const p of PROGRAMS) p.days.forEach((dd, i) => { if (dayMuscles(dd).has(M) && !days.some(([q, x]) => q === p && x.t === dd.t)) days.push([p, dd, i]); });
    days.sort((a, b) => dayMuscles(b[1]).share(M) - dayMuscles(a[1]).share(M));
    h += days.length ? days.map(([p, dd, i]) => { const names = [...new Set(dd.ex.map(([id]) => (eqById(id) || {}).name).filter(Boolean))];
      return `<div class="daycard"><div class="row between" style="gap:8px"><div style="min-width:0"><b>${esc(dd.t)}</b><div class="small muted">${esc(p.name)} · ${esc(p.lv)}</div></div>
        <a class="vlink" href="${ytLink(dayQuery(p, dd))}" target="_blank" rel="noopener">▶ 영상</a></div>
        <div class="small" style="margin-top:4px;color:var(--ink2)">${esc(names.slice(0, 4).join(', '))}${names.length > 4 ? '…' : ''}</div>
        <div class="grid2" style="margin-top:8px"><button class="btn sm" data-act="prog-open" data-p="${p.id}">루틴 보기</button><button class="btn sm primary" data-act="day-start" data-p="${p.id}" data-d="${i}">오늘 이걸로</button></div></div>`; }).join('')
      : '<div class="small muted">해당하는 날이 없어요.</div>';
    return h;
  }
  const TIERS = [[1, '초급'], [2, '중급'], [3, '상급']];
  const LV = state.rtLv || 0, SX = state.rtSx || (DB.settings.profile || {}).sex || 'a';
  const inSx = p => SX === 'a' ? true : SX === 'f' ? !!(p.fem || p.uni) : !p.fem || !!p.uni;
  h += `<div class="row" style="gap:6px;margin:4px 0 8px"><div class="seg">${[['f', '여성'], ['m', '남성'], ['a', '전체']].map(([v, l]) => `<button class="${SX === v ? 'on' : ''}" data-act="rt-sx" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="seg">${[[0, '전체'], ...TIERS].map(([t, l]) => `<button class="${LV === t ? 'on' : ''}" data-act="rt-lv" data-v="${t}">${l}</button>`).join('')}</div></div>`;
  for (const [t, l] of TIERS) {
    if (LV && LV !== t) continue;
    const list = PROGRAMS.filter(p => (p.tier || 2) === t && inSx(p) && !p.bw).sort((x, y) => (SX === 'f' ? !!y.fem - !!x.fem : 0) || isPro(x) - isPro(y));
    if (list.length) h += `<div class="tierh"><b class="tier t${t}">${l}</b></div>` + list.map(p => card(p)).join('');
  }
  return h;
}
/* program sequence: plain programs cycle their days; `rep`/`block` programs run each block of `block` days `rep` times (e.g. A·B·C for 4 weeks, then the next phase) */
const progLen = p => p.rep ? p.days.length * p.rep : p.days.length;
const progDay = (p, n) => { n = (n || 0) % progLen(p); return p.rep ? Math.floor(n / (p.block * p.rep)) * p.block + n % p.block : n; };
const progWeek = (p, n) => Math.floor(((n || 0) % progLen(p)) / p.block) + 1;
/* ---------- program recommendation ---------- */
const EXP_OPTS = [[1, '처음'], [1, '1년 미만'], [2, '1–3년'], [3, '3년 이상']]; // [tier, label]
const FREQ_L = { 2: '2회', 3: '3회', 4: '4회', 5: '5–6회' };
const expTier = () => { const e = (DB.settings.profile || {}).exp; return e != null ? EXP_OPTS[e][0] : 1; };
const progDays = p => { const m = /주 (\d)/.exec(p.per); return m ? +m[1] : p.id === 'mentzer' ? 1 : p.id === 'haney' ? 5 : p.id === 'y3t' ? 4 : 3; };
// programs that suit each goal, best first
const GOAL_PROGS = {
  cut: ['fatloss3', 'circuit3', 'db2', 'mach3', 'ul4', 'sc12', 'glute3', 'fb3', 'bwdiet3'], contest: ['ul4', 'phul', 'wul4', 'gg12', 'gluteadv5', 'glute3', 'fatloss3', 'ppl'],
  recomp: ['sc12', 'gg12', 'glute3', 'ul4', 'fb3', 'phul', 'wul4'], keep: ['db2', 'mach3', 'fb3', 'ul4', 'bwfb3'], health: ['fatloss3', 'circuit3', 'db2', 'mach3', 'fb3', 'bwdiet3', 'bwfb3'],
  strength: ['sl5', 'bbb', 'phul', 'regpark', 'ul4'], leanbulk: ['ul4', 'phul', 'sc12', 'gg12', 'glute3', 'wul4', 'gluteadv5', 'ppl', 'phat', 'fb3', 'sl5'],
  bulk: ['ppl', 'phul', 'phat', 'ul4', 'bbb', 'arnold', 'fb3', 'sl5'],
};
function recPrograms() {
  const pf = DB.settings.profile || {}, gk = goalKey(), T = expTier(), F = pf.freq ? +pf.freq : null, pref = GOAL_PROGS[gk] || [];
  const isPro = p => /선수 루틴|Heavy Duty|트레이너 루틴/.test(p.who);
  const scored = PROGRAMS.map(p => {
    const t = p.tier || 2, d = progDays(p), gi = pref.indexOf(p.id);
    let sc = 0;
    sc -= t > T ? (t - T) * 4 : (T - t) * 1.5;           // too hard is worse than too easy
    if (F) sc -= Math.abs((F === 5 ? 5.5 : F) - d) * 1.6; // fits the days you can train
    sc += gi >= 0 ? 4 - gi * 0.4 : 0;                     // suits the goal
    if (pf.sex === 'f' && p.fem) sc += 1.5;
    if (pf.sex === 'm' && p.fem && !p.uni) sc -= 4; // glute-centred plans
    if (isPro(p) && T < 3) sc -= 2;
    const why = [t > T ? '한 단계 위 수준' : '', F ? `주 ${d}일${Math.abs((F === 5 ? 5.5 : F) - d) < 1 ? ' — 가능한 횟수와 맞음' : ''}` : `주 ${d}일`, gi >= 0 ? `${goal().l}에 맞음` : ''].filter(Boolean).join(' · ');
    return { p, sc, why };
  }).sort((a, b) => b.sc - a.sc);
  return scored.slice(0, 3);
}
const ytLink = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
// a search for one day of a program: "<program> <body parts of that day>"
const dayQuery = (p, d) => `${(PROGRAM_INFO[p.id] || {}).yt || p.name} ${d.t.replace(/\(.*?\)/g, '').replace(/[·]/g, ' ').replace(/\d주차/g, '').replace(/\s+/g, ' ').trim()} 운동`;
function progInfoHtml(p) {
  const I = PROGRAM_INFO[p.id]; if (!I) return '';
  return `<div class="proginfo">
    <div class="pi-row"><span class="k">목표</span><b>${esc(I.goal)}</b></div>
    <div class="pi-row"><span class="k">추천 대상</span><span>${esc(I.for)}</span></div>
    <div class="k" style="margin-top:10px">이것만 지키세요</div>
    <ul>${I.keys.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="links">
      <a href="${ytLink(I.yt)}" target="_blank" rel="noopener">▶ 유튜브에서 영상 찾기</a></div>
    <div class="note">근비대 = 근육 크기 키우기 · 근력 = 들 수 있는 최대 무게 늘리기. 둘은 겹치지만 반복 수·휴식이 달라요(근력은 무겁게 적게 오래 쉬고, 근비대는 6–15회 정도로 세트 수를 쌓아요).</div>
  </div>`;
}
/* which body parts a program day mainly trains (share of its target sets) */
function dayMuscles(dd) {
  const n = {}; let tot = 0;
  let gl = 0;
  for (const [id, t] of dd.ex) { const e = eqById(id); if (!e) continue; if (e.kind !== 'cardio') gl += ((regionsOf(e.name, e.type, e.m).glutes || 0) >= 1 ? tgSets(t) : 0); const m = e.m === '다리' ? '하체' : e.m === '코어' ? null : e.m === '전신' ? '하체' : e.m; const k = tgSets(t); tot += k; if (m) n[m] = (n[m] || 0) + k; }
  const out = new Set(Object.entries(n).filter(([, v]) => v / tot >= 0.25).map(([m]) => m));
  n['엉덩이'] = gl; if (tot && gl / tot >= 0.4) out.add('엉덩이');
  out.share = m => m === '전신' ? 1 : (n[m] || 0) / tot;
  // full body = real lower-body work and real upper-body work in the same day
  const up = ['가슴', '등', '어깨', '팔'].reduce((x, m) => x + (n[m] || 0), 0);
  if ((n['하체'] || 0) / tot >= 0.2 && up / tot >= 0.35) out.add('전신');
  return out;
}
function openRoutines() { openSheet('루틴', '어떤 루틴으로 할까요?', routinesHtml(), { kind: 'routines' }); }
function openProgram(id) {
  const p = PROGRAMS.find(x => x.id === id); if (!p) return;
  const nx = DB.prog && DB.prog.id === id ? progDay(p, DB.prog.next) : 0;
  const h = `<button class="linkbtn" data-act="routines-open">← 루틴 목록</button>
    <div class="row" style="gap:6px;flex-wrap:wrap"><span class="mtag" style="--mc:var(--acc)">${esc(p.per)}</span><span class="mtag" style="--mc:var(--ink3)">${esc(p.lv)}</span><span class="small muted">${esc(p.who)}</span></div>
    <div style="margin-top:8px;font-size: 14px">${esc(p.desc)}</div>
    ${progInfoHtml(p)}
    <div class="sec-h" style="margin-top:16px"><h2 style="font-size: 15px">날짜별 구성</h2></div>
    ${p.days.map((d, i) => `<div class="progday ${i === nx ? 'next' : ''}">
      <div class="row between"><b>${esc(d.t)}</b><span class="row" style="gap:8px">${i === nx && DB.prog && DB.prog.id === id ? '<span class="small" style="color:var(--acc);font-weight:800">다음 차례</span>' : ''}<a class="vlink" href="${ytLink(dayQuery(p, d))}" target="_blank" rel="noopener">▶ 영상</a></span></div>
      ${d.ex.map(([eid, t]) => { const e = eqById(eid) || { name: eid, m: '' }; return `<div class="pex"><a href="${ytLink(`${e.name} 자세`)}" target="_blank" rel="noopener">${esc(e.name)} <span class="yt">▶</span></a><span class="num">${esc(t)}</span></div>`; }).join('')}
      <button class="btn ${i === nx ? 'primary' : ''} sm block" style="margin-top:8px" data-act="prog-start" data-p="${p.id}" data-d="${i}">오늘 이걸로 시작</button></div>`).join('')}
    <div class="infobox" style="margin-top:12px"><div class="k">진행 방법</div>${esc(p.note)}</div>
    <div class="note">▶ 영상은 그 날 부위의 유튜브 검색으로, 종목 이름을 누르면 그 종목 자세 영상 검색으로 열려요. 종목은 같은 동작이면 다른 기구로 바꿔도 돼요. 계획에서 다른 기구로 기록해도 같은 패턴으로 묶어 분석해요.</div>`;
  openSheet(p.who, p.name, h, { kind: 'program', id });
}

/* ---------- exercise picker (full-height sheet) ---------- */
const EQ_VIEWS = [['move', '운동별'], ['all', '기구 전체'], ['cardio', '유산소'], ['fav', '★ 즐겨찾기']];
/* movement-first picker: the well-known movements of each part first, the rest behind "더 보기" */
const TYPE_ORDER = {
  '가슴': ['벤치프레스', '인클라인 프레스', '체스트 프레스', '펙 플라이', '푸시업', '딥스'],
  '등': ['랫 풀다운', '로우', '풀업', '풀오버', '슈러그'],
  '어깨': ['숄더 프레스', '레터럴 레이즈', '리어 델트', '핸드스탠드 푸시업'],
  '팔': ['바이셉 컬', '트라이셉 익스텐션', '트라이셉 딥'],
  '다리': ['스쿼트', '레그 프레스', '런지', '레그 익스텐션', '레그 컬', '루마니안 데드리프트', '데드리프트', '힙 쓰러스트', '힙 어브덕션', '힙 어덕션', '카프 레이즈'],
  '코어': ['복근 크런치', '레그 레이즈', '코어 로테이션', '백 익스텐션'],
};
/* plain names and sub-parts, so the list reads like "옆 어깨 · 뒤 어깨", "이두 · 삼두" */
const TYPE_LABEL = { '풀오버': '풀오버·암 풀다운', '바이셉 컬': '이두 컬', '트라이셉 익스텐션': '삼두 익스텐션·푸시다운', '트라이셉 딥': '삼두 딥스', '리어 델트': '리어 델트 (리버스 플라이·페이스풀)', '레터럴 레이즈': '레터럴 레이즈 (옆으로 들기)', '핸드스탠드 푸시업': '물구나무 푸시업', '힙 어브덕션': '다리 벌리기 (어브덕션)', '힙 어덕션': '다리 모으기 (어덕션)', '펙 플라이': '체스트 플라이' };
const tLabel = t => TYPE_LABEL[t] || t;
/* gym slang and other names people type, by movement */
const SEARCH_ALIAS = {
  '풀오버': '암풀다운 스트레이트암 스암풀 풀오버', '랫 풀다운': '랫풀 렛풀다운 광배 풀다운', '풀업': '턱걸이 풀업 친업 어시스트', '로우': '시티드로우 케이블로우 바벨로우 티바 덤벨로우 등',
  '레터럴 레이즈': '사레레 사이드레터럴 사이드레이즈 측면', '리어 델트': '후면 리어 리버스플라이 페이스풀 뒤어깨', '숄더 프레스': '숄프 밀프 밀리터리 ohp 오버헤드', '슈러그': '승모',
  '바이셉 컬': '이두 팔컬 덤벨컬 해머컬', '트라이셉 익스텐션': '삼두 푸시다운 푸쉬다운 케이블푸시다운 스컬', '트라이셉 딥': '삼두 딥스',
  '벤치프레스': '벤치 가슴', '인클라인 프레스': '인클 윗가슴', '체스트 프레스': '체프 가슴', '펙 플라이': '펙덱 플라이 버터플라이 가슴', '딥스': '딥',
  '스쿼트': '스쿼트 스쿼드 하체', '레그 프레스': '레프 레그프레스', '레그 익스텐션': '레그익스 레익 대퇴', '레그 컬': '레그컬 햄스트링 레컬', '런지': '런지 불가리안 스플릿',
  '루마니안 데드리프트': 'rdl 루마 루데', '데드리프트': '데드 데드리프트', '힙 쓰러스트': '힙쓰 힙쓰러스트 엉덩이', '힙 어브덕션': '어브덕션 아웃타이 엉덩이옆', '힙 어덕션': '어덕션 이너타이 안쪽허벅지',
  '카프 레이즈': '종아리 카프', '복근 크런치': '복근 크런치 앱', '레그 레이즈': '복근 하복부', '백 익스텐션': '허리 백익', '푸시업': '팔굽혀펴기 푸쉬업',
};
const searchText = e => { const t = typeOfEq(e); return `${e.name} ${e.brand} ${t} ${tLabel(t)} ${mName(e.m)} ${SEARCH_ALIAS[t] || ''}`; };
/* what you actually hold or sit at, read from the name — so a row says "덤벨 · 케이블 · 머신", not a generic "바벨·덤벨" */
const TOOL_ORDER = ['덤벨', '바벨', '케이블', '머신', '맨몸', '밴드', '케틀벨'];
function toolOf(e) {
  const n = `${e.brand || ''} ${e.name || ''}`;
  if (e.bw) return '맨몸';
  if (/케이블/.test(n) || /^cb-/.test(e.id)) return '케이블';
  if (/밴드/.test(n)) return '밴드';
  if (/케틀벨/.test(n)) return '케틀벨';
  if (e.kind === 'machine') return '머신';
  if (/덤벨/.test(n)) return '덤벨';
  if (/바벨|EZ바|스미스|랜드마인|티바|트랩바|데드리프트|스쿼트|굿모닝|클린|스내치|저크|쓰러스터/.test(n)) return '바벨';
  return e.kind === 'crossfit' ? '맨몸' : '바벨';
}
const toolsTxt = items => { const c = {}; for (const e of items) { const t = toolOf(e); c[t] = (c[t] || 0) + 1; } return TOOL_ORDER.filter(t => c[t]).map(t => t === '머신' ? `머신 ${c[t]}` : t).join(' · '); };
const TYPE_SUB = {
  '어깨': [['앞 어깨', ['숄더 프레스', '핸드스탠드 푸시업']], ['옆 어깨 (측면)', ['레터럴 레이즈']], ['뒤 어깨 (후면)', ['리어 델트']]],
  '팔': [['이두 (팔 앞쪽)', ['바이셉 컬']], ['삼두 (팔 뒤쪽)', ['트라이셉 익스텐션', '트라이셉 딥']]],
  '다리': [['허벅지 앞', ['스쿼트', '레그 프레스', '런지', '레그 익스텐션']], ['허벅지 뒤 · 엉덩이', ['루마니안 데드리프트', '데드리프트', '레그 컬', '힙 쓰러스트', '힙 익스텐션']], ['엉덩이 옆 · 허벅지 안쪽', ['힙 어브덕션', '힙 어덕션']], ['종아리', ['카프 레이즈']]],
};
const KIND_RANK = e => e.custom ? 0 : e.kind === 'free' ? (e.bw ? 2 : 1) : e.kind === 'crossfit' ? 3 : 4;
function typesOf(m, pool) {
  const by = {};
  for (const e of pool) { if (e.kind === 'cardio' || e.m !== m) continue; const t = typeOfEq(e); (by[t] = by[t] || []).push(e); }
  const ord = TYPE_ORDER[m] || [], U = eqUse();
  const used = t => by[t].reduce((a, e) => a + ((U[e.id] || {}).n || 0), 0);
  return Object.keys(by).sort((a, b) => (used(b) > 0) - (used(a) > 0) || (ord.includes(a) ? ord.indexOf(a) : 99) - (ord.includes(b) ? ord.indexOf(b) : 99) || by[b].length - by[a].length)
    .map(t => ({ t, items: by[t].sort((x, y) => byUse(x, y) || KIND_RANK(x) - KIND_RANK(y)) }));
}
function pickerHtml() {
  return `<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input id="eq-q" type="search" placeholder="운동 검색 (예: 암풀다운, 사레레, 힙쓰)" value="${esc(state.eqQ)}" data-on="eq-q" autocomplete="off"></div>
  <div class="seg" style="margin-top:10px">${EQ_VIEWS.map(([v, l]) => `<button class="${state.eqView === v ? 'on' : ''}" data-act="eq-view" data-v="${v}">${l}</button>`).join('')}</div>
  <div class="chips scrollx ${['all', 'move'].includes(state.eqView) ? '' : 'hidden'}" style="margin-top:8px" id="eq-mchips">${['전체'].concat(STRENGTH_MUSCLES, ['전신']).map(m => `<button class="chip ${state.eqM === m ? 'on' : ''}" data-act="eq-m" data-m="${esc(m)}">${esc(mName(m))}</button>`).join('')}</div>
  <div class="gymbar">${DB.settings.gym && DB.settings.gym.length
    ? `<button class="chip ${state.gymOnly !== false ? 'on' : ''}" data-act="gym-only">내 헬스장 기구만</button><button class="linkbtn" data-act="gym-open">기구 고치기</button>`
    : `<button class="linkbtn" data-act="gym-open">+ 내 헬스장 기구 등록하면 있는 머신만 보여요</button>`}</div>
  <div class="eqlist" id="eqlist"></div>
  <button class="btn block" style="margin-top:8px" data-act="custom-eq">+ 목록에 없는 기구 직접 추가</button>`;
}
/* ---------- my gym: the machines this person's gym has ----------
   Free weights, cables and bodyweight are everywhere; only brand machines are filtered.
   Any machine already logged counts as "in my gym". */
const gymOn = () => !!(DB.settings.gym && DB.settings.gym.length) && state.gymOnly !== false;
const gymHas = e => !gymOn() || toolOf(e) !== '머신' || DB.settings.gym.includes(e.id) || !!eqUse()[e.id] || e.custom;
// the plan uses an exercise this gym doesn't have → the same movement on something it does have
function gymSwap(id) {
  const e = eqById(id); if (!e || gymHas(e)) return id;
  const t = typeOfEq(e), pool = allEq().filter(x => x.kind !== 'cardio' && typeOfEq(x) === t && x.m === e.m && gymHas(x));
  const best = pool.sort((a, b) => byUse(a, b) || (toolOf(a) === '머신' ? 0 : 1) - (toolOf(b) === '머신' ? 0 : 1))[0];
  return best ? best.id : id;
}
function gymHtml() {
  return `<div class="small muted" style="margin-bottom:8px">다니는 헬스장에 있는 머신을 눌러 체크하세요. 덤벨·바벨·케이블·맨몸은 어디나 있다고 보고, 이미 기록한 머신은 자동으로 포함돼요.</div>
    <div class="search"><input id="gym-q" type="search" placeholder="머신 검색 (예: 해머, 레그프레스)" value="${esc(state.gymQ || '')}" data-on="gym-q" autocomplete="off"></div>
    <div id="gym-list">${gymListHtml()}</div>
    <button class="btn primary block" style="margin-top:12px" data-act="sheet-close">완료</button>`;
}
function gymListHtml() {
  const G = DB.settings.gym || [], used = eqUse(), q = norm(state.gymQ || '');
  const machines = allEq().filter(e => toolOf(e) === '머신' && (!q || matchQ(searchText(e), q)));
  const brands = [...new Set(machines.map(e => e.brand))];
  return `<div class="small" style="margin:8px 0"><b class="num">${G.length}</b>개 체크 · 기록에서 자동 ${machines.filter(e => used[e.id] && !G.includes(e.id)).length}개</div>
    ${brands.map(b => { const list = machines.filter(e => e.brand === b), n = list.filter(e => G.includes(e.id) || used[e.id]).length;
      return `<details class="gymb" ${q || n ? 'open' : ''}><summary><b>${esc(b)}</b><span class="small muted">${n}/${list.length}</span></summary>
        <div class="gymchips">${list.map(e => { const on = G.includes(e.id), auto = !on && !!used[e.id]; return `<button class="chip ${on || auto ? 'on' : ''}" data-act="gym-toggle" data-eq="${esc(e.id)}" ${auto ? 'disabled' : ''}>${esc(e.name)}</button>`; }).join('')}</div></details>`; }).join('') || '<div class="empty">찾는 머신이 없어요</div>'}`;
}
function openGym() { state.gymQ = ''; openSheet('내 헬스장 기구', '어떤 머신이 있나요?', gymHtml(), { kind: 'gym' }); }
function openPicker() {
  if (!EQ_VIEWS.some(([v]) => v === state.eqView)) state.eqView = 'move';
  state.eqQ = ''; state.pkType = null;
  openSheet('운동 추가', '어떤 운동을 할까요?', pickerHtml(), { kind: 'picker' });
  renderEqList();
}

function eqRow(e, slim) {
  const last = lastSetOfEq(e.id);
  const fav = DB.fav.includes(e.id);
  const unit = e.kind === 'cardio' ? '' : `<span class="unitb">${unitFor(e.id)}</span>`;
  const use = eqUse()[e.id];
  const meta = last ? `최근 ${shortDate(last.date)} · ${fmtSetFull(last)}${use && use.n > 1 ? ` · 총 ${use.n}세트` : ''}` : e.custom ? `직접 추가 · ${typeOfEq(e)}` : slim ? '' : (e.kind === 'free' || e.kind === 'machine' ? `${typeOfEq(e)}` : '');
  return `<div class="eqrow" data-act="open-set" data-eq="${esc(e.id)}">
    <div class="main">${slim ? '' : `<div class="b">${esc(e.brand)} ${unit}</div>`}<div class="nm">${esc(e.name)}</div>${meta ? `<div class="meta">${esc(meta)}</div>` : ''}</div>
    <button class="star ${fav ? 'on' : ''}" data-act="fav" data-eq="${esc(e.id)}" aria-label="즐겨찾기"><svg viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg></button>
  </div>`;
}

/* how often / how recently each piece of equipment was used */
function eqUse() {
  return memo('eqUse', () => { const u = {}; for (const s of allSets()) { const x = u[s.eq] || (u[s.eq] = { n: 0, last: '' }); x.n++; if (s.date > x.last) x.last = s.date; } return u; });
}
function byUse(a, b) {
  if (!!a.custom !== !!b.custom) return a.custom ? -1 : 1;
  const U = eqUse(), x = U[a.id], y = U[b.id];
  if (!!x !== !!y) return x ? -1 : 1;
  if (x && y && x.last !== y.last) return x.last < y.last ? 1 : -1;
  return x && y ? y.n - x.n : 0;
}
function renderEqList() {
  const box = $('#eqlist'); if (!box) return;
  const q = norm(state.eqQ), v = state.eqView, M = state.eqM, U = eqUse();
  const all = allEq();
  const groups = [];
  const mFilter = e => M === '전체' || e.m === M;
  const inView = e => v === 'all' ? true : v === 'machine' ? (e.kind === 'machine' || !!e.custom) : v === 'free' ? (e.kind === 'free' || e.kind === 'crossfit') : v === 'cardio' ? e.kind === 'cardio' : true;
  if (!q && v === 'move') { box.innerHTML = moveListHtml(all.filter(gymHas), M); return; }
  if (q) {
    // names that contain the words first, then matches through the movement / slang
    const hits = all.filter(e => matchQ(searchText(e), q)), byName = e => matchQ(`${e.name} ${e.brand}`, q) ? 0 : 1;
    groups.push(['검색 결과', hits.sort((x, y) => byName(x) - byName(y) || byUse(x, y))]);
  } else if (v === 'fav') {
    groups.push(['즐겨찾기', DB.fav.map(eqById).filter(Boolean)]);
  } else {
    // 1) everything I've used or added myself, most recent first
    const mine = all.filter(e => (U[e.id] || e.custom) && inView(e) && mFilter(e)).sort(byUse);
    const mineIds = new Set(mine.map(e => e.id));
    if (mine.length) groups.push(['내가 쓴 기구', mine]);
    // 2) the rest of the catalogue
    const rest = all.filter(e => !mineIds.has(e.id) && inView(e) && mFilter(e));
    if (v === 'all' || v === 'machine') {
      const pool = rest.filter(e => e.kind !== 'cardio');
      for (const m of STRENGTH_MUSCLES.concat(['전신'])) { const g = pool.filter(e => e.m === m); if (g.length) groups.push([m, g, m]); }
    } else if (v === 'free') {
      for (const [sec, label] of FREE_SECTORS) { const g = rest.filter(e => e.kind === 'free' && e.sector === sec); if (g.length) groups.push([label, g]); }
      const cf = rest.filter(e => e.kind === 'crossfit'); if (cf.length) groups.push(['크로스핏', cf]);
    } else if (v === 'cardio') {
      if (rest.length) groups.push([mine.length ? '다른 유산소' : '유산소', rest]);
    }
  }
  let h = '';
  // collapse long groups unless the user narrowed the list
  const collapse = !q && M === '전체' && v !== 'fav' && v !== 'cardio';
  state.eqOpen = state.eqOpen || {};
  for (const [label, items, m] of groups) {
    h += `<div class="eqgroup-h">${m ? mtag(m) : esc(label)}${label === '내가 쓴 기구' ? '<em>최근 순</em>' : ''}<span>${items.length}</span></div>`;
    const limit = collapse && !state.eqOpen[v + label] ? (label === '내가 쓴 기구' ? 8 : 4) : Infinity;
    const shown = items.slice(0, limit);
    h += shown.length ? shown.map(eqRow).join('') + (items.length > shown.length ? `<button class="btn sm ghost block" style="margin-bottom:6px" data-act="eq-more" data-k="${esc(v + label)}">${esc(label)} ${items.length - shown.length}개 더 보기</button>` : '') : `<div class="empty">${v === 'fav' ? '별(★)을 눌러 자주 쓰는 기구를 모아두세요.' : '결과가 없어요. 아래 "직접 추가"로 만들 수 있어요.'}</div>`;
  }
  box.innerHTML = h || `<div class="empty">결과가 없어요.</div>`;
}

function moveListHtml(all, M) {
  state.eqOpen = state.eqOpen || {};
  const U = eqUse();
  // step 2: the equipment for one movement — free weights and bodyweight first, machines by brand after
  if (state.pkType) {
    const T = state.pkType, items = all.filter(e => e.kind !== 'cardio' && typeOfEq(e) === T).sort((x, y) => byUse(x, y) || KIND_RANK(x) - KIND_RANK(y));
    const mine = items.filter(e => U[e.id] || e.custom), free = items.filter(e => !mine.includes(e) && toolOf(e) !== '머신').sort((a, b) => TOOL_ORDER.indexOf(toolOf(a)) - TOOL_ORDER.indexOf(toolOf(b))), mach = items.filter(e => !mine.includes(e) && toolOf(e) === '머신');
    let h = `<button class="linkbtn" data-act="pk-type" data-t="">← ${esc(M === '전체' ? '운동 목록' : mName(M) + ' 운동')}</button><div class="pk-title">${esc(tLabel(T))}</div>`;
    if (mine.length) h += `<div class="eqgroup-h">내가 쓴 기구<span>${mine.length}</span></div>` + mine.map(eqRow).join('');
    if (free.length) h += `<div class="eqgroup-h">${esc(toolsTxt(free))}<span>${free.length}</span></div>` + free.map(e => eqRow(e, true)).join('');
    if (mach.length) {
      const brands = [...new Set(mach.map(e => e.brand))];
      const open = state.eqOpen['m' + T] || (!free.length && !mine.length);
      h += `<div class="eqgroup-h">머신 · 브랜드별<span>${mach.length}</span></div>`;
      h += open ? brands.map(b => `<div class="pk-brand">${esc(b)}</div>` + mach.filter(e => e.brand === b).map(e => eqRow(e, true)).join('')).join('')
        : `<button class="btn block" data-act="eq-more" data-k="${esc('m' + T)}">머신 ${mach.length}개 보기 · ${esc(brands.slice(0, 3).join(', '))}${brands.length > 3 ? ' 등' : ''}</button>`;
    }
    return h;
  }
  // step 1: movements by body part
  let h = '';
  const mine = all.filter(e => e.kind !== 'cardio' && (U[e.id] || e.custom) && (M === '전체' || e.m === M)).sort(byUse);
  if (mine.length) {
    const lim = state.eqOpen['mine'] ? Infinity : 5;
    h += `<div class="eqgroup-h">최근에 한 운동<span>${mine.length}</span></div>` + mine.slice(0, lim).map(eqRow).join('')
      + (mine.length > lim ? `<button class="btn sm ghost block" style="margin-bottom:6px" data-act="eq-more" data-k="mine">${mine.length - lim}개 더 보기</button>` : '');
  }
  if (M === '전체') {
    // every part on one screen: its five best-known movements, the rest one tap away
    for (const m of STRENGTH_MUSCLES.concat(['전신'])) {
      const ts = typesOf(m, all); if (!ts.length) continue;
      h += `<div class="mcard"><div class="mh">${mtag(m)}</div><div class="mchips">${ts.slice(0, 5).map(({ t, items }) => items.length === 1
        ? `<button class="chip" data-act="open-set" data-eq="${esc(items[0].id)}">${esc(tLabel(t))}</button>`
        : `<button class="chip" data-act="pk-type" data-t="${esc(t)}">${esc(tLabel(t))}</button>`).join('')}${ts.length > 5 ? `<button class="chip more" data-act="eq-m" data-m="${esc(m)}">+${ts.length - 5} 더 보기</button>` : ''}</div></div>`;
    }
    return h;
  }
  for (const m of [M]) {
    const ts = typesOf(m, all); if (!ts.length) continue;
    const lim = M !== '전체' || state.eqOpen['t' + m] ? Infinity : 5;
    h += `<div class="eqgroup-h">${mtag(m)}<span>${ts.length}가지</span></div>`;
    const row = ({ t, items }) => {
      const used = items.some(e => U[e.id]);
      const kinds = toolsTxt(items);
      return items.length === 1 ? `<div class="typerow" data-act="open-set" data-eq="${esc(items[0].id)}"><b>${esc(tLabel(t))}</b><span>${esc(items[0].name)}</span></div>`
        : `<div class="typerow" data-act="pk-type" data-t="${esc(t)}"><b>${esc(tLabel(t))}${used ? ' <i class="usedot" aria-label="해본 운동"></i>' : ''}</b><span>${esc(kinds)} ›</span></div>`;
    };
    const SUB = TYPE_SUB[m];
    if (SUB) {
      const done = new Set();
      for (const [sl, list] of SUB) { const g = ts.filter(x => list.includes(x.t)); if (!g.length) continue; g.forEach(x => done.add(x.t)); h += `<div class="pk-sub">${esc(sl)}</div>` + g.map(row).join(''); }
      const rest = ts.filter(x => !done.has(x.t));
      if (rest.length) h += state.eqOpen['r' + m] || rest.length <= 2 ? `<div class="pk-sub">그 밖의 운동</div>` + rest.map(row).join('')
        : `<button class="btn sm ghost block" style="margin-top:10px" data-act="eq-more" data-k="${esc('r' + m)}">그 밖의 운동 ${rest.length}가지 (크로스핏 등)</button>`;
      continue;
    }
    h += ts.slice(0, lim).map(row).join('');
    if (ts.length > lim) h += `<button class="btn sm ghost block" style="margin-bottom:6px" data-act="eq-more" data-k="${esc('t' + m)}">${esc(mName(m))} ${ts.length - lim}가지 더 보기</button>`;
  }
  return h || '<div class="empty">결과가 없어요.</div>';
}

/* ---------- set entry sheet ---------- */
function openSetSheet(eqId, editId) {
  const e = eqOrRecord(eqId);
  if (!e) return;
  const type = typeOfEq(e);
  const fromPicker = !!(state.sheet && (state.sheet.kind === 'picker' || state.sheet.fromPicker));
  if (e.kind === 'cardio' || isCardioType(type)) {
    state.sheet = { kind: 'cardio', eq: eqId, e, fromPicker };
    openSheet(e.brand, e.name, cardioSheetHtml(e), state.sheet);
    return;
  }
  const u = unitFor(eqId);
  state.sheet = { kind: 'set', eq: eqId, e, u, fromPicker, rows: [] };
  buildRows(e);
  openSheet(e.brand, e.name, setSheetHtml(e), state.sheet);
}
/* the set table: rows still to do, prefilled from last session (set by set), the plan target, or today's last set */
function targetFor(eqId) {
  const plan = dayRO(state.date).plan, tg = plan && plan.tg && plan.tg[eqId];
  const prev = prevSessionOfEq(eqId, state.date);
  const n = tg ? tgSets(tg) : prev ? prev.sets.length : 3;
  const m = tg && String(tg).match(/×\s*(\d+)/);
  return { n: Math.min(Math.max(n, 1), 10), reps: m ? +m[1] : null, prev };
}
function rowFrom(src, u) { return src ? { w: !(+src.w > 0) ? '' : src.u === u ? +src.w : r1(fromKg(setKg(src), u)), r: +src.r } : { w: '', r: '' }; }
function buildRows(e, n) {
  const S = state.sheet, T = targetFor(e.id), todays = dayRO(state.date).sets.filter(x => x.eq === e.id);
  const want = n != null ? n : T.n, done = todays.length;
  const rows = [];
  for (let i = done; i < Math.max(want, done); i++) {
    const p = T.prev && T.prev.sets[Math.min(i, T.prev.sets.length - 1)];
    const base = todays.length ? rowFrom(todays[todays.length - 1], S.u) : rowFrom(p, S.u);
    if (!base.r && T.reps) base.r = T.reps;
    rows.push(base);
  }
  S.rows = rows;
}
/* ---------- grip (remembered per machine) ---------- */
function gripOf(e) {
  const g = gripGroup(typeOfEq(e), e.name); if (!g) return null;
  const pref = (DB.gripPref || {})[e.id];
  return GRIPS[g].some(x => x[0] === pref) ? pref : GRIPS[g].find(x => !x[2])[0];
}
function gripHtml(e, type) {
  const g = gripGroup(type, e.name); if (!g) return '';
  const cur = gripOf(e), opt = GRIPS[g].find(x => x[0] === cur);
  return `<div class="grips"><div class="k">그립 <span class="muted">— 고르면 쓰는 부위가 바뀌어요</span></div>
    <div class="gripchips">${GRIPS[g].map(([id, l]) => `<button class="${id === cur ? 'on' : ''}" data-act="set-grip" data-g="${id}"><svg viewBox="0 0 36 20" aria-hidden="true">${GRIP_ICON[id]}</svg><span>${l}</span></button>`).join('')}</div>
    <div class="note" style="margin-top:4px">${esc(opt[3])}</div></div>`;
}
function setSheetHtml(e) {
  const S = state.sheet, type = typeOfEq(e);
  const prev = prevSessionOfEq(e.id, state.date);
  const pr = prOfEq(e.id), tpr = prOfType(type);
  const todays = dayRO(state.date).sets.filter(s => s.eq === e.id);
  const fav = DB.fav.includes(e.id);
  const sg = progressionHint(e, prev, S.u);
  const prevTxt = i => { if (!prev) return '–'; const p = prev.sets[i]; return !p ? '–' : +p.w > 0 ? `${trimNum(p.u === S.u ? p.w : r1(fromKg(setKg(p), S.u)))}×${p.r}` : `${p.r}${isTimed(e) ? '초' : '회'}`; };
  const wPh = e.bw || BW_NEXT[e.id] ? '맨몸' : '0';
  let top = '';
  if (sg) top += `<div class="infobox sugg ${sg.kind}"><div class="row between" style="gap:8px">
      <div><div class="k">오늘 추천</div><b class="num">${esc(sgTxt(sg, S.u, e))}</b><div class="small muted" style="margin-top:2px">${esc(sg.why)}</div></div>
      ${sg.next ? `<button class="btn sm primary" data-act="open-set" data-eq="${esc(sg.next)}">바꾸기</button>` : `<button class="btn sm primary" data-act="apply-sugg" data-w="${sg.w > 0 ? sg.w : ''}" data-r="${sg.r}">적용</button>`}</div></div>`;
  else if (!prev && !todays.length) top += e.bw || BW_NEXT[e.id] ? `<div class="infobox"><div class="k">첫 기록 · 맨몸</div>무게 칸은 비워두고 횟수만 넣으세요${isTimed(e) ? ' (횟수 칸 = 버틴 초)' : ''}. 가중 조끼·배낭을 메면 그 무게만 넣으면 돼요.</div>` : `<div class="infobox"><div class="k">첫 기록</div>편하게 10회 정도 드는 무게로 시작해보세요.</div>`;

  let more = '';
  if (sg && prev) more += `<div class="infobox"><div class="k">지난번 · ${esc(dateLabel(prev.date))}</div>${prev.sets.map(s => esc(fmtSetFull(s))).join(' · ')}</div>`;
  if (pr) more += `<div class="infobox"><div class="k">이 기구 최고 기록</div>${esc(fmtSetFull(pr))}${setE1(pr) ? ` · 추정 1RM ${r1(setE1(pr))}kg` : ''} <span class="small muted">(${shortDate(pr.date)})</span></div>`;
  if (tpr && tpr.eq !== e.id) {
    const te = eqById(tpr.eq) || { brand: tpr.brand, name: tpr.name };
    more += `<div class="infobox"><div class="k">같은 동작(${esc(type)}) 다른 기구 최고</div>${esc(te.brand)} ${esc(te.name)} — ${esc(fmtSetFull(tpr))}
      <div class="note">기구마다 무게 느낌이 달라 1:1 비교는 참고만 하세요.</div></div>`;
  }
  return `
    ${S.fromPicker ? '<button class="linkbtn" data-act="picker-open">← 다른 운동 고르기</button>' : ''}
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:10px">${mtag(e.m)}<span class="mtag" style="--mc:var(--ink3)">${esc(type)}</span>
      <a class="btn sm ghost" style="margin-left:auto" href="${ytLink(`${e.name} 자세`)}" target="_blank" rel="noopener">▶ 자세</a>
      <button class="btn sm ghost" data-act="fav" data-eq="${esc(e.id)}">${fav ? '★' : '☆'} 즐겨찾기</button></div>
    ${top}
    <div class="row between" style="margin-top:12px;gap:8px">
      <div class="setcount"><span class="small muted">세트</span>${[3, 4, 5, 6].map(n => `<button class="${todays.length + S.rows.length === n ? 'on' : ''}" data-act="set-count" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="unitseg" title="기구에 적힌 단위로 고르세요"><button class="${S.u === 'kg' ? 'on' : ''}" data-act="set-unit" data-u="kg">kg</button><button class="${S.u === 'lb' ? 'on' : ''}" data-act="set-unit" data-u="lb">lb</button></div>
    </div>
    <div class="settable">
      <div class="st-h"><span>세트</span><span>지난번</span><span>${S.u}</span><span>회</span><span>완료</span></div>
      ${todays.map((s, i) => `<div class="st-row done">
        <span class="n">${i + 1}${prFlags().has(s.id) ? '<b class="prb">PR</b>' : ''}</span><span class="pv">${esc(prevTxt(i))}</span>
        <input type="number" inputmode="decimal" step="any" placeholder="${wPh}" value="${+s.w > 0 ? esc(trimNum(s.w)) : ''}" data-on="done-w" data-id="${esc(s.id)}" aria-label="${i + 1}세트 무게">
        <input type="number" inputmode="numeric" value="${esc(s.r)}" data-on="done-r" data-id="${esc(s.id)}" aria-label="${i + 1}세트 횟수">
        <button class="ck on" data-act="row-undo" data-id="${esc(s.id)}" aria-label="${i + 1}세트 완료 취소">✓</button></div>`).join('')}
      ${S.rows.map((r, j) => { const i = todays.length + j; return `<div class="st-row ${j === 0 ? 'next' : ''}">
        <span class="n">${i + 1}</span><span class="pv">${esc(prevTxt(i))}</span>
        <input type="number" inputmode="decimal" step="any" placeholder="${wPh}" value="${r.w === '' ? '' : esc(trimNum(r.w))}" data-on="row-w" data-i="${j}" aria-label="${i + 1}세트 무게">
        <input type="number" inputmode="numeric" placeholder="0" value="${r.r === '' ? '' : esc(r.r)}" data-on="row-r" data-i="${j}" aria-label="${i + 1}세트 횟수">
        <button class="ck" data-act="row-check" data-i="${j}" aria-label="${i + 1}세트 완료">✓</button></div>`; }).join('')}
    </div>
    <div class="row" style="gap:6px;margin-top:8px"><button class="btn sm" data-act="row-add">+ 세트 추가</button>${S.rows.length ? `<button class="btn sm ghost" data-act="row-del">− 마지막 줄 빼기</button>` : ''}</div>
    <div class="preview" id="ss-prev">${nextPreview()}</div>
    ${!S.rows.length && todays.length ? `<button class="btn primary block big" style="margin-top:10px" data-act="sheet-close">✓ ${todays.length}세트 완료 · 닫기</button>` : ''}
    <div class="ss-below">${gripHtml(e, type)}
    ${musclePeekHtml(e.name, type, e.m, false, gripOf(e))}</div>
    <details class="more" ${S.moreOpen ? 'open' : ''}>
      <summary>더 보기 · 최고 기록, 단위</summary>
      <div style="margin-top:10px">${more || '<div class="small muted">아직 비교할 기록이 없어요.</div>'}</div>
      <div class="note">단위는 기구에 적힌 대로(kg/lb) 고르면 돼요. 이 기구는 마지막 단위를 기억하고, 분석은 kg로 자동 환산해요.</div>
      ${e.custom ? `<button class="btn sm" style="margin-top:10px" data-act="custom-eq" data-id="${esc(e.id)}">기구 정보 수정</button>` : ''}
    </details>`;
}
function nextPreview() {
  const S = state.sheet; if (!S || S.kind !== 'set' || !S.rows.length) return '';
  const w = parseFloat(S.rows[0].w), r = parseInt(S.rows[0].r, 10);
  const plates = BARBELL.has(S.eq) && w > 0 ? plateText(w, S.u) : '';
  const kg = toKg(w || 0, S.u);
  return (r > 0 && kg > 0 ? `다음 세트 ${trimNum(w)}${S.u} × ${r}${S.u === 'lb' ? ` = ${r1(kg)}kg` : ''} · 추정 1RM ${r1(e1rm(kg, r))}kg` : '') + plates;
}
/* barbell plate math (per side) */
const BARBELL = new Set(['fw-bench', 'fw-incline-bb', 'fw-squat', 'fw-front', 'fw-deadlift', 'fw-sumo', 'fw-rdl', 'fw-hipthrust', 'fw-goodmorning', 'fw-ohp', 'fw-bbrow',
  'cf-powerclean', 'cf-squatclean', 'cf-hangclean', 'cf-powersnatch', 'cf-squatsnatch', 'cf-cnj', 'cf-thruster', 'cf-ohs', 'cf-frontsq', 'cf-pushpress', 'cf-pushjerk', 'cf-deadlift']);
function plateText(w, u) {
  const bar = u === 'lb' ? 45 : 20, sizes = u === 'lb' ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
  if (w < bar) return `<div class="plates">빈 바(${bar}${u})보다 가벼워요</div>`;
  let side = (w - bar) / 2; const used = [];
  for (const p of sizes) while (side >= p - 1e-9) { used.push(p); side = Math.round((side - p) * 100) / 100; }
  const rest = side > 0.001 ? ` · ${trimNum(side * 2)}${u} 남음` : '';
  return `<div class="plates">한쪽 원판: <b>${used.length ? used.map(trimNum).join(' + ') : '없음'}</b> (바 ${bar}${u})${rest}</div>`;
}
/* double progression: same weight until every working set hits the same reps, then add a step */
/* bodyweight progression: when every set reaches the top reps, move to the harder variant (or add load) */
const BW_NEXT = {
  'bw-inclinepush': ['fw-pushup', 15], 'bw-kneepush': ['fw-pushup', 15], 'fw-pushup': ['bw-declinepush', 20], 'bw-declinepush': [null, 20], 'bw-diamond': [null, 20],
  'bw-squat': ['bw-bss', 20], 'bw-jumpsquat': ['bw-bss', 15], 'bw-revlunge': ['bw-bss', 15], 'bw-bss': ['bw-pistol', 15], 'bw-pistol': [null, 10],
  'fw-glutebridge': ['fw-slbridge', 20], 'fw-slbridge': ['fw-slhipthrust', 15], 'fw-slhipthrust': [null, 20],
  'fw-invrow': ['bw-negpull', 15], 'bw-negpull': ['fw-pullup', 5], 'fw-pullup': [null, 12], 'fw-chinup': [null, 12],
  'bw-benchdip': ['fw-dips', 15], 'fw-dips': [null, 15], 'bw-pike': ['bw-wallhspu', 12], 'bw-wallhspu': [null, 10],
  'bw-sliderc': ['bw-nordic', 12], 'bw-nordic': [null, 8], 'bw-calf': [null, 25], 'bw-legraise': ['fw-hangleg', 15], 'fw-hangleg': [null, 15],
};
// "…으로/로": ㄹ받침과 받침 없음은 '로'
const ro = w => { const c = w.charCodeAt(w.length - 1), f = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0; return `"${w}"${f && f !== 8 ? '으로' : '로'}`; };
const isTimed = e => /회 = 초/.test(e.name || '');
function bwHint(e, ss) {
  const reps = ss.map(x => +x.r), minR = Math.min(...reps), maxR = Math.max(...reps);
  if (isTimed(e)) return { kind: minR >= 60 ? 'up' : 'reps', w: 0, r: minR + 10, why: `모든 세트 ${minR}초 이상 버텼어요. 10초씩 늘려가세요${minR >= 60 ? ' — 60초가 넘으면 더 어려운 자세(다리 들기, 팔 뻗기)로 바꾸는 게 나아요' : ''}.` };
  const [nx, top] = BW_NEXT[e.id] || [null, 15];
  if (minR >= top) {
    const ne = nx && eqById(nx);
    if (ne) return { kind: 'up', w: 0, r: Math.max(3, Math.round(top / 3)), next: nx, why: `모든 세트 ${minR}회 이상 — ${ro(ne.name)} 한 단계 올릴 때예요. 처음엔 몇 회 안 돼도 정상이고, 남은 세트는 지금 동작으로 채워도 돼요.` };
    return { kind: 'up', w: 0, r: maxR, why: `모든 세트 ${minR}회 이상이에요. 배낭·가중 조끼로 무게를 더하거나(무게 칸에 입력), 내려가는 속도를 3초로 늦춰서 강도를 올리세요.` };
  }
  if (maxR - minR >= 4) return { kind: 'hold', w: 0, r: maxR, why: `세트별 ${reps.join('·')}회로 떨어졌어요. 세트 사이를 조금 더 쉬고 모든 세트 ${Math.min(maxR, top)}회를 먼저 맞추세요.` };
  return { kind: 'reps', w: 0, r: Math.min(maxR + 1, top), why: `세트당 1–2회씩 늘려가세요 (지난번 ${reps.join('·')}회). ${top}회를 모든 세트에서 채우면 ${nx && eqById(nx) ? ro(eqById(nx).name) : '무게를 더해서'} 넘어가요.` };
}
const sgTxt = (sg, u, e) => sg.next ? `${eqById(sg.next).name} × ${sg.r}회` : sg.w > 0 ? `${trimNum(sg.w)}${u} × ${sg.r}회` : `맨몸 × ${sg.r}${e && isTimed(e) ? '초' : '회'}`;
function progressionHint(e, prev, u) {
  if (!prev) return null;
  { const bw = prev.sets.filter(x => !isCardioSet(x) && !(setKg(x) > 0) && +x.r > 0); if (bw.length >= 2 && bw.length === prev.sets.filter(x => !isCardioSet(x)).length) return bwHint(e, bw); }
  const ss = prev.sets.filter(x => !isCardioSet(x) && setKg(x) > 0);
  if (ss.length < 2) return null;
  const topKg = Math.max(...ss.map(setKg));
  const work = ss.filter(x => Math.abs(setKg(x) - topKg) < 0.01);
  if (work.length < 2) return null;
  const reps = work.map(x => +x.r), minR = Math.min(...reps), maxR = Math.max(...reps);
  const rirs = work.filter(x => x.rir != null).map(x => +x.rir);
  const rir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const wNow = r1(fromKg(topKg, u)) === Math.round(fromKg(topKg, u)) ? Math.round(fromKg(topKg, u)) : r1(fromKg(topKg, u));
  const step = u === 'lb' ? 5 : (/덤벨/.test(e.name) ? 2 : 2.5);
  if ((minR === maxR && minR >= 5 && (rir == null || rir >= 1)) || (rir != null && rir >= 2.5)) {
    return { kind: 'up', w: r1(wNow + step), r: Math.max(minR - 2, 5), why: rir != null && rir >= 2.5 ? `지난번 평균 RIR ${r1(rir)} — 여유가 있었어요. 한 단계 올려보세요.` : `지난번 ${work.length}세트 모두 ${minR}회 성공 — 한 단계 올리고 횟수를 다시 쌓아가세요.` };
  }
  if (maxR - minR >= 3 || (rir != null && rir < 0.5 && maxR > minR)) {
    return { kind: 'hold', w: wNow, r: maxR, why: `지난번 세트별 ${reps.join('·')}회로 떨어졌어요. 같은 무게로 모든 세트 ${maxR}회를 먼저 맞추세요.` };
  }
  return { kind: 'reps', w: wNow, r: Math.min(maxR + 1, minR + 2), why: `같은 무게로 세트당 1회씩 더해보세요 (지난번 ${reps.join('·')}회).` };
}
function cardioSheetHtml(e) {
  const todays = dayRO(state.date).sets.filter(s => s.eq === e.id);
  return `${state.sheet && state.sheet.fromPicker ? '<button class="linkbtn" data-act="picker-open">← 다른 운동 고르기</button>' : ''}${mtag('유산소')}
    <div class="grid2 field">
      <div><label class="flabel">시간 (분)</label><input id="cd-min" type="number" inputmode="decimal" min="1" placeholder="30"></div>
      <div><label class="flabel">거리 (km) · 선택</label><input id="cd-km" type="number" inputmode="decimal" step="0.1" placeholder="5"></div>
    </div>
    <div class="field"><label class="flabel">기계 표시 칼로리 · 선택</label><input id="cd-kcal" type="number" inputmode="numeric" placeholder="300"></div>
    <button class="btn primary block" style="margin-top:14px;padding:14px" data-act="cardio-add">기록 추가</button>
    ${todays.length ? `<div class="sec-h"><h2 style="font-size: 15px">이 날 기록</h2></div>${todays.map((s, i) => `<div class="setrow"><span class="n">${i + 1}</span><span class="w">${esc(fmtSetFull(s))}</span><span class="e"></span><button class="x" data-act="set-del" data-id="${esc(s.id)}">×</button></div>`).join('')}` : ''}`;
}
function refreshSetSheet() {
  const S = state.sheet; if (!S) return;
  const e = S.e || eqOrRecord(S.eq); if (!e) return;
  setSheetBody(S.kind === 'cardio' ? cardioSheetHtml(e) : setSheetHtml(e), true);
}

/* ---------- first-run tutorial ---------- */
const navIcon = t => { const b = document.querySelector(`nav button[data-tab="${t}"] svg`); return b ? b.outerHTML : ''; };
/* detailed help, shown in settings (the tutorial is the short version) */
const GUIDE = [
  ['운동 기록', ['운동 탭 + 운동 추가 → 부위·이름으로 기구 찾기. 자주·최근에 쓴 기구와 직접 추가한 기구가 맨 위에 와요.', '세트 표: 세트 수(3–6)를 고르고, 한 세트 끝날 때마다 ✓. 무게·횟수는 앞 세트 값이 자동으로 채워지고, 다르게 했으면 숫자만 고쳐서 ✓.', '✓를 누르면 휴식 타이머가 돌아요(화면 오른쪽 위 시계). 마지막 세트를 체크하면 다음 운동 고르기 화면으로 넘어가요.', '지난번 기록과 "오늘 추천"(무게를 올릴 때인지)이 같이 보여요. kg/lb는 기구에 적힌 대로 고르면 분석은 kg로 환산돼요.', '등 운동·벤치·컬은 세트 표 위에서 그립(와이드·클로즈·V바·언더핸드 등)을 고를 수 있어요. 기구마다 마지막 그립을 기억하고, 그립에 따라 해부도·부위별 세트에 쓰는 부위가 다르게 들어가요.', '목록에 없는 기구는 "직접 추가" — 이름·브랜드를 보고 어느 부위를 쓰는지 앱이 판단해서 그림으로 보여주고 분석에 넣어요.', '운동이 끝나면 위쪽 "운동 마무리하기" — 오늘 쓴 부위를 해부도로 보여주고, 지난번 대비 기록·이번 주 볼륨·목표에 맞춘 피드백을 줘요. 더 하려면 "이어서 하기"로 취소하면 돼요.', '뒤로가기는 지금 열린 화면만 닫아요. 앱을 끄려면 첫 화면에서 두 번 누르세요.']],
  ['루틴', ['루틴: 맨 위 "추천"은 성별·목표에 맞춘 프로그램이에요. 아래에서 다른 프로그램도 전부 볼 수 있어요.', '프로그램을 시작하면 오늘 할 종목·세트가 계획으로 깔리고, 다음 날은 순서대로 다음 날짜 루틴이 나와요.', '"부위로 고르기"는 여러 프로그램에서 그 부위를 주로 하는 날만 모아서 보여줘요(예: 엉덩이).', '각 프로그램에 목표, 지킬 점, 참고 영상(유튜브 검색) 링크가 있어요. 오늘 한 운동은 이름을 붙여 내 루틴으로 저장할 수 있어요.']],
  ['기록을 넣으면 생기는 것 (분석 탭)', ['운동한 부위: 해부도에 이번 주(또는 4주) 많이 한 부위일수록 빨갛게. 주로 쓴 근육은 1세트, 같이 쓴 근육은 0.25–0.5세트로 계산해요.', '부위별 주간 세트: 최근 2주 평균. 연구가 효과적이라고 보는 근육당 주 10–20세트와 비교해요. 막대를 누르면 윗가슴·광배·햄스트링 같은 세부 부위가 나와요(세부는 참고용).', '목표에 맞춘 운동: 고른 목표(살 빼기·증량 등)에 따라 볼륨·무게 유지·유산소에 대한 조언이 달라져요.', '종목 구성 참고: 4주 기록에서 빠진 각도(인클라인, 레그 컬 등)를 짚어줘요. 강요가 아니라 참고예요.', '디로딩 판단: 8주 볼륨·컨디션 흐름을 보고 쉬어갈 때인지 알려줘요. 점진적 과부하: 기구별 추정 1RM이 오르는지 봐요.', '칼로리 소모: 운동 시간과 종류로 계산해요. 인바디가 있으면 제지방 기준, 없으면 키·나이·체중, 그것도 없으면 평균값을 써요.']],
  ['인바디', ['바디 탭에서 결과지 사진을 올리면 숫자를 읽어서 칸에 채워줘요. 잘못 읽힌 칸은 고치면 돼요(사진은 기기 안에서만 처리).', '체중·골격근량·체지방만 넣어도 되고, 내장지방·부위별 근육·위상각 등 추가 항목을 넣으면 그만큼 분석이 늘어요.', '체지방률·제지방지수·내장지방·복부지방률·근감소 지표 등을 논문 기준과 비교해서 풀어서 알려줘요. 성별·나이·키가 있어야 정확해요.', '목표를 고르면 하루 칼로리와 탄·단·지 목표가 계산돼요(살 빼기는 단백질을 더 높게). 2–3주 체중 추세를 보고 맞는 속도인지도 알려줘요.']],
  ['기록 탭 · 기타', ['기록 탭: 날짜별로 한 운동을 달력으로 보고, 지난 날짜를 눌러 수정할 수 있어요. 위쪽 ‹ › 로 날짜를 옮겨 지난 운동을 나중에 입력해도 돼요.', 'PR 보드(분석 탭 아래쪽): 같은 동작이면 브랜드가 달라도 같이 비교해요.', '기록은 이 기기(브라우저)에 저장돼요. 브라우저 데이터를 지우면 사라지니 주의하세요.']],
];
function guideHtml() {
  return GUIDE.map(([t, list]) => `<details class="guide"><summary>${t}</summary><ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('');
}
/* tutorial steps: `at` = the real element to light up (everything else gets dimmed) */
function tutSteps() {
  const pf = DB.settings.profile || {}, gk = DB.settings.mode;
  return [
    { t: '오운완에 오신 걸 환영해요', b: `<p>헬스장에서 한 운동을 기록하면, 어느 부위를 얼마나 했는지, 무게가 오르고 있는지, 쉬어야 할 때인지까지 알아서 분석해주는 앱이에요.</p>
      <p>화면 아래 탭 4개가 전부예요. 지금부터 실제 화면에서 하나씩 짚어드릴게요. <b>밝게 보이는 곳</b>이 설명하는 위치예요.</p><p class="small muted">2분 정도 걸려요. 건너뛰어도 설정에서 다시 볼 수 있어요.</p>` },
    { at: 'main button[data-act="picker-open"]', tap: 1, t: '운동 추가', b: `<p><b>밝게 빛나는 "+ 운동 추가"를 직접 눌러보세요.</b></p><ul class="tut-ol"><li>실제로는 기구 목록이 열려요. 위에서 <b>부위</b>(가슴·등·하체…)를 고르거나 이름으로 검색하세요. 헬스장 기구의 브랜드(Hammer Strength, 뉴텍 등)로 찾아도 돼요.</li><li>한 번 쓴 기구는 다음부터 맨 위 "내가 쓴 기구"에 올라와요.</li><li>목록에 없으면 맨 아래 <b>직접 추가</b> — 이름만 넣으면 어느 부위를 쓰는지 앱이 판단해요.</li></ul>` },
    { t: '세트 기록 연습', practice: 1, b: `<p>기구를 고르면 이 표가 나와요. <b>세트를 했다고 치고 ✓를 차례로 눌러보세요.</b></p>
      <div class="tut-table">${[0, 1, 2].map(j => { const d = j < (state.tutCk || 0), nx = j === (state.tutCk || 0); return `<div class="r ${d ? 'done' : nx ? 'next' : ''}"><span>${j + 1}</span><span>40kg</span><span>${j === 2 ? 8 : 10}회</span><button class="ck ${d ? 'on' : ''}" ${nx ? 'data-act="tut-ck"' : 'disabled'} aria-label="${j + 1}세트 완료">✓</button></div>`; }).join('')}</div>
      ${(state.tutCk || 0) >= 3 ? `<div class="tut-ok">✓ 잘했어요! 실제로는 이 순간 다음 운동 고르기 화면이 열려요.</div>` : (state.tutCk || 0) ? `<div class="tut-ok soft">✓를 누르면 휴식 타이머가 돌아요(화면 위 시계). 다음 세트도 눌러보세요.</div>` : ''}
      <ul class="tut-ol"><li>무게·횟수는 앞 세트나 지난번 기록에서 미리 채워져요. 실제로 한 횟수가 다르면 숫자만 고치고 ✓.</li><li>운동 중에 바로 눌러도 되고, 끝나고 몰아서 기록해도 돼요.</li><li>무게를 올릴 때가 되면 "오늘 추천"으로 알려줘요.</li><li>다 끝나면 운동 탭 위쪽 <b>"✓ 오늘 운동 마무리하기"</b> — 오늘 쓴 부위 그림과 피드백이 나와요. 더 하고 싶으면 "이어서 하기".</li></ul>` },
    { at: 'main button[data-act="routines-open"]', tap: 1, t: '루틴', b: `<p><b>"루틴"을 눌러보세요.</b></p><ul class="tut-ol"><li>뭘 할지 모르겠으면 여기. 맨 위 <b>추천</b>은 성별·목표에 맞춘 프로그램이에요.</li><li>프로그램을 시작하면 오늘 할 종목·세트가 한 번에 깔리고, 다음엔 순서대로 다음 날 루틴이 나와요.</li><li><b>집에서</b> 탭엔 기구 없이 하는 맨몸 루틴이 있어요.</li></ul>` },
    { at: 'header .datenav', t: '날짜 옮기기', b: `<ul class="tut-ol"><li>‹ › 로 날짜를 옮기면 그날 기록을 보거나, 깜빡한 운동을 나중에 넣을 수 있어요.</li><li>날짜를 누르면 오늘로 돌아와요.</li></ul>` },
    { at: 'nav button[data-tab="records"]', tap: 'records', t: '기록 탭', b: `<p><b>아래 "기록" 탭을 눌러보세요.</b></p>` },
    { at: 'main section.card', t: '기록 탭', b: `<ul class="tut-ol"><li>운동한 날이 달력에 표시돼요. 날짜를 누르면 그날 한 운동을 보고 고칠 수 있어요.</li><li>운동 안 한 날도 한눈에 보여서 꾸준함을 확인하기 좋아요. 지난 날짜를 눌러 그날 운동을 나중에 넣어도 돼요.</li></ul>` },
    { at: 'nav button[data-tab="analysis"]', tap: 'analysis', t: '분석 탭', b: `<p><b>"분석" 탭을 눌러보세요.</b> 기록하면 생기는 것들이 여기 모여요.</p>` },
    { at: 'main .bodymaps', t: '분석 탭 — 기록하면 생기는 것', b: `${document.querySelector('main .bodymaps') ? '' : musclePeekHtml('바벨 힙 쓰러스트', '힙 쓰러스트', '다리', true)}<ul class="tut-ol"><li><b>해부도</b>: 이번 주 많이 한 부위일수록 빨갛게. 기구마다 주로 쓰는 부위(1세트)·같이 쓰는 부위(0.25–0.5세트)를 따로 계산해요.</li><li><b>부위별 주간 세트</b>: 근육당 주 10–20세트(연구 기준)와 비교. 누르면 윗가슴·광배·햄스트링 같은 세부 부위가 나와요.</li><li><b>목표에 맞춘 조언</b>, 빠진 종목, 쉬어야 할 때(디로딩), 무게가 오르는지, 운동으로 쓴 칼로리, 종목별 최고 기록(PR).</li><li>기록이 2–3주 쌓일수록 정확해져요.</li></ul>` },
    { at: 'nav button[data-tab="body"]', tap: 'body', t: '바디 탭', b: `<p><b>"바디" 탭을 눌러보세요.</b> 인바디와 체중을 관리하는 곳이에요.</p>` },
    { at: 'main .photo-pick', t: '바디 탭 — 인바디', b: `<ul class="tut-ol"><li><b>결과지 사진</b>을 올리면 숫자를 읽어서 칸에 채워줘요. 잘못 읽힌 칸만 고치면 돼요. 사진은 휴대폰 안에서만 처리돼요.</li><li>체지방률·내장지방·근육량·좌우 균형 등을 논문 기준과 비교해서 쉬운 말로 풀어줘요.</li><li>위의 <b>목표</b>(살 빼기, 증량 등)를 고르면 하루 칼로리와 탄수화물·단백질·지방 양을 계산하고, 체중이 맞는 속도로 변하는지 봐줘요.</li><li>인바디가 없으면 체중만 가끔 넣어도 돼요.</li></ul>` },
    { at: 'header [data-act="settings"]', t: '설정', b: `<ul class="tut-ol"><li>kg/lb 기본 단위, 휴식 타이머, 다크 모드를 바꿔요.</li><li><b>기능 설명</b>에 이 안내보다 자세한 설명이 있고, 사용법을 다시 볼 수 있어요.</li><li>분석에 쓴 논문 목록도 여기 있어요.</li></ul>` },
    { t: '마지막으로, 나에 맞추기', b: `<p class="small muted" style="margin-top:0">인바디 분석(성별·나이 기준이 달라요), 칼로리 계산, 루틴 추천(경력·횟수·목표에 맞춰서)에 쓰여요. 바디 탭에서 언제든 바꿀 수 있어요.</p>
      <div class="field"><label>성별</label><div class="seg">${[['f', '여성'], ['m', '남성']].map(([v, l]) => `<button class="${pf.sex === v ? 'on' : ''}" data-act="tut-sex" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="grid2"><div class="field"><label>출생연도</label><input id="tut-birth" type="number" inputmode="numeric" placeholder="예: 1995" value="${pf.birth || ''}" data-on="tut-pf" data-k="birth"></div>
        <div class="field"><label>키 (cm)</label><input id="tut-height" type="number" inputmode="decimal" placeholder="예: 165" value="${pf.height || ''}" data-on="tut-pf" data-k="height"></div></div>
      <div class="field"><label>운동 경력 — 스스로 판단해서 골라주세요</label><div class="seg">${EXP_OPTS.map(([, l], i) => `<button class="${pf.exp === i ? 'on' : ''}" data-act="tut-exp" data-v="${i}">${l}</button>`).join('')}</div>
        <div class="note">${pf.exp == null ? '꾸준히 운동한 기간 기준이에요. 쉬었다가 다시 시작하면 한 단계 낮게 고르세요.' : ['초급 루틴부터 추천해요. 동작을 익히면서 매번 조금씩 무게를 올리는 시기예요.', '초급 루틴부터 추천해요. 매번 조금씩 무게가 오른다면 아직 초급 루틴이 가장 효율적이에요.', '중급 루틴 위주로 추천해요. 주 단위로 증량·볼륨을 관리하는 시기예요.', '상급 루틴까지 추천해요. 고볼륨·강도 기법은 회복 관리가 같이 돼야 효과가 있어요.'][pf.exp]}</div></div>
      <div class="field"><label>일주일에 운동할 수 있는 횟수 (평균 또는 계획)</label><div class="seg">${Object.entries(FREQ_L).map(([v, l]) => `<button class="${pf.freq == v ? 'on' : ''}" data-act="tut-freq" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="field"><label>목표</label><div class="chips goalchips">${GOAL_ORDER.map(v => `<button class="chip ${gk === v ? 'on' : ''}" data-act="tut-goal" data-v="${v}">${GOALS[v].l}</button>`).join('')}</div>
        ${GOALS[gk] ? `<div class="note">${esc(GOALS[gk].d)}</div>` : ''}</div>` },
  ];
}
function tutorialHtml(i) {
  const steps = tutSteps(), st = steps[i], last = i === steps.length - 1;
  return `<div class="tut"><div class="tut-prog"><div class="bar"><i style="width:${(i + 1) / steps.length * 100}%"></i></div><span class="tut-n">${i + 1}/${steps.length}</span></div>
    <h3>${st.t}</h3>${st.b}
    <div class="grid2" style="margin-top:14px">${i ? `<button class="btn" data-act="tut-go" data-i="${i - 1}">이전</button>` : `<button class="btn ghost" data-act="tut-end">건너뛰기</button>`}
      ${last ? `<button class="btn primary" data-act="tut-end" data-then="routines">루틴 고르러 가기</button>` : st.tap ? `<button class="btn ghost" data-act="tut-go" data-i="${i + 1}">눌렀다 치고 넘어가기</button>` : st.practice && (state.tutCk || 0) < 3 ? `<button class="btn" data-act="tut-go" data-i="${i + 1}">건너뛰고 다음</button>` : `<button class="btn primary" data-act="tut-go" data-i="${i + 1}">다음</button>`}</div>
    ${last ? `<button class="btn block ghost" style="margin-top:8px" data-act="tut-end">바로 기록 시작</button>` : ''}</div>`;
}
/* light up the real element; the card moves to the other half of the screen */
function tutSpot() {
  let sp = $('#tut-spot');
  if (!sp) { sp = document.createElement('div'); sp.id = 'tut-spot'; document.body.appendChild(sp); }
  const st = tutSteps()[state.tutI], el = st && st.at ? document.querySelector(st.at) : null, sh = $('#sheet');
  sp.dataset.act = '';
  if (!el) { sp.removeAttribute('style'); sp.className = 'none'; sh.classList.remove('top'); sh.style.maxHeight = '82vh'; return; }
  // things inside the page: scroll them near the top so the card fits underneath
  if (el.closest('main')) window.scrollBy(0, el.getBoundingClientRect().top - 72);
  const r = el.getBoundingClientRect(), pad = 6, H = innerHeight;
  const h = Math.min(r.height, H * 0.42); // a tall card only gets its top part lit
  Object.assign(sp.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${h + pad * 2}px` });
  sp.className = st.tap ? 'on tap' : 'on';
  sp.dataset.act = st.tap ? 'tut-tap' : '';
  const below = H - (r.top + h + pad) - 20, above = r.top - pad - 20;
  const top = above > below;
  sh.classList.toggle('top', top);
  sh.style.maxHeight = `${Math.max(240, top ? above : below)}px`;
}
function tutShow(i) { state.tutI = i; setSheetBody(tutorialHtml(i)); tutSpot(); }
function openTutorial(i = 0) {
  state.tutI = i; state.tutCk = 0; DB.settings.tutV = 2; save();
  if (state.tab !== 'workout' || state.date !== today()) { state.tab = 'workout'; state.date = today(); render(); }
  openSheet('사용법', '오운완 둘러보기', tutorialHtml(i), { kind: 'tutorial' });
  setTimeout(tutSpot, 30);
}

/* ---------- custom equipment sheet ---------- */
function openCustomEq(id) {
  const ex = id ? DB.customEq.find(e => e.id === id) : null;
  const m = ex ? ex.m : '다리';
  const name = ex ? ex.name : '';
  const auto = inferType(name, m);
  const defU = ex ? unitFor(ex.id) : DB.settings.unit;
  state.sheet = { kind: 'ceq', id: ex ? ex.id : null, typeTouched: !!ex };
  const typeOpts = TYPE_NAMES.map(t => `<option value="${esc(t)}" ${(ex ? ex.type : auto) === t ? 'selected' : ''}>${esc(t)}</option>`).join('');
  openSheet(ex ? '내 기구 수정' : '내 기구 추가', ex ? ex.name : '새 기구', `
    <div class="field"><label>기구 / 운동 이름</label><input id="ce-name" placeholder="예: 익스텐션, 스미스 인클라인" value="${esc(name)}" data-on="ce-infer"></div>
    <div class="field"><label>브랜드 · 선택</label><input id="ce-brand" data-on="ce-infer" placeholder="예: 뉴텍, Panatta" value="${esc(ex ? ex.brand : '')}"></div>
    <div class="grid2">
      <div class="field"><label>주 부위</label><select id="ce-m" data-on="ce-infer">${MUSCLES.map(x => `<option ${x === m ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>기본 단위</label><select id="ce-u"><option value="kg" ${defU === 'kg' ? 'selected' : ''}>kg</option><option value="lb" ${defU === 'lb' ? 'selected' : ''}>lb</option></select></div>
    </div>
    <div class="field"><label>운동 패턴 (비교·분석 기준)</label><select id="ce-type" data-on="ce-type">${typeOpts}<option value="__self" ${ex && !TYPE_INFO[ex.type] ? 'selected' : ''}>독립 운동 (다른 기구와 비교 안 함)</option></select>
      <div class="note" id="ce-hint">${auto ? `이름과 부위로 <b>${esc(auto)}</b>(으)로 자동 분류했어요. ` : ''}같은 패턴의 기구끼리 PR·진행 상황을 함께 비교해요. 예) "뉴텍 익스텐션"(다리) ↔ Hammer Strength 레그 익스텐션.</div></div>
    <div class="field"><label>쓰는 부위 (이름·브랜드·패턴으로 자동 판단)</label><div id="ce-musc">${musclePeekHtml(name, ex ? ex.type : auto, m) || '<div class="small muted">이름을 넣으면 어느 부위를 쓰는지 그림으로 보여드려요.</div>'}</div></div>
    <button class="btn primary block" style="margin-top:14px;padding:13px" data-act="ce-save">${ex ? '저장' : '추가하기'}</button>
    ${ex ? `<button class="btn block danger ghost" style="margin-top:8px" data-act="ce-del" data-id="${esc(ex.id)}">이 기구 삭제 (기록은 유지)</button>` : ''}`, state.sheet);
}

/* =====================================================================
   8. VIEW — 식단
   ===================================================================== */
const SLOTS = ['아침', '점심', '저녁', '간식'];
function defaultSlot() { const h = new Date().getHours(); return h < 10 ? '아침' : h < 15 ? '점심' : h < 21 ? '저녁' : '간식'; }

function viewDiet() {
  const d = dayRO(state.date), G = DB.settings.goals, t = mealTotals(d.meals);
  const bw = latestBodyweight();
  const bar = (v, g) => { const p = g > 0 ? v / g : 0; return `<div class="meter ${p > 1.05 ? 'over' : ''}"><i style="width:${Math.min(100, p * 100)}%"></i></div>`; };
  let h = `<section class="card">
    <div class="row between"><div class="kcalhero"><span class="big">${fmtInt(t.k)}</span><span class="of">/ ${fmtInt(G.kcal)} kcal</span></div>
      <span class="small muted">${G.kcal - t.k >= 0 ? `${fmtInt(G.kcal - t.k)} 남음` : `${fmtInt(t.k - G.kcal)} 초과`}</span></div>
    ${bar(t.k, G.kcal)}
    <div class="macro"><div class="row"><span class="l">단백질</span><span class="v num">${r1(t.p)} / ${G.p}g${bw ? ` <span class="muted">(${r1(t.p / bw)}g/kg)</span>` : ''}</span></div>${bar(t.p, G.p)}</div>
    <div class="macro"><div class="row"><span class="l">탄수화물</span><span class="v num">${r1(t.c)} / ${G.c}g</span></div>${bar(t.c, G.c)}</div>
    <div class="macro"><div class="row"><span class="l">지방</span><span class="v num">${r1(t.f)} / ${G.f}g</span></div>${bar(t.f, G.f)}</div>
    <div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="settings" data-focus="goals">목표 수정</button><span class="small muted" style="margin-left:auto">값은 공개 영양DB 기준 근사치</span></div>
  </section>`;
  // one-tap repeat of yesterday (people mostly eat the same few things)
  const y = dayRO(addDays(state.date, -1)), ym = y.meals || [];
  if (ym.length && !(d.meals || []).length) {
    const yt = mealTotals(ym);
    h += `<button class="btn block" style="margin-top:10px;padding:12px" data-act="meal-copy-yday">↻ 어제 식단 그대로 · ${ym.length}개 · ${fmtInt(yt.k)}kcal</button>`;
  }
  for (const slot of SLOTS) {
    const items = (d.meals || []).filter(m => (m.slot || '간식') === slot);
    const st = mealTotals(items);
    const ys = ym.filter(m => (m.slot || '간식') === slot);
    h += `<section class="card slot">
      <div class="row between"><h3 style="margin:0">${slot}</h3><span class="small muted num">${items.length ? `${fmtInt(st.k)}kcal · 단 ${r1(st.p)}g` : ''}</span></div>
      ${items.map(m => `<div class="item"><div class="main" data-act="meal-edit" data-id="${esc(m.id)}"><div class="nm">${esc(m.name)}</div>
        <div class="mm">${esc(qtyLabel(m))} · 단 ${r1(m.p)} · 탄 ${r1(m.c)} · 지 ${r1(m.f)}</div></div>
        <span class="kc">${fmtInt(m.k)}</span><button class="x" data-act="meal-del" data-id="${esc(m.id)}" aria-label="삭제">×</button></div>`).join('')}
      <div class="grid2" style="margin-top:8px;${!items.length && ys.length && d.meals.length ? '' : 'grid-template-columns:1fr'}">
        <button class="btn sm" data-act="food-open" data-slot="${slot}">+ ${slot} 추가</button>
        ${!items.length && ys.length && d.meals.length ? `<button class="btn sm ghost" data-act="meal-copy-slot" data-slot="${slot}">↻ 어제 ${slot} (${fmtInt(mealTotals(ys).k)}kcal)</button>` : ''}
      </div>
    </section>`;
  }
  return h;
}
function qtyLabel(m) {
  if (m.mode === 'g') return `${trimNum(m.qty)}g`;
  const f = foodById(m.fid);
  return `${trimNum(m.qty || 1)} × ${f ? f.s : '1인분'}`;
}

/* ---------- food picker ---------- */
function openFoodPicker(slot) {
  state.sheet = { kind: 'food', slot: slot || defaultSlot(), q: '', cat: DB.recentFoods.length ? '최근' : '전체' };
  openSheet('음식 추가', `${state.sheet.slot}`, foodPickerHtml(), state.sheet);
  renderFoodList();
}
function foodPickerHtml() {
  const S = state.sheet;
  const cats = ['최근', '내 음식', '전체'].concat(FOOD_CATS);
  return `<div class="seg">${SLOTS.map(s => `<button class="${S.slot === s ? 'on' : ''}" data-act="food-slot" data-v="${s}">${s}</button>`).join('')}</div>
    <div class="search" style="margin-top:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="fq" type="search" placeholder="음식 검색 (예: 닭가슴살, 김밥)" value="${esc(S.q)}" data-on="fq" autocomplete="off"></div>
    <div class="chips" style="margin-top:8px">${cats.map(c => `<button class="chip ${S.cat === c ? 'on' : ''}" data-act="food-cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div id="foodlist" style="margin-top:6px"></div>
    <button class="btn block" style="margin-top:10px" data-act="food-custom">+ 목록에 없는 음식 직접 입력</button>`;
}
function renderFoodList() {
  const S = state.sheet, box = $('#foodlist'); if (!box || !S) return;
  const q = norm(S.q);
  let list;
  if (q) list = allFoods().filter(f => matchQ(f.n + ' ' + f.cat, q));
  else if (S.cat === '최근') list = DB.recentFoods.map(foodById).filter(Boolean);
  else if (S.cat === '내 음식') list = DB.customFoods;
  else if (S.cat === '전체') list = allFoods();
  else list = allFoods().filter(f => f.cat === S.cat);
  box.innerHTML = list.length ? list.slice(0, 80).map(f => `<div class="foodrow" data-act="food-pick" data-id="${esc(f.id)}">
      <div class="main"><div class="nm">${esc(f.n)}</div><div class="mm">${esc(f.s)} · 단 ${f.p} · 탄 ${f.c} · 지 ${f.f}</div></div>
      <span class="kc">${fmtInt(f.k)}kcal</span></div>`).join('')
    : `<div class="empty" style="margin-top:8px">${S.cat === '최근' && !q ? '최근 먹은 음식이 여기에 쌓여요.' : S.cat === '내 음식' && !q ? '직접 입력해 저장한 음식이 여기에 보여요.' : '검색 결과가 없어요. 아래에서 직접 입력하세요.'}</div>`;
}
function openFoodAmount(fid, editId) {
  const f = foodById(fid); if (!f && !editId) return;
  const ed = editId ? dayRO(state.date).meals.find(m => m.id === editId) : null;
  const base = f || { n: ed.name, s: '1회', g: null, k: ed.k / (ed.qty || 1), p: ed.p / (ed.qty || 1), c: ed.c / (ed.qty || 1), f: ed.f / (ed.qty || 1) };
  const mode = ed ? (ed.mode || 'srv') : 'srv';
  const qty = ed ? ed.qty : (mode === 'g' ? base.g : 1);
  const slot = ed ? ed.slot : (state.sheet && state.sheet.slot) || defaultSlot();
  state.sheet = { kind: 'amount', fid, editId: editId || null, mode, qty, slot, base };
  openSheet(ed ? '식단 수정' : '양 선택', base.n, amountHtml(), state.sheet);
}
function amountHtml() {
  const S = state.sheet, b = S.base;
  const step = S.mode === 'g' ? 10 : 0.5;
  return `<div class="small muted">1회 제공량: ${esc(b.s)}${b.g ? ` = ${b.g}g` : ''} · ${fmtInt(b.k)}kcal</div>
    ${b.g ? `<div class="seg" style="margin-top:10px"><button class="${S.mode === 'srv' ? 'on' : ''}" data-act="amt-mode" data-v="srv">인분/개</button><button class="${S.mode === 'g' ? 'on' : ''}" data-act="amt-mode" data-v="g">그램(g)</button></div>` : ''}
    <div class="field"><label>${S.mode === 'g' ? '먹은 양 (g)' : '먹은 양 (× ' + esc(b.s) + ')'}</label>
      <div class="stepper"><button data-act="amt-step" data-d="${-step}">−</button>
      <input id="amt-q" type="number" inputmode="decimal" step="any" min="0" value="${trimNum(S.qty)}" data-on="amt-q">
      <button data-act="amt-step" data-d="${step}">+</button></div></div>
    <div class="infobox" style="margin-top:12px" id="amt-prev">${amountPreview()}</div>
    <div class="field"><label>끼니</label><div class="seg">${SLOTS.map(s => `<button class="${S.slot === s ? 'on' : ''}" data-act="amt-slot" data-v="${s}">${s}</button>`).join('')}</div></div>
    <button class="btn primary block" style="margin-top:14px;padding:13px" data-act="amt-save">${S.editId ? '수정 저장' : '추가하기'}</button>
    ${S.editId ? '' : `<button class="btn ghost block" style="margin-top:6px" data-act="food-back">← 목록으로</button>`}`;
}
function amountFactor() { const S = state.sheet; const q = +S.qty || 0; return S.mode === 'g' ? q / S.base.g : q; }
function amountPreview() {
  const S = state.sheet, b = S.base, x = amountFactor();
  return `<b class="num">${fmtInt(b.k * x)} kcal</b> · 단백질 ${r1(b.p * x)}g · 탄수 ${r1(b.c * x)}g · 지방 ${r1(b.f * x)}g`;
}
function openCustomFood() {
  const slot = (state.sheet && state.sheet.slot) || defaultSlot();
  state.sheet = { kind: 'cfood', slot };
  openSheet('직접 입력', '새 음식', `
    <div class="field"><label>음식 이름</label><input id="cf-n" placeholder="예: 회사 구내식당 정식"></div>
    <div class="grid2"><div class="field"><label>1회 제공량 표시</label><input id="cf-s" placeholder="예: 1인분, 1개" value="1인분"></div>
      <div class="field"><label>그램 · 선택</label><input id="cf-g" type="number" inputmode="decimal" placeholder="예: 300"></div></div>
    <div class="grid2"><div class="field"><label>칼로리 (kcal)</label><input id="cf-k" type="number" inputmode="decimal"></div>
      <div class="field"><label>단백질 (g)</label><input id="cf-p" type="number" inputmode="decimal"></div></div>
    <div class="grid2"><div class="field"><label>탄수화물 (g)</label><input id="cf-c" type="number" inputmode="decimal"></div>
      <div class="field"><label>지방 (g)</label><input id="cf-f" type="number" inputmode="decimal"></div></div>
    <div class="note">포장지 영양성분표 값을 그대로 넣으면 가장 정확해요. 칼로리를 비우면 단·탄·지로 계산해요(4·4·9kcal/g).</div>
    <label class="row" style="margin-top:12px;gap:8px"><input type="checkbox" id="cf-save" checked style="width:auto"> 내 음식 목록에 저장</label>
    <button class="btn primary block" style="margin-top:14px;padding:13px" data-act="cf-add">${esc(slot)}에 추가</button>`, state.sheet);
}

/* =====================================================================
   9. VIEW — 기록 (calendar)
   ===================================================================== */
function viewRecords() {
  const [y, m] = state.calM.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), t = today();
  let h = `<section class="card"><div class="calhead">
      <button class="iconbtn" data-act="cal-move" data-d="-1" aria-label="이전 달"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <h2>${y}년 ${m}월</h2>
      <button class="iconbtn" data-act="cal-move" data-d="1" aria-label="다음 달"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button></div>
    <div class="calgrid">${WD.map((w, i) => `<div class="calwd ${i === 0 ? 'sun' : ''}">${w}</div>`).join('')}`;
  for (let i = 0; i < first.getDay(); i++) h += `<div class="calday blank"></div>`;
  let trained = 0, setsN = 0;
  const mk = dd => `${y}-${pad(m)}-${pad(dd)}`, flags = prFlags();
  const nOf = k => (dayRO(k).sets || []).filter(s => !isCardioSet(s)).length;
  const maxN = Math.max(1, ...Array.from({ length: days }, (_, i) => nOf(mk(i + 1))));
  for (let dd = 1; dd <= days; dd++) {
    const k = mk(dd), d = dayRO(k), mus = musclesOfDay(k).all, n = nOf(k);
    if (mus.length) trained++;
    setsN += n;
    const car = (d.sets || []).filter(isCardioSet).reduce((a, s) => a + (+s.mins || 0), 0);
    const pr = (d.sets || []).some(s => flags.has(s.id));
    // darker cell = more sets that day (relative to this month's biggest day)
    const lv = n ? Math.min(4, Math.ceil(n / maxN * 4)) : mus.length ? 1 : 0;
    h += `<div class="calday ${k === t ? 'today' : ''} ${k > t ? 'future' : ''} ${lv ? 'lv' + lv : ''}" data-act="day-open" data-k="${k}" aria-label="${m}월 ${dd}일${mus.length ? ` ${mus.join(', ')} ${n}세트` : ''}">
      <span class="dn">${dd}</span>${pr ? '<span class="prd">PR</span>' : ''}${SHOW_DIET && (d.meals || []).length ? '<span class="meal" title="식단 기록"></span>' : ''}
      ${mus.slice(0, 2).map(mtag).join('')}${mus.length > 2 ? `<span class="more">+${mus.length - 2}</span>` : ''}
      ${n || car ? `<span class="cn num">${n ? n : `${trimNum(car)}′`}</span>` : ''}</div>`;
  }
  h += `</div><div class="legend"><span class="lvkey">숫자 = 세트 · 적음 <i class="lv1"></i><i class="lv2"></i><i class="lv3"></i><i class="lv4"></i> 많음</span><span><b class="prd">PR</b> 최고 기록 나온 날</span>${SHOW_DIET ? '<span><span class="dot"></span>식단 기록 있음</span>' : ''}<span>날짜를 누르면 그날 요약</span></div></section>`;
  // the month by muscle: direct sets, compared with the same days of last month
  {
    const a = mk(1), b = mk(days) < t ? mk(days) : t;
    if (a <= t) {
      const span = daysBetween(a, b), pm = new Date(y, m - 2, 1), pLast = new Date(y, m - 1, 0).getDate();
      const pStart = `${pm.getFullYear()}-${pad(pm.getMonth() + 1)}-01`, pEnd = addDays(pStart, Math.min(span, pLast - 1));
      const cur = muscleVolume(setsBetween(a, b)).direct, prv = muscleVolume(setsBetween(pStart, pEnd)).direct;
      const tot = STRENGTH_MUSCLES.reduce((x, k) => x + cur[k], 0), ptot = STRENGTH_MUSCLES.reduce((x, k) => x + prv[k], 0);
      const top = Math.max(1, ...STRENGTH_MUSCLES.map(k => cur[k]));
      if (tot) h += `<button class="btn block rp-open" data-act="report-open" data-a="${a}" data-b="${mk(days)}" data-t="${m}월">${m}월 리포트 보기</button>`;
      if (tot) h += `<div class="sec-h"><h2>${m}월 부위별 세트</h2><span class="aside">${ptot ? `지난달 같은 기간 ${ptot}세트 → ${tot}세트 (${tot >= ptot ? '+' : ''}${Math.round((tot - ptot) / ptot * 100)}%)` : '직접 한 세트'}</span></div>
        <section class="card monthmus">${STRENGTH_MUSCLES.map(k => { const v = cur[k], p = prv[k], d = v - p;
          return `<div class="mm"><span class="l">${mtag(k)}</span><span class="bar"><i style="width:${(v / top * 100).toFixed(1)}%;background:var(--m-${MKEY[k]})"></i></span><span class="v num">${v}</span><span class="dlt num ${!ptot ? '' : d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${ptot ? (d > 0 ? `+${d}` : d < 0 ? `${d}` : '=') : ''}</span></div>`; }).join('')}
          ${(() => { const zero = STRENGTH_MUSCLES.filter(k => !cur[k] && k !== '코어'); return zero.length && span >= 13 ? `<div class="note">이번 달 직접 안 한 부위: ${zero.map(mName).join(' · ')}</div>` : ''; })()}</section>`;
    }
  }
  // streak
  let streakDays = 0, k = t; if (!trainedDay(k)) k = addDays(k, -1);
  // weekly streak = consecutive rolling weeks with ≥1 workout
  let wk = 0; for (let w = 0; w < 52; w++) { const a = addDays(t, -7 * w - 6), b = addDays(t, -7 * w); let any = false; for (let x = a; x <= b; x = addDays(x, 1)) if (trainedDay(x)) { any = true; break; } if (any) wk++; else break; }
  for (let i = 0; i < 400 && trainedDay(k); i++) { streakDays++; k = addDays(k, -1); }
  h += `<div class="tiles" style="margin-top:10px">
    <div class="tile"><div class="k">${m}월 운동한 날</div><div class="v">${trained}<small>일</small></div></div>
    <div class="tile"><div class="k">${m}월 근력 세트</div><div class="v">${fmtInt(setsN)}<small>세트</small></div></div>
    <div class="tile"><div class="k">연속 운동일</div><div class="v">${streakDays}<small>일</small></div></div>
    <div class="tile"><div class="k">주 1회+ 유지</div><div class="v">${wk}<small>주 연속</small></div></div>
  </div>`;
  return h;
}
function openDaySheet(k) {
  const d = dayRO(k), mus = musclesOfDay(k).all, c = d.check || {};
  const sets = d.sets || [];
  const order = [], groups = {};
  for (const s of sets) { if (!groups[s.eq]) { groups[s.eq] = []; order.push(s.eq); } groups[s.eq].push(s); }
  const t = mealTotals(d.meals);
  let h = `<div class="row" style="flex-wrap:wrap;gap:6px">${mus.length ? mus.map(mtag).join('') : '<span class="small muted">운동 기록 없음</span>'}</div>`;
  if (sets.some(s => !isCardioSet(s))) {
    const R = sessionReport(k), max = Math.max(0, ...Object.values(R.reg));
    h += `<div class="tiles fin-tiles" style="margin-top:10px">${[[R.mins ? `${R.mins}분` : '–', '운동 시간'], [`${R.str.length}`, '세트'], [R.vol ? fmtInt(R.vol) : '–', '볼륨 kg'], [`${R.prs.length}`, 'PR']].map(([v, l]) => `<div class="tile"><div class="k">${l}</div><div class="v">${v}</div></div>`).join('')}</div>
      <div class="bodymaps fin-maps">${bodySvg('front', R.reg, max, '앞')}${bodySvg('back', R.reg, max, '뒤')}</div>
      <button class="btn block" style="margin-top:8px" data-act="fin-open-k" data-k="${k}">이날 피드백 보기</button>`;
  }
  if (c.cond || c.sleep || c.sore) h += `<div class="infobox" style="margin-top:10px"><div class="k">컨디션</div>${[c.cond ? `컨디션 ${c.cond}/5` : '', c.sore ? `근육통 ${c.sore}/5` : '', c.sleep ? `수면 ${trimNum(c.sleep)}시간` : ''].filter(Boolean).join(' · ')}</div>`;
  if (order.length) {
    h += `<div class="sec-h"><h2 style="font-size: 15px">운동</h2><span class="aside">${sets.filter(s => !isCardioSet(s)).length}세트</span></div>`;
    for (const id of order) {
      const g = groups[id], e = eqById(id) || g[0];
      h += `<div class="infobox"><div class="k">${esc(e.brand || '')} · ${esc(g[0].type || '')}</div><b>${esc(e.name)}</b><div class="small" style="margin-top:2px">${g.map(s => esc(fmtSetFull(s))).join(' / ')}</div></div>`;
    }
  }
  if ((d.meals || []).length) {
    h += `<div class="sec-h"><h2 style="font-size: 15px">식단</h2><span class="aside num">${fmtInt(t.k)}kcal · 단 ${r1(t.p)}g · 탄 ${r1(t.c)}g · 지 ${r1(t.f)}g</span></div>`;
    for (const slot of SLOTS) {
      const it = d.meals.filter(m => (m.slot || '간식') === slot);
      if (it.length) h += `<div class="infobox"><div class="k">${slot}</div>${it.map(m => `${esc(m.name)} <span class="muted">${fmtInt(m.k)}</span>`).join(' · ')}</div>`;
    }
  }
  h += `<div class="grid2" style="margin-top:14px"><button class="btn" data-act="goto-day" data-k="${k}" data-tab="workout">운동 편집</button>${(d.meals || []).length && SHOW_DIET ? `<button class="btn" data-act="goto-day" data-k="${k}" data-tab="diet">식단 편집</button>` : ''}</div>`;
  openSheet(fromKey(k).getFullYear() + '년', `${fromKey(k).getMonth() + 1}월 ${fromKey(k).getDate()}일 (${WD[fromKey(k).getDay()]})`, h, { kind: 'day' });
}

/* =====================================================================
   10. ANALYSIS ENGINE (rule-based, thresholds from the references in data.js)
   ===================================================================== */
function weekRange(w, end) { end = end || today(); return [addDays(end, -7 * w - 6), addDays(end, -7 * w)]; }

/* fractional weekly sets per muscle: direct = 1, indirect = 0.5 (Pelland 2024) */
function muscleVolume(sets) {
  const vol = {}, direct = {}, days = {};
  for (const m of STRENGTH_MUSCLES) { vol[m] = 0; direct[m] = 0; days[m] = new Set(); }
  for (const s of sets) {
    if (isCardioSet(s)) continue;
    const info = TYPE_INFO[s.type] || {};
    if (vol[s.m] != null) { vol[s.m] += 1; direct[s.m] += 1; days[s.m].add(s.date); }
    for (const [m, v] of Object.entries(info.sec || {})) if (vol[m] != null && m !== s.m) vol[m] += v;
  }
  return { vol, direct, days };
}

/* ---------- what to train next ----------
   A muscle counts as recovered 2+ days after it was last trained directly (48h is the usual guide for
   the same muscle). Among the classic splits whose muscles are all recovered, pick the one that is
   furthest below 10 sets for the last 7 days, then the one rested longest. */
const SPLITS = [
  { k: 'push', l: '가슴 · 어깨 · 삼두', ms: ['가슴', '어깨'], acc: '팔', accRe: /트라이|삼두|푸시다운|스컬|오버헤드.*익스텐션|딥/ },
  { k: 'pull', l: '등 · 이두', ms: ['등'], acc: '팔', accRe: /컬/ },
  { k: 'legs', l: '하체 · 코어', ms: ['다리'], acc: '코어' },
  // a shoulder day of its own (side/rear delts barely work in chest pressing — Campos 2020)
  { k: 'shoulder', l: '어깨 · 팔', ms: ['어깨'], acc: '팔' },
];
function lastTrained(m, before) {
  let last = null;
  for (const s of allSets()) if (s.m === m && !isCardioSet(s) && s.date < before && (!last || s.date > last)) last = s.date;
  return last;
}
/* the person's own rotation: find the last time they trained what they trained most recently,
   and suggest what came after it then (back → chest → legs → shoulders·arms → …) */
function dayLabelMs(k) {
  const ss = (dayRO(k).sets || []).filter(s => !isCardioSet(s) && s.m !== '코어'), n = {};
  for (const s of ss) n[s.m] = (n[s.m] || 0) + 1;
  const tot = ss.length; if (tot < 3) return null;
  const ms = STRENGTH_MUSCLES.filter(m => (n[m] || 0) / tot >= 0.25);
  ms.main = STRENGTH_MUSCLES.reduce((a, m) => (n[m] || 0) > (n[a] || 0) ? m : a, ms[0]); // the day's biggest part
  return ms;
}
function ownOrder(T) {
  const days = []; for (let k = addDays(T, -35); k < T; k = addDays(k, 1)) { const ms = dayLabelMs(k); if (ms && ms.length) days.push({ k, ms, sig: ms.main }); } // match days by their main part (등 vs 등·팔 is the same back day)
  if (days.length < 3) return null;
  const last = days[days.length - 1];
  let j = -1; for (let i = days.length - 2; i >= 0; i--) if (days[i].sig === last.sig) { j = i; break; }
  if (j < 0 || j + 1 >= days.length - 1) return null;
  const nx = days[j + 1];
  const cycle = days.slice(j, days.length - 1).map(d => d.ms.map(mName).join('·'));
  return { src: nx.k, ms: nx.ms, l: nx.ms.map(mName).join('·'), cycle };
}
function recommendNext(T) {
  if (!allSets().some(s => !isCardioSet(s))) return { T, first: true };
  const mvT = muscleVolume(setsBetween(addDays(T, -7), addDays(T, -1))), vol = mvT.vol;
  const info = {};
  for (const m of STRENGTH_MUSCLES) { const l = lastTrained(m, T); info[m] = { last: l, days: l ? daysBetween(l, T) : 99, vol: vol[m], dir: mvT.direct[m] }; }
  // consecutive training days right before T
  let streak = 0; for (let k = addDays(T, -1); trainedDay(k) && streak < 14; k = addDays(k, -1)) streak++;
  const c = dayRO(addDays(T, -1)).check || {}, tired = (c.cond && c.cond <= 2) || (c.sore && c.sore >= 4);
  // shoulders: count only direct sets — chest pressing (indirect 0.5) works the front delt, barely the side/rear (Campos 2020)
  const have = m => m === '어깨' ? info[m].dir : info[m].vol;
  const opts = SPLITS.map(sp => {
    const ready = sp.ms.every(m => info[m].days >= 2); // ~48 h: most lifts back to baseline (Korak 2015)
    const need = sp.ms.reduce((a, m) => a + Math.max(0, 10 - have(m)), 0) / sp.ms.length;
    const rested = Math.min(...sp.ms.map(m => info[m].days));
    return Object.assign({}, sp, { ready, need, rested, score: need + Math.min(rested, 7) * 0.8 - (sp.k === 'shoulder' ? 3 : 0) });
  }).filter(o => o.ready).sort((a, b) => b.score - a.score);
  const rest = streak >= 3 || tired, best = opts[0] || null;
  // few direct shoulder sets this week → add two shoulder moves to whatever day comes next
  const addSh = !!best && !best.ms.includes('어깨') && info['어깨'].dir < 8 && info['어깨'].days >= 2;
  // the person's own order wins when those parts have had their two days
  const own = ownOrder(T), ownReady = own && own.ms.every(m => info[m].days >= 2) ? own : null;
  return { T, best, info, streak, tired, rest, addSh: ownReady ? false : addSh, own: ownReady };
}
/* a balanced session for each split: the user's own equipment first, then staples */
function pickEq(filter, n, prefer) {
  const U = eqUse(), out = [];
  const pool = allEq().filter(e => e.kind !== 'cardio' && e.kind !== 'crossfit' && filter(e));
  const rank = e => (U[e.id] ? -1000 - U[e.id].n : 0) + ((prefer || []).includes(e.id) ? -100 + prefer.indexOf(e.id) : 0) + (e.kind === 'free' ? 0 : 1);
  for (const e of pool.sort((a, b) => rank(a) - rank(b))) { if (out.length >= n) break; out.push(e.id); }
  return out;
}
function recExercises(sp) {
  const T = t => e => t.includes(e.type);
  const add = (ids, tg) => ids.map(id => [id, tg]);
  const shAdd = () => [...add(pickEq(T(['레터럴 레이즈']), 1, ['fw-lateral', 'cb-lateral']), '3×12–15'), ...add(pickEq(T(['리어 델트']), 1, ['cb-facepull', 'fw-reardelt']), '3×12–15')];
  if (sp.addSh) return [...recExercises(Object.assign({}, sp, { addSh: false })), ...shAdd()];
  if (sp.k === 'shoulder') return [
    ...add(pickEq(T(['숄더 프레스']), 1, ['fw-db-ohp', 'fw-ohp']), '3×8–12'),
    ...add(pickEq(T(['레터럴 레이즈']), 2, ['fw-lateral', 'cb-lateral']), '3×12–15'),
    ...add(pickEq(T(['리어 델트']), 1, ['cb-facepull', 'fw-reardelt']), '3×12–15'),
    ...add(pickEq(T(['바이셉 컬']), 1, ['fw-dbcurl', 'fw-bbcurl']), '3×10–12'),
    ...add(pickEq(T(['트라이셉 익스텐션']), 1, ['cb-pushdown', 'fw-ohext']), '3×10–12')];
  if (sp.k === 'push') return [
    ...add(pickEq(e => e.m === '가슴' && !/인클라인/.test(e.name) && T(['벤치프레스', '체스트 프레스'])(e), 1, ['fw-bench', 'fw-db-bench']), '3×6–10'),
    ...add(pickEq(e => e.m === '가슴' && /인클라인/.test(e.name), 1, ['fw-incline-db', 'fw-incline-bb']), '3×8–12'),
    ...add(pickEq(T(['숄더 프레스']), 1, ['fw-ohp', 'fw-db-ohp']), '3×8–12'),
    ...add(pickEq(T(['레터럴 레이즈']), 1, ['fw-lateral', 'cb-lateral']), '3×12–15'),
    ...add(pickEq(e => e.type === '트라이셉 익스텐션' && /오버헤드/.test(e.name), 1, ['fw-ohext']), '3×10–15')];
  if (sp.k === 'pull') return [
    ...add(pickEq(T(['랫 풀다운', '풀업']), 1, ['lf-pulldown', 'fw-pullup']), '3×8–12'),
    ...add(pickEq(T(['로우']), 2, ['fw-bbrow', 'cb-row', 'fw-dbrow']), '3×8–12'),
    ...add(pickEq(T(['리어 델트']), 1, ['cb-facepull', 'fw-reardelt']), '3×12–15'),
    ...add(pickEq(T(['바이셉 컬']), 1, ['fw-bbcurl', 'fw-dbcurl']), '3×10–12')];
  return [
    ...add(pickEq(T(['스쿼트', '레그 프레스']), 2, ['fw-squat', 'lf-legpress', 'hs-hack']), '3×6–10'),
    ...add(pickEq(T(['루마니안 데드리프트']), 1, ['fw-rdl']), '3×8–10'),
    ...add(pickEq(T(['레그 컬']), 1, ['tg-legcurl', 'lf-lyingcurl']), '3×10–12'),
    ...add(pickEq(T(['레그 익스텐션']), 1, ['hs-legext', 'cy-legext']), '3×12–15'),
    ...add(pickEq(e => e.m === '코어', 1, ['cy-abcrunch', 'fw-hangleg']), '3×12–15')];
}
function recCardHtml(k) {
  const hasSets = (dayRO(k).sets || []).length > 0;
  const T = hasSets ? addDays(k, 1) : k;
  if (dayRO(T).plan && dayRO(T).plan.eqs && dayRO(T).plan.eqs.length && T !== k) return `<section class="card reccard"><div class="small muted">내일</div><b>${esc(dayRO(T).plan.label || '계획')}</b> <span class="small muted">· 계획에 넣어뒀어요</span></section>`;
  if (DB.prog && !hasSets) return ''; // the program card already says what's next
  const R = recommendNext(T); if (!R) return '';
  const when = T === k ? '오늘' : '내일';
  if (R.first) return `<section class="card reccard"><div class="small muted">${when} 추천 · 첫 운동</div><b style="font-size: 16px">전신 5종목</b>
    <div class="small muted" style="margin-top:2px">스쿼트 · 벤치프레스 · 로우 · 레터럴 레이즈 · 복근</div>
    <button class="btn sm block" style="margin-top:8px" data-act="rec-plan" data-t="${T}" data-k="full">${T === k ? '이걸로 시작' : '내일 계획에 넣기'}</button></section>`;
  const P0 = DB.prog && PROGRAMS.find(p => p.id === DB.prog.id);
  if (P0 && T !== k) {
    const nd = P0.days[progDay(P0, DB.prog.next)];
    return `<section class="card reccard"><div class="small muted">${when} 추천</div><div class="row between" style="gap:8px"><b style="font-size: 16px">${esc(nd.t)}</b><span class="small muted">${esc(P0.name)} 다음 차례</span></div>
      ${R.rest ? `<div class="small" style="margin-top:4px">${R.streak >= 3 ? `${R.streak}일 연속 운동했어요.` : '컨디션이 떨어져 있어요.'} 하루 쉬고 해도 프로그램 순서는 그대로예요.</div>` : ''}</section>`;
  }
  if (R.own) {
    const o = R.own, why = o.ms.map(m => `${mName(m)} ${R.info[m].days}일 쉼`).join(' · ');
    return `<section class="card reccard"><div class="small muted">${when} 추천 · 내 순서대로</div>
      <b style="font-size: 16px">${R.rest ? '쉬거나, 한다면 ' : ''}${esc(o.l)}</b>
      <div class="small muted" style="margin-top:2px">지난 순서: ${esc(o.cycle.join(' → '))} · ${esc(why)}</div>
      ${R.rest ? `<div class="small" style="margin-top:4px">${R.streak >= 3 ? `${R.streak}일 연속 운동했어요.` : '어제 컨디션이 낮거나 근육통이 심했어요.'} 하루 쉬어도 손해 없어요.</div>` : ''}
      <button class="btn sm block" style="margin-top:8px" data-act="own-plan" data-t="${T}" data-k="${o.src}">${T === k ? `지난 ${esc(o.l)}날(${shortDate(o.src)}) 그대로 시작` : '내일 계획에 넣기'}</button></section>`;
  }
  const b = R.best;
  if (!b) return `<section class="card reccard"><div class="small muted">${when} 추천</div><b style="font-size: 16px">쉬는 날</b><div class="small muted" style="margin-top:2px">주요 부위가 모두 최근 이틀 안에 운동했어요. 같은 부위는 48시간 정도 쉬는 게 일반적이에요.</div></section>`;
  const why = b.ms.map(m => { const x = R.info[m]; return `${mName(m)} ${x.last ? `${x.days}일 전` : '직접 한 적 없음'} · 최근 7일 ${r1(x.dir)}세트`; }).join(' / ');
  const sh = R.info['어깨'], shWhy = R.addSh ? `어깨 직접 최근 7일 ${r1(sh.dir)}세트 — 벤치 같은 가슴 운동은 옆·뒤 어깨를 거의 안 써요. 어깨를 쉰 지 이틀이 지나서 다른 날에 2종목 붙여도 돼요(주 2–3회 나눠 하기).`
    : b.k === 'shoulder' ? '가슴·등·하체는 아직 회복 중이에요. 어깨는 이틀 이상 쉬었으니 어깨·팔 날로 채워요.' : '';
  return `<section class="card reccard"><div class="small muted">${when} 추천</div>
    <div class="row between" style="gap:8px"><b style="font-size: 16px">${R.rest ? '쉬거나, 한다면 ' : ''}${esc(b.l)}${R.addSh ? ' + 옆·뒤 어깨' : ''}</b></div>
    <div class="small muted" style="margin-top:2px">${esc(why)}</div>${shWhy ? `<div class="small" style="margin-top:4px">${esc(shWhy)}</div>` : ''}
    ${R.rest ? `<div class="small" style="margin-top:4px">${R.streak >= 3 ? `${R.streak}일 연속 운동했어요.` : '어제 컨디션이 낮거나 근육통이 심했어요.'} 하루 쉬어도 손해 없어요.</div>` : ''}
    <button class="btn sm block" style="margin-top:8px" data-act="rec-plan" data-t="${T}" data-k="${b.k}${R.addSh ? '+sh' : ''}">${T === k ? '추천 종목으로 시작' : '내일 계획에 넣기'}</button></section>`;
}

function weekSummary(w) {
  const [a, b] = weekRange(w);
  const sets = setsBetween(a, b).filter(s => !isCardioSet(s));
  const sessions = new Set(); let tonnage = 0;
  for (const s of sets) { sessions.add(s.date); tonnage += setKg(s) * (+s.r || 0); }
  for (let k = a; k <= b; k = addDays(k, 1)) if (trainedDay(k)) sessions.add(k);
  const conds = [], sores = [], sleeps = [], rirs = [];
  for (let k = a; k <= b; k = addDays(k, 1)) { const c = (DB.days[k] || {}).check || {}; if (c.cond) conds.push(c.cond); if (c.sore) sores.push(c.sore); if (c.sleep) sleeps.push(+c.sleep); }
  for (const s of sets) if (s.rir != null) rirs.push(+s.rir);
  const avg = arr => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null);
  return { a, b, sets: sets.length, sessions: sessions.size, tonnage, cond: avg(conds), condN: conds.length, sore: avg(sores), sleep: avg(sleeps), sleepN: sleeps.length, rir: avg(rirs), rirN: rirs.length };
}

/* progression per equipment (not mixed across machines — their loads aren't 1:1) */
function lightWeeks() {
  return memo('lightWeeks', () => {
    const ws = []; for (let w = 7; w >= 0; w--) ws.push(weekSummary(w));
    const peak = Math.max(0, ...ws.map(x => x.sets));
    return ws.map((x, i) => peak > 0 && x.sessions >= 1 && x.sets <= 0.65 * peak && i > 0 && ws.slice(0, i).some(y => y.sets >= 0.7 * peak));
  });
}
/* where an exercise sat in that day's order (1 = first). Done later, the same lift reads lower from fatigue. */
function eqPos(k, eq) {
  const ss = (dayRO(k).sets || []).filter(s => !isCardioSet(s)).map((s, i) => [s, s.t || i]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const order = []; for (const s of ss) if (!order.includes(s.eq)) order.push(s.eq);
  const i = order.indexOf(eq); return i < 0 ? null : i + 1;
}
// a drop that comes with moving the lift 2+ places later in the session is read as order, not lost strength
const orderShift = (eq, kNow, kThen) => { const a = eqPos(kNow, eq), b = eqPos(kThen, eq); return a && b && a - b >= 2 ? { from: b, to: a } : null; };
function progression() {
  const weeks = 8, from = weekRange(weeks - 1)[0];
  const light = lightWeeks();
  const recent = setsBetween(from, today()).filter(s => !isCardioSet(s) && setKg(s) > 0);
  const byEq = {};
  for (const s of recent) (byEq[s.eq] = byEq[s.eq] || []).push(s);
  const rows = [];
  for (const [eq, list] of Object.entries(byEq)) {
    const sessions = new Set(list.map(s => s.date));
    if (sessions.size < 3) continue;
    const wk = [], wkDay = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const [a, b] = weekRange(w);
      const ws = list.filter(s => s.date >= a && s.date <= b);
      // deload weeks are lighter on purpose — leave them out of the trend
      wk.push(ws.length && !light[weeks - 1 - w] ? Math.max(...ws.map(setE1)) : null);
      wkDay.push(ws.length ? ws.reduce((a, x) => setE1(x) > setE1(a) ? x : a).date : null);
    }
    // recent = best of the last 3 weeks, prior = best of the 5 weeks before (deload weeks excluded).
    // Two-week windows were too short: normal slow progress looked like a plateau.
    const idx = wk.map((v, i) => (v != null ? i : -1)).filter(i => i >= 0);
    const recIdx = idx.slice(-2), priorIdx = idx.slice(0, -2);
    const rec = recIdx.length && recIdx[recIdx.length - 1] >= weeks - 4 ? Math.max(...recIdx.map(i => wk[i])) : -1;
    const prior = priorIdx.length ? Math.max(...priorIdx.map(i => wk[i])) : null;
    let status = 'none', pct = null;
    if (rec > 0 && prior && recIdx.length === 2 && priorIdx.length >= 2) {
      pct = (rec - prior) / prior;
      status = pct >= 0.01 ? 'up' : pct <= -0.03 ? 'down' : 'flat';
    } else if (rec <= 0) status = 'idle';
    let order = null;
    if (status === 'down') {
      const ri = recIdx.reduce((a, i) => wk[i] > wk[a] ? i : a, recIdx[0]), pi = priorIdx.reduce((a, i) => wk[i] > wk[a] ? i : a, priorIdx[0]);
      order = orderShift(eq, wkDay[ri], wkDay[pi]);
      if (order) status = 'flat';
    }
    const e = eqById(eq) || list[0];
    rows.push({ eq, name: e.name, brand: e.brand, type: list[0].type, m: list[0].m, n: list.length, sessions: sessions.size, wk, rec, prior, pct, status, order });
  }
  rows.sort((x, y) => y.n - x.n);
  return rows.slice(0, 8);
}

function deloadAnalysis() {
  const W = 8, weeks = [];
  for (let w = W - 1; w >= 0; w--) weeks.push(Object.assign({ w }, weekSummary(w)));
  const peak = Math.max(0, ...weeks.map(x => x.sets));
  const active = weeks.filter(x => x.sessions > 0).length;
  const loading = x => x.sessions >= 2 && peak > 0 && x.sets >= 0.7 * peak;
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) { if (loading(weeks[i])) streak++; else break; }
  const prog = progression().filter(p => p.status === 'up' || p.status === 'flat' || p.status === 'down');
  const stalled = prog.filter(p => p.status === 'flat' || p.status === 'down');
  const down = prog.filter(p => p.status === 'down');
  const cur = weeks[weeks.length - 1];
  const reasons = [], okNotes = [];
  let pts = 0;
  if (streak >= 8) { pts += 3; reasons.push(`고볼륨 주가 ${streak}주 연속 — 코치들이 보통 4–8주마다 디로딩을 넣는 범위를 넘었어요 (Bell 2022).`); }
  else if (streak >= 6) { pts += 2; reasons.push(`고볼륨 주가 ${streak}주 연속 이어지고 있어요 (일반적 주기 4–8주).`); }
  else if (streak >= 4) { pts += 1; reasons.push(`고볼륨 주 ${streak}주째 — 슬슬 디로딩 계획을 세울 시점이에요.`); }
  else okNotes.push(`고볼륨 주 연속 ${streak}주 (4주 미만)`);
  if (prog.length >= 3 && stalled.length / prog.length >= 0.5) { pts += 2; reasons.push(`주요 운동 ${prog.length}개 중 ${stalled.length}개가 최근 3주간 추정 1RM 정체/하락.`); }
  else if (stalled.length >= 1 && prog.length >= 1) { pts += stalled.length >= 2 ? 1 : 0; if (stalled.length >= 2) reasons.push(`정체 중인 운동 ${stalled.length}개.`); }
  if (down.length >= 2) { pts += 1; reasons.push(`추정 1RM이 3% 이상 떨어진 운동 ${down.length}개 — 누적 피로 신호일 수 있어요.`); }
  if (cur.condN >= 3 && cur.cond <= 2.5) { pts += 2; reasons.push(`최근 7일 평균 컨디션 ${r1(cur.cond)}/5로 낮아요.`); }
  if (cur.sore != null && cur.sore >= 3.5) { pts += 1; reasons.push(`근육통 평균 ${r1(cur.sore)}/5 — 회복이 따라오지 못하고 있어요.`); }
  if (cur.sleepN >= 3 && cur.sleep < 6) { pts += 1; reasons.push(`평균 수면 ${r1(cur.sleep)}시간 — 잠이 부족하면 회복 여유가 줄어요.`); }
  if (cur.rirN >= 6 && cur.rir <= 0.7) { pts += 1; reasons.push(`최근 세트 평균 RIR ${r1(cur.rir)} — 거의 매 세트 실패 지점까지 가고 있어요.`); }

  const light = lightWeeks();
  const inDeload = light[light.length - 1];
  const justDeloaded = !inDeload && light[light.length - 2];
  const recovering = !inDeload && (light[light.length - 2] || light[light.length - 3]);
  if (recovering && stalled.length) {
    // strength usually takes 1–2 weeks to come back above the pre-deload peak
    const i = reasons.findIndex(r => r.includes('정체/하락')); if (i > -1) { reasons.splice(i, 1); pts -= 2; }
    const j = reasons.findIndex(r => r.includes('3% 이상 떨어진')); if (j > -1) { reasons.splice(j, 1); pts -= 1; }
    const q = reasons.findIndex(r => r.startsWith('정체 중인 운동')); if (q > -1) { reasons.splice(q, 1); pts -= 1; }
    okNotes.unshift('디로딩 후 1–2주는 기록이 회복되는 기간이라 정체 판정을 미뤘어요.');
  }
  let level, title;
  const lowVol = peak < 15; // a few strength sets a week (e.g. mostly cardio): deload talk doesn't apply
  if (active < 3) { level = 'info'; title = '데이터 수집 중'; }
  else if (lowVol) { level = 'info'; title = '근력 볼륨이 낮아 해당 없음'; reasons.length = 0; okNotes.length = 0; okNotes.push(`최근 8주 중 가장 많은 주가 ${peak}세트예요. 디로딩은 주 15세트 이상 꾸준히 쌓일 때 의미가 있어요.`); }
  else if (inDeload) {
    level = 'good'; title = '디로딩 주간 진행 중';
    reasons.length = 0;
    reasons.push(`최근 7일 근력 세트가 ${cur.sets}세트로 고점(${peak}세트)의 ${Math.round(cur.sets / peak * 100)}% — 회복 주간으로 보고 볼륨·정체 경고를 멈췄어요.`);
    reasons.push('다음 주에 원래 볼륨으로 돌아가면 됩니다.');
  }
  else if (pts >= 4) { level = 'bad'; title = '디로딩 권장'; }
  else if (pts >= 2) { level = 'warn'; title = '1–2주 안에 디로딩 계획'; }
  else { level = 'good'; title = justDeloaded ? '디로딩 완료 — 다시 쌓아갈 때' : '지금은 필요 없어요'; }
  if (justDeloaded && !inDeload) okNotes.unshift('지난주 디로딩을 했어요 — 고볼륨 연속 카운트를 새로 시작했어요.');

  const base = cur.sets || Math.round(weeks.slice(-4).reduce((a, x) => a + x.sets, 0) / 4) || 0;
  return { weeks, peak, streak, active, level, title, reasons, okNotes, pts, base, cur, prog, stalled, inDeload: inDeload && !lowVol, justDeloaded, recovering, lowVol };
}

/* weekly set range per muscle: legs combine quads, hamstrings, glutes and calves, so their range is wider */
function volRange(m) { return m === '다리' ? [14, 30] : (m === '팔' || m === '코어') ? [6, 20] : [10, 20]; } // ACSM 2026: ≥10/wk, gains level off ~18–20
function nutritionAnalysis() {
  const t = today(), days = [];
  for (let i = 0; i < 7; i++) { const k = addDays(t, -i), d = dayRO(k); if ((d.meals || []).length) days.push(mealTotals(d.meals)); }
  const n = days.length, bw = latestBodyweight();
  if (!n) return { n: 0, bw };
  const avg = key => days.reduce((a, x) => a + x[key], 0) / n;
  return { n, bw, k: avg('k'), p: avg('p'), c: avg('c'), f: avg('f'), ppk: bw ? avg('p') / bw : null };
}

/* diet-based recommendations — only used when the diet tab is on */
function nutritionRecs(nu, add, totalAll) {
  if (nu.n >= 3) {
    if (nu.ppk != null) {
      const gp = goal().p, deficit = goal().kc < 1;
      if (nu.ppk < gp) add('warn', 6, `단백질 체중 1kg당 ${r1(nu.ppk)}g · ${goal().l} 기준 ${gp}g`, deficit ? `칼로리를 줄이는 동안엔 근육을 지키려면 단백질을 평소보다 높게(약 ${gp}g/kg) 잡는 게 권장돼요. 체중 ${nu.bw}kg 기준 하루 약 ${Math.round(gp * nu.bw)}g.` : `근성장 효과가 최대치에 가까워지는 기준은 하루 약 1.6g/kg이에요. 체중 ${nu.bw}kg 기준 하루 약 ${Math.round(gp * nu.bw)}g.`, `하루 +${Math.round(gp * nu.bw - nu.p)}g — 닭가슴살 100g(31g) 또는 그릭요거트+프로틴 1스쿱(약 34g)`, deficit ? 'Helms 2014 · Morton 2018' : 'Morton 2018');
      else add('good', 1, `단백질 충분 · ${r1(nu.ppk)}g/kg`, `${goal().l} 기준 ${gp}g/kg 이상을 지키고 있어요.`, '', deficit ? 'Helms 2014' : 'Morton 2018');
    } else add('info', 2, '체중을 입력하면 단백질 분석이 정확해져요', `최근 평균 단백질 ${Math.round(nu.p)}g. 체중 대비(g/kg)로 봐야 판단할 수 있어요.`, '바디 탭에 인바디나 체중을 기록하세요.', '');
    const G = DB.settings.goals;
    if (nu.k > G.kcal * 1.15) add('info', 2, `평균 섭취 ${fmtInt(nu.k)}kcal — 목표보다 ${Math.round((nu.k / G.kcal - 1) * 100)}% 많음`, `${goal().l} 목표(${fmtInt(G.kcal)}kcal)보다 많이 먹고 있어요. 체중 추세(바디 탭)와 같이 보세요.`, '', '');
    else if (nu.k < G.kcal * 0.8) add('info', 2, `평균 섭취 ${fmtInt(nu.k)}kcal — 목표보다 ${Math.round((1 - nu.k / G.kcal) * 100)}% 적음`, `${goal().l} 목표(${fmtInt(G.kcal)}kcal)보다 적어요. 회복에 에너지가 부족할 수 있어요. (기록 누락일 수도 있어요)`, '', '');
  } else if (totalAll >= 5) add('info', 1, '식단 기록이 부족해요', `최근 7일 중 ${nu.n}일만 기록됐어요. 3일 이상 기록되면 영양 분석이 시작돼요.`, '', '');

}

/* staple exercises per muscle, used when you have no history for it yet */
const CORE_EX = {
  가슴: ['fw-bench', 'fw-incline-db', 'cb-cross', 'fw-db-fly'], 등: ['lf-pulldown', 'fw-bbrow', 'cb-row', 'fw-pullup', 'fw-dbrow'],
  어깨: ['fw-ohp', 'fw-db-ohp', 'fw-lateral', 'fw-reardelt'], 다리: ['fw-squat', 'lf-legpress', 'fw-rdl', 'tg-legcurl', 'hs-legext'],
  팔: ['fw-bbcurl', 'cb-pushdown', 'fw-dbcurl', 'fw-skull'], 코어: ['cy-abcrunch', 'fw-hangleg', 'fw-rollout'],
};
function suggestEquipmentFor(m, n) {
  const counts = {};
  for (const s of allSets()) if (s.m === m && !isCardioSet(s)) counts[s.eq] = (counts[s.eq] || 0) + 1;
  const used = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id]) => eqById(id)).filter(Boolean);
  // the ones you already use first, then fill from the catalogue (free weights first: every gym has them)
  const core = CORE_EX[m] || [], rank = e => { const i = core.indexOf(e.id); return i >= 0 ? i : 100 + (e.kind === 'free' ? 0 : 1); };
  const cat = allEq().filter(e => e.m === m && e.kind !== 'cardio' && e.kind !== 'crossfit' && !used.includes(e)).sort((a, b) => rank(a) - rank(b));
  return used.concat(cat).slice(0, n || 2);
}

function buildReport() {
  const [a, b] = weekRange(0);
  const sets7 = setsBetween(a, b);
  const mv = muscleVolume(sets7);
  // weekly average over 14 days, used for deficit/excess calls (smoother than one rolling week)
  const mv14 = muscleVolume(setsBetween(addDays(b, -13), b));
  const span14 = Math.min(14, Math.max(7, daysBetween((allSets()[0] || { date: b }).date, b) + 1));
  mv14.dW = {}; mv14.ratio = {};
  /* under two weeks of history the window starts on a workout day, so a part done on day 1 and again
     on day 7 gets counted twice in "one week". Estimate its real spacing instead: n sessions spread over
     (last − first) days means one every (last − first)/(n − 1) days. */
  const short = span14 < 14, s14 = setsBetween(addDays(b, -13), b);
  for (const m of STRENGTH_MUSCLES) {
    let span = span14;
    if (short) { const ds = [...new Set(s14.filter(x => x.m === m && !isCardioSet(x)).map(x => x.date))].sort(); if (ds.length >= 2) span = Math.max(3, daysBetween(ds[0], ds[ds.length - 1]) * ds.length / (ds.length - 1)); }
    mv14.ratio[m] = span14 / span;
    mv14.dW[m] = mv14.direct[m] * 7 / span;
  }
  // indirect sets follow the frequency of the exercise that produced them (rows → biceps at the back-day rate)
  if (short) {
    const raw = mv14.vol; mv14.vol = {}; for (const m of STRENGTH_MUSCLES) mv14.vol[m] = 0;
    for (const x of s14) {
      if (isCardioSet(x) || mv14.vol[x.m] == null) continue;
      const f = 7 / span14 * (mv14.ratio[x.m] || 1);
      mv14.vol[x.m] += f;
      for (const [m2, v] of Object.entries((TYPE_INFO[x.type] || {}).sec || {})) if (mv14.vol[m2] != null && m2 !== x.m) mv14.vol[m2] += v * f;
    }
    void raw;
  } else for (const m of STRENGTH_MUSCLES) mv14.vol[m] = mv14.vol[m] * 7 / span14;
  const dl = deloadAnalysis();
  const nu = nutritionAnalysis();
  const recs = [];
  const add = (lv, prio, t, d, act, src) => recs.push({ lv, prio, t, d, act, src });
  const strengthSets = sets7.filter(s => !isCardioSet(s)).length;
  const totalAll = allSets().length;

  if (totalAll < 5) add('info', 0, '기록이 쌓이면 분석이 시작돼요', '세트를 일주일 정도 기록하면 부위별 볼륨, 정체, 디로딩 시점을 분석해 드려요.', '운동 탭에서 기구를 골라 세트를 기록하세요.', '');

  if (dl.level === 'bad') add('bad', 10, '이번 주는 디로딩 주간으로', dl.reasons.join(' '), `세트 수를 30–50% 줄이고(이번 주 ${dl.base}세트 → ${Math.round(dl.base * .5)}–${Math.round(dl.base * .7)}세트), 무게는 유지하되 RIR 1–3을 더 남기세요. 5–7일 후 원래 볼륨으로 복귀.`, 'Bell 2022 · Coleman 2024');
  else if (dl.level === 'warn') add('warn', 7, '디로딩을 미리 계획하세요', dl.reasons.join(' '), '다음 1–2주 중 일정이 바쁜 주를 디로딩 주간으로 잡으면 손해가 적어요.', 'Bell 2022');

  if (dl.inDeload) add('good', 9, '디로딩 주간 — 계획대로 가고 있어요', '이번 주는 일부러 가볍게 하는 주라 볼륨 부족·정체 경고를 띄우지 않아요.', '무게는 유지하고 세트만 줄인 상태로 마무리한 뒤, 다음 주 원래 루틴으로 복귀하세요.', 'Bell 2022');
  if (strengthSets >= 6 && !dl.inDeload) {
    const accessoryLow = [], low = [], high = [], once = [];
    for (const m of STRENGTH_MUSCLES) {
      const v = mv14.vol[m], [lo, hi] = volRange(m);
      const accessory = m === '코어' || m === '팔';
      if (accessory && v < lo) { accessoryLow.push(`${m} 주 ${r1(v)}세트`); continue; }
      if (!accessory && v < lo - 2 && mv14.dW[m] > 0) low.push([m, v, lo]);
      else if (v > hi) {
        high.push(`${m} ${r1(v)}`);
      }
      if (mv14.direct[m] * 7 / span14 >= 8 && mv14.days[m].size <= Math.ceil(span14 / 7)) once.push(`${m} ${Math.round(mv14.direct[m] * 7 / span14)}`);
    }
    if (high.length) add('info', 2, `고볼륨 · ${high.join(' · ')}세트/주`, '20세트를 넘겨도 근성장은 조금씩 더 늘 수 있어요(주 30–45세트 그룹이 더 컸던 연구도 있어요). 다만 세트당 효율은 떨어지고 회복 부담이 커지는 구간이고, 이 구간 연구는 아직 적어요.', '근육통·컨디션이 괜찮고 무게가 늘고 있으면 유지해도 돼요. 정체되거나 피곤하면 이 부위부터 줄이세요.', 'Schoenfeld 2019 · Pelland 2024');
    if (once.length) add('info', 1, `주 1회에 몰아서 · ${once.join(' · ')}세트`, '볼륨이 같다면 빈도 자체의 근비대 효과는 작아서 분할 방식(브로 스플릿)도 괜찮아요. 다만 한 세션에 많이 몰면 뒤쪽 세트의 질이 떨어지기 쉽고, 근력 향상엔 빈도가 도움이 돼요.', '정체되면 부위당 세트를 주 2회로 나눠보세요.', 'Pelland 2024 · Schoenfeld 2016');
    if (low.length) {
      const [m0, v0, lo0] = low[0];
      const eqs = suggestEquipmentFor(m0, 2).map(e => e.name).join(', ');
      add('info', 5, low.map(([m, v]) => `${m} ${r1(v)}`).join(' · ') + `세트/주 · 조금 더 해볼 만해요`,
        `근비대 목적이면 부위당 주 ${lo0}세트 안팎부터 효과가 확실해져요. 최근 2주 평균이고, 간접 자극(예: 벤치프레스의 삼두)은 0.5세트로 계산했어요.`,
        low.map(([m, v, lo]) => `${m} +${Math.ceil(lo - v)}세트`).join(', ') + (eqs ? ` — ${m0} 추천: ${eqs}` : ''), 'Schoenfeld 2017 · Pelland 2024');
    }
    if (false && accessoryLow.length) add('info', 2, `보조 부위 · ${accessoryLow.join(', ')}`, '팔·코어는 큰 운동에서 간접 자극을 받지만, 따로 키우고 싶다면 주 6세트 정도가 출발점이에요.', '관심 있는 부위만 세션 끝에 2–3세트 추가하세요.', 'Pelland 2024');
    // balance
    // balance: compound presses vs compound pulls over 2 weeks (isolation work like laterals/curls left out)
    const PUSHC = new Set(['벤치프레스', '인클라인 프레스', '체스트 프레스', '딥스', '푸시업', '숄더 프레스', '핸드스탠드 푸시업']);
    const PULLC = new Set(['랫 풀다운', '풀업', '로우', '머슬업', '로프 클라임', '풀오버']);
    let push = 0, pull = 0, quad = 0, ham = 0;
    for (const s of setsBetween(addDays(b, -13), b)) { if (isCardioSet(s)) continue; if (PUSHC.has(s.type)) push++; if (PULLC.has(s.type)) pull++; const tg = (TYPE_INFO[s.type] || {}).tag; if (tg === 'quad') quad++; if (tg === 'ham') ham++; }
    if (push + pull >= 16 && push > pull * 1.5) add('info', 4, `2주간 미는 운동 ${push} : 당기는 운동 ${pull}세트`, '벤치·숄더프레스 같은 미는 운동에 비해 로우·풀다운이 적어요. 어깨 균형을 위해 비슷하게 맞추는 게 일반적인 권장이에요.', `로우·풀다운 주 +${Math.ceil((push - pull) / 2 / 1.2)}세트`, '');
    if (quad + ham >= 16 && quad > ham * 2.2) add('info', 2, `하체: 앞(대퇴사두) ${quad} : 뒤(햄스트링·둔근) ${ham}`, '레그 익스텐션·프레스 위주로 하체 뒤쪽 자극이 적어요.', '레그 컬·루마니안 데드리프트·힙 쓰러스트를 추가하세요.', '');
  }

  const flags = prFlags(), prs7 = sets7.filter(x => flags.has(x.id));
  if (prs7.length) {
    const names = [...new Set(prs7.map(x => x.name))];
    add('good', 6, `이번 주 PR ${prs7.length}개`, `${names.slice(0, 4).join(', ')}${names.length > 4 ? ` 외 ${names.length - 4}개` : ''}에서 기록을 넘었어요.`, '', '');
  }
  if (!dl.inDeload && !dl.recovering) for (const p of dl.prog.filter(x => x.status === 'flat').slice(0, 2)) add('info', 3, `${p.name} 정체`, `${p.brand ? p.brand + ' · ' : ''}최근 운동한 2주 최고 추정 1RM ${r1(p.rec)}kg, 그 전 최고 ${r1(p.prior)}kg.`, '반복 범위를 바꾸거나(예: 8–10 → 12–15회), 마지막 세트를 RIR 0–1까지 밀거나, 1.25–2.5kg 단위로 증량해보세요.', '');
  for (const p of dl.prog.filter(x => x.status === 'up').slice(0, 2)) add('good', 1, `${p.name} 상승 중 +${Math.round(p.pct * 100)}%`, `추정 1RM ${r1(p.prior)} → ${r1(p.rec)}kg.`, '지금 방식을 유지하세요.', '');

  if (SHOW_DIET) nutritionRecs(nu, add, totalAll);

  recs.sort((x, y) => y.prio - x.prio);
  return { mv, mv14, dl, nu, recs, strengthSets, range: [a, b] };
}

/* ---------- exercise mix within a muscle (last 4 weeks) ----------
   Not warnings: notes on which part of a muscle gets little direct work, for people who want to even it out. */
function mixTips() {
  const ss = setsBetween(addDays(today(), -27), today()).filter(s => !isCardioSet(s));
  const n = f => ss.filter(f).length;
  const nm = s => `${s.name || ''} ${s.type || ''}`;
  const tips = [];
  const chest = n(s => s.m === '가슴'), incline = n(s => s.m === '가슴' && /인클라인/.test(nm(s)));
  if (chest >= 8 && incline / chest < 0.2) tips.push({ m: '가슴', t: `윗가슴 · 인클라인 ${incline}/${chest}세트`, d: '가슴 운동이 대부분 평평한 각도예요. 인클라인 프레스는 윗가슴(쇄골 쪽) 두께를 더 키웠다는 연구가 있어요(초보자 대상 1건이라 참고 수준).', ex: ['fw-incline-db', 'fw-incline-bb', 'hs-incline'], src: 'Chaves 2020' });
  const vert = n(s => /랫 풀다운|풀업|풀오버|머슬업|친업/.test(nm(s))), horiz = n(s => s.type === '로우');
  if (vert + horiz >= 8 && (vert === 0 || horiz === 0 || Math.min(vert, horiz) / (vert + horiz) < 0.2)) {
    const lowV = vert < horiz;
    tips.push({ m: '등', t: `${lowV ? '수직 당기기(풀다운·풀업)' : '수평 당기기(로우)'} ${lowV ? vert : horiz}/${vert + horiz}세트`, d: lowV ? '로우 위주예요. 위에서 끌어내리는 운동은 광배근(등 넓이) 쪽을 더 쓰는 경향이 있어요.' : '풀다운 위주예요. 로우는 등 중앙(능형근·승모근 중하부) 두께에 더 관여해요.', ex: lowV ? ['lf-pulldown', 'fw-pullup', 'hs-pulldown'] : ['cb-row', 'fw-bbrow', 'hs-row'], src: '' });
  }
  const press = n(s => s.type === '숄더 프레스'), lat = n(s => s.type === '레터럴 레이즈'), rear = n(s => s.type === '리어 델트');
  if (press >= 6 && lat === 0) tips.push({ m: '어깨', t: `측면 어깨 · 레터럴 레이즈 0세트`, d: '프레스는 앞쪽 어깨를 주로 쓰고 옆쪽(어깨 넓이)은 상대적으로 덜 써요.', ex: ['fw-lateral', 'cb-lateral', 'tg-lateral'], src: '' });
  if (press + lat >= 10 && rear === 0) tips.push({ m: '어깨', t: `후면 어깨 · 0세트`, d: '앞·옆에 비해 뒤쪽 어깨 운동이 없어요. 로우·풀다운에서 간접 자극은 받지만 따로 하면 어깨 균형에 도움이 돼요.', ex: ['cb-facepull', 'fw-reardelt'], src: '' });
  const quad = n(s => /스쿼트|레그 프레스|런지/.test(s.type || '')), ext = n(s => s.type === '레그 익스텐션'), curl = n(s => s.type === '레그 컬');
  const lying = n(s => s.type === '레그 컬' && /라잉/.test(s.name || ''));
  if (quad >= 8 && curl === 0) tips.push({ m: '다리', t: `햄스트링 · 레그 컬 0세트`, d: '스쿼트 위주 훈련으로는 햄스트링이 거의 자라지 않았다는 연구가 있어요. 무릎을 굽히는 레그 컬이 직접 자극이에요.', ex: ['tg-legcurl', 'lf-lyingcurl'], src: 'Kubo 2019' });
  else if (curl >= 6 && lying / curl > 0.8) tips.push({ m: '다리', t: `햄스트링 · 라잉 컬 위주`, d: '같은 레그 컬이라도 앉아서 하는 시티드 컬이 햄스트링을 더 늘어난 자세에서 써서 근비대가 더 컸어요.', ex: ['tg-legcurl'], src: 'Maeo 2021' });
  if (quad >= 8 && ext === 0) tips.push({ m: '다리', t: `대퇴직근 · 레그 익스텐션 0세트`, d: '스쿼트는 허벅지 앞쪽 중 대퇴직근(가운데 긴 근육)을 잘 키우지 못했어요. 레그 익스텐션이 이 부분을 직접 써요.', ex: ['hs-legext', 'cy-legext'], src: 'Kubo 2019' });
  const tri = n(s => s.type === '트라이셉 익스텐션'), over = n(s => s.type === '트라이셉 익스텐션' && /오버헤드|머리 위/.test(s.name || ''));
  if (tri >= 6 && over === 0) tips.push({ m: '팔', t: `삼두 · 오버헤드 익스텐션 0세트`, d: '팔을 머리 위로 올린 익스텐션이 푸시다운보다 삼두(특히 긴 갈래)를 약 1.4배 더 키웠어요.', ex: ['fw-ohext'], src: 'Maeo 2023' });
  return tips;
}

/* =====================================================================
   11. VIEW — 분석
   ===================================================================== */
const ICON = { good: '✓', warn: '!', bad: '!!', info: 'i' };
const LV_LABEL = { good: '양호', warn: '주의', bad: '필요', info: '정보' };

/* training advice that follows the chosen goal; uses this week's logs, not generic rules */
const MAIN_REG = ['chestU', 'chestL', 'lats', 'midback', 'deltS', 'deltR', 'biceps', 'triceps', 'quads', 'hams', 'glutes', 'abs'];
// helpers that work with other muscles and rarely get their own exercise: shown on maps, never judged
const ASSIST_REG = new Set(['calves', 'forearm']);
function goalTrainHtml(R, RW, ES) {
  const key = goalKey(), base = goalBase(), G = GOALS[key], items = [];
  const prog = progression().filter(r => ['up', 'flat', 'down'].includes(r.status)), down = prog.filter(r => r.status === 'down'), up = prog.filter(r => r.status === 'up');
  const carMin = ES.per.reduce((a, x) => a + x.carMin, 0);
  const days28 = new Set(setsBetween(addDays(today(), -27), today()).filter(s => !isCardioSet(s)).map(s => s.date)).size / 4;
  const ib = DB.inbody.slice().sort((a, b) => (a.date < b.date ? -1 : 1)), vfl = (ib.filter(e => e.vfl != null).pop() || {}).vfl;
  const wkSets = STRENGTH_MUSCLES.reduce((a, m) => a + (R.mv14.dW[m] || 0), 0);
  if (!wkSets && !carMin) return '';
  // trained regions that sit under their range, biggest gap first
  const trainedG = Object.keys(REG_GROUP).filter(m => (R.mv14.dW[m] || 0) >= 0.5);
  const lowRegs = trainedG.flatMap(m => REG_GROUP[m]).filter(k => MAIN_REG.includes(k))
    .map(k => ({ k, v: RW[k] || 0, lo: REG_RANGE[k][0] })).filter(x => x.v < x.lo).sort((a, b) => (a.v / a.lo) - (b.v / b.lo));
  const regTxt = l => l.slice(0, 2).map(x => `${REGIONS[x.k]} ${r1(x.v)}세트`).join(', ');
  const progItem = need => down.length >= 2
    ? ['warn', `추정 1RM이 떨어진 종목 ${down.length}개`, `${down.slice(0, 2).map(r => r.name).join(', ')}. ${need}`]
    : prog.length ? ['good', `무게 유지·상승 중 (${prog.length}종목 중 오름 ${up.length})`, '기록이 떨어지지 않고 있어요.'] : null;
  if (wkSets < 0.5) items.push(['info', '최근 2주 근력운동 기록이 없어요', base === 'cut' ? '감량 중 근육을 지키려면 주 2회 이상 근력운동이 권장돼요. 유산소만 하면 빠지는 체중 중 근육 비율이 커져요.' : key === 'strength' ? '힘을 키우려면 근력운동이 기본이에요. 주 2–3회, 스쿼트·벤치·데드 같은 큰 동작부터 시작해보세요.' : key === 'leanbulk' || key === 'bulk' ? '증량은 근력운동이 있어야 늘어난 체중이 근육으로 가요. 주 2회 이상, 근육별 주 10세트 정도부터 시작해보세요.' : '주 2회 이상 근력운동이 권장돼요.', 'WHO 2020']);
  if (key === 'strength') {
    const p = progItem('힘 목표에선 추정 1RM이 오르는 게 제일 중요한 지표예요. 떨어지면 잠도·회복부터 점검하세요.'); if (p) items.push(p);
    items.push(['info', `최근 4주 주 ${r1(days28)}회`, '같은 볼륨이면 근육 크기는 빈도 영향이 작지만, 근력은 같은 동작을 주 2–3회 나눠 할수록 더 올랐어요. 메인 종목은 1–6회 무겁게, 보조 종목은 8–12회로.', 'Pelland 2024']);
  } else if (key === 'health') {
    items.push([carMin >= 150 ? 'good' : 'info', `유산소 최근 7일 ${carMin}분`, carMin >= 150 ? '권장량(주 150–300분) 안이에요.' : '권장량은 주 150–300분이에요. 빠르게 걷기, 자전거도 포함돼요.', 'WHO 2020']);
    items.push([days28 >= 2 ? 'good' : 'info', `근력운동 주 ${r1(days28)}회`, '큰 근육을 쓰는 근력운동 주 2회 이상이 권장돼요. 무겁지 않아도 돼요.', 'WHO 2020']);
  } else if (base === 'cut') {
    if (key === 'contest') items.push(['info', '컷팅 속도', '이미 마른 상태일수록 천천히 빼야 근육을 지켜요. 엘리트 선수 연구에서 주 0.7%씩 뺀 그룹은 근육이 늘었고, 1.4%씩 뺀 그룹은 그대로였어요. 바디 탭 체중 추세로 속도를 확인하세요.', 'Garthe 2011']);
    const p = progItem('감량 중엔 세트를 줄이더라도 무게(강도)를 지키는 게 근육 유지의 핵심이에요. 피곤하면 세트부터 줄이세요.'); if (p) items.push(p);
    if (wkSets >= 0.5) items.push(['info', `주 ${r1(wkSets)}세트 (직접)`, '감량 중엔 평소 볼륨의 1/3 정도로 줄여도 근육 크기는 유지됐어요. 세트를 늘리기보다 무거운 무게를 남겨두세요.', 'Bickel 2011']);
    const vh = vfl != null && vfl >= 10;
    items.push([carMin >= 150 ? 'good' : 'info', `유산소 최근 7일 ${carMin}분`, `${carMin >= 150 ? '건강 권장량(주 150–300분) 안이에요.' : `건강 권장량은 주 150–300분이에요(빠르게 걷기 포함).`}${vh ? ` 내장지방레벨이 ${trimNum(vfl)}이라 유산소 비중을 두는 게 좋아요. 체중이 그대로여도 유산소는 내장지방을 줄였어요.` : ''}`, vh ? 'WHO 2020 · Vissers 2013' : 'WHO 2020']);
  } else if (key === 'recomp') {
    if (days28 > 0) items.push([days28 >= 3 ? 'good' : 'info', `최근 4주 주 ${r1(days28)}회 근력운동`, days28 >= 3 ? '체형 바꾸기는 꾸준함이 제일 중요해요. 잘 하고 있어요.' : '체형 바꾸기는 칼로리 차이가 작아서 운동 자극이 근육 쪽으로 가게 하는 게 핵심이에요. 주 3회 이상이 좋아요.', 'Barakat 2020']);
    const p = progItem('유지 칼로리 근처에서는 무게를 조금씩 올리는 게 근육이 늘고 있다는 신호예요. 단백질(몸 탭 목표)도 확인하세요.'); if (p) items.push(p);
    if (lowRegs.length) items.push(['info', `볼륨 여유: ${regTxt(lowRegs)}`, '하던 근육 안에서 상대적으로 적게 한 부위예요(앱 기준). 체형을 바꾸고 싶은 부위라면 여기에 세트를 더하세요.']);
  } else if (key === 'keep') {
    if (days28 > 0) items.push([days28 >= 2 ? 'good' : 'info', `최근 4주 주 ${r1(days28)}회`, '유지만 할 땐 주 1–2회, 부위당 몇 세트라도 무게를 지키면 근육과 힘이 거의 그대로 유지돼요. 바쁜 주엔 횟수보다 무게를 지키세요.', 'Bickel 2011']);
    const p = progItem('유지 목표에선 무게가 떨어지지 않는 게 기준이에요.'); if (p) items.push(p);
  } else {
    const fast = key === 'bulk';
    if (lowRegs.length) items.push(['info', `더 키울 여지: ${regTxt(lowRegs)}`, `하던 근육 안에서 상대적으로 적게 한 부위예요(앱 기준). 증량 중엔 늘린 칼로리를 근육으로 보내려면 볼륨이 받쳐줘야 해요. 키우고 싶은 부위부터 주 2–4세트씩 올려 범위(대략 주 10–20세트, 근육 단위)에 넣어보세요.`, 'Schoenfeld 2017 · Pelland 2024']);
    else if (wkSets) items.push(['good', `하던 부위 모두 범위 안 · 주 ${r1(wkSets)}세트`, '볼륨은 충분해요. 이제는 같은 세트에서 무게·횟수를 올리는 게 우선이에요.']);
    const flat = prog.filter(r => r.status === 'flat' || r.status === 'down');
    if (prog.length) items.push(flat.length > prog.length / 2 ? ['warn', `정체·하락 ${flat.length}/${prog.length}종목`, `${fast ? '빠르게' : '천천히'} 증량 중인데 기록이 안 오르면 칼로리가 부족하거나 회복이 안 되는 경우가 많아요. 체중 추세(몸 탭)를 같이 보세요.`] : ['good', `오른 종목 ${up.length}/${prog.length}`, '증량하면서 무게도 오르고 있어요. 늘린 체중이 근육으로 가고 있다는 신호예요.']);
  }
  if (!items.length) return '';
  return `<div class="sec-h"><h2>목표에 맞춘 운동</h2><span class="aside">목표: ${esc(G.l)} · 몸 탭에서 변경</span></div><section class="card">
    ${items.map(([lv, t, d, src]) => `<div class="mixtip"><b><span class="status ${lv}">${ICON[lv]}</span> ${esc(t)}</b><div class="d">${esc(d)}</div>${src ? `<div class="src">근거: ${esc(src)}</div>` : ''}</div>`).join('')}
  </section>`;
}

/* ---------- training / rest cycle ----------
   Reads the last 6 weeks as runs of training days and rest days, finds the usual pattern (e.g. 4 on · 2 off),
   and checks whether one rest day fewer still leaves every body part 2+ days between sessions.
   One rest day fewer = the same routine more often, so weekly sets rise by cycle/(cycle−1). */
const CYCLE_MS = ['가슴', '등', '어깨', '다리', '팔'];
function restCycle(R, prog) {
  const t = today(), from = addDays(t, -41);
  const ss = setsBetween(from, t).filter(s => !isCardioSet(s));
  const dayN = {}; for (const s of ss) dayN[s.date] = (dayN[s.date] || 0) + 1;
  const days = Object.keys(dayN).filter(k => dayN[k] >= 3).sort();
  if (days.length < 3) return null;
  // runs from the first training day to today
  const runs = []; let k = days[0];
  while (k <= t) { const on = !!dayN[k] && dayN[k] >= 3, last = runs[runs.length - 1]; if (last && last.on === on) last.n++; else runs.push({ on, n: 1, start: k }); k = addDays(k, 1); }
  const onR = runs.filter(r => r.on), offR = runs.filter(r => !r.on);
  if (!onR.length || !offR.length) return null;
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor((b.length - 1) / 2)]; };
  // a rest run still going today counts only once it is as long as the usual one, or it's the only one
  const lastOpen = !runs[runs.length - 1].on;
  const closedOff = offR.slice(0, lastOpen ? -1 : undefined).map(r => r.n);
  // a training run still going (ends today or yesterday) isn't finished yet — leave it out of the usual length
  const lastRun = runs[runs.length - 1], openOn = lastRun.on && onR.length > 1;
  const on = med((openOn ? onR.slice(0, -1) : onR).map(r => r.n)), off = closedOff.length ? med(closedOff) : offR[offR.length - 1].n;
  if (on > 7 || off > 6) return { irregular: true, on, off };
  const cycle = on + off;
  // where each part sits inside the latest full training run
  const block = onR[onR.length - 1].n >= on ? onR[onR.length - 1] : onR.find(r => r.n >= on) || onR[onR.length - 1];
  const pos = {};
  for (let i = 0; i < block.n; i++) { const d = addDays(block.start, i); for (const m of CYCLE_MS) if (ss.filter(s => s.date === d && s.m === m).length >= 2) (pos[m] = pos[m] || []).push(i); }
  const gapOf = (m, offDays) => { const p = pos[m]; if (!p) return null; let g = (p[0] + block.n - p[p.length - 1]) + offDays; for (let i = 1; i < p.length; i++) g = Math.min(g, p[i] - p[i - 1]); return g; };
  const parts = CYCLE_MS.filter(m => pos[m]).map(m => ({ m, gap: gapOf(m, off), gapLess: off > 1 ? gapOf(m, off - 1) : null, perCycle: pos[m].length }));
  const tooClose = parts.filter(p => p.gap < 2 && p.m !== '팔'); // biceps one day, triceps the next is normal
  // weekly sets now and with one rest day fewer
  const scale = off > 1 ? cycle / (cycle - 1) : 1;
  const proj = STRENGTH_MUSCLES.filter(m => R.mv14.dW[m] >= 0.5).map(m => { const [lo, hi] = volRange(m); return { m, now: R.mv14.dW[m], next: R.mv14.dW[m] * scale, totNow: R.mv14.vol[m], hi }; });
  const c = st => prog.filter(p => p.status === st).length, slipping = c('down') > c('up') || R.dl.level === 'bad' || R.dl.level === 'warn';
  let verdict, lv;
  if (tooClose.length) { verdict = `${jo(tooClose.map(p => mName(p.m)).join('·'), '을', '를')} 하루 만에 다시 해요. 같은 부위는 이틀 이상 띄우세요`; lv = 'warn'; }
  else if (off >= 2 && slipping) { verdict = `무게가 떨어지는 종목이 있어서 지금처럼 ${off}일 쉬는 게 나아요`; lv = 'info'; }
  else if (off >= 2 && parts.every(p => p.gapLess == null || p.gapLess >= 2)) { verdict = `${off - 1 === 1 ? '하루' : off - 1 === 2 ? '이틀' : `${off - 1}일`}만 쉬어도 돼요 — 주간 세트 약 +${Math.round((scale - 1) * 100)}%`; lv = 'good'; }
  else if (off === 1 && slipping) { verdict = '무게가 떨어지는 종목이 늘었어요. 피곤하면 하루 더 쉬어보세요'; lv = 'warn'; }
  else { verdict = '지금 주기가 적당해요'; lv = 'good'; }
  return { on, off, cycle, parts, proj, scale, verdict, lv, slipping, cycles: onR.length };
}
/* ---------- routine check: exercise order, load per session, and the split itself ---------- */
const COMPOUND = new Set(['벤치프레스', '인클라인 프레스', '체스트 프레스', '딥스', '숄더 프레스', '스쿼트', '레그 프레스', '데드리프트', '루마니안 데드리프트', '로우', '랫 풀다운', '풀업', '힙 쓰러스트', '런지']);
function routineCheck(R) {
  const t = today(), from = addDays(t, -13), out = { order: [], heavy: [], split: null };
  // 1) an isolation move before a big move for the same part, on the same day
  const seen = new Set();
  for (let k = from; k <= t; k = addDays(k, 1)) {
    const ss = (dayRO(k).sets || []).filter(s => !isCardioSet(s)); if (ss.length < 3) continue;
    const first = {}; ss.map((s, i) => [s, s.t || i]).sort((a, b) => a[1] - b[1]).forEach(([s], i) => { if (first[s.eq] == null) first[s.eq] = { i, s }; });
    const list = Object.values(first).sort((a, b) => a.i - b.i);
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const iso = list[a].s, big = list[b].s;
      if (iso.m === big.m && !COMPOUND.has(iso.type) && COMPOUND.has(big.type)) { const key = iso.eq + big.eq; if (!seen.has(key)) { seen.add(key); out.order.push({ k, iso: iso.name, big: big.name }); } }
    }
    // 2) lots of direct sets for one part in one go
    const n = {}; for (const s of ss) n[s.m] = (n[s.m] || 0) + 1;
    for (const [m, c] of Object.entries(n)) if (c >= 13 && m !== '코어') out.heavy.push({ k, m, c });
  }
  // 3) the split: same weekly sets spread over other splits, same training days
  const own = ownOrder(addDays(t, 1)), C = restCycle(R, progression());
  if (own && C && !C.irregular) {
    const perWeek = C.on * 7 / C.cycle, main = ['가슴', '등', '다리'];
    const freqNow = m => { const p = C.parts.find(x => x.m === m); return p ? p.perCycle * 7 / C.cycle : 0; };
    // now: what was actually done per session; the others: the same weekly sets spread over their frequency
    const ss14 = setsBetween(from, t).filter(x => !isCardioSet(x));
    const actual = m => { const per = {}; for (const x of ss14) if (x.m === m) per[x.date] = (per[x.date] || 0) + 1; const v = Object.values(per).filter(c => c >= 3); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : null; };
    const weekly = m => { const a = actual(m), f = freqNow(m); return a != null && f ? a * f : R.mv14.dW[m]; };
    const opt = (l, f, now) => ({ l, f, per: main.map(m => ({ m, v: now ? actual(m) : f(m) ? weekly(m) / f(m) : null })) });
    out.split = { perWeek, own: own.cycle, rows: [opt(`지금 · ${own.cycle.length}분할`, freqNow, true), opt('3분할 (밀기·당기기·하체)', () => perWeek / 3), opt('상하체 2분할', () => perWeek / 2)] };
  }
  return out;
}
function routineCheckHtml(R) {
  const X = routineCheck(R), items = [];
  if (X.order.length) items.push(['info', '작은 운동을 큰 운동보다 먼저 했어요', `${X.order.slice(0, 3).map(o => `${shortDate(o.k)} ${o.iso} → ${o.big}`).join(' · ')}. 큰 종목을 먼저 해야 무거운 무게를 쓸 수 있어요. 일부러 한 게 아니면 순서를 바꿔보세요.`]);
  const hv = {}; for (const h of X.heavy) if (!hv[h.m] || hv[h.m].c < h.c) hv[h.m] = h;
  const hl = Object.values(hv);
  if (hl.length) items.push(['info', `한 번에 13세트 넘게 한 부위: ${hl.map(h => `${mName(h.m)} ${h.c}`).join(' · ')}`, '한 세션에 한 부위를 많이 하면 뒤쪽 세트는 무게·횟수가 떨어지기 쉬워요. 무게가 정체되면 아래 분할 비교를 참고하세요.']);
  let tbl = '';
  if (X.split) {
    const S = X.split, cur = S.rows[0], over = cur.per.filter(p => p.v != null && p.v >= 13);
    tbl = `<div class="rp-k">분할 비교 · 주간 세트와 운동일(주 ${r1(S.perWeek)}일)은 그대로 둘 때</div>
      <div class="small muted" style="margin-bottom:4px">지금 순서: ${esc(S.own.join(' → '))}</div>
      <div class="split-t"><div class="sh"><span>분할</span>${cur.per.map(p => `<span>${esc(mName(p.m))}</span>`).join('')}</div>
      ${S.rows.map((r, i) => `<div class="${i ? '' : 'now'}"><span>${esc(r.l)}<em>부위당 주 ${r1(r.f(cur.per[0].m) || 0)}회</em></span>${r.per.map(p => `<b class="num">${p.v == null ? '–' : r1(p.v)}</b>`).join('')}</div>`).join('')}</div>
      <div class="small muted" style="margin-top:4px">숫자 = 한 번 운동할 때 그 부위 세트 수</div>
      <div class="verdict ${over.length ? 'info' : ''}" style="margin-top:8px"><div class="vt"><span class="status ${over.length ? 'info' : 'good'}">${ICON[over.length ? 'info' : 'good']} ${over.length ? `${esc(jo(over.map(p => mName(p.m)).join('·'), '을', '를'))} 한 번에 몰아서 해요` : '지금 분할 유지해도 돼요'}</span></div>
        <div class="small" style="margin-top:4px">${over.length ? '주간 세트가 같으면 분할 방식에 따른 근육 차이는 작아요. 다만 한 번에 13세트 넘게 하면 뒤쪽 세트 질이 떨어지기 쉬워서, 무게가 정체될 때 3분할이나 상하체로 나누면 한 번 부담이 줄어요.' : '주간 세트가 같으면 분할 방식에 따른 근육 차이는 작아요. 일정과 운동 시간에 맞는 쪽을 고르면 돼요.'}</div>
        <div class="grid2" style="margin-top:8px"><button class="btn sm" data-act="prog-open" data-p="ul4">상하체 루틴 보기</button><button class="btn sm" data-act="prog-open" data-p="ppl">3분할(PPL) 보기</button></div></div>`;
  }
  if (!items.length && !tbl) return '';
  const body = `<section class="card">${items.map(([lv, t, d]) => `<div class="mixtip"><b><span class="status ${lv}">${ICON[lv]}</span> ${esc(t)}</b><div class="d">${esc(d)}</div></div>`).join('')}${tbl}</section>`;
  return fold('routine', '루틴 점검', items.length ? `짚을 곳 ${items.length}개` : '분할 비교', body, false);
}
function restCycleHtml(C) {
  if (!C) return '';
  if (C.irregular) return fold('cycle', '운동·휴식 주기', '불규칙', `<section class="card"><div class="small">운동한 날과 쉰 날이 일정하지 않아서 주기를 판단하기 어려워요.</div></section>`, false);
  const fewer = C.lv === 'good' && C.scale > 1;
  const high = C.proj.filter(p => p.totNow > p.hi); // already high-volume today
  const body = `<section class="card">
    <div class="cy-now"><b>${C.on}일 운동 · ${C.off}일 휴식</b><span class="small muted">${C.cycle}일 주기${C.cycles < 2 ? ' · 기록 한 바퀴' : ''}</span></div>
    <div class="cy-parts">${C.parts.map(p => `<span>${esc(mName(p.m))} <b class="num">${p.gap}일</b>마다</span>`).join('')}</div>
    <div class="verdict ${C.lv === 'good' ? '' : C.lv}" style="margin-top:10px"><div class="vt"><span class="status ${C.lv}">${ICON[C.lv]} ${esc(C.verdict)}</span></div>
      ${fewer ? `<ul><li>같은 부위 사이가 지금 ${Math.min(...C.parts.map(p => p.gap))}일 이상이라, 하루 줄여도 모두 이틀 넘게 쉬어요.</li>
        <li>주간 세트(직접): ${C.proj.slice(0, 5).map(p => `${esc(mName(p.m))} ${Math.round(p.now)}→${Math.round(p.next)}`).join(' · ')}</li>
        ${high.length ? `<li>${esc(jo(high.map(p => mName(p.m)).join('·'), '은', '는'))} 이미 많은 편이라 그날 2–3세트 줄이세요.</li>` : ''}
        <li>2–3주 해보고 무게가 떨어지는 종목이 늘면 다시 ${C.off === 2 ? '이틀' : `${C.off}일`}로.</li></ul>` : ''}
    </div></section>`;
  return fold('cycle', '운동·휴식 주기', esc(C.verdict.split(' — ')[0]), body, C.lv !== 'good' || fewer);
}
/* ---------- period report (a month, or the last 4 weeks) ----------
   Puts body change (InBody, body weight) next to the training that produced it and says whether the
   two together point the way the chosen goal needs. Changes inside measurement noise are called that. */
function periodReport(a, b) {
  const t = today(); if (b > t) b = t;
  // weekly figures count from the first workout, not from an empty start of the window
  const first = (allSets().find(s => !isCardioSet(s)) || {}).date; if (first && first > a && first <= b) a = first;
  const days = Math.max(7, daysBetween(a, b) + 1), wk = days / 7;
  const all = setsBetween(a, b), str = all.filter(s => !isCardioSet(s));
  const perDay = {}; for (const s of str) perDay[s.date] = (perDay[s.date] || 0) + 1;
  const sess = Object.keys(perDay).filter(k => perDay[k] >= 3).sort();
  const perWeek = sess.length / wk;
  const carMin = all.filter(isCardioSet).reduce((x, s) => x + (+s.mins || 0), 0);
  const mv = muscleVolume(str);
  const parts = STRENGTH_MUSCLES.map(m => { const v = mv.direct[m] / wk, tot = mv.vol[m] / wk, [lo, hi] = volRange(m); return { m, v, tot, lo, hi, st: v < 0.5 ? 'none' : tot < lo ? 'low' : tot > hi ? 'high' : 'ok' }; });
  // strength: first vs last session of each exercise done 2+ times in the period
  const byEq = {}; for (const s of str) (byEq[s.eq] = byEq[s.eq] || []).push(s);
  const lifts = Object.entries(byEq).map(([eq, list]) => {
    const ds = [...new Set(list.map(s => s.date))].sort(); if (ds.length < 2) return null;
    const bw = list.every(s => !(setKg(s) > 0)), score = s => bw ? +s.r || 0 : setE1(s);
    const f = Math.max(...list.filter(s => s.date === ds[0]).map(score)), l = Math.max(...list.filter(s => s.date === ds[ds.length - 1]).map(score));
    if (!f || !l) return null;
    const pct = (l - f) / f, e = eqById(eq) || list[0];
    const st = pct >= 0.02 ? 'up' : pct <= -0.03 ? 'down' : 'flat', order = st === 'down' ? orderShift(eq, ds[ds.length - 1], ds[0]) : null;
    return { name: e.name, n: list.length, bw, f, l, pct, st: order ? 'flat' : st, order };
  }).filter(Boolean).sort((x, y) => y.n - x.n).slice(0, 6);
  const up = lifts.filter(x => x.st === 'up').length, down = lifts.filter(x => x.st === 'down').length;
  // body: InBody pair inside (or just around) the period, and the body-weight slope
  const ibl = DB.inbody.slice().filter(e => e.date >= addDays(a, -14) && e.date <= b && e.muscle != null && e.fatKg != null).sort((x, y) => (x.date < y.date ? -1 : 1));
  const ibPair = ibl.length >= 2 && daysBetween(ibl[0].date, ibl[ibl.length - 1].date) >= 14 ? [ibl[0], ibl[ibl.length - 1]] : null;
  const ibv = ibPair ? inbodyGoalFeedback(ibPair) : null;
  const pts = weightSeries().filter(x => x.date >= a && x.date <= b);
  let wpct = null, wd = null;
  if (pts.length >= 4 && daysBetween(pts[0].date, pts[pts.length - 1].date) >= 10) {
    const xs = pts.map(x => daysBetween(pts[0].date, x.date)), ys = pts.map(x => x.w), n = pts.length;
    const mx = xs.reduce((p, q) => p + q, 0) / n, my = ys.reduce((p, q) => p + q, 0) / n;
    let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    wd = den ? num / den * 7 : 0; wpct = wd / my * 100;
  }
  const wv = wpct != null ? weightVerdict(wpct) : null;
  return { a, b, days, wk, sess, perWeek, carMin, parts, lifts, up, down, ibPair, ibv, wpct, wd, wv, nSets: str.length };
}
function reportHtml(P) {
  const gk = goalKey(), key = goalBase(gk), G = GOALS[gk];
  const low = P.parts.filter(p => (p.st === 'low' || p.st === 'none') && ['가슴', '등', '어깨', '다리'].includes(p.m));
  const high = P.parts.filter(p => p.st === 'high');
  const minFreq = gk === 'health' ? 2 : 2.5;
  const trainOk = P.perWeek >= minFreq && low.length <= 1 && P.down <= P.up;
  const body = P.ibv ? P.ibv.lv : P.wv ? P.wv.lv : null; // good / warn / info / null
  // the verdict: body change and training read together
  let lv, head, why;
  if (P.sess.length < 4 || P.days < 14) { lv = 'info'; head = '아직 판단하기엔 기록이 적어요'; why = `기록 ${P.days}일치 · 운동한 날 ${P.sess.length}일. 아래 숫자는 참고로 보고, 2주 이상 쌓이면 방향을 판단해요.`; }
  else if (body === 'good' && trainOk) { lv = 'good'; head = `${G.l} 목표대로 가고 있어요`; why = '몸 변화와 운동량이 둘 다 목표 방향이에요.'; }
  else if (body === 'good') { lv = 'info'; head = '몸은 목표대로, 운동은 더 채울 곳이 있어요'; why = '지금 변화를 이어가려면 아래 "고칠 점"의 운동 쪽을 채우세요.'; }
  else if (body === 'warn' && trainOk) { lv = 'warn'; head = '운동은 충분한데 몸 변화가 목표와 달라요'; why = `운동량과 무게는 괜찮아서 원인은 식사(칼로리·단백질) 쪽일 가능성이 커요.`; }
  else if (body === 'warn') { lv = 'warn'; head = '몸 변화도 운동량도 목표와 어긋나요'; why = '운동 빈도와 세트부터 채우고, 그다음 식사를 조정하세요.'; }
  else if (trainOk) { lv = 'good'; head = '운동은 목표에 맞게 하고 있어요'; why = '몸 변화는 인바디를 4주 간격으로 재거나 아침 체중을 주 3회 이상 적으면 같이 판단해요.'; }
  else { lv = 'info'; head = '운동량을 조금 더 채우면 좋아요'; why = '몸 변화는 인바디나 아침 체중을 기록하면 같이 판단해요.'; }

  const good = [], fix = [], todo = [];
  if (P.perWeek >= minFreq) good.push(`주 ${r1(P.perWeek)}회 꾸준히 운동했어요`); else fix.push(`운동 빈도가 주 ${r1(P.perWeek)}회예요 — 주 ${Math.ceil(minFreq)}회 이상이 목표예요`);
  if (P.up) good.push(`${P.up}개 종목에서 힘이 늘었어요${key === 'cut' ? ' — 감량 중 근육이 유지되고 있다는 신호예요' : ''}`);
  if (P.down > P.up) fix.push(`힘이 떨어진 종목이 ${P.down}개예요 — ${key === 'cut' ? '감량 속도가 빠르거나 단백질이 부족할 수 있어요' : '잠·회복과 세트 수를 점검하세요'}`);
  for (const p of low) fix.push(p.st === 'none' ? `${jo(mName(p.m), '을', '를')} 직접 한 세트가 없어요` : `${mName(p.m)} 주 ${r1(p.tot)}세트 — 주 ${p.lo}세트 이상이 효과 범위예요`);
  if (!low.length && P.sess.length >= 4) good.push('주요 부위 모두 효과적인 세트 범위예요');
  for (const p of high) fix.push(`${mName(p.m)} 주 ${r1(p.tot)}세트로 많은 편이에요 — 피곤하면 이 부위부터 줄이세요`);
  if ((gk === 'health' || key === 'cut') && P.carMin / P.wk < 150) fix.push(`유산소 주 ${Math.round(P.carMin / P.wk)}분 — 주 150분 이상 권장`);
  if (P.ibv) (P.ibv.lv === 'good' ? good : fix).push(`인바디: ${P.ibv.t}`);
  else if (P.wv) (P.wv.lv === 'good' ? good : fix).push(`체중: ${P.wv.t}`);
  // next month: at most three concrete things
  if (low.length) todo.push(`${low.slice(0, 2).map(p => mName(p.m)).join('·')} 주 ${Math.max(...low.slice(0, 2).map(p => Math.ceil(p.lo - p.tot)))}세트씩 더하기`);
  if (P.perWeek < minFreq) todo.push(`주 ${Math.ceil(minFreq)}회 운동 맞추기`);
  // InBody outranks the scale: weight can drop while muscle goes up
  if (P.ibv) { if (P.ibv.lv !== 'good') todo.push(P.ibv.a); }
  else if (P.wv && P.wv.lv !== 'good') todo.push(P.wv.a);
  if (!P.ibPair) todo.push('4주 뒤 같은 조건(아침 공복)으로 인바디 재기');
  if (P.down > P.up) todo.push('무게가 떨어진 종목은 세트를 1개 줄이고 무게를 지키기');
  if (!todo.length) todo.push('지금 루틴 그대로, 종목마다 범위 위쪽 횟수를 채우면 무게 올리기');

  const d = (x, u, inv) => { const v = r1(x); const c = Math.abs(x) < (u === 'kg' ? 0.5 : 0.5) ? 'muted' : (x > 0) !== !!inv ? 'up' : 'dn'; return `<b class="num ${c}">${v > 0 ? '+' : ''}${v}${u}</b>`; };
  let bodyH = '';
  if (P.ibPair) {
    const [x, y] = P.ibPair;
    bodyH = `<div class="rp-k">몸 변화 · 인바디 ${shortDate(x.date)} → ${shortDate(y.date)}</div><div class="rp-grid">
      ${x.weight && y.weight ? `<div><span>체중</span>${d(y.weight - x.weight, 'kg')}</div>` : ''}
      <div><span>골격근</span>${d(y.muscle - x.muscle, 'kg')}</div><div><span>체지방</span>${d(y.fatKg - x.fatKg, 'kg', true)}</div>
      ${x.fatPct && y.fatPct ? `<div><span>체지방률</span>${d(y.fatPct - x.fatPct, '%p', true)}</div>` : ''}</div>
      <div class="note">±0.5kg 안의 변화는 측정 오차일 수 있어요.</div>`;
  } else if (P.wd != null) bodyH = `<div class="rp-k">몸 변화 · 아침 체중</div><div class="rp-grid"><div><span>주당 변화</span>${d(P.wd, 'kg')}</div><div><span>목표 속도</span><b class="num">${pctTxt(G.rate[0])} ~ ${pctTxt(G.rate[1])}</b></div></div>`;
  else bodyH = `<div class="rp-k">몸 변화</div><div class="small muted">이 기간엔 인바디 2회(2주 이상 간격)나 아침 체중 기록이 없어서 몸 쪽은 판단하지 못했어요.</div>`;

  const liftH = P.lifts.length ? `<div class="rp-k">힘 변화 · 처음 → 마지막</div>${P.lifts.map(x => `<div class="rp-lift"><span>${esc(x.name)}${x.order ? ` <em class="was">순서 ${x.order.from}→${x.order.to}번째</em>` : ''}</span><span class="num">${x.bw ? `${x.f}회 → ${x.l}회` : `${r1(x.f)} → ${r1(x.l)}kg`}</span><b class="num ${x.st === 'up' ? 'up' : x.st === 'down' ? 'dn' : 'muted'}">${x.pct > 0 ? '+' : ''}${Math.round(x.pct * 100)}%</b></div>`).join('')}<div class="note">무게는 추정 1RM(무게·횟수로 계산한 최대 무게)이에요.</div>` : '';
  const partH = `<div class="rp-k">부위별 주평균 세트</div><div class="rp-parts">${P.parts.filter(p => p.st !== 'none' || ['가슴', '등', '어깨', '다리'].includes(p.m)).map(p => `<span class="${p.st}">${esc(mName(p.m))} <b class="num">${r1(p.tot)}</b></span>`).join('')}</div>`;
  const list = (k, arr, cls) => arr.length ? `<div class="rp-k">${k}</div><ul class="rp-list ${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  return `<div class="verdict ${lv === 'good' ? '' : lv}"><div class="vt"><span class="status ${lv}">${ICON[lv]} ${esc(head)}</span></div><div class="small" style="margin-top:4px">${esc(why)}</div></div>
    <div class="tiles fin-tiles" style="margin-top:10px">${[[`${P.sess.length}일`, '운동한 날'], [`${r1(P.perWeek)}회`, '주 평균'], [fmtInt(P.nSets), '근력 세트'], [`${fmtInt(P.carMin)}분`, '유산소']].map(([v, l]) => `<div class="tile"><div class="k">${l}</div><div class="v">${v}</div></div>`).join('')}</div>
    ${bodyH}${partH}${liftH}
    ${list('잘한 점', good, 'good')}${list('고칠 점', fix, 'fix')}${list('다음 달 할 일', todo.slice(0, 3), 'todo')}`;
}
function openReport(a, b, title) {
  openSheet(title, `${shortDate(a)}–${shortDate(b > today() ? today() : b)} 리포트`, reportHtml(periodReport(a, b)), { kind: 'report' });
}
/* a section that folds: the title row shows the conclusion, the body opens on tap. Open state is kept per section. */
function fold(key, title, aside, body, defOpen) {
  const open = state.fold && key in state.fold ? state.fold[key] : !!defOpen;
  return `<details class="fold" data-fold="${key}" ${open ? 'open' : ''}><summary class="sec-h"><h2>${title}</h2><span class="aside">${aside}</span></summary>${body}</details>`;
}
/* the analysis tab's top: three answers before any chart */
function glanceHtml(R, prog) {
  const rows = [];
  if (allSets().filter(s => !isCardioSet(s)).length < 5) return '';
  // 1) muscles short of the effective range (last 2 weeks, weekly)
  if (R.dl.inDeload) rows.push(['부위', '디로딩 주간이라 볼륨은 낮은 게 정상', 'good']);
  else {
    const short = STRENGTH_MUSCLES.filter(m => m !== '코어' && m !== '팔').map(m => { const v = R.mv14.vol[m], [lo] = volRange(m); return { m, v, lo, gap: lo - v, none: R.mv14.dW[m] < 0.5 }; }).filter(x => x.gap >= 2).sort((a, b) => b.gap - a.gap);
    rows.push(['부위', short.length ? short.slice(0, 3).map(x => `${mName(x.m)} ${x.none ? '안 함' : `${Math.ceil(x.gap)}세트 부족`}`).join(' · ') : '주요 부위 모두 효과 범위', short.length ? 'warn' : 'good']);
  }
  // 2) fatigue
  rows.push(['피로', R.dl.level === 'bad' ? '디로딩 필요' : R.dl.level === 'warn' ? '디로딩 미리 계획' : R.dl.level === 'info' ? '판단까지 기록이 더 필요' : '쉬지 않아도 돼요', R.dl.level === 'bad' ? 'bad' : R.dl.level === 'warn' ? 'warn' : R.dl.level === 'info' ? 'info' : 'good']);
  // 3) weights
  const c = st => prog.filter(p => p.status === st).length, up = c('up'), flat = c('flat'), dn = c('down');
  if (up + flat + dn) rows.push(['무게', [up ? `상승 ${up}` : '', flat ? `정체 ${flat}` : '', dn ? `하락 ${dn}` : ''].filter(Boolean).join(' · ') + '종목', dn > up || flat > up ? 'warn' : 'good']);
  // 4) rest pattern
  const C = restCycle(R, prog);
  if (C && !C.irregular) rows.push(['휴식', C.verdict.split(' — ')[0], C.lv]);
  // 5) next session
  const N = recommendNext(today());
  if (N && !N.first) rows.push(['다음', N.own ? `${N.rest ? '쉬거나 ' : ''}${N.own.l} (내 순서)` : N.best ? `${N.rest ? '쉬거나 ' : ''}${N.best.l}${N.addSh ? ' + 옆·뒤 어깨' : ''}` : '쉬는 날', 'info']);
  return `<section class="card glance">${rows.map(([k, v, lv]) => `<div class="gl"><span class="k">${k}</span><span class="status ${lv}">${ICON[lv]}</span><b>${esc(v)}</b></div>`).join('')}</section>`;
}
function viewAnalysis() {
  const R = buildReport(), dl = R.dl, ws = dl.cur, ES = energySummary(7);
  const prog = progression();
  let h = `<div class="sec-h" style="margin-top:4px"><h2>한눈에 보기</h2><span class="aside">${shortDate(R.range[0])}–${shortDate(R.range[1])} (최근 7일)</span></div>
  ${glanceHtml(R, prog)}
  ${allSets().some(s => !isCardioSet(s)) ? `<button class="btn block rp-open" data-act="report-open" data-a="${addDays(today(), -27)}" data-b="${today()}" data-t="최근 4주">최근 4주 리포트 — 목표대로 가고 있나요?</button>` : ''}
  <div class="tiles">
    <div class="tile"><div class="k">운동한 날</div><div class="v">${ws.sessions}<small>/7일</small></div></div>
    <div class="tile"><div class="k">근력 세트</div><div class="v">${ws.sets}<small>세트</small></div></div>
    <div class="tile"><div class="k">총 볼륨</div><div class="v">${fmtInt(ws.tonnage)}<small>kg</small></div></div>
    <div class="tile"><div class="k">운동 소모 (7일)</div><div class="v">${fmtInt(ES.ex)}<small>kcal</small></div></div>
  </div>
  <section class="card" style="margin-top:10px"><h3>할 일 · 우선순위 순</h3>
    ${R.recs.length ? R.recs.slice(0, 7).map((r, i) => `${i === 3 ? `<details class="more"><summary>${Math.min(7, R.recs.length) - 3}개 더 보기</summary>` : ''}<div class="rec"><div class="ic ${r.lv}" aria-hidden="true">${ICON[r.lv]}</div><div>
      <div class="t">${esc(r.t)} <span class="status ${r.lv}">· ${LV_LABEL[r.lv]}</span></div>
      <div class="d">${esc(r.d)}</div>${r.act ? `<div class="a">→ ${esc(r.act)}</div>` : ''}${r.src ? `<div class="src">근거: ${esc(r.src)}</div>` : ''}</div></div>${i >= 3 && i === Math.min(7, R.recs.length) - 1 ? '</details>' : ''}`).join('')
    : '<div class="small muted">특별히 손볼 부분이 없어요. 지금처럼 꾸준히!</div>'}
  </section>`;

  // body map: which regions got the work
  {
    const days = state.mapP === '28' ? 28 : 7, vals = {};
    for (const s of setsBetween(addDays(today(), -(days - 1)), today())) {
      if (isCardioSet(s)) continue;
      const e = eqById(s.eq) || s;
      for (const [k, v] of Object.entries(regionsOf(e.name || s.name, s.type || e.type, s.m || e.m, s.grip))) vals[k] = (vals[k] || 0) + v;
    }
    const ranked = Object.entries(vals).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]);
    const max = ranked.length ? ranked[0][1] : 0;
    const none = Object.keys(REGIONS).filter(k => !(vals[k] >= 0.5) && !ASSIST_REG.has(k));
    h += `<div class="sec-h"><h2>운동한 부위</h2><div class="seg" style="width:150px">${[['7', '이번 주'], ['28', '4주']].map(([v, l]) => `<button class="${(state.mapP || '7') === v ? 'on' : ''}" data-act="map-p" data-v="${v}">${l}</button>`).join('')}</div></div>
    <section class="card">
      ${ranked.length ? `<div class="bodymaps">${bodySvg('front', vals, max, '앞')}${bodySvg('back', vals, max, '뒤')}</div>
        <div class="heatlegend"><span>적게</span><i style="background:${heatColor(0.15)}"></i><i style="background:${heatColor(0.5)}"></i><i style="background:${heatColor(0.8)}"></i><i style="background:${heatColor(1)}"></i><span>많이</span></div>
        <div class="maprank">${ranked.slice(0, 5).map(([k, v], i) => `<div><b>${i + 1}</b> ${REGIONS[k]} <span class="num">${r1(v)}세트</span></div>`).join('')}</div>
        ${none.length ? `<div class="small muted" style="margin-top:6px">거의 안 한 부위: ${none.map(k => REGIONS[k]).join(' · ')}</div>` : ''}
        <div class="note">세트마다 주로 쓰는 근육 1, 보조 근육 0.5–0.25로 계산해요. 직접 추가한 기구도 이름(인클라인, 하이 로우, 해머 컬 등)과 동작 종류로 어느 부위인지 자동으로 나눠요. 부위를 누르면 세트 수가 보여요.</div>`
      : '<div class="small muted">근력 운동을 기록하면 어느 부위를 했는지 해부도에 색으로 보여줘요.</div>'}
    </section>`;
  }

  // energy expenditure
  {
    const E = ES.E, srcLbl = { inbody: '인바디 기반', formula: '체중·키·나이 기반', avg: '평균 수치 기반' }[E.src];
    const strK = ES.per.reduce((a, x) => a + x.strK, 0), carK = ES.per.reduce((a, x) => a + x.carK, 0);
    h += fold('energy', '칼로리 소모', `하루 평균 ${fmtInt(ES.tdee)}kcal`, `<div class="small muted" style="margin:-4px 0 8px">최근 7일 · ${srcLbl}</div><section class="card">
      <div class="grid3">
        <div><div class="small muted">하루 평균 총 소모</div><div class="num" style="font-weight:900;font-size: 18px">${fmtInt(ES.tdee)}</div><div class="small muted">kcal</div></div>
        <div><div class="small muted">기초대사량</div><div class="num" style="font-weight:800">${fmtInt(E.rmr)}</div><div class="small muted">kcal/일</div></div>
        <div><div class="small muted">운동 (하루 평균)</div><div class="num" style="font-weight:800">${fmtInt(ES.exAvg)}</div><div class="small muted">kcal/일</div></div>
      </div>
      <div style="margin-top:10px">${barChart(ES.per.map(x => ({ label: WD[fromKey(x.k).getDay()], v: x.total, hl: x.k === today(), tip: `${shortDate(x.k)} · 근력 ${fmtInt(x.strK)}kcal(${x.strMin}분)${x.carK ? ` · 유산소 ${fmtInt(x.carK)}kcal(${x.carMin}분)` : ''}` })), { aria: '요일별 운동 칼로리', h: 120 })}</div>
      <div class="small" style="margin-top:4px;color:var(--ink2)">이번 주 운동 ${fmtInt(ES.ex)}kcal = 근력 ${fmtInt(strK)} + 유산소 ${fmtInt(carK)}</div>
      <div class="note">${esc(E.how)}. 운동 소모는 운동 강도표(MET) × 체중 × 시간으로 계산해요: 근력운동 약 5 MET(세트 기록 시간으로 운동 시간 추정), 유산소는 기계에 표시된 칼로리가 있으면 그 값을, 없으면 속도·종류별 MET를 써요. 하루 총 소모 = 기초대사량 × 1.2(일상 생활·소화) + 운동. 측정이 아닌 추정치라 ±10–20% 오차가 있어요. 바디 탭의 섭취 목표도 이 값으로 계산해요.</div></section>`, false);
  }

  // muscle volume: six groups, each opening into its regions (weekly average of the last 2 weeks)
  const RW = (() => { const t = regionTotals(addDays(today(), -13), today()), first = (allSets()[0] || {}).date || today(); const span = Math.min(14, Math.max(7, daysBetween(first, today()) + 1)); for (const k in t) t[k] = t[k] * 7 / span;
    for (const [m, ks] of Object.entries(REG_GROUP)) for (const k of ks) if (t[k] != null && R.mv14.ratio[m]) t[k] *= R.mv14.ratio[m]; return t; })();
  h += goalTrainHtml(R, RW, ES);
  h += `<div class="sec-h"><h2>부위별 주간 세트</h2><span class="aside">최근 2주 주평균 · 누르면 세부 부위</span></div><section class="card">
    ${bandHead(['적음', '효과 범위', '고볼륨'])}
    ${STRENGTH_MUSCLES.map(m => {
      const v = R.mv14.vol[m], dir = R.mv14.dW[m], ind = Math.max(0, v - dir);
      const [lo, hi] = volRange(m), onlyInd = dir < 0.5;
      const lbl = onlyInd ? (ind > 0 ? '간접만' : '안 함') : v < lo ? `${r1(lo - v)}세트 여유` : v > hi ? '고볼륨' : '적정';
      const regs = (REG_GROUP[m] || []).map(k => { const rv = RW[k] || 0, [rlo, rhi] = REG_RANGE[k];
        const tag = ASSIST_REG.has(k) ? (rv < 0.5 ? '' : '협응근') : rv < 0.5 ? '안 함' : rv < rlo ? '적은 편' : '';
        return bandRow({ label: REGIONS[k], sub: tag, v: rv, lo: rlo, hi: rhi, max: rhi * 1.8, text: r1(rv), small: true }); }).join('');
      const row = bandRow({ label: mName(m), sub: lbl, v: dir, ghost: v, lo, hi, max: hi * 1.8, text: `${r1(dir)}${ind >= 0.5 ? `<em>+${r1(ind)}</em>` : ''}` });
      return `<details class="mgrp" ${dir >= 0.5 ? 'open' : ''}><summary>${row}</summary><div class="regs">${regs}</div></details>`;
    }).join('')}
    <details class="more"><summary>읽는 법</summary><div class="note">진한 막대 = 그 부위를 직접 한 세트, 연한 연장 = 다른 운동에 딸려 쓰인 몫(+숫자). 가운데 칸이 연구에서 효과적인 범위(근육당 주 10–20세트, 하체는 14–30, 팔·코어는 6세트부터)예요. 누르면 세부 부위가 열려요 — 세부는 어디에 몰렸는지 보는 참고용이고, 종아리·전완근은 협응근이라 판단하지 않아요.</div></details>${R.dl.inDeload ? '<div class="note">지금은 디로딩 주간이라 낮게 나오는 게 정상이에요.</div>' : ''}
  </section>`;

  h += restCycleHtml(restCycle(R, prog));
  h += routineCheckHtml(R);
  // exercise mix (optional notes)
  const tips = mixTips();
  h += fold('mix', '종목 구성 참고', tips.length ? `짚을 곳 ${tips.length}개` : '고르게 섞여 있어요', `<section class="card">
    ${tips.length ? tips.map((t, i) => `${i === 3 ? `<details class="more"><summary>${tips.length - 3}개 더 보기</summary>` : ''}<div class="mixtip"><div class="row between" style="gap:8px"><b>${mtag(t.m)} ${esc(t.t)}</b></div>
      <div class="d">${esc(t.d)}</div>
      <div class="exs">${t.ex.map(id => eqById(id)).filter(Boolean).map(e => `<button class="chip" data-act="open-set" data-eq="${esc(e.id)}">${esc(e.name)}</button>`).join('')}</div>
      ${t.src ? `<div class="src">근거: ${esc(t.src)}</div>` : ''}</div>${i === tips.length - 1 && i >= 3 ? '</details>' : ''}`).join('')
    : '<div class="small muted">부위 안에서 종목이 고르게 섞여 있어요. 4주 기록이 쌓이면 윗가슴·측면 어깨·햄스트링처럼 빠지기 쉬운 부분을 짚어드려요.</div>'}
    <div class="note">경고가 아니라 참고예요. 목표나 체형에 따라 일부러 안 하는 종목이 있을 수 있어요. 종목을 누르면 바로 기록할 수 있어요.</div></section>`, false);

  // deload
  const vlv = dl.level;
  h += fold('deload', '디로딩 판단', esc(dl.title), `<section class="card">
    ${barChart(dl.weeks.map((x, i) => ({ label: x.w === 0 ? '이번주' : `${x.w}주전`, v: x.sets, hl: x.w === 0, tip: `${shortDate(x.a)}–${shortDate(x.b)} · ${x.sets}세트 · ${x.sessions}회${x.cond != null ? ` · 컨디션 ${r1(x.cond)}` : ''}` })), { aria: '주간 근력 세트 수', ref: dl.peak ? Math.round(dl.peak * .7) : null, refLabel: '고볼륨 기준(최고의 70%)' })}
    <div class="note" style="margin-top:4px">점선 = 고볼륨 기준(8주 중 최고 주의 70%). 막대를 누르면 주간 상세.</div>
    <div class="verdict ${vlv === 'info' ? '' : vlv}" style="margin-top:10px">
      <div class="vt"><span class="status ${vlv}">${ICON[vlv]} ${esc(dl.title)}</span></div>
      ${dl.lowVol && dl.active >= 3 ? `<ul>${dl.okNotes.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : dl.level === 'info' ? `<ul><li>운동한 주가 ${dl.active}주예요. 3주 이상 쌓이면 판단을 시작해요.</li><li>컨디션 체크(운동 탭)를 같이 기록하면 더 정확해져요.</li></ul>`
        : `<ul>${dl.reasons.length ? dl.reasons.map(r => `<li>${esc(r)}</li>`).join('') : '<li>누적 피로 신호가 뚜렷하지 않아요.</li>'}${dl.okNotes.map(r => `<li class="muted">${esc(r)}</li>`).join('')}</ul>`}
    </div>
    ${dl.level === 'bad' || dl.level === 'warn' ? `<div class="rx"><div class="k">디로딩 처방 (5–7일)</div><table>
      <tr><td>세트 수</td><td>30–50% 줄이기 → 약 <b>${Math.round(dl.base * .5)}–${Math.round(dl.base * .7)}세트</b> (평소 ${dl.base}세트)</td></tr>
      <tr><td>강도</td><td>무게는 유지하고 RIR 1–3 더 남기기, 또는 무게 약 10% 낮추기</td></tr>
      <tr><td>빈도</td><td>평소 운동 요일 유지 — 완전 휴식보다 가볍게 계속하는 쪽이 근력 유지에 유리</td></tr>
      <tr><td>복귀</td><td>다음 주 원래 볼륨으로, 1–2주에 걸쳐 단계적으로</td></tr></table>
      <div class="note">근거: Bell 외 2022(코치 실무 조사), Coleman 외 2024(1주 완전 휴식은 근비대 이득 없음·하체 근력 다소 불리). 고정 처방이 아니라 출발점이에요.</div></div>` : ''}
  </section>`, vlv === 'bad' || vlv === 'warn');

  // progression
  h += fold('prog', '점진적 과부하', prog.length ? ['up', 'flat', 'down'].map(st => [st, prog.filter(p => p.status === st).length]).filter(x => x[1]).map(([st, n]) => `${{ up: '상승', flat: '정체', down: '하락' }[st]} ${n}`).join(' · ') || '기록 쌓는 중' : '기록 쌓는 중', `<section class="card">
    ${prog.length ? prog.map(p => {
      const lv = p.status === 'up' ? 'good' : p.status === 'down' ? 'bad' : p.status === 'flat' ? 'warn' : 'info';
      const lbl = p.order ? `순서 영향 (${p.order.from}→${p.order.to}번째)` : p.status === 'up' ? `상승 +${Math.round(p.pct * 100)}%` : p.status === 'down' ? `하락 ${Math.round(p.pct * 100)}%` : p.status === 'flat' ? '정체' : p.status === 'idle' ? '최근 한 달 기록 없음' : '기록 쌓는 중';
      return `<div class="prog-row"><div><div class="nm">${esc(p.name)}</div><div class="sub">${esc(p.brand || '')} · ${esc(p.type)} · ${p.sessions}회</div></div>
        <div>${sparkline(p.wk, { color: `var(--m-${MKEY[p.m] || 'full'})` })}</div>
        <div class="st"><span class="status ${lv}">${ICON[lv]} ${lbl}</span><div class="small muted num">${p.rec > 0 ? r1(p.rec) + 'kg' : ''}</div></div></div>`;
    }).join('') : '<div class="small muted">같은 기구로 3회 이상 운동하면 여기에 진행 추이가 보여요.</div>'}
    <div class="note">최근 운동한 2주의 최고 vs 그 전 최고 비교(디로딩 주간은 빼고, 쉰 주는 건너뛰어요). 서로 다른 기구는 무게가 1:1로 같지 않아 기구별로 따로 추적해요.</div>
  </section>`, prog.some(p => p.status === 'flat' || p.status === 'down'));

  // nutrition (hidden while the diet tab is off)
  const nu = R.nu;
  if (SHOW_DIET) {
  h += `<div class="sec-h"><h2>영양 (최근 7일 평균)</h2><span class="aside">${nu.n}일 기록</span></div><section class="card">
    ${nu.n ? `<div class="grid4">
      <div><div class="small muted">칼로리</div><div class="num" style="font-weight:800">${fmtInt(nu.k)}</div></div>
      <div><div class="small muted">단백질</div><div class="num" style="font-weight:800">${Math.round(nu.p)}g</div></div>
      <div><div class="small muted">탄수</div><div class="num" style="font-weight:800">${Math.round(nu.c)}g</div></div>
      <div><div class="small muted">지방</div><div class="num" style="font-weight:800">${Math.round(nu.f)}g</div></div></div>
      ${nu.ppk != null ? `<div class="infobox" style="margin-top:10px">단백질 <b>${r1(nu.ppk)}g/kg</b> (체중 ${nu.bw}kg) · 기준 1.6g/kg <span class="status ${nu.ppk >= 1.6 ? 'good' : 'warn'}">${nu.ppk >= 1.6 ? '✓ 충족' : '! 부족'}</span></div>` : ''}`
      : '<div class="small muted">식단을 기록하면 평균 섭취량이 보여요.</div>'}
  </section>`;
  }

  // stats with period
  const P = state.statP;
  const from = P === 'all' ? '0000-00-00' : addDays(today(), -(+P - 1));
  const ss = setsBetween(from, today()).filter(s => !isCardioSet(s));
  const dset = new Set(ss.map(s => s.date)); const ton = ss.reduce((a, s) => a + setKg(s) * (+s.r || 0), 0);
  const wdc = [0, 0, 0, 0, 0, 0, 0]; for (const d of dset) wdc[fromKey(d).getDay()]++;
  const cardioMin = setsBetween(from, today()).filter(isCardioSet).reduce((a, s) => a + (+s.mins || 0), 0);
  h += fold('stats', '통계', `${{ 7: '7일', 28: '4주', 90: '3개월', all: '전체' }[P]} · ${dset.size}일 운동`, `<div class="seg">${[['7', '7일'], ['28', '4주'], ['90', '3개월'], ['all', '전체']].map(([v, l]) => `<button class="${P === v ? 'on' : ''}" data-act="stat-p" data-v="${v}">${l}</button>`).join('')}</div>
  <div class="tiles" style="margin-top:10px">
    <div class="tile"><div class="k">운동일</div><div class="v">${dset.size}<small>일</small></div></div>
    <div class="tile"><div class="k">근력 세트</div><div class="v">${fmtInt(ss.length)}</div></div>
    <div class="tile"><div class="k">총 볼륨</div><div class="v">${ton >= 100000 ? r1(ton / 1000) + '<small>t</small>' : fmtInt(ton) + '<small>kg</small>'}</div></div>
    <div class="tile"><div class="k">유산소</div><div class="v">${fmtInt(cardioMin)}<small>분</small></div></div>
  </div>
  <section class="card" style="margin-top:10px"><h3>요일별 운동 횟수</h3>
    ${barChart(WD.map((w, i) => ({ label: w, v: wdc[i], tip: `${w}요일 ${wdc[i]}회` })), { aria: '요일별 운동 횟수', h: 130 })}
  </section>`, false);

  // PR board by pattern
  const types = {};
  for (const s of allSets()) { if (isCardioSet(s) || !(setKg(s) > 0 || s.r)) continue; (types[s.type] = types[s.type] || new Set()).add(s.eq); }
  const prs = Object.keys(types).map(t => ({ t, best: prOfType(t), eqs: [...types[t]] })).filter(x => x.best).sort((a, b) => setE1(b.best) - setE1(a.best));
  h += fold('pr', 'PR 보드', prs.length ? `${prs.length}개 패턴` : '아직 없음', `<section class="card">
    ${prs.length ? prs.map(x => {
      const be = eqById(x.best.eq) || x.best;
      const others = x.eqs.filter(id => id !== x.best.eq).map(id => { const p = prOfEq(id), e = eqById(id) || p; return p ? `${e.brand && e.brand !== '프리웨이트' ? e.brand + ' ' : ''}${e.name} ${fmtSetFull(p)}` : ''; }).filter(Boolean);
      return `<div class="prrow"><div class="main"><div class="nm">${esc(x.t)}</div><div class="sub">최고: ${esc(be.brand && be.brand !== '프리웨이트' ? be.brand + ' ' : '')}${esc(be.name)} · ${shortDate(x.best.date)}</div>
        ${others.length ? `<div class="sub">같은 패턴: ${esc(others.join(' / '))}</div>` : ''}</div>
        <div class="v">${esc(fmtSetFull(x.best))}${setE1(x.best) ? `<small>1RM≈${r1(setE1(x.best))}kg</small>` : ''}</div></div>`;
    }).join('') : '<div class="small muted">세트를 기록하면 패턴별 최고 기록이 모여요.</div>'}
  </section>`, false);

  h += `<div class="note" style="text-align:center;margin:18px 0 6px">분석에 쓴 논문 목록은 설정 → 참고 논문에 있어요. 연구 평균을 옮긴 참고용이고 개인차가 커요.</div>`;
  return h;
}

/* =====================================================================
   12. VIEW — 바디 (InBody)
   ===================================================================== */
/* body goals. rate = target weekly weight change, % of body weight (7-day averages).
   p = protein g/kg, kc = calories as a multiple of maintenance (body weight × 30). */
const GOALS = {
  cut:      { l: '살 빼기', d: '체지방은 줄이고 근육은 지키기', kc: 0.80, p: 1.8, rate: [-1.0, -0.5], src: 'Helms 2014' },
  recomp:   { l: '체형 바꾸기', d: '체중은 그대로 두고 지방은 줄이고 근육은 늘리기', kc: 0.95, p: 1.8, rate: [-0.25, 0.1], src: 'Barakat 2020' },
  keep:     { l: '지금 유지', d: '지금 몸 상태 그대로 유지하기', kc: 1.00, p: 1.6, rate: [-0.3, 0.3], src: 'Morton 2018' },
  leanbulk: { l: '천천히 증량', d: '살은 거의 안 찌게, 근육만 천천히 늘리기', kc: 1.07, p: 1.6, rate: [0.1, 0.25], src: 'Iraki 2019' },
  bulk:     { l: '빠르게 증량', d: '근육과 힘을 빠르게 늘리기 (살도 조금 같이 붙어요)', kc: 1.15, p: 1.6, rate: [0.25, 0.5], src: 'Iraki 2019' },
  // base = which of the five above it behaves like for weight/InBody/macro checks
  contest:  { l: '바프 컷팅', d: '이미 근육이 있는 몸에서 체지방을 바짝 낮추기 — 천천히, 근육 손실 최소로', kc: 0.80, p: 2.0, rate: [-0.7, -0.4], src: 'Helms 2014 · Garthe 2011', base: 'cut' },
  strength: { l: '힘 키우기', d: '드는 무게(1RM)를 늘리는 데 집중', kc: 1.05, p: 1.6, rate: [0, 0.25], src: 'Morton 2018', base: 'leanbulk' },
  health:   { l: '건강·체력', d: '근력운동과 유산소로 체력·건강 지표 챙기기', kc: 1.00, p: 1.6, rate: [-0.3, 0.3], src: 'WHO 2020', base: 'keep' },
};
const GOAL_ORDER = ['cut', 'contest', 'recomp', 'keep', 'health', 'strength', 'leanbulk', 'bulk'];
function goalBase(k = goalKey()) { return GOALS[k].base || k; }
function goalKey() { return GOALS[DB.settings.mode] ? DB.settings.mode : 'keep'; }
function goal() { return GOALS[goalKey()]; }
function goalMacros(key, bw) {
  const g = GOALS[key], kcal = Math.round(bw * 30 * g.kc / 10) * 10, p = Math.round(bw * g.p), f = Math.round(bw * 0.9);
  return { kcal, p, f, c: Math.max(50, Math.round((kcal - p * 4 - f * 9) / 4)) };
}
const pctTxt = v => `${v > 0 ? '+' : ''}${trimNum(v)}%`;
function weightVerdict(pct) {
  if (pct == null) return null;
  const key = goalBase(), [lo, hi] = GOALS[goalKey()].rate;
  const range = `목표 속도 주 ${pctTxt(lo)} ~ ${pctTxt(hi)}`;
  if (pct >= lo && pct <= hi) return { lv: 'good', t: `목표 속도 안 · 주 ${pctTxt(r1(pct))}`, a: `${range}. 지금처럼 유지하세요.` };
  if (pct < lo) {
    const t = key === 'cut' ? '감량이 너무 빨라요' : hi > 0 ? '체중이 목표만큼 안 늘어요' : '체중이 빠지고 있어요';
    const a = key === 'cut' ? '근손실 위험이 커지는 속도예요. 하루 150–250kcal 더 드세요.' : '하루 150–250kcal 더 드세요.';
    return { lv: 'warn', t: `${t} · 주 ${pctTxt(r1(pct))}`, a: `${range}. ${a}` };
  }
  const t = key === 'cut' ? '감량이 더뎌요' : lo > 0 ? '증량이 빨라요' : '체중이 늘고 있어요';
  const a = key === 'cut' ? '2주 이상 이어지면 하루 150–250kcal 줄이거나 걷기를 늘리세요.' : lo > 0 ? '지방 위주로 늘 수 있는 속도예요. 하루 100–200kcal 줄이세요.' : '하루 100–200kcal 줄이세요.';
  return { lv: key === 'cut' || lo > 0 ? 'warn' : 'info', t: `${t} · 주 ${pctTxt(r1(pct))}`, a: `${range}. ${a}` };
}
/* InBody change judged against the chosen goal: latest vs a measurement ≥3 weeks earlier */
function inbodyGoalFeedback(list) {
  const last = list[list.length - 1];
  if (!last || last.muscle == null || last.fatKg == null) return null;
  const base = list.slice(0, -1).reverse().find(e => e.muscle != null && e.fatKg != null && daysBetween(e.date, last.date) >= 21)
    || list.slice(0, -1).reverse().find(e => e.muscle != null && e.fatKg != null);
  if (!base) return null;
  const dm = r1(last.muscle - base.muscle), df = r1(last.fatKg - base.fatKg), span = daysBetween(base.date, last.date);
  const key = goalBase(), g = GOALS[goalKey()];
  const up = x => x > 0.2, down = x => x < -0.2;
  let lv, t, a;
  if (key === 'cut') {
    if (down(df) && dm >= -0.3) { lv = 'good'; t = '지방 위주로 빠지고 있어요'; a = '근육은 지키면서 감량 중이에요. 지금 방식을 유지하세요.'; }
    else if (down(df)) { lv = 'warn'; t = '지방과 함께 근육도 빠지고 있어요'; a = `단백질을 체중 1kg당 ${g.p}g 이상으로, 근력운동 세트 수는 줄이지 말고, 감량 속도를 주 0.5% 쪽으로 늦추세요.`; }
    else { lv = 'warn'; t = '체지방이 줄지 않고 있어요'; a = '하루 150–250kcal 줄이거나 걷기 같은 활동량을 늘리세요. 식단 기록 누락도 확인해 보세요.'; }
  } else if (key === 'recomp') {
    if (up(dm) && down(df)) { lv = 'good'; t = '체형이 바뀌고 있어요'; a = '근육은 늘고 지방은 줄었어요. 지금 방식을 유지하세요.'; }
    else if (dm < -0.3) { lv = 'warn'; t = '근육이 줄고 있어요'; a = `단백질 ${g.p}g/kg과 부위당 주 10세트 이상을 지키고, 칼로리를 너무 낮추지 마세요.`; }
    else if (df > 0.5) { lv = 'warn'; t = '체지방이 늘고 있어요'; a = '체형 바꾸기는 평소 먹던 칼로리 근처가 기준이에요. 하루 100–200kcal 줄이세요.'; }
    else { lv = 'info'; t = '아직 뚜렷한 변화는 없어요'; a = '체형 바꾸기는 몇 달 단위로 천천히 보여요. 같은 조건(아침 공복)에서 3–4주 간격으로 재세요. 3개월 넘게 그대로면 "살 빼기"나 "천천히 증량"으로 방향을 정하는 게 빠를 수 있어요.'; }
  } else if (key === 'keep') {
    if (dm < -0.3) { lv = 'warn'; t = '근육이 줄고 있어요'; a = '운동 빈도·볼륨과 단백질(1.6g/kg 이상)을 점검하세요.'; }
    else if (df > 0.5) { lv = 'warn'; t = '체지방이 늘고 있어요'; a = '하루 100–200kcal 줄이세요.'; }
    else { lv = 'good'; t = '잘 유지하고 있어요'; a = up(dm) ? '근육은 조금 늘었어요.' : '큰 변화 없이 유지 중이에요.'; }
  } else { // leanbulk / bulk
    const ratio = key === 'leanbulk' ? 1 : 2; // fat gained per kg of muscle that still counts as on track
    if (up(dm) && df <= Math.max(dm * ratio, 0.3)) { lv = 'good'; t = key === 'leanbulk' ? '근육 위주로 늘고 있어요' : '근육이 잘 늘고 있어요'; a = '지금 방식을 유지하세요.'; }
    else if (up(dm)) { lv = 'warn'; t = '근육보다 지방이 더 빨리 늘어요'; a = `${key === 'leanbulk' ? '천천히 증량 기준으론 지방 증가가 커요. ' : ''}하루 100–200kcal 줄여 증량 속도를 낮추세요.`; }
    else if (up(df)) { lv = 'warn'; t = '근육 변화 없이 지방만 늘고 있어요'; a = '칼로리보다 운동 쪽을 먼저 보세요 — 부위당 주 10세트, 점진적 과부하, 단백질 1.6g/kg 이상. 그다음 하루 100kcal 줄이세요.'; }
    else { lv = 'info'; t = '아직 늘지 않았어요'; a = '하루 150–250kcal 더 드시고, 2–4주 뒤 다시 재보세요.'; }
  }
  return { lv, t, a, dm, df, span, base, last };
}
function weightCardHtml() {
  const ws = weightSeries(); if (!ws.length) return '';
  const wt = weightTrend(), v = wt && wt.pct != null ? weightVerdict(wt.pct) : null;
  const pts = ws.filter(x => x.date >= addDays(today(), -90)).map(x => ({ date: x.date, y: x.w, tip: `${shortDate(x.date)} · ${trimNum(x.w)}kg` }));
  return `<div class="sec-h"><h2>체중</h2><span class="aside">목표: ${goal().l}</span></div>
    <div class="tiles">
      <div class="tile"><div class="k">최근 체중</div><div class="v">${trimNum(ws[ws.length - 1].w)}<small>kg</small></div><div class="d muted">${shortDate(ws[ws.length - 1].date)}</div></div>
      <div class="tile"><div class="k">7일 평균 변화</div><div class="v">${wt && wt.d != null ? `${wt.d > 0 ? '+' : ''}${r1(wt.d)}` : '–'}<small>kg/주</small></div><div class="d muted">${wt && wt.pct != null ? `${wt.pct > 0 ? '+' : ''}${r1(wt.pct)}%` : '2주 기록 필요'}</div></div>
    </div>
    ${v ? `<section class="card" style="margin-top:10px"><span class="status ${v.lv}">${ICON[v.lv]} ${esc(v.t)}</span>${v.a ? `<div style="margin-top:4px;font-size: 14px">${esc(v.a)}</div>` : ''}
      <div class="note">하루 체중은 수분·식사로 1kg 넘게 흔들려서 7일 평균끼리 비교해요. 속도 기준: ${esc(goal().src)}${goalKey() === 'leanbulk' ? ' 권장 범위의 아래쪽(살이 덜 붙게 잡은 보수적 기준)' : ''}.</div></section>` : ''}
    ${pts.length >= 2 ? `<section class="card" style="margin-top:10px"><h3>체중 추이 <span class="small muted" style="font-weight:600">아침 체중·인바디</span></h3>${lineChart(pts, { color: 'var(--m-chest)', aria: '체중 추이' })}</section>` : `<div class="note">운동 탭 컨디션 체크에 아침 체중을 적으면 추이가 쌓여요.</div>`}`;
}

/* ---------- InBody: every number on the sheet (optional beyond the first four) ---------- */
const IB_EXTRA = [
  ['water', '체수분', 'L', 10, 80], ['protein', '단백질', 'kg', 3, 25], ['mineral', '무기질', 'kg', 1, 8],
  ['bmr', '기초대사량', 'kcal', 800, 3500], ['vfl', '내장지방레벨', '', 1, 25], ['whr', '복부지방률', '', 0.6, 1.2],
  ['ecw', '세포외수분비', '', 0.3, 0.45], ['pa', '위상각', '°', 2, 12], ['score', '인바디점수', '점', 30, 100],
];
const IB_SEG = [['segRA', '오른팔'], ['segLA', '왼팔'], ['segTR', '몸통'], ['segRL', '오른다리'], ['segLL', '왼다리']];

/* read the numbers off an InBody result-sheet photo (Korean or English), on the phone itself */
/* InBody result-sheet reader.
   OCR on phone photos garbles labels and drops decimal points, so every field collects several candidates
   and the sheet's own arithmetic picks the right ones:
     weight = body water + protein + minerals + body fat,  weight = fat-free mass + body fat,
     PBF = body fat / weight,  skeletal muscle ≈ 50–62% of fat-free mass.
   Fields that could not be cross-checked come back in r.unsure so the screen can ask the user to look. */
function parseInbody(text) {
  const T = text.replace(/[|]/g, ' ').replace(/(\d)\s*[.·,]\s*(\d)/g, '$1.$2');
  const lines = T.split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  // numbers only — a long run of digits is chart noise, not a value
  const numsIn = l => (l.replace(/\([^)]*\)?/g, ' ').match(/(?<![\d.])\d{1,4}(?:\.\d{1,3})?(?![\d])/g) || []).map(x => ({ v: +x, dec: x.includes('.') }));
  // a number whose decimal point was lost (475 → 4.75, 824 → 82.4) is rescued by the field's range
  const fit = (n, lo, hi) => { for (const d of [1, 10, 100]) { const v = n.v / d; if (v >= lo && v <= hi && (d === 1 || !n.dec)) return Math.round(v * 100) / 100; } return null; };
  const cands = (re, lo, hi, avoid, first, src) => {
    const out = [];
    for (const l of src || lines) {
      if (!re.test(l) || (avoid && avoid.test(l))) continue;
      const after = l.split(re).slice(1).join(' ');
      for (const n of numsIn(after)) { const v = fit(n, lo, hi); if (v != null) { out.push({ v, dec: n.dec || v !== n.v }); if (first) break; } }
    }
    return out;
  };
  const vals = list => [...new Set(list.map(x => x.v))];
  const best = list => { if (!list.length) return null; const c = {}; for (const x of list) c[x.v] = (c[x.v] || 0) + (x.dec ? 2 : 1); return +Object.entries(c).sort((p, q) => q[1] - p[1])[0][0]; };
  const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;

  const Wc = cands(/체\s*중(?!\s*조\s*절)|weight(?! control)/i, 30, 250, /적\s*정|조\s*절|target|control|표\s*준|소\s*비/i);
  const waterC = cands(/체\s*수\s*분|total body water/i, 15, 90, /세\s*포|ECW|비\b/i, true);
  const protC = cands(/단\s*백\s*질|protein/i, 3, 30, null, true).filter(x => x.dec);
  const minC = cands(/[무루]\s*기\s*질|mineral/i, 2, 8, null, true);
  const fatC = [...cands(/체\s*지\s*방\s*량|body fat mass/i, 1, 120), ...cands(/체\s*지\s*방(?!\s*[률율량])\s*\(?\s*k?g?/i, 1, 120, /분\s*석|레\s*벨|률|율/i)];
  const ffmC = cands(/제\s*지\s*방\s*량|fat free mass|lean body mass/i, 15, 150);
  // 골격근량 is often misread (글격근람, 끌격근량…) because it sits next to a bar chart
  const muRe = /[골글끌]\s*[격걱]\s*[근군]\s*[량람랑]|skeletal muscle mass|\bSMM\b/i;
  // the history block repeats the label with the oldest value first, so it is read separately below
  const hiIdx = lines.findIndex(l => /신\s*체\s*변\s*화|composition history/i.test(l));
  const muC = cands(muRe, 8, 80, null, false, hiIdx < 0 ? lines : lines.slice(0, hiIdx)).filter(x => x.dec);
  const pctC = cands(/체\s*지\s*방\s*률|percent body fat|\bPBF\b/i, 2, 65);
  // body-composition-history block at the bottom: latest weight / SMM / PBF are the last decimals on each row
  const hi = lines.findIndex(l => /신\s*체\s*변\s*화|composition history/i.test(l));
  const hist = hi < 0 ? [] : lines.slice(hi + 1, hi + 14).map(l => numsIn(l).filter(n => n.dec).map(n => n.v)).filter(a => a.length >= 2).map(a => a[a.length - 1]);
  const unsure = [];

  const water = best(waterC), prot = best(protC), mineral = best(minC);
  let W = null, Fk = null;
  const sum4 = f => water != null && prot != null && mineral != null ? water + prot + mineral + f : null;
  const Ws = vals(Wc.filter(x => x.dec)), Fs = vals(fatC.filter(x => x.dec)).filter(f => f < 100), FFs = vals(ffmC.filter(x => x.dec));
  const pctPrinted = [...vals(pctC.filter(x => x.dec)), ...hist];
  // 1) a weight and a fat value that satisfy the composition identity
  let bestErr = 9;
  for (const w of Ws) for (const f of Fs) {
    if (f >= w) continue;
    // printed weight + printed fat + printed % body fat agreeing is the strongest check (protein / water lines often lose a digit)
    // minerals unreadable: what's left after water + protein + fat must look like minerals (2.5–6.5 kg)
    const rest = mineral == null && water != null && prot != null ? w - water - prot - f : null;
    const errs = [pctPrinted.some(p => near(p, f / w * 100, 0.4)) ? 0 : null, sum4(f) != null ? Math.abs(w - sum4(f)) : null, rest != null && rest >= 2.5 && rest <= 6.5 ? 0.9 : null, ...FFs.map(ff => Math.abs(w - (ff + f)))].filter(x => x != null);
    if (!errs.length) continue;
    const e = Math.min(...errs);
    if (e < bestErr && e <= 1.0) { bestErr = e; W = w; Fk = f; }
  }
  const wPrinted = W != null;
  // 2) weight from the identity itself when no printed weight agrees
  if (W == null) {
    // try fat values that the fat-free mass also agrees with first
    // (fat-free mass + fat equals that same sum for ANY fat value, so it can't confirm the fat — only the printed % body fat can)
    for (const f of Fs) {
      const s4 = sum4(f) != null ? sum4(f) : FFs.length ? FFs[0] + f : null;
      if (s4 == null || s4 <= 30 || s4 >= 250) continue;
      if (pctPrinted.some(p => near(p, f / s4 * 100, 0.6))) { W = Math.round(s4 * 10) / 10; Fk = f; break; }
    }
  }
  if (W == null) { W = best(Wc.filter(x => x.dec)); if (W != null) unsure.push('weight'); }
  if (Fk == null && W != null) {
    // a printed fat value that matches the printed % body fat
    const fp = Fs.find(f => pctPrinted.some(p => near(p, f / W * 100, 0.4))); if (fp != null) { Fk = fp; var fpPrinted = true; }
  }
  if (Fk == null && W != null) {
    // fat from the printed % body fat of the main table (one number, no chain of other readings), else the identity
    const pp = best(pctC.filter(x => x.dec && x.v >= 3 && x.v <= 60));
    if (pp != null) { Fk = Math.round(W * pp / 100 * 10) / 10; unsure.push('fatKg'); }
    else if (water != null && prot != null && mineral != null) { const f = W - water - prot - mineral; if (f > 1 && f < W * 0.7) { Fk = Math.round(f * 10) / 10; unsure.push('fatKg'); } }
    if (Fk == null && FFs.length) { const f = W - FFs[0]; if (f > 1 && f < W * 0.7) Fk = Math.round(f * 10) / 10; }
    if (Fk == null) { const f = best(fatC.filter(x => x.dec && x.v < W * 0.7)); if (f != null) { Fk = f; unsure.push('fatKg'); } }
  }
  // % body fat: printed value if it agrees with fat/weight, otherwise the calculation
  let Fp = null;
  if (Fk != null && W) {
    const calc = Fk / W * 100, printed = pctPrinted.find(p => near(p, calc, 0.6));
    Fp = printed != null ? printed : Math.round(calc * 10) / 10;
    fpPrinted = fpPrinted || printed != null;
  } else { Fp = best(pctC); if (Fp != null) unsure.push('fatPct'); }
  // skeletal muscle: must sit inside 45–65% of fat-free mass
  let Mu = null;
  const ffm = W != null && Fk != null ? W - Fk : null;
  const okMu = m => ffm ? m >= ffm * 0.45 && m <= ffm * 0.66 : W ? m >= W * 0.25 && m <= W * 0.62 : true;
  const muAll = [...muC.filter(x => okMu(x.v)), ...hist.filter(okMu).map(v => ({ v, dec: true }))];
  Mu = best(muAll);
  // the first digit is often eaten by the bar next to it (40.8 → 10.8): try the other first digits and
  // keep the repair only when exactly one fits the fat-free-mass range
  if (Mu == null && ffm) {
    const fixes = new Set();
    for (const x of muC) { const t = x.v.toFixed(1); if (t.length < 4) continue; for (let d = 1; d <= 9; d++) { const v = +(d + t.slice(1)); if (okMu(v)) fixes.add(v); } }
    if (fixes.size === 1) { Mu = [...fixes][0]; unsure.push('muscle'); var muFixed = true; }
  }
  if (Mu == null) { const m = best(muC); if (m != null) { Mu = m; unsure.push('muscle'); } }
  if (Mu != null && !muC.some(x => x.v === Mu) && !ffm) unsure.push('muscle');

  const r = { weight: W, muscle: Mu, fatKg: Fk, fatPct: Fp, unsure, muFixed: typeof muFixed !== 'undefined', wPrinted, fpPrinted: typeof fpPrinted !== 'undefined' && fpPrinted };
  // a protein / water / mineral value that lost a digit (14.0 → 4) is put back from the confirmed sum
  let pr = prot;
  if (W != null && Fk != null && (wPrinted || r.fpPrinted) && water != null && mineral != null) { const p = Math.round((W - water - mineral - Fk) * 100) / 100; if (p >= 3 && p <= 30 && (pr == null || Math.abs(pr - p) > 0.3)) { const read = protC.find(x => Math.abs(x.v - p) <= 0.3); pr = read ? read.v : Math.round(p * 10) / 10; } }
  if (water != null) r.water = water; if (pr != null) r.protein = pr; if (mineral != null) r.mineral = mineral;
  const X = {
    bmr: [/기\s*초\s*대\s*사\s*량|basal metabolic/i], vfl: [/내\s*장\s*지\s*방\s*레\s*벨|visceral fat level/i], whr: [/복\s*부\s*지\s*방\s*률|허\s*리\s*엉\s*덩\s*이|waist.?hip/i],
    ecw: [/세\s*포\s*외\s*수\s*분\s*비|ECW\s*\/?\s*TBW|ECW ratio/i], pa: [/위\s*상\s*각|phase angle/i], score: [/인\s*바\s*디\s*점\s*수|inbody score/i],
  };
  // visceral fat level: the value sits under the label, next to a "낮음 10 높음" scale whose 10 is not the reading
  const vi = lines.findIndex(l => /내\s*장\s*지\s*방\s*레\s*벨|visceral fat level/i.test(l));
  if (vi >= 0) {
    const pool = lines.slice(vi, vi + 3).join(' ').replace(/\([^)]*\)/g, ' ').match(/(?<![\d.])\d{1,2}(?![\d.])/g) || [];
    const ints = pool.map(Number).filter(n => n >= 1 && n <= 30), other = ints.filter(n => n !== 10);
    if (other.length) r.vfl = other[0]; else if (ints.filter(n => n === 10).length >= 2) r.vfl = 10;
  }
  for (const [k, , , lo, hiV] of IB_EXTRA) { if (!X[k] || r[k] != null || k === 'vfl') continue; const v = best(cands(X[k][0], lo, hiV, X[k][1], true)); if (v != null) r[k] = v; }
  // inbody score sits on the line below its label on most sheets
  if (r.score == null) { const i = lines.findIndex(l => /인\s*바\s*디\s*점\s*수|inbody score/i.test(l)); if (i >= 0) for (const l of lines.slice(i, i + 3)) { const m = l.match(/\b(\d{2,3})\s*\/?\s*100/); if (m && +m[1] <= 100) { r.score = +m[1]; break; } } }
  // basal metabolic rate cross-check (Katch-McArdle-like: InBody uses 370 + 21.6 × FFM)
  if (r.bmr != null && ffm && Math.abs(r.bmr - (370 + 21.6 * ffm)) > 120) delete r.bmr;
  for (const dm of T.matchAll(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g)) {
    const y = +dm[1], mo = +dm[2], d = +dm[3];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2000) { r.date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; break; }
  }
  if (r.date && r.date > today()) delete r.date;
  return r;
}

/* ---------- InBody: read each field by its row, then choose numbers that agree ---------- */
const IB_FIELDS = {
  weight: { re: /체\s*중/, skip: /조절|변화|history/i, notAfter: /정$/ },
  water: { re: /체\s*수\s*분/, skip: /세포|비/ },
  protein: { re: /단\s*백\s*질/ },
  mineral: { re: /[무루]\s*기\s*질/ },
  fatT: { re: /체\s*지\s*방(?![량랑향률율를클레])/, skip: /분석|레벨|부위|조절|률|율/ },
  fatB: { re: /체\s*지\s*[방바]\s*[량랑향]/ },
  pbf: { re: /체\s*지\s*방\s*[률율를클]/, skip: /복부/ },
  smm: { re: /[골글끌]?\s*[격걱]\s*[근군]\s*[량람랑]/, skip: /분석/ },
  ffm: { re: /제\s*지\s*방\s*량/ },
};
async function readFields(worker, canvas, data) {
  const out = {};
  try {
    const lines = (data.blocks || []).flatMap(b => (b.paragraphs || []).flatMap(p => p.lines || []));
    const hist = lines.find(l => /신체변화|history/i.test((l.text || '').replace(/\s/g, ''))), histY = hist ? hist.bbox.y0 : Infinity;
    await worker.setParameters({ tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '7' });
    for (const ln of lines) {
      if (ln.bbox.y0 >= histY) continue;
      const ws = (ln.words || []).slice().sort((a, b) => a.bbox.x0 - b.bbox.x0);
      // compact text with a map back to words (Korean comes back one syllable per word)
      let txt = '', at = []; ws.forEach((w, wi) => { const t = (w.text || '').replace(/\s/g, ''); for (const ch of t) { txt += ch; at.push(wi); } });
      for (const [key, F] of Object.entries(IB_FIELDS)) {
        if (F.skip && F.skip.test(txt)) continue;
        const re = new RegExp(F.re.source.replace(/\\s\*/g, ''), 'g'); let m;
        while ((m = re.exec(txt))) {
          if (F.notAfter && F.notAfter.test(txt.slice(0, m.index))) continue;
          const w0 = ws[at[m.index]], w1 = ws[at[m.index + m[0].length - 1]];
          const h = Math.max(...ws.slice(at[m.index], at[m.index + m[0].length - 1] + 1).map(w => w.bbox.y1 - w.bbox.y0)), y0 = Math.min(w0.bbox.y0, w1.bbox.y0);
          // the number the first reading saw after the label ("40." "5", "81.6") — crop just that, widened a little to the
          // left where a digit touching the bar gets lost; the bar itself confuses a digits-only read
          const li = at[m.index + m[0].length - 1];
          // the number must come before any other Korean word ("체수분, 단백질, 무기질 … 합하면 체중 81.6" is a sentence, not a row)
          let k0 = -1; for (let q = li + 1; q < ws.length && ws[q].bbox.x0 - w1.bbox.x1 < h * 30; q++) { if (/[가-힣]/.test(ws[q].text)) break; if (/\d/.test(ws[q].text) && !/^\(/.test(ws[q].text)) { k0 = q; break; } }
          let cx0, cx1, cy0, cy1;
          if (k0 >= 0) {
            let k1 = k0; while (k1 + 1 < ws.length && /^[\d.,]+$/.test(ws[k1 + 1].text) && ws[k1 + 1].bbox.x0 - ws[k1].bbox.x1 < h * 1.2) k1++;
            const b = ws.slice(k0, k1 + 1), nh = Math.max(...b.map(w => w.bbox.y1 - w.bbox.y0));
            var first = (b.map(w => w.text).join('').replace(/,/g, '.').match(key === 'mineral' ? /\d{1,2}\.\d{1,2}/ : /\d{1,3}\.\d/) || [])[0];
            if (first) (out[key] = out[key] || []).push(+first);
            cx0 = Math.max(0, b[0].bbox.x0 - nh * 0.9); cx1 = Math.min(canvas.width, b[b.length - 1].bbox.x1 + nh * 0.4);
            cy0 = Math.max(0, Math.min(...b.map(w => w.bbox.y0)) - nh * 0.35); cy1 = Math.min(canvas.height, Math.max(...b.map(w => w.bbox.y1)) + nh * 0.35);
          } else continue;
          const S = 3, c = document.createElement('canvas'); c.width = Math.round((cx1 - cx0) * S); c.height = Math.round((cy1 - cy0) * S);
          if (c.width < 30 || c.height < 12) continue;
          c.getContext('2d').drawImage(canvas, cx0, cy0, cx1 - cx0, cy1 - cy0, 0, 0, c.width, c.height);
          for (const img of [c, binarize(c)]) {
            const { data: d } = await worker.recognize(img);
            // the value is the first decimal after the label (the range in brackets and the bar come after it)
            // minerals print two decimals (4.85), everything else one (81.6)
            const n = (d.text.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2').match(key === 'mineral' ? /\d{1,2}\.\d{1,2}(?!\d)/ : /\d{1,3}\.\d(?!\d)/) || [])[0];
            // a stray mark left of the number reads as an extra digit (181.6 for 81.6): trust the first reading's digits then
            if (n) (out[key] = out[key] || []).push(first && n !== first && n.endsWith(first) ? +first : +n);
          }
        }
      }
    }
    // skeletal muscle: the label reads as noise ("고 겨 그 량") and its number sits at the end of the black bar, so the first
    // reading never sees it. Find the bar's scale instead (70 80 90 100 110 120 …, only the muscle row counts by tens)
    // and read the strip under it, down to the next row's scale.
    const ints = l => (l.words || []).map(w => +w.text).filter(n => Number.isInteger(n) && n >= 40 && n <= 600);
    const mi = lines.findIndex(l => l.bbox.y0 < histY && [80, 90, 110, 120, 130, 140, 150, 160, 170].filter(n => ints(l).includes(n)).length >= 3 && !ints(l).some(n => [85, 115, 145, 220, 280, 340].includes(n)));
    if (mi >= 0) {
      // crop by the scale's own numbers, not the line box (that box often spans the weight and fat rows too):
      // the bar and its number sit just under the scale, between its first and last tick
      const tk = (lines[mi].words || []).filter(w => /^\d{2,3}$/.test(w.text) && +w.text >= 60 && +w.text <= 180), th = Math.max(...tk.map(w => w.bbox.y1 - w.bbox.y0));
      const ty = tk.map(w => w.bbox.y1).sort((x, y) => x - y)[tk.length >> 1];
      const cy0 = Math.max(0, ty - th * 0.2), cy1 = Math.min(canvas.height, ty + th * 3.2), cx0 = Math.max(0, Math.min(...tk.map(w => w.bbox.x0)) - th), cx1 = Math.min(canvas.width, Math.max(...tk.map(w => w.bbox.x1)) + th * 2);
      const S = Math.min(4, 2400 / (cx1 - cx0)), c = document.createElement('canvas'); c.width = Math.round((cx1 - cx0) * S); c.height = Math.round((cy1 - cy0) * S);
      c.getContext('2d').drawImage(canvas, cx0, cy0, cx1 - cx0, cy1 - cy0, 0, 0, c.width, c.height);
      await worker.setParameters({ tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '7' });
      for (const img of [c, binarize(c)]) {
        const { data: d } = await worker.recognize(img);
        // the scale is whole numbers; the reading is the one number with a decimal
        for (const n of d.text.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2').match(/\d+\.\d(?!\d)/g) || []) { const v = +n.slice(-4); if (v >= 8 && v <= 80) (out.smm = out.smm || []).push(v); } // the bar reads as extra digits in front
      }
    }
    await worker.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '3' });
  } catch (e) {}
  return out;
}
function solveInbody(Z, base) {
  const cnt = arr => { const c = new Map(); for (const v of arr || []) c.set(v, (c.get(v) || 0) + 1); return c; };
  const add = (arr, v) => v != null ? [...(arr || []), v] : arr || [];
  const W = cnt(add(Z.weight, base.wPrinted ? base.weight : null)), F = cnt([...(Z.fatT || []), ...(Z.fatB || []), ...(base.fatKg != null && !base.unsure.includes('fatKg') ? [base.fatKg] : [])]);
  const P = cnt(add(Z.pbf, base.fpPrinted ? base.fatPct : null)), Wa = cnt(add(Z.water, base.water)), Pr = cnt(add(Z.protein, base.protein)), Mi = cnt(add(Z.mineral, base.mineral)), FF = cnt(Z.ffm);
  const top = (m, lo, hi) => [...m.entries()].filter(([v]) => v >= lo && v <= hi).sort((a, b) => b[1] - a[1]).slice(0, 6);
  let best = { score: -1 };
  const ws = top(W, 25, 250), fs = top(F, 1, 120), ps = top(P, 2, 65), was = top(Wa, 10, 100), prs = top(Pr, 3, 30), mis = top(Mi, 2.3, 8), ffs = top(FF, 15, 150);
  // a fat reading under 10 may have lost its first digit (1.3 for 11.3): offer 11.3 / 21.3 as well
  for (const [v, c] of fs.slice()) if (v < 10) for (const add of [10, 20, 30]) if (!fs.some(([x]) => x === Math.round((v + add) * 10) / 10)) fs.push([Math.round((v + add) * 10) / 10, c]);
  const firm = was.length && prs.length && mis.length && was[0][1] >= 2 && prs[0][1] >= 2 && mis[0][1] >= 2;
  for (const [w, cw] of ws.length ? ws : [[null, 0]]) {
    const fl = fs.slice();
    // fat from the sum, only with a read weight and water / protein / minerals each read at least twice;
    // it counts as read if a fat reading is the same number missing its first digit (1.3 for 11.3)
    if (w != null && firm) { const fd = Math.round((w - was[0][0] - prs[0][0] - mis[0][0]) * 10) / 10; if (fd > 1 && fd < w * 0.6 && !fl.some(([v]) => v === fd)) fl.push([fd, fs.some(([v]) => String(fd).endsWith(String(v))) ? 1 : 0, true]); }
    for (const [f, cf, derived] of fl.length ? fl : [[null, 0]]) {
      if (w != null && f != null && (f >= w * 0.7 || f < w * 0.03)) continue; // body fat under 3% isn't a real reading
      let s = cw + cf, pct = null, sum = false, ffmOk = false;
      if (w != null && f != null) {
        const p = ps.find(([v]) => Math.abs(v - f / w * 100) <= 0.3); if (p) { s += 6 + p[1]; pct = p[0]; }
        let bs = -1; for (const [a, ca] of was) for (const [b, cb] of prs) for (const [c, cc] of mis) if (Math.abs(w - (a + b + c + f)) <= 0.25 && ca + cb + cc > bs) { bs = ca + cb + cc; sum = [a, b, c]; }
        if (sum) s += (derived ? 3 : 6) + bs;
        if (ffs.some(([v]) => Math.abs(w - f - v) <= 0.25)) { ffmOk = true; s += 3; }
      }
      if (s > best.score) best = { score: s, w, f, pct, sum, ffmOk, derived };
    }
  }
  const { w, f } = best, ok = w != null && f != null && (best.pct != null || best.ffmOk || (best.sum && !best.derived));
  const r = { weight: w, fatKg: f, unsure: [], ok, fit: best.score };
  r.fatPct = best.pct != null ? best.pct : w && f ? Math.round(f / w * 1000) / 10 : (ps[0] || [])[0] ?? null;
  if (best.sum) [r.water, r.protein, r.mineral] = best.sum;
  else {
    // without the sum, body water is ~73% of fat-free mass and protein ~20%: a number outside that is another row's (81.6 = weight)
    const lean = w != null && f != null ? w - f : ffs.length ? ffs[0][0] : null, fits = (v, lo, hi) => lean != null && v >= lean * lo && v <= lean * hi;
    r.water = (was.find(([v]) => fits(v, 0.66, 0.8)) || [])[0]; r.protein = lean == null ? (prs[0] || [])[0] : (prs.find(([v]) => fits(v, 0.15, 0.25)) || [])[0]; r.mineral = (mis[0] || [])[0];
  }
  // skeletal muscle: inside 45–66% of fat-free mass, the reading seen most often (history row as a tie-breaker)
  const ffm = w != null && f != null ? w - f : ffs.length ? ffs[0][0] : null;
  const inR = v => !ffm || (v >= ffm * 0.45 && v <= ffm * 0.66);
  // the muscle strip can run into the fat row below: a number that is a fat reading isn't the muscle
  const fatSeen = new Set([...F.keys(), f]), smm = (Z.smm || []).filter(v => !fatSeen.has(v));
  let mus = top(cnt([...smm, ...(base.muscle != null ? [base.muscle] : [])]), 8, 80).filter(([v]) => inR(v)), muGuess = false;
  // the first digit sits against the bar and gets lost (40.8 → 10.8): if exactly one first digit fits the fat-free mass, use it
  if (!mus.length && ffm) { const alt = new Set(); for (const v of smm) { const t = v.toFixed(1); for (let d = 1; d <= 9; d++) { const x = +(d + t.slice(1)); if (inR(x)) alt.add(x); } } if (alt.size === 1) { mus = [[[...alt][0], 1]]; muGuess = true; } }
  // nothing to check it against (weight and fat unread): leave it empty rather than guess
  r.muscle = mus.length && ffm ? mus[0][0] : null;
  if (!ok) { if (w != null) r.unsure.push('weight'); if (f != null) r.unsure.push('fatKg'); if (r.fatPct != null) r.unsure.push('fatPct'); }
  if (r.muscle != null && (mus[0][1] < 2 || !ok || muGuess)) r.unsure.push('muscle');
  for (const k of ['water', 'protein', 'mineral']) if (r[k] == null) delete r[k];
  return r;
}
let tessLoading = null;
function loadTess() {
  if (window.Tesseract) return Promise.resolve();
  if (tessLoading) return tessLoading;
  return (tessLoading = new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'tess/tesseract.min.js'; s.onload = ok; s.onerror = () => { tessLoading = null; bad(new Error('load')); }; document.head.appendChild(s); }));
}
/* find a label word in the first reading, cut out its row to the right (where the bar chart ends in the number),
   enlarge it and read digits only */
async function zoomRow(worker, canvas, data, labelRe, inHistory) {
  try {
    // Korean comes back one syllable per "word", so match whole lines and take the label's own words
    const lines = (data.blocks || []).flatMap(b => (b.paragraphs || []).flatMap(p => p.lines || []));
    const hist = lines.find(l => /신체변화|history/i.test((l.text || '').replace(/\s/g, '')));
    const histY = hist ? hist.bbox.y0 : Infinity;
    const out = [];
    for (const ln of lines) {
      const t = (ln.text || '').replace(/\s/g, '');
      if (!labelRe.test(t) || /분석|지방|analysis/i.test(t)) continue;
      // main table rows sit above the history block; the history row's latest value is its right-most number
      const isHist = ln.bbox.y0 >= histY || (histY === Infinity && ln === lines.filter(l => labelRe.test((l.text || '').replace(/\s/g, ''))).slice(-1)[0] && lines.indexOf(ln) > lines.length * 0.7);
      if (!!inHistory !== isHist) continue;
      const ws = (ln.words || []).slice().sort((a, b) => a.bbox.x0 - b.bbox.x0);
      let end = -1; for (let i = 0; i < ws.length; i++) if (/[근군량람랑]|muscle/i.test(ws[i].text)) end = i; else if (end >= 0 && /\d/.test(ws[i].text)) break;
      if (end < 0) continue;
      const lab = { x0: ws[0].bbox.x0, y0: Math.min(...ws.slice(0, end + 1).map(w => w.bbox.y0)), x1: ws[end].bbox.x1, y1: Math.max(...ws.slice(0, end + 1).map(w => w.bbox.y1)) };
      const h = lab.y1 - lab.y0, lw = Math.max(lab.x1 - lab.x0, h * 3);
      let cx0 = lab.x1, cx1 = inHistory ? canvas.width : Math.min(canvas.width, lab.x1 + lw * 5), cy0 = Math.max(0, lab.y0 - h * 0.5), cy1 = Math.min(canvas.height, lab.y1 + h * 0.5);
      // main row: the number the first reading found (e.g. "10.8") is boxed — re-read just that box, widened a little
      // to the left where a digit touching the bar gets lost
      const numW = !inHistory && ws.slice(end + 1).filter(w => /\d+\.\d/.test(w.text)).pop();
      if (numW) { const nh = numW.bbox.y1 - numW.bbox.y0; cx0 = Math.max(0, numW.bbox.x0 - nh * 0.9); cx1 = Math.min(canvas.width, numW.bbox.x1 + nh * 0.3); cy0 = Math.max(0, numW.bbox.y0 - nh * 0.35); cy1 = Math.min(canvas.height, numW.bbox.y1 + nh * 0.35); }
      const S = 3, c = document.createElement('canvas'); c.width = Math.round((cx1 - cx0) * S); c.height = Math.round((cy1 - cy0) * S);
      if (c.width < 20 || c.height < 10) continue;
      c.getContext('2d').drawImage(canvas, cx0, cy0, cx1 - cx0, cy1 - cy0, 0, 0, c.width, c.height);
      await worker.setParameters({ tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '7' });
      for (const img of [c, binarize(c)]) {
        const { data: d } = await worker.recognize(img);
        const ns = (d.text.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2').match(/\d{1,3}\.\d/g) || []).map(Number);
        out.push(...(inHistory ? ns.slice(-1) : ns));
      }
      if (out.length) break;
    }
    return out;
  } catch (e) { return []; }
}
// black-and-white copy (Otsu threshold) for a second reading of hard photos
function binarize(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Array(256).fill(0);
  for (let i = 0; i < p.length; i += 4) hist[p[i]]++;
  const n = c.width * c.height; let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sB = 0, wB = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } }
  for (let i = 0; i < p.length; i += 4) { const v = p[i] > th ? 255 : 0; p[i] = p[i + 1] = p[i + 2] = v; }
  g.putImageData(d, 0, 0); return c;
}
// enlarge + grayscale + stretch contrast: Korean OCR on phone photos is much better after this
function ocrCanvas(img, target) {
  // phone cameras give 3000–4000px and very large text reads worse, so big photos are scaled down too
  const scale = Math.min(2.4, Math.max(0.3, (target || 2000) / img.width)), w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), p = d.data, hist = new Array(256).fill(0);
  for (let i = 0; i < p.length; i += 4) { const y = Math.round(p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114); p[i] = y; hist[y]++; }
  const n = w * h; let lo = 0, hi = 255, acc = 0;
  for (; lo < 255 && (acc += hist[lo]) < n * 0.01; lo++);
  acc = 0; for (; hi > 0 && (acc += hist[hi]) < n * 0.01; hi--);
  const k = 255 / Math.max(1, hi - lo);
  for (let i = 0; i < p.length; i += 4) { const v = Math.max(0, Math.min(255, (p[i] - lo) * k)); p[i] = p[i + 1] = p[i + 2] = v; }
  g.putImageData(d, 0, 0);
  return c;
}
async function ocrInbody(file) {
  const st = $('#ib-ocr'); const say = (t, cls) => { if (st) { st.className = 'ocrstat ' + (cls || ''); st.innerHTML = t; } };
  let ocrDone = false, zooming = false;
  // a new photo starts clean: numbers an earlier reading filled in would look like this one's
  document.querySelectorAll('.ocrfill').forEach(el => { if (el.id !== 'ib-date') el.value = ''; el.classList.remove('ocrfill', 'ocrunsure'); });
  say('사진에서 숫자를 읽는 중… <span class="muted">처음 한 번은 글자 인식 데이터(약 8MB)를 받느라 30초쯤 걸려요</span>', 'busy');
  try {
    await loadTess();
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    URL.revokeObjectURL(url);
    let canvas = ocrCanvas(img, 2000);
    const worker = await Tesseract.createWorker(['kor', 'eng'], 1, {
      workerPath: 'tess/worker.min.js', corePath: 'tess/', langPath: 'tess', gzip: true,
      logger: m => { if (!ocrDone && !zooming && m.status === 'recognizing text') say(`사진에서 숫자를 읽는 중… ${Math.round(m.progress * 100)}%`, 'busy'); },
    });
    // 1) read the whole sheet once to find where each label sits
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const text = data.text, base = parseInbody(text);
    // 2) for every number on the sheet, cut out its row next to the label and read digits only (much more accurate)
    zooming = true; say('숫자 줄을 하나씩 확대해서 읽는 중…', 'busy');
    let Z = await readFields(worker, canvas, data);
    // 3) pick the set of numbers that agrees with itself (weight = water + protein + minerals + fat, % fat = fat ÷ weight)
    let r = solveInbody(Z, base);
    if (!r.ok) {
      // phone photos read differently at another size — one more pass, keep whichever agrees better
      say('한 번 더 다른 크기로 읽는 중…', 'busy');
      const cv = ocrCanvas(img, img.width > 2000 ? 1600 : 2600), { data: d2 } = await worker.recognize(cv, {}, { text: true, blocks: true });
      const Z2 = await readFields(worker, cv, d2), merged = {}; for (const k of new Set([...Object.keys(Z), ...Object.keys(Z2)])) merged[k] = [...(Z[k] || []), ...(Z2[k] || [])];
      const r2 = solveInbody(merged, parseInbody(d2.text));
      if (r2.fit > r.fit) r = r2;
    }
    for (const k of ['bmr', 'vfl', 'date', 'whr', 'ecw', 'pa']) if (base[k] != null && r[k] == null) r[k] = base[k];
    window.__ocrZ = Z; window.__ocrLines = (data.blocks || []).flatMap(b => (b.paragraphs || []).flatMap(p => p.lines || [])).map(l => (l.words || []).map(w => w.text).join('|'));
    window.__ocrText = text; // kept for troubleshooting a misread sheet
    ocrDone = true;
    await worker.terminate();
    const fill = (id, v, unsure) => { const el = $(id); if (el && v != null) { el.value = v; el.classList.add('ocrfill'); el.classList.toggle('ocrunsure', !!unsure); } };
    fill('#ib-w', r.weight, r.unsure.includes('weight')); fill('#ib-m', r.muscle, r.unsure.includes('muscle')); fill('#ib-fk', r.fatKg, r.unsure.includes('fatKg')); fill('#ib-fp', r.fatPct, r.unsure.includes('fatPct'));
    if (r.date) fill('#ib-date', r.date);
    let extra = 0; for (const [k] of IB_EXTRA) if (r[k] != null) { fill('#ib-x-' + k, r[k]); extra++; }
    if (extra) { const dt = $('#ib-more'); if (dt) dt.open = true; }
    const got = ['weight', 'muscle', 'fatKg', 'fatPct'].filter(k => r[k] != null).length + extra;
    if (!got) say('숫자를 찾지 못했어요. 결과지 전체가 밝고 반듯하게 나오게 다시 찍거나, 직접 입력해 주세요.', 'bad');
    else {
      const NAME = { weight: '체중', muscle: '골격근량', fatKg: '체지방량', fatPct: '체지방률' }, un = r.unsure.filter(k => r[k] != null), miss = ['weight', 'muscle', 'fatKg', 'fatPct'].filter(k => r[k] == null);
      say(un.length || miss.length ? `읽었어요.${un.length ? ` <b class="warnc">${un.map(k => NAME[k]).join('·')}은 확실하지 않아요 — 결과지와 비교해 주세요.</b>` : ''}${miss.length ? ` ${miss.map(k => NAME[k]).join('·')}은 직접 넣어주세요.` : ''}` : '읽었어요. 숫자가 서로 맞아서 맞게 읽은 것 같아요.', un.length || miss.length ? 'warn' : 'ok');
    }
  } catch (e) {
    say('글자 인식을 불러오지 못했어요(인터넷 연결 확인). 숫자는 직접 입력해 주세요.', 'bad');
  }
}

/* ---------- InBody analysis (evidence-based) ---------- */
// body-fat % bands by sex and age (Gallagher 2000, derived from BMI 18.5 / 25 / 30)
const BF_BANDS = {
  m: [[20, 39, [8, 20, 25]], [40, 59, [11, 22, 28]], [60, 79, [13, 25, 30]]],
  f: [[20, 39, [21, 33, 39]], [40, 59, [23, 34, 40]], [60, 79, [24, 36, 42]]],
};
function bfBand(pct, sex, age) {
  const row = (BF_BANDS[sex] || []).find(([a, b]) => age >= a && age <= b) || (age < 20 && BF_BANDS[sex] ? BF_BANDS[sex][0] : null);
  if (!row) return null;
  const [lo, ow, ob] = row[2], healthy = `${lo}–${ow - 1}%`, ages = `${row[0]}–${row[1]}세`;
  if (pct < lo) return { t: '낮음', lv: 'warn', range: `${lo}% 미만`, healthy, ages };
  if (pct < ow) return { t: '건강 범위', lv: 'good', range: healthy, healthy, ages };
  if (pct < ob) return { t: '과체중 범위', lv: 'info', range: `${ow}–${ob - 1}%`, healthy, ages };
  return { t: '비만 범위', lv: 'warn', range: `${ob}% 이상`, healthy, ages };
}
function inbodyAnalysisHtml(list) {
  const last = list[list.length - 1]; if (!last) return '';
  const pf = DB.settings.profile || {}, items = [];
  const age = pf.birth ? new Date().getFullYear() - pf.birth : null, h = pf.height ? pf.height / 100 : null;
  const fatPct = last.fatPct != null ? last.fatPct : last.fatKg != null && last.weight ? last.fatKg / last.weight * 100 : null;
  // 0) numbers that cannot all be true (usually a misread photo) — say so before analysing them
  const off = [];
  if (fatPct != null && (fatPct < 3 || fatPct > 60)) off.push(`체지방률 ${r1(fatPct)}%는 사람에게서 거의 나오지 않는 값이에요`);
  if (last.fatKg != null && last.weight && last.fatPct != null && Math.abs(last.fatPct - last.fatKg / last.weight * 100) > 1.5) off.push(`체지방률(${last.fatPct}%)과 체지방량÷체중(${r1(last.fatKg / last.weight * 100)}%)이 달라요`);
  if (last.muscle != null && last.weight && last.fatKg != null && (last.muscle < (last.weight - last.fatKg) * 0.45 || last.muscle > (last.weight - last.fatKg) * 0.66)) off.push('골격근량이 제지방량과 맞지 않아요');
  if (off.length) items.push(['bad', '이 측정값은 서로 맞지 않아요', `${off.join('. ')}. 사진 인식이 틀렸을 가능성이 커요 — 아래 기록에서 이 날짜를 지우고 다시 입력해 주세요. 아래 분석도 틀릴 수 있어요.`, '']);
  // 1) body-fat % band
  if (fatPct != null && pf.sex && age) {
    const b = bfBand(fatPct, pf.sex, age);
    if (b) items.push([b.lv, `체지방률 ${r1(fatPct)}% · ${b.t}`, `${pf.sex === 'm' ? '남성' : '여성'} ${b.ages} 기준 건강 범위는 ${b.healthy}예요. BMI 기준선에서 거꾸로 계산한 참고 범위라 운동하는 사람은 체중 대비 근육이 많아 더 정확할 수 있어요.`, 'Gallagher 2000']);
  }
  // 2) FFMI
  if (h && last.weight != null && (last.fatKg != null || fatPct != null)) {
    const fat = last.fatKg != null ? last.fatKg : last.weight * fatPct / 100, ffm = last.weight - fat;
    const ffmi = ffm / (h * h), adj = ffmi + 6.1 * (1.8 - h);
    items.push(['info', `FFMI ${r1(adj)}`, `제지방량 ${r1(ffm)}kg ÷ 키². 약물 없이 운동한 남성 선수들은 대부분 25 이하였어요(${adj >= 25 ? '이미 상위 수준' : `상한 대비 ${Math.round(adj / 25 * 100)}%`}). 여성은 이 기준을 그대로 쓰기 어려워요.`, 'Kouri 1995']);
  }
  // 3) what the weight change was made of (needs two measurements ≥3 weeks apart)
  const base = list.slice(0, -1).reverse().find(e => e.weight != null && e.fatKg != null && daysBetween(e.date, last.date) >= 21);
  if (base && last.weight != null && last.fatKg != null) {
    const dw = last.weight - base.weight, df = last.fatKg - base.fatKg, dl = dw - df, wk = daysBetween(base.date, last.date) / 7;
    const rate = dw / base.weight * 100 / wk;
    if (Math.abs(dw) >= 1) {
      if (dw < 0) {
        const fatShare = Math.max(0, Math.min(150, df / dw * 100));
        const lv = fatShare >= 75 ? 'good' : fatShare >= 50 ? 'info' : 'warn';
        items.push([lv, `감량 ${r1(-dw)}kg 중 지방 ${Math.round(fatShare)}%`, `주 ${r1(-rate)}%씩 빠졌어요. 주 0.7% 감량 그룹은 제지방이 오히려 늘었지만 주 1% 이상 그룹은 늘지 않았던 연구가 있어요.${lv === 'warn' ? ' 근육 손실 비중이 커요. 속도를 주 0.5–0.7%로 늦추고 근력운동 볼륨을 유지하세요.' : ''}`, 'Garthe 2011 · Helms 2014']);
      } else {
        const fatShare = Math.max(0, df / dw * 100);
        items.push([fatShare <= 50 ? 'good' : 'info', `증량 ${r1(dw)}kg 중 제지방 ${Math.round(100 - Math.min(100, fatShare))}%`, `주 ${r1(rate)}%씩 늘었어요. 증량 속도가 빠를수록 지방 비중이 커지는 경향이라 주 0.25–0.5%가 권장돼요.${fatShare > 50 ? ' 지금은 지방 비중이 커요 — 속도를 조금 늦춰보세요.' : ''}`, 'Iraki 2019']);
      }
    } else items.push(['info', `${shortDate(base.date)} 이후 체중 변화 ${dw > 0 ? '+' : ''}${r1(dw)}kg`, `골격근 ${last.muscle != null && base.muscle != null ? `${r1(last.muscle - base.muscle) > 0 ? '+' : ''}${r1(last.muscle - base.muscle)}kg` : '–'} · 체지방 ${df > 0 ? '+' : ''}${r1(df)}kg. 1kg 안팎은 측정 조건 차이일 수 있어요.`, 'Kyle 2004']);
  }
  // 4) BMI — Asian cut-offs, read together with body fat (muscular people score "overweight")
  if (h && last.weight != null) {
    const bmi = last.weight / (h * h);
    const cat = bmi < 18.5 ? '저체중' : bmi < 23 ? '정상' : bmi < 25 ? '과체중' : '비만';
    const lean = fatPct != null && pf.sex && age && (bfBand(fatPct, pf.sex, age) || {}).lv === 'good';
    items.push([bmi >= 23 && !lean ? 'warn' : 'info', `BMI ${r1(bmi)} · ${cat}${bmi >= 23 && lean ? ' (근육형)' : ''}`, bmi >= 23 && lean ? 'BMI만 보면 과체중이지만 체지방률은 건강 범위예요. BMI는 근육과 지방을 구분하지 못해서, 근육이 많은 사람은 높게 나와요.' : '아시아인 기준 23 이상 과체중, 25 이상 비만이에요. 체지방률과 함께 보세요.', 'WHO 2004']);
  }
  // 5) visceral fat level & waist-hip ratio
  if (last.vfl != null) items.push([last.vfl >= 10 ? 'warn' : 'good', `내장지방레벨 ${trimNum(last.vfl)}`, last.vfl >= 10 ? '10 이상은 내장지방이 많은 편이에요(인바디 기준 1–9 정상). 내장지방은 대사질환 위험과 관련이 커서, 체중보다 이 숫자가 줄어드는지 보세요. 유산소+근력운동, 칼로리 적자가 가장 확실한 방법이에요.' : '정상 범위(1–9)예요.', '인바디 제조사 기준']);
  if (last.whr != null) {
    const cut = pf.sex === 'f' ? 0.85 : 0.90;
    items.push([last.whr >= cut ? 'warn' : 'good', `복부지방률 ${trimNum(last.whr)}`, last.whr >= cut ? `허리-엉덩이 비율이 ${pf.sex === 'f' ? '여성' : '남성'} 복부비만 기준(${cut}) 이상이에요. 뱃살 쪽에 지방이 몰린 상태예요.` : `복부비만 기준(${pf.sex === 'f' ? '여성 0.85' : '남성 0.90'}) 아래예요.`, 'WHO 2008']);
  }
  // 6) extracellular water ratio
  if (last.ecw != null) items.push([last.ecw > 0.39 ? 'warn' : 'good', `세포외수분비 ${trimNum(last.ecw)}`, last.ecw > 0.39 ? '0.39를 넘으면 몸에 붓기가 있는 상태일 수 있어요. 측정 직전 운동·짠 음식·수면 부족, 근육통이 심한 날에도 올라가요. 계속 높으면 무리한 훈련을 줄이고, 몸이 안 좋다면 진료를 받아보세요.' : '정상 범위(0.36–0.39)예요. 수분 균형이 괜찮아요.', '인바디 제조사 기준 · Kyle 2004']);
  // 7) phase angle
  if (last.pa != null) items.push([last.pa >= 6 ? 'good' : last.pa >= 5 ? 'info' : 'warn', `위상각 ${trimNum(last.pa)}°`, last.pa >= 6 ? '세포막이 건강하고 근육 상태가 좋을 때 높게 나와요. 젊은 운동인은 보통 6–8° 정도예요.' : '위상각은 근육량·근육 질과 함께 움직여서, 근력운동이 쌓이면 대체로 올라가요. 낮게 나오면 영양·수면·회복을 먼저 챙기세요.', 'Norman 2012']);
  // 8) segmental lean: left-right balance and appendicular muscle index (sarcopenia cut-off)
  const seg = k => last[k] != null ? +last[k] : null;
  const arms = [seg('segRA'), seg('segLA')], legs = [seg('segRL'), seg('segLL')];
  const gap = ([a, b]) => a && b ? Math.abs(a - b) / Math.max(a, b) * 100 : null;
  const ga = gap(arms), gl = gap(legs);
  if (ga != null || gl != null) {
    const worst = Math.max(ga || 0, gl || 0);
    items.push([worst >= 10 ? 'warn' : 'good', `좌우 근육 차이 · 팔 ${ga != null ? r1(ga) + '%' : '–'} · 다리 ${gl != null ? r1(gl) + '%' : '–'}`, worst >= 10 ? `${(ga || 0) >= (gl || 0) ? '팔' : '다리'} 좌우 차이가 10% 이상이에요. 덤벨·한쪽씩 하는 운동(원암 로우, 불가리안 스플릿 스쿼트)을 약한 쪽부터 시작해 같은 횟수로 맞춰보세요.` : '좌우 균형이 잘 맞아요. 5% 안쪽 차이는 측정 오차 수준이에요.', '']);
  }
  if (h && arms[0] && arms[1] && legs[0] && legs[1] && pf.sex) {
    const smi = (arms[0] + arms[1] + legs[0] + legs[1]) / (h * h), cut = pf.sex === 'f' ? 5.7 : 7.0;
    items.push([smi < cut ? 'warn' : 'good', `팔다리 근육 지수 ${r1(smi)}kg/m²`, smi < cut ? `팔다리 근육량이 근감소증 진단 기준(${pf.sex === 'f' ? '여성 5.7' : '남성 7.0'}) 아래예요. 근력운동과 단백질 섭취가 가장 확실한 대응이에요.` : `근감소증 기준(${pf.sex === 'f' ? '여성 5.7' : '남성 7.0'})보다 충분히 높아요.`, 'AWGS 2019']);
  }
  // 9) InBody's own BMR vs the app's estimate
  if (last.bmr != null) items.push(['info', `기초대사량 ${fmtInt(last.bmr)}kcal (인바디)`, `인바디도 제지방량으로 계산한 값이라 앱의 추정과 비슷해야 정상이에요. 하루 섭취 목표와 칼로리 소모 분석은 이 몸 상태를 기준으로 계산해요.`, 'Kyle 2004']);
  if (last.protein != null && last.mineral != null && last.water != null) items.push(['info', `체수분 ${trimNum(last.water)}L · 단백질 ${trimNum(last.protein)}kg · 무기질 ${trimNum(last.mineral)}kg`, '체수분+단백질+무기질 = 제지방량이에요. 근력운동으로 근육이 늘면 셋이 함께 늘고, 단백질만 기준보다 낮으면 근육이 부족하다는 뜻이에요.', '']);

  const need = [];
  if (!pf.sex || !age) need.push('성별·출생연도');
  if (!h) need.push('키');
  return `<div class="sec-h"><h2>인바디 피드백</h2><span class="aside">${esc(last.date)} · 목표 ${esc(goal().l)}</span></div><section class="card">
    ${bodyNowHtml(last, fatPct, items)}
    ${items.length ? `<details class="more ibdetail"><summary>항목별 자세히 보기 (${items.length})</summary>` + items.map(([lv, t, d, src]) => `<div class="rec"><div class="ic ${lv}" aria-hidden="true">${ICON[lv]}</div><div><div class="t">${esc(t)}</div><div class="d">${esc(d)}</div>${src ? `<div class="src">근거: ${esc(src)}</div>` : ''}</div></div>`).join('') : '<div class="small muted">체중·체지방량을 넣으면 분석이 시작돼요.</div>'}
    ${items.length ? '</details>' : ''}
    ${need.length ? `<div class="note">${need.join(', ')}을 넣으면 체지방 범위·근육량 수준도 판단해요 → 아래 "내 정보"</div>` : ''}</section>`;
}
/* current state in one line + what to do for the chosen goal (numbers, not explanations) */
function bodyNowHtml(last, fatPct, items) {
  const pf = DB.settings.profile || {}, age = pf.birth ? new Date().getFullYear() - pf.birth : null, h = pf.height ? pf.height / 100 : null;
  const gk = goalKey(), base = goalBase(gk), G = GOALS[gk], M = macroPlan(), bw = last.weight || latestBodyweight();
  const chips = [], todo = [];
  const band = fatPct != null && pf.sex && age ? bfBand(fatPct, pf.sex, age) : null;
  if (fatPct != null) chips.push([band ? band.lv : 'info', `체지방 ${r1(fatPct)}%${band ? ` ${band.t}` : ''}`]);
  const ffm = last.weight && last.fatKg != null ? last.weight - last.fatKg : null, ffmi = ffm && h ? ffm / (h * h) : null;
  let musLv = null;
  if (ffmi && pf.sex) {
    const cut = pf.sex === 'f' ? [14, 16, 18, 20] : [18, 20, 22, 24];
    musLv = ffmi < cut[0] ? '적은 편' : ffmi < cut[1] ? '보통' : ffmi < cut[2] ? '많은 편' : ffmi < cut[3] ? '아주 많음' : '최상위';
    chips.push([ffmi < cut[0] ? 'warn' : 'good', `근육량 ${musLv}`]);
  } else if (last.muscle != null) chips.push(['info', `골격근 ${trimNum(last.muscle)}kg`]);
  if (last.vfl != null) chips.push([last.vfl >= 10 ? 'warn' : 'good', `내장지방 ${trimNum(last.vfl)}${last.vfl >= 10 ? ' 높음' : ' 정상'}`]);
  const risks = items.filter(([lv]) => lv === 'warn' || lv === 'bad').map(([, t]) => t.split(' · ')[0]);
  // goal plan
  const kg = r => r1(Math.abs(bw * r / 100)), [lo, hi] = G.rate, fatHigh = band && (band.lv === 'warn' || band.lv === 'bad') && band.t !== '낮음', fatLow = band && band.t === '낮음';
  if (M) todo.push(`하루 <b>${fmtInt(M.kcal)}kcal</b> · 단백질 <b>${M.p}g</b> (한 끼 ${Math.round(M.p / (DB.settings.mealN === 4 ? 4 : 3))}g씩 ${DB.settings.mealN === 4 ? 4 : 3}번)`);
  if (bw) todo.push(lo >= 0 && hi > 0 ? (lo === 0 ? `체중 주 <b>0~+${kg(hi)}kg</b> (한 달 최대 +${r1(bw * hi / 100 * 4.3)}kg)` : `체중 주 <b>+${kg(lo)}~${kg(hi)}kg</b> (한 달 +${r1(bw * lo / 100 * 4.3)}~${r1(bw * hi / 100 * 4.3)}kg)`) : hi <= 0 ? `체중 주 <b>−${kg(Math.abs(hi))}~${kg(Math.abs(lo))}kg</b> (한 달 −${r1(bw * Math.abs(hi) / 100 * 4.3)}~${r1(bw * Math.abs(lo) / 100 * 4.3)}kg)` : `체중은 <b>±${kg(hi)}kg/주</b> 안에서 유지`);
  if (base === 'leanbulk' || base === 'bulk') {
    if (fatHigh) todo.unshift(`<b class="warnc">체지방이 높은 편이라 지금은 증량보다 "체형 바꾸기"나 "살 빼기"가 더 맞아요.</b> 증량하면 지방이 같이 늘기 쉬워요`);
    else if (fatPct != null && band) todo.push(`체지방이 ${band.t}라 증량을 시작하기 좋은 상태예요. ${pf.sex === 'f' ? '28' : '18'}%를 넘으면 증량 속도를 줄이세요`);
  } else if (base === 'cut') {
    if (fatLow || (fatPct != null && fatPct < (pf.sex === 'f' ? 18 : 10))) todo.unshift(`<b class="warnc">이미 체지방이 낮아요.</b> 더 빼면 근육·컨디션 손실이 커지니 주 0.5% 이하로 천천히, 4주마다 1주는 유지 칼로리로`);
  } else if (base === 'recomp') {
    todo.push('체중은 거의 그대로, 단백질 우선');
  } else {
  }
  // what the next InBody should show
  const next = base === 'leanbulk' || base === 'bulk' ? `골격근 +0.3kg 이상, 체지방 증가는 근육 증가의 ${base === 'bulk' ? '2' : '1'}배 이하면`
    : base === 'cut' ? '체지방 −1~2kg, 골격근 감소는 0.3kg 이내면' : base === 'recomp' ? '골격근은 늘고 체지방은 줄었으면' : '골격근·체지방 변화가 ±0.5kg 안이면';
  todo.push(`4주 뒤 아침 공복에 다시 재서 → <b>${next}</b> 순조로워요`);
  return `<div class="ibnow">${chips.map(([lv, t]) => `<span class="ibchip ${lv}">${esc(t)}</span>`).join('')}</div>
    ${risks.length ? `<div class="ibrisk">⚠ 확인할 것: ${esc(risks.join(' · '))}</div>` : ''}
    <div class="ibtodo"><div class="k">${esc(G.l)} — 이렇게 하세요</div><ol>${todo.map(t => `<li>${t}</li>`).join('')}</ol></div>
    ${peerHtml(last)}
    ${trainRxHtml(last, { musLv, pf, h })}`;
}
/* where a value sits among Korean adults of the same sex and age band (linear between the published percentiles) */
function krPercentile(v, row) {
  if (v <= row[0]) return Math.max(1, 5 * v / row[0]);
  for (let i = 1; i < row.length; i++) if (v <= row[i]) return KR_PCT[i - 1] + (KR_PCT[i] - KR_PCT[i - 1]) * (v - row[i - 1]) / (row[i] - row[i - 1]);
  return Math.min(99, 95 + 5 * (v - row[6]) / (row[6] - row[5] || 1));
}
function peerHtml(last) {
  const pf = DB.settings.profile || {}, age = pf.birth ? new Date().getFullYear() - pf.birth : null, h = pf.height ? pf.height / 100 : null;
  if (!pf.sex || !age || age < 10 || !h || !last.weight || last.fatKg == null) return '';
  const band = Math.min(6, Math.max(0, Math.floor(age / 10) - 1)), T = KR_BODY[pf.sex];
  const ffmi = (last.weight - last.fatKg) / (h * h), fmi = last.fatKg / (h * h);
  const pm = krPercentile(ffmi, T.ffmi[band]), pfat = krPercentile(fmi, T.fmi[band]);
  // the previous measurement, for "지난번 상위 18%"
  const prev = DB.inbody.filter(e => e.date < last.date && e.weight && e.fatKg != null).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const was = prev ? { m: krPercentile((prev.weight - prev.fatKg) / (h * h), T.ffmi[band]), f: krPercentile(prev.fatKg / (h * h), T.fmi[band]) } : null;
  const who = `${band === 6 ? '70대 이상' : `${(band + 1) * 10}대`} ${pf.sex === 'f' ? '여성' : '남성'}`;
  const top = p => p >= 95 ? '상위 5% 이내' : p <= 5 ? '하위 5%' : `상위 ${Math.max(1, Math.round(100 - p))}%`;
  const row = (label, p, txt, good, before) => `<div class="peer-row"><div class="pl"><span>${label}${before != null && Math.round(100 - before) !== Math.round(100 - p) ? ` <em class="was">지난번 ${top(before)}</em>` : ''}</span><b class="${good ? 'up' : ''}">${txt}</b></div>
    <div class="pbar"><i style="left:${Math.min(98, Math.max(2, p)).toFixed(1)}%"></i><span style="left:25%"></span><span style="left:50%"></span><span style="left:75%"></span></div></div>`;
  return `<div class="peer"><div class="k">한국인 ${who}과 비교</div>
    ${row('근육 (제지방)', pm, top(pm), pm >= 75, was && was.m)}
    ${row('체지방 적은 순', 100 - pfat, top(100 - pfat), pfat <= 25, was && 100 - was.f)}
    <div class="note">국민건강영양조사 2022–2023 · 같은 인바디 방식으로 잰 ${who} 기준이에요.</div></div>`;
}
/* exercise prescription: the goal's rule (ACSM 2026), what this InBody points at, and the last two weeks of logs against it */
function trainRxHtml(last, ctx) {
  const gk = goalKey(), base = goalBase(gk), rx = [];
  // a) the goal
  if (gk === 'strength') rx.push('스쿼트·벤치·데드처럼 큰 종목을 <b>운동 초반에</b>, <b>8회 이하로 드는 무게</b>로 종목당 <b>2–3세트</b>. 끝까지 내리고 올리기');
  else if (gk === 'health' || base === 'keep') rx.push('주 <b>2회 이상</b> 전신, 하체·등·가슴 같은 큰 근육 위주. 가벼운 무게를 <b>빠르게 드는 세트</b>도 섞으면 걷기·균형에 좋아요');
  else if (base === 'cut') rx.push('부위마다 주 <b>10세트 이상 유지</b>, 무게는 줄이지 않기 — 근육을 지키는 신호예요');
  else rx.push('부위마다 주 <b>10–20세트</b>, 세트마다 <b>2–3회 남기고</b> 멈추기, 운동은 주 2회 이상');
  // b) what the InBody shows
  const sg = k => last[k] != null ? +last[k] : null, arms = [sg('segRA'), sg('segLA')], legs = [sg('segRL'), sg('segLL')];
  const weak = ([r, l], name) => r && l && Math.abs(r - l) / Math.max(r, l) >= 0.1 ? `${r < l ? '오른' : '왼'}${name}` : null;
  const wk = weak(legs, '다리') || weak(arms, '팔');
  if (wk) rx.push(`${jo(wk, '이', '가')} 반대쪽보다 10% 이상 약해요 → <b>한쪽씩 하는 운동</b>(런지·싱글 레그 프레스·원암 덤벨)을 약한 쪽부터, 같은 횟수로`);
  const { pf, h } = ctx;
  if (h && pf.sex && arms[0] && arms[1] && legs[0] && legs[1] && (arms[0] + arms[1] + legs[0] + legs[1]) / (h * h) < (pf.sex === 'f' ? 5.7 : 7.0)) rx.push('팔다리 근육이 기준보다 적어요 → <b>하체·등</b> 큰 근육부터 채우세요');
  else if (ctx.musLv === '적은 편') rx.push('근육량이 적은 편이라 <b>전신 루틴 주 3회</b>로 큰 근육부터 키우는 게 빨라요');
  if (last.vfl != null && last.vfl >= 10) rx.push(`내장지방 ${trimNum(last.vfl)} → 근력운동과 별도로 <b>유산소 주 150분</b> 이상`);
  // c) the last two weeks against it
  const anyStr = allSets().some(s => !isCardioSet(s));
  if (!anyStr) { rx.push('아직 운동 기록이 없어요 → 운동 탭 <b>루틴</b>에서 추천 루틴으로 시작'); if (base === 'cut' || gk === 'health') rx.push('유산소 <b>주 150분</b> (빠르게 걷기 하루 20–30분)'); }
  else {
    const R = buildReport(), main = ['가슴', '등', '어깨', '다리'];
    const low = main.filter(m => R.mv14.vol[m] < volRange(m)[0]).map(m => `${mName(m)} ${r1(R.mv14.vol[m])}→${volRange(m)[0]}`);
    const high = STRENGTH_MUSCLES.filter(m => R.mv14.vol[m] > volRange(m)[1]).map(m => `${mName(m)} ${r1(R.mv14.vol[m])}`);
    if (gk !== 'strength' && gk !== 'health') rx.push(low.length ? `지금 기록: <b>${esc(low.join(' · '))}세트</b>로 늘리기` : '지금 기록: 주요 부위 모두 주 10세트 이상 ✓');
    if (high.length) {
      // above 20 the extra sets still help a little; the person's own trend decides whether it's worth it
      const P = progression(), hm = STRENGTH_MUSCLES.filter(m => R.mv14.vol[m] > volRange(m)[1]);
      const rising = hm.filter(m => P.some(p => p.m === m && p.status === 'up') && !P.some(p => p.m === m && p.status === 'down'));
      rx.push(rising.length === hm.length
        ? `${esc(high.join(' · '))}세트 — 고볼륨이지만 이 부위 무게가 오르고 있어요. 회복되면 유지해도 돼요`
        : `${esc(high.join(' · '))}세트 — 20세트를 넘으면 세트당 효과는 줄어요. 무게가 정체되거나 피곤하면 여기부터 줄이세요`);
    }
    if (base === 'cut' || gk === 'health') { const car = setsBetween(addDays(today(), -6), today()).filter(isCardioSet).reduce((a, s) => a + (+s.mins || 0), 0); rx.push(`유산소 주 150분 목표 · 최근 7일 <b>${fmtInt(car)}분</b>${car >= 150 ? ' ✓' : ` → ${fmtInt(150 - car)}분 더 (빠르게 걷기 하루 20–30분)`}`); }
  }
  return `<div class="ibtodo ibrx"><div class="k">운동 처방</div><ol>${rx.map(t => `<li>${t}</li>`).join('')}</ol></div>`;
}
function profileHtml() {
  const pf = DB.settings.profile || {};
  return `<section class="card" style="margin-top:10px"><h3>내 정보 <span class="small muted" style="font-weight:600">선택 · 인바디 분석용</span></h3>
    <div class="grid3">
      <div class="field" style="margin-top:0"><label>성별</label><div class="seg">${[['m', '남'], ['f', '여']].map(([v, l]) => `<button class="${pf.sex === v ? 'on' : ''}" data-act="pf-sex" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:0"><label>출생연도</label><input type="number" inputmode="numeric" min="1930" max="2015" placeholder="1995" value="${pf.birth || ''}" data-on="pf-birth"></div>
      <div class="field" style="margin-top:0"><label>키 (cm)</label><input type="number" inputmode="decimal" min="120" max="230" placeholder="175" value="${pf.height || ''}" data-on="pf-height"></div>
    </div></section>`;
}

/* ---------- daily intake targets from body composition + goal ----------
   Energy: resting rate from fat-free mass (Katch-McArdle) when InBody has body fat, else Mifflin-St Jeor,
   times an activity factor from how often you trained in the last 4 weeks, then the goal adjustment.
   Protein/fat/carbs per goal follow the papers listed with each line. */
/* ---------- energy expenditure ----------
   Resting: InBody fat-free mass (Katch-McArdle) → else weight/height/age (Mifflin-St Jeor) → else averages.
   Exercise: MET × kg × hours (Ainsworth Compendium). Strength ≈ 5 MET (between moderate 3.5 and vigorous 6);
   session length from the set timestamps, or ~2.5 min per set when sets were logged in one go. */
function bodyEnergy() {
  const ib = DB.inbody.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).filter(e => e.weight != null);
  const lastIb = ib[ib.length - 1];
  const realBw = latestBodyweight() || (lastIb && lastIb.weight) || null;
  const bw = realBw || 70;
  const pf = DB.settings.profile || {}, age = pf.birth ? new Date().getFullYear() - pf.birth : null;
  const fatPct = lastIb ? (lastIb.fatPct != null ? lastIb.fatPct : lastIb.fatKg != null ? lastIb.fatKg / lastIb.weight * 100 : null) : null;
  const ffm = fatPct != null ? bw * (1 - fatPct / 100) : null;
  if (ffm) return { bw, realBw, ffm, fatPct, src: 'inbody', rmr: 370 + 21.6 * ffm, how: `인바디 제지방 ${r1(ffm)}kg 기준 (Katch-McArdle)` };
  if (pf.sex && age && pf.height) return { bw, realBw, src: 'formula', rmr: 10 * bw + 6.25 * pf.height - 5 * age + (pf.sex === 'm' ? 5 : -161), how: `체중 ${trimNum(bw)}kg·키·나이 기준 (Mifflin-St Jeor)` };
  // averages: weight if known, otherwise a 70kg adult; ~22 kcal/kg/day is a typical resting rate
  return { bw, realBw, src: 'avg', rmr: bw * 22, how: realBw ? `체중 ${trimNum(bw)}kg × 평균 대사율 (인바디·키·나이를 넣으면 정확해져요)` : '평균 성인(70kg) 기준 — 체중이나 인바디를 넣으면 내 몸 기준으로 바뀌어요' };
}
const CARDIO_MET = { '러닝/걷기': null, '사이클': 7.0, '일립티컬': 5.0, '계단': 9.0, '로잉': 7.0 };
function cardioMet(s) {
  if (s.type === '러닝/걷기' || /트레드밀|러닝|걷기/.test(s.name || '')) {
    const v = s.km && s.mins ? s.km / (s.mins / 60) : null; // km/h
    return v == null ? 6.0 : v >= 11 ? 11.0 : v >= 9.5 ? 9.8 : v >= 8 ? 8.3 : v >= 6.5 ? 5.0 : 3.5;
  }
  return CARDIO_MET[s.type] || 6.0;
}
function dayExercise(k, bw) {
  const sets = dayRO(k).sets || [];
  const str = sets.filter(s => !isCardioSet(s)), car = sets.filter(isCardioSet);
  let strMin = 0;
  if (str.length) {
    const ts = str.map(s => s.t).filter(Boolean).sort((a, b) => a - b);
    const span = ts.length > 1 ? (ts[ts.length - 1] - ts[0]) / 60000 + 2 : 0;
    // logged live → use the real time span; logged all at once → assume ~2.5 min per set incl. rest
    strMin = span >= str.length * 1.2 ? Math.min(span, 150) : str.length * 2.5;
  }
  const strK = 5.0 * bw * strMin / 60;
  let carK = 0, carMin = 0;
  for (const s of car) { const m = +s.mins || 0; carMin += m; carK += s.kcal > 0 ? +s.kcal : cardioMet(s) * bw * m / 60; }
  return { strMin: Math.round(strMin), strK: Math.round(strK), carMin: Math.round(carMin), carK: Math.round(carK), total: Math.round(strK + carK) };
}
function energySummary(days) {
  const E = bodyEnergy(), t = today(), per = [];
  for (let i = days - 1; i >= 0; i--) { const k = addDays(t, -i); per.push(Object.assign({ k }, dayExercise(k, E.bw))); }
  const ex = per.reduce((a, x) => a + x.total, 0);
  const base = E.rmr * 1.2; // resting + everyday living + digestion, before planned exercise
  return { E, per, ex, exAvg: ex / days, base, tdee: base + ex / days };
}

function macroPlan() {
  const S28 = energySummary(28), E = S28.E;
  if (!E.realBw) return null;
  const bw = E.bw, ffm = E.ffm || null, fatPct = E.fatPct, rmr = E.rmr, rmrHow = E.how;
  const days = new Set(setsBetween(addDays(today(), -27), today()).map(s => s.date)).size / 4;
  const af = r1(S28.tdee / rmr);
  const tdee = S28.tdee, exAvg = Math.round(S28.exAvg);
  const key = goalBase(), gk = goalKey();
  // cut −0.7%/wk; contest −0.5%/wk (leaner people lose less muscle going slower, Garthe 2011); 7700 kcal ≈ 1 kg
  const kcalBy = { cut: tdee - bw * 0.007 * 7700 / 7, contest: tdee - bw * 0.005 * 7700 / 7, recomp: tdee * 0.95, keep: tdee, health: tdee, strength: tdee * 1.05, leanbulk: tdee * 1.07, bulk: tdee * 1.15 };
  const kcal = Math.round(kcalBy[gk] / 10) * 10;
  /* protein
     Morton 2018 (49 trials): extra muscle from protein levels off around 1.6 g/kg body weight (95% CI up to 2.2).
     Helms 2014's 2.3–3.1 g/kg of fat-free mass is for already-lean natural bodybuilders late in contest prep,
     so it is used only for the contest goal, at its low end. Ordinary cuts get 1.8 g/kg, and with a body fat
     reading the target is capped by fat-free mass so extra fat doesn't inflate it. */
  const pMin = Math.round(bw * 1.6);
  let p, pHow;
  if (gk === 'contest') { p = ffm ? Math.min(Math.round(ffm * 2.3), Math.round(bw * 2.2)) : Math.round(bw * 2.0); pHow = ffm ? `바프 컷팅이라 높게: 제지방 ${r1(ffm)}kg × 2.3g (체중 1kg당 ${r1(p / bw)}g)` : '바프 컷팅이라 높게: 체중 1kg당 2.0g'; }
  else if (key === 'cut' || key === 'recomp') { p = ffm ? Math.min(Math.round(bw * 1.8), Math.round(ffm * 2.2)) : Math.round(bw * 1.8); pHow = p < pMin ? `체지방이 많아 제지방 기준으로: 제지방 ${r1(ffm)}kg × 2.2g` : `감량 중이라 조금 높게: 체중 1kg당 ${r1(p / bw)}g`; }
  else { p = pMin; pHow = '체중 1kg당 1.6g — 이 이상은 근육 증가 효과가 거의 늘지 않아요'; }
  if (p > pMin) pHow += ` · 하루 ${pMin}g(1.6g/kg)만 넘어도 근육 효과의 대부분은 얻어요`;
  // fat: cut 20% of energy, otherwise 25%, never under 0.6 g/kg (Helms 2014, Iraki 2019)
  const f = Math.max(Math.round(kcal * (key === 'cut' ? 0.2 : 0.25) / 9), Math.round(bw * 0.6));
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  return { bw, ffm, fatPct, rmr: Math.round(rmr), rmrHow, af, days: r1(days), exAvg, tdee: Math.round(tdee), kcal, p, pHow, f, c, key, perMeal: Math.round(bw * 0.4) };
}
function macroCardHtml() {
  const M = macroPlan();
  if (!M) return `<section class="card" style="margin-top:10px"><h3>하루 섭취 목표</h3><div class="small muted">체중이나 인바디를 기록하면 목표에 맞는 칼로리·탄단지를 계산해요.</div></section>`;
  const g = GOALS[M.key], adj = { cut: `감량 주 0.7% (하루 약 −${fmtInt(M.tdee - M.kcal)}kcal)`, recomp: '유지보다 5% 적게', keep: '유지', leanbulk: '유지보다 7% 많게', bulk: '유지보다 15% 많게' }[M.key];
  const pct = x => Math.round(x / M.kcal * 100);
  return `<section class="card" style="margin-top:10px"><div class="row between"><h3 style="margin:0">하루 섭취 목표</h3><span class="small muted">${esc(g.l)} 기준</span></div>
    <div class="macro4">
      <div><div class="k">칼로리</div><div class="v">${fmtInt(M.kcal)}</div><div class="k">kcal</div></div>
      <div><div class="k">단백질</div><div class="v">${M.p}g</div></div>
      <div><div class="k">탄수화물</div><div class="v">${M.c}g</div></div>
      <div><div class="k">지방</div><div class="v">${M.f}g</div></div>
    </div>
    <div class="small" style="margin-top:8px">${M.kcal === M.tdee ? `유지 칼로리 ${fmtInt(M.tdee)}kcal 그대로` : `유지 칼로리(${fmtInt(M.tdee)}kcal)보다 <b>${fmtInt(Math.abs(M.tdee - M.kcal))}kcal ${M.kcal < M.tdee ? '적게' : '많이'}</b>`}</div>
    ${mealPlanHtml(M)}</section>`;
}
/* the day's targets as meals of ordinary Korean food: how much rice, how much meat/eggs per meal */
const RICE_C = 65, RICE_P = 6; // 1 bowl (210 g) of cooked rice
function riceTxt(c) {
  const x = Math.max(0, (c - 12) / RICE_C); // ~12 g carbs come from side dishes
  if (x < 0.25) return '';
  const opts = [[0.33, '1/3공기'], [0.5, '반 공기'], [0.67, '2/3공기'], [1, '1공기'], [1.33, '1공기 조금 넘게'], [1.5, '1공기 반'], [2, '2공기']];
  const [v, l] = opts.reduce((a, b) => Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a);
  return `밥 ${l}(약 ${Math.round(210 * v / 10) * 10}g)`;
}
function mealPlanHtml(M) {
  const n = DB.settings.mealN === 4 ? 4 : 3;
  const meals = n === 3 ? [['아침', 0.3, 1 / 3], ['점심', 0.35, 1 / 3], ['저녁', 0.35, 1 / 3]]
    : [['아침', 0.25, 0.25], ['점심', 0.3, 0.27], ['간식 · 운동 전후', 0.15, 0.18], ['저녁', 0.3, 0.3]];
  const g10 = x => Math.max(50, Math.round(x / 10) * 10);
  const rows = meals.map(([name, ks, ps]) => {
    const kc = M.kcal * ks, p = Math.round(M.p * ps), c = M.c * ks, rice = riceTxt(c), rp = rice ? RICE_P : 0;
    let food;
    if (name === '아침') {
      const eggs = Math.min(3, Math.max(2, Math.round((p - rp) / 6))), left = p - rp - eggs * 6;
      food = `계란 ${eggs}개${left >= 14 ? ' + 그릭요거트 1개 + 우유 1컵' : left >= 7 ? ' + 그릭요거트 1개' : left >= 4 ? ' + 우유 1컵' : ''}${rice ? ` + ${rice}` : ''}`;
    } else if (name === '점심') food = `일반식 — 고기·생선 반찬 약 ${g10((p - rp - 5) / 0.2)}g${rice ? ` + ${rice}` : ''} + 채소`;
    else if (name === '저녁') food = `닭가슴살·살코기·생선 약 ${g10((p - rp - 3) / 0.25)}g${rice ? ` + ${rice}` : ''} + 채소`;
    else food = `${p >= 20 ? '프로틴 1스쿱 또는 그릭요거트 200g' : '그릭요거트 1개 또는 우유 1컵'}${c >= 40 ? ' + 바나나나 고구마 1개' : c >= 20 ? ' + 바나나 1개' : ''}`;
    return `<div class="meal-row"><div class="mt"><b>${name}</b><span class="num">${fmtInt(Math.round(kc / 10) * 10)}kcal · 단백질 ${p}g</span></div><div class="mf">${esc(food)}</div></div>`;
  }).join('');
  return `<details class="mealplan" ${state.mealOpen ? 'open' : ''}><summary><b>이렇게 먹으면 돼요</b><span class="small muted">${n}끼 기준</span></summary>
    <div class="row between" style="gap:8px;margin-top:8px"><span class="small muted">하루 끼니</span><div class="seg" style="width:130px">${[3, 4].map(v => `<button class="${n === v ? 'on' : ''}" data-act="meal-n" data-v="${v}">${v}끼</button>`).join('')}</div></div>
    ${rows}
    <ul class="mtips"><li>외식·일반식이면 <b>밥 양</b>과 <b>고기 반찬 양</b>만 맞추면 돼요. 국물·튀김은 줄이고요.</li>
      <li>단백질은 한 끼에 몰지 말고 끼니마다 비슷하게 나눠요.</li>
      <li>요리 기름·견과류는 한 끼 1스푼 정도면 지방 ${M.f}g에 맞아요.</li></ul>
    <div class="note">양은 대략이에요. 2–3주 체중 추세를 보고 밥 양으로 조절하세요 (Schoenfeld & Aragon 2018 · Morton 2018).</div></details>`;
}

function goalCardHtml(list) {
  const key = goalKey(), g = GOALS[key], chosen = !!GOALS[DB.settings.mode];
  const bw = latestBodyweight(), mac = bw ? goalMacros(key, bw) : null, G = DB.settings.goals;
  const fb = inbodyGoalFeedback(list);
  const matches = mac && Math.abs(G.kcal - mac.kcal) <= 50 && Math.abs(G.p - mac.p) <= 5;
  return `<div class="sec-h" style="margin-top:4px"><h2>내 목표</h2><span class="aside">${chosen ? '바꾸면 피드백이 바로 바뀌어요' : '골라야 맞춤 피드백이 나와요'}</span></div>
  <div class="chips goalchips">${GOAL_ORDER.map(k => `<button class="chip ${chosen && k === key ? 'on' : ''}" data-act="goal-set" data-v="${k}">${GOALS[k].l}</button>`).join('')}</div>
  <section class="card" style="margin-top:8px">
    <div style="font-weight:800">${chosen ? esc(g.l) : '목표 미선택 · 유지 기준으로 봐요'} <span class="small muted" style="font-weight:600">— ${esc(g.d)}</span></div>
    <div class="goalgrid" ${SHOW_DIET ? '' : 'style="grid-template-columns:1fr"'}>
      <div><div class="k">목표 체중 속도</div><div class="v">${pctTxt(g.rate[0]).replace('%', '')}~${pctTxt(g.rate[1])}</div><div class="k">주당</div></div>
      ${SHOW_DIET ? `<div><div class="k">단백질</div><div class="v">${bw ? `${mac.p}g` : `${g.p}g/kg`}</div><div class="k">${bw ? `${g.p}g/kg` : '체중 1kg당'}</div></div>
      <div><div class="k">칼로리</div><div class="v">${mac ? fmtInt(mac.kcal) : `${Math.round(g.kc * 100)}%`}</div><div class="k">${mac ? 'kcal/일' : '유지 대비'}</div></div>` : ''}
    </div>
    ${SHOW_DIET && mac && !matches ? `<button class="btn sm block" style="margin-top:10px" data-act="goal-macros">식단 목표를 이 숫자로 바꾸기</button>` : ''}
    ${SHOW_DIET && !bw ? '<div class="note">체중을 기록하면 칼로리·단백질을 g 단위로 계산해 드려요.</div>' : ''}
    <div class="divider"></div>
    <div class="k" style="font-size: 12px;color:var(--ink3);font-weight:700;margin-bottom:4px">인바디 피드백 · ${esc(g.l)} 기준</div>
    ${fb ? `<span class="status ${fb.lv}">${ICON[fb.lv]} ${esc(fb.t)}</span>
      <div style="margin-top:4px;font-size: 14px">${esc(fb.a)}</div>
      <div class="small muted" style="margin-top:6px">${shortDate(fb.base.date)} → ${shortDate(fb.last.date)} (${fb.span}일) · 골격근 ${fb.dm > 0 ? '+' : ''}${fb.dm}kg · 체지방 ${fb.df > 0 ? '+' : ''}${fb.df}kg</div>
      <div class="note">인바디는 수분·식사에 따라 ±1kg 정도 흔들려요. 같은 시간대·같은 조건(아침 공복 등)에서 잰 값끼리 비교하세요.</div>`
    : `<div class="small muted">골격근량과 체지방량을 넣은 인바디를 2번 이상(3–4주 간격) 기록하면 목표 기준으로 평가해요.</div>`}
  </section>`;
}

/* ---------- the range band (InBody result-sheet row) ----------
   Under / standard / over zones sit at the same positions in every row of a block, so rows line up and read
   the way the InBody sheet does. lo–hi is the standard zone; max caps the over zone. */
function bandPos(v, lo, hi, max) {
  if (v == null || isNaN(v)) return 0;
  if (v <= lo) return lo > 0 ? Math.max(0, v / lo * 34) : 0;
  if (v <= hi) return 34 + (v - lo) / Math.max(1e-9, hi - lo) * 33;
  const top = Math.max(max || hi * 1.8, hi + 1e-9);
  return Math.min(100, 67 + (v - hi) / (top - hi) * 33);
}
function bandHead(labels) {
  const [a, b, c] = labels || ['표준이하', '표준', '표준이상'];
  return `<div class="bandhead" aria-hidden="true"><span></span><div class="bh"><i>${a}</i><i>${b}</i><i>${c}</i></div></div>`;
}
/* o: { label, sub, v, lo, hi, max, text, ghost (lighter extension up to this value), mark (true = red fill), small } */
function bandRow(o) {
  const p = bandPos(o.v, o.lo, o.hi, o.max), g = o.ghost != null ? bandPos(o.ghost, o.lo, o.hi, o.max) : null;
  const end = Math.max(p, g || 0), inside = end > 76;
  return `<div class="bandrow ${o.small ? 'sm' : ''}" role="img" aria-label="${esc(o.label)} ${esc(String(o.text != null ? o.text : o.v))}">
    <div class="bl"><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</div>
    <div class="bt"><div class="bz"></div>${g != null && g > p ? `<div class="bf ghost" style="width:${g}%"></div>` : ''}<div class="bf ${o.mark ? 'mark' : ''}" style="width:${p}%"></div>
      <span class="bv ${inside ? 'in' : ''}" style="${inside ? `right:${100 - end}%` : `left:${end}%`}">${o.text != null ? o.text : trimNum(o.v)}</span></div>
  </div>`;
}
/* latest InBody as the sheet's 골격근·지방분석 block: value + where it sits on the standard band */
function latestInbodyHtml(last, prev, delta) {
  const pf = DB.settings.profile || {}, age = pf.birth ? new Date().getFullYear() - pf.birth : null, h = pf.height ? pf.height / 100 : null;
  const rows = [];
  const fp = last.fatPct != null ? last.fatPct : last.fatKg != null && last.weight ? last.fatKg / last.weight * 100 : null;
  if (last.weight != null) {
    const lo = h ? 18.5 * h * h : last.weight * 0.85, hi = h ? 23 * h * h : last.weight * 1.15; // Asian BMI 18.5–23 (WHO 2004)
    rows.push(bandRow({ label: '체중', sub: `kg ${delta(last, prev, 'weight')}`, v: last.weight, lo, hi, max: hi * 1.35, text: trimNum(last.weight) }));
  }
  if (last.muscle != null) {
    // standard zone from fat-free-mass index (FFMI) 18–22 men / 14–18 women (Kouri 1995 ranges), as muscle ≈ 56% of FFM
    const [a, b] = pf.sex === 'f' ? [14, 18] : [18, 22], hh = h || 1.72, lo = a * hh * hh * 0.56, hi = b * hh * hh * 0.56;
    rows.push(bandRow({ label: '골격근량', sub: `kg ${delta(last, prev, 'muscle')}`, v: last.muscle, lo, hi, max: hi * 1.3, text: trimNum(last.muscle) }));
  }
  const band = fp != null && pf.sex && age ? bfBand(fp, pf.sex, age) : null;
  const fpr = band ? (band.healthy.match(/[\d.]+/g) || []).map(Number) : (pf.sex === 'f' ? [21, 32] : [8, 19]);
  if (last.fatKg != null) {
    const w = last.weight || 70; // standard fat mass = healthy body-fat % band × weight (Gallagher 2000)
    rows.push(bandRow({ label: '체지방량', sub: `kg ${delta(last, prev, 'fatKg', true)}`, v: last.fatKg, lo: w * fpr[0] / 100, hi: w * fpr[1] / 100, max: w * fpr[1] / 100 * 1.8, text: trimNum(last.fatKg) }));
  }
  const obes = [];
  if (fp != null) obes.push(bandRow({ label: '체지방률', sub: `% ${delta(last, prev, 'fatPct', true)}`, v: fp, lo: fpr[0], hi: fpr[1], max: fpr[1] * 1.8, text: r1(fp), mark: band && band.lv !== 'good' }));
  if (last.weight != null && h) { const bmi = last.weight / (h * h); obes.push(bandRow({ label: 'BMI', sub: 'kg/m²', v: bmi, lo: 18.5, hi: 23, max: 32, text: r1(bmi) })); }
  if (last.vfl != null) obes.push(bandRow({ label: '내장지방', sub: '레벨', v: last.vfl, lo: 1, hi: 9, max: 20, text: trimNum(last.vfl), mark: last.vfl >= 10 }));
  return `<div class="sec-h" style="margin-top:4px"><h2>최근 인바디</h2><span class="aside">${esc(last.date)}${prev ? ' · ▲▼ 직전 대비' : ''}</span></div>
    <section class="card sheetblock">
      ${rows.length ? `<div class="blk-t">골격근·지방</div>${bandHead()}${rows.join('')}` : ''}
      ${obes.length ? `<div class="blk-t">비만 지표</div>${bandHead()}${obes.join('')}` : ''}
    </section>`;
}
function viewBody() {
  const list = DB.inbody.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const last = list[list.length - 1], prev = list[list.length - 2], first = list[0];
  const delta = (cur, base, key, inv) => {
    if (!cur || !base || cur[key] == null || base[key] == null) return '';
    const d = r1(cur[key] - base[key]); const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    return `<span class="delta ${cls} ${inv ? 'inv' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : '–'} ${Math.abs(d)}</span>`;
  };
  let h = '';
  if (last) h += latestInbodyHtml(last, prev, delta);
  h += goalCardHtml(list);
  if (last) h += inbodyAnalysisHtml(list);
  h += macroCardHtml() + weightCardHtml();
  if (last) {
    const series = [['weight', '체중 (kg)', 'var(--m-chest)'], ['muscle', '골격근량 (kg)', 'var(--m-shoulder)'], ['fatPct', '체지방률 (%)', 'var(--m-back)']];
    for (const [key, label, color] of series) {
      const pts = list.filter(e => e[key] != null).map(e => ({ date: e.date, y: +e[key], tip: `${shortDate(e.date)} · ${trimNum(e[key])}` }));
      if (pts.length >= 2) h += `<section class="card" style="margin-top:10px"><h3>${label}</h3>${lineChart(pts, { color, aria: label + ' 추이' })}</section>`;
    }
  }
  h += `<div class="sec-h"><h2>인바디 / 체중 기록</h2></div>` + profileHtml() + `<section class="card" style="margin-top:10px">
    <div class="photo-pick"><div class="pv" id="ib-pv">${state.ibPhoto ? `<img src="${state.ibPhoto}" alt="">` : '사진'}</div>
      <div><div class="row" style="gap:6px;flex-wrap:wrap"><label class="btn sm" for="ib-file"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg> 찍기</label><label class="btn sm" for="ib-file-album"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg> 앨범에서 고르기</label></div>
        <input type="file" id="ib-file" accept="image/*" capture="environment" class="hidden" data-on="ib-file">
        <input type="file" id="ib-file-album" accept="image/*" class="hidden" data-on="ib-file">
      <div class="note" style="margin-top:6px">결과지를 찍으면 숫자를 자동으로 읽어서 아래 칸에 채워요. 결과지 전체가 반듯하게, 그림자 없이 나오게 찍어주세요.</div></div></div>
    <div id="ib-ocr" class="ocrstat"></div>
    <div class="grid2"><div class="field"><label>측정일</label><input type="date" id="ib-date" value="${state.date}"></div>
      <div class="field"><label>체중 (kg)</label><input type="number" inputmode="decimal" id="ib-w" placeholder="72.5"></div></div>
    <div class="grid3"><div class="field"><label>골격근량</label><input type="number" inputmode="decimal" id="ib-m" placeholder="kg"></div>
      <div class="field"><label>체지방량</label><input type="number" inputmode="decimal" id="ib-fk" placeholder="kg"></div>
      <div class="field"><label>체지방률</label><input type="number" inputmode="decimal" id="ib-fp" placeholder="%"></div></div>
    <div class="note">체중과 체지방량을 넣으면 체지방률은 비워도 자동 계산돼요.</div>
    <details class="more" id="ib-more"><summary>결과지의 다른 항목도 넣기 · 선택</summary>
      <div class="grid3">${IB_EXTRA.map(([k, l, u]) => `<div class="field"><label>${l}${u ? ` <span class="muted">${u}</span>` : ''}</label><input type="number" inputmode="decimal" step="any" id="ib-x-${k}"></div>`).join('')}</div>
      <div class="flabel" style="margin-top:12px">부위별 근육량 (kg) · 결과지의 "부위별 근육분석"</div>
      <div class="grid3">${IB_SEG.map(([k, l]) => `<div class="field" style="margin-top:4px"><label>${l}</label><input type="number" inputmode="decimal" step="any" id="ib-x-${k}"></div>`).join('')}</div>
      <div class="note">넣은 만큼 분석이 늘어나요: 내장지방·복부지방률(뱃살), 세포외수분비(붓기·염증), 위상각(근육 상태), 팔·다리 근육량(좌우 균형·근감소 기준).</div>
    </details>
    <button class="btn primary block" style="margin-top:12px;padding:13px" data-act="ib-save">기록 저장</button>
  </section>`;
  if (list.length) {
    h += `<section class="card" style="margin-top:10px"><h3>히스토리</h3>${list.slice().reverse().map(e => `<div class="ibrow">
      <button class="th" ${e.hasPhoto ? `data-act="ib-photo" data-id="${esc(e.id)}"` : ''}>${e.hasPhoto && PHOTOS[e.id] ? `<img src="${PHOTOS[e.id]}" alt="결과지">` : '—'}</button>
      <div class="main"><div class="dt">${esc(e.date)}</div><div class="nums">${[e.weight != null ? `체중 ${trimNum(e.weight)}` : '', e.muscle != null ? `골격근 ${trimNum(e.muscle)}` : '', e.fatKg != null ? `체지방 ${trimNum(e.fatKg)}kg` : '', e.fatPct != null ? `${trimNum(e.fatPct)}%` : ''].filter(Boolean).join(' · ') || '사진만'}${IB_EXTRA.concat(IB_SEG).filter(([k]) => e[k] != null).length ? ` <span class="muted">+${IB_EXTRA.concat(IB_SEG).filter(([k]) => e[k] != null).length}항목</span>` : ''}</div></div>
      <button class="x" data-act="ib-del" data-id="${esc(e.id)}" aria-label="삭제">×</button></div>`).join('')}</section>`;
  }
  return h;
}
function compressImage(file, maxW, q) {
  return new Promise(res => {
    const rd = new FileReader();
    rd.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, maxW / img.width), w = Math.round(img.width * sc), h = Math.round(img.height * sc);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        try { res(cv.toDataURL('image/jpeg', q)); } catch (e) { res(null); }
      };
      img.onerror = () => res(null); img.src = ev.target.result;
    };
    rd.onerror = () => res(null); rd.readAsDataURL(file);
  });
}

/* =====================================================================
   13. settings
   ===================================================================== */
function openSettings(focus) {
  const S = DB.settings, G = S.goals;
  state.sheet = { kind: 'settings' };
  openSheet('설정', '오운완', `
    <button class="btn block" style="margin-bottom:10px" data-act="tut-open">처음 사용법 다시 보기 (2분)</button>
    <div class="setlist">
      <div class="item"><div class="main"><div class="t">기본 무게 단위</div><div class="d">새 기구의 기본값. 기구별로 마지막 단위를 따로 기억해요.</div></div>
        <div class="unitseg"><button class="${S.unit === 'kg' ? 'on' : ''}" data-act="st-unit" data-u="kg">kg</button><button class="${S.unit === 'lb' ? 'on' : ''}" data-act="st-unit" data-u="lb">lb</button></div></div>
      <div class="item"><div class="main"><div class="t">세트 후 휴식 타이머 자동 시작</div></div>
        <label class="switch"><input type="checkbox" ${S.autoRest ? 'checked' : ''} data-on="st-autorest"><span></span></label></div>
      ${isNative ? `<div class="item"><div class="main"><div class="t">휴식 끝 알림</div><div class="d">화면이 꺼져 있어도 알림으로 알려줘요.</div></div>
        <label class="switch"><input type="checkbox" ${S.notify ? 'checked' : ''} data-on="st-notify"><span></span></label></div>` : ''}
      <div class="item"><div class="main"><div class="t">테마</div></div>
        <div class="seg" style="width:180px">${[['auto', '자동'], ['dark', '다크'], ['light', '라이트']].map(([v, l]) => `<button class="${S.theme === v ? 'on' : ''}" data-act="st-theme" data-v="${v}">${l}</button>`).join('')}</div></div>
    </div>
    ${SHOW_DIET ? `<div class="sec-h" id="goals-h"><h2 style="font-size: 15px">식단 목표</h2></div>
    <div class="field"><label>체중 (kg) — 단백질 g/kg 계산용 · 비우면 인바디 최근값 사용</label><input type="number" inputmode="decimal" id="st-bw" value="${S.bw || ''}" placeholder="${latestBodyweight() || '예: 72'}"></div>
    <div class="grid2">
      <div class="field"><label>칼로리 (kcal)</label><input type="number" id="st-k" value="${G.kcal}"></div>
      <div class="field"><label>단백질 (g)</label><input type="number" id="st-p" value="${G.p}"></div>
      <div class="field"><label>탄수화물 (g)</label><input type="number" id="st-c" value="${G.c}"></div>
      <div class="field"><label>지방 (g)</label><input type="number" id="st-f" value="${G.f}"></div>
    </div>
    <div class="field"><label>목표 — 누르면 식단 목표가 자동 계산돼요</label><div class="chips goalchips">${GOAL_ORDER.map(v => `<button class="chip ${goalKey() === v && GOALS[S.mode] ? 'on' : ''}" data-act="st-auto" data-v="${v}">${GOALS[v].l}</button>`).join('')}</div>
      <div class="note">체중 기준 대략적인 시작값이에요. 칼로리는 체중×30(유지)에 목표별 배수(살 빼기 80% · 체형 바꾸기 95% · 천천히 증량 107% · 빠르게 증량 115%), 단백질은 살 빼기·체형 바꾸기 1.8g/kg, 바프 컷팅 2.0g/kg, 나머지 1.6g/kg, 지방 0.9g/kg, 나머지는 탄수화물. 2–3주 체중 변화를 보고 조정하세요.</div></div>
    <button class="btn primary block" style="margin-top:12px" data-act="st-save-goals">목표 저장</button>` : ''}

    <div class="sec-h"><h2 style="font-size: 15px">기능 설명</h2><span class="aside">누르면 펼쳐져요</span></div>
    ${guideHtml()}
    <div class="sec-h"><h2 style="font-size: 15px">참고 논문</h2><span class="aside">${REFS.length}편</span></div>
    <details class="more" style="margin-top:0"><summary>분석·추천에 쓴 논문 보기</summary>
      <ol class="reflist" style="padding-left:18px;margin:6px 0 0">${REFS.map(r => `<li>${esc(r.text)} <a href="${esc(r.url)}" target="_blank" rel="noopener">링크</a><span class="use">→ ${esc(r.use)}</span></li>`).join('')}</ol>
      <div class="note">연구의 평균적인 결과를 규칙으로 옮긴 참고용이에요. 개인차가 크고, 통증·부상은 전문가와 상담하세요.</div></details>

    <div class="sec-h"><h2 style="font-size: 15px">내 헬스장</h2><span class="aside">${(DB.settings.gym || []).length}개 체크</span></div>
    <button class="btn block" data-act="gym-open">헬스장 머신 등록·수정</button>
    <div class="sec-h"><h2 style="font-size: 15px">데이터</h2></div>
    <div class="grid2"><button class="btn" data-act="export">백업 내보내기</button><button class="btn" data-act="import">백업 가져오기</button></div>
    <div class="note">기록은 이 기기에만 저장돼요. 폰을 바꾸거나 앱을 지우기 전에 백업 파일을 꼭 저장하세요. 인바디 사진도 백업에 포함돼요.</div>
    <button class="btn block danger ghost" style="margin-top:14px" data-act="reset">모든 데이터 초기화</button>
    <div class="note" style="text-align:center;margin-top:14px">오운완 6.6.4 · ${isNative ? 'Android 앱' : '웹'}</div>`, state.sheet);
  if (focus === 'goals') setTimeout(() => { const g = $('#goals-h'); if (g) g.scrollIntoView({ block: 'start' }); }, 260);
}

async function exportData() {
  DB.settings.lastBackup = today(); save();
  const data = JSON.stringify({ app: 'ironlog', exported: new Date().toISOString(), db: DB, photos: PHOTOS });
  const name = `ounwan-backup-${today()}.json`;
  if (isNative && P.Filesystem && P.Share) {
    try {
      const r = await P.Filesystem.writeFile({ path: name, data, directory: 'CACHE', encoding: 'utf8' });
      await P.Share.share({ title: '오운완 백업', text: name, url: r.uri, dialogTitle: '백업 파일 저장/보내기' });
      return;
    } catch (e) { if (String(e && e.message || e).includes('cancel')) return; }
  }
  openSheet('백업 내보내기', '백업 코드', `<div class="small muted">아래 코드를 전부 복사해 메모장이나 카톡 '나에게 보내기'에 저장하세요. 나중에 '백업 가져오기'에 붙여넣으면 복원돼요. APK 앱에서는 파일로 저장돼요.</div>
    <textarea id="bk-code" readonly rows="8" style="margin-top:10px;font-family:var(--mono);font-size: 12px">${esc(data)}</textarea>
    <div class="grid2" style="margin-top:10px"><button class="btn primary" data-act="bk-copy">전체 복사</button><button class="btn" data-act="bk-file">파일로 저장</button></div>`, { kind: 'backup' });
  state.bkData = data; state.bkName = name;
}
function importData(file) {
  const rd = new FileReader();
  rd.onload = () => importText(rd.result);
  rd.readAsText(file);
}
function importText(text) {
  let j, db;
  try { j = JSON.parse(text); db = j.db || j; if (!db || !db.days || typeof db.days !== 'object') throw new Error('형식'); }
  catch (e) { toast('백업 내용을 읽을 수 없어요'); return; }
  askConfirm('현재 기록을 백업 내용으로 바꿀까요? 되돌릴 수 없어요.', '바꾸기', () => {
    try {
      const def = DEFAULTS(), defSettings = def.settings;
      DB = Object.assign(def, db); DB.settings = Object.assign(defSettings, db.settings || {});
      DB.settings.goals = Object.assign(DEFAULTS().settings.goals, (db.settings || {}).goals || {});
      DB.timer = { endAt: null, dur: DB.settings.rest, paused: null };
      PHOTOS = j.photos || {}; savePhotos(); save(); applyTheme(); closeSheet(); render();
      toast('백업을 불러왔어요');
    } catch (e) { toast('백업을 적용하지 못했어요'); }
  });
}

/* =====================================================================
   14. actions (event delegation)
   ===================================================================== */
/* equipment object for an id, even if it was removed from the catalogue or deleted (old records still open) */
function eqOrRecord(eqId) {
  return eqById(eqId) || (() => { const s = allSets().find(x => x.eq === eqId); return s ? { id: eqId, name: s.name, brand: s.brand, m: s.m, type: s.type, kind: isCardioSet(s) ? 'cardio' : 'machine', gone: true } : null; })();
}
function addStrengthSet(e, w, u, r, rir) {
  const wv = w > 0 ? w : 0;
  const set = { id: uid(), eq: e.id, name: e.name, brand: e.brand, m: e.m, type: typeOfEq(e), w: wv, u, kg: r1(toKg(wv, u) * 100) / 100, r, t: Date.now() };
  const gp = gripOf(e); if (gp) set.grip = gp;
  if (rir != null) set.rir = rir;
  const before = (() => { let b = null; for (const x of allSets()) if (x.eq === e.id && x.date < state.date && !isCardioSet(x) && better(x, b)) b = x; return b; })();
  const todayBest = (() => { let b = null; for (const x of dayRO(state.date).sets) if (x.eq === e.id && better(x, b)) b = x; return b; })();
  day(state.date).sets.push(set); DB.eqUnit[e.id] = u; save();
  const isPR = before && better(set, before) && better(set, todayBest);
  const n = day(state.date).sets.filter(s => s.eq === e.id).length;
  // sets entered seconds apart = logging after the workout, so no rest timer
  const batch = Date.now() - (state.lastSetAt || 0) < 30000; state.lastSetAt = Date.now();
  const rest = DB.settings.autoRest && state.date === today() && !batch;
  if (rest) timerStart(DB.settings.rest); else if (batch && DB.timer.endAt) timerStop();
  toast(isPR ? `새 PR · ${fmtSetFull(set)}` : `${n}세트 기록${rest ? ` · 휴식 ${fmtSec(DB.settings.rest)}` : ''}`);
  if (isPR) haptic(120);
  return set;
}
function findSet(id) { return (dayRO(state.date).sets || []).find(s => s.id === id); }

const ACT = {
  'tab': el => { state.tab = el.dataset.tab; closeSheet(); render(); window.scrollTo(0, 0); },
  'date-prev': () => { state.date = addDays(state.date, -1); state.openEq = null; state.planOpen = false; render(); },
  'date-next': () => { state.date = addDays(state.date, 1); state.openEq = null; state.planOpen = false; render(); },
  'date-today': () => { state.date = today(); state.openEq = null; state.planOpen = false; render(); },
  'settings': el => openSettings(el.dataset.focus),
  'sheet-close': el => { if (el.id === 'scrim' && state.sheet && state.sheet.kind === 'tutorial') return; closeSheet(); },
  'hint-off': () => { lsSet('ironlog_hint_off', '1'); render(); },
  'pwa-install': async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null; render(); },

  'timer-start': el => { timerStart(+el.dataset.s); toast(`휴식 ${fmtSec(+el.dataset.s)} 시작`); },
  'rest-default': el => { DB.settings.rest = +el.dataset.s; timerStart(+el.dataset.s); render(); },
  'timer-toggle': () => { if (DB.timer.endAt || DB.timer.paused != null) timerToggle(); else timerStart(DB.timer.dur || DB.settings.rest); },
  'timer-stop': () => { $('#timerbar').classList.remove('done'); timerStop(); },
  'timer-add': el => timerAdd(+el.dataset.d),

  'check': el => { const d = day(state.date); const f = el.dataset.f, v = +el.dataset.v; d.check[f] = d.check[f] === v ? null : v; save(); state.checkOpen = true; render(); },
  'done-toggle': el => {
    const m = el.dataset.m, mus = musclesOfDay(state.date);
    if (mus.auto.has(m)) { toast('세트 기록으로 자동 체크된 부위예요'); return; }
    const d = day(state.date), i = d.done.indexOf(m);
    if (i > -1) d.done.splice(i, 1); else d.done.push(m);
    save(); state.musOpen = true; render();
  },

  'eq-view': el => { state.eqView = el.dataset.v; state.eqQ = ''; if (state.sheet && state.sheet.kind === 'picker') { setSheetBody(pickerHtml()); renderEqList(); } },
  'picker-open': () => openPicker(),
  'eq-m': el => { state.eqM = el.dataset.m; state.pkType = null; $$('#eq-mchips .chip').forEach(c => c.classList.toggle('on', c.dataset.m === state.eqM)); renderEqList(); },
  'fav': (el, ev) => {
    ev.stopPropagation();
    const id = el.dataset.eq, i = DB.fav.indexOf(id);
    if (i > -1) DB.fav.splice(i, 1); else DB.fav.push(id);
    save(); toast(i > -1 ? '즐겨찾기 해제' : '즐겨찾기에 추가');
    if (state.sheet && state.sheet.kind === 'set') refreshSetSheet();
    renderEqList();
  },
  'open-set': el => openSetSheet(el.dataset.eq),
  'eq-more': el => { state.eqOpen[el.dataset.k] = true; renderEqList(); },
  'pk-type': el => { state.pkType = el.dataset.t || null; renderEqList(); const b = $('#sheet-body'); if (b) b.scrollTop = 0; },
  'set-unit': el => {
    const S = state.sheet, nu = el.dataset.u; if (S.u === nu) return;
    for (const r of S.rows) { const w = parseFloat(r.w); if (w > 0) { const conv = fromKg(toKg(w, S.u), nu); r.w = nu === 'lb' ? Math.round(conv / 5) * 5 || r1(conv) : Math.round(conv * 2) / 2; } }
    S.u = nu; DB.eqUnit[S.eq] = nu; save(); refreshSetSheet();
  },
  'apply-sugg': el => { for (const r of state.sheet.rows) { r.w = el.dataset.w === '' ? '' : +el.dataset.w; r.r = +el.dataset.r; } refreshSetSheet(); toast('추천 무게·횟수를 표에 넣었어요'); },
  'set-count': el => {
    const S = state.sheet, done = dayRO(state.date).sets.filter(x => x.eq === S.eq).length, want = Math.max(0, +el.dataset.n - done);
    while (S.rows.length > want) S.rows.pop();
    while (S.rows.length < want) S.rows.push(Object.assign({}, S.rows[S.rows.length - 1] || rowFrom(lastSetOfEq(S.eq), S.u)));
    refreshSetSheet();
  },
  'row-add': () => { const S = state.sheet; S.rows.push(Object.assign({}, S.rows[S.rows.length - 1] || rowFrom(lastSetOfEq(S.eq), S.u))); refreshSetSheet(); },
  'row-del': () => { state.sheet.rows.pop(); refreshSetSheet(); },
  'row-check': el => {
    const S = state.sheet, i = +el.dataset.i, row = S.rows[i], e = S.e || eqOrRecord(S.eq);
    const w = parseFloat(row.w), r = parseInt(row.r, 10);
    if (!(r > 0)) { toast('횟수를 넣어주세요'); const inp = $(`#sheet-body input[data-on="row-r"][data-i="${i}"]`); if (inp) inp.focus(); return; }
    S.rows.splice(i, 1);
    // a weight you changed carries to the next rows you haven't touched
    for (const nx of S.rows) { if (row.touched && !nx.touched) nx.w = w > 0 ? w : 0; if (!nx.rTouched && !(parseInt(nx.r, 10) > 0)) nx.r = r; }
    addStrengthSet(e, w, S.u, r, null); state.openEq = e.id;
    if (!S.rows.length) {
      const n = dayRO(state.date).sets.filter(x => x.eq === e.id).length;
      render();
      setTimeout(() => { if (state.sheet && state.sheet.kind === 'set' && state.sheet.eq === e.id && !state.sheet.rows.length) { openPicker(); toast(`✓ ${e.name} ${n}세트 완료 · 다음 운동을 골라요`); } }, 450);
      refreshSetSheet(); return;
    }
    refreshSetSheet(); render();
  },
  'row-undo': el => {
    const S = state.sheet, d = day(state.date), k = d.sets.findIndex(x => x.id === el.dataset.id); if (k < 0) return;
    const x = d.sets.splice(k, 1)[0]; save();
    S.rows.unshift({ w: +x.w, r: +x.r, touched: true });
    toast('완료 취소'); refreshSetSheet(); render();
  },
  // "세트 끝": same weight & reps as the last set; reps get confirmed with one tap during the rest
  'set-grip': el => { const S = state.sheet; if (!S || !S.e) return; DB.gripPref = Object.assign({}, DB.gripPref, { [S.e.id]: el.dataset.g }); save(); refreshSetSheet(); },
  'set-quick': el => {
    const e = eqOrRecord(el.dataset.eq); if (!e) return;
    const last = lastSetOfEq(e.id); if (!last) { openSetSheet(e.id); return; }
    const u = unitFor(e.id), w = last.u === u ? +last.w : r1(fromKg(setKg(last), u));
    const set = addStrengthSet(e, w, u, +last.r, null);
    state.fix = { id: set.id, at: Date.now() }; state.openEq = e.id; render();
  },
  'fix-r': el => { const x = findSet(el.dataset.id); if (!x) return; x.r = +el.dataset.r; save(); render(); },
  'fix-w': el => { const x = findSet(el.dataset.id); if (!x) return; const step = x.u === 'lb' ? 5 : 2.5; x.w = Math.max(0, r1(+x.w + +el.dataset.d * step)); x.kg = r1(toKg(x.w, x.u) * 100) / 100; save(); render(); },
  'fix-ok': () => { state.fix = null; render(); },
  'eq-expand': el => { state.openEq = el.classList.contains('compact') ? el.dataset.eq : '-'; render(); },
  'plan-open': () => { state.planOpen = true; render(); },
  'own-plan': el => {
    const T = el.dataset.t, src = pastSessions(addDays(T, 1), 60).find(x => x.k === el.dataset.k) || (() => { const ss = (dayRO(el.dataset.k).sets || []).filter(s => !isCardioSet(s)); const eqs = []; for (const s of ss) if (!eqs.includes(s.eq)) eqs.push(s.eq); return { k: el.dataset.k, eqs }; })();
    if (!src || !src.eqs.length) return;
    day(T).plan = { from: src.k, eqs: src.eqs.slice(), label: `${shortDate(src.k)} 운동 그대로` }; save(); render();
    toast(T === state.date ? `${dateLabel(src.k)} 운동 ${src.eqs.length}종목을 불러왔어요` : `내일 계획: ${src.eqs.length}종목`);
  },
  'rec-plan': el => {
    const [kk, plus] = el.dataset.k.split('+'), T = el.dataset.t;
    const base = kk === 'full' ? { k: 'full', l: '전신' } : SPLITS.find(x => x.k === kk);
    const sp = plus === 'sh' ? Object.assign({}, base, { addSh: true, l: `${base.l} + 옆·뒤 어깨` }) : base;
    const list = sp.k === 'full' ? PROGRAMS.find(p => p.id === 'fb3').days[0].ex : recExercises(sp);
    if (T === state.date) { startPlan(list, `추천 · ${sp.l}`, null); return; }
    const eqs = [], tg = {}; for (const [id, t] of list) if (!eqs.includes(id)) { eqs.push(id); tg[id] = t; }
    day(T).plan = { from: T, eqs, tg, label: `추천 · ${sp.l}` }; save(); render(); toast(`내일 계획: ${sp.l} ${eqs.length}종목`);
  },
  'set-edit': el => openSetSheet(el.dataset.eq),
  'cardio-add': () => {
    const e = state.sheet.e || eqOrRecord(state.sheet.eq);
    const mins = parseFloat($('#cd-min').value), km = parseFloat($('#cd-km').value), kcal = parseFloat($('#cd-kcal').value);
    if (!(mins > 0)) { $('#cd-min').focus(); toast('시간을 입력하세요'); return; }
    const s = { id: uid(), eq: e.id, name: e.name, brand: e.brand, m: '유산소', type: typeOfEq(e), mins, t: Date.now() };
    if (km > 0) s.km = km; if (kcal > 0) s.kcal = kcal;
    day(state.date).sets.push(s); save(); toast('유산소 기록 완료'); refreshSetSheet(); render();
  },
  'undo-del': () => {
    const u = state.undoDel; if (!u) return;
    const d = day(u.k); d.sets.splice(Math.min(u.i, d.sets.length), 0, u.set); state.undoDel = null; save();
    $('#toast').classList.remove('on');
    if (state.sheet && (state.sheet.kind === 'set' || state.sheet.kind === 'cardio')) refreshSetSheet();
    render(); toast('되돌렸어요');
  },
  'set-del': el => {
    const d = day(state.date), i = d.sets.findIndex(s => s.id === el.dataset.id);
    if (i < 0) return;
    const removed = d.sets.splice(i, 1)[0]; save();
    state.undoDel = { k: state.date, i, set: removed };
    toast(`삭제했어요 · ${removed.name}`, 'undo-del');
    if (state.sheet && (state.sheet.kind === 'set' || state.sheet.kind === 'cardio')) refreshSetSheet();
    render();
  },
  'custom-eq': el => openCustomEq(el.dataset.id),
  'ce-save': () => {
    const S = state.sheet;
    const name = $('#ce-name').value.trim(); if (!name) { $('#ce-name').focus(); toast('이름을 입력하세요'); return; }
    const brand = $('#ce-brand').value.trim() || '내 기구', m = $('#ce-m').value, tsel = $('#ce-type').value;
    const type = tsel === '__self' ? name : tsel;
    if (S.id) {
      const ex = DB.customEq.find(e => e.id === S.id);
      Object.assign(ex, { name, brand, m, type });
      for (const k of Object.keys(DB.days)) for (const s of DB.days[k].sets || []) if (s.eq === S.id) Object.assign(s, { name, brand, m, type });
      DB.eqUnit[S.id] = $('#ce-u').value; save(); toast('수정했어요'); closeSheet(); render();
    } else {
      const id = 'c-' + uid();
      DB.customEq.push({ id, name, brand, m, type, custom: true });
      DB.eqUnit[id] = $('#ce-u').value; save(); render(); toast(`추가했어요 · 패턴 "${type}"`);
      openSetSheet(id);
    }
  },
  'ce-del': el => askConfirm('이 기구를 목록에서 삭제할까요? 지난 기록은 그대로 남아요.', '삭제', () => {
    DB.customEq = DB.customEq.filter(e => e.id !== el.dataset.id);
    DB.fav = DB.fav.filter(x => x !== el.dataset.id); save(); closeSheet(); render(); toast('삭제했어요');
  }),

  'food-open': el => openFoodPicker(el.dataset.slot),
  'food-slot': el => { state.sheet.slot = el.dataset.v; $('#sheet-title').textContent = el.dataset.v; $$('#sheet-body .seg button').forEach(b => b.classList.toggle('on', b.dataset.v === el.dataset.v)); },
  'food-cat': el => { state.sheet.cat = el.dataset.v; state.sheet.q = ''; const i = $('#fq'); if (i) i.value = ''; $$('#sheet-body .chips .chip').forEach(c => c.classList.toggle('on', c.dataset.v === el.dataset.v)); renderFoodList(); },
  'food-pick': el => openFoodAmount(el.dataset.id),
  'food-back': () => { const slot = state.sheet.slot; openFoodPicker(slot); },
  'food-custom': () => openCustomFood(),
  'amt-mode': el => { const S = state.sheet; if (S.mode === el.dataset.v) return; S.qty = el.dataset.v === 'g' ? r1(amountFactor() * S.base.g) : r1(amountFactor()); S.mode = el.dataset.v; setSheetBody(amountHtml(), true); },
  'amt-step': el => { const S = state.sheet, i = $('#amt-q'); S.qty = Math.max(0, r1((parseFloat(i.value) || 0) + +el.dataset.d)); i.value = trimNum(S.qty); $('#amt-prev').innerHTML = amountPreview(); },
  'amt-slot': el => { state.sheet.slot = el.dataset.v; $$('#sheet-body .seg button[data-act="amt-slot"]').forEach(b => b.classList.toggle('on', b.dataset.v === el.dataset.v)); },
  'amt-save': () => {
    const S = state.sheet, b = S.base, x = amountFactor();
    if (!(x > 0)) { toast('양을 입력하세요'); return; }
    const rec = { name: b.n, fid: S.fid, slot: S.slot, qty: +S.qty, mode: S.mode, k: r1(b.k * x), p: r1(b.p * x), c: r1(b.c * x), f: r1(b.f * x) };
    const d = day(state.date);
    if (S.editId) { Object.assign(d.meals.find(m => m.id === S.editId), rec); save(); closeSheet(); render(); toast('수정했어요'); return; }
    d.meals.push(Object.assign({ id: uid(), t: Date.now() }, rec));
    if (S.fid) { DB.recentFoods = [S.fid].concat(DB.recentFoods.filter(x => x !== S.fid)).slice(0, 20); }
    save(); render(); toast(`${S.slot}: ${b.n} ${fmtInt(rec.k)}kcal`);
    openFoodPicker(S.slot);
  },
  'cf-add': () => {
    const n = $('#cf-n').value.trim(); if (!n) { $('#cf-n').focus(); toast('이름을 입력하세요'); return; }
    const p = +$('#cf-p').value || 0, c = +$('#cf-c').value || 0, f = +$('#cf-f').value || 0;
    let k = +$('#cf-k').value; if (!(k > 0)) k = Math.round(p * 4 + c * 4 + f * 9);
    const g = +$('#cf-g').value || null, s = $('#cf-s').value.trim() || '1인분';
    let fid = null;
    if ($('#cf-save').checked) { fid = 'c' + uid(); DB.customFoods.unshift({ id: fid, n, s, g, k, p, c, f, cat: '내 음식' }); DB.recentFoods = [fid].concat(DB.recentFoods).slice(0, 20); }
    day(state.date).meals.push({ id: uid(), name: n, fid, slot: state.sheet.slot, qty: 1, mode: 'srv', k, p, c, f, t: Date.now() });
    save(); closeSheet(); render(); toast(`${n} 추가`);
  },
  'routine-load': () => openRoutineSheet(),
  'routines-open': () => openRoutines(),
  'tut-go': el => tutShow(+el.dataset.i),
  'day-finish': () => { const k = state.date; day(k).fin = Date.now(); state.openEq = '-'; save(); render(); openFinish(k); },
  'fin-open': () => openFinish(state.date),
  'meal-n': el => { DB.settings.mealN = +el.dataset.v; save(); render(); },
  'fin-open-k': el => openFinish(el.dataset.k),
  'gym-open': () => openGym(),
  'gym-only': () => { state.gymOnly = state.gymOnly === false; setSheetBody(pickerHtml(), true); renderEqList(); },
  'gym-toggle': el => { const G = DB.settings.gym = DB.settings.gym || [], id = el.dataset.eq, i = G.indexOf(id); if (i >= 0) G.splice(i, 1); else G.push(id); save(); const b = $('#gym-list'); if (b) b.innerHTML = gymListHtml(); },
  'focus-open': () => openFocus(),
  'fx-w': el => { state.fx.w = Math.max(0, r1(state.fx.w + +el.dataset.d)); fxRender(); },
  'fx-r': el => { state.fx.r = Math.max(1, state.fx.r + +el.dataset.d); fxRender(); },
  'fx-move': el => { const L = fxList(); state.fx.i = Math.min(L.length - 1, Math.max(0, state.fx.i + +el.dataset.d)); fxPrefill(); fxRender(); },
  'fx-add15': () => { timerAdd(15); fxRender(); },
  'fx-skip': () => { timerStop(); fxRender(); },
  'fx-done': () => {
    const F = state.fx, L = fxList(), id = L[F.i], e = eqById(id) || eqOrRecord(id); if (!e) return;
    addStrengthSet(e, F.w, unitFor(id), F.r); bump(); render();
    const did = (dayRO(state.date).sets || []).filter(s => s.eq === id).length;
    if (did >= fxTarget(id).n && F.i < L.length - 1) { F.i++; fxPrefill(); setTimeout(() => toast(`다음: ${(eqById(L[F.i]) || {}).name || ''}`), 1200); }
    fxRender();
  },
  'report-open': el => openReport(el.dataset.a, el.dataset.b, el.dataset.t),
  'day-resume': () => { const k = state.date; delete day(k).fin; save(); if (state.sheet && state.sheet.kind === 'finish') closeSheet(); render(); toast('이어서 기록해요'); },
  'fin-cond': el => { const d = day(state.sheet.k); d.check = Object.assign({}, d.check, { cond: +el.dataset.v }); save(); setSheetBody(finishHtml(state.sheet.k), true); render(); },
  'tut-tap': () => {
    const st = tutSteps()[state.tutI]; if (!st || !st.tap || state.tutBusy) return;
    state.tutBusy = true; setTimeout(() => { state.tutBusy = false; }, 400); // a double tap must not skip the next step
    if (typeof st.tap === 'string') { state.tab = st.tap; render(); window.scrollTo(0, 0); }
    else { const el = document.querySelector(st.at); if (el) { el.classList.add('tut-pressed'); setTimeout(() => el.classList.remove('tut-pressed'), 300); } }
    setTimeout(() => tutShow(state.tutI + 1), typeof st.tap === 'string' ? 60 : 250);
  },
  'tut-ck': () => { state.tutCk = (state.tutCk || 0) + 1; setSheetBody(tutorialHtml(state.tutI), true); },
  'tut-sex': el => { DB.settings.profile = Object.assign({}, DB.settings.profile, { sex: el.dataset.v }); save(); setSheetBody(tutorialHtml(state.tutI), true); },
  'tut-goal': el => { DB.settings.mode = el.dataset.v; save(); setSheetBody(tutorialHtml(state.tutI), true); },
  'tut-end': el => { DB.settings.tutV = 2; save(); closeSheet(); state.tab = 'workout'; render(); if (el.dataset.then === 'routines') setTimeout(openRoutines, 50); },
  'tut-open': () => { closeSheet(); setTimeout(() => openTutorial(0), 30); },
  'rt-exp': el => { DB.settings.profile = Object.assign({}, DB.settings.profile, { exp: +el.dataset.v }); save(); setSheetBody(routinesHtml(), true); },
  'rt-freq': el => { DB.settings.profile = Object.assign({}, DB.settings.profile, { freq: +el.dataset.v }); save(); setSheetBody(routinesHtml(), true); },
  'tut-exp': el => { DB.settings.profile = Object.assign({}, DB.settings.profile, { exp: +el.dataset.v }); save(); setSheetBody(tutorialHtml(state.tutI), true); },
  'tut-freq': el => { DB.settings.profile = Object.assign({}, DB.settings.profile, { freq: +el.dataset.v }); save(); setSheetBody(tutorialHtml(state.tutI), true); },
  'rt-sex': el => { DB.settings.profile = Object.assign({}, DB.settings.profile, { sex: el.dataset.v }); save(); setSheetBody(routinesHtml(), true); },
  'rt-sx': el => { state.rtSx = el.dataset.v; setSheetBody(routinesHtml(), true); },
  'rt-tab': el => { state.rtTab = el.dataset.v; setSheetBody(routinesHtml()); },
  'rt-lv': el => { state.rtLv = +el.dataset.v; setSheetBody(routinesHtml(), true); },
  'rt-m': el => { state.rtM = el.dataset.m; setSheetBody(routinesHtml(), true); },
  // one day from a program, without signing up for the whole program
  'day-start': el => { const p = PROGRAMS.find(x => x.id === el.dataset.p), d = p.days[+el.dataset.d]; startPlan(d.ex, `${p.name} · ${d.t}`, null); day(state.date).plan.prog = p.id; save(); render(); },
  'prog-open': el => openProgram(el.dataset.p),
  'prog-start': el => {
    const p = PROGRAMS.find(x => x.id === el.dataset.p), i = +el.dataset.d, d = p.days[i];
    // position in the full sequence (programs with `rep` repeat each block of days for several weeks)
    let n = DB.prog && DB.prog.id === p.id && progDay(p, DB.prog.next) === i ? DB.prog.next : 0;
    if (progDay(p, n) !== i) for (let k = 0; k < progLen(p); k++) if (progDay(p, k) === i) { n = k; break; }
    DB.prog = { id: p.id, next: (n + 1) % progLen(p) };
    if (p.rep && DB.prog.next === 0) setTimeout(() => toast(`${p.name} 마지막 날이에요! 끝나면 다시 처음부터 하거나 다른 루틴을 골라보세요`), 400);
    startPlan(d.ex, `${p.name} · ${d.t}`, null);
    day(state.date).plan.prog = p.id; save(); render();
  },
  'prog-stop': () => askConfirm('진행 중인 프로그램을 그만할까요? 지난 기록은 그대로 남아요.', '그만하기', () => { DB.prog = null; save(); setSheetBody(routinesHtml(), true); render(); }),
  'my-start': el => { const r = DB.routines.find(x => x.id === el.dataset.id); if (r) startPlan(r.list, r.name, null); },
  'my-del': el => askConfirm('이 루틴을 삭제할까요?', '삭제', () => { DB.routines = DB.routines.filter(x => x.id !== el.dataset.id); save(); setSheetBody(routinesHtml(), true); }),
  'my-save': () => {
    const name = ($('#rt-name').value || '').trim(); if (!name) { $('#rt-name').focus(); toast('루틴 이름을 적어주세요'); return; }
    const d = dayRO(state.date), list = [], seen = {};
    for (const s of d.sets || []) { if (!seen[s.eq]) { seen[s.eq] = []; list.push([s.eq]); } seen[s.eq].push(s); }
    for (const it of list) { const g = seen[it[0]]; it.push(isCardioSet(g[0]) ? `${trimNum(g.reduce((a, s) => a + (+s.mins || 0), 0))}분` : `${g.length}×${Math.round(g.reduce((a, s) => a + (+s.r || 0), 0) / g.length)}`); }
    // a loaded plan keeps its order and targets; exercises done outside the plan are added after it
    if (d.plan && d.plan.eqs) { const extra = list.filter(([id]) => !d.plan.eqs.includes(id)); list.length = 0; for (const id of d.plan.eqs) list.push([id, (d.plan.tg || {})[id] || (seen[id] ? `${seen[id].length}×${Math.round(seen[id].reduce((a, s) => a + (+s.r || 0), 0) / seen[id].length)}` : '3×10')]); list.push(...extra); }
    DB.routines.unshift({ id: 'r' + uid(), name, list }); save(); setSheetBody(routinesHtml(), true); toast(`"${name}" 저장했어요`);
  },
  'routine-pick': el => {
    const src = pastSessions(state.date, 50).find(x => x.k === el.dataset.k);
    if (!src) return;
    day(state.date).plan = { from: src.k, eqs: src.eqs.slice(), label: `${shortDate(src.k)} 운동 그대로` }; save(); closeSheet(); render();
    toast(`${dateLabel(src.k)} 운동 ${src.eqs.length}종목을 불러왔어요 · 눌러서 기록`);
  },
  'plan-clear': () => { const d = day(state.date); delete d.plan; save(); render(); },
  'meal-copy-yday': () => {
    const ym = dayRO(addDays(state.date, -1)).meals || [];
    const d = day(state.date);
    d.meals = d.meals.concat(ym.map(m => Object.assign({}, m, { id: uid(), t: Date.now() })));
    save(); render(); toast(`어제 식단 ${ym.length}개를 넣었어요 · 다른 건 눌러서 고치세요`);
  },
  'meal-copy-slot': el => {
    const slot = el.dataset.slot, ym = (dayRO(addDays(state.date, -1)).meals || []).filter(m => (m.slot || '간식') === slot);
    const d = day(state.date);
    d.meals = d.meals.concat(ym.map(m => Object.assign({}, m, { id: uid(), t: Date.now() })));
    save(); render(); toast(`어제 ${slot} ${ym.length}개를 넣었어요`);
  },
  'meal-del': el => { const d = day(state.date); d.meals = d.meals.filter(m => m.id !== el.dataset.id); save(); render(); },
  'meal-edit': el => { const m = dayRO(state.date).meals.find(x => x.id === el.dataset.id); if (m) openFoodAmount(m.fid, m.id); },

  'cal-move': el => { const [y, m] = state.calM.split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.d, 1); state.calM = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); },
  'day-open': el => openDaySheet(el.dataset.k),
  'goto-day': el => { state.date = el.dataset.k; state.tab = el.dataset.tab; closeSheet(); render(); window.scrollTo(0, 0); },
  'map-p': el => { state.mapP = el.dataset.v; const y = window.scrollY; render(); window.scrollTo(0, y); },
  'stat-p': el => { state.statP = el.dataset.v; const y = window.scrollY; render(); window.scrollTo(0, y); },

  'ib-save': () => {
    const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
    const w = num('#ib-w'), m = num('#ib-m'), fk = num('#ib-fk'); let fp = num('#ib-fp');
    if (fp == null && fk != null && w) fp = r1(fk / w * 100);
    if (w == null && m == null && fk == null && fp == null && !state.ibPhoto) { toast('숫자나 사진 중 하나는 넣어주세요'); return; }
    // last check before saving (typed or read from a photo): the sheet's numbers must add up
    const bad = [], wa = num('#ib-x-water'), pr = num('#ib-x-protein'), mi = num('#ib-x-mineral');
    if (w && fk != null && num('#ib-fp') != null && Math.abs(num('#ib-fp') - fk / w * 100) > 1) bad.push(`체지방률 ${num('#ib-fp')}%가 체지방량÷체중(${r1(fk / w * 100)}%)과 달라요`);
    if (w && fk != null && wa != null && pr != null && mi != null && Math.abs(w - (wa + pr + mi + fk)) > 1.5) bad.push(`체중 ${w}kg이 체수분+단백질+무기질+체지방 합(${r1(wa + pr + mi + fk)}kg)과 달라요`);
    if (w && fk != null && fk >= w * 0.7) bad.push(`체지방량 ${fk}kg이 체중에 비해 너무 커요`);
    if (w && fk != null && m != null && (m < (w - fk) * 0.45 || m > (w - fk) * 0.66)) bad.push(`골격근량 ${m}kg이 제지방량(${r1(w - fk)}kg)의 보통 범위(45–66%)를 벗어나요`);
    const still = $$('#ib-w.ocrunsure, #ib-m.ocrunsure, #ib-fk.ocrunsure, #ib-fp.ocrunsure').map(el => ({ 'ib-w': '체중', 'ib-m': '골격근량', 'ib-fk': '체지방량', 'ib-fp': '체지방률' })[el.id]);
    if (still.length) bad.push(`${still.join(', ')}은(는) 사진에서 검증하지 못한 값이에요`);
    if (bad.length && !state.ibForce) { askConfirm(`숫자를 한 번 더 확인해 주세요:\n• ${bad.join('\n• ')}\n\n결과지와 같다면 그대로 저장하세요.`, '그대로 저장', () => { state.ibForce = true; ACT['ib-save'](); }); return; }
    state.ibForce = false;
    const id = 'ib' + uid();
    const e = { id, date: $('#ib-date').value || today(), weight: w, muscle: m, fatKg: fk, fatPct: fp, hasPhoto: !!state.ibPhoto };
    for (const [k] of IB_EXTRA.concat(IB_SEG)) { const v = num('#ib-x-' + k); if (v != null) e[k] = v; }
    let msg = '저장했어요';
    if (state.ibPhoto) { PHOTOS[id] = state.ibPhoto; if (!savePhotos()) { delete PHOTOS[id]; e.hasPhoto = false; msg = '저장 공간이 부족해 사진 없이 저장했어요'; } }
    DB.inbody.push(e); state.ibPhoto = null; save(); render(); toast(msg);
  },
  'ib-del': el => askConfirm('이 측정 기록을 삭제할까요?', '삭제', () => {
    DB.inbody = DB.inbody.filter(e => e.id !== el.dataset.id); delete PHOTOS[el.dataset.id]; savePhotos(); save(); render(); toast('삭제했어요');
  }),
  'ib-photo': el => { const src = PHOTOS[el.dataset.id]; if (src) openSheet('인바디 결과지', (DB.inbody.find(e => e.id === el.dataset.id) || {}).date || '', `<img class="bigphoto" src="${src}" alt="인바디 결과지">`, { kind: 'photo' }); },

  'st-unit': el => { DB.settings.unit = el.dataset.u; save(); $$('#sheet-body .unitseg button[data-act="st-unit"]').forEach(b => b.classList.toggle('on', b.dataset.u === el.dataset.u)); },
  'st-theme': el => { DB.settings.theme = el.dataset.v; save(); applyTheme(); $$('#sheet-body button[data-act="st-theme"]').forEach(b => b.classList.toggle('on', b.dataset.v === el.dataset.v)); },
  'pf-sex': el => { DB.settings.profile = Object.assign({}, DB.settings.profile, { sex: el.dataset.v }); save(); render(); },
  'goal-set': el => { DB.settings.mode = el.dataset.v; save(); render(); toast(`목표: ${GOALS[el.dataset.v].l}`); },
  'goal-macros': () => {
    const bw = latestBodyweight(); if (!bw) return;
    const m = goalMacros(goalKey(), bw); DB.settings.goals = m; save(); render();
    toast(`식단 목표 ${fmtInt(m.kcal)}kcal · 단백질 ${m.p}g · 탄수 ${m.c}g · 지방 ${m.f}g`);
  },
  'st-auto': el => {
    const bw = parseFloat($('#st-bw').value) || latestBodyweight();
    if (!bw) { toast('먼저 체중을 입력하세요'); $('#st-bw').focus(); return; }
    DB.settings.mode = el.dataset.v; save();
    $$('#sheet-body button[data-act="st-auto"]').forEach(b => b.classList.toggle('on', b === el));
    const { kcal, p, c, f } = goalMacros(el.dataset.v, bw);
    $('#st-k').value = kcal; $('#st-p').value = p; $('#st-c').value = c; $('#st-f').value = f;
    toast('계산했어요 — 확인 후 저장을 누르세요');
  },
  'st-save-goals': () => {
    const v = id => Math.max(0, parseFloat($(id).value) || 0);
    DB.settings.goals = { kcal: v('#st-k') || 2200, p: v('#st-p'), c: v('#st-c'), f: v('#st-f') };
    const bw = parseFloat($('#st-bw').value); DB.settings.bw = bw > 0 ? bw : null;
    save(); closeSheet(); render(); toast('목표를 저장했어요');
  },
  'export': () => exportData(),
  'bk-file': () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([state.bkData || ''], { type: 'application/json' })); a.download = state.bkName || 'ounwan-backup.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('다운로드 폴더에 저장했어요'); } catch (e) { toast('저장하지 못했어요. 전체 복사를 써주세요'); } },
  'import': () => openSheet('백업 가져오기', '복원', `<button class="btn block" data-act="import-file">백업 파일 선택</button>
    <div class="small muted" style="margin:12px 0 6px">또는 복사해 둔 백업 코드를 붙여넣기</div>
    <textarea id="bk-in" rows="6" style="font-family:var(--mono);font-size: 12px" placeholder='{"app":"ironlog", ...}'></textarea>
    <button class="btn primary block" style="margin-top:10px" data-act="import-text">붙여넣은 코드로 복원</button>`, { kind: 'import' }),
  'import-file': () => $('#import-file').click(),
  'import-text': () => importText($('#bk-in').value.trim()),
  'bk-copy': () => {
    const t = $('#bk-code');
    const fallback = () => { t.focus(); t.select(); toast('선택됐어요 — 길게 눌러 복사하세요'); };
    try { navigator.clipboard.writeText(t.value).then(() => toast('복사했어요'), fallback); } catch (e) { fallback(); }
  },
  'reset': () => askConfirm('모든 운동·식단·인바디 기록을 지울까요? 되돌릴 수 없어요. 먼저 백업을 권해요.', '전부 초기화', () => {
    DB = DEFAULTS(); PHOTOS = {}; save(); savePhotos(); closeSheet(); render(); toast('초기화했어요');
  }),
};

const ON = {
  'gym-q': (el, ev) => { if (ev.type !== 'input') return; state.gymQ = el.value; const b = $('#gym-list'); if (b) b.innerHTML = gymListHtml(); },
  'eq-q': (el, ev) => { if (ev.type !== 'input') return; state.eqQ = el.value; renderEqList(); },
  'row-w': el => { const S = state.sheet; if (!S || !S.rows) return; const r = S.rows[+el.dataset.i]; if (!r) return; r.w = el.value; r.touched = true; if (+el.dataset.i === 0) { const p = $('#ss-prev'); if (p) p.innerHTML = nextPreview(); } },
  'row-r': el => { const S = state.sheet; if (!S || !S.rows) return; const r = S.rows[+el.dataset.i]; if (!r) return; r.r = el.value; r.rTouched = true; if (+el.dataset.i === 0) { const p = $('#ss-prev'); if (p) p.innerHTML = nextPreview(); } },
  'done-w': (el, ev) => { if (ev.type !== 'change') return; const x = findSet(el.dataset.id); if (!x) return; const w = Math.max(0, parseFloat(el.value) || 0); x.w = w; x.kg = r1(toKg(w, x.u) * 100) / 100; save(); render(); },
  'done-r': (el, ev) => { if (ev.type !== 'change') return; const x = findSet(el.dataset.id); if (!x) return; const r = parseInt(el.value, 10); if (r > 0) { x.r = r; save(); render(); } },
  'check-bw': (el, ev) => { if (ev.type !== 'change') return; const d = day(state.date); const v = parseFloat(el.value); d.check.bw = v > 0 ? v : null; save(); state.checkOpen = true; render(); },
  'check-sleep': (el, ev) => { if (ev.type !== 'change') return; const d = day(state.date); const v = parseFloat(el.value); d.check.sleep = v > 0 ? v : null; save(); state.checkOpen = true; render(); },
  'fq': (el, ev) => { if (ev.type !== 'input') return; state.sheet.q = el.value; renderFoodList(); },
  'amt-q': el => { state.sheet.qty = parseFloat(el.value) || 0; $('#amt-prev').innerHTML = amountPreview(); },
  'tut-pf': el => {
    const k = el.dataset.k, v = parseFloat(el.value), ok = k === 'birth' ? v >= 1930 && v <= 2015 : v >= 120 && v <= 230;
    DB.settings.profile = Object.assign({}, DB.settings.profile, { [k]: ok ? v : null }); save();
  },
  'ce-infer': (el, ev) => {
    if (ev.type === 'change' && el.tagName === 'INPUT') return;
    const S = state.sheet; if (!S || S.kind !== 'ceq') return;
    if (el.id === 'ce-m') S.mTouched = true;
    const nm = `${$('#ce-brand').value} ${$('#ce-name').value}`;
    let t = inferType(nm, $('#ce-m').value);
    // the name decides the body part too ("바이킹 프레스" → 어깨), unless the user picked one
    if (t && !S.mTouched && TYPE_INFO[t] && TYPE_INFO[t].m && $('#ce-m').value !== TYPE_INFO[t].m) { $('#ce-m').value = TYPE_INFO[t].m; t = inferType(nm, TYPE_INFO[t].m); }
    if (!S.typeTouched && t) $('#ce-type').value = t;
    const ct = $('#ce-type').value, mp = musclePeekHtml(`${$('#ce-brand').value} ${$('#ce-name').value}`, ct === '__self' ? t : ct, $('#ce-m').value);
    $('#ce-musc').innerHTML = mp || '<div class="small muted">이름을 넣으면 어느 부위를 쓰는지 그림으로 보여드려요.</div>';
    $('#ce-hint').innerHTML = (t ? `이름으로 <b>${esc(mName(TYPE_INFO[t] && TYPE_INFO[t].m || $('#ce-m').value))} · ${esc(t)}</b>(으)로 자동 분류했어요. ` : '자동 분류가 안 되면 직접 골라주세요. ') + '같은 패턴의 기구끼리 PR·진행 상황을 함께 비교해요.';
  },
  'ce-type': (el, ev) => { if (state.sheet) state.sheet.typeTouched = true; ON['ce-infer']($('#ce-name'), { type: 'input' }); },
  'pf-birth': (el, ev) => { if (ev.type !== 'change') return; const v = parseInt(el.value, 10); DB.settings.profile = Object.assign({}, DB.settings.profile, { birth: v >= 1930 && v <= 2015 ? v : null }); save(); render(); },
  'pf-height': (el, ev) => { if (ev.type !== 'change') return; const v = parseFloat(el.value); DB.settings.profile = Object.assign({}, DB.settings.profile, { height: v >= 120 && v <= 230 ? v : null }); save(); render(); },
  'st-autorest': el => { DB.settings.autoRest = el.checked; save(); },
  'st-notify': el => { DB.settings.notify = el.checked; save(); if (!el.checked) cancelRestNotif(); },
  'ib-file': async el => {
    const f = el.files && el.files[0]; if (!f) return;
    const data = await compressImage(f, 900, .72);
    if (!data) { toast('사진을 읽지 못했어요'); return; }
    state.ibPhoto = data; const pv = $('#ib-pv'); if (pv) pv.innerHTML = `<img src="${data}" alt="">`;
    ocrInbody(f); el.value = ''; // the same photo can be picked again
  },
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (el && ACT[el.dataset.act]) { ACT[el.dataset.act](el, ev); return; }
  const tip = ev.target.closest('[data-tip]');
  if (tip) showTip(tip); else hideTip();
});
document.addEventListener('pointerover', ev => { if (ev.pointerType === 'mouse') { const t = ev.target.closest('[data-tip]'); if (t) showTip(t); } });
document.addEventListener('pointerout', ev => { if (ev.pointerType === 'mouse' && ev.target.closest('[data-tip]')) hideTip(); });
for (const type of ['input', 'change']) {
  document.addEventListener(type, ev => {
    // a value you typed over yourself no longer counts as an unverified photo reading
    if (type === 'input' && ev.target.classList && ev.target.classList.contains('ocrunsure')) ev.target.classList.remove('ocrunsure');
    const el = ev.target.closest('[data-on]');
    if (el && ON[el.dataset.on]) ON[el.dataset.on](el, ev);
  });
}
document.addEventListener('toggle', ev => {
  const t = ev.target; if (!t.matches) return;
  if (t.matches('details.check')) { if (t.dataset.k === 'mus') state.musOpen = t.open; else state.checkOpen = t.open; }
  if (t.matches('details.more') && state.sheet) state.sheet.moreOpen = t.open;
  if (t.matches('details.mealplan')) state.mealOpen = t.open;
  if (t.matches('details.fold')) { state.fold = state.fold || {}; state.fold[t.dataset.fold] = t.open; }
}, true);
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') closeSheet();
  // Enter on a row's reps = tick that row
  if (ev.key === 'Enter' && state.sheet && state.sheet.kind === 'set' && ev.target.dataset && ev.target.dataset.on === 'row-r') { ev.preventDefault(); const b = $(`#sheet-body button[data-act="row-check"][data-i="${ev.target.dataset.i}"]`); if (b) b.click(); }
});
$('#import-file').addEventListener('change', ev => { const f = ev.target.files[0]; if (f) importData(f); ev.target.value = ''; });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (DB.timer.endAt && Date.now() >= DB.timer.endAt) { const late = Date.now() - DB.timer.endAt; DB.timer.endAt = null; save(); if (late < 10 * 60 * 1000) timerDone(); } timerLoop(); if (state.date !== today() && state._lastToday && state._lastToday !== today()) { state.date = today(); render(); } state._lastToday = today(); } });

/* sheet: swipe down on the grab bar/header to close */
(function swipeToClose() {
  const sh = $('#sheet'); let y0 = null;
  sh.addEventListener('touchstart', e => { if (e.target.closest('.sb')) { y0 = null; return; } y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener('touchmove', e => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
  sh.addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; sh.style.transform = ''; y0 = null; if (dy > 90) closeSheet(); });
})();

/* =====================================================================
   15. init
   ===================================================================== */
/* one-time: re-classify custom machines with the expanded name rules (e.g. "바이킹 프레스" used to land on 레그 프레스) */
function reclassifyCustom() {
  if (DB.settings.reclass >= 1) return;
  let n = 0;
  for (const e of DB.customEq) {
    const t = inferType(`${e.brand || ''} ${e.name}`, e.m), m2 = t && TYPE_INFO[t] && TYPE_INFO[t].m;
    if (!t || (t === e.type && (!m2 || m2 === e.m))) continue;
    const t2 = m2 ? inferType(`${e.brand || ''} ${e.name}`, m2) || t : t;
    e.type = t2; if (m2) e.m = m2; n++;
    for (const k in DB.days) for (const st of DB.days[k].sets || []) if (st.eq === e.id) { st.type = t2; if (m2) st.m = m2; }
  }
  DB.settings.reclass = 1; save();
  if (n) setTimeout(() => toast(`직접 추가한 기구 ${n}개의 부위를 이름에 맞게 다시 분류했어요`), 1200);
}

load();
protectStorage();
reclassifyCustom();
if (DB.timer.endAt && Date.now() - DB.timer.endAt > 10 * 60 * 1000) { DB.timer.endAt = null; save(); }
applyTheme();
state._lastToday = today();
render();
timerLoop();
if (DB.settings.tutV !== 2) setTimeout(() => openTutorial(0), 400);
if (isNative && P.App) {
  try {
    P.App.addListener('backButton', () => {
      if (state.sheet) closeSheet();
      else if (state.tab !== 'workout') { state.tab = 'workout'; render(); }
      else P.App.exitApp();
    });
  } catch (e) {}
}
if (!isNative && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const bootAt = Date.now(); let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // a new version just installed: refresh once if the app was only just opened and nothing is in progress
    if (!hadController || reloaded) return;
    if (Date.now() - bootAt < 15000 && !state.sheet) { reloaded = true; location.reload(); }
    else toast('새 버전이 준비됐어요 · 다음에 열 때 적용돼요');
  });
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
if (isNative && P.SplashScreen) { try { P.SplashScreen.hide(); } catch (e) {} }
