import * as THREE from 'three';
import { Batch, PAL, rnd, pick, tex, limewashTex, stoneTex, cityStoneTex, zelligeTex, woodTex, rugTex, starCookie, signAtlas, paintSign, archedWall, lathe, makeDoor, lanternGeo, pierceTex, codeTex, palmFrondTex } from './medina-build.js';

// The Medina, laid out along one walk. Street level is y = 0; the lower town falls away to the sea in -z.
//   0 gate (0,0) · 1 alley · 2 madrasa courtyard (0,-36) · 3 souk (-7..-35, z -36) · 4 craftsmen street (-35..-56)
//   5 workshop square (-58,-42) · 6 Géant street (x -58, z -46..-64) · 7 riad garden (-58,-77) · 8 rooftop (y 9.6, z -87..-96)
// South-west of the rooftop the ground falls away: the lower town cascades to the harbour, like the Casbah of Algiers.
export const SKILLS = [
  ['SAP BPC', ['d-sys-1', 'd-bpf'], '#ffb347'], ['SAP BW', ['d-sys-2', 'd-bwq', 'd-sec'], '#7fc8ff'], ['S/4HANA', ['d-sys-0'], '#ffd76a'],
  ['SAC', ['d-sys-3'], '#9fe0c0'], ['EPM & AfO', ['d-epm', 'd-afo'], '#ff9a6a'], ['ABAP', ['d-sys-6'], '#c9a2ff'],
  ['Power BI', ['d-sys-4', 'd-m-dash'], '#ffe06a'], ['Cegid PMI', ['d-sys-5'], '#ff7a7a'], ['SQL', ['d-layer-data'], '#8fd3ff'],
  ['Python', ['d-sys-7', 'd-m-flask'], '#a8e66a'], ['Laravel', ['d-layer-logic'], '#ff8f7a'], ['React', ['d-layer-ui'], '#7fe6f0'],
];
export const STREAMS = [['BPF', 'd-bpf'], ['EPM Add-in', 'd-epm'], ['Analysis for Office', 'd-afo'], ['BW queries', 'd-bwq'], ['Security', 'd-sec'], ['Reports', 'd-rep']];
export const CERT_PLAQUES = [['C_SAC', 'Analytics Cloud', 'd-sys-3'], ['TS410', 'S/4HANA', 'd-sys-0'], ['S4C03', 'S/4HANA Cloud', 'd-sys-0'], ['C_ABAPD', 'ABAP Cloud', 'd-sys-6']];

export function buildMedina({ tier, small }) {
  const T = {
    lime: limewashTex(), stone: stoneTex(), city: cityStoneTex(), wood: woodTex(),
    zel: zelligeTex(), zel2: zelligeTex(['#1f7a5a', '#f2efe6', '#1f4fa3', '#e0a422', '#7a2e26']), cookie: starCookie(),
    pierce: pierceTex(), code: codeTex(),
  };
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    plaster: std({ map: T.lime, vertexColors: true, roughness: 0.93 }),
    stone: std({ map: T.stone, vertexColors: true, roughness: 0.82 }),
    city: std({ map: T.city, vertexColors: true, roughness: 0.9 }),
    wood: std({ map: T.wood, vertexColors: true, roughness: 0.72 }),
    zel: std({ map: T.zel, roughness: 0.18, envMapIntensity: 1.1 }),
    zel2: std({ map: T.zel2, roughness: 0.18, envMapIntensity: 1.1 }),
    iron: std({ color: 0x1c1b1f, metalness: 0.6, roughness: 0.45 }),
    brass: std({ color: 0xc8963e, metalness: 1, roughness: 0.32 }),
    lanternShell: std({ color: 0xc8963e, metalness: 1, roughness: 0.34, alphaMap: T.pierce, alphaTest: 0.5, side: THREE.DoubleSide }),
    soil: std({ color: 0x5d7a3a, roughness: 1 }),
    dark: std({ color: 0x15130f, roughness: 1 }),
    leaf: std({ color: 0x4f6b32, roughness: 0.75, side: THREE.DoubleSide }),
    leafDark: std({ color: 0x3a522a, roughness: 0.8, side: THREE.DoubleSide }),
    orange: std({ color: 0xf08a1c, roughness: 0.45 }),
    bloom: std({ color: 0xc8247a, roughness: 0.7, side: THREE.DoubleSide }),
    terracotta: std({ color: 0xa65a35, roughness: 0.85 }),
    glass: std({ color: 0x2d6b3a, metalness: 0.1, roughness: 0.08, transparent: false }),
    gold: std({ color: 0xe0b347, metalness: 1, roughness: 0.18 }),
    screenOff: std({ color: 0x0b0d10, roughness: 0.25 }),
    lampCore: new THREE.MeshBasicMaterial({ toneMapped: true }),
    windowLit: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.8) }),
    windowDark: std({ color: 0x1a1a22, roughness: 0.4 }),
    sea: null,
  };
  const dm0 = new THREE.Object3D();
  const paints = new Map();
  M.paint = (hex) => { if (!paints.has(hex)) paints.set(hex, std({ map: T.wood, color: hex, roughness: 0.62 })); return paints.get(hex); };
  const root = new THREE.Group();
  const zones = Array.from({ length: 9 }, () => { const z = new THREE.Group(); root.add(z); return z; });
  const hot = [];
  const inter = { doors: {}, lanterns: [], streams: [], pigeons: null, cat: null, tvs: null, stock: null, fountain: null, waters: [], laundry: [], windows: [] };
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function hotspot(id, stage, pos, size, label, extra = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), hitMat);
    m.position.set(...pos); m.userData.hot = id; root.add(m);
    const h = { ...extra, id, stage, mesh: m, anchor: new THREE.Vector3(...(extra.anchor || pos)), label };
    hot.push(h);
    return h;
  }

  // ---------- signs: all painted into one atlas ----------
  const F = { arabic: '"Reem Kufi", "Amiri", sans-serif', latin: '"Reem Kufi", sans-serif', naskh: '"Amiri", serif' };
  const SIGNS = [
    { id: 'gate', w: 760, h: 300, draw: (g, x, y, w, h) => {
      g.save(); g.translate(x, y); g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#8a6a3a'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 3; g.strokeRect(26, 26, w - 52, h - 52);
      g.fillStyle = '#1b1a2e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
      g.font = `700 110px ${F.naskh}`; g.fillText('مرحبا', w / 2, 112); g.direction = 'ltr';
      g.font = `700 52px ${F.latin}`; g.fillStyle = '#1f4fa3'; g.fillText('ABDELKRIM GHEBOULI', w / 2, 212);
      g.font = `400 26px ${F.latin}`; g.fillStyle = '#5a4a32'; g.fillText('SAP BPC CONSULTANT · BORDJ BOU ARRERIDJ', w / 2, 256); g.restore(); } },
    { id: 'customs', w: 560, h: 200, draw: paintSign({ bg: '#1d3f7a', fg: '#f6f1e7', accent: '#e0a422', ar: 'مكتب الجمارك', en: 'CUSTOMS OFFICE', frame: true }) },
    { id: 'customs-small', w: 300, h: 120, draw: paintSign({ bg: '#e9dfcb', fg: '#1b1a2e', accent: '#1f4fa3', en: 'TRANSITE BAGHOURA', sub: 'INTERNSHIP · 2021' }) },
    { id: 'uni', w: 560, h: 200, draw: paintSign({ bg: '#f2efe6', fg: '#1f7a5a', accent: '#1b1a2e', ar: 'الجامعة', en: 'THE UNIVERSITY', frame: true }) },
    { id: 'souk', w: 640, h: 200, draw: paintSign({ bg: '#7a2e26', fg: '#f6e7c8', accent: '#e0a422', ar: 'سوق المهارات', en: 'THE SOUK OF SKILLS', frame: true }) },
    { id: 'olive', w: 560, h: 200, draw: paintSign({ bg: '#2f4a22', fg: '#f3e9c7', accent: '#e0b347', ar: 'زيت الزيتون', en: 'OLIVE PALACE', frame: true }) },
    { id: 'latina', w: 560, h: 200, draw: paintSign({ bg: '#1b1a2e', fg: '#f6f1e7', accent: '#e86a8a', ar: 'بوتيك', en: 'LATINADZ', frame: true }) },
    { id: 'jewel', w: 560, h: 200, draw: paintSign({ bg: '#e9dfcb', fg: '#7a4a12', accent: '#1b1a2e', ar: 'مجوهرات', en: 'JEWELRY STORE', frame: true }) },
    { id: 'workshop', w: 560, h: 200, draw: paintSign({ bg: '#6b3a22', fg: '#f6e7c8', accent: '#e0a422', ar: 'ورشة', en: 'THE WORKSHOP', sub: 'DEV GROUP SERVICE', frame: true }) },
    { id: 'geant', w: 800, h: 160, draw: (g, x, y, w, h) => { g.save(); g.translate(x, y); g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b2a6b'; g.fillRect(0, h - 22, w, 22); g.fillStyle = '#1b2a6b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 76px ${F.latin}`; g.fillText('GÉANT ELECTRONICS', w / 2, 66); g.restore(); } },
    { id: 'board', w: 720, h: 400, draw: (g, x, y, w, h) => {
      g.save(); g.translate(x, y);
      g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#22362b'; g.fillRect(16, 16, w - 32, h - 32);
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.035})`; g.beginPath(); g.ellipse(20 + rnd() * (w - 40), 20 + rnd() * (h - 40), 20 + rnd() * 70, 6 + rnd() * 18, rnd() * 3, 0, Math.PI * 2); g.fill(); }
      const chalk = 'rgba(238,236,226,0.92)';
      g.strokeStyle = chalk; g.fillStyle = chalk; g.lineWidth = 3; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.font = `700 30px ${F.latin}`; g.fillText('HOW WE BUILD', 44, 54);
      [['UI', 'React · Vite · JavaFX'], ['LOGIC', 'Laravel · Flask · Java'], ['DATA', 'MySQL · SQL Server']].forEach(([a, b], i) => {
        const yy = 92 + i * 96; g.strokeRect(44, yy, 370, 68);
        g.font = `700 25px ${F.latin}`; g.fillText(a, 62, yy + 22); g.font = `400 21px ${F.latin}`; g.fillText(b, 62, yy + 49);
        if (i < 2) { g.beginPath(); g.moveTo(229, yy + 70); g.lineTo(229, yy + 94); g.moveTo(221, yy + 86); g.lineTo(229, yy + 94); g.lineTo(237, yy + 86); g.stroke(); }
      });
      g.font = `700 17px ${F.latin}`;
      ['TO DO', 'DOING', 'DONE'].forEach((c, i) => {
        const xx = 448 + i * 80; g.fillText(c, xx, 100); if (i) { g.beginPath(); g.moveTo(xx - 10, 86); g.lineTo(xx - 10, 300); g.stroke(); }
        for (let k = 0; k < [3, 2, 4][i]; k++) { g.save(); g.translate(xx + 4 + (k % 2) * 6, 126 + k * 42); g.rotate((rnd() - 0.5) * 0.12); g.fillStyle = ['#f2d34a', '#f29ab0', '#9fd8f0', '#b8e08a'][(i + k) % 4]; g.fillRect(0, 0, 58, 34); g.restore(); }
      });
      g.fillStyle = chalk; g.font = `400 20px ${F.latin}`; g.fillText('4–6 developers · remote', 448, 330); g.fillText('sprints · code review', 448, 358);
      g.restore(); } },
    { id: 'riad', w: 560, h: 200, draw: paintSign({ bg: '#f2efe6', fg: '#1f4fa3', accent: '#1b1a2e', ar: 'رياض', en: 'THE RIAD · SHONE', frame: true }) },
    { id: 'contact', w: 600, h: 300, draw: (g, x, y, w, h) => {
      g.save(); g.translate(x, y); g.fillStyle = '#1f4fa3'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#e0a422'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#f6f1e7'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.font = `700 80px ${F.arabic}`; g.fillText('اتصل بي', w / 2, 86); g.direction = 'ltr';
      g.font = `700 40px ${F.latin}`; g.fillText('LET’S TALK', w / 2, 162); g.font = `400 24px ${F.latin}`; g.fillText('abdelkrimghebouli.34@gmail.com', w / 2, 222); g.restore(); } },
    ...['BACHELOR · 2024', 'MASTER 1 · 2025', 'DALE CARNEGIE', 'SAP YOUNG PROFESSIONALS'].map((t, i) => ({ id: `edu-${i}`, w: 400, h: 160, draw: paintSign({ bg: '#2b2418', fg: '#f3e2b8', accent: '#e0b347', en: t.split(' · ')[0], sub: t.split(' · ')[1] || (i === 2 ? 'CERTIFIED' : 'PROGRAM · 2025'), frame: true }) })),
    ...CERT_PLAQUES.map(([c, t], i) => ({ id: `cert-${i}`, w: 400, h: 160, draw: paintSign({ bg: '#f2efe6', fg: '#1b1a2e', accent: '#1f4fa3', en: c, sub: `SAP CERTIFIED · ${t.toUpperCase()}`, frame: true }) })),
    ...STREAMS.map(([n], i) => ({ id: `stream-${i}`, w: 300, h: 110, draw: paintSign({ bg: '#e9dfcb', fg: '#1f4fa3', accent: '#1b1a2e', en: n.toUpperCase(), frame: false }) })),
  ];
  const atlas = signAtlas(SIGNS, F);
  const signMat = std({ map: atlas.texture, roughness: 0.75 });
  function sign(id, pos, w, h, rotY = 0, zone = 0) {
    const r = atlas.rects[id]; const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * r[2], r[1] + uv.getY(i) * r[3]);
    const m = new THREE.Mesh(g, signMat); m.position.set(...pos); m.rotation.y = rotY; m.castShadow = false; m.receiveShadow = true; zones[zone].add(m);
    return m;
  }

  // ---------- generic pieces ----------
  const B = zones.map(() => new Batch()); // per-zone static batches, so whole zones can be culled
  const W = (z, pos, size, color, rotY = 0) => B[z].box(M.plaster, pos, size, { color, uv: 0.35 }, rotY);
  const floor = (z, x0, x1, z0, z1, y = 0, mat = M.stone, uv = 0.28) => B[z].at(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mat, [(x0 + x1) / 2, y + 0.002, (z0 + z1) / 2], [0, 0, 0], [1, 1, 1], { ao: false, uv, color: '#ffffff' });
  const windowAt = (z, pos, rotY, w = 0.7, h = 0.9, lit = false) => {
    const fr = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1));
    B[z].add(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.06), M.wood, fr, { color: pick(PAL.doors), ao: false, uv: 1 });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? M.windowLit : M.windowDark);
    glass.position.set(...pos); glass.rotation.y = rotY; glass.translateZ(0.035); zones[z].add(glass);
    if (lit) inter.windows.push(glass);
    for (let i = 1; i < 4; i++) { const bar = new THREE.Matrix4().compose(new THREE.Vector3(...pos).add(new THREE.Vector3((i - 2) * w / 4, 0, 0.06).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1)); B[z].add(new THREE.BoxGeometry(0.02, h, 0.02), M.iron, bar, { ao: false, uv: 0 }); }
  };
  // a house: a limewashed block with a door, windows, sometimes an overhanging upper floor on wooden corbels
  function house(z, { x, zc, w, d, h, face, color = pick(PAL.lime), door = true, over = rnd() < 0.4, wins = 2, lit = 0 }) {
    // face: direction the street-facing wall looks: 'x+','x-','z+','z-'
    W(z, [x, h / 2, zc], [w, h, d], color);
    const rot = { 'z+': 0, 'z-': Math.PI, 'x+': Math.PI / 2, 'x-': -Math.PI / 2 }[face];
    const nrm = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    const half = face[0] === 'z' ? d / 2 : w / 2, span = face[0] === 'z' ? w : d;
    const front = new THREE.Vector3(x, 0, zc).addScaledVector(nrm, half);
    const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    if (over && h > 6.5) {
      const ov = 0.55, oh = h - 3.4;
      const c = front.clone().addScaledVector(nrm, ov / 2);
      W(z, [c.x, 3.4 + oh / 2, c.z], face[0] === 'z' ? [span * 0.9, oh, ov] : [ov, oh, span * 0.9], color);
      for (let k = -2; k <= 2; k++) { const p = front.clone().addScaledVector(along, k * span * 0.2).addScaledVector(nrm, 0.25); B[z].at(new THREE.BoxGeometry(0.12, 0.14, 0.55), M.wood, [p.x, 3.32, p.z], [0, rot, 0], [1, 1, 1], { color: '#6b4a2a', ao: false }); }
    }
    for (let i = 0; i < wins; i++) {
      const t = (i + 1) / (wins + 1) - 0.5, p = front.clone().addScaledVector(along, t * span * 0.9).addScaledVector(nrm, over && h > 6.5 ? 0.58 : 0.02);
      windowAt(z, [p.x, Math.min(h - 1.2, 4.6 + (i % 2) * 0.2), p.z], rot, 0.6, 0.8, i < lit);
    }
    if (door) {
      const p = front.clone().addScaledVector(along, (rnd() - 0.5) * span * 0.4).addScaledVector(nrm, 0.04);
      const fr = new THREE.Matrix4().compose(new THREE.Vector3(p.x, 1.1, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(1, 1, 1));
      B[z].add(new THREE.BoxGeometry(1.0, 2.2, 0.08), M.wood, fr, { color: pick(PAL.doors), uv: 1 });
      B[z].add(new THREE.BoxGeometry(1.2, 0.14, 0.14), M.plaster, fr.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.2, 0.05)), { color: '#e0d2b8', ao: false });
      if (rnd() < 0.6) potPlant(z, p.clone().addScaledVector(along, 0.85).addScaledVector(nrm, 0.25));
    }
    // parapet on the roof
    B[z].box(M.plaster, [x, h + 0.25, zc], [w + 0.05, 0.5, d + 0.05], { color, ao: false, uv: 0.35 });
    B[z].box(M.plaster, [x, h + 0.05, zc], [w - 0.4, 0.12, d - 0.4], { color: '#cfc4ae', ao: false, uv: 0.35 });
  }
  const potLeaves = [];
  function potPlant(z, p, s = 1) {
    B[z].at(lathe([[0, 0], [0.16, 0], [0.2, 0.32], [0.23, 0.36], [0, 0.36]], 12), M.terracotta, [p.x, 0, p.z], [0, 0, 0], [s, s, s], { color: '#ffffff', ao: false, uv: 0 });
    potLeaves.push([p.x, 0.36 * s, p.z, 0.32 * s, z]);
  }
  const blooms = [];
  function bougainvillea(z, a, b, n = 160) { for (let i = 0; i < n; i++) { const t = rnd(), p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= Math.pow(rnd(), 1.5) * 2.4 * Math.sin(t * Math.PI); blooms.push([p.x + (rnd() - 0.5) * 0.3, p.y, p.z + (rnd() - 0.5) * 0.3, z]); } }
  const lanterns = []; // {pos, color, skill?}
  function wallLantern(z, p, color = '#ffb35c') { lanterns.push({ p: new THREE.Vector3(...p), color, zone: z, wall: true }); }

  // ================= 0 · the gate =================
  floor(0, -45, 45, 0.8, 34, 0, M.stone, 0.22);
  const wallH = 7.6;
  [[-45, -4.6], [4.6, 45]].forEach(([a, b]) => B[0].box(M.city, [(a + b) / 2, wallH / 2, 0], [b - a, wallH, 1.6], { color: '#f0d9b5', uv: 0.25, aoH: 2 }));
  B[0].at(archedWall(9.2, wallH, 1.6, [{ x: 0, w: 4.2, h: 6.0 }]), M.city, [0, 0, 0], [0, 0, 0], [1, 1, 1], { color: '#f0d9b5', uv: 0.25, aoH: 2 });
  for (let x = -44.2; x <= 44.2; x += 1.7) if (Math.abs(x) > 6) B[0].box(M.city, [x, wallH + 0.45, 0.35], [0.85, 0.9, 0.9], { color: '#e8cfa6', ao: false, uv: 0.25 });
  [-6.2, 6.2].forEach((x) => {
    B[0].box(M.city, [x, 5.5, 0.4], [4, 11, 4], { color: '#f2dcb8', uv: 0.25, aoH: 2.5 });
    for (let k = -1; k <= 1; k++) for (const zz of [-1.6, 2.4]) B[0].box(M.city, [x + k * 1.4, 11.45, zz], [0.8, 0.9, 0.8], { color: '#e8cfa6', ao: false, uv: 0.25 });
    windowAt(0, [x, 7.5, 2.42], 0, 0.35, 0.9);
  });
  // gate doors swung open, a deep arch soffit band, and the plaque
  const gd = makeDoor({ w: 4.1, h: 5.9, color: '#5a3a22', arch: false, double: true, mats: { paint: M.paint, iron: M.iron, brass: M.brass } });
  gd.leaves[0].hinge.rotation.y = -1.45; gd.leaves[1].hinge.rotation.y = 1.45;
  gd.group.position.set(0, 0, -0.75); zones[0].add(gd.group);
  sign('gate', [0, 6.75, 0.83], 3.8, 1.5, 0, 0);
  B[0].box(M.zel, [0, 6.75, 0.8], [4.6, 1.95, 0.04], { ao: false, uv: 0.8 });
  wallLantern(0, [-2.9, 4.2, 1.1]); wallLantern(0, [2.9, 4.2, 1.1]);
  // palms on the square
  const palms = [[-10, 9], [10.5, 8], [-17, 16], [16, 18]];
  // ================= 1 · the alley =================
  floor(1, -2.4, 2.8, -27, 0.6, 0, M.stone, 0.3);
  const alleyL = [[-1.7, -4.5, 6, 8.6], [-1.9, -10, 5, 7.2], [-1.6, -15.5, 6, 9.4], [-1.8, -21.5, 6, 8]]; // x, zc, len, h
  const alleyR = [[2.1, -3.8, 5, 7.8], [2.4, -9, 5.5, 9.2], [2.6, -14.2, 4.6, 7.6], [2.3, -19.5, 5.5, 8.8], [2.0, -24.5, 4, 7]];
  alleyL.forEach(([x, zc, len, h], i) => house(1, { x: x - 3, zc, w: 6, d: len, h, face: 'x+', wins: 2, lit: i % 2, over: i !== 2 }));
  alleyR.forEach(([x, zc, len, h], i) => { if (i === 2) return; house(1, { x: x + 3, zc, w: 6, d: len, h, face: 'x-', wins: 2, lit: (i + 1) % 2 }); });
  // the customs house: a taller front with an arched blue door that opens onto a lit room
  B[1].at(archedWall(4.6, 3.4, 0.5, [{ x: 0, w: 1.6, h: 2.9 }]), M.plaster, [2.62, 0, -14.2], [0, -Math.PI / 2, 0], [1, 1, 1], { color: '#dfe7ee', uv: 0.35 });
  W(1, [2.62, 6.3, -14.2], [0.5, 5.8, 4.6], '#e7ecef');
  W(1, [5.73, 4.6, -16.4], [5.73, 9.2, 0.2], '#e7ecef'); W(1, [5.73, 4.6, -12.0], [5.73, 9.2, 0.2], '#e7ecef'); W(1, [8.5, 4.6, -14.2], [0.2, 9.2, 4.6], '#e7ecef');
  B[1].box(M.plaster, [5.73, 3.05, -14.2], [5.73, 0.2, 4.6], { color: '#d8cdb8', ao: false, uv: 0.35 });
  floor(1, 2.87, 8.4, -16.3, -12.1, 0.01, M.zel2, 0.6);
  const cd = makeDoor({ w: 1.5, h: 2.75, color: '#1f4fa3', arch: true, double: true, mats: { paint: M.paint, iron: M.iron, brass: M.brass } });
  cd.group.position.set(2.75, 0, -14.2); cd.group.rotation.y = -Math.PI / 2; zones[1].add(cd.group);
  inter.doors.customs = { leaves: cd.leaves, open: 0, target: 0 };
  sign('customs', [2.37, 3.65, -14.2], 2.2, 0.78, -Math.PI / 2, 1);
  sign('customs-small', [2.37, 1.75, -15.55], 0.62, 0.25, -Math.PI / 2, 1);
  // the room behind it
  const room = new THREE.Group(); room.position.set(4.6, 0, -14.2); zones[1].add(room);
  B[1].box(M.wood, [4.6, 0.75, -14.2], [1.4, 0.06, 0.8], { color: '#7a4a2a' });
  B[1].box(M.wood, [5.4, 1.2, -14.2], [0.3, 2.4, 3], { color: '#6b4a2a' });
  for (let k = 0; k < 9; k++) B[1].box(M.paint(pick(['#1f4fa3', '#7a2e26', '#2c7a5b', '#e0a422'])), [5.2, 0.6 + Math.floor(k / 3) * 0.6, -15.2 + (k % 3) * 0.7], [0.25, 0.4, 0.12]);
  const roomLight = new THREE.PointLight(0xffb36b, 0, 6, 1.6); roomLight.position.set(4.4, 2.2, -14.2); zones[1].add(roomLight);
  inter.doors.customs.light = roomLight;
  hotspot('customs', 1, [2.7, 1.4, -14.2], [0.5, 2.9, 1.7], 'Customs office · 2021', { anchor: [2.4, 2.9, -14.2] });
  // overhead: a covered passage (sabat) and a laundry line
  W(1, [0.3, 5.6, -26.6], [6.6, 4.6, 3.2], '#efe6d4');
  B[1].at(archedWall(4.8, 3.6, 0.3, [{ x: 0, w: 3.6, h: 3.4 }]), M.plaster, [0.3, 0, -25.1], [0, 0, 0], [1, 1, 1], { color: '#efe6d4', uv: 0.35 });
  inter.laundry.push({ a: new THREE.Vector3(-1.6, 5.4, -7), b: new THREE.Vector3(1.9, 5.6, -7.6), zone: 1 });
  bougainvillea(1, new THREE.Vector3(-1.2, 6.8, -11.5), new THREE.Vector3(-1.3, 6.4, -6.5), 220);
  wallLantern(1, [-1.2, 3.1, -17.5]); wallLantern(1, [1.75, 3.1, -6.0]);
  // a cat asleep on a doorstep
  inter.cat = { pos: new THREE.Vector3(-1.05, 0.02, -18.6) };
  hotspot('cat', 1, [-1.05, 0.25, -18.6], [0.7, 0.5, 0.6], 'A local', { anchor: [-1.05, 0.6, -18.6] });

  // ================= 2 · the university courtyard =================
  const C = { x: 0, z: -36.5, s: 14 };
  floor(2, -7, 7, -43.5, -29.5, 0, M.stone, 0.3);
  B[2].at(new THREE.PlaneGeometry(8.4, 8.4).rotateX(-Math.PI / 2), M.zel, [0, 0.004, C.z], [0, 0, 0], [1, 1, 1], { ao: false, uv: 0.5 });
  // outer walls (2 storeys)
  B[2].at(archedWall(15, 9, 0.8, [{ x: 0, w: 3.2, h: 4.4 }]), M.plaster, [-7.4, 0, C.z], [0, Math.PI / 2, 0], [1, 1, 1], { color: '#f3ecdf', uv: 0.35 }); W(2, [7.4, 4.5, C.z], [0.8, 9, 15], '#efe6d4');
  W(2, [0, 4.5, -44.0], [15.6, 9, 1], '#f5efe4');
  W(2, [-4.6, 4.5, -29.2], [5.6, 9, 0.6], '#f3ecdf'); W(2, [4.6, 4.5, -29.2], [5.6, 9, 0.6], '#f3ecdf'); W(2, [0, 7.2, -29.2], [3.6, 3.6, 0.6], '#f3ecdf');
  // arcades on four sides: three horseshoe arches each, with a gallery behind
  const arc = (pos, rotY, len) => B[2].at(archedWall(len, 4.0, 0.45, [-1, 0, 1].map((k) => ({ x: k * len / 3, w: len / 3 * 0.68, h: 3.3 }))), M.plaster, pos, [0, rotY, 0], [1, 1, 1], { color: '#f6f1e7', uv: 0.35 });
  arc([0, 0, -41.6], 0, 11); arc([-4.8, 0, C.z], Math.PI / 2, 9.6); arc([4.8, 0, C.z], -Math.PI / 2, 9.6);
  [[0, -42.55, 13.6, 'z'], [-5.9, C.z, 13.6, 'x'], [5.9, C.z, 13.6, 'x']].forEach(([x, z, len, ax]) => B[2].box(M.wood, [x, 4.15, z], ax === 'z' ? [len, 0.3, 1.95] : [2.2, 0.3, len], { color: '#7a5030', ao: false }));
  B[2].box(M.zel2, [0, 0.6, -43.45], [13.6, 1.2, 0.04], { ao: false, uv: 0.9 });
  B[2].box(M.zel2, [-6.95, 0.6, C.z], [0.04, 1.2, 13.4], { ao: false, uv: 0.9 });
  for (let i = 0; i < 3; i++) { windowAt(2, [-3.5 + i * 3.5, 6.3, -43.48], 0, 0.8, 1.1, i === 1); windowAt(2, [-6.98, 6.3, -40 + i * 3.4], Math.PI / 2, 0.8, 1.1, i === 0); }
  // the orange tree in a tiled planter
  B[2].box(M.zel2, [0, 0.35, C.z], [1.8, 0.7, 1.8], { ao: false, uv: 1.2 });
  B[2].box(M.stone, [0, 0.72, C.z], [1.9, 0.06, 1.9], { ao: false });
  const orangeTrees = [[0, C.z, 1.0]];
  sign('uni', [0, 7.0, -28.88], 2.4, 0.86, 0, 2);
  // plaques in the west and south galleries: degrees, then certificates
  const plaques = [...[0, 1, 2, 3].map((i) => ({ id: `edu-${i}`, pos: [-6.92, 2.1, -40.2 + i * 2.2], rot: Math.PI / 2 })), ...[0, 1, 2, 3].map((i) => ({ id: `cert-${i}`, pos: [-3.6 + i * 2.4, 2.1, -43.42], rot: 0 }))];
  plaques.forEach((p) => { sign(p.id, p.pos, 1.3, 0.52, p.rot, 2); });
  hotspot('degrees', 2, [-6.75, 2.1, -37.9], [0.4, 0.9, 9], 'Degrees and training', { anchor: [-6.6, 2.7, -38] });
  CERT_PLAQUES.forEach(([c], i) => hotspot(`cert-${i}`, 2, [-3.6 + i * 2.4, 2.1, -43.2], [1.4, 0.7, 0.4], c, { anchor: [-3.6 + i * 2.4, 2.55, -43.2] }));
  wallLantern(2, [-4.8, 3.3, -33]); wallLantern(2, [4.8, 3.3, -33]); wallLantern(2, [0, 3.3, -41.3]);

  // ================= 3 · the souk =================
  const SZ = -36.5, sx0 = -7.8, sx1 = -35;
  floor(3, sx1, sx0, SZ - 2, SZ + 2, 0, M.stone, 0.3);
  for (let x = sx0 - 1.6; x > sx1; x -= 3.2) {
    for (const side of [-1, 1]) {
      const zc = SZ + side * 3.6, c = pick(PAL.lime);
      W(3, [x, 3.0, zc], [3.2, 6.0, 3.2], c);
      // shop opening: a dark recess and goods
      B[3].box(M.dark, [x, 1.2, SZ + side * 2.02], [2.4, 2.4, 0.04], { ao: false, uv: 0 });
      B[3].box(M.wood, [x, 0.45, SZ + side * 2.25], [2.4, 0.9, 0.5], { color: '#7a5030' });
      B[3].box(M.wood, [x, 2.55, SZ + side * 2.5], [2.8, 0.1, 1.0], { color: '#6b4a2a', ao: false });
    }
  }
  // roof of slats: the sun comes through in stripes
  for (let x = sx0 + 0.2; x > sx1; x -= 0.55) B[3].box(M.wood, [x, 4.55, SZ], [0.22, 0.12, 4.4], { color: '#8a6a44', ao: false });
  [-1, 1].forEach((s) => B[3].box(M.wood, [(sx0 + sx1) / 2, 4.42, SZ + s * 2.15], [sx0 - sx1, 0.2, 0.2], { color: '#6b4a2a', ao: false }));
  sign('souk', [sx0 - 0.15, 3.35, SZ], 2.6, 0.82, -Math.PI / 2, 3);
  // goods: spice cones, jars, hanging rugs
  const spice = { cones: [], jars: [], rugs: [] };
  for (let x = sx0 - 1.6, k = 0; x > sx1; x -= 3.2, k++) for (const side of [-1, 1]) {
    const kind = (k * 2 + (side > 0)) % 3;
    if (kind === 0) for (let i = 0; i < 5; i++) spice.cones.push([x - 0.9 + i * 0.45, 0.9, SZ + side * 2.2, pick(['#c2321e', '#e3a51c', '#7a4a1e', '#5f7a2a', '#d4682a', '#a8261a'])]);
    else if (kind === 1) for (let i = 0; i < 6; i++) spice.jars.push([x - 1 + i * 0.4, 0.9, SZ + side * 2.25, pick(['#2f6fa3', '#a65a35', '#1f7a5a', '#e0d2b8'])]);
    else spice.rugs.push([x, 2.0, SZ + side * 2.0, side]);
  }
  // the twelve skill lanterns
  SKILLS.forEach(([name, , color], i) => {
    const p = new THREE.Vector3(sx0 - 2.6 - i * 2.05, 2.62 + (i % 2) * 0.22, SZ + (i % 2 ? 0.38 : -0.38));
    lanterns.push({ p, color, zone: 3, skill: i, chain: 4.45 - p.y });
    hotspot(`lantern-${i}`, 3, [p.x, p.y + 0.3, p.z], [0.6, 0.9, 0.6], name, { anchor: [p.x, p.y - 0.15, p.z] });
  });

  // ================= 4 · the craftsmen's street =================
  const CZ = -36.5, cx0 = -35, cx1 = -56.5;
  floor(4, cx1, cx0, CZ - 2.6, CZ + 2.6, 0, M.stone, 0.3);
  const JX = -50.1;
  for (let x = cx0 - 1.5; x > -52.5; x -= 3.4) for (const side of [-1, 1]) {
    const isShop = (side === 1 && Math.abs(x - -39.0) < 1.8) || (side === -1 && Math.abs(x - -45.8) < 1.8) || (side === 1 && Math.abs(x - JX) < 1.0);
    house(4, { x, zc: CZ + side * 5.6, w: 3.4, d: 6, h: 6 + rnd() * 3.5, face: side > 0 ? 'z-' : 'z+', door: !isShop, wins: 1, lit: rnd() < 0.5 ? 1 : 0, over: false });
  }
  function shop(id, x, side, signId, label) {
    const zf = CZ + side * 2.62;
    B[4].box(M.dark, [x, 1.35, zf - side * 0.02], [2.6, 2.7, 0.04], { ao: false, uv: 0 });
    B[4].box(M.wood, [x, 2.8, zf + side * -0.05], [3.0, 0.16, 0.2], { color: '#5a3a22', ao: false });
    [-1, 1].forEach((k) => B[4].box(M.wood, [x + k * 1.3, 1.35, zf - side * 0.05], [0.12, 2.7, 0.14], { color: '#5a3a22' }));
    sign(signId, [x, 3.35, zf - side * 0.06], 2.3, 0.82, side > 0 ? Math.PI : 0, 4);
    hotspot(id, 4, [x, 1.4, zf - side * 0.4], [2.6, 2.8, 0.8], label, { anchor: [x, 2.95, zf - side * 0.2] });
    const light = new THREE.PointLight(0xffc27a, 1.6, 5, 1.8); light.position.set(x, 2.3, zf - side * 1.2); zones[4].add(light);
    return zf;
  }
  // olive oil: shelves of green bottles and big jars
  const zo = shop('olive', -39.0, 1, 'olive', 'Olive Palace');
  for (let i = 0; i < 3; i++) B[4].box(M.wood, [-39, 0.7 + i * 0.6, zo - 0.25], [2.4, 0.05, 0.4], { color: '#6b4a2a', ao: false });
  [-1, 1].forEach((k) => B[4].box(M.wood, [-39 + k * 1.2, 0.95, zo - 0.25], [0.05, 1.9, 0.4], { color: '#6b4a2a' }));
  const bottles = []; for (let i = 0; i < 3; i++) for (let k = 0; k < 8; k++) bottles.push([-40.1 + k * 0.3, 0.73 + i * 0.6, zo - 0.25]);
  const amphoras = [[-40.6, 0, zo - 0.75], [-37.4, 0, zo - 0.7]];
  // boutique: bags and shoes on a stepped display
  const zl = shop('latina', -45.8, -1, 'latina', 'LatinaDZ');
  B[4].box(M.wood, [-45.8, 0.4, zl + 0.55], [2.2, 0.8, 0.6], { color: '#f2efe6' }); B[4].box(M.wood, [-45.8, 0.9, zl + 0.3], [2.2, 0.2, 0.4], { color: '#e9dfcb' });
  const bags = [[-46.6, 0.8, zl + 0.6, '#e86a8a'], [-45.8, 0.8, zl + 0.6, '#1b1a2e'], [-45.0, 0.8, zl + 0.6, '#e0a422'], [-46.2, 1.0, zl + 0.3, '#c2321e'], [-45.4, 1.0, zl + 0.3, '#2f6fa3']];
  // jeweller: a glass counter and gold
  const zj = shop('jewel', JX, 1, 'jewel', 'Jewelry Store');
  B[4].box(M.wood, [JX, 0.45, zj - 0.45], [2.3, 0.9, 0.55], { color: '#3b2a1e' });
  const jewels = []; for (let k = 0; k < 9; k++) jewels.push([JX - 0.9 + k * 0.22, 0.93, zj - 0.45]);

  // ================= 5 · the workshop square =================
  floor(5, -63, -53, -46, -34, 0, M.stone, 0.3);
  W(5, [-64.2, 4, -40], [2.4, 8, 12], '#efe6d4');
  W(5, [-58, 4.5, -32.2], [12, 9, 1.6], '#f3ecdf');
  B[5].box(M.wood, [-62.9, 3.1, -40.6], [0.2, 0.2, 5.0], { color: '#5a3a22', ao: false });
  sign('board', [-62.93, 1.85, -40.6], 3.6, 2.0, Math.PI / 2, 5);
  sign('workshop', [-62.85, 3.62, -40.6], 2.2, 0.8, Math.PI / 2, 5);
  const laptops = [];
  for (let i = 0; i < 5; i++) {
    const zz = -42.5 + i * 0.95;
    B[5].box(M.wood, [-61.6, 0.8, zz], [1.2, 0.06, 0.62], { color: '#8a6a44', ao: false });
    [[-62.1, -0.25], [-61.1, -0.25], [-62.1, 0.25], [-61.1, 0.25]].forEach(([x, dz]) => B[5].box(M.wood, [x, 0.39, zz + dz], [0.05, 0.78, 0.05], { color: '#6b4a2a' }));
    // a laptop facing the street, and the stool of whoever just stepped away
    B[5].box(M.iron, [-61.72, 0.84, zz], [0.24, 0.018, 0.34], { ao: false, uv: 0 });
    B[5].at(new THREE.BoxGeometry(0.012, 0.23, 0.34), M.iron, [-61.85, 0.95, zz], [0, 0, -0.22], [1, 1, 1], { ao: false, uv: 0 });
    laptops.push([-61.835, 0.955, zz]);
    B[5].at(new THREE.CylinderGeometry(0.17, 0.14, 0.5, 10), M.wood, [-60.72, 0.25, zz + 0.05], [0, 0, 0], [1, 1, 1], { color: '#7a5030', uv: 1 });
    if (i % 2) B[5].at(new THREE.CylinderGeometry(0.04, 0.035, 0.11, 10), M.terracotta, [-61.3, 0.89, zz + 0.2], [0, 0, 0], [1, 1, 1], { color: '#ffffff', ao: false, uv: 0 });
  }
  const screenMat = new THREE.MeshBasicMaterial({ map: T.code, color: new THREE.Color(1.2, 1.2, 1.2) });
  const screens = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.31, 0.2), screenMat, laptops.length);
  laptops.forEach(([x, y, z], i) => { dm0.position.set(x, y, z); dm0.rotation.set(0, Math.PI / 2, 0); dm0.rotateX(-0.22); dm0.updateMatrix(); screens.setMatrixAt(i, dm0.matrix); });
  zones[5].add(screens); inter.screens = screenMat;
  // the pergola
  [[-60.05, -43.5], [-60.05, -37.7]].forEach(([x, z]) => B[5].box(M.wood, [x, 1.5, z], [0.14, 3.0, 0.14], { color: '#6b4a2a' }));
  B[5].box(M.wood, [-60.05, 3.0, -40.6], [0.16, 0.16, 6.1], { color: '#6b4a2a', ao: false });
  for (let k = 0; k < 9; k++) B[5].box(M.wood, [-61.5, 3.1, -43.4 + k * 0.7], [3.1, 0.08, 0.1], { color: '#7a5a3a', ao: false });
  const vine = []; for (let i = 0; i < 380; i++) vine.push([-62.9 + rnd() * 2.9, 3.12 + rnd() * 0.32, -43.7 + rnd() * 6.2]);
  for (let i = 0; i < 70; i++) { const z = -43.5 + rnd() * 5.8; vine.push([-60.05 + (rnd() - 0.5) * 0.3, 1.2 + rnd() * 1.9, rnd() < 0.5 ? -43.5 + (rnd() - 0.5) * 0.3 : -37.7 + (rnd() - 0.5) * 0.3]); void z; }
  const bulbs = [];
  for (let k = 0; k < 3; k++) { const z = -42.8 + k * 2.2; for (let i = 0; i <= 8; i++) { const t = i / 8; bulbs.push([-62.85 + t * 2.75, 2.92 - Math.sin(t * Math.PI) * 0.32, z]); } }
  hotspot('team', 5, [-62.3, 1.6, -40.6], [1.2, 2.6, 4.2], 'The workshop · team', { anchor: [-62.4, 3.0, -40.6] });
  const wsLight = new THREE.PointLight(0xffc27a, 1.8, 6, 1.8); wsLight.position.set(-61.0, 2.5, -40.6); zones[5].add(wsLight);
  palms.push([-54.6, -44.6]);

  // ================= 6 · the Géant street: the colonial-era city meets the medina =================
  // a boulevard: wider than the medina's streets, with tall façades, blue shutters and cast-iron lamps
  floor(6, -62.25, -53.75, -68.6, -45.6, 0, M.stone, 0.3);
  for (let zz = -48; zz > -66; zz -= 4.5) for (const side of [-1, 1]) {
    const x = -58 + side * 7.0, h = 12 + rnd() * 2, geant = side > 0 && zz === -57;
    if (geant) {
      W(6, [x, (h + 3.4) / 2, zz], [5.6, h - 3.4, 4.5], '#f4f0e6');
      W(6, [x + 2.7, 1.7, zz], [0.2, 3.4, 4.5], '#f4f0e6'); W(6, [x, 1.7, zz - 2.15], [5.6, 3.4, 0.2], '#f4f0e6'); W(6, [x, 1.7, zz + 2.15], [5.6, 3.4, 0.2], '#f4f0e6');
      floor(6, x - 2.8, x + 2.7, zz - 2.1, zz + 2.1, 0.01, M.zel, 0.5);
    } else W(6, [x, h / 2, zz], [5.6, h, 4.5], pick(['#f4f0e6', '#efe9dc', '#f1ece2']));
    for (let fl = 0; fl < 3; fl++) for (let k = -1; k <= 1; k += 2) {
      const y = 3.2 + fl * 3.0, p = [x - side * 2.82, y + 0.9, zz + k * 1.1];
      windowAt(6, p, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0.8, 1.6, rnd() < 0.3);
      // blue shutters and a little iron balcony
      B[6].box(M.wood, [p[0] - side * 0.04, p[1], p[2] - 0.62], [0.05, 1.7, 0.42], { color: '#2f6fa3', ao: false });
      B[6].box(M.wood, [p[0] - side * 0.04, p[1], p[2] + 0.62], [0.05, 1.7, 0.42], { color: '#2f6fa3', ao: false });
      if (fl > 0) { B[6].box(M.iron, [p[0] - side * 0.35, y, p[2]], [0.6, 0.06, 1.3], { ao: false }); B[6].box(M.iron, [p[0] - side * 0.62, y + 0.45, p[2]], [0.03, 0.9, 1.3], { ao: false }); }
    }
  }
  // the Géant shop: glass front, a wall of screens, and the stock
  [[-54.35, -50.2], [-61.65, -54.2], [-54.35, -62.4]].forEach(([x, z]) => {
    B[6].at(new THREE.CylinderGeometry(0.06, 0.1, 3.3, 8), M.iron, [x, 1.65, z], [0, 0, 0], [1, 1, 1], { ao: false, uv: 0 });
    B[6].at(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 8), M.iron, [x, 0.15, z], [0, 0, 0], [1, 1, 1], { ao: false, uv: 0 });
    lanterns.push({ p: new THREE.Vector3(x, 3.3, z), color: '#ffd9a0', zone: 6, wall: true, chain: 0.01 });
  });
  const GX = -53.8, GZ = -57;
  [-1, 1].forEach((k) => B[6].box(M.iron, [GX, 1.7, GZ + k * 1.95], [0.12, 3.4, 0.12], { ao: false, uv: 0 })); B[6].box(M.iron, [GX, 3.35, GZ], [0.14, 0.14, 4.0], { ao: false, uv: 0 });
  sign('geant', [GX - 0.06, 3.65, GZ], 3.6, 0.72, -Math.PI / 2, 6);
  const tvCanvas = document.createElement('canvas'); tvCanvas.width = 512; tvCanvas.height = 256;
  const tvTex = tex(tvCanvas);
  const tvMat = new THREE.MeshBasicMaterial({ map: tvTex, color: new THREE.Color(1.6, 1.6, 1.6) });
  const tvs = new THREE.Group(); tvs.position.set(GX + 4.6, 0, GZ); zones[6].add(tvs);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.56), tvMat);
    const uv = scr.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (c + uv.getX(i)) / 3, (r + uv.getY(i)) / 2);
    scr.position.set(-0.42, 1.25 + r * 0.66, -1.05 + c * 1.05); scr.rotation.y = -Math.PI / 2; tvs.add(scr);
    B[6].box(M.screenOff, [GX + 4.6 - 0.36, 1.25 + r * 0.66, GZ - 1.05 + c * 1.05], [0.06, 0.62, 1.0], { ao: false, uv: 0 });
  }
  inter.tvs = { canvas: tvCanvas, tex: tvTex, fixed: false };
  const boxes = []; for (let i = 0; i < 9; i++) boxes.push([GX + 1.4 + Math.floor(i / 3) * 0.55, 0.25 + (i % 3) * 0.48, GZ + 1.45, i === 4]);
  inter.stock = { boxes, fixed: false };
  hotspot('geant', 6, [GX + 0.3, 1.6, GZ], [0.8, 3.0, 3.8], 'Géant Electronics', { anchor: [GX - 0.1, 2.95, GZ] });
  const gLight = new THREE.PointLight(0xdfe8ff, 3.0, 7, 1.6); gLight.position.set(GX + 2.0, 2.8, GZ); zones[6].add(gLight);

  // ================= 7 · the riad: six streams into one basin =================
  const R = { x: -58, z: -77.5 };
  floor(7, R.x - 9, R.x + 9, R.z - 9, R.z + 9, 0, M.stone, 0.3);
  W(7, [R.x - 9.6, 4.8, R.z], [1.2, 9.6, 20.4], '#f3ecdf'); W(7, [R.x + 9.6, 4.8, R.z], [1.2, 9.6, 20.4], '#efe6d4');
  W(7, [R.x - 5.6, 4.8, R.z + 9.6], [7.2, 9.6, 1.2], '#f5efe4'); W(7, [R.x + 5.6, 4.8, R.z + 9.6], [7.2, 9.6, 1.2], '#f5efe4'); W(7, [R.x, 7.6, R.z + 9.6], [4, 4, 1.2], '#f5efe4');
  W(7, [R.x, 4.8, R.z - 9.6], [20.4, 9.6, 1.2], '#f2dfcf');
  const gate7 = makeDoor({ w: 3.4, h: 5.2, color: '#1b6b8a', arch: true, double: true, mats: { paint: M.paint, iron: M.iron, brass: M.brass } });
  gate7.leaves[0].hinge.rotation.y = 1.4; gate7.leaves[1].hinge.rotation.y = -1.4; gate7.group.position.set(R.x, 0, R.z + 9.2); zones[7].add(gate7.group);
  sign('riad', [R.x, 6.45, R.z + 10.22], 2.6, 0.92, 0, 7);
  // arcades inside, two storeys
  const arc7 = (pos, rotY, len) => { B[7].at(archedWall(len, 4.2, 0.4, [-2, -1, 0, 1, 2].map((k) => ({ x: k * len / 5, w: len / 5 * 0.66, h: 3.4 }))), M.plaster, pos, [0, rotY, 0], [1, 1, 1], { color: '#f6f1e7', uv: 0.35 }); };
  arc7([R.x, 0, R.z - 6.8], 0, 15); arc7([R.x - 6.8, 0, R.z], Math.PI / 2, 13.6); arc7([R.x + 6.8, 0, R.z], -Math.PI / 2, 13.6);
  for (const [x, z, len, ax] of [[R.x, R.z - 6.8, 15, 'z'], [R.x - 6.8, R.z, 13.6, 'x'], [R.x + 6.8, R.z, 13.6, 'x']]) {
    B[7].box(M.wood, [x, 4.35, z], ax === 'z' ? [len + 0.4, 0.3, 2.9] : [2.9, 0.3, len + 0.4], { color: '#7a5030', ao: false });
    B[7].at(archedWall(len, 3.4, 0.25, [-2, -1, 0, 1, 2].map((k) => ({ x: k * len / 5, w: len / 5 * 0.5, h: 2.3, y: 0.5 }))), M.plaster, [x, 4.5, z], [0, ax === 'z' ? 0 : (x < R.x ? Math.PI / 2 : -Math.PI / 2), 0], [1, 1, 1], { color: '#f3ecdf', uv: 0.35 });
  }
  B[7].box(M.zel, [R.x, 0.55, R.z - 8.95], [17.6, 1.1, 0.04], { ao: false, uv: 0.9 });
  // the garden floor, six channels, six sources, one basin
  B[7].at(new THREE.CircleGeometry(6.4, 6).rotateX(-Math.PI / 2), M.zel2, [R.x, 0.005, R.z], [0, Math.PI / 6, 0], [1, 1, 1], { ao: false, uv: 0.45 });
  const basinGeo = lathe([[0, 0], [1.55, 0], [1.6, 0.05], [1.62, 0.55], [1.45, 0.6], [1.4, 0.12], [0, 0.12]], 8);
  B[7].at(basinGeo, M.zel, [R.x, 0, R.z], [0, Math.PI / 8, 0], [1, 1, 1], { ao: false, uv: 1.2 });
  B[7].at(lathe([[0, 0], [0.18, 0], [0.12, 0.8], [0.5, 0.95], [0.55, 1.05], [0, 1.0]], 16), M.zel, [R.x, 0.1, R.z], [0, 0, 0], [1, 1, 1], { ao: false, uv: 2 });
  inter.fountain = { pos: new THREE.Vector3(R.x, 1.1, R.z), basin: new THREE.Vector3(R.x, 0.48, R.z), r: 1.42 };
  const beds = [];
  STREAMS.forEach(([name], i) => {
    const a = (i / 6) * Math.PI * 2, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const src = new THREE.Vector3(R.x, 0, R.z).addScaledVector(dir, 6.2);
    const mid = new THREE.Vector3(R.x, 0, R.z).addScaledVector(dir, (1.6 + 6.0) / 2);
    // channel (stone lips) and its water
    B[7].at(new THREE.BoxGeometry(4.4, 0.12, 0.5), M.stone, [mid.x, 0.06, mid.z], [0, -a, 0], [1, 1, 1], { ao: false });
    inter.streams.push({ i, name, a, src, mid, open: 0, target: 0, label: `stream-${i}` });
    // a small source basin with a brass spout
    B[7].at(lathe([[0, 0], [0.42, 0], [0.45, 0.35], [0.38, 0.38], [0.35, 0.1], [0, 0.1]], 8), M.zel, [src.x, 0, src.z], [0, 0, 0], [1, 1, 1], { ao: false, uv: 2 });
    B[7].at(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), M.brass, [src.x, 0.75, src.z], [0, 0, 0], [1, 1, 1], { ao: false, uv: 0 });
    sign(`stream-${i}`, [src.x + dir.x * 0.5, 0.75, src.z + dir.z * 0.5], 0.75, 0.28, -a - Math.PI / 2, 7);
    hotspot(`stream-${i}`, 7, [src.x, 0.5, src.z], [1.0, 1.2, 1.0], name, { anchor: [src.x, 1.2, src.z] });
    // planted beds between the channels
    const b = (i / 6) * Math.PI * 2 + Math.PI / 6;
    beds.push(new THREE.Vector3(R.x + Math.cos(b) * 4.2, 0, R.z + Math.sin(b) * 4.2));
  });
  hotspot('basin', 7, [R.x, 0.6, R.z], [3.2, 1.4, 3.2], 'SHONE · the consolidated view', { anchor: [R.x, 1.6, R.z] });
  beds.forEach((p, i) => {
    B[7].at(new THREE.CylinderGeometry(1.25, 1.3, 0.3, 6), M.plaster, [p.x, 0.15, p.z], [0, Math.PI / 6, 0], [1, 1, 1], { color: '#efe4cf', ao: false, uv: 0.5 });
    B[7].at(new THREE.CircleGeometry(1.05, 6).rotateX(-Math.PI / 2), M.soil, [p.x, 0.305, p.z], [0, Math.PI / 6, 0], [1, 1, 1], { ao: false, uv: 0 });
    if (i % 2 === 0) orangeTrees.push([p.x, p.z, 1.15]); else { potLeaves.push([p.x - 0.4, 0.3, p.z, 0.7, 7]); potLeaves.push([p.x + 0.45, 0.3, p.z + 0.2, 0.6, 7]); }
  });
  for (const p of [[R.x - 8.8, R.z + 8.3], [R.x + 8.8, R.z + 8.3]]) potPlant(7, new THREE.Vector3(p[0], 0, p[1]), 1.3);
  wallLantern(7, [R.x - 6.8, 3.5, R.z + 5]); wallLantern(7, [R.x + 6.8, 3.5, R.z + 5]); wallLantern(7, [R.x, 3.5, R.z - 6.6]);

  // ================= 8 · the rooftop over the sea =================
  const RY = 9.6, RZ0 = -86.8, RZ1 = -96, RX0 = R.x - 10.2, RX1 = R.x + 10.2;
  W(8, [R.x, RY / 2, (RZ0 + RZ1) / 2], [20.4, RY, RZ0 - RZ1], '#f2dfcf');
  floor(8, RX0, RX1, RZ1, RZ0, RY, M.stone, 0.3);
  // only a low lip on the sea sides, so nothing stands between you and the view
  B[8].box(M.plaster, [R.x, RY + 0.2, RZ1 + 0.2], [20.4, 0.4, 0.4], { color: '#efe6d4', ao: false, uv: 0.35 });
  B[8].box(M.plaster, [RX0 + 0.2, RY + 0.2, (RZ0 + RZ1) / 2], [0.4, 0.4, RZ0 - RZ1], { color: '#efe6d4', ao: false, uv: 0.35 });
  B[8].box(M.plaster, [RX1 - 0.2, RY + 0.5, (RZ0 + RZ1) / 2], [0.4, 1.0, RZ0 - RZ1], { color: '#efe6d4', ao: false, uv: 0.35 });
  // the stair house, with my address painted on it
  const SH = { x: R.x + 6.4, z: RZ0 - 2.3 };
  W(8, [SH.x, RY + 1.6, SH.z], [3.4, 3.2, 4.4], '#f6f1e7');
  B[8].box(M.wood, [SH.x - 0.6, RY + 1.05, SH.z - 2.23], [0.95, 2.1, 0.08], { color: '#1b6b8a', uv: 1 });
  sign('contact', [SH.x - 1.715, RY + 1.7, SH.z], 2.2, 1.1, -Math.PI / 2, 8);
  B[8].at(lathe([[0, 0], [0.45, 0.12], [0.5, 0.16], [0, 0.04]], 24), M.plaster, [SH.x + 0.6, RY + 3.5, SH.z - 1.4], [0.9, 0.4, 0], [1, 1, 1], { color: '#e8e8e8', ao: false });
  // a brass telescope at the corner over the sea (a door to the Night)
  const TP = { x: -66.1, z: -95.15 };
  const scope = new THREE.Group();
  scope.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.2, 16), M.brass));
  scope.children[0].rotation.z = -0.9; scope.children[0].position.set(0.25, 1.35, 0);
  const legM = std({ color: 0x6b4a2a, roughness: 0.7 });
  [-1, 0, 1].forEach((k) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.3, 6), legM); l.position.set(Math.cos(k * 2.1) * 0.25, 0.62, Math.sin(k * 2.1) * 0.25); l.rotation.set(Math.sin(k * 2.1) * 0.35, 0, -Math.cos(k * 2.1) * 0.35); scope.add(l); });
  { const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.08, 16), M.brass); lens.position.set(0.25 + Math.sin(0.9) * 0.6, 1.35 + Math.cos(0.9) * 0.6, 0); lens.rotation.z = -0.9; scope.add(lens); }
  scope.position.set(TP.x, RY, TP.z); scope.rotation.y = 2.87; scope.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); zones[8].add(scope);
  hotspot('scope', 8, [TP.x, RY + 1.0, TP.z], [1.0, 2.0, 1.0], 'Telescope · the Night', { anchor: [TP.x + 0.2, RY + 2.05, TP.z] });
  // pigeons rest on the lip at the corner: send one (contact)
  inter.perch = [[-67.95, -95.8], [-67.55, -95.82], [-67.15, -95.79], [-68.0, -95.3], [-68.0, -94.85], [-67.99, -94.35]].map(([x, z]) => new THREE.Vector3(x, RY + 0.4, z));
  hotspot('contact', 8, [-67.6, RY + 0.6, -95.2], [1.3, 0.7, 1.4], 'Send a pigeon · contact', { anchor: [-67.6, RY + 1.0, -95.2] });
  inter.flock = new THREE.Vector3(-84, 17, -133);
  // laundry on the town side of the roof
  inter.laundry.push({ a: new THREE.Vector3(R.x + 0.5, RY + 1.9, RZ0 - 2.2), b: new THREE.Vector3(R.x + 4.4, RY + 1.9, RZ0 - 5.6), zone: 8, y0: RY });
  [[R.x + 0.5, RZ0 - 2.2], [R.x + 4.4, RZ0 - 5.6]].forEach(([x, z]) => B[8].box(M.wood, [x, RY + 1.0, z], [0.07, 2.0, 0.07], { color: '#6b4a2a', ao: false }));
  potPlant(8, new THREE.Vector3(RX0 + 0.8, RY, RZ0 - 0.8)); potPlant(8, new THREE.Vector3(RX1 - 0.9, RY, RZ1 + 0.8), 1.2); potPlant(8, new THREE.Vector3(R.x + 1.5, RY, RZ1 + 0.8));

  // ---------- the town around ----------
  // the lower town lies on ground that falls from the rooftop's edge (s = 0) to the harbour (s = SEA), along D
  const O = { x: -62, z: -96 }, D = { x: -0.6, z: -0.8 }, TT = { x: 0.8, z: -0.6 }, ROT = Math.atan2(0.6, 0.8), SEA = 202;
  const slope = (s) => (s <= 0 ? -0.06 : -0.06 - Math.min(27.5, s * 0.136));
  const sOf = (x, z) => (x - O.x) * D.x + (z - O.z) * D.z;
  const at = (s, t) => [O.x + D.x * s + TT.x * t, O.z + D.z * s + TT.z * t];
  const filler = [];
  const addFill = (x, z, w, d, h, y = 0) => { if (sOf(x, z) < 1) filler.push([x, y, z, w, d, h]); };
  for (let i = 0; i < 70; i++) { const x = -40 + rnd() * 80, z = -2.5 - rnd() * 24; if (Math.abs(x) < 9) continue; addFill(x, z, 3 + rnd() * 4, 3 + rnd() * 4, 6 + rnd() * 6); }
  for (let i = 0; i < 60; i++) { const x = -80 + rnd() * 110, z = -45 - rnd() * 40; if (x > -68 && x < -46 && z > -90) continue; if (x > -9 && z > -46) continue; if (x > -62 && x < -6 && z > -45) continue; addFill(x, z, 3 + rnd() * 4, 3 + rnd() * 4, 7 + rnd() * 6); }
  for (let i = 0; i < 40; i++) { const x = -40 + rnd() * 30, z = -40 - rnd() * 4; addFill(x, z - 3.5, 3, 3, 6 + rnd() * 4); }
  const fill = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: T.lime, roughness: 0.95 }), filler.length);
  const fc = new THREE.Color(), dm = dm0;
  filler.forEach(([x, y, z, w, d, h], i) => { dm.position.set(x, y + h / 2, z); dm.scale.set(w, h, d); dm.rotation.y = 0; dm.updateMatrix(); fill.setMatrixAt(i, dm.matrix); fill.setColorAt(i, fc.set(pick(PAL.lime)).multiplyScalar(0.9 + rnd() * 0.1)); });
  fill.castShadow = true; fill.receiveShadow = true; root.add(fill);
  // the ground under everything
  { const g = new THREE.PlaneGeometry(1600, 1600, 160, 160).rotateX(-Math.PI / 2); g.translate(-260, 0, -320);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const s = sOf(p.getX(i), p.getZ(i)); p.setY(i, s > SEA + 6 ? -28.6 - (s - SEA) * 0.2 : slope(s)); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, std({ color: 0xc9b393, roughness: 1 })); m.receiveShadow = true; root.add(m); }
  // the lower town: white cubes stepping down to the harbour
  const LIT = { s: 27, t: 2.7 }; // the room where a light is still on: the way to the Desk
  const town = [], tw = [], roofBits = [];
  const thin = tier === 0 ? 0.45 : small ? 0.25 : 0.1;
  for (let s = 3.5; s < SEA - 2; s += 4.0 + rnd() * 0.7) {
    for (let t = -(28 + s * 1.3); t < 26 + s * 0.95; t += 3.4 + rnd() * 1.8) {
      if (rnd() < thin) continue;
      const ss = s + (rnd() - 0.5) * 1.0, tt = t + (rnd() - 0.5) * 0.8;
      if (ss > LIT.s - 10 && ss < LIT.s + 4.6 && Math.abs(tt - LIT.t) < (ss < LIT.s - 4.6 ? 3.2 : 4.6)) continue;
      const [x, z] = at(ss, tt);
      if (x > -71 && x < -45 && z > -99.5) continue;
      const w = 2.8 + rnd() * 2.0, d = 3.0 + rnd() * 1.6, h = 3.0 + rnd() * 3.2 + (rnd() < 0.1 ? 2.8 : 0), y0 = slope(ss);
      town.push([x, y0 - 2.5, z, w, d, h + 2.5, ROT + (rnd() - 0.5) * 0.1]);
      if (rnd() < 0.55) { const n = rnd() < 0.3 ? 2 : 1; for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * w * 0.4; tw.push([x - D.x * (d / 2 + 0.03) + TT.x * o, y0 + 1.3 + rnd() * Math.max(0.2, h - 2.7), z - D.z * (d / 2 + 0.03) + TT.z * o]); } }
      if (rnd() < 0.22) roofBits.push([x + (rnd() - 0.5) * w * 0.5, y0 + h, z + (rnd() - 0.5) * d * 0.5, 0, 1]);
      else if (rnd() < 0.05) roofBits.push([x, y0 + h, z, 1, Math.min(w, d)]);
    }
  }
  const tm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: T.lime, roughness: 0.95 }), town.length);
  const TOWNC = ['#f6f1e7', '#f3ecdf', '#f5efe4', '#efe6d4', '#ffffff', '#e7ecef', '#f2dfcf', '#ead6bd', '#f6f1e7', '#fbf8f2'];
  town.forEach(([x, y, z, w, d, h, r], i) => { dm.position.set(x, y + h / 2, z); dm.scale.set(w, h, d); dm.rotation.set(0, r, 0); dm.updateMatrix(); tm.setMatrixAt(i, dm.matrix); tm.setColorAt(i, fc.set(pick(TOWNC)).multiplyScalar(0.92 + rnd() * 0.08)); });
  tm.castShadow = true; tm.receiveShadow = true; zones[8].add(tm);
  const bitsTank = roofBits.filter((b) => !b[3]), bitsDome = roofBits.filter((b) => b[3]);
  const tanks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 10), std({ color: 0xd9d6cf, roughness: 0.6, metalness: 0.2 }), bitsTank.length);
  bitsTank.forEach(([x, y, z], i) => { dm.position.set(x, y + 0.45, z); dm.scale.setScalar(1); dm.rotation.set(0, 0, 0); dm.updateMatrix(); tanks.setMatrixAt(i, dm.matrix); });
  const domes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.lime, roughness: 0.9 }), bitsDome.length);
  bitsDome.forEach(([x, y, z, , sz], i) => { dm.position.set(x, y, z); dm.scale.setScalar(sz * 0.42); dm.rotation.set(0, 0, 0); dm.updateMatrix(); domes.setMatrixAt(i, dm.matrix); });
  zones[8].add(tanks, domes);
  // lit windows over the lower town, for the dusk
  const wg = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 0.75), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.8) }), Math.max(1, tw.length));
  tw.forEach(([x, y, z], i) => { dm.position.set(x, y, z); dm.scale.setScalar(1); dm.rotation.set(0, ROT, 0); dm.updateMatrix(); wg.setMatrixAt(i, dm.matrix); wg.setColorAt(i, fc.set(rnd() < 0.15 ? '#9fc4ff' : rnd() < 0.5 ? '#ffd29a' : '#ffb870')); });
  wg.count = tw.length; zones[8].add(wg);
  inter.townWindows = wg;
  // the room with a light still on, on a roof below (a door to the Desk)
  { const y0 = slope(LIT.s), h = 5.6, [x, z] = at(LIT.s, LIT.t);
    B[8].box(M.plaster, [x, y0 - 2.5 + (h + 2.5) / 2, z], [5.2, h + 2.5, 4.8], { color: '#f6f1e7', uv: 0.35 }, ROT);
    B[8].box(M.plaster, [x, y0 + h + 0.2, z], [5.3, 0.4, 4.9], { color: '#efe6d4', ao: false, uv: 0.35 }, ROT);
    const [rx, rz] = [x + D.x * 0.9, z + D.z * 0.9];
    B[8].box(M.plaster, [rx, y0 + h + 1.3, rz], [3.4, 2.6, 2.6], { color: '#fbf8f2', uv: 0.35, ao: false }, ROT);
    const fx = rx - D.x * 1.32, fz = rz - D.z * 1.32;
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.38) });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.95), glow); door.position.set(fx - TT.x * 0.6, y0 + h + 0.98, fz - TT.z * 0.6); door.rotation.y = ROT; zones[8].add(door);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.6), glow); win.position.set(fx + TT.x * 0.85, y0 + h + 1.5, fz + TT.z * 0.85); win.rotation.y = ROT; zones[8].add(win);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.cookie, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 0.6, 0.28), polygonOffset: true, polygonOffsetFactor: -2 }));
    pool.position.set(fx - D.x * -1.0 - TT.x * 0.6, y0 + h + 0.42, fz - D.z * -1.0 - TT.z * 0.6); zones[8].add(pool);
    inter.litRoom = { glow, pool: pool.material };
    hotspot('door-desk', 8, [door.position.x, door.position.y, door.position.z], [1.6, 2.4, 1.6], 'A lit room · The Desk', { anchor: [door.position.x, y0 + h + 2.9, door.position.z] }); }
  // the harbour: a sea wall, a jetty and a lighthouse
  { const [hx, hz] = at(SEA + 1, 30); B[8].box(M.city, [hx, -26.9, hz], [520, 2.4, 5], { color: '#d9c7a4', ao: false, uv: 0.1 }, ROT);
    const [jx, jz] = at(SEA + 32, 62); B[8].box(M.city, [jx, -26.9, jz], [4, 2.0, 62], { color: '#d9c7a4', ao: false, uv: 0.1 }, ROT);
    const [lx, lz] = at(SEA + 62, 62);
    B[8].at(new THREE.CylinderGeometry(1.15, 1.7, 13, 16), M.plaster, [lx, -25.9 + 6.5, lz], [0, 0, 0], [1, 1, 1], { color: '#f6f1e7', uv: 0.3 });
    B[8].at(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16), M.plaster, [lx, -25.9 + 9.5, lz], [0, 0, 0], [1, 1, 1], { color: '#b8382c', ao: false, uv: 0 });
    B[8].at(new THREE.ConeGeometry(1.3, 1.4, 16), M.iron, [lx, -25.9 + 15.1, lz], [0, 0, 0], [1, 1, 1], { ao: false, uv: 0 });
    const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.4) });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.4, 12), lampM); lamp.position.set(lx, -25.9 + 13.7, lz); zones[8].add(lamp);
    const beamG = new THREE.ConeGeometry(5, 90, 18, 1, true); beamG.translate(0, -45, 0); beamG.rotateZ(Math.PI / 2);
    const beamM = new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying float vV; void main(){ vV = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
      fragmentShader: 'uniform float uI; varying float vV; void main(){ gl_FragColor = vec4(vec3(1.0, 0.86, 0.6)*pow(vV, 2.2)*uI*0.55, 1.0); }' });
    const beam = new THREE.Group(); beam.position.copy(lamp.position); beam.add(new THREE.Mesh(beamG, beamM)); const b2 = new THREE.Mesh(beamG, beamM); b2.rotation.y = Math.PI; beam.add(b2); zones[8].add(beam);
    inter.lighthouse = { lamp: lampM, beam, beamM };
    // boats at anchor
    const boats = []; for (let i = 0; i < 9; i++) boats.push([...at(SEA + 14 + rnd() * 80, -90 + rnd() * 230), rnd() * 3]);
    const hull = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.55, 4.4), std({ color: 0xf2efe6, roughness: 0.6 }), boats.length);
    const boatL = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1) }), boats.length);
    boats.forEach(([x, z, r], i) => { dm.position.set(x, -27.3, z); dm.rotation.set(0, r, 0); dm.scale.setScalar(1); dm.updateMatrix(); hull.setMatrixAt(i, dm.matrix); dm.position.y = -26.4; dm.updateMatrix(); boatL.setMatrixAt(i, dm.matrix); });
    zones[8].add(hull, boatL); inter.boatLights = boatL; }
  // minarets: square Maghreb towers with a lantern on top
  function minaret(x, z, h, y = 0) {
    const g = new THREE.Group();
    const s = h * 0.13;
    const b = new Batch();
    b.box(M.plaster, [0, h / 2, 0], [s, h, s], { color: '#f2ead8', uv: 0.3, aoH: 3 });
    b.box(M.zel, [0, h * 0.78, 0], [s + 0.04, h * 0.1, s + 0.04], { ao: false, uv: 0.5 });
    b.box(M.plaster, [0, h + 0.3, 0], [s * 1.15, 0.6, s * 1.15], { color: '#e9dfcb', ao: false, uv: 0.3 });
    b.box(M.plaster, [0, h + h * 0.08, 0], [s * 0.45, h * 0.16, s * 0.45], { color: '#f2ead8', ao: false, uv: 0.3 });
    b.at(new THREE.SphereGeometry(s * 0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.zel2, [0, h + h * 0.16, 0], [0, 0, 0], [1, 1, 1], { ao: false, uv: 1 });
    b.build(g);
    for (const [sx, sz, r] of [[0, s / 2 + 0.01, 0], [s / 2 + 0.01, 0, Math.PI / 2], [0, -s / 2 - 0.01, Math.PI], [-s / 2 - 0.01, 0, -Math.PI / 2]]) {
      const wnd = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.22, s * 0.6), M.windowDark); wnd.position.set(sx, h * 0.6, sz); wnd.rotation.y = r; g.add(wnd);
    }
    g.position.set(x, y, z); root.add(g);
    return g;
  }
  minaret(-16, -52, 30);
  { const [x, z] = at(60, -12); minaret(x, z, 28, slope(60) - 0.5).rotation.y = ROT; }
  inter.terrain = { O, D, TT, ROT, SEA, slope, at };

  // the sea, the far coast and the sky are made in the world controller (they change with the hour)

  // ---------- instanced decoration ----------
  // lanterns
  const lg = lanternGeo();
  const lb = new THREE.InstancedMesh(lg.body, M.lanternShell, lanterns.length);
  const lc = new THREE.InstancedMesh(lg.core, M.lampCore, lanterns.length);
  const chainG = new THREE.CylinderGeometry(0.008, 0.008, 1, 4); chainG.translate(0, 0.5, 0);
  const chains = new THREE.InstancedMesh(chainG, M.iron, lanterns.length);
  lanterns.forEach((l, i) => {
    dm.position.copy(l.p); dm.rotation.set(0, i, 0); dm.scale.setScalar(l.wall ? 0.8 : 1); dm.updateMatrix(); lb.setMatrixAt(i, dm.matrix); lc.setMatrixAt(i, dm.matrix);
    lc.setColorAt(i, new THREE.Color(l.color).multiplyScalar(0.6));
    dm.position.copy(l.p).add(new THREE.Vector3(0, 0.6, 0)); dm.scale.set(1, l.chain ?? 0.3, 1); dm.rotation.set(0, 0, 0); dm.updateMatrix(); chains.setMatrixAt(i, dm.matrix);
  });
  lb.castShadow = true; chains.castShadow = false;
  root.add(lb, lc, chains);
  inter.lanterns = lanterns; inter.lanternCores = lc;
  // light pools that lanterns throw on the ground and walls (additive star patterns)
  const poolMat = new THREE.MeshBasicMaterial({ map: T.cookie, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 0.62, 0.3), polygonOffset: true, polygonOffsetFactor: -2 });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, lanterns.length);
  lanterns.forEach((l, i) => { dm.position.set(l.p.x, 0.02, l.p.z + (l.wall ? 0 : 0)); dm.rotation.set(0, i * 0.7, 0); const s = l.wall ? 3.2 : 3.6; dm.scale.set(s, 1, s); dm.updateMatrix(); pools.setMatrixAt(i, dm.matrix); });
  pools.renderOrder = 5; root.add(pools);
  inter.pools = pools; inter.poolMat = poolMat;
  // plants: leaves for pots and orange trees, bougainvillea flowers
  const leafG = new THREE.SphereGeometry(1, 6, 4); leafG.scale(0.08, 0.012, 0.035);
  const leafList = [];
  potLeaves.forEach(([x, y, z, r]) => { for (let i = 0; i < 26; i++) leafList.push([x + (rnd() - 0.5) * r * 1.6, y + rnd() * r * 1.4, z + (rnd() - 0.5) * r * 1.6]); });
  const oranges = [];
  orangeTrees.forEach(([x, z, s]) => {
    B[x < -40 ? 7 : 2].at(new THREE.CylinderGeometry(0.07 * s, 0.11 * s, 1.6 * s, 8), M.wood, [x, 0.75 + 0.8 * s, z], [0, 0, 0], [1, 1, 1], { color: '#5a4030', ao: false, uv: 0 });
    for (let i = 0; i < 220; i++) { const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1), r = 1.05 * s * Math.cbrt(rnd()); leafList.push([x + Math.sin(v) * Math.cos(u) * r, 0.75 + 2.3 * s + Math.cos(v) * r * 0.8, z + Math.sin(v) * Math.sin(u) * r]); }
    for (let i = 0; i < 18; i++) { const u = rnd() * Math.PI * 2, v = Math.acos(2 * rnd() - 1), r = 1.0 * s; oranges.push([x + Math.sin(v) * Math.cos(u) * r, 0.75 + 2.3 * s + Math.cos(v) * r * 0.8, z + Math.sin(v) * Math.sin(u) * r]); }
  });
  vine.forEach((v) => leafList.push(v));
  const leaves = new THREE.InstancedMesh(leafG, M.leaf, leafList.length);
  leafList.forEach(([x, y, z], i) => { dm.position.set(x, y, z); dm.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); dm.scale.setScalar(0.8 + rnd() * 0.6); dm.updateMatrix(); leaves.setMatrixAt(i, dm.matrix); });
  leaves.castShadow = true; leaves.receiveShadow = true; root.add(leaves);
  const og = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), M.orange, oranges.length);
  oranges.forEach(([x, y, z], i) => { dm.position.set(x, y, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); og.setMatrixAt(i, dm.matrix); });
  og.castShadow = true; root.add(og);
  const bl = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.11), M.bloom, blooms.length);
  blooms.forEach(([x, y, z], i) => { dm.position.set(x, y, z); dm.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); dm.scale.setScalar(0.7 + rnd() * 0.8); dm.updateMatrix(); bl.setMatrixAt(i, dm.matrix); });
  bl.castShadow = true; root.add(bl);
  // string lights over the workshop
  const bulbM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.5) }), bulbs.length);
  bulbs.forEach(([x, y, z], i) => { dm.position.set(x, y, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); bulbM.setMatrixAt(i, dm.matrix); });
  zones[5].add(bulbM); inter.bulbs = bulbM.material;
  for (let k = 0; k < 3; k++) { const z = -42.8 + k * 2.2; const a = new THREE.Vector3(-62.85, 2.95, z), b = new THREE.Vector3(-60.1, 2.95, z); zones[5].add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, new THREE.Vector3(-61.5, 2.3, z), b), 10, 0.006, 3), M.iron)); }
  // palms
  const frond = new THREE.MeshStandardMaterial({ map: palmFrondTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
  const fg = new THREE.PlaneGeometry(0.9, 3.2, 1, 6); fg.translate(0, 1.6, 0);
  { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 3.2; p.setZ(i, -t * t * 1.1); } fg.computeVertexNormals(); }
  const fronds = new THREE.InstancedMesh(fg, frond, palms.length * 12);
  let fi = 0;
  palms.forEach(([x, z]) => {
    const h = 6 + rnd() * 2.5, lean = (rnd() - 0.5) * 0.5;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + lean * 0.6, h * 0.5, z), new THREE.Vector3(x + lean, h, z + 0.2)]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.17, 8), std({ color: 0x7a6248, roughness: 0.95 }));
    trunk.castShadow = true; trunk.receiveShadow = true; root.add(trunk);
    for (let k = 0; k < 12; k++) { dm.position.set(x + lean, h, z + 0.2); dm.rotation.set(0, (k / 12) * Math.PI * 2 + rnd() * 0.3, 0); dm.rotateX(1.0 + rnd() * 0.5); dm.scale.setScalar(0.9 + rnd() * 0.3); dm.updateMatrix(); fronds.setMatrixAt(fi++, dm.matrix); }
  });
  fronds.castShadow = true; root.add(fronds);
  // souk goods
  const cones = new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 0.32, 16), std({ roughness: 0.95 }), spice.cones.length);
  spice.cones.forEach(([x, y, z, c], i) => { dm.position.set(x, y + 0.16, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); cones.setMatrixAt(i, dm.matrix); cones.setColorAt(i, fc.set(c)); });
  cones.castShadow = true; root.add(cones);
  const jarG = lathe([[0, 0], [0.09, 0], [0.13, 0.12], [0.11, 0.24], [0.06, 0.3], [0.07, 0.34], [0, 0.34]], 14);
  const jars = new THREE.InstancedMesh(jarG, std({ roughness: 0.35 }), spice.jars.length + amphoras.length);
  [...spice.jars, ...amphoras.map(([x, y, z]) => [x, y, z, '#b5764a', 3.2])].forEach(([x, y, z, c, s = 1], i) => { dm.position.set(x, y, z); dm.rotation.set(0, rnd() * 3, 0); dm.scale.setScalar(s); dm.updateMatrix(); jars.setMatrixAt(i, dm.matrix); jars.setColorAt(i, fc.set(c)); });
  jars.castShadow = true; root.add(jars);
  const rugMats = [rugTex(['#7a2e26', '#e9dfcb', '#1f4fa3', '#e0a422']), rugTex(['#1f3a5c', '#e0a422', '#7a2e26', '#f2efe6']), rugTex(['#e9dfcb', '#7a2e26', '#2c7a5b', '#1b1a2e'])].map((t) => std({ map: t, roughness: 0.95, side: THREE.DoubleSide }));
  spice.rugs.forEach(([x, y, z, side], i) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1, 1, 6), rugMats[i % 3]); r.position.set(x, y, z); r.rotation.y = side > 0 ? Math.PI : 0; r.castShadow = true; r.receiveShadow = true; zones[3].add(r); });
  const bottleG = lathe([[0, 0], [0.045, 0], [0.045, 0.16], [0.018, 0.22], [0.018, 0.27], [0, 0.27]], 10);
  const bot = new THREE.InstancedMesh(bottleG, M.glass, bottles.length);
  bottles.forEach(([x, y, z], i) => { dm.position.set(x, y, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); bot.setMatrixAt(i, dm.matrix); });
  root.add(bot);
  const bagG = new THREE.BoxGeometry(0.34, 0.3, 0.14);
  const bagsM = new THREE.InstancedMesh(bagG, std({ roughness: 0.55 }), bags.length);
  bags.forEach(([x, y, z, c], i) => { dm.position.set(x, y + 0.15, z); dm.rotation.set(0, (rnd() - 0.5) * 0.4, 0); dm.updateMatrix(); bagsM.setMatrixAt(i, dm.matrix); bagsM.setColorAt(i, fc.set(c)); });
  bagsM.castShadow = true; root.add(bagsM);
  const jw = new THREE.InstancedMesh(new THREE.TorusGeometry(0.05, 0.014, 8, 20), M.gold, jewels.length);
  jewels.forEach(([x, y, z], i) => { dm.position.set(x, y + 0.05, z); dm.rotation.set(Math.PI / 2 - 0.4, 0, 0); dm.updateMatrix(); jw.setMatrixAt(i, dm.matrix); });
  root.add(jw);
  // Géant stock: one box glitches until you repair it
  const boxM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), std({ color: 0xc9a77a, roughness: 0.85 }), boxes.length);
  boxes.forEach(([x, y, z], i) => { dm.position.set(x, y, z); dm.rotation.set(0, 0, 0); dm.updateMatrix(); boxM.setMatrixAt(i, dm.matrix); boxM.setColorAt(i, fc.set(i === 4 ? '#ff3b1f' : '#c9a77a')); });
  boxM.castShadow = true; root.add(boxM); inter.stock.mesh = boxM;

  // ---------- laundry lines ----------
  const clothU = { uTime: { value: 0 } };
  const clothMat = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
  clothMat.onBeforeCompile = (sh) => { sh.uniforms.uTime = clothU.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat sway = (0.0 - position.y)*0.12; transformed.z += sin(uTime*1.6 + position.x*3.0 + instanceMatrix[3].x)*sway;'); };
  const cloths = []; inter.laundry.forEach((l) => { for (let i = 0; i < 6; i++) cloths.push([l, i]); });
  const LAUNDRY = ['#e0a422', '#f2efe6', '#2c7a5b', '#e86a8a', '#1f4fa3', '#fbf8f2', '#d8b48a'], li = (l) => inter.laundry.indexOf(l) * 3;
  const clothG = new THREE.PlaneGeometry(0.5, 0.75, 4, 6); clothG.translate(0, -0.375, 0);
  const cl = new THREE.InstancedMesh(clothG, clothMat, cloths.length);
  cloths.forEach(([l, i], k) => { const p = new THREE.Vector3().lerpVectors(l.a, l.b, (i + 0.7) / 6.6); p.y -= Math.sin(((i + 0.7) / 6.6) * Math.PI) * 0.18; dm.position.copy(p); dm.rotation.set(0, Math.atan2(l.b.x - l.a.x, l.b.z - l.a.z) - Math.PI / 2, 0); dm.scale.set(0.8 + rnd() * 0.5, 0.8 + rnd() * 0.6, 1); dm.updateMatrix(); cl.setMatrixAt(k, dm.matrix); cl.setColorAt(k, fc.set(LAUNDRY[(k + li(l)) % LAUNDRY.length])); });
  cl.castShadow = true; root.add(cl);
  inter.laundry.forEach((l) => { const g = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(l.a, new THREE.Vector3().lerpVectors(l.a, l.b, 0.5).add(new THREE.Vector3(0, -0.2, 0)), l.b), 12, 0.008, 4), M.iron); root.add(g); });
  inter.clothU = clothU;

  // build per-zone statics
  B.forEach((b, i) => b.build(zones[i]));
  zones.forEach((z) => z.traverse((o) => { if (o.isMesh && o.castShadow === false && !o.material?.isMeshBasicMaterial) o.receiveShadow = true; }));
  return { root, zones, hot, inter, M, T };
}
