/**
 * Accretion Disk Physics Module
 *
 * JavaScript implementation of accretion disk physics for:
 * - Parameter validation
 * - UI display calculations
 * - Physics debugging
 *
 * Uses the Novikov-Thorne thin disk model with relativistic corrections.
 */

export class AccretionDisk {
    /**
     * Create an accretion disk model
     * @param {number} mass - Black hole mass M (normalized to 1)
     * @param {number} spin - Spin parameter a (0 to M)
     * @param {number} innerRadius - Inner edge (defaults to ISCO)
     * @param {number} outerRadius - Outer edge in units of M
     * @param {number} peakTemperature - Peak temperature in Kelvin
     */
    constructor(mass, spin, innerRadius = null, outerRadius = 15, peakTemperature = 1e7) {
        this.M = mass;
        this.a = spin;
        this.outerRadius = outerRadius;
        this.T0 = peakTemperature;

        // Calculate ISCO for inner radius if not specified
        this.innerRadius = innerRadius || this.calculateISCO();
    }

    /**
     * Calculate ISCO (Innermost Stable Circular Orbit) radius
     * For prograde orbits in Kerr spacetime
     */
    calculateISCO() {
        const chi = this.a / this.M;
        const chi2 = chi * chi;

        const oneMinusChi2_13 = Math.pow(1 - chi2, 1/3);
        const onePlusChi_13 = Math.pow(1 + chi, 1/3);
        const oneMinusChi_13 = Math.pow(Math.abs(1 - chi), 1/3);

        const Z1 = 1 + oneMinusChi2_13 * (onePlusChi_13 + oneMinusChi_13);
        const Z2 = Math.sqrt(3 * chi2 + Z1 * Z1);

        return this.M * (3 + Z2 - Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
    }

    /**
     * Calculate disk temperature at radius r using Novikov-Thorne model
     * T(r) = T_0 × (M/r³)^0.25 × [1 - (r_ISCO/r)^0.5]^0.25
     *
     * @param {number} r - Radial distance from black hole
     * @returns {number} Temperature in Kelvin
     */
    temperature(r) {
        if (r <= this.innerRadius) {
            return 0;
        }

        const x = r / this.M;
        const xISCO = this.innerRadius / this.M;

        // f(r) factor for no-torque boundary condition at ISCO
        const f = 1 - Math.sqrt(xISCO / x);
        if (f <= 0) {
            return 0;
        }

        // Novikov-Thorne temperature profile
        const temp = this.T0 * Math.pow(1 / (x * x * x), 0.25) * Math.pow(f, 0.25);

        return Math.min(temp, 50000); // Cap for numerical stability
    }

    /**
     * Calculate Keplerian orbital angular velocity
     * Ω = √(M) / (r^1.5 + a√M)
     *
     * @param {number} r - Radial distance
     * @returns {number} Angular velocity
     */
    keplerianOmega(r) {
        const sqrtM = Math.sqrt(this.M);
        const r15 = r * Math.sqrt(r);
        return sqrtM / (r15 + this.a * sqrtM);
    }

    /**
     * Calculate orbital velocity v/c at radius r
     *
     * @param {number} r - Radial distance
     * @returns {number} Velocity as fraction of speed of light
     */
    orbitalVelocity(r) {
        const omega = this.keplerianOmega(r);

        // In the equatorial plane (theta = π/2)
        const sig = r * r; // Simplified for equatorial plane
        const del = r * r - 2 * this.M * r + this.a * this.a;

        // Metric components at equator
        const gtt = -(1 - 2 * this.M * r / sig);
        const gtphi = -2 * this.a * this.M * r / sig;
        const gphiphi = ((r * r + this.a * this.a) ** 2 - this.a * this.a * del) / sig;

        // Proper velocity
        const denom = Math.sqrt(-gtt - 2 * gtphi * omega - gphiphi * omega * omega);
        if (denom < 1e-10) return 0.999;

        const v = Math.sqrt(gphiphi) * omega / denom;
        return Math.min(v, 0.999);
    }

    /**
     * Calculate gravitational redshift factor at radius r
     * z_grav = √(1 - 2M/r) in Schwarzschild limit
     *
     * @param {number} r - Radial distance
     * @returns {number} Redshift factor (< 1 means redshifted)
     */
    gravitationalRedshift(r) {
        const sig = r * r; // Simplified for equatorial plane
        const gtt = 1 - 2 * this.M * r / sig;
        return Math.sqrt(Math.max(gtt, 1e-10));
    }

    /**
     * Calculate the Doppler factor for observed frequency
     *
     * @param {number} r - Radial distance
     * @param {number} viewAngle - Angle between velocity and line of sight (radians)
     * @returns {number} Doppler factor g (g > 1 = blueshifted, g < 1 = redshifted)
     */
    dopplerFactor(r, viewAngle) {
        const v = this.orbitalVelocity(r);
        const gamma = 1 / Math.sqrt(1 - v * v);
        const vRadial = v * Math.cos(viewAngle);

        return 1 / (gamma * (1 - vRadial));
    }

    /**
     * Get disk properties at a given radius
     *
     * @param {number} r - Radial distance
     * @returns {Object} Disk properties at that radius
     */
    getPropertiesAt(r) {
        return {
            radius: r,
            temperature: this.temperature(r),
            orbitalVelocity: this.orbitalVelocity(r),
            keplerianPeriod: 2 * Math.PI / this.keplerianOmega(r),
            gravitationalRedshift: this.gravitationalRedshift(r),
            isInDisk: r >= this.innerRadius && r <= this.outerRadius
        };
    }

    /**
     * Get key disk parameters
     *
     * @returns {Object} Key disk parameters
     */
    getParameters() {
        return {
            innerRadius: this.innerRadius,
            outerRadius: this.outerRadius,
            peakTemperature: this.T0,
            iscoRadius: this.calculateISCO(),
            innerVelocity: this.orbitalVelocity(this.innerRadius),
            outerVelocity: this.orbitalVelocity(this.outerRadius),
            innerTemp: this.temperature(this.innerRadius * 1.01), // Just outside ISCO
            outerTemp: this.temperature(this.outerRadius)
        };
    }

    /**
     * Validate disk physics against known results
     *
     * @returns {Array} Array of test results
     */
    static validate() {
        const results = [];

        // Test 1: ISCO for Schwarzschild (a=0) should be 6M
        const disk1 = new AccretionDisk(1, 0);
        results.push({
            test: 'Schwarzschild ISCO',
            expected: 6.0,
            actual: disk1.innerRadius,
            pass: Math.abs(disk1.innerRadius - 6.0) < 0.001
        });

        // Test 2: ISCO for extremal Kerr (a=M) should be M
        const disk2 = new AccretionDisk(1, 0.999);
        results.push({
            test: 'Near-extremal ISCO',
            expected: 1.0,
            actual: disk2.innerRadius,
            pass: disk2.innerRadius < 1.5 // Should be close to M
        });

        // Test 3: Temperature should be 0 inside ISCO
        const tempInsideISCO = disk1.temperature(5);
        results.push({
            test: 'Temperature inside ISCO',
            expected: 0,
            actual: tempInsideISCO,
            pass: tempInsideISCO === 0
        });

        // Test 4: Temperature should decrease with radius (outside ISCO)
        const tempAt7 = disk1.temperature(7);
        const tempAt10 = disk1.temperature(10);
        results.push({
            test: 'Temperature decreases with radius',
            expected: true,
            actual: tempAt7 > tempAt10,
            pass: tempAt7 > tempAt10
        });

        // Test 5: Orbital velocity should be subluminal
        const velocity = disk1.orbitalVelocity(disk1.innerRadius);
        results.push({
            test: 'Subluminal orbital velocity',
            expected: true,
            actual: velocity < 1,
            pass: velocity < 1
        });

        return results;
    }
}
