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
     * Validate physics calculations against known results
     *
     * @returns {Object} Validation results
     */
    static validate() {
        const results = [];

        // Test 1: Schwarzschild (a=0, M=1)
        const schwarzschild = new KerrMetric(1, 0);
        results.push({
            test: 'Schwarzschild event horizon',
            expected: 2,
            actual: schwarzschild.eventHorizonRadius(),
            pass: Math.abs(schwarzschild.eventHorizonRadius() - 2) < EPSILON
        });
        results.push({
            test: 'Schwarzschild ISCO',
            expected: 6,
            actual: schwarzschild.iscoRadius(),
            pass: Math.abs(schwarzschild.iscoRadius() - 6) < EPSILON
        });
        results.push({
            test: 'Schwarzschild photon sphere',
            expected: 3,
            actual: schwarzschild.photonSphereRadius(),
            pass: Math.abs(schwarzschild.photonSphereRadius() - 3) < EPSILON
        });

        // Test 2: Extremal Kerr (a=M=1)
        const extremal = new KerrMetric(1, 0.9999);
        results.push({
            test: 'Extremal Kerr event horizon',
            expected: 1,
            actual: extremal.eventHorizonRadius(),
            pass: Math.abs(extremal.eventHorizonRadius() - 1) < 0.01
        });
        results.push({
            test: 'Extremal Kerr ISCO',
            expected: 1,
            actual: extremal.iscoRadius(),
            pass: Math.abs(extremal.iscoRadius() - 1) < 0.1
        });

        // Test 3: Moderate spin (a=0.5)
        const moderate = new KerrMetric(1, 0.5);
        const expectedHorizon = 1 + Math.sqrt(1 - 0.25);
        results.push({
            test: 'a=0.5 event horizon',
            expected: expectedHorizon,
            actual: moderate.eventHorizonRadius(),
            pass: Math.abs(moderate.eventHorizonRadius() - expectedHorizon) < EPSILON
        });

        return results;
    }
}

// Export singleton for default black hole (M=1, a=0.9)
export const defaultKerrMetric = new KerrMetric(1, 0.9);
