import * as THREE from 'three';
import { STAGES, TASKS, METRICS, PROJECTS_D, LAYERS, MILESTONES, HOME, CITIES, latLon } from '../content.js';
import { glyphCanvas, loadPhoto } from './glyphs.js';

// Daylight · The Paper Atlas. A pop-up book laid out on a table: each chapter is a card whose
// paper pieces fold up, drop in or grow as you slide sideways onto it, and fold away as you leave.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const backOut = (x) => { const t = clamp(x, 0, 1), s = 1.6; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const SP = 36, AZ = -0.62, EL = 0.6;
const COL = {
  table: 0xe9eae3, card: 0xdcd8ca, paper: 0xf7f5ee, kraft: 0xcfb589, kraftD: 0xb39762, saffron: 0xd08a22, indigo: 0x2c3c68,
  red: 0xbf432d, olive: 0x7f8d3d, teal: 0x2f6f8c, ink: 0x141a2e, gold: 0xe0a42e,
};
const UP = new THREE.Vector3(0, 1, 0);

function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export async function createPaper(env) {
  const { renderer, small, coarse, reduced, fontFam, meURL } = env;
  const R = rng(42);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.table);
  scene.fog = new THREE.Fog(COL.table, 90, 200);
  const camera = new THREE.PerspectiveCamera(22, innerWidth / innerHeight, 1, 700);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xc9bfa6, 1.45);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
  sun.castShadow = true;
  const sm = small || coarse ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);

  // ---------- materials ----------
  const matCache = new Map();
  const mat = (c) => { if (!matCache.has(c)) matCache.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); return matCache.get(c); };
  const edgeMat = new THREE.LineBasicMaterial({ color: COL.ink, transparent: true, opacity: 0.72 });
  function solid(geo, color, o = {}) {
    const m = new THREE.Mesh(geo, o.material || mat(color));
    m.castShadow = o.cast !== false; m.receiveShadow = true;
    if (o.edges !== false) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, o.angle ?? 24), edgeMat); e.raycast = () => {}; m.add(e); }
    return m;
  }
  const box = (w, h, d, c, o) => { const g = new THREE.BoxGeometry(w, h, d); if (!o?.centered) g.translate(0, h / 2, 0); return solid(g, c, o); };
  function textTex(lines, o = {}) {
    const W = o.w || 512, H = o.h || 256;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
    if (o.band) { g.fillStyle = o.band; g.fillRect(0, 0, W, H * 0.16); }
    g.fillStyle = o.color || '#141a2e'; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    lines.forEach(([txt, font, y]) => { g.font = font; g.fillText(txt, o.align === 'left' ? 30 : W / 2, y * H); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  // ---------- the table ----------
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#e9eae3'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '120,110,90' : '255,255,255'},${0.05 + R() * 0.07})`; g.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1); }
    g.fillStyle = 'rgba(20,26,46,0.16)';
    for (let x = 0; x < 256; x += 32) for (let y = 0; y < 256; y += 32) g.fillRect(x, y, 2, 2);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 30); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(1500, 500), new THREE.MeshLambertMaterial({ map: t }));
    table.rotation.x = -Math.PI / 2; table.position.set(120, -0.32, 0); table.receiveShadow = true;
    scene.add(table);
  }

  // ---------- islands ----------
  const islands = [], anchors = {};
  function island(k) {
    const group = new THREE.Group(); group.position.set(k * SP, 0, 0); scene.add(group);
    const isl = { k, group, pieces: [] };
    const card = box(28, 0.3, 20, COL.card, { cast: false }); card.position.y = -0.3; card.rotation.y = (R() - 0.5) * 0.05; group.add(card);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshLambertMaterial({ map: textTex([[`${String(k).padStart(2, '0')} · ${STAGES[k]}`, '600 84px "IBM Plex Mono", monospace', 0.5]], { w: 512, h: 128 }), transparent: true }));
    tag.rotation.x = -Math.PI / 2; tag.position.set(-9.2, 0.02, 8.4); tag.receiveShadow = true; group.add(tag);
    islands.push(isl);
    return isl;
  }
  function piece(isl, obj, x, z, o = {}) {
    const pivot = new THREE.Group(); pivot.rotation.order = 'YXZ'; pivot.position.set(x, o.y || 0, z); if (o.ry) pivot.rotation.y = o.ry;
    pivot.add(obj); isl.group.add(pivot);
    const p = { pivot, obj, mode: o.mode || 'fold', delay: o.delay ?? Math.min(0.55, Math.hypot(x, z) / 22), base: pivot.position.clone(), baseRy: pivot.rotation.y, hop: -99, amp: 0, tilt: o.tilt ?? (R() - 0.5) * 2 };
    isl.pieces.push(p);
    return p;
  }
  const anchor = (d, obj, local) => (anchors[d] = { obj, local: new THREE.Vector3(...local) });
  const faceCam = AZ; // pieces that should face the viewer

  // 0 · Signal: paper letters standing on the table
  {
    const isl = island(0);
    const fills = ['#2c3c68', '#2c3c68', '#2c3c68', '#bf432d', '#2c3c68', '#d08a22']; let fi = 0;
    const letterTex = (ch) => {
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 200;
      const g = cv.getContext('2d'); g.font = `800 188px ${fontFam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = '#f7f5ee'; g.strokeText(ch, 80, 108); g.fillStyle = fills[(fi++) % fills.length]; g.fillText(ch, 80, 108);
      g.lineWidth = 3; g.strokeStyle = '#141a2e'; g.strokeText(ch, 80, 108);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    };
    const rowDir = new THREE.Vector3(Math.cos(faceCam), 0, -Math.sin(faceCam));
    const viewDir = new THREE.Vector3(Math.sin(faceCam), 0, Math.cos(faceCam));
    [['ABDELKRIM', -2.8], ['GHEBOULI', 2.6]].forEach(([word, depth], row) => {
      [...word].forEach((ch, i) => {
        const g = new THREE.PlaneGeometry(2.3, 2.9); g.translate(0, 1.45, 0);
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: letterTex(ch), alphaTest: 0.5, side: THREE.DoubleSide }));
        m.castShadow = true; m.receiveShadow = true;
        const off = (i - (word.length - 1) / 2) * 1.95;
        const pos = rowDir.clone().multiplyScalar(off).addScaledVector(viewDir, depth);
        piece(isl, m, pos.x, pos.z, { ry: faceCam, delay: 0.05 + i * 0.045 + row * 0.18 });
      });
    });
    const s = new THREE.Shape(); s.moveTo(0, -0.7); s.lineTo(3.2, -0.7); s.lineTo(3.2, -1.6); s.lineTo(5.4, 0); s.lineTo(3.2, 1.6); s.lineTo(3.2, 0.7); s.lineTo(0, 0.7); s.closePath();
    const ag = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false }); ag.rotateX(-Math.PI / 2);
    piece(isl, solid(ag, COL.saffron), 7, 7, { mode: 'pop', delay: 0.6 });
  }

  // 1 · Raw: boxes rain down into a corrupted pile, a stopped conveyor
  const rawBoxes = [];
  {
    const isl = island(1);
    for (let i = 0; i < 28; i++) {
      const s = 1.15 + R() * 0.85, bad = i % 3 === 0;
      const m = box(s, s, s, bad ? COL.red : COL.kraft, { centered: true, material: bad ? new THREE.MeshLambertMaterial({ color: COL.red, flatShading: true }) : undefined });
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 7;
      const chaosP = new THREE.Vector3(Math.cos(a) * r - 1, s / 2 + (R() < 0.3 ? 1.4 : 0), Math.sin(a) * r * 0.75 - 1);
      const chaosQ = new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 1.1, R() * 6.28, (R() - 0.5) * 1.1));
      const col = i % 7, rowi = Math.floor(i / 7);
      const orderP = new THREE.Vector3(-7 + col * 2.3, s / 2, -4.5 + rowi * 2.4), orderQ = new THREE.Quaternion();
      m.position.copy(chaosP); m.quaternion.copy(chaosQ);
      piece(isl, m, 0, 0, { mode: 'drop', delay: R() * 0.5, tilt: 0 });
      rawBoxes.push({ m, chaosP, chaosQ, orderP, orderQ, r: 0, bad, s });
    }
    const belt = new THREE.Group();
    const frame = box(10, 0.6, 1.8, COL.indigo); frame.position.y = 0.9; belt.add(frame);
    for (let i = 0; i < 4; i++) { const leg = box(0.3, 0.9, 0.3, COL.indigo); leg.position.set(-4.4 + i * 2.9, 0, 0.6); belt.add(leg); }
    const post = box(0.18, 3.6, 0.18, COL.ink); post.position.set(5.6, 0, 0); belt.add(post);
    const signG = new THREE.CylinderGeometry(0.85, 0.85, 0.16, 8); signG.rotateX(Math.PI / 2); signG.rotateZ(Math.PI / 8);
    const sign = solid(signG, COL.red); sign.position.set(5.6, 3.9, 0); belt.add(sign);
    piece(isl, belt, -4.5, 7, { ry: 0.1, delay: 0.35 });
    anchor('d-raw', isl.group, [-1, 6.5, -1]);
    anchor('d-raw-mismatch', rawBoxes[3].m, [0, rawBoxes[3].s / 2 + 0.3, 0]);
    anchor('d-raw-blocked', sign, [0, 1.1, 0]);
  }

  // 2 · Clean: shelves of ordered stock, a ledger under a magnifier
  let magnifier;
  {
    const isl = island(2);
    const rack = (x, golds) => {
      const g = new THREE.Group();
      for (const [px, pz] of [[-4.3, -1], [4.3, -1], [-4.3, 1], [4.3, 1]]) { const p = box(0.26, 6.2, 0.26, COL.indigo); p.position.set(px, 0, pz); g.add(p); }
      let goldBox = null;
      for (let l = 0; l < 3; l++) {
        const sh = box(9, 0.2, 2.3, COL.paper); sh.position.y = 0.15 + l * 2.05; g.add(sh);
        for (let i = 0; i < 6; i++) {
          const gold = golds.includes(l * 6 + i);
          const b = box(1.15, 1.15, 1.15, gold ? COL.gold : COL.kraft); b.position.set(-3.5 + i * 1.4, 0.35 + l * 2.05, 0); g.add(b);
          if (gold && !goldBox) goldBox = b;
        }
      }
      piece(isl, g, x, -3.6, { delay: x < 0 ? 0.1 : 0.25 });
      return goldBox;
    };
    rack(-5.6, [8]);
    const gb = rack(5.6, [3, 14]);
    const lect = new THREE.Group();
    const stand = box(1.4, 2.4, 1.2, COL.kraftD); lect.add(stand);
    for (const s of [-1, 1]) { const pg = box(2.2, 0.14, 3, COL.paper); pg.position.set(s * 1.08, 2.42, 0); pg.rotation.z = -s * 0.16; lect.add(pg); }
    piece(isl, lect, -1.5, 5, { ry: faceCam, delay: 0.4 });
    magnifier = new THREE.Group();
    const ring = solid(new THREE.TorusGeometry(1.1, 0.14, 8, 28), COL.ink); magnifier.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28), new THREE.MeshLambertMaterial({ color: 0xbfe0ea, transparent: true, opacity: 0.45 })); magnifier.add(lens);
    const hg = new THREE.CylinderGeometry(0.16, 0.2, 2.2, 8); hg.translate(0, -2.2, 0); const handle = solid(hg, COL.saffron); magnifier.add(handle);
    magnifier.rotation.set(-1.1, 0, 0.4); magnifier.position.set(0, 4.4, 0);
    piece(isl, magnifier, -1.5, 5, { mode: 'pop', delay: 0.55 });
    anchor('d-clean-method', magnifier, [0, 1.4, 0]);
    anchor('d-clean-tool', gb, [0, 1.6, 0]);
  }

  // 3 · Model: an eight-pointed star courtyard with eight pillars
  let fountainTop;
  {
    const isl = island(3);
    const starShape = (Rr) => { const s = new THREE.Shape(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8 + Math.PI / 2; const r = i % 2 ? Rr * 0.765 : Rr; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; };
    const sg = new THREE.ExtrudeGeometry(starShape(8.6), { depth: 0.5, bevelEnabled: false }); sg.rotateX(-Math.PI / 2);
    piece(isl, solid(sg, COL.paper), 0, 0, { mode: 'pop', delay: 0 });
    const ig = new THREE.ExtrudeGeometry(starShape(6.0), { depth: 0.2, bevelEnabled: false }); ig.rotateX(-Math.PI / 2); ig.translate(0, 0.5, 0);
    piece(isl, solid(ig, COL.teal), 0, 0, { mode: 'pop', delay: 0.12 });
    const f = new THREE.Group();
    const basin = solid(new THREE.CylinderGeometry(1.7, 1.9, 1.1, 8).translate(0, 0.55, 0), COL.indigo); f.add(basin);
    fountainTop = solid(new THREE.CylinderGeometry(0.5, 0.7, 1.8, 8).translate(0, 0.9, 0), COL.saffron); fountainTop.position.y = 1.1; f.add(fountainTop);
    piece(isl, f, 0, 0, { mode: 'pop', delay: 0.25, y: 0.7 });
    const cols = [COL.saffron, COL.indigo, COL.teal, COL.red, COL.olive, COL.kraftD, COL.indigo, COL.saffron];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 4, r = 7.4;
      const h = 2.6 + (i % 2) * 0.9;
      const p = new THREE.Group();
      const shaft = box(0.95, h, 0.95, cols[i]); p.add(shaft);
      const capG = new THREE.ConeGeometry(0.85, 1.1, 4); capG.rotateY(Math.PI / 4); capG.translate(0, h + 0.55, 0); p.add(solid(capG, COL.paper));
      piece(isl, p, Math.cos(a) * r, -Math.sin(a) * r, { y: 0.5, delay: 0.3 + i * 0.03 });
      anchor(`d-sys-${i}`, p, [0, h + 1.5, 0]);
    }
  }

  // 4 · Consolidate: six derricks piping into one refinery tank
  const flows = [];
  let packets;
  {
    const isl = island(4);
    const tank = new THREE.Group();
    const body = solid(new THREE.CylinderGeometry(2.5, 2.5, 4.4, 16).translate(0, 2.2, 0), COL.olive, { angle: 40 }); tank.add(body);
    const dome = solid(new THREE.SphereGeometry(2.5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 4.4, 0), COL.paper, { angle: 30 }); tank.add(dome);
    const band = solid(new THREE.CylinderGeometry(2.56, 2.56, 0.5, 16).translate(0, 3.2, 0), COL.saffron, { angle: 40 }); tank.add(band);
    piece(isl, tank, 0, 0, { mode: 'grow', delay: 0 });
    anchor('d-shone', tank, [0, 7.4, 0]);
    TASKS.forEach(([, d], e) => {
      const a = (e / 6) * Math.PI * 2 + 0.4, r = 8.6;
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.78;
      const der = new THREE.Group();
      const tg = new THREE.CylinderGeometry(0.28, 1.15, 4.6, 4); tg.rotateY(Math.PI / 4); tg.translate(0, 2.3, 0); der.add(solid(tg, COL.kraft));
      const head = box(1.1, 0.7, 1.1, COL.indigo); head.position.y = 4.6; der.add(head);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7).translate(0.6, 0, 0), new THREE.MeshLambertMaterial({ color: [COL.saffron, COL.red, COL.teal, COL.olive, COL.indigo, COL.gold][e], side: THREE.DoubleSide }));
      fl.position.set(0, 5.9, 0); der.add(fl);
      const flp = box(0.07, 1.2, 0.07, COL.ink); flp.position.y = 5.3; der.add(flp);
      piece(isl, der, x, z, { delay: 0.25 + e * 0.05 });
      anchor(d, der, [0, 6.6, 0]);
      const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x * 0.88, 0.5, z * 0.88), new THREE.Vector3(x * 0.55, 3.4, z * 0.55), new THREE.Vector3(x * 0.27, 2.2, z * 0.27));
      const tube = solid(new THREE.TubeGeometry(c, 16, 0.22, 6, false), COL.paper, { angle: 50 });
      piece(isl, tube, 0, 0, { mode: 'pop', delay: 0.4 + e * 0.04 });
      flows.push(c);
    });
    packets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: COL.saffron }), flows.length * 4);
    packets.castShadow = true;
    isl.group.add(packets);
    isl.packets = packets;
  }

  // 5 · Report: a city of bars with four gold towers and a sign
  {
    const isl = island(5);
    const gold = { '5,0': 0, '3,1': 1, '1,2': 2, '4,3': 3 };
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const h = 1.2 + 7.2 * ((i + (3 - j) * 0.6) / (5 + 1.8)) + (R() - 0.5) * 1.2;
      const gi = gold[`${i},${j}`];
      const c = gi !== undefined ? COL.gold : (i + j) % 3 === 0 ? COL.indigo : COL.paper;
      const b = box(1.9, Math.max(0.8, h), 1.9, c);
      const x = (i - 2.5) * 2.9, z = (j - 1.5) * 2.9 - 1.5;
      piece(isl, b, x, z, { mode: 'grow', delay: 0.05 + i * 0.06 + j * 0.03 });
      if (gi !== undefined) anchor(METRICS[gi][1], b, [0, Math.max(0.8, h) + 0.6, 0]);
    }
    const sg = new THREE.Group();
    const board = box(7.6, 2.2, 0.25, COL.paper); board.position.y = 1.1; sg.add(board);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 1.9), new THREE.MeshLambertMaterial({ map: textTex([['GÉANT ELECTRONICS', `800 120px ${fontFam}`, 0.46], ['DATA ANALYST & ERP SUPPORT · 2025', '500 34px "IBM Plex Mono", monospace', 0.84]], { w: 1024, h: 256, bg: '#f7f5ee', band: '#d08a22' }) }));
    face.position.set(0, 2.2, 0.14); sg.add(face);
    for (const s of [-1, 1]) { const leg = box(0.22, 1.2, 0.22, COL.ink); leg.position.set(s * 3.2, 0, 0); sg.add(leg); }
    piece(isl, sg, -1, 7.6, { ry: faceCam * 0.6, delay: 0.5 });
    sg.children[0].position.y = 1.2; face.position.y = 2.3;
    anchor('d-geant', sg, [0, 3.9, 0]);
  }

  // 6 · Build: a three-storey building under construction, a crane, project signs
  let jib;
  {
    const isl = island(6);
    const slabs = [[0, COL.kraft, 'd-layer-data'], [3.3, COL.teal, 'd-layer-logic'], [6.6, COL.paper, 'd-layer-ui']];
    slabs.forEach(([y, c, d], l) => {
      const g = new THREE.Group();
      const slab = box(11, 0.5, 7.6, c); g.add(slab);
      if (l < 2) for (const [px, pz] of [[-5.1, -3.4], [5.1, -3.4], [-5.1, 3.4], [5.1, 3.4], [0, -3.4], [0, 3.4]]) { const col = box(0.4, 2.8, 0.4, COL.paper); col.position.set(px, 0.5, pz); g.add(col); }
      piece(isl, g, -1.5, -0.8, { mode: 'drop', y, delay: 0.05 + l * 0.18, tilt: 0 });
      anchor(d, g, [-5.5, 0.9, 3.8]);
    });
    const crane = new THREE.Group();
    const mast = box(0.7, 13, 0.7, COL.saffron); crane.add(mast);
    jib = new THREE.Group(); jib.position.y = 13;
    const arm = box(11, 0.55, 0.55, COL.saffron, { centered: true }); arm.position.x = -3.5; jib.add(arm);
    const counter = box(2, 1, 1, COL.ink, { centered: true }); counter.position.x = 2.4; jib.add(counter);
    const cab = box(1.2, 1.2, 1.2, COL.indigo); cab.position.set(0, -1.8, 0.9); crane.add(cab);
    const cable = box(0.06, 4.8, 0.06, COL.ink, { edges: false }); cable.position.set(-7.5, -4.8, 0); jib.add(cable);
    const hook = box(0.8, 0.6, 0.8, COL.red); hook.position.set(-7.5, -5.4, 0); jib.add(hook);
    crane.add(jib);
    piece(isl, crane, 7.8, -4.6, { delay: 0.45 });
    anchor('d-team', crane, [0, 14.4, 0]);
    const pcol = [COL.olive, COL.saffron, COL.indigo];
    PROJECTS_D.forEach(([name, d], i) => {
      const g = new THREE.Group();
      const post = box(0.16, 2.6, 0.16, COL.ink); g.add(post);
      const tex = textTex([[name.toUpperCase(), `800 ${name.length > 12 ? 74 : 104}px ${fontFam}`, 0.56]], { w: 768, h: 256, bg: '#f7f5ee', band: ['#7f8d3d', '#d08a22', '#2c3c68'][i] });
      const brd = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 0.14), [mat(COL.paper), mat(COL.paper), mat(COL.paper), mat(COL.paper), new THREE.MeshLambertMaterial({ map: tex }), mat(COL.paper)]);
      brd.position.y = 3.1; brd.castShadow = true; g.add(brd);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(brd.geometry), edgeMat); brd.add(e);
      void pcol;
      piece(isl, g, -8 + i * 6.6, 7.4, { ry: faceCam * 0.5, delay: 0.55 + i * 0.06 });
      anchor(d, g, [0, 4.3, 0]);
    });
  }

  // 7 · Decide: a folded-paper globe with paper planes, and a notice board
  let globe, planes = [], board, boardMat;
  {
    const isl = island(7);
    const stand = new THREE.Group();
    const base = solid(new THREE.CylinderGeometry(1.6, 2.1, 0.6, 10).translate(0, 0.3, 0), COL.indigo); stand.add(base);
    const rod = box(0.25, 2.2, 0.25, COL.ink); rod.position.y = 0.6; stand.add(rod);
    const arcG = new THREE.TorusGeometry(5.0, 0.13, 6, 40, Math.PI); arcG.rotateZ(-Math.PI / 2); arcG.translate(0, 7.6, 0);
    stand.add(solid(arcG, COL.saffron));
    globe = new THREE.Group(); globe.position.y = 7.6;
    const sph = solid(new THREE.IcosahedronGeometry(4.3, 2), COL.paper, { angle: 8 }); globe.add(sph);
    const hp = new THREE.Vector3(...latLon(...HOME, 4.35));
    const pin = solid(new THREE.ConeGeometry(0.35, 1.1, 6).rotateX(Math.PI).translate(0, 0.55, 0), COL.red);
    pin.position.copy(hp); pin.quaternion.setFromUnitVectors(UP, hp.clone().normalize()); globe.add(pin);
    const pinHead = solid(new THREE.SphereGeometry(0.4, 10, 8), COL.red); pinHead.position.copy(hp.clone().multiplyScalar(1.27)); globe.add(pinHead);
    stand.add(globe);
    piece(isl, stand, 3.5, -1, { mode: 'pop', delay: 0.05 });
    anchor('d-home', pinHead, [0, 0.4, 0]);
    const planeG = new THREE.BufferGeometry();
    planeG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.9, -0.55, 0, -0.6, 0, 0.05, -0.45, 0, 0, 0.9, 0, 0.05, -0.45, 0.55, 0, -0.6, 0, 0, 0.9, 0, -0.28, -0.5, 0, 0.05, -0.45], 3));
    planeG.computeVertexNormals();
    const pm = new THREE.MeshLambertMaterial({ color: COL.paper, side: THREE.DoubleSide, flatShading: true });
    CITIES.slice(0, small ? 4 : 7).forEach((c, i) => {
      const m = new THREE.Mesh(planeG, pm); m.castShadow = true;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(planeG), edgeMat));
      globe.add(m);
      planes.push({ m, a: new THREE.Vector3(...latLon(...HOME, 1)).normalize(), b: new THREE.Vector3(...latLon(...c, 1)).normalize(), ph: i / 7, sp: 0.07 + R() * 0.05 });
    });
    const easel = new THREE.Group();
    for (const [x, rz] of [[-1.6, 0.08], [1.6, -0.08]]) { const l = box(0.22, 6.2, 0.22, COL.kraftD); l.position.x = x; l.rotation.z = rz; easel.add(l); }
    boardMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.8), boardMat); board.position.y = 5.2; board.castShadow = true;
    board.add(new THREE.LineSegments(new THREE.EdgesGeometry(board.geometry), edgeMat));
    easel.add(board);
    piece(isl, easel, -7.4, 2.6, { ry: faceCam, delay: 0.35 });
  }

  // milestone flags between the cards
  const flags = MILESTONES.map(([st], i) => {
    const g = new THREE.Group(); g.position.set(st * SP + 1, 0, 11.5);
    const pole = box(0.12, 3.4, 0.12, COL.ink); g.add(pole);
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(1.6, -0.45); fs.lineTo(0, -0.9); fs.closePath();
    const fl = new THREE.Mesh(new THREE.ShapeGeometry(fs), new THREE.MeshLambertMaterial({ color: i % 2 ? COL.saffron : COL.red, side: THREE.DoubleSide }));
    fl.position.y = 3.4; fl.castShadow = true; g.add(fl);
    scene.add(g);
    return g;
  });

  // click ripples
  const ripples = Array.from({ length: 3 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: COL.ink, transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.05; scene.add(m); return { m, t0: -99 };
  });
  let rippleI = 0;

  // notice-board art
  const photo = await loadPhoto(meURL);
  const texCache = new Map();
  const boardTex = (key) => {
    const k = key || '';
    if (!texCache.has(k)) { const t = new THREE.CanvasTexture(glyphCanvas(key, 'halftone', photo, fontFam)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(k, t); }
    return texCache.get(k);
  };
  boardMat.map = boardTex(null); boardMat.needsUpdate = true;
  let shownKey = null, flipT = 1, pendingKey = null;

  // render target
  let rt = null, mobile = innerWidth / innerHeight < 0.9;
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(UP, 0), hit = new THREE.Vector3(), tmp = new THREE.Vector3(), right = new THREE.Vector3();
  const dummy = new THREE.Object3D(), cRed = new THREE.Color(COL.red), cKraft = new THREE.Color(COL.kraft), wb = new THREE.Vector3();

  function forIsland(stage, fn) { islands.forEach((isl) => { if (Math.abs(stage - isl.k) < 1.2) fn(isl); }); }

  return {
    id: 'day', camera, fovKick: 3,
    post: { conv: 1, grain: 0.035, vig: 0.18, ab: 0.0012, grid: 0, light: 1 },
    pose(stage, P, L) {
      const fr = stage - Math.floor(stage), lift = Math.sin(Math.PI * fr);
      const cx = stage * SP;
      const dist = (mobile ? 78 : 56) + lift * 16;
      const el = EL + lift * 0.14, az = AZ + Math.sin(stage * 0.9) * 0.06;
      L.set(cx, 2.4, 0);
      P.set(cx + Math.sin(az) * Math.cos(el) * dist, 2.4 + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
      tmp.subVectors(L, P).normalize(); right.crossVectors(tmp, UP).normalize();
      if (!mobile) { const s = dist * 0.12; L.addScaledVector(right, -s); P.addScaledVector(right, -s); }
      else { L.y -= dist * 0.12; }
      return mobile ? 30 : 22;
    },
    focusDist() { return mobile ? 30 : 22; },
    anchor(d, t, out) { const a = anchors[d]; if (!a) return null; out.copy(a.local); return a.obj.localToWorld(out); },
    milestone(i, out) { return flags[i].localToWorld(out.set(0, 3.6, 0)); },
    shock(x, y, t, stage) {
      ray.setFromCamera({ x, y }, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const r = ripples[rippleI++ % ripples.length]; r.t0 = t; r.m.position.set(hit.x, 0.05, hit.z);
      forIsland(stage, (isl) => isl.pieces.forEach((p) => {
        p.pivot.getWorldPosition(tmp);
        const d = Math.hypot(tmp.x - hit.x, tmp.z - hit.z);
        if (d < 11) { p.hop = t; p.amp = 1 - d / 11; }
      }));
      if (Math.abs(stage - 1) < 0.5) rawBoxes.forEach((b) => { tmp.copy(b.chaosP).add(islands[1].group.position); if (Math.hypot(tmp.x - hit.x, tmp.z - hit.z) < 5) b.r = 1; });
    },
    resize(w, h, pr) {
      mobile = w / h < 0.9;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (rt) rt.dispose();
      rt = new THREE.WebGLRenderTarget(Math.round(w * pr), Math.round(h * pr), { samples: small || coarse ? 2 : 4, type: THREE.HalfFloatType });
    },
    quality() {},
    update(c) {
      const { dt, time, stage, mouse, mouseActive, glyphKey } = c;
      const cx = stage * SP;
      sun.target.position.set(cx, 0, 0); sun.position.set(cx - 20, 38, 24);
      islands.forEach((isl) => {
        const d = Math.abs(stage - isl.k);
        const vis = d < 1.9; isl.group.visible = vis;
        if (!vis) return;
        const form = reduced ? (d < 1.25 ? 1 : 0) : ease((1.4 - d) / 0.95);
        isl.pieces.forEach((p) => {
          const e = clamp((form * 1.5 - p.delay) / 0.75, 0, 1);
          const pv = p.pivot;
          pv.visible = e > 0.002;
          if (p.mode === 'fold') { pv.rotation.x = -(1 - ease(e)) * Math.PI * 0.49; }
          else if (p.mode === 'grow') { pv.scale.set(1, Math.max(0.002, ease(e)), 1); }
          else if (p.mode === 'pop') { const s = Math.max(0.002, backOut(e)); pv.scale.setScalar(s); }
          else if (p.mode === 'drop') { const k = 1 - ease(e); pv.position.y = p.base.y + k * k * 24; pv.rotation.z = k * p.tilt * 0.6; pv.rotation.x = k * p.tilt * 0.4; }
          const ht = time - p.hop;
          const hy = ht > 0 && ht < 0.9 ? Math.sin((ht / 0.9) * Math.PI) * 1.6 * p.amp * (1 - ht / 0.9) : 0;
          if (p.mode !== 'drop') pv.position.y = p.base.y + hy; else pv.position.y += hy;
        });
      });
      // raw: the cursor repairs the pile
      if (Math.abs(stage - 1) < 1.2) {
        let has = false;
        if (mouseActive) { ray.setFromCamera(mouse, camera); has = !!ray.ray.intersectPlane(plane, hit); if (has) islands[1].group.worldToLocal(hit); }
        rawBoxes.forEach((b) => {
          const near = has && Math.hypot(b.chaosP.x - hit.x, b.chaosP.z - hit.z) < 4.2;
          b.r = clamp(b.r + (near ? dt * 2.6 : -dt * 0.1), 0, 1);
          const e = ease(b.r);
          b.m.position.lerpVectors(b.chaosP, b.orderP, e);
          b.m.quaternion.slerpQuaternions(b.chaosQ, b.orderQ, e);
          if (b.bad) b.m.material.color.copy(cRed).lerp(cKraft, e);
        });
      }
      if (magnifier) { magnifier.position.x = Math.sin(time * 0.8) * 0.9; magnifier.position.z = Math.cos(time * 0.6) * 0.5; }
      if (fountainTop) fountainTop.rotation.y = time * 0.6;
      if (packets && islands[4].group.visible) {
        let n = 0;
        flows.forEach((cv, i) => { for (let j = 0; j < 4; j++) { cv.getPoint((time * 0.22 + j / 4 + i * 0.13) % 1, dummy.position); dummy.updateMatrix(); packets.setMatrixAt(n++, dummy.matrix); } });
        packets.instanceMatrix.needsUpdate = true;
        packets.visible = Math.abs(stage - 4) < 0.6;
      }
      if (jib) jib.rotation.y = Math.sin(time * 0.25) * 0.7;
      if (globe && islands[7].group.visible) {
        globe.rotation.y = -1.2 + Math.sin(time * 0.12) * 0.5;
        planes.forEach((p) => {
          const t = (time * p.sp + p.ph) % 1;
          const om = p.a.angleTo(p.b), s = Math.sin(om);
          const pt = (u) => tmp.copy(p.a).multiplyScalar(Math.sin((1 - u) * om) / s).addScaledVector(p.b, Math.sin(u * om) / s).multiplyScalar(4.6 + Math.sin(u * Math.PI) * 1.6);
          const a = pt(t).clone(), b = pt(Math.min(1, t + 0.01)).clone();
          p.m.position.copy(a); globe.localToWorld(wb.copy(b)); p.m.lookAt(wb); p.m.scale.setScalar(Math.sin(t * Math.PI) * 1.2 + 0.05);
        });
      }
      // notice board flips to show what you hover
      const want = stage > 6.6 ? glyphKey || null : null;
      if (want !== shownKey && flipT >= 1) { pendingKey = want; flipT = 0; }
      if (flipT < 1) {
        flipT = Math.min(1, flipT + dt * 3.2);
        if (flipT >= 0.5 && pendingKey !== shownKey) { shownKey = pendingKey; boardMat.map = boardTex(shownKey); boardMat.needsUpdate = true; }
        board.scale.x = Math.max(0.02, Math.abs(Math.cos(flipT * Math.PI)));
      }
      ripples.forEach((r) => { const k = (time - r.t0) / 1.3; r.m.visible = k >= 0 && k < 1; if (r.m.visible) { r.m.scale.setScalar(0.5 + k * 13); r.m.material.opacity = (1 - k) * 0.55; } });
      scene.updateMatrixWorld();
    },
    render() {
      renderer.setRenderTarget(rt); renderer.setClearColor(COL.table, 1); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      return rt.texture;
    },
    labelMute() { return 0; },
  };
}
