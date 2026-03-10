// Crank-slider mechanism, valve gear, and force geometry
// for a steam locomotive simulation.

const { PI, sin, cos, sqrt, acos, atan2, max, min } = Math;

/**
 * Piston displacement from front dead center [m].
 * @param {number} theta - Crank angle [rad] (0 = front dead center)
 * @param {number} crankR - Crank radius [m] (= stroke / 2)
 * @param {number} rodLen - Connecting rod length [m]
 */
export function pistonDisplacement(theta, crankR, rodLen) {
  const lambdaSin = (crankR / rodLen) * sin(theta);
  return crankR * (1 - cos(theta)) + rodLen * (1 - sqrt(1 - lambdaSin ** 2));
}

/**
 * Rate of piston displacement w.r.t. crank angle [m/rad].
 * Piston velocity = pistonVelocityFactor * angularVelocity.
 */
export function pistonVelocityFactor(theta, crankR, rodLen) {
  const lambda = crankR / rodLen;
  const sinT = sin(theta);
  return crankR * sinT * (1 + lambda * cos(theta) / sqrt(1 - (lambda * sinT) ** 2));
}

/**
 * Cylinder volumes for a double-acting cylinder [m³].
 * @param {number} clearanceRatio - Clearance volume / swept volume
 * @returns {{ head: number, crank: number }}
 */
export function cylinderVolumes(theta, bore, stroke, rodLen, clearanceRatio) {
  const area = (PI / 4) * bore ** 2;
  const x = pistonDisplacement(theta, stroke / 2, rodLen);
  const clearanceVol = area * stroke * clearanceRatio;
  return {
    head: area * x + clearanceVol,
    crank: area * (stroke - x) + clearanceVol,
  };
}

/**
 * Compute valve travel and advance angle for a given cutoff setting.
 * Uses long-connecting-rod approximation for the cutoff angle.
 *
 * @param {number} cutoff - Cutoff fraction of stroke (0.05–0.85)
 * @param {number} steamLap - Outside lap [m]
 * @param {number} lead - Valve lead [m]
 * @returns {{ travel: number, advance: number }}
 */
export function valveParams(cutoff, steamLap, lead) {
  const thetaCo = acos(1 - 2 * cutoff);
  const R = steamLap / (steamLap + lead);
  const advance = atan2(sin(thetaCo), R - cos(thetaCo));
  const travel = (2 * (steamLap + lead)) / sin(advance);
  return { travel, advance };
}

/**
 * Valve displacement [m] at a given crank angle.
 * Positive displacement opens head-end steam port.
 */
export function valveDisplacement(theta, travel, advance) {
  return (travel / 2) * sin(theta + advance);
}

/**
 * Steam and exhaust port openings for both ends of a double-acting cylinder.
 * Returns linear opening [m]; multiply by port bar length for flow area.
 *
 * @param {number} v - Valve displacement [m]
 * @param {number} steamLap - Outside lap [m] (positive)
 * @param {number} exhaustLap - Inside lap [m] (negative = exhaust clearance)
 * @param {number} maxOpening - Maximum port opening [m]
 * @returns {{ headSteam: number, headExhaust: number,
 *             crankSteam: number, crankExhaust: number }}
 */
export function portOpenings(v, steamLap, exhaustLap, maxOpening) {
  return {
    headSteam: min(maxOpening, max(0, v - steamLap)),
    headExhaust: min(maxOpening, max(0, -(v + exhaustLap))),
    crankSteam: min(maxOpening, max(0, -v - steamLap)),
    crankExhaust: min(maxOpening, max(0, v + exhaustLap)),
  };
}

/**
 * Tangential force at crank pin [N] from piston force.
 * This is the torque-producing component.
 *
 * @param {number} theta - Crank angle [rad]
 * @param {number} pistonForce - Net force on piston [N]
 * @param {number} crankR - Crank radius [m]
 * @param {number} rodLen - Connecting rod length [m]
 */
export function tangentialCrankForce(theta, pistonForce, crankR, rodLen) {
  const lambda = crankR / rodLen;
  const beta = Math.asin(lambda * sin(theta));
  return pistonForce * sin(theta + beta) / cos(beta);
}

/**
 * Tractive effort at wheel rim [N].
 * @param {number} tangentialForce - Tangential force at crank pin [N]
 * @param {number} crankR - Crank radius [m]
 * @param {number} wheelR - Driving wheel radius [m]
 */
export function tractiveEffort(tangentialForce, crankR, wheelR) {
  return (tangentialForce * crankR) / wheelR;
}
