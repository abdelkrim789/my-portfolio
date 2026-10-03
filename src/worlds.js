// Three worlds, one person. Each one tells the same story in a different way:
//   night · a journey you scroll through, made of light
//   medina · a walk through an old town at golden hour, where every place is a chapter
//   desk  · a room you explore, with a computer that runs my CV
export const WORLDS = {
  night: {
    name: 'Night', tag: 'Light in the desert', how: 'Scroll through it', pitch: 'My story as a journey of 60,000 particles of light.',
    light: 0, clear: 0x06070d, theme: '#06070d', bloom: 0.85, add: 1, gain: 1, size: 1, alpha: 1, grain: 0.045,
    pal: { SAND: [0.95, 0.74, 0.46], ICE: [0.52, 0.82, 0.93], WHITE: [1, 0.96, 0.9], FAULT: [1, 0.26, 0.18], DIM: [0.32, 0.42, 0.6] },
    ground: { lo: [0.18, 0.22, 0.36], hi: [0.62, 0.5, 0.34], k: 1.15, grid: 0 },
    trail: { a: [0.95, 0.5, 0.35], b: [0.52, 0.82, 0.93], c: [0.95, 0.74, 0.46], k: 1 },
    sky: { show: true, color: [0.7, 0.76, 0.92] },
    orb: { color: [0.86, 0.88, 0.95], fill: 0.35, rim: 1, cross: 0, alpha: 1 },
    ring: [1.0, 0.85, 0.6], back: 0x05060b, mode: 0,
  },
  medina: {
    name: 'The Medina', short: 'Medina', tag: 'A walk through my story', how: 'Walk, knock, light the lanterns', pitch: 'An old Algerian town at golden hour. Every door, shop and lantern on the walk is a chapter.',
    theme: '#f4ede0', ring: [1.0, 0.72, 0.38], mode: 1,
  },
  desk: {
    name: 'The Desk', short: 'Desk', tag: 'Where the work happens', how: 'Click anything, boot the computer', pitch: 'My workstation. Every object is clickable, and the computer runs my CV.',
    theme: '#2a1f17', ring: [1.0, 0.8, 0.5], mode: 2,
  },
};
export const WORLD_ORDER = ['night', 'medina', 'desk'];
export const worldName = (w) => WORLDS[w].short || WORLDS[w].name;

export function savedWorld() {
  try { const w = localStorage.getItem('ag-world'); if (w && WORLDS[w]) return w; } catch {}
  return 'night';
}
export function saveWorld(w) { try { localStorage.setItem('ag-world', w); } catch {} }
