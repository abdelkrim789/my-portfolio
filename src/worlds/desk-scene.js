import * as THREE from 'three';
import { Batch, rbox, lathe, mesh, makeTextures, noteTex, spineTex, certTex, floppyTex, canvas } from './desk-build.js';

// Everything in the room. Static furniture is merged per material; anything you can click stays its own group.
export const BOOKS = [
  ['SAP BPC', 'planning', '#1d3f6e', '#f1e6c8', ['d-sys-1', 'd-bpf']],
  ['SAP BW', 'queries', '#2b5c8a', '#f1e6c8', ['d-sys-2', 'd-bwq', 'd-sec']],
  ['S/4HANA', 'TS410 S4C03', '#0f2e52', '#e7c46b', ['d-sys-0']],
  ['SAC', 'analytics', '#3a6ea5', '#f1e6c8', ['d-sys-3']],
  ['EPM & AfO', 'reporting', '#24476b', '#f1e6c8', ['d-epm', 'd-afo']],
  ['ABAP', 'cloud', '#1b2f45', '#e7c46b', ['d-sys-6']],
  ['Cegid PMI', 'ERP', '#7a2e26', '#f1e6c8', ['d-sys-5']],
  ['Power BI', 'dashboards', '#c2902e', '#1b1b22', ['d-sys-4', 'd-m-dash']],
  ['SQL', 'data', '#5b3a24', '#f1e6c8', ['d-layer-data']],
  ['Python', 'Flask', '#2f5a43', '#f1e6c8', ['d-sys-7', 'd-m-flask']],
  ['Laravel', 'backends', '#8f3b2c', '#f1e6c8', ['d-layer-logic']],
  ['React', 'interfaces', '#3c6a6a', '#f1e6c8', ['d-layer-ui']],
  ['Java', 'JavaFX', '#6b5a2a', '#f1e6c8', ['d-jewelry']],
  ['Agile', 'team lead', '#1f3a2c', '#e7c46b', ['d-team']],
];
export const CERTS = [
  ['C_SAC', 'SAP Analytics Cloud', 'Data Analyst', ['d-sys-3']],
  ['TS410', 'S/4HANA', 'Business Process Integration', ['d-sys-0']],
  ['S4C03', 'S/4HANA Cloud PE', 'Implementation Consultant', ['d-sys-0']],
  ['C_ABAPD_2309', 'ABAP Cloud', 'Back-End Developer', ['d-sys-6']],
  ['SAP YP', 'Young Professionals', 'Program · 2025', null],
];

export function buildDeskScene({ photo, tier }) {
  const T = makeTextures(photo);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    plaster: std({ map: T.plaster, color: 0xf6eee0, roughness: 0.95 }),
    wainscot: std({ map: T.wainscot, roughness: 0.6 }),
    trim: std({ color: 0x5a3720, roughness: 0.45 }),
    cream: std({ color: 0xece2cc, roughness: 0.55 }),
    cut: std({ color: 0x0d1d15, roughness: 1 }),
    floor: std({ map: T.floor, roughness: 0.5 }),
    desk: std({ map: T.desk, roughness: 0.32 }),
    shelf: std({ map: T.shelf, roughness: 0.45 }),
    brass: std({ color: 0xc9a24a, metalness: 1, roughness: 0.28 }),
    steel: std({ color: 0x8a8f96, metalness: 1, roughness: 0.35 }),
    beige: std({ color: 0xd9ccb0, roughness: 0.5 }),
    beigeDark: std({ color: 0xb4a688, roughness: 0.55 }),
    black: std({ color: 0x1c1d20, roughness: 0.38 }),
    fabric: std({ color: 0x2e4b3b, roughness: 0.92 }),
    felt: std({ color: 0x1f3a2c, roughness: 0.95 }),
    ceramic: std({ color: 0xf3efe6, roughness: 0.22 }),
    coffee: std({ color: 0x2a160b, roughness: 0.1 }),
    terracotta: std({ color: 0xa95b37, roughness: 0.82 }),
    soil: std({ color: 0x3b2a1e, roughness: 1 }),
    bark: std({ color: 0x6d5a45, roughness: 0.9 }),
    leaf: std({ color: 0x8a9a63, roughness: 0.6, side: THREE.DoubleSide }),
    paper: std({ color: 0xf7f2e6, roughness: 0.9 }),
    cork: std({ map: T.cork, roughness: 1 }),
    rug: std({ map: T.rug, roughness: 1 }),
    glass: std({ color: 0x17603f, roughness: 0.12, metalness: 0.1, emissive: 0x0c3b24, emissiveIntensity: 0.4, side: THREE.DoubleSide }),
    bulb: std({ color: 0xfff1d0, emissive: 0xffd28a, emissiveIntensity: 4 }),
    led: std({ color: 0x113311, emissive: 0x49ff7a, emissiveIntensity: 3 }),
    red: std({ color: 0xb4302a, roughness: 0.35 }),
    keyDark: std({ color: 0x9a907f, roughness: 0.6 }),
    page: std({ color: 0xefe7d2, roughness: 0.9 }),
    view: new THREE.MeshBasicMaterial({ map: T.view, color: new THREE.Color(1.6, 1.55, 1.45) }),
  };
  const root = new THREE.Group();
  const S = new Batch(); // static, casts shadows
  const items = {};
  // fewer draw calls: fuse the static meshes of a clickable object, per material
  const fuse = (group) => {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), B = new Batch(), drop = [];
    group.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.keep || o.parent?.userData.keep || o.material.isShaderMaterial) return;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      B.add(o.geometry, o.material, ...decompose(m)); drop.push(o);
    });
    if (drop.length < 2) return;
    drop.forEach((o) => o.parent.remove(o));
    B.build(group, true, true);
  };
  const addItem = (id, group, focus, extra = {}) => {
    if (extra.fuse) fuse(group);
    group.traverse((o) => { if (o.isMesh) { if (!o.userData.noShadow && !extra.noCast) { o.castShadow = true; } if (!o.userData.noShadow) o.receiveShadow = true; o.userData.item = id; } });
    root.add(group);
    items[id] = { id, group, focus, anchor: extra.anchor || new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()), ...extra };
    return items[id];
  };
  const pose = (p, l) => ({ pos: new THREE.Vector3(...p), look: new THREE.Vector3(...l) });

  // ---------- the shell of the room ----------
  S.box(M.floor, [0, -0.1, 0.1], [6.0, 0.2, 4.6]);
  S.box(M.cut, [0, -0.1, 2.402], [6.0, 0.2, 0.004]);
  S.box(M.cut, [3.002, -0.1, 0.1], [0.004, 0.2, 4.6]);
  const wallB = (x0, x1, y0, y1) => S.box(M.plaster, [(x0 + x1) / 2, (y0 + y1) / 2, -2.26], [x1 - x0, y1 - y0, 0.12]);
  wallB(-3.12, -0.95, -0.2, 2.9); wallB(0.95, 3.0, -0.2, 2.9); wallB(-0.95, 0.95, -0.2, 1.05); wallB(-0.95, 0.95, 2.35, 2.9);
  S.box(M.plaster, [-3.06, 1.35, 0.04], [0.12, 3.1, 4.72]);
  S.box(M.cut, [-0.06, 2.902, -2.26], [6.12, 0.004, 0.12]);
  S.box(M.cut, [-3.06, 2.902, 0.04], [0.12, 0.004, 4.72]);
  S.box(M.cut, [3.002, 1.35, -2.26], [0.004, 3.1, 0.12]);
  S.box(M.cut, [-3.06, 1.35, 2.402], [0.12, 3.1, 0.004]);
  // green wainscot and a walnut rail
  S.box(M.wainscot, [0, 0.47, -2.192], [6.0, 0.94, 0.016]);
  S.box(M.wainscot, [-2.992, 0.47, 0.1], [0.016, 0.94, 4.6]);
  S.box(M.trim, [0, 0.955, -2.185], [6.0, 0.035, 0.03]);
  S.box(M.trim, [-2.985, 0.955, 0.1], [0.03, 0.035, 4.6]);
  S.box(M.trim, [0, 0.03, -2.183], [6.0, 0.06, 0.035]);
  S.box(M.trim, [-2.983, 0.03, 0.1], [0.035, 0.06, 4.6]);
  // window: frame, sill, mullion
  S.box(M.cream, [-0.935, 1.7, -2.24], [0.05, 1.32, 0.16]);
  S.box(M.cream, [0.935, 1.7, -2.24], [0.05, 1.32, 0.16]);
  S.box(M.cream, [0, 2.335, -2.24], [1.92, 0.04, 0.16]);
  S.box(M.cream, [0, 1.04, -2.17], [2.1, 0.035, 0.26]);
  S.box(M.cream, [0, 1.7, -2.3], [0.03, 1.28, 0.03]);
  S.box(M.cream, [0, 1.62, -2.3], [1.86, 0.03, 0.03]);
  S.box(M.cream, [0, 2.31, -2.15], [1.9, 0.035, 0.05]); // blind head rail
  const view = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.0), M.view);
  view.position.set(0, 1.7, -2.75); root.add(view);
  const rug = mesh(new THREE.PlaneGeometry(2.3, 1.7), M.rug, [0.2, 0.004, -0.5], [-Math.PI / 2, 0, 0]); rug.castShadow = false; root.add(rug);

  // blinds: slats you can tilt
  const SL = 22;
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(1.84, 0.005, 0.056), M.cream, SL);
  slats.castShadow = true; slats.receiveShadow = true;
  const dm = new THREE.Object3D();
  const setBlinds = (tilt) => {
    for (let i = 0; i < SL; i++) { dm.position.set(0, 2.27 - i * 0.054, -2.15); dm.rotation.set(tilt, 0, 0); dm.updateMatrix(); slats.setMatrixAt(i, dm.matrix); }
    slats.instanceMatrix.needsUpdate = true;
  };
  setBlinds(0.35);
  root.add(slats);
  const blindsHit = mesh(new THREE.PlaneGeometry(1.86, 1.24), new THREE.MeshBasicMaterial({ visible: false }), [0, 1.68, -2.12]);
  blindsHit.castShadow = blindsHit.receiveShadow = false; blindsHit.userData.noShadow = true;
  addItem('window', blindsHit, pose([0.35, 1.55, -0.25], [0, 1.66, -2.3]), { anchor: new THREE.Vector3(0.6, 2.0, -2.12) });

  // ---------- the desk ----------
  S.add(rbox(1.9, 0.04, 0.82, 0.008), M.desk, [0, 0.74, -1.76]);
  [[-0.88, -2.08], [-0.88, -1.44]].forEach(([x, z]) => S.box(M.desk, [x, 0.36, z], [0.05, 0.72, 0.05]));
  S.box(M.desk, [-0.88, 0.12, -1.76], [0.04, 0.04, 0.6]);
  S.box(M.desk, [0.66, 0.36, -1.76], [0.48, 0.72, 0.78]);
  [0.6, 0.37, 0.14].forEach((y) => { S.add(rbox(0.44, 0.2, 0.02, 0.004), M.desk, [0.66, y, -1.362]); S.box(M.brass, [0.66, y + 0.04, -1.348], [0.1, 0.012, 0.012]); });
  // chair
  const chair = new THREE.Group();
  chair.add(mesh(rbox(0.5, 0.08, 0.48, 0.03), M.fabric, [0, 0.48, 0]), mesh(rbox(0.48, 0.52, 0.07, 0.03), M.fabric, [0, 0.84, 0.25], [-0.08, 0, 0]));
  chair.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 12), M.steel, [0, 0.29, 0]), mesh(new THREE.BoxGeometry(0.05, 0.3, 0.03), M.steel, [0, 0.62, 0.24]));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = mesh(new THREE.BoxGeometry(0.3, 0.03, 0.04), M.black, [Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15], [0, -a, 0]); chair.add(leg, mesh(new THREE.SphereGeometry(0.025, 10, 8), M.black, [Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29])); }
  chair.position.set(0.08, 0, -0.78); chair.rotation.y = -0.3; chair.updateMatrixWorld(true);
  chair.traverse((o) => { if (o.isMesh) S.add(o.geometry, o.material, ...decompose(o.matrixWorld)); });

  // ---------- the computer ----------
  const comp = new THREE.Group();
  comp.add(mesh(rbox(0.54, 0.14, 0.4, 0.015), M.beige, [0, 0.83, -1.82]));
  comp.add(mesh(new THREE.BoxGeometry(0.13, 0.014, 0.01), M.black, [0.12, 0.85, -1.617]));
  comp.add(mesh(new THREE.BoxGeometry(0.045, 0.012, 0.006), M.beigeDark, [0.17, 0.83, -1.617]));
  const led = mesh(new THREE.BoxGeometry(0.012, 0.008, 0.006), M.led, [0.21, 0.808, -1.617]); led.userData.keep = true; comp.add(led);
  comp.add(mesh(new THREE.BoxGeometry(0.05, 0.04, 0.01), M.beigeDark, [-0.19, 0.83, -1.618]));
  for (let i = 0; i < 5; i++) comp.add(mesh(new THREE.BoxGeometry(0.11, 0.004, 0.004), M.black, [-0.06, 0.8 + i * 0.012, -1.617]));
  comp.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.025, 24), M.beigeDark, [0, 0.912, -1.84]));
  comp.add(mesh(new THREE.BoxGeometry(0.1, 0.05, 0.08), M.beigeDark, [0, 0.94, -1.85]));
  comp.add(mesh(rbox(0.48, 0.42, 0.1, 0.03, 3), M.beige, [0, 1.15, -1.72]));
  const backG = new THREE.BoxGeometry(0.44, 0.38, 0.26), bp = backG.attributes.position;
  for (let i = 0; i < bp.count; i++) if (bp.getZ(i) < 0) { bp.setX(i, bp.getX(i) * 0.55); bp.setY(i, bp.getY(i) * 0.6 + 0.02); }
  backG.computeVertexNormals();
  comp.add(mesh(backG, M.beige, [0, 1.14, -1.9]));
  comp.add(mesh(new THREE.BoxGeometry(0.41, 0.31, 0.004), M.black, [0, 1.16, -1.6695]));
  comp.add(mesh(new THREE.BoxGeometry(0.05, 0.018, 0.004), M.brass, [0, 0.97, -1.668]));
  // the glass: a slightly bulged plane that shows the screen canvas
  const SW = 0.37, SH = 0.278;
  const scrCanvas = document.createElement('canvas'); scrCanvas.width = 640; scrCanvas.height = 480;
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
  const scrU = { map: { value: scrTex }, uTime: { value: 0 }, uOn: { value: 1 } };
  const sg = new THREE.PlaneGeometry(SW, SH, 16, 12), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) / (SW / 2), y = sp.getY(i) / (SH / 2); sp.setZ(i, 0.008 * (1 - x * x) * (1 - y * y)); }
  sg.computeVertexNormals();
  const screen = new THREE.Mesh(sg, new THREE.ShaderMaterial({
    uniforms: scrU,
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position, 1.0); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform sampler2D map; uniform float uTime, uOn; varying vec2 vUv; varying vec3 vN, vV;
      void main(){
        vec2 c = vUv - 0.5; vec2 uv = 0.5 + c*(1.0 + dot(c, c)*0.12);
        vec3 col = vec3(0.0);
        if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)))) col = texture2D(map, uv).rgb;
        col *= 0.82 + 0.18*sin(vUv.y*480.0*3.14159);
        col *= 1.0 - smoothstep(0.32, 0.72, length(c*vec2(1.0, 1.25)))*0.55;
        col = col*uOn*1.7 + vec3(0.012, 0.02, 0.016);
        float fr = pow(1.0 - max(0.0, dot(normalize(vN), normalize(vV))), 4.0);
        col += vec3(0.5, 0.55, 0.5)*fr*0.25 + vec3(0.9, 0.85, 0.7)*smoothstep(0.35, 0.0, length(vUv - vec2(0.22, 0.8)))*0.05;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  screen.position.set(0, 1.16, -1.668);
  comp.add(screen);
  // keyboard
  const kb = new THREE.Group();
  kb.add(mesh(rbox(0.46, 0.026, 0.165, 0.008), M.beige, [0, 0, 0]));
  const keys = new THREE.InstancedMesh(rbox(0.023, 0.012, 0.023, 0.004, 1), std({ color: 0xffffff, roughness: 0.55 }), 80);
  let k = 0; const kc = new THREE.Color();
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
    dm.position.set(-0.196 + c * 0.028, 0.018, -0.056 + r * 0.028); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); keys.setMatrixAt(k, dm.matrix);
    keys.setColorAt(k, kc.set(c === 0 || c === 14 || r === 0 ? 0xa59a86 : 0xe6dfcf)); k++;
  }
  dm.position.set(0, 0.018, 0.084); dm.scale.set(7, 1, 1); dm.updateMatrix(); keys.setMatrixAt(k, dm.matrix); keys.setColorAt(k, kc.set(0xe6dfcf)); k++;
  keys.count = k; keys.castShadow = false; keys.userData.noShadow = true; keys.receiveShadow = true;
  kb.add(keys);
  kb.position.set(0, 0.775, -1.44); kb.rotation.x = 0.07;
  comp.add(kb);
  comp.add(mesh(new THREE.BoxGeometry(0.24, 0.004, 0.2), M.felt, [0.38, 0.762, -1.46]));
  comp.add(mesh(rbox(0.06, 0.032, 0.1, 0.014), M.beige, [0.38, 0.778, -1.45], [0, -0.15, 0]));
  const cable = (pts, r = 0.004) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, r, 6), M.black);
  comp.add(cable([[0.37, 0.775, -1.5], [0.4, 0.765, -1.62], [0.32, 0.77, -1.82], [0.28, 0.79, -2.03]]));
  comp.add(cable([[0, 0.775, -1.52], [-0.05, 0.765, -1.6], [-0.2, 0.765, -1.66], [-0.28, 0.79, -1.98]]));
  addItem('computer', comp, pose([0.62, 1.32, -0.75], [0.0, 1.0, -1.78]), { anchor: new THREE.Vector3(0.22, 1.36, -1.7), fuse: true });

  // banker's lamp: brass and green glass
  const lamp = new THREE.Group();
  lamp.add(mesh(lathe([[0, 0], [0.11, 0], [0.11, 0.012], [0.08, 0.03], [0.03, 0.04], [0, 0.04]], 40), M.brass));
  lamp.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 12), M.brass, [0, 0.21, 0]));
  lamp.add(mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 24, Math.PI), M.brass, [0, 0.39, 0.0], [0, 0, 0]));
  const shade = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.4, 32, 1, true, -Math.PI / 2, Math.PI), M.glass, [0, 0.43, 0.04], [0, 0, Math.PI / 2]);
  shade.rotation.set(0.35, 0, Math.PI / 2);
  lamp.add(shade);
  lamp.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 12), M.bulb, [0, 0.415, 0.05], [0, 0, Math.PI / 2]));
  lamp.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), M.brass, [0.05, 0.3, 0.06]));
  lamp.position.set(-0.6, 0.76, -1.98); lamp.rotation.y = 0.35;
  const lampItem = addItem('lamp', lamp, null, { anchor: new THREE.Vector3(-0.6, 1.25, -1.95), fuse: true });
  lampItem.light = new THREE.SpotLight(0xffc98a, 3.2, 3.2, 0.95, 0.65, 1.6);
  lampItem.light.position.set(-0.57, 1.17, -1.92); lampItem.light.target.position.set(-0.3, 0.76, -1.5);
  root.add(lampItem.light, lampItem.light.target);
  lampItem.bulb = M.bulb; lampItem.glass = M.glass;

  // coffee
  const mug = new THREE.Group();
  mug.add(mesh(lathe([[0, 0], [0.04, 0], [0.042, 0.004], [0.044, 0.095], [0.04, 0.095], [0.038, 0.01], [0, 0.01]], 32), M.ceramic));
  mug.add(mesh(new THREE.TorusGeometry(0.026, 0.007, 8, 20, Math.PI * 1.2), M.ceramic, [0.044, 0.05, 0], [0, 0, -Math.PI * 0.6]));
  mug.add(mesh(new THREE.CircleGeometry(0.038, 24), M.coffee, [0, 0.08, 0], [-Math.PI / 2, 0, 0]));
  mug.add(mesh(new THREE.BoxGeometry(0.06, 0.02, 0.002), M.felt, [0, 0.055, 0.043]));
  mug.position.set(0.56, 0.76, -1.55);
  addItem('mug', mug, pose([0.95, 1.12, -1.05], [0.55, 0.82, -1.55]), { fuse: true });
  const steamU = { uTime: { value: 0 }, uAmt: { value: 0.6 } };
  const steamM = new THREE.ShaderMaterial({
    uniforms: steamU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uAmt; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 p = vUv; float x = p.x - 0.5 - sin(p.y*6.0 - uTime*1.3)*0.12*p.y;
        float s = n(vec2(x*5.0, p.y*3.0 - uTime*0.9)) * smoothstep(0.32, 0.0, abs(x)) * smoothstep(0.0, 0.2, p.y) * smoothstep(1.0, 0.4, p.y);
        gl_FragColor = vec4(vec3(1.0), s*0.28*uAmt);
      }`,
  });
  const steam = new THREE.Group();
  [0, Math.PI / 2].forEach((r) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.22), steamM); s.rotation.y = r; s.position.y = 0.2; steam.add(s); });
  steam.position.copy(mug.position); root.add(steam);

  // floppy disks: worlds you can load
  const floppies = [['night', 'NIGHT.WLD', 'light in the desert', '#18181d', [-0.43, 0.7625, -1.48], 0.28], ['ice', 'ICE.WLD', 'cold storage', '#2f6fa3', [-0.31, 0.7665, -1.5], -0.12]].map(([w, name, sub, col, p, ry]) => {
    const tex = floppyTex(name, sub, col);
    const body = std({ color: col, roughness: 0.4 });
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.0034, 0.094), body), mesh(new THREE.PlaneGeometry(0.09, 0.094), std({ map: tex, roughness: 0.5 }), [0, 0.0018, 0], [-Math.PI / 2, 0, 0]));
    g.position.set(...p); g.rotation.y = ry;
    const it = addItem(`floppy-${w}`, g, pose([-0.2, 1.2, -1.0], [-0.38, 0.77, -1.5]), { world: w, home: { p: g.position.clone(), q: g.quaternion.clone() }, noCast: true });
    return it;
  });

  // telephone
  const phone = new THREE.Group();
  phone.add(mesh(rbox(0.2, 0.07, 0.22, 0.02), M.black, [0, 0.035, 0]));
  phone.add(mesh(new THREE.BoxGeometry(0.12, 0.004, 0.09), M.beigeDark, [0, 0.07, 0.05], [-0.4, 0, 0]));
  const handset = new THREE.Group();
  handset.add(mesh(rbox(0.22, 0.03, 0.04, 0.012), M.black, [0, 0, 0]));
  handset.add(mesh(rbox(0.06, 0.04, 0.06, 0.018), M.black, [-0.1, -0.015, 0]), mesh(rbox(0.06, 0.04, 0.06, 0.018), M.black, [0.1, -0.015, 0]));
  handset.position.set(0, 0.1, -0.03); handset.userData.keep = true; phone.add(handset);
  const coil = []; for (let i = 0; i <= 60; i++) { const t = i / 60; coil.push([0.11 + t * 0.03 + Math.cos(t * 50) * 0.008, 0.05 - t * 0.04, -0.03 + t * 0.09 + Math.sin(t * 50) * 0.008]); }
  phone.add(cable(coil, 0.003));
  phone.position.set(0.7, 0.76, -1.98); phone.rotation.y = -0.3;
  const phoneItem = addItem('phone', phone, pose([1.15, 1.2, -1.15], [0.68, 0.84, -1.95]), { fuse: true });
  phoneItem.handset = handset;

  // olive tree on the floor
  const plant = new THREE.Group();
  plant.add(mesh(lathe([[0, 0], [0.15, 0], [0.16, 0.02], [0.2, 0.4], [0.215, 0.42], [0.2, 0.43], [0, 0.43]], 36), M.terracotta));
  plant.add(mesh(new THREE.CircleGeometry(0.19, 24), M.soil, [0, 0.41, 0], [-Math.PI / 2, 0, 0]));
  const trunk = new THREE.CatmullRomCurve3([[0, 0.4, 0], [0.04, 0.7, 0.02], [-0.03, 1.0, -0.02], [0.02, 1.25, 0.03]].map((p) => new THREE.Vector3(...p)));
  plant.add(mesh(new THREE.TubeGeometry(trunk, 30, 0.028, 8), M.bark));
  const clusters = [[0.02, 1.32, 0.03, 0.26], [-0.2, 1.12, 0.05, 0.2], [0.2, 1.08, -0.04, 0.2], [0.05, 1.5, -0.05, 0.18]];
  clusters.slice(1).forEach(([x, y, z]) => plant.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, y - 0.18, 0), new THREE.Vector3(x * 0.6, y - 0.05, z * 0.6), new THREE.Vector3(x, y, z)]), 12, 0.012, 6), M.bark)));
  const leafG = new THREE.SphereGeometry(1, 8, 6); leafG.scale(0.05, 0.004, 0.012);
  const leaves = new THREE.InstancedMesh(leafG, M.leaf, 260);
  let li = 0;
  for (const [cx, cy, cz, r] of clusters) for (let i = 0; i < 65 && li < 260; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1), rr = r * Math.cbrt(Math.random());
    dm.position.set(cx + Math.sin(v) * Math.cos(u) * rr, cy + Math.cos(v) * rr * 0.7, cz + Math.sin(v) * Math.sin(u) * rr);
    dm.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); dm.scale.setScalar(0.8 + Math.random() * 0.5); dm.updateMatrix(); leaves.setMatrixAt(li++, dm.matrix);
  }
  leaves.castShadow = true; plant.add(leaves);
  plant.position.set(2.35, 0, -1.7);
  addItem('plant', plant, pose([1.25, 1.25, 0.2], [2.25, 0.95, -1.7]), { anchor: new THREE.Vector3(2.35, 1.35, -1.7), fuse: true });

  // the bin, and what's in it
  const bin = new THREE.Group();
  bin.add(mesh(lathe([[0.11, 0], [0.135, 0.3], [0.13, 0.3], [0.105, 0.012], [0, 0.012], [0, 0]], 28), std({ color: 0x2e4b3b, roughness: 0.7, side: THREE.DoubleSide })));
  const ball = new THREE.IcosahedronGeometry(0.05, 1), bpp = ball.attributes.position;
  for (let i = 0; i < bpp.count; i++) { const f = 0.8 + Math.random() * 0.35; bpp.setXYZ(i, bpp.getX(i) * f, bpp.getY(i) * f, bpp.getZ(i) * f); }
  ball.computeVertexNormals();
  [[0.02, 0.27, 0.01], [-0.05, 0.29, -0.03], [0.05, 0.31, -0.04], [0.24, 0.04, 0.12]].forEach((p) => bin.add(mesh(ball, M.paper, p, [Math.random() * 3, Math.random() * 3, 0])));
  bin.position.set(1.25, 0, -1.75);
  addItem('bin', bin, pose([1.75, 0.95, -0.7], [1.25, 0.22, -1.75]), { anchor: new THREE.Vector3(1.25, 0.45, -1.75), fuse: true });

  // ---------- bookshelf on the left wall ----------
  const X0 = -2.995, X1 = -2.64, Z0 = -1.95, Z1 = -0.3;
  [Z0, Z1].forEach((z) => S.box(M.shelf, [(X0 + X1) / 2, 0.95, z], [X1 - X0, 1.9, 0.03]));
  [0.03, 0.62, 1.22, 1.88].forEach((y) => S.box(M.shelf, [(X0 + X1) / 2, y, (Z0 + Z1) / 2], [X1 - X0, 0.03, Z1 - Z0]));
  S.box(M.shelf, [X0 + 0.005, 0.95, (Z0 + Z1) / 2], [0.01, 1.9, Z1 - Z0]);
  // binders on the bottom shelf
  [['SHONE', '#1f3a2c'], ['GÉANT', '#7a2e26'], ['CERTS', '#1d3f6e']].forEach(([t, c], i) => {
    const m = std({ color: c, roughness: 0.6 }), z = Z0 + 0.12 + i * 0.085;
    const bx = mesh(new THREE.BoxGeometry(0.28, 0.32, 0.075), m, [X1 - 0.15, 0.205, z]); bx.castShadow = false; root.add(bx);
    const sp = mesh(new THREE.PlaneGeometry(0.075, 0.32), std({ map: spineTex(t, 'binder', c, '#f1e6c8'), roughness: 0.6 }), [X1 - 0.0095, 0.205, z], [0, Math.PI / 2, 0]); sp.castShadow = false; root.add(sp);
  });
  const books = [];
  let z = Z0 + 0.06, shelfY = 1.235, row = 0;
  BOOKS.forEach(([label, sub, bg, fg, tpl], i) => {
    if (i === 7) { z = Z0 + 0.06; shelfY = 0.635; row = 1; }
    const h = 0.22 + ((i * 37) % 7) * 0.012, t = 0.042 + ((i * 13) % 5) * 0.006, d = 0.19 + ((i * 7) % 3) * 0.015;
    const cover = std({ color: bg, roughness: 0.55 });
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(d, h, t), cover));
    g.add(mesh(new THREE.PlaneGeometry(t, h), std({ map: spineTex(label, sub, bg, fg), roughness: 0.5 }), [d / 2 + 0.0008, 0, 0], [0, Math.PI / 2, 0]));
    g.position.set(X1 - d / 2 - 0.012, shelfY + h / 2, z + t / 2);
    if (i === 6 || i === 13) { g.rotation.x = -0.18; g.position.z += 0.02; }
    z += t + 0.006;
    const it = addItem(`book-${i}`, g, pose([-1.35, 1.25 - row * 0.45, z - 0.1], [-2.75, shelfY + 0.12, z - 0.1]), { book: i, label, tpl, home: g.position.clone(), homeRot: g.rotation.x, noCast: true });
    books.push(it);
  });
  // on top: a small pennant and a brass trophy
  const pole = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 8), M.brass, [-2.8, 2.06, -0.75]); root.add(pole);
  const flag = canvas(256, 160, (g, w, h) => {
    g.fillStyle = '#1f6b3a'; g.fillRect(0, 0, w / 2, h); g.fillStyle = '#f7f4ec'; g.fillRect(w / 2, 0, w / 2, h);
    g.fillStyle = '#c8202a'; g.beginPath(); g.arc(w / 2 + 6, h / 2, 44, 0.45 * Math.PI, 1.55 * Math.PI, false); g.arc(w / 2 + 22, h / 2, 36, 1.55 * Math.PI, 0.45 * Math.PI, true); g.fill();
    g.save(); g.translate(w / 2 + 30, h / 2); g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); } g.closePath(); g.fill(); g.restore();
  });
  const flagM = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.14, 12, 4), std({ map: flag, roughness: 0.8, side: THREE.DoubleSide }));
  flagM.position.set(-2.8, 2.15, -0.64); flagM.rotation.y = Math.PI / 2 - 0.3; flagM.castShadow = true; root.add(flagM);
  S.add(lathe([[0, 0], [0.05, 0], [0.05, 0.02], [0.015, 0.03], [0.015, 0.08], [0.06, 0.12], [0.065, 0.2], [0.058, 0.2], [0.05, 0.13], [0, 0.11]], 32), M.brass, [-2.82, 1.895, -1.5]);
  addItem('shelf', new THREE.Group(), pose([-0.95, 1.2, -0.35], [-2.75, 0.92, -1.12]), { anchor: new THREE.Vector3(-2.65, 1.7, -1.1) });

  // ---------- corkboard: me, home, and the notes for this week ----------
  S.box(M.trim, [1.9, 1.6, -2.188], [1.36, 0.96, 0.025]);
  S.add(new THREE.PlaneGeometry(1.28, 0.88), M.cork, [1.9, 1.6, -2.174]);
  const pin = (x, y, c = M.red) => mesh(new THREE.SphereGeometry(0.012, 10, 8), c, [x, y, -2.163]);
  const polaroid = new THREE.Group();
  polaroid.add(mesh(new THREE.PlaneGeometry(0.22, 0.258), std({ map: T.photo, roughness: 0.6 }), [0, 0, 0]), pin(0, 0.115));
  polaroid.children[1].position.set(0, 0.115, 0.01);
  polaroid.position.set(1.47, 1.66, -2.17); polaroid.rotation.z = 0.06;
  addItem('polaroid', polaroid, pose([1.62, 1.62, -1.15], [1.62, 1.6, -2.17]), { noCast: true });
  const map = new THREE.Group();
  map.add(mesh(new THREE.PlaneGeometry(0.38, 0.38), std({ map: T.map, roughness: 0.85 }), [0, 0, 0]));
  map.add(mesh(new THREE.SphereGeometry(0.012, 10, 8), M.red, [-0.165, 0.165, 0.01]), mesh(new THREE.SphereGeometry(0.012, 10, 8), M.red, [0.165, 0.165, 0.01]));
  map.position.set(2.1, 1.66, -2.169); map.rotation.z = -0.03;
  addItem('map', map, pose([2.1, 1.62, -1.2], [2.1, 1.62, -2.17]), { noCast: true, fuse: true });
  const notes = new THREE.Group();
  [[['SHONE', 'BPF  ✓', 'EPM rpt'], '#f6d96b', 1.43, 1.29, -0.05], [['JUN 2026', 'joined', 'CNPC'], '#f4b9a6', 1.79, 1.27, 0.04], [['AfO', 'BW query', 'review'], '#bde3c9', 2.42, 1.3, -0.07]].forEach(([l, c, x, y, r]) => {
    const n = mesh(new THREE.PlaneGeometry(0.15, 0.15), std({ map: noteTex(l, c), roughness: 0.9 }), [x, y, -2.168], [0, 0, r]); notes.add(n, pin(x, y + 0.06, M.brass));
  });
  addItem('notes', notes, pose([1.9, 1.45, -1.0], [1.9, 1.4, -2.17]), { noCast: true });

  // ---------- certificates on the back wall ----------
  const certs = CERTS.map(([code, title, sub, tpl], i) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.34, 0.27, 0.022), M.black));
    g.add(mesh(new THREE.PlaneGeometry(0.3, 0.225), std({ map: certTex(code, title, sub), roughness: 0.7 }), [0, 0, 0.0115]));
    const [x, y] = i < 3 ? [-2.45 + i * 0.48, 1.93] : [-2.21 + (i - 3) * 0.48, 1.5];
    g.position.set(x, y, -2.188);
    return addItem(`cert-${i}`, g, pose([-1.95, 1.72, -0.75], [-1.95, 1.72, -2.2]), { cert: i, tpl, code, title, sub, noCast: true });
  });

  // wall clock above the window
  const clockFace = canvas(256, 256, (g, w) => {
    g.fillStyle = '#f7f2e6'; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b1b22'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.save(); g.translate(w / 2 + Math.sin(a) * 104, w / 2 - Math.cos(a) * 104); g.rotate(a); g.fillRect(-3, -12, 6, i % 3 ? 14 : 24); g.restore(); }
    g.font = '700 22px "Courier Prime", monospace'; g.textAlign = 'center'; g.fillText('BBA', w / 2, w / 2 + 52);
  });
  const clock = new THREE.Group();
  clock.add(mesh(new THREE.CircleGeometry(0.13, 40), std({ map: clockFace, roughness: 0.5 }), [0, 0, 0.012]));
  clock.add(mesh(new THREE.TorusGeometry(0.135, 0.012, 10, 48), M.black, [0, 0, 0.012]));
  const hand = (len, w, z) => { const p = new THREE.Group(); const m = mesh(new THREE.BoxGeometry(w, len, 0.003), M.black, [0, len / 2 - 0.015, 0]); p.add(m); p.position.z = z; clock.add(p); return p; };
  const hH = hand(0.07, 0.008, 0.016), hM = hand(0.1, 0.005, 0.019), hS = hand(0.11, 0.002, 0.022);
  hS.children[0].material = M.red;
  clock.position.set(0, 2.62, -2.2);
  addItem('clock', clock, pose([0, 2.3, -1.0], [0, 2.55, -2.2]), { noCast: true });

  S.build(root, true, true);
  return { root, items, M, T, setBlinds, slats, screen, scrCanvas, scrTex, scrU, SW, SH, led, floppies, books, certs, lampItem, phoneItem, steamU, clockHands: [hH, hM, hS], steam };
}

function decompose(m) {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(p, q, s);
  const e = new THREE.Euler().setFromQuaternion(q);
  return [p.toArray(), [e.x, e.y, e.z], s.toArray()];
}
