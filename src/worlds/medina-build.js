import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Building blocks for the Medina: textures painted on canvas, and parts made from primitives.
// Units are metres. Walls are limewash tinted by vertex colour, darkened where they meet the ground.

let seed = 11;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const pick = (a) => a[Math.floor(rnd() * a.length)];
export const PAL = {
  lime: ['#f6f1e7', '#f3ecdf', '#efe6d4', '#f5efe4', '#e9dfcb', '#f1e2cf', '#e7ecef', '#dfe7ee', '#f2dfcf', '#ead6bd'],
  doors: ['#1f4fa3', '#1b6b8a', '#2c7a5b', '#1d3f7a', '#6b3a22', '#7a4a2a', '#2f5d8a', '#9a3b2b'],
  cobalt: '#1f4fa3', saffron: '#e0a422', emerald: '#1f7a5a', ink: '#1b1a2e',
};
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
export function tex(c, { srgb = true, repeat = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

// ---------- textures ----------
export function limewashTex() {
  const [c, g] = cvs(512, 512);
  g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16000; i++) { const v = 180 + rnd() * 75 | 0; g.fillStyle = `rgba(${v},${v},${v},${0.05 + rnd() * 0.09})`; const s = 1 + rnd() * 4; g.fillRect(rnd() * 512, rnd() * 512, s, s); }
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(255,255,255,${0.08 + rnd() * 0.12})`; g.lineWidth = 6 + rnd() * 18; g.beginPath(); const x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); g.bezierCurveTo(x + 40, y + rnd() * 30, x + 90, y - rnd() * 30, x + 140, y + rnd() * 20); g.stroke(); }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(150,140,120,${0.04 + rnd() * 0.06})`; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  return tex(c, { repeat: true });
}
export function stoneTex() {
  const [c, g] = cvs(1024, 1024);
  g.fillStyle = '#6d6458'; g.fillRect(0, 0, 1024, 1024);
  // irregular flagstones: jittered grid cells drawn as rounded polygons
  const N = 9, s = 1024 / N;
  const pts = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) pts.push([i * s + (i % N ? (rnd() - 0.5) * s * 0.5 : 0), j * s + (j % N ? (rnd() - 0.5) * s * 0.5 : 0)]);
  const P = (i, j) => pts[j * (N + 1) + i];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const base = 150 + rnd() * 50 | 0, r = base + 12, gg = base + 4, b = base - 14;
    g.fillStyle = `rgb(${r},${gg},${b})`;
    const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4;
    g.beginPath(); q.forEach(([x, y], k) => { const xx = cx + (x - cx) * 0.93, yy = cy + (y - cy) * 0.93; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }); g.closePath(); g.fill();
    for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '40,30,20'},${rnd() * 0.08})`; g.fillRect(cx + (rnd() - 0.5) * s * 0.8, cy + (rnd() - 0.5) * s * 0.8, 2 + rnd() * 5, 2 + rnd() * 5); }
  }
  return tex(c, { repeat: true });
}
export function cityStoneTex() {
  const [c, g] = cvs(512, 512);
  g.fillStyle = '#9c7f58'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 512; x += 64) {
    const v = rnd() * 30 - 15; g.fillStyle = `rgb(${176 + v | 0},${148 + v | 0},${108 + v | 0})`; g.fillRect(x + 2, y + 2, 60, 28);
    for (let k = 0; k < 20; k++) { g.fillStyle = `rgba(70,50,30,${rnd() * 0.15})`; g.fillRect(x + rnd() * 60, y + rnd() * 28, 2, 2); }
  }
  return tex(c, { repeat: true });
}
// zellige: eight-pointed stars and crosses, glazed, with white grout
export function zelligeTex(palette = ['#1f4fa3', '#f2efe6', '#1f7a5a', '#e0a422', '#1b1a2e']) {
  const S = 512, [c, g] = cvs(S, S), n = 4, cell = S / n;
  g.fillStyle = palette[1]; g.fillRect(0, 0, S, S);
  const star = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + Math.PI / 16, rr = i % 2 ? r * 0.7 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); };
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const cx = i * cell, cy = j * cell;
    g.fillStyle = palette[0]; star(cx, cy, cell * 0.48); g.fill();
    g.fillStyle = palette[(i + j) % 2 ? 2 : 4]; star(cx, cy, cell * 0.2); g.fill();
    const mx = cx + cell / 2, my = cy + cell / 2;
    g.fillStyle = palette[3]; g.save(); g.translate(mx, my); g.rotate(Math.PI / 4); g.fillRect(-cell * 0.11, -cell * 0.11, cell * 0.22, cell * 0.22); g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { star(i * cell, j * cell, cell * 0.48); g.stroke(); star(i * cell, j * cell, cell * 0.2); g.stroke(); }
  const im = g.getImageData(0, 0, S, S), d = im.data;
  for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 8) { const k = (rnd() - 0.5) * 18; for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const p = ((y + yy) * S + x + xx) * 4; d[p] += k; d[p + 1] += k; d[p + 2] += k; } }
  g.putImageData(im, 0, 0);
  return tex(c, { repeat: true });
}
export function woodTex() {
  const [c, g] = cvs(256, 512);
  g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, 256, 512);
  for (let x = 0; x < 256; x += 42) { g.fillStyle = 'rgba(40,40,40,0.55)'; g.fillRect(x, 0, 3, 512); }
  for (let i = 0; i < 260; i++) { const x = rnd() * 256; g.strokeStyle = `rgba(${rnd() > 0.5 ? 255 : 60},${rnd() > 0.5 ? 255 : 60},${rnd() > 0.5 ? 255 : 60},${0.05 + rnd() * 0.1})`; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); for (let y = 0; y <= 512; y += 16) g.lineTo(x + Math.sin(y * 0.02 + i) * 2.5, y); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(240,235,225,${rnd() * 0.35})`; g.fillRect(rnd() * 256, rnd() * 512, 4 + rnd() * 20, 2 + rnd() * 8); }
  return tex(c, { repeat: true });
}
export function rugTex(pal) {
  const [c, g] = cvs(256, 384);
  g.fillStyle = pal[0]; g.fillRect(0, 0, 256, 384);
  g.fillStyle = pal[1]; g.fillRect(0, 0, 256, 30); g.fillRect(0, 354, 256, 30);
  const dia = (x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.7, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.7, y); g.closePath(); g.fill(); };
  for (let y = 80; y < 330; y += 110) { dia(128, y, 52, pal[1]); dia(128, y, 32, pal[2]); dia(128, y, 12, pal[3]); dia(40, y + 55, 20, pal[2]); dia(216, y + 55, 20, pal[2]); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.08})`; g.fillRect(rnd() * 256, rnd() * 384, 2, 3); }
  return tex(c);
}
export function clothTex(a, b) {
  const [c, g] = cvs(128, 128);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 16, 0, 16, 128); }
  return tex(c, { repeat: true });
}
export function starCookie() {
  // the pattern a pierced brass lantern throws on the walls: a soft pool, cut into stars (one mask, applied once)
  const [m, mg] = cvs(256, 256);
  mg.fillStyle = '#fff'; mg.beginPath();
  for (let r = 18; r < 128; r += 22) for (let k = 0; k < Math.floor(r / 4); k++) {
    const a = (k / Math.floor(r / 4)) * Math.PI * 2 + r, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r, R = 4 + r * 0.035;
    for (let i = 0; i < 8; i++) { const aa = (i / 8) * Math.PI * 2, rr = i % 2 ? R * 0.45 : R; i ? mg.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr) : mg.moveTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); }
    mg.closePath();
  }
  mg.moveTo(144, 128); mg.arc(128, 128, 16, 0, Math.PI * 2); mg.fill();
  const [c, g] = cvs(256, 256);
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  // a faint wash under the stars, so the pool reads as light and not as a stencil
  const soft = g.getImageData(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0);
  g.globalCompositeOperation = 'destination-over'; const sd = soft.data; for (let i = 3; i < sd.length; i += 4) sd[i] *= 0.18;
  const [w, wg] = cvs(256, 256); wg.putImageData(soft, 0, 0); g.drawImage(w, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return tex(c, { srgb: false });
}

// ---------- the sign atlas: every painted sign in one texture ----------
export function signAtlas(signs, fonts) {
  const S = 2048, [c, g] = cvs(S, S);
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const rects = {};
  let x = 0, y = 0, rowH = 0;
  for (const s of signs) {
    const w = s.w, h = s.h;
    if (x + w > S) { x = 0; y += rowH + 4; rowH = 0; }
    s.draw(g, x, y, w, h, fonts);
    rects[s.id] = [x / S, 1 - (y + h) / S, w / S, h / S];
    x += w + 4; rowH = Math.max(rowH, h);
  }
  const t = tex(c);
  return { texture: t, rects };
}
export function paintSign(style) {
  // style: { bg, fg, accent, ar, en, sub, frame }
  return (g, x, y, w, h, F) => {
    g.save(); g.translate(x, y);
    g.fillStyle = style.bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1 + rnd() * 3); }
    if (style.frame) { g.strokeStyle = style.accent; g.lineWidth = Math.max(4, h * 0.035); g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h * 0.12 > 0 ? h - h * 0.12 : h); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = style.fg;
    const hasAr = !!style.ar, hasEn = !!style.en;
    if (hasAr) { g.font = `700 ${Math.round(h * (hasEn ? 0.36 : 0.56))}px ${F.arabic}`; g.direction = 'rtl'; g.fillText(style.ar, w / 2, h * (hasEn ? 0.33 : 0.52)); g.direction = 'ltr'; }
    if (hasEn) { g.font = `700 ${Math.round(h * (hasAr ? 0.22 : 0.4))}px ${F.latin}`; g.fillStyle = style.accent || style.fg; g.fillText(style.en, w / 2, h * (hasAr ? 0.72 : 0.5)); }
    if (style.sub) { g.font = `400 ${Math.round(h * 0.11)}px ${F.latin}`; g.fillStyle = style.fg; g.globalAlpha = 0.8; g.fillText(style.sub, w / 2, h * 0.9); }
    g.restore();
  };
}

// ---------- geometry ----------
// Batch: merges geometry per material, in world space, with vertex colours (tint × contact shadow) and world-planar UVs
export class Batch {
  constructor() { this.map = new Map(); }
  add(geo, mat, matrix, { color = '#ffffff', ao = true, uv = 1, aoH = 1.4 } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.computeBoundingBox();
    const y0 = g.boundingBox.min.y;
    const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3), base = new THREE.Color(color);
    const sc = new THREE.Vector3(); matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
    for (let i = 0; i < n; i++) {
      const hy = (pos.getY(i) - y0) * sc.y;
      const k = ao ? 0.55 + 0.45 * Math.min(1, Math.pow(hy / aoH, 0.7)) : 1;
      col[i * 3] = base.r * k; col[i * 3 + 1] = base.g * k; col[i * 3 + 2] = base.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.applyMatrix4(matrix);
    if (uv) planarUV(g, uv);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
    return this;
  }
  box(mat, pos, size, opts = {}, rotY = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(...size), mat, m, opts);
  }
  at(geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    return this.add(geo, mat, m, opts);
  }
  build(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, list] of this.map) {
      const m = new THREE.Mesh(mergeGeometries(list), mat);
      m.castShadow = cast; m.receiveShadow = receive; parent.add(m); out.push(m);
    }
    this.map.clear();
    return out;
  }
}
export function planarUV(g, s) {
  const p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, p.getX(i) * s, p.getZ(i) * s);
    else if (nx >= nz) uv.setXY(i, p.getZ(i) * s, p.getY(i) * s);
    else uv.setXY(i, p.getX(i) * s, p.getY(i) * s);
  }
  uv.needsUpdate = true;
}

// a wall panel (w x h, thickness t) pierced by arched openings: [{x, w, h, y}]
export function archedWall(w, h, t, openings, horseshoe = 1.2) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  for (const o of openings) {
    const p = new THREE.Path(); const r = o.w / 2 * (horseshoe > 1 ? 1.08 : 1), cy = (o.y || 0) + o.h - r;
    p.moveTo(o.x - o.w / 2, (o.y || 0) + 0.001);
    const ext = horseshoe > 1 ? Math.asin(Math.min(0.99, (o.w / 2) / r)) : Math.PI / 2;
    p.lineTo(o.x - o.w / 2, cy - (horseshoe > 1 ? Math.cos(ext) * r : 0));
    p.absarc(o.x, cy, r, Math.PI / 2 + ext, Math.PI / 2 - ext, true);
    p.lineTo(o.x + o.w / 2, (o.y || 0) + 0.001);
    p.lineTo(o.x - o.w / 2, (o.y || 0) + 0.001);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 18 });
  g.translate(0, 0, -t / 2);
  return g;
}
export function lathe(pts, seg = 24) { return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); }

// a studded wooden door; returns { group, leaves[] } with leaves hinged so they can swing open
export function makeDoor({ w = 1.3, h = 2.4, color = '#1f4fa3', arch = true, double = true, mats }) {
  const group = new THREE.Group();
  const leaves = [];
  const n = double ? 2 : 1, lw = w / n;
  const paint = mats.paint(color);
  for (let i = 0; i < n; i++) {
    const hinge = new THREE.Group();
    const side = double ? (i === 0 ? -1 : 1) : -1;
    hinge.position.set(side * w / 2, 0, 0);
    const leaf = new THREE.Group();
    const geo = new THREE.BoxGeometry(lw, arch ? h - w * 0.25 : h, 0.07);
    const body = new THREE.Mesh(geo, paint); body.position.set(-side * lw / 2, (arch ? h - w * 0.25 : h) / 2, 0); body.castShadow = body.receiveShadow = true;
    leaf.add(body);
    const studs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 6), mats.iron, 24);
    let k = 0; const d = new THREE.Object3D();
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { d.position.set(-side * (0.12 + c * (lw - 0.24) / 3), 0.25 + r * ((arch ? h - w * 0.25 : h) - 0.5) / 5, 0.04); d.updateMatrix(); studs.setMatrixAt(k++, d.matrix); }
    leaf.add(studs);
    if (i === n - 1) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), mats.brass); ring.position.set(-side * (lw - 0.15), h * 0.5, 0.06); leaf.add(ring); }
    hinge.add(leaf); group.add(hinge); leaves.push({ hinge, side });
  }
  if (arch) {
    const s = new THREE.Shape(); const r = w / 2;
    s.moveTo(-w / 2, 0); s.absarc(0, 0, r, Math.PI, 0, true); s.lineTo(-w / 2, 0);
    const tg = new THREE.ShapeGeometry(s, 16); const tm = new THREE.Mesh(tg, paint);
    tm.position.set(0, h - w * 0.25 - 0.0, 0); tm.scale.set(1, 0.5, 1); group.add(tm);
    // a fanlight grille in the arch
    const grille = new THREE.Mesh(new THREE.TorusGeometry(r * 0.55, 0.012, 6, 24, Math.PI), mats.iron); grille.position.set(0, h - w * 0.25, 0.04); grille.scale.set(1, 0.5, 1); group.add(grille);
  }
  return { group, leaves };
}

// a pierced brass lantern: a shell with star-shaped holes (alpha-tested) around a glowing core you see through them
export function lanternGeo() {
  const prof = [[0, 0], [0.05, 0], [0.12, 0.08], [0.15, 0.22], [0.12, 0.38], [0.06, 0.46], [0.02, 0.56], [0.025, 0.62], [0, 0.64]];
  const body = lathe(prof, 12);
  const core = lathe([[0, 0.05], [0.09, 0.09], [0.118, 0.22], [0.09, 0.36], [0, 0.43]], 12);
  return { body, core };
}
export function pierceTex() {
  // white = brass, black = hole. The lathe's v runs along the profile: the pierced band is v 0.27 to 0.6
  const [c, g] = cvs(256, 256);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#000';
  const y0 = (1 - 0.6) * 256, y1 = (1 - 0.27) * 256, rows = 4, cols = 12;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = (k + (r % 2) * 0.5 + 0.5) * (256 / cols), y = y0 + (r + 0.5) * ((y1 - y0) / rows), R = r === 0 || r === rows - 1 ? 4.2 : 6.2;
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? R * 0.45 : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 1.25); } g.closePath(); g.fill();
  }
  return tex(c, { srgb: false });
}
// what is on the team's laptops: code, of course
export function codeTex() {
  const [c, g] = cvs(256, 160);
  g.fillStyle = '#12151c'; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#1b2030'; g.fillRect(0, 0, 44, 160); g.fillRect(0, 0, 256, 12);
  const cols = ['#7fc8ff', '#ffb35c', '#9fe0a0', '#e7e1d4', '#c9a2ff', '#ff8f7a'];
  for (let y = 20; y < 156; y += 8) {
    let x = 52 + (rnd() < 0.5 ? 0 : rnd() < 0.6 ? 10 : 20);
    const n = 1 + Math.floor(rnd() * 5);
    for (let k = 0; k < n && x < 240; k++) { const w = 8 + rnd() * 34; g.fillStyle = pick(cols); g.globalAlpha = 0.85; g.fillRect(x, y, w, 3.5); x += w + 5; }
  }
  g.globalAlpha = 1;
  for (let y = 18; y < 156; y += 10) { g.fillStyle = 'rgba(200,210,230,0.25)'; g.fillRect(6, y, 24 + rnd() * 10, 3); }
  return tex(c, { aniso: 4 });
}
// a pigeon: +z is forward, feet at y = 0. Wing vertices are marked so the shader can fold them (perched) or flap them
export function pigeonGeo() {
  const parts = [];
  const add = (g, color, wing = 0) => {
    g = g.index ? g.toNonIndexed() : g; if (g.attributes.uv) g.deleteAttribute('uv');
    const n = g.attributes.position.count, c = new THREE.Color(color), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('wing', new THREE.BufferAttribute(new Float32Array(n).fill(wing), 1)); parts.push(g);
  };
  const body = new THREE.SphereGeometry(0.1, 10, 7); body.scale(0.72, 0.66, 1.45); body.translate(0, 0.075, 0); add(body, '#9aa1ad');
  const neck = new THREE.SphereGeometry(0.052, 8, 6); neck.scale(1, 1.2, 1); neck.translate(0, 0.12, 0.09); add(neck, '#5f7f74');
  const head = new THREE.SphereGeometry(0.044, 8, 6); head.translate(0, 0.16, 0.13); add(head, '#5d6573');
  const beak = new THREE.ConeGeometry(0.011, 0.034, 5); beak.rotateX(Math.PI / 2); beak.translate(0, 0.155, 0.185); add(beak, '#e8d6c8');
  const tail = new THREE.BoxGeometry(0.075, 0.012, 0.13); tail.translate(0, 0.07, -0.175); add(tail, '#5b6370');
  for (const k of [-1, 1]) {
    const w = new THREE.BufferGeometry();
    w.setAttribute('position', new THREE.Float32BufferAttribute([k * 0.05, 0.11, 0.08, k * 0.33, 0.1, -0.03, k * 0.05, 0.11, -0.11, k * 0.33, 0.1, -0.03, k * 0.2, 0.1, -0.13, k * 0.05, 0.11, -0.11], 3));
    w.computeVertexNormals(); add(w, '#7f8794', 1);
  }
  return mergeGeometries(parts);
}
export function palmFrondTex() {
  const [c, g] = cvs(128, 512);
  g.strokeStyle = '#4b6a2c'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 512); g.lineTo(64, 0); g.stroke();
  for (let y = 20; y < 500; y += 12) {
    const len = 58 * Math.sin((y / 512) * Math.PI) + 6;
    g.strokeStyle = y % 24 ? '#5d7f34' : '#6f8f3d'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(64, y); g.lineTo(64 - len, y - 26); g.moveTo(64, y); g.lineTo(64 + len, y - 26); g.stroke();
  }
  const t = tex(c); return t;
}
