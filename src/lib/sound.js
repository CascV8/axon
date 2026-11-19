// Tiny Web Audio sound effects (no audio files to download).
import { getState } from './store.js';

let ctx;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.12) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SOUNDS = {
  correct: () => { tone(660, 0, 0.12, 'triangle'); tone(990, 0.08, 0.18, 'triangle'); },
  wrong: () => { tone(220, 0, 0.18, 'sawtooth', 0.05); tone(180, 0.1, 0.22, 'sawtooth', 0.05); },
  complete: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle')),
  levelup: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.3, 'square', 0.05)),
  tap: () => tone(880, 0, 0.04, 'sine', 0.04),
};

export function play(name) {
  try {
    if (!getState().profile.sound) return;
    SOUNDS[name]?.();
    if (navigator.vibrate && (name === 'wrong')) navigator.vibrate(60);
  } catch {
    /* audio is optional */
  }
}
