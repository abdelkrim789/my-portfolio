import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import '@fontsource-variable/archivo/wdth.css';
import './ice.css';
import { SPECIMENS } from './ice-data.js';
import { BUILDERS } from './ice-objects.js';

// Cold Storage. A vault of ice stands on a snow field; scroll and it splits into blocks that line up as an archive.
// Each block holds one piece of my work, frozen. Drag to turn it, click to thaw it: the ice melts away and the story opens.
// The last block is me, with two small blocks beside it that are doors to the other worlds.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const ease3 = (x) => { const t = clamp(x, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const N = SPECIMENS.length, LAST = N + 1, GAP = 4.4, SIZE = 1.7;
const VAULT = new THREE.Vector3(-12, 0, 0);
const EMAIL = 'abdelkrimghebouli.34@gmail.com';

function frostTextures(S = 512) {
  // roughness: frosted rims and patches; normal: chips and cracks, derived from a drawn height field
  const rc = document.createElement('canvas'); rc.width = rc.height = S;
  const r = rc.getContext('2d'), img = r.createImageData(S, S);
  const hc = document.createElement('canvas'); hc.width = hc.height = S;
  const h = hc.getContext('2d');
  const rnd = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = rnd(xi * 57 + yi * 131), b = rnd((xi + 1) * 57 + yi * 131), c = rnd(xi * 57 + (yi + 1) * 131), d = rnd((xi + 1) * 57 + (yi + 1) * 131);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, e = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
    const n = vn(u * 9, v * 9) * 0.6 + vn(u * 31, v * 31) * 0.4;
    const frost = clamp((e - 0.72) / 0.28, 0, 1) * (0.5 + n * 0.8) + clamp((n - 0.72) * 2.2, 0, 1) * 0.35;
    const val = clamp(0.03 + frost * 0.6, 0, 1) * 255, i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = val; img.data[i + 3] = 255;
  }
  r.putImageData(img, 0, 0);
  h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  for (let k = 0; k < 7; k++) {
    let x = rnd(k + 3) * S, y = rnd(k + 9) * S, a = rnd(k + 17) * Math.PI * 2;
    h.strokeStyle = `rgba(255,255,255,${0.35 + rnd(k) * 0.4})`; h.lineWidth = 1 + rnd(k + 5) * 2.2; h.beginPath(); h.moveTo(x, y);
    for (let s = 0; s < 22; s++) { a += (rnd(k * 31 + s) - 0.5) * 1.1; x += Math.cos(a) * 14; y += Math.sin(a) * 14; h.lineTo(x, y);
      if (rnd(k * 7 + s) > 0.82) { h.moveTo(x, y); a += (rnd(s) - 0.5) * 2.4; } }
    h.stroke();
  }
  for (let k = 0; k < 140; k++) { h.fillStyle = `rgba(${rnd(k) > 0.5 ? 255 : 0},${rnd(k) > 0.5 ? 255 : 0},${rnd(k) > 0.5 ? 255 : 0},0.12)`; h.beginPath(); h.arc(rnd(k + 1) * S, rnd(k + 2) * S, 1 + rnd(k + 3) * 6, 0, Math.PI * 2); h.fill(); }
  const hd = h.getImageData(0, 0, S, S).data, nc = document.createElement('canvas'); nc.width = nc.height = S;
  const ng = nc.getContext('2d'), nimg = ng.createImageData(S, S);
  const H = (x, y) => hd[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 3, dy = (H(x, y + 1) - H(x, y - 1)) * 3, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    nimg.data[i] = (-dx / l * 0.5 + 0.5) * 255; nimg.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nimg.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nimg.data[i + 3] = 255;
  }
  ng.putImageData(nimg, 0, 0);
  const rough = new THREE.CanvasTexture(rc), normal = new THREE.CanvasTexture(nc);
  [rough, normal].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; });
  return { rough, normal };
}

export async function createIce(env) {
  const { renderer, small, coarse, reduced, tier, meURL, shotFor, achieve, audio, guide, isUI, overlayOpen, travel, scramble } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();
  const FOG = new THREE.Color(0.79, 0.84, 0.88);
  scene.fog = new THREE.Fog(FOG, 26, 140);
  const fancy = tier > 0;
  let transScale = tier >= 2 ? 1 : 0.8;

  // ---------- sky, light, ground ----------
  const sunDir = new THREE.Vector3(-0.55, 0.32, -0.77).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(0.42, 0.55, 0.68) }, uHor: { value: FOG.clone() }, uSun: { value: new THREE.Color(1.0, 0.86, 0.66) }, uSunDir: { value: sunDir } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunDir; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(uHor, uTop, smoothstep(0.02, 0.55, h));
        float s = max(0.0, dot(d, uSunDir));
        c += uSun*(pow(s, 300.0)*3.0 + pow(s, 12.0)*0.22 + pow(s, 3.0)*0.08);
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  sky.frustumCulled = false;
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe8f3ff, 0xaebccb, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.copy(sunDir).multiplyScalar(-1).setY(12).add(new THREE.Vector3(0, 0, 14)); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc4e2ff, 1.4); rim.position.set(8, 5, -12); scene.add(rim);

  const MAXB = 16;
  const groundU = {
    uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFog: { value: FOG.clone() }, uBlobs: { value: Array.from({ length: MAXB }, () => new THREE.Vector4()) },
    uSnow: { value: new THREE.Color(0.86, 0.9, 0.94) }, uShade: { value: new THREE.Color(0.58, 0.67, 0.78) },
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShaderMaterial({
    uniforms: groundU, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 uCam, uFog, uSnow, uShade; uniform float uTime; uniform vec4 uBlobs[${MAXB}]; varying vec3 vW;
      float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a*vn(p); p *= 2.07; a *= 0.5; } return s; }
      void main(){
        vec2 p = vW.xz;
        float n = fbm(p*0.22), n2 = fbm(p*1.7);
        float drift = 0.5 + 0.5*sin(p.x*0.9 + p.y*0.35 + n*6.0);
        vec3 col = mix(uShade, uSnow, 0.72 + 0.2*n + 0.08*drift);
        col *= 0.97 + 0.03*n2;
        float sh = 0.0;
        for (int i = 0; i < ${MAXB}; i++) { vec4 b = uBlobs[i]; if (b.w <= 0.0) continue; vec2 d = p - b.xz; d.x -= 0.25*b.y; sh += b.w*exp(-dot(d, d)/(0.7 + b.y*0.55)); }
        col = mix(col, col*vec3(0.62, 0.72, 0.86), clamp(sh, 0.0, 0.75));
        vec3 v = normalize(uCam - vW);
        vec2 cell = floor(p*34.0); float g = h1(cell);
        float tw = step(0.984, g)*pow(max(0.0, sin(uTime*1.7 + g*90.0 + dot(v, vec3(31.0, 17.0, 23.0)))), 24.0);
        col += vec3(1.0, 0.98, 0.95)*tw*2.2*(1.0 - clamp(sh, 0.0, 1.0));
        float dist = length(vW - uCam);
        col = mix(col, uFog, smoothstep(26.0, 140.0, dist));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // distant ridges, pre-fogged
  const ridges = [[-70, 16, 0.71, 1], [-110, 26, 0.75, 2], [-170, 40, 0.78, 3]].map(([z, hgt, c, seed]) => {
    const s = new THREE.Shape(); s.moveTo(-420, -2);
    for (let x = -420; x <= 420; x += 6) {
      const k = x * 0.012 + seed * 10;
      const y = hgt * (0.45 + 0.35 * Math.sin(k) + 0.2 * Math.sin(k * 2.7 + 1.3) + 0.12 * Math.sin(k * 7.1)) ;
      s.lineTo(x, Math.max(0, y));
    }
    s.lineTo(420, -2);
    const col = FOG.clone().lerp(new THREE.Color(0.48, 0.58, 0.68), 1 - c);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: col, fog: false }));
    m.position.set(0, -0.5, z); m.userData.par = seed * 0.25 + 0.3;
    scene.add(m);
    return m;
  });

  // snow: falling flakes that wrap around the camera
  const FL = small || coarse ? 1400 : 2800;
  const fp = new Float32Array(FL * 3), fs = new Float32Array(FL);
  for (let i = 0; i < FL; i++) { fp.set([Math.random() * 40 - 20, Math.random() * 14, Math.random() * 24 - 16], i * 3); fs[i] = Math.random(); }
  const flakesG = new THREE.BufferGeometry(); flakesG.setAttribute('position', new THREE.BufferAttribute(fp, 3)); flakesG.setAttribute('aSeed', new THREE.BufferAttribute(fs, 1));
  const flakeU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPR: { value: 1 }, uWind: { value: 0 } };
  const flakes = new THREE.Points(flakesG, new THREE.ShaderMaterial({
    uniforms: flakeU, transparent: true, depthWrite: false, fog: false,
    vertexShader: `uniform float uTime, uPR, uWind; uniform vec3 uCam; attribute float aSeed; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y - uTime*(0.35 + aSeed*0.5), 14.0);
        p.x += sin(uTime*0.7 + aSeed*30.0)*0.35 + uTime*(0.25 + uWind);
        p.x = mod(p.x - uCam.x + 20.0, 40.0) - 20.0 + uCam.x;
        p.z += cos(uTime*0.5 + aSeed*20.0)*0.25;
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float d = -mv.z;
        gl_PointSize = (1.4 + aSeed*2.6)*uPR*(14.0/d);
        vA = smoothstep(40.0, 8.0, d)*smoothstep(0.3, 1.5, d);
      }`,
    fragmentShader: 'varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.15, length(c))*vA; gl_FragColor = vec4(vec3(1.0), a*0.9); }',
  }));
  flakes.frustumCulled = false;
  scene.add(flakes);

  // ice chunks scattered around the vault
  const chunkM = new THREE.MeshPhysicalMaterial({ color: 0xe9f5ff, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.2 });
  const chunks = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.12), chunkM, 16);
  const dm = new THREE.Object3D();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3, r = 4.2 + Math.random() * 3.5, s = 0.2 + Math.random() * 0.55;
    dm.position.set(VAULT.x + Math.cos(a) * r * 1.3, s * 0.25, VAULT.z + Math.sin(a) * r);
    dm.rotation.set(Math.random(), Math.random() * 3, Math.random()); dm.scale.set(s, s * (0.6 + Math.random() * 0.6), s); dm.updateMatrix(); chunks.setMatrixAt(i, dm.matrix);
  }
  scene.add(chunks);

  // ---------- the blocks ----------
  const frost = frostTextures(small ? 256 : 512);
  const shellGeo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, 0.12);
  function shellMaterial() {
    const U = { uMelt: { value: 0 }, uGlow: { value: 0 } };
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xf6fcff, metalness: 0, roughness: 1, roughnessMap: frost.rough, normalMap: frost.normal, normalScale: new THREE.Vector2(0.35, 0.35),
      transmission: fancy ? 1 : 0, thickness: 1.1, ior: 1.31, attenuationColor: new THREE.Color(0.66, 0.86, 0.97), attenuationDistance: 3.6,
      clearcoat: 0.9, clearcoatRoughness: 0.06, specularIntensity: 1, envMapIntensity: 1.35, dispersion: tier >= 2 ? 0.4 : 0,
      transparent: !fancy, opacity: fancy ? 1 : 0.45, depthWrite: fancy,
    });
    m.userData.U = U;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vObj; uniform float uMelt, uGlow;
        float ih(vec3 p){ return fract(sin(dot(p, vec3(17.1, 113.7, 41.3)))*43758.5453); }
        float in3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
          return mix(mix(mix(ih(i), ih(i + vec3(1, 0, 0)), f.x), mix(ih(i + vec3(0, 1, 0)), ih(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(ih(i + vec3(0, 0, 1)), ih(i + vec3(1, 0, 1)), f.x), mix(ih(i + vec3(0, 1, 1)), ih(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float mf = in3(vObj*3.1)*0.42 + in3(vObj*7.7)*0.18 + (0.5 - vObj.y/${SIZE.toFixed(2)})*0.4 + 0.08;
          float th = uMelt*1.18 - 0.06;
          if (uMelt > 0.001 && mf < th) discard;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
          totalEmissiveRadiance += vec3(0.7, 0.88, 1.0)*(fr*uGlow*0.55);
          if (uMelt > 0.001) totalEmissiveRadiance += vec3(0.8, 0.95, 1.0)*(1.0 - smoothstep(0.0, 0.045, mf - th))*3.0;`);
    };
    m.customProgramCacheKey = () => `ice-shell-${fancy ? 1 : 0}`;
    return m;
  }
  function labelTex(no, title, year) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.font = '800 120px "Archivo Variable", Arial'; g.fillText(no, 24, 150);
    const w = g.measureText(no).width;
    g.font = '600 46px "Archivo Variable", Arial'; g.fillText(title.toUpperCase(), 48 + w, 96);
    g.font = '500 32px "IBM Plex Mono", monospace'; g.globalAlpha = 0.8; g.fillText(year, 50 + w, 146);
    g.fillRect(24, 196, 976, 3);
    g.font = '500 24px "IBM Plex Mono", monospace'; g.fillText('COLD STORAGE · ABDELKRIM GHEBOULI', 24, 236);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  const bubbleTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 12, 0, Math.PI * 2); g.fill(); return new THREE.CanvasTexture(c); })();
  function bubbles(n) {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.022, color: 0xf8fdff, alphaMap: bubbleTex, alphaTest: 0.5 }));
  }

  const photo = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = meURL; });
  try { await Promise.race([document.fonts.load('800 100px "Archivo Variable"'), new Promise((r) => setTimeout(r, 1500))]); } catch {}

  const blocks = [];
  function makeBlock(i, key, label, scale = 1) {
    const root = new THREE.Group(), spin = new THREE.Group();
    const mat = shellMaterial();
    const shell = new THREE.Mesh(shellGeo, mat);
    shell.renderOrder = 2;
    const obj = BUILDERS[key](photo);
    spin.add(obj.group, shell, bubbles(key === 'portrait' ? 20 : 34));
    let lab = null;
    if (label) {
      lab = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.34), new THREE.MeshBasicMaterial({ map: labelTex(...label), transparent: true, opacity: 0.85, depthWrite: false, color: new THREE.Color(1.25, 1.35, 1.45) }));
      lab.position.set(-0.05, -0.56, SIZE / 2 + 0.004); lab.renderOrder = 3;
      spin.add(lab);
    }
    root.add(spin); root.scale.setScalar(scale);
    scene.add(root);
    const b = { i, key, root, spin, shell, mat, obj, lab, scale, home: new THREE.Vector3(), vault: new THREE.Vector3(), melt: 0, glow: 0, axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), seed: Math.random() * 10, objScale: 1 };
    blocks.push(b);
    return b;
  }
  SPECIMENS.forEach((sp, i) => {
    const b = makeBlock(i, sp.key, [`No.${String(i + 1).padStart(2, '0')}`, sp.title, sp.year]);
    b.sp = sp;
    b.home.set(i * GAP, 1.55, 0);
  });
  const me = makeBlock(N, 'portrait', ['No.12', 'Abdelkrim Ghebouli', 'Bordj Bou Arreridj'], 1.25);
  me.home.set(N * GAP, 1.8, 0);
  const doors = [['night', 'galaxy', 2.75], ['desk', 'computer', 1.3]].map(([w, key, y]) => {
    const b = makeBlock(-1, key, null, 0.5); b.world = w; b.home.set(N * GAP + 1.7, y, 0.8); b.vault.copy(b.home); b.dy = y; return b;
  });
  function placeDoors() {
    doors.forEach((d, i) => { if (F.mobile) d.home.set(N * GAP + (i ? 0.8 : -0.8), 3.45, 0.3); else d.home.set(N * GAP + 1.7, d.dy, 0.8); });
  }
  // the vault: a 3 x 2 x 2 stack of the twelve blocks
  [...blocks.slice(0, N), me].forEach((b, k) => {
    const ix = k % 3, iy = Math.floor(k / 3) % 2, iz = Math.floor(k / 6);
    const s = SIZE + 0.025;
    b.vault.set(VAULT.x + (ix - 1) * s, SIZE / 2 + iy * s, VAULT.z + (iz - 0.5) * s);
    b.vaultK = k;
  });
  me.vaultScale = 1 / 1.25;
  me.mat.thickness = 0.35; me.mat.attenuationDistance = 6; me.still = true;

  // shards for the thaw
  const SH = 64;
  const shardM = new THREE.MeshPhysicalMaterial({ color: 0xf2faff, roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.9, envMapIntensity: 1.6 });
  const shards = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.11, 0), shardM, SH);
  shards.frustumCulled = false;
  const sp = Array.from({ length: SH }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, s: 1 }));
  for (let i = 0; i < SH; i++) { dm.position.set(0, -50, 0); dm.updateMatrix(); shards.setMatrixAt(i, dm.matrix); }
  scene.add(shards);
  let shardNext = 0;
  function burst(center, n) {
    for (let k = 0; k < n; k++) {
      const s = sp[shardNext]; shardNext = (shardNext + 1) % SH;
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
      s.p.copy(center).addScaledVector(d, 0.6 + Math.random() * 0.3).add(new THREE.Vector3(0, 0.4, 0));
      s.v.copy(d).multiplyScalar(1.5 + Math.random() * 2.5).add(new THREE.Vector3(0, 1.2, 0));
      s.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); s.w.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      s.life = 1.6 + Math.random() * 0.8; s.s = 0.5 + Math.random() * 1.2;
    }
  }

  // ---------- interface ----------
  const ui = document.createElement('div');
  ui.className = 'ice-ui'; ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = `
    <section class="ice-intro">
      <h1 class="ice-title" data-text="Cold Storage">Cold<br>Storage</h1>
      <p class="ice-sub">Everything I’ve built, kept on ice. Eleven pieces of work, each one frozen as an object you can turn in your hands.</p>
      <button class="ice-cta" type="button">Open the vault <span aria-hidden="true">↓</span></button>
    </section>
    <section class="ice-spec" aria-live="polite">
      <p class="ice-no"><span>No.</span><b>01</b><i>/ ${String(N).padStart(2, '0')}</i></p>
      <h2 class="ice-name"></h2>
      <p class="ice-line"></p>
      <dl class="ice-meta"><div><dt>When</dt><dd class="m-year"></dd></div><div><dt>Role</dt><dd class="m-role"></dd></div><div><dt>Temp</dt><dd class="m-temp">−18.0°C</dd></div></dl>
      <button class="ice-thaw" type="button"><svg viewBox="0 0 16 20" width="13" height="16" aria-hidden="true"><path d="M8 1C8 1 2 8.4 2 12.6A6 6 0 0 0 14 12.6C14 8.4 8 1 8 1Z" fill="currentColor"/></svg><span>Thaw it</span></button>
    </section>
    <nav class="ice-ruler" aria-label="Archive"><ol></ol></nav>
    <p class="ice-hint"><span>Scroll</span> to move <i>·</i> <span>Drag</span> to turn <i>·</i> <span>Click</span> to thaw</p>
    <div class="ice-brackets" aria-hidden="true"><i></i><i></i><i></i><i></i><small class="b-a"></small><small class="b-b"></small></div>
    <section class="ice-final">
      <p class="ice-kicker">No.12 · the person</p>
      <h2 class="ice-name">Abdelkrim Ghebouli</h2>
      <p class="ice-line">SAP BPC consultant, from Bordj Bou Arreridj, Algeria. Open to SAP consultant roles internationally.</p>
      <span class="ice-mail">${EMAIL}</span>
      <div class="ice-actions"><button type="button" class="ice-btn solid" data-copy>Copy email</button><a class="ice-btn" href="https://www.linkedin.com/in/abdelkrim-ghebouli" target="_blank" rel="noopener">LinkedIn ↗</a><a class="ice-btn" href="./Abdelkrim-Ghebouli-CV.pdf" download data-cv>CV ↓</a></div>
    </section>
    <button class="ice-door" type="button" data-world="night"><b>Night</b><span>Enter ✦</span></button>
    <button class="ice-door" type="button" data-world="desk"><b>The Desk</b><span>Enter ▣</span></button>
    <aside class="ice-panel" aria-label="Thawed story">
      <div class="ice-panel-top"><span class="ice-pno"></span><button type="button" class="ice-close">Refreeze ✕</button></div>
      <div class="detail-body"></div>
      <nav class="ice-pnav"><button type="button" class="p-prev">← <span></span></button><button type="button" class="p-next"><span></span> →</button></nav>
    </aside>`;
  document.body.appendChild(ui);
  if (/claude\.ai|claudeusercontent/.test(location.hostname)) ui.querySelectorAll('[data-cv]').forEach((e) => e.remove());
  const $ = (s) => ui.querySelector(s);
  const specEl = $('.ice-spec'), noEl = $('.ice-no b'), nameEl = $('.ice-spec .ice-name'), lineEl = $('.ice-spec .ice-line');
  const yearEl = $('.m-year'), roleEl = $('.m-role'), tempEl = $('.m-temp');
  const panel = $('.ice-panel'), body = panel.querySelector('.detail-body'), pno = $('.ice-pno');
  const brackets = $('.ice-brackets'), bA = $('.b-a'), bB = $('.b-b');
  const doorEls = [...ui.querySelectorAll('.ice-door')];
  const rulerOl = $('.ice-ruler ol');
  const RULER = [...SPECIMENS.map((s, i) => [i + 1, s.title]), [LAST, 'The person']];
  RULER.forEach(([k, t]) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.innerHTML = `<em>${t}</em><span>${String(k).padStart(2, '0')}</span>`; b.dataset.k = k;
    b.setAttribute('aria-label', `Block ${k}: ${t}`);
    b.addEventListener('click', () => go(k));
    li.appendChild(b); rulerOl.appendChild(li);
  });
  const rulerBtns = [...rulerOl.querySelectorAll('button')];
  $('.ice-cta').addEventListener('click', () => go(1));
  $('.ice-thaw').addEventListener('click', () => { const c = curIndex(); if (c >= 0) thaw(c); });
  $('.ice-close').addEventListener('click', () => refreeze());
  $('.p-prev').addEventListener('click', () => stepThaw(-1));
  $('.p-next').addEventListener('click', () => stepThaw(1));
  doorEls.forEach((d) => d.addEventListener('click', () => { const r = d.getBoundingClientRect(); travel(d.dataset.world, r.left + r.width / 2, r.top + r.height / 2); }));
  $('[data-copy]').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(EMAIL); b.textContent = 'Copied ✓'; } catch { b.textContent = 'Select it above'; }
    achieve('hello'); setTimeout(() => (b.textContent = 'Copy email'), 2200);
  });

  // ---------- state ----------
  let warmed = false, s = 0, sT = 0, vel = 0, thawI = -1, thawA = 0, shownI = -2, on = false, cracked = false;
  let hover = null, drag = null, lastDrag = -10, wheelAcc = 0, wheelLock = false, lockStart = 0, unlockT = 0, temp = -18;
  const thawed = new Set((() => { try { return JSON.parse(localStorage.getItem('ag-thawed') || '[]'); } catch { return []; } })());
  let sessionThaws = 0;
  const angVel = new THREE.Vector3();
  const curIndex = () => { const k = Math.round(s); return k >= 1 && k <= N && Math.abs(s - k) < 0.3 ? k - 1 : -1; };
  const curBlock = () => { const k = Math.round(sT); return k >= 1 && k <= N ? blocks[k - 1] : k === LAST ? me : null; };

  function go(k) {
    k = clamp(Math.round(k), 0, LAST);
    if (k === sT) return;
    if (thawI >= 0) refreeze(true);
    sT = k;
    audio.whoosh();
  }
  function fillPanel(i) {
    const sp = SPECIMENS[i];
    const frag = document.createDocumentFragment();
    if (sp.shot) { const src = shotFor(sp.shot); if (src) { const f = document.createElement('figure'); f.className = 'shot'; f.innerHTML = `<img alt="${sp.title}" src="${src}">`; frag.appendChild(f); } }
    if (sp.html) { const d = document.createElement('div'); d.className = 'ice-sec'; d.innerHTML = sp.html; frag.appendChild(d); }
    else if (sp.tpl?.length > 1) { const d = document.createElement('div'); d.className = 'ice-sec lead'; d.innerHTML = `<p class="tag">${sp.year} · ${sp.place}</p><h3>${sp.title}</h3><p>${sp.line}</p>`; frag.appendChild(d); }
    (sp.tpl || []).forEach((id, n) => {
      const t = document.getElementById(id); if (!t) return;
      const d = document.createElement('div'); d.className = `ice-sec${(sp.tpl.length > 1 || sp.html) ? ' sub' : ''}`; d.appendChild(t.content.cloneNode(true));
      if (sp.html && n === 0) d.classList.add('sep');
      frag.appendChild(d);
    });
    body.replaceChildren(frag);
    pno.textContent = `No.${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')} · thawed`;
    const prev = SPECIMENS[(i - 1 + N) % N], next = SPECIMENS[(i + 1) % N];
    $('.p-prev span').textContent = prev.title; $('.p-next span').textContent = next.title;
    panel.scrollTop = 0;
    scramble?.(body.querySelector('h3'), 500);
  }
  function thaw(i) {
    if (i < 0 || i >= N) return;
    if (thawI === i) return;
    thawI = i;
    fillPanel(i);
    ui.classList.add('thawed'); panel.inert = false;
    const b = blocks[i];
    burst(b.root.position, 26);
    audio.crack(); setTimeout(() => audio.drip(), 700); setTimeout(() => audio.drip(), 1300);
    thawed.add(i); try { localStorage.setItem('ag-thawed', JSON.stringify([...thawed])); } catch {}
    if (thawed.size >= N) achieve('thaw');
    if (++sessionThaws === 3) setTimeout(() => guide?.event('ice-tease'), 2400);
    panel.querySelector('.ice-close').focus({ preventScroll: true });
  }
  function refreeze(silent) {
    if (thawI < 0) return;
    thawI = -1;
    ui.classList.remove('thawed'); panel.inert = true;
    if (!silent) audio.freeze();
  }
  function stepThaw(d) {
    const i = thawI < 0 ? curIndex() : thawI;
    const n = clamp(i + d, 0, N - 1);
    if (n === i) return;
    refreeze(true);
    sT = n + 1; audio.whoosh();
    setTimeout(() => { if (Math.round(sT) === n + 1) thaw(n); }, 650);
  }
  panel.inert = true;

  function setSpec(k) {
    if (k === shownI) return;
    shownI = k;
    rulerBtns.forEach((b) => b.classList.toggle('on', +b.dataset.k === k));
    if (k < 1 || k > N) return;
    const sp = SPECIMENS[k - 1];
    noEl.textContent = String(k).padStart(2, '0');
    nameEl.textContent = sp.title; nameEl.dataset.final = sp.title;
    lineEl.textContent = sp.line;
    yearEl.textContent = sp.year; roleEl.textContent = sp.role;
    scramble?.(nameEl, 520);
    audio.chime(k);
  }

  // ---------- input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const cand = [];
    const cb = curBlock();
    if (cb && cb.root.visible) cand.push(cb.shell);
    if (s > LAST - 0.6) doors.forEach((d) => cand.push(d.shell));
    if (thawI >= 0) cand.push(blocks[thawI].obj.group);
    const hit = ray.intersectObjects(cand, true)[0];
    if (!hit) return null;
    for (const d of doors) if (hit.object === d.shell) return { type: 'door', b: d };
    return { type: thawI >= 0 ? 'object' : cb === me ? 'me' : 'block', b: cb };
  }
  const right = new THREE.Vector3(), upv = new THREE.Vector3(), qd = new THREE.Quaternion(), qIdle = new THREE.Quaternion();
  function turn(b, dx, dy) {
    right.setFromMatrixColumn(camera.matrixWorld, 0); upv.setFromMatrixColumn(camera.matrixWorld, 1);
    qd.setFromAxisAngle(upv, dx * 0.009); b.spin.quaternion.premultiply(qd);
    qd.setFromAxisAngle(right, dy * 0.009); b.spin.quaternion.premultiply(qd);
    angVel.set(dy * 0.009, dx * 0.009, 0);
  }
  const L = {
    wheel(e) {
      if (overlayOpen() || e.ctrlKey) return;
      if (e.target.closest?.('.ice-panel, #talk, #guide, #world-panel')) return;
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
      wheelAcc += d * unit;
      const now = performance.now();
      if (!wheelLock && Math.abs(wheelAcc) > 40) { go(sT + Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = true; lockStart = now; }
      else if (wheelLock && now - lockStart > 700 && Math.abs(wheelAcc) > 120) { go(sT + Math.sign(wheelAcc)); wheelAcc = 0; lockStart = now; }
      clearTimeout(unlockT); unlockT = setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 180);
    },
    down(e) {
      if (e.button !== 0 || isUI(e.target) || overlayOpen()) return;
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0, axis: null, touch: e.pointerType !== 'mouse', t: performance.now() };
    },
    move(e) {
      if (!drag) { if (e.pointerType === 'mouse' && !isUI(e.target)) hover = pick(e.clientX, e.clientY); else hover = null; return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.touch && !drag.axis && drag.moved > 10) drag.axis = Math.abs(e.clientX - drag.x0) > Math.abs(e.clientY - drag.y0) ? 'x' : 'y';
      if (drag.moved > 6 && (!drag.touch || drag.axis === 'x')) {
        const b = thawI >= 0 ? blocks[thawI] : curBlock();
        if (b) { turn(b, dx, drag.touch ? 0 : dy); lastDrag = performance.now(); }
      }
    },
    up(e) {
      if (!drag) return;
      const d = drag; drag = null;
      const tx = e.clientX - d.x0, ty = e.clientY - d.y0;
      if (d.touch && d.axis === 'y' && Math.abs(ty) > 36) { go(sT + (ty < 0 ? 1 : -1)); return; }
      if (d.moved > 8) return;
      const h = pick(e.clientX, e.clientY);
      if (h?.type === 'door') { travel(h.b.world, e.clientX, e.clientY); return; }
      if (h?.type === 'block') { const c = curIndex(); if (c >= 0) thaw(c); return; }
      if (h?.type === 'me') { achieve('hello'); audio.chime(12); return; }
      if (thawI >= 0 && !h) refreeze();
      else if (s < 0.5) go(1);
    },
    key(e) {
      if (overlayOpen() || e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === 'Escape') { if (thawI >= 0) { refreeze(); } return; }
      if (k === 'Enter' && !e.target.closest('button, a')) { const c = curIndex(); if (c >= 0 && thawI < 0) { e.preventDefault(); thaw(c); } return; }
      if (thawI >= 0 && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); stepThaw(k === 'ArrowRight' ? 1 : -1); return; }
      const fwd = ['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k), back = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k);
      if (k === ' ' && e.target.closest('button, a')) return;
      if (fwd || back) { e.preventDefault(); go(sT + (fwd ? 1 : -1)); }
      else if (k === 'Home') go(0); else if (k === 'End') go(LAST);
    },
    cancel() { drag = null; },
  };
  const attach = (on) => {
    const f = on ? addEventListener : removeEventListener;
    f('wheel', L.wheel, { passive: false }); f('pointerdown', L.down); f('pointermove', L.move); f('pointerup', L.up); f('pointercancel', L.cancel); f('keydown', L.key);
  };

  // ---------- camera ----------
  let F = { mobile: innerWidth / innerHeight < 0.9 || innerWidth < 560 };
  let rt = null, dpr = renderer.getPixelRatio();
  const P = new THREE.Vector3(), Lk = new THREE.Vector3(), P2 = new THREE.Vector3(), L2 = new THREE.Vector3(), tmp = new THREE.Vector3();
  function archiveCam(f, thawK, P, Lk) {
    const x = clamp(f, 0, N) * GAP, fr = f - Math.floor(f), m = Math.sin(Math.PI * fr);
    const fin = ease(f - (N - 1));
    if (F.mobile) {
      P.set(x, 2.2 + m * 0.3 + fin * 0.4, 8.2 + m * 1.6 + fin * 2.4 - thawK * 2.0);
      Lk.set(x, 0.85 + fin * 0.2 - thawK * 0.35, 0);
    } else {
      P.set(x + 0.15, 1.85 + m * 0.35 + fin * 0.35, 6.2 + m * 1.5 + fin * 1.9 - thawK * 1.55);
      Lk.set(x - 0.9 + fin * 0.3 + thawK * 0.1, 1.5 + fin * 0.2, 0);
    }
  }
  function vaultCam(P, Lk) {
    if (F.mobile) { P.set(VAULT.x, 3.6, 21); Lk.set(VAULT.x, -0.6, 0); }
    else { P.set(VAULT.x + 1.4, 2.8, 16.5); Lk.set(VAULT.x - 4.1, 1.9, 0); }
  }

  const bracketV = new THREE.Vector3();
  if (/[?&]debug/.test(location.search)) window.__ice = { blocks, camera, pick: (x, y) => pick(x, y), get s() { return s; }, get sT() { return sT; } };
  function project(v) { v.project(camera); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight, v.z]; }

  return {
    id: 'ice', ui: 'own', camera,
    precompile() { try { renderer.compileAsync?.(scene, camera).catch(() => {}); } catch {} },
    post: { conv: 1, grain: 0.018, vig: 0.2, ab: 0.0008, light: 1, tilt: 0, exposure: -1.0 },
    enter() {
      if (on) return; on = true;
      ui.classList.add('on'); ui.setAttribute('aria-hidden', 'false');
      attach(true);
    },
    exit() {
      if (!on) return; on = false;
      ui.classList.remove('on'); ui.setAttribute('aria-hidden', 'true');
      attach(false); drag = null; hover = null;
      refreeze(true);
    },
    caption() { const c = curIndex(); return c >= 0 ? `Specimen ${String(c + 1).padStart(2, '0')} · ${SPECIMENS[c].title}` : s > N + 0.5 ? 'The person' : 'The vault'; },
    cursor() {
      if (drag && drag.moved > 6) return 'Turn';
      if (hover?.type === 'door') return `Enter ${hover.b.world === 'night' ? 'Night' : 'the Desk'}`;
      if (hover?.type === 'block') return 'Drag · Thaw';
      if (hover?.type === 'object') return 'Turn';
      if (hover?.type === 'me') return 'Hello';
      if (s < 0.5) return 'Scroll';
      return '';
    },
    dragging: () => !!drag && drag.moved > 6,
    resize(w, h, pr) {
      dpr = pr;
      F = { mobile: w / h < 0.9 || w < 560 };
      placeDoors();
      camera.aspect = w / h; camera.fov = F.mobile ? 40 : 30; camera.updateProjectionMatrix();
      rt?.dispose();
      rt = new THREE.WebGLRenderTarget(Math.round(w * pr), Math.round(h * pr), { samples: tier >= 2 ? 4 : 2, type: THREE.HalfFloatType });
      flakeU.uPR.value = pr;
    },
    quality(level) { if (level >= 2 && transScale > 0.45) { transScale = 0.45; blocks.forEach((b) => { if (b.mat.dispersion) { b.mat.dispersion = 0; b.mat.needsUpdate = true; } }); } },
    update(c) {
      const { dt, time, mouse, current } = c;
      // motion along the archive
      const k = Math.abs(sT - s) > 1.5 ? 3.4 : s < 1 || sT < 1 ? 1.5 : 2.7;
      const prevS = s;
      s += (sT - s) * (1 - Math.exp(-dt * k));
      if (Math.abs(sT - s) < 0.0005) s = sT;
      vel = (s - prevS) / Math.max(dt, 1e-3);
      if (!cracked && s > 0.04) { cracked = true; audio.crack(); }
      thawA += ((thawI >= 0 ? 1 : 0) - thawA) * (1 - Math.exp(-dt * (thawI >= 0 ? 1.6 : 3.2)));
      const ci = curIndex();

      // camera: the vault shot blends into the archive dolly
      archiveCam(Math.max(0, s - 1), thawA, P, Lk);
      if (s < 1) {
        vaultCam(P2, L2);
        const e = ease3(s);
        P.lerpVectors(P2, P, e).add(tmp.set(0, Math.sin(Math.PI * e) * 1.6, Math.sin(Math.PI * e) * 2.5));
        Lk.lerpVectors(L2, Lk, e);
      }
      const mx = c.mouseActive ? mouse.x : 0, my = c.mouseActive ? mouse.y : 0;
      P.x += mx * 0.22; P.y += my * 0.14;
      if (!reduced) { P.y += Math.sin(time * 0.4) * 0.03; }
      camera.position.copy(P);
      const roll = reduced ? 0 : clamp(-vel * 0.012, -0.05, 0.05);
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      camera.lookAt(Lk);
      camera.updateMatrixWorld();

      // blocks: from the vault to the archive line
      let bi = 0;
      const blobs = groundU.uBlobs.value;
      const all = [...blocks];
      for (const b of all) {
        const isDoor = !!b.world;
        let vis;
        if (isDoor) vis = s > LAST - 1.2;
        else vis = s < 1.05 || Math.abs(b.i + 1 - s) < 2.4;
        b.root.visible = vis;
        if (!vis) continue;
        const local = isDoor ? 1 : clamp((s - (b.vaultK ?? 0) * 0.033) / (1 - 11 * 0.033), 0, 1);
        const e = ease3(local);
        if (isDoor) {
          const k2 = ease((s - (LAST - 1)) / 1.0);
          b.root.position.copy(b.home).add(tmp.set(0, -1.6 * (1 - k2) + Math.sin(time * 1.3 + b.seed) * 0.05, 0));
          b.root.scale.setScalar(b.scale * (0.2 + 0.8 * k2));
        } else {
          b.root.position.lerpVectors(b.vault, b.home, e);
          const arc = Math.sin(Math.PI * e);
          b.root.position.y += arc * (1.4 + (b.vaultK % 3) * 0.5) + (e > 0.99 ? Math.sin(time * 0.8 + b.seed) * 0.05 : 0);
          b.root.position.z += arc * ((b.vaultK % 2) ? 1.6 : -1.2);
          const sc = (b.vaultScale ?? 1) + (1 - (b.vaultScale ?? 1)) * e;
          b.root.scale.setScalar(b.scale * sc);
          b.root.rotation.set(0, 0, 0);
          if (e < 1 && e > 0) b.root.rotateOnAxis(b.axis, arc * 2.2);
        }
        const isCur = b === curBlock();
        // spin: inertia after a drag, then a slow idle turn; the thawed object faces you
        if (!(drag && isCur)) {
          if (b.still && performance.now() - lastDrag > 1600) {
            b.spin.quaternion.slerp(qIdle.setFromAxisAngle(tmp.set(0, 1, 0), Math.sin(time * 0.35) * 0.3), Math.min(1, dt * 1.5));
          } else if (performance.now() - lastDrag > 1600 || !isCur) {
            const idle = (isCur ? 0.16 : 0.08) * (reduced ? 0.3 : 1) * (s < 0.9 && !isDoor ? 0 : 1);
            qd.setFromAxisAngle(tmp.set(0, 1, 0), dt * idle); b.spin.quaternion.premultiply(qd);
          } else if (isCur) {
            angVel.multiplyScalar(Math.exp(-dt * 3));
            right.setFromMatrixColumn(camera.matrixWorld, 0);
            qd.setFromAxisAngle(tmp.set(0, 1, 0), angVel.y); b.spin.quaternion.premultiply(qd);
            qd.setFromAxisAngle(right, angVel.x); b.spin.quaternion.premultiply(qd);
          }
        }
        // melt and glow
        const target = b.i === thawI ? 1 : 0;
        b.melt += (target - b.melt) * (1 - Math.exp(-dt * (target ? 1.1 : 2.6)));
        if (b.melt < 0.002) b.melt = 0;
        b.mat.userData.U.uMelt.value = b.melt;
        const hov = hover && hover.b === b ? 1 : 0;
        b.glow += ((hov ? 1 : 0) + (isCur && !b.melt ? 0.25 + 0.15 * Math.sin(time * 2) : 0) - b.glow) * Math.min(1, dt * 6);
        b.mat.userData.U.uGlow.value = b.glow;
        b.shell.visible = b.melt < 0.995;
        if (b.lab) b.lab.material.opacity = 0.85 * (1 - Math.min(1, b.melt * 3)) * (e > 0.9 ? 1 : 0.4);
        const os = 1 + b.melt * 0.42;
        b.objScale += (os - b.objScale) * Math.min(1, dt * 4);
        b.obj.group.scale.setScalar((b.obj.group.userData.s0 ??= b.obj.group.scale.x) * b.objScale);
        b.obj.tick(time, dt, b.melt);
        if (bi < MAXB) blobs[bi++].set(b.root.position.x, b.root.position.y - SIZE / 2 * b.root.scale.x, b.root.position.z, (0.55 - Math.min(0.4, (b.root.position.y - SIZE / 2) * 0.22)) * b.root.scale.x);
      }
      for (let i = bi; i < MAXB; i++) blobs[i].w = 0;

      // shards
      let any = false;
      for (let i = 0; i < SH; i++) {
        const q = sp[i];
        if (q.life <= 0) continue;
        any = true;
        q.life -= dt; q.v.y -= 6.5 * dt; q.p.addScaledVector(q.v, dt);
        if (q.p.y < 0.05) { q.p.y = 0.05; q.v.y *= -0.3; q.v.x *= 0.6; q.v.z *= 0.6; }
        q.r.x += q.w.x * dt; q.r.y += q.w.y * dt;
        dm.position.copy(q.p); dm.rotation.copy(q.r); dm.scale.setScalar(q.s * clamp(q.life / 0.6, 0, 1));
        if (q.life <= 0) dm.position.y = -50;
        dm.updateMatrix(); shards.setMatrixAt(i, dm.matrix);
      }
      if (any) shards.instanceMatrix.needsUpdate = true;

      // world
      groundU.uTime.value = time; groundU.uCam.value.copy(camera.position);
      flakeU.uTime.value = time; flakeU.uCam.value.copy(camera.position); flakeU.uWind.value = clamp(vel * 0.08, -0.5, 0.5);
      sky.position.copy(camera.position);
      ridges.forEach((r) => (r.position.x = camera.position.x * (1 - r.userData.par * 0.35)));

      if (!current || !on) return;
      // interface
      const intro = clamp(1 - s * 2.2, 0, 1);
      ui.style.setProperty('--intro', intro.toFixed(3));
      ui.classList.toggle('at-intro', intro > 0.02);
      const k0 = Math.round(s);
      setSpec(k0 >= 1 && k0 <= N ? k0 : k0 > N ? LAST : 0);
      const specO = k0 >= 1 && k0 <= N ? clamp(1 - Math.abs(s - k0) * 3.2, 0, 1) : 0;
      ui.style.setProperty('--spec', specO.toFixed(3));
      specEl.style.visibility = specO < 0.01 ? 'hidden' : '';
      const fin = clamp((s - (LAST - 0.6)) / 0.6, 0, 1);
      ui.style.setProperty('--final', fin.toFixed(3));
      ui.classList.toggle('at-final', fin > 0.02);
      if (fin > 0.9) { guide?.event('ice-end'); }
      if (fin > 0.2 && !warmed) { warmed = true; env.warm?.('night'); env.warm?.('desk'); }
      // temperature readout
      const tTarget = thawI >= 0 ? 4.0 : -18.2 + Math.sin(time * 0.7) * 0.3;
      temp += (tTarget - temp) * Math.min(1, dt * 1.4);
      tempEl.textContent = `${temp < 0 ? '−' : '+'}${Math.abs(temp).toFixed(1)}°C`;
      // brackets around the current block
      const cb = ci >= 0 ? blocks[ci] : null;
      const bo = cb && thawI < 0 ? clamp(1 - Math.abs(s - (ci + 1)) * 5, 0, 1) : 0;
      brackets.style.opacity = bo.toFixed(3);
      if (bo > 0.01) {
        const [x, y] = project(bracketV.copy(cb.root.position));
        right.setFromMatrixColumn(camera.matrixWorld, 0);
        const [x2] = project(bracketV.copy(cb.root.position).addScaledVector(right, SIZE * 0.64));
        const r = Math.abs(x2 - x);
        brackets.style.transform = `translate(${(x - r).toFixed(1)}px, ${(y - r).toFixed(1)}px)`;
        brackets.style.width = brackets.style.height = `${(r * 2).toFixed(1)}px`;
        bA.textContent = `SPECIMEN ${String(ci + 1).padStart(2, '0')}`;
        bB.textContent = `X ${cb.root.position.x.toFixed(2)}  Y ${cb.root.position.y.toFixed(2)}`;
      }
      // door labels
      doorEls.forEach((el, i) => {
        const d = doors[i];
        const o = fin * (d.root.visible ? 1 : 0);
        el.style.opacity = o.toFixed(3); el.style.pointerEvents = o > 0.5 ? 'auto' : 'none'; el.tabIndex = o > 0.5 ? 0 : -1;
        if (o > 0.01) { const [x, y] = project(bracketV.copy(d.root.position).add(tmp.set(0, -0.5, 0))); el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`; }
      });
    },
    render() {
      renderer.transmissionResolutionScale = transScale;
      renderer.setRenderTarget(rt); renderer.setClearColor(FOG, 1); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      return rt.texture;
    },
  };
}
