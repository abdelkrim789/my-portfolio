import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import '@fontsource-variable/archivo/wdth.css';
import './monument.css';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, tex, concreteTex, floorTex, rippleNormal, projection, Batch, createMirror, addReflection } from './monument-build.js';
import { answer, FALLBACK, EMAIL, LINKEDIN } from './monument-noor.js';

// The Monument. A slab of concrete in the Sahara at dawn. You arrive across the dunes, a slit of light opens,
// and inside, light falls through the roof onto the story: five bays, a core where six streams become one,
// and a last room that opens to the sky. NOOR, a ring of light, walks with you and answers questions.
// Two rooms are hidden: an archive behind a wall, and a vault beneath the floor.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const smooth = (a, b, x) => ease((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const tpl = (ids) => (ids || []).map((id) => document.getElementById(id)?.innerHTML || '').join('<hr>');
const V = (a) => new THREE.Vector3(...a);

const SKILLS = [
  ['SAP BPC', ['d-sys-1', 'd-bpf']], ['SAP BW', ['d-sys-2', 'd-bwq', 'd-sec']], ['S/4HANA', ['d-sys-0']], ['SAP SAC', ['d-sys-3']],
  ['EPM · AfO', ['d-epm', 'd-afo']], ['ABAP', ['d-sys-6']], ['Power BI', ['d-sys-4', 'd-m-dash']], ['Cegid PMI', ['d-sys-5']],
  ['SQL', ['d-layer-data']], ['Python', ['d-sys-7', 'd-m-flask']], ['Laravel', ['d-layer-logic']], ['React', ['d-layer-ui']],
];
const STREAMS = [['Business Process Flows', 'd-bpf'], ['EPM Add-in', 'd-epm'], ['Analysis for Office', 'd-afo'], ['BW Query Design', 'd-bwq'], ['Security Design', 'd-sec'], ['Reports', 'd-rep']];
const CERTS = [['C_ABAPD_2309', 'ABAP Cloud', 'Back-End Developer', 'd-sys-6'], ['TS410', 'S/4HANA', 'Business Process Integration', 'd-sys-0'], ['S4C03', 'S/4HANA Cloud', 'Implementation Consultant', 'd-sys-0'], ['C_SAC', 'Analytics Cloud', 'Data Analyst', 'd-sys-3']];

// the way through: stops, what NOOR says at each, and what you can ask next
const STOPS = [
  { label: 'Arrival', title: 'The Monument' },
  { label: 'The door' },
  { label: 'The hall', say: 'Welcome. I’m NOOR, the guide of this place. This is the story of Abdelkrim Ghebouli, SAP BPC consultant. Walk with me, or ask me anything about him.', chips: ['Who is Abdelkrim?', 'What does he do now?', 'How do I contact him?'] },
  { label: '2021 · First door', say: '2021. His first door: an internship at the Transite Baghoura customs office, the first time he worked inside a real organisation.', chips: ['Show me the details', 'What came next?'], detail: 'door1' },
  { label: 'Education', say: 'Two degrees from Mohamed El Bachir El Ibrahimi University: information systems in 2024, business intelligence in 2025. Then the SAP Young Professionals Program. Some walls in this room are not walls.', chips: ['Which certifications?', 'Is anything hidden here?'], detail: 'edu' },
  { label: 'Systems', say: 'Twelve systems he works with, from SAP BPC and BW to Python and React. Touch a stone to power it on.', chips: ['Power all systems', 'Which SAP modules?'] },
  { label: 'What he builds', say: 'What he builds: Olive Palace, LatinaDZ and a jewelry store system. Since 2024 he has also led a remote team of four to six developers.', chips: ['Tell me about Olive Palace', 'How does he lead the team?'] },
  { label: 'Géant · 2025', say: 'Géant Electronics, 2025. Network delays corrupted the stock of nearly every article and production stopped. He found the drift and built the tool that repaired it.', chips: ['Repair the stock', 'What was the impact?'], detail: 'geant' },
  { label: 'The core', say: 'Today he is an SAP BPC consultant at CNPC, on Sonatrach’s SHONE project. Six streams of work, one consolidated view. Open each source.', chips: ['Open all six streams', 'What is SHONE?', 'What’s beneath the floor?'] },
  { label: 'Next', say: 'That is the story so far. He is open to SAP consultant roles internationally. Write to him. Or look up.', chips: ['Copy his email', 'Download the CV', 'Look up'] },
];
const DETAILS = {
  door1: { k: 'Internship · 2021', t: 'The first door', html: '<p class="tag">Internship · 2021</p><h3>Transite Baghoura customs office</h3><p>My first internship, at the Transite Baghoura customs office in 2021. The oldest chapter of my work, and the first time I worked inside a real organisation.</p><dl class="readout"><div><dt>Role</dt><dd>Intern</dd></div><div><dt>Where</dt><dd>Transite Baghoura customs office</dd></div></dl>' },
  edu: { k: 'Education', t: 'Two degrees and a program', html: '<p class="tag">Mohamed El Bachir El Ibrahimi University</p><h3>The degrees</h3><dl class="readout"><div><dt>2024</dt><dd>Bachelor · Information Systems &amp; Software Engineering</dd></div><div><dt>2025</dt><dd>Master 1 · Business Intelligence</dd></div><div><dt>2025</dt><dd>SAP Young Professionals Program, March to May</dd></div><div><dt>Also</dt><dd>Dale Carnegie Training, certified</dd></div></dl>' },
  team: { k: 'Leadership', t: 'The team', tpl: ['d-team', 'd-layer-logic', 'd-layer-data', 'd-layer-ui'] },
  olive: { k: 'Project', t: 'Olive Palace', tpl: ['d-olive'], shot: 'd-olive' },
  latina: { k: 'Project', t: 'LatinaDZ', tpl: ['d-latina'], shot: 'd-latina' },
  jewel: { k: 'Project', t: 'Jewelry Store', tpl: ['d-jewelry'], shot: 'd-jewelry' },
  geant: { k: 'Géant Electronics · 2025', t: 'The stock incident', tpl: ['d-geant', 'd-raw', 'd-raw-mismatch', 'd-raw-blocked'] },
  geantFixed: { k: 'Géant Electronics · 2025', t: 'The repair', tpl: ['d-clean-method', 'd-clean-tool', 'd-m-dash', 'd-m-flask', 'd-m-users', 'd-m-launch'] },
  core: { k: 'Today', t: 'SAP BPC on SHONE', tpl: ['d-shone'] },
  home: { k: 'The archive', t: 'Where I come from', tpl: ['d-home'] },
  contact: { k: 'Next', t: 'Let’s talk', html: `<p>I’m open to SAP consultant roles internationally: BPC, BW, S/4HANA, analytics.</p><p class="mn-mail">${EMAIL}</p>` },
};

export async function createMonument(env) {
  const { renderer, small, coarse, reduced, tier, meURL, shotFor, canv, achieve, audio, guide, isUI, overlayOpen, travel } = env;
  const fonts = { display: '"Archivo Variable", "Archivo", "Arial Narrow", sans-serif', body: '"IBM Plex Sans", Arial, sans-serif', mono: '"IBM Plex Mono", monospace' };
  try { await Promise.race([Promise.all([document.fonts.load('600 60px "Archivo Variable"'), document.fonts.load('200 60px "Archivo Variable"')]), new Promise((r) => setTimeout(r, 2000))]); } catch {}
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 6000);
  const EXT = new THREE.Group(), INT = new THREE.Group(), BOTH = new THREE.Group();
  scene.add(EXT, INT, BOTH);
  const hot = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function hotspot(id, pos, size, label, extra = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), hitMat); m.position.set(...pos); INT.add(m);
    const h = { ...extra, id, mesh: m, label, anchor: V(extra.anchor || pos), v: new THREE.Vector3(), w: 0 };
    hot.push(h); return h;
  }

  // ---------- materials ----------
  const C1 = concreteTex([134, 124, 112]);
  const M = {
    wall: new THREE.MeshStandardMaterial({ map: C1.map, bumpMap: C1.bump, bumpScale: 0.6, roughness: 0.92, color: 0xd9d0c4 }),
    mono: new THREE.MeshStandardMaterial({ map: C1.map, bumpMap: C1.bump, bumpScale: 0.5, roughness: 0.9, color: new THREE.Color(1.5, 1.42, 1.34) }),
    stone: new THREE.MeshStandardMaterial({ map: C1.map, bumpMap: C1.bump, bumpScale: 0.4, roughness: 0.7, color: 0x8f857a }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.9 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc89a52, metalness: 1, roughness: 0.3 }),
    cloak: new THREE.MeshStandardMaterial({ color: 0x1b1611, roughness: 1 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0d0c0b, metalness: 0.9, roughness: 0.06, transparent: true, opacity: 0.55 }),
  };
  M.wall.map.repeat.set(1, 1);
  const FT = floorTex(); FT.repeat.set(1, 1);
  const floorMat = new THREE.MeshStandardMaterial({ map: FT, color: 0xb0a596, roughness: 0.3, metalness: 0.0 });
  const useMirror = tier >= 1;
  const mirror = useMirror ? createMirror(renderer, { y: 0, scale: tier >= 2 ? 0.5 : 0.33 }) : null;
  const floorRefl = mirror ? addReflection(floorMat, mirror, { strength: 0.75, blur: 1.4, distort: 0.004 }) : null;
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.05, metalness: 0.2 });
  const waterRefl = mirror ? addReflection(waterMat, mirror, { strength: 1.0, blur: 0.5, distort: 0.012 }) : null;

  // ---------- sky, sun, desert (outside) ----------
  const sunDir = new THREE.Vector3(-0.82, 0.16, 0.3).normalize(); // low, from the left, raking across the face
  const skyU = { uSun: { value: sunDir }, uTime: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4500, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uSun; uniform float uTime; varying vec3 vD;
      float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vD); float h = d.y;
        float s = max(dot(d, uSun), 0.0);
        float side = dot(normalize(d.xz), normalize(uSun.xz))*0.5 + 0.5;
        vec3 zen = vec3(0.3, 0.25, 0.27), mid = vec3(0.8, 0.53, 0.36), hor = mix(vec3(1.12, 0.72, 0.44), vec3(1.8, 1.0, 0.5), side*side);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h));
        c = mix(c, zen, smoothstep(0.15, 0.7, h));
        c = mix(c, hor*0.75, smoothstep(0.0, -0.1, h));
        // thin high cloud bands, lit from below by the sun
        float band = vn(vec2(atan(d.z, d.x)*6.0, h*40.0) + vec2(uTime*0.003, 0.0))*smoothstep(0.02, 0.1, h)*smoothstep(0.32, 0.12, h);
        c += vec3(1.0, 0.62, 0.38)*band*band*0.35*(0.3 + side);
        c += vec3(1.6, 0.95, 0.5)*(pow(s, 3.0)*0.35 + pow(s, 12.0)*0.7 + pow(s, 90.0)*1.6) + vec3(14.0, 9.0, 5.0)*smoothstep(0.99935, 0.9997, s);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  sky.frustumCulled = false; EXT.add(sky);

  // dunes: a long windward slope and a steep slip face, flattened into a plaza around the monument
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
  function dune(x, z) {
    const n1 = vnoise(x * 0.0021, z * 0.0021), n2 = vnoise(x * 0.006 + 3, z * 0.006 - 7);
    const u = z * 0.0105 + x * 0.0032 + n1 * 1.6, f = u - Math.floor(u);
    const prof = f < 0.72 ? Math.pow(f / 0.72, 1.6) : Math.pow((1 - f) / 0.28, 0.85);
    let h = prof * (8 + 18 * n2) + n1 * 6 - 3;
    const plaza = Math.max(0, Math.max(Math.abs(x) - 160, z - 40, -z - 260));
    h *= smooth(0, 140, plaza);
    h *= 1 - (1 - smooth(22, 70, Math.abs(x))) * smooth(20, 60, z) * (1 - smooth(640, 760, z)); // a flat avenue to the door
    return h;
  }
  {
    const g = new THREE.PlaneGeometry(4200, 4200, tier >= 2 ? 300 : 200, tier >= 2 ? 300 : 200).rotateX(-Math.PI / 2); g.translate(0, 0, 500);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, dune(p.getX(i), p.getZ(i)) - 0.05);
    g.computeVertexNormals();
    const rip = rippleNormal(); rip.repeat.set(700, 700);
    const sand = new THREE.MeshStandardMaterial({ color: 0xd2965f, roughness: 0.95, normalMap: rip, normalScale: new THREE.Vector2(0.55, 0.55) });
    const t = new THREE.Mesh(g, sand); t.receiveShadow = true; EXT.add(t);
  }
  // the monument: a slab 260 m wide and 150 m tall, with a slit of a door
  const HW = 22, HH = 46, ZE = -160;
  const shell = new Batch(), facade = new Batch();
  shell.span(M.mono, [-130, 0, -200], [-128, 150, -6]); shell.span(M.mono, [128, 0, -200], [130, 150, -6]);
  shell.span(M.mono, [-130, 148, -200], [130, 150, -6]); shell.span(M.mono, [-130, 0, -202], [130, 150, -200]);
  // the face: deep fins the low sun rakes across, fine ribs between them, a tall dark slot for the door,
  // two blades standing out from the face to frame it, and a thin cap over everything
  const TOP = 146, RH = 92;
  facade.span(M.mono, [-130, 0, -6], [-9, TOP, 0], 0.12); facade.span(M.mono, [9, 0, -6], [130, TOP, 0], 0.12); facade.span(M.mono, [-9, RH, -6], [9, TOP, 0], 0.12);
  facade.span(M.mono, [-132, TOP, -8], [132, 150.5, 4.4], 0.12);
  facade.span(M.mono, [-9, 0, -6], [-2.2, RH, -2.2], 0.12); facade.span(M.mono, [2.2, 0, -6], [9, RH, -2.2], 0.12); facade.span(M.mono, [-2.2, 30, -6], [2.2, RH, -2.2], 0.12);
  for (let x = -126; x <= 126; x += 12) if (Math.abs(x) > 16) facade.box(M.mono, [x, (1.4 + TOP) / 2, 1.6], [2.4, TOP - 1.4, 3.2], 0.12);
  for (let x = -128; x <= 128; x += 2.4) { const r = ((x + 126) % 12 + 12) % 12; if (Math.abs(x) > 14 && r > 2.2 && r < 9.8) facade.box(M.mono, [x, (1.4 + TOP) / 2, 0.25], [0.6, TOP - 1.4, 0.5], 0.12); }
  for (const sx of [-1, 1]) facade.span(M.mono, [sx * 9, 0, -2.2], [sx * 13, TOP, 9], 0.12);
  facade.span(M.mono, [-9, RH, -1], [9, RH + 2, 1.2], 0.12);
  facade.span(M.mono, [-131, 0, -1], [-13, 1.4, 1.6], 0.12); facade.span(M.mono, [13, 0, -1], [131, 1.4, 1.6], 0.12);
  const shellMeshes = shell.build(EXT);
  const facadeMeshes = facade.build(BOTH);
  // the door: two slabs that part, and the light behind them
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(2.25, 30, 1.2), M.mono), doorR = doorL.clone();
  doorL.position.set(-1.1, 15, -3); doorR.position.set(1.1, 15, -3);
  [doorL, doorR].forEach((d) => { d.castShadow = true; d.receiveShadow = true; BOTH.add(d); });
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 2), transparent: true });
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 30), glowM); doorGlow.position.set(0, 15, -5.8); BOTH.add(doorGlow);
  const seamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.4, 2.8), transparent: true, depthWrite: false });
  const seamDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 30), seamM); seamDoor.position.set(0, 15, -2.37); BOTH.add(seamDoor);
  const haloM = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: `uniform float uI; varying vec2 vUv;
      void main(){ vec2 q = (vUv - vec2(0.5, 0.36))*vec2(1.0, 0.42); float r = length(q);
        float k = exp(-r*r*60.0)*0.9 + exp(-r*14.0)*0.25; k *= smoothstep(0.0, 0.08, vUv.y);
        gl_FragColor = vec4(vec3(1.0, 0.7, 0.42)*k*uI, 1.0); }`,
  });
  const doorHalo = new THREE.Mesh(new THREE.PlaneGeometry(26, 84), haloM); doorHalo.position.set(0, 30, -1.6); doorHalo.renderOrder = 2; BOTH.add(doorHalo);
  const doorSpill = new THREE.PointLight(0xffb070, 0, 90, 1.6); doorSpill.position.set(0, 6, 6); EXT.add(doorSpill);
  // an avenue of standing stones that leads to the door
  {
    const ab = new Batch();
    for (let i = 0; i < 13; i++) for (const sx of [-1, 1]) {
      const z = 64 + i * 42, x = sx * 17, h = 12 + ((i * 7 + (sx > 0 ? 3 : 0)) % 5) * 0.9, y0 = dune(x, z) - 1;
      ab.box(M.mono, [x, y0 + h / 2, z], [2.2, h, 2.2], 0.12);
      ab.box(M.mono, [x, y0 + 0.6, z], [3.6, 1.2, 3.6], 0.12);
      ab.box(M.mono, [x, y0 + h + 0.25, z], [2.6, 0.5, 2.6], 0.12);
    }
    ab.build(EXT);
  }
  // far monuments in the haze, for scale
  for (const [x, z, w, h, d] of [[-760, -1050, 110, 240, 50], [980, -1500, 220, 180, 70], [-1500, -500, 80, 150, 80], [620, -700, 50, 120, 50], [-300, -1900, 300, 110, 70], [1450, -300, 60, 90, 60]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.mono); m.position.set(x, h / 2 - 2, z); EXT.add(m);
  }
  // travellers walking to the door
  const figures = [];
  const cloakG = new THREE.LatheGeometry([[0, 0], [0.34, 0], [0.3, 0.4], [0.24, 1.0], [0.2, 1.4], [0.15, 1.55], [0.12, 1.68], [0.08, 1.78], [0, 1.8]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(cloakG, M.cloak); f.castShadow = true;
    f.userData = { x: [-6.5, 5.4, -4.2][i], z0: [62, 71, 86][i], s: [0.55, 0.5, 0.6][i], ph: i * 1.7 };
    EXT.add(f); figures.push(f);
  }
  // blowing sand
  const SN = tier >= 2 ? 1600 : 700, sP = new Float32Array(SN * 3), sS = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { sP[i * 3] = (rnd() - 0.5) * 120; sP[i * 3 + 1] = rnd() * 2.5; sP[i * 3 + 2] = (rnd() - 0.5) * 120; sS[i] = rnd(); }
  const sandG = new THREE.BufferGeometry(); sandG.setAttribute('position', new THREE.BufferAttribute(sP, 3)); sandG.setAttribute('aS', new THREE.BufferAttribute(sS, 1));
  const sandU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPR: { value: 1 }, uA: { value: 1 } };
  const sandPts = new THREE.Points(sandG, new THREE.ShaderMaterial({
    uniforms: sandU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uPR; uniform vec3 uCam; attribute float aS; varying float vA;
      void main(){ vec3 p = position; p.x = mod(p.x + uTime*(6.0 + aS*6.0) - uCam.x + 60.0, 120.0) - 60.0 + uCam.x; p.z = mod(p.z - uCam.z + 60.0, 120.0) - 60.0 + uCam.z;
        p.y += sin(uTime*2.0 + aS*30.0)*0.15; vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = uPR*(1.0 + aS*1.5)*(6.0/-mv.z); vA = (1.0 - smoothstep(30.0, 60.0, -mv.z))*(0.35 + aS*0.4); }`,
    fragmentShader: 'uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.72, 0.45)*smoothstep(0.5, 0.0, d)*vA*uA, 1.0); }',
  }));
  sandPts.frustumCulled = false; EXT.add(sandPts);

  // ---------- lights ----------
  const sunExt = new THREE.DirectionalLight(0xffb27a, 3.2);
  sunExt.castShadow = true; sunExt.shadow.mapSize.set(tier >= 2 ? 2048 : 1024, tier >= 2 ? 2048 : 1024);
  Object.assign(sunExt.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 10, far: 1600 });
  sunExt.shadow.bias = -0.0004; sunExt.shadow.normalBias = 0.6;
  scene.add(sunExt, sunExt.target);
  const LD = new THREE.Vector3(0.1, -1, 0.3).normalize(); // the direction light travels inside
  const sunInt = new THREE.DirectionalLight(0xffe2b8, 9);
  sunInt.castShadow = true; const SMI = tier >= 2 ? 4096 : tier === 1 ? 2048 : 1024;
  sunInt.shadow.mapSize.set(SMI, SMI);
  sunInt.position.set(0, 60, -95).addScaledVector(LD, -80); sunInt.target.position.set(0, 0, -95).addScaledVector(LD, 0);
  Object.assign(sunInt.shadow.camera, { left: -70, right: 70, top: 110, bottom: -110, near: 10, far: 200 });
  sunInt.shadow.bias = -0.0003; sunInt.shadow.normalBias = 0.05;
  scene.add(sunInt, sunInt.target);
  const hemi = new THREE.HemisphereLight(0x9aa6c4, 0xb07848, 1.0); scene.add(hemi);
  const bayLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffc690, 0, 30, 1.4); scene.add(l); return l; });
  const fillExt = new THREE.DirectionalLight(0xd8c4b0, 0.7); fillExt.position.set(400, 160, 260); scene.add(fillExt);
  scene.fog = new THREE.Fog(0xd2a27a, 40, 2600);
  // a dim environment for reflections on brass and glass: a dark room with bright slits above
  {
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.background = new THREE.Color(0x0a0908);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5, 4) })); s.position.set(0, 18, -25 + i * 10); s.rotation.x = Math.PI / 2; es.add(s); }
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.2, 0.15) })); fl.rotation.x = -Math.PI / 2; fl.position.y = -6; es.add(fl);
    scene.environment = pm.fromScene(es, 0.04).texture; scene.environmentIntensity = 0.35;
  }

  // ---------- the hall ----------
  const B = new Batch();
  const BAYS = [{ z: -30, s: -1 }, { z: -50, s: 1 }, { z: -70, s: -1 }, { z: -90, s: 1 }, { z: -110, s: -1 }];
  const BD = 12, BW = 8, BHt = 26; // bay depth, half width, height
  for (const side of [-1, 1]) {
    const open = BAYS.filter((b) => b.s === side).map((b) => [b.z + BW, b.z - BW]);
    let z = -6;
    for (const [a, b] of [...open, [ZE, ZE]]) { if (z > a) B.span(M.wall, [side * HW, 0, a], [side * (HW + 2), HH + 2, z]); z = b; }
    for (const [a, b] of open) {
      B.span(M.wall, [side * HW, BHt, b], [side * (HW + 2), HH + 2, a]);
      // the bay: back wall, sides, and a roof with a slit
      if (side > 0 && Math.abs((a + b) / 2 - BAYS[1].z) < 1) {
        const sz0 = BAYS[1].z - 5.2;
        B.span(M.wall, [HW + BD, 0, b - 1], [HW + BD + 1.5, BHt + 2, sz0 - 1.5]); B.span(M.wall, [HW + BD, 0, sz0 + 1.5], [HW + BD + 1.5, BHt + 2, a + 1]);
        B.span(M.wall, [HW + BD, 6, sz0 - 1.5], [HW + BD + 1.5, BHt + 2, sz0 + 1.5]);
      } else B.span(M.wall, [side * (HW + BD), 0, b - 1], [side * (HW + BD + 1.5), BHt + 2, a + 1]);
      B.span(M.wall, [side * HW, 0, a], [side * (HW + BD), BHt, a + 1.2]); B.span(M.wall, [side * HW, 0, b - 1.2], [side * (HW + BD), BHt, b]);
      const sz = (a + b) / 2 - 6;
      B.span(M.wall, [side * (HW - 0.5), BHt, sz + 0.7], [side * (HW + BD + 1), BHt + 2, a + 1.2]);
      B.span(M.wall, [side * (HW - 0.5), BHt, b - 1.2], [side * (HW + BD + 1), BHt + 2, sz - 0.7]);
    }
  }
  // end wall with a tall portal, and the last room beyond it
  B.span(M.wall, [-HW - 2, 0, ZE - 2], [-3, HH + 2, ZE]); B.span(M.wall, [3, 0, ZE - 2], [HW + 2, HH + 2, ZE]); B.span(M.wall, [-3, 22, ZE - 2], [3, HH + 2, ZE]);
  const EZ0 = ZE - 2, EZ1 = ZE - 26, EW = 13, EH = 30;
  B.span(M.wall, [-EW - 1.5, 0, EZ1], [-EW, EH + 2, EZ0]); B.span(M.wall, [EW, 0, EZ1], [EW + 1.5, EH + 2, EZ0]); B.span(M.wall, [-EW - 1.5, 0, EZ1 - 1.5], [EW + 1.5, EH + 2, EZ1]);
  // its ceiling: a slit for light, and a square that can open to the sky
  B.span(M.wall, [-EW - 1.5, EH, EZ0 - 0.01], [EW + 1.5, EH + 2, ZE - 8]);
  B.span(M.wall, [-EW - 1.5, EH, ZE - 8], [-4, EH + 2, ZE - 16]); B.span(M.wall, [4, EH, ZE - 8], [EW + 1.5, EH + 2, ZE - 16]);
  B.span(M.wall, [-EW - 1.5, EH, ZE - 16], [EW + 1.5, EH + 2, ZE - 19.3]); B.span(M.wall, [-EW - 1.5, EH, ZE - 20.7], [EW + 1.5, EH + 2, EZ1 - 1.5]);
  // the nave roof: slabs between slits, and a skylight over the core
  const SLITS = []; for (let k = 0; k < 15; k++) SLITS.push(-14 - 10 * k);
  const SKY = { x0: -8.7, x1: 1.3, z0: -148.1, z1: -138.1 };
  {
    let z = -6;
    const slab = (za, zb) => {
      if (za <= zb) return;
      if (zb < SKY.z1 && za > SKY.z0) {
        const a = Math.min(za, SKY.z1), b = Math.max(zb, SKY.z0);
        if (za > a) B.span(M.wall, [-HW - 2, HH, a], [HW + 2, HH + 2, za]);
        if (b > zb) B.span(M.wall, [-HW - 2, HH, zb], [HW + 2, HH + 2, b]);
        B.span(M.wall, [-HW - 2, HH, b], [SKY.x0, HH + 2, a]); B.span(M.wall, [SKY.x1, HH, b], [HW + 2, HH + 2, a]);
      } else B.span(M.wall, [-HW - 2, HH, zb], [HW + 2, HH + 2, za]);
    };
    for (const s of SLITS) { slab(z, s + 0.8); z = s - 0.8; }
    slab(z, ZE - 2);
  }
  // pillars along the walls, between the bays: the rhythm of the room
  for (const side of [-1, 1]) for (let z = -12; z > ZE + 4; z -= 10) {
    if (BAYS.some((b) => b.s === side && Math.abs(b.z - z) < BW + 1.6)) continue;
    B.box(M.wall, [side * (HW - 0.9), HH / 2, z], [1.8, HH, 2.4]);
  }
  const hallMeshes = B.build(INT);
  // the floor, everywhere at y = 0, except where the vault's hatch is
  const HATCH = { x0: -2.6, x1: 2.6, z0: -121, z1: -115 };
  const floorG = [];
  const fpiece = (x0, x1, z0, z1) => { const g = new THREE.PlaneGeometry(x1 - x0, z0 - z1).rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 8, p.getZ(i) / 8); floorG.push(g); };
  fpiece(-HW - BD - 2, HW + BD + 2, 0, HATCH.z1); fpiece(-HW - BD - 2, HATCH.x0, HATCH.z1, HATCH.z0); fpiece(HATCH.x1, HW + BD + 2, HATCH.z1, HATCH.z0);
  fpiece(-HW - BD - 2, HW + BD + 2, HATCH.z0, EZ1 - 1);
  const floorGeo = mergeGeometries(floorG);
  const floor = new THREE.Mesh(floorGeo, floorMat); floor.receiveShadow = true; INT.add(floor);
  const hatchL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 6), floorMat), hatchR = hatchL.clone();
  hatchL.position.set(-1.3, -0.15, -118); hatchR.position.set(1.3, -0.15, -118); hatchL.receiveShadow = hatchR.receiveShadow = true; INT.add(hatchL, hatchR);
  const hatchEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.2, 0.01, 6)), new THREE.LineBasicMaterial({ color: new THREE.Color(1.2, 0.9, 0.6), transparent: true, opacity: 0.35 }));
  hatchEdge.position.set(0, 0.012, -118); INT.add(hatchEdge);
  // the bright sky above the roof, seen through every slit
  const skyInM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.7, 2.1), fog: false });
  const skyIn = new THREE.Mesh(new THREE.PlaneGeometry(120, 157), skyInM);
  skyIn.rotation.x = Math.PI / 2; skyIn.position.set(0, 54, -84.5); INT.add(skyIn);
  const skyIn2 = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), skyInM);
  skyIn2.rotation.x = Math.PI / 2; skyIn2.position.set(0, 40, ZE - 21.5); INT.add(skyIn2);

  // ---------- light: shafts and dust ----------
  const slabs = SLITS.map((z) => ({ x0: -HW, x1: HW, zc: z, w: 1.6, top: HH, gain: 0.55 }));
  BAYS.forEach((b) => slabs.push({ x0: b.s * HW, x1: b.s * (HW + BD), zc: b.z - 6, w: 1.4, top: BHt, gain: 0.8 }));
  slabs.push({ x0: SKY.x0, x1: SKY.x1, zc: (SKY.z0 + SKY.z1) / 2, w: SKY.z1 - SKY.z0, top: HH, gain: 0.22 });
  slabs.push({ x0: -EW, x1: EW, zc: ZE - 20, w: 1.4, top: EH, gain: 0.8 });
  const SH = 40; // the shaft above the last room
  const MOONSLAB = slabs.length;
  slabs.push({ x0: -4, x1: 4, zc: ZE - 12, w: 8, top: EH + SH, gain: 0, vertical: true, color: [0.5, 0.66, 1.0] });
  const shafts = new THREE.Group(); // the light is drawn as a volume in the post pass below
  const DN = tier >= 2 ? 4200 : tier === 1 ? 2200 : 900, dP = new Float32Array(DN * 3), dS = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dP[i * 3] = (rnd() - 0.5) * 2 * HW; dP[i * 3 + 1] = rnd() * 30; dP[i * 3 + 2] = -6 - rnd() * 154; dS[i] = rnd(); }
  const dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(dP, 3)); dustG.setAttribute('aS', new THREE.BufferAttribute(dS, 1));
  const dustU = { uTime: { value: 0 }, uPR: { value: 1 }, uLD: { value: LD }, uA: { value: 1 } };
  const dust = new THREE.Points(dustG, new THREE.ShaderMaterial({
    uniforms: dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uPR; uniform vec3 uLD; attribute float aS; varying float vA;
      void main(){
        vec3 p = position; p.y = mod(p.y + uTime*(0.05 + aS*0.08), 30.0); p.x += sin(uTime*0.13 + aS*40.0)*0.8; p.z += cos(uTime*0.11 + aS*23.0)*0.8;
        // lit if the way back toward the sun passes through a slit in the roof
        float t = (46.0 - p.y)/(-uLD.y); float zc = p.z - uLD.z*t; float u = fract((-14.0 - zc)/10.0 + 0.5) - 0.5;
        float lit = smoothstep(0.1, 0.05, abs(u))*step(abs(p.x - uLD.x*t), 22.0);
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = uPR*(1.2 + aS*2.0)*(7.0/-mv.z);
        vA = (0.05 + lit*0.95)*(0.4 + aS*0.6)*smoothstep(0.8, 3.0, -mv.z)*(1.0 - smoothstep(45.0, 80.0, -mv.z));
      }`,
    fragmentShader: 'uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.85, 0.65)*smoothstep(0.5, 0.0, d)*vA*uA*1.6, 1.0); }',
  }));
  dust.frustumCulled = false; INT.add(dust);

  // ---------- projections: words of light on stone ----------
  const projMats = [];
  function project(t, pos, w, h, rotY, gain = 1.6, parent = INT) {
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.0, 0.86, 0.66).multiplyScalar(gain), fog: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.position.set(...pos); mesh.rotation.y = rotY; mesh.renderOrder = 2; parent.add(mesh);
    projMats.push({ m, base: gain, flick: rnd() * 10 }); return mesh;
  }
  const bayWall = (b) => b.s * (HW + BD - 0.02);
  const PJ = [
    { year: '2021', eyebrow: 'Chapter one · the first door', title: 'Transite Baghoura customs office', lines: ['My first internship.', 'The first time I worked inside a real organisation.'] },
    { year: '2024 – 25', eyebrow: 'Chapter two · education', title: 'Mohamed El Bachir El Ibrahimi University', lines: ['Bachelor · Information Systems & Software Engineering, 2024', 'Master 1 · Business Intelligence, 2025', 'SAP Young Professionals Program, 2025'] },
    { year: '12', eyebrow: 'Chapter three · systems', title: 'What I work with', lines: ['SAP BPC · BW · S/4HANA · SAC · EPM · AfO · ABAP', 'Power BI · Cegid PMI · SQL · Python · Laravel · React'] },
    { year: '2024 →', eyebrow: 'Chapter four · what I build', title: 'Olive Palace · LatinaDZ · Jewelry Store', lines: ['Lead backend developer, full-stack, and a team of four to six', 'developers I lead remotely, in sprints and code reviews.'] },
    { year: '2025', eyebrow: 'Chapter five · Géant Electronics', title: 'The stock incident', lines: ['Network delays corrupted the stock of nearly every article.', 'Production stopped. I found the drift, then built the repair.'] },
  ];
  const bayProj = BAYS.map((b, i) => project(projection({ ...PJ[i], fonts }), [bayWall(b), 13, b.z], 15, 7.5, b.s < 0 ? Math.PI / 2 : -Math.PI / 2));
  const geantFixedTex = projection({ year: '2025', eyebrow: 'Chapter five · repaired', title: 'Accurate stock, company-wide', lines: ['4–6 Power BI dashboards · ~30% faster platform', '30–50 users supported · 10–20 staff onboarded'], fonts });
  project(projection({ eyebrow: 'Today · CNPC / Beijing Richfit International', title: 'SAP BPC consultant · Sonatrach SHONE', lines: ['Planning, consolidation and reporting.', 'Six streams of work, one consolidated view.'], align: 'center', fonts }), [0, 32, ZE + 0.05], 20, 10, 0, 1.5);
  project(projection({ eyebrow: 'Next', title: 'Open to SAP roles worldwide', lines: [EMAIL, 'LinkedIn · abdelkrim-ghebouli'], align: 'center', fonts }), [0, 13, EZ1 + 0.05], 22, 11, 0, 1.7);

  // ---------- the bays ----------
  const IB = new Batch();
  // 1 · the first door: a stone frame with light pouring through it
  {
    const b = BAYS[0], x = b.s * (HW + 6), z = b.z - 3;
    IB.box(M.stone, [x, 3.6, z - 1.9], [1.1, 7.2, 0.8]); IB.box(M.stone, [x, 3.6, z + 1.9], [1.1, 7.2, 0.8]); IB.box(M.stone, [x, 7.6, z], [1.1, 0.8, 4.6]);
    const lightIn = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 7.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.6, 1.8) })); lightIn.position.set(x - b.s * 0.1, 3.6, z); lightIn.rotation.y = Math.PI / 2 * b.s; INT.add(lightIn);
    hotspot('door1', [x, 3.6, z], [1.6, 7.2, 4.2], 'The first door · 2021', { anchor: [x, 8.6, z] });
  }
  // 2 · three standing stones for two degrees and a program, and a seam in the wall
  const steles = [];
  {
    const b = BAYS[1], xs = b.s * (HW + 7);
    [[b.z + 3.2, 5.0, 'BACHELOR · 2024', 'Information Systems'], [b.z, 6.4, 'MASTER 1 · 2025', 'Business Intelligence'], [b.z - 3.2, 4.2, 'SAP YP · 2025', 'Young Professionals']].forEach(([z, h, t1, t2]) => {
      IB.box(M.stone, [xs, h / 2, z], [0.45, h, 1.5]);
      const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 1024); g.fillStyle = '#fff'; g.textAlign = 'center';
      g.save(); g.translate(128, 512); g.rotate(-Math.PI / 2); g.font = `600 52px ${fonts.display}`; try { g.fontStretch = 'expanded'; } catch {} g.fillText(t1, 0, -14); g.font = `400 36px ${fonts.body}`; g.globalAlpha = 0.7; g.fillText(t2, 0, 42); g.restore();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, h * 0.9), new THREE.MeshBasicMaterial({ map: tex(c, { repeat: false }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.6, 1.3, 0.9) }));
      m.position.set(xs - b.s * 0.24, h / 2, z); m.rotation.y = -b.s * Math.PI / 2; INT.add(m); steles.push(m);
    });
    hotspot('edu', [xs, 3, b.z], [1.2, 6.4, 9], 'Two degrees · a program', { anchor: [xs, 7.3, b.z] });
  }
  // the seam: a panel in the back wall that sinks into the floor
  const seamX = HW + BD - 0.05, seamZ = BAYS[1].z - 5.2;
  const seamPanel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 3), M.wall); seamPanel.position.set(seamX + 0.1, 3, seamZ); seamPanel.castShadow = seamPanel.receiveShadow = true; INT.add(seamPanel);
  const seamLine = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.2), transparent: true, opacity: 0.5 }));
  seamLine.position.set(seamX - 0.02, 3, seamZ + 1.5); seamLine.rotation.y = -Math.PI / 2; INT.add(seamLine);
  const seamHot = hotspot('seam', [seamX - 0.3, 3, seamZ], [0.6, 6, 3.4], 'A seam in the wall', { anchor: [seamX - 0.4, 6.6, seamZ], secret: true });
  // 3 · the wall of systems: twelve stones that power on
  const sysStones = [];
  const sysGlow = [];
  {
    const b = BAYS[2], xw = b.s * (HW + BD - 0.3);
    const atlas = document.createElement('canvas'); atlas.width = 1024; atlas.height = 768; const g = atlas.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 768); g.textAlign = 'center'; g.textBaseline = 'middle';
    SKILLS.forEach(([n], i) => { const cx = (i % 4) * 256 + 128, cy = Math.floor(i / 4) * 256 + 128; g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalAlpha = 0.5; g.strokeRect(cx - 104, cy - 104, 208, 208); g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = `600 ${n.length > 8 ? 30 : 36}px ${fonts.display}`; try { g.fontStretch = 'expanded'; } catch {} g.fillText(n.toUpperCase(), cx, cy); g.font = `400 18px ${fonts.mono}`; g.globalAlpha = 0.6; g.fillText(String(i + 1).padStart(2, '0'), cx, cy + 70); g.globalAlpha = 1; });
    const at = tex(atlas, { repeat: false });
    SKILLS.forEach(([n], i) => {
      const col = i % 4, row = Math.floor(i / 4), z = b.z + (col - 1.5) * 3.1 * -b.s, y = 1.6 + (2 - row) * 2.9;
      IB.box(M.stone, [xw + b.s * 0.1, y, z], [0.7, 2.7, 2.7]);
      const g2 = new THREE.PlaneGeometry(2.5, 2.5), uv = g2.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / 4, 1 - (row + 1 - uv.getY(k)) / 3);
      const m = new THREE.MeshBasicMaterial({ map: at, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.25, 0.22, 0.18) });
      const mesh = new THREE.Mesh(g2, m); mesh.position.set(xw - b.s * 0.27, y, z); mesh.rotation.y = -b.s * Math.PI / 2; INT.add(mesh);
      sysStones.push({ m, on: 0, t: 0 });
      hotspot(`sys-${i}`, [xw - b.s * 0.4, y, z], [0.4, 2.7, 2.7], n, { anchor: [xw - b.s * 0.5, y + 1.0, z], small: true });
    });
  }
  // 4 · projects on screens of light, the team's table, and an office door
  {
    const b = BAYS[3], xs = b.s * (HW + 8);
    [['olive', 'd-olive', 3.4], ['latina', 'd-latina', 0], ['jewel', 'd-jewelry', -3.4]].forEach(([id, d, dz], i) => {
      const c = canv?.[d]?.canvas; const t = c ? new THREE.CanvasTexture(c) : null; if (t) t.colorSpace = THREE.SRGBColorSpace;
      const y = 5.4 + (i === 1 ? 0.6 : 0);
      IB.box(M.dark, [xs + b.s * 0.12, y, b.z + dz], [0.12, 2.2, 3.3]);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.94), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.3, 1.25, 1.2) }));
      scr.position.set(xs, y, b.z + dz); scr.rotation.y = -b.s * Math.PI / 2; INT.add(scr);
      hotspot(id, [xs, y, b.z + dz], [0.4, 2.1, 3.2], ['Olive Palace', 'LatinaDZ', 'Jewelry Store'][i], { anchor: [xs - b.s * 0.3, y + 1.4, b.z + dz] });
    });
    IB.box(M.stone, [b.s * (HW + 3.4), 0.42, b.z], [1.4, 0.84, 9]);
    for (let k = 0; k < 6; k++) IB.box(M.stone, [b.s * (HW + 2.0), 0.24, b.z - 3.5 + k * 1.4], [0.5, 0.48, 0.5]);
    hotspot('team', [b.s * (HW + 3), 0.6, b.z], [3, 1.4, 9.2], 'The team · 4–6 developers', { anchor: [b.s * (HW + 3), 1.8, b.z + 3] });
    // the office door, warm light under it
    const dz = b.z - BW + 1.4, dx = b.s * (HW + BD - 0.05);
    IB.box(M.dark, [dx, 1.3, dz + 0.6], [0.1, 2.6, 1.3]);
    const leak = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.2, 1.6) })); leak.position.set(dx - b.s * 0.07, 0.03, dz + 0.6); leak.rotation.y = -b.s * Math.PI / 2; INT.add(leak);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.8) })); plate.position.set(dx - b.s * 0.07, 1.75, dz + 0.6); plate.rotation.y = -b.s * Math.PI / 2; INT.add(plate);
    hotspot('office', [dx - b.s * 0.3, 1.3, dz + 0.6], [0.5, 2.6, 1.3], 'Office · The Desk', { anchor: [dx - b.s * 0.5, 2.9, dz + 0.6], small: true });
  }
  // 5 · Géant: a wall of stock blocks, a few of them out of place and burning red
  const stock = [];
  const stockM = new THREE.MeshStandardMaterial({ map: C1.map, roughness: 0.75, color: 0x9c9183 });
  const stockMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), stockM, 18);
  {
    const b = BAYS[4], xs = b.s * (HW + 8.5);
    for (let i = 0; i < 18; i++) {
      const col = i % 6, row = Math.floor(i / 6), z = b.z + (col - 2.5) * 1.6, y = 0.76 + row * 1.56;
      const bad = [3, 8, 10, 15].includes(i);
      stock.push({ home: new THREE.Vector3(xs, y, z), off: bad ? new THREE.Vector3(-b.s * (0.5 + rnd() * 0.9), (rnd() - 0.3) * 0.5, (rnd() - 0.5) * 0.6) : new THREE.Vector3(), rot: bad ? (rnd() - 0.5) * 0.7 : 0, bad });
    }
    stockMesh.castShadow = true; stockMesh.receiveShadow = true; INT.add(stockMesh);
    hotspot('geant', [xs, 2.4, b.z], [2.4, 4.8, 10], 'Géant Electronics · the stock', { anchor: [xs, 5.6, b.z] });
  }
  const errM = new THREE.Color(3.2, 0.25, 0.1), okM = new THREE.Color(0.62, 0.57, 0.51);

  // ---------- the core: a pool, six sources, and the cube they fill ----------
  const CORE = new THREE.Vector3(0, 9, -132);
  IB.at(new THREE.CylinderGeometry(9.6, 9.8, 0.36, 64, 1, true), M.stone, [0, 0.18, CORE.z]);
  IB.at(new THREE.RingGeometry(9.0, 9.8, 64).rotateX(-Math.PI / 2), M.stone, [0, 0.36, CORE.z]);
  const water = new THREE.Mesh(new THREE.CircleGeometry(9.05, 64).rotateX(-Math.PI / 2), waterMat); water.position.set(0, 0.22, CORE.z); water.receiveShadow = true; INT.add(water);
  const pillars = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, x = Math.cos(a) * 14, z = CORE.z + Math.sin(a) * 14;
    IB.box(M.stone, [x, 2.75, z], [1.3, 5.5, 1.3], 0.21, -a);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 4.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.3, 0.2) }));
    slot.position.set(x - Math.cos(a) * 0.66, 2.8, z - Math.sin(a) * 0.66); slot.lookAt(CORE.x, 2.8, CORE.z); INT.add(slot);
    pillars.push({ x, z, a, slot, open: 0, target: 0 });
    hotspot(`stream-${i}`, [x, 2.75, z], [1.6, 5.6, 1.6], STREAMS[i][0], { anchor: [x, 6.4, z] });
  }
  IB.build(INT);
  // the cube of the consolidated view
  const cube = new THREE.Group(); cube.position.copy(CORE); INT.add(cube);
  const cubeIn = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.7) }));
  const cubeOut = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), M.glass);
  const cubeEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3, 3, 3)), new THREE.LineBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.1) }));
  cube.add(cubeIn, cubeOut, cubeEdge);
  hotspot('core', [CORE.x, CORE.y, CORE.z], [3.4, 3.4, 3.4], 'SHONE · the consolidated view', { anchor: [CORE.x, CORE.y + 2.6, CORE.z] });
  // six streams of light from the sources into the cube
  const PER = tier >= 2 ? 520 : tier === 1 ? 260 : 120, SC = PER * 6;
  const stP = new Float32Array(SC * 3), stA = new Float32Array(SC * 3);
  for (let i = 0; i < SC; i++) { stA[i * 3] = Math.floor(i / PER); stA[i * 3 + 1] = rnd(); stA[i * 3 + 2] = rnd(); }
  const stG = new THREE.BufferGeometry(); stG.setAttribute('position', new THREE.BufferAttribute(stP, 3)); stG.setAttribute('aI', new THREE.BufferAttribute(stA, 3));
  const stU = { uTime: { value: 0 }, uPR: { value: 1 }, uOpen: { value: new Array(6).fill(0) }, uSrc: { value: pillars.map((p) => new THREE.Vector3(p.x, 5.6, p.z)) }, uCore: { value: CORE }, uAll: { value: 0 } };
  const streams = new THREE.Points(stG, new THREE.ShaderMaterial({
    uniforms: stU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uPR, uOpen[6], uAll; uniform vec3 uSrc[6], uCore; attribute vec3 aI; varying float vA;
      void main(){
        int k = int(aI.x + 0.5); float open = uOpen[k];
        vec3 A = uSrc[k], Cc = uCore;
        vec3 mid = mix(A, Cc, 0.5) + vec3(0.0, 4.0 + aI.z*1.5, 0.0);
        float t = fract(uTime*(0.12 + aI.y*0.05)*(0.4 + open) + aI.y);
        vec3 p = mix(mix(A, mid, t), mix(mid, Cc, t), t);
        float wob = (aI.z - 0.5)*0.5*(1.0 - t);
        p += vec3(sin(t*20.0 + aI.y*30.0), cos(t*17.0 + aI.z*20.0), sin(t*13.0 + aI.y*11.0))*wob;
        vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = uPR*(1.4 + aI.z*2.2)*(9.0/-mv.z);
        vA = (0.06 + open*0.94)*smoothstep(0.0, 0.08, t)*(0.5 + 0.5*t);
      }`,
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.78, 0.48)*smoothstep(0.5, 0.0, d)*vA*2.2, 1.0); }',
  }));
  streams.frustumCulled = false; INT.add(streams);
  // light from the pool, dancing on the ceiling above it
  const caustU = { uTime: { value: 0 }, uI: { value: 0.5 } };
  const caust = new THREE.Mesh(new THREE.PlaneGeometry(44, 40), new THREE.ShaderMaterial({
    uniforms: caustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uI; varying vec2 vUv;
      float c(vec2 p){ float s = 0.0; for (int i = 0; i < 3; i++) { float fi = float(i); p += vec2(sin(p.y*1.3 + uTime*0.6 + fi), cos(p.x*1.1 - uTime*0.5 + fi*1.7)); s += 1.0/(1.0 + 6.0*abs(sin(p.x + p.y*0.5))); } return s/3.0; }
      void main(){ vec2 p = (vUv - 0.5)*vec2(22.0, 20.0); float k = pow(c(p*0.9), 3.0)*smoothstep(0.5, 0.15, length(vUv - 0.5)); gl_FragColor = vec4(vec3(1.0, 0.85, 0.6)*k*uI, 1.0); }`,
  }));
  caust.rotation.x = Math.PI / 2; caust.position.set(0, HH - 0.05, CORE.z); INT.add(caust);

  // ---------- the vault, beneath the floor ----------
  const VB = new Batch();
  const VY = -10.5;
  VB.span(M.wall, [-9, VY - 1, -138], [9, VY, -112]); VB.span(M.wall, [-10, VY, -138], [-9, 0, -112]); VB.span(M.wall, [9, VY, -138], [10, 0, -112]);
  VB.span(M.wall, [-10, VY, -139], [10, 0, -138]); VB.span(M.wall, [-10, VY, -112], [10, 0, -111]);
  VB.span(M.wall, [-10, -0.4, -139], [10, -0.02, -121]); VB.span(M.wall, [-10, -0.4, -115], [10, -0.02, -111]);
  VB.span(M.wall, [-10, -0.4, -121], [-2.6, -0.02, -115]); VB.span(M.wall, [2.6, -0.4, -121], [10, -0.02, -115]);
  for (let k = 0; k < 14; k++) VB.box(M.stone, [0, -0.375 - k * 0.75, -115.6 - k * 0.8], [5, 0.3, 0.8]);
  const certs = [];
  CERTS.forEach(([code, name, role], i) => {
    const x = (i - 1.5) * 3.6;
    VB.box(M.stone, [x, VY + 0.5, -133], [1.6, 1, 1]);
    const c = document.createElement('canvas'); c.width = 512; c.height = 768; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 768); g.strokeStyle = '#fff'; g.globalAlpha = 0.6; g.lineWidth = 3; g.strokeRect(24, 24, 464, 720); g.globalAlpha = 1;
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `500 22px ${fonts.mono}`; g.globalAlpha = 0.7; g.fillText('SAP CERTIFIED', 256, 120); g.globalAlpha = 1;
    g.font = `600 ${code.length > 8 ? 44 : 64}px ${fonts.display}`; try { g.fontStretch = 'expanded'; } catch {} g.fillText(code, 256, 330);
    try { g.fontStretch = 'normal'; } catch {} g.font = `400 34px ${fonts.body}`; g.fillText(name, 256, 430); g.globalAlpha = 0.65; g.font = `400 26px ${fonts.body}`; g.fillText(role, 256, 480);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.7), new THREE.MeshBasicMaterial({ map: tex(c, { repeat: false }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.5, 1.25, 0.95) }));
    m.position.set(x, VY + 2.6, -133); INT.add(m); certs.push(m);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.8, 0.06), M.glass); glass.position.set(x, VY + 2.6, -133.05); INT.add(glass);
    hotspot(`cert-${i}`, [x, VY + 2.6, -133], [2, 2.9, 0.4], code, { anchor: [x, VY + 4.4, -133], vault: true });
  });
  VB.build(INT);
  const vaultLight = new THREE.PointLight(0xffc98a, 0, 22, 1.6); vaultLight.position.set(0, VY + 6, -126); INT.add(vaultLight);
  const hatchHot = hotspot('hatch', [0, 0.1, -118], [5.2, 0.3, 6], 'Sealed', { anchor: [0, 0.9, -118], small: true });

  // ---------- the archive, behind the seam ----------
  const AB = new Batch();
  const AX0 = HW + BD + 1.5, AX1 = AX0 + 16, AZ0 = BAYS[1].z - 9, AZ1 = BAYS[1].z + 5, AH = 14;
  AB.span(M.wall, [AX0, -0.01, AZ0], [AX1, 0.01, AZ1], 0.21);
  AB.span(M.wall, [AX1, 0, AZ0], [AX1 + 1, AH, AZ1]); AB.span(M.wall, [AX0, 0, AZ0 - 1], [AX1 + 1, AH, AZ0]); AB.span(M.wall, [AX0, 0, AZ1], [AX1 + 1, AH, AZ1 + 1]);
  AB.span(M.wall, [AX0, AH, AZ0 - 1], [AX1 + 1, AH + 1, BAYS[1].z - 2.4]); AB.span(M.wall, [AX0, AH, BAYS[1].z - 1.2], [AX1 + 1, AH + 1, AZ1 + 1]);
  AB.box(M.stone, [AX0 + 6, 0.25, BAYS[1].z - 2], [3, 0.5, 0.8]);
  AB.build(INT);
  const portraitT = new THREE.TextureLoader().load(meURL); portraitT.colorSpace = THREE.SRGBColorSpace;
  const portraitM = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: portraitT }, uTime: { value: 0 }, uI: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tMap; uniform float uTime, uI; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tMap, vUv).rgb; float l = dot(c, vec3(0.3, 0.55, 0.15)); float scan = 0.82 + 0.18*sin(vUv.y*420.0);
        float edge = smoothstep(0.0, 0.08, vUv.x)*smoothstep(1.0, 0.92, vUv.x)*smoothstep(0.0, 0.06, vUv.y)*smoothstep(1.0, 0.94, vUv.y);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.6)*pow(l, 1.3)*scan*edge*uI*1.7, 1.0); }`,
  });
  const portrait = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 6.4), portraitM); portrait.position.set(AX1 - 0.05, 5.4, BAYS[1].z - 4.5); portrait.rotation.y = -Math.PI / 2; INT.add(portrait);
  project(projection({ eyebrow: 'Origin · 36.07° N 4.76° E', title: 'Bordj Bou Arreridj', lines: ['Where I come from, and where I learned to work.', 'Arabic, English, French.', 'Open to SAP consultant roles internationally.'], fonts }), [AX1 - 0.05, 5.4, BAYS[1].z + 1.8], 8, 4, -Math.PI / 2, 1.5);
  hotspot('portrait', [AX1 - 0.3, 5.4, BAYS[1].z - 4.5], [0.4, 6.4, 5.2], 'Where I come from', { anchor: [AX1 - 0.5, 9, BAYS[1].z - 4.5], archive: true });
  const archLight = new THREE.PointLight(0xffc28a, 0, 18, 1.6); archLight.position.set(AX0 + 7, 9, BAYS[1].z - 2); INT.add(archLight);

  // ---------- the last room: a dark shaft in the ceiling, capped forty metres up; the cap opens onto the night ----------
  // the shaft is lit only by what comes down it (no daylight reaches in here): darker below, cold moonlight above once it opens
  const shaftM = new THREE.MeshBasicMaterial({ map: C1.map, vertexColors: true, color: 0x000000 });
  {
    const sb = new Batch();
    sb.span(shaftM, [-5.5, EH + 2, ZE - 6.5], [-4, EH + SH, ZE - 17.5]); sb.span(shaftM, [4, EH + 2, ZE - 6.5], [5.5, EH + SH, ZE - 17.5]);
    sb.span(shaftM, [-4, EH + 2, ZE - 8], [4, EH + SH, ZE - 6.5]); sb.span(shaftM, [-4, EH + 2, ZE - 17.5], [4, EH + SH, ZE - 16]);
    const [m] = sb.build(INT, { cast: false, receive: false });
    const pp = m.geometry.attributes.position, col = new Float32Array(pp.count * 3);
    for (let i = 0; i < pp.count; i++) { const t = clamp((pp.getY(i) - EH) / SH, 0, 1); const k = 0.12 + 0.88 * Math.pow(t, 1.8); col.set([k, k, k], i * 3); }
    m.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const lidM = new THREE.MeshBasicMaterial({ color: 0x0b0908 });
  const lidL = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 9.6), lidM), lidR = lidL.clone();
  lidL.position.set(-2.1, EH + SH + 0.6, ZE - 12); lidR.position.set(2.1, EH + SH + 0.6, ZE - 12); INT.add(lidL, lidR);
  const nightU = { uTime: { value: 0 }, uI: { value: 0 } };
  const nightSky = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShaderMaterial({
    uniforms: nightU, fog: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uTime, uI; varying vec3 vW;
      float h1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)))*43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
        return mix(mix(mix(h1(i), h1(i + vec3(1,0,0)), f.x), mix(h1(i + vec3(0,1,0)), h1(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h1(i + vec3(0,0,1)), h1(i + vec3(1,0,1)), f.x), mix(h1(i + vec3(0,1,1)), h1(i + vec3(1,1,1)), f.x), f.y), f.z); }
      vec3 stars(vec3 d, float sc, float thr, float size, float gain){
        vec3 g = d*sc, id = floor(g), f = fract(g) - 0.5; float r = h1(id + sc);
        if (r < thr) return vec3(0.0);
        vec3 o = vec3(h1(id + 1.3), h1(id + 2.7), h1(id + 4.1)) - 0.5;
        float s = smoothstep(size, 0.0, length(f - o*0.5));
        float tw = 0.7 + 0.3*sin(uTime*(1.2 + r*3.0) + r*80.0);
        vec3 col = mix(vec3(0.72, 0.84, 1.3), vec3(1.3, 1.02, 0.78), h1(id + 9.0));
        return col*s*tw*gain*(0.4 + (r - thr)/(1.0 - thr));
      }
      void main(){
        vec3 d = normalize(vW - cameraPosition);
        vec3 c = mix(vec3(0.006, 0.008, 0.02), vec3(0.016, 0.022, 0.05), smoothstep(0.7, 1.0, d.y));
        // the galaxy: a band through the zenith, mottled, with dark lanes of dust
        vec3 bn = normalize(vec3(0.8, 0.05, 0.6)); float bd = dot(d, bn), band = exp(-bd*bd*26.0);
        float neb = n3(d*6.0)*0.5 + n3(d*15.0)*0.3 + n3(d*38.0)*0.2, lane = smoothstep(0.5, 0.78, n3(d*9.0 + 4.0))*exp(-bd*bd*120.0);
        c += vec3(0.2, 0.2, 0.28)*band*neb*neb*1.6*(1.0 - 0.85*lane);
        c += stars(d, 70.0, 0.86, 0.2, 7.0) + stars(d, 150.0, 0.8 - band*0.1, 0.17, 3.2) + stars(d, 260.0, 0.72 - band*0.3, 0.15, 1.6);
        // the moon, almost overhead
        vec3 md = normalize(vec3(0.042, 1.0, 0.036)); float a = acos(clamp(dot(d, md), -1.0, 1.0));
        float disk = smoothstep(0.026, 0.0235, a);
        float mare = 0.82 + 0.18*n3(d*140.0) - 0.22*smoothstep(0.45, 0.7, n3(d*60.0 + 2.0));
        c = mix(c, vec3(2.4, 2.45, 2.6)*mare, disk);
        c += vec3(0.35, 0.45, 0.7)*exp(-a*45.0)*0.22 + vec3(0.1, 0.13, 0.24)*exp(-a*9.0)*0.1;
        gl_FragColor = vec4(c*uI, 1.0);
      }`,
  }));
  nightSky.rotation.x = Math.PI / 2; nightSky.position.set(0, EH + SH + 8, ZE - 12); INT.add(nightSky);
  const moon = new THREE.SpotLight(0x9fb6ff, 0, 130, 0.09, 0.6, 1.2); moon.position.set(0, EH + SH - 1, ZE - 12); moon.target.position.set(0, 0, ZE - 12); INT.add(moon, moon.target);
  hotspot('sky', [0, EH - 0.2, ZE - 12], [8, 0.4, 8.2], 'Look up · the Night', { anchor: [0, EH - 3, ZE - 12] });
  hotspot('contact', [0, 13, EZ1 + 0.4], [22, 11, 0.6], 'Write to me', { anchor: [-8, 19.6, EZ1 + 0.4] });

  const STOP_OF = { door1: 3, edu: 4, seam: 4, olive: 6, latina: 6, jewel: 6, team: 6, office: 6, geant: 7, core: 8, hatch: 8, sky: 9, contact: 9 };
  hot.forEach((h) => { h.stop = STOP_OF[h.id] ?? (h.id.startsWith('sys-') ? 5 : h.id.startsWith('stream-') ? 8 : null); });

  // ---------- NOOR: a ring of light that walks with you ----------
  const noor = new THREE.Group();
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.3), depthTest: false, transparent: true });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.005, 8, 96), ringM); noor.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.0025, 6, 72), ringM); noor.add(ring2);
  const NP = 70, nPos = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) { const a = rnd() * 6.28, r = 0.13 + rnd() * 0.06; nPos.set([Math.cos(a) * r, (rnd() - 0.5) * 0.08, Math.sin(a) * r], i * 3); }
  const nG = new THREE.BufferGeometry(); nG.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  const nPts = new THREE.Points(nG, new THREE.PointsMaterial({ color: new THREE.Color(2, 1.6, 1.1), size: 0.012, depthTest: false, transparent: true, blending: THREE.AdditiveBlending })); noor.add(nPts);
  noor.renderOrder = 20; noor.traverse((o) => { o.renderOrder = 20; o.frustumCulled = false; }); noor.visible = false; scene.add(noor);
  let noorTalk = 0, noorShow = 0;

  // ---------- bloom and light rays ----------
  const rt0 = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: tier >= 2 ? 4 : tier === 1 ? 2 : 0, depthTexture: new THREE.DepthTexture(4, 4) });
  const composer = new EffectComposer(renderer, rt0); composer.renderToScreen = false;
  composer.addPass(new RenderPass(scene, camera));
  // light in the air: for every pixel, how far the view ray travels inside each beam that falls through a slit,
  // solved exactly (each beam is a slab sheared along the light), stopped by whatever the ray hits
  const NS = slabs.length;
  const volU = {
    tDiffuse: { value: null }, tDepth: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
    uI: { value: 0 }, uTime: { value: 0 },
    uSlab: { value: slabs.map((q) => new THREE.Vector4(q.zc, q.w, Math.min(q.x0, q.x1), Math.max(q.x0, q.x1))) },
    uSlabB: { value: slabs.map((q) => new THREE.Vector4(q.top, q.gain, q.vertical ? 0 : LD.x / -LD.y, q.vertical ? 0 : LD.z / -LD.y)) },
    uSlabC: { value: slabs.map((q) => new THREE.Vector3(...(q.color || [1.0, 0.8, 0.56]))) },
  };
  const vol = new ShaderPass({
    uniforms: volU,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `#define NS ${NS}
      uniform sampler2D tDiffuse, tDepth; uniform mat4 uInvProj, uCamWorld; uniform vec3 uCam; uniform float uI, uTime;
      uniform vec4 uSlab[NS]; uniform vec4 uSlabB[NS]; uniform vec3 uSlabC[NS]; varying vec2 vUv;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719)))*43758.5453); }
      float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      vec2 span(float a, float b, float lo, float hi){ if (abs(b) < 1e-5) return (a >= lo && a <= hi) ? vec2(-1e6, 1e6) : vec2(1.0, -1.0); float s0 = (lo - a)/b, s1 = (hi - a)/b; return vec2(min(s0, s1), max(s0, s1)); }
      void main(){
        vec3 base = texture2D(tDiffuse, vUv).rgb;
        if (uI < 0.001) { gl_FragColor = vec4(base, 1.0); return; }
        float d = texture2D(tDepth, vUv).x;
        vec4 vp = uInvProj*vec4(vUv*2.0 - 1.0, d*2.0 - 1.0, 1.0); vp /= vp.w;
        vec3 wp = (uCamWorld*vp).xyz, ro = uCam, rd = wp - ro; float maxS = length(rd); rd /= maxS; if (d >= 1.0) maxS = 300.0;
        vec3 acc = vec3(0.0);
        for (int i = 0; i < NS; i++) {
          vec4 S = uSlab[i]; vec4 T = uSlabB[i];
          if (T.y < 0.001) continue;
          float top = T.x;
          float az = ro.z - (top - ro.y)*T.w, bz = rd.z + rd.y*T.w;
          float ax = ro.x - (top - ro.y)*T.z, bx = rd.x + rd.y*T.z;
          vec2 sy = span(ro.y, rd.y, 0.0, top), sx = span(ax, bx, S.z, S.w);
          vec2 lim = vec2(max(max(sy.x, sx.x), 0.0), min(min(sy.y, sx.y), maxS));
          if (lim.y <= lim.x) continue;
          vec2 core = span(az, bz, S.x - S.y*0.5, S.x + S.y*0.5), halo = span(az, bz, S.x - S.y*1.3, S.x + S.y*1.3);
          float a0 = max(core.x, lim.x), a1 = min(core.y, lim.y), b0 = max(halo.x, lim.x), b1 = min(halo.y, lim.y);
          float lc = max(a1 - a0, 0.0), lh = max(b1 - b0, 0.0);
          if (lh <= 0.0) continue;
          float sm = (lc > 0.0 ? (a0 + a1) : (b0 + b1))*0.5;
          vec3 mp = ro + rd*sm;
          float fall = mix(0.3, 1.0, clamp(mp.y/top, 0.0, 1.0));
          float n = vn3(mp*0.32 + vec3(0.0, -uTime*0.22, uTime*0.1))*0.65 + vn3(mp*1.1 + vec3(uTime*0.15, 0.0, 0.0))*0.35;
          acc += uSlabC[i]*(lc*0.8 + (lh - lc)*0.1)*T.y*fall*(0.35 + 1.3*n*n);
        }
        gl_FragColor = vec4(base + acc*0.022*uI, 1.0);
      }`,
  });
  vol.uniforms = volU; vol.material.uniforms = volU; // ShaderPass copies uniforms: keep ours live
  const volRender = vol.render.bind(vol);
  vol.render = (r, w, rd, dt2, mask) => { volU.tDepth.value = rd.depthTexture; volRender(r, w, rd, dt2, mask); };
  composer.addPass(vol);
  const rays = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.8) }, uI: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uI, uAspect; varying vec2 vUv;
      void main(){ vec3 base = texture2D(tDiffuse, vUv).rgb; if (uI < 0.001) { gl_FragColor = vec4(base, 1.0); return; }
        vec2 d = (vUv - uSun)/36.0; vec2 p = vUv; float w = 1.0; vec3 acc = vec3(0.0);
        for (int i = 0; i < 36; i++) { p -= d; vec3 s = texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb; float l = max(dot(s, vec3(0.3, 0.5, 0.2)) - 1.1, 0.0); acc += s*l*w; w *= 0.955; }
        float fall = 1.0 - smoothstep(0.0, 1.1, length((vUv - uSun)*vec2(uAspect, 1.0)));
        gl_FragColor = vec4(base + acc*0.035*uI*fall, 1.0); }`,
  });
  composer.addPass(rays);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.9); bloom.enabled = tier > 0; composer.addPass(bloom);

  // ---------- the way through ----------
  const PATH = [
    [0, [0, 44, 480], [0, 40, 0]],
    [0.5, [6, 7.5, 330], [0, 26, 0]],
    [1, [0, 1.7, 256], [0, 50, 0]],
    [1.3, [1.5, 1.75, 28], [0, 12, -10]],
    [1.6, [0, 1.75, 1], [0, 5, -40]],
    [2, [0, 1.75, -12], [0, 10, -70]],
    [2.5, [-3, 1.75, -20], [-20, 8, -32]],
    [3, [-8, 1.75, -27], [-34, 9.5, -31]],
    [3.5, [0, 1.75, -38], [10, 7, -50]],
    [4, [8, 1.75, -47], [34, 9.5, -51]],
    [4.5, [0, 1.75, -58], [-10, 7, -70]],
    [5, [-8, 1.75, -67], [-34, 8.5, -70]],
    [5.5, [0, 1.75, -78], [10, 7, -90]],
    [6, [8, 1.75, -87], [34, 8.5, -90]],
    [6.5, [0, 1.75, -98], [-10, 7, -110]],
    [7, [-8, 1.75, -107], [-34, 8, -110]],
    [7.5, [-2, 1.8, -110.5], [-4, 7, -128]],
    [8, [0, 2.0, -112.5], [0, 8.6, -132]],
    [8.3, [12.5, 1.8, -121], [0, 7, -140]],
    [8.6, [16, 1.8, -142], [2, 6, -166]],
    [8.8, [5, 1.75, -156], [0, 8, -184]],
    [9, [0, 1.75, -164], [0, 10, -186]],
  ];
  const N = STOPS.length - 1;
  const pathPos = new THREE.CatmullRomCurve3(PATH.map((p) => V(p[1])), false, 'centripetal');
  const pathLook = new THREE.CatmullRomCurve3(PATH.map((p) => V(p[2])), false, 'centripetal');
  const S = PATH.map((p) => p[0]);
  const param = (st) => { const n = S.length - 1; if (st <= S[0]) return 0; for (let j = 0; j < n; j++) if (st <= S[j + 1]) return (j + (st - S[j]) / (S[j + 1] - S[j])) / n; return 1; };
  // stop anchors for free walking: which chapter is closest
  const ANCH = [null, null, V([0, 0, -12]), V([-26, 0, -30]), V([26, 0, -50]), V([-26, 0, -70]), V([26, 0, -90]), V([-26, 0, -110]), V([0, 0, -126]), V([0, 0, -172])];

  let stage = 0, stageT = 0, snapT = 0, yaw = 0, pitch = 0, vYaw = 0, vPitch = 0, frame = 1, introAuto = true;
  let mode = 'route', free = null, detour = null, focus = null, focusAmt = 0, soft = 0;
  const P = new THREE.Vector3(...PATH[0][1]), L = new THREE.Vector3(...PATH[0][2]);
  const Pd = new THREE.Vector3(), Ld = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  let F = { mobile: innerWidth / innerHeight < 0.9 || innerWidth < 560 };
  let vaultOpen = 0, vaultT = 0, archOpen = 0, archT = 0, skyOpen = 0, skyT = 0, doorOpen = 0, hallOn = 0, repaired = false, repT = 0;
  const lit = new Array(12).fill(0);

  // ---------- interface ----------
  const ui = document.createElement('div');
  ui.className = 'mn-ui'; ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = `
    <div class="mn-title"><p class="mn-kicker">Abdelkrim Ghebouli · SAP BPC Consultant</p><h1>The Monument</h1><p class="mn-sub">Scroll to approach</p></div>
    <nav class="mn-rail" aria-label="The way through"><ol></ol></nav>
    <section class="mn-noor" aria-label="NOOR, the guide">
      <header><i class="mn-orb" aria-hidden="true"></i><b>NOOR</b><span lang="ar">نور</span><em>guide</em>
        <button type="button" class="mn-voice" aria-pressed="false" title="Let NOOR speak aloud">Voice</button>
        <button type="button" class="mn-min" aria-expanded="true" aria-label="Fold NOOR away">–</button></header>
      <div class="mn-say" aria-live="polite"><p></p></div>
      <div class="mn-chips"></div>
      <form class="mn-ask" autocomplete="off"><input id="mn-q" type="text" placeholder="Ask NOOR about Abdelkrim…" aria-label="Ask NOOR a question" maxlength="160"><button type="submit">Ask</button></form>
    </section>
    <aside class="mn-detail" aria-label="Details" hidden>
      <header><span class="mn-dk"></span><button type="button" class="mn-close" aria-label="Close">Close</button></header>
      <h2 class="mn-dt"></h2><div class="mn-dbody detail-body"></div><div class="mn-dact"></div>
    </aside>
    <button type="button" class="mn-back" hidden>Back to the hall</button>
    <div class="mn-tags"></div>
    <p class="mn-hint"></p>`;
  document.body.appendChild(ui);
  if (/claude\.ai|claudeusercontent/.test(location.hostname)) ui.querySelectorAll('[data-cv]').forEach((e) => e.remove());
  const $ = (s) => ui.querySelector(s);
  const titleEl = $('.mn-title'), railOl = $('.mn-rail ol'), noorEl = $('.mn-noor'), sayP = $('.mn-say p'), chipsEl = $('.mn-chips'), askF = $('.mn-ask'), askI = $('#mn-q');
  const detEl = $('.mn-detail'), dK = $('.mn-dk'), dT = $('.mn-dt'), dBody = $('.mn-dbody'), dAct = $('.mn-dact'), backBtn = $('.mn-back'), tagBox = $('.mn-tags'), hintEl = $('.mn-hint');
  const rail = STOPS.map((s, i) => {
    const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<i aria-hidden="true"></i><span>${String(i + 1).padStart(2, '0')} · ${s.label}</span>`; b.setAttribute('aria-label', `Go to ${s.label}`);
    b.addEventListener('click', () => go(i)); li.appendChild(b); railOl.appendChild(li); return b;
  });
  hintEl.textContent = coarse ? 'Swipe up to walk · drag sideways to look · tap anything with a label' : 'Scroll to walk · drag to look · W A S D to roam · click the floor to go there';
  const H = hot.map((h) => {
    const el = document.createElement('button'); el.type = 'button'; el.className = `mn-tag${h.small ? ' small' : ''}${h.secret ? ' secret' : ''}`; el.tabIndex = -1;
    el.innerHTML = `<i aria-hidden="true"></i><span>${h.label}</span>`;
    el.addEventListener('click', () => activate(h.id)); tagBox.appendChild(el);
    h.el = el; return h;
  });
  const byDepth = H.slice(), placed = [];

  // NOOR speaks: typed out, optionally aloud
  let voiceOn = false, typing = null, asked = 0;
  const vBtn = $('.mn-voice');
  vBtn.addEventListener('click', () => { voiceOn = !voiceOn; vBtn.setAttribute('aria-pressed', String(voiceOn)); vBtn.textContent = voiceOn ? 'Voice on' : 'Voice'; if (!voiceOn) speechSynthesis?.cancel(); else speak(sayP.textContent); });
  $('.mn-min').addEventListener('click', () => { const m = noorEl.classList.toggle('folded'); $('.mn-min').setAttribute('aria-expanded', String(!m)); $('.mn-min').textContent = m ? '+' : '–'; });
  function pickVoice() { const vs = speechSynthesis?.getVoices?.() || []; return vs.find((v) => /en-GB/i.test(v.lang) && /female|libby|sonia|serena|kate|google uk english female/i.test(v.name)) || vs.find((v) => /en-GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)); }
  function speak(text) {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/·/g, ',')); const v = pickVoice(); if (v) u.voice = v; u.rate = 1.0; u.pitch = 1.0; u.onboundary = () => (noorTalk = 1); speechSynthesis.speak(u); } catch {}
  }
  function say(text, chips = [], act = null) {
    clearInterval(typing);
    sayP.textContent = ''; let i = 0; noorTalk = 1;
    const step = reduced ? text.length : 3;
    typing = setInterval(() => { i = Math.min(text.length, i + step); sayP.textContent = text.slice(0, i); noorTalk = 1; if (i >= text.length) clearInterval(typing); }, 22);
    speak(text);
    audio.ui?.('msg');
    const list = [...chips.map((c) => [c, () => ask(c)])];
    if (act && !act.auto && act.label) list.unshift([act.label, () => doAct(act), true]);
    chipsEl.replaceChildren(...list.map(([label, fn, primary]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (primary) b.className = 'primary'; b.addEventListener('click', () => { audio.click?.(); fn(); }); return b; }));
    if (act?.auto) setTimeout(() => doAct(act), 700);
  }
  const special = {
    'Show me the details': () => { const s = STOPS[clamp(Math.round(stage), 0, N)]; if (s.detail) activate(s.detail); },
    'What came next?': () => go(4),
    'Power all systems': () => powerAll(),
    'Repair the stock': () => repair(),
    'Open all six streams': () => openAll(),
    'Copy his email': () => copyEmail(),
    'Download the CV': () => downloadCV(),
    'Look up': () => activate('sky'),
  };
  function ask(q) {
    if (special[q]) { special[q](); return; }
    asked++; if (asked === 5) achieve('noor');
    const a = answer(q);
    if (!a) { say(FALLBACK, ['Who is Abdelkrim?', 'How do I contact him?']); return; }
    say(a.a, a.chips || [], a.act || null);
  }
  askF.addEventListener('submit', (e) => { e.preventDefault(); const q = askI.value.trim(); if (!q) return; askI.value = ''; ask(q); });
  function doAct(a) {
    if (a.go != null) go(a.go);
    if (a.vault) openVault();
    if (a.archive) openArchive();
    if (a.contact) copyEmail();
    if (a.cv) downloadCV();
    if (a.night) activate('sky');
    if (a.worlds) guide?.openPicker?.();
    if (a.streams) openAll();
    if (a.power) powerAll();
  }
  async function copyEmail() { try { await navigator.clipboard.writeText(EMAIL); say(`Copied: ${EMAIL}. He usually answers quickly.`, ['Download the CV']); } catch { say(`His email is ${EMAIL}.`, ['Download the CV']); } achieve('hello'); }
  function downloadCV() { const a = document.createElement('a'); a.href = './Abdelkrim-Ghebouli-CV.pdf'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }

  // the detail panel: the long version of whatever you opened
  let detailId = null;
  function openDetail(id, d, extra = '') {
    detailId = id;
    dK.textContent = d.k || ''; dT.textContent = d.t || '';
    let html = '';
    if (d.shot) { const src = shotFor(d.shot); if (src) html += `<figure class="shot"><img alt="${d.t}" src="${src}"></figure>`; }
    dBody.innerHTML = html + (d.html || tpl(d.tpl)) + extra; dBody.scrollTop = 0;
    const acts = [];
    if (id === 'contact') acts.push(['Copy email', copyEmail, 1], ['LinkedIn', () => open(LINKEDIN, '_blank', 'noopener')], ['CV', downloadCV]);
    if (id === 'geant' && !repaired) acts.push(['Repair the stock', repair, 1]);
    dAct.replaceChildren(...acts.map(([l, fn, p]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; if (p) b.className = 'primary'; b.addEventListener('click', () => { audio.click?.(); fn(); }); return b; }));
    detEl.hidden = false; requestAnimationFrame(() => detEl.classList.add('on'));
    audio.chime?.(3);
  }
  function closeDetail() { if (!detailId) return; detailId = null; detEl.classList.remove('on'); setTimeout(() => { if (!detailId) detEl.hidden = true; }, 300); focus = null; }
  $('.mn-close').addEventListener('click', closeDetail);

  // ---------- doing things ----------
  const hitList = hot.map((h) => h.mesh);
  function activate(id) {
    const h = H.find((x) => x.id === id);
    if (h && !h.vault && !h.archive && mode === 'route' && h.stop != null && Math.abs(stage - h.stop) > 0.6) { go(h.stop); setTimeout(() => activate(id), 1500); return; }
    if (h) focus = h;
    if (id === 'door1') return openDetail(id, DETAILS.door1);
    if (id === 'edu') return openDetail(id, DETAILS.edu);
    if (id === 'seam') return openArchive();
    if (id.startsWith('sys-')) { const i = +id.slice(4); power(i); return openDetail(id, { k: 'System', t: SKILLS[i][0], tpl: SKILLS[i][1] }); }
    if (['olive', 'latina', 'jewel', 'team'].includes(id)) return openDetail(id, DETAILS[id]);
    if (id === 'office') { closeDetail(); const p = projToScreen(h.anchor); travel('desk', p.x, p.y); return; }
    if (id === 'geant') return openDetail(id, repaired ? DETAILS.geantFixed : DETAILS.geant);
    if (id.startsWith('stream-')) { const i = +id.slice(7); openStream(i); return openDetail(id, { k: 'Stream', t: STREAMS[i][0], tpl: [STREAMS[i][1]] }); }
    if (id === 'core') return openDetail(id, DETAILS.core);
    if (id === 'hatch') { if (!vaultOpen) say('It’s sealed. Ask me what’s inside, and I’ll open it.', ['What’s beneath the floor?']); return; }
    if (id.startsWith('cert-')) { const i = +id.slice(5); return openDetail(id, { k: 'SAP certified', t: `${CERTS[i][0]} · ${CERTS[i][1]}`, tpl: [CERTS[i][3]] }); }
    if (id === 'portrait') return openDetail(id, DETAILS.home);
    if (id === 'contact') return openDetail(id, DETAILS.contact);
    if (id === 'sky') { lookUp(); return; }
  }
  function projToScreen(v) { tmp.copy(v).project(camera); return { x: ((tmp.x + 1) / 2) * innerWidth, y: ((1 - tmp.y) / 2) * innerHeight }; }
  function power(i) { if (lit[i]) return; lit[i] = 1; audio.chime?.(i); if (lit.every(Boolean)) { achieve('systems'); say('All twelve systems are on. That is the toolkit he brings to an SAP landscape.', ['Which SAP modules?']); } }
  function powerAll() { if (Math.round(stage) !== 5 && mode === 'route') { go(5); setTimeout(powerAll, 1500); return; } SKILLS.forEach((_, i) => setTimeout(() => power(i), i * 120)); }
  function openStream(i) { const p = pillars[i]; if (p.target) return; p.target = 1; audio.chime?.(i + 2); if (pillars.every((x) => x.target)) { achieve('consolidate'); setTimeout(() => say('Six streams, one view. That is what consolidation means, and it is his daily work on SHONE.', ['What is SHONE?']), 900); } }
  function openAll() { if (Math.round(stage) !== 8 && mode === 'route') { go(8); setTimeout(openAll, 1600); return; } pillars.forEach((_, i) => setTimeout(() => openStream(i), i * 260)); }
  function repair() {
    if (Math.round(stage) !== 7 && mode === 'route') { go(7); setTimeout(repair, 1500); return; }
    if (repaired) return; repaired = true; repT = 0; achieve('repair'); audio.chime?.(6);
    bayProj[4].material.map = geantFixedTex; bayProj[4].material.needsUpdate = true;
    openDetail('geant', DETAILS.geantFixed);
  }
  function openVault() {
    closeDetail(); vaultOpen = 1; audio.thump?.();
    say('The vault. His four SAP certifications are kept here.', ['Back to the hall']);
    setDetour([[0, 2.6, -116.2], [0, -6, -124]], [[0, VY + 1.8, -127.5], [0, VY + 2.6, -134]], 'vault');
    achieve('vault');
  }
  function openArchive() {
    closeDetail(); archOpen = 1; audio.thump?.();
    say('You found the archive. This is where he comes from: Bordj Bou Arreridj.', ['Back to the hall', 'Where is he based?']);
    setDetour([[24, 1.75, BAYS[1].z - 5.2], [40, 2.5, BAYS[1].z - 5]], [[AX0 + 2.5, 1.75, BAYS[1].z - 1.8], [AX1, 4.8, BAYS[1].z - 2.2]], 'archive');
    achieve('archive');
  }
  let skyWait = 7200;
  function lookUp() {
    if (Math.round(stage) !== 9 && mode === 'route') { go(9); setTimeout(lookUp, 1700); return; }
    closeDetail(); skyOpen = 1; audio.whoosh?.();
    say('The same sky he grew up under. Step through, into the Night.', []);
    setDetour([[0, 1.75, ZE - 8.6], [0, EH + SH, ZE - 12.9]], [[0, 14, ZE - 12.1], [0, EH + SH + 30, ZE - 12.5]], 'sky');
    setTimeout(() => { if (skyOpen && on) travel('night', innerWidth / 2, innerHeight * 0.45); }, skyWait);
  }
  special['Back to the hall'] = () => leaveDetour();
  function setDetour(via, to, id) {
    mode = 'detour'; detour = { id, legs: [via, to].filter(Boolean).map(([p, l]) => ({ p: V(p), l: V(l) })), leg: 0 };
    backBtn.hidden = false;
  }
  function leaveDetour() {
    if (mode !== 'detour') return;
    const id = detour.id; const legs = detour.legs.slice(0, -1).reverse();
    mode = 'route'; detour = null; backBtn.hidden = true;
    if (id === 'vault') { stageT = stage = 8; }
    if (id === 'archive') { stageT = stage = 4; }
    if (id === 'sky') { skyOpen = 0; }
    if (legs.length) { mode = 'detour'; detour = { id: 'return', legs, leg: 0, ret: true }; }
    else if (pendingGo != null) { stageT = pendingGo; pendingGo = null; soft = 1; }
    closeDetail(); if (!legs.length) setStop(Math.round(stage), true);
  }
  backBtn.addEventListener('click', () => { audio.click?.(); leaveDetour(); });

  // ---------- input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(x, y, withFloor) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(withFloor ? [...hitList, floor] : hitList, false);
    for (const hit of hits) {
      if (hit.object === floor) return { floor: hit.point };
      const h = H.find((q) => q.mesh === hit.object); if (!h) continue;
      if (h.vault && !vaultOpen) continue; if (h.archive && !archOpen) continue;
      if (hit.distance > 46) continue;
      return { h };
    }
    return null;
  }
  let hover = null, drag = null;
  const keys = new Set();
  let pendingGo = null;
  function go(i) {
    introAuto = false; closeDetail();
    if (mode === 'detour') { pendingGo = i; if (!detour.ret) leaveDetour(); return; }
    if (mode === 'free') { stage = nearestStop(); mode = 'route'; free = null; soft = 1; }
    stageT = clamp(i, 0, N); snapT = performance.now() + 900;
  }
  function toFree() {
    if (mode === 'free') return;
    introAuto = false; closeDetail();
    if (stage < 1.8) { go(2); return; }
    mode = 'free'; free = { p: P.clone().setY(1.75), yaw: Math.atan2(-(L.x - P.x), -(L.z - P.z)), pitch: 0, to: null };
  }
  const walkable = (x, z) => {
    if (z > -6.5 || z < EZ1 + 1) return false;
    if (Math.abs(x) <= HW - 1.4 && z > ZE + 0.8) {
      if (Math.hypot(x, z - CORE.z) < 10.3) return false;
      if (pillars.some((p) => Math.hypot(x - p.x, z - p.z) < 1.5)) return false;
      return true;
    }
    for (const b of BAYS) if (Math.abs(z - b.z) < BW - 1 && x * b.s > 0 && Math.abs(x) < HW + BD - 1.2) {
      if (b === BAYS[3] && Math.abs(x) < HW + 4.5 && Math.abs(z - b.z) < 5) return false;
      if (b === BAYS[4] && Math.abs(x) > HW + 7) return false;
      if (b === BAYS[0] && Math.abs(x) > HW + 4.5 && Math.abs(z - (b.z - 3)) < 2.8) return false;
      if (b === BAYS[1] && Math.abs(x) > HW + 6.2 && Math.abs(x) < HW + 7.8) return false;
      return true;
    }
    if (z <= ZE + 0.8 && z >= ZE - 2.2 && Math.abs(x) < 2.4) return true;
    if (z < ZE - 2.2 && Math.abs(x) < EW - 1) return true;
    return false;
  };
  const L$ = {
    wheel(e) {
      if (overlayOpen() || e.ctrlKey || e.target.closest?.('.mn-detail, .mn-noor, #talk, #guide, #world-panel')) return;
      e.preventDefault(); introAuto = false;
      if (mode === 'free') { stageT = stage = nearestStop(); mode = 'route'; free = null; soft = 1; }
      if (mode === 'detour') { leaveDetour(); return; }
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      stageT = clamp(stageT + d * (e.deltaMode === 1 ? 0.04 : e.deltaMode === 2 ? 0.8 : 0.0011), 0, N);
      snapT = performance.now() + 420;
    },
    down(e) { if (e.button !== 0 || isUI(e.target) || overlayOpen()) return; if (document.activeElement === askI) askI.blur(); drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0, touch: e.pointerType !== 'mouse' }; },
    move(e) {
      if (!drag) { hover = e.pointerType === 'mouse' && !isUI(e.target) ? pick(e.clientX, e.clientY, false)?.h || null : null; return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.touch && mode !== 'free') {
        if (!drag.axis && drag.moved > 10) drag.axis = Math.abs(e.clientX - drag.x0) > Math.abs(e.clientY - drag.y0) ? 'x' : 'y';
        if (drag.axis === 'y') { if (mode === 'detour') { leaveDetour(); drag = null; return; } introAuto = false; stageT = clamp(stageT - dy * 0.004, 0, N); snapT = performance.now() + 500; }
        else if (drag.axis === 'x') { vYaw = dx * 0.004; yaw = clamp(yaw + vYaw, -1.2, 1.2); }
      } else if (drag.moved > 5) {
        if (mode === 'free') { free.yaw += dx * 0.004; free.pitch = clamp(free.pitch + dy * 0.003, -0.6, 0.7); free.to = null; }
        else { vYaw = dx * 0.0032; vPitch = dy * 0.0024; yaw = clamp(yaw + vYaw, -1.2, 1.2); pitch = clamp(pitch + vPitch, -0.45, 0.6); }
      }
    },
    up(e) {
      if (!drag) return; const d = drag; drag = null;
      if (d.moved > 8) return;
      const r = pick(e.clientX, e.clientY, stage > 1.9);
      if (r?.h) activate(r.h.id);
      else if (r?.floor && mode !== 'detour') { if (!walkable(r.floor.x, r.floor.z)) return; toFree(); if (free) { free.to = r.floor.clone().setY(1.75); } }
      else if (stage < 1.6) { introAuto = false; go(stage < 0.9 ? 1 : 2); }
    },
    key(e) {
      if (overlayOpen() || e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (detailId) closeDetail(); else if (mode === 'detour') leaveDetour(); return; }
      if (['w', 'a', 's', 'd'].includes(k)) { keys.add(k); toFree(); if (free) free.to = null; e.preventDefault(); return; }
      if (['arrowdown', 'arrowright', 'pagedown', ' '].includes(k) && !(k === ' ' && e.target.closest('button, a'))) { e.preventDefault(); go(Math.floor((mode === 'free' ? nearestStop() : stageT) + 0.5) + 1); }
      else if (['arrowup', 'arrowleft', 'pageup'].includes(k)) { e.preventDefault(); go(Math.ceil((mode === 'free' ? nearestStop() : stageT) - 0.5) - 1); }
      else if (k === 'home') go(0); else if (k === 'end') go(N);
    },
    keyup(e) { keys.delete(e.key.toLowerCase()); },
    cancel() { drag = null; },
    blur() { keys.clear(); },
  };
  function nearestStop() { let best = 2, bd = Infinity; ANCH.forEach((a, i) => { if (!a) return; const d = Math.hypot(P.x - a.x, P.z - a.z); if (d < bd) { bd = d; best = i; } }); return best; }
  let attached = false;
  const attach = (on2) => { if (on2 === attached) return; attached = on2; const f = on2 ? addEventListener : removeEventListener; f('wheel', L$.wheel, { passive: false }); f('pointerdown', L$.down); f('pointermove', L$.move); f('pointerup', L$.up); f('pointercancel', L$.cancel); f('keydown', L$.key); f('keyup', L$.keyup); f('blur', L$.blur); };

  // ---------- chapters ----------
  let shown = -1;
  function setStop(i, force) {
    if (i === shown && !force) return;
    shown = i;
    rail.forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('past', k < i); });
    const s = STOPS[i];
    if (s.say && mode !== 'detour') say(s.say, s.chips || []);
    if (i === 2) { guide?.event('monument-hall'); env.warm?.('desk'); }
    if (i === N) { setTimeout(() => guide?.event('monument-end'), 2600); env.warm?.('night'); }
    if (i >= 1) titleEl.classList.add('gone');
  }

  if (/[?&]debug/.test(location.search)) window.__monument = { go: (i) => { go(i); snapT = performance.now() + 1e5; }, get stage() { return stage; }, camera, scene, renderer, H, act: (id) => activate(id), ask: (q) => ask(q), vault: () => openVault(), archive: () => openArchive(), powerAll, openAll, repair, volU, cam: (p, l) => { mode = 'detour'; detour = { id: 'dbg', legs: [{ p: V(p), l: V(l) }], leg: 0 }; P.set(...p); L.set(...l); }, free: (p, yawA) => { mode = 'free'; free = { p: V(p), yaw: yawA, pitch: 0, to: null }; }, set skyWait(v) { skyWait = v; } };

  let on = false, rtW = 4, rtH = 4, lastAuto = 0;
  const C = new THREE.Color();
  return {
    id: 'monument', ui: 'own', camera,
    post: { conv: 1, grain: 0.03, vig: 0.42, ab: 0.0008, light: 0, tilt: 0, exposure: 0.85 },
    precompile() { try { renderer.compileAsync?.(scene, camera).catch(() => {}); } catch {} },
    enter() { if (on) return; on = true; ui.classList.add('on'); ui.setAttribute('aria-hidden', 'false'); attach(true); if (shown < 0) setStop(0); lastAuto = performance.now(); },
    exit() { if (!on) return; on = false; ui.classList.remove('on'); ui.setAttribute('aria-hidden', 'true'); attach(false); drag = null; hover = null; keys.clear(); audio.sea?.(0); try { speechSynthesis?.cancel(); } catch {} },
    caption() { return STOPS[clamp(Math.round(stage), 0, N)].label; },
    cursor() {
      if (drag && drag.moved > 6) return mode === 'free' ? 'Turn' : 'Look around';
      if (hover) return hover.id.startsWith('sys-') ? 'Power on' : hover.id.startsWith('stream-') ? 'Open the source' : hover.id === 'office' ? 'Step in' : hover.id === 'sky' ? 'Look up' : hover.id === 'seam' ? 'Look closer' : hover.id === 'hatch' ? 'Sealed' : 'Open';
      if (stage < 0.6) return 'Approach';
      return '';
    },
    dragging: () => !!drag && drag.moved > 6,
    resize(w, h, pr) {
      F = { mobile: w / h < 0.9 || w < 560 };
      camera.aspect = w / h; camera.fov = F.mobile ? 64 : 50; camera.updateProjectionMatrix();
      rtW = Math.round(w * pr); rtH = Math.round(h * pr);
      composer.setPixelRatio(1); composer.setSize(rtW, rtH); bloom.resolution.set(rtW / 2, rtH / 2);
      mirror?.resize(rtW, rtH);
      sandU.uPR.value = dustU.uPR.value = stU.uPR.value = pr;
      rays.uniforms.uAspect.value = w / h;
    },
    quality(level) { if (level >= 2) { bloom.enabled = false; rays.enabled = false; } },
    update(c) {
      const { dt, time, mouse, current } = c;
      // the arrival plays by itself until you touch anything
      if (introAuto && on && current && stageT < 1 && performance.now() - lastAuto > 2600) stageT = Math.min(1, stageT + dt * 0.11);
      if (mode === 'route' && performance.now() > snapT && !drag) { const r = Math.round(stageT); if (Math.abs(stageT - r) < 0.4 && Math.abs(stageT - r) > 0.001) stageT += (r - stageT) * Math.min(1, dt * 3); }
      const k = Math.abs(stageT - stage) > 1.2 ? 1.0 : 1.9;
      stage += (stageT - stage) * (1 - Math.exp(-dt * k)); if (Math.abs(stageT - stage) < 1e-4) stage = stageT;

      // where the camera wants to be
      if (mode === 'route') {
        const u = param(stage); pathPos.getPoint(u, Pd); pathLook.getPoint(u, Ld);
        if (!reduced && stage > 1.4) Pd.y += Math.sin(stage * 24) * 0.02 * clamp(Math.abs(stageT - stage) * 3, 0, 1);
        if (stage < 1.4) Pd.y = Math.max(Pd.y, dune(Pd.x, Pd.z) + 1.6);
      } else if (mode === 'free') {
        const mv = tmp.set(0, 0, 0), s = Math.sin(free.yaw), co = Math.cos(free.yaw);
        if (keys.has('w')) mv.add({ x: -s, y: 0, z: -co }); if (keys.has('s')) mv.add({ x: s, y: 0, z: co });
        if (keys.has('a')) mv.add({ x: -co, y: 0, z: s }); if (keys.has('d')) mv.add({ x: co, y: 0, z: -s });
        if (free.to) { mv.set(free.to.x - free.p.x, 0, free.to.z - free.p.z); const dd = mv.length(); if (dd < 0.15) free.to = null; else { mv.divideScalar(dd).multiplyScalar(Math.min(1, dd)); const want = Math.atan2(-(free.to.x - free.p.x), -(free.to.z - free.p.z)); let da = want - free.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); free.yaw += da * Math.min(1, dt * 2.5); } }
        if (mv.lengthSq() > 0) {
          mv.normalize().multiplyScalar(dt * 5.2);
          const nx = free.p.x + mv.x, nz = free.p.z + mv.z;
          if (walkable(nx, nz)) { free.p.x = nx; free.p.z = nz; } else if (walkable(nx, free.p.z)) free.p.x = nx; else if (walkable(free.p.x, nz)) free.p.z = nz; else free.to = null;
        }
        Pd.copy(free.p); Pd.y = 1.75 + (!reduced ? Math.sin(time * 9) * 0.015 * clamp(mv.lengthSq() * 400, 0, 1) : 0);
        Ld.set(Pd.x - Math.sin(free.yaw) * 10 * Math.cos(free.pitch), Pd.y + Math.sin(free.pitch) * 10, Pd.z - Math.cos(free.yaw) * 10 * Math.cos(free.pitch));
        const ns = nearestStop(); if (ns !== shown) setStop(ns); stage += (ns - stage) * Math.min(1, dt * 2); stageT = stage;
      } else if (mode === 'detour') {
        const leg = detour.legs[detour.leg];
        Pd.copy(leg.p); Ld.copy(leg.l);
        if (P.distanceTo(leg.p) < 0.6 && detour.leg < detour.legs.length - 1) detour.leg++;
        if (detour.ret && P.distanceTo(leg.p) < 0.6 && detour.leg === detour.legs.length - 1) { mode = 'route'; detour = null; soft = 1; if (pendingGo != null) { stageT = pendingGo; pendingGo = null; } setStop(Math.round(stage), true); }
      }
      // ease toward it: the path is already smooth, free walking a little, detours slowly
      soft = Math.max(0, soft - dt * 0.7);
      const kk = mode === 'route' ? lerp(14, 2.0, soft) : mode === 'free' ? 9 : 1.6;
      const a = 1 - Math.exp(-dt * kk);
      P.lerp(Pd, a); L.lerp(Ld, a);
      if (!drag) { yaw += vYaw; pitch += vPitch; vYaw *= 0.9; vPitch *= 0.9; if (mode !== 'free') { yaw *= 1 - Math.min(1, dt * 0.5); pitch *= 1 - Math.min(1, dt * 0.5); } }
      const mx = c.mouseActive ? mouse.x : 0, my = c.mouseActive ? mouse.y : 0;
      fwd.subVectors(L, P);
      if (mode !== 'free') { fwd.applyAxisAngle(Y, -yaw - mx * 0.06); right.crossVectors(fwd, Y).normalize(); fwd.applyAxisAngle(right, -pitch + my * 0.04); }
      focusAmt += ((focus && detailId ? 1 : 0) - focusAmt) * Math.min(1, dt * 2.2);
      if (focus && focusAmt > 0.01) { tmp.subVectors(focus.anchor, P).normalize().multiplyScalar(fwd.length()); fwd.lerp(tmp, ease(focusAmt) * 0.6); }
      // keep the subject clear of the panels: right of centre on a wide screen, high on a tall one
      frame += ((F.mobile ? 0 : 1) - frame) * Math.min(1, dt * 3);
      const det = detailId ? 1 : 0;
      fwd.applyAxisAngle(Y, frame * (0.09 - det * 0.2));
      right.crossVectors(fwd, Y).normalize(); fwd.applyAxisAngle(right, -(1 - frame) * 0.12);
      if (c.arrive > 0) P.addScaledVector(tmp.copy(fwd).normalize(), -c.arrive * 3);
      camera.position.copy(P); camera.lookAt(tmp.copy(P).add(fwd)); camera.updateMatrixWorld();

      // outside, threshold, inside
      const inside = smooth(1.15, 1.75, stage) * (mode === 'route' ? 1 : 1);
      const outside = 1 - smooth(1.6, 2.2, stage);
      EXT.visible = outside > 0.001 && P.z > -9; INT.visible = stage > 0.75 || P.z < 60;
      sunExt.castShadow = outside > 0.01; sunInt.castShadow = inside > 0.01;
      sunExt.intensity = 3.6 * outside; fillExt.intensity = 0.7 * outside; hemi.intensity = lerp(0.24, 1.0, outside);
      BAYS.map((b) => [Math.abs(b.z - P.z), b]).sort((a1, b1) => a1[0] - b1[0]).slice(0, 2).forEach(([dd, b], i) => { bayLights[i].position.set(b.s * (HW + 4), 9, b.z + 2); bayLights[i].intensity = 140 * (1 - outside) * clamp(1 - (dd - 10) / 30, 0, 1); });
      hemi.color.set(0x9aa6c4).lerp(C.set(0x8a7058), 1 - outside); hemi.groundColor.set(0xb07848).lerp(C.set(0x5a4030), 1 - outside);
      sunInt.intensity = 6 * smooth(0.7, 1.6, stage);
      scene.fog.color.setRGB(0.98, 0.64, 0.41).lerp(C.set(0x1c1510), 1 - outside);
      scene.fog.near = lerp(20, 40, outside); scene.fog.far = lerp(440, 2600, outside);
      scene.environmentIntensity = lerp(0.35, 0.1, outside);
      this.post.exposure = lerp(1.25, 0.82, outside) * (1 + 0.15 * (1 - smooth(0.8, 2.6, stage)) * inside);
      // exterior: the shadow box follows you; the travellers walk; the door parts
      if (outside > 0.01) {
        tmp.set(P.x * 0.5, 0, Math.min(P.z * 0.5, 200));
        const span = P.z > 300 ? 520 : 160;
        Object.assign(sunExt.shadow.camera, { left: -span, right: span, top: span, bottom: -span }); sunExt.shadow.camera.updateProjectionMatrix();
        sunExt.target.position.copy(tmp); sunExt.position.copy(tmp).addScaledVector(sunDir, 700); sunExt.target.updateMatrixWorld();
        figures.forEach((f) => { const u = f.userData; const zz = u.z0 - ((time * u.s) % 60); f.position.set(u.x + Math.sin(time * 0.6 + u.ph) * 0.1, Math.abs(Math.sin(time * 3 + u.ph)) * 0.03, zz); f.rotation.y = Math.sin(time * 3 + u.ph) * 0.04; f.visible = zz > 12 && Math.hypot(P.x - f.position.x, P.z - zz) > 16; });
        sandU.uTime.value = time; sandU.uCam.value.copy(P); sandU.uA.value = outside * (P.y < 30 ? 1 : 0);
        sky.position.copy(P); skyU.uTime.value = time;
        // the sun's place on screen, for the rays
        tmp.copy(P).addScaledVector(sunDir, 3000).project(camera);
        rays.uniforms.uSun.value.set((tmp.x + 1) / 2, (tmp.y + 1) / 2);
        rays.uniforms.uI.value = outside * (tmp.z < 1 ? 1 : 0);
      } else rays.uniforms.uI.value = 0;
      if (!INT.visible) volU.uI.value = 0;
      doorOpen += ((stage > 1.08 ? 1 : 0.03) - doorOpen) * Math.min(1, dt * (stage > 1.08 ? 0.9 : 3));
      doorL.position.x = -1.1 - doorOpen * 2.25; doorR.position.x = 1.1 + doorOpen * 2.25;
      glowM.opacity = clamp(1 - doorOpen * 1.6, 0, 1) * (stage < 1.5 ? 1 : 0); doorGlow.visible = glowM.opacity > 0.01;
      seamM.opacity = clamp(1 - doorOpen * 3, 0, 1); seamDoor.visible = seamM.opacity > 0.01;
      haloM.uniforms.uI.value = (0.55 + doorOpen * 1.1) * (1 - smooth(1.2, 1.55, stage)) * clamp((P.z - 4) / 30, 0, 1); doorHalo.visible = haloM.uniforms.uI.value > 0.005;
      doorSpill.intensity = (40 + doorOpen * 900) * outside;

      // inside: shafts breathe, dust drifts, projections flicker like old lamps
      if (INT.visible) {
        hallOn += ((stage > 1.6 ? 1 : 0) - hallOn) * Math.min(1, dt * 0.8);
        volU.uTime.value = time; volU.uI.value = smooth(0.9, 1.9, stage) * (P.z < 2 ? 1 : 0.6);
        volU.uCam.value.copy(camera.position); volU.uInvProj.value.copy(camera.projectionMatrixInverse); volU.uCamWorld.value.copy(camera.matrixWorld);
        dustU.uTime.value = time; dustU.uA.value = smooth(1.2, 2.0, stage);
        projMats.forEach((p) => { p.m.color.setRGB(1.0, 0.86, 0.66).multiplyScalar(p.base * hallOn * (0.94 + 0.06 * Math.sin(time * 13 + p.flick) * Math.sin(time * 7.3 + p.flick * 2))); });
        stU.uTime.value = time; caustU.uTime.value = time;
        let opened = 0;
        pillars.forEach((p, i) => { p.open += (p.target - p.open) * Math.min(1, dt * 0.9); stU.uOpen.value[i] = p.open; p.slot.material.color.setRGB(0.4, 0.3, 0.2).lerp(C.setRGB(3.2, 2.2, 1.2), p.open); opened += p.open; });
        const full = opened / 6;
        cube.rotation.y = time * 0.12; cube.rotation.x = Math.sin(time * 0.2) * 0.12; cube.position.y = CORE.y + Math.sin(time * 0.7) * 0.15;
        cubeIn.material.color.setRGB(1.6, 1.15, 0.7).multiplyScalar(0.5 + full * 1.6); cubeEdge.material.color.setRGB(2.4, 1.8, 1.1).multiplyScalar(0.6 + full);
        caustU.uI.value = 0.35 + full * 0.5;
        sysStones.forEach((s, i) => { s.on += ((lit[i] ? 1 : 0) - s.on) * Math.min(1, dt * 3); s.m.color.setRGB(0.25, 0.22, 0.18).lerp(C.setRGB(2.4, 1.9, 1.3), s.on); });
        // the stock: out of place until repaired, then everything slides home
        if (repaired) repT += dt;
        const fix = ease(repT / 1.6);
        stock.forEach((s, i) => {
          tmp.copy(s.home); const m = s.bad ? 1 - fix : 0;
          if (s.bad) tmp.addScaledVector(s.off, m), tmp.x += m * Math.sin(time * 31 + i) * 0.03 * (Math.sin(time * 3 + i) > 0.6 ? 1 : 0);
          dm.position.copy(tmp); dm.rotation.set(0, s.rot * m, s.rot * 0.4 * m); dm.updateMatrix(); stockMesh.setMatrixAt(i, dm.matrix);
          stockMesh.setColorAt(i, s.bad ? C.copy(errM).lerp(okM, fix) : okM);
        });
        stockMesh.instanceMatrix.needsUpdate = true; stockMesh.instanceColor.needsUpdate = true;
        // the secret rooms
        vaultT += (vaultOpen - vaultT) * Math.min(1, dt * 0.8);
        hatchL.position.x = -1.3 - vaultT * 2.6; hatchR.position.x = 1.3 + vaultT * 2.6; hatchL.position.y = hatchR.position.y = -0.15 - vaultT * 0.35;
        hatchEdge.material.opacity = 0.35 * (1 - vaultT) * (0.6 + 0.4 * Math.sin(time * 2));
        vaultLight.intensity = vaultT * 60; certs.forEach((m) => (m.visible = vaultT > 0.05));
        archT += (archOpen - archT) * Math.min(1, dt * 0.7);
        seamPanel.position.y = 3 - archT * 6.2; seamLine.material.opacity = (0.35 + 0.25 * Math.sin(time * 1.7)) * (1 - archT);
        archLight.intensity = archT * 40; portraitM.uniforms.uI.value = archT;
        skyT += (skyOpen - skyT) * Math.min(1, dt * 0.6);
        lidL.position.x = -2.1 - skyT * 6.4; lidR.position.x = 2.1 + skyT * 6.4; nightU.uTime.value = time; nightU.uI.value = smooth(0.02, 0.5, skyT);
        nightSky.visible = skyT > 0.01; shaftM.color.setRGB(0.07, 0.06, 0.055).lerp(C.setRGB(0.3, 0.38, 0.58), skyT); moon.intensity = skyT * 2600; volU.uSlabB.value[MOONSLAB].y = 0.09 * skyT;
        steles.forEach((m, i) => (m.material.color.setRGB(1.6, 1.3, 0.9).multiplyScalar(hallOn * (0.85 + 0.15 * Math.sin(time * 0.8 + i)))));
      }
      // NOOR beside you, from the hall on
      noorShow += ((stage > 1.85 || mode !== 'route' ? 1 : 0) - noorShow) * Math.min(1, dt * 1.5);
      noor.visible = noorShow > 0.02 && on;
      noorEl.classList.toggle('on', noorShow > 0.5);
      if (noor.visible) {
        right.setFromMatrixColumn(camera.matrixWorld, 0); tmp.setFromMatrixColumn(camera.matrixWorld, 1);
        fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
        noor.position.copy(camera.position).addScaledVector(fwd, 2.4).addScaledVector(right, F.mobile ? 0.4 : -0.95).addScaledVector(tmp, (F.mobile ? 0.66 : 0.12) + Math.sin(time * 1.3) * 0.03 + (1 - noorShow) * 1.4);
        noor.quaternion.copy(camera.quaternion);
        noorTalk = Math.max(0, noorTalk - dt * 1.4);
        ring.rotation.z = time * (0.4 + noorTalk * 2); ring2.rotation.z = -time * (0.7 + noorTalk * 3);
        ring2.rotation.x = Math.sin(time * 0.9) * 0.5 + noorTalk * 0.6;
        nPts.rotation.y = time * 0.5; nPts.rotation.x = Math.sin(time * 0.4) * 0.6;
        const s = (0.92 + noorTalk * 0.12 + Math.sin(time * 6) * 0.015 * noorTalk) * noorShow;
        noor.scale.setScalar(Math.max(0.001, s));
        ringM.color.setRGB(2.6, 2.0, 1.3).multiplyScalar(0.8 + noorTalk * 0.8); ringM.opacity = noorShow;
      }
      if (on) audio.sea?.(clamp(outside * 0.8, 0, 1));

      if (!current || !on) return;
      if (mode === 'route') { const near = Math.round(stage); if (near !== shown && Math.abs(stage - near) < 0.3) setStop(near); }
      if (detailId && mode === 'route' && Math.abs(stage - Math.round(stage)) > 0.45) closeDetail();
      ui.classList.toggle('walking', mode === 'route' && Math.abs(stageT - stage) > 0.25);
      titleEl.classList.toggle('gone', stage > 0.5);
      // labels on things you can open: nearest first, never on top of one another
      placed.length = 0;
      for (const h of H) {
        let w = 0;
        const d = h.anchor.distanceTo(P);
        if (INT.visible && stage > 1.7) {
          w = clamp(1 - (d - 16) / 14, 0, 1);
          if (h.vault) w = vaultOpen && detour?.id === 'vault' ? 1 : 0;
          if (h.archive) w = archOpen && detour?.id === 'archive' ? 1 : 0;
          if (h.secret) w = archOpen ? 0 : clamp(1 - (d - 8) / 6, 0, 1) * (shown === 4 ? 1 : 0);
          if (h.id === 'hatch') w *= vaultOpen ? 0 : 1;
          if (mode === 'detour' && !h.vault && !h.archive) w = 0;
        }
        h.w0 = w;
        if (w > 0.01) { h.v.copy(h.anchor).project(camera); if (h.v.z > 1 || Math.abs(h.v.x) > 1.02 || Math.abs(h.v.y) > 1.02) h.w0 = 0; }
      }
      byDepth.sort((a, b) => a.v.z - b.v.z);
      for (const h of byDepth) {
        let w = h.w0;
        if (w > 0.01) {
          const x = ((h.v.x + 1) / 2) * innerWidth - 10, y = ((1 - h.v.y) / 2) * innerHeight - 13, wd = h.label.length * 6.6 + 34;
          if (placed.some((r) => x < r[0] + r[2] && x + wd > r[0] && y < r[1] + 26 && y + 26 > r[1])) w = 0; else placed.push([x, y, wd]);
        }
        const was = h.w; h.w = w;
        if (w < 0.01) { if (was >= 0.01) { h.el.style.visibility = 'hidden'; h.el.tabIndex = -1; } continue; }
        if (was < 0.01) { h.el.style.visibility = 'visible'; h.el.tabIndex = 0; }
        h.el.style.transform = `translate(${(((h.v.x + 1) / 2) * innerWidth).toFixed(1)}px, ${(((1 - h.v.y) / 2) * innerHeight).toFixed(1)}px)`;
        h.el.style.opacity = w.toFixed(3);
        h.el.classList.toggle('on', hover === h || detailId === h.id);
        h.el.classList.toggle('done', (h.id.startsWith('sys-') && !!lit[+h.id.slice(4)]) || (h.id.startsWith('stream-') && !!pillars[+h.id.slice(7)].target) || (h.id === 'geant' && repaired));
        h.el.style.pointerEvents = w > 0.5 ? 'auto' : 'none';
      }
    },
    render() {
      renderer.setClearColor(0x000000, 1);
      composer.render();
      if (mirror && INT.visible && camera.position.y > 0) mirror.render(scene, camera, [noor, floor, water, shafts, dust, EXT, hatchL, hatchR, sandPts]);
      return composer.readBuffer.texture;
    },
  };
}
const dm = new THREE.Object3D();
