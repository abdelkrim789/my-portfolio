import * as THREE from 'three';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/instrument-sans';
import '@fontsource/aref-ruqaa/arabic-700.css';
import './style.css';

// The moment her new year began. Everything else counts from here.
const BIRTHDAY = new Date('2026-11-02T14:20:00+01:00');
const NAME = 'Safa';

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 600) : ms));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(20261102);
const hex = (h) => new THREE.Color().setHex(h, THREE.LinearSRGBColorSpace); // shaders write these values as they are

// ---------- the clock on the tag ----------
function tickClock() {
  let s = Math.max(0, Math.floor((Date.now() - BIRTHDAY.getTime()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  $('#c-d').textContent = d; $('#c-d').nextElementSibling.textContent = d === 1 ? 'day' : 'days';
  $('#c-h').textContent = String(h).padStart(2, '0');
  $('#c-m').textContent = String(m).padStart(2, '0');
  $('#c-s').textContent = String(s).padStart(2, '0');
}
tickClock(); setInterval(tickClock, 1000);

// ---------- sound: a music box, a puff, a pop ----------
const audio = (() => {
  let ctx = null, master = null, wet = null, on = true;
  function init() {
    if (ctx) return ctx.resume?.();
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    // a small room: two feedback delays, quiet
    wet = ctx.createGain(); wet.gain.value = 0.22; wet.connect(master);
    for (const [t, fb] of [[0.083, 0.42], [0.127, 0.36]]) {
      const d = ctx.createDelay(1); d.delayTime.value = t; const g = ctx.createGain(); g.gain.value = fb;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      wet.connect(d); d.connect(lp); lp.connect(g); g.connect(d); lp.connect(master);
    }
    return ctx.resume?.();
  }
  function tine(f, t, vel = 1) {
    const out = ctx.createGain(); out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.16 * vel, t + 0.004); out.gain.exponentialRampToValueAtTime(0.0008, t + 1.6);
    out.connect(master); out.connect(wet);
    for (const [mul, amp] of [[1, 1], [2.0, 0.28], [3.01, 0.1], [4.2, 0.05]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
      const g = ctx.createGain(); g.gain.value = amp; o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 1.7);
    }
  }
  const N = { F3: 174.61, G3: 196, C4: 261.63, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  // the 1893 melody, public domain; dotted pickups, three beats to the bar
  const SONG = [['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
    ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
    ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
    ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3]];
  const BASS = { 2: 'C4', 5: 'G3', 8: 'G3', 11: 'C4', 14: 'C4', 18: 'F3', 21: 'C4', 24: 'C4' };
  function song() {
    if (!ctx || !on) return 0;
    const beat = 0.46; let t = ctx.currentTime + 0.15;
    SONG.forEach(([n, len], i) => { tine(N[n], t, i % 3 === 2 ? 1 : 0.85); if (BASS[i]) tine(N[BASS[i]] / 2, t, 0.5); t += len * beat; });
    return (t - ctx.currentTime) * 1000;
  }
  function noise(dur) {
    const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  }
  function puff(vol = 1) {
    if (!ctx || !on) return;
    const t = ctx.currentTime, s = noise(0.6), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.setValueAtTime(1400, t); bp.frequency.exponentialRampToValueAtTime(260, t + 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28 * vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    s.connect(bp); bp.connect(g); g.connect(master); s.start(t);
  }
  function pop(f = 880) { if (ctx && on) tine(f, ctx.currentTime + 0.01, 0.55); }
  function toggle() { on = !on; if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05); return on; }
  return { init, song, puff, pop, toggle, get ctx() { return ctx; } };
})();

// ---------- WebGL, or the tag alone ----------
let renderer = null;
try {
  const c = $('#gl');
  if (!c.getContext('webgl2') && !c.getContext('webgl')) throw new Error('no webgl');
  renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch { document.documentElement.classList.add('nogl'); }

const caption = (() => {
  const el = $('#caption'); let gen = 0;
  return async (text, hold = 0) => {
    const me = ++gen;
    el.classList.remove('on'); await sleep(text && el.textContent ? 450 : 0);
    if (me !== gen) return;
    el.textContent = text || ''; if (text) el.classList.add('on');
    if (hold) { await sleep(hold); if (me === gen) el.classList.remove('on'); }
  };
})();

$('#sound').addEventListener('click', (e) => { const on = audio.toggle(); e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = on ? 'Sound on' : 'Sound off'; });
$('#song').addEventListener('click', () => { audio.init(); audio.song(); });

if (!renderer) {
  $('#open').addEventListener('click', async () => {
    audio.init(); $('#intro').classList.add('gone'); $('#sound').hidden = false;
    await sleep(500); $('#card').hidden = false; $('#again').hidden = true; audio.song();
  });
} else {
  start3D(renderer);
}

function start3D(renderer) {
  const small = Math.min(innerWidth, innerHeight) < 700;
  const N = small ? 12000 : 22000;
  const DPR = Math.min(devicePixelRatio || 1, small ? 2 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 369, 0, 256, 369, 420);
    gr.addColorStop(0, '#43204a'); gr.addColorStop(0.58, '#1d1024'); gr.addColorStop(1, '#12091a');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  const cake = new THREE.Group(); scene.add(cake);

  // ---------- the cake, as points on its surfaces ----------
  const COL = {
    rose: hex(0xf2a5b8), cream: hex(0xfbe7d2), plate: hex(0xeee3db), rim: hex(0xe8c27c),
    gold: hex(0xffcf7a), mint: hex(0x9fe3c9), white: hex(0xffffff), berry: hex(0xc9466e),
  };
  const L = new THREE.Vector3(-0.5, 0.85, 0.65).normalize();
  const TOP = 2.33;
  const TIERS = [
    { r: 2.0, y0: 0.08, h: 1.25, side: COL.rose, drip: COL.cream, top: COL.cream, k: 9, ph: 0.4 },
    { r: 1.3, y0: 1.33, h: 1.0, side: COL.cream, drip: COL.rose, top: COL.rose, k: 7, ph: 1.9 },
  ];
  const cakePos = new Float32Array(N * 3), cakeCol = new Float32Array(N * 3);
  const startPos = new Float32Array(N * 3), rnd4 = new Float32Array(N * 4);
  const tmp = new THREE.Color();
  function put(i, x, y, z, col, nx, ny, nz) {
    const shade = 0.6 + 0.4 * Math.max(0, nx * L.x + ny * L.y + nz * L.z) + (rand() - 0.5) * 0.08;
    tmp.copy(col).multiplyScalar(shade);
    cakePos.set([x, y, z], i * 3); cakeCol.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const sprinkle = (base) => { const u = rand(); return u < 0.06 ? COL.mint : u < 0.1 ? COL.gold : u < 0.13 ? COL.white : u < 0.15 ? COL.berry : base; };
  const regions = [
    { w: 5.4, f(i) { const a = rand() * 6.2832, r = Math.sqrt(lerp(4.0, 7.3, rand())); put(i, Math.cos(a) * r, 0.04, Math.sin(a) * r, r > 2.55 ? COL.rim : COL.plate, 0, 1, 0); } },
    { w: 1.1, f(i) { const a = rand() * 6.2832, r = 2.7; put(i, Math.cos(a) * r, lerp(-0.08, 0.04, rand()), Math.sin(a) * r, COL.rim, Math.cos(a), 0, Math.sin(a)); } },
    ...TIERS.map((T) => ({ w: 6.2832 * T.r * T.h, f(i) {
      const a = rand() * 6.2832, y = T.y0 + rand() * T.h;
      const drip = 0.1 + 0.46 * Math.pow(Math.max(0, Math.sin(a * T.k + T.ph) * 0.6 + Math.sin(a * T.k * 2.3 + T.ph) * 0.4), 2);
      const inDrip = y > T.y0 + T.h - drip;
      const r = T.r + (inDrip ? 0.025 : 0);
      put(i, Math.cos(a) * r, y, Math.sin(a) * r, inDrip ? T.drip : T.side, Math.cos(a), 0, Math.sin(a));
    } })),
    { w: 6.6, f(i) { const a = rand() * 6.2832, r = Math.sqrt(lerp(1.69, 4.0, rand())); put(i, Math.cos(a) * r, 1.33, Math.sin(a) * r, sprinkle(TIERS[0].top), 0, 1, 0); } },
    { w: 5.6, f(i) { const a = rand() * 6.2832, r = Math.sqrt(rand()) * 1.3; put(i, Math.cos(a) * r, TOP, Math.sin(a) * r, sprinkle(TIERS[1].top), 0, 1, 0); } },
    // pearls along the foot of each tier
    ...TIERS.map((T, k) => ({ w: 2.2 - k * 0.8, f(i) {
      const n = k ? 30 : 44, j = Math.floor(rand() * n), a0 = (j / n) * 6.2832, br = 0.075;
      const u = rand() * 2 - 1, v = rand() * 6.2832, s = Math.sqrt(1 - u * u);
      const nx = s * Math.cos(v), ny = u, nz = s * Math.sin(v);
      put(i, Math.cos(a0) * (T.r + 0.04) + nx * br, T.y0 + br * 0.9 + ny * br, Math.sin(a0) * (T.r + 0.04) + nz * br, k ? COL.rose : COL.cream, nx, ny, nz);
    } })),
  ];
  const wsum = regions.reduce((t, r) => t + r.w, 0);
  let i0 = 0;
  regions.forEach((r, k) => { const n = k === regions.length - 1 ? N - i0 : Math.round((r.w / wsum) * N); for (let i = i0; i < i0 + n; i++) r.f(i); i0 += n; });
  for (let i = 0; i < N; i++) {
    // before the cake: a slow sky of dust
    const u = rand() * 2 - 1, v = rand() * 6.2832, s = Math.sqrt(1 - u * u), R = 7 + rand() * 16;
    startPos.set([s * Math.cos(v) * R, 1.5 + u * R * 0.7, s * Math.sin(v) * R - 4], i * 3);
    rnd4.set([rand(), rand(), rand(), rand()], i * 4);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(cakePos, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(startPos, 3));
  geo.setAttribute('aCake', new THREE.BufferAttribute(cakePos, 3));
  geo.setAttribute('aText', new THREE.BufferAttribute(new Float32Array(cakePos), 3));
  geo.setAttribute('aColCake', new THREE.BufferAttribute(cakeCol, 3));
  geo.setAttribute('aColText', new THREE.BufferAttribute(new Float32Array(cakeCol), 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd4, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 40);

  const U = {
    uA: { value: 0 }, uB: { value: 0 }, uTime: { value: 0 }, uPR: { value: DPR }, uSize: { value: small ? 54 : 46 },
    uGlow: { value: 0 }, uFlame: { value: new THREE.Vector3(0, 3.25, 0) }, uBurst: { value: reduced ? 0.4 : 1 },
  };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      attribute vec3 aStart, aCake, aText, aColCake, aColText; attribute vec4 aRnd;
      uniform float uA, uB, uTime, uPR, uSize, uGlow, uBurst; uniform vec3 uFlame;
      varying vec3 vCol;
      float sm(float t) { return t * t * (3. - 2. * t); }
      void main() {
        float eA = sm(clamp(uA * 1.7 - aRnd.x * 0.7, 0., 1.));
        float eB = sm(clamp(uB * 1.7 - aRnd.y * 0.7, 0., 1.));
        vec3 p = mix(aStart, aCake, eA);
        vec3 dir = normalize(aCake - vec3(0., 1.2, 0.) + vec3(0.001));
        p += dir * sin(eB * 3.14159) * (1.2 + aRnd.z * 3.2) * uBurst;
        p = mix(p, aText, eB);
        float loose = 1. - eA * (1. - sin(eB * 3.14159));
        p += vec3(sin(uTime * .5 + aRnd.w * 40.), cos(uTime * .43 + aRnd.x * 40.), sin(uTime * .37 + aRnd.y * 30.)) * (0.012 + 0.35 * loose);
        vec3 col = mix(aColCake, aColText, eB);
        float d = distance(p, uFlame);
        col += vec3(1., .6, .25) * uGlow * .75 / (1. + d * d * .55) * (1. - eB);
        col *= mix(1., .82 + .18 * uGlow, (1. - eB) * eA);
        col = mix(vec3(.82, .76, .95) * (.5 + .5 * aRnd.z), col, eA);
        vCol = col;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float tw = .65 + .35 * sin(uTime * 2.2 + aRnd.w * 60.);
        gl_PointSize = uSize * uPR * mix(.55 * tw, 1., eA) * (.8 + aRnd.z * .4) / -mv.z;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol;
      void main() {
        vec2 c = gl_PointCoord - .5; float r = dot(c, c);
        if (r > .25) discard;
        gl_FragColor = vec4(vCol * (.82 + .18 * smoothstep(.25, .05, r)), 1.);
      }`,
  }));
  cake.add(points);
  // the inside of the cake: dark sponge behind the frosting, so the gaps read as texture, not holes
  const fills = [
    [new THREE.CylinderGeometry(1.95, 1.95, 1.24, 64).translate(0, 0.08 + 0.62, 0), 0x7d3f55],
    [new THREE.CylinderGeometry(1.26, 1.26, 0.99, 48).translate(0, 1.33 + 0.495, 0), 0x86624f],
    [new THREE.CylinderGeometry(2.66, 2.66, 0.1, 72).translate(0, -0.02, 0), 0x5e4a47],
  ].map(([g, c]) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0 })); cake.add(m); return m; });

  // ---------- candles ----------
  const stripe = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#fff1e0'; g.fillRect(0, 0, 64, 256); g.fillStyle = '#e8708f';
    for (let y = -64; y < 256 + 64; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 32); g.lineTo(64, y + 46); g.lineTo(0, y + 14); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const flameMat = () => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLife: { value: 0 }, uLean: { value: 0 }, uSeed: { value: rand() * 100 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */`
      uniform float uTime, uLife, uLean, uSeed; varying vec2 vUv;
      void main() {
        float h = vUv.y; float x = vUv.x * 2. - 1.;
        float fl = sin(uTime * 11. + uSeed) * .05 + sin(uTime * 19.3 + uSeed * 1.7) * .03;
        x -= (uLean + fl) * h * h * 1.6;
        float w = .62 * pow(max(0., 1. - h), .75) * smoothstep(0., .32, h) + .001;   // round foot, pointed tip
        float d = abs(x) / w;
        float body = (1. - smoothstep(.55, 1., d)) * smoothstep(.0, .06, h) * (1. - smoothstep(.9, 1., h));
        vec3 core = vec3(1., .98, .9), mid = vec3(1., .74, .3), rim = vec3(.98, .36, .12);
        vec3 col = mix(core, mid, smoothstep(.1, .55, d + (h - .3) * .5));
        col = mix(col, rim, smoothstep(.55, 1., d));
        col = mix(vec3(.35, .5, 1.), col, smoothstep(.04, .2, h));
        float a = body * uLife * (.9 + .1 * sin(uTime * 30. + uSeed));
        gl_FragColor = vec4(col, a);
      }`,
  });
  const glowMat = () => new THREE.ShaderMaterial({
    uniforms: { uLife: { value: 0 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uLife; varying vec2 vUv; void main() { float r = length(vUv - .5) * 2.; float a = exp(-r * r * 5.) * .55 + exp(-r * r * 40.) * .4; gl_FragColor = vec4(vec3(1., .66, .3) * a * uLife, 1.); }',
  });
  const stickGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.8, 20).translate(0, 0.4, 0);
  const wickGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6).translate(0, 0.85, 0);
  const candles = [[-0.55, 0.2], [0.55, 0.2], [0, -0.5]].map(([x, z], k) => {
    const g = new THREE.Group(); g.position.set(x, TOP, z); g.scale.setScalar(0.0001);
    g.add(new THREE.Mesh(stickGeo, new THREE.MeshBasicMaterial({ map: stripe })));
    g.add(new THREE.Mesh(wickGeo, new THREE.MeshBasicMaterial({ color: 0x2a1b1b })));
    cake.add(g);
    const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.62), flameMat());
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), glowMat());
    scene.add(glow, flame);
    return { g, flame, glow, life: 0, lean: 0, out: true, need: [0.45, 0.85, 1.2][k], tip: new THREE.Vector3() };
  });
  const tipLocal = new THREE.Vector3(0, 0.9, 0);

  // ---------- smoke and confetti ----------
  const SM = 240, smPos = new Float32Array(SM * 3), smAge = new Float32Array(SM).fill(99), smVel = new Float32Array(SM * 3);
  const smGeo = new THREE.BufferGeometry();
  smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3)); smGeo.setAttribute('aAge', new THREE.BufferAttribute(smAge, 1));
  const smoke = new THREE.Points(smGeo, new THREE.ShaderMaterial({
    uniforms: { uPR: { value: DPR } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float aAge; uniform float uPR; varying float vA; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float k = clamp(aAge / 2.6, 0., 1.); vA = (1. - k) * smoothstep(0., .15, aAge) * .32; gl_PointSize = (14. + 70. * k) * uPR / -mv.z * 6.; }',
    fragmentShader: 'varying float vA; void main() { float r = length(gl_PointCoord - .5) * 2.; float a = smoothstep(1., .1, r) * vA; if (a < .003) discard; gl_FragColor = vec4(vec3(.82, .78, .86), a); }',
  }));
  smoke.frustumCulled = false; scene.add(smoke);
  let smHead = 0;
  function puffSmoke(at, n = 70) {
    for (let k = 0; k < n; k++) {
      const i = smHead++ % SM; smAge[i] = -k * 0.012;
      smPos.set([at.x, at.y, at.z], i * 3);
      smVel.set([(rand() - 0.5) * 0.18, 0.45 + rand() * 0.35, (rand() - 0.5) * 0.18], i * 3);
    }
  }
  const CF = small ? 360 : 520, cfPos = new Float32Array(CF * 3), cfVel = new Float32Array(CF * 4), cfAng = new Float32Array(CF), cfCol = new Float32Array(CF * 3);
  const PAL = [0xffcf7a, 0xf2a5b8, 0x9fe3c9, 0xfff1e0, 0xc9466e, 0x9cc4ff].map(hex);
  for (let i = 0; i < CF; i++) { const c = PAL[i % PAL.length]; cfCol.set([c.r, c.g, c.b], i * 3); cfPos[i * 3 + 1] = -99; }
  const cfGeo = new THREE.BufferGeometry();
  cfGeo.setAttribute('position', new THREE.BufferAttribute(cfPos, 3)); cfGeo.setAttribute('aAng', new THREE.BufferAttribute(cfAng, 1)); cfGeo.setAttribute('aCol', new THREE.BufferAttribute(cfCol, 3));
  const confetti = new THREE.Points(cfGeo, new THREE.ShaderMaterial({
    uniforms: { uPR: { value: DPR } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float aAng; attribute vec3 aCol; uniform float uPR; varying float vAng; varying vec3 vCol; void main() { vAng = aAng; vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = 1.9 * uPR * 40. / -mv.z; }',
    fragmentShader: 'varying float vAng; varying vec3 vCol; void main() { vec2 p = gl_PointCoord - .5; float c = cos(vAng), s = sin(vAng); p = mat2(c, -s, s, c) * p; float flip = .2 + .8 * abs(sin(vAng * 1.7)); if (abs(p.x) > .42 || abs(p.y) > .17 * flip + .02) discard; gl_FragColor = vec4(vCol * (.75 + .25 * flip), 1.); }',
  }));
  confetti.frustumCulled = false; scene.add(confetti);
  let confettiOn = false;
  function launchConfetti() {
    confettiOn = true;
    for (let i = 0; i < CF; i++) {
      cfPos.set([(rand() - 0.5) * 14, 7 + rand() * 9, (rand() - 0.5) * 6], i * 3);
      cfVel.set([(rand() - 0.5) * 0.4, 1.1 + rand() * 1.1, rand() * 6.28, 2 + rand() * 5], i * 4);
    }
  }

  // ---------- the words, sampled from type ----------
  async function setText() {
    const portrait = innerWidth / innerHeight < 0.9;
    try { await Promise.all([document.fonts.load('italic 600 120px "Fraunces Variable"'), document.fonts.load('640 120px "Fraunces Variable"')]); } catch {}
    const lines = portrait
      ? [['Happy', 'italic 600', 1, 0], ['birthday,', 'italic 600', 1, 0], [NAME, '640', 1.75, 1]]
      : [['Happy birthday,', 'italic 600', 1, 0], [NAME, '640', 1.6, 1]];
    const W = 1400, ctx2 = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    let unit = 200;
    ctx2.font = `${lines[0][1]} ${unit}px "Fraunces Variable"`;
    const widest = Math.max(...lines.map(([t, f, s]) => { ctx2.font = `${f} ${unit * s}px "Fraunces Variable"`; return ctx2.measureText(t).width; }));
    unit *= (W * 0.92) / widest;
    const heights = lines.map(([, , s]) => unit * s * 1.0);
    const H = Math.ceil(heights.reduce((a, b) => a + b, 0) + unit * 0.4);
    const cv = ctx2.canvas; cv.width = W; cv.height = H;
    ctx2.fillStyle = '#fff'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'alphabetic';
    let y = unit * 0.15; const bands = [];
    lines.forEach(([t, f, s], k) => { ctx2.font = `${f} ${unit * s}px "Fraunces Variable"`; y += heights[k]; ctx2.fillText(t, W / 2, y - unit * s * 0.2); bands.push(y); });
    const img = ctx2.getImageData(0, 0, W, H).data, pts = [];
    for (let py = 0; py < H; py += 2) for (let px = 0; px < W; px += 2) if (img[(py * W + px) * 4 + 3] > 130) pts.push(px, py);
    const worldW = portrait ? 4.7 : 7.6, sc = worldW / W, cy = portrait ? 1.9 : 1.75;
    const pos = geo.attributes.aText.array, col = geo.attributes.aColText.array, cnt = pts.length / 2;
    const gold = hex(0xffcf7a), cream = hex(0xfff1e0), rose = hex(0xf6b3c4), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const j = Math.floor(rand() * cnt), px = pts[j * 2] + rand() * 2, py = pts[j * 2 + 1] + rand() * 2;
      pos.set([(px - W / 2) * sc, cy + (H / 2 - py) * sc, (rand() - 0.5) * 0.14], i * 3);
      const isName = py > bands[bands.length - 2];
      if (isName) c.copy(gold).lerp(rose, Math.pow(rand(), 3) * 0.6); else c.copy(cream).lerp(gold, rand() * 0.25);
      c.multiplyScalar(0.85 + rand() * 0.2);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.attributes.aText.needsUpdate = true; geo.attributes.aColText.needsUpdate = true;
    textBox.set(new THREE.Vector3(-worldW / 2, cy - (H / 2) * sc, 0), new THREE.Vector3(worldW / 2, cy + (H / 2) * sc, 0));
  }
  const textBox = new THREE.Box3(new THREE.Vector3(-3, 0.5, 0), new THREE.Vector3(3, 3, 0));

  // ---------- camera, view, input ----------
  let shift = 0;           // 0: centred; 1: the words sit beside (or above) the tag
  const fit = { zoom: 1, ox: 0, oy: 0 };
  function baseCamera() {
    const a = innerWidth / innerHeight, portrait = a < 0.9;
    camera.aspect = a; camera.fov = portrait ? 50 : 38; camera.zoom = 1; camera.clearViewOffset();
    const dist = portrait ? 12.5 + (0.6 - Math.min(a, 0.6)) * 8 : 12.6;
    // landscape looks a little below the cake, so it sits high and the captions have the floor
    camera.position.set(0, 3.4, dist); camera.lookAt(0, portrait ? 1.55 : 0.75, 0);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  // where the words should go once the tag is up: the largest box the tag leaves free
  function fitWords() {
    baseCamera();
    const W = innerWidth, H = innerHeight, card = $('#card').getBoundingClientRect();
    const toPx = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
    const [x0, y0] = toPx(new THREE.Vector3(textBox.min.x, textBox.max.y, 0)), [x1, y1] = toPx(new THREE.Vector3(textBox.max.x, textBox.min.y, 0));
    let free;
    if (card.width && card.left > W * 0.45) free = { l: 24, t: 24, r: card.left - 32, b: H - 24 };
    else if (card.height) free = { l: 16, t: 58, r: W - 16, b: card.top - 14 };
    else return Object.assign(fit, { zoom: 1, ox: 0, oy: 0 });
    const z = Math.min(1, (free.r - free.l) / (x1 - x0), (free.b - free.t) / (y1 - y0));
    const sx = (x0 + x1) / 2, sy = (y0 + y1) / 2;
    const cx = W / 2 + (sx - W / 2) * z, cy = H / 2 + (sy - H / 2) * z;
    Object.assign(fit, { zoom: z, ox: cx - (free.l + free.r) / 2, oy: cy - (free.t + free.b) / 2 });
  }
  function frameCamera() {
    baseCamera();
    if (shift > 0.001) {
      camera.zoom = lerp(1, fit.zoom, shift);
      camera.setViewOffset(innerWidth, innerHeight, fit.ox * shift, fit.oy * shift, innerWidth, innerHeight);
    }
    camera.updateProjectionMatrix();
  }
  function resize() { renderer.setSize(innerWidth, innerHeight); if (!$('#card').hidden) fitWords(); frameCamera(); }
  addEventListener('resize', resize); frameCamera();

  let rotY = -0.5, spin = true, drag = null, vel = 0;
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, r: rotY }; vel = 0; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!drag || !spin) return; const r = drag.r + (e.clientX - drag.x) * 0.008; vel = r - rotY; rotY = r; });
  cv.addEventListener('pointerup', () => { drag = null; });

  // ---------- tweens ----------
  const tweens = new Set();
  function tween(obj, key, to, ms, ease = easeInOut) {
    if (reduced) ms = Math.min(ms, 500);
    return new Promise((res) => { for (const t of tweens) if (t.obj === obj && t.key === key) tweens.delete(t); tweens.add({ obj, key, from: obj[key], to, ms, ease, t0: performance.now(), res }); });
  }
  const view = { shift: 0 };

  // ---------- breath ----------
  const breath = { mic: null, data: null, floor: 0.02, thr: 0.08, level: 0, hold: 0, acc: 0, active: false };
  async function startMic() {
    const btn = $('#mic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      audio.init();
      const ctx = audio.ctx, src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser();
      an.fftSize = 1024; src.connect(an);
      breath.mic = an; breath.data = new Float32Array(an.fftSize); breath.stream = stream;
      document.body.classList.add('listening'); btn.textContent = 'Listening…';
      // a moment of the room's own noise, so a loud room doesn't blow the candles out
      const t0 = performance.now(); let sum = 0, n = 0;
      while (performance.now() - t0 < 700) { sum += rms(); n++; await new Promise((r) => setTimeout(r, 30)); }
      breath.floor = sum / Math.max(1, n); breath.thr = clamp(breath.floor * 2.4 + 0.045, 0.06, 0.3);
      btn.textContent = 'Blow on your screen';
    } catch {
      btn.hidden = true; $('#mic-note').textContent = 'No microphone here. Press and hold the button instead.';
    }
  }
  function rms() { const an = breath.mic; if (!an) return 0; an.getFloatTimeDomainData(breath.data); let s = 0; for (const v of breath.data) s += v * v; return Math.sqrt(s / breath.data.length); }
  function stopMic() { breath.stream?.getTracks().forEach((t) => t.stop()); breath.mic = null; breath.stream = null; document.body.classList.remove('listening'); }
  $('#mic').addEventListener('click', startMic);
  const hold = $('#hold');
  const press = (on) => (e) => { e.preventDefault(); breath.holding = on; hold.classList.toggle('on', on); };
  hold.addEventListener('pointerdown', press(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, press(false)));
  hold.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') press(true)(e); });
  hold.addEventListener('keyup', press(false));
  hold.addEventListener('contextmenu', (e) => e.preventDefault());

  let allOut = null;
  function updateBreath(dt) {
    let b = 0;
    if (breath.mic) b = Math.max(0, (rms() - breath.floor) / Math.max(0.01, breath.thr - breath.floor));
    breath.hold = lerp(breath.hold, breath.holding ? 1.7 + Math.sin(performance.now() * 0.02) * 0.25 : 0, Math.min(1, dt * 6));
    b = Math.max(b, breath.hold);
    breath.level = lerp(breath.level, b, Math.min(1, dt * 10));
    if (!breath.active) return;
    if (breath.level > 1) breath.acc += (breath.level - 0.6) * dt * 1.25; else breath.acc = Math.max(0, breath.acc - dt * 0.22);
    hold.style.setProperty('--p', clamp(breath.acc / 1.2, 0, 1).toFixed(3));
    candles.forEach((c, k) => {
      if (c.out) return;
      if (breath.acc > c.need) {
        c.out = true; tween(c, 'life', 0, 260, easeOut);
        puffSmoke(c.tip.clone().add(new THREE.Vector3(0, 0.12, 0))); audio.puff(0.6 + 0.2 * k);
        if (candles.every((q) => q.out)) { breath.active = false; allOut?.(); }
      }
    });
  }

  // ---------- the evening, in order ----------
  async function lightCandles() {
    for (const [k, c] of candles.entries()) {
      tween(c.g.scale, 'y', 1, 500, easeOut); tween(c.g.scale, 'x', 1, 500, easeOut); tween(c.g.scale, 'z', 1, 500, easeOut);
      await sleep(260);
    }
    await sleep(250);
    for (const [k, c] of candles.entries()) { c.out = false; tween(c, 'life', 1, 380, easeOut); audio.pop(660 + k * 220); await sleep(280); }
    tween(U.uGlow, 'value', 1, 900);
  }
  async function waitForBreath() {
    breath.acc = 0; breath.active = true; hold.style.setProperty('--p', 0);
    document.body.classList.add('blowing'); $('#blow').hidden = false;
    caption('Now blow them out.');
    await new Promise((r) => { allOut = r; });
    stopMic(); $('#blow').hidden = true; document.body.classList.remove('blowing');
    if (!$('#mic').hidden) $('#mic').textContent = 'Blow with my microphone';
  }
  async function celebrate() {
    tween(U.uGlow, 'value', 0, 700);
    caption('Wish received.', 1700); await sleep(2200);
    spin = false;
    await tween({ get v() { return rotY; }, set v(x) { rotY = x; } }, 'v', Math.round(rotY / 6.2832) * 6.2832, 900);
    candles.forEach((c) => tween(c.g.scale, 'y', 0.0001, 500));
    candles.forEach((c) => { tween(c.g.scale, 'x', 0.0001, 500); tween(c.g.scale, 'z', 0.0001, 500); });
    await setText();
    smAge.fill(99);
    tween(U.uB, 'value', 1, 2800);
    await sleep(500);
    launchConfetti(); audio.song();
    await sleep(2900);
    $('#card').hidden = false; fitWords(); tween(view, 'shift', 1, 1100);
    $('#again').focus({ preventScroll: true });
  }

  $('#open').addEventListener('click', async () => {
    audio.init();
    $('#intro').classList.add('gone'); $('#sound').hidden = false;
    setTimeout(() => ($('#intro').hidden = true), 1000);
    tween(U.uA, 'value', 1, 3600);
    await sleep(2900);
    await lightCandles();
    await caption('It’s a little late. The candles are still lit.', 3000); await sleep(500);
    await caption('Make a wish first.', 2600); await sleep(500);
    await waitForBreath();
    await celebrate();
  });
  $('#again').addEventListener('click', async () => {
    $('#card').hidden = true; confettiOn = false;
    tween(view, 'shift', 0, 900);
    await tween(U.uB, 'value', 0, 2200);
    spin = true;
    await lightCandles();
    await caption('Another wish. Why not.', 2400); await sleep(500);
    await waitForBreath();
    await celebrate();
  });

  // a hook for checking the page in a headless browser
  window.__safa = { blow: () => { breath.active && candles.forEach((c) => (c.need = 0)); breath.acc = 1; } };

  // ---------- frame ----------
  let last = performance.now();
  const wp = new THREE.Vector3(), shiftWas = { v: -1 };
  renderer.setAnimationLoop((now) => {
    const realDt = Math.min(0.25, (now - last) / 1000);   // smoke ages in real time, even on a slow phone
    const dt = Math.min(0.05, realDt); last = now;
    const t = now / 1000;
    for (const tw of tweens) {
      const k = clamp((now - tw.t0) / tw.ms, 0, 1); tw.obj[tw.key] = lerp(tw.from, tw.to, tw.ease(k));
      if (k >= 1) { tweens.delete(tw); tw.res(); }
    }
    U.uTime.value = t;
    const solid = clamp((U.uA.value - 0.8) / 0.2, 0, 1) * (1 - clamp(U.uB.value * 4, 0, 1));
    for (const f of fills) { f.material.opacity = solid; f.visible = solid > 0.01; f.material.depthWrite = solid > 0.99; }
    if (spin && !drag) { rotY += (reduced ? 0.06 : 0.2) * dt + vel; vel *= 0.92; }
    cake.rotation.y = rotY;
    if (view.shift !== shiftWas.v) { shift = view.shift; shiftWas.v = shift; frameCamera(); }
    cake.updateMatrixWorld();

    updateBreath(dt);
    candles.forEach((c, k) => {
      c.tip.copy(tipLocal); c.g.localToWorld(c.tip);
      const lean = c.out ? 0 : clamp(breath.level, 0, 3) * (k === 1 ? 0.32 : -0.28) + Math.sin(t * 1.3 + k) * 0.04;
      c.lean = lerp(c.lean, lean, Math.min(1, dt * 8));
      const flick = 1 - clamp(breath.level - 0.4, 0, 2) * 0.18 * (0.5 + 0.5 * Math.sin(t * 40 + k * 3));
      c.flame.position.copy(c.tip).add(wp.set(0, 0.25, 0));
      c.flame.quaternion.copy(camera.quaternion);
      c.flame.material.uniforms.uTime.value = t; c.flame.material.uniforms.uLean.value = c.lean;
      c.flame.material.uniforms.uLife.value = c.life * flick;
      c.flame.scale.set(1, (0.85 + 0.15 * c.life) * (1 + clamp(breath.level, 0, 2) * 0.12), 1);
      c.glow.position.copy(c.flame.position); c.glow.quaternion.copy(camera.quaternion);
      c.glow.material.uniforms.uLife.value = c.life * (0.85 + 0.15 * Math.sin(t * 9 + k * 2)) * flick;
    });
    U.uFlame.value.set(0, TOP + 0.95, -0.05);

    // smoke rises and curls
    for (let i = 0; i < SM; i++) {
      if (smAge[i] > 3) continue;
      smAge[i] += realDt; if (smAge[i] < 0) continue;
      const j = i * 3;
      smVel[j] += Math.sin(t * 2 + i) * 0.06 * dt; smVel[j + 2] += Math.cos(t * 1.7 + i) * 0.06 * dt;
      smPos[j] += smVel[j] * dt; smPos[j + 1] += smVel[j + 1] * dt; smPos[j + 2] += smVel[j + 2] * dt;
    }
    smGeo.attributes.position.needsUpdate = true; smGeo.attributes.aAge.needsUpdate = true;

    // confetti falls, sways and turns
    for (let i = 0; i < CF; i++) {
      const j = i * 3, q = i * 4;
      if (cfPos[j + 1] < -6) { if (!confettiOn) continue; cfPos.set([(rand() - 0.5) * 14, 8 + rand() * 3, (rand() - 0.5) * 6], j); }
      cfPos[j + 1] -= cfVel[q + 1] * dt; cfPos[j] += (Math.sin(t * 1.6 + cfVel[q + 2]) * 0.5 + cfVel[q]) * dt;
      cfAng[i] += cfVel[q + 3] * dt;
    }
    cfGeo.attributes.position.needsUpdate = true; cfGeo.attributes.aAng.needsUpdate = true;
    if (confettiOn && U.uB.value >= 1 && !cfGeo.userData.stopAt) cfGeo.userData.stopAt = now + 7000;
    if (cfGeo.userData.stopAt && now > cfGeo.userData.stopAt) { confettiOn = false; cfGeo.userData.stopAt = 0; }

    renderer.render(scene, camera);
  });
}
