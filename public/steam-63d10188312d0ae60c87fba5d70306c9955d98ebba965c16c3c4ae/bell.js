// Bell synthesis with real-time pendulum physics.
//
// Models a swinging locomotive bell with a free clapper inside.
// The bell is a damped pendulum; the clapper is a second, shorter
// pendulum constrained to ride within the bell's rim. When the
// clapper strikes the rim, a cluster of partials fires — the
// classic bell tone.
//
// Two strikes per full swing emerge naturally (one on each side)
// because the clapper lags behind the bell during each reversal.
//
// The user pulls a cord (button press) which applies a torque
// impulse. The effect depends on phase — pulling when the bell
// is already swinging in the pull direction amplifies the swing;
// pulling at the wrong moment partially cancels it. This gives
// a satisfying, skill-dependent interaction.

// Pendulum constants

// T = 2π√(L/g) = 1.5s → L = g(1.5/2π)² ≈ 0.559 m
const BELL_LENGTH = 0.559;   // effective pendulum arm [m] → 1.5s period
const CLAPPER_LENGTH = 0.335; // clapper arm (60% of bell, shorter natural period)
const BELL_DAMPING = 0.4;    // angular drag on bell [1/s]
const CLAPPER_DAMPING = 1.5; // clapper drag (heavier — it flops)
const CLAPPER_LIMIT = 0.40; // max angle offset from bell [rad] (~23°)
const G = 9.81;

// Continuous pull torque [rad/s²] applied while cord is held.
const PULL_TORQUE = 18;

// Bell tone partials
// Ratios relative to strike note, modeled on a typical American
// locomotive bell (~800–1000 Hz strike). Frequencies follow
// common Western bell partial pattern.

const STRIKE_FREQ = 880; // Hz — the prime (strike note)
const PARTIALS = [
  { ratio: 0.50,  gain: 0.15, decay: 2.0  }, // hum (octave below)
  { ratio: 1.00,  gain: 1.00, decay: 1.8  }, // prime (strike note)
  { ratio: 1.183, gain: 0.45, decay: 1.2  }, // tierce (minor third)
  { ratio: 1.506, gain: 0.50, decay: 1.2  }, // quint (fifth)
  { ratio: 2.00,  gain: 0.80, decay: 1.4  }, // nominal (octave)
  { ratio: 2.514, gain: 0.45, decay: 1.1  }, // deciem
  { ratio: 3.011, gain: 0.35, decay: 0.9  }, // undeciem
  { ratio: 3.520, gain: 0.25, decay: 0.7  }, // duodeciem
  { ratio: 4.10,  gain: 0.12, decay: 0.5  }, // upper partial
];

// Slight random detuning for shimmer [cents]
const DETUNE_SPREAD = 4;

const MASTER_GAIN = 0.30;

// Synth engine

export class BellSynth {
  constructor() {
    this._ctx = null;
    this._built = false;

    // Pendulum state
    this._bellAngle = 0;     // θ [rad]
    this._bellOmega = 0;     // dθ/dt [rad/s]
    this._clapperAngle = 0;  // φ [rad]
    this._clapperOmega = 0;  // dφ/dt [rad/s]
    this._lastStrikeSide = 0; // +1 or -1 — prevents double-triggering
    this._pulling = false;   // true while cord is held
  }

  /** Current bell swing angle [rad]. Positive = right, negative = left. */
  get angle() { return this._bellAngle; }

  ensureContext() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  _buildGraph() {
    if (this._built) return;
    this._built = true;
    const ctx = this._ctx;

    // Dry/wet reverb bus (outdoor, same pattern as whistle/chuff)
    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 0.70;
    this._dryGain.connect(ctx.destination);

    this._wetGain = ctx.createGain();
    this._wetGain.gain.value = 0.30;
    this._wetGain.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = this._createOutdoorIR(ctx);
    convolver.connect(this._wetGain);
    this._convolver = convolver;

    // Pre-create a bank of oscillators for each partial.
    // Each strike re-triggers the gain envelope rather than
    // creating/destroying oscillators.
    this._partials = PARTIALS.map(({ ratio, gain, decay }) => {
      const freq = STRIKE_FREQ * ratio;
      const detune = (Math.random() - 0.5) * 2 * DETUNE_SPREAD;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;

      const g = ctx.createGain();
      g.gain.value = 0;

      osc.connect(g);
      g.connect(this._dryGain);
      g.connect(this._convolver);
      osc.start();

      return { osc, gainNode: g, baseGain: gain, decay };
    });
  }

  _createOutdoorIR(ctx) {
    const rate = ctx.sampleRate;
    const duration = 1.2;
    const len = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(2, len, rate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / rate;
        const env = 0.3 * Math.exp(-3 * t) + 0.7 * Math.exp(-10 * t);
        const coeff = Math.max(0.1, 1 - t * 0.8);
        const raw = (Math.random() * 2 - 1) * env;
        lp += coeff * (raw - lp);
        data[i] = lp;
      }
      const taps = [
        { delay: 0.012, gain: 0.20 },
        { delay: 0.028, gain: 0.10 },
        { delay: 0.055, gain: 0.06 },
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

  /** Begin pulling the bell cord. Call on button press. */
  pullStart() {
    if (!this._ctx) return;
    this._buildGraph();
    if (this._ctx.state === "suspended") this._ctx.resume();
    this._pulling = true;
  }

  /** Release the bell cord. Call on button release. */
  pullEnd() {
    this._pulling = false;
  }

  /**
   * Advance pendulum physics and trigger strikes.
   * Call every animation frame.
   * @param {number} elapsed - Real-time seconds since last frame
   */
  update(elapsed) {
    if (!this._built) return;

    const dt = Math.min(elapsed || 0.016, 0.05);

    // Sub-step for stability (pendulum can be stiff at large swings)
    const steps = 4;
    const h = dt / steps;

    for (let s = 0; s < steps; s++) {
      // Bell pendulum: θ'' = -(g/L)sin(θ) - γ·θ' + pull torque
      // Cord attaches to a lever arm — torque is proportional to cos(θ).
      // At θ=0 (hanging) the lever arm is fully horizontal → max torque.
      // At θ=±90° the lever is vertical → zero torque.
      // Beyond ±90° the torque reverses, carrying the bell over the top.
      const pullAccel = this._pulling ? PULL_TORQUE * Math.cos(this._bellAngle) : 0;
      const bellAccel = -(G / BELL_LENGTH) * Math.sin(this._bellAngle)
        - BELL_DAMPING * this._bellOmega + pullAccel;
      this._bellOmega += bellAccel * h;
      this._bellAngle += this._bellOmega * h;

      // Clapper pendulum: φ'' = -(g/Lc)sin(φ) - γc·φ'
      const clapAccel = -(G / CLAPPER_LENGTH) * Math.sin(this._clapperAngle)
        - CLAPPER_DAMPING * this._clapperOmega;
      this._clapperOmega += clapAccel * h;
      this._clapperAngle += this._clapperOmega * h;

      // Constrain clapper within bell rim
      const offset = this._clapperAngle - this._bellAngle;
      if (Math.abs(offset) > CLAPPER_LIMIT) {
        const side = Math.sign(offset);
        this._clapperAngle = this._bellAngle + side * CLAPPER_LIMIT;

        // Clapper has struck the bell wall — compute impact velocity
        const relativeOmega = this._clapperOmega - this._bellOmega;
        const impactSpeed = Math.abs(relativeOmega);

        // Inelastic collision: clapper transfers momentum to bell
        this._clapperOmega = this._bellOmega * 0.6;

        // Only trigger a sound if this is a new strike on this side
        // (prevents re-triggering while clapper is pressed against wall)
        if (side !== this._lastStrikeSide && impactSpeed > 0.3) {
          this._lastStrikeSide = side;
          this._strike(impactSpeed);
        }
      } else {
        // Clapper is free-swinging — reset side tracker
        if (Math.abs(offset) < CLAPPER_LIMIT * 0.5) {
          this._lastStrikeSide = 0;
        }
      }
    }
  }

  _strike(impactSpeed) {
    const ctx = this._ctx;
    const now = ctx.currentTime;
    // Velocity maps to amplitude (clamped to avoid blowing out)
    const amplitude = Math.min(1.0, impactSpeed / 8) * MASTER_GAIN;

    for (const { gainNode, baseGain, decay } of this._partials) {
      const peakGain = baseGain * amplitude;
      // Sharp attack, exponential decay
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(peakGain, now);
      gainNode.gain.setTargetAtTime(0, now + 0.002, decay / 5);
    }
  }
}
