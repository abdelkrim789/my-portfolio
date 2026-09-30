import * as THREE from 'three';
import { NOISE } from './particles.js';

// Drop real screenshots into src/shots/ named olivepalace.*, latinadz.* or jewelry.* (png, jpg or webp)
// and rebuild: they replace the project cards automatically, framed in the same browser chrome.
const SHOTS = import.meta.glob('./shots/*.{png,jpg,jpeg,webp}', { eager: true, query: '?inline', import: 'default' });
function shotFor(key) {
  const hit = Object.entries(SHOTS).find(([path]) => path.split('/').pop().toLowerCase().startsWith(key));
  return hit ? hit[1] : null;
}

export const PROJECTS = {
  'd-olive': { key: 'olivepalace', name: 'Olive Palace', url: 'olivepalace.net', role: 'Lead backend developer',
    stack: ['Laravel', 'React (Vite)', 'MySQL'], line: "Algeria's first digital platform for the olive industry", accent: '#a9c46c', motif: 'olive' },
  'd-latina': { key: 'latinadz', name: 'LatinaDZ', url: 'latinadz.com', role: 'Full-stack developer',
    stack: ['Laravel', 'MySQL'], line: 'E-commerce with browsing, cart and checkout on every screen', accent: '#e8c07a', motif: 'catalog' },
  'd-jewelry': { key: 'jewelry', name: 'Jewelry Store System', url: 'desktop app · JavaFX', role: 'Individual project',
    stack: ['Java', 'JavaFX', 'SQLite'], line: 'Inventory, point of sale and reporting, built on MVC', accent: '#9fd8e6', motif: 'gem' },
};

const W = 1600, H = 1000, BAR = 64;

function chrome(g, p) {
  g.fillStyle = '#121626'; g.fillRect(0, 0, W, BAR);
  ['#ec5a42', '#e8c07a', '#7fb07a'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(34 + i * 30, BAR / 2, 8, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = '#1d2236';
  const x = 150, w = W - 300, h = 38, y = (BAR - h) / 2;
  g.beginPath(); g.roundRect(x, y, w, h, 19); g.fill();
  g.fillStyle = '#9095ab'; g.font = '500 20px "IBM Plex Mono", ui-monospace, monospace'; g.textBaseline = 'middle';
  g.fillText(p.url.includes('·') ? p.url : `https://${p.url}`, x + 22, BAR / 2 + 1);
}

function motif(g, p) {
  g.save();
  g.strokeStyle = p.accent; g.fillStyle = p.accent;
  const cx = W * 0.74, cy = H * 0.42;
  if (p.motif === 'olive') {
    // an olive branch: a curved stem with paired leaves and a few fruit
    g.lineWidth = 3; g.globalAlpha = 0.9;
    g.beginPath(); g.moveTo(cx - 330, cy + 220); g.quadraticCurveTo(cx - 40, cy + 40, cx + 300, cy - 230); g.stroke();
    for (let i = 0; i < 11; i++) {
      const t = i / 10, x = cx - 330 + 630 * t, y = cy + 220 - 450 * t - Math.sin(t * Math.PI) * 90;
      for (const s of [-1, 1]) {
        g.save(); g.translate(x, y); g.rotate(-0.65 + s * 0.95);
        g.globalAlpha = 0.25 + 0.5 * (1 - Math.abs(t - 0.5));
        g.beginPath(); g.ellipse(0, -s * 44, 15, 52, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      if (i % 3 === 1) { g.globalAlpha = 0.85; g.beginPath(); g.ellipse(x + 26, y + 34, 15, 20, 0.4, 0, Math.PI * 2); g.fill(); }
    }
  } else if (p.motif === 'catalog') {
    // a product grid seen at an angle
    g.lineWidth = 2;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = cx - 340 + c * 172 + r * 30, y = cy - 250 + r * 190;
      g.globalAlpha = 0.18 + 0.12 * ((r + c) % 3);
      g.strokeRect(x, y, 146, 160);
      g.globalAlpha *= 1.8; g.fillRect(x + 16, y + 124, 70, 8); g.fillRect(x + 16, y + 140, 40, 6);
    }
  } else {
    // a faceted gem
    g.lineWidth = 2.5;
    const top = [[-220, -60], [-120, -170], [120, -170], [220, -60]];
    const pts = [[-220, -60], [0, 250], [220, -60]];
    g.globalAlpha = 0.85; g.beginPath(); top.forEach(([x, y], i) => (i ? g.lineTo(cx + x, cy + y) : g.moveTo(cx + x, cy + y))); g.lineTo(cx + 220, cy - 60); g.lineTo(cx, cy + 250); g.closePath(); g.stroke();
    g.globalAlpha = 0.45;
    for (const [x, y] of [[-120, -170], [0, -60], [120, -170]]) { g.beginPath(); g.moveTo(cx + x, cy + y); g.lineTo(cx, cy + 250); g.stroke(); }
    g.beginPath(); g.moveTo(cx - 220, cy - 60); g.lineTo(cx + 220, cy - 60); g.stroke();
    g.beginPath(); g.moveTo(cx - 120, cy - 170); g.lineTo(cx, cy - 60); g.lineTo(cx + 120, cy - 170); g.stroke();
    void pts;
  }
  g.restore();
}

function card(g, p) {
  const bg = g.createLinearGradient(0, BAR, W, H);
  bg.addColorStop(0, '#0c0f1c'); bg.addColorStop(1, '#070810');
  g.fillStyle = bg; g.fillRect(0, BAR, W, H - BAR);
  g.strokeStyle = 'rgba(236,231,220,0.06)'; g.lineWidth = 1;
  for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, BAR); g.lineTo(x, H); g.stroke(); }
  for (let y = BAR; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  motif(g, p);
  g.textBaseline = 'alphabetic';
  g.fillStyle = p.accent; g.font = '500 24px "IBM Plex Mono", ui-monospace, monospace';
  g.fillText(p.role.toUpperCase(), 90, 170);
  g.fillStyle = '#ece7dc'; g.font = '800 170px "Big Shoulders Display", "Arial Narrow", Impact, sans-serif';
  const words = p.name.toUpperCase().split(' ');
  const lines = words.length > 2 ? [words.slice(0, 1).join(' '), words.slice(1).join(' ')] : [words.join(' ')];
  lines.forEach((l, i) => g.fillText(l, 84, 640 - (lines.length - 1 - i) * 158));
  g.fillStyle = 'rgba(236,231,220,0.8)'; g.font = '400 36px "IBM Plex Sans", system-ui, sans-serif';
  g.fillText(p.line, 90, 720);
  let x = 90;
  g.font = '500 24px "IBM Plex Mono", ui-monospace, monospace';
  for (const s of p.stack) {
    const w = g.measureText(s).width + 36;
    g.strokeStyle = 'rgba(236,231,220,0.3)'; g.beginPath(); g.roundRect(x, 790, w, 50, 25); g.stroke();
    g.fillStyle = '#ece7dc'; g.fillText(s, x + 18, 823); x += w + 14;
  }
}

async function loadImage(src) {
  const img = new Image(); img.src = src;
  await img.decode();
  return img;
}

// Returns a canvas: the real screenshot in browser chrome if one was added, otherwise the project card.
export async function projectCanvas(id) {
  const p = PROJECTS[id];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const src = shotFor(p.key);
  if (src) {
    try {
      const img = await loadImage(src);
      const s = Math.max(W / img.width, (H - BAR) / img.height);
      g.drawImage(img, 0, 0, W / s, (H - BAR) / s, 0, BAR, W, H - BAR);
      chrome(g, p);
      return { canvas: cv, real: true };
    } catch { /* fall back to the card */ }
  }
  card(g, p); chrome(g, p);
  return { canvas: cv, real: false };
}

// A screen that assembles from particles streaming out of a point in the world.
export function createScreen(cols, rows) {
  const n = cols * rows;
  const uv = new Float32Array(n * 2), seed = new Float32Array(n * 4);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i;
    uv[k * 2] = (i + 0.5) / cols; uv[k * 2 + 1] = (j + 0.5) / rows;
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], k * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aUV', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const uniforms = {
    uForm: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: 1 }, uScale: { value: 40 },
    uFrom: { value: new THREE.Vector3() }, uCenter: { value: new THREE.Vector3() },
    uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uTex: { value: null },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
    vertexShader: `
      uniform float uForm, uTime, uPixelRatio, uScale; uniform vec3 uFrom, uCenter, uRight, uUp; uniform sampler2D uTex;
      attribute vec2 aUV; attribute vec4 aSeed; varying vec3 vC; varying float vA;
      ${NOISE}
      void main(){
        vec3 target = uCenter + uRight*(aUV.x*2.0 - 1.0) + uUp*(aUV.y*2.0 - 1.0);
        float f = clamp((uForm - (aUV.x*0.3 + aSeed.x*0.25))/0.45, 0.0, 1.0);
        f = f*f*(3.0 - 2.0*f);
        vec3 start = uFrom + (aSeed.xyz - 0.5)*1.2;
        float m = sin(3.14159*f);
        vec3 p = mix(start, target, f) + vnoise(vec3(aUV*6.0, uTime*0.4) + aSeed.w*5.0)*m*1.4;
        vec4 mv = viewMatrix*vec4(p, 1.0);
        gl_Position = projectionMatrix*mv;
        float dz = max(0.2, -mv.z);
        gl_PointSize = min(uScale*uPixelRatio/dz*(1.0 + m*1.5), 24.0*uPixelRatio);
        vec3 tc = texture2D(uTex, aUV).rgb;
        vC = mix(vec3(0.95, 0.74, 0.46)*1.2, tc*0.95 + 0.015, f);
        vA = step(0.001, uForm) * (0.5 + 0.5*f);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC, vA*smoothstep(0.5, 0.3, d)); }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;

  const planeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, color: 0xbcbcbc });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), planeMat);
  plane.renderOrder = 6; plane.frustumCulled = false;

  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x05060b, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  back.renderOrder = 4; back.frustumCulled = false;
  const textures = new Map();
  return {
    points, plane, back, uniforms,
    setTexture(id, canvas) {
      if (!textures.has(id)) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.NoColorSpace; textures.set(id, t); }
      const t = textures.get(id);
      uniforms.uTex.value = t; planeMat.map = t; planeMat.needsUpdate = true;
    },
  };
}
