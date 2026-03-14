// Ambient locomotive sounds: brake squeal, fire, blowdown, sand.
//
// All four are continuous noise sources whose gain and spectral
// character are modulated each frame by simulation state. They
// share a single AudioContext and outdoor reverb bus.

// Brake
// Iron brake shoes on iron tires produce a high-pitched screech
// whose intensity depends on brake force × wheel speed.

const BRAKE_BANDS = [
  { freq: 2200, Q: 2.0, gain: 0.30 },
  { freq: 3400, Q: 3.0, gain: 0.50 },
  { freq: 4800, Q: 2.5, gain: 0.25 },
];
const BRAKE_MASTER = 0.25;
const BRAKE_SMOOTHING = 0.03;

// At low speed the squeal shifts to a grinding character —
// we crossfade into a lower band.
const BRAKE_GRIND_FREQ = 600;
const BRAKE_GRIND_Q = 1.0;
const BRAKE_GRIND_GAIN = 0.40;
const BRAKE_SPEED_CROSSOVER = 3; // m/s — below this, grind dominates

// Fire
// Sample-based: loops a recording of fire crackling.
// Volume tracks firebox heat output. Slightly quieter behind closed door.

const FIRE_MASTER = 0.30;
const FIRE_DOOR_CLOSED_ATTEN = 0.55;
const FIRE_EXHAUST_ATTEN = 0.25; // floor — fire stays faintly audible under full exhaust
const FIRE_EXHAUST_REF = 1.5; // kg/s steam rate for full exhaust masking
const FIRE_SMOOTHING = 0.08;
const FIRE_LOOP_URL = "fire-loop.mp3";
const FIRE_CROSSFADE = 0.15; // seconds of crossfade at loop boundary

// Shoveling
// Sample-based: loops a recording of coal being poured into furnace.
// Active only while the fireman is shoveling.

const SHOVEL_MASTER = 0.25;
const SHOVEL_SMOOTHING = 0.05;
const SHOVEL_LOOP_URL = "shovel-loop.mp3";
const SHOVEL_CROSSFADE = 0.10;

// Door sounds
// Open: short metallic squeak (rising frequency sweep).
// Close: squeak followed by a quieter clank (impact).

const SQUEAK_FREQ_START = 2200;
const SQUEAK_FREQ_END = 2800;
const SQUEAK_Q = 12;           // narrow band — friction resonance
const SQUEAK_DURATION = 0.10;  // seconds
const SQUEAK_GAIN = 0.035;

const CLANK_PARTIALS = [
  { freq: 320,  gain: 0.40, decay: 0.08 },
  { freq: 780,  gain: 0.60, decay: 0.05 },
  { freq: 1350, gain: 0.35, decay: 0.03 },
  { freq: 2100, gain: 0.20, decay: 0.02 },
  { freq: 3400, gain: 0.10, decay: 0.015 },
];
const CLANK_MASTER = 0.12;
const CLANK_NOISE_GAIN = 0.12;
const CLANK_NOISE_DECAY = 0.02;
const CLANK_DELAY = 0.10; // seconds after squeak starts

// Blowdown
// Venting steam through the blow-down valve or relief valve.
// Steady hiss proportionate to valve opening and boiler pressure.

const BLOW_BANDS = [
  { freq: 800,  Q: 0.5, gain: 0.25 },
  { freq: 2000, Q: 0.4, gain: 0.40 },
  { freq: 5000, Q: 0.3, gain: 0.25 },
  { freq: 9000, Q: 0.3, gain: 0.10 },
];
const BLOW_MASTER = 0.18;
const BLOW_SMOOTHING = 0.06;

// Blower
// Steam jet directed up the smokestack to create artificial draft.
// Steady hiss pitched between the blowdown rumble and brake screech,
// with a slight turbulent flutter from the jet impinging on the
// petticoat pipe.

const BLOWER_BANDS = [
  { freq: 2000, Q: 0.4, gain: 0.35 },
  { freq: 5000, Q: 0.3, gain: 0.45 },
  { freq: 9000, Q: 0.3, gain: 0.20 },
];
const BLOWER_MASTER = 0.12;
const BLOWER_SMOOTHING = 0.10;

// Injector
// A Giffard injector uses a steam jet to force water into the boiler.
// When "caught", the combining cone produces a steady mid-high hiss
// as steam condenses into the water stream. Quieter than the blower
// since the steam is doing work rather than venting freely.

const INJECTOR_BANDS = [
  { freq: 1400, Q: 0.5, gain: 0.30 },
  { freq: 3500, Q: 0.4, gain: 0.45 },
  { freq: 7000, Q: 0.3, gain: 0.25 },
];
const INJECTOR_MASTER = 0.07;
const INJECTOR_SMOOTHING = 0.05;

// Rail joints
// Period-appropriate 30-foot iron rails produce a rhythmic click-clack
// as each axle crosses the gap between rail ends. Joints on opposite
// rails are staggered by half a rail length, giving the characteristic
// double beat. Driving wheels are heavier and produce louder impacts.

const RAIL_LENGTH = 9.144;  // 30 feet in meters
const RAIL_STAGGER = RAIL_LENGTH / 4;
const AXLE_OFFSETS = [0, 3]; // two wheel sets
const AXLE_WEIGHTS = [1.0, 0.7];
const RAIL_IMPACT_BANDS = [
  { freq: 250, Q: 0.5, gain: 0.30 },
  { freq: 400, Q: 0.5, gain: 0.40 },
  { freq: 600, Q: 0.7, gain: 0.30 },
];
const RAIL_BODY_TONES = [
  { freq: 200, gain: 0.40 },
  { freq: 400, gain: 0.45 },
  { freq: 550, gain: 0.15 },
];
const RAIL_MASTER = 0.25;
const RAIL_DECAY_IMPACT = 0.003; // seconds — sharp broadband clack
const RAIL_DECAY_BODY = 0.008;   // seconds — very short resonant ring
const RAIL_MIN_SPEED = 0.5; // m/s — below this, silent

// Sand
// Brief smooth burst of high-frequency noise — sand pouring from
// the sandbox through a pipe onto the rail. One-shot envelope
// triggered on the rising edge of sandDropping.

const SAND_BANDS = [
  { freq: 2500, Q: 0.8, gain: 0.30 },
  { freq: 5000, Q: 0.6, gain: 0.40 },
  { freq: 8000, Q: 0.5, gain: 0.20 },
];
const SAND_MASTER = 0.20;
const SAND_DECAY = 0.12; // seconds — time constant for fade-out

// Synth

export class AmbientSynth {
  constructor() {
    this._ctx = null;
    this._built = false;
    this._brake = null;
    this._fire = null;
    this._shovel = null;
    this._clank = null;
    this._blow = null;
    this._blowerHiss = null;
    this._injectorHiss = null;
    this._railJoints = null;
    this._sand = null;
    this._wasSandDropping = false;
    this._wasDoorOpen = false;
    this._fireBuffer = null;
    this._shovelBuffer = null;
  }

  ensureContext() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === "suspended") this._ctx.resume();
  }

  _buildGraph() {
    if (this._built) return;
    this._built = true;
    const ctx = this._ctx;

    // Shared noise source
    const noise = this._createNoise(ctx);

    // Reverb bus
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.85;
    dryGain.connect(ctx.destination);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.15;
    wetGain.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = this._createOutdoorIR(ctx);
    convolver.connect(wetGain);

    this._dryGain = dryGain;
    this._convolver = convolver;

    this._brake = this._buildBrake(ctx, noise, dryGain, convolver);
    this._fire = this._buildSampleLoop(ctx, dryGain, convolver);
    this._shovel = this._buildSampleLoop(ctx, dryGain, convolver);
    this._clank = this._buildClank(ctx, dryGain);
    this._blow = this._buildBlow(ctx, noise, dryGain, convolver);
    this._blowerHiss = this._buildBlower(ctx, noise, dryGain, convolver);
    this._injectorHiss = this._buildInjector(ctx, noise, dryGain, convolver);
    this._railJoints = this._buildRailJoints(ctx, noise, dryGain, convolver);
    this._sand = this._buildSand(ctx, noise, dryGain, convolver);

    this._loadSample(FIRE_LOOP_URL, FIRE_CROSSFADE).then(buf => {
      this._fireBuffer = buf;
      this._startLoop(this._fire, buf);
    });
    this._loadSample(SHOVEL_LOOP_URL, SHOVEL_CROSSFADE).then(buf => {
      this._shovelBuffer = buf;
      this._startLoop(this._shovel, buf);
    });
  }

  // Brake sub-graph

  _buildBrake(ctx, noise, dry, reverb) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dry);
    master.connect(reverb);

    const highBands = BRAKE_BANDS.map(({ freq, Q, gain }) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = Q;
      const g = ctx.createGain();
      g.gain.value = gain;
      noise.connect(bp);
      bp.connect(g);
      g.connect(master);
      return { filter: bp, bandGain: g, baseGain: gain };
    });

    // Low-speed grind band
    const grindBp = ctx.createBiquadFilter();
    grindBp.type = "bandpass";
    grindBp.frequency.value = BRAKE_GRIND_FREQ;
    grindBp.Q.value = BRAKE_GRIND_Q;
    const grindG = ctx.createGain();
    grindG.gain.value = 0;
    noise.connect(grindBp);
    grindBp.connect(grindG);
    grindG.connect(master);

    return { master, highBands, grindGain: grindG };
  }

  // Sample loop sub-graph (used for fire and shovel)

  _buildSampleLoop(ctx, dry, reverb) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dry);
    master.connect(reverb);
    return { master, source: null };
  }

  async _loadSample(url, crossfadeSec) {
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    const decoded = await this._ctx.decodeAudioData(arrayBuf);

    // Apply crossfade at loop boundaries: blend the tail into the head
    // so BufferSourceNode.loop produces a seamless result.
    const rate = decoded.sampleRate;
    const fadeSamples = Math.floor(crossfadeSec * rate);
    const len = decoded.length;
    if (fadeSamples > 0 && fadeSamples < len / 2) {
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const data = decoded.getChannelData(ch);
        for (let i = 0; i < fadeSamples; i++) {
          const t = i / fadeSamples; // 0→1
          // Blend tail sample into head with equal-power crossfade
          const headIdx = i;
          const tailIdx = len - fadeSamples + i;
          const head = data[headIdx];
          const tail = data[tailIdx];
          const blend = head * Math.sqrt(t) + tail * Math.sqrt(1 - t);
          data[headIdx] = blend;
          data[tailIdx] *= Math.sqrt(t); // fade out the tail
        }
      }
    }
    return decoded;
  }

  _startLoop(loopObj, buffer) {
    const ctx = this._ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(loopObj.master);
    src.start();
    loopObj.source = src;
  }

  // Door sound sub-graph

  _buildClank(ctx, dry) {
    // Squeak: narrow bandpass-filtered noise with frequency sweep
    const squeakNoise = this._createNoise(ctx);
    const squeakBp = ctx.createBiquadFilter();
    squeakBp.type = "bandpass";
    squeakBp.frequency.value = SQUEAK_FREQ_START;
    squeakBp.Q.value = SQUEAK_Q;
    const squeakGain = ctx.createGain();
    squeakGain.gain.value = 0;
    squeakNoise.connect(squeakBp);
    squeakBp.connect(squeakGain);
    squeakGain.connect(dry);

    // Clank: metallic impact partials + noise burst
    const noise = this._createNoise(ctx);
    const noiseBp = ctx.createBiquadFilter();
    noiseBp.type = "bandpass";
    noiseBp.frequency.value = 1500;
    noiseBp.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(noiseBp);
    noiseBp.connect(noiseGain);
    noiseGain.connect(dry);

    const partials = CLANK_PARTIALS.map(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(dry);
      osc.start();
      return { osc, gainNode: g, baseGain: gain, decay };
    });

    return { squeakBp, squeakGain, partials, noiseGain };
  }

  _triggerDoorSound(opening) {
    const ctx = this._ctx;
    if (!ctx || !this._clank) return;
    const now = ctx.currentTime;
    const { squeakBp, squeakGain, partials, noiseGain } = this._clank;

    // Squeak: narrow-band noise with slight frequency sweep
    squeakBp.frequency.cancelScheduledValues(now);
    squeakBp.frequency.setValueAtTime(SQUEAK_FREQ_START, now);
    squeakBp.frequency.linearRampToValueAtTime(SQUEAK_FREQ_END, now + SQUEAK_DURATION);

    squeakGain.gain.cancelScheduledValues(now);
    squeakGain.gain.setValueAtTime(SQUEAK_GAIN, now);
    squeakGain.gain.setTargetAtTime(0, now + SQUEAK_DURATION * 0.6, 0.015);

    // Clank only on close, delayed slightly after the squeak begins
    if (!opening) {
      const t = now + CLANK_DELAY;
      for (const { gainNode, baseGain, decay } of partials) {
        const peak = baseGain * CLANK_MASTER;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.setValueAtTime(peak, t);
        gainNode.gain.setTargetAtTime(0, t + 0.001, decay);
      }

      noiseGain.gain.cancelScheduledValues(now);
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.setValueAtTime(CLANK_NOISE_GAIN * CLANK_MASTER, t);
      noiseGain.gain.setTargetAtTime(0, t + 0.001, CLANK_NOISE_DECAY);
    }
  }

  // Blowdown sub-graph

  _buildBlow(ctx, noise, dry, reverb) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dry);
    master.connect(reverb);

    BLOW_BANDS.forEach(({ freq, Q, gain }) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = Q;
      const g = ctx.createGain();
      g.gain.value = gain;
      noise.connect(bp);
      bp.connect(g);
      g.connect(master);
    });

    return { master };
  }

  // Blower sub-graph

  _buildBlower(ctx, noise, dry, reverb) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dry);
    master.connect(reverb);

    BLOWER_BANDS.forEach(({ freq, Q, gain }) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = Q;
      const g = ctx.createGain();
      g.gain.value = gain;
      noise.connect(bp);
      bp.connect(g);
      g.connect(master);
    });

    return { master };
  }

  // Injector sub-graph

  _buildInjector(ctx, noise, dry, reverb) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dry);
    master.connect(reverb);

    INJECTOR_BANDS.forEach(({ freq, Q, gain }) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = Q;
      const g = ctx.createGain();
      g.gain.value = gain;
      noise.connect(bp);
      bp.connect(g);
      g.connect(master);
    });

    return { master };
  }

  // Rail joint sub-graph

  _buildRailJoints(ctx, noise, dry, reverb) {
    const voices = AXLE_OFFSETS.map((offset, i) => {
      // Impact channel: short broadband noise burst for the percussive clack
      const impactGain = ctx.createGain();
      impactGain.gain.value = 0;
      impactGain.connect(dry);
      impactGain.connect(reverb);

      RAIL_IMPACT_BANDS.forEach(({ freq, Q, gain: level }) => {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = freq;
        bp.Q.value = Q;
        const g = ctx.createGain();
        g.gain.value = level;
        noise.connect(bp);
        bp.connect(g);
        g.connect(impactGain);
      });

      // Body channel: oscillators for brief tonal resonance
      const bodyGain = ctx.createGain();
      bodyGain.gain.value = 0;
      bodyGain.connect(dry);
      bodyGain.connect(reverb);

      RAIL_BODY_TONES.forEach(({ freq, gain: level }) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(g);
        g.connect(bodyGain);
        osc.start();
      });

      return {
        impactGain, bodyGain,
        offset, weight: AXLE_WEIGHTS[i], leftPhase: 0, rightPhase: 0,
      };
    });

    return { voices, distance: 0 };
  }

  // Sand sub-graph

  _buildSand(ctx, noise, dry, reverb) {
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dry);
    master.connect(reverb);

    const bands = SAND_BANDS.map(({ freq, Q, gain }) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = Q;
      const g = ctx.createGain();
      g.gain.value = gain;
      noise.connect(bp);
      bp.connect(g);
      g.connect(master);
      return { filter: bp, bandGain: g };
    });

    return { master, bands };
  }

  // Shared helpers

  _createNoise(ctx) {
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
   * Update all ambient sounds. Call every animation frame.
   *
   * @param {object} p
   * @param {number} p.brake         - Brake application 0–1
   * @param {number} p.speed         - Absolute velocity [m/s]
   * @param {number} p.fireboxHeat   - Firebox heat output [kW]
   * @param {number} p.maxFireboxHeat - Max firebox heat output [kW]
   * @param {boolean} p.doorOpen     - Firebox door is open
   * @param {boolean} p.shoveling    - Coal is being shoveled
   * @param {number} p.blowdown      - Blowdown valve opening 0–1
   * @param {number} p.boilerPressure - Boiler pressure [kPa]
   * @param {number} p.maxPressure   - Max boiler pressure [kPa]
   * @param {number} p.pAtm          - Atmospheric pressure [kPa]
   * @param {number} p.waterFraction - boilerWaterMass / initialWaterMass (0–1)
   * @param {boolean} p.sandDropping - Sand is being applied
   * @param {boolean} p.reliefValveOpen - Safety valve blowing
   * @param {number} p.blower         - Blower valve opening 0–1
   * @param {number} p.steamRate      - Boiler-to-super steam flow [kg/s]
   * @param {boolean} p.injectorActive - Injector is caught and delivering
   * @param {number} p.elapsed        - Real-time seconds since last frame
   */
  update(p) {
    if (!this._ctx) { /* audio context not initialized */ }
    else {
      this._buildGraph();
      const now = this._ctx.currentTime;

      this._updateBrake(now, p);
      this._updateFire(now, p);
      this._updateShovel(now, p);
      this._updateDoor(now, p);
      this._updateBlow(now, p);
      this._updateBlower(now, p);
      this._updateInjector(now, p);
      this._updateRailJoints(now, p);
      this._updateSand(now, p);
    }
  }

  // Per-system updates

  _updateBrake(now, { brake, speed }) {
    const b = this._brake;
    const speedAbs = Math.abs(speed);
    const active = brake >= 0.01 && speedAbs >= 0.05;

    if (active) {
      const speedFactor = Math.min(1, speedAbs / 15);
      const vol = brake * speedFactor * BRAKE_MASTER;
      b.master.gain.setTargetAtTime(vol, now, BRAKE_SMOOTHING);

      const grindMix = Math.max(0, 1 - speedAbs / BRAKE_SPEED_CROSSOVER);
      const screechMix = 1 - grindMix;
      for (const { bandGain, baseGain } of b.highBands) {
        bandGain.gain.setTargetAtTime(baseGain * screechMix, now, BRAKE_SMOOTHING);
      }
      b.grindGain.gain.setTargetAtTime(BRAKE_GRIND_GAIN * grindMix, now, BRAKE_SMOOTHING);
    } else {
      b.master.gain.setTargetAtTime(0, now, BRAKE_SMOOTHING);
    }
  }

  _updateFire(now, { fireboxHeat, maxFireboxHeat, doorOpen, steamRate }) {
    if (!this._fireBuffer) { /* sample not yet loaded */ }
    else {
      const f = this._fire;
      const heat = Math.max(0, fireboxHeat || 0);
      const maxHeat = maxFireboxHeat || 1;
      const intensity = Math.min(1, heat / maxHeat);
      const active = intensity >= 0.001;

      if (active) {
        const doorAtten = doorOpen ? 1.0 : FIRE_DOOR_CLOSED_ATTEN;
        const exhaustMask = Math.min(1, (steamRate || 0) / FIRE_EXHAUST_REF);
        const exhaustAtten = 1 - exhaustMask * (1 - FIRE_EXHAUST_ATTEN);
        const vol = intensity * doorAtten * exhaustAtten * FIRE_MASTER;
        f.master.gain.setTargetAtTime(vol, now, FIRE_SMOOTHING);
      } else {
        f.master.gain.setTargetAtTime(0, now, FIRE_SMOOTHING);
      }
    }
  }

  _updateShovel(now, { shoveling, doorOpen, steamRate }) {
    if (!this._shovelBuffer) { /* sample not yet loaded */ }
    else {
      const s = this._shovel;
      const doorAtten = doorOpen ? 1.0 : 0.15;
      const exhaustMask = Math.min(1, (steamRate || 0) / FIRE_EXHAUST_REF);
      const exhaustAtten = 1 - exhaustMask * (1 - FIRE_EXHAUST_ATTEN);
      const target = shoveling ? SHOVEL_MASTER * doorAtten * exhaustAtten : 0;
      s.master.gain.setTargetAtTime(target, now, SHOVEL_SMOOTHING);
    }
  }

  _updateDoor(now, { doorOpen, simSpeed }) {
    if (doorOpen !== this._wasDoorOpen) {
      const wasOpen = this._wasDoorOpen;
      this._wasDoorOpen = doorOpen;
      if ((simSpeed || 1) <= 2) this._triggerDoorSound(doorOpen);
    }
  }

  _updateBlow(now, { blowdown, boilerPressure, pAtm, reliefValveOpen }) {
    const b = this._blow;
    let opening = blowdown;
    if (reliefValveOpen) {
      opening = Math.max(opening, 0.7);
    }
    const gaugeP = Math.max(0, boilerPressure - pAtm);
    const pFrac = Math.sqrt(Math.min(1, gaugeP / 800));
    const active = opening >= 0.01 && pFrac >= 0.001;

    if (active) {
      const vol = opening * pFrac * BLOW_MASTER;
      b.master.gain.setTargetAtTime(vol, now, BLOW_SMOOTHING);
    } else {
      b.master.gain.setTargetAtTime(0, now, BLOW_SMOOTHING);
    }
  }

  _updateBlower(now, { blower, boilerPressure, pAtm }) {
    const b = this._blowerHiss;
    const active = blower >= 0.01;

    if (active) {
      const gaugeP = Math.max(0, boilerPressure - pAtm);
      const pFrac = Math.sqrt(Math.min(1, gaugeP / 800));
      const vol = blower * pFrac * BLOWER_MASTER;
      b.master.gain.setTargetAtTime(vol, now, BLOWER_SMOOTHING);
    } else {
      b.master.gain.setTargetAtTime(0, now, BLOWER_SMOOTHING);
    }
  }

  _updateInjector(now, { injectorActive, boilerPressure, pAtm }) {
    const inj = this._injectorHiss;

    if (injectorActive) {
      const gaugeP = Math.max(0, boilerPressure - pAtm);
      const pFrac = Math.sqrt(Math.min(1, gaugeP / 800));
      const vol = pFrac * INJECTOR_MASTER;
      inj.master.gain.setTargetAtTime(vol, now, INJECTOR_SMOOTHING);
    } else {
      inj.master.gain.setTargetAtTime(0, now, INJECTOR_SMOOTHING);
    }
  }

  _updateRailJoints(now, { speed, simSpeed }) {
    const rj = this._railJoints;
    const absSpeed = Math.abs(speed);
    const dt = now - (this._lastRailTime || now);
    this._lastRailTime = now;

    const validDt = dt > 0 && dt <= 0.1;
    const audible = validDt && absSpeed >= RAIL_MIN_SPEED && (simSpeed || 1) <= 2;

    if (validDt) {
      rj.distance += absSpeed * dt;
    }

    const amplitude = audible ? Math.min(1, Math.sqrt(absSpeed / 20)) * RAIL_MASTER : 0;

    for (const v of rj.voices) {
      const leftPhase = ((rj.distance + v.offset) % RAIL_LENGTH) / RAIL_LENGTH;
      const rightPhase = ((rj.distance + v.offset + RAIL_STAGGER) % RAIL_LENGTH) / RAIL_LENGTH;

      if (audible && leftPhase < v.leftPhase) {
        this._triggerKnock(v, amplitude * v.weight, now);
      }
      if (audible && rightPhase < v.rightPhase) {
        this._triggerKnock(v, amplitude * v.weight * 0.7, now);
      }

      v.leftPhase = leftPhase;
      v.rightPhase = rightPhase;
    }
  }

  _triggerKnock(voice, vol, now) {
    const ig = voice.impactGain.gain;
    ig.cancelScheduledValues(now);
    ig.setValueAtTime(vol, now);
    ig.setTargetAtTime(0, now + 0.001, RAIL_DECAY_IMPACT);

    const bg = voice.bodyGain.gain;
    bg.cancelScheduledValues(now);
    bg.setValueAtTime(vol, now);
    bg.setTargetAtTime(0, now + 0.002, RAIL_DECAY_BODY);
  }

  _updateSand(now, { sandDropping }) {
    const s = this._sand;

    // Trigger a brief burst on the rising edge only
    if (sandDropping && !this._wasSandDropping) {
      s.master.gain.cancelScheduledValues(now);
      s.master.gain.setValueAtTime(SAND_MASTER, now);
      s.master.gain.setTargetAtTime(0, now + 0.01, SAND_DECAY);
    }
    this._wasSandDropping = sandDropping;
  }
}
