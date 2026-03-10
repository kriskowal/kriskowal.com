// Water/steam thermodynamic properties
// Translated from Keenan et al. equations (TPSI Appendix B.4)
//
// All temperatures in Kelvin, pressures in kPa, densities in kg/m³,
// enthalpies in kJ/kg, entropies in kJ/(kg·K)

const R_H2O = 0.461537266;
const T_c = 647.286;
const T_a = 1000;
const p_c = 22089;
const rho_c = 317;
const EPSILON = 0.0048;

// Saturation pressure coefficients (Eq. S-6)
const F = [
  -7.419242, 0.29721, -0.1155286, 0.008685635, 0.001094098, -0.00439993,
  0.002520658, -0.0005218684,
];
const A_KEENAN = 0.01;
const TP_KEENAN = 338.15;

// Saturated liquid density coefficients (Eq. D-5)
const D = [
  3.6711257, -28.512396, 222.6524, -882.43852, 2000.2765, -2612.2557, 1829.7674,
  -533.5052,
];

// Equation of state terms from TPSI Table Q-2 (Keenan).
// Each entry carries a reference tau/rho, polynomial coefficients in
// (rho - rhoRef)^i, and exponential coefficients in exp(-epsilon*rho)*rho^i.
const TERMS = [
  {
    tauRef: T_a / T_c,
    rhoRef: 634,
    poly: [
      0.029492937, -0.00013213917, 0.00000027464632, -3.6093828e-10,
      3.4218431e-13, -2.4450042e-16, 1.5518535e-19, 5.9728487e-24,
    ],
    exp: [-0.41030848, -0.0004160586],
  },
  {
    tauRef: 2.5,
    rhoRef: 1000,
    poly: [
      -0.005198586, 0.0000077779182, -0.000000033301902, -1.6254622e-11,
      -1.7731074e-13, 1.2748742e-16, 1.3746153e-19, 1.5597836e-22,
    ],
    exp: [0.3373118, -0.00020988866],
  },
  {
    tauRef: 2.5,
    rhoRef: 1000,
    poly: [
      0.0068335354, -0.000026149751, 0.000000065326396, -2.6181978e-11, 0, 0, 0,
      0,
    ],
    exp: [-0.13746618, -0.00073396848],
  },
  {
    tauRef: 2.5,
    rhoRef: 1000,
    poly: [
      -0.0001564104, -0.00000072546108, -9.2734289e-9, 4.312584e-12, 0, 0, 0, 0,
    ],
    exp: [0.0067874983, 0.000010401717],
  },
  {
    tauRef: 2.5,
    rhoRef: 1000,
    poly: [
      -0.0063972405, 0.000026409282, -0.000000047740374, 5.632313e-11, 0, 0, 0,
      0,
    ],
    exp: [0.13687317, 0.0006458188],
  },
  {
    tauRef: 2.5,
    rhoRef: 1000,
    poly: [
      -0.0039661401, 0.000015453061, -0.00000002914247, 2.9568796e-11, 0, 0, 0,
      0,
    ],
    exp: [0.07984797, 0.0003991757],
  },
  {
    tauRef: 2.5,
    rhoRef: 1000,
    poly: [
      -0.00069048554, 0.0000027407416, -0.000000005102807, 3.9636085e-12, 0, 0,
      0, 0,
    ],
    exp: [0.013041253, 0.000071531353],
  },
];

// Psi-zero coefficients (enthalpy datum)
const PSI = [
  1857.065, 3229.12, -419.465, 36.6649, -20.5516, 4.85233, 46, -1011.249,
];
// Psi-zero coefficients (entropy datum — PSI[1] differs)
const PSI_S = [
  1857.065, 41.605, -419.465, 36.6649, -20.5516, 4.85233, 46, -1011.249,
];

/**
 * Saturation pressure [kPa] as a function of temperature [K].
 * Eq. S-6 from TPSI (Keenan).
 */
export function psat(T) {
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += F[i] * (A_KEENAN * (T - TP_KEENAN)) ** i;
  }
  return p_c * Math.exp((T_c / T - 1) * sum);
}

/**
 * Saturated liquid density [kg/m³] as a function of temperature [K].
 * Eq. D-5 from TPSI (Keenan).
 */
export function rhosatLiq(T) {
  let sum = 0;
  for (let j = 0; j < 8; j++) {
    sum += D[j] * (1 - T / T_c) ** ((j + 1) / 3);
  }
  return rho_c * (1 + sum);
}

/**
 * Evaluate the Keenan equation-of-state sums (Eq. Q-2 / TPSI).
 * Returns derived quantities needed for p, h, s calculations.
 */
function multiSums(T, rho, forEntropy) {
  // Avoid 0^0 and 0^(-n) singularities at special density/temperature values
  if (T === 400) T = 400.000001;
  if (rho === 1000) rho = 1000.000001;
  if (rho === 634) rho = 634.000001;

  const psi = forEntropy ? PSI_S : PSI;
  const tau = T_a / T;
  const tauC = T_a / T_c;

  let s17 = 0,
    s17_drho = 0,
    s17_dtau = 0;

  TERMS.forEach(({ tauRef, rhoRef, poly, exp }, j) => {
    let sPoly = 0,
      sPoly_drho = 0;
    const dr = rho - rhoRef;

    for (let i = 0; i < poly.length; i++) {
      sPoly += poly[i] * dr ** i;
      sPoly_drho += poly[i] * i * dr ** (i - 1);
    }

    let sExp = 0,
      sExp_drho = 0;
    const expR = Math.exp(-EPSILON * rho);
    for (let i = 0; i < exp.length; i++) {
      sExp += expR * exp[i] * rho ** i;
      sExp_drho +=
        -EPSILON * expR * exp[i] * rho ** i +
        expR * i * exp[i] * rho ** (i - 1);
    }

    const dt = tau - tauRef;
    const combined = sPoly + sExp;
    s17 += dt ** (j - 1) * combined;
    s17_drho += dt ** (j - 1) * (sPoly_drho + sExp_drho);
    s17_dtau += (j - 1) * dt ** (j - 2) * combined;
  });

  const Q = (tau - tauC) * s17;
  const Q_drho = (tau - tauC) * s17_drho;
  const Q_dtau = (tau - tauC) * s17_dtau + s17;
  const Zc = 1 + rho * Q + rho ** 2 * Q_drho;

  let psi0 = 0,
    psi0_dtau = 0,
    psi0_dT = 0;

  for (let k = 0; k < 6; k++) {
    psi0 += psi[k] * tau ** -k;
    psi0_dtau += -k * psi[k] * tau ** (-k - 1);
    psi0_dT += (k * psi[k] * T ** (k - 1)) / 1000 ** k;
  }

  psi0 += psi[6] * Math.log(T) + (psi[7] * Math.log(T)) / tau;
  psi0_dtau +=
    -psi[6] / tau + (psi[7] / tau ** 2) * (Math.log(tau) - Math.log(1000) - 1);
  const psiTau_dtau = psi0 + psi0_dtau * tau;
  psi0_dT += psi[6] / T + (psi[7] / 1000) * (Math.log(T) + 1);

  return { tau, Q, Q_dtau, Zc, psi_dT: psi0_dT, psiTau_dtau };
}

/** Raw EOS pressure [kPa] — invalid under the vapor dome. */
export function rawPressure(T, rho) {
  const { Zc } = multiSums(T, rho, false);
  return rho * R_H2O * T * Zc;
}

/** Raw EOS enthalpy [kJ/kg] — invalid under the vapor dome. */
export function rawEnthalpy(T, rho) {
  const { tau, Q_dtau, Zc, psiTau_dtau } = multiSums(T, rho, false);
  return R_H2O * T * (rho * tau * Q_dtau + Zc) + psiTau_dtau;
}

/** Raw EOS entropy [kJ/(kg·K)] — invalid under the vapor dome. */
export function rawEntropy(T, rho) {
  const { tau, Q, Q_dtau, psi_dT } = multiSums(T, rho, true);
  return -R_H2O * (Math.log(rho) + rho * Q - rho * tau * Q_dtau) - psi_dT;
}

/**
 * Saturated vapor density [kg/m³] via Newton-Raphson iteration.
 * Uses ideal-gas approximation dp/drho ≈ R·T for the Jacobian.
 */
export function rhosatVap(T) {
  const tol = 1e-8;
  const dpdrho = R_H2O * T;
  const ps = psat(T);
  let rho = 0.01;
  let dp = ps - rawPressure(T, rho);
  let n = 0;

  do {
    rho += dp / dpdrho;
    dp = ps - rawPressure(T, rho);
    if (Math.abs(dp) < tol) break;
    if (Math.abs(dp) > 99000 || n > 9999) return undefined;
    n++;
  } while (true);

  return rho;
}

/**
 * Compute all thermodynamic properties at given T [K] and rho [kg/m³].
 *
 * Returns { x, p, v, h, s } where:
 *   x: quality (-9 = superheated gas, -1 = subcooled liquid, 0–1 = saturation)
 *   p: pressure [kPa] (-1 for subcooled)
 *   v: specific volume [m³/kg]
 *   h: specific enthalpy [kJ/kg]
 *   s: specific entropy [kJ/(kg·K)]
 */
export function props(T, rho) {
  const rhoV = rhosatVap(T);
  const rhoL = rhosatLiq(T);

  if (rho < 0.9999999 * rhoV) {
    // Superheated vapor
    return {
      x: -9,
      p: rawPressure(T, rho),
      v: 1 / rho,
      h: rawEnthalpy(T, rho),
      s: rawEntropy(T, rho),
    };
  }

  if (rho <= 1.0000001 * rhoV) {
    // Saturated vapor
    return {
      x: 1,
      p: psat(T),
      v: 1 / rho,
      h: rawEnthalpy(T, rho),
      s: rawEntropy(T, rho),
    };
  }

  if (rho < 0.9999999 * rhoL) {
    // Two-phase (under the dome)
    const x = (1 / rho - 1 / rhoL) / (1 / rhoV - 1 / rhoL);
    const hf = rawEnthalpy(T, rhoL),
      hg = rawEnthalpy(T, rhoV);
    const sf = rawEntropy(T, rhoL),
      sg = rawEntropy(T, rhoV);
    return {
      x,
      p: psat(T),
      v: 1 / rho,
      h: hf + x * (hg - hf),
      s: sf + x * (sg - sf),
    };
  }

  if (rho <= 1.0000001 * rhoL) {
    // Saturated liquid
    return {
      x: 0,
      p: psat(T),
      v: 1 / rho,
      h: rawEnthalpy(T, rhoL),
      s: rawEntropy(T, rhoL),
    };
  }

  // Subcooled liquid
  return {
    x: -1,
    p: -1,
    v: 1 / rho,
    h: rawEnthalpy(T, rho),
    s: rawEntropy(T, rho),
  };
}

export function quality(T, rho) {
  return props(T, rho).x;
}
export function pressure(T, rho) {
  return props(T, rho).p;
}
export function volume(T, rho) {
  return props(T, rho).v;
}
export function enthalpy(T, rho) {
  return props(T, rho).h;
}
export function entropy(T, rho) {
  return props(T, rho).s;
}
