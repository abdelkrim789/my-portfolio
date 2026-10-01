import * as THREE from 'three';
import { NOISE } from './particles.js';

// One shader drives every scene in the world; uKind picks the object.
const VERT = /* glsl */ `
uniform float uTime, uKind, uForm, uIntro, uPixelRatio, uSize, uMotion, uAspect, uTanHalf, uMouseStrength, uGain, uLens, uAlt, uFar, uLight, uAdd, uPortal;
uniform vec2 uMouse;
uniform vec3 uShock;
attribute vec3 aP1, aP2, aP3, aP5, aP6, aP7, aP8;
attribute vec4 aP4, aSeed, aExtra;
varying vec3 vColor;
varying float vFade;
uniform vec3 SAND, ICE, WHITE, FAULT, DIM;
${NOISE}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0., -s,c,0., 0.,0.,1.);}
float flag(float bit){ return mod(floor(aExtra.y / bit), 2.0); }
float h1(float n){ return fract(sin(n)*43758.5453); }

void shape(int i, out vec3 p, out vec3 c){
  float t = uTime;
  if (i == 0) {
    p = position + vnoise(position*0.6 + t*0.15)*0.035*uMotion;
    c = mix(SAND, WHITE, aSeed.z*0.7);
  } else if (i == 1) {
    p = aP1 + vnoise(aP1*0.3 + t*0.1)*0.7*uMotion;
    float bad = step(aSeed.y, 0.72);
    float flick = 0.7 + 0.45*step(0.55, h1(floor(t*9.0) + aSeed.w*97.0));
    c = mix(SAND*0.75, FAULT*(0.75 + 0.5*aSeed.z)*flick, bad);
  } else if (i == 2) {
    p = aP2;
    c = mix(ICE*0.85, WHITE, aSeed.z*0.35);
    c = mix(c, SAND*1.35, flag(1.0));
  } else if (i == 3) {
    p = rotZ(t*0.06) * aP3;
    c = mix(ICE*(0.65 + 0.45*aSeed.z), SAND*1.45, flag(2.0));
  } else if (i == 4) {
    float e = aP4.x, ph = aP4.y, role = aP4.z, spd = aP4.w;
    float ea = e/6.0*6.28318 + 0.4;
    vec3 ec = vec3(cos(ea)*4.6, sin(e*1.7)*1.3, sin(ea)*4.6);
    vec3 d = normalize(aSeed.xyz - 0.5 + 0.0001);
    if (role < 0.5) {
      float tt = fract(ph + t*0.055*spd);
      float rr = 4.6*pow(1.0 - tt, 1.25) + 0.12;
      float a = ea + tt*4.2;
      p = vec3(cos(a)*rr, ec.y*(1.0 - tt)*(1.0 - tt), sin(a)*rr) + d*(1.0 - tt)*0.28;
      c = mix(SAND*0.95, WHITE*1.35, tt*tt);
    } else if (role < 1.5) {
      p = ec + d*0.42*pow(aSeed.w, 0.5);
      c = SAND*1.1;
    } else {
      p = d*0.8*pow(aSeed.w, 0.33)*(1.0 + 0.06*sin(t*2.0));
      c = WHITE*1.5;
    }
    p = rotY(t*0.05) * p;
  } else if (i == 5) {
    vec3 q = aP5;
    q.y = -1.8 + (q.y + 1.8)*(0.94 + 0.06*sin(t*1.3 + q.x*1.7 + q.z*2.3));
    p = q;
    c = mix(ICE*0.75, SAND*1.4, flag(4.0));
  } else if (i == 6) {
    vec3 q = aP6;
    float trav = step(0.0, aExtra.z);
    q.y = mix(q.y, mix(-1.7, 1.7, fract(aExtra.z + t*0.16*(0.6 + aSeed.x))), trav);
    p = rotY(t*0.09) * q;
    vec3 lc = q.y < -0.8 ? SAND*0.9 : (q.y < 0.8 ? ICE*0.9 : WHITE*0.8);
    c = mix(lc, WHITE*1.6, trav);
  } else {
    p = rotY(sin(t*0.13)*0.4 - 0.1) * aP7;
    c = DIM;
    if (aExtra.x >= 0.0) {
      float pulse = smoothstep(0.14, 0.0, fract(aExtra.x - t*0.3 + aExtra.w*0.137));
      c = mix(SAND*0.6, WHITE*1.7, pulse);
    }
    c = mix(c, SAND*1.7, flag(8.0));
    c *= 0.35 + 0.65*smoothstep(-1.5, 2.5, p.z);
  }
}

void main(){
  int k = int(uKind + 0.5);
  vec3 p, col;
  shape(k, p, col);

  // scenes assemble as the camera arrives and scatter as it leaves
  vec3 dir = normalize(aSeed.xyz - 0.5 + 0.0001);
  float fk = clamp((uForm*(1.0 - 0.75*uPortal) - aSeed.x*0.35)/0.65, 0.0, 1.0);
  fk = fk*fk*(3.0 - 2.0*fk);
  vec3 scat = p + dir*(3.0 + aSeed.w*9.0) + vnoise(p*0.2 + uTime*0.2)*3.0;
  float mvT = sin(3.14159*fk);
  p = mix(scat, p, fk);
  p += vnoise(p*0.35 + uTime*0.3 + aSeed.w*4.0) * mvT * 1.1 * uMotion;
  col = mix(col*(0.2 + 0.8*fk), col, uLight) + mvT*vec3(0.5, 0.55, 0.65)*0.8*uAdd;
  float vf = mix(1.0, 0.12 + 0.88*fk, uLight);

  if (k == 7) {
    float al = clamp((uAlt - aSeed.x*0.3)/0.7, 0.0, 1.0);
    al = al*al*(3.0 - 2.0*al);
    vec3 gp = rotX(-0.36) * (aP8 + vnoise(aP8*0.9 + uTime*0.3)*0.035);
    p = mix(p, gp, al);
    col = mix(col, mix(SAND*1.25, WHITE*1.25, aSeed.z*0.8), al);
    float am = sin(3.14159*al);
    p += vnoise(p*0.5 + uTime*0.45)*am*1.3*uMotion;
    col += am*vec3(0.55, 0.5, 0.42)*uAdd;
  }

  float it = 1.0;
  if (k == 0) {
    float burst = smoothstep(0.0, 0.3, uIntro);
    vec3 bp = dir * (1.5 + aSeed.w*6.5) * burst + vnoise(dir*2.0 + uTime*0.4)*burst*1.2;
    it = clamp((uIntro - 0.28 - aSeed.x*0.4)/0.32, 0.0, 1.0);
    it = 1.0 - pow(1.0 - it, 3.0);
    p = mix(bp, p, it);
    col = mix(WHITE*(1.2 + 1.2*(1.0 - burst)), col, it);
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dz = max(0.05, -mv.z);
  float vs = uTanHalf * dz;
  vec2 mS = uMouse*vec2(uAspect, 1.0)*vs;

  float lensW = 0.0;
  if (k == 1 && uLens > 0.001) {
    vec2 dl = mv.xy - mS;
    float r = 0.22*dz;
    lensW = exp(-dot(dl, dl)/(r*r)) * uLens * fk;
    vec3 pq = floor(p/0.3 + 0.5)*0.3;
    p = mix(p, pq, lensW);
    col = mix(col, ICE*1.35, lensW);
    mv = modelViewMatrix * vec4(p, 1.0);
  }

  vec2 d = mv.xy - mS;
  float rr = 0.14*dz;
  float fall = exp(-dot(d, d)/(rr*rr));
  float ms = uMouseStrength * uMotion * (1.0 - lensW);
  mv.xy += normalize(d + 1e-4) * fall * ms * (0.05 + aSeed.y*0.06) * dz;
  mv.xy += vec2(-d.y, d.x)/max(rr, 1e-3) * fall * 0.03 * ms * dz;
  col += fall * ms * vec3(0.35, 0.45, 0.55) * uAdd;

  float sT = uTime - uShock.z;
  if (sT > 0.0 && sT < 3.0) {
    vec2 ds = mv.xy - uShock.xy*vec2(uAspect, 1.0)*vs;
    float dist = length(ds);
    float w = 0.12*dz;
    float wave = exp(-pow((dist - sT*0.9*dz)/w, 2.0)) * exp(-sT*1.4) * uMotion;
    mv.xy += normalize(ds + 1e-4) * wave * (0.04 + aSeed.y*0.06) * dz;
    col += wave * vec3(0.9, 0.95, 1.0) * 1.4 * uAdd;
  }

  // flying through: clear the space right in front of the lens
  float near = 1.0 - smoothstep(0.4, 4.0, dz);
  mv.xy += normalize(mv.xy + 1e-4) * near * 2.2;
  float df = smoothstep(0.3, 2.0, dz) * smoothstep(uFar, uFar*0.3, dz);
  col *= mix(df, 1.0, uLight);
  vFade = vf * mix(1.0, df, uLight);

  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.5 + aSeed.z*0.95) * (1.0 + mvT*0.4);
  gl_PointSize = min(size * uPixelRatio / dz, 40.0 * uPixelRatio);
  vColor = col * uGain;
}
`;

const FRAG = /* glsl */ `
uniform float uLight, uAlpha;
varying vec3 vColor;
varying float vFade;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (uLight > 0.5) {
    float a = smoothstep(0.5, 0.2, d);
    gl_FragColor = vec4(min(vColor, vec3(1.0)), a * vFade * uAlpha);
  } else {
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * a * a, 1.0);
  }
}
`;

const ADD = { transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending };

export function sharedGeometry(N, shapes, namePositions) {
  const attrs = {
    position: new THREE.BufferAttribute(namePositions, 3),
    aP8: new THREE.BufferAttribute(new Float32Array(N * 3), 3),
  };
  for (const k of ['aP1', 'aP2', 'aP3', 'aP5', 'aP6', 'aP7']) attrs[k] = new THREE.BufferAttribute(shapes[k], 3);
  for (const k of ['aP4', 'aSeed', 'aExtra']) attrs[k] = new THREE.BufferAttribute(shapes[k], 4);
  return attrs;
}

export function createScene(attrs, kind, count, sizeScale) {
  const geo = new THREE.BufferGeometry();
  for (const [k, v] of Object.entries(attrs)) geo.setAttribute(k, v);
  geo.setDrawRange(0, count);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, ...ADD,
    uniforms: {
      uTime: { value: 0 }, uKind: { value: kind }, uForm: { value: 0 }, uIntro: { value: 1 },
      uPixelRatio: { value: 1 }, uSize: { value: 26 * sizeScale }, uMotion: { value: 1 },
      uAspect: { value: 1 }, uTanHalf: { value: Math.tan((45 * Math.PI) / 360) },
      uMouse: { value: new THREE.Vector2(9, 9) }, uMouseStrength: { value: 0 }, uGain: { value: 0.5 },
      uLens: { value: 0 }, uAlt: { value: 0 }, uShock: { value: new THREE.Vector3(0, 0, -99) }, uFar: { value: 150 },
      uLight: { value: 0 }, uAdd: { value: 1 }, uAlpha: { value: 1 }, uPortal: { value: 0 },
      SAND: { value: new THREE.Color() }, ICE: { value: new THREE.Color() }, WHITE: { value: new THREE.Color() },
      FAULT: { value: new THREE.Color() }, DIM: { value: new THREE.Color() },
    },
  });
  mat.uniforms.uSize.userBase = 26 * sizeScale;
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// Night dunes: a field of points shaped by layered noise.
export function duneHeight(x, z) {
  return 1.1 * Math.sin(x * 0.11 + Math.sin(z * 0.05) * 2.0) * Math.cos(z * 0.07)
    + 0.7 * Math.sin((x + z) * 0.19) + 0.35 * Math.sin(x * 0.43 - z * 0.31) + 0.8;
}
export function createGround(count, bounds) {
  const pos = new Float32Array(count * 3), s = new Float32Array(count);
  const [x0, x1, z0, z1] = bounds;
  for (let i = 0; i < count; i++) {
    const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0);
    pos[i * 3] = x; pos[i * 3 + 1] = duneHeight(x, z) - 1.2; pos[i * 3 + 2] = z; s[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uFar: { value: 150 }, uGain: { value: 1 },
      uLo: { value: new THREE.Color() }, uHi: { value: new THREE.Color() }, uK: { value: 1 }, uLight: { value: 0 }, uGrid: { value: 0 } },
    vertexShader: `attribute float aS; uniform float uTime, uPixelRatio, uFar, uGain, uK, uLight, uGrid; uniform vec3 uLo, uHi; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); float dz = max(0.1,-mv.z);
        gl_Position = projectionMatrix*mv;
        float gx = abs(fract(position.x*0.2) - 0.5), gz = abs(fract(position.z*0.2) - 0.5);
        float line = max(step(0.465, gx), step(0.465, gz));
        float gm = mix(1.0, mix(0.12, 2.6, line), uGrid);
        gl_PointSize = min((1.4+aS*1.8)*uPixelRatio*26.0/dz*mix(1.0, 0.8, uLight), 7.0*uPixelRatio);
        float h = clamp((position.y + 1.2)/3.0, 0.0, 1.0);
        vec3 c = mix(uLo, uHi, h);
        float tw = 0.75 + 0.25*sin(uTime*1.3 + aS*60.0);
        float f = tw*uK*gm*smoothstep(uFar, uFar*0.25, dz)*smoothstep(0.5, 3.0, dz);
        vC = mix(c*f*uGain, c, uLight); vA = f; }`,
    fragmentShader: `uniform float uLight; varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5);
      if (uLight > 0.5) gl_FragColor=vec4(vC, vA*smoothstep(0.5,0.2,d)); else gl_FragColor=vec4(vC*smoothstep(0.5,0.1,d),1.0); }`,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

// A river of data that runs under the camera path from chapter to chapter.
export function createTrail(curve, count) {
  const pos = new Float32Array(count * 3), u = new Float32Array(count), s = new Float32Array(count);
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    curve.getPoint(t, tmp); curve.getTangent(t, tan);
    side.crossVectors(tan, up).normalize();
    const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 0.6) * 0.9;
    tmp.addScaledVector(side, Math.cos(a) * r).addScaledVector(up, -2.6 + Math.sin(a) * r * 0.5);
    pos.set([tmp.x, tmp.y, tmp.z], i * 3); u[i] = t; s[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aU', new THREE.BufferAttribute(u, 1));
  geo.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uFar: { value: 150 }, uGain: { value: 1 },
      uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() }, uK: { value: 1 }, uLight: { value: 0 } },
    vertexShader: `attribute float aU, aS; uniform float uTime, uPixelRatio, uFar, uGain, uK, uLight; uniform vec3 uA, uB, uC; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); float dz = max(0.1,-mv.z);
        gl_Position = projectionMatrix*mv;
        float ph = fract(aU*14.0 - uTime*0.18 + aS*0.05);
        float pulse = smoothstep(0.86, 1.0, ph);
        gl_PointSize = min((1.0 + aS + pulse*2.0)*uPixelRatio*20.0/dz, 10.0*uPixelRatio);
        vec3 c = mix(uA, uB, smoothstep(0.08, 0.3, aU));
        c = mix(c, uC, smoothstep(0.75, 1.0, aU));
        float f = (0.3 + pulse*1.5)*uK*smoothstep(uFar, uFar*0.25, dz)*smoothstep(0.5, 3.0, dz);
        vC = mix(c*f*uGain, c, uLight); vA = f; }`,
    fragmentShader: `uniform float uLight; varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5);
      if (uLight > 0.5) gl_FragColor=vec4(vC, min(1.0, vA*0.8)*smoothstep(0.5,0.2,d)); else gl_FragColor=vec4(vC*smoothstep(0.5,0.0,d),1.0); }`,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

export function createSky(count) {
  const pos = new Float32Array(count * 3), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, y = Math.random() * 0.95 + 0.02, r = 380;
    const k = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * k * r, y * r - 40, Math.sin(a) * k * r - 120], i * 3); s[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color(0.7, 0.76, 0.92) } },
    vertexShader: `attribute float aS; uniform float uTime, uPixelRatio; varying float vA;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=(0.8+aS*aS*2.4)*uPixelRatio; vA=(0.25+0.75*aS*aS)*(0.7+0.3*sin(uTime*0.8+aS*50.0)); }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(uColor*smoothstep(0.5,0.0,d)*vA,1.0); }`,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

// A celestial body in the sky: a moon at night, an engraved sun by day, a drafting circle on the blueprint.
export function createOrb(count) {
  const pos = new Float32Array(count * 3), kind = new Float32Array(count), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const q = Math.random(); let x, y, k;
    if (q < 0.3) { const a = Math.random() * Math.PI * 2, r = 1 + (Math.random() - 0.5) * 0.012; x = Math.cos(a) * r; y = Math.sin(a) * r; k = 0; }
    else if (q < 0.48) { const a = Math.random() * Math.PI * 2, rs = [0.86, 0.7, 0.52]; const r = rs[Math.floor(Math.random() * 3)]; x = Math.cos(a) * r; y = Math.sin(a) * r; k = 1; }
    else if (q < 0.58) { const t = Math.random() * 2.8 - 1.4; if (Math.random() < 0.5) { x = t; y = 0; } else { x = 0; y = t; } k = 2; }
    else { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()); x = Math.cos(a) * r; y = Math.sin(a) * r;
      if (Math.abs((x + y) * 4.0 - Math.round((x + y) * 4.0)) < 0.12 && Math.random() < 0.7) k = 4; else k = 3; }
    pos.set([x, y, 0], i * 3); kind[i] = k; s[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aK', new THREE.BufferAttribute(kind, 1));
  geo.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() }, uLight: { value: 0 },
      uFill: { value: 0.3 }, uRim: { value: 1 }, uCross: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float aK, aS; uniform float uTime, uPixelRatio, uFill, uRim, uCross, uLight; varying float vA;
      void main(){ vec3 p = position; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
        gl_PointSize = (aK < 0.5 ? 2.2 : 1.6)*uPixelRatio;
        float w = aK < 0.5 ? uRim : aK < 1.5 ? uRim*0.55 : aK < 2.5 ? uCross : aK < 3.5 ? uFill*(0.6 + 0.4*sin(uTime*0.3 + aS*20.0)) : max(uFill, uLight*0.5);
        vA = w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uLight, uAlpha; varying float vA; void main(){ float d=length(gl_PointCoord-0.5);
      if (uLight > 0.5) gl_FragColor=vec4(uColor, vA*uAlpha*smoothstep(0.5,0.2,d)); else gl_FragColor=vec4(uColor*vA*uAlpha*smoothstep(0.5,0.0,d),1.0); }`,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

// Re-ink every material for a world.
export function applyWorldToMaterials(W, { scenes, ground, trail, sky, orb }, gainFor) {
  const blend = W.light ? THREE.NormalBlending : THREE.AdditiveBlending;
  const setBlend = (m) => { if (m.blending !== blend) { m.blending = blend; m.needsUpdate = true; } };
  scenes.forEach((o, k) => {
    const u = o.material.uniforms; setBlend(o.material);
    for (const [key, v] of Object.entries(W.pal)) u[key].value.setRGB(...v);
    u.uLight.value = W.light; u.uAdd.value = W.add; u.uAlpha.value = W.alpha;
    u.uGain.value = W.light ? W.gain : gainFor(k) * W.gain;
    u.uSize.value = u.uSize.userBase * W.size;
  });
  { const u = ground.material.uniforms; setBlend(ground.material);
    u.uLo.value.setRGB(...W.ground.lo); u.uHi.value.setRGB(...W.ground.hi); u.uK.value = W.ground.k; u.uLight.value = W.light; u.uGrid.value = W.ground.grid; }
  { const u = trail.material.uniforms; setBlend(trail.material);
    u.uA.value.setRGB(...W.trail.a); u.uB.value.setRGB(...W.trail.b); u.uC.value.setRGB(...W.trail.c); u.uK.value = W.trail.k; u.uLight.value = W.light; }
  sky.visible = W.sky.show; sky.material.uniforms.uColor.value.setRGB(...W.sky.color);
  { const u = orb.material.uniforms; setBlend(orb.material);
    u.uColor.value.setRGB(...W.orb.color); u.uFill.value = W.orb.fill; u.uRim.value = W.orb.rim; u.uCross.value = W.orb.cross; u.uAlpha.value = W.orb.alpha; u.uLight.value = W.light; }
}
