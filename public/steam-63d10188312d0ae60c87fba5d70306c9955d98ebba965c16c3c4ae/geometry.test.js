import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pistonDisplacement,
  pistonVelocityFactor,
  cylinderVolumes,
  valveParams,
  valveDisplacement,
  portOpenings,
  tangentialCrankForce,
  tractiveEffort,
} from "./geometry.js";

const { PI } = Math;

function assertNear(actual, expected, absTol, msg = "") {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= absTol,
    `${msg}: expected ${expected} ± ${absTol}, got ${actual} (diff=${diff.toExponential(3)})`,
  );
}

function assertClose(actual, expected, relTol, msg = "") {
  const tolerance = Math.abs(expected) * relTol;
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= tolerance,
    `${msg}: expected ${expected} ± ${(relTol * 100).toFixed(1)}%, got ${actual}`,
  );
}

// Typical locomotive dimensions
const BORE = 0.508; // 20 inches
const STROKE = 0.711; // 28 inches
const CRANK_R = STROKE / 2;
const ROD_LEN = 1.5;
const CLEARANCE = 0.08;
const AREA = (PI / 4) * BORE ** 2;
const LAMBDA = CRANK_R / ROD_LEN;

describe("pistonDisplacement", () => {
  it("zero at front dead center (θ=0)", () => {
    assertNear(pistonDisplacement(0, CRANK_R, ROD_LEN), 0, 1e-15);
  });

  it("equals stroke at back dead center (θ=π)", () => {
    assertNear(pistonDisplacement(PI, CRANK_R, ROD_LEN), STROKE, 1e-12);
  });

  it("slightly past half-stroke at θ=π/2 (connecting rod effect)", () => {
    const x = pistonDisplacement(PI / 2, CRANK_R, ROD_LEN);
    assert.ok(x > STROKE / 2, "past half-stroke due to rod obliquity");
    assert.ok(x < STROKE * 0.6, "but not excessively past");
  });

  it("increases monotonically from 0 to π", () => {
    let prev = 0;
    for (let theta = 0.01; theta <= PI; theta += 0.01) {
      const x = pistonDisplacement(theta, CRANK_R, ROD_LEN);
      assert.ok(x >= prev, `should increase at θ=${theta.toFixed(2)}`);
      prev = x;
    }
  });

  it("is symmetric about π for the full cycle", () => {
    // x(θ) = x(2π - θ) by symmetry of the mechanism
    for (const theta of [0.3, 0.7, 1.2, 2.0]) {
      assertNear(
        pistonDisplacement(theta, CRANK_R, ROD_LEN),
        pistonDisplacement(2 * PI - theta, CRANK_R, ROD_LEN),
        1e-12,
        `symmetry at θ=${theta}`,
      );
    }
  });
});

describe("pistonVelocityFactor", () => {
  it("zero at dead centers", () => {
    assertNear(pistonVelocityFactor(0, CRANK_R, ROD_LEN), 0, 1e-15, "FDC");
    assertNear(
      pistonVelocityFactor(PI, CRANK_R, ROD_LEN),
      0,
      1e-12,
      "BDC",
    );
  });

  it("approximately crankR at θ=π/2", () => {
    const dxdtheta = pistonVelocityFactor(PI / 2, CRANK_R, ROD_LEN);
    assertClose(dxdtheta, CRANK_R, 0.01, "near crankR at 90°");
  });
});

describe("cylinderVolumes", () => {
  const clearanceVol = AREA * STROKE * CLEARANCE;

  it("head volume equals clearance at FDC", () => {
    const { head } = cylinderVolumes(0, BORE, STROKE, ROD_LEN, CLEARANCE);
    assertNear(head, clearanceVol, 1e-15);
  });

  it("crank volume equals clearance at BDC", () => {
    const { crank } = cylinderVolumes(PI, BORE, STROKE, ROD_LEN, CLEARANCE);
    assertNear(crank, clearanceVol, 1e-12);
  });

  it("head + crank is constant at all angles", () => {
    const expected = AREA * STROKE + 2 * clearanceVol;
    for (const theta of [0, PI / 6, PI / 3, PI / 2, (2 * PI) / 3, PI]) {
      const { head, crank } = cylinderVolumes(
        theta,
        BORE,
        STROKE,
        ROD_LEN,
        CLEARANCE,
      );
      assertNear(head + crank, expected, 1e-12, `θ=${theta.toFixed(2)}`);
    }
  });

  it("head volume at BDC equals swept + clearance", () => {
    const { head } = cylinderVolumes(PI, BORE, STROKE, ROD_LEN, CLEARANCE);
    assertNear(head, AREA * STROKE + clearanceVol, 1e-12);
  });
});

describe("valve gear", () => {
  const steamLap = 0.03;
  const lead = 0.003;
  const exhaustLap = -0.003; // 3mm exhaust clearance

  it("produces correct lead at FDC", () => {
    const { travel, advance } = valveParams(0.25, steamLap, lead);
    const v = valveDisplacement(0, travel, advance);
    assertNear(v, steamLap + lead, 1e-10, "valve opening at FDC");
  });

  it("head steam port closes at cutoff angle", () => {
    for (const cutoff of [0.15, 0.25, 0.4, 0.6, 0.75]) {
      const { travel, advance } = valveParams(cutoff, steamLap, lead);
      const thetaCo = Math.acos(1 - 2 * cutoff);
      const v = valveDisplacement(thetaCo, travel, advance);
      assertNear(v, steamLap, 1e-10, `cutoff=${cutoff}`);
    }
  });

  it("head steam port is open by lead amount at FDC", () => {
    const { travel, advance } = valveParams(0.25, steamLap, lead);
    const v = valveDisplacement(0, travel, advance);
    const ports = portOpenings(v, steamLap, exhaustLap, 0.1);
    assertNear(ports.headSteam, lead, 1e-10);
  });

  it("crank end has same cutoff as head end (symmetric valve)", () => {
    const cutoff = 0.25;
    const { travel, advance } = valveParams(cutoff, steamLap, lead);
    const thetaCo = Math.acos(1 - 2 * cutoff);
    // Crank end steam closes when -v = steamLap, at θ = π + thetaCo
    const v = valveDisplacement(PI + thetaCo, travel, advance);
    assertNear(-v, steamLap, 1e-9, "crank end cutoff");
  });

  it("exhaust and admission never overlap on the same end", () => {
    const { travel, advance } = valveParams(0.25, steamLap, lead);
    for (let theta = 0; theta < 2 * PI; theta += 0.01) {
      const v = valveDisplacement(theta, travel, advance);
      const ports = portOpenings(v, steamLap, exhaustLap, 0.1);
      assert.ok(
        ports.headSteam === 0 || ports.headExhaust === 0,
        `head: steam and exhaust should not both be open at θ=${theta.toFixed(2)}`,
      );
      assert.ok(
        ports.crankSteam === 0 || ports.crankExhaust === 0,
        `crank: steam and exhaust should not both be open at θ=${theta.toFixed(2)}`,
      );
    }
  });

  it("port openings are clamped to maxOpening", () => {
    const { travel, advance } = valveParams(0.5, steamLap, lead);
    // At peak valve displacement, opening could exceed maxOpening
    const vPeak = travel / 2;
    const maxOp = 0.005;
    const ports = portOpenings(vPeak, steamLap, exhaustLap, maxOp);
    assert.equal(ports.headSteam, maxOp);
  });
});

describe("tangentialCrankForce", () => {
  it("zero at dead centers", () => {
    assertNear(tangentialCrankForce(0, 1000, CRANK_R, ROD_LEN), 0, 1e-10, "FDC");
    assertNear(
      tangentialCrankForce(PI, 1000, CRANK_R, ROD_LEN),
      0,
      1e-10,
      "BDC",
    );
  });

  it("equals piston force at θ=π/2", () => {
    // At 90°, sin(θ+β)/cos(β) = cos(β)/cos(β) = 1
    const Ft = tangentialCrankForce(PI / 2, 1000, CRANK_R, ROD_LEN);
    assertNear(Ft, 1000, 1e-10, "tangential = piston at 90°");
  });

  it("reverses sign in second half of revolution", () => {
    const F1 = tangentialCrankForce(PI / 4, 1000, CRANK_R, ROD_LEN);
    const F2 = tangentialCrankForce(PI + PI / 4, 1000, CRANK_R, ROD_LEN);
    assert.ok(F1 > 0, "positive in first half");
    assert.ok(F2 < 0, "negative in second half");
  });
});

describe("tractiveEffort", () => {
  const wheelR = 0.875; // 1.75m diameter

  it("scales force by crank/wheel radius ratio", () => {
    const te = tractiveEffort(10000, CRANK_R, wheelR);
    assertClose(te, 10000 * (CRANK_R / wheelR), 1e-10, "TE scaling");
  });

  it("smaller wheels produce more tractive effort", () => {
    const te1 = tractiveEffort(10000, CRANK_R, 0.5);
    const te2 = tractiveEffort(10000, CRANK_R, 1.0);
    assert.ok(te1 > te2, "smaller wheels = more TE");
  });
});
