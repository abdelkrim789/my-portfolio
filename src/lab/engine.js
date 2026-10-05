// A small, honest group consolidation: the same steps a real close runs in SAP BPC, on illustrative data.
// Amounts are thousands. Natural signs: revenue +, expenses −; assets, liabilities and equity all +.

export const GROUP_CUR = 'USD';

export const ENTITIES = [
  { id: 'DZ01', name: 'Atlas Algérie', city: 'Algiers', cur: 'DZD', parent: true },
  { id: 'FR01', name: 'Atlas France', city: 'Lyon', cur: 'EUR' },
  { id: 'CN01', name: 'Atlas Shanghai', city: 'Shanghai', cur: 'CNY' },
];

// local currency per 1 USD
export const BASE_RATES = {
  DZD: { avg: 134.8, close: 135.6, hist: 128.0 },
  EUR: { avg: 0.92, close: 0.90, hist: 0.95 },
  CNY: { avg: 7.18, close: 7.12, hist: 6.90 },
};

// sec: PL, A (assets), E (equity), L (liabilities). rule: how the account translates.
export const ACCOUNTS = [
  { id: 'REV', label: 'Revenue', sec: 'PL', rule: 'avg' },
  { id: 'ICREV', label: 'Intercompany revenue', sec: 'PL', rule: 'avg', ic: true },
  { id: 'COGS', label: 'Cost of sales', sec: 'PL', rule: 'avg' },
  { id: 'ICPUR', label: 'Intercompany purchases', sec: 'PL', rule: 'avg', ic: true },
  { id: 'OPEX', label: 'Operating expenses', sec: 'PL', rule: 'avg' },
  { id: 'FXR', label: 'Foreign exchange result', sec: 'PL', rule: 'avg' },
  { id: 'ICDPL', label: 'Intercompany difference', sec: 'PL', rule: 'none' },
  { id: 'GW', label: 'Goodwill', sec: 'A', rule: 'none' },
  { id: 'FA', label: 'Fixed assets', sec: 'A', rule: 'close' },
  { id: 'INVEST', label: 'Investments in subsidiaries', sec: 'A', rule: 'hist' },
  { id: 'STOCK', label: 'Inventory', sec: 'A', rule: 'close' },
  { id: 'REC', label: 'Trade receivables', sec: 'A', rule: 'close' },
  { id: 'ICR', label: 'Intercompany receivables', sec: 'A', rule: 'close', ic: true },
  { id: 'CASH', label: 'Cash', sec: 'A', rule: 'close' },
  { id: 'SC', label: 'Share capital', sec: 'E', rule: 'hist' },
  { id: 'RE', label: 'Retained earnings', sec: 'E', rule: 'hist' },
  { id: 'NI', label: 'Net income for the year', sec: 'E', rule: 'pl' },
  { id: 'CTA', label: 'Translation reserve', sec: 'E', rule: 'plug' },
  { id: 'NCI', label: 'Non-controlling interests', sec: 'E', rule: 'none' },
  { id: 'LOAN', label: 'Borrowings', sec: 'L', rule: 'close' },
  { id: 'PAY', label: 'Trade payables', sec: 'L', rule: 'close' },
  { id: 'ICP', label: 'Intercompany payables', sec: 'L', rule: 'close', ic: true },
  { id: 'ICDIFF', label: 'Intercompany difference', sec: 'L', rule: 'none' },
];
export const ACC = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a]));
export const PL_IDS = ACCOUNTS.filter((a) => a.sec === 'PL').map((a) => a.id);

export const GOODWILL_CN = 800; // kUSD paid above the share of Shanghai's capital

// The trial balances each subsidiary reports, in local currency. The parent's cash balances its books.
// Intercompany trade is invoiced in euros: DZ01 sold goods to FR01 during the year and is still owed for part of them.
export const IC_SALES_EUR = 921.4, IC_OPEN_EUR = 180, IC_IN_TRANSIT_EUR = 3.6;

export function buildData({ ownCN = 0.7, rates = BASE_RATES, mismatch = false } = {}) {
  const fr = { REV: 7600, ICPUR: -IC_SALES_EUR, COGS: -4300, OPEX: -1180, FA: 3600, STOCK: 980, REC: 1450, SC: 2850, RE: 640, LOAN: 1100, PAY: 820, ICP: IC_OPEN_EUR - (mismatch ? IC_IN_TRANSIT_EUR : 0) };
  const cn = { REV: 52000, COGS: -37500, OPEX: -8600, FA: 41000, STOCK: 7400, REC: 11800, SC: 41400, RE: 6200, LOAN: 9000, PAY: 6300 };
  // DZ01 books its euro sales at the average cross rate and revalues the euro receivable at the closing cross rate
  const xAvg = rates.DZD.avg / rates.EUR.avg, xClose = rates.DZD.close / rates.EUR.close;
  const xClose0 = BASE_RATES.DZD.close / BASE_RATES.EUR.close;
  const dz = { REV: 1200000, ICREV: IC_SALES_EUR * xAvg, COGS: -870000, OPEX: -210000, FA: 900000, STOCK: 140000, REC: 260000,
    ICR: IC_OPEN_EUR * xClose, FXR: IC_OPEN_EUR * (xClose - xClose0), SC: 1000000, RE: 600000, LOAN: 650000, PAY: 190000 };
  const H = rates.DZD.hist;
  const invFR = (fr.SC / rates.EUR.hist) * H;                              // bought FR01 outright at incorporation
  const invCN = (ownCN * cn.SC / rates.CNY.hist + GOODWILL_CN) * H;         // bought ownCN of CN01, with goodwill
  dz.INVEST = Math.round(invFR + invCN);
  const books = { DZ01: dz, FR01: fr, CN01: cn };
  for (const [id, b] of Object.entries(books)) {
    const ni = PL_IDS.reduce((s, k) => s + (b[k] || 0), 0);
    b.NI = ni;
    const assets = ACCOUNTS.filter((a) => a.sec === 'A' && a.id !== 'CASH').reduce((s, a) => s + (b[a.id] || 0), 0);
    const le = ACCOUNTS.filter((a) => a.sec === 'L' || a.sec === 'E').reduce((s, a) => s + (b[a.id] || 0), 0);
    b.CASH = +(le - assets).toFixed(1);
  }
  // the IC partner of each IC balance
  const partner = { DZ01: { ICREV: 'FR01', ICR: 'FR01' }, FR01: { ICPUR: 'DZ01', ICP: 'DZ01' }, CN01: {} };
  return { books, partner, ownCN, rates };
}

const r1 = (x) => Math.round(x * 10) / 10;

// The business process flow. Each step returns what it did; run(upTo) runs the first steps.
export const STEPS = [
  { id: 'load', title: 'Load', sub: 'Trial balances, local currency' },
  { id: 'validate', title: 'Validate', sub: 'Every entity balances' },
  { id: 'translate', title: 'Translate', sub: `Into ${GROUP_CUR}` },
  { id: 'match', title: 'Match', sub: 'Intercompany reconciliation' },
  { id: 'eliminate', title: 'Eliminate', sub: 'Intercompany out of the group' },
  { id: 'consolidate', title: 'Consolidate', sub: 'Investments, goodwill, NCI' },
  { id: 'report', title: 'Report', sub: 'Consolidated statements' },
];

export function run(data, upTo = STEPS.length) {
  const { books, partner, ownCN, rates } = data;
  const rec = [];      // { entity, acc, trail, lc, usd, note, partner }
  const out = { steps: [], records: rec, checks: {}, matching: [], data };
  const did = (i) => i < upTo;
  // 1 · load
  if (did(0)) {
    for (const e of ENTITIES) for (const a of ACCOUNTS) {
      const v = books[e.id][a.id];
      if (v) rec.push({ entity: e.id, acc: a.id, trail: 'INPUT', lc: v, usd: null, partner: partner[e.id][a.id] });
    }
    out.steps.push({ id: 'load', ok: true, msg: `${rec.length} records from 3 entities` });
  }
  // 2 · validate: assets = liabilities + equity, and the P&L result is the balance-sheet result
  if (did(1)) {
    const v = ENTITIES.map((e) => {
      const b = books[e.id], s = (sec) => ACCOUNTS.filter((a) => a.sec === sec).reduce((t, a) => t + (b[a.id] || 0), 0);
      const plNI = PL_IDS.reduce((t, k) => t + (b[k] || 0), 0);
      return { entity: e.id, diff: r1(s('A') - s('L') - s('E')), niDiff: r1(plNI - b.NI) };
    });
    out.checks.validate = v;
    const ok = v.every((x) => Math.abs(x.diff) < 0.05 && Math.abs(x.niDiff) < 0.05);
    out.steps.push({ id: 'validate', ok, msg: ok ? 'Assets = liabilities + equity in all 3 entities' : 'An entity does not balance' });
  }
  // 3 · translate: P&L at the average rate, assets and liabilities at closing, equity at historical. The gap is the translation reserve.
  if (did(2)) {
    for (const e of ENTITIES) {
      const R = rates[e.cur];
      let niUSD = 0;
      for (const x of rec.filter((x) => x.entity === e.id && x.trail === 'INPUT')) {
        const rule = ACC[x.acc].rule;
        if (rule === 'avg') { x.usd = x.lc / R.avg; x.rate = R.avg; x.rateKind = 'average'; niUSD += x.usd; }
        else if (rule === 'close') { x.usd = x.lc / R.close; x.rate = R.close; x.rateKind = 'closing'; }
        else if (rule === 'hist') { x.usd = x.lc / R.hist; x.rate = R.hist; x.rateKind = 'historical'; }
      }
      const ni = rec.find((x) => x.entity === e.id && x.acc === 'NI' && x.trail === 'INPUT');
      ni.usd = niUSD; ni.rateKind = 'P&L at average'; ni.rate = null;
      const sum = (sec) => rec.filter((x) => x.entity === e.id && ACC[x.acc].sec === sec && x.usd != null).reduce((t, x) => t + x.usd, 0);
      const cta = sum('A') - sum('L') - sum('E');
      rec.push({ entity: e.id, acc: 'CTA', trail: 'TRANSL', lc: 0, usd: cta, note: 'Assets at closing, equity at historical, result at average: the difference' });
    }
    const ctaTot = rec.filter((x) => x.acc === 'CTA').reduce((t, x) => t + x.usd, 0);
    out.steps.push({ id: 'translate', ok: true, msg: `Translation reserve ${fmt(ctaTot)} k${GROUP_CUR}` });
  }
  // 4 · match intercompany: what DZ01 says FR01 owes vs what FR01 says it owes DZ01
  if (did(3)) {
    // matched in the invoice currency (EUR), the way a real reconciliation does it
    const xAvg = rates.DZD.avg / rates.EUR.avg, xClose = rates.DZD.close / rates.EUR.close;
    const pairs = [['ICREV', 'ICPUR', 'Sales from DZ01 to FR01', xAvg], ['ICR', 'ICP', 'What FR01 owes DZ01', xClose]];
    for (const [a, b, label, x2eur] of pairs) {
      const x = rec.find((r) => r.acc === a && r.trail === 'INPUT'), y = rec.find((r) => r.acc === b && r.trail === 'INPUT');
      const xa = Math.abs(x.usd), ya = Math.abs(y.usd), diff = r1(xa - ya);
      const eurA = Math.abs(x.lc) / x2eur, eurB = Math.abs(y.lc), diffEUR = Math.round((eurA - eurB) * 10) / 10;
      out.matching.push({ label, a: { entity: x.entity, acc: a, usd: xa, lc: x.lc, cur: 'DZD', eur: eurA }, b: { entity: y.entity, acc: b, usd: ya, lc: y.lc, cur: 'EUR', eur: eurB }, diff, diffEUR, ok: Math.abs(diffEUR) < 0.05 });
    }
    const bad = out.matching.filter((m) => !m.ok);
    out.steps.push({ id: 'match', ok: !bad.length, msg: bad.length ? `FR01 shows ${fmt(bad[0].diffEUR, 1)} kEUR less than DZ01` : 'Both sides agree, to the euro' });
  }
  // 5 · eliminate intercompany: the group cannot sell to itself or owe itself
  if (did(4)) {
    for (const m of out.matching) {
      const isPL = m.a.acc === 'ICREV';
      rec.push({ entity: m.a.entity, acc: m.a.acc, trail: 'ELIM_IC', lc: 0, usd: isPL ? -m.a.usd : -m.a.usd, note: `Eliminate ${ACC[m.a.acc].label.toLowerCase()} with ${m.b.entity}`, partner: m.b.entity });
      rec.push({ entity: m.b.entity, acc: m.b.acc, trail: 'ELIM_IC', lc: 0, usd: isPL ? m.b.usd : -m.b.usd, note: `Eliminate ${ACC[m.b.acc].label.toLowerCase()} with ${m.a.entity}`, partner: m.a.entity });
      // whatever does not match is parked where everyone can see it, never buried
      if (Math.abs(m.diff) > 0.001) rec.push({ entity: m.a.entity, acc: isPL ? 'ICDPL' : 'ICDIFF', trail: 'ELIM_IC', lc: 0, usd: isPL ? m.diff : -m.diff, note: 'Unmatched difference, parked for investigation' });
    }
    out.steps.push({ id: 'eliminate', ok: out.matching.every((m) => m.ok), msg: out.matching.every((m) => m.ok) ? 'Intercompany sales and balances removed' : 'Removed; the gap is parked in a suspense line' });
  }
  // 6 · consolidate: investments against the subsidiaries' capital (goodwill is what was paid on top), then the minority's share
  if (did(5)) {
    const scUSD = (id) => rec.find((x) => x.entity === id && x.acc === 'SC' && x.trail === 'INPUT').usd;
    const invUSD = rec.find((x) => x.acc === 'INVEST' && x.trail === 'INPUT').usd;
    const frSC = scUSD('FR01'), cnSC = scUSD('CN01');
    const gw = r1(invUSD - frSC - ownCN * cnSC);
    rec.push({ entity: 'DZ01', acc: 'INVEST', trail: 'ELIM_INV', lc: 0, usd: -invUSD, note: 'Remove the parent’s investments in FR01 and CN01' });
    rec.push({ entity: 'FR01', acc: 'SC', trail: 'ELIM_INV', lc: 0, usd: -frSC, note: 'FR01 capital, 100% owned' });
    rec.push({ entity: 'CN01', acc: 'SC', trail: 'ELIM_INV', lc: 0, usd: -ownCN * cnSC, note: `CN01 capital, ${Math.round(ownCN * 100)}% owned` });
    rec.push({ entity: 'CN01', acc: 'GW', trail: 'ELIM_INV', lc: 0, usd: invUSD - frSC - ownCN * cnSC, note: 'Paid above the share of capital acquired' });
    const nciShare = 1 - ownCN;
    let nci = 0;
    if (nciShare > 0.0001) {
      for (const acc of ['SC', 'RE', 'NI', 'CTA']) {
        const v = rec.filter((x) => x.entity === 'CN01' && x.acc === acc && (x.trail === 'INPUT' || x.trail === 'TRANSL')).reduce((t, x) => t + x.usd, 0);
        rec.push({ entity: 'CN01', acc, trail: 'NCI', lc: 0, usd: -nciShare * v, note: `${Math.round(nciShare * 100)}% belongs to minority shareholders` });
        nci += nciShare * v;
      }
      rec.push({ entity: 'CN01', acc: 'NCI', trail: 'NCI', lc: 0, usd: nci, note: 'Minority shareholders’ share of CN01 equity' });
    }
    out.nciNI = nciShare * rec.filter((x) => x.entity === 'CN01' && PL_IDS.includes(x.acc) && x.trail === 'INPUT').reduce((t, x) => t + x.usd, 0);
    out.goodwill = gw;
    out.steps.push({ id: 'consolidate', ok: true, msg: `Goodwill ${fmt(gw)}, NCI ${fmt(nci)} k${GROUP_CUR}` });
  }
  // 7 · report: the consolidated balance sheet must balance
  if (did(6)) {
    const tot = (sec) => rec.filter((x) => ACC[x.acc].sec === sec && x.usd != null).reduce((t, x) => t + x.usd, 0);
    const check = r1(tot('A') - tot('L') - tot('E'));
    out.checks.balance = check;
    const ni = rec.filter((x) => PL_IDS.includes(x.acc) && x.usd != null).reduce((t, x) => t + x.usd, 0);
    out.ni = ni;
    out.steps.push({ id: 'report', ok: Math.abs(check) < 0.5, msg: Math.abs(check) < 0.5 ? 'Balance sheet balances. Ready to publish.' : `Out of balance by ${fmt(check)}` });
  }
  return out;
}

export function fmt(x, d = 0) {
  if (x == null || Number.isNaN(x)) return '—';
  const s = Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return x < -0.0001 * Math.pow(10, -d) && Math.abs(x) >= 0.5 * Math.pow(10, -d) ? `(${s})` : s;
}
