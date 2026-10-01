import * as THREE from 'three';

// Final composite: finishes the active world (A) and, during a world change, carries the previous one (B)
// through a transition chosen by the destination:
//   0 shatter (Night)   · the old world cracks along Voronoi faults and falls away in shards
//   1 page curl (Day)   · the old world is a printed sheet that peels off from the corner you clicked
//   2 plotter scan (Blueprint) · a laser beam spreads from your click, redrawing the old world as linework
//   3 warp iris (Planet) · an iris opens from your click; the old world is pulled in and twisted
// It also applies a liquid cursor field and a tilt-shift focus band per world.
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
      mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      float voro(vec2 x, out vec2 id){
        vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)), o = h2(n + g), r = g + o - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
        md = 8.0;
        for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 g = mg + vec2(float(i), float(j)), o = h2(n + g), r = g + o - f; if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5*(mr + r), normalize(r - mr))); }
        id = n + mg; return md;
      }
      vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
      vec3 tap(sampler2D t, vec2 uv, vec4 P){ vec3 c = texture2D(t, uv).rgb; return P.x > 0.5 ? toSRGB(c) : c; }
      // per-world finishing. P: sRGB encode, grain, vignette, aberration. E: drafting grid, light world, tilt-shift, fluid on
      vec3 look(sampler2D t, vec2 uv, vec4 P, vec4 E, bool live){
        vec4 fl = live ? texture2D(tFluid, uv)*uFluidAmt : vec4(0.0);
        uv -= fl.xy*0.012;
        vec2 d = uv - 0.5; float dl = length(d);
        float ab = P.w*(0.4 + dl*1.6) + uGlitch*0.006 + fl.z*0.006;
        vec3 c;
        float blur = E.z*uTilt*smoothstep(0.24, 0.56, abs(uv.y - 0.55));
        if (blur > 0.001) {
          vec2 px = blur*vec2(6.0, 6.0)/uRes*uRes.y/900.0*1.6;
          c = tap(t, uv, P)*0.2;
          c += tap(t, uv + vec2( 1.0, 0.0)*px*2.0, P)*0.1; c += tap(t, uv + vec2(-1.0, 0.0)*px*2.0, P)*0.1;
          c += tap(t, uv + vec2( 0.0, 1.0)*px*2.0, P)*0.1; c += tap(t, uv + vec2( 0.0,-1.0)*px*2.0, P)*0.1;
          c += tap(t, uv + vec2( 0.7, 0.7)*px*3.4, P)*0.1; c += tap(t, uv + vec2(-0.7, 0.7)*px*3.4, P)*0.1;
          c += tap(t, uv + vec2( 0.7,-0.7)*px*3.4, P)*0.1; c += tap(t, uv + vec2(-0.7,-0.7)*px*3.4, P)*0.1;
        } else {
          c = vec3(texture2D(t, uv + d*ab).r, texture2D(t, uv).g, texture2D(t, uv - d*ab).b);
          if (P.x > 0.5) c = toSRGB(c);
        }
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
      vec3 curl(vec2 uv){
        vec2 asp = vec2(uAspect, 1.0), p = uv*asp, o = uOrigin*asp;
        vec2 dir = normalize(vec2(0.5*uAspect, 0.5) - o + 1e-4);
        float s0 = min(min(dot(-o, dir), dot(vec2(uAspect, 0.0) - o, dir)), min(dot(vec2(0.0, 1.0) - o, dir), dot(vec2(uAspect, 1.0) - o, dir)));
        float s1 = max(max(dot(-o, dir), dot(vec2(uAspect, 0.0) - o, dir)), max(dot(vec2(0.0, 1.0) - o, dir), dot(vec2(uAspect, 1.0) - o, dir)));
        float r = 0.11, e = uT*uT*(3.0 - 2.0*uT);
        float L = mix(s0 - 0.02, s1 + PI*r + 0.06, e);
        float x = dot(p - o, dir); vec2 perp = (p - o) - dir*x;
        vec3 paper = vec3(0.95, 0.94, 0.9);
        vec3 col;
        if (x > L) {
          float sTop = L - PI*r - (x - L);
          if (sTop >= s0) { vec2 q = (o + dir*sTop + perp)/asp; float lum = dot(OLD(q), vec3(0.3, 0.59, 0.11)); col = mix(paper, paper*(0.7 + 0.3*lum), 0.35)*0.97; }
          else col = OLD(uv)*(1.0 - 0.35*exp(-(x - L)/0.035));
        } else if (x > L - r) {
          float a = asin(clamp((L - x)/r, 0.0, 1.0));
          float s2 = L - r*(PI - a);
          if (s2 >= s0) { col = paper*(0.72 + 0.28*sin(a)); }
          else { float s1p = L - r*a; col = s1p >= s0 ? OLD((o + dir*s1p + perp)/asp)*(0.55 + 0.45*cos(a)) : NEW(uv); }
        } else col = NEW(uv)*(1.0 - 0.32*exp(-(L - r - x)/0.06));
        return col;
      }
      vec3 scan(vec2 uv){
        float y = uv.y, oy = uOrigin.y;
        float far = max(oy, 1.0 - oy) + 0.2;
        float L = uT*far*1.05;
        float dy = abs(y - oy) - L;
        float jitter = (h1(vec2(floor(y*180.0), floor(uTime*30.0))) - 0.5)*0.02*exp(-abs(dy)*40.0);
        vec2 suv = uv + vec2(jitter, 0.0);
        vec3 col;
        if (dy < 0.0) col = NEW(suv);
        else if (dy < 0.18) {
          vec2 px = 1.5/uRes;
          float l = dot(OLD(suv), vec3(0.3, 0.59, 0.11));
          float gx = dot(OLD(suv + vec2(px.x, 0.0)), vec3(0.33)) - dot(OLD(suv - vec2(px.x, 0.0)), vec3(0.33));
          float gy = dot(OLD(suv + vec2(0.0, px.y)), vec3(0.33)) - dot(OLD(suv - vec2(0.0, px.y)), vec3(0.33));
          float edge = clamp(length(vec2(gx, gy))*5.0, 0.0, 1.0);
          vec3 film = vec3(0.043, 0.192, 0.341);
          col = mix(film + l*0.08, vec3(0.92, 0.96, 1.0), edge);
          col = mix(col, OLD(uv), smoothstep(0.06, 0.18, dy));
        } else col = OLD(uv);
        col += uCrack*(exp(-pow(dy/0.0035, 2.0))*1.4 + exp(-abs(dy)/0.03)*0.25)*step(-0.5, -abs(dy) + 0.5);
        return col;
      }
      vec3 iris(vec2 uv){
        vec2 asp = vec2(uAspect, 1.0), p = uv*asp, o = uOrigin*asp, d = p - o;
        float far = length(max(o, asp - o)) + 0.1;
        float e = uT*uT*(3.0 - 2.0*uT);
        float Rr = e*far*1.1, r = length(d), edge = r - Rr;
        vec3 col;
        if (edge < 0.0) {
          float tw = (1.0 - e)*2.4*(1.0 - r/max(Rr, 1e-3));
          vec2 dn = rot(tw)*d*(0.82 + 0.18*e);
          col = NEW((o + dn)/asp);
        } else {
          float pull = exp(-edge*5.0)*0.35*e;
          vec2 d2 = rot(-pull*5.0)*d*(1.0 - pull);
          col = OLD((o + d2)/asp)*(1.0 - 0.5*exp(-edge*14.0));
        }
        float ring = exp(-pow(edge/0.01, 2.0));
        col += uCrack*ring*1.3 + uCrack*exp(-abs(edge)/0.05)*0.18*(1.0 - e);
        return col;
      }
      void main(){
        vec2 uv = vUv;
        vec3 col;
        if (uT < 0.0) col = NEW(uv);
        else if (uMode < 0.5) col = shatter(uv);
        else if (uMode < 1.5) col = curl(uv);
        else if (uMode < 2.5) col = scan(uv);
        else col = iris(uv);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material); quad.frustumCulled = false; scene.add(quad);
  const setPost = (u, ex, post) => { u.value.set(post.conv, post.grain, post.vig, post.ab); ex.value.set(post.grid || 0, post.light || 0, post.tilt || 0, 0); };
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
