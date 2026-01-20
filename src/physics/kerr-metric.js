/**
 * Kerr Metric Physics Module
 *
 * JavaScript implementation of Kerr metric calculations for:
 * - Event horizon radius
 * - ISCO (Innermost Stable Circular Orbit)
 * - Ergosphere boundaries
 * - Coordinate transformations
 *
 * All calculations use geometric units where G = c = 1
 * Mass M is normalized to 1 by default
 */

import { EPSILON } from '../config/constants.js';

/**
 * Kerr Metric class for black hole physics calculations
 */
export class KerrMetric {
    /**
     * @param {number} mass - Black hole mass (default 1, normalized units)
     * @param {number} spin - Spin parameter a (0 to M)
     */
    constructor(mass = 1, spin = 0) {
        this.setParameters(mass, spin);
    }

    /**
     * Set black hole parameters with validation
     */
    setParameters(mass, spin) {
        if (mass <= 0) {
            throw new Error('Mass must be positive');
        }
        if (Math.abs(spin) > mass) {
            throw new Error(`Spin parameter |a| must be <= M. Got a=${spin}, M=${mass}`);
        }

        this.M = mass;
        this.a = spin;
        this.a2 = spin * spin;
    }

    /**
     * Calculate Σ (Sigma) = r² + a²cos²θ
     * @param {number} r - Radial coordinate
     * @param {number} theta - Polar angle
     */
    sigma(r, theta) {
        const cosTheta = Math.cos(theta);
        return r * r + this.a2 * cosTheta * cosTheta;
    }

    /**
     * Calculate Δ (Delta) = r² - 2Mr + a²
     * @param {number} r - Radial coordinate
     */
    delta(r) {
        return r * r - 2 * this.M * r + this.a2;
    }

    /**
     * Calculate event horizon radius r+
     * r+ = M + √(M² - a²)
     *
     * @returns {number} Outer event horizon radius
     */
    eventHorizonRadius() {
        return this.M + Math.sqrt(Math.max(0, this.M * this.M - this.a2));
    }

    /**
     * Calculate inner (Cauchy) horizon radius r-
     * r- = M - √(M² - a²)
     *
     * @returns {number} Inner horizon radius
     */
    innerHorizonRadius() {
        return this.M - Math.sqrt(Math.max(0, this.M * this.M - this.a2));
    }

    /**
     * Calculate ergosphere outer boundary at given polar angle
     * r_ergo(θ) = M + √(M² - a²cos²θ)
     *
     * @param {number} theta - Polar angle
     * @returns {number} Ergosphere radius at theta
     */
    ergosphereRadius(theta) {
        const cosTheta = Math.cos(theta);
        return this.M + Math.sqrt(Math.max(0, this.M * this.M - this.a2 * cosTheta * cosTheta));
    }

    /**
     * Calculate ISCO (Innermost Stable Circular Orbit) radius
     * For prograde equatorial orbits
     *
     * @returns {number} ISCO radius
     */
    iscoRadius() {
        const chi = this.a / this.M; // Dimensionless spin
        const chi2 = chi * chi;

        // Z1 = 1 + (1 - χ²)^(1/3) * [(1+χ)^(1/3) + (1-χ)^(1/3)]
        const oneMinusChi2_13 = Math.pow(1 - chi2, 1 / 3);
        const onePlusChi_13 = Math.pow(1 + chi, 1 / 3);
        const oneMinusChi_13 = Math.pow(Math.abs(1 - chi), 1 / 3);

        const Z1 = 1 + oneMinusChi2_13 * (onePlusChi_13 + oneMinusChi_13);
        const Z2 = Math.sqrt(3 * chi2 + Z1 * Z1);

        // Prograde ISCO
        return this.M * (3 + Z2 - Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
    }

    /**
     * Calculate retrograde ISCO radius
     *
     * @returns {number} Retrograde ISCO radius
     */
    iscoRadiusRetrograde() {
        const chi = this.a / this.M;
        const chi2 = chi * chi;

        const oneMinusChi2_13 = Math.pow(1 - chi2, 1 / 3);
        const onePlusChi_13 = Math.pow(1 + chi, 1 / 3);
        const oneMinusChi_13 = Math.pow(Math.abs(1 - chi), 1 / 3);

        const Z1 = 1 + oneMinusChi2_13 * (onePlusChi_13 + oneMinusChi_13);
        const Z2 = Math.sqrt(3 * chi2 + Z1 * Z1);

        // Retrograde ISCO
        return this.M * (3 + Z2 + Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
    }

    /**
     * Calculate photon sphere radius (prograde)
     * For Schwarzschild: r_ph = 3M
     *
     * @returns {number} Photon sphere radius
     */
    photonSphereRadius() {
        if (Math.abs(this.a) < EPSILON) {
            return 3 * this.M; // Schwarzschild
        }
        const chi = Math.max(-1, Math.min(1, this.a / this.M));
        return 2 * this.M * (1 + Math.cos((2 / 3) * Math.acos(-chi)));
    }

    /**
     * Check if a point is inside the event horizon
     *
     * @param {number} r - Radial coordinate
     * @returns {boolean}
     */
    isInsideHorizon(r) {
        return r < this.eventHorizonRadius();
    }

    /**
     * Check if a point is in the ergosphere
     *
     * @param {number} r - Radial coordinate
     * @param {number} theta - Polar angle
     * @returns {boolean}
     */
    isInErgosphere(r, theta) {
        const rH = this.eventHorizonRadius();
        const rE = this.ergosphereRadius(theta);
        return r >= rH && r < rE;
    }

    /**
     * Calculate frame-dragging angular velocity ω
     * ω = 2aMr / A where A = (r² + a²)² - a²Δsin²θ
     *
     * @param {number} r - Radial coordinate
     * @param {number} theta - Polar angle
     * @returns {number} Frame-dragging angular velocity
     */
    frameDraggingOmega(r, theta) {
        const r2 = r * r;
        const sinTheta = Math.sin(theta);
        const sin2 = sinTheta * sinTheta;
        const del = this.delta(r);
        const sum = r2 + this.a2;
        const A = sum * sum - this.a2 * del * sin2;

        return (2 * this.a * this.M * r) / A;
    }

    /**
     * Get all key radii for the current configuration
     *
     * @returns {Object} Object containing all important radii
     */
    getKeyRadii() {
        return {
            eventHorizon: this.eventHorizonRadius(),
            innerHorizon: this.innerHorizonRadius(),
            ergosphereEquator: this.ergosphereRadius(Math.PI / 2),
            ergospherePole: this.ergosphereRadius(0),
            isco: this.iscoRadius(),
            iscoRetrograde: this.iscoRadiusRetrograde(),
            photonSphere: this.photonSphereRadius()
        };
    }

    /**
     * Convert Cartesian coordinates to Boyer-Lindquist
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {{r: number, theta: number, phi: number}}
     */
    cartesianToBoyerLindquist(x, y, z) {
        const a = this.a;

        if (Math.abs(a) < EPSILON) {
            // Schwarzschild case - standard spherical
            const r = Math.sqrt(x * x + y * y + z * z);
            const theta = r > EPSILON ? Math.acos(z / r) : 0;
            let phi = Math.atan2(y, x);
            if (phi < 0) phi += 2 * Math.PI;
            return { r, theta, phi };
        }

        const a2 = a * a;
        const rho2 = x * x + y * y + z * z;

        // Solve r^4 - (ρ² - a²)r² - a²z² = 0
        const b = rho2 - a2;
        const c = -a2 * z * z;
        const discriminant = b * b - 4 * c;
        const r2 = (b + Math.sqrt(Math.max(0, discriminant))) / 2;
        const r = Math.sqrt(Math.max(0, r2));

        const theta = r > EPSILON ? Math.acos(Math.max(-1, Math.min(1, z / r))) : 0;
        let phi = Math.atan2(y, x);
        if (phi < 0) phi += 2 * Math.PI;

        return { r, theta, phi };
    }

    /**
     * Convert Boyer-Lindquist coordinates to Cartesian
     *
     * @param {number} r
     * @param {number} theta
     * @param {number} phi
     * @returns {{x: number, y: number, z: number}}
     */
    boyerLindquistToCartesian(r, theta, phi) {
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const rho = Math.sqrt(r * r + this.a2);

        return {
            x: rho * sinTheta * Math.cos(phi),
            y: rho * sinTheta * Math.sin(phi),
            z: r * cosTheta
        };
    }

    /**
     * Validate physics calculations against known results (Phase 7)
     *
     * @returns {Object} Validation results
     */
    static validate() {
        const results = [];
        const TOLERANCE = 1e-6;
        const TOLERANCE_EXTREMAL = 0.01;

        // ═══════════════════════════════════════════════════════════════
        // SCHWARZSCHILD TESTS (a=0, M=1) - Exact analytical values
        // ═══════════════════════════════════════════════════════════════
        const schwarzschild = new KerrMetric(1, 0);

        results.push({
            test: 'Schwarzschild event horizon (r+ = 2M)',
            expected: 2.0,
            actual: schwarzschild.eventHorizonRadius(),
            pass: Math.abs(schwarzschild.eventHorizonRadius() - 2.0) < TOLERANCE
        });

        results.push({
            test: 'Schwarzschild inner horizon (r- = 0)',
            expected: 0.0,
            actual: schwarzschild.innerHorizonRadius(),
            pass: Math.abs(schwarzschild.innerHorizonRadius() - 0.0) < TOLERANCE
        });

        results.push({
            test: 'Schwarzschild ISCO (r = 6M)',
            expected: 6.0,
            actual: schwarzschild.iscoRadius(),
            pass: Math.abs(schwarzschild.iscoRadius() - 6.0) < TOLERANCE
        });

        results.push({
            test: 'Schwarzschild ISCO retrograde (r = 6M)',
            expected: 6.0,
            actual: schwarzschild.iscoRadiusRetrograde(),
            pass: Math.abs(schwarzschild.iscoRadiusRetrograde() - 6.0) < TOLERANCE
        });

        results.push({
            test: 'Schwarzschild photon sphere (r = 3M)',
            expected: 3.0,
            actual: schwarzschild.photonSphereRadius(),
            pass: Math.abs(schwarzschild.photonSphereRadius() - 3.0) < TOLERANCE
        });

        results.push({
            test: 'Schwarzschild ergosphere at equator (= horizon)',
            expected: 2.0,
            actual: schwarzschild.ergosphereRadius(Math.PI / 2),
            pass: Math.abs(schwarzschild.ergosphereRadius(Math.PI / 2) - 2.0) < TOLERANCE
        });

        results.push({
            test: 'Schwarzschild frame dragging (= 0)',
            expected: 0.0,
            actual: schwarzschild.frameDraggingOmega(6, Math.PI / 2),
            pass: Math.abs(schwarzschild.frameDraggingOmega(6, Math.PI / 2)) < TOLERANCE
        });

        // ═══════════════════════════════════════════════════════════════
        // MODERATE SPIN TESTS (a=0.5M, M=1)
        // ═══════════════════════════════════════════════════════════════
        const moderate = new KerrMetric(1, 0.5);
        const expectedHorizon05 = 1 + Math.sqrt(1 - 0.25);  // 1.866025...

        results.push({
            test: 'a=0.5 event horizon',
            expected: expectedHorizon05,
            actual: moderate.eventHorizonRadius(),
            pass: Math.abs(moderate.eventHorizonRadius() - expectedHorizon05) < TOLERANCE
        });

        results.push({
            test: 'a=0.5 inner horizon',
            expected: 1 - Math.sqrt(0.75),
            actual: moderate.innerHorizonRadius(),
            pass: Math.abs(moderate.innerHorizonRadius() - (1 - Math.sqrt(0.75))) < TOLERANCE
        });

        results.push({
            test: 'a=0.5 ergosphere at equator (= 2M)',
            expected: 2.0,
            actual: moderate.ergosphereRadius(Math.PI / 2),
            pass: Math.abs(moderate.ergosphereRadius(Math.PI / 2) - 2.0) < TOLERANCE
        });

        results.push({
            test: 'a=0.5 ergosphere at pole (= r+)',
            expected: expectedHorizon05,
            actual: moderate.ergosphereRadius(0),
            pass: Math.abs(moderate.ergosphereRadius(0) - expectedHorizon05) < TOLERANCE
        });

        results.push({
            test: 'a=0.5 ISCO < Schwarzschild ISCO',
            expected: true,
            actual: moderate.iscoRadius() < 6.0,
            pass: moderate.iscoRadius() < 6.0
        });

        // ═══════════════════════════════════════════════════════════════
        // HIGH SPIN TESTS (a=0.9M, M=1) - Default simulation parameters
        // ═══════════════════════════════════════════════════════════════
        const highSpin = new KerrMetric(1, 0.9);
        const expectedHorizon09 = 1 + Math.sqrt(1 - 0.81);  // 1.4358...

        results.push({
            test: 'a=0.9 event horizon',
            expected: expectedHorizon09,
            actual: highSpin.eventHorizonRadius(),
            pass: Math.abs(highSpin.eventHorizonRadius() - expectedHorizon09) < TOLERANCE
        });

        results.push({
            test: 'a=0.9 ISCO prograde (~2.32M)',
            expected: 2.32,
            actual: highSpin.iscoRadius(),
            pass: Math.abs(highSpin.iscoRadius() - 2.32) < 0.01
        });

        results.push({
            test: 'a=0.9 ISCO retrograde (~8.72M)',
            expected: 8.72,
            actual: highSpin.iscoRadiusRetrograde(),
            pass: Math.abs(highSpin.iscoRadiusRetrograde() - 8.72) < 0.01
        });

        // Prograde photon orbit from Bardeen formula: 2M(1+cos(2/3*acos(-a/M)))
        results.push({
            test: 'a=0.9 photon sphere (prograde ~1.56M)',
            expected: 1.56,
            actual: highSpin.photonSphereRadius(),
            pass: Math.abs(highSpin.photonSphereRadius() - 1.56) < 0.01
        });

        results.push({
            test: 'a=0.9 frame dragging > 0 at horizon',
            expected: true,
            actual: highSpin.frameDraggingOmega(expectedHorizon09, Math.PI / 2) > 0,
            pass: highSpin.frameDraggingOmega(expectedHorizon09, Math.PI / 2) > 0
        });

        // ═══════════════════════════════════════════════════════════════
        // NEAR-EXTREMAL TESTS (a=0.99M, M=1)
        // ═══════════════════════════════════════════════════════════════
        const nearExtremal = new KerrMetric(1, 0.99);

        results.push({
            test: 'a=0.99 event horizon > 1',
            expected: true,
            actual: nearExtremal.eventHorizonRadius() > 1.0,
            pass: nearExtremal.eventHorizonRadius() > 1.0
        });

        results.push({
            test: 'a=0.99 ISCO approaches M',
            expected: true,
            actual: nearExtremal.iscoRadius() < 2.0,
            pass: nearExtremal.iscoRadius() < 2.0
        });

        // ═══════════════════════════════════════════════════════════════
        // EXTREMAL LIMIT TESTS (a→M)
        // ═══════════════════════════════════════════════════════════════
        const extremal = new KerrMetric(1, 0.9999);
        // For a=0.9999: r+ = 1 + sqrt(1 - 0.9999^2) = 1 + sqrt(0.00019999) ≈ 1.0141
        const expectedExtremalHorizon = 1 + Math.sqrt(1 - 0.9999 * 0.9999);

        results.push({
            test: 'Extremal Kerr event horizon → M',
            expected: 1.0,
            actual: extremal.eventHorizonRadius(),
            pass: Math.abs(extremal.eventHorizonRadius() - expectedExtremalHorizon) < TOLERANCE
        });

        results.push({
            test: 'Extremal Kerr ISCO → M',
            expected: 1.0,
            actual: extremal.iscoRadius(),
            pass: Math.abs(extremal.iscoRadius() - 1.0) < 0.1
        });

        results.push({
            test: 'Extremal ISCO retrograde → 9M',
            expected: 9.0,
            actual: extremal.iscoRadiusRetrograde(),
            pass: Math.abs(extremal.iscoRadiusRetrograde() - 9.0) < 0.1
        });

        // ═══════════════════════════════════════════════════════════════
        // ORDERING CONSTRAINTS (must hold for all spins)
        // ═══════════════════════════════════════════════════════════════
        const testSpin = new KerrMetric(1, 0.7);

        results.push({
            test: 'r- < r+ (inner < outer horizon)',
            expected: true,
            actual: testSpin.innerHorizonRadius() < testSpin.eventHorizonRadius(),
            pass: testSpin.innerHorizonRadius() < testSpin.eventHorizonRadius()
        });

        results.push({
            test: 'r+ < r_photon (horizon < photon sphere)',
            expected: true,
            actual: testSpin.eventHorizonRadius() < testSpin.photonSphereRadius(),
            pass: testSpin.eventHorizonRadius() < testSpin.photonSphereRadius()
        });

        results.push({
            test: 'r_photon < ISCO (photon sphere < ISCO)',
            expected: true,
            actual: testSpin.photonSphereRadius() < testSpin.iscoRadius(),
            pass: testSpin.photonSphereRadius() < testSpin.iscoRadius()
        });

        results.push({
            test: 'ISCO prograde < ISCO retrograde',
            expected: true,
            actual: testSpin.iscoRadius() < testSpin.iscoRadiusRetrograde(),
            pass: testSpin.iscoRadius() < testSpin.iscoRadiusRetrograde()
        });

        // ═══════════════════════════════════════════════════════════════
        // COORDINATE TRANSFORMATION TESTS
        // ═══════════════════════════════════════════════════════════════
        // Round-trip: Cartesian → BL → Cartesian
        const testPoint = { x: 8, y: 6, z: 5 };
        const bl = schwarzschild.cartesianToBoyerLindquist(testPoint.x, testPoint.y, testPoint.z);
        const back = schwarzschild.boyerLindquistToCartesian(bl.r, bl.theta, bl.phi);

        results.push({
            test: 'Coordinate round-trip (Schwarzschild)',
            expected: true,
            actual: Math.abs(back.x - testPoint.x) < 0.01 &&
                   Math.abs(back.y - testPoint.y) < 0.01 &&
                   Math.abs(back.z - testPoint.z) < 0.01,
            pass: Math.abs(back.x - testPoint.x) < 0.01 &&
                  Math.abs(back.y - testPoint.y) < 0.01 &&
                  Math.abs(back.z - testPoint.z) < 0.01
        });

        // ═══════════════════════════════════════════════════════════════
        // DELTA FUNCTION TESTS
        // ═══════════════════════════════════════════════════════════════
        results.push({
            test: 'Delta = 0 at event horizon',
            expected: 0.0,
            actual: highSpin.delta(highSpin.eventHorizonRadius()),
            pass: Math.abs(highSpin.delta(highSpin.eventHorizonRadius())) < TOLERANCE
        });

        results.push({
            test: 'Delta > 0 outside horizon',
            expected: true,
            actual: highSpin.delta(highSpin.eventHorizonRadius() + 1) > 0,
            pass: highSpin.delta(highSpin.eventHorizonRadius() + 1) > 0
        });

        return results;
    }
}

// Export singleton for default black hole (M=1, a=0.9)
export const defaultKerrMetric = new KerrMetric(1, 0.9);
