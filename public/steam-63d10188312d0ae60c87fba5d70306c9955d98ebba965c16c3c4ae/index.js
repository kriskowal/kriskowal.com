// main.js — UI entrypoint for steam locomotive simulation.
// Owns DOM wiring, render loop, and unit conversions.

import { Simulation } from "./simulation.js";
import { pistonDisplacement } from "./geometry.js";
import { rawPressure } from "./steam.js";
import { WhistleSynth } from "./whistle.js";
import { ChuffSynth } from "./chuff.js";
import { BellSynth } from "./bell.js";
import { AmbientSynth } from "./ambient.js";

const FIRE_FLICKER = true;

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

  // DOM helpers — all element lookups are cached at startup since the DOM is static.
  const $ = (id) => document.getElementById(id);

  const gaugeCache = new Map();
  for (const el of document.querySelectorAll("[data-gauge]")) {
    const name = el.dataset.gauge;
    let arr = gaugeCache.get(name);
    if (!arr) { arr = []; gaugeCache.set(name, arr); }
    arr.push(el);
  }

  const controlCache = new Map();
  for (const el of document.querySelectorAll("[data-control]")) {
    const name = el.dataset.control;
    let arr = controlCache.get(name);
    if (!arr) { arr = []; controlCache.set(name, arr); }
    arr.push(el);
  }

  const EMPTY = [];
  function gaugeAll(name) { return gaugeCache.get(name) || EMPTY; }
  function controlAll(name) { return controlCache.get(name) || EMPTY; }

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

  for (const el of controlAll("door")) {
    el.addEventListener("change", () => {
      const isOpen = el.value === "open";
      loco.manualDoorOpen = isOpen;
      for (const other of controlAll("door")) {
        if (other.value === el.value && other !== el) other.checked = true;
      }
      ensureRunning();
    });
  }

  // Cars
  const carsDisplay = $("cars-display");
  function updateCarsDisplay() {
    if (carsDisplay) carsDisplay.textContent = loco.numCars;
  }
  $("btn-cars-dec").addEventListener("click", () => {
    loco.numCars = Math.max(0, loco.numCars - 1);
    updateCarsDisplay();
    ensureRunning();
  });
  $("btn-cars-inc").addEventListener("click", () => {
    loco.numCars = Math.min(14, loco.numCars + 1);
    updateCarsDisplay();
    ensureRunning();
  });

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

  // Render loop — cached element refs and pre-allocated state objects
  // so the per-frame path does zero DOM queries and zero allocations.
  const GAUGE_INTERVAL = 500;
  let lastGauge = 0;
  let firePhase, fireSpeed, fireHue, fireLit, fireGlow;

  const speedBox = $("sim-speed-box");
  const statusEl = $("status");
  const pauseBtn = $("btn-pause");
  const fireEls = gaugeAll("fire-indicator");
  const doorActualEls = Array.from(document.querySelectorAll("[data-door-actual]"));
  const reliefEls = Array.from(document.querySelectorAll("[data-relief]"));

  const cachedCoalMin = controlAll("coal-min")[0];
  const cachedCoalMax = controlAll("coal-max")[0];
  const pistonEls = [gaugeAll("piston-left"), gaugeAll("piston-right")];

  const maxGaugePressure = cfg.maxBoilerPressure - cfg.pAtm;
  const chuffState = {
    elapsed: 0,
    animAngle: 0,
    crankOffset: cfg.crankOffset,
    numCylinders: cfg.numCylinders,
    cutoff: 0,
    steamLap: cfg.steamLap,
    exhaustLap: cfg.exhaustLap,
    valveLead: cfg.valveLead,
    maxPortOpening: cfg.maxPortOpening,
    chestPressureGauge: 0,
    maxPressure: maxGaugePressure,
    direction: 0,
  };

  const ambientState = {
    brake: 0,
    speed: 0,
    fireboxHeat: 0,
    maxFireboxHeat: cfg.maxBurnRate * cfg.coalEnergy,
    doorOpen: false,
    shoveling: false,
    simSpeed: 1,
    blowdown: 0,
    boilerPressure: 0,
    maxPressure: cfg.maxBoilerPressure,
    pAtm: cfg.pAtm,
    waterFraction: 0,
    sandDropping: false,
    reliefValveOpen: false,
    blower: 0,
    steamRate: 0,
    injectorActive: false,
  };

  function update(timestamp) {
    if (!running) return;
    innerUpdate(timestamp);
    requestAnimationFrame(update);
  }

  function innerUpdate(timestamp) {

    if (lastTime === null) {
      lastTime = timestamp;
      lastGauge = timestamp;
      return;
    }

    const elapsed = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (cachedCoalMin) loco.coalMin = cachedCoalMin.valueAsNumber / 100;
    if (cachedCoalMax) loco.coalMax = cachedCoalMax.valueAsNumber / 100;

    // Advance simulation
    sim.simSpeedOverride = simSpeedOverride;
    const prevSpeed = sim.simSpeed;
    sim.tick(elapsed);
    setGaugeValue("sim-speed-bar", Math.min(100, sim.simSpeed));
    setGaugeText("sim-speed-text", `${sim.simSpeed}\u00d7`);

    if (speedBox) {
      if (sim.simSpeed !== prevSpeed) {
        speedBox.className = "speed-changing";
      } else if (speedBox.className === "speed-changing") {
        speedBox.className = "speed-steady";
      }
    }

    if (loco.exploded) {
      running = false;
      statusEl.textContent = "BOILER EXPLOSION \u2014 simulation ended";
      statusEl.style.color = "#f33";
      pauseBtn.textContent = "\uD83D\uDCA5";
      pauseBtn.disabled = true;
      return;
    }

    for (let cyl = 0; cyl < cfg.numCylinders; cyl++) {
      const theta = sim.animAngle + cyl * cfg.crankOffset;
      const pos = pistonDisplacement(theta, cfg.stroke / 2, cfg.rodLen);
      const pct = pos / cfg.stroke;
      for (const el of pistonEls[cyl]) el.style.setProperty("--pct", pct);
    }

    const jbPos = loco.johnsonBar;
    const chestRho = loco.chestMass / cfg.steamChestVolume;
    const chestP = loco.chestMass > 1e-6
      ? rawPressure(loco.chestTemp, chestRho) : cfg.pAtm;
    chuffState.elapsed = elapsed;
    chuffState.animAngle = sim.animAngle;
    chuffState.cutoff = Math.abs(jbPos) * cfg.maxCutoff;
    chuffState.chestPressureGauge = Math.max(0, chestP - cfg.pAtm);
    chuffState.direction = Math.sign(jbPos);
    chuff.update(chuffState);

    // Bell physics (every frame)
    bell.update(elapsed);
    const bellDeg = (((bell.angle * (180 / Math.PI)) % 360) + 540) % 360 - 180;
    setGaugeValue("bell-swing", Math.round(bellDeg));

    ambientState.brake = loco.brake;
    ambientState.speed = loco.velocity;
    ambientState.fireboxHeat = loco.fireboxHeat;
    ambientState.doorOpen = loco.fireboxDoorOpen;
    ambientState.shoveling = loco.shoveling;
    ambientState.simSpeed = sim.simSpeed;
    ambientState.blowdown = loco.blowdown;
    ambientState.boilerPressure = loco.boilerPressure;
    ambientState.waterFraction = loco.boilerWaterMass / cfg.boilerWaterMass;
    ambientState.sandDropping = loco.sandDropping;
    ambientState.reliefValveOpen = loco.reliefValveOpen;
    ambientState.blower = loco.blower;
    ambientState.steamRate = loco.steamRate;
    ambientState.injectorActive = loco.injectorActive;
    ambient.update(ambientState);

    if (loco.ignited) {
      if (FIRE_FLICKER) {
        if (firePhase === undefined) {
          firePhase = 0; fireSpeed = 0.02; fireHue = 25; fireLit = 45; fireGlow = 6;
        }
        firePhase += fireSpeed;
        if (firePhase >= 1) { firePhase = 0; fireSpeed = 0.008 + Math.random() * 0.025; }
        const wave = Math.sin(firePhase * Math.PI);
        const tHue = 10 + wave * 20;
        const tLit = 35 + wave * 25;
        const tGlow = 3 + wave * 7;
        fireHue += (tHue - fireHue) * 0.08;
        fireLit += (tLit - fireLit) * 0.08;
        fireGlow += (tGlow - fireGlow) * 0.08;
        fireHue += (Math.random() - 0.5) * 1.5;
        fireLit += (Math.random() - 0.5) * 1.0;
        const bg = `hsl(${fireHue}, 92%, ${fireLit}%)`;
        const ga = 0.4 + (fireLit - 35) / 50;
        const shadow = `inset 0 1px 4px rgba(0,0,0,0.3), 0 0 ${fireGlow.toFixed(1)}px rgba(255,${80 + (fireLit - 35) * 2 | 0},0,${ga.toFixed(2)})`;
        for (const el of fireEls) { el.style.background = bg; el.style.boxShadow = shadow; }
      }
    } else {
      firePhase = undefined;
      if (FIRE_FLICKER) {
        for (const el of fireEls) { el.style.background = ""; el.style.boxShadow = ""; }
      }
    }

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
    setGaugeClass("fire-indicator", "indicator fire " + (loco.ignited ? "on" : "off"));
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
      setGaugeValue("boiler-temp", ((loco.boilerTemp - 273.15) / 374) * 100);
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

    const reliefState = loco.reliefValveOpen ? "open" : "closed";
    for (const el of reliefEls) {
      el.classList.toggle("active", el.dataset.relief === reliefState);
    }

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

    if (cachedCoalMin) syncControl("coal-min", "value", cachedCoalMin.value);
    if (cachedCoalMax) syncControl("coal-max", "value", cachedCoalMax.value);
    setGaugeText("coal-min-text", cachedCoalMin ? ` ${cachedCoalMin.value}%` : "");
    setGaugeText("coal-max-text", cachedCoalMax ? ` ${cachedCoalMax.value}%` : "");

    const trainMass = cfg.locomotiveMass + loco.numCars * cfg.carMass
      + loco.boilerWaterMass + loco.tenderCoal + loco.tenderWater;
    setGaugeText("train-mass", fmt(mL(trainMass), 1));

    // Motion
    const spdVal = spd(loco.velocity);
    setGaugeValue("speed-bar", Math.min(100, spdVal.v));
    setGaugeText("speed-text", fmt(spdVal, 1));
    const distVal = d(loco.distance);
    setGaugeText("distance-text", fmt(distVal, distVal.u === "m" || distVal.u === "ft" ? 0 : 2));
    setGaugeText("te-text", fmt(f(loco.totalTE), 1));
    setGaugeText("applied-te-text", fmt(f(loco.appliedTE), 1));
    for (const el of gaugeAll("slip-text")) {
      el.className = loco.wheelSlip ? "slip-on" : "slip-off";
    }
    setGaugeText("sand-text", loco.sandDropping ? "active" : "");

    // Clock
    const totalMin = Math.floor(loco.simTime / 60);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    setGaugeText("elapsed-text", `${days}d ${hours}h ${mins}m`);

    const doorSel = loco.manualDoorOpen ? "open" : "closed";
    for (const el of controlAll("door")) {
      if (el.value === doorSel) el.checked = true;
    }
    const doorActual = loco.fireboxDoorOpen ? "open" : "closed";
    for (const el of doorActualEls) {
      el.classList.toggle("active", el.dataset.doorActual === doorActual);
    }
  }

  // Station tab scroll tracking
  const stationIds = [
    "s-train", "s-ignition", "s-raising", "s-clearance", "s-throttle",
    "s-cruise", "s-ash", "s-water", "s-fire", "s-stopping", "s-cooldown",
  ];
  const tabLinks = document.querySelectorAll("#station-tabs a");
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        for (const a of tabLinks) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id);
        }
        const active = document.querySelector("#station-tabs a.active");
        if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }, { rootMargin: "-10% 0px -80% 0px" });

  for (const id of stationIds) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }

  running = true;
  lastTime = performance.now();
  pauseBtn.textContent = "pause";
  requestAnimationFrame(update);
}
