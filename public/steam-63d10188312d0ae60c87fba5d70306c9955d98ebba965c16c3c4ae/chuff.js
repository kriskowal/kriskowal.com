// Cylinder exhaust ("chuff") synthesis using WebAudio.
//
// Each cylinder exhausts from both head and crank ends as the slide
// valve alternately opens and closes the exhaust ports. The two
// cylinders are quartered (90° offset), producing four exhaust beats
// per wheel revolution — the characteristic steam locomotive sound.
//
// The exhaust sound is modeled as bandpass-filtered noise whose
// amplitude tracks the instantaneous exhaust port opening. This
// naturally produces the rhythmic chuffing pattern without needing
// to detect or trigger discrete events.
//
// The right cylinder is positioned slightly right in the stereo field
// and mixed louder (engineer sits on the right side of the cab).

import {
  valveParams,
  valveDisplacement,
  portOpenings,
} from "./geometry.js";

// Spatial positioning

const LEFT_CYL_PAN = -0.35;
const RIGHT_CYL_PAN = 0.30;
const LEFT_CYL_GAIN = 0.65;
const RIGHT_CYL_GAIN = 1.0;

// Exhaust noise spectral shaping
// The exhaust blast is a low-mid frequency "chuff" — compressed
// steam escaping through the blast pipe into the smokebox and out
// the stack. Multiple filter bands shape the character.

const EXHAUST_BANDS = [
  { freq: 180,  Q: 0.8,  gain: 0.5 },  // deep thump
  { freq: 400,  Q: 0.6,  gain: 0.7 },  // body
  { freq: 900,  Q: 0.5,  gain: 0.4 },  // mid presence
  { freq: 2200, Q: 0.4,  gain: 0.15 }, // breathy top
];

// Overall volume scaling.
const MASTER_GAIN = 0.55;

// Smoothing time constant for gain changes (seconds).
// Too fast = clicks, too slow = mushy beats.
const GAIN_SMOOTHING = 0.008;

// Cylinder pressure model time constants.
// How fast cylinder pressure charges toward chest pressure during admission
// and bleeds down toward atmospheric during exhaust.
const CHARGE_RATE = 12;  // 1/s — fast fill during admission
const BLEED_RATE = 8;    // 1/s — slower blowdown during exhaust

// Synth engine

export class ChuffSynth {
  constructor() {
    this._ctx = null;
    this._built = false;
    this._cylinders = null;
    // Per-cylinder, per-end gauge pressure [kPa above atmospheric].
    // Tracks charging during admission and blowdown during exhaust.
    this._cylPressure = null; // [[head, crank], [head, crank]]
  }

  ensureContext() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  _buildGraph(numCylinders) {
    if (this._built) return;
    this._built = true;
    const ctx = this._ctx;

    const noise = this._createNoiseSource(ctx);

    // Outdoor reverb (shared with whistle concept — short outdoor IR)
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.80;
    dryGain.connect(ctx.destination);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.20;
    wetGain.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = this._createOutdoorIR(ctx);
    convolver.connect(wetGain);

    this._cylinders = [];
    this._cylPressure = Array.from({ length: numCylinders }, () => [0, 0]);

    for (let cyl = 0; cyl < numCylinders; cyl++) {
      const isRight = cyl === 1;
      const panValue = isRight ? RIGHT_CYL_PAN : LEFT_CYL_PAN;
      const cylGain = isRight ? RIGHT_CYL_GAIN : LEFT_CYL_GAIN;

      // Each cylinder end (head, crank) gets its own gain node
      // so they can be driven independently.
      const ends = [0, 1].map(() => {
        const endGain = ctx.createGain();
        endGain.gain.value = 0;
        return endGain;
      });

      // Per-cylinder submix → panner → reverb bus
      const submix = ctx.createGain();
      submix.gain.value = cylGain;

      const panner = ctx.createStereoPanner();
      panner.pan.value = panValue;

      for (const end of ends) {
        end.connect(submix);
      }
      submix.connect(panner);
      panner.connect(dryGain);
      panner.connect(convolver);

      // Noise → filter bands → each end's gain
      const bands = EXHAUST_BANDS.map(({ freq, Q, gain }) => {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq;
        bp.Q.value = Q;

        const bg = ctx.createGain();
        bg.gain.value = gain;

        noise.connect(bp);
        bp.connect(bg);

        for (const end of ends) {
          bg.connect(end);
        }

        return { filter: bp, bandGain: bg };
      });

      this._cylinders.push({ ends, submix, panner, bands });
    }
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

  _createOutdoorIR(ctx) {
    const rate = ctx.sampleRate;
    const duration = 0.8;
    const len = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(2, len, rate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / rate;
        const env = 0.4 * Math.exp(-5 * t) + 0.6 * Math.exp(-15 * t);
        const coeff = Math.max(0.1, 1 - t * 1.2);
        const raw = (Math.random() * 2 - 1) * env;
        lp += coeff * (raw - lp);
        data[i] = lp;
      }

      const taps = [
        { delay: 0.008, gain: 0.25 },
        { delay: 0.020, gain: 0.12 },
        { delay: 0.040, gain: 0.08 },
      ];
      for (const { delay, gain } of taps) {
        const idx = Math.floor(delay * rate);
        if (idx < len) {
          data[idx] += gain * (ch === 0 ? 1 : -1) * (Math.random() * 0.3 + 0.85);
        }
      }
    }

    return buffer;
  }

  /**
   * Update exhaust sound each animation frame.
   *
   * @param {object} params
   * @param {number} params.elapsed - Real-time seconds since last frame
   * @param {number} params.animAngle - Current wheel animation angle [rad]
   * @param {number} params.crankOffset - Angle between cylinder cranks [rad]
   * @param {number} params.numCylinders - Number of cylinders
   * @param {number} params.cutoff - Valve cutoff fraction (0–0.75)
   * @param {number} params.steamLap - Valve steam lap [m]
   * @param {number} params.exhaustLap - Valve exhaust lap [m]
   * @param {number} params.valveLead - Valve lead [m]
   * @param {number} params.maxPortOpening - Max port opening [m]
   * @param {number} params.chestPressureGauge - Steam chest gauge pressure [kPa]
   * @param {number} params.maxPressure - Max boiler gauge pressure [kPa]
   * @param {number} params.direction - Valve gear direction: +1 forward, -1 reverse, 0 neutral
   */
  update(params) {
    if (!this._ctx) return;
    this._buildGraph(params.numCylinders);

    if (this._ctx.state === "suspended") {
      this._ctx.resume();
    }

    const now = this._ctx.currentTime;
    const {
      elapsed, animAngle, crankOffset, numCylinders,
      cutoff, steamLap, exhaustLap, valveLead, maxPortOpening,
      chestPressureGauge, maxPressure, direction,
    } = params;

    const dt = Math.min(elapsed || 0.016, 0.1);

    if (cutoff < 0.01 || direction === 0) {
      // No valve motion — silence all, let cylinder pressures decay
      for (let c = 0; c < (this._cylinders?.length || 0); c++) {
        this._cylPressure[c][0] *= Math.max(0, 1 - BLEED_RATE * dt);
        this._cylPressure[c][1] *= Math.max(0, 1 - BLEED_RATE * dt);
        for (const end of this._cylinders[c].ends) {
          end.gain.setTargetAtTime(0, now, GAIN_SMOOTHING);
        }
      }
      return;
    }

    const { travel, advance } = valveParams(
      Math.max(0.01, cutoff), steamLap, valveLead
    );

    const chestGauge = Math.max(0, chestPressureGauge);

    for (let c = 0; c < numCylinders && c < this._cylinders.length; c++) {
      const theta = animAngle + c * crankOffset;
      const valveTheta = direction < 0 ? theta + Math.PI : theta;
      const v = valveDisplacement(valveTheta, travel, advance);
      const ports = portOpenings(v, steamLap, exhaustLap, maxPortOpening);

      // Normalize port openings to 0–1 range
      const headSteam = ports.headSteam / maxPortOpening;
      const headExh = ports.headExhaust / maxPortOpening;
      const crankSteam = ports.crankSteam / maxPortOpening;
      const crankExh = ports.crankExhaust / maxPortOpening;

      // Integrate per-end cylinder pressure.
      // Admission charges toward chest pressure; exhaust bleeds toward 0.
      for (let end = 0; end < 2; end++) {
        const steamOpen = end === 0 ? headSteam : crankSteam;
        const exhOpen = end === 0 ? headExh : crankExh;
        let p = this._cylPressure[c][end];

        if (steamOpen > 0) {
          // First-order charge toward chest gauge pressure
          const rate = CHARGE_RATE * steamOpen;
          p += (chestGauge - p) * (1 - Math.exp(-rate * dt));
        }
        if (exhOpen > 0) {
          // First-order blowdown toward atmospheric (gauge = 0)
          const rate = BLEED_RATE * exhOpen;
          p *= Math.exp(-rate * dt);
        }

        this._cylPressure[c][end] = Math.max(0, p);
      }

      // Exhaust volume driven by port opening × sqrt(cylinder gauge pressure).
      // This naturally produces a loud initial blast that tapers as
      // the cylinder empties.
      const cyl = this._cylinders[c];

      const headP = this._cylPressure[c][0];
      const crankP = this._cylPressure[c][1];
      const pScale = maxPressure > 0 ? 1 / maxPressure : 0;

      const headVol = headExh * Math.sqrt(headP * pScale) * MASTER_GAIN;
      const crankVol = crankExh * Math.sqrt(crankP * pScale) * MASTER_GAIN;

      cyl.ends[0].gain.setTargetAtTime(headVol, now, GAIN_SMOOTHING);
      cyl.ends[1].gain.setTargetAtTime(crankVol, now, GAIN_SMOOTHING);
    }
  }
}
