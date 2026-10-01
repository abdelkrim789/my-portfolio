// Three worlds share one journey. Each one re-inks the same particles, ground, river and sky.
// light = 1 draws particles as ink on paper (normal blending); light = 0 draws them as light (additive).
export const WORLDS = {
  day: {
    name: 'Daylight', tag: 'Ink on paper',
    light: 1, clear: 0xeceee9, theme: '#eceee9', bloom: 0, add: 0.12, gain: 1, size: 0.82, alpha: 0.62, grain: 0.03,
    pal: { SAND: [0.66, 0.37, 0.04], ICE: [0.09, 0.29, 0.47], WHITE: [0.07, 0.09, 0.16], FAULT: [0.74, 0.16, 0.07], DIM: [0.45, 0.5, 0.58] },
    ground: { lo: [0.36, 0.4, 0.48], hi: [0.55, 0.43, 0.27], k: 0.42, grid: 0 },
    trail: { a: [0.74, 0.2, 0.08], b: [0.1, 0.3, 0.5], c: [0.62, 0.36, 0.04], k: 0.75 },
    sky: { show: false, color: [0.3, 0.35, 0.45] },
    orb: { color: [0.62, 0.36, 0.04], fill: 0.08, rim: 0.85, cross: 0, alpha: 0.6 },
    ring: [0.66, 0.37, 0.04], back: 0xe4e7e0,
  },
  night: {
    name: 'Night', tag: 'Light in the desert',
    light: 0, clear: 0x06070d, theme: '#06070d', bloom: 0.85, add: 1, gain: 1, size: 1, alpha: 1, grain: 0.045,
    pal: { SAND: [0.95, 0.74, 0.46], ICE: [0.52, 0.82, 0.93], WHITE: [1, 0.96, 0.9], FAULT: [1, 0.26, 0.18], DIM: [0.32, 0.42, 0.6] },
    ground: { lo: [0.18, 0.22, 0.36], hi: [0.62, 0.5, 0.34], k: 1.15, grid: 0 },
    trail: { a: [0.95, 0.5, 0.35], b: [0.52, 0.82, 0.93], c: [0.95, 0.74, 0.46], k: 1 },
    sky: { show: true, color: [0.7, 0.76, 0.92] },
    orb: { color: [0.86, 0.88, 0.95], fill: 0.35, rim: 1, cross: 0, alpha: 1 },
    ring: [1.0, 0.85, 0.6], back: 0x05060b,
  },
  blueprint: {
    name: 'Blueprint', tag: 'The plan behind it',
    light: 0, clear: 0x0b3157, theme: '#0b3157', bloom: 0, add: 0.55, gain: 0.85, size: 0.9, alpha: 1, grain: 0.03,
    pal: { SAND: [1.0, 0.83, 0.48], ICE: [0.72, 0.9, 1.0], WHITE: [0.9, 0.96, 1.0], FAULT: [1.0, 0.48, 0.38], DIM: [0.42, 0.62, 0.84] },
    ground: { lo: [0.22, 0.36, 0.52], hi: [0.36, 0.52, 0.7], k: 0.55, grid: 1 },
    trail: { a: [1.0, 0.55, 0.45], b: [0.7, 0.9, 1.0], c: [1.0, 0.85, 0.5], k: 0.6 },
    sky: { show: true, color: [0.45, 0.6, 0.78] },
    orb: { color: [0.8, 0.92, 1.0], fill: 0.04, rim: 0.7, cross: 0.8, alpha: 0.7 },
    ring: [1.0, 0.86, 0.5], back: 0x0a2b4d,
  },
  planet: {
    name: 'Planet', tag: 'A tiny world to drive', theme: '#10203c', ring: [1.0, 0.82, 0.45],
  },
};
export const WORLD_ORDER = ['day', 'night', 'blueprint', 'planet'];

export function savedWorld() {
  try { const w = localStorage.getItem('ag-world'); if (w && WORLDS[w]) return w; } catch {}
  return 'day';
}
export function saveWorld(w) { try { localStorage.setItem('ag-world', w); } catch {} }
