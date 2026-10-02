import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The Desk, built from primitives and canvas textures: a sunlit office cut open like an architect's model.
// Units are metres. The back wall (window, certificates, corkboard) is at z = -2.2, the left wall (bookshelf) at x = -3.

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
export function canvas(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function grain(g, w, h, base, dark, planks = 0) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    const y = rnd() * h, a = 0.05 + rnd() * 0.12, wav = 2 + rnd() * 5;
    g.strokeStyle = `rgba(${dark},${a})`; g.lineWidth = 0.6 + rnd() * 2.2; g.beginPath();
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.006 + i) * wav + Math.sin(x * 0.03 + i * 3) * 1.2);
    g.stroke();
  }
  for (let i = 0; i < 6; i++) { const x = rnd() * w, y = rnd() * h; g.strokeStyle = `rgba(${dark},0.25)`; g.lineWidth = 1.5; for (let r = 4; r < 22; r += 4) { g.beginPath(); g.ellipse(x, y, r * 2.6, r * 0.7, 0, 0, Math.PI * 2); g.stroke(); } }
  if (planks) { g.fillStyle = `rgba(${dark},0.55)`; for (let y = 0; y < h; y += h / planks) { g.fillRect(0, y, w, 3); const off = rnd() * w; g.fillRect(off, y, 3, h / planks); } }
}

// ---------- textures ----------
export function makeTextures(photo) {
  const T = {};
  T.desk = canvas(1024, 512, (g, w, h) => grain(g, w, h, '#6b4126', '40,20,8'));
  T.floor = canvas(1024, 1024, (g, w, h) => grain(g, w, h, '#9c6b40', '60,32,12', 8));
  T.floor.wrapS = T.floor.wrapT = THREE.RepeatWrapping; T.floor.repeat.set(2, 2);
  T.shelf = canvas(512, 256, (g, w, h) => grain(g, w, h, '#7a4a2a', '40,20,8'));
  T.plaster = canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '120,100,70'},${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  });
  T.plaster.wrapS = T.plaster.wrapT = THREE.RepeatWrapping; T.plaster.repeat.set(3, 2);
  T.wainscot = canvas(512, 256, (g, w, h) => {
    g.fillStyle = '#244634'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 3, 0, 2, h); }
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 1, 3); }
  });
  T.wainscot.wrapS = THREE.RepeatWrapping; T.wainscot.repeat.set(4, 1);
  T.cork = canvas(512, 384, (g, w, h) => {
    g.fillStyle = '#b98a57'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '90,55,25' : '230,190,140'},${0.15 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 2, 0, Math.PI * 2); g.fill(); }
  });
  // a Berber rug: diamonds and zigzags in madder red, saffron and indigo on wool
  T.rug = canvas(1024, 768, (g, w, h) => {
    g.fillStyle = '#efe3c8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a3322a'; g.fillRect(0, 0, w, 54); g.fillRect(0, h - 54, w, 54);
    const dia = (x, y, s, c, f = true) => { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.7, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.7, y); g.closePath(); if (f) { g.fillStyle = c; g.fill(); } else { g.strokeStyle = c; g.lineWidth = 8; g.stroke(); } };
    for (let x = 90; x < w; x += 170) { dia(x, h / 2, 150, '#a3322a', false); dia(x, h / 2, 96, '#2b3d6b', false); dia(x, h / 2, 40, '#d9a23c'); }
    g.strokeStyle = '#2b3d6b'; g.lineWidth = 7;
    for (const y of [92, h - 92]) { g.beginPath(); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + ((x / 32) % 2 ? -14 : 14)); g.stroke(); }
    for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '60,30,10'},${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 2, 3); }
  });
  // the view through the window: a late-afternoon plateau with the Bibans range behind
  T.view = canvas(1024, 640, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#8fbbe0'); sky.addColorStop(0.6, '#cfe0e8'); sky.addColorStop(1, '#f6e2bd');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,240,210,0.9)'; g.beginPath(); g.arc(w * 0.18, h * 0.42, 34, 0, Math.PI * 2); g.fill();
    const ridge = (y0, amp, col, f) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 - amp * (0.5 + 0.3 * Math.sin(x * f + y0) + 0.2 * Math.sin(x * f * 3.1 + 1))); g.lineTo(w, h); g.fill(); };
    ridge(h * 0.6, 110, '#a7b4c2', 0.006); ridge(h * 0.66, 70, '#9a9f8f', 0.011); ridge(h * 0.74, 40, '#b49a6c', 0.017);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, bw = 30 + rnd() * 60, bh = 20 + rnd() * 46, y = h * 0.8 - bh + rnd() * 30;
      g.fillStyle = ['#f3ede0', '#e9dcc4', '#ddd0b6'][i % 3]; g.fillRect(x, y, bw, bh + 80);
      g.fillStyle = 'rgba(90,70,50,0.45)'; for (let k = 0; k < 3; k++) g.fillRect(x + 6 + k * bw / 3.2, y + 10, 7, 9);
    }
    g.fillStyle = '#efe6d4'; g.fillRect(w * 0.7, h * 0.46, 22, 140); g.fillRect(w * 0.7 - 6, h * 0.46, 34, 12); g.beginPath(); g.arc(w * 0.7 + 11, h * 0.46, 13, Math.PI, 0); g.fill();
    for (let i = 0; i < 9; i++) { const x = rnd() * w, s = 0.6 + rnd() * 0.7; g.fillStyle = '#4c5f32'; g.beginPath(); g.ellipse(x, h * 0.86, 16 * s, 42 * s, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#c9a874'; g.fillRect(0, h * 0.9, w, h * 0.1);
  });
  T.photo = canvas(512, 600, (g, w, h) => {
    g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h);
    if (photo) { const s = Math.min(photo.width, photo.height); g.filter = 'sepia(0.25) contrast(1.05)'; g.drawImage(photo, (photo.width - s) / 2, (photo.height - s) / 2, s, s, 30, 30, w - 60, w - 60); g.filter = 'none'; }
    g.fillStyle = '#2a2a33'; g.font = 'italic 700 34px "Courier Prime", monospace'; g.textAlign = 'center'; g.fillText('Abdelkrim, BBA', w / 2, h - 32);
  });
  T.map = canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#efe4c9'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,70,50,0.15)'; for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    const DZ = [[-1.7, 35.1], [0.0, 35.9], [2.0, 36.6], [3.5, 36.8], [5.5, 36.8], [7.5, 37.0], [8.6, 36.9], [8.3, 35.2], [7.6, 33.5], [9.0, 32.1], [9.5, 30.2], [10.0, 29.0], [9.8, 27.0], [10.3, 24.6], [11.9, 23.5], [9.5, 21.9], [7.5, 20.6], [5.8, 19.4], [3.2, 19.1], [1.2, 20.7], [-4.8, 25.0], [-8.7, 27.3], [-8.7, 28.7], [-6.0, 29.6], [-3.6, 30.4], [-2.2, 32.0], [-1.2, 32.7], [-1.7, 35.1]];
    const P = ([lo, la]) => [70 + (lo + 9) * 17.6, 40 + (37.5 - la) * 23];
    g.fillStyle = '#d9c39a'; g.strokeStyle = '#6b4a2b'; g.lineWidth = 4; g.beginPath(); DZ.forEach((p, i) => (i ? g.lineTo(...P(p)) : g.moveTo(...P(p)))); g.fill(); g.stroke();
    g.fillStyle = '#5a7d9a'; g.globalAlpha = 0.25; g.fillRect(0, 0, w, P([0, 37.2])[1]); g.globalAlpha = 1;
    const [bx, by] = P([4.76, 36.07]);
    g.fillStyle = '#b4302a'; g.beginPath(); g.arc(bx, by, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2a33'; g.font = '700 26px "Courier Prime", monospace'; g.fillText('BBA', bx + 14, by + 26);
    g.font = '700 46px "Courier Prime", monospace'; g.fillText('ALGERIA', 150, 330);
  });
  T.view.colorSpace = THREE.SRGBColorSpace;
  return T;
}

export function noteTex(lines, color = '#f6d96b') {
  return canvas(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#1f2a44'; g.font = '700 34px "Courier Prime", monospace';
    lines.forEach((l, i) => g.fillText(l, 22, 80 + i * 44));
  });
}
export function spineTex(label, sub, bg, fg) {
  return canvas(128, 512, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 40, w, 8); g.fillRect(0, h - 48, w, 8);
    g.save(); g.translate(w / 2 + 12, h / 2); g.rotate(-Math.PI / 2);
    g.fillStyle = fg; g.textAlign = 'center'; g.font = `700 ${label.length > 8 ? 40 : 50}px "Courier Prime", monospace`; g.fillText(label, 0, 0);
    g.globalAlpha = 0.7; g.font = '400 22px "Courier Prime", monospace'; g.fillText(sub, 0, -40); g.restore();
  });
}
export function certTex(code, title, sub) {
  return canvas(512, 384, (g, w, h) => {
    g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b08a3a'; g.lineWidth = 10; g.strokeRect(18, 18, w - 36, h - 36); g.lineWidth = 2; g.strokeRect(34, 34, w - 68, h - 68);
    g.fillStyle = '#1f3a2c'; g.textAlign = 'center';
    g.font = '400 22px "Courier Prime", monospace'; g.fillText('SAP CERTIFIED', w / 2, 86);
    g.font = `700 ${code.length > 8 ? 46 : 66}px "Courier Prime", monospace`; g.fillText(code, w / 2, 172);
    g.font = '700 24px "Courier Prime", monospace'; g.fillText(title, w / 2, 222);
    g.font = '400 20px "Courier Prime", monospace'; g.fillText(sub, w / 2, 254);
    g.fillStyle = '#b08a3a'; g.beginPath(); g.arc(w / 2, 310, 22, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fbf8ef'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, 310, 14, 0, Math.PI * 2); g.stroke();
  });
}
export function floppyTex(name, sub, color) {
  return canvas(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4efe2'; g.fillRect(26, 120, w - 52, 116);
    g.fillStyle = '#b4302a'; g.fillRect(26, 120, w - 52, 10);
    g.fillStyle = '#1b1b22'; g.font = '700 38px "Courier Prime", monospace'; g.fillText(name, 40, 178);
    g.font = '400 20px "Courier Prime", monospace'; g.fillText(sub, 40, 212);
    g.fillStyle = '#b8bec6'; g.fillRect(70, 0, 116, 90); g.fillStyle = '#7d848c'; g.fillRect(140, 14, 26, 62);
  });
}

// ---------- geometry batching ----------
export class Batch {
  constructor() { this.map = new Map(); }
  add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(m);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
    return this;
  }
  box(mat, pos, size, rot) { return this.add(new THREE.BoxGeometry(...size), mat, pos, rot); }
  build(parent, cast = true, receive = true) {
    for (const [mat, list] of this.map) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); }
    this.map.clear();
  }
}
export const rbox = (w, h, d, r = 0.01, s = 2) => new RoundedBoxGeometry(w, h, d, s, r);
export const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
export function mesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; return m; }
