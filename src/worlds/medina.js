import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import '@fontsource/reem-kufi/arabic-700.css';
import '@fontsource/reem-kufi/latin-500.css';
import '@fontsource/reem-kufi/latin-700.css';
import '@fontsource/amiri/arabic-700.css';
import '@fontsource/amiri/latin-400.css';
import '@fontsource/amiri/latin-700.css';
import './medina.css';
import { buildMedina, SKILLS, STREAMS, CERT_PLAQUES } from './medina-city.js';
import { pigeonGeo } from './medina-build.js';

// The Medina. A walk through an old Algerian town at golden hour, from the city gate to a rooftop over the sea.
// Every place on the way is a chapter; doors open, lanterns light, water runs. The sun goes down as you walk.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const EMAIL = 'abdelkrimghebouli.34@gmail.com';
const tpl = (ids) => (ids || []).map((id) => document.getElementById(id)?.innerHTML || '').join('<hr>');

const STOPS = [
  { ar: 'مرحبا', en: 'Welcome to the medina', body: 'I’m Abdelkrim Ghebouli, an SAP BPC consultant from Bordj Bou Arreridj. Walk with me: every street, door and lantern here is part of my story.', hint: 'Scroll to walk · drag to look around' },
  { ar: 'الباب الأول', en: 'The first door', body: '2021. My first internship, at the Transite Baghoura customs office. Knock on the blue door.' },
  { ar: 'الجامعة', en: 'The university', body: 'A bachelor in information systems in 2024, a master 1 in business intelligence in 2025. The plaques in the gallery hold my SAP certifications.' },
  { ar: 'سوق المهارات', en: 'The souk of skills', body: 'Every lantern is a tool I work with. Light them one by one.' },
  { ar: 'الحرفيون', en: 'The craftsmen’s street', body: 'Three shops, three things I built: Olive Palace, LatinaDZ, and a system for a jewelry store.' },
  { ar: 'الورشة', en: 'The workshop', body: 'Since October 2024 I’ve led a remote team of four to six developers, and written the backends myself.' },
  { ar: 'المتجر', en: 'Géant Electronics', body: '2025, data analyst and ERP support. Network delays corrupted the stock of nearly every article, and production stopped. Come and repair it.' },
  { ar: 'الرياض', en: 'The riad', body: 'Today: SAP BPC consultant at CNPC, on Sonatrach’s SHONE project. Six streams of work flow into one consolidated view. Open each source.' },
  { ar: 'السطح', en: 'The rooftop', body: 'The sun sets on this walk, over the old town and the sea. I’m open to SAP consultant roles internationally. Send a pigeon, look at the stars, or step into the room with the light on.' },
];
const DETAILS = {
  customs: { ar: 'الجمارك', en: 'Customs office', html: '<p class="tag">Internship · 2021</p><h3>The first door</h3><p>My first internship, at the Transite Baghoura customs office in 2021. The oldest chapter of the walk, and the first time I worked inside a real organisation.</p><dl class="readout"><div><dt>Role</dt><dd>Intern</dd></div><div><dt>Where</dt><dd>Transite Baghoura customs office</dd></div></dl>' },
  cat: { ar: 'قط', en: 'A local', html: '<p>Every medina has one. This one sleeps on the customs office step and lets visitors pass.</p>' },
  degrees: { ar: 'الشهادات', en: 'Degrees and training', html: '<p class="tag">Mohamed El Bachir El Ibrahimi University</p><h3>The degrees</h3><dl class="readout"><div><dt>2024</dt><dd>Bachelor · Information Systems &amp; Software Engineering</dd></div><div><dt>2025</dt><dd>Master 1 · Business Intelligence</dd></div><div><dt>2025</dt><dd>SAP Young Professionals Program, March to May</dd></div><div><dt>Also</dt><dd>Dale Carnegie Training, certified</dd></div></dl>' },
  team: { ar: 'الفريق', en: 'The workshop', tpl: ['d-team', 'd-layer-logic', 'd-layer-data', 'd-layer-ui'] },
  olive: { ar: 'زيت الزيتون', en: 'Olive Palace', tpl: ['d-olive'], shot: 'd-olive' },
  latina: { ar: 'بوتيك', en: 'LatinaDZ', tpl: ['d-latina'], shot: 'd-latina' },
  jewel: { ar: 'مجوهرات', en: 'Jewelry Store', tpl: ['d-jewelry'], shot: 'd-jewelry' },
  geant: { ar: 'المخزون', en: 'The stock incident', tpl: ['d-geant', 'd-raw', 'd-raw-mismatch', 'd-raw-blocked'], fixed: ['d-clean-method', 'd-clean-tool', 'd-m-dash', 'd-m-flask', 'd-m-users', 'd-m-launch'] },
  basin: { ar: 'الحوض', en: 'One consolidated view', tpl: ['d-shone'] },
  contact: { ar: 'اتصل بي', en: 'Let’s talk', html: `<p>The pigeon is on its way. If you prefer email, it’s faster:</p><p class="md-mail">${EMAIL}</p><p>I’m open to SAP consultant roles internationally: BPC, BW, S/4HANA, analytics.</p>` },
};

export async function createMedina(env) {
  const { renderer, small, coarse, reduced, tier, meURL, shotFor, achieve, audio, guide, isUI, overlayOpen, travel } = env;
  try { await Promise.race([Promise.all([document.fonts.load('700 40px "Reem Kufi"'), document.fonts.load('700 40px "Amiri"'), document.fonts.load('700 40px "Reem Kufi"', 'مرحبا')]), new Promise((r) => setTimeout(r, 2000))]); } catch {}
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2500);
  const C = buildMedina({ tier, small });
  scene.add(C.root);

  // ---------- sky, sun, sea ----------
  const sunDir = new THREE.Vector3();
  const skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: sunDir }, uGlow: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uTop, uHor, uSun, uSunDir; uniform float uGlow; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(uHor, uTop, smoothstep(-0.02, 0.45, h));
        c = mix(c, uHor*0.55, smoothstep(0.0, -0.25, h));
        float s = max(0.0, dot(d, uSunDir));
        c += uSun*(pow(s, 900.0)*40.0 + pow(s, 64.0)*0.6*uGlow + pow(s, 6.0)*0.25*uGlow);
        c += uHor*0.25*exp(-abs(h)*12.0);
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  sky.frustumCulled = false; scene.add(sky);
  const seaU = { uTime: { value: 0 }, uSunDir: { value: sunDir }, uSun: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() } };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: seaU, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uTime; uniform vec3 uSunDir, uSun, uHor, uTop, uCam; varying vec3 vW;
      float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 p = vW.xz;
        vec2 e = vec2(vn(p*0.08 + uTime*0.15) - vn(p*0.08 + vec2(3.1) - uTime*0.12), vn(p*0.31 - uTime*0.4) - vn(p*0.29 + vec2(7.3) + uTime*0.35));
        vec3 n = normalize(vec3(e.x*0.25 + e.y*0.12, 1.0, e.y*0.25 - e.x*0.1));
        vec3 v = normalize(uCam - vW);
        float fr = pow(1.0 - max(dot(n, v), 0.0), 5.0)*0.9 + 0.06;
        vec3 r = reflect(-v, n);
        vec3 skyc = mix(uHor, uTop, smoothstep(0.0, 0.5, r.y));
        vec3 deep = vec3(0.02, 0.06, 0.1);
        vec3 c = mix(deep, skyc, fr);
        float sp = pow(max(dot(r, uSunDir), 0.0), 240.0)*30.0 + pow(max(dot(r, uSunDir), 0.0), 24.0)*0.8;
        c += uSun*sp;
        float dist = length(vW - uCam);
        c = mix(c, uHor*0.95, smoothstep(300.0, 2400.0, dist));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  sea.position.set(0, -27.5, 0); scene.add(sea);
  // the far shore across the bay
  const ridgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(), fog: false });
  { const s = new THREE.Shape(); s.moveTo(-1600, -30); for (let x = -1600; x <= 1600; x += 20) s.lineTo(x, -27 + Math.max(0, 70 * (0.5 + 0.3 * Math.sin(x * 0.004) + 0.2 * Math.sin(x * 0.013 + 1))) * smoothEdge(x)); s.lineTo(1600, -30);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), ridgeMat); m.position.set(-58 - 0.5 * 1500, 0, -92 - 0.866 * 1500); m.rotation.y = Math.PI / 6; scene.add(m); }
  function smoothEdge(x) { return clamp(1 - Math.abs(x + 300) / 1300, 0, 1); }

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = tier > 0 || !small;
  const SMS = tier >= 2 ? 2048 : tier === 1 ? 1536 : 1024;
  sun.shadow.mapSize.set(SMS, SMS);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 220 });
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1); scene.add(hemi);
  scene.fog = new THREE.Fog(0xffffff, 60, 520);
  // environment for brass, tiles and glass: rendered from the sky once
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); const envSky = sky.clone(); envScene.add(envSky);
  function bakeEnv() { const t = pm.fromScene(envScene, 0.02); scene.environment?.dispose?.(); scene.environment = t.texture; }

  // ---------- water: channels, basins, a fountain ----------
  const waterU = { uTime: { value: 0 }, uTop: skyU.uTop, uHor: skyU.uHor, uSun: skyU.uSun, uSunDir: { value: sunDir } };
  const waterMat = (flow) => new THREE.ShaderMaterial({
    uniforms: { ...waterU, uOpen: { value: flow ? 0 : 1 }, uFlow: { value: flow ? 1 : 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uTime, uOpen, uFlow; uniform vec3 uTop, uHor, uSun, uSunDir; varying vec2 vUv; varying vec3 vW;
      float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 q = uFlow > 0.5 ? vec2(vUv.x*4.0 - uTime*1.6, vUv.y*1.5) : vW.xz*3.0 + vec2(uTime*0.3, -uTime*0.2);
        float n = vn(q*2.0)*0.6 + vn(q*5.0 + 3.0)*0.4;
        vec3 v = normalize(cameraPosition - vW);
        vec3 c = mix(vec3(0.05, 0.22, 0.26), mix(uHor, uTop, 0.4), 0.35 + 0.35*n);
        c += uSun*pow(n, 6.0)*0.8;
        float front = uFlow > 0.5 ? smoothstep(uOpen*1.08 - 0.08, uOpen*1.08, 1.0 - vUv.x) : 1.0;
        float a = (0.55 + 0.25*n)*front*(uFlow > 0.5 ? smoothstep(0.0, 0.05, uOpen) : 1.0);
        gl_FragColor = vec4(c, a);
      }`,
  });
  const I = C.inter;
  I.streams.forEach((s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 0.3).rotateX(-Math.PI / 2), waterMat(true));
    m.position.set(s.mid.x, 0.13, s.mid.z); m.rotation.y = -s.a; m.renderOrder = 4; scene.add(m); s.mesh = m;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16).rotateX(-Math.PI / 2), waterMat(false)); pool.position.set(s.src.x, 0.3, s.src.z); scene.add(pool);
  });
  const basinW = new THREE.Mesh(new THREE.CircleGeometry(I.fountain.r, 24).rotateX(-Math.PI / 2), waterMat(false));
  basinW.position.copy(I.fountain.basin); scene.add(basinW);
  const JET = 260, jp = new Float32Array(JET * 3), js = new Float32Array(JET);
  for (let i = 0; i < JET; i++) js[i] = Math.random();
  const jetG = new THREE.BufferGeometry(); jetG.setAttribute('position', new THREE.BufferAttribute(jp, 3)); jetG.setAttribute('aS', new THREE.BufferAttribute(js, 1));
  const jetU = { uTime: { value: 0 }, uH: { value: 0.4 }, uPR: { value: 1 }, uSun: skyU.uSun };
  const jet = new THREE.Points(jetG, new THREE.ShaderMaterial({
    uniforms: jetU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uH, uPR; attribute float aS; varying float vA;
      void main(){
        float t = fract(uTime*0.55 + aS); float a = aS*6.2831; float r = 0.05 + aS*0.22;
        float up = 2.4*uH; vec3 p = vec3(cos(a)*r*t*2.2, up*t*2.0 - up*t*t*2.0 + t*0.05, sin(a)*r*t*2.2);
        vec4 mv = modelViewMatrix*vec4(position + p, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = (2.0 + aS*2.5)*uPR*(6.0/-mv.z); vA = (1.0 - t)*0.9;
      }`,
    fragmentShader: 'uniform vec3 uSun; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(mix(vec3(0.7, 0.85, 0.95), uSun, 0.3)*smoothstep(0.5, 0.0, d)*vA, 1.0); }',
  }));
  jet.position.copy(I.fountain.pos); jet.frustumCulled = false; scene.add(jet);

  // ---------- life: pigeons and a cat ----------
  const PG = 26;
  const birdG = pigeonGeo();
  const birdU = { uTime: { value: 0 } };
  const birdM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
  // aFlap: 0 perched (wings folded), 0.5 gliding (open), 1 flapping
  birdM.onBeforeCompile = (sh) => { sh.uniforms.uTime = birdU.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wing; attribute float aFlap; uniform float uTime;').replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat wOpen = min(1.0, aFlap*2.0), wFlap = max(0.0, aFlap*2.0 - 1.0);\ntransformed.x *= mix(1.0, mix(0.14, 1.0, wOpen), wing);\ntransformed.y += wing*abs(position.x)*(sin(uTime*21.0 + float(gl_InstanceID)*1.7)*0.75*wFlap - 0.05*wOpen);'); };
  const birds = new THREE.InstancedMesh(birdG, birdM, PG);
  const flapA = new THREE.InstancedBufferAttribute(new Float32Array(PG), 1); birdG.setAttribute('aFlap', flapA);
  const B = Array.from({ length: PG }, (_, i) => ({ p: new THREE.Vector3((Math.random() - 0.5) * 7, 0.02, 5 + Math.random() * 6), v: new THREE.Vector3(), mode: 0, t: Math.random() * 10, home: null, ph: i * 0.41 + Math.random() * 0.3, yaw: Math.random() * 6 }));
  B.forEach((b) => { b.start = b.p.clone(); });
  birds.castShadow = true; birds.frustumCulled = false; scene.add(birds);
  let scatter = 0, birdsRoof = false;
  function scatterBirds(from) { if (scatter > 0) return; scatter = 1; B.forEach((b, i) => { b.mode = 1; b.t = 0; b.wait = 2.5; b.v.set(b.p.x - from.x, 0, b.p.z - from.z).normalize().multiplyScalar(2 + Math.random() * 2).add(new THREE.Vector3(0, 4 + Math.random() * 3, 0)); const m = i % 16, mx = -44.2 + 1.7 * (m < 8 ? 15 + m : 22 + m); b.home = b.gateHome = new THREE.Vector3(mx + (i >= 16 ? 0.22 : -0.12), 8.5, 0.35 + (Math.random() - 0.5) * 0.3); }); audio.whoosh?.(); }
  // by dusk the same pigeons are on the rooftop: a few rest on the lip, the rest circle over the lower town
  function placeBirds(roof) {
    B.forEach((b, i) => {
      if (roof) { if (i < I.perch.length) { b.mode = 2; b.home = I.perch[i]; b.p.copy(b.home); b.yaw = 1.6 + Math.random() * 1.6; } else b.mode = 3; }
      else if (scatter) { b.mode = 2; b.home = b.gateHome; b.p.copy(b.home); b.yaw = Math.random() * 6; }
      else { b.mode = 0; b.p.copy(b.start); }
    });
  }
  const TD = I.terrain.D;
  function sendPigeon() {
    if (!birdsRoof) return;
    B.forEach((b, i) => { if (i < I.perch.length && b.mode === 2) { b.mode = 1; b.t = 0; b.wait = 3.2 + i * 0.35; b.home = I.perch[i]; b.v.set(TD.x * 5 + (Math.random() - 0.5) * 2.5, 2.5 + Math.random() * 2, TD.z * 5 + (Math.random() - 0.5) * 2.5); } });
    audio.whoosh?.(); achieve('pigeon');
  }
  // the cat
  const cat = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xc98a4a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), fur); body.scale.set(1.5, 0.8, 1); body.position.y = 0.14; cat.add(body);
  const head = new THREE.Group(); head.position.set(0.25, 0.2, 0.02); cat.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), fur));
  [-1, 1].forEach((k) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 6), fur); e.position.set(0.0, 0.09, k * 0.05); head.add(e); });
  const tailC = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.25, 0.08, 0), new THREE.Vector3(-0.4, 0.04, 0.12), new THREE.Vector3(-0.3, 0.03, 0.28)]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailC, 12, 0.025, 6), fur); cat.add(tail);
  cat.position.copy(I.cat.pos); cat.rotation.y = Math.PI / 2 + 0.4; cat.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(cat);
  let petted = 0;

  // dust hanging in the light of the souk
  const DN = small ? 160 : 360, dP = new Float32Array(DN * 3), dS = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dP[i * 3] = -8.2 - Math.random() * 26.5; dP[i * 3 + 1] = 0.4 + Math.random() * 3.9; dP[i * 3 + 2] = -38.4 + Math.random() * 3.8; dS[i] = Math.random(); }
  const dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(dP, 3)); dustG.setAttribute('aS', new THREE.BufferAttribute(dS, 1));
  const dustU = { uTime: { value: 0 }, uPR: jetU.uPR, uC: skyU.uSun };
  const dust = new THREE.Points(dustG, new THREE.ShaderMaterial({
    uniforms: dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uPR; attribute float aS; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime*0.3 + aS*40.0)*0.25; p.x += sin(uTime*0.17 + aS*17.0)*0.5; p.z += cos(uTime*0.23 + aS*23.0)*0.2;
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = (1.2 + aS*2.2)*uPR*(5.0/-mv.z); vA = 0.55 + 0.45*sin(uTime*1.1 + aS*60.0); }`,
    fragmentShader: 'uniform vec3 uC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uC*smoothstep(0.5, 0.0, d)*vA*0.45, 1.0); }',
  }));
  dust.frustumCulled = false; C.zones[3].add(dust);

  // ---------- light pools, lanterns ----------
  const lit = new Array(SKILLS.length).fill(0), litT = new Array(SKILLS.length).fill(0);
  const coreC = new THREE.Color(), lanternBase = I.lanterns.map((l) => new THREE.Color(l.color));
  const poolCol = new THREE.Color();
  if (!C.inter.pools.instanceColor) C.inter.pools.setColorAt(0, poolCol.setRGB(1, 1, 1));
  // a soft halo around every lantern; lighting one makes it bloom
  const LN = I.lanterns.length, hP = new Float32Array(LN * 3), hC = new Float32Array(LN * 3), hS = new Float32Array(LN);
  I.lanterns.forEach((l, i) => { const k = l.wall ? 0.8 : 1; hP.set([l.p.x, l.p.y + 0.24 * k, l.p.z], i * 3); hS[i] = l.skill != null ? 1.5 : 1.0; });
  const haloG = new THREE.BufferGeometry(); haloG.setAttribute('position', new THREE.BufferAttribute(hP, 3)); haloG.setAttribute('aC', new THREE.BufferAttribute(hC, 3)); haloG.setAttribute('aS', new THREE.BufferAttribute(hS, 1));
  const haloU = { uH: { value: 600 } };
  const halo = new THREE.Points(haloG, new THREE.ShaderMaterial({
    uniforms: haloU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'uniform float uH; attribute vec3 aC; attribute float aS; varying vec3 vC; void main(){ vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*mv; gl_PointSize = aS*uH*projectionMatrix[1][1]*0.5/max(0.5, -mv.z); vC = aC; }',
    fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5)*2.0; float a = max(0.0, exp(-d*d*4.5) - 0.012); gl_FragColor = vec4(vC*a, 1.0); }',
  }));
  halo.frustumCulled = false; halo.renderOrder = 6; scene.add(halo);

  // ---------- bloom ----------
  const rt0 = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: tier >= 2 ? 4 : tier === 1 ? 2 : 0 });
  const composer = new EffectComposer(renderer, rt0);
  composer.renderToScreen = false;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 1.0);
  bloom.enabled = tier > 0;
  composer.addPass(bloom);

  // ---------- the walk ----------
  const V = (a) => new THREE.Vector3(...a);
  const PATH = [
    [0, [0, 1.75, 17.5], [0, 4.4, 0]],
    [0.5, [0, 1.7, 5.5], [0, 2.3, -8]],
    [1, [-0.7, 1.65, -7.2], [2.0, 1.95, -14.2]],
    [1.5, [0.4, 1.7, -20.5], [0.4, 2.0, -30]],
    [1.8, [0.4, 1.7, -27.6], [1.6, 2.0, -36]],
    [2, [3.3, 1.7, -31.5], [-2.8, 2.0, -39.6]],
    [2.5, [-3.9, 1.7, -36.5], [-14, 2.4, -36.5]],
    [3, [-8.3, 1.62, -36.6], [-22, 2.55, -36.4]],
    [3.5, [-28, 1.7, -36.5], [-40, 2.1, -36.5]],
    [4, [-36.6, 1.75, -37.7], [-46.5, 1.7, -35.6]],
    [4.5, [-50.2, 1.7, -36.6], [-58, 1.8, -40.5]],
    [5, [-55.0, 1.75, -38.3], [-62.9, 1.9, -40.6]],
    [5.5, [-58.0, 1.72, -46.5], [-58, 2.0, -56]],
    [6, [-61.5, 1.72, -55.4], [-53.8, 2.4, -57.0]],
    [6.5, [-58, 1.75, -63.5], [-58, 2.0, -74]],
    [7, [-58, 2.0, -69.6], [-58, 0.7, -77.5]],
    [7.5, [-58.8, 10.7, -83.8], [-70, 8.2, -110]],
    [8, [-65.0, 11.5, -91.3], [-86.2, 3.0, -125.2]],
  ];
  let F = { mobile: innerWidth / innerHeight < 0.9 || innerWidth < 560 };
  const pathPos = new THREE.CatmullRomCurve3(PATH.map((p) => V(p[1])), false, 'centripetal');
  const pathLook = new THREE.CatmullRomCurve3(PATH.map((p) => V(p[2])), false, 'centripetal');
  const S = PATH.map((p) => p[0]);
  const param = (st) => { const n = S.length - 1; if (st <= S[0]) return 0; for (let j = 0; j < n; j++) if (st <= S[j + 1]) return (j + (st - S[j]) / (S[j + 1] - S[j])) / n; return 1; };
  let stage = 0, stageT = 0, vel = 0, snapT = 0, yaw = 0, pitch = 0, vYaw = 0, vPitch = 0, focus = null, focusAmt = 0, frame = 1;
  const N = STOPS.length - 1;

  // ---------- interface ----------
  const ui = document.createElement('div');
  ui.className = 'md-ui'; ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = `
    <article class="md-panel" aria-live="polite">
      <div class="md-arch" aria-hidden="true"><svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 2l4.6 6.9 8.1-1.6-1.6 8.1L38 20l-6.9 4.6 1.6 8.1-8.1-1.6L20 38l-4.6-6.9-8.1 1.6 1.6-8.1L2 20l6.9-4.6-1.6-8.1 8.1 1.6z"/></svg></div>
      <header><span class="md-step"></span><span class="md-clock"></span></header>
      <p class="md-ar" lang="ar" dir="rtl"></p>
      <h2 class="md-en"></h2>
      <div class="md-body"></div>
      <div class="md-detail detail-body"></div>
      <div class="md-actions"></div>
    </article>
    <nav class="md-map" aria-label="The walk"><svg viewBox="0 0 120 170" aria-hidden="true"><path class="route"/></svg><ol></ol></nav>
    <div class="md-tags"></div>`;
  document.body.appendChild(ui);
  if (/claude\.ai|claudeusercontent/.test(location.hostname)) ui.querySelectorAll('[data-cv]').forEach((e) => e.remove());
  const $ = (s) => ui.querySelector(s);
  const panel = $('.md-panel'), pStep = $('.md-step'), pClock = $('.md-clock'), pAr = $('.md-ar'), pEn = $('.md-en'), pBody = $('.md-body'), pDet = $('.md-detail'), pAct = $('.md-actions');
  // the route, drawn from the path seen from above
  const mapSvg = $('.md-map svg'), mapOl = $('.md-map ol');
  const MX = (x) => 108 - ((x + 66) / 72) * 96, MY = (z) => 6 + ((20 - z) / 112) * 156;
  { const pts = []; for (let i = 0; i <= 160; i++) { const p = pathPos.getPoint(i / 160); pts.push(`${MX(p.x).toFixed(1)},${MY(p.z).toFixed(1)}`); } mapSvg.querySelector('.route').setAttribute('d', `M${pts.join(' L')}`); }
  const stopDots = STOPS.map((s, i) => {
    const p = pathPos.getPoint(param(i));
    const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button';
    b.style.left = `${(MX(p.x) / 120 * 100).toFixed(2)}%`; b.style.top = `${(MY(p.z) / 170 * 100).toFixed(2)}%`;
    b.innerHTML = `<i aria-hidden="true"></i><span>${s.en}</span>`; b.setAttribute('aria-label', `Walk to ${s.en}`);
    b.addEventListener('click', () => go(i)); li.appendChild(b); mapOl.appendChild(li); return b;
  });
  const tagBox = $('.md-tags');
  const H = C.hot.map((h) => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'md-tag'; el.tabIndex = -1;
    el.innerHTML = `<i aria-hidden="true"></i><span>${h.label}</span>`;
    el.addEventListener('click', () => activate(h.id));
    tagBox.appendChild(el);
    return { ...h, el, w: 0, v: new THREE.Vector3() };
  });

  let shown = -1, detailId = null;
  const placed = [], byDepth = H.slice();
  const clockAt = (st) => { const m = 17 * 60 + 8 + st * 14.5; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`; };
  function setStop(i) {
    if (i === shown && !detailId) return;
    shown = i; detailId = null; focus = null;
    const s = STOPS[i];
    panel.classList.add('swap');
    setTimeout(() => {
      panel.classList.remove('swap', 'detail');
      pStep.textContent = `${String(i + 1).padStart(2, '0')} / ${String(STOPS.length).padStart(2, '0')}`;
      pAr.textContent = s.ar; pEn.textContent = s.en;
      pBody.innerHTML = `<p>${s.body}</p>${s.hint ? `<p class="md-hint">${s.hint}</p>` : ''}`;
      pDet.innerHTML = '';
      const acts = [];
      if (i < N) acts.push(['Walk on', () => go(i + 1), 1]);
      if (i === 1) acts.unshift(['Knock on the door', () => activate('customs'), 1]);
      if (i === 3) acts.unshift(['Light every lantern', () => lightAll(), 1]);
      if (i === 6) acts.unshift(['Repair the stock', () => activate('geant', true), 1]);
      if (i === 7) acts.unshift(['Open all six sources', () => openAll(), 1]);
      if (i === N) acts.push(['Let’s talk', () => activate('contact'), 1], ['Look at the stars', () => activate('scope')], ['Go to the lit room', () => activate('door-desk')]);
      if (i > 0 && i < N) acts.push(['Back', () => go(i - 1)]);
      setActions(acts);
      stopDots.forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('past', k < i); });
    }, reduced ? 0 : 180);
    audio.chime?.(i);
    if (i === 3) guide?.event('medina-souk');
    if (i === N) { setTimeout(() => guide?.event('medina-end'), 2200); achieve('hello'); }
    if (i === 5) env.warm?.('desk');
    if (i >= 7) { env.warm?.('night'); env.warm?.('desk'); }
  }
  function setActions(list) {
    pAct.replaceChildren(...list.map(([label, fn, primary]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (primary) b.className = 'primary'; b.addEventListener('click', () => { audio.click?.(); fn(); }); return b; }));
  }
  function openDetail(id, d, extraHTML = '') {
    detailId = id; shown = clamp(Math.round(stageT), 0, N);
    panel.classList.add('swap');
    setTimeout(() => {
      panel.classList.remove('swap'); panel.classList.add('detail');
      pAr.textContent = d.ar; pEn.textContent = d.en; pBody.innerHTML = '';
      let html = '';
      if (d.shot) { const src = shotFor(d.shot); if (src) html += `<figure class="shot"><img alt="${d.en}" src="${src}"></figure>`; }
      html += d.html || tpl(d.tpl);
      pDet.innerHTML = html + extraHTML;
      pDet.scrollTop = 0;
      const acts = [['Back to the walk', () => setStop(Math.round(stage))]];
      if (id === 'contact') acts.unshift(['Copy email', (b) => copyEmail(), 1], ['LinkedIn', () => open('https://www.linkedin.com/in/abdelkrim-ghebouli', '_blank', 'noopener')], ['CV', () => { const a = document.createElement('a'); a.href = './Abdelkrim-Ghebouli-CV.pdf'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }]);
      if (id === 'geant' && !I.stock.fixed) acts.unshift(['Repair the stock', () => repair(), 1]);
      setActions(acts);
    }, reduced ? 0 : 160);
  }
  async function copyEmail() { try { await navigator.clipboard.writeText(EMAIL); } catch {} achieve('hello'); const b = pAct.querySelector('.primary'); if (b) { b.textContent = 'Copied ✓'; setTimeout(() => (b.textContent = 'Copy email'), 2000); } }

  // ---------- doing things ----------
  const hitList = C.hot.map((h) => h.mesh);
  function activate(id, fromButton) {
    const h = H.find((x) => x.id === id);
    if (h && Math.abs(stage - h.stage) > 0.6) { go(h.stage); setTimeout(() => activate(id, fromButton), 1400); return; }
    if (h) focus = h;
    if (id === 'customs') { I.doors.customs.target = 1; audio.thump?.(); openDetail(id, DETAILS.customs); return; }
    if (id === 'cat') { petted = 1; meow(); achieve('cat'); openDetail(id, DETAILS.cat); return; }
    if (id === 'degrees') return openDetail(id, DETAILS.degrees);
    if (id.startsWith('cert-')) { const i = +id.slice(5), [c, t, d] = CERT_PLAQUES[i]; return openDetail(id, { ar: 'شهادة', en: c, tpl: [d] }, `<p class="md-note">SAP certified · ${t}</p>`); }
    if (id.startsWith('lantern-')) { const i = +id.slice(8); light(i); return openDetail(id, { ar: 'فانوس', en: SKILLS[i][0], tpl: SKILLS[i][1] }); }
    if (['olive', 'latina', 'jewel', 'team', 'basin'].includes(id)) return openDetail(id, DETAILS[id]);
    if (id === 'geant') { const d = DETAILS.geant; return openDetail(id, I.stock.fixed ? { ...d, tpl: [...d.tpl, ...d.fixed] } : d); }
    if (id.startsWith('stream-')) { const i = +id.slice(7); openStream(i); return openDetail(id, { ar: 'ساقية', en: STREAMS[i][0], tpl: [STREAMS[i][1]] }); }
    if (id === 'contact') { sendPigeon(); openDetail(id, DETAILS.contact); return; }
    if (id === 'scope') { const r = H.find((x) => x.id === 'scope'); r.v.copy(r.anchor).project(camera); travel('night', ((r.v.x + 1) / 2) * innerWidth, ((1 - r.v.y) / 2) * innerHeight); return; }
    if (id === 'door-desk') { const r = H.find((x) => x.id === 'door-desk'); r.v.copy(r.anchor).project(camera); travel('desk', ((r.v.x + 1) / 2) * innerWidth, ((1 - r.v.y) / 2) * innerHeight); return; }
    void fromButton;
  }
  function light(i) { if (lit[i]) return; lit[i] = 1; audio.chime?.(i + 2); if (lit.every(Boolean)) { achieve('lanterns'); guide?.event('medina-lanterns'); } }
  function lightAll() { SKILLS.forEach((_, i) => setTimeout(() => light(i), i * 140)); }
  function openStream(i) { const s = I.streams[i]; if (s.target) return; s.target = 1; audio.drip?.(); if (I.streams.every((x) => x.target)) { achieve('consolidate'); audio.chime?.(9); } }
  function openAll() { I.streams.forEach((s, i) => setTimeout(() => openStream(i), i * 300)); setTimeout(() => activate('basin'), 600); }
  function repair() {
    if (I.stock.fixed) return;
    I.stock.fixed = true; I.stock.t = 0; achieve('repair'); audio.chime?.(6);
    openDetail('geant', { ...DETAILS.geant, tpl: ['d-clean-method', 'd-clean-tool', 'd-m-dash', 'd-m-flask', 'd-m-users', 'd-m-launch'] });
  }
  function meow() { audio.meow?.(); }

  // ---------- input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y) { ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(hitList, false)[0]; if (!hit) return null; const h = H.find((q) => q.mesh === hit.object); return h && Math.abs(stage - h.stage) < 0.7 ? h : null; }
  let hover = null, drag = null, last = 0;
  function go(i) { stageT = clamp(i, 0, N); if (detailId) setStop(Math.round(stageT)); }
  const L = {
    wheel(e) {
      if (overlayOpen() || e.ctrlKey || e.target.closest?.('.md-detail, #talk, #guide, #world-panel')) return;
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      stageT = clamp(stageT + d * (e.deltaMode === 1 ? 0.04 : e.deltaMode === 2 ? 0.8 : 0.00115), 0, N);
      snapT = performance.now() + 420;
    },
    down(e) { if (e.button !== 0 || isUI(e.target) || overlayOpen()) return; drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0, touch: e.pointerType !== 'mouse', s0: stageT }; },
    move(e) {
      if (!drag) { hover = e.pointerType === 'mouse' && !isUI(e.target) ? pick(e.clientX, e.clientY) : null; return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.touch) {
        // on touch, vertical drags walk and horizontal drags look around
        if (!drag.axis && drag.moved > 10) drag.axis = Math.abs(e.clientX - drag.x0) > Math.abs(e.clientY - drag.y0) ? 'x' : 'y';
        if (drag.axis === 'y') { stageT = clamp(stageT - dy * 0.0042, 0, N); snapT = performance.now() + 500; }
        else if (drag.axis === 'x') { vYaw = dx * 0.004; yaw = clamp(yaw + vYaw, -0.9, 0.9); }
      } else if (drag.moved > 5) { vYaw = dx * 0.0032; vPitch = dy * 0.0024; yaw = clamp(yaw + vYaw, -0.9, 0.9); pitch = clamp(pitch + vPitch, -0.35, 0.35); }
    },
    up(e) {
      if (!drag) return; const d = drag; drag = null;
      if (d.moved > 8) return;
      const h = pick(e.clientX, e.clientY);
      if (h) activate(h.id);
      else if (Math.round(stage) === 0) scatterBirds(new THREE.Vector3(0, 0, 9));
    },
    key(e) {
      if (overlayOpen() || e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === 'Escape') { if (detailId) setStop(Math.round(stage)); return; }
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(k) && !(k === ' ' && e.target.closest('button, a'))) { e.preventDefault(); go(Math.floor(stageT + 0.5) + 1); }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); go(Math.ceil(stageT - 0.5) - 1); }
      else if (k === 'Home') go(0); else if (k === 'End') go(N);
    },
    cancel() { drag = null; },
  };
  let attached = false;
  const attach = (on) => { if (on === attached) return; attached = on; const f = on ? addEventListener : removeEventListener; f('wheel', L.wheel, { passive: false }); f('pointerdown', L.down); f('pointermove', L.move); f('pointerup', L.up); f('pointercancel', L.cancel); f('keydown', L.key); };

  // ---------- the hour ----------
  const COL = {
    top: [new THREE.Color('#4f86c6'), new THREE.Color('#5a6fb0'), new THREE.Color('#2b3a73')],
    hor: [new THREE.Color('#f4dcb4'), new THREE.Color('#f7b77c'), new THREE.Color('#ff8a4c')],
    sun: [new THREE.Color('#fff1d8'), new THREE.Color('#ffc98a'), new THREE.Color('#ff9a52')],
  };
  const tmpC = new THREE.Color();
  const tri = (arr, t, out) => (t < 0.5 ? out.copy(arr[0]).lerp(arr[1], t * 2) : out.copy(arr[1]).lerp(arr[2], (t - 0.5) * 2));
  function setHour(t) {
    const el = THREE.MathUtils.degToRad(lerp(24, 1.2, Math.pow(t, 0.9))), az = THREE.MathUtils.degToRad(lerp(18, 32, t));
    sunDir.set(-Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    tri(COL.top, t, skyU.uTop.value); tri(COL.hor, t, skyU.uHor.value); tri(COL.sun, t, skyU.uSun.value);
    skyU.uGlow.value = 0.8 + t * 0.9;
    sun.color.copy(skyU.uSun.value); sun.intensity = lerp(3.4, 2.2, t);
    hemi.color.copy(skyU.uTop.value).lerp(new THREE.Color('#ffffff'), 0.35); hemi.groundColor.set('#a07a52').lerp(new THREE.Color('#4a3a3a'), t); hemi.intensity = lerp(1.15, 0.75, t);
    scene.fog.color.copy(skyU.uHor.value).lerp(skyU.uTop.value, 0.25);
    ridgeMat.color.copy(skyU.uHor.value).lerp(new THREE.Color('#6a5a8a'), 0.45);
    seaU.uSun.value.copy(skyU.uSun.value); seaU.uHor.value.copy(skyU.uHor.value); seaU.uTop.value.copy(skyU.uTop.value);
  }
  setHour(0);
  envSky.material = sky.material; bakeEnv();
  let envAt = 0;

  // ---------- Géant screens ----------
  const tvG = I.tvs.canvas.getContext('2d');
  function drawTV(time) {
    const W = 512, Hh = 256, cw = W / 3, ch = Hh / 2;
    tvG.fillStyle = '#05070a'; tvG.fillRect(0, 0, W, Hh);
    const fixed = I.stock.fixed && (I.stock.t || 0) > 1.0;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const x = c * cw, y = (1 - r) * ch;
      tvG.save(); tvG.beginPath(); tvG.rect(x + 3, y + 3, cw - 6, ch - 6); tvG.clip();
      if (!fixed) {
        tvG.fillStyle = Math.sin(time * 6 + r + c) > 0 ? '#3a0a08' : '#1a0504'; tvG.fillRect(x, y, cw, ch);
        for (let k = 0; k < 12; k++) { tvG.fillStyle = `rgba(255,${60 + Math.random() * 60 | 0},40,${Math.random() * 0.4})`; tvG.fillRect(x, y + Math.random() * ch, cw, 2 + Math.random() * 5); }
        tvG.fillStyle = '#ff5a3c'; tvG.font = '700 26px "Reem Kufi", sans-serif'; tvG.textAlign = 'center'; tvG.fillText(r ? 'STOCK ≠ MOVES' : 'ERROR', x + cw / 2, y + ch / 2 + 8);
      } else {
        tvG.fillStyle = '#0d1a2a'; tvG.fillRect(x, y, cw, ch);
        const k = r * 3 + c;
        tvG.fillStyle = '#f2c24a';
        if (k % 3 === 0) for (let b = 0; b < 6; b++) { const hh = (0.3 + 0.6 * Math.abs(Math.sin(b * 1.7 + k + time * 0.6))) * (ch - 34); tvG.fillRect(x + 14 + b * 24, y + ch - 12 - hh, 16, hh); }
        else if (k % 3 === 1) { tvG.strokeStyle = '#6fd3ff'; tvG.lineWidth = 3; tvG.beginPath(); for (let i = 0; i <= 20; i++) tvG.lineTo(x + 10 + i * (cw - 20) / 20, y + ch * 0.7 - Math.sin(i * 0.5 + time + k) * 18 - i * 1.6); tvG.stroke(); }
        else { tvG.fillStyle = '#9fe0a0'; tvG.font = '700 40px "Reem Kufi", sans-serif'; tvG.textAlign = 'center'; tvG.fillText(['4–6', '~30%', '30–50', '10–20'][(r + c) % 4], x + cw / 2, y + ch / 2 + 6); tvG.font = '500 13px "Reem Kufi", sans-serif'; tvG.fillText(['DASHBOARDS', 'FASTER', 'USERS', 'ONBOARDED'][(r + c) % 4], x + cw / 2, y + ch / 2 + 30); }
      }
      tvG.restore();
    }
    I.tvs.tex.needsUpdate = true;
  }

  // ---------- frame ----------
  let rtW = 4, rtH = 4, dpr = 1, on = false, lastTV = 0;
  const P = new THREE.Vector3(), Lk = new THREE.Vector3(), tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), dm = new THREE.Object3D();
  const Y = new THREE.Vector3(0, 1, 0);
  const visibleZones = (st) => C.zones.forEach((z, i) => (z.visible = i >= Math.floor(st) - 1 && i <= Math.ceil(st) + 1 || (i === 0 && st < 1.6) || (i === 8 && st > 6.4)));
  let dbgCam = null;
  if (/[?&]debug/.test(location.search)) window.__medina = { go: (i) => (stageT = i), get stage() { return stage; }, camera, H, scene, C, renderer, birds, cam: (p, l) => (dbgCam = p ? { p: new THREE.Vector3(...p), l: new THREE.Vector3(...l) } : null), act: (id) => activate(id), lightAll: () => lightAll(), openAll: () => openAll(), repair: () => repair() };

  return {
    id: 'medina', ui: 'own', camera,
    post: { conv: 1, grain: 0.02, vig: 0.26, ab: 0.0006, light: 0, tilt: 0, exposure: 0.95 },
    precompile() { try { renderer.compileAsync?.(scene, camera).catch(() => {}); } catch {} },
    enter() { if (on) return; on = true; ui.classList.add('on'); ui.setAttribute('aria-hidden', 'false'); attach(true); if (shown < 0) setStop(0); },
    exit() { if (!on) return; on = false; ui.classList.remove('on'); ui.setAttribute('aria-hidden', 'true'); attach(false); drag = null; hover = null; audio.sea?.(0); },
    caption() { return STOPS[clamp(Math.round(stage), 0, N)].en; },
    cursor() {
      if (drag && drag.moved > 6) return 'Look around';
      if (hover) return hover.id === 'customs' ? 'Knock' : hover.id.startsWith('lantern') ? 'Light' : hover.id.startsWith('stream') ? 'Open the source' : hover.id === 'cat' ? 'Pet' : hover.id === 'scope' ? 'Look up' : hover.id === 'door-desk' ? 'Step in' : hover.id === 'contact' ? 'Send a pigeon' : 'Open';
      if (stage < 0.3) return 'Scroll to walk';
      return '';
    },
    dragging: () => !!drag && drag.moved > 6,
    resize(w, h, pr) {
      dpr = pr; F = { mobile: w / h < 0.9 || w < 560 };
      camera.aspect = w / h; camera.fov = F.mobile ? 66 : 50; camera.updateProjectionMatrix();
      rtW = Math.round(w * pr); rtH = Math.round(h * pr);
      composer.setPixelRatio(1); composer.setSize(rtW, rtH);
      bloom.resolution.set(rtW / 2, rtH / 2);
      jetU.uPR.value = pr; haloU.uH.value = h * pr;
    },
    quality(level) { if (level >= 2) { bloom.enabled = false; if (sun.shadow.mapSize.x > 1024) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; } } },
    update(c) {
      const { dt, time, mouse, current } = c;
      // walk: ease toward the target; settle on the nearest place when the wheel rests
      if (performance.now() > snapT && !drag) { const r = Math.round(stageT); if (Math.abs(stageT - r) < 0.38 && Math.abs(stageT - r) > 0.001) stageT += (r - stageT) * Math.min(1, dt * 3); }
      const k = Math.abs(stageT - stage) > 1.2 ? 1.25 : 2.2;
      const prev = stage; stage += (stageT - stage) * (1 - Math.exp(-dt * k)); if (Math.abs(stageT - stage) < 1e-4) stage = stageT;
      vel = (stage - prev) / Math.max(dt, 1e-3);
      const u = param(stage);
      pathPos.getPoint(u, P); pathLook.getPoint(u, Lk);
      if (dbgCam) { P.copy(dbgCam.p); Lk.copy(dbgCam.l); }
      // a gentle step rhythm while walking
      if (!reduced) P.y += Math.sin(stage * 26) * 0.025 * clamp(Math.abs(vel) * 2, 0, 1);
      if (!drag) { yaw += vYaw; pitch += vPitch; vYaw *= 0.9; vPitch *= 0.9; yaw *= 1 - Math.min(1, dt * 0.6); pitch *= 1 - Math.min(1, dt * 0.6); }
      const mx = c.mouseActive ? mouse.x : 0, my = c.mouseActive ? mouse.y : 0;
      fwd.subVectors(Lk, P);
      fwd.applyAxisAngle(Y, yaw - mx * 0.08);
      right.crossVectors(fwd, Y).normalize();
      fwd.applyAxisAngle(right, -pitch + my * 0.05);
      // looking at something you opened
      focusAmt += ((focus ? 1 : 0) - focusAmt) * Math.min(1, dt * 2.2);
      if (focus && focusAmt > 0.01) { tmp.subVectors(focus.anchor, P).normalize().multiplyScalar(fwd.length()); fwd.lerp(tmp, ease(focusAmt) * 0.7); }
      // frame the subject where the panel isn't: right of centre on a wide screen, above it on a tall one
      frame += ((F.mobile ? 0 : 1) - frame) * Math.min(1, dt * 3);
      fwd.applyAxisAngle(Y, frame * 0.2);
      right.crossVectors(fwd, Y).normalize();
      fwd.applyAxisAngle(right, -(1 - frame) * 0.1);
      Lk.copy(P).add(fwd);
      if (c.arrive > 0) P.addScaledVector(tmp.subVectors(P, Lk).normalize(), c.arrive * 4);
      camera.position.copy(P); camera.lookAt(Lk); camera.updateMatrixWorld();
      visibleZones(stage);

      // the hour follows the walk
      const t = clamp(stage / N, 0, 1);
      setHour(t);
      if (Math.abs(t - envAt) > 0.34) { envAt = t; bakeEnv(); }
      sky.position.copy(P);
      // sun and its shadow box follow the walker
      fwd.set(Lk.x - P.x, 0, Lk.z - P.z).normalize();
      const tgt = tmp.copy(P).addScaledVector(fwd, 12); tgt.y = stage > 7.4 ? 9 : 0;
      tgt.x = Math.round(tgt.x * 2) / 2; tgt.z = Math.round(tgt.z * 2) / 2;
      sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sunDir, 120);
      sun.target.updateMatrixWorld();

      // lanterns: brighter as the light goes, and brightest when you light them
      const glow = 0.5 + t * 2.0;
      I.lanterns.forEach((l, i) => {
        let b = glow * (0.85 + 0.15 * Math.sin(time * 3 + i * 1.7));
        if (l.skill != null) { litT[l.skill] += ((lit[l.skill] ? 1 : 0) - litT[l.skill]) * Math.min(1, dt * 3); b = b * (0.55 + 0.45 * (1 - litT[l.skill])) + litT[l.skill] * 4.2; }
        coreC.copy(lanternBase[i]).multiplyScalar(b); I.lanternCores.setColorAt(i, coreC);
        const hk = l.skill != null ? litT[l.skill] * 0.55 + t * 0.12 : 0.05 + t * 0.22;
        hC[i * 3] = lanternBase[i].r * hk; hC[i * 3 + 1] = lanternBase[i].g * hk; hC[i * 3 + 2] = lanternBase[i].b * hk;
        poolCol.setRGB(1, 0.62, 0.3).multiplyScalar(b * 0.18); I.pools.setColorAt(i, poolCol);
      });
      I.lanternCores.instanceColor.needsUpdate = true; I.pools.instanceColor.needsUpdate = true; haloG.attributes.aC.needsUpdate = true;
      const dusk = clamp((t - 0.45) / 0.4, 0, 1);
      I.townWindows.material.color.setScalar(1.6 * dusk);
      I.townWindows.visible = t > 0.5;
      I.bulbs.color.setRGB(1, 0.78, 0.45).multiplyScalar(0.7 + t * 2.6);
      I.screens.color.setScalar(1.0 + t * 0.5);
      I.litRoom.glow.color.setRGB(1.6, 0.9, 0.38).multiplyScalar(0.5 + dusk * 0.9);
      I.litRoom.pool.color.setRGB(1, 0.6, 0.28).multiplyScalar(0.25 + dusk * 0.9);
      if (stage > 6.4) { I.lighthouse.lamp.color.setRGB(3, 2.4, 1.4).multiplyScalar(0.25 + dusk); I.lighthouse.beamM.uniforms.uI.value = dusk; I.lighthouse.beam.rotation.y = time * 0.6; I.boatLights.material.color.setRGB(3, 2, 1).multiplyScalar(dusk); }
      dustU.uTime.value = time;
      if (on) audio.sea?.(clamp((stage - 6.9) / 1.1, 0, 1));
      I.windows.forEach((w) => w.material.color.setRGB(2.4, 1.6, 0.8).multiplyScalar(0.25 + t));
      // doors, water, stock, cloth, birds, cat
      const d = I.doors.customs; d.open += (d.target - d.open) * Math.min(1, dt * 2.2);
      d.leaves.forEach((lf) => (lf.hinge.rotation.y = lf.side * -d.open * 1.35));
      d.light.intensity = d.open * 3.2;
      let opened = 0;
      I.streams.forEach((s) => { s.open += (s.target - s.open) * Math.min(1, dt * 0.9); s.mesh.material.uniforms.uOpen.value = s.open; s.mesh.material.uniforms.uTime.value = time; opened += s.open; });
      jetU.uH.value = 0.35 + (opened / 6) * 0.9; jetU.uTime.value = time;
      basinW.material.uniforms.uTime.value = time;
      waterU.uTime.value = time;
      if (I.stock.fixed) {
        I.stock.t = (I.stock.t || 0) + dt;
        const e = ease(I.stock.t / 1.2);
        I.stock.boxes.forEach(([x, y, z, bad], i) => { dm.position.set(x, y, z); if (bad) dm.position.x += (1 - e) * 0.3 * Math.sin(time * 30); dm.rotation.set(0, 0, 0); dm.updateMatrix(); I.stock.mesh.setMatrixAt(i, dm.matrix); if (bad) I.stock.mesh.setColorAt(i, tmpC.set('#ff3b1f').lerp(new THREE.Color('#c9a77a'), e)); });
        I.stock.mesh.instanceMatrix.needsUpdate = true; I.stock.mesh.instanceColor.needsUpdate = true;
      } else if (Math.abs(stage - 6) < 1.5) {
        const [x, y, z] = I.stock.boxes[4]; dm.position.set(x + (Math.sin(time * 37) > 0.7 ? 0.05 : 0), y, z); dm.rotation.set(0, Math.sin(time * 23) * 0.06, 0); dm.updateMatrix(); I.stock.mesh.setMatrixAt(4, dm.matrix); I.stock.mesh.instanceMatrix.needsUpdate = true;
      }
      if (Math.abs(stage - 6) < 1.5 && time - lastTV > 0.12) { lastTV = time; drawTV(time); }
      I.clothU.uTime.value = time;
      birdU.uTime.value = time;
      if (stage > 0.25 && !scatter) scatterBirds(new THREE.Vector3(0, 0, 14));
      if ((stage > 6.5) !== birdsRoof) { birdsRoof = stage > 6.5; placeBirds(birdsRoof); }
      B.forEach((b, i) => {
        let sc = 1;
        if (b.mode === 0) { b.t += dt; if (Math.sin(b.t * 0.7 + i) > 0.96) b.p.x += (Math.random() - 0.5) * 0.04; flapA.array[i] = 0; dm.position.copy(b.p); dm.rotation.set(0, i, 0); }
        else if (b.mode === 1) {
          b.t += dt;
          const to = tmp.copy(b.home).sub(b.p); const dist = to.length();
          if (b.t > b.wait) b.v.lerp(to.normalize().multiplyScalar(Math.min(6, dist * 1.2 + 0.4)), Math.min(1, dt * 1.5));
          b.v.y -= dt * (b.t < 1 ? 0 : 0.5);
          b.p.addScaledVector(b.v, dt);
          if (b.t > b.wait + 0.5 && dist < 0.3) { b.mode = 2; b.p.copy(b.home); }
          flapA.array[i] = 1;
          dm.position.copy(b.p); dm.lookAt(tmp.copy(b.p).add(b.v));
        } else if (b.mode === 3) {
          const ph = time * 0.3 + b.ph, k = i * 1.7;
          dm.position.set(Math.cos(ph) * (11 + Math.sin(k) * 2), Math.sin(ph * 2 + k) * 1.3, Math.sin(ph) * (8 + Math.cos(k) * 2)).add(I.flock);
          tmp.set(Math.cos(ph + 0.05) * (11 + Math.sin(k) * 2), Math.sin(ph * 2 + 0.1 + k) * 1.3, Math.sin(ph + 0.05) * (8 + Math.cos(k) * 2)).add(I.flock);
          dm.lookAt(tmp); flapA.array[i] = Math.sin(time * 0.8 + k) > -0.3 ? 1 : 0.5; sc = 1.7;
        } else { flapA.array[i] = 0; dm.position.copy(b.p); dm.rotation.set(0, b.yaw, 0); }
        dm.scale.setScalar(sc); dm.updateMatrix(); birds.setMatrixAt(i, dm.matrix);
      });
      birds.instanceMatrix.needsUpdate = true; flapA.needsUpdate = true;
      petted = Math.max(0, petted - dt * 0.3);
      head.rotation.z = petted * 0.5 + Math.sin(time * 0.5) * 0.03; tail.rotation.y = Math.sin(time * (1.2 + petted * 4)) * (0.15 + petted * 0.4);
      body.scale.y = 0.8 + Math.sin(time * 1.6) * 0.02;
      seaU.uTime.value = time; seaU.uCam.value.copy(P);

      if (!current || !on) return;
      // the interface follows
      const near = Math.round(stage);
      if (near !== shown && Math.abs(stage - near) < 0.32 && !detailId) setStop(near);
      if (detailId && (near !== shown || Math.abs(stage - near) > 0.45)) setStop(near);
      ui.classList.toggle('walking', Math.abs(stage - near) > 0.3);
      pClock.textContent = `${clockAt(stage)} · ${t < 0.35 ? 'golden hour' : t < 0.8 ? 'sunset' : 'dusk'}`;
      placed.length = 0;
      for (const h of H) { h.w0 = clamp(1 - Math.abs(stage - h.stage) * 2.4, 0, 1); if (h.w0 > 0.01) { h.v.copy(h.anchor).project(camera); if (h.v.z > 1 || Math.abs(h.v.x) > 1.05 || Math.abs(h.v.y) > 1.05) h.w0 = 0; } }
      byDepth.sort((a, b) => (detailId === a.id ? -1 : detailId === b.id ? 1 : a.v.z - b.v.z));
      for (const h of byDepth) {
        let w = h.w0;
        if (w > 0.01) {
          const x = ((h.v.x + 1) / 2) * innerWidth - 12, y = ((1 - h.v.y) / 2) * innerHeight - 14, wd = h.label.length * 7.4 + 34;
          if (placed.some((r) => x < r[0] + r[2] && x + wd > r[0] && y < r[1] + 28 && y + 28 > r[1])) w = 0; else placed.push([x, y, wd]);
        }
        const was = h.w; h.w = w;
        if (w < 0.01) { if (was >= 0.01) { h.el.style.visibility = 'hidden'; h.el.tabIndex = -1; } continue; }
        if (was < 0.01) { h.el.style.visibility = 'visible'; h.el.tabIndex = 0; }
        h.el.style.transform = `translate(${(((h.v.x + 1) / 2) * innerWidth).toFixed(1)}px, ${(((1 - h.v.y) / 2) * innerHeight).toFixed(1)}px)`;
        h.el.style.opacity = w.toFixed(3);
        h.el.classList.toggle('on', hover === h || detailId === h.id);
        h.el.classList.toggle('done', (h.id.startsWith('lantern-') && !!lit[+h.id.slice(8)]) || (h.id.startsWith('stream-') && !!I.streams[+h.id.slice(7)].target) || (h.id === 'geant' && I.stock.fixed));
        h.el.style.pointerEvents = w > 0.5 ? 'auto' : 'none';
      }
      void last;
    },
    render() {
      renderer.setClearColor(skyU.uHor.value, 1);
      composer.render();
      return composer.readBuffer.texture;
    },
  };
}
