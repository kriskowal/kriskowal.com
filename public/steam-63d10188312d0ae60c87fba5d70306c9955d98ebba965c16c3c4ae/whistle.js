// Steam whistle synthesis using WebAudio.
// Harmonic profile derived from FFT analysis of a real steam whistle
// recording (freesound_community-steam-whistle-31814.mp3).
//
// Two-chime whistle: a low bell (F4, 349 Hz) that speaks first, and a
// higher bell (C5, 523 Hz — a fifth above) that requires more pressure
// and lags the activation. This models a period chime whistle where
// the smaller bell has a higher speaking threshold.
//
// The architecture uses noise-excited resonators: white noise
// (representing turbulent steam) is fed through sharp bandpass filters
// tuned to measured spectral peaks. Tonal oscillators anchor the pitch.
//
// See WHISTLE.md for research notes and citations.

// Voice configuration

// Each voice defines a whistle bell with its own fundamental,
// speak threshold, and resonance profile.

const LOW_VOICE = {
  fundamental: 349.0, // Hz (F4)
  discordFreq: 503,   // inharmonic bell mode (~1.44× fundamental)
  discordGain: 0.045,
  speakThreshold: 0.08,  // valve opening where tone begins
  masterGain: 0.45,
  attackTime: 0.12,

  toneHarmonics: [
    { ratio: 1, gain: 0.55 },
    { ratio: 2, gain: 0.14 },
    { ratio: 3, gain: 0.05 },
    { ratio: 4, gain: 0.03 },
    { ratio: 5, gain: 0.02 },
    { ratio: 6, gain: 0.015 },
  ],

  resonances: [
    { freq: 349,   gain: 0.50,  Q: 30 },
    { freq: 698,   gain: 0.12,  Q: 25 },
    { freq: 1047,  gain: 0.06,  Q: 20 },
    { freq: 1396,  gain: 0.04,  Q: 18 },
    { freq: 1745,  gain: 0.03,  Q: 15 },
    { freq: 2094,  gain: 0.025, Q: 12 },
    { freq: 2443,  gain: 0.020, Q: 10 },
    { freq: 2792,  gain: 0.018, Q: 8 },
    { freq: 97,    gain: 0.020, Q: 5 },
    { freq: 145,   gain: 0.025, Q: 6 },
    { freq: 194,   gain: 0.025, Q: 6 },
    { freq: 260,   gain: 0.020, Q: 6 },
    { freq: 434,   gain: 0.030, Q: 10 },
    { freq: 471,   gain: 0.030, Q: 10 },
    { freq: 503,   gain: 0.025, Q: 10 },
    { freq: 555,   gain: 0.030, Q: 10 },
    { freq: 644,   gain: 0.028, Q: 10 },
    { freq: 829,   gain: 0.025, Q: 8 },
    { freq: 863,   gain: 0.025, Q: 8 },
    { freq: 889,   gain: 0.022, Q: 8 },
    { freq: 950,   gain: 0.025, Q: 8 },
    { freq: 985,   gain: 0.025, Q: 8 },
    { freq: 1080,  gain: 0.022, Q: 7 },
    { freq: 1185,  gain: 0.022, Q: 7 },
    { freq: 1244,  gain: 0.028, Q: 8 },
    { freq: 1292,  gain: 0.020, Q: 6 },
    { freq: 1352,  gain: 0.020, Q: 6 },
    { freq: 1439,  gain: 0.018, Q: 5 },
    { freq: 1557,  gain: 0.016, Q: 5 },
    { freq: 1619,  gain: 0.016, Q: 5 },
    { freq: 1675,  gain: 0.014, Q: 5 },
    { freq: 1825,  gain: 0.014, Q: 5 },
    { freq: 3141,  gain: 0.012, Q: 4 },
    { freq: 3490,  gain: 0.010, Q: 4 },
    { freq: 4188,  gain: 0.008, Q: 3 },
  ],
};

const HIGH_VOICE = {
  fundamental: 523.0, // Hz (C5) — a fifth above the low bell
  discordFreq: 680,   // inharmonic mode (~1.30× fundamental)
  discordGain: 0.035,
  speakThreshold: 0.35,  // needs more pressure to speak
  masterGain: 0.30,
  attackTime: 0.25,      // slower onset — pressure must build

  toneHarmonics: [
    { ratio: 1, gain: 0.50 },
    { ratio: 2, gain: 0.16 },
    { ratio: 3, gain: 0.06 },
    { ratio: 4, gain: 0.035 },
    { ratio: 5, gain: 0.025 },
  ],

  resonances: [
    { freq: 523,   gain: 0.45,  Q: 32 },
    { freq: 1047,  gain: 0.12,  Q: 25 },
    { freq: 1570,  gain: 0.06,  Q: 20 },
    { freq: 2094,  gain: 0.04,  Q: 15 },
    { freq: 2617,  gain: 0.025, Q: 10 },
    { freq: 3141,  gain: 0.020, Q: 8 },
    { freq: 400,   gain: 0.020, Q: 6 },
    { freq: 460,   gain: 0.022, Q: 8 },
    { freq: 630,   gain: 0.025, Q: 10 },
    { freq: 750,   gain: 0.028, Q: 10 },
    { freq: 870,   gain: 0.025, Q: 8 },
    { freq: 1200,  gain: 0.022, Q: 8 },
    { freq: 1350,  gain: 0.020, Q: 7 },
    { freq: 1750,  gain: 0.018, Q: 6 },
    { freq: 1900,  gain: 0.016, Q: 6 },
    { freq: 2300,  gain: 0.015, Q: 5 },
    { freq: 3500,  gain: 0.010, Q: 4 },
    { freq: 4700,  gain: 0.008, Q: 3 },
  ],
};

// Shared parameters

// Broad hiss: wide-band noise layers for the steam jet.
const HISS_BANDS = [
  { freq: 1800, Q: 0.25, gain: 0.05 },
  { freq: 5000, Q: 0.3,  gain: 0.06 },
  { freq: 9000, Q: 0.5,  gain: 0.03 },
];

const JITTER_RATE_HZ = 3.5;
const JITTER_DEPTH_HZ = 1.5;

const PITCH_BEND_CENTS = 80;
const PITCH_RISE_CENTS = 80;
const PITCH_RISE_TIME = 0.45;
const PITCH_FALL_TIME = 0.30;
const RELEASE_TIME = 0.25;

// Voice builder

function buildVoice(ctx, voiceCfg, noise, jitterLFO, destination) {
  const submix = ctx.createGain();
  submix.gain.value = 0;
  submix.connect(destination);

  const resonances = voiceCfg.resonances.map(({ freq, gain, Q }) => {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = Q;
    const g = ctx.createGain();
    g.gain.value = gain;
    noise.connect(bp);
    bp.connect(g);
    g.connect(submix);
    return { filter: bp, gain: g, baseFreq: freq };
  });

  const discordOsc = ctx.createOscillator();
  discordOsc.type = "sine";
  discordOsc.frequency.value = voiceCfg.discordFreq;
  const discordGain = ctx.createGain();
  discordGain.gain.value = voiceCfg.discordGain;
  discordOsc.connect(discordGain);
  discordGain.connect(submix);
  discordOsc.start();

  const oscillators = voiceCfg.toneHarmonics.map(({ ratio, gain }) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = voiceCfg.fundamental * ratio;
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(submix);
    osc.start();
    return { osc, gain: g, ratio };
  });

  // Jitter on tonal oscillators and discord
  for (const { osc, ratio } of oscillators) {
    const jg = ctx.createGain();
    jg.gain.value = JITTER_DEPTH_HZ * ratio;
    jitterLFO.connect(jg);
    jg.connect(osc.frequency);
  }
  const djg = ctx.createGain();
  djg.gain.value = JITTER_DEPTH_HZ * (voiceCfg.discordFreq / voiceCfg.fundamental);
  jitterLFO.connect(djg);
  djg.connect(discordOsc.frequency);

  return {
    submix,
    resonances,
    discordOsc,
    oscillators,
    fundamental: voiceCfg.fundamental,
    discordFreq: voiceCfg.discordFreq,
    speakThreshold: voiceCfg.speakThreshold,
    masterGain: voiceCfg.masterGain,
    attackTime: voiceCfg.attackTime,
    active: false,
  };
}

function voiceSetFreqs(voice, bend, time) {
  for (const { osc, ratio } of voice.oscillators) {
    osc.frequency.cancelScheduledValues(time);
    osc.frequency.setValueAtTime(voice.fundamental * ratio * bend, time);
  }
  voice.discordOsc.frequency.cancelScheduledValues(time);
  voice.discordOsc.frequency.setValueAtTime(voice.discordFreq * bend, time);
  for (const { filter, baseFreq } of voice.resonances) {
    filter.frequency.cancelScheduledValues(time);
    filter.frequency.setValueAtTime(baseFreq * bend, time);
  }
}

function voiceRampFreqs(voice, bend, endTime) {
  for (const { osc, ratio } of voice.oscillators) {
    osc.frequency.linearRampToValueAtTime(voice.fundamental * ratio * bend, endTime);
  }
  voice.discordOsc.frequency.linearRampToValueAtTime(voice.discordFreq * bend, endTime);
  for (const { filter, baseFreq } of voice.resonances) {
    filter.frequency.linearRampToValueAtTime(baseFreq * bend, endTime);
  }
}

function voiceSmoothFreqs(voice, bend, timeConst, now) {
  for (const { osc, ratio } of voice.oscillators) {
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setTargetAtTime(voice.fundamental * ratio * bend, now, timeConst);
  }
  voice.discordOsc.frequency.cancelScheduledValues(now);
  voice.discordOsc.frequency.setTargetAtTime(voice.discordFreq * bend, now, timeConst);
  for (const { filter, baseFreq } of voice.resonances) {
    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setTargetAtTime(baseFreq * bend, now, timeConst);
  }
}

function voiceSnapshotFreqs(voice, now) {
  for (const { osc } of voice.oscillators) {
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setValueAtTime(osc.frequency.value, now);
  }
  voice.discordOsc.frequency.cancelScheduledValues(now);
  voice.discordOsc.frequency.setValueAtTime(voice.discordOsc.frequency.value, now);
  for (const { filter } of voice.resonances) {
    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setValueAtTime(filter.frequency.value, now);
  }
}

// Synth engine

export class WhistleSynth {
  constructor() {
    this._ctx = null;
    this._built = false;
    this._voices = null;
    this._hissGains = null;
    this._active = false;
    this._currentOpening = 0;
    this._pressureFraction = 1; // 0–1: boiler gauge pressure / max gauge pressure
  }

  /**
   * Set available steam pressure as a fraction of maximum.
   * @param {number} fraction - 0 (atmospheric, no steam) to 1 (full boiler pressure)
   */
  set pressureFraction(fraction) {
    this._pressureFraction = Math.max(0, Math.min(1, fraction));
  }

  get pressureFraction() { return this._pressureFraction; }

  ensureContext() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  _buildGraph() {
    if (this._built) return;
    this._built = true;
    const ctx = this._ctx;

    const noise = this._createNoiseSource(ctx);

    // Outdoor reverb
    // Dry/wet mix bus: everything routes here instead of destination.
    // Dry signal passes through, wet signal goes through convolver.
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.75;
    dryGain.connect(ctx.destination);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.25;
    wetGain.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = this._createOutdoorIR(ctx);
    convolver.connect(wetGain);

    // Mix bus: all synth output goes here, then splits dry/wet
    this._mixBus = ctx.createGain();
    this._mixBus.gain.value = 1;
    this._mixBus.connect(dryGain);
    this._mixBus.connect(convolver);

    const jitterLFO = ctx.createOscillator();
    jitterLFO.type = "triangle";
    jitterLFO.frequency.value = JITTER_RATE_HZ;
    jitterLFO.start();

    this._voices = [
      buildVoice(ctx, LOW_VOICE, noise, jitterLFO, this._mixBus),
      buildVoice(ctx, HIGH_VOICE, noise, jitterLFO, this._mixBus),
    ];

    // Shared steam hiss (not per-voice — it's the jet noise)
    this._hissMaster = ctx.createGain();
    this._hissMaster.gain.value = 0;
    this._hissMaster.connect(this._mixBus);

    this._hissGains = HISS_BANDS.map(({ freq, Q, gain }) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = Q;
      const g = ctx.createGain();
      g.gain.value = gain;
      noise.connect(bp);
      bp.connect(g);
      g.connect(this._hissMaster);
      return g;
    });

    // Sporadic amplitude modulation on hiss: a second noise source
    // lowpass-filtered to ~1.5 Hz drives slow, coarse gain fluctuations,
    // simulating uneven steam flow through the aperture.
    const sputter = this._createNoiseSource(ctx);
    const sputterLp = ctx.createBiquadFilter();
    sputterLp.type = "lowpass";
    sputterLp.frequency.value = 1.5;
    sputterLp.Q.value = 1.2;
    this._sputterGain = ctx.createGain();
    this._sputterGain.gain.value = 0;
    sputter.connect(sputterLp);
    sputterLp.connect(this._sputterGain);
    this._sputterGain.connect(this._hissMaster.gain);
  }

  /**
   * Synthesize an impulse response for outdoor reverb.
   * Short tail (~1.2s), sparse early reflections (ground bounce),
   * rapid high-frequency decay (air absorption).
   */
  _createOutdoorIR(ctx) {
    const rate = ctx.sampleRate;
    const duration = 1.2;
    const len = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(2, len, rate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);

      // Diffuse tail: exponentially decaying noise with HF rolloff
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / rate;

        // Decay envelope: fast initial drop, longer tail
        const env = 0.5 * Math.exp(-4 * t) + 0.5 * Math.exp(-12 * t);

        // HF absorption: simple one-pole lowpass that tightens over time
        const coeff = Math.max(0.15, 1 - t * 0.8);
        const raw = (Math.random() * 2 - 1) * env;
        lp += coeff * (raw - lp);
        data[i] = lp;
      }

      // Early reflections: a few discrete taps for ground bounce
      // and nearby surface reflections (locomotive boiler, tender)
      const taps = [
        { delay: 0.012, gain: 0.3 },  // ground bounce
        { delay: 0.025, gain: 0.15 }, // boiler reflection
        { delay: 0.045, gain: 0.10 }, // tender
        { delay: 0.080, gain: 0.06 }, // distant ground
      ];
      for (const { delay, gain } of taps) {
        const idx = Math.floor(delay * rate);
        if (idx < len) {
          data[idx] += gain * (ch === 0 ? 1 : -1) * (Math.random() * 0.4 + 0.8);
        }
      }
    }

    return buffer;
  }

  _createNoiseSource(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.start();
    return node;
  }

  /**
   * Set the whistle valve opening. Call on every input event.
   * @param {number} opening - 0 (closed) to 1 (fully open)
   */
  setOpening(opening) {
    if (!this._ctx) return;
    this._buildGraph();

    if (this._ctx.state === "suspended") {
      this._ctx.resume();
    }

    const now = this._ctx.currentTime;
    const rawOpening = Math.max(0, Math.min(1, opening));
    this._currentOpening = rawOpening;

    // Effective opening is limited by available boiler pressure.
    // No steam pressure means no whistle, regardless of valve position.
    const clamped = rawOpening * this._pressureFraction;

    if (clamped < 0.01) {
      this.release();
      return;
    }

    this._active = true;

    // Hiss scales with overall valve opening
    const lowestThreshold = this._voices[0].speakThreshold;
    const toneAmountGlobal = Math.max(0, (clamped - lowestThreshold) / (1 - lowestThreshold));
    const hissFactor = clamped * (1 + 3 * (1 - toneAmountGlobal));
    this._hissMaster.gain.cancelScheduledValues(now);
    this._hissMaster.gain.setTargetAtTime(hissFactor, now, 0.04);

    // Sporadic modulation depth: ~40% of the hiss level fluctuates randomly
    this._sputterGain.gain.cancelScheduledValues(now);
    this._sputterGain.gain.setTargetAtTime(hissFactor * 0.4, now, 0.06);

    // Update each voice independently
    const valveBend = Math.pow(2, -PITCH_BEND_CENTS * (1 - clamped) / 1200);

    for (const voice of this._voices) {
      const toneAmount = Math.max(0,
        (clamped - voice.speakThreshold) / (1 - voice.speakThreshold));
      const vol = voice.masterGain * toneAmount;
      const onset = !voice.active && toneAmount > 0;

      voice.submix.gain.cancelScheduledValues(now);
      voice.submix.gain.setTargetAtTime(vol, now, voice.attackTime / 3);

      if (toneAmount > 0) {
        if (onset) {
          voice.active = true;
          const lowBend = valveBend * Math.pow(2, -PITCH_RISE_CENTS / 1200);
          voiceSetFreqs(voice, lowBend, now);
          voiceRampFreqs(voice, valveBend, now + PITCH_RISE_TIME);
        } else {
          voiceSmoothFreqs(voice, valveBend, 0.08, now);
        }
      }
    }
  }

  /** Begin natural decay (user released the control). */
  release() {
    if (!this._ctx || !this._voices) return;

    const now = this._ctx.currentTime;
    this._active = false;
    this._currentOpening = 0;

    this._hissMaster.gain.cancelScheduledValues(now);
    this._hissMaster.gain.setTargetAtTime(0, now, RELEASE_TIME / 4);

    this._sputterGain.gain.cancelScheduledValues(now);
    this._sputterGain.gain.setTargetAtTime(0, now, RELEASE_TIME / 4);

    const fallBend = Math.pow(2, -PITCH_RISE_CENTS / 1200);

    for (const voice of this._voices) {
      if (!voice.active) continue;
      voice.active = false;

      voice.submix.gain.cancelScheduledValues(now);
      voice.submix.gain.setTargetAtTime(0, now, RELEASE_TIME / 3);

      voiceSnapshotFreqs(voice, now);
      voiceRampFreqs(voice, fallBend, now + PITCH_FALL_TIME);
    }
  }

  get active() { return this._active; }
  get opening() { return this._currentOpening; }
}
