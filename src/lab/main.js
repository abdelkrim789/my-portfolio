import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import './lab.css';
import { ENTITIES, ACCOUNTS, ACC, PL_IDS, STEPS, BASE_RATES, GROUP_CUR, buildData, run, fmt } from './engine.js';

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- state ----------
const state = { upTo: 0, tab: 'pl', sel: null, opts: { eur: 0, cny: 0, dzd: 0, own: 70, miss: false } };
let res = null, prev = new Map(), playing = null;
const struck = new Set();   // tabs whose eliminations have already been struck through

function rates() {
  const r = {};
  for (const [cur, k] of [['EUR', 'eur'], ['CNY', 'cny'], ['DZD', 'dzd']]) {
    const v = state.opts[k] / 100, b = BASE_RATES[cur];
    // a stronger currency means fewer units per dollar; the year's average moves half as far as the year-end rate
    r[cur] = { close: b.close / (1 + v), avg: b.avg / (1 + v / 2), hist: b.hist };
  }
  return r;
}
function compute() {
  const data = buildData({ ownCN: state.opts.own / 100, rates: rates(), mismatch: state.opts.miss });
  res = run(data, state.upTo);
}

// ---------- columns and cells ----------
const COLS = [
  ...ENTITIES.map((e) => ({ id: e.id, head: e.id, sub: e.cur, ent: e })),
  { id: 'SUM', head: 'Added up', sub: GROUP_CUR },
  { id: 'ELIM_IC', head: 'Intercompany', sub: 'eliminations', red: true },
  { id: 'ELIM_INV', head: 'Investments', sub: 'and minorities', red: true },
  { id: 'CONS', head: 'Group', sub: 'consolidated', strong: true },
];
const translated = () => state.upTo >= 3;
function recordsFor(acc, col) {
  const ids = Array.isArray(acc) ? acc : [acc];
  const r = res.records.filter((x) => ids.includes(x.acc));
  if (ENTITIES.some((e) => e.id === col)) return r.filter((x) => x.entity === col && (x.trail === 'INPUT' || x.trail === 'TRANSL'));
  if (col === 'SUM') return r.filter((x) => x.trail === 'INPUT' || x.trail === 'TRANSL');
  if (col === 'ELIM_IC') return r.filter((x) => x.trail === 'ELIM_IC');
  if (col === 'ELIM_INV') return r.filter((x) => x.trail === 'ELIM_INV' || x.trail === 'NCI');
  return r;
}
function value(acc, col) {
  const ent = ENTITIES.some((e) => e.id === col);
  if (!translated()) {
    if (!ent || state.upTo < 1) return null;
    return recordsFor(acc, col).reduce((t, x) => t + (x.lc || 0), 0);
  }
  if (col === 'ELIM_IC' && state.upTo < 5) return null;
  if (col === 'ELIM_INV' && state.upTo < 6) return null;
  return recordsFor(acc, col).reduce((t, x) => t + (x.usd || 0), 0);
}

// ---------- the statements ----------
const sumOf = (ids) => ({ ids, total: true });
const PL_ROWS = [
  { acc: 'REV' }, { acc: 'ICREV' }, { acc: 'COGS' }, { acc: 'ICPUR' }, { acc: 'OPEX' }, { acc: 'FXR', opt: true }, { acc: 'ICDPL', opt: true, flag: true },
  { label: 'Net income', ...sumOf(PL_IDS), grand: true },
];
const A_IDS = ACCOUNTS.filter((a) => a.sec === 'A').map((a) => a.id);
const E_IDS = ACCOUNTS.filter((a) => a.sec === 'E').map((a) => a.id);
const L_IDS = ACCOUNTS.filter((a) => a.sec === 'L').map((a) => a.id);
const BS_ROWS = [
  { head: 'Assets' }, ...A_IDS.map((id) => ({ acc: id, opt: id === 'GW' })), { label: 'Total assets', ...sumOf(A_IDS), grand: true },
  { head: 'Equity' }, ...E_IDS.map((id) => ({ acc: id, opt: id === 'NCI' || id === 'CTA' })), { label: 'Total equity', ...sumOf(E_IDS) },
  { head: 'Liabilities' }, ...L_IDS.map((id) => ({ acc: id, opt: id === 'ICDIFF', flag: id === 'ICDIFF' })), { label: 'Total liabilities', ...sumOf(L_IDS) },
  { label: 'Total equity and liabilities', ...sumOf([...E_IDS, ...L_IDS]), grand: true },
];
function rowValue(row, col) {
  if (row.acc) return value(row.acc, col);
  const vs = row.ids.map((id) => value(id, col));
  if (vs.every((v) => v == null)) return null;
  // local currencies cannot be added across entities, and NI already sits inside equity
  return vs.reduce((t, v) => t + (v || 0), 0);
}

function renderGrid() {
  const g = $('#grid');
  $('#unit').textContent = translated() ? `Thousands of US dollars` : state.upTo ? 'Thousands, local currency' : '';
  $('#hint').hidden = state.tab === 'ic';
  if (state.tab === 'ic') return renderIC(g);
  const rows = state.tab === 'pl' ? PL_ROWS : BS_ROWS;
  const cols = COLS;
  const changed = new Set();
  // the red pencil strikes once, when the eliminations are posted, not on every redraw
  const strikeNow = state.upTo >= 5 && !struck.has(state.tab) && !reduced;
  let nStruck = 0;
  let html = `<table class="sheet"><caption class="sr">${state.tab === 'pl' ? 'Income statement' : 'Balance sheet'}</caption><thead><tr><th scope="col" class="acc">Account</th>`;
  for (const c of cols) {
    const tie = c.ent && state.upTo >= 2 ? '<svg class="tick" viewBox="0 0 20 16" aria-label="balances"><path d="M2 9l5 5L18 2"/></svg>' : '';
    const sub = c.ent ? (translated() ? `${c.ent.cur} in ${GROUP_CUR}` : c.ent.cur) : c.sub;
    html += `<th scope="col" class="${c.red ? 'red' : ''} ${c.strong ? 'strong' : ''}"><span class="h">${c.head}${tie}</span><span class="s">${sub}</span></th>`;
  }
  html += '</tr></thead><tbody>';
  for (const row of rows) {
    if (row.head) { html += `<tr class="sec"><th scope="rowgroup" colspan="${cols.length + 1}"><span>${row.head}</span></th></tr>`; continue; }
    const vals = cols.map((c) => rowValue(row, c.id));
    if (row.opt && vals.every((v) => v == null || Math.abs(v) < 0.05)) continue;
    const label = row.label || ACC[row.acc].label;
    const cls = [row.total ? 'total' : '', row.grand ? 'grand' : '', row.flag && vals.some((v) => v && Math.abs(v) > 0.05) ? 'flag' : ''].join(' ');
    html += `<tr class="${cls}"><th scope="row" class="acc">${label}</th>`;
    cols.forEach((c, i) => {
      const v = vals[i];
      const key = `${state.tab}|${label}|${c.id}`;
      const nil = v != null && Math.abs(v) < 0.05;
      const shown = v == null ? '' : nil ? '–' : fmt(v);
      const was = prev.get(key);
      // light what moved; a nil appearing where nothing was isn't news
      if (was !== undefined && was !== shown && shown !== '' && !(nil && was === '')) changed.add(key);
      prev.set(key, shown);
      const ic = row.acc && ACC[row.acc].ic && c.ent && state.upTo >= 5 && Math.abs(v || 0) > 0.05;
      const sel = state.sel && state.sel.key === key ? ' sel' : '';
      const empty = v == null || (!translated() && !c.ent);
      const anim = ic && strikeNow ? ` anim" style="--d:${(nStruck++ * 0.07).toFixed(2)}s` : '';
      html += `<td class="${c.red ? 'red' : ''}${c.strong ? ' strong' : ''}${ic ? ' struck' : ''}${nil ? ' nil' : ''}${sel}${anim}">${empty ? '<span class="dash" aria-hidden="true"></span>' : `<button type="button" data-key="${key}" data-row="${rows.indexOf(row)}" data-col="${c.id}"${ic ? ' aria-description="eliminated"' : ''}${nil ? ' aria-label="zero"' : ''}><span class="v">${shown}</span></button>`}</td>`;
    });
    html += '</tr>';
  }
  if (state.tab === 'bs' && state.upTo >= 7) {
    const chk = res.checks.balance;
    html += `<tr class="checkrow"><th scope="row" class="acc">Check: assets less equity and liabilities</th><td colspan="${cols.length - 1}"></td><td class="strong ${Math.abs(chk) < 0.5 ? 'ok' : 'bad'}">${fmt(chk)}${Math.abs(chk) < 0.5 ? '<svg class="tick red" viewBox="0 0 20 16" aria-label="ties"><path d="M2 9l5 5L18 2"/></svg>' : ''}</td></tr>`;
  }
  if (state.tab === 'pl' && state.upTo >= 6) {
    const nci = res.nciNI, ni = res.ni;
    html += `<tr class="memo"><th scope="row" class="acc">Group share</th><td colspan="${cols.length - 1}"></td><td class="strong"><button type="button" data-memo="owners">${fmt(ni - nci)}</button></td></tr>`;
    html += `<tr class="memo"><th scope="row" class="acc">Minority share</th><td colspan="${cols.length - 1}"></td><td class="strong"><button type="button" data-memo="nci">${fmt(nci)}</button></td></tr>`;
  }
  html += '</tbody></table>';
  g.innerHTML = html;
  if (state.upTo >= 5) struck.add(state.tab); else struck.clear();
  // what changed since the last run lights up, like a refresh in the EPM add-in
  if (!reduced) for (const k of changed) g.querySelector(`[data-key="${CSS.escape(k)}"]`)?.closest('td')?.classList.add('lit');
}

function renderIC(g) {
  if (state.upTo < 4) {
    g.innerHTML = `<div class="empty"><p>Matching runs at step 4.</p><p>Atlas Algérie sold goods to Atlas France during the year, invoiced in euros, and France still owes part of it. Both companies booked their side; the reconciliation checks they agree before anything is eliminated.</p></div>`;
    return;
  }
  let html = `<table class="sheet ic"><caption class="sr">Intercompany reconciliation</caption><thead><tr><th scope="col" class="acc">What</th><th scope="col"><span class="h">Atlas Algérie says</span><span class="s">kEUR, and kUSD</span></th><th scope="col"><span class="h">Atlas France says</span><span class="s">kEUR, and kUSD</span></th><th scope="col"><span class="h">Difference</span><span class="s">kEUR</span></th><th scope="col"><span class="h">Status</span><span class="s"></span></th></tr></thead><tbody>`;
  for (const m of res.matching) {
    html += `<tr class="${m.ok ? '' : 'flag'}"><th scope="row" class="acc">${m.label}</th><td>${fmt(m.a.eur, 1)}<small>${fmt(m.a.usd, 1)}</small></td><td>${fmt(m.b.eur, 1)}<small>${fmt(m.b.usd, 1)}</small></td><td>${fmt(m.diffEUR, 1)}</td><td class="${m.ok ? 'ok' : 'bad'}">${m.ok ? 'Matched' : 'Investigate'}</td></tr>`;
  }
  html += '</tbody></table>';
  html += `<p class="ic-note">Matched in euros, the currency on the invoice. Compare in dollars instead and every move in the exchange rate looks like an error.</p>`;
  g.innerHTML = html;
}

// ---------- the flow ----------
const ABOUT = {
  load: ['Each company closes its own books in its own currency.', 'Dinars, euros and yuan: nothing can be added up yet. The Added up and Group columns stay empty until step 3.'],
  validate: ['Before anything moves, every trial balance must balance.', 'Assets equal liabilities plus equity, and the profit in the income statement is the profit in the balance sheet. A tick goes on each company that ties.'],
  translate: ['Three rates, on purpose.', 'Income and expenses at the year’s average rate, because they happened across the year. Assets and liabilities at the closing rate, because that is what they are worth today. Capital at the historical rate, because that is what was put in. The rates don’t agree, and the gap goes to the translation reserve, not to profit.'],
  match: ['Both sides of every intercompany deal must agree.', 'Algérie says France owes it 180 k€. France must say the same. The comparison happens in euros, so exchange rates can’t invent differences.'],
  eliminate: ['A group can’t make money selling to itself.', 'Intercompany sales, purchases, receivables and payables come out, struck through in red. Anything that didn’t match is parked in a suspense line, in plain sight.'],
  consolidate: ['The parent’s investments come out against the subsidiaries’ capital.', 'What Algérie paid above its share of Shanghai’s capital is goodwill. Shanghai is only partly owned, so the minority’s share of its equity and profit moves to its own line.'],
  report: ['Consolidated statements.', 'If the balance sheet doesn’t balance, something upstream is wrong, and every figure can be traced back to the record that made it.'],
};

function renderSteps() {
  $('#steps').innerHTML = STEPS.map((s, i) => {
    const done = i < state.upTo, r = res.steps[i];
    const status = done ? (r.ok ? 'done' : 'warn') : i === state.upTo ? 'next' : 'todo';
    return `<li class="${status}"><button type="button" data-step="${i}"${status === 'next' ? ' aria-current="step"' : ''}><span class="n">${i + 1}</span><span class="t">${s.title}</span><span class="d">${done ? r.msg : s.sub}</span></button></li>`;
  }).join('');
  const ol = $('#steps');
  if (ol.scrollWidth > ol.clientWidth + 4) {
    const li = ol.children[Math.min(state.upTo, STEPS.length - 1)];
    ol.scrollTo({ left: Math.max(0, li.offsetLeft - 16), behavior: reduced ? 'auto' : 'smooth' });
  }
  $('#run-one').disabled = state.upTo >= STEPS.length;
  $('#run-all').textContent = state.upTo >= STEPS.length ? 'Run it again' : state.upTo ? 'Finish the close' : 'Run the close';
}
function renderEntities() {
  const own = state.opts.own;
  $('#entities').innerHTML = ENTITIES.map((e) => `<li><b>${e.id}</b> ${e.name}<span>${e.city}, ${e.cur}, ${e.parent ? 'the parent' : e.id === 'CN01' ? `${own}% owned` : 'wholly owned'}</span></li>`).join('');
}

function renderInspect() {
  const box = $('#inspect');
  if (state.sel) return renderTrace(box);
  if (!state.upTo) {
    box.innerHTML = `<h2>Before the close</h2><p class="big">Three companies have closed their books. The group hasn't.</p><p>Run the close to watch seven steps turn three trial balances in three currencies into one set of statements. Select any figure to see where it came from.</p>`;
    return;
  }
  // on the intercompany tab, the matching step is the one worth reading
  const i = state.tab === 'ic' && state.upTo >= 4 ? 3 : state.upTo - 1, s = STEPS[i];
  const [a, b] = ABOUT[s.id], r = res.steps[i];
  const gap = res.matching.find((m) => !m.ok);
  const why = gap && (s.id === 'match' || s.id === 'eliminate')
    ? `<p>Here Atlas France has paid ${fmt(gap.diffEUR, 1)} k€ that hasn't reached Atlas Algérie yet. Until one side books it, the two can't cancel out exactly, so the gap sits in a suspense line where everyone can see it, and the balance sheet still balances.</p>`
    : '';
  box.innerHTML = `<h2>Step ${i + 1}: ${s.title}</h2><p class="big">${a}</p><p>${b}</p>${why}<p class="result ${r.ok ? '' : 'bad'}">${r.msg}</p>${i === STEPS.length - 1 ? summary() : ''}`;
}
function summary() {
  const v = (acc) => value(acc, 'CONS');
  const rev = ['REV', 'ICREV'].reduce((t, a) => t + (value(a, 'CONS') || 0), 0);
  return `<dl class="kpi"><div><dt>Revenue</dt><dd>${fmt(rev)}</dd></div><div><dt>Net income, group share</dt><dd>${fmt(res.ni - res.nciNI)}</dd></div><div><dt>Minority interests</dt><dd>${fmt(v('NCI'))}</dd></div><div><dt>Translation reserve, group share</dt><dd>${fmt(v('CTA'))}</dd></div><div><dt>Goodwill</dt><dd>${fmt(v('GW'))}</dd></div></dl><p class="unitnote">Thousands of US dollars.</p>`;
}

const TRAIL = { INPUT: 'Reported', TRANSL: 'Translation', ELIM_IC: 'Intercompany elimination', ELIM_INV: 'Investment elimination', NCI: 'Minority interests' };
function renderTrace(box) {
  const { row, col, memo } = state.sel;
  if (memo) {
    const nci = res.nciNI;
    box.innerHTML = memo === 'nci'
      ? `<h2>Minority share of profit</h2><p class="big">${fmt(nci)} kUSD</p><p>Atlas Shanghai earned ${fmt(res.records.filter((x) => x.entity === 'CN01' && PL_IDS.includes(x.acc) && x.trail === 'INPUT').reduce((t, x) => t + x.usd, 0))} kUSD. The group owns ${state.opts.own}% of it, so ${100 - state.opts.own}% of that profit belongs to Shanghai's other shareholders.</p>${back()}`
      : `<h2>Group share of profit</h2><p class="big">${fmt(res.ni - nci)} kUSD</p><p>Consolidated net income of ${fmt(res.ni)}, less the ${fmt(nci)} that belongs to Shanghai's minority shareholders.</p>${back()}`;
    return;
  }
  const rows = state.tab === 'pl' ? PL_ROWS : BS_ROWS, r = rows[row];
  const ids = r.acc ? [r.acc] : r.ids;
  const label = r.label || ACC[r.acc].label, c = COLS.find((x) => x.id === col);
  const total = rowValue(r, col);
  let lines = '';
  if (col === 'CONS' || col === 'SUM') {
    const parts = col === 'CONS' ? COLS.filter((x) => x.id !== 'CONS' && x.id !== 'SUM') : COLS.filter((x) => x.ent);
    lines = parts.map((p) => { const v = rowValue(r, p.id); return v && Math.abs(v) > 0.05 ? `<li><span>${p.ent ? `${p.id} ${p.ent.name}` : `${p.head} ${p.sub}`}</span><b>${fmt(v, 1)}</b></li>` : ''; }).join('');
  } else {
    const recs = recordsFor(ids, col).filter((x) => Math.abs(translated() ? x.usd || 0 : x.lc || 0) > 0.05);
    lines = recs.map((x) => {
      const e = ENTITIES.find((q) => q.id === x.entity);
      const how = x.trail === 'INPUT' && translated() && x.rate ? `${fmt(x.lc, 1)} ${e.cur} ÷ ${x.rate.toFixed(x.rate > 10 ? 1 : 3)} ${x.rateKind} rate` : x.trail === 'INPUT' && translated() && x.acc === 'NI' ? 'the income statement, at the average rate' : x.note || '';
      return `<li><span>${r.acc ? '' : `${ACC[x.acc].label}: `}${TRAIL[x.trail]}${how ? `<small>${how}</small>` : ''}</span><b>${fmt(translated() ? x.usd : x.lc, 1)}</b></li>`;
    }).join('');
  }
  box.innerHTML = `<h2>${label}</h2><p class="where">${c.ent ? `${c.ent.id} ${c.ent.name}` : `${c.head} ${c.sub}`}</p><p class="big">${fmt(total, 1)} <small>${translated() ? 'kUSD' : `k${c.ent ? c.ent.cur : ''}`}</small></p><ul class="trace">${lines || '<li><span>Nothing posted here yet.</span><b></b></li>'}</ul>${back()}`;
}
const back = () => '<button type="button" class="link" data-unsel>Back to the step notes</button>';

function render() { compute(); renderSteps(); renderEntities(); renderGrid(); renderInspect(); }

// ---------- running ----------
function stepTo(n) { state.upTo = Math.max(0, Math.min(STEPS.length, n)); state.sel = null; render(); }
function play() {
  if (playing) return;
  if (state.upTo >= STEPS.length) { prev.clear(); state.upTo = 0; render(); }
  const tick = () => {
    if (state.upTo >= STEPS.length) {
      playing = null;
      const g = $('#grid');
      if (g.scrollWidth > g.clientWidth + 4) g.scrollTo({ left: g.scrollWidth, behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    stepTo(state.upTo + 1);
    if (state.upTo === 4 && !res.steps[3].ok) state.tab = state.tab === 'ic' ? 'ic' : state.tab;
    playing = setTimeout(tick, reduced ? 0 : 900);
  };
  tick();
}

// ---------- events ----------
$('#run-all').addEventListener('click', play);
$('#run-one').addEventListener('click', () => { clearTimeout(playing); playing = null; stepTo(state.upTo + 1); });
$('#reset').addEventListener('click', () => {
  clearTimeout(playing); playing = null; prev.clear();
  Object.assign(state.opts, { eur: 0, cny: 0, dzd: 0, own: 70, miss: false });
  document.querySelectorAll('.levers input').forEach((i) => { if (i.type === 'checkbox') i.checked = false; else i.value = i.dataset.key === 'own' ? 70 : 0; });
  updateOutputs(); stepTo(0);
});
$('#steps').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) { clearTimeout(playing); playing = null; stepTo(+b.dataset.step + 1); } });
document.querySelectorAll('[role="tab"]').forEach((t) => t.addEventListener('click', () => {
  state.tab = t.dataset.tab; state.sel = null;
  document.querySelectorAll('[role="tab"]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
  renderGrid(); renderInspect();
}));
$('#grid').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.memo) state.sel = { memo: b.dataset.memo, key: null };
  else state.sel = { key: b.dataset.key, row: +b.dataset.row, col: b.dataset.col };
  renderGrid(); renderInspect();
  if (matchMedia('(max-width: 1023px)').matches) $('#inspect').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
});
$('#inspect').addEventListener('click', (e) => { if (e.target.closest('[data-unsel]')) { state.sel = null; renderGrid(); renderInspect(); } });

function updateOutputs() {
  for (const k of ['eur', 'cny', 'dzd']) {
    const v = state.opts[k];
    $(`#o-${k}`).textContent = v === 0 ? 'unchanged' : `${v > 0 ? 'stronger' : 'weaker'} by ${Math.abs(v)}%`;
  }
  $('#o-own').textContent = `${state.opts.own}%`;
}
document.querySelectorAll('.levers input').forEach((inp) => inp.addEventListener('input', () => {
  const k = inp.dataset.key;
  state.opts[k] = inp.type === 'checkbox' ? inp.checked : +inp.value;
  updateOutputs();
  // breaking things is only interesting once there are statements to break
  if (state.upTo < STEPS.length) { clearTimeout(playing); playing = null; state.upTo = STEPS.length; }
  if (k === 'miss' && inp.checked) { state.tab = 'ic'; document.querySelectorAll('[role="tab"]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === 'ic'))); }
  render();
}));

// deep links: ?run runs the close on arrival, #bs / #ic open a statement
if (location.hash === '#bs' || location.hash === '#ic') {
  state.tab = location.hash.slice(1);
  document.querySelectorAll('[role="tab"]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === state.tab)));
}
updateOutputs();
render();
if (/[?&]run/.test(location.search)) play();
