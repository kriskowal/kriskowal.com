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

  // DOM helpers for data-gauge / data-control multi-element queries
  const $ = (id) => document.getElementById(id);

  function gaugeAll(name) {
    return document.querySelectorAll(`[data-gauge="${name}"]`);
  }

  function controlAll(name) {
    return document.querySelectorAll(`[data-control="${name}"]`);
  }

  function setGauge(name, fn) {
    for (const el of gaugeAll(name)) fn(el);
  }

  function setGaugeValue(name, v) {
    for (const el of gaugeAll(name)) el.value = v;
  }

  function setGaugeText(name, text) {
    for (const el of gaugeAll(name)) el.textContent = text;
  }

  function setGaugeClass(name, cls) {
    for (const el of gaugeAll(name)) el.className = cls;
  }

  // Sync all instances of a shared control to match a canonical value
  function syncControl(name, prop, value) {
    for (const el of controlAll(name)) {
      if (el[prop] !== value) el[prop] = value;
    }
  }

  // Units
  let imperial = false;
  for (const radio of document.querySelectorAll('input[name="units"]')) {
    radio.addEventListener("change", () => {
      imperial = radio.value === "imperial";
    });
  }

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
  let simSpeedOverride = null;
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

  let hadUserGesture = false;
  function ensureRunning() {
    hadUserGesture = true;
    ensureAudio();
    if (!running) {
      running = true;
      lastTime = performance.now();
      $("btn-pause").textContent = "pause";
      requestAnimationFrame(update);
    }
  }

  // Shared control wiring — attach listeners to all instances of each control
  function wireRange(name, onChange) {
    for (const el of controlAll(name)) {
      el.addEventListener("input", () => {
        onChange(el);
        syncControl(name, "value", el.value);
        ensureRunning();
      });
    }
  }

  function wireCheckbox(name, onChange) {
    for (const el of controlAll(name)) {
      el.addEventListener("change", () => {
        onChange(el);
        syncControl(name, "checked", el.checked);
        ensureRunning();
      });
    }
  }

  wireRange("throttle", (el) => { loco.throttle = el.valueAsNumber / 100; });
  wireRange("valve-gear", (el) => { loco.johnsonBar = el.valueAsNumber / 100; });
  wireRange("brake", (el) => { loco.brake = el.valueAsNumber / 100; });
  wireRange("injector", (el) => { loco.injectorValve = el.value / 100; });
  wireRange("blowdown", (el) => { loco.blowdown = el.valueAsNumber / 100; });
  wireRange("damper", (el) => { loco.damper = el.valueAsNumber / 100; });
  wireRange("blower", (el) => { loco.blower = el.valueAsNumber / 100; });

  wireRange("coal-min", (el) => {
    for (const max of controlAll("coal-max")) {
      if (el.valueAsNumber > max.valueAsNumber) max.value = el.value;
    }
  });
  wireRange("coal-max", (el) => {
    for (const min of controlAll("coal-min")) {
      if (el.valueAsNumber < min.valueAsNumber) min.value = el.value;
    }
  });

  wireCheckbox("door", () => {});

  // Cars
  for (const el of controlAll("cars")) {
    el.addEventListener("input", () => {
      loco.numCars = Math.max(0, Math.min(14, el.valueAsNumber || 0));
      syncControl("cars", "value", loco.numCars);
      ensureRunning();
    });
  }

  // Buttons
  $("btn-fuel").addEventListener("click", () => {
    for (const el of controlAll("coal-min")) el.value = 30;
    for (const el of controlAll("coal-max")) el.value = 60;
    for (const el of controlAll("door")) el.checked = true;
    ensureRunning();
  });

  $("btn-ignite").addEventListener("click", () => { loco.ignite(); ensureRunning(); });
  $("btn-sand").addEventListener("click", () => { loco.dropSand(); ensureRunning(); });
  for (const el of document.querySelectorAll(".btn-shake")) {
    el.addEventListener("click", () => { loco.shakeGrate(); ensureRunning(); });
  }

  // Sound
  const whistle = new WhistleSynth();
  const chuff = new ChuffSynth();
  const bell = new BellSynth();
  const ambient = new AmbientSynth();
  let whistleTouching = false;

  function whistleUpdate() {
    // Read from first whistle control (all are synced)
    const first = controlAll("whistle")[0];
    if (!first) return;
    const val = first.valueAsNumber / 100;
    whistle.setOpening(val);
    setGaugeText("whistle-text", val > 0 ? ` ${first.value}%` : "");
  }

  function whistleRelease() {
    whistleTouching = false;
    whistle.release();
    syncControl("whistle", "value", 0);
    setGaugeText("whistle-text", "");
  }

  for (const el of controlAll("whistle")) {
    el.addEventListener("input", () => {
      whistleTouching = true;
      syncControl("whistle", "value", el.value);
      whistleUpdate();
    });
    el.addEventListener("mousedown", () => { whistleTouching = true; });
    el.addEventListener("touchstart", () => { whistleTouching = true; }, { passive: true });
    el.addEventListener("mouseup", whistleRelease);
    el.addEventListener("mouseleave", () => { if (whistleTouching) whistleRelease(); });
    el.addEventListener("touchend", whistleRelease);
    el.addEventListener("touchcancel", whistleRelease);
  }

  for (const el of controlAll("bell")) {
    el.addEventListener("mousedown", () => { bell.pullStart(); });
    el.addEventListener("mouseup", () => { bell.pullEnd(); });
    el.addEventListener("mouseleave", () => { bell.pullEnd(); });
    el.addEventListener("touchstart", () => { bell.pullStart(); }, { passive: true });
    el.addEventListener("touchend", () => { bell.pullEnd(); });
    el.addEventListener("touchcancel", () => { bell.pullEnd(); });
  }

  $("btn-pause").addEventListener("click", () => {
    if (running) {
      running = false;
      $("btn-pause").textContent = "resume";
      $("status").textContent = "Paused";
    } else {
      ensureRunning();
    }
  });

  let muted = false;
  $("btn-mute").addEventListener("click", () => {
    muted = !muted;
    $("btn-mute").textContent = muted ? "unmute" : "mute";
    for (const synth of [whistle, chuff, bell, ambient]) {
      if (synth._ctx) {
        if (muted) synth._ctx.suspend();
        else synth._ctx.resume();
      }
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

    // Sync controls into simulation (read from first instance of each)
    const firstCoalMin = controlAll("coal-min")[0];
    const firstCoalMax = controlAll("coal-max")[0];
    const firstDoor = controlAll("door")[0];
    if (firstCoalMin) loco.coalMin = firstCoalMin.valueAsNumber / 100;
    if (firstCoalMax) loco.coalMax = firstCoalMax.valueAsNumber / 100;
    if (firstDoor) loco.manualDoorOpen = firstDoor.checked;

    // Advance simulation
    sim.simSpeedOverride = simSpeedOverride;
    const prevSpeed = sim.simSpeed;
    sim.tick(elapsed);
    setGaugeValue("sim-speed-bar", Math.min(100, sim.simSpeed));
    setGaugeText("sim-speed-text", `${sim.simSpeed}\u00d7`);

    // Highlight sim speed box when changing, fade when steady
    const speedBox = $("sim-speed-box");
    if (speedBox) {
      if (sim.simSpeed !== prevSpeed) {
        speedBox.className = "speed-changing";
      } else if (speedBox.className === "speed-changing") {
        speedBox.className = "speed-steady";
      }
    }

    // Boiler explosion
    if (loco.exploded) {
      running = false;
      $("status").textContent = "BOILER EXPLOSION \u2014 simulation ended";
      $("status").style.color = "#f33";
      $("btn-pause").textContent = "\uD83D\uDCA5";
      $("btn-pause").disabled = true;
      return;
    }

    // Pistons (every frame)
    for (let cyl = 0; cyl < cfg.numCylinders; cyl++) {
      const theta = sim.animAngle + cyl * cfg.crankOffset;
      const pos = pistonDisplacement(theta, cfg.stroke / 2, cfg.rodLen);
      const pct = (pos / cfg.stroke) * 100;
      setGaugeValue(cyl === 0 ? "piston-left" : "piston-right", pct);
    }

    // Cylinder exhaust sound (every frame)
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

    // Bell physics (every frame)
    bell.update(elapsed);
    const bellDeg = (((bell.angle * (180 / Math.PI)) % 360) + 540) % 360 - 180;
    setGaugeValue("bell-swing", Math.round(bellDeg));

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
      blower: loco.blower,
      steamRate: loco.steamRate,
      injectorActive: loco.injectorActive,
    });

    // Gauges (at slower interval)
    if (timestamp - lastGauge < GAUGE_INTERVAL) return;
    lastGauge = timestamp;

    // Tender
    setGaugeValue("tender-coal", (loco.tenderCoal / cfg.tenderCoal) * 100);
    setGaugeText("tender-coal-text", fmt(mL(loco.tenderCoal), 1));
    setGaugeValue("tender-water", (loco.tenderWater / cfg.tenderWater) * 100);
    setGaugeText("tender-water-text", fmt(wV(loco.tenderWater), 0));

    // Firebox
    setGaugeValue("firebox-coal", (loco.fireboxCoal / cfg.fireboxMaxCoal) * 100);
    setGaugeText("firebox-coal-text", fmt(mS(loco.fireboxCoal), 0));
    setGaugeClass("shoveling-indicator", "indicator " + (loco.shoveling ? "on" : "off"));
    setGaugeClass("fire-indicator", "indicator " + (loco.ignited ? "on" : "off"));
    setGaugeText("burn-rate-text", loco.ignited ? fmt(mR(loco.burnRate), 2) : "");
    setGaugeValue("firebox-ash", (loco.fireboxAsh / cfg.ashMaxKg) * 100);
    setGaugeText("firebox-ash-text", ` ${((loco.fireboxAsh / cfg.ashMaxKg) * 100).toFixed(0)}%`);
    const maxHeat = cfg.maxBurnRate * cfg.coalEnergy;
    setGaugeValue("firebox-heat", Math.min(100, (loco.fireboxHeat / maxHeat) * 100));
    setGaugeText("firebox-heat-text", fmt(h(loco.fireboxHeat), 0));

    // Injector
    const injValve = loco.injectorValve;
    const injCaught = loco.injectorActive;
    const injHasSteam = injValve > 0.01
      && loco.boilerPressure >= cfg.injectorMinPressure;
    setGaugeValue("inj-steam-flow", injHasSteam ? Math.round(injValve * 100) : 0);
    setGaugeText("inj-steam-text", injHasSteam ? Math.round(injValve * 100) + "%" : "");
    setGaugeValue("inj-water-flow", injCaught ? 100 : 0);
    setGauge("inj-water-text", (el) => {
      el.textContent = injCaught ? "delivering" : "";
      el.style.color = injCaught ? "#3c3" : "";
    });
    setGauge("injector-text", (el) => {
      if (injCaught) {
        el.textContent = "caught";
        el.style.color = "#3c3";
      } else if (injHasSteam) {
        el.textContent = "no catch";
        el.style.color = "#f93";
      } else if (injValve > 0.01) {
        el.textContent = "no steam";
        el.style.color = "#888";
      } else {
        el.textContent = "closed";
        el.style.color = "";
      }
    });
    syncControl("injector", "value", Math.round(injValve * 100));

    // Boiler
    setGaugeValue("boiler-water", (loco.boilerWaterMass / cfg.boilerWaterMass) * 100);
    setGaugeText("boiler-water-text", fmt(wV(loco.boilerWaterMass), 0));

    if (loco.boilerWaterMass > 0) {
      const bTemp = t(loco.boilerTemp);
      setGaugeValue("boiler-temp", ((loco.boilerTemp - 373.15) / 274) * 100);
      setGaugeText("boiler-temp-text", fmt(bTemp, 0));
      setGaugeText("boiler-temp-label", "water temperature");
    } else {
      setGaugeValue("boiler-temp", 0);
      setGaugeText("boiler-temp-text", "");
      setGaugeText("boiler-temp-label", "");
    }

    const bPres = p(loco.boilerPressure);
    setGaugeValue("boiler-pressure", imperial
      ? (bPres.v / 300) * 100
      : (loco.boilerPressure / 2068) * 100);
    setGaugeText("boiler-pressure-text", fmt(bPres, 0));

    // Whistle available pressure
    const pGauge = Math.max(0, loco.boilerPressure - cfg.pAtm);
    const pMax = cfg.maxBoilerPressure - cfg.pAtm;
    whistle.pressureFraction = pMax > 0 ? pGauge / pMax : 0;
    if (whistleTouching) whistleUpdate();

    setGaugeClass("relief-indicator", "indicator " + (loco.reliefValveOpen ? "relief" : "off"));

    // Manifold
    const mTemp = t(loco.manifoldTemp);
    setGaugeValue("manifold-temp", ((loco.manifoldTemp - 373.15) / 274) * 100);
    setGaugeText("manifold-temp-text", fmt(mTemp, 0));
    const dtdtSign = loco.manifoldDTdt >= 0 ? "+" : "";
    setGaugeText("manifold-dtdt-text", `${dtdtSign}${loco.manifoldDTdt.toFixed(2)} K/s`);
    setGaugeValue("manifold-stress", (loco.manifoldStress / cfg.manifoldStressLimit) * 100);
    setGaugeText("manifold-stress-text", ` ${loco.manifoldStress.toFixed(1)} / ${cfg.manifoldStressLimit}`);

    // Superheater / chest
    const snap = loco.snapshot();

    const sTemp = t(loco.superTemp);
    setGaugeValue("super-temp", ((loco.superTemp - 373.15) / 400) * 100);
    setGaugeText("super-temp-text", fmt(sTemp, 0));

    const sPres = p(snap.superPressure);
    setGaugeValue("super-pressure", imperial
      ? (sPres.v / 300) * 100
      : (snap.superPressure / 2068) * 100);
    setGaugeText("super-pressure-text", fmt(sPres, 0));

    const cTemp = t(snap.chestTemp);
    setGaugeValue("chest-temp", ((snap.chestTemp - 373.15) / 400) * 100);
    setGaugeText("chest-temp-text", fmt(cTemp, 0));

    const cPres = p(snap.chestPressure);
    setGaugeValue("chest-pressure", imperial
      ? (cPres.v / 300) * 100
      : (snap.chestPressure / 2068) * 100);
    setGaugeText("chest-pressure-text", fmt(cPres, 0));

    // Steam rate
    setGaugeValue("steam-rate", Math.min(100, sim.smoothSteamRate * 20));
    setGaugeText("steam-rate-text", fmt(mR(sim.smoothSteamRate), 3));

    // Controls readout (sync slider positions from loco state)
    setGaugeText("throttle-text", ` ${(loco.throttle * 100).toFixed(0)}%`);
    syncControl("throttle", "value", Math.round(loco.throttle * 100));

    const jb = loco.johnsonBar;
    const jbCutoff = Math.abs(jb) * cfg.maxCutoff;
    const jbDir = jb > 0 ? "fwd" : jb < 0 ? "rev" : "N";
    setGaugeText("valve-gear-text", ` ${jbDir} ${(jbCutoff * 100).toFixed(0)}%`);
    syncControl("valve-gear", "value", Math.round(jb * 100));

    setGaugeText("brake-text", ` ${(loco.brake * 100).toFixed(0)}%`);
    syncControl("brake", "value", Math.round(loco.brake * 100));

    setGaugeText("blowdown-text", ` ${(loco.blowdown * 100).toFixed(0)}%`);
    syncControl("blowdown", "value", Math.round(loco.blowdown * 100));

    setGaugeText("damper-text", ` ${(loco.damper * 100).toFixed(0)}%`);
    syncControl("damper", "value", Math.round(loco.damper * 100));
    setGaugeText("blower-text", ` ${(loco.blower * 100).toFixed(0)}%`);
    syncControl("blower", "value", Math.round(loco.blower * 100));

    const firstMin = controlAll("coal-min")[0];
    const firstMax = controlAll("coal-max")[0];
    if (firstMin) syncControl("coal-min", "value", firstMin.value);
    if (firstMax) syncControl("coal-max", "value", firstMax.value);
    setGaugeText("coal-min-text", firstMin ? ` ${firstMin.value}%` : "");
    setGaugeText("coal-max-text", firstMax ? ` ${firstMax.value}%` : "");

    const trainMass = cfg.locomotiveMass + loco.numCars * cfg.carMass
      + loco.boilerWaterMass + loco.tenderCoal + loco.tenderWater;
    setGaugeText("train-mass", fmt(mL(trainMass), 1));
    for (const el of controlAll("cars")) el.disabled = loco.distance > 100;

    // Motion
    const spdVal = spd(loco.velocity);
    setGaugeValue("speed-bar", Math.min(100, spdVal.v));
    setGaugeText("speed-text", fmt(spdVal, 1));
    const distVal = d(loco.distance);
    setGaugeText("distance-text", fmt(distVal, distVal.u === "m" || distVal.u === "ft" ? 0 : 2));
    setGaugeText("te-text", fmt(f(loco.totalTE), 1));
    setGaugeText("applied-te-text", fmt(f(loco.appliedTE), 1));
    setGaugeClass("slip-indicator", "indicator " + (loco.wheelSlip ? "relief" : "off"));
    setGaugeText("slip-text", loco.wheelSlip ? "SLIPPING" : "");
    setGaugeText("sand-text", loco.sandDropping ? "active" : "");

    // Clock
    const totalMin = Math.floor(loco.simTime / 60);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    setGaugeText("elapsed-text", `${days}d ${hours}h ${mins}m`);

    // Sync door checkbox from simulation (auto-open during shoveling)
    syncControl("door", "checked", loco.fireboxDoorOpen);
  }

  // Start the simulation loop without audio (no user gesture yet)
  running = true;
  lastTime = performance.now();
  $("btn-pause").textContent = "pause";
  requestAnimationFrame(update);
}
