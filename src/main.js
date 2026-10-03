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
import { POINTS, MILESTONES, STAGES } from './content.js';
import { createComposite } from './transition.js';
import { createGuide } from './guide.js';

// Night is a journey through the page scroll; the Monument and the Desk run their own interface and input.
const UI = { night: 'journey', monument: 'own', desk: 'own' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const root = document.documentElement;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const canvas = document.getElementById('stage');
const gl2 = (() => { try { return !!canvas.getContext('webgl2'); } catch { return false; } })();

// ---------- worlds ----------
let world = gl2 ? savedWorld() : 'night';
const themeMeta = document.querySelector('meta[name="theme-color"]');
const worldBtn = document.getElementById('world-btn');
function applyWorldCSS(w) {
  root.dataset.world = w;
  root.dataset.ui = UI[w];
  themeMeta?.setAttribute('content', WORLDS[w].theme);
  if (worldBtn) { worldBtn.querySelector('b').textContent = WORLDS[w].short || WORLDS[w].name; worldBtn.setAttribute('aria-label', `World: ${WORLDS[w].name}. Change world`); }
}
applyWorldCSS(world);
let worldGL = null; // set once WebGL is up
let warm = () => {};

// ---------- achievements ----------
const ACH = [
  ['multiverse', 'Multiverse', 'Visit all three worlds'],
  ['points', 'Every point', 'Open all 33 stories in the Night'],
  ['finale', 'The decision', 'Reach the last chapter of the Night'],
  ['tremor', 'Seismic', 'Send ten shockwaves through the Night'],
  ['systems', 'Power on', 'Light all twelve systems in the Monument'],
  ['repair', 'Fixer', 'Repair the corrupted stock at Géant'],
  ['consolidate', 'Consolidated', 'Open all six streams into the core'],
  ['archive', 'Explorer', 'Find the hidden archive'],
  ['vault', 'Keyholder', 'Open the vault beneath the floor'],
  ['noor', 'Curious', 'Ask NOOR five questions'],
  ['tcode', 'Power user', 'Run a transaction code on my computer'],
  ['floppy', 'Disk jockey', 'Change world with a floppy disk'],
  ['postcard', 'Wish you were here', 'Take a postcard (P)'],
  ['hello', 'Hello', 'Meet the person behind it'],
];
const store = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const got = new Set(store('ag-ach', []).filter((id) => ACH.some((a) => a[0] === id)));
const visitedWorlds = new Set(store('ag-worlds', []).filter((w) => WORLDS[w]));
const achToast = document.getElementById('ach-toast');
let achT;
function renderAch() {
  const ul = document.getElementById('ach-list'); if (!ul) return;
  ul.innerHTML = ACH.map(([id, name, how]) => `<li class="${got.has(id) ? 'got' : ''}"><b>${name}</b><span>${how}</span></li>`).join('');
  const c = document.getElementById('ach-count'); if (c) c.textContent = `${got.size}/${ACH.length}`;
}
function achieve(id) {
  if (got.has(id)) return;
  const a = ACH.find((x) => x[0] === id); if (!a) return;
  got.add(id); keep('ag-ach', [...got]); renderAch();
  if (achToast) {
    achToast.querySelector('b').textContent = a[1]; achToast.querySelector('span').textContent = a[2];
    achToast.classList.add('on'); clearTimeout(achT); achT = setTimeout(() => achToast.classList.remove('on'), 3600);
  }
  audio.chime(9);
}
function markWorld(w) { visitedWorlds.add(w); keep('ag-worlds', [...visitedWorlds]); if (visitedWorlds.size >= WORLD_ORDER.length) achieve('multiverse'); }
renderAch();

const audio = createAudio();
const thumbs = (() => { try { return JSON.parse(sessionStorage.getItem('ag-thumbs') || '{}'); } catch { return {}; } })();
const guide = gl2 ? createGuide({ warm: (w) => warm(w), meURL, getWorld: () => world, travel: (w, x, y) => travelTo(w, x, y), visited: visitedWorlds, reduced, coarse, thumbs, achieve, sound: (k) => audio.ui(k) }) : null;
worldBtn?.addEventListener('click', () => { worldBtn.classList.add('seen'); guide?.openPicker(); });
document.querySelectorAll('[data-worlds]').forEach((b) => b.addEventListener('click', () => guide?.openPicker()));
document.querySelectorAll('[data-contact]').forEach((a) => a.addEventListener('click', (e) => { if (!guide) return; e.preventDefault(); guide.contact(); }));

const toast = document.getElementById('world-toast');
let toastT;
function showToast(w) {
  if (!toast) return;
  const tb = toast.querySelector('b'); tb.textContent = WORLDS[w].name; tb.dataset.final = WORLDS[w].name;
  toast.querySelector('span').textContent = WORLDS[w].tag;
  toast.classList.add('on');
  scramble(tb, 650);
  clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 1900);
}
const PORTAL_MS = [2100, 2400, 2200];
let portalBusy = false;
async function travelTo(w, x = innerWidth / 2, y = innerHeight / 2) {
  if (!WORLDS[w] || w === world || portalBusy || !worldGL) return;
  portalBusy = true;
  guide?.closePicker();
  if (toast) { const tb = toast.querySelector('b'); tb.textContent = tb.dataset.final = WORLDS[w].name; toast.querySelector('span').textContent = 'Loading the world'; }
  toast?.classList.add('loading');
  try { await worldGL.prepare(w); } catch (e) { console.error(e); portalBusy = false; toast?.classList.remove('loading'); return; }
  toast?.classList.remove('loading');
  const prev = world;
  world = w; saveWorld(w);
  if (prev === 'night') closeDetail();
  showToast(w);
  const mode = WORLDS[w].mode;
  const dur = reduced ? 400 : PORTAL_MS[mode];
  worldGL.start(prev, w, x, y, dur, mode);
  setTimeout(() => { root.classList.add('swapping'); applyWorldCSS(w); setTimeout(() => root.classList.remove('swapping'), 900); }, dur * 0.4);
  markWorld(w);
  setTimeout(() => { portalBusy = false; guide?.event('enter', w); }, dur + 200);
}

// ---------- chapter UI for the Night journey (works with or without WebGL) ----------
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
document.querySelectorAll('a[href^="#"]:not([data-contact])').forEach((a) => a.addEventListener('click', (e) => {
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
    panels[i].style.visibility = o < 0.01 ? 'hidden' : '';
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
  if (world === 'night') {
    if (i === sections.length - 1) { achieve('finale'); setTimeout(() => guide?.event('night-end'), 2600); }
    if (i === 3) setTimeout(() => guide?.event('night-tease'), 1800);
    if (i >= 6) { warm('monument'); warm('desk'); }
  }
  listeners.forEach((fn) => fn(i));
}

const dockPrev = document.querySelector('.dock .prev'), dockNext = document.querySelector('.dock .next');
const goChapter = (i) => sections[clamp(i, 0, sections.length - 1)].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
dockPrev?.addEventListener('click', () => goChapter(activeIdx - 1));
dockNext?.addEventListener('click', () => goChapter(activeIdx + 1));

// controls guide
const guideDlg = document.getElementById('guide');
const guideBtn = document.getElementById('guide-toggle');
function setGuide(on) { guideDlg.hidden = !on; guideBtn.setAttribute('aria-expanded', String(on)); if (on) guideDlg.querySelector('button').focus(); }
guideBtn?.addEventListener('click', () => setGuide(guideDlg.hidden));
guideDlg?.querySelector('button').addEventListener('click', () => { setGuide(false); guideBtn.focus(); });
guideDlg?.addEventListener('click', (e) => { if (e.target === guideDlg) setGuide(false); });
const overlayOpen = () => !guideDlg.hidden || !!guide?.pickerOpen;

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

// ---------- detail panel (Night) ----------
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
  keep('ag-seen', [...seen]);
  updateTallies();
  if (HS_ALL.every((h) => seen.has(h.d))) achieve('points');
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
  achieve('hello');
});
// the CV download only works on the real site, not inside a sandboxed preview
if (/claude\.ai|claudeusercontent/.test(location.hostname)) document.querySelectorAll('[data-cv]').forEach((el) => el.remove());
function closeDetail() {
  if (!focusHS) return;
  const was = focusHS;
  focusHS = null;
  detail.classList.remove('open'); detail.inert = true;
  root.classList.remove('focused');
  if (world === 'night') was.el?.focus({ preventScroll: true });
}
detail.inert = true;
detail.querySelector('.close').addEventListener('click', closeDetail);

// ---------- boot sequence ----------
const bootList = document.querySelector('#boot ol');
function bootLog(t) { if (!bootList) return; const li = document.createElement('li'); li.textContent = t; bootList.appendChild(li); }
let booted = false;
function bootDone() {
  if (booted) return; booted = true;
  root.classList.add('booted'); setTimeout(() => document.getElementById('boot')?.remove(), 1200);
  setTimeout(() => guide?.event('boot'), reduced ? 600 : 2600);
}
setTimeout(bootDone, 9000);

// keyboard: global shortcuts; in the Night, arrows travel between chapters or between points while a panel is open
addEventListener('keydown', (e) => {
  guide?.activity();
  if (e.target.closest?.('input, textarea, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') {
    if (!guideDlg.hidden) { setGuide(false); e.stopImmediatePropagation(); return; }
    if (guide?.pickerOpen) { guide.closePicker(); e.stopImmediatePropagation(); return; }
    if (world === 'night') closeDetail();
    return;
  }
  if (overlayOpen()) return;
  if (e.key === 'f' || e.key === 'F') { worldGL?.toggleHUD(); return; }
  if (e.key === 'p' || e.key === 'P') { worldGL?.postcard(); return; }
  if (e.key === '?') { e.preventDefault(); setGuide(guideDlg.hidden); return; }
  if ((e.key === 'w' || e.key === 'W') && world !== 'monument') { worldBtn?.classList.add('seen'); guide?.openPicker(); return; } // in the Monument, W walks
  if (UI[world] !== 'journey') return;
  if (focusHS && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); stepDetail(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (e.target.closest?.('#detail')) return;
  const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
  if (!dir) return;
  e.preventDefault();
  goChapter(activeIdx + dir);
}, true);
['pointerdown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, () => guide?.activity(), { passive: true }));

// ---------- WebGL ----------
markWorld(world);
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

// What this device can comfortably run: 0 software/very weak, 1 laptop or phone, 2 dedicated GPU
function detectTier(renderer) {
  let gpu = '';
  try { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch {}
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
  let tier = 2;
  if (/swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(gpu)) tier = 0;
  else if (coarse || mem <= 4 || cores <= 4 || /intel|mali|adreno|powervr|apple gpu/i.test(gpu)) tier = 1;
  if (/nvidia|geforce|rtx|radeon rx|apple m[1-9]/i.test(gpu) && !coarse) tier = 2;
  const forced = new URLSearchParams(location.search).get('tier');
  if (forced && /^[012]$/.test(forced)) tier = +forced;
  return { tier, gpu: gpu.replace(/ANGLE \(|\)$/g, '').slice(0, 64) };
}

const LOADERS = {
  night: () => import('./worlds/night.js').then((m) => m.createNight),
  monument: () => import('./worlds/monument.js').then((m) => m.createMonument),
  desk: () => import('./worlds/desk.js').then((m) => m.createDesk),
};
const DTMAX = Math.min(1, +new URLSearchParams(location.search).get('dtmax') || 0.05);
const isUI = (t) => !!t?.closest?.('a, button, input, textarea, select, label, #talk, .hud-top, #guide, #world-panel, #detail');

async function start() {
  const small = innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const { tier, gpu } = detectTier(renderer);
  root.dataset.tier = tier;
  const DPR_MAX = tier >= 2 ? Math.min(devicePixelRatio || 1, 1.75) : tier === 1 ? Math.min(devicePixelRatio || 1, 1.3) : 0.75;
  let dpr = DPR_MAX;
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;

  const fontFam = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
  try { await Promise.race([document.fonts.load('800 200px "Big Shoulders Display"'), new Promise((r) => setTimeout(r, 1800))]); } catch {}
  const canv = {};
  for (const id of Object.keys(PROJECTS)) canv[id] = await projectCanvas(id);

  const shotURL = {};
  const shotFor = (d) => { const c = canv[d]; if (!c) return null; return (shotURL[d] ||= c.canvas.toDataURL('image/jpeg', 0.86)); };
  detailListeners.open.push((h) => {
    const src = shotFor(h.d);
    if (!src) return;
    const fig = document.createElement('figure'); fig.className = 'shot';
    fig.innerHTML = `<img alt="${PROJECTS[h.d].name}${canv[h.d].real ? ' screenshot' : ' project card'}" src="${src}">`;
    detailBody.prepend(fig);
  });

  const env = {
    renderer, small, coarse, reduced, tier, fontFam, meURL, canv, shotFor, goChapter, achieve, audio, guide, isUI, overlayOpen,
    travel: (w, x, y) => travelTo(w, x, y), warm: (w) => warm(w), scramble, PROJECTS,
  };
  const LOGS = { night: 'Waking the desert particles', monument: 'Raising the monument', desk: 'Dusting off the desk' };
  const made = {}, making = {};
  // code arrives early (idle prefetch); a world is only built once someone shows intent: the picker, a card, a click
  const mods = {};
  const loadMod = (id) => (mods[id] ||= LOADERS[id]());
  async function ensure(id) {
    if (made[id]) return made[id];
    if (!making[id]) making[id] = loadMod(id).then((make) => make(env)).then((w) => { w.resize(innerWidth, innerHeight, dpr); made[id] = w; w.precompile?.(); return w; });
    return making[id];
  }
  warm = (id) => { if (WORLDS[id]) ensure(id).catch(() => {}); };
  bootLog(`Detected ${['a light', 'a standard', 'a strong'][tier]} graphics device`);
  bootLog(LOGS[world]);
  let active = await ensure(world);
  bootLog('World ready');
  active.enter?.();

  const composite = createComposite(renderer, { fluid: tier > 0 && !reduced });
  audio.setWorld(world);
  let glitch = 0, trans = null, shocks = 0, wantShot = false, hudOn = false, thumbAt = performance.now() + 4000;
  document.getElementById('postcard-btn')?.addEventListener('click', () => { setGuide(false); wantShot = true; });
  document.getElementById('perf-btn')?.addEventListener('click', () => { setGuide(false); toggleHUD(); });
  const hud = document.getElementById('perf');
  function toggleHUD() { hudOn = !hudOn; hud.hidden = !hudOn; }

  worldGL = {
    prepare: (id) => ensure(id),
    start(prevId, id, x, y, dur, mode) {
      const from = made[prevId];
      from.exit?.();
      trans = { from, t0: performance.now(), dur, mode, ox: x / innerWidth, oy: 1 - y / innerHeight };
      active = made[id];
      const me = active;
      setTimeout(() => { if (active === me) me.enter?.(); }, dur * 0.42);
      composite.uniforms.uOrigin.value.set(trans.ox, trans.oy);
      composite.uniforms.uCrack.value.setRGB(...WORLDS[id].ring);
      if (!reduced) glitch = mode === 0 ? 0.6 : 0.2;
      audio.setWorld(id);
      audio.portal(mode); setTimeout(() => audio.chime(4), 620);
      thumbAt = performance.now() + dur + 3500;
    },
    toggleHUD,
    postcard: () => { wantShot = true; },
  };
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 2500));
  setTimeout(() => idle(() => WORLD_ORDER.forEach((w) => loadMod(w).catch(() => {}))), 6000);

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
  listeners.push((i) => { if (world !== 'night') return; if (!reduced) glitch = Math.max(glitch, 0.3); audio.chime(i); });
  let wantKey = null;
  document.querySelectorAll('[data-glyph]').forEach((el) => {
    const on = () => { wantKey = el.dataset.glyph; audio.tick(); if (wantKey === '__face') achieve('hello'); };
    const off = () => { if (wantKey === el.dataset.glyph) wantKey = null; };
    el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
    el.addEventListener('focus', on); el.addEventListener('blur', off);
  });

  // ---- labels inside the Night ----
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
  detailListeners.open.push(() => { glitch = reduced ? 0 : Math.max(glitch, 0.3); audio.chime(activeIdx + 2); });
  const years = MILESTONES.map(([st, y, t]) => {
    const el = document.createElement('span');
    el.className = 'hs static year';
    el.innerHTML = `<i aria-hidden="true"></i><b><em>${y}</em>${t}</b>`;
    el.style.visibility = 'hidden';
    hsLayer.appendChild(el);
    return { st, el, v: new THREE.Vector3(), w: 0 };
  });
  let labelsShown = true;
  function hideLabels() {
    if (!labelsShown) return; labelsShown = false;
    HS.forEach((h) => { h.w = 0; h.el.style.visibility = 'hidden'; h.el.tabIndex = -1; });
    years.forEach((y) => { y.w = 0; y.el.style.visibility = 'hidden'; });
  }

  // ---- pointer (Night): hover, drag to orbit, click for a shockwave ----
  const mouse = new THREE.Vector2(9, 9), mouseT = new THREE.Vector2(9, 9);
  let lastMove = -10, px = innerWidth / 2, py = innerHeight / 2;
  let drag = null, yaw = 0, pitch = 0, vYaw = 0, vPitch = 0, hoverEl = null;
  const INTERACTIVE = 'a, button, input, [data-glyph], #detail, #guide, #talk, #world-panel, .panel p, .panel h2, .panel ul';
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
    if (UI[world] !== 'journey' || e.button !== 0 || e.target.closest(INTERACTIVE)) return;
    drag = { x: e.clientX, y: e.clientY, moved: 0, mouse: e.pointerType === 'mouse' };
    if (drag.mouse) e.preventDefault();
  });
  addEventListener('pointerup', (e) => {
    if (!drag) return;
    if (drag.moved < 6 && UI[world] === 'journey') {
      if (focusHS) closeDetail();
      active.shock((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, (performance.now() - t0) / 1000, stage);
      audio.thump();
      glitch = Math.max(glitch, reduced ? 0 : 0.25);
      if (++shocks >= 10) achieve('tremor');
    }
    drag = null;
  });
  addEventListener('pointercancel', () => (drag = null));
  document.addEventListener('pointerover', (e) => { hoverEl = e.target.closest('.hs:not(.static), a, button, [data-glyph], [data-hover]'); });
  const cursor = document.getElementById('cursor');
  const curLabel = cursor.querySelector('span');
  let cx = px, cy = py, curText = '';

  const t0 = performance.now();
  let stage = targetStage(), prevStage = stage, last = t0, focusAmt = 0;
  let ema = 1 / 60, govT = 0, govUp = 0, hudT = 0, hudFrames = 0;
  const introDur = reduced ? 0.8 : 3.8;
  const scrim = document.querySelector('.scrim');
  const P = new THREE.Vector3(), L = new THREE.Vector3(), off = new THREE.Vector3(), tmp = new THREE.Vector3();
  const fP = new THREE.Vector3(), fL = new THREE.Vector3(), right = new THREE.Vector3(), upV = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const ease2 = (x) => { const t = clamp(x, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  root.classList.add('ready');

  function placeCamera(W, motion, interactive, arrive, time) {
    const fov = W.pose(stage, P, L);
    const cam = W.camera;
    cam.up.copy(Y);
    if (interactive) {
      off.subVectors(P, L).applyAxisAngle(Y, yaw);
      right.crossVectors(Y, off).normalize();
      off.applyAxisAngle(right, pitch);
      P.copy(L).add(off);
    }
    if (arrive > 0) P.sub(L).multiplyScalar(1 + arrive * 0.45).add(L);
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

  function takePostcard() {
    let shot;
    try { shot = canvas.toDataURL('image/jpeg', 0.92); } catch { return; }
    const caption = UI[world] === 'journey' ? `CHAPTER ${String(activeIdx).padStart(2, '0')} · ${STAGES[activeIdx]}` : (active.caption?.() || '').toUpperCase();
    const img = new Image();
    img.onload = () => {
      const W = 1800, H = 1200, pad = 60, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, W, H);
      const iw = W - pad * 2, ih = H - pad * 2 - 150, ar = img.width / img.height;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (ar > iw / ih) { sw = img.height * (iw / ih); sx = (img.width - sw) / 2; } else { sh = img.width / (iw / ih); sy = (img.height - sh) / 2; }
      g.drawImage(img, sx, sy, sw, sh, pad, pad, iw, ih);
      g.fillStyle = '#141a2e'; g.font = `800 64px ${fontFam}`; g.textBaseline = 'alphabetic';
      g.fillText(`GREETINGS FROM ${WORLDS[world].name.toUpperCase()}`, pad, H - 92);
      g.font = '500 24px "IBM Plex Mono", monospace'; g.fillStyle = '#9a5608';
      g.fillText(`ABDELKRIM GHEBOULI · SAP BPC & BI${caption ? ` · ${caption}` : ''}`.slice(0, 78), pad, H - 48);
      g.textAlign = 'right'; g.fillStyle = '#59616f'; g.fillText('abdelkrim789.github.io/my-portfolio', W - pad, H - 48);
      g.strokeStyle = '#9a5608'; g.lineWidth = 3; g.strokeRect(W - pad - 120, H - 170, 120, 100);
      g.font = `800 34px ${fontFam}`; g.textAlign = 'center'; g.fillStyle = '#9a5608'; g.fillText('DZ', W - pad - 60, H - 108);
      const a = document.createElement('a'); a.href = cv.toDataURL('image/jpeg', 0.9); a.download = `postcard-${world}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      root.classList.add('flash'); setTimeout(() => root.classList.remove('flash'), 500);
      achieve('postcard');
    };
    img.src = shot;
  }
  function takeThumb() {
    try {
      const c = document.createElement('canvas'); c.width = 240; c.height = 150;
      const g = c.getContext('2d'), ar = canvas.width / canvas.height;
      let sw = canvas.width, sh = canvas.height, sx = 0, sy = 0;
      if (ar > 1.6) { sw = canvas.height * 1.6; sx = (canvas.width - sw) / 2; } else { sh = canvas.width / 1.6; sy = (canvas.height - sh) / 2; }
      g.drawImage(canvas, sx, sy, sw, sh, 0, 0, 240, 150);
      thumbs[world] = c.toDataURL('image/jpeg', 0.72);
      sessionStorage.setItem('ag-thumbs', JSON.stringify(thumbs));
    } catch {}
  }

  function frame(now) {
    const dt = Math.min(DTMAX, (now - last) / 1000); last = now;
    const time = (now - t0) / 1000;
    if (document.hidden) { requestAnimationFrame(frame); return; }
    renderer.info.reset();
    const J = active.ui !== 'own';
    const journeyLive = J || (trans && trans.from.ui !== 'own');

    let vel = 0;
    if (journeyLive) {
      const target = targetStage();
      stage += (target - stage) * Math.min(1, dt * 2.6);
      vel = Math.abs(stage - prevStage) / Math.max(dt, 1e-3); prevStage = stage;
      if (J) { setActive(clamp(Math.round(stage), 0, 7)); progressBar.style.transform = `scaleX(${stage / 7})`; }
      if (focusHS && Math.abs(stage - focusHS.k) > 0.4) closeDetail();
    }
    const introT = Math.min(1, time / introDur);
    const motion = journeyLive ? Math.sin(Math.PI * (stage - Math.floor(stage))) : 0;
    mouse.lerp(mouseT, Math.min(1, dt * 8));
    const mouseActive = now / 1000 - lastMove < 1.6 && !coarse && mouse.x < 5;
    if (!drag) { yaw += vYaw; pitch += vPitch; vYaw *= 0.92; vPitch *= 0.92; yaw -= yaw * Math.min(1, dt * 0.8); pitch -= pitch * Math.min(1, dt * 0.8); }
    focusAmt += ((focusHS ? 1 : 0) - focusAmt) * Math.min(1, dt * 2.4);
    glitch = Math.max(0, glitch - dt * 2.2);

    let tT = -1;
    if (trans) { tT = (now - trans.t0) / trans.dur; if (tT >= 1) { trans = null; tT = -1; } }
    const arrive = tT >= 0 ? 1 - ease2(tT) : 0;
    const portalW = tT >= 0 ? Math.sin(Math.PI * tT) : 0;
    const ctx = { dt, time, stage, vel, mouse, mouseActive, px, py, introT, glyphKey: wantKey, focusD: focusHS?.d, portalW: reduced ? 0 : portalW, glitch, arrive, current: true };

    if (J) placeCamera(active, motion, true, arrive, time);
    active.update(ctx);
    const texA = active.render();
    let texB = null;
    if (trans && trans.from) {
      if (trans.from.ui !== 'own') placeCamera(trans.from, motion, false, 0, time);
      trans.from.update({ ...ctx, mouseActive: false, focusD: null, arrive: 0, current: false });
      texB = trans.from.render();
    }
    composite.stepFluid((px / innerWidth), 1 - py / innerHeight, mouseActive && !active.noFluid, dt);
    composite.uniforms.uTime.value = time;
    composite.uniforms.uGlitch.value = active.id === 'night' ? 0 : glitch * 0.4;
    composite.uniforms.uTilt.value = focusHS ? 0.35 : 1;
    composite.draw(texA, active.post, texB, trans?.from?.post, Math.max(0, tT), trans?.mode || 0);
    if (wantShot) { wantShot = false; takePostcard(); }
    if (!trans && now > thumbAt) { thumbAt = Infinity; takeThumb(); }
    scrim.style.opacity = innerWidth / innerHeight < 0.9 ? 1 : (0.4 + 0.6 * Math.min(1, stage * 1.6)).toFixed(3);
    audio.update(Math.min(1, motion + portalW), vel);

    // labels (Night only)
    if (!J) hideLabels();
    else {
      labelsShown = true;
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
    }

    if (!coarse) {
      cx += (px - cx) * Math.min(1, dt * 16); cy += (py - cy) * Math.min(1, dt * 16);
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      let txt = '';
      if (!J) txt = hoverEl ? '' : active.cursor?.() || '';
      else if (drag && drag.moved > 6) txt = 'Orbit';
      else if (hoverEl?.classList.contains('hs')) txt = 'Open';
      else if (hoverEl?.dataset.glyph) txt = 'Look';
      else if (!hoverEl && Math.abs(stage - 1) < 0.3) txt = 'Repair';
      else if (!hoverEl && stage < 0.4) txt = 'Click · Drag';
      if (txt !== curText) { curText = txt; curLabel.textContent = txt; }
      cursor.classList.toggle('big', !!hoverEl || !!txt);
      cursor.classList.toggle('down', !!drag || !!active.dragging?.());
    }
    if (!booted) bootDone();

    // resolution governor: trade pixels for frame rate, continuously
    ema += (dt - ema) * 0.08;
    govT += dt;
    if (!trans && introT >= 1 && govT > 1.2) {
      govT = 0;
      if (ema > 1 / 46 && dpr > 0.6) { dpr = Math.max(0.6, +(dpr - 0.15).toFixed(2)); govUp = 0; resize(); }
      else if (ema < 1 / 57 && dpr < DPR_MAX) { if (++govUp >= 3) { govUp = 0; dpr = Math.min(DPR_MAX, +(dpr + 0.1).toFixed(2)); resize(); } }
      else govUp = 0;
      if (dpr <= 0.6 && ema > 1 / 30) Object.values(made).forEach((w) => w.quality(2));
    }
    hudFrames++; hudT += dt;
    if (hudOn && hudT > 0.5) {
      const i = renderer.info.render;
      hud.innerHTML = `<b>${Math.round(hudFrames / hudT)} fps</b> · ${(ema * 1000).toFixed(1)} ms<br>world ${WORLDS[world].name} · tier ${tier} · dpr ${dpr.toFixed(2)}<br>${i.calls} draw calls · ${(i.triangles / 1000).toFixed(1)}k tris · ${(i.points / 1000).toFixed(1)}k pts<br>${innerWidth * dpr | 0}×${innerHeight * dpr | 0} px<br><small>${gpu || 'unknown GPU'}</small>`;
      hudT = 0; hudFrames = 0;
    } else if (!hudOn && hudT > 0.5) { hudT = 0; hudFrames = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
