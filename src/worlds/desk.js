import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/vt323/latin-400.css';
import './desk.css';
import './os.css';
import { buildDeskScene, BOOKS, CERTS } from './desk-scene.js';
import { createOS } from './os.js';

// The Desk. A sunlit office cut open like an architect's model. Every object is clickable and tells one part of the story;
// scroll for a guided tour. The computer runs AG/OS, and the floppy disks load the other worlds.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const EMAIL = 'abdelkrimghebouli.34@gmail.com';
const tplHTML = (ids) => (ids || []).map((id) => document.getElementById(id)?.innerHTML || '').join('');

export async function createDesk(env) {
  const { renderer, small, coarse, reduced, tier, meURL, shotFor, achieve, audio, guide, isUI, overlayOpen, travel, PROJECTS } = env;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  pmrem.dispose();
  try { await Promise.race([Promise.all([document.fonts.load('700 30px "Courier Prime"'), document.fonts.load('400 20px "VT323"')]), new Promise((r) => setTimeout(r, 1500))]); } catch {}
  const photo = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = meURL; });
  const D = buildDeskScene({ photo, tier });
  scene.add(D.root);
  const BG = new THREE.Color(0x16291f).convertSRGBToLinear();

  // ---------- light: afternoon sun through the blinds ----------
  const sunDir = new THREE.Vector3(0.32, -0.6, 1).normalize();
  const sun = new THREE.DirectionalLight(0xffdcae, 3.4);
  sun.target.position.set(0.2, 0.6, -1.1);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, -9);
  sun.castShadow = true;
  const SM = tier >= 2 ? 2048 : tier === 1 ? 1024 : 512;
  sun.shadow.mapSize.set(SM, SM);
  Object.assign(sun.shadow.camera, { left: -3.6, right: 3.6, top: 3.2, bottom: -3.2, near: 1, far: 18 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xfbe9cf, 0x2d2416, 0.85);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.45); fill.position.set(4, 3, 5);
  scene.add(hemi, fill);
  const lampBase = D.lampItem.light.intensity;

  // a shaft of light, striped by the slats, and dust floating in it
  const winC = new THREE.Vector3(0, 1.7, -2.16), WW = 1.84, WH = 1.24;
  const reach = 1.7 / -sunDir.y + 0.4;
  const beamG = new THREE.BufferGeometry();
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(winC.x + a * WW / 2, winC.y + b * WH / 2, winC.z));
  const bp = [], bu = [];
  corners.forEach((c, i) => { const f = c.clone().addScaledVector(sunDir, reach); bp.push(c.x, c.y, c.z, f.x, f.y, f.z); bu.push(i % 2, (i >> 1) ? 1 : 0, i % 2, (i >> 1) ? 1 : 0); });
  const pos = []; const uvs = [];
  const quad = (a, b, c, d) => { [a, b, c, a, c, d].forEach((k) => { pos.push(bp[k * 3], bp[k * 3 + 1], bp[k * 3 + 2]); uvs.push(k % 2, Math.floor(k / 2) / 3); }); };
  // vertices: 0..7 = (near0, far0, near1, far1, ...): build four side faces
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(i * 2, j * 2, j * 2 + 1, i * 2 + 1); }
  beamG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); beamG.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const beamU = { uOpen: { value: 1 }, uTime: { value: 0 } };
  const beam = new THREE.Mesh(beamG, new THREE.ShaderMaterial({
    uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uOpen, uTime; varying vec2 vUv; varying vec3 vW;
      void main(){
        float along = vUv.x;
        float stripes = 0.55 + 0.45*sin((vW.y + vW.z*0.6)*58.0);
        float a = (1.0 - along)*(0.35 + 0.65*along*0.0 + 0.65)*0.5*stripes*uOpen;
        a *= smoothstep(0.0, 0.08, along)*0.9 + 0.1;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.62)*a*0.07, 1.0);
      }`,
  }));
  beam.frustumCulled = false; scene.add(beam);
  const DN = small || coarse ? 260 : 520;
  const dp = new Float32Array(DN * 3), ds = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dp.set([(Math.random() - 0.5) * 2.4, 0.3 + Math.random() * 2.2, -2.1 + Math.random() * 2.1], i * 3); ds[i] = Math.random(); }
  const dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dustG.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  const dustU = { uTime: { value: 0 }, uOpen: { value: 1 }, uPR: { value: 1 }, uDir: { value: sunDir }, uWin: { value: new THREE.Vector4(WW / 2, WH / 2, winC.y, winC.z) } };
  const dust = new THREE.Points(dustG, new THREE.ShaderMaterial({
    uniforms: dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uOpen, uPR; uniform vec3 uDir; uniform vec4 uWin; attribute float aS; varying float vA;
      void main(){
        vec3 p = position + vec3(sin(uTime*0.13 + aS*40.0)*0.12, sin(uTime*0.09 + aS*17.0)*0.1, cos(uTime*0.11 + aS*23.0)*0.12);
        float t = (uWin.w - p.z)/uDir.z; vec3 q = p + uDir*t;
        float lit = step(abs(q.x), uWin.x)*step(abs(q.y - uWin.z), uWin.y)*step(t, 0.0);
        vec4 mv = modelViewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        gl_PointSize = (1.0 + aS*2.2)*uPR*(3.0/-mv.z);
        vA = lit*uOpen*(0.4 + 0.6*sin(uTime*0.7 + aS*30.0)*sin(uTime*0.7 + aS*30.0));
      }`,
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.88, 0.66)*smoothstep(0.5, 0.0, d)*vA*1.6, 1.0); }',
  }));
  dust.frustumCulled = false; scene.add(dust);

  // ---------- the screen canvas ----------
  const sc = D.scrCanvas, sx = sc.getContext('2d');
  let scrState = '', scrArg = '', scrDrawn = 0;
  function drawScreen(state, arg = '', time = 0) {
    const W = sc.width, H = sc.height;
    if (state === 'saver') {
      sx.fillStyle = '#0b1a12'; sx.fillRect(0, 0, W, H);
      const x = W / 2 + Math.sin(time * 0.31) * 150, y = H / 2 + Math.sin(time * 0.43) * 110;
      sx.font = '400 92px "VT323", monospace'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
      sx.fillStyle = '#e2bd62'; sx.fillText('AG/OS', x, y);
      sx.font = '400 30px "VT323", monospace'; sx.fillStyle = '#9cff9c'; if (Math.floor(time * 1.5) % 2) sx.fillText('click to wake', x, y + 62);
    } else if (state === 'desk') {
      for (let j = 0; j < H; j += 4) for (let i = 0; i < W; i += 4) { sx.fillStyle = ((i + j) / 4) % 2 ? '#16291f' : '#1f3a2c'; sx.fillRect(i, j, 4, 4); }
      for (let k = 0; k < 5; k++) { sx.fillStyle = '#e2bd62'; sx.fillRect(28, 26 + k * 74, 40, 36); sx.fillStyle = '#f1ead8'; sx.fillRect(22, 68 + k * 74, 52, 8); }
      sx.fillStyle = '#ece5d3'; sx.fillRect(150, 50, 330, 250); sx.fillStyle = '#1f3a2c'; sx.fillRect(150, 50, 330, 26);
      sx.fillStyle = '#b9ae93'; for (let k = 0; k < 8; k++) sx.fillRect(164, 92 + k * 24, 140 + ((k * 53) % 140), 8);
      sx.fillStyle = '#0e1f17'; sx.fillRect(0, H - 34, W, 34); sx.fillStyle = '#e2bd62'; sx.fillRect(6, H - 28, 80, 22);
    } else if (state === 'boot') {
      sx.fillStyle = '#050806'; sx.fillRect(0, 0, W, H);
      sx.font = '400 30px "VT323", monospace'; sx.textAlign = 'left'; sx.textBaseline = 'top'; sx.fillStyle = '#ffbe4a';
      ['AG-BIOS v2.6', '', 'CPU    Curiosity ...... OK', 'RAM    640K ........... OK', 'DISK   C: CAREER.SYS .. OK', '', 'Starting AG/OS ...'].slice(0, 1 + Math.floor(time * 6)).forEach((l, i) => sx.fillText(l, 26, 24 + i * 34));
    } else if (state === 'load') {
      sx.fillStyle = '#050806'; sx.fillRect(0, 0, W, H);
      sx.font = '400 42px "VT323", monospace'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.fillStyle = '#9cff9c';
      sx.fillText(`LOAD ${arg}`, W / 2, H / 2 - 40);
      sx.strokeStyle = '#9cff9c'; sx.lineWidth = 3; sx.strokeRect(W / 2 - 180, H / 2 + 10, 360, 34);
      sx.fillRect(W / 2 - 174, H / 2 + 16, 348 * clamp(time, 0, 1), 22);
    }
    D.scrTex.needsUpdate = true;
  }

  // ---------- AG/OS ----------
  let mode = 'room'; // room · focus · os
  const os = createOS({ mobile: () => F.mobile, audio, achieve, travel: (w) => insertFloppy(w, true), shotFor, PROJECTS, onExit: () => exitOS(), onCoffee: () => (steamBoost = 3) });
  document.body.appendChild(os.el);

  // ---------- interface ----------
  const ui = document.createElement('div');
  ui.className = 'desk-ui'; ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = `
    <article class="desk-card" aria-live="polite">
      <header><span class="dc-step"></span><span class="dc-nav"><button type="button" class="dc-prev" aria-label="Previous stop">‹</button><button type="button" class="dc-next" aria-label="Next stop">›</button></span></header>
      <h2 class="dc-title"></h2>
      <div class="dc-body"></div>
      <div class="dc-more detail-body"></div>
      <div class="dc-actions"></div>
    </article>
    <div class="desk-tag"><span></span></div>
    <button type="button" class="desk-back">Step back <kbd>Esc</kbd></button>`;
  document.body.appendChild(ui);
  const card = ui.querySelector('.desk-card'), cStep = ui.querySelector('.dc-step'), cTitle = ui.querySelector('.dc-title'), cBody = ui.querySelector('.dc-body'), cMore = ui.querySelector('.dc-more'), cAct = ui.querySelector('.dc-actions');
  const tag = ui.querySelector('.desk-tag'), tagTxt = tag.querySelector('span');
  ui.querySelector('.dc-prev').addEventListener('click', () => tour(stop - 1));
  ui.querySelector('.dc-next').addEventListener('click', () => tour(stop + 1));
  ui.querySelector('.desk-back').addEventListener('click', () => exitOS());

  // ---------- what each thing says ----------
  const P = (p, l) => ({ pos: new THREE.Vector3(...p), look: new THREE.Vector3(...l) });
  const POSES = {
    room: () => (F.mobile ? P([3.3, 3.5, 6.6], [-0.35, 0.55, -1.25]) : P([3.45, 2.8, 3.95], [-0.45, 1.12, -1.05])),
    board: () => P([1.9, 1.62, -0.5], [1.9, 1.6, -2.2]),
    certs: () => P([-1.95, 1.72, -0.65], [-1.95, 1.72, -2.2]),
  };
  const contactHTML = `<p><b>${EMAIL}</b></p><p>Open to SAP consultant roles internationally.</p>`;
  const CARDS = {
    room: { title: 'The Desk', body: '<p>Where the work happens. Click anything in the room, or scroll for a tour.</p><p>The books are my skills, the board is me, the phone reaches me, the floppy disks hold other worlds, and the computer runs my CV.</p>', actions: [['Turn on the computer', 'os', 1], ['Start the tour', 'next']] },
    computer: { title: 'My computer', body: '<p>A beige box running AG/OS, a tiny operating system with my whole CV inside.</p><p>SAP people: the taskbar takes transaction codes.</p>', actions: [['Turn it on', 'os', 1]] },
    shelf: { title: 'Skills, by the book', body: '<p>Fourteen spines, one for each tool I work with. Click one to pull it off the shelf.</p>', actions: [['Pull out SAP BPC', 'book-0', 1]] },
    board: { title: 'Who I am', body: '<p>SAP BPC consultant at CNPC, on Sonatrach’s SHONE project. From Bordj Bou Arreridj, Algeria.</p><p>Arabic, English, French.</p>', actions: [['Meet me', 'polaroid', 1], ['This week’s notes', 'notes']] },
    certs: { title: 'On the wall', body: '<p>Four SAP certifications and the SAP Young Professionals Program, 2025.</p>', more: `<ul class="creds"><li><code>C_SAC</code> Data Analyst · SAP Analytics Cloud</li><li><code>TS410</code> Business Process Integration · S/4HANA</li><li><code>S4C03</code> Implementation Consultant · S/4HANA Cloud PE</li><li><code>C_ABAPD_2309</code> Back-End Developer · ABAP Cloud</li></ul>` },
    plant: { title: 'An olive tree', body: '<p>For Olive Palace, the first digital platform for Algeria’s olive industry. I led its backend.</p>', actions: [['Open the project', 'more-olive', 1]] },
    bin: { title: 'manual_reports.xls', body: '<p>Thrown out at Géant Electronics, when four to six Power BI dashboards replaced manual reporting.</p>', actions: [['See the dashboards', 'more-dash', 1]] },
    phone: { title: 'Call me', body: contactHTML, actions: [['Copy email', 'copy', 1], ['LinkedIn', 'linkedin'], ['CV', 'cv']] },
    floppies: { title: 'Other worlds', body: '<p>Each disk holds a world. Put one in the drive and the computer loads it.</p>', actions: [['Load NIGHT.WLD', 'floppy-night', 1], ['Load ICE.WLD', 'floppy-ice']] },
    window: { title: 'The view', body: '<p>Late afternoon over the plateau. The blinds tilt.</p>', actions: [['Close the blinds', 'blinds', 1]] },
    mug: { title: 'Coffee', body: '<p>Still warm. AG/OS has a COFFEE command too.</p>' },
    clock: { title: 'Local time', body: '' },
    polaroid: { title: 'Abdelkrim Ghebouli', more: () => `<figure class="portrait"><img alt="Portrait of Abdelkrim Ghebouli" src="${meURL}"></figure>${tplHTML(['d-home'])}`, actions: [['Contact me', 'phone', 1]] },
    map: { title: 'Home', body: '<p>Bordj Bou Arreridj, Algeria. 36.07°N 4.76°E.</p><p>Where I live and work from, and open to roles abroad.</p>' },
    notes: { title: 'This week', body: '<p>Business Process Flows, EPM reports and Analysis for Office: the SHONE routine.</p>', more: () => tplHTML(['d-shone', 'd-bpf', 'd-epm', 'd-afo']) },
  };
  const TOUR = ['room', 'computer', 'shelf', 'board', 'certs', 'plant', 'bin', 'phone', 'floppies'];
  const TAGS = { computer: 'Computer', window: 'Blinds', lamp: 'Lamp', mug: 'Coffee', 'floppy-night': 'NIGHT.WLD', 'floppy-ice': 'ICE.WLD', phone: 'Phone', plant: 'Olive tree', bin: 'Bin', polaroid: 'Me', map: 'Home', notes: 'Notes', clock: 'Clock' };
  BOOKS.forEach((b, i) => (TAGS[`book-${i}`] = b[0]));
  CERTS.forEach((c, i) => (TAGS[`cert-${i}`] = c[0]));
  const TAG_SUB = { computer: 'turn on', 'floppy-night': 'load world', 'floppy-ice': 'load world', phone: 'contact', lamp: 'switch' };

  let stop = 0, current = 'room', expanded = false, pulled = null, phoneUp = 0;
  function setCard(id, opts = {}) {
    current = id;
    const c = typeof opts.card === 'object' ? opts.card : CARDS[id] || CARDS.room;
    card.classList.add('swap');
    setTimeout(() => {
      card.classList.remove('swap');
      const ti = TOUR.indexOf(id);
      cStep.textContent = ti >= 0 ? `Stop ${ti + 1} of ${TOUR.length}` : 'Desk';
      ui.querySelector('.dc-prev').disabled = ti === 0; ui.querySelector('.dc-next').disabled = ti === TOUR.length - 1;
      cTitle.textContent = c.title;
      cBody.innerHTML = id === 'clock' ? `<p>It’s ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Algiers', hour: '2-digit', minute: '2-digit' })} in Bordj Bou Arreridj.</p>` : c.body || '';
      const more = typeof c.more === 'function' ? c.more() : c.more || '';
      cMore.innerHTML = more;
      expanded = !!more && opts.expand !== false;
      card.classList.toggle('expanded', expanded);
      cAct.replaceChildren(...(c.actions || []).map(([label, act, primary]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (primary) b.className = 'primary';
        b.addEventListener('click', () => action(act, b));
        return b;
      }));
      cMore.scrollTop = 0;
    }, reduced ? 0 : 160);
  }
  function action(act, btn) {
    audio.click();
    if (act === 'os') return enterOS();
    if (act === 'next') return tour(stop + 1);
    if (act === 'copy') { navigator.clipboard?.writeText(EMAIL).then(() => (btn.textContent = 'Copied ✓')).catch(() => (btn.textContent = EMAIL)); achieve('hello'); return; }
    if (act === 'linkedin') return void open('https://www.linkedin.com/in/abdelkrim-ghebouli', '_blank', 'noopener');
    if (act === 'cv') { const a = document.createElement('a'); a.href = './Abdelkrim-Ghebouli-CV.pdf'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); return; }
    if (act === 'blinds') { blindsOpen = !blindsOpen; btn.textContent = blindsOpen ? 'Close the blinds' : 'Open the blinds'; audio.click(); return; }
    if (act === 'more-olive') { cMore.innerHTML = `<figure><img alt="Olive Palace" src="${shotFor('d-olive') || ''}"></figure>${tplHTML(['d-olive'])}`; expanded = true; card.classList.add('expanded'); btn.remove(); return; }
    if (act === 'more-dash') { cMore.innerHTML = tplHTML(['d-m-dash', 'd-geant']); expanded = true; card.classList.add('expanded'); btn.remove(); return; }
    if (act.startsWith('floppy-')) return insertFloppy(act.slice(7));
    click(act);
  }
  function tour(i) {
    i = clamp(i, 0, TOUR.length - 1);
    if (mode === 'os') exitOS(true);
    stop = i; ui.classList.add('toured');
    const id = TOUR[i];
    if (id === 'floppies') { env.warm?.('night'); env.warm?.('ice'); }
    focusOn(id === 'room' ? null : id === 'floppies' ? 'floppy-night' : id === 'shelf' ? 'shelf' : id === 'board' ? 'board' : id === 'certs' ? 'certs' : id);
    setCard(id);
    releaseBook();
    audio.whoosh?.();
  }

  // ---------- camera ----------
  let F = { mobile: innerWidth / innerHeight < 0.9 || innerWidth < 560 };
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
  let focusPose = null, yaw = 0, pitch = 0, vYaw = 0, vPitch = 0;
  function focusOn(id) {
    if (!id) { focusPose = null; mode = 'room'; return; }
    const it = D.items[id];
    focusPose = POSES[id]?.() || it?.focus || null;
    if (focusPose && F.mobile) { const f = focusPose; focusPose = { pos: f.look.clone().add(f.pos.clone().sub(f.look).multiplyScalar(1.6)), look: f.look.clone().add(new THREE.Vector3(0, -0.12, 0)) }; }
    mode = 'focus';
  }
  const room0 = POSES.room(); camPos.copy(room0.pos); camLook.copy(room0.look);
  const scrC = new THREE.Vector3(0, 1.16, -1.66);
  function osPose() {
    const fov = THREE.MathUtils.degToRad(camera.fov), asp = camera.aspect;
    const fillH = F.mobile ? 1.15 : 0.78;
    let d = (D.SH / fillH) / (2 * Math.tan(fov / 2));
    const dW = (D.SW / (F.mobile ? 1.2 : 0.9)) / (2 * Math.tan(fov / 2) * asp);
    d = Math.max(d, F.mobile ? 0 : dW);
    if (F.mobile) d = Math.min(d, dW);
    return { pos: new THREE.Vector3(scrC.x, scrC.y + (F.mobile ? 0 : 0.012), scrC.z + d), look: scrC.clone().add(new THREE.Vector3(0, F.mobile ? 0 : 0.012, 0)) };
  }

  // ---------- doing things ----------
  let blindsOpen = true, blindsT = 0.35, lampOn = true, lampK = 1, steamBoost = 0, busy = false;
  function click(id) {
    if (busy) return;
    if (id === 'computer') return enterOS();
    if (id === 'lamp') { lampOn = !lampOn; audio.click(); return; }
    if (id === 'window') { focusOn('window'); setCard('window'); blindsOpen = !blindsOpen; setTimeout(() => { const b = cAct.querySelector('button'); if (b) b.textContent = blindsOpen ? 'Close the blinds' : 'Open the blinds'; }, 200); return; }
    if (id.startsWith('floppy-')) return insertFloppy(id.slice(7));
    if (id.startsWith('book-')) return pullBook(+id.slice(5));
    if (id.startsWith('cert-')) {
      const i = +id.slice(5), [code, title, sub, tpl] = CERTS[i];
      focusOn('certs'); setCard(id, { card: { title: code, body: `<p>${title} · ${sub}</p>`, more: tpl ? tplHTML(tpl) : tplHTML(['d-home']) } });
      return;
    }
    if (id === 'mug') steamBoost = 3;
    if (id === 'phone') phoneUp = 1;
    if (id === 'polaroid') achieve('hello');
    focusOn(id); setCard(id);
    if (TOUR.includes(id)) stop = TOUR.indexOf(id);
    audio.chime(3);
  }
  function pullBook(i) {
    releaseBook();
    const b = D.books[i];
    pulled = b; b.out = 0;
    focusOn(`book-${i}`);
    setCard(`book-${i}`, { card: { title: BOOKS[i][0], body: '', more: tplHTML(BOOKS[i][4]) } });
    stop = TOUR.indexOf('shelf');
    audio.chime(i);
  }
  function releaseBook() { if (pulled) pulled.back = true; }

  function enterOS() {
    if (busy) return;
    mode = 'os'; ui.classList.add('os'); releaseBook();
    focusPose = osPose();
    os.el.classList.toggle('full', F.mobile);
    document.documentElement.classList.add('os-open');
    if (!os.on) { scrState = 'boot'; bootClock = 0; audio.crt(); }
    os.power(true);
    stop = 1;
  }
  let shownOnce = false;
  function exitOS(silent) {
    if (mode !== 'os') return;
    mode = 'focus'; ui.classList.remove('os');
    os.el.classList.remove('shown');
    document.documentElement.classList.remove('os-open');
    focusPose = D.items.computer.focus;
    if (!silent) setCard('computer');
    if (!shownOnce) { shownOnce = true; setTimeout(() => guide?.event('desk-tease'), 1500); }
  }

  // floppy disks: lift, slide into the drive, load, travel
  let anim = null;
  const slot = new THREE.Vector3(0.12, 0.85, -1.6);
  function insertFloppy(w, fromOS) {
    if (busy) return;
    const fl = D.floppies.find((f) => f.world === w); if (!fl) return;
    busy = true;
    if (mode === 'os') exitOS(true);
    focusPose = P([0.62, 1.05, -0.95], [0.08, 0.85, -1.62]); mode = 'focus';
    setCard('floppies', { card: { title: `Loading ${w.toUpperCase()}.WLD`, body: '<p>Hold on, the drive is reading the disk.</p>' } });
    const g = fl.group, p0 = g.position.clone(), q0 = g.quaternion.clone(), q1 = new THREE.Quaternion();
    anim = { g, p0, q0, q1, t: 0, w };
    audio.floppy();
    achieve('floppy');
    void fromOS;
  }
  function resetFloppies() { D.floppies.forEach((f) => { f.group.position.copy(f.home.p); f.group.quaternion.copy(f.home.q); f.group.visible = true; }); }

  // ---------- input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const targets = []; D.root.traverse((o) => { if (o.isMesh && o.userData.item) targets.push(o); });
  let hover = null, drag = null, wheelAcc = 0, wheelLock = false, lockStart = 0, unlockT = 0;
  function pick(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(targets, false)[0];
    return h ? h.object.userData.item : null;
  }
  const L = {
    wheel(e) {
      if (overlayOpen() || e.ctrlKey || mode === 'os') return;
      if (e.target.closest?.('.dc-more, #talk, #guide, #world-panel, .agos')) return;
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      wheelAcc += d * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1);
      const now = performance.now();
      if (!wheelLock && Math.abs(wheelAcc) > 40) { tour(stop + Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = true; lockStart = now; }
      else if (wheelLock && now - lockStart > 800 && Math.abs(wheelAcc) > 140) { tour(stop + Math.sign(wheelAcc)); wheelAcc = 0; lockStart = now; }
      clearTimeout(unlockT); unlockT = setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 200);
    },
    down(e) {
      if (e.button !== 0 || isUI(e.target) || overlayOpen() || mode === 'os' || e.target.closest?.('.agos')) return;
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0, touch: e.pointerType !== 'mouse' };
    },
    move(e) {
      if (mode === 'os') { hover = null; return; }
      if (!drag) { hover = e.pointerType === 'mouse' && !isUI(e.target) ? pick(e.clientX, e.clientY) : null; if (hover?.startsWith('floppy')) { guide?.event('desk-floppy'); env.warm?.(hover.slice(7)); } return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 6 && !drag.touch) { vYaw = -dx * 0.003; vPitch = dy * 0.002; yaw = clamp(yaw + vYaw, -0.6, 0.45); pitch = clamp(pitch + vPitch, -0.25, 0.3); }
    },
    up(e) {
      if (!drag) return;
      const d = drag; drag = null;
      const ty = e.clientY - d.y0, tx = e.clientX - d.x0;
      if (d.touch && Math.abs(ty) > 40 && Math.abs(ty) > Math.abs(tx)) { tour(stop + (ty < 0 ? 1 : -1)); return; }
      if (d.touch && Math.abs(tx) > 50) { yaw = clamp(yaw - tx * 0.003, -0.6, 0.45); return; }
      if (d.moved > 8) return;
      const id = pick(e.clientX, e.clientY);
      if (id) click(id);
      else if (mode === 'focus') { mode = 'room'; focusPose = null; setCard('room'); stop = 0; releaseBook(); phoneUp = 0; }
    },
    key(e) {
      if (overlayOpen() || e.target.closest?.('input, textarea, .agos') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === 'Escape') { if (mode === 'os') exitOS(); else if (mode === 'focus') { mode = 'room'; focusPose = null; setCard('room'); stop = 0; releaseBook(); phoneUp = 0; } return; }
      if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(k)) { e.preventDefault(); tour(stop + 1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); tour(stop - 1); }
      else if (k === 'Enter' && !e.target.closest('button, a')) { const b = cAct.querySelector('button'); if (b) { e.preventDefault(); b.click(); } }
    },
    cancel() { drag = null; },
  };
  let attached = false;
  const attach = (on) => {
    if (on === attached) return; attached = on;
    const f = on ? addEventListener : removeEventListener;
    f('wheel', L.wheel, { passive: false }); f('pointerdown', L.down); f('pointermove', L.move); f('pointerup', L.up); f('pointercancel', L.cancel); f('keydown', L.key);
  };

  // ---------- frame ----------
  let rt = null, on = false, bootClock = 0, lastScr = -1;
  const v = new THREE.Vector3(), tmp = new THREE.Vector3();
  const clockParts = () => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Algiers', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date()); const g = (t) => +p.find((x) => x.type === t).value; return [g('hour'), g('minute'), g('second')]; };
  let clk = clockParts(), clkT = 0;
  function projectRect() {
    const hw = D.SW / 2, hh = D.SH / 2;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      v.set(scrC.x + a * hw, scrC.y + b * hh, scrC.z + 0.006).project(camera);
      const X = ((v.x + 1) / 2) * innerWidth, Y = ((1 - v.y) / 2) * innerHeight;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }

  setCard('room');
  drawScreen('saver', '', 0);
  if (/[?&]debug/.test(location.search)) window.__desk = { tour, focusOn, click, enterOS, exitOS, get camPos() { return camPos; }, camera };
  return {
    id: 'desk', ui: 'own', camera,
    precompile() { try { return renderer.compileAsync?.(scene, camera).catch(() => {}); } catch {} },
    post: { conv: 1, grain: 0.025, vig: 0.32, ab: 0.0008, light: 0, tilt: 0, exposure: 1.05 },
    get noFluid() { return mode === 'os'; },
    enter() {
      if (on) return; on = true;
      ui.classList.add('on'); ui.setAttribute('aria-hidden', 'false');
      attach(true); resetFloppies(); busy = false; anim = null;
      if (mode === 'os') os.el.classList.add('shown');
    },
    exit() {
      if (!on) return; on = false;
      ui.classList.remove('on'); ui.setAttribute('aria-hidden', 'true');
      attach(false); drag = null; hover = null;
      os.el.classList.remove('shown'); document.documentElement.classList.remove('os-open');
      if (mode === 'os') { mode = 'focus'; ui.classList.remove('os'); focusPose = D.items.computer.focus; }
    },
    caption() { return cTitle.textContent || 'The Desk'; },
    cursor() {
      if (mode === 'os') return '';
      if (drag && drag.moved > 6) return 'Look around';
      if (hover) return hover === 'computer' ? 'Turn on' : hover.startsWith('floppy') ? 'Load world' : hover === 'lamp' ? 'Switch' : 'Open';
      return '';
    },
    dragging: () => !!drag && drag.moved > 6,
    resize(w, h, pr) {
      F = { mobile: w / h < 0.9 || w < 560 };
      camera.aspect = w / h; camera.fov = F.mobile ? 52 : 38; camera.updateProjectionMatrix();
      rt?.dispose();
      rt = new THREE.WebGLRenderTarget(Math.round(w * pr), Math.round(h * pr), { samples: tier >= 2 ? 4 : 2, type: THREE.HalfFloatType });
      dustU.uPR.value = pr;
      if (mode === 'os') { focusPose = osPose(); os.el.classList.toggle('full', F.mobile); }
    },
    quality(level) { if (level >= 2 && sun.shadow.mapSize.x > 512) { sun.shadow.mapSize.set(512, 512); sun.shadow.map?.dispose(); sun.shadow.map = null; } },
    update(c) {
      const { dt, time, mouse } = c;
      // camera: tour/focus poses with a gentle orbit in the overview
      const base = focusPose || POSES.room();
      tPos.copy(base.pos); tLook.copy(base.look);
      if (!focusPose) {
        if (!drag) { yaw += vYaw; pitch += vPitch; vYaw *= 0.9; vPitch *= 0.9; yaw *= 1 - Math.min(1, dt * 0.25); pitch *= 1 - Math.min(1, dt * 0.25); }
        tmp.subVectors(tPos, tLook).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        tmp.applyAxisAngle(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tmp).normalize(), pitch);
        tPos.copy(tLook).add(tmp);
        if (c.mouseActive) { tPos.x += mouse.x * 0.18; tPos.y += mouse.y * 0.1; }
      } else if (mode !== 'os' && c.mouseActive) { tPos.x += mouse.x * 0.05; tPos.y += mouse.y * 0.03; }
      if (focusPose && mode === 'focus') {
        // pan so the object sits clear of the index card: right of centre on wide screens, above it on phones
        const dist = tPos.distanceTo(tLook);
        v.subVectors(tLook, tPos).normalize();
        const rgt = tmp.crossVectors(v, new THREE.Vector3(0, 1, 0)).normalize();
        if (F.mobile) { tPos.y -= dist * 0.16; tLook.y -= dist * 0.16; }
        else { tPos.addScaledVector(rgt, -dist * 0.2); tLook.addScaledVector(rgt, -dist * 0.2); }
      }
      const k = 1 - Math.exp(-dt * (mode === 'os' ? 4.2 : 2.6));
      camPos.lerp(tPos, k); camLook.lerp(tLook, k);
      if (c.arrive > 0) camPos.addScaledVector(tmp.subVectors(camPos, camLook).normalize(), c.arrive * 1.2);
      camera.position.copy(camPos); camera.lookAt(camLook); camera.updateMatrixWorld();

      // the room
      blindsT += ((blindsOpen ? 0.35 : 1.45) - blindsT) * Math.min(1, dt * 3);
      D.setBlinds(blindsT);
      const open = clamp(1 - (blindsT - 0.35) / 1.1, 0, 1);
      beamU.uOpen.value = open; dustU.uOpen.value = open; dustU.uTime.value = time;
      sun.intensity = 0.6 + 2.8 * open;
      lampK += ((lampOn ? 1 : 0) - lampK) * Math.min(1, dt * 8);
      D.lampItem.light.intensity = lampBase * lampK;
      D.lampItem.bulb.emissiveIntensity = 0.2 + 3.8 * lampK; D.lampItem.glass.emissiveIntensity = 0.1 + 0.5 * lampK;
      steamBoost = Math.max(0, steamBoost - dt);
      D.steamU.uTime.value = time; D.steamU.uAmt.value = 0.6 + Math.min(1.4, steamBoost);
      clkT += dt; if (clkT > 1) { clkT = 0; clk = clockParts(); }
      const [hh, mm, ss] = clk;
      D.clockHands[0].rotation.z = -((hh % 12) + mm / 60) / 12 * Math.PI * 2; D.clockHands[1].rotation.z = -(mm + ss / 60) / 60 * Math.PI * 2; D.clockHands[2].rotation.z = -(ss / 60) * Math.PI * 2;
      D.led.material.emissiveIntensity = anim ? (Math.sin(time * 40) > 0 ? 4 : 0.3) : 2.2 + Math.sin(time * 2) * 0.4;
      // pulled book
      for (const b of D.books) {
        const target = b === pulled && !b.back ? 1 : 0;
        b.out = (b.out || 0) + (target - (b.out || 0)) * Math.min(1, dt * 6);
        if (b.back && b.out < 0.01) { b.back = false; if (pulled === b) pulled = null; }
        b.group.position.x = b.home.x + b.out * 0.14; b.group.rotation.x = b.homeRot; b.group.rotation.y = b.out * 0.35; b.group.position.y = b.home.y + b.out * 0.02;
      }
      phoneUp = mode === 'focus' && current === 'phone' ? phoneUp : 0;
      const hs = D.phoneItem.handset; hs.position.y += ((0.1 + phoneUp * 0.09) - hs.position.y) * Math.min(1, dt * 6); hs.rotation.x += ((phoneUp * -0.5) - hs.rotation.x) * Math.min(1, dt * 6);
      // floppy animation
      if (anim) {
        anim.t += dt;
        const t = anim.t, g = anim.g;
        if (t < 0.4) { const e = t / 0.4; g.position.lerpVectors(anim.p0, tmp.copy(anim.p0).add(v.set(0, 0.1, 0)), e * e * (3 - 2 * e)); }
        else if (t < 1.0) { const e = (t - 0.4) / 0.6, ee = e * e * (3 - 2 * e); g.position.lerpVectors(tmp.copy(anim.p0).add(v.set(0, 0.1, 0)), v.copy(slot).add(new THREE.Vector3(0, 0, 0.12)), ee); g.quaternion.slerpQuaternions(anim.q0, anim.q1, ee); }
        else if (t < 1.35) { const e = (t - 1.0) / 0.35; g.position.lerpVectors(v.copy(slot).add(new THREE.Vector3(0, 0, 0.12)), tmp.copy(slot).add(new THREE.Vector3(0, 0, -0.06)), e); }
        else if (!anim.done && t > 1.4) { g.visible = false; anim.done = true; scrState = 'load'; scrArg = `${anim.w.toUpperCase()}.WLD`; bootClock = 0; }
        if (t > 2.9 && !anim.went) { anim.went = true; v.copy(scrC).project(camera); travel(anim.w, ((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight); }
      }
      // the screen
      bootClock += dt;
      const want = mode === 'os' ? (os.el.classList.contains('shown') ? 'desk' : 'boot') : anim?.done ? 'load' : os.on ? 'desk' : 'saver';
      if (want !== scrState) { scrState = want; lastScr = -1; }
      if (scrState === 'saver' || scrState === 'boot' || scrState === 'load') { if (time - lastScr > 0.12) { lastScr = time; drawScreen(scrState, scrArg, scrState === 'saver' ? time : bootClock); } }
      else if (lastScr < 0) { lastScr = time; drawScreen(scrState); }
      D.scrU.uTime.value = time;

      if (!c.current || !on) return;
      // the OS sits exactly on the glass once the camera has arrived
      if (mode === 'os') {
        const arrived = camPos.distanceTo(focusPose.pos) < 0.012;
        if (arrived && !os.el.classList.contains('shown')) os.el.classList.add('shown');
        if (!F.mobile) {
          const [x, y, w, h] = projectRect();
          const s = h / 600;
          os.el.style.transform = `translate(${x + (w - 800 * s) / 2}px, ${y}px) scale(${s})`;
          os.setScale(s);
        }
      }
      // hover tag
      const it = hover && D.items[hover];
      tag.classList.toggle('on', !!it && mode !== 'os');
      if (it) {
        tagTxt.innerHTML = `${TAGS[hover] || hover}${TAG_SUB[hover] ? ` <small>· ${TAG_SUB[hover]}</small>` : ''}`;
        v.copy(it.anchor).project(camera);
        tag.style.transform = `translate(${(((v.x + 1) / 2) * innerWidth + 14).toFixed(1)}px, ${(((1 - v.y) / 2) * innerHeight - 12).toFixed(1)}px)`;
      }
      if (lastScr === -2) drawScreen('saver');
    },
    render() {
      renderer.setRenderTarget(rt); renderer.setClearColor(BG, 1); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      return rt.texture;
    },
  };
}
