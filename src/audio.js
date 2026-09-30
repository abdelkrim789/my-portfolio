// Generative sound: a low drone that opens with scroll speed, wind that follows
// particle motion, and a pentatonic chime at each chapter.
export function createAudio() {
  let ctx = null, master, filter, windGain, delay, on = false;
  const NOTES = [220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33];

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

    delay = ctx.createDelay(1.5); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);

    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320; filter.Q.value = 3;
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.11;
    filter.connect(droneGain); droneGain.connect(master);
    [[55, 'sawtooth', 0], [82.41, 'triangle', 4], [110, 'sine', -6], [55.2, 'sawtooth', 7]].forEach(([f, type, det]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      o.connect(filter); o.start();
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 90;
    lfo.connect(lfoAmt); lfoAmt.connect(filter.frequency); lfo.start();

    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    noise.connect(bp); bp.connect(windGain); windGain.connect(master); noise.start();
    return true;
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
    update(motion, velocity) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      filter.frequency.setTargetAtTime(260 + Math.min(1, velocity) * 1400, t, 0.25);
      windGain.gain.setTargetAtTime(0.015 + motion * 0.09, t, 0.3);
    },
    tick() {
      if (!ctx || !on) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
      g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.08);
    },
    thump() {
      if (!ctx || !on) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(master); g.connect(delay); o.start(t); o.stop(t + 0.75);
    },
    chime(index) {
      if (!ctx || !on) return;
      const t = ctx.currentTime, f = NOTES[index % NOTES.length];
      const o = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; m.frequency.value = f * 2.01; mg.gain.value = f * 0.6;
      m.connect(mg); mg.connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      mg.gain.exponentialRampToValueAtTime(1, t + 1.2);
      o.connect(g); g.connect(master); g.connect(delay);
      o.start(t); m.start(t); o.stop(t + 2.4); m.stop(t + 2.4);
    },
  };
}
