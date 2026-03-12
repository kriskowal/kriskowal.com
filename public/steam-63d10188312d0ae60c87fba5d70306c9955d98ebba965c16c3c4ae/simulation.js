// Simulation — owns a Locomotive and manages time-stepping, auto speed, and
// smoothed instrumentation.  Pure logic, no DOM.

import { Locomotive } from "./locomotive.js";

const MAX_SIM_SPEED = 60;
const DT_ENGINE = 0.005; // engine physics timestep [s]
const DT_BOILER = 0.05;  // boiler thermodynamics timestep [s]
const ENGINE_PER_BOILER = Math.round(DT_BOILER / DT_ENGINE); // 10:1 ratio

// Calm timer time constant: logistic ramp from 1× to 60×.
// Slow start, gradual inflection, then plateau.
const CALM_TAU = 60; // seconds — midpoint of logistic curve
const CALM_K = 0.06; // steepness of logistic transition

export class Simulation {
  constructor(locoConfig = {}) {
    this.loco = new Locomotive(locoConfig);
    this.simSpeed = 1;
    this.smoothSteamRate = 0;
    this.animAngle = Math.PI / 4;

    // Calm timer: real-time seconds since last "interesting" event.
    // Sim speed ramps geometrically as calm time grows.
    this.calmTime = 0;

    // Snapshot previous state to detect attention-worthy changes
    this._prevThrottle = 0;
    this._prevBrake = 0;

    // Speed override: null = auto, number = fixed multiplier
    this.simSpeedOverride = null;

    // Accumulated sim-time not yet stepped
    this._simTimeAccum = 0;
  }

  get cfg() { return this.loco.cfg; }

  // Auto simulation speed

  // Returns the ceiling based on resource health (1× multiplier when fine)
  _resourceMultiplier() {
    const loco = this.loco;
    const cfg = loco.cfg;
    const coalFrac = loco.fireboxCoal / cfg.fireboxMaxCoal;
    const waterFrac = loco.boilerWaterMass / cfg.boilerWaterMass;

    let m = 1;

    if (coalFrac < 0.1) m *= 0.3;
    else if (coalFrac < 0.3) m *= 0.6;

    if (!loco.ignited && coalFrac < 0.01) m *= 0.2;

    if (waterFrac < 0.2) m *= 0.3;
    else if (waterFrac < 0.4) m *= 0.6;

    return m;
  }

  // Detect events that should reset the calm timer
  _detectEvents() {
    const loco = this.loco;

    // Wheel slip — immediate attention
    if (loco.wheelSlip) return true;

    // Brakes engaged — stay slow while braking
    if (loco.brake > 0) return true;

    // Throttle or brake changed
    if (loco.throttle !== this._prevThrottle) return true;
    if (loco.brake !== this._prevBrake) return true;

    // Below 15 mph — keep calm timer zeroed unless warming up stationary
    const spdKmh = Math.abs(loco.velocity) * 3.6;
    if (spdKmh < 24 && !(spdKmh <= 1 && loco.throttle === 0 && loco.ignited)) return true;

    // Low resources
    const cfg = loco.cfg;
    const coalFrac = loco.fireboxCoal / cfg.fireboxMaxCoal;
    const waterFrac = loco.boilerWaterMass / cfg.boilerWaterMass;
    if (coalFrac < 0.1 || waterFrac < 0.2) return true;
    if (!loco.ignited && coalFrac < 0.01) return true;

    return false;
  }

  autoSimSpeed() {
    const loco = this.loco;
    const cfg = loco.cfg;
    const spdKmh = Math.abs(loco.velocity) * 3.6;

    const pFrac = Math.max(0, (loco.boilerPressure - cfg.pAtm) /
      (cfg.maxBoilerPressure - cfg.pAtm));

    // Logistic ramp: f(t) = 1 / (1 + exp(-k*(t - τ)))
    // Starts near 0, inflects at t=τ, saturates near 1.
    // At t=0 → ~0.03, t=30s → ~0.14, t=60s → 0.50, t=120s → ~0.97
    const logistic = (t) => 1 / (1 + Math.exp(-CALM_K * (t - CALM_TAU)));

    // Stationary with fire burning → ramp based on time since ignition
    if (spdKmh <= 1 && loco.throttle === 0) {
      if (loco.ignited) {
        const ramp = logistic(this.calmTime);
        let base = 1 + (MAX_SIM_SPEED - 1) * ramp;
        base *= this._resourceMultiplier();
        return Math.max(1, Math.round(base));
      }
      return 1;
    }

    // Stay at 1× until above 15 mph (~24 km/h)
    if (spdKmh < 24) return 1;

    // Cruising: logistic ramp based on calm timer
    let base = 1 + (MAX_SIM_SPEED - 1) * logistic(this.calmTime);
    base *= this._resourceMultiplier();

    return Math.max(1, Math.round(base));
  }

  // Tick: advance physics and animation by wall-clock elapsed [s]

  tick(elapsed) {
    const loco = this.loco;

    // Update calm timer
    if (this._detectEvents()) {
      this.calmTime = 0;
    } else {
      this.calmTime += elapsed;
    }

    // Snapshot controls for next frame's change detection
    this._prevThrottle = loco.throttle;
    this._prevBrake = loco.brake;

    // Target sim speed — override or auto
    this.simSpeed = this.simSpeedOverride !== null
      ? this.simSpeedOverride
      : this.autoSimSpeed();

    // Bicameral stepping: engine runs at fine resolution (DT_ENGINE),
    // boiler at coarser resolution (DT_BOILER). Accumulate sim-time
    // across frames so no time is lost to rounding.
    this._simTimeAccum += elapsed * this.simSpeed;
    const boilerSteps = Math.min(
      Math.floor(this._simTimeAccum / DT_BOILER),
      200,
    );
    this._simTimeAccum -= boilerSteps * DT_BOILER;

    for (let b = 0; b < boilerSteps; b++) {
      for (let e = 0; e < ENGINE_PER_BOILER; e++) {
        loco.stepEngine(DT_ENGINE);
      }
      loco.stepBoiler(DT_BOILER);
    }

    // Animation wheel phase (decoupled from simulation crank)
    this.animAngle += loco.wheelOmega * elapsed;

    // Smoothed steam rate (geometric EMA)
    const raw = loco.steamRate;
    if (this.smoothSteamRate < 1e-6) {
      this.smoothSteamRate = Math.max(raw, 1e-6);
    } else if (raw > 1e-6) {
      const alpha = 0.15;
      this.smoothSteamRate = Math.exp(
        alpha * Math.log(raw) + (1 - alpha) * Math.log(this.smoothSteamRate),
      );
    } else {
      this.smoothSteamRate *= 0.85;
    }
  }
}
