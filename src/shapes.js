// Procedural target shapes for the particle field.
// Every particle owns one position in every shape; the shader morphs between them.

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r) {
  const u = Math.max(1e-6, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function randDir(r) {
  const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
  return [s * Math.cos(a), z, s * Math.sin(a)];
}
function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

// ---- star geometry (shared with label projection) ----
export const STAR_R = 3.4;
export function starTips() {
  const tips = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 2;
    tips.push([STAR_R * Math.cos(a), STAR_R * Math.sin(a), 0]);
  }
  return tips;
}

// ---- globe ----
const GLOBE_R = 3.1;
function latLon(lat, lon, r = GLOBE_R) {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)];
}
const HOME = [36.07, 4.76]; // Bordj Bou Arreridj
const CITIES = [
  [48.85, 2.35], [52.52, 13.4], [51.5, -0.13], [25.2, 55.27], [25.29, 51.53],
  [24.71, 46.68], [39.9, 116.4], [43.65, -79.38], [3.14, 101.69], [46.2, 6.14],
];
function slerp(a, b, t) {
  const na = Math.hypot(...a), nb = Math.hypot(...b);
  const ua = a.map((v) => v / na), ub = b.map((v) => v / nb);
  const dot = Math.min(1, Math.max(-1, ua[0] * ub[0] + ua[1] * ub[1] + ua[2] * ub[2]));
  const om = Math.acos(dot);
  if (om < 1e-4) return ua;
  const s = Math.sin(om);
  const k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
  return [ua[0] * k1 + ub[0] * k2, ua[1] * k1 + ub[1] * k2, ua[2] * k1 + ub[2] * k2, om];
}

export function buildShapes(N, seed = 7) {
  const r = mulberry32(seed);
  const P = {
    aP1: new Float32Array(N * 3), aP2: new Float32Array(N * 3), aP3: new Float32Array(N * 3),
    aP4: new Float32Array(N * 4), aP5: new Float32Array(N * 3), aP6: new Float32Array(N * 3),
    aP7: new Float32Array(N * 3), aSeed: new Float32Array(N * 4), aExtra: new Float32Array(N * 4),
  };
  const set3 = (arr, i, v) => { arr[i * 3] = v[0]; arr[i * 3 + 1] = v[1]; arr[i * 3 + 2] = v[2]; };

  // chaos clusters
  const clusters = Array.from({ length: 14 }, () => {
    const d = randDir(r), k = Math.cbrt(r());
    return [d[0] * 4.6 * k, d[1] * 2.8 * k, d[2] * 3.2 * k];
  });

  // table grid
  const G = { cols: 10, rows: 14, layers: 4, w: 0.7, h: 0.26, gx: 0.08, gy: 0.12, gz: 0.6 };
  const gridW = G.cols * (G.w + G.gx), gridH = G.rows * (G.h + G.gy), gridD = (G.layers - 1) * G.gz;
  const gridGold = new Set();
  for (let c = 0; c < G.cols * G.rows * G.layers; c++) if (r() < 0.06) gridGold.add(c);

  // star
  const tips = starTips();
  const inner = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 2 + Math.PI / 8;
    inner.push([STAR_R * 0.5 * Math.cos(a), STAR_R * 0.5 * Math.sin(a), 0]);
  }

  // bars
  const BX = 6, BZ = 4, sp = 1.02, fp = 0.6;
  const bars = [];
  for (let i = 0; i < BX; i++) for (let j = 0; j < BZ; j++) {
    const h = 0.5 + 3.0 * ((i + (BZ - 1 - j) * 0.6) / (BX - 1 + (BZ - 1) * 0.6)) + (r() - 0.5) * 0.7;
    bars.push({ x: (i - (BX - 1) / 2) * sp, z: (j - (BZ - 1) / 2) * sp, h: Math.max(0.35, h) });
  }
  const gold = new Set([5 * BZ + 0, 3 * BZ + 1, 1 * BZ + 2, 4 * BZ + 3]);
  const barW = bars.map((b) => b.h + 0.6);
  const barTot = barW.reduce((a, b) => a + b, 0);
  const pickBar = () => { let x = r() * barTot; for (let k = 0; k < bars.length; k++) { x -= barW[k]; if (x <= 0) return k; } return bars.length - 1; };

  // globe
  const home = latLon(...HOME);
  const arcs = CITIES.map((c) => latLon(...c));
  const fibN = Math.floor(N * 0.52);
  let fibI = 0;

  for (let i = 0; i < N; i++) {
    P.aSeed.set([r(), r(), r(), r()], i * 4);
    let flags = 0;
    P.aExtra[i * 4] = -1; P.aExtra[i * 4 + 2] = -1; P.aExtra[i * 4 + 3] = 0;

    // 1 chaos
    let v;
    if (r() < 0.42) { const d = randDir(r), k = Math.cbrt(r()); v = [d[0] * 5.4 * k, d[1] * 3.3 * k, d[2] * 3.6 * k]; }
    else { const c = clusters[Math.floor(r() * clusters.length)]; v = [c[0] + gauss(r) * 0.5, c[1] + gauss(r) * 0.5, c[2] + gauss(r) * 0.5]; }
    set3(P.aP1, i, v);

    // 2 grid (records table)
    {
      const cell = Math.floor(r() * G.cols * G.rows * G.layers);
      const l = Math.floor(cell / (G.cols * G.rows)), rem = cell % (G.cols * G.rows);
      const row = Math.floor(rem / G.cols), col = rem % G.cols;
      const x0 = col * (G.w + G.gx) - gridW / 2, y0 = row * (G.h + G.gy) - gridH / 2, z0 = l * G.gz - gridD / 2;
      let x, y;
      if (r() < 0.55) {
        const t = r() * 2 * (G.w + G.h);
        if (t < G.w) { x = t; y = 0; } else if (t < G.w + G.h) { x = G.w; y = t - G.w; }
        else if (t < 2 * G.w + G.h) { x = t - G.w - G.h; y = G.h; } else { x = 0; y = t - 2 * G.w - G.h; }
      } else { x = r() * G.w; y = r() * G.h; }
      set3(P.aP2, i, [x0 + x, y0 + y, z0 + (r() - 0.5) * 0.03]);
      if (gridGold.has(cell)) flags |= 1;
    }

    // 3 star (khatam)
    {
      const q = r();
      let p;
      if (q < 0.42) { // outer star: two squares
        const k = Math.floor(r() * 8);
        p = lerp3(tips[k], tips[(k + 2) % 8], r());
      } else if (q < 0.56) {
        const k = Math.floor(r() * 8);
        p = lerp3(inner[k], inner[(k + 2) % 8], r());
      } else if (q < 0.66) {
        const a = r() * Math.PI * 2, rr = r() < 0.6 ? STAR_R * 1.14 : STAR_R * 0.28;
        p = [Math.cos(a) * rr, Math.sin(a) * rr, 0];
      } else if (q < 0.74) {
        const k = Math.floor(r() * 8), t = Math.pow(r(), 0.7);
        p = lerp3([0, 0, 0], tips[k], t);
      } else if (q < 0.93) {
        const k = Math.floor(r() * 8), d = randDir(r), s = 0.22 * Math.cbrt(r());
        p = [tips[k][0] + d[0] * s, tips[k][1] + d[1] * s, tips[k][2] + d[2] * s];
        flags |= 2;
      } else {
        const d = randDir(r), s = 0.34 * Math.cbrt(r());
        p = [d[0] * s, d[1] * s, d[2] * s];
        flags |= 2;
      }
      p[2] += (r() < 0.5 ? -1 : 1) * 0.12 + (r() - 0.5) * 0.03;
      set3(P.aP3, i, p);
    }

    // 4 consolidation params: entity, phase, role, speed
    {
      const q = r();
      const role = q < 0.62 ? 0 : q < 0.85 ? 1 : 2;
      P.aP4.set([Math.floor(r() * 6), r(), role, 0.6 + r() * 0.8], i * 4);
    }

    // 5 bars
    {
      if (r() < 0.12) {
        const along = r() < 0.5;
        const line = Math.floor(r() * 9) - 4, t = (r() - 0.5) * 7.2;
        const a = line * 0.9 * (along ? 1 : 0.62);
        set3(P.aP5, i, along ? [t, -1.8, a * 0.62] : [a * 1.4, -1.8, t * 0.62]);
      } else {
        const k = pickBar(), b = bars[k], h = b.h, hw = fp / 2;
        const q = r();
        let lx, ly, lz;
        if (q < 0.34) { const e = Math.floor(r() * 4); lx = e & 1 ? hw : -hw; lz = e & 2 ? hw : -hw; ly = r() * h; }
        else if (q < 0.5) { const t = r() * 4; const s = Math.floor(t), f = (t - s) * 2 - 1;
          if (s === 0) { lx = f * hw; lz = -hw; } else if (s === 1) { lx = hw; lz = f * hw; } else if (s === 2) { lx = f * hw; lz = hw; } else { lx = -hw; lz = f * hw; } ly = h; }
        else { const f = Math.floor(r() * 5); const u = (r() * 2 - 1) * hw;
          if (f === 4) { lx = u; lz = (r() * 2 - 1) * hw; ly = h; }
          else { ly = r() * h; if (f < 2) { lx = f ? hw : -hw; lz = u; } else { lz = f === 2 ? hw : -hw; lx = u; } } }
        set3(P.aP5, i, [b.x + lx, -1.8 + ly, b.z + lz]);
        if (gold.has(k)) flags |= 4;
      }
    }

    // 6 layers (data / logic / interface)
    {
      if (r() < 0.8) {
        const L = Math.floor(r() * 3), y = (L - 1) * 1.7, S = 5.0;
        const line = (Math.floor(r() * 9) / 8 - 0.5) * S, t = (r() - 0.5) * S;
        set3(P.aP6, i, r() < 0.5 ? [line, y, t] : [t, y, line]);
      } else {
        const gx = (Math.floor(r() * 9) / 8 - 0.5) * 5.0, gz = (Math.floor(r() * 9) / 8 - 0.5) * 5.0;
        set3(P.aP6, i, [gx, 0, gz]);
        P.aExtra[i * 4 + 2] = r();
      }
    }

    // 7 globe
    {
      const q = r();
      if (q < 0.55) {
        const k = Math.floor(r() * fibN), y = 1 - (2 * (k + 0.5)) / fibN, rad = Math.sqrt(1 - y * y), th = k * 2.39996323;
        set3(P.aP7, i, [Math.cos(th) * rad * GLOBE_R, y * GLOBE_R, Math.sin(th) * rad * GLOBE_R]);
      } else if (q < 0.6) {
        const d = randDir(r), s = 0.13 * Math.cbrt(r());
        const h = home.map((c) => c * 1.02);
        set3(P.aP7, i, [h[0] + d[0] * s, h[1] + d[1] * s, h[2] + d[2] * s]);
        flags |= 8;
      } else {
        const id = Math.floor(r() * arcs.length), t = r();
        const s = slerp(home, arcs[id], t);
        const lift = GLOBE_R * (1 + (0.07 + 0.15 * (s[3] || 0.5)) * Math.sin(Math.PI * t));
        set3(P.aP7, i, [s[0] * lift + (r() - 0.5) * 0.02, s[1] * lift + (r() - 0.5) * 0.02, s[2] * lift + (r() - 0.5) * 0.02]);
        P.aExtra[i * 4] = t; P.aExtra[i * 4 + 3] = id;
      }
    }

    P.aExtra[i * 4 + 1] = flags;
  }
  const goldCells = [];
  for (const c of gridGold) {
    const l = Math.floor(c / (G.cols * G.rows)), rem = c % (G.cols * G.rows);
    const row = Math.floor(rem / G.cols), col = rem % G.cols;
    if (l === G.layers - 1 && row > 2 && row < G.rows - 3 && col > 1 && col < G.cols - 2)
      goldCells.push([col * (G.w + G.gx) - gridW / 2 + G.w / 2, row * (G.h + G.gy) - gridH / 2 + G.h / 2, l * G.gz - gridD / 2]);
  }
  P.meta = {
    clusters,
    goldCells: goldCells.slice(0, 2),
    goldBars: [5 * BZ + 0, 3 * BZ + 1, 1 * BZ + 2, 4 * BZ + 3].map((k) => [bars[k].x, -1.8 + bars[k].h + 0.35, bars[k].z]),
    home: home.map((c) => c * 1.03),
  };
  return P;
}

// Sample the name from a canvas into N positions, sized to fit `width` world units.
export function buildName(N, width, fontFamily, seed = 11) {
  return buildText(['ABDELKRIM', 'GHEBOULI'], N, width, fontFamily, seed);
}

export function buildText(lines, N, width, fontFamily, seed = 11) {
  const r = mulberry32(seed);
  const cw = 1400, ch = lines.length > 1 ? 640 : 400;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 280px ${fontFamily}`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  const fs = Math.floor(280 * Math.min(1, (cw * 0.92) / widest));
  g.font = `800 ${fs}px ${fontFamily}`;
  lines.forEach((l, k) => g.fillText(l, cw / 2, lines.length > 1 ? ch * (0.28 + k * 0.46) : ch * 0.5));
  const data = g.getImageData(0, 0, cw, ch).data;
  const pts = [];
  let minX = cw, maxX = 0, minY = ch, maxY = 0;
  for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) {
    if (data[(y * cw + x) * 4 + 3] > 128) {
      pts.push(x, y);
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const out = new Float32Array(N * 3);
  const count = pts.length / 2;
  const scale = width / Math.max(1, maxX - minX);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(r() * count);
    const x = pts[k * 2] + (r() - 0.5) * 2, y = pts[k * 2 + 1] + (r() - 0.5) * 2;
    out[i * 3] = (x - cx) * scale;
    out[i * 3 + 1] = -(y - cy) * scale;
    out[i * 3 + 2] = (r() - 0.5) * 0.35 + (r() < 0.04 ? gauss(r) * 0.8 : 0);
  }
  return out;
}

// Turn a portrait photo into particle positions: denser where the face is bright or has edges,
// empty where the plain background is, with a little depth from brightness.
export async function buildPortrait(src, N, width, seed = 31) {
  const img = new Image(); img.src = src; await img.decode();
  const S = 220;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data;
  const px = (x, y) => { const i = (y * S + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const bg = [0, 0, 0];
  for (const [x, y] of [[3, 3], [S - 4, 3], [3, 40], [S - 4, 40]]) px(x, y).forEach((v, k) => (bg[k] += v / 4));
  const lum = new Float32Array(S * S), w = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const [r, gg, b] = px(x, y);
    lum[y * S + x] = (0.3 * r + 0.59 * gg + 0.11 * b) / 255;
  }
  let total = 0;
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const [r, gg, b] = px(x, y);
    const dist = Math.hypot(r - bg[0], gg - bg[1], b - bg[2]);
    const fg = Math.min(1, Math.max(0, (dist - 14) / 30));
    const gx = lum[y * S + x + 1] - lum[y * S + x - 1], gy = lum[(y + 1) * S + x] - lum[(y - 1) * S + x];
    const edge = Math.min(1, Math.hypot(gx, gy) * 4);
    const v = fg * (0.25 + 0.75 * Math.pow(lum[y * S + x], 0.9) + 1.3 * edge);
    w[y * S + x] = v; total += v;
  }
  const cdf = new Float32Array(S * S);
  let acc = 0;
  for (let i = 0; i < S * S; i++) { acc += w[i]; cdf[i] = acc / total; }
  const r = mulberry32(seed), out = new Float32Array(N * 3), k = width / S;
  for (let i = 0; i < N; i++) {
    const u = r();
    let lo = 0, hi = S * S - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m + 1; else hi = m; }
    const x = (lo % S) + r() - 0.5, y = Math.floor(lo / S) + r() - 0.5;
    out[i * 3] = (x - S / 2) * k;
    out[i * 3 + 1] = -(y - S / 2) * k;
    out[i * 3 + 2] = (lum[lo] - 0.4) * width * 0.08 + (r() - 0.5) * 0.04;
  }
  return out;
}
