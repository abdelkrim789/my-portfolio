import * as THREE from 'three';
import { STAGES, TASKS, METRICS, PROJECTS_D, LAYERS, MILESTONES, HOME, CITIES, latLon } from '../content.js';
import { glyphCanvas, loadPhoto } from './glyphs.js';

// Blueprint · The Tower. Eight floors stacked downwards; you spiral down around the tower and each
// floor is plotted line by line as you arrive. Everything is linework: no surfaces, no particles.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const FL = 26, TH0 = 0.55;
const floorY = (s) => -FL * s;
const theta = (s) => TH0 + s * (Math.PI / 2);
const C = { line: 0xeaf3fb, ice: 0xa6e4ff, amber: 0xffd27a, red: 0xff8a75, dim: 0x8fb3d4 };
const UP = new THREE.Vector3(0, 1, 0);
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const LINE_VERT = `
attribute float aOrder; attribute float lineDistance;
uniform float uFar;
varying float vOrder; varying float vDist; varying float vFade;
void main(){ vOrder = aOrder; vDist = lineDistance; vec4 mv = modelViewMatrix*vec4(position,1.0);
  vFade = 1.0 - smoothstep(uFar*0.45, uFar, -mv.z); gl_Position = projectionMatrix*mv; }`;
const LINE_FRAG = `
uniform vec3 uColor; uniform float uDraw, uOpacity, uDash, uGap, uFlow, uTime;
varying float vOrder; varying float vDist; varying float vFade;
void main(){
  if (vOrder > uDraw) discard;
  if (uDash > 0.0) { float ph = mod(vDist - uTime*uFlow, uDash + uGap); if (ph > uDash) discard; }
  float tip = (1.0 - smoothstep(0.0, 0.03, uDraw - vOrder)) * step(uDraw, 0.999);
  gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.92, 0.7), tip), min(1.0, uOpacity*vFade + tip));
}`;
const PLOT_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const PLOT_FRAG = `
uniform sampler2D uMap; uniform float uReveal, uOpacity; varying vec2 vUv;
void main(){
  if (vUv.x > uReveal) discard;
  vec4 t = texture2D(uMap, vUv);
  float laser = smoothstep(0.01, 0.0, abs(vUv.x - uReveal)) * step(uReveal, 0.999);
  gl_FragColor = vec4(mix(t.rgb, vec3(1.0, 0.86, 0.55), laser), min(1.0, t.a*uOpacity + laser*0.9));
}`;

// ---------- geometry helpers: flat arrays of segment endpoints ----------
function circle(r, n = 96, y = 0, cx = 0, cz = 0, a0 = 0, a1 = Math.PI * 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    out.push(cx + Math.cos(t0) * r, y, cz + Math.sin(t0) * r, cx + Math.cos(t1) * r, y, cz + Math.sin(t1) * r);
  }
  return out;
}
function ring3(center, u, v, r, n = 64, a0 = 0, a1 = Math.PI * 2) {
  const out = [], p = (t) => [center[0] + (u[0] * Math.cos(t) + v[0] * Math.sin(t)) * r, center[1] + (u[1] * Math.cos(t) + v[1] * Math.sin(t)) * r, center[2] + (u[2] * Math.cos(t) + v[2] * Math.sin(t)) * r];
  for (let i = 0; i < n; i++) out.push(...p(a0 + ((a1 - a0) * i) / n), ...p(a0 + ((a1 - a0) * (i + 1)) / n));
  return out;
}
function poly(pts, closed = false) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(...pts[i], ...pts[i + 1]);
  if (closed) out.push(...pts[pts.length - 1], ...pts[0]);
  return out;
}
function boxEdges(w, h, d, x = 0, y = 0, z = 0) {
  const X = [x - w / 2, x + w / 2], Y = [y, y + h], Z = [z - d / 2, z + d / 2], out = [];
  for (const yy of Y) out.push(...poly([[X[0], yy, Z[0]], [X[1], yy, Z[0]], [X[1], yy, Z[1]], [X[0], yy, Z[1]]], true));
  for (const xx of X) for (const zz of Z) out.push(xx, Y[0], zz, xx, Y[1], zz);
  return out;
}
function rect(w, d, y = 0, x = 0, z = 0) { return poly([[x - w / 2, y, z - d / 2], [x + w / 2, y, z - d / 2], [x + w / 2, y, z + d / 2], [x - w / 2, y, z + d / 2]], true); }

export async function createSchematic(env) {
  const { renderer, small, coarse, reduced, fontFam, meURL } = env;
  const R = rng(7);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.5, 400);
  const timeU = { value: 0 };

  function lineGeo(arr) {
    const n = arr.length / 3, pos = new Float32Array(arr), order = new Float32Array(n), dist = new Float32Array(n);
    let total = 0; const seg = [];
    for (let i = 0; i < n; i += 2) { const l = Math.hypot(arr[i * 3 + 3] - arr[i * 3], arr[i * 3 + 4] - arr[i * 3 + 1], arr[i * 3 + 5] - arr[i * 3 + 2]); seg.push(l); total += l; }
    let acc = 0;
    for (let i = 0; i < n; i += 2) { const l = seg[i / 2]; order[i] = acc / total; dist[i] = acc; acc += l; order[i + 1] = acc / total; dist[i + 1] = acc; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));
    g.setAttribute('lineDistance', new THREE.BufferAttribute(dist, 1));
    return g;
  }
  function lineMat(drawU, color, o = {}) {
    return new THREE.ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(color) }, uDraw: drawU, uOpacity: { value: o.opacity ?? 1 }, uDash: { value: o.dash || 0 }, uGap: { value: o.gap || 0 }, uFlow: { value: o.flow || 0 }, uTime: timeU, uFar: { value: 110 } },
    });
  }
  function lines(parent, arr, drawU, color, o) { const l = new THREE.LineSegments(lineGeo(arr), lineMat(drawU, color, o)); l.frustumCulled = false; parent.add(l); return l; }
  function plotPlane(parent, tex, w, h, revealU) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ vertexShader: PLOT_VERT, fragmentShader: PLOT_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uMap: { value: tex }, uReveal: revealU, uOpacity: { value: 1 } } }));
    parent.add(m); return m;
  }
  function canvasTex(draw, W = 1024, H = 256) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); draw(g, W, H);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const titleBlock = (k) => canvasTex((g, W, H) => {
    g.strokeStyle = '#eaf3fb'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12);
    g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.62, 6); g.lineTo(W * 0.62, H - 6); g.moveTo(6, H * 0.5); g.lineTo(W - 6, H * 0.5); g.stroke();
    g.fillStyle = '#eaf3fb'; g.textBaseline = 'middle';
    g.font = `800 92px ${fontFam}`; g.fillText(STAGES[k], 30, H * 0.27);
    g.font = '500 30px "IBM Plex Mono", monospace'; g.fillText('A. GHEBOULI · SAP BPC / BI', 30, H * 0.75);
    g.fillStyle = '#ffd27a'; g.fillText(`SHEET ${String(k).padStart(2, '0')} / 07`, W * 0.65, H * 0.27);
    g.fillStyle = '#a6e4ff'; g.fillText(`LEVEL ${-k * FL} M`, W * 0.65, H * 0.75);
  });

  // ---------- floors ----------
  const floors = [], anchors = {};
  const anchor = (d, obj, local) => (anchors[d] = { obj, local: new THREE.Vector3(...local) });
  for (let k = 0; k < 8; k++) {
    const root = new THREE.Group(); root.position.y = floorY(k); scene.add(root);
    const g = new THREE.Group(); g.rotation.y = theta(k); root.add(g);
    const draw = { value: 0 };
    const f = { k, root, g, draw, upd: [] };
    floors.push(f);
    lines(root, circle(15, 160), draw, C.line, { opacity: 0.55 });
    lines(root, circle(14.2, 120), draw, C.dim, { opacity: 0.5, dash: 0.6, gap: 0.45 });
    const ticks = [];
    for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, l = i % 6 === 0 ? 1.5 : 0.6; ticks.push(Math.cos(a) * 15, 0, Math.sin(a) * 15, Math.cos(a) * (15 + l), 0, Math.sin(a) * (15 + l)); }
    lines(root, ticks, draw, C.line, { opacity: 0.6 });
    lines(g, [-16, 0, 0, 16, 0, 0, 0, 0, -16, 0, 0, 16], draw, C.dim, { opacity: 0.35, dash: 2.2, gap: 0.6 });
    const tb = plotPlane(g, titleBlock(k), 7.2, 1.8, draw);
    tb.rotation.x = -Math.PI / 2; tb.position.set(6.6, 0.04, 11.4);
    if (k < 7) {
      const cols = [];
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; cols.push(Math.cos(a) * 15.6, 0, Math.sin(a) * 15.6, Math.cos(a) * 15.6, -FL, Math.sin(a) * 15.6); }
      lines(root, cols, { value: 1 }, C.dim, { opacity: 0.22 });
      lines(root, cols, { value: 1 }, C.ice, { opacity: 0.9, dash: 0.7, gap: 7, flow: 4 });
    }
  }
  const F = (k) => floors[k];

  // 0 · Signal: the name, plotted
  {
    const f = F(0);
    const tex = canvasTex((g, W, H) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 250px ${fontFam}`;
      const tc = document.createElement('canvas'); tc.width = W; tc.height = H; const t = tc.getContext('2d');
      t.font = g.font; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillStyle = '#fff';
      t.fillText('ABDELKRIM', W / 2, H * 0.27); t.fillText('GHEBOULI', W / 2, H * 0.74);
      t.globalCompositeOperation = 'source-in'; t.strokeStyle = 'rgba(166,228,255,0.9)'; t.lineWidth = 3;
      for (let i = -H; i < W; i += 16) { t.beginPath(); t.moveTo(i, H); t.lineTo(i + H, 0); t.stroke(); }
      g.drawImage(tc, 0, 0);
      g.lineWidth = 6; g.strokeStyle = '#eaf3fb'; g.lineJoin = 'round';
      g.strokeText('ABDELKRIM', W / 2, H * 0.27); g.strokeText('GHEBOULI', W / 2, H * 0.74);
    }, 2048, 680);
    const p = plotPlane(f.g, tex, 24, 8, f.draw); p.position.set(0, 5.6, -1);
    lines(f.g, [-12, 1.1, -1, 12, 1.1, -1, -12, 0.7, -1, -12, 1.5, -1, 12, 0.7, -1, 12, 1.5, -1], f.draw, C.amber, { opacity: 0.9 });
    lines(f.g, [...circle(1.6, 40, 0.02, 11.5, 7), 11.5, 0.02, 4.8, 11.5, 0.02, 9.2, 10.4, 0.02, 7, 12.6, 0.02, 7], f.draw, C.amber);
  }

  // 1 · Raw: two lines that should agree and don't; wire boxes scattered on the floor
  const rawBoxes = [];
  {
    const f = F(1);
    const ax = [-10, 0.02, -4, 10, 0.02, -4, -10, 0.02, -4, -10, 9, -4];
    for (let i = 0; i <= 10; i++) ax.push(-10 + i * 2, 0, -4, -10 + i * 2, -0.5, -4);
    lines(f.g, ax, f.draw, C.line, { opacity: 0.8 });
    const mv = [], st = [], drops = [], xs = [];
    for (let i = 0; i <= 40; i++) {
      const x = -10 + i * 0.5, base = 3 + Math.sin(i * 0.25) * 1.6 + i * 0.05;
      const dev = i > 14 ? Math.pow((i - 14) / 26, 1.4) * 4.5 * Math.sin(i * 1.7) : 0;
      mv.push([x, base, -4]); st.push([x, base + dev + (i > 14 ? 1.2 * ((i - 14) / 26) : 0), -4]);
      if (i > 16 && i % 5 === 0) { drops.push(x, base, -4, x, st[i][1], -4); xs.push(st[i]); }
    }
    lines(f.g, poly(mv), f.draw, C.ice, { opacity: 0.95 });
    lines(f.g, poly(st), f.draw, C.red, { opacity: 0.95 });
    lines(f.g, drops, f.draw, C.red, { opacity: 0.7, dash: 0.25, gap: 0.2 });
    const xx = []; xs.forEach(([x, y, z]) => xx.push(x - 0.4, y - 0.4, z, x + 0.4, y + 0.4, z, x - 0.4, y + 0.4, z, x + 0.4, y - 0.4, z));
    lines(f.g, xx, f.draw, C.red);
    const big = xs[xs.length - 2];
    for (let i = 0; i < 16; i++) {
      const s = 1 + R() * 0.8, bad = i % 3 === 0;
      const obj = lines(f.g, boxEdges(s, s, s, 0, -s / 2, 0), f.draw, bad ? C.red : C.line, { opacity: 0.85 });
      const a = R() * 6.28, r = 2 + R() * 8;
      const chaosP = new THREE.Vector3(Math.cos(a) * r, s / 2 + (R() < 0.3 ? 1 : 0), Math.sin(a) * r * 0.55 + 4);
      const chaosQ = new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 1.2, R() * 6.28, (R() - 0.5) * 1.2));
      const orderP = new THREE.Vector3(-7 + (i % 8) * 2, s / 2, 3 + Math.floor(i / 8) * 2.4);
      obj.position.copy(chaosP); obj.quaternion.copy(chaosQ);
      rawBoxes.push({ obj, chaosP, chaosQ, orderP, orderQ: new THREE.Quaternion(), r: 0, bad, col: obj.material.uniforms.uColor.value });
    }
    const line = [...rect(7, 1.6, 0.02, -7, 9.5)];
    for (let i = 0; i < 6; i++) line.push(...circle(0.5, 16, 0.02, -9.8 + i * 1.12, 9.5));
    line.push(-10.5, 0.03, 8.4, -3.5, 0.03, 10.6, -10.5, 0.03, 10.6, -3.5, 0.03, 8.4);
    lines(f.g, line, f.draw, C.red);
    anchor('d-raw', f.g, [-8, 9.4, -4]);
    anchor('d-raw-mismatch', f.g, [big[0], big[1] + 0.8, big[2]]);
    anchor('d-raw-blocked', f.g, [-7, 1.2, 9.5]);
  }

  // 2 · Clean: the lines rejoin; a ledger table with two restored rows
  let lens;
  {
    const f = F(2);
    const mv = [], st = [];
    for (let i = 0; i <= 40; i++) {
      const x = -10 + i * 0.5, base = 3 + Math.sin(i * 0.25) * 1.6 + i * 0.05;
      const dev = i < 26 ? Math.pow(1 - i / 26, 1.5) * 3 * Math.sin(i * 1.7) : 0;
      mv.push([x, base, -4]); st.push([x, base + dev + 0.06, -4]);
    }
    lines(f.g, [-10, 0.02, -4, 10, 0.02, -4, -10, 0.02, -4, -10, 9, -4], f.draw, C.line, { opacity: 0.8 });
    lines(f.g, poly(mv), f.draw, C.ice);
    lines(f.g, poly(st), f.draw, C.amber, { opacity: 0.9 });
    const tbl = [];
    for (let r = 0; r <= 8; r++) tbl.push(-10, 0.02, 1 + r, 2, 0.02, 1 + r);
    for (let c = 0; c <= 5; c++) tbl.push(-10 + c * 2.4, 0.02, 1, -10 + c * 2.4, 0.02, 9);
    lines(f.g, tbl, f.draw, C.line, { opacity: 0.6 });
    lines(f.g, [...rect(11.6, 0.7, 0.04, -4, 3.5), ...rect(11.6, 0.7, 0.04, -4, 6.5)], f.draw, C.amber);
    lens = new THREE.Group(); f.g.add(lens);
    lines(lens, [...ring3([0, 0, 0], [1, 0, 0], [0, 1, 0], 1.3, 40), 0.92, -0.92, 0, 2.2, -2.2, 0], f.draw, C.amber);
    lens.position.set(-4, 3.2, 5);
    anchor('d-clean-method', lens, [0, 1.8, 0]);
    anchor('d-clean-tool', f.g, [2.6, 0.5, 6.5]);
    const chk = [];
    for (const z of [3.5, 6.5]) chk.push(3.2, 0.05, z, 3.6, 0.05, z + 0.4, 3.6, 0.05, z + 0.4, 4.4, 0.05, z - 0.5);
    lines(f.g, chk, f.draw, C.amber);
  }

  // 3 · Model: the eight-pointed star, constructed with compass and square
  {
    const f = F(3), Rr = 9;
    lines(f.g, circle(Rr, 128, 0.02), f.draw, C.dim, { opacity: 0.6, dash: 0.8, gap: 0.5 });
    const sq = (rot) => poly([0, 1, 2, 3].map((i) => { const a = rot + Math.PI / 4 + (i * Math.PI) / 2; return [Math.cos(a) * Rr, 0.03, -Math.sin(a) * Rr]; }), true);
    lines(f.g, [...sq(Math.PI / 4), ...sq(0)], f.draw, C.ice, { opacity: 0.55 });
    const star = [];
    for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8 + Math.PI / 2; const r = i % 2 ? Rr * 0.6 : Rr; star.push([Math.cos(a) * r, 0.05, -Math.sin(a) * r]); }
    lines(f.g, poly(star, true), f.draw, C.line);
    lines(f.g, [...circle(3, 64, 0.04), ...circle(1.2, 32, 0.04)], f.draw, C.amber);
    const arcs = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 4, x = Math.cos(a) * Rr, z = -Math.sin(a) * Rr;
      arcs.push(...circle(1.3, 16, 0.04, x, z, -a - 0.6 + Math.PI, -a + 0.6 + Math.PI));
      const pin = [x, 0, z, x, 3.2, z, ...circle(0.35, 16, 3.2, x, z)];
      lines(f.g, pin, f.draw, C.amber);
      anchor(`d-sys-${i}`, f.g, [x, 3.7, z]);
    }
    lines(f.g, arcs, f.draw, C.dim, { opacity: 0.7, dash: 0.2, gap: 0.15 });
    lines(f.g, [0, 0.06, 0, Rr * Math.cos(-0.39), 0.06, Rr * Math.sin(-0.39)], f.draw, C.amber, { dash: 0.5, gap: 0.3 });
  }

  // 4 · Consolidate: a process diagram, six sources piped into one vessel
  {
    const f = F(4);
    const v = [...circle(2.6, 40, 0), ...circle(2.6, 40, 5.5)];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; v.push(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6, Math.cos(a) * 2.6, 5.5, Math.sin(a) * 2.6); }
    v.push(...ring3([0, 5.5, 0], [1, 0, 0], [0, 1, 0], 2.6, 24, 0, Math.PI), ...ring3([0, 5.5, 0], [0, 0, 1], [0, 1, 0], 2.6, 24, 0, Math.PI));
    lines(f.g, v, f.draw, C.line);
    anchor('d-shone', f.g, [0, 8.6, 0]);
    TASKS.forEach(([, d], e) => {
      const a = (e / 6) * Math.PI * 2 + 0.4, x = Math.cos(a) * 10, z = Math.sin(a) * 8;
      lines(f.g, boxEdges(1.8, 1.8, 1.8, x, 0, z), f.draw, C.ice);
      const ix = Math.cos(a) * 2.7, iz = Math.sin(a) * 2.7 * 0.8 / 0.8;
      const pipe = poly([[x, 0.9, z], [x, 3.2, z], [ix * 1.4, 3.2, iz * 1.4], [ix, 3.2, iz]]);
      lines(f.g, pipe, f.draw, C.dim, { opacity: 0.5 });
      lines(f.g, pipe, f.draw, C.amber, { dash: 0.45, gap: 0.8, flow: 2.6 });
      const mx = (x + ix * 1.4) / 2, mz = (z + iz * 1.4) / 2, nx = -Math.sin(a) * 0.5, nz = Math.cos(a) * 0.5;
      lines(f.g, [mx - nx, 2.7, mz - nz, mx + nx, 3.7, mz + nz, mx + nx, 3.7, mz + nz, mx + nx, 2.7, mz + nz, mx + nx, 2.7, mz + nz, mx - nx, 3.7, mz - nz, mx - nx, 3.7, mz - nz, mx - nx, 2.7, mz - nz], f.draw, C.line);
      anchor(d, f.g, [x, 2.5, z]);
    });
  }

  // 5 · Report: a wireframe bar chart on drafted axes
  {
    const f = F(5), ox = -9, oz = -5.5;
    const ax = [ox, 0, oz, 9.5, 0, oz, ox, 0, oz, ox, 0, 6, ox, 0, oz, ox, 10.5, oz];
    for (let i = 1; i <= 10; i++) ax.push(ox, i, oz, ox - 0.4, i, oz);
    lines(f.g, ax, f.draw, C.line);
    const grid = []; for (let i = 2; i <= 10; i += 2) grid.push(ox, i, oz, 9.5, i, oz);
    lines(f.g, grid, f.draw, C.dim, { opacity: 0.4, dash: 0.4, gap: 0.3 });
    const gold = { '5,0': 0, '3,1': 1, '1,2': 2, '4,3': 3 };
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const h = 1.2 + 7.6 * ((i + (3 - j) * 0.6) / (5 + 1.8)) + (R() - 0.5) * 1.2, gi = gold[`${i},${j}`];
      const x = (i - 2.5) * 2.9, z = (j - 1.5) * 2.9;
      lines(f.g, boxEdges(1.8, Math.max(0.8, h), 1.8, x, 0, z), f.draw, gi !== undefined ? C.amber : C.ice, { opacity: gi !== undefined ? 1 : 0.7 });
      if (gi !== undefined) anchor(METRICS[gi][1], f.g, [x, Math.max(0.8, h) + 0.6, z]);
    }
    const tex = canvasTex((g, W, H) => { g.fillStyle = '#eaf3fb'; g.font = `800 120px ${fontFam}`; g.textBaseline = 'middle'; g.fillText('GÉANT ELECTRONICS', 20, H * 0.42); g.fillStyle = '#ffd27a'; g.font = '500 40px "IBM Plex Mono", monospace'; g.fillText('DATA ANALYST & ERP SUPPORT · 2025', 24, H * 0.85); });
    const p = plotPlane(f.g, tex, 8, 2, f.draw); p.rotation.x = -Math.PI / 2; p.position.set(-4, 0.05, 8.8);
    anchor('d-geant', f.g, [-4, 0.8, 8.8]);
  }

  // 6 · Build: an exploded axonometric of three layers, modules and the team
  let team;
  {
    const f = F(6);
    LAYERS.slice().reverse().forEach(([, d], l) => {
      const y = l * 3.8, col = [C.dim, C.ice, C.line][l];
      const plate = [...rect(12, 8, y)];
      for (let i = -4; i <= 4; i += 2) plate.push(i, y, -4, i, y, 4);
      for (let i = -2; i <= 2; i += 2) plate.push(-6, y, i, 6, y, i);
      lines(f.g, plate, f.draw, col, { opacity: l === 2 ? 1 : 0.8 });
      anchor(d, f.g, [-6, y + 0.5, 4]);
    });
    const conn = [];
    for (let i = 0; i < 10; i++) { const x = -5 + R() * 10, z = -3 + R() * 6; conn.push(x, 0, z, x, 7.6, z); }
    lines(f.g, conn, f.draw, C.amber, { dash: 0.35, gap: 0.6, flow: 2.2, opacity: 0.9 });
    PROJECTS_D.forEach(([, d], i) => {
      const x = -4 + i * 4;
      lines(f.g, boxEdges(2.6, 1.4, 1.8, x, 7.6, 0), f.draw, C.amber);
      anchor(d, f.g, [x, 9.5, 0]);
    });
    team = new THREE.Group(); team.position.y = 12; f.g.add(team);
    const tl = [...circle(1.3, 32, 0)];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; tl.push(...circle(0.4, 16, 0, Math.cos(a) * 3, Math.sin(a) * 3), Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3, Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6); }
    lines(team, tl, f.draw, C.line);
    lines(f.g, [0, 7.6, 0, 0, 12, 0], f.draw, C.dim, { dash: 0.3, gap: 0.3, flow: 1.5 });
    anchor('d-team', team, [0, 1.2, 0]);
  }

  // 7 · Decide: a wire globe with routes out of home, and a plotted board
  let globe, board, boardTexU;
  {
    const f = F(7), Rg = 7;
    globe = new THREE.Group(); globe.position.set(-1, 7, -3); f.g.add(globe);
    const gl = [];
    for (let la = -60; la <= 60; la += 30) { const r = Rg * Math.cos((la * Math.PI) / 180), y = Rg * Math.sin((la * Math.PI) / 180); gl.push(...circle(r, 64, y)); }
    for (let lo = 0; lo < 180; lo += 30) { const a = (lo * Math.PI) / 180; gl.push(...ring3([0, 0, 0], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0], Rg, 64)); }
    lines(globe, gl, f.draw, C.dim, { opacity: 0.7 });
    const hp = latLon(...HOME, Rg);
    lines(globe, [hp[0] - 0.6, hp[1], hp[2], hp[0] + 0.6, hp[1], hp[2], hp[0], hp[1] - 0.6, hp[2], hp[0], hp[1] + 0.6, hp[2], ...ring3(hp, [1, 0, 0], [0, 1, 0], 0.45, 20)], f.draw, C.amber);
    anchor('d-home', globe, [hp[0], hp[1] + 0.6, hp[2]]);
    const routes = [];
    const ha = new THREE.Vector3(...hp).normalize();
    CITIES.forEach((c) => {
      const b = new THREE.Vector3(...latLon(...c, 1)).normalize(), om = ha.angleTo(b), s = Math.sin(om);
      const pts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24; const p = ha.clone().multiplyScalar(Math.sin((1 - u) * om) / s).addScaledVector(b, Math.sin(u * om) / s).multiplyScalar(Rg * (1 + 0.2 * Math.sin(u * Math.PI))); pts.push([p.x, p.y, p.z]); }
      routes.push(...poly(pts));
    });
    lines(globe, routes, f.draw, C.amber, { dash: 0.5, gap: 0.5, flow: 2 });
    boardTexU = { value: null };
    board = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.75), new THREE.ShaderMaterial({ vertexShader: PLOT_VERT, fragmentShader: PLOT_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uMap: boardTexU, uReveal: { value: 0 }, uOpacity: { value: 1 } } }));
    board.position.set(10.5, 4.6, 4); board.rotation.y = -0.4; f.g.add(board);
    lines(f.g, boxEdges(9.4, 7.15, 0.01, 0, 0, 0).map((v, i) => v), f.draw, C.line);
    f.g.children[f.g.children.length - 1].position.set(10.5, 1.02, 4); f.g.children[f.g.children.length - 1].rotation.y = -0.4;
  }

  // milestone markers on the outer ring between floors
  const mile = MILESTONES.map(([st]) => {
    const a = theta(st), p = new THREE.Vector3(Math.sin(a) * 16, floorY(st) + 2, Math.cos(a) * 16);
    lines(scene, [...ring3([p.x, p.y, p.z], [Math.cos(a), 0, -Math.sin(a)], [0, 1, 0], 0.45, 20), p.x, p.y - 0.45, p.z, p.x, p.y - 4, p.z], { value: 1 }, C.amber, { opacity: 0.9 });
    return p;
  });

  // radar pings
  const pingDraw = { value: 1 };
  const pings = Array.from({ length: 4 }, () => { const l = lines(scene, circle(1, 96), pingDraw, C.amber); l.visible = false; return { l, t0: -99 }; });
  let pingI = 0;

  const photo = await loadPhoto(meURL);
  const texCache = new Map();
  const boardTex = (key) => { const k = key || ''; if (!texCache.has(k)) { const t = new THREE.CanvasTexture(glyphCanvas(key, 'engrave', photo, fontFam)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(k, t); } return texCache.get(k); };
  boardTexU.value = boardTex(null);
  let shownKey = null, replot = 1;

  let rt = null, mobile = innerWidth / innerHeight < 0.9;
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(UP, 0), hit = new THREE.Vector3(), tmp = new THREE.Vector3(), right = new THREE.Vector3();
  let cursorText = '';
  const cIce = new THREE.Color(C.ice);

  return {
    id: 'blueprint', camera, fovKick: 6,
    post: { conv: 1, grain: 0.03, vig: 0.45, ab: 0.0016, grid: 1, light: 0 },
    pose(stage, P, L) {
      const fr = stage - Math.floor(stage), lift = Math.sin(Math.PI * fr);
      const a = theta(stage), Rc = (mobile ? 52 : 37) + lift * 6;
      const y = floorY(stage);
      L.set(0, y + 3, 0);
      P.set(Math.sin(a) * Rc, y + 15 + lift * 3, Math.cos(a) * Rc);
      tmp.subVectors(L, P).normalize(); right.crossVectors(tmp, UP).normalize();
      if (!mobile) { const s = Rc * 0.13; L.addScaledVector(right, -s); P.addScaledVector(right, -s); } else { L.y -= 5; }
      return mobile ? 46 : 34;
    },
    focusDist() { return mobile ? 26 : 19; },
    anchor(d, t, out) { const a = anchors[d]; if (!a) return null; out.copy(a.local); return a.obj.localToWorld(out); },
    milestone(i, out) { return out.copy(mile[i]); },
    shock(x, y, t, stage) {
      plane.constant = -floorY(Math.round(stage));
      ray.setFromCamera({ x, y }, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      for (let i = 0; i < 2; i++) { const p = pings[pingI++ % pings.length]; p.t0 = t + i * 0.22; p.l.position.copy(hit); p.l.position.y += 0.05; }
      if (Math.abs(stage - 1) < 0.5) { const f = floors[1]; tmp.copy(hit); f.g.worldToLocal(tmp); rawBoxes.forEach((b) => { if (Math.hypot(b.chaosP.x - tmp.x, b.chaosP.z - tmp.z) < 5) b.r = 1; }); }
    },
    cursor() { return cursorText; },
    resize(w, h, pr) {
      mobile = w / h < 0.9;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (rt) rt.dispose();
      rt = new THREE.WebGLRenderTarget(Math.round(w * pr), Math.round(h * pr), { samples: small || coarse ? 2 : 4, type: THREE.HalfFloatType });
    },
    quality() {},
    update(c) {
      const { dt, time, stage, mouse, mouseActive, glyphKey } = c;
      timeU.value = time;
      floors.forEach((f) => {
        const d = Math.abs(stage - f.k);
        f.root.visible = d < 1.7;
        f.draw.value = reduced ? (d < 1.3 ? 1 : 0) : ease((1.45 - d) / 0.95);
      });
      // cursor reads coordinates on the floor; on the raw floor it repairs boxes
      cursorText = '';
      if (mouseActive) {
        const k = Math.round(stage); plane.constant = -floorY(k);
        ray.setFromCamera(mouse, camera);
        if (ray.ray.intersectPlane(plane, hit) && Math.hypot(hit.x, hit.z) < 16) {
          cursorText = `X ${hit.x.toFixed(2)} · Z ${hit.z.toFixed(2)}`;
          if (k === 1) { tmp.copy(hit); floors[1].g.worldToLocal(tmp); rawBoxes.forEach((b) => { if (Math.hypot(b.chaosP.x - tmp.x, b.chaosP.z - tmp.z) < 4) b.r = Math.min(1, b.r + dt * 2.6); }); }
        }
      }
      if (Math.abs(stage - 1) < 1.2) rawBoxes.forEach((b) => {
        b.r = Math.max(0, b.r - dt * 0.1);
        const e = ease(b.r);
        b.obj.position.lerpVectors(b.chaosP, b.orderP, e);
        b.obj.quaternion.slerpQuaternions(b.chaosQ, b.orderQ, e);
        if (b.bad) b.col.set(C.red).lerp(cIce, e);
      });
      if (lens) { lens.position.x = -4 + Math.sin(time * 0.7) * 3.5; }
      if (team) team.rotation.y = time * 0.4;
      if (globe && floors[7].root.visible) globe.rotation.y = -0.6 + Math.sin(time * 0.1) * 0.6;
      const want = stage > 6.6 ? glyphKey || null : null;
      if (want !== shownKey) { shownKey = want; boardTexU.value = boardTex(want); replot = 0; }
      replot = Math.min(1, replot + dt * 1.6);
      board.material.uniforms.uReveal.value = Math.min(floors[7].draw.value, reduced ? 1 : replot);
      pings.forEach((p) => { const k = (time - p.t0) / 1.4; p.l.visible = k >= 0 && k < 1; if (p.l.visible) { p.l.scale.setScalar(0.3 + k * 14); p.l.material.uniforms.uOpacity.value = 1 - k; } });
      scene.updateMatrixWorld();
    },
    render() {
      renderer.setRenderTarget(rt); renderer.setClearColor(0x0b3157, 1); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      return rt.texture;
    },
    labelMute() { return 0; },
  };
}
