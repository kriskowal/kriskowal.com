import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Locomotive, simulate, DEFAULTS } from "./locomotive.js";

function assertNear(actual, expected, absTol, msg = "") {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= absTol,
    `${msg}: expected ${expected} ± ${absTol}, got ${actual} (diff=${diff.toExponential(3)})`,
  );
}

/** Start a locomotive with fire lit, coal loaded, hot boiler, and throttle open. */
function hotLoco(overrides = {}) {
  const loco = new Locomotive({ boilerTemp: 473.15, fireboxInitialCoal: DEFAULTS.fireboxMaxCoal, ...overrides });
  loco.ignite();
  loco.manualDoorOpen = true;
  loco.throttle = 1;
  return loco;
}

describe("Locomotive construction", () => {
  it("initializes with default config", () => {
    const loco = new Locomotive();
    assert.equal(loco.boilerTemp, 300, "boiler starts at ambient");
    assert.ok(loco.boilerWaterMass > 0, "has water");
    assert.equal(loco.velocity, 0, "starts stationary");
    assertNear(loco.crankAngle, Math.PI / 4, 1e-15, "starts offset from dead center");
  });

  it("accepts config overrides", () => {
    const loco = new Locomotive({ locomotiveMass: 50000 });
    assert.equal(loco.cfg.locomotiveMass, 50000);
    assert.equal(loco.cfg.bore, DEFAULTS.bore); // unchanged
  });

  it("has tender state", () => {
    const loco = new Locomotive();
    assert.equal(loco.tenderCoal, DEFAULTS.tenderCoal);
    assert.equal(loco.tenderWater, DEFAULTS.tenderWater);
    assert.equal(loco.fireboxCoal, DEFAULTS.fireboxInitialCoal);
    assert.equal(loco.ignited, false);
  });

  it("has control properties", () => {
    const loco = new Locomotive();
    assert.equal(loco.throttle, 0);
    assert.equal(loco.johnsonBar, 1 / 3); // forward, ~25% cutoff
    assert.equal(loco.fireboxDoorOpen, false);
    assert.equal(loco.injectorValve, 0);
  });
});

describe("Firebox and tender", () => {
  it("shoveling moves coal from tender to firebox over time", () => {
    const loco = new Locomotive();
    const tenderBefore = loco.tenderCoal;
    const fireboxBefore = loco.fireboxCoal;
    loco.coalMax = 1; // keep auto-shoveling from overriding
    loco.shoveling = true;
    for (let i = 0; i < 100; i++) loco.step(0.01); // 1 second
    const moved = loco.fireboxCoal - fireboxBefore;
    assert.ok(moved > 0, "coal should transfer");
    // Coal is also being burned if ignited, but loco is not ignited here
    assertNear(moved, DEFAULTS.shovelRate * 1.0, 0.01, "≈ shovelRate × time");
    assertNear(loco.tenderCoal, tenderBefore - moved, 1e-6, "tender decreases");
    assert.equal(loco.shoveling, true, "still shoveling");
  });

  it("shoveling stops when firebox full", () => {
    // Not ignited so no coal burns — firebox fills up and shoveling stops
    const loco = new Locomotive({ fireboxInitialCoal: 299.5, fireboxMaxCoal: 300 });
    loco.coalMax = 1;
    loco.shoveling = true;
    for (let i = 0; i < 200; i++) loco.step(0.01); // 2 seconds, plenty of time for 0.5 kg
    assert.equal(loco.shoveling, false);
    assertNear(loco.fireboxCoal, 300, 0.01, "firebox at capacity");
  });

  it("shoveling stops when tender empty", () => {
    const loco = new Locomotive({ tenderCoal: 0.1 });
    loco.coalMax = 1;
    loco.shoveling = true;
    for (let i = 0; i < 100; i++) loco.step(0.01);
    assert.equal(loco.shoveling, false);
    assertNear(loco.tenderCoal, 0, 0.001, "tender exhausted");
  });

  it("auto-shoveling starts when coalMax is set and coal is below min", () => {
    const loco = new Locomotive(); // fireboxInitialCoal = 0
    assert.equal(loco.shoveling, false, "not shoveling initially");

    // Set coalMax only (min stays 0) — fireman should begin shoveling
    loco.coalMax = 0.5;
    loco.step(0.01);
    assert.equal(loco.shoveling, true, "fireman starts shoveling when coal below min");
    assert.equal(loco.fireboxDoorOpen, true, "door opens for shoveling");

    // Run until firebox reaches 50%
    for (let i = 0; i < 100000; i++) {
      loco.step(0.01);
      if (!loco.shoveling) break;
    }
    assert.equal(loco.shoveling, false, "fireman stops at coalMax");
    const frac = loco.fireboxCoal / DEFAULTS.fireboxMaxCoal;
    assert.ok(frac >= 0.49, `coal fraction should be near 50%, got ${(frac * 100).toFixed(1)}%`);
  });

  it("auto-shoveling uses hysteresis between min and max", () => {
    const max = DEFAULTS.fireboxMaxCoal;
    const loco = new Locomotive({ fireboxInitialCoal: max * 0.33 });
    loco.coalMin = 0.3;
    loco.coalMax = 0.8;

    // At 33% (above min) — should not start shoveling
    loco.step(0.01);
    assert.equal(loco.shoveling, false, "above min, no shoveling");

    // Raise min above current level to trigger shoveling
    loco.coalMin = 0.5;
    loco.step(0.01);
    assert.equal(loco.shoveling, true, "below min, shoveling starts");
  });

  it("auto-shoveling disabled when coalMax is 0", () => {
    const loco = new Locomotive(); // empty firebox
    loco.coalMax = 0;
    loco.coalMin = 0;
    loco.step(0.01);
    assert.equal(loco.shoveling, false, "no auto-shoveling when max=0");
  });

  it("ignite lights the fire", () => {
    const loco = new Locomotive({ fireboxInitialCoal: 50 });
    assert.equal(loco.ignited, false);
    loco.ignite();
    assert.equal(loco.ignited, true);
  });

  it("ignite does nothing with no coal", () => {
    const loco = new Locomotive();
    loco.ignite();
    assert.equal(loco.ignited, false);
  });

  it("fire burns coal over time", () => {
    const loco = new Locomotive({ fireboxInitialCoal: 50 });
    loco.ignite();
    const coalBefore = loco.fireboxCoal;
    for (let i = 0; i < 100; i++) {
      loco.step(0.01);
    }
    assert.ok(loco.fireboxCoal < coalBefore, "coal should be consumed");
    assert.ok(loco.burnRate > 0, "burn rate should be positive");
  });

  it("fire goes out when coal runs out", () => {
    // Small firebox so coalFraction ≈ 1 and coal burns quickly
    const loco = new Locomotive({ fireboxInitialCoal: 0.05, fireboxMaxCoal: 0.05 });
    loco.ignite();
    for (let i = 0; i < 300; i++) {
      loco.step(0.01);
    }
    assert.equal(loco.ignited, false);
    assert.equal(loco.burnRate, 0);
  });

  it("door open increases burn rate", () => {
    const loco1 = new Locomotive({ fireboxInitialCoal: 50 });
    loco1.ignite();
    loco1.manualDoorOpen = false;
    loco1.step(0.01);
    const rate1 = loco1.burnRate;

    const loco2 = new Locomotive({ fireboxInitialCoal: 50 });
    loco2.ignite();
    loco2.manualDoorOpen = true;
    loco2.step(0.01);
    const rate2 = loco2.burnRate;

    assert.ok(rate2 > rate1, `open door (${rate2}) should burn faster than closed (${rate1})`);
  });
});

describe("Injector", () => {
  it("catches when valve is in the sweet spot at sufficient pressure", () => {
    const loco = new Locomotive({ boilerTemp: 473.15 });
    const tenderBefore = loco.tenderWater;
    const boilerBefore = loco.boilerWaterMass;
    // Step once to compute catch band, then set valve to center
    loco.step(0.01);
    loco.injectorValve = loco.injectorCatchCenter;
    for (let t = 0; t < 1; t += 0.01) loco.step(0.01);
    assert.ok(loco.injectorActive, "injector should catch in sweet spot");
    assert.ok(loco.tenderWater < tenderBefore, "tender water decreases");
    assert.ok(loco.boilerWaterMass > boilerBefore, "boiler water increases");
  });

  it("does not catch when valve is outside the band", () => {
    const loco = new Locomotive({ boilerTemp: 473.15 });
    loco.step(0.01);
    // Set valve well outside the catch band
    loco.injectorValve = 0.99;
    loco.step(0.1);
    assert.ok(!loco.injectorActive, "injector should not catch outside band");
  });

  it("does not catch at low boiler pressure", () => {
    const loco = new Locomotive({ boilerTemp: 380 });
    loco.injectorValve = 0.5;
    loco.step(0.1);
    assert.ok(!loco.injectorActive, "injector should not catch at low pressure");
  });

  it("knocks off when body overheats from prolonged use", () => {
    const loco = new Locomotive({ boilerTemp: 473.15 });
    loco.step(0.01);
    loco.injectorValve = loco.injectorCatchCenter;
    let everKnockedOff = false;
    for (let t = 0; t < 120; t += 0.05) {
      // Track the drifting catch center to keep the valve in-band
      loco.injectorValve = loco.injectorCatchCenter;
      loco.step(0.05);
      if (!loco.injectorActive && loco.injectorBodyTemp >= loco.cfg.injectorMaxBodyTemp) {
        everKnockedOff = true;
        break;
      }
    }
    assert.ok(everKnockedOff, "injector should knock off from body overheat");
  });

  it("catch band narrows with hot body", () => {
    const loco = new Locomotive({ boilerTemp: 473.15 });
    loco.step(0.01);
    const coldWidth = loco.injectorCatchWidth;
    // Heat up the body near max
    loco.injectorBodyTemp = loco.cfg.injectorMaxBodyTemp - 5;
    loco.step(0.01);
    assert.ok(loco.injectorCatchWidth < coldWidth,
      "catch band should narrow as body heats up");
  });
});

describe("Locomotive.step basics", () => {
  it("does not crash with no ignition (zero heat)", () => {
    const loco = new Locomotive();
    loco.step(0.01);
    assert.ok(Number.isFinite(loco.velocity));
    assert.ok(Number.isFinite(loco.boilerTemp));
  });

  it("does not crash with fire lit and throttle open", () => {
    const loco = hotLoco();
    loco.step(0.01);
    assert.ok(Number.isFinite(loco.velocity));
    assert.ok(Number.isFinite(loco.boilerTemp));
    assert.ok(Number.isFinite(loco.superTemp));
  });

  it("all state values remain finite over multiple steps", () => {
    const loco = hotLoco();
    for (let i = 0; i < 100; i++) {
      loco.step(0.001);
    }
    assert.ok(Number.isFinite(loco.velocity), "velocity finite");
    assert.ok(Number.isFinite(loco.boilerTemp), "boiler temp finite");
    assert.ok(Number.isFinite(loco.superTemp), "super temp finite");
    assert.ok(Number.isFinite(loco.chestTemp), "chest temp finite");
    assert.ok(Number.isFinite(loco.boilerPressure), "boiler pressure finite");
    assert.ok(loco.boilerTemp > 350, "boiler stays hot");
    assert.ok(loco.boilerWaterMass >= 0, "water mass non-negative");
  });
});

describe("Locomotive thermodynamics", () => {
  it("boiler pressure rises with sustained heat", () => {
    const loco = hotLoco({ boilerTemp: 420 });
    const p0 = loco.boilerPressure;
    for (let i = 0; i < 200; i++) {
      loco.step(0.01);
    }
    assert.ok(
      loco.boilerPressure > p0,
      `pressure should rise: ${p0} → ${loco.boilerPressure}`,
    );
  });

  it("boiler water mass decreases as steam is produced", () => {
    const loco = hotLoco();
    const w0 = loco.boilerWaterMass;
    for (let i = 0; i < 200; i++) {
      loco.step(0.01);
    }
    assert.ok(
      loco.boilerWaterMass < w0,
      "water should be consumed",
    );
  });

  it("superheater temperature exceeds boiler temperature", () => {
    const loco = hotLoco();
    for (let i = 0; i < 500; i++) {
      loco.step(0.001);
    }
    assert.ok(
      loco.superTemp >= loco.boilerTemp,
      `superheater (${loco.superTemp.toFixed(1)} K) should be ≥ boiler (${loco.boilerTemp.toFixed(1)} K)`,
    );
  });
});

describe("Locomotive vehicle dynamics", () => {
  it("accelerates from rest with sufficient steam pressure", () => {
    const loco = hotLoco();
    loco.velocity = 0.1;
    for (let i = 0; i < 1000; i++) {
      loco.step(0.001);
    }
    assert.ok(
      loco.velocity > 0.1,
      `should accelerate: v = ${loco.velocity.toFixed(3)} m/s`,
    );
  });

  it("crank angle advances with motion", () => {
    const loco = hotLoco();
    loco.velocity = 5.0;
    const angle0 = loco.crankAngle;
    loco.step(0.1);
    assert.ok(
      loco.crankAngle !== angle0 || loco.distance > 0,
      "crank should turn",
    );
    assert.ok(loco.distance > 0, "distance covered");
  });

  it("distance increases over time", () => {
    const loco = hotLoco();
    loco.velocity = 10.0;
    for (let i = 0; i < 100; i++) {
      loco.step(0.01);
    }
    assert.ok(loco.distance > 0, "should have covered distance");
  });

  it("velocity does not go negative", () => {
    const loco = new Locomotive();
    loco.velocity = 1.0;
    for (let i = 0; i < 1000; i++) {
      loco.step(0.01);
    }
    assert.ok(loco.velocity >= 0, "velocity should not be negative");
  });
});

describe("Locomotive.snapshot", () => {
  it("returns all expected fields", () => {
    const loco = hotLoco();
    loco.step(0.01);
    const snap = loco.snapshot();
    const numericFields = [
      "velocity",
      "velocityKmh",
      "distance",
      "crankAngle",
      "boilerPressure",
      "boilerTemp",
      "boilerWater",
      "manifoldTemp",
      "manifoldDTdt",
      "manifoldStress",
      "superTemp",
      "superPressure",
      "chestTemp",
      "chestPressure",
      "tractiveEffort",
      "appliedTE",
      "steamRate",
      "fireboxHeat",
      "cutoff",
      "throttle",
      "johnsonBar",
      "tenderCoal",
      "tenderWater",
      "fireboxCoal",
      "burnRate",
    ];
    for (const f of numericFields) {
      assert.ok(f in snap, `missing field: ${f}`);
      assert.ok(Number.isFinite(snap[f]), `${f} should be finite: ${snap[f]}`);
    }
    assert.ok("ignited" in snap, "missing field: ignited");
    assert.ok("reliefValveOpen" in snap, "missing field: reliefValveOpen");
    assert.ok("wheelSlip" in snap, "missing field: wheelSlip");
    assert.ok("exploded" in snap, "missing field: exploded");
  });

  it("velocityKmh equals velocity * 3.6", () => {
    const loco = new Locomotive();
    loco.velocity = 10;
    loco.step(0.001);
    const snap = loco.snapshot();
    assertNear(snap.velocityKmh, loco.velocity * 3.6, 1e-10);
  });
});

describe("simulate", () => {
  it("runs a short simulation and returns snapshots", () => {
    const { snapshots, loco } = simulate({
      duration: 0.5,
      dt: 0.005,
      setup: (l) => {
        l.ignite();
        l.manualDoorOpen = true;
        l.throttle = 1;
      },
      snapshotInterval: 0.1,
    });
    assert.ok(snapshots.length > 0, "should have snapshots");
    assert.ok(snapshots[0].time !== undefined, "snapshots have time");
    assert.ok(Number.isFinite(loco.boilerTemp), "loco state is valid");
  });

  it("respects controlSchedule", () => {
    const { loco } = simulate({
      duration: 0.1,
      dt: 0.01,
      setup: (l) => {
        l.ignite();
        l.throttle = 1;
      },
      controlSchedule: (_t, l) => {
        l.johnsonBar = 0.8; // 0.8 x 0.75 = 0.6 cutoff
      },
    });
    assert.equal(loco.johnsonBar, 0.8);
  });

  it("runs without setup or controlSchedule", () => {
    const { loco } = simulate({
      duration: 0.1,
      dt: 0.01,
    });
    assert.equal(loco.johnsonBar, 1 / 3); // default
  });
});

describe("energy conservation sanity", () => {
  it("no energy from nothing: zero heat means no acceleration from rest", () => {
    const loco = new Locomotive({
      boilerTemp: 373.15,
      superheaterTemp: 373.15,
      steamChestTemp: 373.15,
    });
    // Not ignited, throttle=0 — no heat, no steam flow
    for (let i = 0; i < 100; i++) {
      loco.step(0.001);
    }
    assertNear(loco.velocity, 0, 0.01, "should not significantly accelerate");
  });
});

describe("boiler heat loss", () => {
  it("hot boiler cools toward ambient when fire is out", () => {
    const loco = new Locomotive({ boilerTemp: 458 }); // 185°C
    const t0 = loco.boilerTemp;
    // 1 hour, no fire (1s steps)
    for (let i = 0; i < 3600; i++) loco.step(1);
    assert.ok(
      loco.boilerTemp < t0,
      `should cool: ${t0.toFixed(1)} → ${loco.boilerTemp.toFixed(1)} K`,
    );
    assert.ok(
      loco.boilerTemp > DEFAULTS.tAtm,
      "should still be above ambient after 1 hour",
    );
  });

  it("boiler reaches near-ambient after many hours without fire", () => {
    const loco = new Locomotive({ boilerTemp: 458 });
    // 72 hours (1s steps) — time constant ~18 hr, need ~4τ
    for (let i = 0; i < 259200; i++) loco.step(1);
    assertNear(loco.boilerTemp, DEFAULTS.tAtm, 5, "should be near ambient");
  });

  it("cold start reaches operating pressure with sustained fire", () => {
    // Use full firebox to isolate thermal behavior from shoveling mechanics
    const max = DEFAULTS.fireboxMaxCoal;
    const loco = new Locomotive({ fireboxInitialCoal: max });
    loco.ignite();
    loco.manualDoorOpen = true;

    // Target: 100 psig (well below 120 psig relief, but confirms warmup works)
    const targetPsig = 100;

    // Run for up to 6 simulated hours (0.1s steps, refill fuel each step)
    let reached = false;
    let reachedAt = 0;
    for (let t = 0; t < 216000 && !reached; t++) {
      loco.fireboxCoal = max; // keep firebox full
      loco.step(0.1);
      const psig = loco.boilerPressure * 0.14504 - 14.696;
      if (psig >= targetPsig) { reached = true; reachedAt = t * 0.1; }
    }
    assert.ok(reached, `should reach ${targetPsig} psig within 6 hours`);
    // Sanity: should take at least 15 minutes (not instant)
    assert.ok(reachedAt > 900, `should take >15 min, took ${(reachedAt/60).toFixed(0)} min`);
  });
});

describe("Damper and blower", () => {
  it("defaults: damper open, blower off", () => {
    const loco = new Locomotive();
    assert.equal(loco.damper, 1);
    assert.equal(loco.blower, 0);
  });

  it("closing damper reduces burn rate", () => {
    const locoOpen = new Locomotive({ fireboxInitialCoal: 50 });
    locoOpen.ignite();
    locoOpen.manualDoorOpen = true;
    locoOpen.damper = 1;
    locoOpen.step(0.01);
    const rateOpen = locoOpen.burnRate;

    const locoClosed = new Locomotive({ fireboxInitialCoal: 50 });
    locoClosed.ignite();
    locoClosed.manualDoorOpen = true;
    locoClosed.damper = 0.2;
    locoClosed.step(0.01);
    const rateClosed = locoClosed.burnRate;

    assert.ok(rateClosed < rateOpen,
      `damper=0.2 rate (${rateClosed}) should be less than damper=1.0 rate (${rateOpen})`);
  });

  it("fully closing damper extinguishes fire", () => {
    const loco = new Locomotive({ fireboxInitialCoal: 50 });
    loco.ignite();
    loco.damper = 0;
    for (let i = 0; i < 10; i++) loco.step(0.01);
    assert.equal(loco.ignited, false, "fire should go out with damper fully closed");
  });

  it("blower increases burn rate when stationary", () => {
    // Pre-warm both locomotives so the boiler has pressure for the blower jet
    const locoNoBlower = new Locomotive({ fireboxInitialCoal: 50, boilerTemp: 473.15 });
    locoNoBlower.ignite();
    locoNoBlower.manualDoorOpen = true;
    for (let i = 0; i < 200; i++) locoNoBlower.step(0.1);
    locoNoBlower.blower = 0;
    locoNoBlower.step(0.01);
    const rateNoBlower = locoNoBlower.burnRate;

    const locoBlower = new Locomotive({ fireboxInitialCoal: 50, boilerTemp: 473.15 });
    locoBlower.ignite();
    locoBlower.manualDoorOpen = true;
    for (let i = 0; i < 200; i++) locoBlower.step(0.1);
    locoBlower.blower = 1;
    locoBlower.step(0.01);
    const rateBlower = locoBlower.burnRate;

    assert.ok(rateBlower > rateNoBlower,
      `blower rate (${rateBlower}) should exceed no-blower rate (${rateNoBlower})`);
  });

  it("blower consumes steam from superheater", () => {
    // Hot boiler with throttle cracked open to populate the superheater
    const loco = new Locomotive({ boilerTemp: 473.15 });
    loco.throttle = 0.1;
    for (let i = 0; i < 200; i++) loco.step(0.1);
    loco.throttle = 0; // close throttle so no new steam enters super
    const massBefore = loco.superMass;
    assert.ok(massBefore > 0.01, `need superheater steam, got ${massBefore}`);
    loco.blower = 1;
    loco.step(1);
    assert.ok(loco.superMass < massBefore,
      `blower should drain super: before=${massBefore}, after=${loco.superMass}`);
  });

  it("snapshot includes damper and blower", () => {
    const loco = new Locomotive();
    loco.damper = 0.5;
    loco.blower = 0.3;
    loco.step(0.01);
    const snap = loco.snapshot();
    assertNear(snap.damper, 0.5, 1e-6, "damper in snapshot");
    assertNear(snap.blower, 0.3, 1e-6, "blower in snapshot");
  });
});

describe("pistonPosition", () => {
  it("returns finite displacement for each cylinder", () => {
    const loco = new Locomotive();
    for (let i = 0; i < loco.cfg.numCylinders; i++) {
      const pos = loco.pistonPosition(i);
      assert.ok(Number.isFinite(pos), `cylinder ${i} displacement should be finite`);
      assert.ok(pos >= 0, `displacement non-negative`);
      assert.ok(pos <= loco.cfg.stroke, `displacement within stroke`);
    }
  });
});
