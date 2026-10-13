// Sound effects synthesised with Web Audio, so the game ships no audio files.
const SOUNDS = {
  key: (s) => s.tone({ freq: 880, dur: 0.05, type: 'triangle', vol: 0.08 }),
  wrong: (s) => s.tone({ freq: 170, to: 110, dur: 0.18, type: 'sawtooth', vol: 0.07 }),
  miss: (s) => s.tone({ freq: 140, dur: 0.08, type: 'sine', vol: 0.06 }),
  zap: (s) => s.tone({ freq: 1400, to: 300, dur: 0.18, type: 'sawtooth', vol: 0.1 }),
  blaster: (s) => s.tone({ freq: 660, to: 440, dur: 0.06, type: 'square', vol: 0.04 }),
  freeze: (s) => s.tone({ freq: 1200, to: 1700, dur: 0.15, type: 'sine', vol: 0.05 }),
  rocket: (s) => s.noise({ dur: 0.2, vol: 0.05 }),
  explosion: (s) => s.noise({ dur: 0.35, vol: 0.1 }),
  coin: (s) => {
    s.tone({ freq: 988, dur: 0.06, type: 'square', vol: 0.05 });
    s.tone({ freq: 1319, dur: 0.1, type: 'square', vol: 0.05, delay: 0.06 });
  },
  shieldPop: (s) => s.tone({ freq: 400, to: 1600, dur: 0.25, type: 'triangle', vol: 0.12 }),
  bossAlarm: (s) => [0, 0.3, 0.6].forEach((delay) => s.tone({ freq: 440, to: 330, dur: 0.25, type: 'square', vol: 0.07, delay })),
  leak: (s) => s.tone({ freq: 220, to: 110, dur: 0.3, type: 'square', vol: 0.07 }),
  waveStart: (s) => [523, 659, 784].forEach((freq, i) => s.tone({ freq, dur: 0.12, type: 'triangle', vol: 0.09, delay: i * 0.1 })),
  victory: (s) => [523, 659, 784, 1047].forEach((freq, i) => s.tone({ freq, dur: 0.2, type: 'triangle', vol: 0.1, delay: i * 0.15 })),
  tryAgain: (s) => [392, 330].forEach((freq, i) => s.tone({ freq, dur: 0.25, type: 'triangle', vol: 0.08, delay: i * 0.2 })),
  build: (s) => s.tone({ freq: 523, to: 784, dur: 0.12, type: 'square', vol: 0.06 }),
  click: (s) => s.tone({ freq: 600, dur: 0.04, type: 'square', vol: 0.04 }),
  dizzy: (s) => [0, 0.08, 0.16, 0.24].forEach((delay, i) => s.tone({ freq: i % 2 ? 560 : 740, dur: 0.07, type: 'triangle', vol: 0.05, delay })),
};

export const SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));

export function createSfx({ AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  let ctx = null;
  let enabled = true;

  function context() {
    if (!ctx) {
      if (!AudioContextClass) return null;
      try {
        ctx = new AudioContextClass();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
    return ctx;
  }

  const synth = {
    tone({ freq, to = freq, dur, type, vol, delay = 0 }) {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    },
    noise({ dur, vol, delay = 0 }) {
      const start = ctx.currentTime + delay;
      const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(vol, start);
      source.connect(gain).connect(ctx.destination);
      source.start(start);
    },
  };

  return {
    play(name) {
      if (!enabled || !SOUNDS[name] || !context()) return;
      try {
        SOUNDS[name](synth);
      } catch {
        // Sound is optional; never let it break the game.
      }
    },
    unlock() {
      context();
    },
    setEnabled(on) {
      enabled = Boolean(on);
    },
  };
}

export const sfx = createSfx();
