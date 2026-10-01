// Generative sound with a character per world. Nothing is a recording: every sound is synthesised.
//  Daylight · soft marimba in a major pentatonic, paper rustle when you travel
//  Night    · low drone that opens with speed, wind, FM bells in a minor mode
//  Blueprint· a pulsing square bass, plotter-servo ticks, crisp blips
//  Planet   · airy fifths, birdsong in daylight and crickets after dark, an engine when you drive
const SCALES = {
  day: [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5],
  night: [220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33],
  blueprint: [293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33],
  planet: [349.23, 392, 440, 493.88, 523.25, 587.33, 659.25, 698.46],
};
const DRONE = {
  day: { freqs: [130.81, 196, 261.63], type: 'sine', gain: 0.05, cut: 900 },
  night: { freqs: [55, 82.41, 110, 55.2], type: 'sawtooth', gain: 0.11, cut: 320 },
  blueprint: { freqs: [73.42, 110, 146.83], type: 'square', gain: 0.045, cut: 520 },
  planet: { freqs: [87.31, 130.81, 174.61, 261.63], type: 'triangle', gain: 0.06, cut: 1200 },
};

export function createAudio() {
  let ctx = null, master, filter, droneGain, windGain, windBP, delay, on = false, world = 'day';
  let oscs = [], pulse, pulseAmt, engine, engineGain, nextCritter = 0, night = 0;

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
    pulse = ctx.createGain(); pulse.gain.value = 1;
    filter.connect(droneGain); droneGain.connect(pulse); pulse.connect(master);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 90;
    lfo.connect(lfoAmt); lfoAmt.connect(filter.frequency); lfo.start();
    // blueprint pulse: a 2 Hz gate on the drone
    const plfo = ctx.createOscillator(); plfo.type = 'square'; plfo.frequency.value = 2; pulseAmt = ctx.createGain(); pulseAmt.gain.value = 0;
    plfo.connect(pulseAmt); pulseAmt.connect(pulse.gain); plfo.start();
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer(); noise.loop = true;
    windBP = ctx.createBiquadFilter(); windBP.type = 'bandpass'; windBP.frequency.value = 700; windBP.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    noise.connect(windBP); windBP.connect(windGain); windGain.connect(master); noise.start();
    engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 50;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 380;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engine.connect(ef); ef.connect(engineGain); engineGain.connect(master); engine.start();
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
    pulseAmt.gain.setTargetAtTime(w === 'blueprint' ? 0.5 : 0, t, 0.3);
    windBP.frequency.setTargetAtTime(w === 'day' ? 3200 : w === 'blueprint' ? 1800 : 700, t, 0.4);
    windBP.Q.setTargetAtTime(w === 'day' ? 0.4 : 0.7, t, 0.4);
  }
  function blip(f, type, dur, gain, toDelay = true, attack = 0.01) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); if (toDelay) g.connect(delay);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function critter() {
    const t = ctx.currentTime;
    if (night < 0.5) {
      // a small bird: two or three quick upward chirps
      const n = 2 + ((Math.random() * 2) | 0), base = 2200 + Math.random() * 1600;
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain(), s = t + i * 0.11;
        o.type = 'sine'; o.frequency.setValueAtTime(base, s); o.frequency.exponentialRampToValueAtTime(base * 1.45, s + 0.07);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.035, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
        o.connect(g); g.connect(master); g.connect(delay); o.start(s); o.stop(s + 0.12);
      }
    } else {
      // a cricket: a fast amplitude-modulated buzz
      const o = ctx.createOscillator(), am = ctx.createOscillator(), amg = ctx.createGain(), g = ctx.createGain();
      o.frequency.value = 4400 + Math.random() * 600; am.frequency.value = 42; amg.gain.value = 0.02;
      g.gain.value = 0; am.connect(amg); amg.connect(g.gain);
      o.connect(g); g.connect(master); o.start(t); am.start(t); o.stop(t + 0.5); am.stop(t + 0.5);
    }
  }

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
    setNight(n) { night = n; },
    update(motion, velocity, drive = 0) {
      if (!ctx || !on) return;
      const t = ctx.currentTime, D = DRONE[world];
      filter.frequency.setTargetAtTime(D.cut + Math.min(1, velocity) * 1400, t, 0.25);
      windGain.gain.setTargetAtTime((world === 'day' ? 0.006 : 0.015) + motion * (world === 'day' ? 0.05 : 0.09), t, 0.3);
      engineGain.gain.setTargetAtTime(drive > 0.02 ? 0.05 + drive * 0.06 : 0, t, 0.15);
      engine.frequency.setTargetAtTime(48 + drive * 90, t, 0.1);
      if (world === 'planet' && t > nextCritter) { nextCritter = t + 1.2 + Math.random() * 3.2; critter(); }
      if (world === 'blueprint' && motion > 0.2 && Math.random() < motion * 0.12) blip(1800 + Math.random() * 1400, 'square', 0.025, 0.012, false, 0.002);
    },
    chime(index) {
      if (!ctx || !on) return;
      const S = SCALES[world], f = S[((index % S.length) + S.length) % S.length];
      if (world === 'day') { blip(f, 'triangle', 0.9, 0.12); blip(f * 4, 'sine', 0.25, 0.03, false); }
      else if (world === 'blueprint') { blip(f, 'square', 0.35, 0.05); blip(f * 2, 'sine', 0.2, 0.04, false); }
      else if (world === 'planet') { blip(f, 'sine', 2.4, 0.1, true, 0.03); blip(f * 3, 'sine', 1.2, 0.03, true, 0.03); }
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
      if (!ctx || !on) return;
      blip(world === 'day' ? 2400 : 1800, world === 'planet' ? 'sine' : 'square', 0.06, world === 'day' ? 0.02 : 0.025, false, 0.002);
    },
    thump() {
      if (!ctx || !on) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(world === 'day' ? 220 : 140, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(master); g.connect(delay); o.start(t); o.stop(t + 0.75);
    },
    // the sound of crossing between worlds, shaped by the transition
    portal(mode) {
      if (!ctx || !on) return;
      const t = ctx.currentTime, len = mode === 1 ? 1.2 : 1.5;
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(len);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = mode === 1 ? 0.6 : 1.4;
      const [f0, f1] = mode === 0 ? [3200, 240] : mode === 1 ? [900, 5200] : mode === 2 ? [400, 4000] : [200, 1800];
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + len);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(mode === 1 ? 0.18 : 0.3, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(bp); bp.connect(g); g.connect(master); g.connect(delay); src.start(t);
      if (mode === 2) for (let i = 0; i < 14; i++) setTimeout(() => on && blip(1500 + Math.random() * 2000, 'square', 0.03, 0.02, false, 0.002), i * 90);
      if (mode === 3) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(640, t + 1.4); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.15, t + 0.5); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(og); og.connect(master); o.start(t); o.stop(t + 1.7); }
      if (mode === 0) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(90, t + 0.3); o.frequency.exponentialRampToValueAtTime(30, t + 1.6); og.gain.setValueAtTime(0.0001, t + 0.3); og.gain.exponentialRampToValueAtTime(0.4, t + 0.42); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); o.connect(og); og.connect(master); o.start(t + 0.3); o.stop(t + 1.9); }
    },
    crack() { this.portal(0); },
  };
}
