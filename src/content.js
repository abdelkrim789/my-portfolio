// What the portfolio says, independent of which world draws it.
export const STAGES = ['SIGNAL', 'RAW', 'CLEAN', 'MODEL', 'CONSOLIDATE', 'REPORT', 'BUILD', 'DECIDE'];

export const SYSTEMS = ['SAP S/4HANA', 'SAP BPC', 'SAP BW', 'SAP Analytics Cloud', 'Power BI', 'Cegid PMI', 'ABAP', 'Python'];
export const TASKS = [['Business Process Flows', 'd-bpf'], ['EPM Add-in', 'd-epm'], ['Analysis for Office', 'd-afo'], ['BW Query Design', 'd-bwq'], ['Security Design', 'd-sec'], ['Decision reports', 'd-rep']];
export const METRICS = [['4–6 Power BI dashboards', 'd-m-dash'], ['~30% faster platform', 'd-m-flask'], ['30–50 ERP users', 'd-m-users'], ['10–20 staff onboarded', 'd-m-launch']];
export const PROJECTS_D = [['Olive Palace', 'd-olive'], ['LatinaDZ', 'd-latina'], ['Jewelry Store System', 'd-jewelry']];
export const LAYERS = [['Interface layer', 'd-layer-ui'], ['Logic layer', 'd-layer-logic'], ['Data layer', 'd-layer-data']];

// Every clickable point. k = chapter. Each one opens its own <template id="d">.
export const POINTS = [
  { d: 'd-raw', k: 1, label: 'The incident', kind: 'fault' },
  { d: 'd-raw-mismatch', k: 1, label: 'Stock ≠ movements', kind: 'fault' },
  { d: 'd-raw-blocked', k: 1, label: 'Production blocked', kind: 'fault' },
  { d: 'd-clean-method', k: 2, label: 'Drift analysis', kind: 'sand' },
  { d: 'd-clean-tool', k: 2, label: 'Auto-correction tool', kind: 'sand' },
  ...SYSTEMS.map((label, i) => ({ d: `d-sys-${i}`, k: 3, label })),
  { d: 'd-shone', k: 4, label: 'SHONE · consolidated view', kind: 'sand' },
  ...TASKS.map(([label, d]) => ({ d, k: 4, label })),
  { d: 'd-geant', k: 5, label: 'Géant Electronics · 2025' },
  ...METRICS.map(([label, d]) => ({ d, k: 5, label, kind: 'sand' })),
  ...PROJECTS_D.map(([label, d]) => ({ d, k: 6, label, kind: 'sand' })),
  ...LAYERS.map(([label, d]) => ({ d, k: 6, label })),
  { d: 'd-team', k: 6, label: 'Team · 4–6 developers' },
  { d: 'd-home', k: 7, label: 'Bordj Bou Arreridj · 36.07°N 4.76°E', kind: 'sand' },
];

export const MILESTONES = [
  [0.4, '2021', 'Intern · Transite Baghoura customs office'],
  [1.4, '2024', 'Bachelor · Information Systems & Software Engineering'],
  [2.4, 'Oct 2024', 'Backend developer & dev team lead'],
  [3.4, 'Jan 2025', 'Data Analyst · Géant Electronics'],
  [4.4, 'Mar 2025', 'SAP Young Professionals Program'],
  [5.4, '2025', 'Master 1 · Business Intelligence'],
  [6.4, 'Jun 2026', 'SAP BPC Consultant · CNPC'],
];

// Bordj Bou Arreridj
export const HOME = [36.07, 4.76];
export const CITIES = [[48.85, 2.35], [52.52, 13.4], [51.5, -0.13], [25.2, 55.27], [25.29, 51.53], [24.71, 46.68], [39.9, 116.4], [43.65, -79.38], [3.14, 101.69], [46.2, 6.14]];
export function latLon(lat, lon, r) {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)];
}
