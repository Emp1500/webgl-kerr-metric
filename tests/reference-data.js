/**
 * Reference Data for Physics Validation (Phase 7)
 *
 * Contains validated reference values from scientific literature for testing
 * the Kerr black hole simulation physics calculations.
 *
 * References:
 * - Kerr, R. P. (1963). Physical Review Letters
 * - Bardeen, J. M., Press, W. H., & Teukolsky, S. A. (1972). ApJ
 * - Cunningham, C. T. & Bardeen, J. M. (1973). ApJ
 * - Novikov, I. D. & Thorne, K. S. (1973). Black Holes
 * - Event Horizon Telescope Collaboration (2019). ApJL
 */

/**
 * Tolerance levels for different types of calculations
 */
export const TOLERANCES = {
    // Analytical exact values (Schwarzschild limits)
    EXACT: 1e-10,

    // Numerical calculations (iterative formulas)
    NUMERICAL: 1e-6,

    // GPU float32 vs CPU float64
    GPU_PARITY: 1e-4,

    // Disk physics (simplified models)
    DISK_PHYSICS: 0.01,  // 1%

    // Near-extremal calculations (numerical instability expected)
    NEAR_EXTREMAL: 0.01,  // 1%

    // Visual comparison (perceptual)
    VISUAL: 0.02  // 2%
};

/**
 * Schwarzschild black hole (a = 0, M = 1)
 * Exact analytical values
 */
export const SCHWARZSCHILD = {
    name: 'Schwarzschild (a=0, M=1)',
    mass: 1.0,
    spin: 0.0,

    // Radii (exact)
    eventHorizon: 2.0,
    innerHorizon: 0.0,
    photonSphere: 3.0,
    isco: 6.0,
    iscoRetrograde: 6.0,  // Same as prograde for a=0

    // Ergosphere coincides with horizon for a=0
    ergosphereEquator: 2.0,
    ergospherePole: 2.0,

    // Frame dragging (zero for non-rotating)
    frameDraggingAtISCO: 0.0,

    // Metric at specific points
    deltaAtHorizon: 0.0,  // Delta = 0 at horizon

    // Reference for tests
    tolerance: TOLERANCES.EXACT,
    source: 'Schwarzschild (1916), exact solution'
};

/**
 * Moderate spin Kerr black hole (a = 0.5M, M = 1)
 * Standard test case
 */
export const KERR_MODERATE = {
    name: 'Kerr moderate spin (a=0.5M, M=1)',
    mass: 1.0,
    spin: 0.5,

    // Radii (calculated from exact formulas)
    eventHorizon: 1.8660254037844386,  // M + sqrt(M^2 - a^2) = 1 + sqrt(0.75)
    innerHorizon: 0.1339745962155614,  // M - sqrt(M^2 - a^2)
    photonSphere: 2.347296355333861,   // Prograde from Bardeen: 2M(1+cos(2/3*acos(-a/M)))
    isco: 4.233002530891624,           // Prograde ISCO
    iscoRetrograde: 7.554724717162369, // Retrograde ISCO

    // Ergosphere
    ergosphereEquator: 2.0,            // Always 2M at equator
    ergospherePole: 1.8660254037844386, // Equals r+ at pole

    // Frame dragging
    frameDraggingAtHorizon: 0.26794919243112264,  // omega_H = a/(2Mr+)

    tolerance: TOLERANCES.NUMERICAL,
    source: 'Bardeen, Press & Teukolsky (1972)'
};

/**
 * High spin Kerr black hole (a = 0.9M, M = 1)
 * Default simulation parameters
 */
export const KERR_HIGH_SPIN = {
    name: 'Kerr high spin (a=0.9M, M=1)',
    mass: 1.0,
    spin: 0.9,

    // Radii
    eventHorizon: 1.4358898943540673,  // M + sqrt(M^2 - a^2) = 1 + sqrt(0.19)
    innerHorizon: 0.5641101056459327,
    photonSphere: 1.5578550083856726,  // Prograde from Bardeen: 2M(1+cos(2/3*acos(-a/M)))
    isco: 2.3208831467498537,          // Prograde ISCO (from Bardeen formula)
    iscoRetrograde: 8.716814692820414, // Retrograde ISCO

    // Ergosphere
    ergosphereEquator: 2.0,
    ergospherePole: 1.4358898943540673,

    // Frame dragging at horizon
    frameDraggingAtHorizon: 0.3135083479763389,

    tolerance: TOLERANCES.NUMERICAL,
    source: 'Bardeen, Press & Teukolsky (1972)'
};

/**
 * Near-extremal Kerr black hole (a = 0.99M, M = 1)
 * Tests numerical stability
 */
export const KERR_NEAR_EXTREMAL = {
    name: 'Kerr near-extremal (a=0.99M, M=1)',
    mass: 1.0,
    spin: 0.99,

    // Radii (higher tolerance due to numerical precision)
    eventHorizon: 1.1410533856282567,  // M + sqrt(M^2 - a^2) = 1 + sqrt(0.0199)
    innerHorizon: 0.8589466143717432,
    photonSphere: 1.1676424738544423,  // Prograde from Bardeen: 2M(1+cos(2/3*acos(-a/M)))
    isco: 1.4545955097246815,          // Approaches M for extremal
    iscoRetrograde: 8.972114629653295,

    // Ergosphere
    ergosphereEquator: 2.0,
    ergospherePole: 1.1410533856282567,

    tolerance: TOLERANCES.NEAR_EXTREMAL,
    source: 'Numerical calculation with high-precision'
};

/**
 * Extremal limit (a → M)
 * Theoretical limit values
 */
export const KERR_EXTREMAL_LIMIT = {
    name: 'Kerr extremal limit (a→M)',
    mass: 1.0,
    spin: 0.9999,

    // Limiting values
    eventHorizon: 1.0,  // Approaches M
    innerHorizon: 1.0,  // Coincides with outer horizon
    isco: 1.0,          // Approaches M
    iscoRetrograde: 9.0, // Approaches 9M

    tolerance: 0.02,  // 2% for extremal limit
    source: 'Bardeen, Press & Teukolsky (1972), eq. 2.21'
};

/**
 * M87* black hole parameters (EHT 2019)
 * For comparison with observations
 */
export const M87_STAR = {
    name: 'M87* (EHT 2019)',
    // Scaled to M=1 for comparison
    mass: 1.0,
    spin: 0.9,  // Estimated a/M ~ 0.9 ± 0.1

    // Shadow diameter in units of M
    // EHT measured 42 ± 3 μas, corresponds to ~11M diameter
    shadowDiameter: 10.8,  // ~5.4M radius × 2

    // Inclination angle
    inclination: 17 * Math.PI / 180,  // 17° from jet axis

    tolerance: 0.1,  // 10% due to measurement uncertainty
    source: 'Event Horizon Telescope Collaboration (2019)'
};

/**
 * Disk physics reference values
 * Based on Novikov-Thorne model
 */
export const DISK_PHYSICS = {
    // Temperature profile shape
    temperatureExponent: 0.75,  // T ~ r^(-3/4) at large r

    // Novikov-Thorne f(r) factor
    noTorqueBoundary: {
        atISCO: 0.0,  // f(r_ISCO) = 0 (no torque condition)
        at2ISCO: 0.293,  // f(2*r_ISCO) ≈ 1 - sqrt(0.5)
    },

    // Orbital velocities at ISCO (Schwarzschild)
    schwarzschildISCOVelocity: 0.5,  // v/c = 0.5 at r=6M

    // Gravitational redshift at ISCO (Schwarzschild)
    schwarzschildISCORedshift: 0.8165,  // sqrt(1 - 2M/6M) = sqrt(2/3)

    tolerance: TOLERANCES.DISK_PHYSICS,
    source: 'Novikov & Thorne (1973)'
};

/**
 * Coordinate transformation test points
 */
export const COORDINATE_TESTS = {
    // Test points for BL ↔ Cartesian conversion
    testPoints: [
        // {bl: [r, theta, phi], cartesian: [x, y, z]}
        { bl: [10, Math.PI/2, 0], cartesian: [10, 0, 0] },  // Equatorial, x-axis
        { bl: [10, Math.PI/2, Math.PI/2], cartesian: [0, 10, 0] },  // Equatorial, y-axis
        { bl: [10, 0, 0], cartesian: [0, 0, 10] },  // North pole
        { bl: [10, Math.PI, 0], cartesian: [0, 0, -10] },  // South pole
    ],

    // Schwarzschild-specific (simpler conversion)
    schwarzschildPoints: [
        { bl: [5, Math.PI/3, Math.PI/4], expected: true },  // General point
    ],

    tolerance: TOLERANCES.NUMERICAL,
    source: 'Coordinate geometry'
};

/**
 * Ergosphere geometry test cases
 */
export const ERGOSPHERE_TESTS = {
    // Test at various theta values for a=0.9M
    thetaTests: [
        { theta: 0, expected: 1.4358898943540673 },  // Pole (equals r+)
        { theta: Math.PI/6, expected: 1.4974 },       // 30°
        { theta: Math.PI/4, expected: 1.6180 },       // 45°
        { theta: Math.PI/3, expected: 1.7824 },       // 60°
        { theta: Math.PI/2, expected: 2.0 },          // Equator (always 2M)
    ],

    tolerance: TOLERANCES.NUMERICAL,
    source: 'Kerr metric ergosphere formula'
};

/**
 * Get all test configurations
 */
export function getAllTestConfigs() {
    return [
        SCHWARZSCHILD,
        KERR_MODERATE,
        KERR_HIGH_SPIN,
        KERR_NEAR_EXTREMAL
    ];
}

/**
 * Get reference value for a specific spin
 * @param {number} spin - Spin parameter a/M
 * @returns {Object} Reference configuration or null
 */
export function getReferenceForSpin(spin) {
    const configs = getAllTestConfigs();
    return configs.find(c => Math.abs(c.spin - spin) < 0.001) || null;
}

/**
 * Calculate expected event horizon radius
 * r+ = M + sqrt(M^2 - a^2)
 */
export function expectedEventHorizon(M, a) {
    return M + Math.sqrt(Math.max(0, M * M - a * a));
}

/**
 * Calculate expected inner horizon radius
 * r- = M - sqrt(M^2 - a^2)
 */
export function expectedInnerHorizon(M, a) {
    return M - Math.sqrt(Math.max(0, M * M - a * a));
}

/**
 * Calculate expected ergosphere radius at theta
 * r_ergo = M + sqrt(M^2 - a^2*cos^2(theta))
 */
export function expectedErgosphere(M, a, theta) {
    const cosTheta = Math.cos(theta);
    return M + Math.sqrt(Math.max(0, M * M - a * a * cosTheta * cosTheta));
}
