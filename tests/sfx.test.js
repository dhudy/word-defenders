import { describe, it, expect } from 'vitest';
import { createSfx, SOUND_NAMES } from '../src/audio/sfx.js';

class FakeAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = {};
    this.started = [];
  }

  param() {
    return { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  }

  createOscillator() {
    const started = this.started;
    return { type: '', frequency: this.param(), connect: (node) => node, start: () => started.push('tone'), stop() {} };
  }

  createGain() {
    return { gain: this.param(), connect: (node) => node };
  }

  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }

  createBufferSource() {
    const started = this.started;
    return { buffer: null, connect: (node) => node, start: () => started.push('noise') };
  }

  resume() {
    return Promise.resolve();
  }
}

function recorder() {
  const box = { ctx: null };
  class Recording extends FakeAudioContext {
    constructor() {
      super();
      box.ctx = this;
    }
  }
  return { box, Recording };
}

describe('createSfx', () => {
  it('has a sound for every game moment in the spec', () => {
    expect(SOUND_NAMES).toEqual(expect.arrayContaining([
      'key', 'wrong', 'miss', 'zap', 'blaster', 'freeze', 'rocket', 'explosion', 'coin',
      'shieldPop', 'bossAlarm', 'leak', 'waveStart', 'victory', 'tryAgain', 'build', 'click',
    ]));
  });

  it('is silent and safe without Web Audio', () => {
    const sfx = createSfx({ AudioContextClass: null });
    expect(() => SOUND_NAMES.forEach((name) => sfx.play(name))).not.toThrow();
  });

  it('plays every sound through one shared context', () => {
    const { box, Recording } = recorder();
    const sfx = createSfx({ AudioContextClass: Recording });
    for (const name of SOUND_NAMES) sfx.play(name);
    expect(box.ctx.started.length).toBeGreaterThanOrEqual(SOUND_NAMES.length);
  });

  it('plays nothing while disabled', () => {
    const { box, Recording } = recorder();
    const sfx = createSfx({ AudioContextClass: Recording });
    sfx.setEnabled(false);
    sfx.play('coin');
    expect(box.ctx).toBeNull();
  });

  it('ignores unknown sound names', () => {
    const sfx = createSfx({ AudioContextClass: FakeAudioContext });
    expect(() => sfx.play('nope')).not.toThrow();
  });
});
