import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Building blocks for the Monument: materials painted on canvas, merged static geometry, and the volumes of light.
// Units are metres. The hall floor and the desert floor are y = 0.

let seed = 7;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
export function tex(c, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

// board-formed concrete: panels with tie holes, vertical weathering, a little colour drift.
// returns a colour map and a matching bump map
export function concreteTex(tone = [138, 128, 116]) {
  const S = 1024, [c, g] = cvs(S, S), [b, bg] = cvs(S, S);
  g.fillStyle = `rgb(${tone})`; g.fillRect(0, 0, S, S);
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) {
    const v = (rnd() - 0.5) * 34, x = rnd() * S, y = rnd() * S, s = 1 + rnd() * 3;
    g.fillStyle = `rgba(${tone[0] + v | 0},${tone[1] + v | 0},${tone[2] + v | 0},0.35)`; g.fillRect(x, y, s, s);
    bg.fillStyle = `rgba(${128 + v * 2 | 0},${128 + v * 2 | 0},${128 + v * 2 | 0},0.5)`; bg.fillRect(x, y, s, s);
  }
  // panels: 2 across, 4 down per tile (a tile is 4.8 m), each with a slight tone of its own
  for (let py = 0; py < 4; py++) for (let px = 0; px < 2; px++) {
    const k = (rnd() - 0.5) * 16;
    g.fillStyle = `rgba(${k > 0 ? '255,250,240' : '20,16,12'},${Math.abs(k) / 260})`; g.fillRect(px * 512, py * 256, 512, 256);
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 3; tx++) {
      const x = px * 512 + 96 + tx * 160, y = py * 256 + 72 + ty * 112;
      g.fillStyle = 'rgba(30,26,22,0.55)'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      bg.fillStyle = '#2a2a2a'; bg.beginPath(); bg.arc(x, y, 6, 0, Math.PI * 2); bg.fill();
    }
  }
  g.fillStyle = 'rgba(25,20,16,0.5)'; bg.fillStyle = '#3a3a3a';
  for (let i = 0; i <= 2; i++) { g.fillRect(i * 512 - 1, 0, 3, S); bg.fillRect(i * 512 - 1, 0, 3, S); }
  for (let i = 0; i <= 4; i++) { g.fillRect(0, i * 256 - 1, S, 2); bg.fillRect(0, i * 256 - 1, S, 2); }
  // rain streaks and stains
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S, y = rnd() * S, h = 60 + rnd() * 380, w = 2 + rnd() * 10;
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(20,16,12,0.16)'); gr.addColorStop(1, 'rgba(20,16,12,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '30,24,18' : '230,220,200'},${0.03 + rnd() * 0.05})`; g.beginPath(); g.ellipse(rnd() * S, rnd() * S, 40 + rnd() * 140, 30 + rnd() * 90, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  return { map: tex(c), bump: tex(b, { srgb: false }) };
}
// polished floor: large stone slabs with fine joints
export function floorTex() {
  const S = 1024, [c, g] = cvs(S, S);
  g.fillStyle = '#3a342e'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 14000; i++) { const v = (rnd() - 0.5) * 26; g.fillStyle = `rgba(${58 + v | 0},${52 + v | 0},${46 + v | 0},0.4)`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 2); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(200,190,170,${0.02 + rnd() * 0.04})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const x = rnd() * S, y = rnd() * S; g.moveTo(x, y); g.bezierCurveTo(x + 80, y + rnd() * 60, x + 140, y - rnd() * 60, x + 260, y + rnd() * 40); g.stroke(); }
  g.fillStyle = 'rgba(10,8,6,0.8)';
  for (let i = 0; i <= 2; i++) { g.fillRect(i * 512 - 1, 0, 2, S); g.fillRect(0, i * 512 - 1, S, 2); }
  return tex(c);
}
// sand ripples as a normal map: wind lines with a little wander
export function rippleNormal() {
  const S = 512, [c, g] = cvs(S, S), h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S;
    const warp = Math.sin((u * 3 + v * 2) * Math.PI * 2) * 0.03 + Math.sin((u * 7 - v * 5) * Math.PI * 2) * 0.012;
    const p = (v + warp) * 26;
    const f = p - Math.floor(p);
    h[y * S + x] = f < 0.7 ? f / 0.7 : (1 - f) / 0.3;
  }
  const im = g.createImageData(S, S), d = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, xl = h[y * S + ((x - 1 + S) % S)], xr = h[y * S + ((x + 1) % S)], yu = h[((y - 1 + S) % S) * S + x], yd = h[((y + 1) % S) * S + x];
    const nx = (xl - xr) * 1.2, ny = (yu - yd) * 1.2, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    d[i * 4] = (nx / l * 0.5 + 0.5) * 255; d[i * 4 + 1] = (ny / l * 0.5 + 0.5) * 255; d[i * 4 + 2] = (nz / l * 0.5 + 0.5) * 255; d[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return tex(c, { srgb: false });
}

// light projected on stone: large type, as if from a projector across the hall
export function projection({ w = 1536, h = 768, eyebrow = '', title = '', year = '', lines = [], align = 'left', fonts }) {
  const [c, g] = cvs(w, h);
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const x0 = align === 'center' ? w / 2 : w * 0.06;
  g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
  try { g.fontStretch = 'expanded'; } catch {}
  let y = h * 0.2;
  if (year) { g.font = `200 ${Math.round(h * 0.3)}px ${fonts.display}`; g.globalAlpha = 0.9; g.fillText(year, x0, y + h * 0.17); y += h * 0.3; }
  if (eyebrow) { g.font = `500 ${Math.round(h * 0.034)}px ${fonts.mono}`; g.globalAlpha = 0.75; try { g.letterSpacing = '6px'; } catch {} g.fillText(eyebrow.toUpperCase(), x0, y); try { g.letterSpacing = '0px'; } catch {} y += h * 0.085; }
  if (title) {
    let size = Math.round(h * 0.085); g.font = `600 ${size}px ${fonts.display}`;
    while (g.measureText(title.toUpperCase()).width > w * 0.88 && size > 20) { size -= 2; g.font = `600 ${size}px ${fonts.display}`; }
    g.globalAlpha = 1; g.fillText(title.toUpperCase(), x0, y); y += h * 0.075;
  }
  try { g.fontStretch = 'normal'; } catch {}
  g.font = `400 ${Math.round(h * 0.036)}px ${fonts.body}`; g.globalAlpha = 0.82;
  for (const l of lines) { g.fillText(l, x0, y); y += h * 0.055; }
  g.globalAlpha = 1;
  const t = tex(c, { repeat: false }); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- static geometry, merged per material ----------
export class Batch {
  constructor() { this.map = new Map(); }
  add(geo, mat, matrix, uv = 0.21) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(matrix);
    if (uv) planarUV(g, uv);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
    return this;
  }
  box(mat, pos, size, uv, rotY = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(...size), mat, m, uv);
  }
  // a box given by its min and max corners
  span(mat, a, b, uv) { return this.box(mat, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])], uv); }
  at(geo, mat, pos, rot = [0, 0, 0], scale = [1, 1, 1], uv) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    return this.add(geo, mat, m, uv);
  }
  build(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, list] of this.map) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); out.push(m); }
    this.map.clear();
    return out;
  }
}
export function planarUV(g, s) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, p.getX(i) * s, p.getZ(i) * s);
    else if (nx >= nz) uv.setXY(i, p.getZ(i) * s, p.getY(i) * s);
    else uv.setXY(i, p.getX(i) * s, p.getY(i) * s);
  }
  uv.needsUpdate = true;
}

// the planar mirror the hall floor reflects with: render the scene from below the floor into a texture
export function createMirror(renderer, { y = 0, scale = 0.5, samples = 0 } = {}) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples });
  const cam = new THREE.PerspectiveCamera();
  const textureMatrix = new THREE.Matrix4();
  const plane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), up = new THREE.Vector3();
  const N = new THREE.Vector3(0, 1, 0), P0 = new THREE.Vector3(0, y, 0);
  return {
    texture: rt.texture, textureMatrix,
    resize(w, h) { rt.setSize(Math.max(4, Math.round(w * scale)), Math.max(4, Math.round(h * scale))); },
    render(scene, camera, hide = []) {
      camPos.setFromMatrixPosition(camera.matrixWorld);
      if (camPos.y < y) return false;
      look.set(0, 0, -1).applyQuaternion(camera.quaternion).add(camPos);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      cam.position.set(camPos.x, 2 * y - camPos.y, camPos.z);
      look.y = 2 * y - look.y; up.y = -up.y;
      cam.up.copy(up); cam.lookAt(look);
      cam.far = camera.far; cam.near = camera.near;
      cam.updateMatrixWorld();
      cam.projectionMatrix.copy(camera.projectionMatrix);
      textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      textureMatrix.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      // oblique near plane: nothing below the floor ends up in the reflection
      plane.setFromNormalAndCoplanarPoint(N, P0).applyMatrix4(cam.matrixWorldInverse);
      clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      const pm = cam.projectionMatrix.elements;
      q.x = (Math.sign(clip.x) + pm[8]) / pm[0]; q.y = (Math.sign(clip.y) + pm[9]) / pm[5]; q.z = -1; q.w = (1 + pm[10]) / pm[14];
      clip.multiplyScalar(2 / clip.dot(q));
      pm[2] = clip.x; pm[6] = clip.y; pm[10] = clip.z + 1 - 0.003; pm[14] = clip.w;
      const vis = hide.map((o) => o.visible); hide.forEach((o) => (o.visible = false));
      const prevRT = renderer.getRenderTarget(), prevShadow = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
      renderer.setRenderTarget(prevRT); renderer.shadowMap.autoUpdate = prevShadow;
      hide.forEach((o, i) => (o.visible = vis[i]));
      return true;
    },
  };
}
// teach a standard material to add the mirror's picture, blurred and broken up by the surface
export function addReflection(mat, mirror, { strength = 0.5, blur = 1.5, distort = 0.012, normalTex = null } = {}) {
  const U = { tMirror: { value: mirror.texture }, uMirrorM: { value: mirror.textureMatrix }, uReflStr: { value: strength }, uReflBlur: { value: blur }, uReflDist: { value: distort }, uTime: { value: 0 } };
  mat.userData.refl = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uMirrorM; varying vec4 vMirrorUv; varying vec3 vReflW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 rw = modelMatrix*vec4(transformed, 1.0); vReflW = rw.xyz; vMirrorUv = uMirrorM*rw;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tMirror; uniform float uReflStr, uReflBlur, uReflDist, uTime; varying vec4 vMirrorUv; varying vec3 vReflW;\nfloat rh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }')
      .replace('#include <opaque_fragment>', `
        {
          vec2 muv = vMirrorUv.xy/vMirrorUv.w;
          vec2 wob = vec2(sin(vReflW.x*1.7 + vReflW.z*0.9), cos(vReflW.z*1.3 - vReflW.x*0.7))*uReflDist;
          vec3 V = normalize(cameraPosition - vReflW);
          float fres = 0.18 + 0.82*pow(1.0 - max(V.y, 0.0), 4.0);
          float spread = uReflBlur*0.0025*(1.0 + distance(cameraPosition, vReflW)*0.02);
          vec3 r = vec3(0.0);
          r += texture2D(tMirror, muv + wob).rgb*0.28;
          r += texture2D(tMirror, muv + wob + vec2( spread, 0.0)).rgb*0.18;
          r += texture2D(tMirror, muv + wob + vec2(-spread, 0.0)).rgb*0.18;
          r += texture2D(tMirror, muv + wob + vec2(0.0,  spread*1.6)).rgb*0.18;
          r += texture2D(tMirror, muv + wob + vec2(0.0, -spread*1.6)).rgb*0.18;
          outgoingLight += r*uReflStr*fres*(1.0 - roughnessFactor*0.6);
        }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'mirror' + (normalTex ? 1 : 0);
  return U;
}
