// Generative sound with a character per world. Nothing is a recording: every sound is synthesised.
//  Night        · low drone that opens with speed, wind, FM bells in a minor mode
//  The Monument · a deep drone in a vast room, desert wind outside, bells that ring for a long time
//  The Desk     · a warm lo-fi chord, birds outside the window, key clicks, a floppy drive and a CRT whine
const SCALES = {
  night: [220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33],
  monument: [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392],
  desk: [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25],
};
const DRONE = {
  night: { freqs: [55, 82.41, 110, 55.2], type: 'sawtooth', gain: 0.11, cut: 320 },
  monument: { freqs: [36.71, 55, 73.42, 110.2], type: 'sine', gain: 0.075, cut: 380 },
  desk: { freqs: [130.81, 164.81, 196, 246.94], type: 'triangle', gain: 0.04, cut: 900 },
};

export function createAudio() {
  let ctx = null, master, filter, droneGain, windGain, windBP, delay, on = false, world = 'night';
  let oscs = [], trem, tremAmt, nextCritter = 0, seaG = null, seaLevel = 0;

  function noiseBuffer(len = 2) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    delay = ctx.createDelay(1.5); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.36; const wet = ctx.createGain(); wet.gain.value = 0.32;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 3;
    droneGain = ctx.createGain(); droneGain.gain.value = 0;
    trem = ctx.createGain(); trem.gain.value = 1;
    filter.connect(droneGain); droneGain.connect(trem); trem.connect(master);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 90;
    lfo.connect(lfoAmt); lfoAmt.connect(filter.frequency); lfo.start();
    // a slow tremolo for the desk's electric-piano chord
    const tl = ctx.createOscillator(); tl.frequency.value = 4.2; tremAmt = ctx.createGain(); tremAmt.gain.value = 0;
    tl.connect(tremAmt); tremAmt.connect(trem.gain); tl.start();
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(); noise.loop = true;
    windBP = ctx.createBiquadFilter(); windBP.type = 'bandpass'; windBP.frequency.value = 700; windBP.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    noise.connect(windBP); windBP.connect(windGain); windGain.connect(master); noise.start();
    voice(world);
    return true;
  }
  function voice(w) {
    if (!ctx) return;
    const D = DRONE[w], t = ctx.currentTime;
    oscs.forEach((o) => { try { o.stop(t + 0.8); } catch {} });
    oscs = D.freqs.map((f, i) => { const o = ctx.createOscillator(); o.type = D.type; o.frequency.value = f; o.detune.value = (i - 1) * 5; o.connect(filter); o.start(); return o; });
    filter.frequency.setTargetAtTime(D.cut, t, 0.5);
    droneGain.gain.setTargetAtTime(D.gain, t, 0.8);
    tremAmt.gain.setTargetAtTime(w === 'desk' ? 0.25 : 0, t, 0.3);
    windBP.frequency.setTargetAtTime(w === 'monument' ? 420 : w === 'desk' ? 500 : 700, t, 0.4);
    windBP.Q.setTargetAtTime(w === 'monument' ? 0.6 : 0.7, t, 0.4);
  }
  function blip(f, type, dur, gain, toDelay = true, attack = 0.01, when = 0) {
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); if (toDelay) g.connect(delay);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function burst(dur, f0, f1, q, gain, type = 'bandpass', when = 0) {
    const t = ctx.currentTime + when, src = ctx.createBufferSource(); src.buffer = noiseBuffer(dur + 0.05);
    const bp = ctx.createBiquadFilter(); bp.type = type; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
    return g;
  }
  function bird() {
    const t = ctx.currentTime, n = 2 + ((Math.random() * 2) | 0), base = 2400 + Math.random() * 1400;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), s = t + i * 0.11;
      o.type = 'sine'; o.frequency.setValueAtTime(base, s); o.frequency.exponentialRampToValueAtTime(base * 1.45, s + 0.07);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.02, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
      o.connect(g); g.connect(master); g.connect(delay); o.start(s); o.stop(s + 0.12);
    }
  }
  const ok = () => ctx && on;
  return {
    get on() { return on; },
    toggle() {
      if (!ctx && !init()) return false;
      on = !on;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.4);
      return on;
    },
    setWorld(w) { world = w; voice(w); },
    update(motion, velocity) {
      if (!ok()) return;
      const t = ctx.currentTime, D = DRONE[world];
      filter.frequency.setTargetAtTime(D.cut + Math.min(1, velocity) * 1400, t, 0.25);
      const base = world === 'monument' ? 0.01 : world === 'desk' ? 0.004 : 0.015;
      windGain.gain.setTargetAtTime(base + motion * (world === 'desk' ? 0.02 : 0.09), t, 0.3);
      if (t > nextCritter) {
        if (world === 'desk') { nextCritter = t + 3 + Math.random() * 6; bird(); }
        else if (world === 'monument') { nextCritter = t + 7 + Math.random() * 8; const S = SCALES.monument; blip(S[(Math.random() * 3) | 0] / 4, 'sine', 4.5, 0.035, true, 1.2); }
        else nextCritter = t + 5;
      }
    },
    chime(index) {
      if (!ok()) return;
      const S = SCALES[world], f = S[((index % S.length) + S.length) % S.length];
      if (world === 'desk') { blip(f, 'triangle', 0.9, 0.08); blip(f * 2, 'sine', 0.4, 0.03, false); }
      else {
        const t = ctx.currentTime, o = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f; m.frequency.value = f * 2.01; mg.gain.value = f * 0.6;
        m.connect(mg); mg.connect(o.frequency);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        mg.gain.exponentialRampToValueAtTime(1, t + 1.2);
        o.connect(g); g.connect(master); g.connect(delay);
        o.start(t); m.start(t); o.stop(t + 2.4); m.stop(t + 2.4);
      }
    },
    tick() {
      if (!ok()) return;
      blip(world === 'desk' ? 1400 : 1800, world === 'night' ? 'square' : 'sine', 0.05, world === 'night' ? 0.025 : 0.02, false, 0.002);
    },
    ui(kind) {
      if (!ok()) return;
      if (kind === 'msg') { blip(880, 'sine', 0.12, 0.03, false, 0.004); blip(1320, 'sine', 0.16, 0.025, false, 0.004, 0.06); }
      else blip(1200, 'sine', 0.05, 0.02, false, 0.002);
    },
    thump() {
      if (!ok()) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(master); g.connect(delay); o.start(t); o.stop(t + 0.75);
    },
    // the sea below the rooftop: slow surf, filtered noise breathing in and out
    sea(level) {
      if (!ctx || Math.abs(level - seaLevel) < 0.02) return;
      seaLevel = level;
      if (!seaG) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuffer(4); src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.4;
        const sw = ctx.createGain(); sw.gain.value = 0.6; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const la = ctx.createGain(); la.gain.value = 0.4;
        lfo.connect(la); la.connect(sw.gain); seaG = ctx.createGain(); seaG.gain.value = 0;
        src.connect(lp); lp.connect(sw); sw.connect(seaG); seaG.connect(master); src.start(); lfo.start();
      }
      seaG.gain.setTargetAtTime(level * 0.16, ctx.currentTime, 0.9);
    },
    drip() { if (!ok()) return; const o = blip(1500, 'sine', 0.18, 0.05, true, 0.002); o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12); },
    whoosh() { if (!ok()) return; burst(0.5, 600, 2400, 0.7, 0.05); },
    // The Desk
    key() { if (!ok()) return; burst(0.035, 3000 + Math.random() * 1500, 1800, 2.5, 0.12); blip(140 + Math.random() * 30, 'square', 0.03, 0.02, false, 0.001); },
    floppy() {
      if (!ok()) return;
      burst(0.12, 900, 400, 1.5, 0.2);
      for (let i = 0; i < 16; i++) blip(i % 4 === 3 ? 220 : 330, 'square', 0.03, 0.03, false, 0.001, 0.35 + i * 0.075);
      burst(0.08, 600, 300, 2, 0.15, 'bandpass', 1.6);
    },
    crt() { if (!ok()) return; const t = ctx.currentTime; blip(60, 'sine', 0.5, 0.25, false, 0.005); const o = blip(7800, 'sine', 1.4, 0.006, false, 0.2); o.frequency.setValueAtTime(7800, t); burst(0.25, 2000, 200, 0.7, 0.08); },
    click() { if (!ok()) return; burst(0.03, 2500, 1500, 3, 0.18); },
    // the sound of crossing between worlds, shaped by the transition
    portal(mode) {
      if (!ok()) return;
      const t = ctx.currentTime, len = 1.6;
      if (mode === 2) { this.crt(); burst(0.4, 3000, 120, 0.8, 0.12); return; }
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(len);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = mode === 1 ? 0.5 : 1.4;
      const [f0, f1] = mode === 0 ? [3200, 240] : [1200, 7000];
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + len);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(bp); bp.connect(g); g.connect(master); g.connect(delay); src.start(t);
      if (mode === 1) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(48, t); o.frequency.exponentialRampToValueAtTime(30, t + 2.2); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.35, t + 0.4); og.gain.exponentialRampToValueAtTime(0.0001, t + 2.6); o.connect(og); og.connect(master); og.connect(delay); o.start(t); o.stop(t + 2.7); burst(1.8, 300, 1400, 0.6, 0.08, 'lowpass', 0.2); }
      if (mode === 0) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(90, t + 0.3); o.frequency.exponentialRampToValueAtTime(30, t + 1.6); og.gain.setValueAtTime(0.0001, t + 0.3); og.gain.exponentialRampToValueAtTime(0.4, t + 0.42); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); o.connect(og); og.connect(master); o.start(t + 0.3); o.stop(t + 1.9); }
    },
  };
}
