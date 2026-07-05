/**
 * 8-bit audio, fully synthesized in WebAudio — no asset files.
 * SFX are little oscillator envelopes; music tracks are hand-composed
 * chiptune loops (square bass, triangle lead, noise hats) per planet.
 */
import { state } from './save';

export type SfxName =
  | 'jump'
  | 'attack'
  | 'stomp'
  | 'hurt'
  | 'die'
  | 'pickup'
  | 'eat'
  | 'orb'
  | 'click'
  | 'boss'
  | 'denied';

export type TrackName = 'moon' | 'mars' | 'map';

type Note = [beat: number, midi: number, lenBeats: number];
interface VoiceDef {
  type: OscillatorType;
  vol: number;
  notes: Note[];
}
interface TrackDef {
  bpm: number;
  beats: number;
  voices: VoiceDef[];
  hat?: number[];
}

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- compositions ---------- */

// THE MOON — slow and dreamy, A-minor pentatonic drifting over a soft bass.
const MOON: TrackDef = {
  bpm: 72,
  beats: 16,
  voices: [
    {
      type: 'square',
      vol: 0.09,
      notes: [
        [0, 45, 1.6], [2, 45, 0.9], [3, 52, 0.9],
        [4, 41, 1.6], [6, 41, 0.9], [7, 48, 0.9],
        [8, 43, 1.6], [10, 43, 0.9], [11, 50, 0.9],
        [12, 40, 1.6], [14, 40, 0.9], [15, 47, 0.9],
      ],
    },
    {
      type: 'triangle',
      vol: 0.16,
      notes: [
        [0, 76, 2], [2.5, 74, 1], [4, 72, 2.5],
        [8, 74, 1.5], [10.5, 76, 1], [12, 69, 3.5],
      ],
    },
    {
      type: 'square',
      vol: 0.04, // far-away sparkles
      notes: [[7, 88, 0.25], [7.5, 91, 0.25], [15, 84, 0.3]],
    },
  ],
  hat: [0, 2, 4, 6, 8, 10, 12, 14],
};

// MARS — driving D-minor march for a dusty red battlefield.
const marsBass: Note[] = [];
[38, 38, 41, 36].forEach((root, bar) => {
  for (let i = 0; i < 8; i++) {
    marsBass.push([bar * 4 + i * 0.5, i % 4 === 2 ? root + 7 : root, 0.42]);
  }
});
const MARS: TrackDef = {
  bpm: 104,
  beats: 16,
  voices: [
    { type: 'square', vol: 0.1, notes: marsBass },
    {
      type: 'triangle',
      vol: 0.17,
      notes: [
        [0, 62, 1], [1.5, 65, 0.5], [2, 69, 1.5],
        [4, 67, 1], [5.5, 65, 0.5], [6, 62, 1.5],
        [8, 62, 0.75], [9, 65, 0.75], [10, 69, 1], [11, 72, 1],
        [12, 70, 2], [14, 67, 1.8],
      ],
    },
  ],
  hat: Array.from({ length: 16 }, (_, i) => i),
};

// STAR MAP — gentle Cmaj7 twinkle for planning your next hop.
const mapArp: Note[] = Array.from({ length: 16 }, (_, i) => [
  i,
  [60, 64, 67, 71, 72, 71, 67, 64][i % 8],
  0.85,
]);
const MAP: TrackDef = {
  bpm: 84,
  beats: 16,
  voices: [
    { type: 'triangle', vol: 0.07, notes: mapArp },
    {
      type: 'triangle',
      vol: 0.06,
      notes: [[0, 84, 3.5], [4, 83, 3.5], [8, 81, 3.5], [12, 79, 3.5]],
    },
  ],
};

const TRACKS: Record<TrackName, TrackDef> = { moon: MOON, mars: MARS, map: MAP };

/* ---------- engine ---------- */

class ChipAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;

  private desired: TrackName | null = null;
  private playing: TrackName | null = null;
  private loopGain: GainNode | null = null;
  private loopTimer: number | null = null;

  get enabled(): boolean {
    return state.save.settings.sound !== 'off';
  }

  toggle(): boolean {
    state.save.settings.sound = this.enabled ? 'off' : 'on';
    state.touch();
    if (!this.enabled) this.stopLoop();
    this.sync();
    return this.enabled;
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.master);
      const len = Math.floor(this.ctx.sampleRate * 0.25);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().then(() => this.sync());
    return this.ctx;
  }

  private tone(
    freq: number,
    when: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    dest: AudioNode,
    slideTo?: number
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo !== undefined) osc.frequency.linearRampToValueAtTime(slideTo, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.setValueAtTime(vol, when + dur * 0.55);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  private noise(when: number, dur: number, vol: number, dest: AudioNode, freq = 6000): void {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  sfx(name: SfxName): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    const M = this.master;
    switch (name) {
      case 'jump':
        this.tone(220, t, 0.13, 'square', 0.14, M, 520);
        break;
      case 'attack':
        this.noise(t, 0.09, 0.12, M, 3200);
        this.tone(700, t, 0.07, 'square', 0.08, M, 240);
        break;
      case 'stomp':
        this.tone(320, t, 0.11, 'square', 0.16, M, 70);
        this.noise(t, 0.08, 0.1, M, 900);
        break;
      case 'hurt':
        this.tone(160, t, 0.2, 'sawtooth', 0.14, M, 110);
        this.tone(151, t, 0.2, 'sawtooth', 0.1, M, 104);
        break;
      case 'die':
        this.tone(420, t, 0.5, 'square', 0.13, M, 80);
        break;
      case 'pickup':
        this.tone(660, t, 0.06, 'square', 0.11, M);
        this.tone(990, t + 0.07, 0.09, 'square', 0.11, M);
        break;
      case 'eat':
        this.tone(330, t, 0.08, 'triangle', 0.16, M, 240);
        this.tone(300, t + 0.1, 0.12, 'triangle', 0.16, M, 180);
        break;
      case 'orb':
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(f, t + i * 0.09, 0.16, i < 4 ? 'square' : 'triangle', 0.12, M)
        );
        break;
      case 'click':
        this.tone(880, t, 0.04, 'square', 0.07, M);
        break;
      case 'boss':
        this.tone(70, t, 0.7, 'sawtooth', 0.18, M, 45);
        this.noise(t + 0.1, 0.4, 0.06, M, 300);
        break;
      case 'denied':
        this.tone(150, t, 0.14, 'square', 0.1, M, 140);
        break;
    }
  }

  music(track: TrackName | null): void {
    this.desired = track;
    this.sync();
  }

  private sync(): void {
    if (!this.enabled || !this.desired) {
      this.stopLoop();
      return;
    }
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return; // resumes on first tap/keypress
    if (this.playing === this.desired) return;
    this.stopLoop();
    this.startLoop(TRACKS[this.desired]);
    this.playing = this.desired;
  }

  private startLoop(track: TrackDef): void {
    const ctx = this.ctx!;
    const loopGain = ctx.createGain();
    loopGain.gain.value = 1;
    loopGain.connect(this.musicBus);
    this.loopGain = loopGain;

    const spb = 60 / track.bpm;
    const loopDur = track.beats * spb;
    const schedule = (t0: number) => {
      for (const v of track.voices) {
        for (const [beat, midi, len] of v.notes) {
          this.tone(midiHz(midi), t0 + beat * spb, Math.max(0.09, len * spb * 0.92), v.type, v.vol, loopGain);
        }
      }
      for (const b of track.hat ?? []) this.noise(t0 + b * spb, 0.03, 0.03, loopGain);
    };

    let next = ctx.currentTime + 0.06;
    schedule(next);
    const tick = () => {
      if (!this.ctx || this.loopGain !== loopGain) return;
      const lead = next + loopDur - this.ctx.currentTime;
      this.loopTimer = window.setTimeout(() => {
        next += loopDur;
        schedule(next);
        tick();
      }, Math.max(60, (lead - 0.3) * 1000));
    };
    tick();
  }

  private stopLoop(): void {
    if (this.loopTimer !== null) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.loopGain && this.ctx) {
      const g = this.loopGain;
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      setTimeout(() => g.disconnect(), 500);
    }
    this.loopGain = null;
    this.playing = null;
  }
}

export const audio = new ChipAudio();

// Browsers keep AudioContext suspended until a user gesture — unlock on the first one.
if (typeof document !== 'undefined') {
  const unlock = () => audio['ensure']();
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock, { passive: true });
}
