import * as THREE from 'three';
import { TASKS, METRICS, PROJECTS_D, LAYERS, MILESTONES } from '../content.js';
import { glyphCanvas, loadPhoto } from './glyphs.js';

// Planet · A tiny world. A toon-shaded planet with a road that links eight landmarks.
// Scrolling drives a little rover along the road while the sky moves from dawn to night;
// "Take the wheel" hands you the rover to explore freely.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const sstep = (a, b, x) => ease((x - a) / (b - a));
const RP = 30, ROAD = RP + 0.34;
const C = {
  red: 0xe4572e, orange: 0xf2a541, yellow: 0xf6d55c, teal: 0x3caea3, blue: 0x20639b, navy: 0x173f5f, cream: 0xfdf6e3,
  pink: 0xf7a1a1, purple: 0x7e57c2, white: 0xf4f1ea, grey: 0x9aa0a6, dark: 0x2b2d42, olive: 0x8a9a3c, gold: 0xf2b134,
};
const FACE = -2.356; // local rotation that faces the road-side camera

function h3(x, y, z) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
    L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
}
function fbm(x, y, z) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < 4; i++) { s += a * (vnoise(x * f, y * f, z * f) * 2 - 1); f *= 2.03; a *= 0.5; } return s; }
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const TOD = [
  { z: 0xf3b29a, h: 0xffe2c4, sun: 0xffc98a, el: 0.1, si: 1.7, hi: 1.05, sky: 0xffd6c2, gr: 0x9a7a66, night: 0 },
  { z: 0x7fc4ec, h: 0xe6f5ff, sun: 0xfff2d4, el: 0.55, si: 2.6, hi: 1.35, sky: 0xcde8ff, gr: 0x8f9b6c, night: 0 },
  { z: 0x6cb8ea, h: 0xe2f3ff, sun: 0xffffff, el: 0.85, si: 2.8, hi: 1.4, sky: 0xd2ebff, gr: 0x8f9b6c, night: 0 },
  { z: 0x6cb8ea, h: 0xe2f3ff, sun: 0xffffff, el: 0.95, si: 2.8, hi: 1.4, sky: 0xd2ebff, gr: 0x8f9b6c, night: 0 },
  { z: 0x72b6e2, h: 0xeaf2f8, sun: 0xfff6e0, el: 0.75, si: 2.7, hi: 1.35, sky: 0xd6ecff, gr: 0x8f9b6c, night: 0 },
  { z: 0x5f96c8, h: 0xffd59a, sun: 0xffb560, el: 0.32, si: 2.4, hi: 1.15, sky: 0xffe2b8, gr: 0x8a7a5a, night: 0.05 },
  { z: 0x3b4688, h: 0xff9868, sun: 0xff7442, el: 0.07, si: 1.7, hi: 0.85, sky: 0xd99a90, gr: 0x5a4a5a, night: 0.35 },
  { z: 0x0c1838, h: 0x2c3f70, sun: 0xb4c8ff, el: 0.55, si: 1.0, hi: 0.85, sky: 0x5a6a9a, gr: 0x262c48, night: 1 },
];

export async function createPlanet(env) {
  const { renderer, tier, reduced, fontFam, meURL } = env;
  const R = rng(11);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 1200);
  const up = new THREE.Vector3(0, 1, 0);

  // ---------- toon materials ----------
  const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const mcache = new Map();
  const toon = (c, o = {}) => {
    const key = `${c}|${o.emissive || 0}|${o.flat ? 1 : 0}`;
    if (!mcache.has(key)) mcache.set(key, new THREE.MeshToonMaterial({ color: c, gradientMap: grad, emissive: o.emissive || 0, emissiveIntensity: 0 }));
    return mcache.get(key);
  };
  const glowMats = [];
  const glow = (c) => { const m = new THREE.MeshToonMaterial({ color: c, gradientMap: grad, emissive: c, emissiveIntensity: 0 }); glowMats.push(m); return m; };
  const shadows = tier >= 2;
  function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadows; m.receiveShadow = shadows; return m; }
  const B = (w, h, d, c, y0 = 0) => mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2 + y0, 0), typeof c === 'number' ? toon(c) : c);
  const CY = (rt, rb, h, c, seg = 10) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0), typeof c === 'number' ? toon(c) : c);
  function textTex(lines, o = {}) {
    const W = o.w || 512, H = o.h || 256;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = o.bg || '#fdf6e3'; g.fillRect(0, 0, W, H);
    if (o.band) { g.fillStyle = o.band; g.fillRect(0, 0, W, H * 0.18); }
    g.fillStyle = o.color || '#173f5f'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([t, f, y]) => { g.font = f; g.fillText(t, W / 2, y * H); });
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
  }

  // ---------- the route ----------
  const LM = [];
  for (let k = 0; k < 8; k++) { const lon = -2.6 + k * 0.74, lat = 0.32 * Math.sin(k * 1.25 + 0.4); LM.push(new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))); }
  const curve = new THREE.CatmullRomCurve3(LM.map((v) => v.clone()), false, 'centripetal');
  const pathDir = (s, out) => curve.getPoint(clamp(s / 7, 0, 1), out).normalize();
  const tA = new THREE.Vector3(), tB = new THREE.Vector3();
  function frame(s, n, t, r) {
    pathDir(s, n);
    pathDir(clamp(s + 0.01, 0, 7), tA); pathDir(clamp(s - 0.01, 0, 7), tB);
    t.subVectors(tA, tB); t.addScaledVector(n, -t.dot(n)).normalize();
    r.crossVectors(t, n).normalize();
  }
  const SAMPLES = [];
  for (let i = 0; i <= 520; i++) SAMPLES.push(pathDir((i / 520) * 7, new THREE.Vector3()));
  const roadDot = (v) => { let m = -1; for (const s of SAMPLES) { const d = v.x * s.x + v.y * s.y + v.z * s.z; if (d > m) m = d; } return m; };
  const LMpos = LM.map((v, k) => { const n = new THREE.Vector3(), t = new THREE.Vector3(), r = new THREE.Vector3(); frame(k, n, t, r); return n.clone().addScaledVector(r, 0.2).normalize(); });
  function heightAt(v, rd = roadDot(v)) {
    const n1 = fbm(v.x * 2.1 + 3, v.y * 2.1, v.z * 2.1) * 2.6 + fbm(v.x * 6 + 11, v.y * 6, v.z * 6) * 0.8 + 0.55;
    const dRoad = Math.acos(Math.min(1, rd));
    let dLm = 9; for (const l of LMpos) dLm = Math.min(dLm, Math.acos(Math.min(1, v.dot(l))));
    const flat = Math.min(sstep(0.055, 0.13, dRoad), sstep(0.2, 0.3, dLm));
    return RP + 0.3 + (n1 - 0.3) * flat;
  }

  // ---------- planet, water, road ----------
  {
    const geo = new THREE.IcosahedronGeometry(1, tier >= 2 ? 6 : tier === 1 ? 5 : 4);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    const cache = new Map(), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
      let h = cache.get(key); if (h === undefined) { h = heightAt(v); cache.set(key, h); }
      pos.setXYZ(i, v.x * h, v.y * h, v.z * h);
    }
    const pal = [[RP + 0.05, 0xd8c08a], [RP + 0.5, 0xe9d8a6], [RP + 1.5, 0x8cc152], [RP + 2.3, 0x5c9c3f], [RP + 2.9, 0xa39785], [99, 0xf4f1ea]];
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      let h = 0; for (let j = 0; j < 3; j++) { v.fromBufferAttribute(pos, i + j); h += v.length() / 3; }
      const p = pal.find(([lim]) => h < lim)[1];
      col.setHex(p); const j2 = (h3(i, 7, 3) - 0.5) * 0.06; col.offsetHSL(0, 0, j2);
      for (let j = 0; j < 3; j++) cols.set([col.r, col.g, col.b], (i + j) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const planet = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad }));
    planet.receiveShadow = shadows; scene.add(planet);
    const water = new THREE.Mesh(new THREE.SphereGeometry(RP + 0.12, 72, 48), new THREE.MeshToonMaterial({ color: 0x3fa7d6, gradientMap: grad, transparent: true, opacity: 0.88 }));
    water.receiveShadow = shadows; scene.add(water);
    // road ribbon with a dashed centre line
    const N = 700, rv = [], ri = [], dv = [];
    const n = new THREE.Vector3(), t = new THREE.Vector3(), r = new THREE.Vector3();
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * 7; frame(s, n, t, r);
      const c = n.clone().multiplyScalar(ROAD);
      rv.push(...c.clone().addScaledVector(r, -1.15).toArray(), ...c.clone().addScaledVector(r, 1.15).toArray());
      if (i < N) ri.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      if (i % 6 < 3 && i < N) { const c2 = n.clone().multiplyScalar(ROAD + 0.02); const a = c2.clone().addScaledVector(r, -0.1), b = c2.clone().addScaledVector(r, 0.1); dv.push(a, b); }
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rg.setIndex(ri); rg.computeVertexNormals();
    const road = new THREE.Mesh(rg, toon(0xf1e0b0)); road.receiveShadow = shadows; scene.add(road);
    const dg = new THREE.BufferGeometry(), dp = [];
    for (let i = 0; i + 3 < dv.length; i += 4) { const [a, b, c2, d] = [dv[i], dv[i + 1], dv[i + 2], dv[i + 3]]; dp.push(...a.toArray(), ...b.toArray(), ...c2.toArray(), ...b.toArray(), ...d.toArray(), ...c2.toArray()); }
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); dg.computeVertexNormals();
    scene.add(new THREE.Mesh(dg, toon(0xffffff)));
  }

  // ---------- helpers to place things on the surface ----------
  const basis = new THREE.Matrix4();
  function placeAt(obj, dir, fwdHint, lift = 0) {
    const n = dir.clone().normalize();
    const x = fwdHint.clone().addScaledVector(n, -fwdHint.dot(n)).normalize();
    const z = new THREE.Vector3().crossVectors(x, n).normalize();
    basis.makeBasis(x, n, z);
    obj.quaternion.setFromRotationMatrix(basis);
    obj.position.copy(n).multiplyScalar(heightAt(n) + lift);
  }

  // ---------- nature: instanced trees, rocks, clouds, lamps ----------
  const dummy = new THREE.Object3D();
  {
    const count = tier >= 2 ? 520 : tier === 1 ? 260 : 110;
    const canopyG = new THREE.IcosahedronGeometry(1, 0).scale(1, 1.35, 1).translate(0, 2.2, 0);
    const trunkG = new THREE.CylinderGeometry(0.16, 0.24, 1.4, 5).translate(0, 0.7, 0);
    const canopies = new THREE.InstancedMesh(canopyG, new THREE.MeshToonMaterial({ gradientMap: grad }), count);
    const trunks = new THREE.InstancedMesh(trunkG, toon(0x8a5a3c), count);
    canopies.castShadow = trunks.castShadow = shadows;
    const greens = [0x6bbf59, 0x4f9d4a, 0x7fcf6a, 0x3f8f4a, 0xe8a33d, 0x9ccf5a];
    const v = new THREE.Vector3(), col = new THREE.Color();
    let placed = 0, guard = 0;
    while (placed < count && guard++ < count * 30) {
      v.set(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1); if (v.lengthSq() > 1 || v.lengthSq() < 0.01) continue; v.normalize();
      const rd = roadDot(v); if (Math.acos(Math.min(1, rd)) < 0.09) continue;
      let ok = true; for (const l of LMpos) if (v.dot(l) > Math.cos(0.3)) { ok = false; break; } if (!ok) continue;
      const h = heightAt(v, rd); if (h < RP + 0.55 || h > RP + 2.6) continue;
      dummy.position.copy(v).multiplyScalar(h - 0.1);
      dummy.quaternion.setFromUnitVectors(up, v); dummy.rotateY(R() * 6.28);
      dummy.scale.setScalar(0.65 + R() * 0.7); dummy.updateMatrix();
      canopies.setMatrixAt(placed, dummy.matrix); trunks.setMatrixAt(placed, dummy.matrix);
      canopies.setColorAt(placed, col.setHex(greens[(R() * greens.length) | 0]));
      placed++;
    }
    canopies.count = trunks.count = placed;
    scene.add(canopies, trunks);
    const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshToonMaterial({ color: 0x9a948a, gradientMap: grad }), 70);
    for (let i = 0; i < 70; i++) {
      v.set(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize();
      if (Math.acos(Math.min(1, roadDot(v))) < 0.08) { i--; continue; }
      dummy.position.copy(v).multiplyScalar(heightAt(v) - 0.1); dummy.quaternion.setFromUnitVectors(up, v); dummy.rotateY(R() * 6); dummy.scale.set(0.6 + R(), 0.4 + R() * 0.6, 0.6 + R()); dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.castShadow = shadows; scene.add(rocks);
  }
  const clouds = (() => {
    const n = tier >= 1 ? 14 : 8, per = 5;
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad, transparent: true, opacity: 0.95 }), n * per);
    const cl = Array.from({ length: n }, () => ({ dir: new THREE.Vector3(R() * 2 - 1, R() * 1.4 - 0.7, R() * 2 - 1).normalize(), alt: RP + 9 + R() * 4, sp: 0.01 + R() * 0.02, puffs: Array.from({ length: per }, (_, i) => [(i - 2) * 1.3 + (R() - 0.5), R() * 0.6, (R() - 0.5) * 1.2, 0.9 + R() * 0.9]) }));
    im.castShadow = shadows; scene.add(im);
    const q = new THREE.Quaternion(), e = new THREE.Vector3();
    return (time) => {
      let i = 0;
      for (const c of cl) {
        e.copy(c.dir).applyAxisAngle(up, time * c.sp);
        q.setFromUnitVectors(up, e);
        for (const [x, y, z, s] of c.puffs) { dummy.position.set(x, y, z).applyQuaternion(q).addScaledVector(e, c.alt); dummy.quaternion.copy(q); dummy.scale.setScalar(s); dummy.updateMatrix(); im.setMatrixAt(i++, dummy.matrix); }
      }
      im.instanceMatrix.needsUpdate = true;
    };
  })();
  const lampMat = glow(0xffd27a);
  {
    const n = new THREE.Vector3(), t = new THREE.Vector3(), r = new THREE.Vector3();
    const count = 56;
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5).translate(0, 1.1, 0), toon(C.dark), count);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6).translate(0, 2.3, 0), lampMat, count);
    for (let i = 0; i < count; i++) {
      const s = (i / count) * 7; frame(s, n, t, r);
      const d = n.clone().addScaledVector(r, -0.055).normalize();
      dummy.position.copy(d).multiplyScalar(ROAD - 0.05); dummy.quaternion.setFromUnitVectors(up, d); dummy.scale.setScalar(1); dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix); bulbs.setMatrixAt(i, dummy.matrix);
    }
    scene.add(posts, bulbs);
  }

  // ---------- landmarks ----------
  const L = [], anchors = {}, anims = [];
  const anchor = (d, obj, local) => (anchors[d] = { obj, local: new THREE.Vector3(...local) });
  for (let k = 0; k < 8; k++) {
    const g = new THREE.Group();
    const n = new THREE.Vector3(), t = new THREE.Vector3(), r = new THREE.Vector3(); frame(k, n, t, r);
    placeAt(g, LMpos[k], t);
    scene.add(g); L.push(g);
  }

  // 0 · Signal: a radio tower and a billboard with the name
  let beacon0;
  {
    const g = L[0];
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = CY(0.08, 0.12, 9, C.red, 5); leg.position.set(x * 0.9, 0, z * 0.9); leg.rotation.set(-z * 0.08, 0, x * 0.08); g.add(leg); }
    for (let i = 1; i <= 3; i++) { const p = B(2.2 - i * 0.45, 0.12, 2.2 - i * 0.45, C.white, i * 2.6); g.add(p); }
    const mast = CY(0.06, 0.06, 3, C.white, 5); mast.position.y = 9; g.add(mast);
    beacon0 = mesh(new THREE.SphereGeometry(0.28, 10, 8), glow(0xff4b3a)); beacon0.position.y = 12.2; g.add(beacon0);
    const bb = new THREE.Group(); bb.position.set(-3.6, 0, 1.6); bb.rotation.y = FACE;
    for (const x of [-2.4, 2.4]) { const p = CY(0.1, 0.12, 3.2, C.dark, 6); p.position.x = x; bb.add(p); }
    const face = mesh(new THREE.BoxGeometry(6.4, 2.4, 0.16), [toon(C.cream), toon(C.cream), toon(C.cream), toon(C.cream), new THREE.MeshToonMaterial({ map: textTex([['ABDELKRIM GHEBOULI', `800 100px ${fontFam}`, 0.44], ['SAP BPC · BUSINESS INTELLIGENCE', '500 30px "IBM Plex Mono", monospace', 0.8]], { w: 1024, h: 384, band: '#e4572e' }), gradientMap: grad }), toon(C.cream)]);
    face.position.y = 4.4; bb.add(face); g.add(bb);
    const house = B(2.4, 1.8, 2, C.cream); house.position.set(3, 0, -1.5); g.add(house);
    const roof = mesh(new THREE.ConeGeometry(1.9, 1.2, 4).rotateY(Math.PI / 4).translate(0, 2.4, 0), toon(C.red, { flat: true })); roof.position.set(3, 0, -1.5); g.add(roof);
  }

  // 1 · Raw: a messy crate yard, an alarm beacon, a stalled truck
  const crates1 = []; let siren, smoke;
  {
    const g = L[1];
    for (let i = 0; i < 18; i++) {
      const s = 0.8 + R() * 0.6, bad = i % 3 === 0;
      const m = mesh(new THREE.BoxGeometry(s, s, s), bad ? new THREE.MeshToonMaterial({ color: C.red, gradientMap: grad }) : toon(C.orange));
      const a = R() * 6.28, rr = R() * 3.6;
      const chaosP = new THREE.Vector3(Math.cos(a) * rr + 0.5, s / 2 + (R() < 0.3 ? 0.8 : 0), Math.sin(a) * rr + 0.8);
      const chaosQ = new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 1.1, R() * 6, (R() - 0.5) * 1.1));
      const orderP = new THREE.Vector3(-2 + (i % 6) * 1.2, s / 2, -0.4 + Math.floor(i / 6) * 1.3), orderQ = new THREE.Quaternion();
      m.position.copy(chaosP); m.quaternion.copy(chaosQ); g.add(m);
      crates1.push({ m, chaosP, chaosQ, orderP, orderQ, r: 0, bad });
    }
    const pole = CY(0.1, 0.12, 4.2, C.dark, 6); pole.position.set(-3.4, 0, 2.8); g.add(pole);
    siren = new THREE.Group(); siren.position.set(-3.4, 4.4, 2.8); g.add(siren);
    siren.add(mesh(new THREE.SphereGeometry(0.42, 12, 8), glow(0xff3b2e)));
    const cone = mesh(new THREE.ConeGeometry(0.5, 2.6, 12, 1, true).rotateZ(Math.PI / 2).translate(1.3, 0, 0), new THREE.MeshBasicMaterial({ color: 0xff6a4a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    cone.castShadow = false; siren.add(cone);
    const truck = new THREE.Group(); truck.position.set(3.6, 0, -1.8); truck.rotation.set(0, 0.5, 0.12);
    const cab = B(1.4, 1.4, 1.6, C.blue, 0.4); cab.position.x = 1.6; truck.add(cab);
    truck.add(B(2.6, 1.8, 1.7, C.cream, 0.4));
    for (const [x, z] of [[-0.8, 0.85], [1.6, 0.85], [-0.8, -0.85], [1.6, -0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12).rotateX(Math.PI / 2), toon(C.dark)); w.position.set(x, 0.4, z); truck.add(w); }
    g.add(truck);
    smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshToonMaterial({ color: 0x5a5a66, gradientMap: grad, transparent: true, opacity: 0.75 }), 10);
    g.add(smoke);
    anchor('d-raw', siren, [0, 0.9, 0]);
    anchor('d-raw-mismatch', crates1[3].m, [0, 0.9, 0]);
    anchor('d-raw-blocked', truck, [0.4, 2.8, 0]);
  }

  // 2 · Clean: a tidy warehouse, ordered stacks, a forklift on its rounds
  let forklift;
  {
    const g = L[2];
    const wh = B(6, 3, 4, C.cream); wh.position.set(1, 0, 1.4); g.add(wh);
    const roof = mesh(new THREE.CylinderGeometry(2.2, 2.2, 6.2, 3, 1).rotateZ(Math.PI / 2).scale(1, 0.55, 1).translate(0, 3.6, 0), toon(C.blue, { flat: true })); roof.position.set(1, 0, 1.4); g.add(roof);
    const door = B(2, 2.2, 0.1, C.dark); door.position.set(0, 0, -0.62); g.add(door);
    let gold = null;
    for (let i = 0; i < 4; i++) for (let l = 0; l < 3; l++) {
      const isGold = (i === 2 && l === 2) || (i === 0 && l === 1);
      const c = B(0.9, 0.9, 0.9, isGold ? C.gold : C.orange); c.position.set(-4 + i * 1.05, l * 0.92, -2.6); g.add(c);
      if (isGold && !gold) gold = c;
    }
    forklift = new THREE.Group(); g.add(forklift);
    forklift.add(B(1, 0.7, 1.4, C.yellow, 0.25));
    const mastF = B(0.1, 1.8, 0.8, C.dark, 0.2); mastF.position.z = 0.8; forklift.add(mastF);
    const forkBox = B(0.8, 0.8, 0.8, C.orange, 0.3); forkBox.position.set(0, 0, 1.2); forklift.add(forkBox);
    const booth = B(1.4, 1.8, 1.4, C.teal); booth.position.set(-3.2, 0, 1.6); g.add(booth);
    const sign = mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 20), toon(C.dark)); sign.position.set(-3.2, 2.6, 1.6); g.add(sign);
    const handle = CY(0.06, 0.06, 0.7, C.red, 5); handle.position.set(-2.85, 1.85, 1.6); handle.rotation.z = 0.7; g.add(handle);
    anchor('d-clean-method', sign, [0, 0.8, 0]);
    anchor('d-clean-tool', gold, [0, 1.6, 0]);
  }

  // 3 · Model: a star plaza with eight towers and a fountain
  let fountain;
  {
    const g = L[3];
    const star = (Rr, inner) => { const s = new THREE.Shape(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8 + Math.PI / 2, rr = i % 2 ? Rr * inner : Rr; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return s; };
    g.add(mesh(new THREE.ExtrudeGeometry(star(5.6, 0.7), { depth: 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2), toon(C.white)));
    g.add(mesh(new THREE.ExtrudeGeometry(star(3.8, 0.7), { depth: 0.12, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 0.3, 0), toon(C.teal)));
    g.add(CY(1.1, 1.3, 0.7, C.navy, 8).translateY(0.3));
    fountain = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshToonMaterial({ color: 0x9fe0ff, gradientMap: grad }), 24);
    fountain.position.y = 1; g.add(fountain);
    const tc = [C.red, C.orange, C.yellow, C.teal, C.blue, C.purple, C.pink, C.olive];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 4, x = Math.cos(a) * 4.9, z = -Math.sin(a) * 4.9, h = 1.8 + (i % 2) * 0.7;
      const tw = CY(0.42, 0.5, h, C.cream, 8); tw.position.set(x, 0.3, z); g.add(tw);
      const cap = mesh(new THREE.ConeGeometry(0.62, 1.1, 8).translate(0, h + 0.85, 0), toon(tc[i], { flat: true })); cap.position.set(x, 0.3, z); g.add(cap);
      anchor(`d-sys-${i}`, g, [x, h + 1.9, z]);
    }
  }

  // 4 · Consolidate: a refinery tank fed by six nodding pumpjacks
  const pumps = [];
  {
    const g = L[4];
    g.add(CY(2, 2, 3.6, C.cream, 16));
    g.add(mesh(new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 3.6, 0), toon(C.white)));
    g.add(CY(2.05, 2.05, 0.5, C.red, 16).translateY(2.4));
    const ladder = B(0.1, 4, 0.5, C.dark); ladder.position.set(2.05, 0, 0); g.add(ladder);
    anchor('d-shone', g, [0, 6.6, 0]);
    TASKS.forEach(([, d], e) => {
      const a = (e / 6) * Math.PI * 2 + 0.4, x = Math.cos(a) * 5.6, z = Math.sin(a) * 5.6;
      const pj = new THREE.Group(); pj.position.set(x, 0, z); pj.rotation.y = -a; g.add(pj);
      pj.add(B(2.4, 0.3, 0.9, C.dark));
      for (const s of [-1, 1]) { const legA = B(0.12, 1.9, 0.12, C.grey); legA.position.set(0, 0.3, s * 0.32); legA.rotation.x = s * 0.15; pj.add(legA); }
      const beam = new THREE.Group(); beam.position.y = 2.1; pj.add(beam);
      const bar = B(2.6, 0.22, 0.22, [C.orange, C.yellow, C.teal, C.red, C.blue, C.purple][e], -0.11); bar.position.x = 0.3; beam.add(bar);
      const head = B(0.3, 0.8, 0.5, C.dark, -0.6); head.position.x = 1.6; beam.add(head);
      pumps.push(beam);
      const pipe = mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x * 0.82, 0.25, z * 0.82), new THREE.Vector3(x * 0.6, 1.4, z * 0.6), new THREE.Vector3(x * 0.38, 0.9, z * 0.38)), 12, 0.13, 6), toon(C.grey));
      g.add(pipe);
      anchor(d, pj, [0, 3.4, 0]);
    });
  }

  // 5 · Report: a small city whose windows light up at dusk
  {
    const g = L[5];
    const wc = document.createElement('canvas'); wc.width = 64; wc.height = 64;
    const wg = wc.getContext('2d'); wg.fillStyle = '#000'; wg.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { wg.fillStyle = (x + y * 3) % 5 === 0 ? '#000' : '#ffcf7a'; wg.fillRect(4 + x * 15, 4 + y * 15, 9, 9); }
    const wtex = new THREE.CanvasTexture(wc); wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.colorSpace = THREE.SRGBColorSpace;
    const gold = { '5,0': 0, '3,1': 1, '1,2': 2, '4,3': 3 };
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const h = 1 + 5.4 * ((i + (3 - j) * 0.6) / (5 + 1.8)) + (R() - 0.5) * 0.8, gi = gold[`${i},${j}`];
      const t = wtex.clone(); t.repeat.set(1, Math.max(1, Math.round(h / 1.1)));
      const mat = new THREE.MeshToonMaterial({ color: gi !== undefined ? C.gold : [C.cream, C.blue, C.white, C.teal][(i + j) % 4], gradientMap: grad, emissive: 0xffcf7a, emissiveMap: t, emissiveIntensity: 0 });
      glowMats.push(mat);
      const b = mesh(new THREE.BoxGeometry(1.15, Math.max(0.8, h), 1.15).translate(0, Math.max(0.8, h) / 2, 0), mat);
      b.position.set((i - 2.5) * 1.55, 0, (j - 1.5) * 1.55 + 0.6); g.add(b);
      if (gi !== undefined) anchor(METRICS[gi][1], b, [0, Math.max(0.8, h) + 0.5, 0]);
    }
    const bb = new THREE.Group(); bb.position.set(-4.4, 0, -3.2); bb.rotation.y = FACE;
    for (const x of [-1.8, 1.8]) { const p = CY(0.08, 0.1, 2, C.dark, 6); p.position.x = x; bb.add(p); }
    const face = mesh(new THREE.PlaneGeometry(4.6, 1.5), new THREE.MeshToonMaterial({ map: textTex([['GÉANT ELECTRONICS', `800 92px ${fontFam}`, 0.48], ['DATA ANALYST & ERP SUPPORT · 2025', '500 26px "IBM Plex Mono", monospace', 0.84]], { w: 1024, h: 320, band: '#f2a541' }), gradientMap: grad, side: THREE.DoubleSide }));
    face.position.y = 2.6; bb.add(face); g.add(bb);
    anchor('d-geant', bb, [0, 3.7, 0]);
  }

  // 6 · Build: a site with three floors, a crane, and three little shops
  let crane;
  {
    const g = L[6];
    LAYERS.slice().reverse().forEach(([, d], l) => {
      const y = l * 1.8;
      const slab = B(5, 0.3, 3.6, [C.orange, C.teal, C.cream][l]); slab.position.set(0, y, 0.6); g.add(slab);
      if (l < 2) for (const [x, z] of [[-2.3, -1.1], [2.3, -1.1], [-2.3, 2.3], [2.3, 2.3]]) { const c = B(0.2, 1.5, 0.2, C.white); c.position.set(x, y + 0.3, z); g.add(c); }
      anchor(d, slab, [-2.5, 0.6, -1.2]);
    });
    const mast = B(0.4, 8.5, 0.4, C.yellow); mast.position.set(3.6, 0, 2.6); g.add(mast);
    crane = new THREE.Group(); crane.position.set(3.6, 8.5, 2.6); g.add(crane);
    const jib = B(7, 0.32, 0.32, C.yellow); jib.position.x = -2.2; crane.add(jib);
    const cw = B(1, 0.7, 0.7, C.dark); cw.position.x = 1.8; crane.add(cw);
    const cable = CY(0.03, 0.03, 3.2, C.dark, 4); cable.position.set(-4.6, -3.2, 0); crane.add(cable);
    const load = B(0.7, 0.5, 0.7, C.red); load.position.set(-4.6, -3.7, 0); crane.add(load);
    anchor('d-team', crane, [0, 1.1, 0]);
    const shopCol = [[C.olive, '#8a9a3c'], [C.pink, '#e4572e'], [C.purple, '#7e57c2']];
    PROJECTS_D.forEach(([name, d], i) => {
      const sh = new THREE.Group(); sh.position.set(-4.8 + i * 3.2, 0, -3.6); sh.rotation.y = -0.2; g.add(sh);
      sh.add(B(2.4, 1.6, 1.8, C.cream));
      const aw = mesh(new THREE.BoxGeometry(2.6, 0.12, 0.8).translate(0, 1.7, -1.1), toon(shopCol[i][0])); aw.rotation.x = -0.25; sh.add(aw);
      const sg = mesh(new THREE.PlaneGeometry(2.3, 0.6), new THREE.MeshToonMaterial({ map: textTex([[name.toUpperCase(), `800 ${name.length > 12 ? 60 : 84}px ${fontFam}`, 0.55]], { w: 768, h: 200, bg: '#fdf6e3', color: shopCol[i][1] }), gradientMap: grad }));
      sg.position.set(0, 2.05, -0.92); sg.rotation.y = Math.PI; sh.add(sg);
      anchor(d, sh, [0, 2.8, 0]);
    });
  }

  // 7 · Decide: an airfield with a plane that takes off, a signpost home, a poster
  let plane, poster, posterMat;
  {
    const g = L[7];
    g.add(B(13, 0.06, 2.2, C.dark).translateX(0).translateZ(-0.6));
    for (let i = -5; i <= 5; i += 1.6) { const s = B(0.8, 0.07, 0.14, C.white); s.position.set(i, 0, -0.6); g.add(s); }
    const twr = CY(0.6, 0.8, 4.4, C.cream, 8); twr.position.set(-4.2, 0, 2.6); g.add(twr);
    const cabin = CY(1.1, 0.9, 1, C.teal, 8); cabin.position.set(-4.2, 4.4, 2.6); g.add(cabin);
    const dish = mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, 1.0).rotateX(-0.9).translate(0, 1.2, 0), toon(C.white)); dish.position.set(4.6, 0, 3); g.add(dish);
    plane = new THREE.Group(); g.add(plane);
    plane.add(mesh(new THREE.CapsuleGeometry(0.35, 2.2, 4, 8).rotateZ(Math.PI / 2), toon(C.white)));
    plane.add(B(0.6, 0.08, 3.4, C.red, -0.04));
    const tail = B(0.5, 0.8, 0.08, C.red); tail.position.x = -1.2; plane.add(tail);
    const post = new THREE.Group(); post.position.set(1.6, 0, 3.2); g.add(post);
    post.add(CY(0.1, 0.12, 4, C.dark, 6));
    ['PARIS', 'BERLIN', 'DUBAI', 'DOHA', 'BEIJING'].forEach((city, i) => {
      const a = mesh(new THREE.BoxGeometry(2, 0.42, 0.08), [toon(C.cream), toon(C.cream), toon(C.cream), toon(C.cream), new THREE.MeshToonMaterial({ map: textTex([[city, `800 64px ${fontFam}`, 0.55]], { w: 320, h: 80, bg: '#fdf6e3', color: '#173f5f' }), gradientMap: grad }), toon(C.cream)]);
      a.position.set(0.8, 1.6 + i * 0.5, 0); a.geometry.translate(0, 0, 0);
      const holder = new THREE.Group(); holder.rotation.y = i * 1.1 - 1.4; holder.add(a); post.add(holder);
    });
    const home = mesh(new THREE.SphereGeometry(0.3, 10, 8), glow(0xe4572e)); home.position.y = 4.2; post.add(home);
    anchor('d-home', post, [0, 4.8, 0]);
    posterMat = new THREE.MeshToonMaterial({ gradientMap: grad, side: THREE.DoubleSide });
    poster = mesh(new THREE.PlaneGeometry(4.4, 3.3), posterMat); poster.position.set(-1.5, 3.4, 4.2); poster.rotation.y = FACE; g.add(poster);
    for (const x of [-2, 2]) { const p = CY(0.08, 0.1, 1.9, C.dark, 6); p.position.set(-1.5 + x * Math.cos(FACE), 0, 4.2 - x * Math.sin(FACE)); g.add(p); }
  }

  // milestone signposts along the road
  const miles = MILESTONES.map(([st], i) => {
    const n = new THREE.Vector3(), t = new THREE.Vector3(), r = new THREE.Vector3(); frame(st, n, t, r);
    const d = n.clone().addScaledVector(r, -0.07).normalize();
    const g = new THREE.Group(); placeAt(g, d, t, -0.05);
    g.add(CY(0.07, 0.09, 2.2, C.dark, 5));
    const fl = mesh(new THREE.BoxGeometry(0.9, 0.5, 0.06).translate(0.45, 2.1, 0), toon(i % 2 ? C.orange : C.teal)); g.add(fl);
    scene.add(g); return g;
  });

  // ---------- rover ----------
  const rover = new THREE.Group(); scene.add(rover);
  const body = new THREE.Group(); rover.add(body);
  body.add(B(1.5, 0.6, 2.2, C.orange, 0.35));
  const cab = B(1.2, 0.6, 1, C.cream, 0.95); cab.position.z = -0.3; body.add(cab);
  const ant = CY(0.03, 0.03, 1.2, C.dark, 4); ant.position.set(0.5, 1, -0.6); body.add(ant);
  const flag = mesh(new THREE.PlaneGeometry(0.5, 0.3).translate(0.25, 0, 0), new THREE.MeshToonMaterial({ color: C.red, gradientMap: grad, side: THREE.DoubleSide })); flag.position.set(0.5, 2.05, -0.6); body.add(flag);
  const headMat = glow(0xfff0b0);
  for (const x of [-0.5, 0.5]) { const hl = mesh(new THREE.BoxGeometry(0.3, 0.18, 0.08), headMat); hl.position.set(x, 0.75, 1.12); body.add(hl); }
  const wheels = [];
  for (const [x, z] of [[-0.8, 0.75], [0.8, 0.75], [-0.8, -0.75], [0.8, -0.75]]) { const w = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12).rotateZ(Math.PI / 2), toon(C.dark)); w.position.set(x, 0.36, z); rover.add(w); wheels.push(w); }
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.25, 0), new THREE.MeshToonMaterial({ color: 0xe9d8a6, gradientMap: grad, transparent: true, opacity: 0.8 }), 24);
  scene.add(dust);
  const puffs = Array.from({ length: 24 }, () => ({ p: new THREE.Vector3(), t0: -99, n: new THREE.Vector3() }));
  let puffI = 0, lastPuff = 0;

  // ---------- sky, stars, lights ----------
  const skyU = { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uNight: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uZenith, uHorizon, uSun, uSunDir, uUp; uniform float uNight; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = dot(d, uUp);
        vec3 c = mix(uHorizon, uZenith, smoothstep(-0.05, 0.65, h));
        float s = max(dot(d, uSunDir), 0.0);
        c += uSun*(pow(s, 900.0)*2.5 + pow(s, 14.0)*0.35*(1.0 - uNight*0.6));
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  sky.frustumCulled = false; scene.add(sky);
  const stars = (() => {
    const n = 1600, p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize().multiplyScalar(560); p.set(v.toArray(), i * 3); s[i] = R(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uNight: { value: 0 }, uTime: { value: 0 } },
      vertexShader: 'attribute float aS; uniform float uTime; varying float vA; void main(){ vA = (0.3 + aS*0.7)*(0.75 + 0.25*sin(uTime*2.0 + aS*40.0)); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_PointSize = 1.0 + aS*2.2; }',
      fragmentShader: 'uniform float uNight; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.97, 0.9)*smoothstep(0.5, 0.0, d)*vA*uNight, 1.0); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return m;
  })();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.2);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = shadows;
  if (shadows) { sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.05; }
  scene.add(hemi, sun, sun.target);

  scene.updateMatrixWorld(true);
  // ---------- poster art ----------
  const photo = await loadPhoto(meURL);
  const texCache = new Map();
  const posterTex = (key) => { const k = key || ''; if (!texCache.has(k)) { const t = new THREE.CanvasTexture(glyphCanvas(key, 'halftone', photo, fontFam)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(k, t); } return texCache.get(k); };
  posterMat.map = posterTex(null); posterMat.needsUpdate = true;
  let shownKey = null, flipT = 1, pendingKey = null;

  // ---------- state ----------
  let rt = null, mobile = innerWidth / innerHeight < 0.9;
  const n0 = new THREE.Vector3(), t0 = new THREE.Vector3(), r0 = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), camR = new THREE.Vector3();
  const roverN = new THREE.Vector3(), roverF = new THREE.Vector3(), lastRoverPos = new THREE.Vector3();
  const drive = { on: false, pos: new THREE.Vector3(), fwd: new THREE.Vector3(), speed: 0, keys: {}, camP: new THREE.Vector3(), camL: new THREE.Vector3(), visited: new Set(), last: -1 };
  const sphere = new THREE.Sphere(new THREE.Vector3(), RP + 0.4), ray = new THREE.Raycaster(), hit = new THREE.Vector3();
  const todC = { z: new THREE.Color(), h: new THREE.Color(), sun: new THREE.Color(), sky: new THREE.Color(), gr: new THREE.Color() };
  const cA = new THREE.Color(), cB = new THREE.Color();
  let night = 0, wheelSpin = 0, repairedSent = false;
  const lerpHex = (out, a, b, f) => out.copy(cA.setHex(a)).lerp(cB.setHex(b), f);

  function orient(obj, n, f) {
    const x = new THREE.Vector3().crossVectors(n, f).normalize();
    const z = new THREE.Vector3().crossVectors(x, n).normalize();
    basis.makeBasis(x, n, z); obj.quaternion.setFromRotationMatrix(basis);
  }
  function setTimeOfDay(s, camUp) {
    const k = Math.floor(clamp(s, 0, 6.999)), f = ease(clamp(s, 0, 7) - k), a = TOD[k], b = TOD[Math.min(7, k + 1)];
    lerpHex(skyU.uZenith.value, a.z, b.z, f); lerpHex(skyU.uHorizon.value, a.h, b.h, f); lerpHex(skyU.uSun.value, a.sun, b.sun, f);
    lerpHex(hemi.color, a.sky, b.sky, f); lerpHex(hemi.groundColor, a.gr, b.gr, f);
    const el = a.el + (b.el - a.el) * f;
    sun.intensity = a.si + (b.si - a.si) * f; hemi.intensity = a.hi + (b.hi - a.hi) * f;
    sun.color.copy(skyU.uSun.value);
    night = a.night + (b.night - a.night) * f;
    skyU.uNight.value = night; stars.uniforms.uNight.value = night;
    skyU.uUp.value.copy(camUp);
    // the sun sits ahead and to the right of the road, at the elevation of the hour
    const dir = tmp2.copy(t0).multiplyScalar(0.55).addScaledVector(r0, 0.85).normalize().multiplyScalar(Math.cos(el)).addScaledVector(camUp, Math.sin(el)).normalize();
    skyU.uSunDir.value.copy(dir);
    glowMats.forEach((m) => (m.emissiveIntensity = 0.15 + night * 1.6));
    return dir;
  }

  function landmarkCenter(k, out) { return L[k].localToWorld(out.set(0, 2.6, 0)); }

  return {
    id: 'planet', camera, fovKick: 5, drivable: true,
    post: { conv: 1, grain: 0.02, vig: 0.3, ab: 0.0012, grid: 0, light: 0, tilt: 0.38 },
    up: new THREE.Vector3(0, 1, 0),
    pose(stage, P, Lk) {
      if (drive.on) { P.copy(drive.camP); Lk.copy(drive.camL); this.up.copy(drive.pos); return mobile ? 64 : 52; }
      const s = clamp(stage, 0, 7);
      frame(s, n0, t0, r0);
      const p = tmp.copy(n0).multiplyScalar(ROAD);
      const k = Math.round(s), hold = 1 - sstep(0.08, 0.42, Math.abs(s - k));
      const tP = p.clone().addScaledVector(n0, 7.4).addScaledVector(t0, -13.5);
      const tL = p.clone().addScaledVector(t0, 9).addScaledVector(n0, 1.2);
      const hP = p.clone().addScaledVector(n0, 9.6).addScaledVector(t0, -13).addScaledVector(r0, -5.5);
      const hL = landmarkCenter(k, new THREE.Vector3());
      P.lerpVectors(tP, hP, hold); Lk.lerpVectors(tL, hL, hold);
      if (mobile) { P.sub(Lk).multiplyScalar(1.45).add(Lk); Lk.addScaledVector(n0, -2.2); }
      else { camR.subVectors(Lk, P).cross(n0).normalize(); const sh = P.distanceTo(Lk) * 0.13; P.addScaledVector(camR, -sh); Lk.addScaledVector(camR, -sh); }
      this.up.copy(n0);
      return mobile ? 62 : 50;
    },
    focusDist() { return mobile ? 14 : 10; },
    anchor(d, t, out) { const a = anchors[d]; if (!a) return null; out.copy(a.local); return a.obj.localToWorld(out); },
    milestone(i, out) { return miles[i].localToWorld(out.set(0, 2.6, 0)); },
    shock(x, y, t) {
      ray.setFromCamera({ x, y }, camera);
      if (!ray.ray.intersectSphere(sphere, hit)) return;
      for (let i = 0; i < 8; i++) { const p = puffs[puffI++ % puffs.length]; p.t0 = t + i * 0.03; p.n.copy(hit).normalize(); p.p.copy(hit).addScaledVector(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), 1.5); }
      const lp = L[1].worldToLocal(hit.clone());
      crates1.forEach((c) => { if (Math.hypot(c.chaosP.x - lp.x, c.chaosP.z - lp.z) < 3.5) c.r = 1; });
    },
    setDrive(on, stage) {
      drive.on = on;
      if (on) {
        frame(clamp(stage, 0, 7), n0, t0, r0);
        drive.pos.copy(n0); drive.fwd.copy(t0); drive.speed = 0;
        drive.camP.copy(n0).multiplyScalar(ROAD + 6).addScaledVector(t0, -11); drive.camL.copy(n0).multiplyScalar(ROAD).addScaledVector(t0, 6);
      }
    },
    driveKeys: drive.keys,
    get driving() { return drive.on; },
    driveSpeed() { return drive.on ? drive.speed / 16 : 0; },
    nightLevel() { return night; },
    resize(w, h, pr) {
      mobile = w / h < 0.9;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (rt) rt.dispose();
      rt = new THREE.WebGLRenderTarget(Math.round(w * pr), Math.round(h * pr), { samples: tier >= 2 ? 4 : 2, type: THREE.HalfFloatType });
    },
    quality(q) { if (q >= 2) { sun.castShadow = false; } },
    update(c) {
      const { dt, time, stage, mouse, mouseActive, glyphKey } = c;
      // rover: scripted along the road, or driven
      if (drive.on) {
        const K = c.driveKeys || drive.keys;
        const thr = (K.up ? 1 : 0) - (K.down ? 1 : 0), steer = (K.left ? 1 : 0) - (K.right ? 1 : 0);
        drive.speed += (thr * 15 - drive.speed * 1.3) * dt;
        drive.speed = clamp(drive.speed, -6, 16);
        const turn = steer * dt * 1.8 * clamp(Math.abs(drive.speed) / 5, 0, 1) * Math.sign(drive.speed || 1);
        drive.fwd.applyAxisAngle(drive.pos, turn);
        drive.pos.addScaledVector(drive.fwd, (drive.speed * dt) / RP).normalize();
        drive.fwd.addScaledVector(drive.pos, -drive.fwd.dot(drive.pos)).normalize();
        LMpos.forEach((l, k) => {
          const ang = Math.acos(Math.min(1, drive.pos.dot(l)));
          if (ang < 0.12) { tmp.copy(drive.pos).sub(l).addScaledVector(drive.pos, -tmp.dot(drive.pos)).normalize(); drive.pos.addScaledVector(tmp, (0.12 - ang) * 0.6).normalize(); drive.speed *= 0.6; }
          if (ang < 0.24 && drive.last !== k) { drive.last = k; drive.visited.add(k); env.onLandmark?.(k, drive.visited.size); }
        });
        roverN.copy(drive.pos); roverF.copy(drive.fwd);
        const h = Math.max(heightAt(roverN), RP + 0.15);
        rover.position.copy(roverN).multiplyScalar(h + 0.04);
        const cp = tmp.copy(roverN).multiplyScalar(h + 5.6).addScaledVector(roverF, -10.5);
        const cl = tmp2.copy(roverN).multiplyScalar(h + 1.2).addScaledVector(roverF, 6);
        drive.camP.lerp(cp, Math.min(1, dt * 4)); drive.camL.lerp(cl, Math.min(1, dt * 5));
        body.rotation.z = -steer * clamp(drive.speed / 16, -1, 1) * 0.12;
      } else {
        const s = clamp(stage, 0, 7);
        frame(s, roverN, roverF, r0);
        rover.position.copy(roverN).multiplyScalar(ROAD);
        body.rotation.z = 0;
      }
      orient(rover, roverN, roverF);
      const moved = rover.position.distanceTo(lastRoverPos); lastRoverPos.copy(rover.position);
      wheelSpin += moved / 0.36 * (drive.on && drive.speed < 0 ? -1 : 1);
      wheels.forEach((w) => (w.rotation.x = wheelSpin));
      body.position.y = Math.sin(time * 9) * 0.02 * Math.min(1, moved * 20);
      flag.rotation.y = Math.sin(time * 6) * 0.4;
      if (moved > 0.02 && time - lastPuff > 0.06) { lastPuff = time; const p = puffs[puffI++ % puffs.length]; p.t0 = time; p.n.copy(roverN); p.p.copy(rover.position).addScaledVector(roverF, -1.3).addScaledVector(roverN, 0.3); }
      puffs.forEach((p, i) => { const k = (time - p.t0) / 0.9; if (k < 0 || k > 1) { dummy.scale.setScalar(0); } else { dummy.position.copy(p.p).addScaledVector(p.n, k * 0.9); dummy.scale.setScalar(Math.sin(k * Math.PI) * 1.1); } dummy.updateMatrix(); dust.setMatrixAt(i, dummy.matrix); });
      dust.instanceMatrix.needsUpdate = true;

      // sky and light follow the hour of the story
      const sTod = drive.on ? clamp(stage, 0, 7) : clamp(stage, 0, 7);
      if (drive.on) { t0.copy(roverF); r0.crossVectors(roverF, roverN).normalize(); }
      const camUp = tmp.copy(camera.position).normalize();
      const sd = setTimeOfDay(sTod, camUp);
      sun.target.position.copy(rover.position);
      sun.position.copy(rover.position).addScaledVector(sd, 60);
      stars.uniforms.uTime.value = time;

      // animated life
      clouds(time);
      if (beacon0) beacon0.material.emissiveIntensity = (Math.sin(time * 4) > 0 ? 1.6 : 0.1);
      if (siren) siren.rotation.y = time * 3;
      if (smoke) { for (let i = 0; i < 10; i++) { const k = (time * 0.35 + i / 10) % 1; dummy.position.set(-3.4 + Math.sin(i * 3 + time) * 0.3 * k, 4.6 + k * 4, 2.8 + Math.cos(i * 2) * 0.3 * k); dummy.scale.setScalar(0.4 + k * 1.4 * (1 - k * 0.5)); dummy.updateMatrix(); smoke.setMatrixAt(i, dummy.matrix); } smoke.instanceMatrix.needsUpdate = true; }
      if (forklift) { const ph = time * 0.4; forklift.position.set(-2.5 + Math.sin(ph) * 1.6, 0, -1.2); forklift.rotation.y = Math.cos(ph) > 0 ? Math.PI / 2 : -Math.PI / 2; }
      if (fountain) { for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, k = (time * 0.8 + (i % 4) / 4) % 1; dummy.position.set(Math.cos(a) * k * 1.1, 1.2 + Math.sin(k * Math.PI) * 1.4, Math.sin(a) * k * 1.1); dummy.scale.setScalar(1); dummy.updateMatrix(); fountain.setMatrixAt(i, dummy.matrix); } fountain.instanceMatrix.needsUpdate = true; }
      pumps.forEach((b, i) => (b.rotation.z = Math.sin(time * 1.7 + i) * 0.32));
      if (crane) crane.rotation.y = Math.sin(time * 0.3) * 0.9;
      if (plane) {
        const k = (time / 14) % 1;
        if (k < 0.62) {
          const roll = clamp(k / 0.38, 0, 1), climb = clamp((k - 0.38) / 0.24, 0, 1);
          plane.visible = true;
          plane.position.set(-6 + roll * roll * 9 + climb * 9, 0.45 + climb * climb * 7, -0.6);
          plane.rotation.set(0, 0, climb * 0.35); plane.scale.setScalar(1 - Math.max(0, climb - 0.7) * 3);
        } else plane.visible = false;
      }
      // the raw yard: the cursor (or a tap) straightens the crates
      if (Math.abs(stage - 1) < 1.3) {
        let lp = null;
        if (mouseActive) { ray.setFromCamera(mouse, camera); if (ray.ray.intersectSphere(sphere, hit)) lp = L[1].worldToLocal(hit.clone()); }
        let done = 0;
        crates1.forEach((cr) => {
          const near = lp && Math.hypot(cr.chaosP.x - lp.x, cr.chaosP.z - lp.z) < 2.6;
          cr.r = clamp(cr.r + (near ? dt * 2.6 : -dt * 0.08), 0, 1);
          const e = ease(cr.r); if (e > 0.85) done++;
          cr.m.position.lerpVectors(cr.chaosP, cr.orderP, e);
          cr.m.quaternion.slerpQuaternions(cr.chaosQ, cr.orderQ, e);
          if (cr.bad) cr.m.material.color.setHex(C.red).lerp(cA.setHex(C.orange), e);
        });
        if (!repairedSent && done > crates1.length * 0.7) { repairedSent = true; env.achieve?.('repair'); }
      }
      // poster flips to what you hover
      const want = stage > 6.6 ? glyphKey || null : null;
      if (want !== shownKey && flipT >= 1) { pendingKey = want; flipT = 0; }
      if (flipT < 1) { flipT = Math.min(1, flipT + dt * 3.2); if (flipT >= 0.5 && pendingKey !== shownKey) { shownKey = pendingKey; posterMat.map = posterTex(shownKey); posterMat.needsUpdate = true; } poster.scale.x = Math.max(0.02, Math.abs(Math.cos(flipT * Math.PI))); }
      scene.updateMatrixWorld();
    },
    render() {
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      return rt.texture;
    },
    labelMute() { return 0; },
    scene,
  };
}
