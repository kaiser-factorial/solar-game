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

export type TrackName = 'moon' | 'mars' | 'earth' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'venus' | 'mercury' | 'map';

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

// EARTH — hopeful G-major pentatonic, brighter/more energetic than Moon,
// bouncy without Mars's martial urgency.
const EARTH: TrackDef = {
  bpm: 92,
  beats: 16,
  voices: [
    {
      type: 'triangle',
      vol: 0.12,
      notes: [
        [0, 43, 0.9], [1, 50, 0.4], [1.5, 43, 0.4],
        [2, 45, 0.9], [3.5, 43, 0.4],
        [4, 48, 0.9], [5, 55, 0.4], [5.5, 48, 0.4],
        [6, 50, 0.9], [7.5, 48, 0.4],
        [8, 43, 0.9], [9, 50, 0.4], [9.5, 43, 0.4],
        [10, 45, 0.9], [11.5, 43, 0.4],
        [12, 46, 0.9], [13, 53, 0.4], [13.5, 46, 0.4],
        [14, 48, 1.8],
      ],
    },
    {
      type: 'square',
      vol: 0.13,
      notes: [
        [0, 74, 1], [1.5, 77, 0.5], [2, 79, 1], [3.5, 77, 0.5],
        [4, 76, 1.5], [6, 74, 0.75], [7, 72, 0.75],
        [8, 74, 1], [9.5, 79, 0.5], [10, 81, 1], [11.5, 79, 0.5],
        [12, 77, 1], [13.5, 76, 0.5], [14, 74, 2],
      ],
    },
    {
      type: 'sawtooth',
      vol: 0.05,
      notes: [[3, 86, 0.3], [7, 89, 0.3], [11, 86, 0.3], [15, 91, 0.4]],
    },
  ],
  hat: [1, 3, 5, 7, 9, 11, 13, 15],
};

// JUPITER — driving 118bpm F-minor storm march, heavier/more intense than Mars.
const JUPITER: TrackDef = {
  bpm: 118,
  beats: 16,
  voices: [
    {
      type: 'sawtooth',
      vol: 0.1,
      notes: [
        [0, 29, 1.6], [2, 29, 0.9], [3, 36, 0.9],
        [4, 34, 1.6], [6, 34, 0.9], [7, 41, 0.9],
        [8, 29, 1.6], [10, 29, 0.9], [11, 36, 0.9],
        [12, 32, 1.6], [14, 32, 0.9], [15, 39, 0.9],
      ],
    },
    {
      type: 'triangle',
      vol: 0.16,
      notes: [
        [0, 65, 1], [1, 68, 0.5], [1.5, 65, 0.5], [2, 63, 1.5],
        [4, 70, 1], [5, 68, 0.5], [5.5, 65, 0.5], [6, 63, 1.5],
        [8, 65, 0.75], [9, 68, 0.75], [10, 72, 1], [11, 75, 1],
        [12, 73, 2], [14, 70, 1.8],
      ],
    },
    {
      type: 'square',
      vol: 0.05,
      notes: [[3.5, 84, 0.25], [7.5, 87, 0.25], [11.5, 89, 0.25], [15.5, 84, 0.3]],
    },
  ],
  hat: Array.from({ length: 16 }, (_, i) => i),
};

// SATURN — grander, more harmonically-rich 96bpm theme for the ring world.
const SATURN: TrackDef = {
  bpm: 96,
  beats: 16,
  voices: [
    {
      type: 'sawtooth',
      vol: 0.09,
      notes: [
        [0, 40, 1.5], [1.5, 40, 0.5], [2, 47, 1], [3, 43, 1],
        [4, 38, 1.5], [5.5, 38, 0.5], [6, 45, 1], [7, 41, 1],
        [8, 40, 1.5], [9.5, 40, 0.5], [10, 47, 1], [11, 43, 1],
        [12, 36, 1.5], [13.5, 36, 0.5], [14, 43, 1], [15, 40, 1],
      ],
    },
    {
      type: 'triangle',
      vol: 0.15,
      notes: [
        [0, 64, 2], [2, 67, 1], [3, 71, 1], [4, 69, 2],
        [6, 67, 1.5], [8, 64, 1.5], [9.5, 62, 1], [10.5, 67, 1],
        [12, 60, 2.5], [14.5, 64, 1.5],
      ],
    },
    {
      type: 'square',
      vol: 0.06,
      notes: [
        [3.5, 79, 0.25], [4, 83, 0.25], [7.5, 76, 0.25], [8, 79, 0.25],
        [11.5, 84, 0.25], [12, 88, 0.25], [15, 83, 0.5], [15.5, 79, 0.5],
      ],
    },
  ],
  hat: [0, 1.5, 2, 3, 4, 5.5, 6, 7, 8, 9.5, 10, 11, 12, 13.5, 14, 15],
};

// URANUS — colder, sparser 92bpm with glassy high tones for alien, crisp eeriness.
const URANUS: TrackDef = {
  bpm: 92,
  beats: 16,
  voices: [
    {
      type: 'sawtooth',
      vol: 0.07,
      notes: [
        [0, 33, 2], [2, 33, 1.5], [4, 36, 2], [6, 33, 1.5],
        [8, 31, 2], [10, 31, 1.5], [12, 38, 2], [14, 33, 1.5],
      ],
    },
    {
      type: 'triangle',
      vol: 0.15,
      notes: [
        [0, 69, 1.5], [2, 72, 0.75], [3, 74, 1.25], [5, 69, 1.5],
        [7, 67, 1], [8, 67, 1.5], [10, 71, 0.75], [11, 74, 1.25],
        [13, 69, 1.5], [15, 67, 1],
      ],
    },
    {
      type: 'square',
      vol: 0.045,
      notes: [
        [1.5, 93, 0.2], [3.75, 96, 0.2], [7.5, 89, 0.25],
        [9.5, 98, 0.2], [11.75, 93, 0.2], [15.5, 96, 0.25],
      ],
    },
  ],
  hat: [0, 3, 6, 8, 11, 14],
};

// NEPTUNE — fastest/most urgent yet, 132bpm dissonant storm gallop.
const NEPTUNE: TrackDef = {
  bpm: 132,
  beats: 16,
  voices: [
    {
      type: 'square',
      vol: 0.12,
      notes: [
        [0, 38, 0.45], [0.5, 38, 0.45], [1, 45, 0.45], [1.5, 38, 0.45],
        [2, 38, 0.45], [2.5, 38, 0.45], [3, 44, 0.45], [3.5, 38, 0.45],
        [4, 36, 0.45], [4.5, 36, 0.45], [5, 43, 0.45], [5.5, 36, 0.45],
        [6, 36, 0.45], [6.5, 36, 0.45], [7, 42, 0.45], [7.5, 36, 0.45],
        [8, 41, 0.45], [8.5, 41, 0.45], [9, 48, 0.45], [9.5, 41, 0.45],
        [10, 41, 0.45], [10.5, 41, 0.45], [11, 47, 0.45], [11.5, 41, 0.45],
        [12, 38, 0.45], [12.5, 38, 0.45], [13, 44, 0.9],
        [14, 36, 0.45], [14.5, 36, 0.45], [15, 42, 0.9],
      ],
    },
    {
      type: 'sawtooth',
      vol: 0.09,
      notes: [
        [0, 62, 1.4], [2, 65, 0.9], [3, 68, 0.9], [4, 60, 1.4],
        [6, 63, 0.9], [7, 66, 0.9], [8, 65, 1.4], [10, 68, 0.9],
        [11, 70, 0.9], [12, 62, 0.9], [13, 65, 0.9], [14, 68, 0.9], [15, 61, 0.9],
      ],
    },
    {
      type: 'triangle',
      vol: 0.15,
      notes: [
        [0, 74, 0.4], [0.5, 77, 0.4], [1, 80, 0.4], [1.5, 77, 0.4],
        [2, 74, 0.4], [2.5, 77, 0.4], [3, 79, 0.4], [3.5, 77, 0.4],
        [4, 72, 0.4], [4.5, 75, 0.4], [5, 78, 0.4], [5.5, 75, 0.4],
        [6, 72, 0.4], [6.5, 75, 0.4], [7, 77, 0.4], [7.5, 75, 0.4],
        [8, 77, 0.4], [8.5, 80, 0.4], [9, 82, 0.4], [9.5, 80, 0.4],
        [10, 77, 0.4], [10.5, 80, 0.4], [11, 84, 0.4], [11.5, 80, 0.4],
        [12, 74, 0.4], [12.5, 77, 0.4], [13, 80, 0.9],
        [14, 73, 0.4], [14.5, 76, 0.4], [15, 79, 0.9],
      ],
    },
  ],
  hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12.5, 13, 13.5, 14, 15, 15.5],
};

// PLUTO — darkest, fastest of all (128bpm), low sawtooth drone under an
// urgent square lead for the finale before the (future) final boss.
const PLUTO: TrackDef = {
  bpm: 128,
  beats: 16,
  voices: [
    {
      type: 'sawtooth',
      vol: 0.11,
      notes: [
        [0, 33, 0.9], [1, 33, 0.4], [1.5, 36, 0.4], [2, 38, 0.9], [3, 33, 0.9],
        [4, 31, 0.9], [5, 31, 0.4], [5.5, 34, 0.4], [6, 36, 0.9], [7, 31, 0.9],
        [8, 33, 0.9], [9, 33, 0.4], [9.5, 36, 0.4], [10, 38, 0.9], [11, 33, 0.9],
        [12, 29, 0.9], [13, 29, 0.4], [13.5, 32, 0.4], [14, 34, 1.8],
      ],
    },
    {
      type: 'square',
      vol: 0.13,
      notes: [
        [0, 69, 1], [1.5, 72, 0.5], [2, 74, 1], [3.5, 69, 0.5],
        [4, 67, 1], [5.5, 70, 0.5], [6, 72, 1], [7.5, 67, 0.5],
        [8, 69, 0.75], [9, 72, 0.75], [10, 74, 1], [11, 76, 1],
        [12, 65, 0.5], [12.5, 68, 0.5], [13, 72, 0.5], [13.5, 75, 0.5], [14, 77, 2],
      ],
    },
    {
      type: 'triangle',
      vol: 0.06,
      notes: [
        [0, 81, 0.2], [2, 84, 0.2], [4, 81, 0.2], [6, 84, 0.2],
        [8, 86, 0.2], [10, 84, 0.2], [12, 89, 0.2], [15, 86, 0.3],
      ],
    },
  ],
  hat: Array.from({ length: 16 }, (_, i) => i),
};

// VENUS — heavy, ominous, volcanic-underground. Slow C-minor with a rumbling
// low bass, a sparse brooding lead, and distant high "drip" notes echoing in
// the cavern. Oppressive and cavernous.
const VENUS: TrackDef = {
  bpm: 100,
  beats: 16,
  voices: [
    {
      type: 'sawtooth',
      vol: 0.11,
      notes: [
        [0, 24, 2], [2, 24, 1], [3, 31, 1],
        [4, 27, 2], [6, 27, 1], [7, 22, 1],
        [8, 24, 2], [10, 24, 1], [11, 31, 1],
        [12, 20, 2.5], [14.5, 27, 1.5],
      ],
    },
    {
      type: 'triangle',
      vol: 0.13,
      notes: [
        [0, 60, 2.5], [3, 63, 1], [4, 67, 2],
        [7, 63, 1], [8, 60, 2], [10.5, 58, 1.5],
        [12, 55, 2], [14, 60, 2],
      ],
    },
    {
      type: 'square',
      vol: 0.05, // distant cavern "drips"
      notes: [[2.75, 84, 0.2], [6.5, 87, 0.2], [10.25, 82, 0.2], [13.5, 79, 0.25]],
    },
  ],
  hat: [0, 4, 8, 12],
};

// MERCURY — intense, bright-hot, solar. Fast E-minor with a busy driving bass,
// shimmering high square arpeggios, and a near-full hat. Blazing and urgent.
const mercuryBass: Note[] = [];
[28, 28, 31, 26].forEach((root, bar) => {
  for (let i = 0; i < 8; i++) {
    mercuryBass.push([bar * 4 + i * 0.5, i % 4 === 2 ? root + 7 : root, 0.4]);
  }
});
const MERCURY: TrackDef = {
  bpm: 126,
  beats: 16,
  voices: [
    { type: 'sawtooth', vol: 0.1, notes: mercuryBass },
    {
      type: 'square',
      vol: 0.13,
      notes: [
        [0, 76, 0.5], [0.5, 79, 0.5], [1, 83, 0.5], [1.5, 79, 0.5],
        [2, 76, 0.5], [2.5, 83, 0.5], [3, 88, 0.5], [3.5, 83, 0.5],
        [4, 74, 0.5], [4.5, 79, 0.5], [5, 83, 0.5], [5.5, 79, 0.5],
        [6, 74, 0.5], [6.5, 81, 0.5], [7, 86, 0.5], [7.5, 81, 0.5],
        [8, 76, 0.5], [8.5, 79, 0.5], [9, 83, 0.5], [9.5, 79, 0.5],
        [10, 76, 0.5], [10.5, 83, 0.5], [11, 88, 0.5], [11.5, 91, 0.5],
        [12, 74, 0.5], [12.5, 81, 0.5], [13, 86, 0.5], [13.5, 81, 0.5],
        [14, 76, 0.5], [14.5, 83, 0.5], [15, 88, 1],
      ],
    },
    {
      type: 'triangle',
      vol: 0.07, // hot high sparkle
      notes: [[1, 95, 0.2], [3, 98, 0.2], [5, 95, 0.2], [7, 100, 0.2], [9, 95, 0.2], [11, 98, 0.2], [13, 100, 0.2], [15, 103, 0.3]],
    },
  ],
  hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12.5, 13, 14, 15, 15.5],
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

const TRACKS: Record<TrackName, TrackDef> = {
  moon: MOON,
  mars: MARS,
  earth: EARTH,
  jupiter: JUPITER,
  saturn: SATURN,
  uranus: URANUS,
  neptune: NEPTUNE,
  pluto: PLUTO,
  venus: VENUS,
  mercury: MERCURY,
  map: MAP,
};

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
