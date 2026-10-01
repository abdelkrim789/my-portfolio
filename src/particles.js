import * as THREE from 'three';

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 vnoise(vec3 p){ return vec3(snoise(p), snoise(p+vec3(31.4,-7.2,11.9)), snoise(p+vec3(-17.3,71.9,5.1))); }
`;

const VERT = /* glsl */ `
uniform float uTime, uStage, uIntro, uPixelRatio, uSize, uMotion, uAspect, uTanHalf, uMouseStrength, uGain, uLens, uAlt;
uniform vec2 uMouse;
uniform vec3 uShock;
attribute vec3 aP8;
attribute vec3 aP1, aP2, aP3, aP5, aP6, aP7;
attribute vec4 aP4, aSeed, aExtra;
varying vec3 vColor;

const vec3 SAND = vec3(0.95, 0.74, 0.46);
const vec3 ICE = vec3(0.52, 0.82, 0.93);
const vec3 WHITE = vec3(1.0, 0.96, 0.9);
const vec3 FAULT = vec3(1.0, 0.26, 0.18);
const vec3 DIM = vec3(0.32, 0.42, 0.6);
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
    p = rotY(0.55 + sin(t*0.2)*0.08) * rotX(-0.32) * aP2;
    c = mix(ICE*0.85, WHITE, aSeed.z*0.35);
    c = mix(c, SAND*1.35, flag(1.0));
  } else if (i == 3) {
    p = rotX(-0.2) * rotY(sin(t*0.3)*0.28) * rotZ(t*0.08) * aP3 * 0.88;
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
    p = rotX(0.38) * rotY(t*0.05) * p;
  } else if (i == 5) {
    vec3 q = aP5;
    q.y = -1.8 + (q.y + 1.8)*(0.94 + 0.06*sin(t*1.3 + q.x*1.7 + q.z*2.3));
    p = rotY(-0.62 + sin(t*0.15)*0.14) * rotX(0.42) * q;
    c = mix(ICE*0.75, SAND*1.4, flag(4.0));
  } else if (i == 6) {
    vec3 q = aP6;
    float trav = step(0.0, aExtra.z);
    q.y = mix(q.y, mix(-1.7, 1.7, fract(aExtra.z + t*0.16*(0.6 + aSeed.x))), trav);
    p = rotX(0.5) * rotY(t*0.09) * q;
    vec3 lc = q.y < -0.8 ? SAND*0.9 : (q.y < 0.8 ? ICE*0.9 : WHITE*0.8);
    c = mix(lc, WHITE*1.6, trav);
  } else {
    p = rotX(0.36) * rotY(sin(t*0.13)*0.4 - 0.1) * aP7;
    c = DIM;
    if (aExtra.x >= 0.0) {
      float pulse = smoothstep(0.14, 0.0, fract(aExtra.x - t*0.3 + aExtra.w*0.137));
      c = mix(SAND*0.6, WHITE*1.7, pulse);
    }
    c = mix(c, SAND*1.7, flag(8.0));
    float facing = smoothstep(-1.5, 2.5, p.z);
    c *= 0.35 + 0.65*facing;
  }
}

void main(){
  float st = clamp(uStage, 0.0, 7.0);
  int i0 = int(floor(st));
  float f = st - float(i0);
  if (i0 >= 7) { i0 = 6; f = 1.0; }
  float key = aSeed.x;
  if (i0 == 1) key = clamp((aP1.x + 5.4)/10.8, 0.0, 1.0);
  float tl = clamp((f - key*0.55)/0.45, 0.0, 1.0);
  tl = tl*tl*(3.0 - 2.0*tl);

  vec3 pA, cA, pB, cB;
  shape(i0, pA, cA);
  shape(i0 + 1, pB, cB);
  vec3 p = mix(pA, pB, tl);
  vec3 col = mix(cA, cB, tl);
  float move = sin(3.14159*tl);
  p += vnoise(p*0.35 + uTime*0.3 + aSeed.w*4.0) * move * 1.5 * uMotion;
  col += move * (i0 == 1 ? vec3(0.35, 0.8, 1.0) : vec3(0.55, 0.6, 0.7)) * 0.9;

  // final chapter: hovering a contact or credential re-forms the particles into a glyph
  float w7 = clamp(uStage - 6.0, 0.0, 1.0);
  float al = clamp((uAlt*w7 - aSeed.x*0.3)/0.7, 0.0, 1.0);
  al = al*al*(3.0 - 2.0*al);
  p = mix(p, aP8 + vnoise(aP8*0.9 + uTime*0.3)*0.035, al);
  col = mix(col, mix(SAND*1.25, WHITE*1.25, aSeed.z*0.8), al);
  float am = sin(3.14159*al);
  p += vnoise(p*0.5 + uTime*0.45)*am*1.3*uMotion;
  col += am*vec3(0.55, 0.5, 0.42);

  // real-time intro: a single point bursts, then settles into the name
  float burst = smoothstep(0.0, 0.3, uIntro);
  vec3 dir = normalize(aSeed.xyz - 0.5 + 0.0001);
  vec3 bp = dir * (1.5 + aSeed.w*6.5) * burst + vnoise(dir*2.0 + uTime*0.4)*burst*1.2;
  float it = clamp((uIntro - 0.28 - aSeed.x*0.4)/0.32, 0.0, 1.0);
  it = 1.0 - pow(1.0 - it, 3.0);
  p = mix(bp, p, it);
  col = mix(WHITE*(1.2 + 1.2*(1.0 - burst)), col, it);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float vscale = uTanHalf * (-mv.z);

  // raw chapter: the cursor is a repair lens that snaps nearby data onto a clean lattice
  float wRaw = clamp(1.0 - abs(uStage - 1.0)*2.2, 0.0, 1.0) * uLens * it;
  if (wRaw > 0.001) {
    vec2 dl = mv.xy - uMouse*vec2(uAspect, 1.0)*vscale;
    float lf = exp(-dot(dl, dl)/2.4) * wRaw;
    vec3 pq = floor(p/0.3 + 0.5)*0.3;
    p = mix(p, pq, lf);
    col = mix(col, ICE*1.35, lf);
    mv = modelViewMatrix * vec4(p, 1.0);
  }

  vec2 d = mv.xy - uMouse*vec2(uAspect, 1.0)*vscale;
  float fall = exp(-dot(d, d)/0.9);
  float ms = uMouseStrength * uMotion * (1.0 - wRaw);
  mv.xy += normalize(d + 1e-4) * fall * ms * (0.45 + aSeed.y*0.55);
  mv.xy += vec2(-d.y, d.x) * fall * 0.3 * ms;
  col += fall * ms * vec3(0.35, 0.45, 0.55);

  // click shockwave
  float sT = uTime - uShock.z;
  if (sT > 0.0 && sT < 3.0) {
    vec2 ds = mv.xy - uShock.xy*vec2(uAspect, 1.0)*vscale;
    float dist = length(ds);
    float wave = exp(-pow((dist - sT*5.5)*1.3, 2.0)) * exp(-sT*1.4) * uMotion;
    mv.xy += normalize(ds + 1e-4) * wave * (0.6 + aSeed.y*0.8);
    mv.z += wave * 0.8 * (aSeed.z - 0.3);
    col += wave * vec3(0.9, 0.95, 1.0) * 1.4;
  }

  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.5 + aSeed.z*0.95) * (1.0 + move*0.5);
  gl_PointSize = size * uPixelRatio / (-mv.z);
  vColor = col * uGain;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = a*a;
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

export function createParticles(N, shapes, namePositions) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(namePositions, 3));
  for (const k of ['aP1', 'aP2', 'aP3', 'aP5', 'aP6', 'aP7']) geo.setAttribute(k, new THREE.BufferAttribute(shapes[k], 3));
  geo.setAttribute('aP8', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  for (const k of ['aP4', 'aSeed', 'aExtra']) geo.setAttribute(k, new THREE.BufferAttribute(shapes[k], 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 }, uStage: { value: 0 }, uIntro: { value: 0 },
      uPixelRatio: { value: 1 }, uSize: { value: 26 }, uMotion: { value: 1 },
      uAspect: { value: 1 }, uTanHalf: { value: Math.tan((45 * Math.PI) / 360) },
      uMouse: { value: new THREE.Vector2(9, 9) }, uMouseStrength: { value: 0 }, uGain: { value: 0.5 },
      uLens: { value: 0 }, uAlt: { value: 0 }, uShock: { value: new THREE.Vector3(0, 0, -99) },
    },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

export function createDust(count = 2200) {
  const pos = new Float32Array(count * 3), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 44;
    pos[i * 3 + 2] = -8 - Math.random() * 50;
    s[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: `attribute float aS; uniform float uTime, uPixelRatio; varying float vA;
      void main(){ vec3 p=position; p.y+=sin(uTime*0.05+aS*20.0)*0.6; vec4 mv=modelViewMatrix*vec4(p,1.0);
      gl_Position=projectionMatrix*mv; gl_PointSize=(1.0+aS*2.0)*uPixelRatio*14.0/(-mv.z);
      vA=0.25+0.5*aS*(0.6+0.4*sin(uTime*0.7+aS*40.0)); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d);
      gl_FragColor=vec4(vec3(0.55,0.65,0.85)*a*vA,1.0); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

export const FINAL_SHADER = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uAberration: { value: 0.002 },
    uGlitch: { value: 0 }, uResolution: { value: new THREE.Vector2(1, 1) },
    uLight: { value: 0 }, uGrain: { value: 0.045 }, uPortal: { value: new THREE.Vector4(0.5, 0.5, 0, 0) },
    uRing: { value: new THREE.Color(1, 0.85, 0.6) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAberration, uGlitch, uLight, uGrain; uniform vec2 uResolution;
    uniform vec4 uPortal; uniform vec3 uRing;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
    void main(){
      vec2 uv = vUv;
      // the edge of the portal between worlds: a refracting, chromatic ring
      vec2 px = uv*uResolution;
      vec2 pc = uPortal.xy*uResolution;
      float pd = length(px - pc);
      float pw = 0.045*min(uResolution.x, uResolution.y);
      float ring = exp(-pow((pd - uPortal.z)/pw, 2.0)) * uPortal.w;
      vec2 pdir = normalize(px - pc + 1e-4);
      uv -= pdir/uResolution * ring * pw * 0.9;
      float band = floor(uv.y*28.0);
      float tick = floor(uTime*24.0);
      float on = step(0.72, hash(vec2(band, tick)));
      uv.x += (hash(vec2(band*1.7, tick)) - 0.5)*0.08*uGlitch*on;
      vec2 dir = uv - 0.5;
      float dl = length(dir);
      float ab = uAberration*(0.4 + dl*1.6) + uGlitch*0.012*on + ring*0.012;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir*ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir*ab).b;
      if (uLight > 0.5) {
        col *= mix(1.0, smoothstep(1.2, 0.35, dl), 0.22);
        float fiber = hash(floor(px/2.0) + 3.1) - 0.5;
        col += fiber*0.012;
      } else {
        col = 1.0 - exp(-col*1.25);
        col += vec3(0.012, 0.014, 0.03);
        col *= mix(1.0, smoothstep(1.05, 0.25, dl), 0.75);
      }
      col = mix(col, uRing, clamp(ring*0.85, 0.0, 1.0));
      col += (hash(uv*uResolution + fract(uTime)*100.0) - 0.5)*uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
