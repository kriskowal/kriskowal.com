import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as steam from './steam.js';

function assertClose(actual, expected, relTol, msg = '') {
  const tolerance = Math.abs(expected) > 0 ? Math.abs(expected) * relTol : relTol;
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= tolerance,
    `${msg}: expected ${expected} ± ${(relTol * 100).toFixed(1)}%, got ${actual} (diff=${diff.toExponential(3)})`,
  );
}

// Reference values from Keenan steam tables (SI units)

describe('psat — saturation pressure', () => {
  it('100°C (373.15 K) → ~101.3 kPa', () => {
    assertClose(steam.psat(373.15), 101.33, 0.005, 'psat at 100°C');
  });

  it('200°C (473.15 K) → ~1554 kPa', () => {
    assertClose(steam.psat(473.15), 1553.8, 0.005, 'psat at 200°C');
  });

  it('300°C (573.15 K) → ~8581 kPa', () => {
    assertClose(steam.psat(573.15), 8581, 0.005, 'psat at 300°C');
  });

  it('increases monotonically with temperature', () => {
    let prev = steam.psat(350);
    for (const T of [400, 450, 500, 550, 600, 640]) {
      const p = steam.psat(T);
      assert.ok(p > prev, `psat(${T}) should exceed psat at lower T`);
      prev = p;
    }
  });
});

describe('rhosatLiq — saturated liquid density', () => {
  it('100°C → ~958 kg/m³', () => {
    assertClose(steam.rhosatLiq(373.15), 958.4, 0.005, 'rhosatLiq at 100°C');
  });

  it('200°C → ~865 kg/m³', () => {
    assertClose(steam.rhosatLiq(473.15), 864.7, 0.005, 'rhosatLiq at 200°C');
  });

  it('decreases with temperature', () => {
    assert.ok(
      steam.rhosatLiq(373.15) > steam.rhosatLiq(473.15),
      'liquid density should decrease as T rises',
    );
  });
});

describe('rhosatVap — saturated vapor density', () => {
  it('100°C → ~0.598 kg/m³', () => {
    assertClose(steam.rhosatVap(373.15), 0.5977, 0.01, 'rhosatVap at 100°C');
  });

  it('200°C → ~7.86 kg/m³', () => {
    assertClose(steam.rhosatVap(473.15), 7.862, 0.02, 'rhosatVap at 200°C');
  });

  it('increases with temperature', () => {
    assert.ok(
      steam.rhosatVap(473.15) > steam.rhosatVap(373.15),
      'vapor density should increase as T rises',
    );
  });

  it('is less than saturated liquid density', () => {
    for (const T of [373.15, 423.15, 473.15, 523.15]) {
      assert.ok(
        steam.rhosatVap(T) < steam.rhosatLiq(T),
        `rhosatVap < rhosatLiq at T=${T}`,
      );
    }
  });
});

describe('props — domain detection', () => {
  it('superheated vapor (rho well below sat vapor)', () => {
    const { x } = steam.props(500, 0.1);
    assert.equal(x, -9);
  });

  it('saturated vapor', () => {
    const rhoV = steam.rhosatVap(373.15);
    const { x } = steam.props(373.15, rhoV);
    assert.equal(x, 1);
  });

  it('two-phase at x ≈ 0.5', () => {
    const T = 373.15;
    const rhoV = steam.rhosatVap(T);
    const rhoL = steam.rhosatLiq(T);
    const vMid = 1 / rhoL + 0.5 * (1 / rhoV - 1 / rhoL);
    const { x } = steam.props(T, 1 / vMid);
    assertClose(x, 0.5, 0.001, 'quality at midpoint');
  });

  it('saturated liquid', () => {
    const rhoL = steam.rhosatLiq(373.15);
    const { x } = steam.props(373.15, rhoL);
    assert.equal(x, 0);
  });

  it('subcooled liquid (rho above sat liquid)', () => {
    const rhoL = steam.rhosatLiq(373.15);
    const { x, p } = steam.props(373.15, rhoL * 1.01);
    assert.equal(x, -1);
    assert.equal(p, -1);
  });
});

describe('props — saturation properties at 100°C', () => {
  const T = 373.15;

  it('saturated liquid enthalpy ≈ 419 kJ/kg', () => {
    const rhoL = steam.rhosatLiq(T);
    const { h } = steam.props(T, rhoL);
    assertClose(h, 419.06, 0.01, 'hf at 100°C');
  });

  it('saturated vapor enthalpy ≈ 2676 kJ/kg', () => {
    const rhoV = steam.rhosatVap(T);
    const { h } = steam.props(T, rhoV);
    assertClose(h, 2676.0, 0.01, 'hg at 100°C');
  });

  it('saturated liquid entropy ≈ 1.307 kJ/(kg·K)', () => {
    const rhoL = steam.rhosatLiq(T);
    const { s } = steam.props(T, rhoL);
    assertClose(s, 1.3069, 0.01, 'sf at 100°C');
  });

  it('saturated vapor entropy ≈ 7.355 kJ/(kg·K)', () => {
    const rhoV = steam.rhosatVap(T);
    const { s } = steam.props(T, rhoV);
    assertClose(s, 7.3554, 0.01, 'sg at 100°C');
  });
});

describe('props — specific volume', () => {
  it('v equals 1/rho', () => {
    const { v } = steam.props(500, 10);
    assert.equal(v, 0.1);
  });
});

describe('props — two-phase interpolation', () => {
  it('enthalpy interpolates linearly with quality', () => {
    const T = 423.15;
    const rhoV = steam.rhosatVap(T);
    const rhoL = steam.rhosatLiq(T);
    const targetX = 0.3;
    const vx = 1 / rhoL + targetX * (1 / rhoV - 1 / rhoL);
    const result = steam.props(T, 1 / vx);

    const hf = steam.props(T, rhoL).h;
    const hg = steam.props(T, rhoV).h;
    assertClose(result.x, targetX, 0.001, 'quality');
    assertClose(result.h, hf + targetX * (hg - hf), 0.001, 'interpolated h');
  });

  it('entropy interpolates linearly with quality', () => {
    const T = 423.15;
    const rhoV = steam.rhosatVap(T);
    const rhoL = steam.rhosatLiq(T);
    const targetX = 0.7;
    const vx = 1 / rhoL + targetX * (1 / rhoV - 1 / rhoL);
    const result = steam.props(T, 1 / vx);

    const sf = steam.props(T, rhoL).s;
    const sg = steam.props(T, rhoV).s;
    assertClose(result.s, sf + targetX * (sg - sf), 0.001, 'interpolated s');
  });

  it('two-phase pressure equals psat', () => {
    const T = 450;
    const rhoV = steam.rhosatVap(T);
    const rhoL = steam.rhosatLiq(T);
    const vx = 1 / rhoL + 0.5 * (1 / rhoV - 1 / rhoL);
    const { p } = steam.props(T, 1 / vx);
    assertClose(p, steam.psat(T), 1e-10, 'two-phase pressure');
  });
});

describe('convenience functions', () => {
  it('quality()', () => assert.equal(steam.quality(500, 0.1), -9));
  it('pressure()', () => assert.equal(steam.pressure(500, 0.1), steam.props(500, 0.1).p));
  it('volume()', () => assert.equal(steam.volume(500, 10), 0.1));
  it('enthalpy()', () => assert.equal(steam.enthalpy(500, 0.1), steam.props(500, 0.1).h));
  it('entropy()', () => assert.equal(steam.entropy(500, 0.1), steam.props(500, 0.1).s));
});

describe('edge cases', () => {
  it('T = 400 K does not produce NaN', () => {
    const rhoV = steam.rhosatVap(400);
    assert.ok(Number.isFinite(rhoV), 'rhosatVap(400) is finite');
    const result = steam.props(400, rhoV);
    for (const key of ['x', 'p', 'v', 'h', 's']) {
      assert.ok(Number.isFinite(result[key]), `props(400, rhoV).${key} is finite`);
    }
  });

  it('saturated properties at multiple temperatures', () => {
    for (const T of [373.15, 400, 423.15, 473.15, 523.15, 573.15]) {
      const rhoV = steam.rhosatVap(T);
      const rhoL = steam.rhosatLiq(T);
      assert.ok(Number.isFinite(rhoV), `rhosatVap finite at T=${T}`);
      assert.ok(Number.isFinite(rhoL), `rhosatLiq finite at T=${T}`);
      assert.ok(rhoV < rhoL, `rhoV < rhoL at T=${T}`);

      const satV = steam.props(T, rhoV);
      const satL = steam.props(T, rhoL);
      assert.ok(satV.h > satL.h, `hg > hf at T=${T}`);
      assert.ok(satV.s > satL.s, `sg > sf at T=${T}`);
    }
  });
});
