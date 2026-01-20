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

        // Cap at peak temperature for numerical stability (but preserve monotonicity)
        return Math.min(temp, this.T0);
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
     * Validate disk physics against known results (Phase 7)
     *
     * @returns {Array} Array of test results
     */
    static validate() {
        const results = [];
        const TOLERANCE = 0.01;  // 1% tolerance for disk physics

        // ═══════════════════════════════════════════════════════════════
        // ISCO TESTS
        // ═══════════════════════════════════════════════════════════════
        const diskSchwarzschild = new AccretionDisk(1, 0);

        results.push({
            test: 'Schwarzschild ISCO = 6M',
            expected: 6.0,
            actual: diskSchwarzschild.innerRadius,
            pass: Math.abs(diskSchwarzschild.innerRadius - 6.0) < 0.001
        });

        const diskModerate = new AccretionDisk(1, 0.5);
        results.push({
            test: 'a=0.5 ISCO < Schwarzschild',
            expected: true,
            actual: diskModerate.innerRadius < 6.0,
            pass: diskModerate.innerRadius < 6.0
        });

        const diskHighSpin = new AccretionDisk(1, 0.9);
        results.push({
            test: 'a=0.9 ISCO (~2.32M)',
            expected: 2.32,
            actual: diskHighSpin.innerRadius,
            pass: Math.abs(diskHighSpin.innerRadius - 2.32) < 0.01
        });

        const diskNearExtremal = new AccretionDisk(1, 0.999);
        results.push({
            test: 'Near-extremal ISCO approaches M',
            expected: true,
            actual: diskNearExtremal.innerRadius < 1.5,
            pass: diskNearExtremal.innerRadius < 1.5
        });

        // ═══════════════════════════════════════════════════════════════
        // TEMPERATURE PROFILE TESTS (Novikov-Thorne model)
        // ═══════════════════════════════════════════════════════════════
        results.push({
            test: 'Temperature = 0 inside ISCO',
            expected: 0,
            actual: diskSchwarzschild.temperature(5),  // r=5M < ISCO=6M
            pass: diskSchwarzschild.temperature(5) === 0
        });

        results.push({
            test: 'Temperature = 0 at ISCO',
            expected: 0,
            actual: diskSchwarzschild.temperature(6),  // r=ISCO
            pass: diskSchwarzschild.temperature(6) === 0
        });

        results.push({
            test: 'Temperature > 0 just outside ISCO',
            expected: true,
            actual: diskSchwarzschild.temperature(6.5) > 0,
            pass: diskSchwarzschild.temperature(6.5) > 0
        });

        // Novikov-Thorne temperature profile has a peak, then decreases at large r
        // T ~ r^(-3/4) * f(r)^0.25 where f(r) = 1 - sqrt(r_ISCO/r)
        // The f factor dominates near ISCO causing T to increase initially
        const tempAt10 = diskSchwarzschild.temperature(10);
        const tempAt15 = diskSchwarzschild.temperature(15);
        const tempAt20 = diskSchwarzschild.temperature(20);

        // Temperature should decrease at large radii (well past the peak)
        results.push({
            test: 'Temperature decreases at large r: T(10M) > T(15M)',
            expected: true,
            actual: tempAt10 > tempAt15,
            pass: tempAt10 > tempAt15
        });

        results.push({
            test: 'Temperature decreases at large r: T(15M) > T(20M)',
            expected: true,
            actual: tempAt15 > tempAt20,
            pass: tempAt15 > tempAt20
        });

        // Temperature should be positive in disk region
        results.push({
            test: 'Temperature positive in disk',
            expected: true,
            actual: tempAt10 > 0 && tempAt15 > 0 && tempAt20 > 0,
            pass: tempAt10 > 0 && tempAt15 > 0 && tempAt20 > 0
        });

        // ═══════════════════════════════════════════════════════════════
        // ORBITAL VELOCITY TESTS
        // ═══════════════════════════════════════════════════════════════
        const velocityAtISCO = diskSchwarzschild.orbitalVelocity(6);
        const velocityAt10M = diskSchwarzschild.orbitalVelocity(10);
        const velocityAt15M = diskSchwarzschild.orbitalVelocity(15);

        results.push({
            test: 'Orbital velocity subluminal at ISCO',
            expected: true,
            actual: velocityAtISCO < 1.0,
            pass: velocityAtISCO < 1.0
        });

        results.push({
            test: 'Orbital velocity positive',
            expected: true,
            actual: velocityAtISCO > 0 && velocityAt10M > 0,
            pass: velocityAtISCO > 0 && velocityAt10M > 0
        });

        results.push({
            test: 'Velocity decreases with radius',
            expected: true,
            actual: velocityAtISCO > velocityAt10M && velocityAt10M > velocityAt15M,
            pass: velocityAtISCO > velocityAt10M && velocityAt10M > velocityAt15M
        });

        // Schwarzschild ISCO velocity should be ~0.5c
        results.push({
            test: 'Schwarzschild ISCO velocity (~0.5c)',
            expected: 0.5,
            actual: velocityAtISCO,
            pass: Math.abs(velocityAtISCO - 0.5) < 0.1
        });

        // High spin ISCO should have higher velocity
        const velocityHighSpin = diskHighSpin.orbitalVelocity(diskHighSpin.innerRadius);
        results.push({
            test: 'High spin ISCO velocity > Schwarzschild',
            expected: true,
            actual: velocityHighSpin > velocityAtISCO,
            pass: velocityHighSpin > velocityAtISCO
        });

        results.push({
            test: 'High spin ISCO velocity still subluminal',
            expected: true,
            actual: velocityHighSpin < 1.0,
            pass: velocityHighSpin < 1.0
        });

        // ═══════════════════════════════════════════════════════════════
        // GRAVITATIONAL REDSHIFT TESTS
        // ═══════════════════════════════════════════════════════════════
        const redshiftAtISCO = diskSchwarzschild.gravitationalRedshift(6);
        const redshiftAt10M = diskSchwarzschild.gravitationalRedshift(10);

        results.push({
            test: 'Redshift factor in (0, 1] at ISCO',
            expected: true,
            actual: redshiftAtISCO > 0 && redshiftAtISCO <= 1,
            pass: redshiftAtISCO > 0 && redshiftAtISCO <= 1
        });

        // Schwarzschild ISCO redshift should be sqrt(2/3) ≈ 0.816
        results.push({
            test: 'Schwarzschild ISCO redshift (~0.816)',
            expected: Math.sqrt(2/3),
            actual: redshiftAtISCO,
            pass: Math.abs(redshiftAtISCO - Math.sqrt(2/3)) < TOLERANCE
        });

        results.push({
            test: 'Redshift increases with radius (less redshift far away)',
            expected: true,
            actual: redshiftAt10M > redshiftAtISCO,
            pass: redshiftAt10M > redshiftAtISCO
        });

        // ═══════════════════════════════════════════════════════════════
        // DOPPLER FACTOR TESTS
        // ═══════════════════════════════════════════════════════════════
        // Approaching side (viewAngle = 0) should be blueshifted (g > 1)
        const dopplerApproaching = diskSchwarzschild.dopplerFactor(10, 0);
        results.push({
            test: 'Approaching gas blueshifted (g > 1)',
            expected: true,
            actual: dopplerApproaching > 1.0,
            pass: dopplerApproaching > 1.0
        });

        // Receding side (viewAngle = π) should be redshifted (g < 1)
        const dopplerReceding = diskSchwarzschild.dopplerFactor(10, Math.PI);
        results.push({
            test: 'Receding gas redshifted (g < 1)',
            expected: true,
            actual: dopplerReceding < 1.0,
            pass: dopplerReceding < 1.0
        });

        // Transverse (viewAngle = π/2) should show transverse Doppler (g < 1 due to time dilation)
        const dopplerTransverse = diskSchwarzschild.dopplerFactor(10, Math.PI / 2);
        results.push({
            test: 'Transverse Doppler factor reasonable',
            expected: true,
            actual: dopplerTransverse > 0.5 && dopplerTransverse < 1.5,
            pass: dopplerTransverse > 0.5 && dopplerTransverse < 1.5
        });

        // ═══════════════════════════════════════════════════════════════
        // KEPLERIAN ANGULAR VELOCITY TESTS
        // ═══════════════════════════════════════════════════════════════
        const omegaAt6M = diskSchwarzschild.keplerianOmega(6);
        const omegaAt10M = diskSchwarzschild.keplerianOmega(10);

        results.push({
            test: 'Keplerian Omega positive',
            expected: true,
            actual: omegaAt6M > 0,
            pass: omegaAt6M > 0
        });

        results.push({
            test: 'Keplerian Omega decreases with radius',
            expected: true,
            actual: omegaAt6M > omegaAt10M,
            pass: omegaAt6M > omegaAt10M
        });

        // ═══════════════════════════════════════════════════════════════
        // BOUNDARY CONDITION TESTS
        // ═══════════════════════════════════════════════════════════════
        results.push({
            test: 'Inner radius > 0',
            expected: true,
            actual: diskHighSpin.innerRadius > 0,
            pass: diskHighSpin.innerRadius > 0
        });

        results.push({
            test: 'Inner radius < outer radius',
            expected: true,
            actual: diskHighSpin.innerRadius < diskHighSpin.outerRadius,
            pass: diskHighSpin.innerRadius < diskHighSpin.outerRadius
        });

        return results;
    }
}
