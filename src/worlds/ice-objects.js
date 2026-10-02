import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The objects frozen inside the ice. All procedural: lathes, extrusions, instancing and canvas textures.
// Each builder returns { group, tick(time, dt, thaw) }, sized to fit a 1-unit sphere.

const M = {};
function mats() {
  if (M.gold) return M;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.gold = std({ color: 0xd8a54a, metalness: 1, roughness: 0.22 });
  M.brass = std({ color: 0xb8893a, metalness: 1, roughness: 0.32 });
  M.steel = std({ color: 0xcfd6de, metalness: 1, roughness: 0.18 });
  M.dark = std({ color: 0x1d2129, metalness: 0.3, roughness: 0.35 });
  M.wood = std({ color: 0x8a5a35, roughness: 0.55 });
  M.woodLight = std({ color: 0xb98a58, roughness: 0.6 });
  M.red = std({ color: 0xc8321e, roughness: 0.3 });
  M.paper = std({ color: 0xf1e8d4, roughness: 0.85 });
  M.orange = std({ color: 0xe4521b, roughness: 0.35, emissive: 0xe4521b, emissiveIntensity: 0.35 });
  M.leaf = std({ color: 0x7d8c55, roughness: 0.55, side: THREE.DoubleSide });
  M.leafDark = std({ color: 0x55653a, roughness: 0.5, side: THREE.DoubleSide });
  M.olive = std({ color: 0x2c1d2a, roughness: 0.12 });
  M.oliveGreen = std({ color: 0x8a9440, roughness: 0.18 });
  M.oil = std({ color: 0xe0b43a, roughness: 0.05, metalness: 0.2, emissive: 0x8a5a00, emissiveIntensity: 0.35 });
  M.glow = std({ color: 0xffb04a, emissive: 0xff9a2a, emissiveIntensity: 2.2, roughness: 0.4 });
  M.alarm = std({ color: 0xff3b1f, emissive: 0xff2a10, emissiveIntensity: 2.5, roughness: 0.4 });
  M.cell = std({ color: 0xc9d7e4, metalness: 0.35, roughness: 0.22 });
  M.bag = std({ color: 0xb03a46, roughness: 0.62 });
  M.rope = std({ color: 0x23201e, roughness: 0.8 });
  M.lens = std({ color: 0xbfe0f2, metalness: 0.6, roughness: 0.05 });
  M.beige = std({ color: 0xd9ccb0, roughness: 0.6 });
  M.screen = std({ color: 0x0b1a10, emissive: 0x58ff9a, emissiveIntensity: 1.2, roughness: 0.3 });
  M.gem = new THREE.MeshPhysicalMaterial({ color: 0xf6f9ff, metalness: 0, roughness: 0, flatShading: true, iridescence: 1, iridescenceIOR: 1.7, clearcoat: 1, envMapIntensity: 3, specularIntensity: 1 });
  return M;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const mesh = (g, m, p = [0, 0, 0], r = [0, 0, 0], s) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.rotation.set(...r); if (s) o.scale.set(...(Array.isArray(s) ? s : [s, s, s])); return o; };
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function fit(group, size = 1) {
  const box = new THREE.Box3().setFromObject(group), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z);
  const wrap = new THREE.Group();
  group.position.sub(c);
  wrap.add(group); wrap.scale.setScalar(k);
  return wrap;
}

// ---------- builders ----------
function stamp() {
  const m = mats(), g = new THREE.Group(), handle = new THREE.Group();
  handle.add(mesh(lathe([[0, 0.62], [0.09, 0.6], [0.12, 0.54], [0.1, 0.47], [0.05, 0.38], [0.045, 0.24], [0.07, 0.18], [0.09, 0.14], [0, 0.14]], 40), m.wood));
  handle.add(mesh(new RoundedBoxGeometry(0.62, 0.11, 0.38, 3, 0.03), m.dark, [0, 0.085, 0]));
  handle.add(mesh(new THREE.BoxGeometry(0.58, 0.035, 0.34), m.red, [0, 0.015, 0]));
  const mark = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#f1e8d4'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#c8321e'; x.fillStyle = '#c8321e'; x.lineWidth = 14; x.globalAlpha = 0.92;
    x.save(); x.translate(w / 2, h / 2); x.rotate(-0.18);
    x.strokeRect(-200, -86, 400, 172); x.lineWidth = 4; x.strokeRect(-184, -70, 368, 140);
    x.font = '800 74px "Archivo Variable", Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('APPROVED', 0, -10);
    x.font = '500 30px "IBM Plex Mono", monospace'; x.fillText('2021 · CUSTOMS', 0, 44); x.restore();
    x.globalAlpha = 0.18; x.fillStyle = '#7a6a50'; for (let i = 0; i < 9; i++) x.fillRect(40, 30 + i * 52, 160 + Math.random() * 260, 6);
  });
  g.add(mesh(new THREE.BoxGeometry(0.95, 0.012, 0.95), [m.paper, m.paper, new THREE.MeshStandardMaterial({ map: mark, roughness: 0.9 }), m.paper, m.paper, m.paper], [0.08, -0.12, 0.05], [0, 0.35, 0]));
  handle.position.set(-0.05, 0.08, -0.05); handle.rotation.set(0.12, 0.3, 0.18);
  g.add(handle);
  return { group: fit(g, 1.0), tick(t, dt, thaw) { handle.position.y = 0.08 + Math.abs(Math.sin(t * 2.2)) * 0.12 * thaw; } };
}

function diploma() {
  const m = mats(), g = new THREE.Group();
  const spiral = canvasTex(256, 256, (x, w) => {
    x.fillStyle = '#e9dfc7'; x.fillRect(0, 0, w, w); x.strokeStyle = '#b9a47c'; x.lineWidth = 3; x.beginPath();
    for (let a = 0; a < 26; a += 0.05) { const r = 4 + a * 4.6; x.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } x.stroke();
  });
  const endMat = new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.85 });
  const roll = new THREE.Group();
  roll.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 40), [m.paper, endMat, endMat]));
  roll.add(mesh(new THREE.TorusGeometry(0.125, 0.022, 12, 40), m.red, [0, 0.05, 0], [Math.PI / 2, 0, 0]));
  roll.add(mesh(new THREE.TorusGeometry(0.125, 0.022, 12, 40), m.red, [0, -0.05, 0], [Math.PI / 2, 0, 0]));
  roll.add(mesh(new THREE.BoxGeometry(0.06, 0.32, 0.012), m.red, [0.05, -0.02, 0.17], [0.3, 0, 0.35]));
  roll.add(mesh(new THREE.BoxGeometry(0.06, 0.3, 0.012), m.red, [-0.03, -0.04, 0.17], [0.3, 0, -0.25]));
  roll.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 32), m.gold, [0, 0, 0.14], [Math.PI / 2, 0, 0]));
  roll.rotation.set(0, 0, Math.PI / 2 - 0.25); roll.position.set(0, -0.22, 0.05);
  g.add(roll);
  const cap = new THREE.Group();
  cap.add(mesh(new THREE.BoxGeometry(0.62, 0.025, 0.62), m.dark, [0, 0.12, 0], [0, Math.PI / 4, 0]));
  cap.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 32), m.dark, [0, 0.05, 0]));
  cap.add(mesh(new THREE.SphereGeometry(0.025, 12, 8), m.orange, [0, 0.14, 0]));
  const tassel = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), m.orange, [0.2, 0.02, 0.0]);
  tassel.add(mesh(new THREE.ConeGeometry(0.035, 0.1, 10), m.orange, [0, -0.15, 0], [Math.PI, 0, 0]));
  cap.add(tassel);
  cap.position.set(0.05, 0.3, -0.05); cap.rotation.set(0.25, 0.4, -0.12);
  g.add(cap);
  return { group: fit(g, 1.0), tick(t, dt, thaw) { tassel.rotation.z = Math.sin(t * 1.7) * 0.25; cap.position.y = 0.3 + thaw * 0.12 + Math.sin(t) * 0.02; } };
}

function gearGeo(teeth, r, depth = 0.08, hole = 0.05) {
  const s = new THREE.Shape(), ri = r * 0.82, n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, k = i % 4, rr = k === 1 || k === 2 ? r : ri;
    const p = [Math.cos(a) * rr, Math.sin(a) * rr];
    i ? s.lineTo(...p) : s.moveTo(...p);
  }
  const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, c = new THREE.Path(); c.absarc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.13, 0, Math.PI * 2, true); s.holes.push(c); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  return g;
}
function gears() {
  const m = mats(), g = new THREE.Group();
  const A = mesh(gearGeo(16, 0.36), m.brass, [-0.12, 0.05, 0]);
  const B = mesh(gearGeo(10, 0.23), m.steel, [0.42, 0.28, 0.02]);
  const C = mesh(gearGeo(12, 0.27), m.gold, [0.3, -0.36, -0.03]);
  const pins = [A, B, C].map((x) => mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 16), m.dark, x.position.toArray(), [Math.PI / 2, 0, 0]));
  g.add(A, B, C, ...pins);
  g.rotation.set(-0.35, 0.45, 0);
  return { group: fit(g, 1.05), tick(t, dt, thaw) { const w = 0.35 + thaw * 1.2; A.rotation.z += dt * w; B.rotation.z -= dt * w * 1.6; C.rotation.z -= dt * w * 1.33; } };
}

function olive() {
  const m = mats(), g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([[-0.55, -0.42, 0], [-0.25, -0.15, 0.06], [0.05, 0.05, -0.02], [0.32, 0.28, 0.05], [0.55, 0.5, 0]].map((p) => new THREE.Vector3(...p)));
  g.add(mesh(new THREE.TubeGeometry(curve, 48, 0.022, 8), m.wood));
  const leafG = new THREE.SphereGeometry(1, 14, 8); leafG.scale(0.22, 0.012, 0.05); leafG.translate(0.2, 0, 0);
  for (let i = 0; i < 13; i++) {
    const u = 0.06 + (i / 13) * 0.9, p = curve.getPoint(u), side = i % 2 ? 1 : -1;
    const l = mesh(leafG, i % 3 ? m.leaf : m.leafDark, p.toArray(), [0.4 * side, side * 0.9 + (Math.random() - 0.5) * 0.4, 0.6 * side + 0.4]);
    l.scale.setScalar(0.85 + Math.random() * 0.35);
    g.add(l);
  }
  const oG = new THREE.SphereGeometry(1, 20, 14); oG.scale(0.055, 0.075, 0.055);
  [[0.18, -0.03], [0.3, 0.1], [0.46, 0.15], [0.62, 0.05], [0.75, -0.04]].forEach(([u, o], i) => {
    const p = curve.getPoint(u); g.add(mesh(oG, i % 2 ? m.oliveGreen : m.olive, [p.x + o, p.y - 0.1, p.z + 0.05], [0, 0, 0.3]));
  });
  const drop = mesh(lathe([[0, -0.12], [0.06, -0.1], [0.085, -0.05], [0.07, 0.03], [0.035, 0.1], [0, 0.17]], 32), m.oil, [0.38, -0.32, 0.12]);
  g.add(drop);
  return { group: fit(g, 1.08), tick(t, dt, thaw) { drop.position.y = -0.32 - ((t * 0.25 * (0.4 + thaw)) % 0.3); } };
}

function bag() {
  const m = mats(), g = new THREE.Group();
  const body = new RoundedBoxGeometry(0.56, 0.62, 0.24, 2, 0.015);
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) * (1 - (y + 0.31) * 0.06)); }
  body.computeVertexNormals();
  g.add(mesh(body, m.bag));
  g.add(mesh(new THREE.BoxGeometry(0.565, 0.05, 0.245), m.dark, [0, 0.29, 0]));
  [-1, 1].forEach((s) => {
    const c = new THREE.CatmullRomCurve3([[-0.12, 0.3, 0.06 * s], [-0.1, 0.5, 0.07 * s], [0, 0.56, 0.07 * s], [0.1, 0.5, 0.07 * s], [0.12, 0.3, 0.06 * s]].map((p) => new THREE.Vector3(...p)));
    g.add(mesh(new THREE.TubeGeometry(c, 24, 0.012, 8), m.rope));
  });
  const tag = new THREE.Group();
  tag.add(mesh(new RoundedBoxGeometry(0.12, 0.17, 0.008, 2, 0.01), m.orange));
  tag.add(mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12), m.gold, [0, 0.065, 0.005]));
  tag.position.set(0.17, 0.12, 0.14); tag.rotation.set(0, -0.3, 0.25);
  g.add(tag);
  const box = mesh(new RoundedBoxGeometry(0.3, 0.16, 0.22, 2, 0.02), m.paper, [0.38, -0.23, 0.04], [0, -0.4, 0]);
  box.add(mesh(new THREE.BoxGeometry(0.31, 0.03, 0.225), m.orange, [0, 0.0, 0]));
  g.add(box);
  return { group: fit(g, 1.0), tick(t, dt, thaw) { tag.rotation.z = 0.25 + Math.sin(t * 2) * 0.12 * (0.3 + thaw); } };
}

function gem() {
  const m = mats(), g = new THREE.Group();
  const stone = mesh(lathe([[0, -0.36], [0.4, 0.02], [0.4, 0.05], [0.26, 0.17], [0, 0.17]], 10), m.gem, [0, 0.16, 0]);
  g.add(stone);
  const ring = new THREE.Group();
  ring.add(mesh(new THREE.TorusGeometry(0.36, 0.045, 20, 64), m.gold, [0, -0.36, 0], [0.15, 0, 0]));
  ring.add(mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.12, 6), m.gold, [0, -0.06, 0]));
  g.add(ring);
  return { group: fit(g, 1.0), tick(t, dt, thaw) { stone.rotation.y += dt * (0.4 + thaw * 1.4); } };
}

function crates() {
  const m = mats(), g = new THREE.Group();
  const plank = canvasTex(256, 256, (x, w) => {
    x.fillStyle = '#a4743f'; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 4; i++) { x.fillStyle = ['#9a6a38', '#ab7c47', '#93632f', '#a87843'][i]; x.fillRect(0, i * 64 + 3, w, 58); }
    x.strokeStyle = '#5d3d1e'; x.lineWidth = 16; x.strokeRect(8, 8, w - 16, w - 16);
    x.lineWidth = 12; x.beginPath(); x.moveTo(14, 14); x.lineTo(w - 14, w - 14); x.stroke();
    x.globalAlpha = 0.25; x.strokeStyle = '#3e2810'; x.lineWidth = 1; for (let i = 0; i < 70; i++) { const y = Math.random() * w; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y + 1); x.stroke(); }
  });
  const crateM = new THREE.MeshStandardMaterial({ map: plank, roughness: 0.75 });
  const cg = new RoundedBoxGeometry(0.34, 0.34, 0.34, 2, 0.015);
  const list = [];
  for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) {
    if (x === 1 && y === 1 && z === 0) continue;
    const bad = x === 0 && y === 1 && z === 1;
    const c = mesh(cg, bad ? m.alarm : crateM, [(x - 0.5) * 0.36, (y - 0.5) * 0.36, (z - 0.5) * 0.36], [0, (Math.random() - 0.5) * 0.12, 0]);
    c.userData.bad = bad; c.userData.base = c.position.clone(); list.push(c); g.add(c);
  }
  const loose = mesh(cg, crateM, [0.34, 0.3, 0.25], [0.2, 0.5, 0.35]); g.add(loose);
  g.rotation.set(0, 0.6, 0);
  return { group: fit(g, 1.0), tick(t) {
    for (const c of list) if (c.userData.bad) {
      const glitch = Math.sin(t * 23) > 0.85 ? 1 : 0;
      c.position.copy(c.userData.base).add(new THREE.Vector3((Math.random() - 0.5) * 0.04 * glitch, 0, (Math.random() - 0.5) * 0.04 * glitch));
      m.alarm.emissiveIntensity = 1.6 + Math.sin(t * 6) * 0.9;
    }
  } };
}

function wrench() {
  const m = mats(), g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.045, -0.42); s.lineTo(0.045, -0.42); s.lineTo(0.045, 0.2);
  s.absarc(0, 0.32, 0.13, -Math.PI / 2 + 0.35, Math.PI * 0.2, false); s.lineTo(0.035, 0.36); s.lineTo(0.035, 0.27); s.lineTo(-0.035, 0.27); s.lineTo(-0.035, 0.36);
  s.lineTo(-0.105, 0.4); s.absarc(0, 0.32, 0.13, Math.PI * 0.8, Math.PI * 1.5 - 0.35, false); s.lineTo(-0.045, -0.42);
  const ring = new THREE.Path(); ring.absarc(0, -0.42, 0.06, 0, Math.PI * 2, true);
  const end = new THREE.Shape(); end.absarc(0, -0.42, 0.11, 0, Math.PI * 2, false); end.holes.push(ring);
  const opt = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 20 };
  const w = new THREE.Group();
  w.add(mesh(new THREE.ExtrudeGeometry(s, opt), m.steel), mesh(new THREE.ExtrudeGeometry(end, opt), m.steel));
  w.rotation.set(0, 0, 0.7); w.position.set(-0.08, 0, 0);
  g.add(w);
  const mag = new THREE.Group();
  mag.add(mesh(new THREE.TorusGeometry(0.2, 0.03, 16, 48), m.orange));
  mag.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 48), m.lens, [0, 0, 0], [Math.PI / 2, 0, 0]));
  mag.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.36, 16), m.dark, [0, -0.39, 0]));
  mag.rotation.set(0.2, -0.3, -0.7); mag.position.set(0.14, 0.06, 0.1);
  g.add(mag);
  return { group: fit(g, 1.05), tick(t, dt, thaw) { mag.position.x = 0.14 + Math.sin(t * 1.3) * 0.06 * (0.4 + thaw); mag.position.y = 0.06 + Math.cos(t * 1.1) * 0.05 * (0.4 + thaw); } };
}

function bars() {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.0, 0.05, 0.42, 2, 0.015), m.dark, [0, -0.02, 0]));
  const H = [0.22, 0.34, 0.3, 0.5, 0.68], list = [];
  const bg = new RoundedBoxGeometry(0.13, 1, 0.13, 2, 0.02); bg.translate(0, 0.5, 0);
  H.forEach((h, i) => {
    const b = mesh(bg, i === 4 ? m.gold : m.cell, [-0.38 + i * 0.19, 0.0, 0]); b.scale.y = h; b.userData.h = h; list.push(b); g.add(b);
  });
  const pts = H.map((h, i) => new THREE.Vector3(-0.38 + i * 0.19, h + 0.12, 0.12));
  const line = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.012, 8), m.glow);
  g.add(line);
  const dots = pts.map((p) => mesh(new THREE.SphereGeometry(0.03, 16, 12), m.glow, p.toArray())); g.add(...dots);
  g.rotation.set(0.1, -0.5, 0);
  return { group: fit(g, 1.0), tick(t, dt, thaw) { list.forEach((b, i) => { b.scale.y = b.userData.h * (0.85 + 0.15 * Math.sin(t * 1.4 + i) * (0.3 + thaw)); }); } };
}

function medals() {
  const m = mats(), g = new THREE.Group();
  const CODES = [['C_SAC', 'ANALYTICS CLOUD'], ['TS410', 'S/4HANA INTEGRATION'], ['S4C03', 'S/4HANA CLOUD PE'], ['ABAP', 'ABAP CLOUD']];
  const list = [];
  CODES.forEach(([code, sub], i) => {
    const silver = i % 2 === 1;
    const face = canvasTex(512, 512, (x, w) => {
      const gr = x.createRadialGradient(w / 2, w / 2, 20, w / 2, w / 2, w / 2);
      gr.addColorStop(0, silver ? '#eef2f6' : '#f3cf7a'); gr.addColorStop(1, silver ? '#a9b4bf' : '#b8862e');
      x.fillStyle = gr; x.fillRect(0, 0, w, w);
      x.strokeStyle = silver ? '#7e8a96' : '#8a6420'; x.lineWidth = 10; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 30, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 3; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 52, 0, Math.PI * 2); x.stroke();
      x.fillStyle = silver ? '#4c5661' : '#6b4a12'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `800 ${code.length > 4 ? 92 : 112}px "Archivo Variable", Arial`; x.fillText(code, w / 2, w / 2 - 4);
      x.font = '500 26px "IBM Plex Mono", monospace'; x.fillText('SAP CERTIFIED', w / 2, w / 2 - 92); x.fillText(sub, w / 2, w / 2 + 88);
    });
    const fm = new THREE.MeshStandardMaterial({ map: face, metalness: 0.85, roughness: 0.3 });
    const coin = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 64), [silver ? m.steel : m.gold, fm, fm]);
    coin.rotation.x = Math.PI / 2;
    const holder = new THREE.Group(); holder.add(coin);
    const rib = mesh(new THREE.BoxGeometry(0.1, 0.34, 0.01), i % 2 ? m.orange : m.dark, [0, 0.36, -0.01]);
    holder.add(rib);
    const a = (i - 1.5) * 0.42;
    holder.position.set(Math.sin(a) * 0.7, Math.cos(a) * 0.25 - 0.2, Math.cos(a) * 0.1);
    holder.rotation.set(0, 0, -a * 0.6);
    holder.userData.a = a; list.push(holder); g.add(holder);
  });
  return { group: fit(g, 1.05), tick(t, dt, thaw) { list.forEach((h, i) => { h.children[0].rotation.y = Math.sin(t * 0.9 + i) * 0.5 * (0.4 + thaw); }); } };
}

function planningCube() {
  const m = mats(), g = new THREE.Group();
  const N = 4, S = 0.16, GAP = 0.035, geo = new RoundedBoxGeometry(S, S, S, 2, 0.02);
  const lit = new Set([1, 6, 9, 14, 21, 22, 27, 38, 41, 43, 50, 53, 58, 63, 31, 34]);
  const cold = new THREE.InstancedMesh(geo, m.cell, N * N * N), hot = new THREE.InstancedMesh(geo, m.glow, lit.size);
  const cells = [];
  let ci = 0, hi = 0;
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) {
    const idx = x * 16 + y * 4 + z, isHot = lit.has(idx);
    cells.push({ p: new THREE.Vector3((x - 1.5) * (S + GAP), (y - 1.5) * (S + GAP), (z - 1.5) * (S + GAP)), hot: isHot, i: isHot ? hi++ : ci++, y });
  }
  cold.count = ci; hot.count = hi;
  g.add(cold, hot);
  const dummy = new THREE.Object3D(), q = new THREE.Quaternion(), Yax = new THREE.Vector3(0, 1, 0);
  let layer = 3, ang = 0, next = 1.5;
  function place(t, thaw) {
    for (const c of cells) {
      dummy.position.copy(c.p); dummy.quaternion.identity();
      if (c.y === layer) { q.setFromAxisAngle(Yax, ang); dummy.position.applyQuaternion(q); dummy.quaternion.copy(q); }
      dummy.position.multiplyScalar(1 + thaw * 0.18 * (0.6 + 0.4 * Math.sin(t * 2 + c.p.x * 9)));
      dummy.updateMatrix();
      (c.hot ? hot : cold).setMatrixAt(c.i, dummy.matrix);
    }
    cold.instanceMatrix.needsUpdate = hot.instanceMatrix.needsUpdate = true;
  }
  place(0, 0);
  g.rotation.set(0.5, 0.7, 0);
  return { group: fit(g, 0.95), tick(t, dt, thaw) {
    if (t > next) { const k = Math.min(1, (t - next) / 0.9); ang = (k * k * (3 - 2 * k)) * Math.PI / 2; if (k >= 1) { next = t + 1.6; for (const c of cells) if (c.y === layer) { c.p.applyAxisAngle(Yax, Math.PI / 2); } ang = 0; layer = (layer + 2) % 4; } }
    place(t, thaw);
  } };
}

// The last block: a halftone portrait etched in light
function portrait(photo) {
  const g = new THREE.Group();
  const S = 96, cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const x = cv.getContext('2d');
  if (photo) {
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = S;
    const tg = tmp.getContext('2d', { willReadFrequently: true }); tg.drawImage(photo, 0, 0, S, S);
    const d = tg.getImageData(0, 0, S, S).data, step = 1024 / S;
    const lum = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) lum[i] = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
    const sorted = Float32Array.from(lum).sort(), lo = sorted[(S * S * 0.04) | 0], hi = sorted[(S * S * 0.97) | 0];
    x.fillStyle = '#fff';
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const l = Math.pow(Math.min(1, Math.max(0, (lum[j * S + i] - lo) / Math.max(0.05, hi - lo))), 0.8);
      const r = Math.pow(1 - l, 0.85) * step * 0.6, cx = (i + 0.5) * step, cy = (j + 0.5) * step;
      const vign = Math.hypot(cx - 512, cy - 512) / 512;
      if (r < 0.6 || vign > 0.98) continue;
      x.beginPath(); x.arc(cx, cy, r * (1 - Math.max(0, vign - 0.75) * 3), 0, Math.PI * 2); x.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.035, 0.08), alphaMap: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const plane = mesh(new THREE.PlaneGeometry(1.25, 1.25), mat);
  g.add(plane);
  const frame = mesh(new THREE.TorusGeometry(0.66, 0.008, 6, 96), mats().orange); g.add(frame);
  return { group: g, tick(t) { frame.rotation.z = t * 0.1; } };
}

// Door to the Night: a tiny galaxy of light
function galaxy() {
  const n = 900, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const a = new THREE.Color(1.6, 1.2, 0.65), b = new THREE.Color(0.7, 1.2, 1.5), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const arm = i % 3, r = Math.pow(Math.random(), 0.7) * 0.5, th = r * 7 + arm * (Math.PI * 2 / 3) + (Math.random() - 0.5) * 0.5;
    pos.set([Math.cos(th) * r, (Math.random() - 0.5) * 0.05 * (1 - r), Math.sin(th) * r], i * 3);
    c.copy(a).lerp(b, r * 2); col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.022, vertexColors: true, sizeAttenuation: true }));
  const g = new THREE.Group(); g.add(pts); g.rotation.x = 0.5;
  const core = mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.7, 1.2) })); g.add(core);
  return { group: g, tick(t, dt) { pts.rotation.y += dt * 0.5; } };
}
// Door to the Desk: a tiny computer
function computer() {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(0.62, 0.12, 0.5, 2, 0.02), m.beige, [0, -0.25, 0]));
  g.add(mesh(new RoundedBoxGeometry(0.52, 0.42, 0.44, 2, 0.04), m.beige, [0, 0.03, -0.03]));
  g.add(mesh(new THREE.PlaneGeometry(0.4, 0.3), m.screen, [0, 0.04, 0.195]));
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.012, 0.01), m.dark, [0.15, -0.25, 0.25]));
  g.add(mesh(new RoundedBoxGeometry(0.6, 0.04, 0.2, 2, 0.01), m.beige, [0, -0.33, 0.38], [0.15, 0, 0]));
  g.rotation.set(0.15, -0.5, 0);
  return { group: fit(g, 0.95), tick() {} };
}

export const BUILDERS = { stamp, diploma, gears, olive, bag, gem, crates, wrench, bars, medals, cube: planningCube, portrait, galaxy, computer };
