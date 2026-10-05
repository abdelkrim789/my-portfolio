import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildShapes, buildName, buildText, buildPortrait, starTips } from '../shapes.js';
import { FINAL_SHADER } from '../particles.js';
import { sharedGeometry, createScene, createGround, createTrail, createSky, createOrb, applyWorldToMaterials } from '../world.js';
import { WORLDS } from '../worlds.js';
import { PROJECTS, createScreen } from '../screens.js';
import { STAGES, SYSTEMS, TASKS, METRICS, MILESTONES } from '../content.js';

// Night · The Desert: a particle world you fly through along one camera path.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

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
  return { pos: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), look: new THREE.CatmullRomCurve3(looks, false, 'centripetal'), stages: PATH.map((w) => w[0]) };
}
function pathParam(path, stage) {
  const S = path.stages, n = S.length - 1;
  if (stage <= S[0]) return 0;
  for (let j = 0; j < n; j++) if (stage <= S[j + 1]) return (j + (stage - S[j]) / (S[j + 1] - S[j])) / n;
  return 1;
}

export async function createNight(env) {
  const { renderer, small, coarse, reduced, fontFam, meURL, canv } = env;
  const cores = navigator.hardwareConcurrency || 4;
  const N = small || coarse ? 24000 : cores <= 4 ? 38000 : 60000;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 900);
  // the heavy geometry is built in slices, handing the main thread back between them so the page stays responsive while it loads
  const breathe = () => new Promise((r) => setTimeout(r, 0));
  const shapes = buildShapes(N);
  await breathe();

  const fit = () => {
    const aspect = innerWidth / innerHeight, mobile = aspect < 0.9;
    const fov = mobile ? 58 : 45;
    const dist = 13 * (mobile ? 1.75 : 1);
    const visW = 2 * dist * Math.tan((fov * Math.PI) / 360) * aspect;
    return { aspect, mobile, fov, nameW: Math.min(9, visW * (mobile ? 0.8 : 0.62)) };
  };
  let F = fit();
  let path = buildPath(F.mobile);
  const pathD = buildPath(false);

  const nameAttr = buildName(N, F.nameW, fontFam);
  await breathe();
  const attrs = sharedGeometry(N, shapes, nameAttr);
  const objs = SCENES.map((d, k) => {
    const o = createScene(attrs, k, Math.floor(N * d.n), d.s);
    o.position.set(...d.pos); o.rotation.set(...d.rot); o.scale.setScalar(d.s);
    o.updateMatrixWorld();
    scene.add(o);
    return o;
  });
  await breathe();
  const ground = createGround(small || coarse ? 18000 : 42000, [-85, 45, -290, 35]);
  const trail = createTrail(pathD.pos, small || coarse ? 3500 : 7000);
  const sky = createSky(small ? 1400 : 2600);
  const orb = createOrb(small || coarse ? 2600 : 5200);
  // the moon rises above the name in a landscape frame instead of sitting on it; portrait keeps its old place
  const placeOrb = () => { if (F.mobile) { orb.position.set(60, 112, -430); orb.scale.setScalar(48); } else { orb.position.set(0, 151, -430); orb.scale.setScalar(33); } };
  placeOrb();
  scene.add(orb, ground, trail, sky);
  const screen = createScreen(small || coarse ? 120 : 190, small || coarse ? 75 : 118);
  screen.setTexture('d-olive', canv['d-olive'].canvas);
  scene.add(screen.back, screen.points, screen.plane);
  objs.forEach((o) => (o.material.uniforms.uMotion.value = reduced ? 0.25 : 1));
  objs[0].material.uniforms.uIntro.value = 0;
  const gainFor = (k) => (F.mobile ? 0.52 : 0.62) * (k === 0 ? 0.85 : 1.15);
  applyWorldToMaterials(WORLDS.night, { scenes: objs, ground, trail, sky, orb }, gainFor);
  screen.back.material.color.setHex(WORLDS.night.back);

  const composer = new EffectComposer(renderer);
  composer.renderToScreen = false;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.85, 0.55, 0.12);
  if (F.mobile) { bloom.strength = 0.5; bloom.threshold = 0.2; }
  composer.addPass(bloom);
  const finalPass = new ShaderPass(FINAL_SHADER);
  composer.addPass(finalPass);

  // glyphs on the globe
  const glyphCache = new Map();
  let altKey = null, altAmt = 0, portrait = null;
  buildPortrait(meURL, N, 5.4).then((p) => (portrait = p)).catch(() => {});
  const aP8 = attrs.aP8;
  function glyph(key) {
    if (key === '__face') return portrait || buildText(['HELLO'], N, 5.6, fontFam, 21);
    if (!glyphCache.has(key)) glyphCache.set(key, buildText([key], N, key.length <= 2 ? 3.2 : 5.6, fontFam, 21));
    return glyphCache.get(key);
  }

  // anchors for every point
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
  const meta = shapes.meta;
  const entity = (e) => { const ea = (e / 6) * Math.PI * 2 + 0.4; return [Math.cos(ea) * 4.6, Math.sin(e * 1.7) * 1.3, Math.sin(ea) * 4.6]; };
  const cells = [...meta.goldCells, [-1.2, 0.6, 0.9], [1.4, -0.8, 0.9]];
  const A = {
    'd-raw': [1, [0.4, 1.7, 1.2]], 'd-raw-mismatch': [1, [2.3, -0.3, 1.0]], 'd-raw-blocked': [1, [0.1, -1.8, 1.2]],
    'd-clean-method': [2, cells[0]], 'd-clean-tool': [2, cells[1]],
    'd-shone': [4, [0, 0.95, 0]], 'd-geant': [5, [0, -1.8, 2.3]],
    'd-olive': [6, [-1.25, 0, -1.25]], 'd-latina': [6, [1.25, 1.7, 0.625]], 'd-jewelry': [6, [0.625, -1.7, -1.875]],
    'd-layer-ui': [6, [-2.5, 1.7, 2.5]], 'd-layer-logic': [6, [-2.5, 0, 2.5]], 'd-layer-data': [6, [-2.5, -1.7, 2.5]], 'd-team': [6, [0, 2.7, 0]],
    'd-home': [7, meta.home],
  };
  starTips().forEach((t, i) => (A[`d-sys-${i}`] = [3, t.map((v) => v * 1.14)]));
  TASKS.forEach(([, d], e) => (A[d] = [4, entity(e)]));
  meta.goldBars.forEach((p, i) => (A[METRICS[i][1]] = [5, p]));
  void SYSTEMS;
  const mile = MILESTONES.map(([st]) => pathD.pos.getPoint(pathParam(pathD, st + 0.1)).add(new THREE.Vector3(0, -2.4, 0)));

  // journey minimap (Night only)
  const mapSvg = document.querySelector('.minimap svg');
  const MX = (z) => ((22 - z) / 282) * 188 + 6, MY = (x) => ((x + 68) / 86) * 58 + 6;
  const mapDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  if (mapSvg && !mapSvg.childElementCount) {
    const pts = []; const q = new THREE.Vector3();
    for (let i = 0; i <= 120; i++) { pathD.pos.getPoint(i / 120, q); pts.push(`${MX(q.z).toFixed(1)},${MY(q.x).toFixed(1)}`); }
    mapSvg.innerHTML = `<polyline class="route" points="${pts.join(' ')}"/>`;
    SCENES.forEach((d, k) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'stop'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `Travel to chapter ${k}: ${STAGES[k].toLowerCase()}`);
      g.innerHTML = `<circle cx="${MX(d.pos[2]).toFixed(1)}" cy="${MY(d.pos[0]).toFixed(1)}" r="3.2"/><text x="${MX(d.pos[2]).toFixed(1)}" y="${(MY(d.pos[0]) - 6).toFixed(1)}">${String(k).padStart(2, '0')}</text>`;
      const go = () => env.goChapter(k);
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      mapSvg.appendChild(g);
    });
    mapDot.setAttribute('class', 'you'); mapDot.setAttribute('r', '3');
    mapSvg.appendChild(mapDot);
  }

  let screenAmt = 0, screenOn = false, lastScreenD = null;
  const screenC = new THREE.Vector3(), screenFrom = new THREE.Vector3(), tmp = new THREE.Vector3();
  const right = new THREE.Vector3(), upV = new THREE.Vector3();
  let ms = 0, dpr = renderer.getPixelRatio();

  return {
    id: 'night', camera, fovKick: 9,
    post: { conv: 0, grain: 0, vig: 0, ab: 0, grid: 0, light: 0 },
    pose(stage, P, L) {
      const u = pathParam(path, stage);
      path.pos.getPoint(u, P); path.look.getPoint(u, L);
      return F.fov;
    },
    focusDist(d) { return 5 + SCENES[A[d][0]].s * 2.2; },
    anchor(d, t, out) { const a = A[d]; if (!a) return null; return out.set(...a[1]).applyMatrix4(xform(a[0], t)).applyMatrix4(objs[a[0]].matrixWorld); },
    milestone(i, out) { return out.copy(mile[i]); },
    shock(x, y, t) { objs.forEach((o) => o.material.uniforms.uShock.value.set(x, y, t)); },
    resize(w, h, pr) {
      dpr = pr;
      const oldW = F.nameW, oldM = F.mobile;
      F = fit();
      camera.aspect = F.aspect; camera.updateProjectionMatrix();
      composer.setPixelRatio(pr); composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
      objs.forEach((o) => { o.material.uniforms.uAspect.value = F.aspect; o.material.uniforms.uPixelRatio.value = pr; });
      [ground, trail, sky, orb].forEach((o) => (o.material.uniforms.uPixelRatio.value = pr));
      finalPass.uniforms.uResolution.value.set(w * pr, h * pr);
      if (oldM !== F.mobile) { path = buildPath(F.mobile); placeOrb(); }
      if (Math.abs(oldW - F.nameW) / oldW > 0.08) { attrs.position.array.set(buildName(N, F.nameW, fontFam)); attrs.position.needsUpdate = true; glyphCache.clear(); }
    },
    quality(tier) { if (tier >= 2) bloom.enabled = false; },
    // shaders compile off the main thread where the browser allows it, before the first frame needs them
    precompile() { try { return renderer.compileAsync?.(scene, camera).catch(() => {}); } catch {} },
    update(c) {
      const { dt, time, stage, vel, mouse, mouseActive, introT, glyphKey, focusD, portalW } = c;
      ms += ((mouseActive ? 1 : 0) - ms) * Math.min(1, dt * 3);
      const desired = stage > 6.6 ? glyphKey : null;
      if (desired !== altKey) {
        altAmt = Math.max(0, altAmt - dt * 5);
        if (altAmt <= 0.001) { altKey = desired; if (altKey) { aP8.array.set(glyph(altKey)); aP8.needsUpdate = true; } }
      } else if (altKey) altAmt = Math.min(1, altAmt + dt * 1.8);
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
        u.uPortal.value = portalW;
        u.uTanHalf.value = Math.tan((camera.fov * Math.PI) / 360);
      });
      objs[0].material.uniforms.uIntro.value = introT;
      [ground, trail, sky, orb].forEach((o) => (o.material.uniforms.uTime.value = time));
      const fr = stage - Math.floor(stage), motion = Math.sin(Math.PI * fr);
      finalPass.uniforms.uTime.value = time;
      finalPass.uniforms.uGlitch.value = c.glitch;
      finalPass.uniforms.uAberration.value = (0.0022 + Math.min(0.02, vel * 0.01) + motion * 0.004 + altAmt * (1 - altAmt) * 0.02) * (reduced ? 0.3 : 1);
      if (mapSvg) { mapDot.setAttribute('cx', MX(camera.position.z).toFixed(1)); mapDot.setAttribute('cy', MY(camera.position.x).toFixed(1)); }

      // a project screen assembled from particles
      const want = !!(focusD && canv[focusD]);
      if (want && focusD !== lastScreenD) { screen.setTexture(focusD, canv[focusD].canvas); if (!screenOn) screenAmt = 0; screenOn = true; lastScreenD = focusD; }
      if (!want) lastScreenD = null;
      if (!want && screenAmt < 0.01) screenOn = false;
      screenAmt += ((want ? 1 : 0) - screenAmt) * Math.min(1, dt * (want ? 0.9 : 2.2));
      screen.points.visible = screen.plane.visible = screen.back.visible = screenAmt > 0.005;
      if (screen.points.visible) {
        right.setFromMatrixColumn(camera.matrixWorld, 0); upV.setFromMatrixColumn(camera.matrixWorld, 1);
        const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
        if (focusD) this.anchor(focusD, time, screenFrom);
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
    },
    render() {
      renderer.setClearColor(WORLDS.night.clear, 1);
      composer.render();
      return composer.readBuffer.texture;
    },
    labelMute() { return altAmt; },
    glyphActive(stage) { return stage > 6.6; },
    hasProjectScreen: true,
  };
  void PROJECTS;
}
