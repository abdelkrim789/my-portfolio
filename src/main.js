import '@fontsource/big-shoulders-display/latin-600';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource/ibm-plex-sans/latin-400';
import '@fontsource/ibm-plex-sans/latin-500';
import '@fontsource/ibm-plex-sans/latin-600';
import '@fontsource/ibm-plex-mono/latin-400';
import '@fontsource/ibm-plex-mono/latin-500';
import * as THREE from 'three';
import meURL from './assets/me.jpg?inline';
import { WORLDS, WORLD_ORDER, savedWorld, saveWorld } from './worlds.js';
import { createAudio } from './audio.js';
import { PROJECTS, projectCanvas } from './screens.js';
import { POINTS, MILESTONES } from './content.js';
import { createComposite } from './transition.js';
import { createPaper } from './worlds/paper.js';
import { createNight } from './worlds/night.js';
import { createSchematic } from './worlds/schematic.js';

const STAGES = ['SIGNAL', 'RAW', 'CLEAN', 'MODEL', 'CONSOLIDATE', 'REPORT', 'BUILD', 'DECIDE'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const root = document.documentElement;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// ---------- worlds ----------
let world = savedWorld();
const themeMeta = document.querySelector('meta[name="theme-color"]');
function applyWorldCSS(w) {
  root.dataset.world = w;
  themeMeta?.setAttribute('content', WORLDS[w].theme);
  document.querySelectorAll('.worlds button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.world === w)));
}
const worldsBox = document.querySelector('.worlds');
WORLD_ORDER.forEach((w) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'orb'; b.dataset.world = w;
  b.innerHTML = `<i aria-hidden="true"></i><span>${WORLDS[w].name}</span>`;
  b.setAttribute('aria-label', `Enter the ${WORLDS[w].name} world: ${WORLDS[w].tag.toLowerCase()}`);
  b.title = `${WORLDS[w].name} · ${WORLDS[w].tag}`;
  b.addEventListener('click', () => { const r = b.getBoundingClientRect(); travelTo(w, r.left + r.width / 2, r.top + r.height / 2); });
  worldsBox?.appendChild(b);
});
applyWorldCSS(world);
let worldGL = null; // set once WebGL is up
const toast = document.getElementById('world-toast');
let toastT;
function showToast(w) {
  if (!toast) return;
  const tb = toast.querySelector('b'); tb.textContent = WORLDS[w].name; tb.dataset.final = WORLDS[w].name;
  toast.querySelector('span').textContent = WORLDS[w].tag;
  toast.classList.add('on');
  scramble(toast.querySelector('b'), 650);
  clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 1900);
}
// cubic-bezier(0.65, 0, 0.25, 1): the same curve drives the CSS reveal and the WebGL ring
const PORTAL_MS = reduced ? 350 : 2100;
let portalBusy = false;
async function travelTo(w, x = innerWidth / 2, y = innerHeight / 2) {
  if (w === world || portalBusy) return;
  portalBusy = true;
  if (worldGL) {
    toast?.classList.add('loading');
    try { await worldGL.prepare(w); } catch (e) { console.error(e); portalBusy = false; toast?.classList.remove('loading'); return; }
    toast?.classList.remove('loading');
  }
  const prev = world;
  world = w; saveWorld(w);
  showToast(w);
  const swapCSS = () => { root.classList.add('swapping'); applyWorldCSS(w); setTimeout(() => root.classList.remove('swapping'), 900); };
  if (worldGL) { worldGL.start(prev, w, x, y, PORTAL_MS); setTimeout(swapCSS, PORTAL_MS * 0.32); } else swapCSS();
  setTimeout(() => { portalBusy = false; }, PORTAL_MS);
}

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
  b.innerHTML = `<span>${String(i).padStart(2, '0')}</span><em>${STAGES[i]}</em><small class="tally" data-chapter="${i}"></small>`;
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
  hudStage.textContent = `${String(i).padStart(2, '0')} · ${STAGES[i]}`;
  dockPrev.disabled = i === 0; dockNext.disabled = i === sections.length - 1;
  dockNext.querySelector('span').textContent = i < sections.length - 1 ? `Next · ${STAGES[i + 1].toLowerCase()}` : 'The end';
  scramble(sections[i].querySelector('h2'));
  listeners.forEach((fn) => fn(i));
}

const dockPrev = document.querySelector('.dock .prev'), dockNext = document.querySelector('.dock .next');
const goChapter = (i) => sections[clamp(i, 0, sections.length - 1)].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
dockPrev?.addEventListener('click', () => goChapter(activeIdx - 1));
dockNext?.addEventListener('click', () => goChapter(activeIdx + 1));

// controls guide
const guide = document.getElementById('guide');
const guideBtn = document.getElementById('guide-toggle');
function setGuide(on) { guide.hidden = !on; guideBtn.setAttribute('aria-expanded', String(on)); if (on) guide.querySelector('button').focus(); }
guideBtn?.addEventListener('click', () => setGuide(guide.hidden));
guide?.querySelector('button').addEventListener('click', () => { setGuide(false); guideBtn.focus(); });
guide?.addEventListener('click', (e) => { if (e.target === guide) setGuide(false); });

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
const HS_ALL = POINTS.map((p) => ({ ...p }));
const detailListeners = { open: [] };
const seen = new Set();
try { JSON.parse(localStorage.getItem('ag-seen') || '[]').forEach((d) => seen.add(d)); } catch {}
const detailPrev = detail.querySelector('.detail-nav .prev'), detailNext = detail.querySelector('.detail-nav .next'), detailPos = detail.querySelector('.detail-nav .pos');
const chapterPoints = (k) => HS_ALL.filter((h) => h.k === k && h.d);
function updateTallies() {
  for (let k = 0; k < sections.length; k++) {
    const pts = chapterPoints(k);
    const n = pts.filter((h) => seen.has(h.d)).length;
    document.querySelectorAll(`.tally[data-chapter="${k}"]`).forEach((el) => {
      el.textContent = pts.length ? `${n}/${pts.length}` : '';
      el.classList.toggle('done', pts.length > 0 && n === pts.length);
    });
  }
  HS_ALL.forEach((h) => h.el?.classList.toggle('seen', !!h.d && seen.has(h.d)));
}
function openDetail(hs) {
  const tpl = document.getElementById(hs.d);
  if (!tpl) return;
  detailBody.replaceChildren(tpl.content.cloneNode(true));
  detail.classList.add('open'); detail.inert = false;
  root.classList.add('focused');
  const switching = !!focusHS;
  focusHS = hs;
  seen.add(hs.d);
  try { localStorage.setItem('ag-seen', JSON.stringify([...seen])); } catch {}
  updateTallies();
  const pts = chapterPoints(hs.k), i = pts.indexOf(hs);
  detailPos.textContent = `${i + 1} / ${pts.length}`;
  const many = pts.length > 1;
  detailPrev.hidden = detailNext.hidden = !many;
  if (many) {
    detailPrev.querySelector('span').textContent = pts[(i - 1 + pts.length) % pts.length].label;
    detailNext.querySelector('span').textContent = pts[(i + 1) % pts.length].label;
  }
  detailBody.scrollTop = 0; detail.scrollTop = 0;
  scramble(detailBody.querySelector('h3'), 500);
  if (!switching) detail.querySelector('.close').focus({ preventScroll: true });
  detailListeners.open.forEach((f) => f(hs));
}
function stepDetail(dir) {
  if (!focusHS) return;
  const pts = chapterPoints(focusHS.k), i = pts.indexOf(focusHS);
  if (pts.length > 1) openDetail(pts[(i + dir + pts.length) % pts.length]);
}
detailPrev.addEventListener('click', () => stepDetail(-1));
detailNext.addEventListener('click', () => stepDetail(1));
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
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!guide.hidden) setGuide(false); else closeDetail(); } });

// ---------- boot sequence ----------
const bootList = document.querySelector('#boot ol');
function bootLog(t) { if (!bootList) return; const li = document.createElement('li'); li.textContent = t; bootList.appendChild(li); }
function bootDone() { root.classList.add('booted'); setTimeout(() => document.getElementById('boot')?.remove(), 1200); }
setTimeout(bootDone, 9000);

// keyboard: arrows travel between chapters
// keyboard: arrows travel between chapters, or between points while a panel is open; W changes world; ? shows controls
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '?') { e.preventDefault(); setGuide(guide.hidden); return; }
  if (e.key === 'w' || e.key === 'W') { const i = WORLD_ORDER.indexOf(world); travelTo(WORLD_ORDER[(i + 1) % WORLD_ORDER.length]); return; }
  if (focusHS && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); stepDetail(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (e.target.closest?.('#detail')) return;
  const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
  if (!dir) return;
  e.preventDefault();
  goChapter(activeIdx + dir);
});

// ---------- WebGL ----------
const canvas = document.getElementById('stage');
const gl2 = (() => { try { return !!canvas.getContext('webgl2'); } catch { return false; } })();
if (!gl2) {
  root.classList.add('no-webgl');
  bootDone();
  updateTallies();
  const loop = () => { const s = targetStage(); setActive(Math.min(7, Math.floor(s + 0.4))); progressBar.style.transform = `scaleX(${s / 7})`; requestAnimationFrame(loop); };
  loop();
} else {
  root.classList.add('webgl');
  start().catch((e) => { console.error(e); bootDone(); });
}

async function start() {
  const small = innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const fontFam = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
  try { await Promise.race([document.fonts.load('800 200px "Big Shoulders Display"'), new Promise((r) => setTimeout(r, 1800))]); } catch {}
  const canv = {};
  for (const id of Object.keys(PROJECTS)) canv[id] = await projectCanvas(id);

  // project images in the story panel, for every world
  const shotURL = {};
  detailListeners.open.push((h) => {
    const c = canv[h.d];
    if (!c) return;
    shotURL[h.d] ||= c.canvas.toDataURL('image/jpeg', 0.86);
    const fig = document.createElement('figure'); fig.className = 'shot';
    fig.innerHTML = `<img alt="${PROJECTS[h.d].name}${c.real ? ' screenshot' : ' project card'}" src="${shotURL[h.d]}">`;
    detailBody.prepend(fig);
  });

  const env = { renderer, small, coarse, reduced, fontFam, meURL, canv, goChapter };
  const makers = { day: createPaper, night: createNight, blueprint: createSchematic };
  const LOGS = { day: 'Folding the paper atlas', night: 'Waking the desert particles', blueprint: 'Plotting the tower' };
  const made = {}, making = {};
  async function ensure(id) {
    if (made[id]) return made[id];
    if (!making[id]) making[id] = makers[id](env).then((w) => { w.resize(innerWidth, innerHeight, dpr); made[id] = w; return w; });
    return making[id];
  }
  bootLog(LOGS[world]);
  let active = await ensure(world);
  bootLog('World ready');

  const composite = createComposite();
  const audio = createAudio();
  let glitch = 0;
  let trans = null;
  worldGL = {
    prepare: (id) => ensure(id),
    start(prevId, id, x, y, dur) {
      trans = { from: made[prevId], t0: performance.now(), dur, ox: x / innerWidth, oy: 1 - y / innerHeight };
      active = made[id];
      composite.uniforms.uOrigin.value.set(trans.ox, trans.oy);
      composite.uniforms.uCrack.value.setRGB(...WORLDS[id].ring);
      if (!reduced) glitch = 0.6;
      audio.crack(); setTimeout(() => audio.chime(activeIdx + 4), 520);
    },
  };
  // warm up the other worlds in the background once this one is running
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 2500));
  setTimeout(() => idle(() => WORLD_ORDER.filter((w) => w !== 'night' || !small).forEach((w) => ensure(w).catch(() => {}))), 6000);

  function resize() {
    renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight);
    composite.uniforms.uAspect.value = innerWidth / innerHeight;
    composite.uniforms.uRes.value.set(innerWidth * dpr, innerHeight * dpr);
    Object.values(made).forEach((w) => w.resize(innerWidth, innerHeight, dpr));
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize();

  // ---- sound ----
  const soundBtn = document.getElementById('sound-toggle');
  soundBtn.addEventListener('click', () => {
    const on = audio.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.textContent = on ? 'Sound on' : 'Sound off';
    if (on) audio.chime(activeIdx);
  });
  listeners.push((i) => { if (!reduced) glitch = Math.max(glitch, 0.5); audio.chime(i); });
  let wantKey = null;
  document.querySelectorAll('[data-glyph]').forEach((el) => {
    const on = () => { wantKey = el.dataset.glyph; audio.tick(); };
    const off = () => { if (wantKey === el.dataset.glyph) wantKey = null; };
    el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
    el.addEventListener('focus', on); el.addEventListener('blur', off);
  });

  // ---- labels inside the worlds ----
  const hsLayer = document.querySelector('.hotspots');
  const HS = HS_ALL;
  HS.forEach((h) => {
    const el = document.createElement('button');
    el.className = `hs ${h.kind || ''}`;
    el.innerHTML = `<i aria-hidden="true"></i><b>${h.label}</b>`;
    el.type = 'button'; el.tabIndex = -1;
    el.setAttribute('aria-label', `Open: ${h.label}`);
    el.addEventListener('click', (e) => { e.stopPropagation(); focusHS === h ? closeDetail() : openDetail(h); });
    el.addEventListener('pointerenter', () => audio.tick());
    el.style.visibility = 'hidden';
    h.el = el; h.w = 0; h.v = new THREE.Vector3();
    hsLayer.appendChild(el);
  });
  updateTallies();
  detailListeners.open.push(() => { glitch = reduced ? 0 : Math.max(glitch, 0.4); audio.chime(activeIdx + 2); });
  const years = MILESTONES.map(([st, y, t]) => {
    const el = document.createElement('span');
    el.className = 'hs static year';
    el.innerHTML = `<i aria-hidden="true"></i><b><em>${y}</em>${t}</b>`;
    el.style.visibility = 'hidden';
    hsLayer.appendChild(el);
    return { st, el, v: new THREE.Vector3(), w: 0 };
  });

  // ---- pointer: hover, drag to orbit, click for a shockwave ----
  const mouse = new THREE.Vector2(9, 9), mouseT = new THREE.Vector2(9, 9);
  let lastMove = -10, px = innerWidth / 2, py = innerHeight / 2;
  let drag = null, yaw = 0, pitch = 0, vYaw = 0, vPitch = 0, hoverEl = null;
  const INTERACTIVE = 'a, button, [data-glyph], #detail, #guide, .panel p, .panel h2, .panel ul';
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    mouseT.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (mouse.x > 5) mouse.copy(mouseT);
    lastMove = performance.now() / 1000;
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
      if (drag.mouse && drag.moved > 6) { vYaw = -dx * 0.004; vPitch = dy * 0.003; yaw += vYaw; pitch = clamp(pitch + vPitch, -0.5, 0.5); }
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
      active.shock((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, (performance.now() - t0) / 1000, stage);
      audio.thump();
      glitch = Math.max(glitch, reduced ? 0 : 0.3);
    }
    drag = null;
  });
  addEventListener('pointercancel', () => (drag = null));
  document.addEventListener('pointerover', (e) => { hoverEl = e.target.closest('.hs:not(.static), a, button, [data-glyph]'); });
  const cursor = document.getElementById('cursor');
  const curLabel = cursor.querySelector('span');
  let cx = px, cy = py, curText = '';

  const t0 = performance.now();
  let stage = targetStage(), prevStage = stage, last = t0, frames = 0, slowAcc = 0, tier = 0, focusAmt = 0;
  const introDur = reduced ? 0.8 : 3.8;
  const scrim = document.querySelector('.scrim');
  const P = new THREE.Vector3(), L = new THREE.Vector3(), off = new THREE.Vector3(), tmp = new THREE.Vector3();
  const fP = new THREE.Vector3(), fL = new THREE.Vector3(), right = new THREE.Vector3(), upV = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const ease2 = (x) => { const t = clamp(x, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  root.classList.add('ready');

  function placeCamera(W, time, motion, interactive, arrive) {
    const fov = W.pose(stage, P, L);
    if (interactive) {
      off.subVectors(P, L).applyAxisAngle(Y, yaw);
      right.crossVectors(Y, off).normalize();
      off.applyAxisAngle(right, pitch);
      P.copy(L).add(off);
    }
    if (arrive > 0) P.sub(L).multiplyScalar(1 + arrive * 0.45).add(L);
    const cam = W.camera;
    cam.position.copy(P); cam.lookAt(L); cam.updateMatrixWorld();
    right.setFromMatrixColumn(cam.matrixWorld, 0); upV.setFromMatrixColumn(cam.matrixWorld, 1);
    if (interactive) {
      const mx = mouse.x > 5 ? 0 : mouse.x, my = mouse.y > 5 ? 0 : mouse.y;
      const par = P.distanceTo(L) * 0.012;
      P.addScaledVector(right, mx * par * 3).addScaledVector(upV, my * par * 1.8);
      if (focusAmt > 0.002 && (focusHS || fP.lengthSq() > 0)) {
        if (focusHS && W.anchor(focusHS.d, time, tmp)) {
          const dist = W.focusDist(focusHS.d);
          fP.subVectors(P, tmp).normalize().multiplyScalar(dist).add(tmp);
          fL.copy(tmp);
          if (innerWidth / innerHeight < 0.9) fL.addScaledVector(upV, -dist * 0.3); else fL.addScaledVector(right, dist * 0.28);
        }
        const e = ease2(focusAmt);
        P.lerp(fP, e); L.lerp(fL, e);
      }
    }
    cam.position.copy(P);
    cam.fov = fov + (reduced ? 0 : motion * W.fovKick);
    cam.updateProjectionMatrix();
    cam.lookAt(L); cam.updateMatrixWorld();
  }

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
    const motion = Math.sin(Math.PI * (stage - Math.floor(stage)));
    mouse.lerp(mouseT, Math.min(1, dt * 8));
    const mouseActive = now / 1000 - lastMove < 1.6 && !coarse && mouse.x < 5;
    if (!drag) { yaw += vYaw; pitch += vPitch; vYaw *= 0.92; vPitch *= 0.92; yaw -= yaw * Math.min(1, dt * 0.8); pitch -= pitch * Math.min(1, dt * 0.8); }
    focusAmt += ((focusHS ? 1 : 0) - focusAmt) * Math.min(1, dt * 2.4);
    glitch = Math.max(0, glitch - dt * 2.2);

    let tT = -1;
    if (trans) { tT = (now - trans.t0) / trans.dur; if (tT >= 1) { trans = null; tT = -1; } }
    const arrive = tT >= 0 ? 1 - ease2(tT) : 0;
    const portalW = tT >= 0 ? Math.sin(Math.PI * tT) : 0;
    const ctx = { dt, time, stage, vel, mouse, mouseActive, introT, glyphKey: wantKey, focusD: focusHS?.d, portalW: reduced ? 0 : portalW, glitch };

    placeCamera(active, time, motion, true, arrive);
    active.update(ctx);
    const texA = active.render();
    let texB = null;
    if (trans && trans.from) {
      placeCamera(trans.from, time, motion, false, 0);
      trans.from.update({ ...ctx, mouseActive: false, focusD: null });
      texB = trans.from.render();
    }
    composite.uniforms.uTime.value = time;
    composite.uniforms.uGlitch.value = active.id === 'night' ? 0 : glitch;
    composite.draw(renderer, texA, active.post, texB, trans?.from?.post, Math.max(0, tT));
    scrim.style.opacity = innerWidth / innerHeight < 0.9 ? 1 : (0.4 + 0.6 * Math.min(1, stage * 1.6)).toFixed(3);
    audio.update(Math.min(1, motion + portalW), vel);

    // labels
    const cam = active.camera;
    const lw = tT >= 0 ? clamp((tT - 0.6) / 0.4, 0, 1) : 1;
    for (const h of HS) {
      let w = clamp(1 - Math.abs(stage - h.k) * 3.2, 0, 1) * lw * (h.k === 7 ? 1 - active.labelMute() : 1);
      if (focusHS && focusHS !== h) w *= 0.25;
      if (w > 0.01) { if (!active.anchor(h.d, time, h.v)) w = 0; else { h.v.project(cam); if (h.v.z > 1 || Math.abs(h.v.x) > 1.1 || Math.abs(h.v.y) > 1.1) w = 0; } }
      const was = h.w; h.w = w;
      if (w < 0.01) { if (was >= 0.01) { h.el.style.visibility = 'hidden'; h.el.tabIndex = -1; } continue; }
      if (was < 0.01) { h.el.style.visibility = 'visible'; h.el.tabIndex = 0; scramble(h.el.querySelector('b'), 500); }
      const sx = ((h.v.x + 1) / 2) * innerWidth, flip = sx > innerWidth - 190;
      h.el.style.transform = `translate(${sx}px, ${((1 - h.v.y) / 2) * innerHeight}px)${flip ? ' translateX(calc(-100% + 18px))' : ''}`;
      h.el.classList.toggle('flip', flip);
      h.el.style.opacity = w.toFixed(3);
      h.el.classList.toggle('active', focusHS === h);
      h.el.style.pointerEvents = w > 0.5 ? 'auto' : 'none';
    }
    years.forEach((y, i) => {
      let w = clamp(1 - Math.abs(stage - y.st) / 0.32, 0, 1) * lw;
      if (w > 0.01) { active.milestone(i, y.v).project(cam); if (y.v.z > 1 || Math.abs(y.v.x) > 1.05 || Math.abs(y.v.y) > 1.05) w = 0; }
      if (w < 0.01) { if (y.w >= 0.01) y.el.style.visibility = 'hidden'; y.w = w; return; }
      if (y.w < 0.01) y.el.style.visibility = 'visible';
      y.w = w;
      const ysx = ((y.v.x + 1) / 2) * innerWidth, yflip = ysx > innerWidth - 360;
      y.el.style.transform = `translate(${ysx}px, ${((1 - y.v.y) / 2) * innerHeight}px)${yflip ? ' translateX(calc(-100% + 18px))' : ''}`;
      y.el.classList.toggle('flip', yflip);
      y.el.style.opacity = w.toFixed(3);
    });

    if (!coarse) {
      cx += (px - cx) * Math.min(1, dt * 16); cy += (py - cy) * Math.min(1, dt * 16);
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      let txt = '';
      if (drag && drag.moved > 6) txt = 'Orbit';
      else if (hoverEl?.classList.contains('hs')) txt = 'Open';
      else if (hoverEl?.dataset.glyph) txt = 'Look';
      else if (!hoverEl && Math.abs(stage - 1) < 0.3) txt = 'Repair';
      else if (!hoverEl && active.cursor?.()) txt = active.cursor();
      else if (!hoverEl && stage < 0.4) txt = 'Click · Drag';
      if (txt !== curText) { curText = txt; curLabel.textContent = txt; }
      cursor.classList.toggle('big', !!hoverEl || !!txt);
      cursor.classList.toggle('down', !!drag);
    }
    if (!root.classList.contains('booted')) bootDone();

    if (introT >= 1 && tier < 2 && !trans) {
      frames++; slowAcc += dt;
      if (frames === 90) {
        if (slowAcc / frames > 1 / 34) {
          tier++;
          if (tier === 1) { dpr = 1; resize(); } else Object.values(made).forEach((w) => w.quality(2));
        } else tier = 2;
        frames = 0; slowAcc = 0;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
