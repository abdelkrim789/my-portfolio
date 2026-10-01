// Art for the hover board in the last chapter: a halftone print on paper, or a line engraving on blueprint film.
const CAPTIONS = {
  C_SAC: 'SAP Certified · Data Analyst · SAP Analytics Cloud',
  TS410: 'SAP Certified · Business Process Integration · S/4HANA',
  S4C03: 'SAP Certified · Implementation Consultant · S/4HANA Cloud PE',
  ABAP: 'SAP Certified · Back-End Developer · ABAP Cloud',
  '@': 'abdelkrimghebouli.34@gmail.com',
  in: 'linkedin.com/in/abdelkrim-ghebouli',
  CV: 'Abdelkrim-Ghebouli-CV.pdf',
};
let photo = null;
export function loadPhoto(src) {
  if (photo) return photo;
  photo = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  return photo;
}

function lumGrid(img, S) {
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data, out = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) out[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
  return out;
}

export function glyphCanvas(key, style, img, fontFam) {
  const W = 1024, H = 768;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const paper = style === 'halftone';
  const ink = paper ? '#141a2e' : '#eaf3fb', accent = paper ? '#a35f0b' : '#ffd27a';
  if (paper) { g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, W, H); }
  g.strokeStyle = ink; g.lineWidth = 4; g.strokeRect(22, 22, W - 44, H - 44);
  g.lineWidth = 1.5; g.strokeRect(36, 36, W - 72, H - 72);
  g.textAlign = 'center'; g.textBaseline = 'middle';

  if (key === '__face' && img) {
    const S = 120, L = lumGrid(img, S);
    const box = 560, x0 = (W - box) / 2, y0 = 70, step = box / S;
    if (paper) {
      g.fillStyle = ink;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const v = L[y * S + x];
        if (v > 0.8) continue;
        const r = (1 - v) * step * 0.62;
        g.beginPath(); g.arc(x0 + (x + 0.5) * step + (y % 2) * step * 0.5, y0 + (y + 0.5) * step, r, 0, Math.PI * 2); g.fill();
      }
    } else {
      g.fillStyle = ink;
      for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x++) {
        const v = L[y * S + x];
        if (v > 0.8) continue;
        const h = (1 - v) * step * 1.7;
        g.fillRect(x0 + x * step, y0 + (y + 1) * step - h / 2, step + 0.5, h);
      }
    }
    g.fillStyle = ink; g.font = `800 64px ${fontFam}`;
    g.fillText('ABDELKRIM GHEBOULI', W / 2, H - 92);
    g.fillStyle = accent; g.font = '500 20px "IBM Plex Mono", monospace';
    g.fillText('SAP BPC CONSULTANT · BORDJ BOU ARRERIDJ', W / 2, H - 50);
    return cv;
  }
  if (!key) {
    g.fillStyle = accent; g.font = '500 24px "IBM Plex Mono", monospace';
    g.fillText(paper ? 'NOTICE BOARD' : 'SHEET 07 / 07 · FOR REVIEW', W / 2, 130);
    g.fillStyle = ink; g.font = `800 112px ${fontFam}`;
    g.fillText('OPEN TO', W / 2, 290); g.fillText('SAP ROLES', W / 2, 410);
    g.font = '500 26px "IBM Plex Mono", monospace';
    g.fillText('INTERNATIONALLY · HOVER A CREDENTIAL', W / 2, 560);
    return cv;
  }
  const big = key.length <= 2 ? 360 : key.length <= 5 ? 220 : 170;
  g.font = `800 ${big}px ${fontFam}`;
  if (paper) { g.fillStyle = ink; g.fillText(key, W / 2, H / 2 - 40); }
  else {
    g.save(); g.lineWidth = 5; g.strokeStyle = ink; g.strokeText(key, W / 2, H / 2 - 40);
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.globalCompositeOperation = 'source-over';
    const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
    const t = tc.getContext('2d'); t.font = g.font; t.textAlign = 'center'; t.textBaseline = 'middle';
    t.fillStyle = '#fff'; t.fillText(key, W / 2, H / 2 - 40);
    t.globalCompositeOperation = 'source-in'; t.strokeStyle = ink; t.lineWidth = 2;
    for (let i = -H; i < W; i += 14) { t.beginPath(); t.moveTo(i, H); t.lineTo(i + H, 0); t.stroke(); }
    g.drawImage(tc, 0, 0); g.restore();
  }
  g.fillStyle = accent; g.font = '500 26px "IBM Plex Mono", monospace';
  g.fillText((CAPTIONS[key] || key).toUpperCase(), W / 2, H - 110);
  return cv;
}
