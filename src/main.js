import '@fontsource/big-shoulders-display/latin-600';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource/ibm-plex-sans/latin-400';
import '@fontsource/ibm-plex-sans/latin-500';
import '@fontsource/ibm-plex-sans/latin-600';
import '@fontsource/ibm-plex-mono/latin-400';
import '@fontsource/ibm-plex-mono/latin-500';
import * as THREE from 'three';
import meURL from './assets/me.jpg?inline';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildShapes, buildName, buildText, buildPortrait, starTips } from './shapes.js';
import { FINAL_SHADER } from './particles.js';
import { sharedGeometry, createScene, createGround, createTrail, createSky } from './world.js';
import { createAudio } from './audio.js';
import { PROJECTS, projectCanvas, createScreen } from './screens.js';

const STAGES = ['SIGNAL', 'RAW', 'CLEAN', 'MODEL', 'CONSOLIDATE', 'REPORT', 'BUILD', 'DECIDE'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const root = document.documentElement;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// ---------- chapter UI (works with or without WebGL) ----------
const sections = [...document.querySelectorAll('[data-stage]')];
const rail = document.querySelector('.rail ol');
const hudStage = document.getElementById('hud-stage');
const progressBar = document.querySelector('.progress i');

if (coarse) document.querySelectorAll('[data-hint-touch]').forEach((el) => (el.textContent = el.dataset.hintTouch));

sections.forEach((s, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span>${String(i).padStart(2, '0')}</span><em>${STAGES[i]}</em>`;
  b.setAttribute('aria-label', `Go to chapter ${i}: ${STAGES[i].toLowerCase()}`);
  b.addEventListener('click', () => s.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
  li.appendChild(b); rail.appendChild(li);
});
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const t = document.querySelector(a.getAttribute('href'));
  if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
}));

const GLYPHS = '01<>/[]{}#_=+ABCDEF';
function scramble(el, dur = 700) {
  if (reduced || !el) return;
  const final = el.dataset.final || (el.dataset.final = el.textContent);
  el.setAttribute('aria-label', final);
  const start = performance.now();
  function step(now) {
    const p = Math.min(1, (now - start) / dur);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      out += ch === ' ' || i < p * final.length ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step); else el.textContent = final;
  }
  requestAnimationFrame(step);
}

const panels = sections.map((s) => s.querySelector('.panel'));
function fadePanels() {
  const vh = innerHeight, last = sections.length - 1;
  sections.forEach((s, i) => {
    if (i === last) return;
    const r = s.getBoundingClientRect();
    const local = (vh * 0.5 - r.top) / r.height;
    const o = i === 0 ? clamp(1 - (local - 0.45) * 3, 0, 1) : clamp(Math.min((local + 0.15) / 0.2, (0.72 - local) / 0.18), 0, 1);
    panels[i].style.opacity = o.toFixed(3);
    panels[i].style.visibility = o < 0.01 ? 'hidden' : 'visible';
  });
}
function targetStage() {
  fadePanels();
  const vh = innerHeight, last = sections.length - 1;
  for (let i = 0; i < sections.length; i++) {
    const r = sections[i].getBoundingClientRect();
    const local = (vh * 0.5 - r.top) / r.height;
    if (local < 0) return i;
    if (local < 1) {
      if (i === last) return last;
      const a = parseFloat(sections[i].dataset.morph || '0.45');
      return i + clamp((local - a) / (1 - a), 0, 1);
    }
  }
  return last;
}

let activeIdx = -1;
const listeners = [];
function setActive(i) {
  if (i === activeIdx) return;
  activeIdx = i;
  rail.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
  hudStage.textContent = `${String(i).padStart(2, '0')} / ${STAGES[i]}`;
  scramble(sections[i].querySelector('h2'));
  listeners.forEach((fn) => fn(i));
}

const copyBtn = document.getElementById('copy-email');
copyBtn?.addEventListener('click', async () => {
  const email = document.getElementById('email').textContent.trim();
  try { await navigator.clipboard.writeText(email); copyBtn.textContent = 'Copied'; }
  catch { const range = document.createRange(); range.selectNodeContents(document.getElementById('email'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); copyBtn.textContent = 'Selected, press Ctrl+C'; }
  setTimeout(() => (copyBtn.textContent = 'Copy email'), 2200);
});

const stickyMQ = matchMedia('(min-width: 900px) and (min-height: 640px)');
function placePanels() {
  document.querySelectorAll('.chapter:not(.hero):not(.last) .panel').forEach((p) => {
    if (!stickyMQ.matches) { p.style.top = ''; return; }
    const h = p.offsetHeight;
    p.style.top = `${h < innerHeight ? (innerHeight - h) / 2 : innerHeight - h}px`;
  });
}
placePanels();
addEventListener('resize', placePanels);
document.fonts?.ready.then(placePanels);

// ---------- detail panel ----------
const detail = document.getElementById('detail');
const detailBody = detail.querySelector('.detail-body');
let focusHS = null;
const detailListeners = { open: [] };
function openDetail(hs) {
  const tpl = document.getElementById(hs.d);
  if (!tpl) return;
  detailBody.replaceChildren(tpl.content.cloneNode(true));
  detail.classList.add('open'); detail.inert = false;
  root.classList.add('focused');
  focusHS = hs;
  scramble(detailBody.querySelector('h3'), 500);
  detail.querySelector('.close').focus({ preventScroll: true });
  detailListeners.open.forEach((f) => f(hs));
}
detailListeners.open.push((h) => {
  if (h.d !== 'd-home') return;
  const fig = document.createElement('figure'); fig.className = 'portrait';
  fig.innerHTML = `<img alt="Portrait of Abdelkrim Ghebouli" src="${meURL}">`;
  detailBody.prepend(fig);
});
// the CV download only works on the real site, not inside a sandboxed preview
if (/claude\.ai|claudeusercontent/.test(location.hostname)) document.querySelectorAll('[data-cv]').forEach((el) => el.remove());
function closeDetail() {
  if (!focusHS) return;
  const was = focusHS;
  focusHS = null;
  detail.classList.remove('open'); detail.inert = true;
  root.classList.remove('focused');
  was.el?.focus({ preventScroll: true });
}
detail.inert = true;
detail.querySelector('.close').addEventListener('click', closeDetail);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

// ---------- boot sequence ----------
const bootList = document.querySelector('#boot ol');
function bootLog(t) { if (!bootList) return; const li = document.createElement('li'); li.textContent = t; bootList.appendChild(li); }
function bootDone() { root.classList.add('booted'); setTimeout(() => document.getElementById('boot')?.remove(), 1200); }
setTimeout(bootDone, 9000);

// keyboard: arrows travel between chapters
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, #detail') || e.metaKey || e.ctrlKey) return;
  const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
  if (!dir) return;
  e.preventDefault();
  sections[clamp(activeIdx + dir, 0, sections.length - 1)].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
});

// ---------- WebGL ----------
const canvas = document.getElementById('stage');
const gl2 = (() => { try { return !!canvas.getContext('webgl2'); } catch { return false; } })();

if (!gl2) {
  root.classList.add('no-webgl');
  bootDone();
  const loop = () => { const s = targetStage(); setActive(Math.min(7, Math.floor(s + 0.4))); progressBar.style.transform = `scaleX(${s / 7})`; requestAnimationFrame(loop); };
  loop();
} else {
  root.classList.add('webgl');
  start();
}

// ---------- the world ----------
// Each chapter is a place. k = object kind, s = scale, n = share of the particle budget.
const SCENES = [
  { pos: [0, 40, 0], rot: [0, 0, 0], s: 1, n: 1.0, c: [0, 40, 0] },
  { pos: [6, 20, -34], rot: [0, 0.4, 0], s: 1.6, n: 0.7, c: [6, 20, -34] },
  { pos: [0, 1.0, -72], rot: [-Math.PI / 2, 0, 0.15], s: 2.2, n: 0.6, c: [0, 3, -72] },
  { pos: [-4, 16, -104], rot: [0, 0.25, 0], s: 1.9, n: 0.55, c: [-4, 16, -104] },
  { pos: [-40, 6, -118], rot: [0, 0, 0], s: 1.8, n: 0.7, c: [-40, 6, -118] },
  { pos: [-44, 5.96, -160], rot: [0, 0.3, 0], s: 3.2, n: 0.6, c: [-44, 9, -160] },
  { pos: [-12, 12, -190], rot: [0, 0, 0], s: 2.2, n: 0.45, c: [-12, 12, -190] },
  { pos: [-12, 34, -250], rot: [0.36, 0, 0], s: 2.6, n: 0.8, c: [-12, 34, -250] },
];
// Camera journey: [stage, camera position, look target]. Integer stages are the resting views.
const PATH = [
  [0, [0, 40.6, 13], [0, 40.3, 0]],
  [0.5, [0.5, 39.8, 1.2], [2, 30, -20]],
  [1, [-6, 23, -17], [2, 20.5, -34]],
  [1.5, [5.5, 20, -33], [2, 8, -60]],
  [2, [-12, 12, -56], [-9, 1.5, -71]],
  [2.5, [4, 6.5, -76], [-4, 12, -104]],
  [3, [-14, 10, -85], [-8, 15, -104]],
  [3.5, [-6, 22, -118], [-40, 6, -114]],
  [4, [-22, 18, -114], [-38, 4, -109]],
  [4.4, [-34, 10, -126], [-46, 5, -120]],
  [4.75, [-41, 6.5, -117], [-44, 6, -150]],
  [5, [-60, 5, -136], [-56, 7, -160]],
  [5.5, [-44, 3.5, -158], [-14, 12, -188]],
  [6, [-32, 20, -172], [-23, 12, -189]],
  [6.4, [-12.5, 20, -189], [-12, 0, -194]],
  [6.7, [-12, 5, -191], [-12, 26, -240]],
  [7, [-4, 33, -217], [-25, 32, -250]],
];

function buildPath(mobile) {
  const V = (a) => new THREE.Vector3(...a);
  const pts = [], looks = [];
  for (const [s, p, l] of PATH) {
    let P = V(p), L = V(l);
    if (mobile && Number.isInteger(s)) {
      const c = V(SCENES[s].c);
      P = c.clone().add(P.sub(c).multiplyScalar(1.75));
      L = c.clone().add(new THREE.Vector3(0, -1.6 * SCENES[s].s, 0));
    }
    pts.push(P); looks.push(L);
  }
  return {
    pos: new THREE.CatmullRomCurve3(pts, false, 'centripetal'),
    look: new THREE.CatmullRomCurve3(looks, false, 'centripetal'),
    stages: PATH.map((w) => w[0]),
  };
}
function pathParam(path, stage) {
  const S = path.stages, n = S.length - 1;
  if (stage <= S[0]) return 0;
  for (let j = 0; j < n; j++) if (stage <= S[j + 1]) return (j + (stage - S[j]) / (S[j + 1] - S[j])) / n;
  return 1;
}

async function start() {
  const small = innerWidth < 760;
  const cores = navigator.hardwareConcurrency || 4;
  const N = small || coarse ? 24000 : cores <= 4 ? 38000 : 60000;
  bootLog(`Waking ${N.toLocaleString('en-US')} particles`);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x06070d, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 900);

  const shapes = buildShapes(N);
  bootLog('Growing eight scenes');
  const fontFam = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
  try { await Promise.race([document.fonts.load('800 200px "Big Shoulders Display"'), new Promise((r) => setTimeout(r, 1800))]); } catch {}

  bootLog('Sampling the name');
  const canv = {};
  for (const id of Object.keys(PROJECTS)) canv[id] = await projectCanvas(id);
  const fit = () => {
    const aspect = innerWidth / innerHeight, mobile = aspect < 0.9;
    const fov = mobile ? 58 : 45;
    const dist = 13 * (mobile ? 1.75 : 1);
    const visW = 2 * dist * Math.tan((fov * Math.PI) / 360) * aspect;
    return { aspect, mobile, fov, nameW: Math.min(9, visW * (mobile ? 0.8 : 0.62)) };
  };
  let F = fit();
  let path = buildPath(F.mobile);

  const attrs = sharedGeometry(N, shapes, buildName(N, F.nameW, fontFam));
  const objs = SCENES.map((d, k) => {
    const o = createScene(attrs, k, Math.floor(N * d.n), d.s);
    o.position.set(...d.pos); o.rotation.set(...d.rot); o.scale.setScalar(d.s);
    o.updateMatrixWorld();
    scene.add(o);
    return o;
  });
  const ground = createGround(small || coarse ? 18000 : 42000, [-85, 45, -290, 35]);
  const trail = createTrail(buildPath(false).pos, small || coarse ? 3500 : 7000);
  const sky = createSky(small ? 1400 : 2600);
  scene.add(ground, trail, sky);
  const screen = createScreen(small || coarse ? 120 : 190, small || coarse ? 75 : 118);
  screen.setTexture('d-olive', canv['d-olive'].canvas);
  scene.add(screen.back, screen.points, screen.plane);
  let screenAmt = 0, screenOn = false;
  const screenC = new THREE.Vector3(), screenFrom = new THREE.Vector3();
  const shotURL = {};
  detailListeners.open.push((h) => {
    const c = canv[h.d];
    if (!c) return;
    screen.setTexture(h.d, c.canvas);
    if (!screenOn) screenAmt = 0;
    screenOn = true;
    shotURL[h.d] ||= c.canvas.toDataURL('image/jpeg', 0.86);
    const fig = document.createElement('figure'); fig.className = 'shot';
    fig.innerHTML = `<img alt="${PROJECTS[h.d].name}${c.real ? ' screenshot' : ' project card'}" src="${shotURL[h.d]}">`;
    detailBody.prepend(fig);
  });
  document.getElementById('hud-count').textContent = `${(N * 5.4 + (small || coarse ? 17000 : 35000)).toLocaleString('en-US', { maximumFractionDigits: 0 })} particles · real time`;

  const motionScale = reduced ? 0.25 : 1;
  objs.forEach((o, k) => { const u = o.material.uniforms; u.uMotion.value = motionScale; u.uGain.value = (F.mobile ? 0.52 : 0.62) * (k === 0 ? 0.85 : 1.15); });
  objs[0].material.uniforms.uIntro.value = 0;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.85, 0.55, 0.12);
  if (F.mobile) { bloom.strength = 0.5; bloom.threshold = 0.2; }
  composer.addPass(bloom);
  const finalPass = new ShaderPass(FINAL_SHADER);
  composer.addPass(finalPass);

  // ---- glyph morphs on the globe ----
  const glyphCache = new Map();
  let altKey = null, wantKey = null, altAmt = 0;
  let portrait = null;
  buildPortrait(meURL, N, 5.4).then((p) => (portrait = p)).catch(() => {});
  function glyph(key) {
    if (key === '__face') return portrait || buildText(['HELLO'], N, 5.6, fontFam, 21);
    if (!glyphCache.has(key)) glyphCache.set(key, buildText([key], N, key.length <= 2 ? 3.2 : 5.6, fontFam, 21));
    return glyphCache.get(key);
  }

  function setAll(name, v) { objs.forEach((o) => (o.material.uniforms[name].value = v)); }
  function resize() {
    const oldW = F.nameW, oldM = F.mobile;
    F = fit();
    camera.aspect = F.aspect; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth / 2, innerHeight / 2);
    setAll('uAspect', F.aspect); setAll('uPixelRatio', dpr);
    [ground, trail, sky].forEach((o) => (o.material.uniforms.uPixelRatio.value = dpr));
    finalPass.uniforms.uResolution.value.set(innerWidth * dpr, innerHeight * dpr);
    if (oldM !== F.mobile) path = buildPath(F.mobile);
    if (Math.abs(oldW - F.nameW) / oldW > 0.08) {
      attrs.position.array.set(buildName(N, F.nameW, fontFam)); attrs.position.needsUpdate = true;
    }
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

  // ---- audio ----
  const audio = createAudio();
  const soundBtn = document.getElementById('sound-toggle');
  soundBtn.addEventListener('click', () => {
    const on = audio.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.textContent = on ? 'Sound on' : 'Sound off';
    if (on) audio.chime(activeIdx);
  });
  let glitch = 0;
  listeners.push((i) => { if (!reduced) glitch = 0.8; audio.chime(i); });

  document.querySelectorAll('[data-glyph]').forEach((el) => {
    const on = () => { wantKey = el.dataset.glyph; audio.tick(); };
    const off = () => { if (wantKey === el.dataset.glyph) wantKey = null; };
    el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
    el.addEventListener('focus', on); el.addEventListener('blur', off);
  });

  // ---- per-object animation transforms (mirror of the shader) ----
  const M4 = THREE.Matrix4;
  function xform(k, t) {
    switch (k) {
      case 3: return new M4().makeRotationZ(t * 0.06);
      case 4: return new M4().makeRotationY(t * 0.05);
      case 6: return new M4().makeRotationY(t * 0.09);
      case 7: return new M4().makeRotationY(Math.sin(t * 0.13) * 0.4 - 0.1);
      default: return new M4();
    }
  }

  // ---- labels that live inside the objects ----
  const meta = shapes.meta;
  const SYSTEMS = ['SAP S/4HANA', 'SAP BPC', 'SAP BW', 'SAP Analytics Cloud', 'Power BI', 'Cegid PMI', 'ABAP', 'Python'];
  const METRICS = ['4–6 dashboards', '~30% faster', '30–50 users', '10–20 onboarded'];
  const HS = [
    { k: 1, p: [0.4, 1.7, 1.2], label: 'Read the incident', d: 'd-raw', kind: 'fault' },
    { k: 1, p: [2.3, -0.3, 1.0], label: 'Stock ≠ movements', kind: 'fault static', desk: true },
    { k: 1, p: [0.1, -1.8, 1.2], label: 'Production blocked', kind: 'fault static', desk: true },
    ...meta.goldCells.map((p, i) => ({ k: 2, p, label: i ? 'Stock accurate' : 'Record restored', d: 'd-clean', kind: 'sand' })),
    ...starTips().map((t, i) => ({ k: 3, p: t.map((v) => v * 1.14), label: SYSTEMS[i], d: `d-sys-${i}` })),
    { k: 4, p: [0, 0.95, 0], label: 'SHONE · consolidated view', d: 'd-shone', kind: 'sand' },
    ...meta.goldBars.map((p, i) => ({ k: 5, p, label: METRICS[i], d: 'd-geant', kind: 'sand' })),
    { k: 6, p: [-1.25, 0, -1.25], label: 'Olive Palace', d: 'd-olive' },
    { k: 6, p: [1.25, 1.7, 0.625], label: 'LatinaDZ', d: 'd-latina' },
    { k: 6, p: [0.625, -1.7, -1.875], label: 'Jewelry Store System', d: 'd-jewelry' },
    { k: 6, p: [-2.5, 1.7, 2.5], label: 'Interface', kind: 'static' },
    { k: 6, p: [-2.5, 0, 2.5], label: 'Logic', kind: 'static' },
    { k: 6, p: [-2.5, -1.7, 2.5], label: 'Data', kind: 'static' },
    { k: 7, p: meta.home, label: 'Bordj Bou Arreridj · 36.07°N 4.76°E', d: 'd-home', kind: 'sand' },
  ];
  const hsLayer = document.querySelector('.hotspots');
  HS.forEach((h) => {
    const el = document.createElement(h.d ? 'button' : 'span');
    el.className = `hs ${h.kind || ''}`;
    el.innerHTML = `<i aria-hidden="true"></i><b>${h.label}</b>`;
    if (h.d) {
      el.type = 'button'; el.tabIndex = -1;
      el.setAttribute('aria-label', `Open: ${h.label}`);
      el.addEventListener('click', (e) => { e.stopPropagation(); focusHS === h ? closeDetail() : openDetail(h); });
      el.addEventListener('pointerenter', () => audio.tick());
    }
    el.style.visibility = 'hidden';
    h.el = el; h.w = 0; h.v = new THREE.Vector3(); h.world = new THREE.Vector3();
    hsLayer.appendChild(el);
  });
  const hsWorld = (h, t, out) => out.set(...h.p).applyMatrix4(xform(h.k, t)).applyMatrix4(objs[h.k].matrixWorld);
  detailListeners.open.push(() => { glitch = reduced ? 0 : 0.7; audio.chime(activeIdx + 2); });

  // ---- career timeline written along the data river ----
  const pathD = buildPath(false);
  const MILESTONES = [
    [0.35, '2021', 'Intern · Transite Baghoura customs office'],
    [1.35, '2024', 'Bachelor · Information Systems & Software Engineering'],
    [2.35, 'Oct 2024', 'Backend developer & dev team lead'],
    [3.35, 'Jan 2025', 'Data Analyst · Géant Electronics'],
    [4.3, 'Mar 2025', 'SAP Young Professionals Program'],
    [5.35, '2025', 'Master 1 · Business Intelligence'],
    [6.3, 'Jun 2026', 'SAP BPC Consultant · CNPC'],
  ];
  const years = MILESTONES.map(([st, y, t]) => {
    const el = document.createElement('span');
    el.className = 'hs static year';
    el.innerHTML = `<i aria-hidden="true"></i><b><em>${y}</em>${t}</b>`;
    el.style.visibility = 'hidden';
    hsLayer.appendChild(el);
    const pos = pathD.pos.getPoint(pathParam(pathD, st + 0.1)).add(new THREE.Vector3(0, -2.4, 0));
    return { st, el, pos, v: new THREE.Vector3(), w: 0 };
  });

  // ---- journey minimap ----
  const mapSvg = document.querySelector('.minimap svg');
  const MX = (z) => ((22 - z) / 282) * 188 + 6, MY = (x) => ((x + 68) / 86) * 58 + 6;
  const mapDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  if (mapSvg) {
    const pts = []; const q = new THREE.Vector3();
    for (let i = 0; i <= 120; i++) { pathD.pos.getPoint(i / 120, q); pts.push(`${MX(q.z).toFixed(1)},${MY(q.x).toFixed(1)}`); }
    mapSvg.innerHTML = `<polyline class="route" points="${pts.join(' ')}"/>`;
    SCENES.forEach((d, k) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'stop'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `Travel to chapter ${k}: ${STAGES[k].toLowerCase()}`);
      g.innerHTML = `<circle cx="${MX(d.pos[2]).toFixed(1)}" cy="${MY(d.pos[0]).toFixed(1)}" r="3.2"/><text x="${MX(d.pos[2]).toFixed(1)}" y="${(MY(d.pos[0]) - 6).toFixed(1)}">${String(k).padStart(2, '0')}</text>`;
      const go = () => sections[k].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      mapSvg.appendChild(g);
    });
    mapDot.setAttribute('class', 'you'); mapDot.setAttribute('r', '3');
    mapSvg.appendChild(mapDot);
  }

  // ---- pointer: hover, drag to orbit, click for a shockwave ----
  const mouse = new THREE.Vector2(9, 9), mouseT = new THREE.Vector2(9, 9);
  let lastMove = -10, px = innerWidth / 2, py = innerHeight / 2;
  let drag = null, yaw = 0, pitch = 0, vYaw = 0, vPitch = 0, hoverEl = null;
  const INTERACTIVE = 'a, button, [data-glyph], #detail, .panel p, .panel h2, .panel ul';
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    mouseT.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (mouse.x > 5) mouse.copy(mouseT);
    lastMove = performance.now() / 1000;
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
      if (drag.mouse && drag.moved > 6) { vYaw = -dx * 0.004; vPitch = dy * 0.003; yaw += vYaw; pitch = clamp(pitch + vPitch, -0.6, 0.6); }
    }
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest(INTERACTIVE)) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0, mouse: e.pointerType === 'mouse' };
    if (drag.mouse) e.preventDefault();
  });
  addEventListener('pointerup', (e) => {
    if (!drag) return;
    if (drag.moved < 6) {
      if (focusHS) closeDetail();
      const t = objs[0].material.uniforms.uTime.value;
      objs.forEach((o) => o.material.uniforms.uShock.value.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, t));
      audio.thump();
      glitch = Math.max(glitch, reduced ? 0 : 0.35);
    }
    drag = null;
  });
  addEventListener('pointercancel', () => (drag = null));
  document.addEventListener('pointerover', (e) => { hoverEl = e.target.closest('.hs:not(.static), a, button, [data-glyph]'); });

  const cursor = document.getElementById('cursor');
  const curLabel = cursor.querySelector('span');
  let cx = px, cy = py, curText = '';

  resize();
  bootLog('Compiling shaders');
  const L0 = new THREE.Vector3(); pathD.pos.getPoint(0, camera.position); pathD.look.getPoint(0, L0); camera.lookAt(L0);
  try { renderer.compile(scene, camera); } catch {}
  bootLog('World ready');
  const t0 = performance.now();
  let stage = targetStage(), prevStage = stage, last = t0, frames = 0, slowAcc = 0, tier = 0, focusAmt = 0;
  const introDur = reduced ? 0.8 : 3.8;
  const scrim = document.querySelector('.scrim');
  const P = new THREE.Vector3(), L = new THREE.Vector3(), off = new THREE.Vector3(), tmp = new THREE.Vector3();
  const fP = new THREE.Vector3(), fL = new THREE.Vector3(), right = new THREE.Vector3(), upV = new THREE.Vector3();
  const aP8 = attrs.aP8;
  root.classList.add('ready');

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const time = (now - t0) / 1000;
    if (document.hidden) { requestAnimationFrame(frame); return; }

    const target = targetStage();
    stage += (target - stage) * Math.min(1, dt * 2.6);
    const vel = Math.abs(stage - prevStage) / Math.max(dt, 1e-3); prevStage = stage;
    setActive(clamp(Math.round(stage), 0, 7));
    progressBar.style.transform = `scaleX(${stage / 7})`;
    if (focusHS && Math.abs(stage - focusHS.k) > 0.4) closeDetail();

    const introT = Math.min(1, time / introDur);
    const fr = stage - Math.floor(stage);
    const motion = Math.sin(Math.PI * fr);

    mouse.lerp(mouseT, Math.min(1, dt * 8));
    const active = now / 1000 - lastMove < 1.6 && !coarse ? 1 : 0;
    const ms = objs[0].material.uniforms.uMouseStrength.value + (active - objs[0].material.uniforms.uMouseStrength.value) * Math.min(1, dt * 3);

    // glyph morph
    const desired = stage > 6.6 ? wantKey : null;
    if (desired !== altKey) {
      altAmt = Math.max(0, altAmt - dt * 5);
      if (altAmt <= 0.001) { altKey = desired; if (altKey) { aP8.array.set(glyph(altKey)); aP8.needsUpdate = true; } }
    } else if (altKey) altAmt = Math.min(1, altAmt + dt * 1.8);

    // scenes: assemble on arrival, scatter on departure, skip drawing far ones
    objs.forEach((o, k) => {
      const d = Math.abs(stage - k);
      const vis = d < 1.7 || (k === 7 && stage > 5.2);
      o.visible = vis;
      if (!vis) return;
      const u = o.material.uniforms;
      u.uTime.value = time;
      u.uForm.value = ease((1.3 - d) / 1.0);
      u.uMouse.value.copy(mouse); u.uMouseStrength.value = ms;
      u.uLens.value = k === 1 ? ms : 0;
      u.uAlt.value = k === 7 ? altAmt : 0;
    });
    objs[0].material.uniforms.uIntro.value = introT;
    objs[0].material.uniforms.uMouseStrength.value = ms;
    [ground, trail, sky].forEach((o) => (o.material.uniforms.uTime.value = time));

    // camera: follow the journey, then orbit (drag), parallax, and focus on an open label
    const u = pathParam(path, stage);
    path.pos.getPoint(u, P); path.look.getPoint(u, L);
    if (!drag) { yaw += vYaw; pitch += vPitch; vYaw *= 0.92; vPitch *= 0.92; yaw -= yaw * Math.min(1, dt * 0.8); pitch -= pitch * Math.min(1, dt * 0.8); }
    off.subVectors(P, L).applyAxisAngle(upV.set(0, 1, 0), yaw);
    right.crossVectors(upV, off).normalize();
    off.applyAxisAngle(right, pitch);
    P.copy(L).add(off);
    const mx = mouse.x > 5 ? 0 : mouse.x, my = mouse.y > 5 ? 0 : mouse.y;
    camera.position.copy(P); camera.lookAt(L); camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0); upV.setFromMatrixColumn(camera.matrixWorld, 1);
    P.addScaledVector(right, mx * 0.6).addScaledVector(upV, my * 0.35);

    focusAmt += ((focusHS ? 1 : 0) - focusAmt) * Math.min(1, dt * 2.4);
    if (focusAmt > 0.002 && (focusHS || fP.lengthSq() > 0)) {
      if (focusHS) {
        hsWorld(focusHS, time, tmp);
        const dist = 5 + SCENES[focusHS.k].s * 2.2;
        fP.subVectors(P, tmp).normalize().multiplyScalar(dist).add(tmp);
        fL.copy(tmp);
        if (F.mobile) fL.addScaledVector(upV, -dist * 0.3); else fL.addScaledVector(right, dist * 0.28);
      }
      P.lerp(fP, ease(focusAmt)); L.lerp(fL, ease(focusAmt));
    }
    camera.position.copy(P);
    camera.fov = F.fov + (reduced ? 0 : motion * 9);
    camera.updateProjectionMatrix();
    camera.lookAt(L);
    camera.updateMatrixWorld();
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    right.setFromMatrixColumn(camera.matrixWorld, 0); upV.setFromMatrixColumn(camera.matrixWorld, 1);
    objs.forEach((o) => (o.material.uniforms.uTanHalf.value = tanHalf));
    scrim.style.opacity = F.mobile ? 1 : (0.4 + 0.6 * Math.min(1, stage * 1.6)).toFixed(3);

    glitch = Math.max(0, glitch - dt * 2.6);
    finalPass.uniforms.uTime.value = time;
    finalPass.uniforms.uGlitch.value = glitch;
    finalPass.uniforms.uAberration.value = (0.0022 + Math.min(0.02, vel * 0.01) + motion * 0.004 + altAmt * (1 - altAmt) * 0.02) * (reduced ? 0.3 : 1);
    audio.update(Math.min(1, motion + altAmt * (1 - altAmt) * 2), vel);

    // labels
    for (const h of HS) {
      let w = clamp(1 - Math.abs(stage - h.k) * 3.2, 0, 1) * (h.k === 0 ? introT : 1) * (h.k === 7 ? 1 - altAmt : 1);
      if (focusHS && focusHS !== h) w *= 0.25;
      if (w > 0.01) { hsWorld(h, time, h.v).project(camera); if (h.v.z > 1 || Math.abs(h.v.x) > 1.1 || Math.abs(h.v.y) > 1.1 || (h.desk && F.mobile)) w = 0; }
      const was = h.w; h.w = w;
      if (w < 0.01) { if (was >= 0.01) { h.el.style.visibility = 'hidden'; if (h.d) h.el.tabIndex = -1; } continue; }
      if (was < 0.01) { h.el.style.visibility = 'visible'; if (h.d) h.el.tabIndex = 0; scramble(h.el.querySelector('b'), 500); }
      const sx = ((h.v.x + 1) / 2) * innerWidth, flip = sx > innerWidth - 190;
      h.el.style.transform = `translate(${sx}px, ${((1 - h.v.y) / 2) * innerHeight}px)${flip ? ' translateX(calc(-100% + 18px))' : ''}`;
      h.el.classList.toggle('flip', flip);
      h.el.style.opacity = w.toFixed(3);
      h.el.classList.toggle('active', focusHS === h);
      h.el.style.pointerEvents = w > 0.5 ? 'auto' : 'none';
    }

    // timeline labels
    for (const y of years) {
      let w = clamp(1 - Math.abs(stage - y.st) / 0.32, 0, 1);
      if (w > 0.01) { y.v.copy(y.pos).project(camera); if (y.v.z > 1 || Math.abs(y.v.x) > 1.05 || Math.abs(y.v.y) > 1.05) w = 0; }
      if (w < 0.01) { if (y.w >= 0.01) y.el.style.visibility = 'hidden'; y.w = w; continue; }
      if (y.w < 0.01) y.el.style.visibility = 'visible';
      y.w = w;
      const ysx = ((y.v.x + 1) / 2) * innerWidth, yflip = ysx > innerWidth - 360;
      y.el.style.transform = `translate(${ysx}px, ${((1 - y.v.y) / 2) * innerHeight}px)${yflip ? ' translateX(calc(-100% + 18px))' : ''}`;
      y.el.classList.toggle('flip', yflip);
      y.el.style.opacity = w.toFixed(3);
    }
    if (mapSvg) { mapDot.setAttribute('cx', MX(camera.position.z).toFixed(1)); mapDot.setAttribute('cy', MY(camera.position.x).toFixed(1)); }

    // project screen assembled from particles
    const wantScreen = !!(focusHS && canv[focusHS.d]);
    if (!wantScreen && screenAmt < 0.01) screenOn = false;
    screenAmt += ((wantScreen ? 1 : 0) - screenAmt) * Math.min(1, dt * (wantScreen ? 0.9 : 2.2));
    screen.points.visible = screen.plane.visible = screen.back.visible = screenAmt > 0.005;
    if (screen.points.visible) {
      if (focusHS) hsWorld(focusHS, time, screenFrom);
      const fwd = tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const sw = F.mobile ? 3.0 : 5.6;
      const target = camera.position.clone().addScaledVector(fwd, 9);
      if (F.mobile) target.addScaledVector(upV, 3.1); else target.addScaledVector(right, -2.0);
      if (screenC.lengthSq() === 0 || screenAmt < 0.05) screenC.copy(target); else screenC.lerp(target, Math.min(1, dt * 5));
      const U2 = screen.uniforms;
      U2.uTime.value = time; U2.uForm.value = screenAmt; U2.uFrom.value.copy(screenFrom); U2.uCenter.value.copy(screenC);
      U2.uRight.value.copy(right).multiplyScalar(sw / 2); U2.uUp.value.copy(upV).multiplyScalar(sw * 0.3125);
      U2.uPixelRatio.value = dpr;
      U2.uScale.value = (sw / (F.mobile ? 120 : 190)) / (2 * 9 * tanHalf) * innerHeight * 9 * 1.15;
      screen.plane.position.copy(screenC); screen.plane.quaternion.copy(camera.quaternion); screen.plane.scale.set(sw, sw * 0.625, 1);
      screen.plane.material.opacity = ease((screenAmt - 0.8) / 0.2) * 0.96;
      screen.back.position.copy(screenC).addScaledVector(fwd, 0.05); screen.back.quaternion.copy(camera.quaternion);
      screen.back.scale.set(sw * 1.06, sw * 0.625 + sw * 0.06, 1);
      screen.back.material.opacity = ease(screenAmt * 1.6) * 0.82;
    }

    if (!coarse) {
      cx += (px - cx) * Math.min(1, dt * 16); cy += (py - cy) * Math.min(1, dt * 16);
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      let txt = '';
      if (drag && drag.moved > 6) txt = 'Orbit';
      else if (hoverEl?.classList.contains('hs')) txt = 'Open';
      else if (hoverEl?.dataset.glyph) txt = 'Look';
      else if (!hoverEl && Math.abs(stage - 1) < 0.3) txt = 'Repair';
      else if (!hoverEl && stage < 0.4) txt = 'Click · Drag';
      if (txt !== curText) { curText = txt; curLabel.textContent = txt; }
      cursor.classList.toggle('big', !!hoverEl || !!txt);
      cursor.classList.toggle('down', !!drag);
    }

    composer.render();
    if (!root.classList.contains('booted')) bootDone();

    if (introT >= 1 && tier < 2) {
      frames++; slowAcc += dt;
      if (frames === 90) {
        if (slowAcc / frames > 1 / 34) {
          tier++;
          if (tier === 1) { dpr = 1; renderer.setPixelRatio(1); resize(); }
          else bloom.enabled = false;
        } else tier = 2;
        frames = 0; slowAcc = 0;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
