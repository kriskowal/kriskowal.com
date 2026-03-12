// Simplified steam locomotive simulation.
// Couples Keenan EOS thermodynamics with crank-slider mechanics.

import { psat, rhosatLiq, rhosatVap, rawPressure, rawEnthalpy } from "./steam.js";
import {
  pistonDisplacement,
  cylinderVolumes,
  valveParams,
  valveDisplacement,
  portOpenings,
  tangentialCrankForce,
  tractiveEffort,
} from "./geometry.js";

const { PI, sqrt, abs, max, min } = Math;

// Defaults

export const DEFAULTS = {
  // Boiler — CPRR #60 "Jupiter" (Schenectady, 1868)
  boilerVolume: 2.8, // m³ total internal volume (est. from ~850 sq ft heating surface)
  boilerWaterMass: 1800, // kg (~1.8 m³ at normal working level)
  boilerMaxWater: 2400, // kg — full glass; beyond this injector shuts off
  boilerTemp: 300, // K initial temperature (ambient)

  // Manifold (steam dome + main steam pipe, cast iron)
  manifoldMass: 600, // kg — dome + piping + fittings (smaller engine)
  manifoldCp: 0.5, // kJ/(kg·K) — specific heat of cast iron
  manifoldHeatTransfer: 1.5, // kW/K — conductance from boiler/steam to manifold
  manifoldStressPerK: 0.0005, // stress units per K of |dT/dt| per second (thermal cycling)
  manifoldPressureStress: 0.000000015, // stress units per kPa gauge per second
  manifoldStressLimit: 100, // cumulative stress units before failure

  // Superheater — none on Jupiter (saturated steam engine)
  // Modeled as minimal pass-through volume (dry pipe to steam chest)
  superheaterVolume: 0.1, // m³ (dry pipe volume only)
  superheaterHeatFraction: 0.05, // minimal — no superheater tubes, just hot gas proximity

  // Steam chest
  steamChestVolume: 0.04, // m³

  // Cylinders (each) — 16″ × 24″
  bore: 0.4064, // m (16 in)
  stroke: 0.6096, // m (24 in)
  rodLen: 1.98, // m (~78 in, L/R ratio ≈ 6.5, typical 1860s practice)
  clearanceRatio: 0.10, // slightly higher than later practice

  // Valve gear (Stephenson link motion, slide valve)
  steamLap: 0.022, // m (~7/8 in)
  exhaustLap: -0.003, // m (negative = exhaust clearance)
  valveLead: 0.003, // m (~1/8 in)
  maxPortOpening: 0.032, // m (~1.25 in)
  portBarLength: 0.35, // m (effective port perimeter for area calc)
  maxCutoff: 0.75, // maximum cutoff fraction at full gear

  // Vehicle — CPRR #60 Jupiter, 4-4-0 American type
  drivingWheelDiameter: 1.524, // m (60 in)
  locomotiveMass: 29665, // kg (65,400 lb engine weight)
  numCylinders: 2,
  crankOffset: PI / 2, // rad between cylinder cranks (quartered)

  // Flow
  dischargeCoeff: 0.85, // slide-valve ports are rounded ducts, not sharp orifices
  maxThrottleArea: 0.008, // m² throttle fully open area (smaller engine)

  // Resistance — iron rail, journal bearings
  rollingResistanceCoeff: 0.005, // higher than later steel rail (iron rail + Babbitt bearings)
  gradeAngle: 0, // rad (0 = level)
  dragCoeffArea: 6.0, // Cd × A [m²] (balloon stack + cowcatcher)
  airDensity: 1.225, // kg/m³

  // Adhesion — iron wheel on iron rail (1860s)
  drivingAxleMass: 16300, // kg (35,935 lb adhesive weight, 2 driving axles)
  staticAdhesion: 0.25, // µ_s dry iron rail (lower than later steel)
  dynamicAdhesion: 0.12, // µ_k sliding friction
  sandAdhesionBoost: 0.15, // additional µ when sand applied
  sandEffectDistance: 3.0, // m — how far sand remains effective on rail

  // Braking — hand brakes on tender, no air brakes (pre-Westinghouse)
  locoBrakeForce: 20000, // N (hand brake on tender wheels)
  carBrakeForce: 8000, // N per car (brakeman hand brake)

  // Consist — 1860s passenger cars
  carMass: 12000, // kg per loaded passenger car (lighter than later stock)
  carResistanceCoeff: 0.004, // higher resistance (link-and-pin, iron rail)

  // Atmosphere
  pAtm: 101.325, // kPa
  tAtm: 300, // K

  // Tender
  tenderCoal: 2400, // kg (~2 cords of Western softwood, ~5,300 lb)
  tenderWater: 7200, // kg (~1,900 US gallons)

  // Firebox — wood-burning, ~1.4 m² grate (~15 sq ft)
  fireboxMaxCoal: 80, // kg capacity on grate (wood is bulky, burns fast)
  fireboxInitialCoal: 0, // kg (cold start)
  shovelRate: 0.8, // kg/s — wood is lighter, tossed in by the armload
  maxBurnRate: 0.28, // kg/s at full draught (~1000 kg/hr, wood burns fast)
  coalEnergy: 7000, // kJ/kg effective (cordwood ~14 MJ/kg gross × ~50% efficiency)

  // Ash — wood ash is ~1–2% by mass, accumulates on grate
  ashFraction: 0.015, // fraction of fuel mass that becomes ash
  ashMaxKg: 20, // kg — grate is fully choked at this level
  ashShakeFraction: 0.35, // fraction of ash removed per grate shake

  // Airflow and draft
  naturalDraft: 0.3, // baseline chimney stack effect (hot gas rises)
  blowerMaxFlow: 0.08, // kg/s — steam consumed at full blower
  blowerDraftFactor: 0.6, // draft contribution at full blower (0–1)
  exhaustDraftMax: 1.0, // draft at max engine steam flow
  exhaustDraftRef: 2.0, // kg/s engine steam flow for full exhaust draft
  minAirForIgnition: 0.05, // below this airFactor, fire goes out

  // Injector
  // Injector — Giffard-type steam injector (no moving parts)
  injectorMaxFlow: 2.5, // kg/s delivery rate when caught
  injectorMinPressure: 275, // kPa absolute (~25 psi gauge) — won't catch below this
  injectorBodyMass: 30, // kg — cast iron/brass body thermal mass
  injectorBodyCp: 0.5, // kJ/(kg·K) — specific heat of body
  injectorBodyHeatRate: 8, // kW — heat absorbed from steam during operation
  injectorBodyCoolRate: 0.15, // kW/K — convective cooling to ambient when off
  injectorMaxBodyTemp: 340, // K (~67°C) — fails above this (condensation ineffective)
  injectorCatchBodyTemp: 330, // K (~57°C) — must cool below this to re-catch
  injectorKnockOffSpeed: 20, // m/s (~45 mph) — vibration knock-off becomes likely
  injectorKnockOffRate: 0.02, // probability per second at knockOffSpeed

  // Blow-down valve — drains boiler water from bottom
  blowdownMaxFlow: 4, // kg/s at full boiler pressure

  // Heat loss — lagged boiler to environment (1860s insulation)
  boilerSurfaceArea: 16, // m² (barrel + firebox + smokebox)
  boilerHeatTransferCoeff: 0.010, // kW/(m²·K) (~10 W/(m²·K), less effective insulation)

  // Safety — pressure relief valve
  maxBoilerPressure: 929, // kPa (~120 psi gauge, absolute) — valve opens here
  reliefValveHysteresis: 10, // kPa — valve reseats this far below set pressure
  reliefValveMaxFlow: 20, // kg/s — must exceed max steaming rate to control pressure
  reliefValveResponse: 20, // kPa proportional band above set pressure
  reliefValveMinFrac: 0.5, // pop valve opens to at least 50% when tripped
};

// Chamber helper

function gasPressure(T, rho) {
  return rawPressure(T, rho);
}


function orificeFlow(pUp, pDown, rhoUp, area, Cd) {
  const dp = pUp - pDown;
  if (dp <= 0 || area <= 0) return 0;
  return Cd * area * sqrt(2 * rhoUp * dp * 1000);
}

// Locomotive simulation

export class Locomotive {
  constructor(config = {}) {
    this.cfg = { ...DEFAULTS, ...config };
    const c = this.cfg;

    // Derived geometry
    this.crankR = c.stroke / 2;
    this.wheelR = c.drivingWheelDiameter / 2;
    this.pistonArea = (PI / 4) * c.bore ** 2;

    // State

    // Boiler (saturated)
    this.boilerTemp = c.boilerTemp;
    this.boilerWaterMass = c.boilerWaterMass;

    // Manifold (heavy casting, starts at ambient)
    this.manifoldTemp = c.boilerTemp;
    this.manifoldDTdt = 0; // K/s — rate of temperature change
    this.manifoldStress = 0; // cumulative thermal+pressure fatigue
    this.exploded = false;

    // Superheater (starts at atmospheric — no steam until throttle opens)
    this.superTemp = c.tAtm;
    this.superMass = 1e-6;

    // Steam chest (starts at atmospheric)
    this.chestTemp = c.tAtm;
    this.chestMass = 1e-6;

    // Cylinders: arrays of [head, crank] for each cylinder
    this.cylTemp = [];
    this.cylMass = [];
    for (let i = 0; i < c.numCylinders; i++) {
      this.cylTemp.push([c.tAtm, c.tAtm]);
      this.cylMass.push([1e-6, 1e-6]);
    }

    // Vehicle
    this.velocity = 0; // m/s
    this.wheelOmega = 0; // rad/s — angular velocity of driving wheels
    this.crankAngle = PI / 4; // rad — offset from dead center to avoid stall
    this.distance = 0; // m
    this.simTime = 0; // s — total elapsed simulation time

    // Tender
    this.tenderCoal = c.tenderCoal;
    this.tenderWater = c.tenderWater;

    // Firebox
    this.fireboxCoal = c.fireboxInitialCoal;
    this.fireboxAsh = 0; // kg of ash on grate
    this.ignited = false;
    this.burnRate = 0;

    // Consist
    this.numCars = 0;

    // Controls
    this.throttle = 0; // 0–1 main steam valve
    this.johnsonBar = 1 / 3; // -1 (full reverse) ... 0 (neutral) ... +1 (full forward)
    this.shoveling = false; // continuous coal transfer while true
    this.fireboxDoorOpen = false;
    this.manualDoorOpen = false; // player-controlled door override
    this.coalMin = 0; // 0–1 fraction: start shoveling below this
    this.coalMax = 0; // 0–1 fraction: stop shoveling above this (0 = disabled)
    this.damper = 1; // 0–1 ashpan damper opening (1 = fully open)
    this.blower = 0; // 0–1 blower valve opening (0 = off)
    this.injectorValve = 0; // 0–1 valve opening (player-controlled)
    this.injectorActive = false; // injector has caught and is delivering water
    this.injectorBodyTemp = c.tAtm; // K — body temperature (rises during use)
    this.injectorCatchCenter = 0.5; // current catch band center (0–1)
    this.injectorCatchWidth = 0.4; // current catch band half-width
    this.blowdown = 0; // 0–1 blow-down valve opening
    this.brake = 0; // 0–1 brake application

    // Adhesion
    this.wheelSlip = false; // true when wheels are spinning
    this.sandDropping = false; // true while sand is being applied
    this.sandDistance = -Infinity; // position where sand was last deposited

    // Instrumentation (updated each step)
    this.boilerPressure = c.pAtm;
    this.totalTE = 0;
    this.appliedTE = 0; // TE after adhesion limit
    this.steamRate = 0;
    this._engineSteamDemand = 0; // kg/s — last engine step's chest draw
    this._smoothedExhaustRate = 0; // kg/s — EMA of exhaust for draft calc
    this.fireboxHeat = 0; // kW entering the boiler
    this.reliefValveOpen = false;
  }

  /** Light the fire (requires coal in firebox). */
  ignite() {
    if (this.fireboxCoal > 0) this.ignited = true;
  }

  /** Shake the grate to drop ash into the ashpan. */
  shakeGrate() {
    const removed = this.fireboxAsh * this.cfg.ashShakeFraction;
    this.fireboxAsh -= removed;
  }

  /** Drop sand on the track at the current position. */
  dropSand() {
    this.sandDropping = true;
    this.sandDistance = this.distance;
  }

  /** Piston displacement [m] for a given cylinder index (0-based). */
  pistonPosition(cylIndex) {
    const theta = this.crankAngle + cylIndex * this.cfg.crankOffset;
    return pistonDisplacement(theta, this.crankR, this.cfg.rodLen);
  }

  // ENGINE SIMULATION — valve gear, cylinders, vehicle dynamics.
  // Reads chest state set by boiler sim; drains chestMass directly.

  /**
   * Advance the engine (mechanical) simulation by dt seconds.
   * Computes cylinder flows, tractive effort, and vehicle dynamics.
   * Drains steam from the chest; the boiler sim refills it.
   * @param {number} dt - Time step [s]
   */
  stepEngine(dt) {
    if (this.exploded) return;
    const c = this.cfg;

    // Read current chest state (maintained by boiler sim)
    const chestRho = this.chestMass / c.steamChestVolume;
    const pChest = gasPressure(this.chestTemp, chestRho);

    // Valve gear & cylinders
    const jbPos = this.johnsonBar;
    const direction = Math.sign(jbPos);
    const cutoff = abs(jbPos) * c.maxCutoff;

    const { travel, advance } = valveParams(
      max(0.01, cutoff),
      c.steamLap,
      c.valveLead,
    );

    let totalTE = 0;
    let totalMDotFromChest = 0;

    for (let cyl = 0; cyl < c.numCylinders; cyl++) {
      const theta = this.crankAngle + cyl * c.crankOffset;
      const valveTheta = direction < 0 ? theta + PI : theta;

      const v =
        direction === 0
          ? 0
          : valveDisplacement(valveTheta, travel, advance);
      const ports = portOpenings(
        v,
        c.steamLap,
        c.exhaustLap,
        c.maxPortOpening,
      );
      const vols = cylinderVolumes(
        theta,
        c.bore,
        c.stroke,
        c.rodLen,
        c.clearanceRatio,
      );

      const volArr = [vols.head, vols.crank];
      const steamArr = [ports.headSteam, ports.crankSteam];
      const exhArr = [ports.headExhaust, ports.crankExhaust];

      let netPistonForce = 0;

      for (let end = 0; end < 2; end++) {
        const vol = volArr[end];
        let mass = this.cylMass[cyl][end];
        let temp = this.cylTemp[cyl][end];

        if (mass < 1e-8) mass = 1e-8;
        const rho = mass / vol;

        const pCyl = max(0, rho * 0.461537266 * temp);

        const admitArea = steamArr[end] * c.portBarLength;
        const exhaustArea = exhArr[end] * c.portBarLength;

        const mDotIn = orificeFlow(
          pChest,
          pCyl,
          chestRho,
          admitArea,
          c.dischargeCoeff,
        );
        const mDotOut = orificeFlow(
          pCyl,
          c.pAtm,
          rho,
          exhaustArea,
          c.dischargeCoeff,
        );

        const dm = (mDotIn - mDotOut) * dt;
        const newMass = max(1e-8, mass + dm);

        const mRetained = max(0, mass - mDotOut * dt);
        const mIn = mDotIn * dt;
        let newTemp = temp;
        if (newMass > 1e-7) {
          newTemp = (mRetained * temp + mIn * this.chestTemp) / newMass;
        }
        newTemp = max(c.tAtm, newTemp);

        this.cylMass[cyl][end] = newMass;
        this.cylTemp[cyl][end] = newTemp;

        const sign = end === 0 ? 1 : -1;
        netPistonForce += sign * (pCyl - c.pAtm) * 1000 * this.pistonArea;

        totalMDotFromChest += mDotIn;
      }

      const Ft = tangentialCrankForce(
        theta,
        netPistonForce,
        this.crankR,
        c.rodLen,
      );
      totalTE += tractiveEffort(Ft, this.crankR, this.wheelR);
    }

    // Drain chest — engine consumes steam directly
    this.chestMass = max(1e-6, this.chestMass - totalMDotFromChest * dt);

    // Refill chest from superheater (at engine rate for coupling fidelity)
    const superRho = this.superMass / c.superheaterVolume;
    const pSuper = gasPressure(this.superTemp, superRho);
    const postDrainChestRho = this.chestMass / c.steamChestVolume;
    const pChestPost = gasPressure(this.chestTemp, postDrainChestRho);
    const mDotSuperToChest = orificeFlow(
      pSuper, pChestPost, superRho, c.maxThrottleArea, c.dischargeCoeff,
    );
    const chestRefill = mDotSuperToChest * dt;
    const newChestMass = max(1e-6, this.chestMass + chestRefill);
    if (newChestMass > 1e-5 && chestRefill > 0) {
      this.chestTemp =
        (this.chestMass * this.chestTemp + chestRefill * this.superTemp) /
        newChestMass;
    }
    this.chestTemp = max(c.tAtm, this.chestTemp);
    this.chestMass = newChestMass;
    this.superMass = max(1e-6, this.superMass - chestRefill);

    // Vehicle dynamics with adhesion
    const trainMass = c.locomotiveMass + this.numCars * c.carMass
      + this.boilerWaterMass + this.tenderCoal + this.tenderWater;
    const g = 9.81;

    const onSand = abs(this.distance - this.sandDistance) < c.sandEffectDistance;
    const muStatic = c.staticAdhesion + (onSand ? c.sandAdhesionBoost : 0);
    const muDynamic = c.dynamicAdhesion + (onSand ? c.sandAdhesionBoost : 0);
    const weightOnDrivers = c.drivingAxleMass * g;
    const Fadhesion = (this.wheelSlip ? muDynamic : muStatic) * weightOnDrivers;

    const wheelEquivMass = 1500;

    if (this.wheelSlip) {
      const wheelSurfaceV = this.wheelOmega * this.wheelR;
      if (abs(wheelSurfaceV - this.velocity) < 0.1 && abs(totalTE) <= Fadhesion) {
        this.wheelSlip = false;
        this.wheelOmega = this.velocity / this.wheelR;
      }
    }

    if (!this.wheelSlip && abs(totalTE) > Fadhesion) {
      this.wheelSlip = true;
    }

    let appliedTE;
    if (this.wheelSlip) {
      const wheelSurfaceV = this.wheelOmega * this.wheelR;
      const slipDir = wheelSurfaceV - this.velocity > 0 ? 1 :
                      wheelSurfaceV - this.velocity < 0 ? -1 :
                      Math.sign(totalTE);
      const Ffriction = slipDir * muDynamic * weightOnDrivers;
      appliedTE = Ffriction;

      const Fwheel = totalTE - Ffriction;
      const wheelAccel = Fwheel / wheelEquivMass;
      this.wheelOmega += wheelAccel * dt / this.wheelR;
    } else {
      appliedTE = totalTE;
      this.wheelOmega = this.velocity / this.wheelR;
    }

    if (this.sandDropping && !this.wheelSlip && abs(this.velocity) > 0.1) {
      this.sandDropping = false;
    }

    const dir = this.velocity > 0 ? 1 : this.velocity < 0 ? -1 : 0;
    const Frolling = dir * (c.rollingResistanceCoeff * c.locomotiveMass * g
      + c.carResistanceCoeff * this.numCars * c.carMass * g);
    const Fgrade = trainMass * g * Math.sin(c.gradeAngle);
    const Fdrag =
      dir * 0.5 * c.airDensity * c.dragCoeffArea * this.velocity ** 2;
    const Fbrake = dir * this.brake *
      (c.locoBrakeForce + this.numCars * c.carBrakeForce);
    const Fresist = Frolling + Fgrade + Fdrag + Fbrake;

    const Fnet = appliedTE - Fresist;
    const accel = Fnet / trainMass;

    const newVelocity = this.velocity + accel * dt;
    if (dir !== 0 && Math.sign(newVelocity) !== dir && totalTE === 0) {
      this.velocity = 0;
    } else {
      this.velocity = newVelocity;
    }
    this.distance += this.velocity * dt;
    this.simTime += dt;

    this.crankAngle = (this.crankAngle + this.wheelOmega * dt) % (2 * PI);

    // Engine outputs — available to boiler sim and instrumentation
    this._engineSteamDemand = totalMDotFromChest;
    // Exhaust draft responds to cumulative puffs, not instantaneous valve state.
    // EMA with ~1s time constant smooths over several crank revolutions.
    const alpha = 1 - Math.exp(-dt / 1.0);
    this._smoothedExhaustRate += alpha * (totalMDotFromChest - this._smoothedExhaustRate);
    this.totalTE = totalTE;
    this.appliedTE = appliedTE;
  }

  /**
   * Analytical steam demand [kg/s] based on classical indicator diagram.
   * Timestep-independent cross-check against numerical cylinder flows.
   */
  analyticalSteamDemand() {
    const c = this.cfg;
    const cutoff = abs(this.johnsonBar) * c.maxCutoff;
    if (cutoff < 0.001 || abs(this.wheelOmega) < 0.01) return 0;

    const sweptVolume = this.pistonArea * c.stroke;
    const chestRho = this.chestMass / c.steamChestVolume;
    const revsPerSec = abs(this.wheelOmega) / (2 * PI);

    // Each double-acting cylinder admits steam for the cutoff fraction
    // on both head and crank ends, once per revolution each.
    return c.numCylinders * 2 * sweptVolume * cutoff * chestRho * revsPerSec;
  }

  // BOILER SIMULATION — firebox, thermodynamics, steam flow chain.
  // Refills the chest that the engine sim drains.

  /**
   * Advance the boiler (thermodynamic) simulation by dt seconds.
   * Handles firebox, injector, steam flow chain, blowdown, manifold,
   * and relief valve. Refills the steam chest.
   * @param {number} dt - Time step [s]
   */
  stepBoiler(dt) {
    if (this.exploded) return;
    const c = this.cfg;

    // Auto-shoveling: fireman maintains coal level between min/max
    const coalFrac = this.fireboxCoal / c.fireboxMaxCoal;
    if (this.coalMax > 0 && coalFrac <= this.coalMin) this.shoveling = true;
    if (coalFrac >= this.coalMax || this.coalMax === 0) this.shoveling = false;
    this.fireboxDoorOpen = this.shoveling || this.manualDoorOpen;

    if (this.shoveling) {
      const space = c.fireboxMaxCoal - this.fireboxCoal;
      if (space > 0.001 && this.tenderCoal > 0) {
        const moved = min(c.shovelRate * dt, this.tenderCoal, space);
        this.fireboxCoal += moved;
        this.tenderCoal -= moved;
      } else {
        this.shoveling = false;
      }
    }

    // Draft — natural stack effect + blower supplement, or exhaust blast
    // Natural draft and blower are additive (blower supplements stack effect).
    // Exhaust blast, when present, dominates both.
    const exhaustDraft = min(1, this._smoothedExhaustRate / c.exhaustDraftRef)
                         * c.exhaustDraftMax;
    const blowerDraft = this.blower * c.blowerDraftFactor;
    const draft = max(c.naturalDraft + blowerDraft, exhaustDraft);

    // Blower steam consumption (drawn from superheater mass)
    if (this.blower > 0) {
      const blowerFlow = this.blower * c.blowerMaxFlow * dt;
      const drawn = min(blowerFlow, this.superMass);
      this.superMass = max(1e-6, this.superMass - drawn);
    }

    // Firebox
    let qFirebox = 0;
    if (this.ignited && this.fireboxCoal > 0) {
      const doorFactor = this.fireboxDoorOpen ? 1.0 : 0.7;
      const ashChoke = 1 - min(1, this.fireboxAsh / c.ashMaxKg);
      const airFactor = this.damper * draft * doorFactor * ashChoke;
      const coalFraction = min(1, this.fireboxCoal / (c.fireboxMaxCoal * 0.3));
      this.burnRate = c.maxBurnRate * coalFraction * airFactor;
      const burned = min(this.burnRate * dt, this.fireboxCoal);
      this.fireboxCoal -= burned;
      this.fireboxAsh = min(this.fireboxAsh + burned * c.ashFraction, c.ashMaxKg);
      qFirebox = (burned / dt) * c.coalEnergy; // kW
      if (airFactor < c.minAirForIgnition) {
        this.ignited = false;
        this.burnRate = 0;
      } else if (this.fireboxCoal < 0.001) {
        this.fireboxCoal = 0;
        this.ignited = false;
        this.burnRate = 0;
      }
    } else {
      this.burnRate = 0;
      if (this.fireboxCoal <= 0) this.ignited = false;
    }

    // Injector — Giffard-type steam injector with valve-position catch band.
    // The player manipulates a steam valve (0–1). The injector catches only
    // when the valve is within a "sweet spot" that shifts with conditions:
    // higher pressure widens and lowers the band, hot body narrows it,
    // high speed adds jitter. Too little steam: no energy. Too much: jet
    // breaks up. Once caught, the band is slightly wider (hysteresis).
    const pBoilerNow = psat(this.boilerTemp);

    // Compute current catch band from operating conditions.
    // Pressure factor: 0 at min pressure, 1 at full operating pressure.
    const pFrac = max(0, (pBoilerNow - c.injectorMinPressure)
      / (c.maxBoilerPressure - c.injectorMinPressure));
    // Body heat penalty: narrows band as body approaches failure temp.
    const bodyFrac = max(0, 1 - (this.injectorBodyTemp - c.tAtm)
      / (c.injectorMaxBodyTemp - c.tAtm));
    // Catch band center: lower pressure needs more valve opening.
    // At full pressure center ~0.35, at min pressure center ~0.70.
    this.injectorCatchCenter = 0.70 - 0.35 * pFrac;
    // Half-width: wide at good conditions, narrow at marginal.
    // Base 0.25 at full pressure/cold body, shrinks toward 0.05.
    this.injectorCatchWidth = max(0.05, 0.25 * pFrac * bodyFrac);

    const valveInBand = this.injectorValve > 0.01
      && abs(this.injectorValve - this.injectorCatchCenter) <= this.injectorCatchWidth;
    const canOperate = pBoilerNow >= c.injectorMinPressure
      && this.injectorBodyTemp < c.injectorMaxBodyTemp
      && this.tenderWater > 0
      && this.boilerWaterMass < c.boilerMaxWater;

    if (this.injectorActive) {
      // Once caught, allow slightly wider band (hysteresis)
      const hyst = 1.3;
      const stillInBand = this.injectorValve > 0.01
        && abs(this.injectorValve - this.injectorCatchCenter)
           <= this.injectorCatchWidth * hyst;

      let knockedOff = !stillInBand || !canOperate;

      // Vibration knock-off (probabilistic)
      if (!knockedOff && abs(this.velocity) > 1) {
        const speedFrac = abs(this.velocity) / c.injectorKnockOffSpeed;
        const pKnock = 1 - Math.pow(
          1 - c.injectorKnockOffRate * speedFrac * speedFrac, dt);
        if (Math.random() < pKnock) knockedOff = true;
      }

      if (knockedOff) {
        this.injectorActive = false;
      } else {
        // Delivering water — arrives warm from steam condensation (~98% eff)
        const injFlow = c.injectorMaxFlow;
        const room = c.boilerMaxWater - this.boilerWaterMass;
        const waterAdded = min(injFlow * dt, this.tenderWater, room);
        const oldMass = this.boilerWaterMass;
        this.boilerWaterMass += waterAdded;
        this.tenderWater -= waterAdded;
        if (this.boilerWaterMass > 0) {
          const feedTemp = min(353, this.boilerTemp);
          const mixTemp =
            (this.boilerTemp * oldMass + feedTemp * waterAdded) /
            this.boilerWaterMass;
          this.boilerTemp = max(c.tAtm, mixTemp);
        }
        // Body absorbs heat from steam passage
        this.injectorBodyTemp +=
          (c.injectorBodyHeatRate * dt) / (c.injectorBodyMass * c.injectorBodyCp);
      }
    } else {
      // Body cools toward ambient when not operating
      const dTCool = c.injectorBodyCoolRate * (this.injectorBodyTemp - c.tAtm) * dt
        / (c.injectorBodyMass * c.injectorBodyCp);
      this.injectorBodyTemp = max(c.tAtm, this.injectorBodyTemp - dTCool);

      // Catch if valve is in the sweet spot and conditions allow
      if (valveInBand && canOperate
          && this.injectorBodyTemp < c.injectorCatchBodyTemp) {
        this.injectorActive = true;
      }
    }

    // Boiler thermodynamics
    const pBoiler = psat(this.boilerTemp);
    const rhoSatV = rhosatVap(this.boilerTemp);
    const rhoSatL = rhosatLiq(this.boilerTemp);
    const hg = rawEnthalpy(this.boilerTemp, rhoSatV);
    const hf = rawEnthalpy(this.boilerTemp, rhoSatL);
    const hfg = hg - hf;

    const qBoiler = qFirebox * (1 - c.superheaterHeatFraction); // kW
    const qSuper = qFirebox * c.superheaterHeatFraction; // kW

    // Flow: Boiler → Superheater (throttle-controlled)
    const throttleArea = c.maxThrottleArea * this.throttle;
    const superRho = this.superMass / c.superheaterVolume;
    const pSuper = gasPressure(this.superTemp, superRho);
    let mDotBS = 0;
    if (pBoiler > c.pAtm) {
      const mDotBoilerToSuper = orificeFlow(
        pBoiler,
        pSuper,
        rhoSatV,
        throttleArea,
        c.dischargeCoeff,
      );
      mDotBS = min(mDotBoilerToSuper, this.boilerWaterMass / dt);
    }

    // Update superheater state
    // (super→chest flow is handled by stepEngine at fine resolution;
    //  superMass already reflects those drains)
    const newSuperMass = max(1e-6, this.superMass + mDotBS * dt);
    const mSuperIn = mDotBS * dt;
    if (newSuperMass > 1e-5) {
      this.superTemp =
        (this.superMass * this.superTemp + mSuperIn * this.boilerTemp) /
        newSuperMass;
    }
    if (qSuper > 0 && newSuperMass > 0.01) {
      const cpSteam = 2.0; // kJ/(kg·K) approximate
      this.superTemp += (qSuper * dt) / (newSuperMass * cpSteam);
    }
    this.superTemp = max(c.tAtm, this.superTemp);
    this.superMass = newSuperMass;

    // Update boiler
    this.boilerWaterMass = max(0, this.boilerWaterMass - mDotBS * dt);
    const qLoss = c.boilerHeatTransferCoeff * c.boilerSurfaceArea
      * (this.boilerTemp - c.tAtm); // kW
    const qNetBoiler = qBoiler - mDotBS * hfg - qLoss;
    if (this.boilerWaterMass > 0) {
      const dTBoiler = (qNetBoiler * dt) / (this.boilerWaterMass * 4.2);
      this.boilerTemp = max(c.tAtm, this.boilerTemp + dTBoiler);
      this.boilerTemp = min(this.boilerTemp, 640);
    }

    // Blow-down valve
    if (this.blowdown > 0) {
      const pGauge = max(0, pBoiler - c.pAtm);
      const pFrac = pGauge / (c.maxBoilerPressure - c.pAtm);
      const flow = c.blowdownMaxFlow * this.blowdown * pFrac;
      if (this.boilerWaterMass > 0) {
        const drained = min(flow * dt, this.boilerWaterMass);
        this.boilerWaterMass -= drained;
      } else if (this.boilerTemp > c.tAtm) {
        const steamMass = c.boilerVolume * rhosatVap(this.boilerTemp);
        const ventMass = min(flow * dt, steamMass);
        if (steamMass > 0.01) {
          const fracVented = ventMass / steamMass;
          const dT = fracVented * (this.boilerTemp - c.tAtm);
          this.boilerTemp = max(c.tAtm, this.boilerTemp - dT);
        } else {
          this.boilerTemp = c.tAtm;
        }
      }
    }

    // Manifold thermal dynamics
    const qManifold = c.manifoldHeatTransfer * (this.boilerTemp - this.manifoldTemp);
    const prevManifoldTemp = this.manifoldTemp;
    this.manifoldTemp += (qManifold * dt) / (c.manifoldMass * c.manifoldCp);
    this.manifoldTemp = max(c.tAtm, this.manifoldTemp);
    this.manifoldDTdt = (this.manifoldTemp - prevManifoldTemp) / dt;

    const thermalStress = c.manifoldStressPerK * abs(this.manifoldDTdt) * dt;
    const pGauge = max(0, pBoiler - c.pAtm);
    const pressureStress = c.manifoldPressureStress * pGauge * dt;
    this.manifoldStress += thermalStress + pressureStress;

    if (this.manifoldStress >= c.manifoldStressLimit) {
      this.exploded = true;
    }

    // Pressure relief valve (pop-type with hysteresis)
    this.boilerPressure = max(c.pAtm, psat(this.boilerTemp));
    const reliefClose = c.maxBoilerPressure - c.reliefValveHysteresis;
    if (this.boilerPressure > c.maxBoilerPressure) {
      this.reliefValveOpen = true;
    } else if (this.boilerPressure < reliefClose) {
      this.reliefValveOpen = false;
    }
    if (this.reliefValveOpen && this.boilerTemp > c.tAtm) {
      const overP = max(0, this.boilerPressure - c.maxBoilerPressure);
      const propFrac = min(1, overP / c.reliefValveResponse);
      const ventFrac = max(c.reliefValveMinFrac, propFrac);
      const ventRate = c.reliefValveMaxFlow * ventFrac;
      const vented = ventRate * dt;
      if (this.boilerWaterMass > 0 && hfg > 0) {
        const energyRemoved = vented * hfg;
        const dT = energyRemoved / (this.boilerWaterMass * 4.2);
        this.boilerTemp = max(c.tAtm, this.boilerTemp - dT);
      }
      this.boilerPressure = max(c.pAtm, psat(this.boilerTemp));
    }

    // Instrumentation
    this.steamRate = mDotBS;
    this.fireboxHeat = qFirebox;
  }

  /**
   * Advance the full simulation by dt seconds (lockstep — both sims
   * at the same rate). Backward-compatible with existing callers.
   * @param {number} dt - Time step [s]
   */
  step(dt) {
    this.stepEngine(dt);
    this.stepBoiler(dt);
  }

  /** Current state snapshot for logging / display. */
  snapshot() {
    return {
      time: undefined, // caller sets this
      velocity: this.velocity,
      velocityKmh: this.velocity * 3.6,
      distance: this.distance,
      crankAngle: this.crankAngle,
      boilerPressure: this.boilerPressure,
      boilerTemp: this.boilerTemp,
      boilerWater: this.boilerWaterMass,
      manifoldTemp: this.manifoldTemp,
      manifoldDTdt: this.manifoldDTdt,
      manifoldStress: this.manifoldStress,
      exploded: this.exploded,
      superTemp: this.superTemp,
      superPressure:
        this.superMass > 0
          ? gasPressure(
              this.superTemp,
              this.superMass / this.cfg.superheaterVolume,
            )
          : 0,
      chestTemp: this.chestTemp,
      chestPressure:
        this.chestMass > 0
          ? gasPressure(
              this.chestTemp,
              this.chestMass / this.cfg.steamChestVolume,
            )
          : 0,
      tractiveEffort: this.totalTE,
      appliedTE: this.appliedTE,
      wheelSlip: this.wheelSlip,
      steamRate: this.steamRate,
      fireboxHeat: this.fireboxHeat,
      cutoff: abs(this.johnsonBar) * this.cfg.maxCutoff,
      throttle: this.throttle,
      johnsonBar: this.johnsonBar,
      tenderCoal: this.tenderCoal,
      tenderWater: this.tenderWater,
      fireboxCoal: this.fireboxCoal,
      fireboxAsh: this.fireboxAsh,
      burnRate: this.burnRate,
      brake: this.brake,
      numCars: this.numCars,
      ignited: this.ignited,
      reliefValveOpen: this.reliefValveOpen,
      injectorActive: this.injectorActive,
      injectorBodyTemp: this.injectorBodyTemp,
      injectorCatchCenter: this.injectorCatchCenter,
      injectorCatchWidth: this.injectorCatchWidth,
      injectorValve: this.injectorValve,
      damper: this.damper,
      blower: this.blower,
    };
  }
}

/**
 * Run a simulation for the given duration.
 *
 * @param {object} options
 * @param {number} options.duration - Total simulation time [s]
 * @param {number} options.dt - Time step [s]
 * @param {Function} [options.setup] - (loco) => void, called once before simulation
 * @param {Function} [options.controlSchedule] - (time, loco) => void, called each step
 * @param {number} [options.snapshotInterval] - Seconds between snapshots
 * @param {object} [options.config] - Locomotive config overrides
 * @returns {{ snapshots: object[], loco: Locomotive }}
 */
export function simulate({
  duration,
  dt = 0.001,
  setup,
  controlSchedule,
  snapshotInterval = 1.0,
  config = {},
}) {
  const loco = new Locomotive(config);
  if (setup) setup(loco);
  const snapshots = [];
  let nextSnapshot = 0;

  for (let t = 0; t <= duration; t += dt) {
    if (controlSchedule) controlSchedule(t, loco);
    loco.step(dt);

    if (t >= nextSnapshot) {
      const snap = loco.snapshot();
      snap.time = t;
      snapshots.push(snap);
      nextSnapshot += snapshotInterval;
    }
  }

  return { snapshots, loco };
}
