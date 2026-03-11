// main.js — UI entrypoint for steam locomotive simulation.
// Owns DOM wiring, render loop, and unit conversions.

import { Simulation } from "./simulation.js";
import { pistonDisplacement } from "./geometry.js";
import { WhistleSynth } from "./whistle.js";
import { ChuffSynth } from "./chuff.js";
import { BellSynth } from "./bell.js";
import { AmbientSynth } from "./ambient.js";

// Unit conversions
// Each returns { v: number, u: string } for use with fmt().

export function temp(k, imperial) {
  const c = k - 273.15;
  return imperial ? { v: c * 9 / 5 + 32, u: "°F" } : { v: c, u: "°C" };
}

export function pressure(kPa, imperial) {
  return imperial ? { v: kPa * 0.14504, u: "psi" } : { v: kPa, u: "kPa" };
}

export function massLarge(kg, imperial) {
  return imperial ? { v: kg / 907.185, u: "ton" } : { v: kg / 1000, u: "t" };
}

export function massSmall(kg, imperial) {
  return imperial ? { v: kg * 2.20462, u: "lb" } : { v: kg, u: "kg" };
}

export function massRate(kgPerS, imperial) {
  return imperial ? { v: kgPerS * 2.20462, u: "lb/s" } : { v: kgPerS, u: "kg/s" };
}

export function waterVolume(kg, imperial) {
  return imperial ? { v: kg * 0.264172, u: "gal" } : { v: kg, u: "kg" };
}

export function speed(mPerS, imperial) {
  return imperial ? { v: mPerS * 2.23694, u: "mph" } : { v: mPerS * 3.6, u: "km/h" };
}

export function dist(m, imperial) {
  if (imperial) {
    return m > 5280 * 0.3048
      ? { v: m / 1609.344, u: "mi" }
      : { v: m * 3.28084, u: "ft" };
  }
  return m > 1000
    ? { v: m / 1000, u: "km" }
    : { v: m, u: "m" };
}

export function force(n, imperial) {
  return imperial ? { v: n * 0.000224809, u: "klbf" } : { v: n / 1000, u: "kN" };
}

export function heat(kW, imperial) {
  return imperial ? { v: kW * 3412.14, u: "BTU/h" } : { v: kW, u: "kW" };
}

/** Format a {v, u} conversion result with sign-aligned padding. */
export function fmt(conv, decimals = 0) {
  const n = Number(conv.v);
  const prefix = n < 0 ? "" : " ";
  return `${prefix}${n.toFixed(decimals)} ${conv.u}`;
}

// UI bootstrap (only runs in browser)

export function main() {
  const sim = new Simulation();
  const loco = sim.loco;
  const cfg = sim.cfg;

  // DOM refs
  const $ = (id) => document.getElementById(id);

  const ctlThrottle = $("ctl-throttle");
  const ctlValveGear = $("ctl-valve-gear");
  const ctlDoor = $("ctl-door");
  const ctlInjector = $("ctl-injector");
  const ctlBlowdown = $("ctl-blowdown");
  const ctlCoalMin = $("ctl-coal-min");
  const ctlCoalMax = $("ctl-coal-max");
  const btnIgnite = $("btn-ignite");
  const btnSand = $("btn-sand");
  const btnShake = $("btn-shake");
  const ctlBrake = $("ctl-brake");
  const ctlCars = $("ctl-cars");
  const btnPause = $("btn-pause");
  const ctlUnits = $("ctl-units");

  // Units
  let imperial = false;
  ctlUnits.addEventListener("change", () => { imperial = ctlUnits.checked; });

  // Closures over imperial flag for convenience in render loop
  const t = (k) => temp(k, imperial);
  const p = (kPa) => pressure(kPa, imperial);
  const mL = (kg) => massLarge(kg, imperial);
  const mS = (kg) => massSmall(kg, imperial);
  const mR = (kgPerS) => massRate(kgPerS, imperial);
  const wV = (kg) => waterVolume(kg, imperial);
  const spd = (mPerS) => speed(mPerS, imperial);
  const d = (m) => dist(m, imperial);
  const f = (n) => force(n, imperial);
  const h = (kW) => heat(kW, imperial);

  // Sim speed override
  let simSpeedOverride = null; // null = auto
  for (const radio of document.querySelectorAll('input[name="sim-speed"]')) {
    radio.addEventListener("change", () => {
      simSpeedOverride = radio.value === "auto" ? null : Number(radio.value);
    });
  }

  // State
  let running = false;
  let lastTime = null;

  let audioStarted = false;
  function ensureAudio() {
    if (audioStarted) return;
    audioStarted = true;
    whistle.ensureContext();
    chuff.ensureContext();
    bell.ensureContext();
    ambient.ensureContext();
  }

  function ensureRunning() {
    ensureAudio();
    if (!running) {
      running = true;
      lastTime = performance.now();
      btnPause.textContent = "pause";
      requestAnimationFrame(update);
    }
  }

  // Control wiring
  ctlThrottle.addEventListener("input", () => {
    loco.throttle = ctlThrottle.valueAsNumber / 100;
    ensureRunning();
  });

  ctlValveGear.addEventListener("input", () => {
    loco.johnsonBar = ctlValveGear.valueAsNumber / 100;
    ensureRunning();
  });

  ctlDoor.addEventListener("change", () => { ensureRunning(); });

  ctlInjector.addEventListener("input", () => {
    loco.injectorThrottle = ctlInjector.valueAsNumber / 100;
    ensureRunning();
  });

  ctlBlowdown.addEventListener("input", () => {
    loco.blowdown = ctlBlowdown.valueAsNumber / 100;
    $("blowdown-text").textContent = ` ${ctlBlowdown.value}%`;
    ensureRunning();
  });

  ctlCoalMin.addEventListener("input", () => {
    if (ctlCoalMin.valueAsNumber > ctlCoalMax.valueAsNumber) {
      ctlCoalMax.value = ctlCoalMin.value;
    }
    $("coal-min-text").textContent = ` ${ctlCoalMin.value}%`;
    $("coal-max-text").textContent = ` ${ctlCoalMax.value}%`;
    ensureRunning();
  });

  ctlCoalMax.addEventListener("input", () => {
    if (ctlCoalMax.valueAsNumber < ctlCoalMin.valueAsNumber) {
      ctlCoalMin.value = ctlCoalMax.value;
    }
    $("coal-min-text").textContent = ` ${ctlCoalMin.value}%`;
    $("coal-max-text").textContent = ` ${ctlCoalMax.value}%`;
    ensureRunning();
  });

  ctlBrake.addEventListener("input", () => {
    loco.brake = ctlBrake.valueAsNumber / 100;
    ensureRunning();
  });

  ctlCars.addEventListener("input", () => {
    loco.numCars = Math.max(0, Math.min(14, ctlCars.valueAsNumber || 0));
    ctlCars.value = loco.numCars;
    ensureRunning();
  });

  btnIgnite.addEventListener("click", () => { loco.ignite(); ensureRunning(); });
  btnSand.addEventListener("click", () => { loco.dropSand(); ensureRunning(); });
  btnShake.addEventListener("click", () => { loco.shakeGrate(); ensureRunning(); });

  // Sound
  const whistle = new WhistleSynth();
  const chuff = new ChuffSynth();
  const bell = new BellSynth();
  const ambient = new AmbientSynth();
  const ctlWhistle = $("ctl-whistle");
  let whistleTouching = false;

  function whistleUpdate() {
    const val = ctlWhistle.valueAsNumber / 100;
    whistle.setOpening(val);
    $("whistle-text").textContent = val > 0 ? ` ${ctlWhistle.value}%` : "";
  }

  function whistleRelease() {
    whistleTouching = false;
    whistle.release();
    ctlWhistle.value = 0;
    $("whistle-text").textContent = "";
  }

  ctlWhistle.addEventListener("input", () => {
    whistleTouching = true;
    whistleUpdate();
  });
  ctlWhistle.addEventListener("mousedown", () => { whistleTouching = true; });
  ctlWhistle.addEventListener("touchstart", () => { whistleTouching = true; }, { passive: true });
  ctlWhistle.addEventListener("mouseup", whistleRelease);
  ctlWhistle.addEventListener("mouseleave", () => { if (whistleTouching) whistleRelease(); });
  ctlWhistle.addEventListener("touchend", whistleRelease);
  ctlWhistle.addEventListener("touchcancel", whistleRelease);

  $("btn-bell").addEventListener("mousedown", () => { bell.pullStart(); });
  $("btn-bell").addEventListener("mouseup", () => { bell.pullEnd(); });
  $("btn-bell").addEventListener("mouseleave", () => { bell.pullEnd(); });
  $("btn-bell").addEventListener("touchstart", () => { bell.pullStart(); }, { passive: true });
  $("btn-bell").addEventListener("touchend", () => { bell.pullEnd(); });
  $("btn-bell").addEventListener("touchcancel", () => { bell.pullEnd(); });

  btnPause.addEventListener("click", () => {
    if (running) {
      running = false;
      btnPause.textContent = "resume";
      $("status").textContent = "Paused";
    } else {
      ensureRunning();
    }
  });

  // Render loop
  const GAUGE_INTERVAL = 500;
  let lastGauge = 0;

  function update(timestamp) {
    if (!running) return;
    requestAnimationFrame(update);

    if (lastTime === null) {
      lastTime = timestamp;
      lastGauge = timestamp;
      return;
    }

    const elapsed = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Sync controls into simulation
    loco.coalMin = ctlCoalMin.valueAsNumber / 100;
    loco.coalMax = ctlCoalMax.valueAsNumber / 100;
    loco.manualDoorOpen = ctlDoor.checked;

    // Advance simulation
    sim.simSpeedOverride = simSpeedOverride;
    sim.tick(elapsed);
    $("sim-speed-bar").value = Math.min(100, sim.simSpeed);
    $("sim-speed-text").textContent = `${sim.simSpeed}×`;

    // Boiler explosion
    if (loco.exploded) {
      running = false;
      $("status").textContent = "BOILER EXPLOSION — simulation ended";
      $("status").style.color = "#f33";
      btnPause.textContent = "💥";
      btnPause.disabled = true;
      return;
    }

    // Pistons (every frame)
    for (let cyl = 0; cyl < cfg.numCylinders; cyl++) {
      const theta = sim.animAngle + cyl * cfg.crankOffset;
      const pos = pistonDisplacement(theta, cfg.stroke / 2, cfg.rodLen);
      $(cyl === 0 ? "piston-left" : "piston-right").value = (pos / cfg.stroke) * 100;
    }

    // Cylinder exhaust sound (every frame — driven by wheel animation)
    const jbPos = loco.johnsonBar;
    const chuffSnap = loco.snapshot();
    const chestGauge = Math.max(0, chuffSnap.chestPressure - cfg.pAtm);
    const maxGauge = cfg.maxBoilerPressure - cfg.pAtm;
    chuff.update({
      elapsed,
      animAngle: sim.animAngle,
      crankOffset: cfg.crankOffset,
      numCylinders: cfg.numCylinders,
      cutoff: Math.abs(jbPos) * cfg.maxCutoff,
      steamLap: cfg.steamLap,
      exhaustLap: cfg.exhaustLap,
      valveLead: cfg.valveLead,
      maxPortOpening: cfg.maxPortOpening,
      chestPressureGauge: chestGauge,
      maxPressure: maxGauge,
      direction: Math.sign(jbPos),
    });

    // Bell physics (every frame — pendulum must stay in sync)
    bell.update(elapsed);
    const bellDeg = (((bell.angle * (180 / Math.PI)) % 360) + 540) % 360 - 180;
    $("bell-swing").value = Math.round(bellDeg);

    // Ambient sounds (every frame)
    ambient.update({
      brake: loco.brake,
      speed: loco.velocity,
      fireboxHeat: loco.fireboxHeat,
      maxFireboxHeat: cfg.maxBurnRate * cfg.coalEnergy,
      doorOpen: loco.fireboxDoorOpen,
      shoveling: loco.shoveling,
      simSpeed: sim.simSpeed,
      blowdown: loco.blowdown,
      boilerPressure: loco.boilerPressure,
      maxPressure: cfg.maxBoilerPressure,
      pAtm: cfg.pAtm,
      waterFraction: loco.boilerWaterMass / cfg.boilerWaterMass,
      sandDropping: loco.sandDropping,
      reliefValveOpen: loco.reliefValveOpen,
    });

    // Gauges (at slower interval)
    if (timestamp - lastGauge < GAUGE_INTERVAL) return;
    lastGauge = timestamp;

    // Tender
    $("tender-coal").value = (loco.tenderCoal / cfg.tenderCoal) * 100;
    $("tender-coal-text").textContent = fmt(mL(loco.tenderCoal), 1);
    $("tender-water").value = (loco.tenderWater / cfg.tenderWater) * 100;
    $("tender-water-text").textContent = fmt(wV(loco.tenderWater), 0);

    // Firebox
    $("firebox-coal").value = (loco.fireboxCoal / cfg.fireboxMaxCoal) * 100;
    $("firebox-coal-text").textContent = fmt(mS(loco.fireboxCoal), 0);
    $("shoveling-indicator").className = "indicator " + (loco.shoveling ? "on" : "off");
    $("door-indicator").className = "indicator " + (loco.fireboxDoorOpen ? "on" : "off");
    $("fire-indicator").className = "indicator " + (loco.ignited ? "on" : "off");
    $("burn-rate-text").textContent = loco.ignited ? fmt(mR(loco.burnRate), 2) : "";
    $("firebox-ash").value = (loco.fireboxAsh / cfg.ashMaxKg) * 100;
    $("firebox-ash-text").textContent = ` ${((loco.fireboxAsh / cfg.ashMaxKg) * 100).toFixed(0)}%`;
    const maxHeat = cfg.maxBurnRate * cfg.coalEnergy;
    $("firebox-heat").value = Math.min(100, (loco.fireboxHeat / maxHeat) * 100);
    $("firebox-heat-text").textContent = fmt(h(loco.fireboxHeat), 0);

    // Injector
    $("injector-text").textContent = ` ${(loco.injectorThrottle * 100).toFixed(0)}%`;

    // Boiler
    $("boiler-water").value = (loco.boilerWaterMass / cfg.boilerWaterMass) * 100;
    $("boiler-water-text").textContent = fmt(wV(loco.boilerWaterMass), 0);

    if (loco.boilerWaterMass > 0) {
      const bTemp = t(loco.boilerTemp);
      $("boiler-temp").value = ((loco.boilerTemp - 373.15) / 274) * 100;
      $("boiler-temp-text").textContent = fmt(bTemp, 0);
      $("boiler-temp-label").textContent = "water temperature";
    } else {
      $("boiler-temp").value = 0;
      $("boiler-temp-text").textContent = "";
      $("boiler-temp-label").textContent = "";
    }

    const bPres = p(loco.boilerPressure);
    $("boiler-pressure").value = imperial
      ? (bPres.v / 300) * 100
      : (loco.boilerPressure / 2068) * 100;
    $("boiler-pressure-text").textContent = fmt(bPres, 0);

    // Whistle available pressure tracks boiler gauge pressure
    const pGauge = Math.max(0, loco.boilerPressure - cfg.pAtm);
    const pMax = cfg.maxBoilerPressure - cfg.pAtm;
    whistle.pressureFraction = pMax > 0 ? pGauge / pMax : 0;
    if (whistleTouching) whistleUpdate();

    $("relief-indicator").className = "indicator " + (loco.reliefValveOpen ? "relief" : "off");

    // Manifold
    const mTemp = t(loco.manifoldTemp);
    $("manifold-temp").value = ((loco.manifoldTemp - 373.15) / 274) * 100;
    $("manifold-temp-text").textContent = fmt(mTemp, 0);
    const dtdtSign = loco.manifoldDTdt >= 0 ? "+" : "";
    $("manifold-dtdt-text").textContent = `${dtdtSign}${loco.manifoldDTdt.toFixed(2)} K/s`;
    $("manifold-stress").value = (loco.manifoldStress / cfg.manifoldStressLimit) * 100;
    $("manifold-stress-text").textContent = ` ${loco.manifoldStress.toFixed(1)} / ${cfg.manifoldStressLimit}`;

    // Superheater / chest
    const snap = loco.snapshot();

    const sTemp = t(loco.superTemp);
    $("super-temp").value = ((loco.superTemp - 373.15) / 400) * 100;
    $("super-temp-text").textContent = fmt(sTemp, 0);

    const sPres = p(snap.superPressure);
    $("super-pressure").value = imperial
      ? (sPres.v / 300) * 100
      : (snap.superPressure / 2068) * 100;
    $("super-pressure-text").textContent = fmt(sPres, 0);

    const cTemp = t(snap.chestTemp);
    $("chest-temp").value = ((snap.chestTemp - 373.15) / 400) * 100;
    $("chest-temp-text").textContent = fmt(cTemp, 0);

    const cPres = p(snap.chestPressure);
    $("chest-pressure").value = imperial
      ? (cPres.v / 300) * 100
      : (snap.chestPressure / 2068) * 100;
    $("chest-pressure-text").textContent = fmt(cPres, 0);

    // Steam rate
    $("steam-rate").value = Math.min(100, sim.smoothSteamRate * 20);
    $("steam-rate-text").textContent = fmt(mR(sim.smoothSteamRate), 3);

    // Controls readout
    $("throttle-text").textContent = ` ${(loco.throttle * 100).toFixed(0)}%`;
    const jb = loco.johnsonBar;
    const jbCutoff = Math.abs(jb) * cfg.maxCutoff;
    const jbDir = jb > 0 ? "fwd" : jb < 0 ? "rev" : "N";
    $("valve-gear-text").textContent = ` ${jbDir} ${(jbCutoff * 100).toFixed(0)}%`;
    $("brake-text").textContent = ` ${(loco.brake * 100).toFixed(0)}%`;
    const trainMass = cfg.locomotiveMass + loco.numCars * cfg.carMass
      + loco.boilerWaterMass + loco.tenderCoal + loco.tenderWater;
    $("cars-text").textContent = loco.numCars > 0
      ? fmt(mL(trainMass), 0) + " total"
      : "";
    ctlCars.disabled = loco.distance > 100;

    // Motion
    const spdVal = spd(loco.velocity);
    $("speed-bar").value = Math.min(100, spdVal.v);
    $("speed-text").textContent = fmt(spdVal, 1);
    const distVal = d(loco.distance);
    $("distance-text").textContent = fmt(distVal, distVal.u === "m" || distVal.u === "ft" ? 0 : 2);
    $("te-text").textContent = fmt(f(loco.totalTE), 1);
    $("applied-te-text").textContent = fmt(f(loco.appliedTE), 1);
    $("slip-indicator").className = "indicator " + (loco.wheelSlip ? "relief" : "off");
    $("slip-text").textContent = loco.wheelSlip ? "SLIPPING" : "";
    $("sand-text").textContent = loco.sandDropping ? "active" : "";

    // Clock
    const totalMin = Math.floor(loco.simTime / 60);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    $("elapsed-text").textContent = `${days}d ${hours}h ${mins}m`;
    const daySeconds = loco.simTime % 86400;
    $("clock-bar").value = (daySeconds / 864);
    const todH = Math.floor(daySeconds / 3600);
    const todM = Math.floor((daySeconds % 3600) / 60);
    $("clock-text").textContent =
      `${String(todH).padStart(2, "0")}:${String(todM).padStart(2, "0")}`;
  }

  ensureRunning();
}
