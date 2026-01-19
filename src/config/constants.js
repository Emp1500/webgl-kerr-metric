/**
 * Physical constants for black hole simulation
 * All values in SI units unless otherwise noted
 */

// Fundamental constants
export const SPEED_OF_LIGHT = 299792458; // m/s
export const GRAVITATIONAL_CONSTANT = 6.67430e-11; // m³/(kg·s²)
export const SOLAR_MASS = 1.989e30; // kg

// Derived constants
export const SCHWARZSCHILD_RADIUS_PER_SOLAR_MASS =
    (2 * GRAVITATIONAL_CONSTANT * SOLAR_MASS) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT); // ~2954 m

// Geometric units (G = c = 1)
// In these units, mass has dimension of length
// r_s = 2M (Schwarzschild radius equals twice the mass)
export const GEOMETRIC_UNITS = {
    G: 1,
    c: 1
};

/**
 * Convert mass in solar masses to geometric units
 * In geometric units, M_sun ≈ 1477 meters
 */
export function solarMassToGeometric(solarMasses) {
    return solarMasses * SCHWARZSCHILD_RADIUS_PER_SOLAR_MASS / 2;
}

/**
 * For visualization, we normalize everything to M = 1
 * This means:
 * - Schwarzschild radius r_s = 2M = 2
 * - Event horizon (Schwarzschild) r+ = 2
 * - Photon sphere (Schwarzschild) r_ph = 3
 * - ISCO (Schwarzschild) r_ISCO = 6
 */
export const NORMALIZED_UNITS = {
    M: 1, // Mass normalized to 1
    SCHWARZSCHILD_RADIUS: 2,
    PHOTON_SPHERE_RADIUS: 3,
    ISCO_RADIUS: 6
};

// Numerical precision
export const EPSILON = 1e-6;
export const PI = Math.PI;
export const TWO_PI = 2 * Math.PI;
