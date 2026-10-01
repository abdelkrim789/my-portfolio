import * as THREE from 'three';

// Composites the active world (A) and, during a world change, the previous one (B).
// The old world cracks along Voronoi fault lines spreading from the click point, then each shard
// tilts, shrinks and falls away while the new world ripples into place behind it.
export function createComposite() {
  const uniforms = {
    tA: { value: null }, tB: { value: null }, uT: { value: -1 }, uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: 1 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uPostA: { value: new THREE.Vector4() }, uPostB: { value: new THREE.Vector4() },
    uExtraA: { value: new THREE.Vector4() }, uExtraB: { value: new THREE.Vector4() },
    uCrack: { value: new THREE.Color(1, 0.85, 0.55) }, uGlitch: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D tA, tB; uniform float uT, uAspect, uTime, uGlitch; uniform vec2 uOrigin, uRes;
      uniform vec4 uPostA, uPostB, uExtraA, uExtraB; uniform vec3 uCrack;
      varying vec2 vUv;
      vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
      float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      // Voronoi: returns edge distance, writes the owning cell id
      float voro(vec2 x, out vec2 id){
        vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j)), o = h2(n + g), r = g + o - f; float d = dot(r, r);
          if (d < md) { md = d; mr = r; mg = g; }
        }
        md = 8.0;
        for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
          vec2 g = mg + vec2(float(i), float(j)), o = h2(n + g), r = g + o - f;
          if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5*(mr + r), normalize(r - mr)));
        }
        id = n + mg; return md;
      }
      vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
      // per-world finishing: x = sRGB encode, y = grain, z = vignette, w = aberration; extra.x = drafting grid, extra.y = light world
      vec3 look(sampler2D t, vec2 uv, vec4 P, vec4 E){
        vec2 d = uv - 0.5; float dl = length(d);
        float ab = P.w*(0.4 + dl*1.6) + uGlitch*0.006;
        vec3 c = vec3(texture2D(t, uv + d*ab).r, texture2D(t, uv).g, texture2D(t, uv - d*ab).b);
        if (P.x > 0.5) c = toSRGB(c);
        if (E.x > 0.5) {
          vec2 px = uv*uRes;
          float minor = step(fract(px.x/14.0), 0.07) + step(fract(px.y/14.0), 0.07);
          float major = step(fract(px.x/70.0), 0.016) + step(fract(px.y/70.0), 0.016);
          c += vec3(0.55, 0.75, 0.95)*(min(minor, 1.0)*0.025 + min(major, 1.0)*0.05);
        }
        float v = smoothstep(1.15, 0.3, dl);
        c *= mix(1.0, v, P.z);
        c += (h1(uv*uRes + fract(uTime)*91.0) - 0.5)*P.y;
        return c;
      }
      mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      void main(){
        vec2 uv = vUv;
        if (uT < 0.0) { gl_FragColor = vec4(look(tA, uv, uPostA, uExtraA), 1.0); return; }
        vec2 asp = vec2(uAspect, 1.0), p = uv*asp, o = uOrigin*asp;
        float SC = 6.5;
        vec2 id; float edge = voro(p*SC, id)/SC;
        vec2 center = (id + h2(id))/SC;
        float delay = length(center - o)*0.75 + h1(id)*0.16;
        float t = uT*2.1 - delay;
        float lt = clamp(t/0.8, 0.0, 1.0), lt2 = lt*lt;
        float rnd = h1(id + 3.7) - 0.5;
        // shard transform: shrink, spin, slide out from the origin and fall
        vec2 dir = normalize(center - o + 1e-4);
        vec2 off = dir*lt2*0.22 + vec2(0.0, -lt2*0.28);
        float sc = 1.0 - 0.9*lt2, ang = rnd*2.6*lt2;
        vec2 q = rot(-ang)*(p - center - off)/max(sc, 1e-3) + center;
        vec2 id2; float e2 = voro(q*SC, id2)/SC;
        bool inside = lt < 0.999 && all(lessThan(abs(id2 - id), vec2(0.5)));
        // the new world arrives with a ripple from the origin
        float rd = length(p - o), front = uT*2.6;
        float rip = sin((rd - front)*38.0)*exp(-pow((rd - front)*5.0, 2.0))*0.012;
        vec2 nuv = uv + normalize(p - o + 1e-4)/asp*rip;
        vec3 col = look(tA, nuv, uPostA, uExtraA);
        col += uCrack*exp(-pow((rd - front)*9.0, 2.0))*0.35*(1.0 - uT);
        if (inside) {
          vec3 oc = look(tB, q/asp, uPostB, uExtraB);
          float shade = 1.0 - lt*0.45 + rnd*0.5*lt;
          oc *= shade;
          oc = mix(oc, uCrack, (1.0 - smoothstep(0.0, 0.006, e2))*lt*0.9);
          col = oc;
        }
        // fault lines glow just before each shard lets go
        float crack = smoothstep(-0.35, 0.0, t)*pow(1.0 - lt, 4.0)*(1.0 - smoothstep(0.0, 0.0035, edge));
        col = mix(col, uCrack*1.4, clamp(crack, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material); quad.frustumCulled = false;
  scene.add(quad);
  const setPost = (u, ex, post) => { u.value.set(post.conv, post.grain, post.vig, post.ab); ex.value.set(post.grid, post.light, 0, 0); };
  return {
    uniforms,
    draw(renderer, texA, postA, texB, postB, t) {
      uniforms.tA.value = texA; setPost(uniforms.uPostA, uniforms.uExtraA, postA);
      uniforms.uT.value = texB ? t : -1;
      if (texB) { uniforms.tB.value = texB; setPost(uniforms.uPostB, uniforms.uExtraB, postB); }
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    },
  };
}
