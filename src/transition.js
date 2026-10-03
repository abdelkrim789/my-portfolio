import * as THREE from 'three';

// Final composite: finishes the active world (A) and, during a world change, carries the previous one (B)
// through a transition chosen by the destination:
//   0 shatter (Night) · the old world cracks along Voronoi faults and falls away in shards
//   1 zellige (Medina) · the old world turns over tile by tile from your click, glazed like zellige as it flips
//   2 power   (Desk)  · the old world switches off like a CRT tube; the new one powers on, line first
// It also tone-maps HDR worlds, and applies a liquid cursor field and a tilt-shift band per world.
const FLUID_W = 192, FLUID_H = 120;

export function createComposite(renderer, opts = {}) {
  // ---------- cursor fluid: a tiny advected velocity field ----------
  const fluidOn = opts.fluid !== false;
  const mk = () => new THREE.WebGLRenderTarget(FLUID_W, FLUID_H, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  let fa = mk(), fb = mk();
  const fluidU = { tPrev: { value: null }, uMouse: { value: new THREE.Vector2(-1, -1) }, uVel: { value: new THREE.Vector2() }, uAspect: { value: 1 }, uDt: { value: 0.016 } };
  const fluidMat = new THREE.ShaderMaterial({
    uniforms: fluidU, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tPrev; uniform vec2 uMouse, uVel; uniform float uAspect, uDt; varying vec2 vUv;
      void main(){
        vec4 here = texture2D(tPrev, vUv);
        vec4 c = texture2D(tPrev, vUv - here.xy*uDt*0.9);
        c *= pow(0.9, uDt*60.0);
        vec2 d = (vUv - uMouse)*vec2(uAspect, 1.0);
        float g = exp(-dot(d, d)/0.0022);
        c.xy += uVel*g*0.9;
        c.z = min(1.0, c.z + length(uVel)*g*0.35);
        gl_FragColor = vec4(clamp(c.xy, vec2(-3.0), vec2(3.0)), c.z, 1.0);
      }`,
  });
  const fScene = new THREE.Scene(), fCam = new THREE.Camera();
  fScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fluidMat));
  const clearFluid = () => { const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha(); renderer.setClearColor(0x000000, 0); for (const t of [fa, fb]) { renderer.setRenderTarget(t); renderer.clear(); } renderer.setRenderTarget(null); renderer.setClearColor(cc, ca); };
  clearFluid();

  const uniforms = {
    tA: { value: null }, tB: { value: null }, tFluid: { value: fa.texture }, uT: { value: -1 }, uMode: { value: 0 },
    uOrigin: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uPostA: { value: new THREE.Vector4() }, uPostB: { value: new THREE.Vector4() }, uExtraA: { value: new THREE.Vector4() }, uExtraB: { value: new THREE.Vector4() },
    uCrack: { value: new THREE.Color(1, 0.85, 0.55) }, uGlitch: { value: 0 }, uFluidAmt: { value: fluidOn ? 1 : 0 }, uTilt: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D tA, tB, tFluid; uniform float uT, uMode, uAspect, uTime, uGlitch, uFluidAmt, uTilt; uniform vec2 uOrigin, uRes;
      uniform vec4 uPostA, uPostB, uExtraA, uExtraB; uniform vec3 uCrack;
      varying vec2 vUv;
      #define PI 3.14159265
      vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
      float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
        return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), f.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a*vn(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
      mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      float voro(vec2 x, out vec2 id){
        vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), o = h2(n + g), r = g + o - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
        md = 8.0;
        for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 g = mg + vec2(float(i), float(j)), o = h2(n + g), r = g + o - f; if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5*(mr + r), normalize(r - mr))); }
        id = n + mg; return md;
      }
      vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
      // Hill's ACES fit, as in three.js
      vec3 aces(vec3 c){
        const mat3 IM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 OM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        c = IM*c; vec3 a = c*(c + 0.0245786) - 0.000090537; vec3 b = c*(0.983729*c + 0.4329510) + 0.238081; return clamp(OM*(a/b), 0.0, 1.0);
      }
      // Khronos PBR Neutral: keeps product colours honest
      vec3 neutral(vec3 c){
        float x = min(c.r, min(c.g, c.b)); float off = x < 0.08 ? x - 6.25*x*x : 0.04; c -= off;
        float peak = max(c.r, max(c.g, c.b)); if (peak < 0.76) return c;
        float d = 0.24, np = 1.0 - d*d/(peak + d - 0.76); c *= np/peak;
        float g = 1.0 - 1.0/(0.15*(peak - np) + 1.0); return mix(c, vec3(np), g);
      }
      vec3 grade(vec3 c, vec4 P, vec4 E){
        if (E.w > 0.0) c = aces(c*E.w/0.6); else if (E.w < 0.0) c = neutral(c*(-E.w));
        return P.x > 0.5 ? toSRGB(c) : c;
      }
      vec3 tap(sampler2D t, vec2 uv, vec4 P, vec4 E){ return grade(texture2D(t, uv).rgb, P, E); }
      // per-world finishing. P: sRGB encode, grain, vignette, aberration. E: drafting grid, light world, tilt-shift, exposure (+ACES / -neutral)
      vec3 look(sampler2D t, vec2 uv, vec4 P, vec4 E, bool live){
        vec4 fl = live ? texture2D(tFluid, uv)*uFluidAmt : vec4(0.0);
        uv -= fl.xy*0.012;
        vec2 d = uv - 0.5; float dl = length(d);
        float ab = P.w*(0.4 + dl*1.6) + uGlitch*0.006 + fl.z*0.006;
        vec3 c;
        float blur = E.z*uTilt*smoothstep(0.24, 0.56, abs(uv.y - 0.55));
        if (blur > 0.001) {
          vec2 px = blur*vec2(6.0, 6.0)/uRes*uRes.y/900.0*1.6;
          c = tap(t, uv, P, E)*0.2;
          c += tap(t, uv + vec2( 1.0, 0.0)*px*2.0, P, E)*0.1; c += tap(t, uv + vec2(-1.0, 0.0)*px*2.0, P, E)*0.1;
          c += tap(t, uv + vec2( 0.0, 1.0)*px*2.0, P, E)*0.1; c += tap(t, uv + vec2( 0.0,-1.0)*px*2.0, P, E)*0.1;
          c += tap(t, uv + vec2( 0.7, 0.7)*px*3.4, P, E)*0.1; c += tap(t, uv + vec2(-0.7, 0.7)*px*3.4, P, E)*0.1;
          c += tap(t, uv + vec2( 0.7,-0.7)*px*3.4, P, E)*0.1; c += tap(t, uv + vec2(-0.7,-0.7)*px*3.4, P, E)*0.1;
        } else if (ab > 0.00001) {
          c = grade(vec3(texture2D(t, uv + d*ab).r, texture2D(t, uv).g, texture2D(t, uv - d*ab).b), P, E);
        } else c = tap(t, uv, P, E);
        if (E.x > 0.5) {
          vec2 px = uv*uRes;
          float minor = step(fract(px.x/14.0), 0.07) + step(fract(px.y/14.0), 0.07);
          float major = step(fract(px.y/70.0), 0.016) + step(fract(px.x/70.0), 0.016);
          c += vec3(0.55, 0.75, 0.95)*(min(minor, 1.0)*0.025 + min(major, 1.0)*0.05);
        }
        c += fl.z*0.05*(E.y > 0.5 ? -1.0 : 1.0)*vec3(0.9, 0.95, 1.0);
        float v = smoothstep(1.15, 0.3, dl);
        c *= mix(1.0, v, P.z);
        c += (h1(uv*uRes + fract(uTime)*91.0) - 0.5)*P.y;
        return c;
      }
      vec3 NEW(vec2 uv){ return look(tA, uv, uPostA, uExtraA, true); }
      vec3 OLD(vec2 uv){ return look(tB, uv, uPostB, uExtraB, false); }

      vec3 shatter(vec2 uv){
        vec2 asp = vec2(uAspect, 1.0), p = uv*asp, o = uOrigin*asp;
        float SC = 6.5; vec2 id; float edge = voro(p*SC, id)/SC;
        vec2 center = (id + h2(id))/SC;
        float t = uT*2.1 - (length(center - o)*0.75 + h1(id)*0.16);
        float lt = clamp(t/0.8, 0.0, 1.0), lt2 = lt*lt, rnd = h1(id + 3.7) - 0.5;
        vec2 off = normalize(center - o + 1e-4)*lt2*0.22 + vec2(0.0, -lt2*0.28);
        vec2 q = rot(-rnd*2.6*lt2)*(p - center - off)/max(1.0 - 0.9*lt2, 1e-3) + center;
        vec2 id2; float e2 = voro(q*SC, id2)/SC;
        bool inside = lt < 0.999 && all(lessThan(abs(id2 - id), vec2(0.5)));
        float rd = length(p - o), front = uT*2.6;
        vec2 nuv = uv + normalize(p - o + 1e-4)/asp*sin((rd - front)*38.0)*exp(-pow((rd - front)*5.0, 2.0))*0.012;
        vec3 col = NEW(nuv) + uCrack*exp(-pow((rd - front)*9.0, 2.0))*0.35*(1.0 - uT);
        if (inside) { vec3 oc = OLD(q/asp)*(1.0 - lt*0.45 + rnd*0.5*lt); col = mix(oc, uCrack, (1.0 - smoothstep(0.0, 0.006, e2))*lt*0.9); }
        float crack = smoothstep(-0.35, 0.0, t)*pow(1.0 - lt, 4.0)*(1.0 - smoothstep(0.0, 0.0035, edge));
        return mix(col, uCrack*1.4, clamp(crack, 0.0, 1.0));
      }

      // zellige: the old world turns over tile by tile from your click, each tile glazed with a star as it flips
      vec3 tiles(vec2 uv){
        vec2 asp = vec2(uAspect, 1.0), p = uv*asp, o = uOrigin*asp;
        float S = 9.0; vec2 g = p*S, id = floor(g), f = fract(g) - 0.5;
        vec2 c = (id + 0.5)/S;
        float delay = length(c - o)*0.8 + h1(id)*0.2;
        float t = clamp((uT*2.1 - delay)/0.6, 0.0, 1.0);
        float e = t*t*(3.0 - 2.0*t);
        float w = abs(cos(PI*e));
        vec2 q = (vec2(c.x + f.x/max(w, 0.02)/S, c.y + f.y/S))/asp;
        vec3 grout = vec3(0.07, 0.1, 0.2);
        vec3 col;
        if (t <= 0.0) col = OLD(uv);
        else if (t >= 1.0) col = NEW(uv);
        else if (abs(f.x) > 0.5*w) col = grout*(0.6 + 0.4*(1.0 - w));
        else {
          col = e < 0.5 ? OLD(q) : NEW(q);
          float r = length(vec2(f.x/max(w, 0.02), f.y)), a = atan(f.y, f.x/max(w, 0.02));
          float star = step(r, 0.33 + 0.09*cos(a*8.0));
          float pick = h1(id + 1.3);
          vec3 glaze = pick < 0.4 ? vec3(0.12, 0.31, 0.64) : pick < 0.7 ? vec3(0.12, 0.48, 0.35) : vec3(0.88, 0.64, 0.13);
          float k = sin(PI*e);
          col = mix(col, mix(glaze, vec3(0.96, 0.94, 0.88), star*0.7), k*0.7);
          col += vec3(1.0, 0.86, 0.55)*pow(k, 6.0)*0.35*(0.6 + f.y);
        }
        float edge = max(abs(f.x), abs(f.y));
        float wave = smoothstep(0.0, 0.15, t)*(1.0 - smoothstep(0.85, 1.0, t));
        col = mix(col, grout, step(0.475, edge)*wave);
        return col;
      }

      // CRT: the old picture collapses to a line, then a dot; the new one powers on, line first, with overshoot
      vec3 power(vec2 uv){
        vec2 c = uv - 0.5;
        float t = uT;
        vec3 col = vec3(0.0);
        float scan = 0.85 + 0.15*sin(uv.y*uRes.y*1.6);
        if (t < 0.5) {
          float a = smoothstep(0.0, 0.3, t), b = smoothstep(0.3, 0.44, t);
          float sy = mix(1.0, 0.004, a*a), sx = mix(1.0, 0.0, b*b*b);
          vec2 q = vec2(c.x/max(sx, 1e-3), c.y/sy) + 0.5;
          float inside = step(abs(c.x), sx*0.5)*step(abs(c.y), sy*0.5 + 0.0015);
          vec3 img = OLD(clamp(q, 0.0, 1.0))*(1.0 + a*3.0) + vec3(0.75, 0.85, 1.0)*a*1.2;
          col = img*inside*scan;
          vec2 ca2 = c*vec2(uAspect, 1.0);
          float spot = exp(-dot(ca2, ca2)/0.0004)*smoothstep(0.32, 0.44, t)*(1.0 - smoothstep(0.44, 0.5, t));
          col += vec3(0.85, 0.92, 1.0)*spot*2.0;
        } else {
          float p = (t - 0.5)/0.5;
          float a = smoothstep(0.0, 0.22, p), b = smoothstep(0.18, 0.62, p);
          float over = 1.0 + sin(clamp((p - 0.18)/0.44, 0.0, 1.0)*PI)*0.05;
          float sx = a, sy = mix(0.004, 1.0, b*b*(3.0 - 2.0*b))*over;
          float settle = 1.0 - smoothstep(0.55, 1.0, p);
          vec2 cc = c*(1.0 + dot(c, c)*0.35*settle);
          vec2 q = vec2(cc.x/max(sx, 1e-3), cc.y/max(sy, 1e-3)) + 0.5;
          float inside = step(abs(cc.x), sx*0.5)*step(abs(cc.y), sy*0.5 + 0.0015)*step(0.0, q.x)*step(q.x, 1.0)*step(0.0, q.y)*step(q.y, 1.0);
          float ca = 0.012*settle;
          vec3 img = vec3(NEW(q + vec2(ca, 0.0)).r, NEW(q).g, NEW(q - vec2(ca, 0.0)).b);
          float flash = (1.0 - b)*2.5 + settle*0.25;
          img = img*(1.0 + flash) + vec3(0.8, 0.9, 1.0)*(1.0 - b)*0.8;
          col = img*inside*mix(1.0, scan, settle);
          col += vec3(0.85, 0.92, 1.0)*exp(-abs(cc.y)/0.004)*(1.0 - a)*step(abs(cc.x), sx*0.5);
        }
        return col;
      }
      void main(){
        vec2 uv = vUv;
        vec3 col;
        if (uT < 0.0) col = NEW(uv);
        else if (uMode < 0.5) col = shatter(uv);
        else if (uMode < 1.5) col = tiles(uv);
        else col = power(uv);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material); quad.frustumCulled = false; scene.add(quad);
  const setPost = (u, ex, post) => { u.value.set(post.conv, post.grain, post.vig, post.ab); ex.value.set(post.grid || 0, post.light || 0, post.tilt || 0, post.exposure || 0); };
  const lastM = new THREE.Vector2(-1, -1);
  return {
    uniforms,
    stepFluid(mx, my, active, dt) {
      if (!fluidOn) return;
      fluidU.uDt.value = Math.min(dt, 0.033);
      fluidU.uAspect.value = uniforms.uAspect.value;
      if (active && lastM.x >= 0) fluidU.uVel.value.set((mx - lastM.x) / Math.max(dt, 0.008) * 0.06, (my - lastM.y) / Math.max(dt, 0.008) * 0.06);
      else fluidU.uVel.value.set(0, 0);
      fluidU.uMouse.value.set(mx, my);
      if (active) lastM.set(mx, my); else lastM.set(-1, -1);
      fluidU.tPrev.value = fa.texture;
      renderer.setRenderTarget(fb); renderer.render(fScene, fCam); renderer.setRenderTarget(null);
      [fa, fb] = [fb, fa];
      uniforms.tFluid.value = fa.texture;
    },
    draw(texA, postA, texB, postB, t, mode) {
      uniforms.tA.value = texA; setPost(uniforms.uPostA, uniforms.uExtraA, postA);
      uniforms.uT.value = texB ? t : -1;
      uniforms.uMode.value = mode || 0;
      if (texB) { uniforms.tB.value = texB; setPost(uniforms.uPostB, uniforms.uExtraB, postB); }
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    },
  };
}
