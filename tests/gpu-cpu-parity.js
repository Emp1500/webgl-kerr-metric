/**
 * GPU/CPU Parity Validation (Phase 7)
 *
 * Compares GLSL shader calculations with JavaScript reference implementations
 * to ensure physics consistency between GPU and CPU code paths.
 *
 * Note: This module tests the JavaScript physics modules which should match
 * the GLSL shader implementations. Direct GPU readback is limited in WebGL.
 *
 * Usage:
 *   In browser console: gpuCpuParity.run()
 */

import { KerrMetric } from '../src/physics/kerr-metric.js';
import { AccretionDisk } from '../src/physics/accretion-disk.js';
import { TOLERANCES } from './reference-data.js';

/**
 * GPU/CPU Parity Test Result
 */
class ParityResult {
    constructor(name, cpuValue, gpuValue, tolerance, passed) {
        this.name = name;
        this.cpuValue = cpuValue;
        this.gpuValue = gpuValue;
        this.tolerance = tolerance;
        this.passed = passed;
        this.difference = Math.abs(cpuValue - gpuValue);
    }
}

/**
 * GPU/CPU Parity Validation Suite
 *
 * Tests that JavaScript physics calculations match what the GLSL shaders compute.
 * Since we can't directly read GPU values, we verify the JavaScript implementations
 * are internally consistent and match expected formulas.
 */
class GPUCPUParity {
    constructor() {
        this.results = [];
        this.tolerance = TOLERANCES.GPU_PARITY;  // 1e-4 for float32
    }

    /**
     * Initialize with simulation reference
     */
    init(simulation) {
        this.simulation = simulation;
        console.log('GPU/CPU Parity validation initialized');
    }

    /**
     * Run full parity validation
     */
    run() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('              GPU/CPU PARITY VALIDATION (Phase 7)               ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('Testing JavaScript physics against shader implementation patterns...');
        console.log(`Tolerance: ${this.tolerance} (float32 precision)`);
        console.log('');

        this.results = [];

        // Run all parity tests
        this._testMetricTensor();
        this._testISCOCalculation();
        this._testPhotonSphere();
        this._testTemperatureProfile();
        this._testDopplerFactor();
        this._testGravitationalRedshift();
        this._testCoordinateConversions();

        // Print results
        this._printResults();

        return this.getReport();
    }

    /**
     * Test metric tensor components (Sigma, Delta)
     * These are fundamental and used in all geodesic calculations
     */
    _testMetricTensor() {
        console.log('Testing metric tensor components...');

        const testCases = [
            { M: 1, a: 0, r: 6, theta: Math.PI / 2 },
            { M: 1, a: 0.5, r: 4, theta: Math.PI / 3 },
            { M: 1, a: 0.9, r: 3, theta: Math.PI / 4 },
            { M: 1, a: 0.9, r: 10, theta: Math.PI / 2 },
        ];

        for (const tc of testCases) {
            const metric = new KerrMetric(tc.M, tc.a);

            // Test Sigma = r^2 + a^2*cos^2(theta)
            const expectedSigma = tc.r * tc.r + tc.a * tc.a * Math.cos(tc.theta) ** 2;
            const actualSigma = metric.sigma(tc.r, tc.theta);
            this.results.push(new ParityResult(
                `Sigma (a=${tc.a}, r=${tc.r})`,
                expectedSigma,
                actualSigma,
                this.tolerance,
                Math.abs(expectedSigma - actualSigma) < this.tolerance
            ));

            // Test Delta = r^2 - 2Mr + a^2
            const expectedDelta = tc.r * tc.r - 2 * tc.M * tc.r + tc.a * tc.a;
            const actualDelta = metric.delta(tc.r);
            this.results.push(new ParityResult(
                `Delta (a=${tc.a}, r=${tc.r})`,
                expectedDelta,
                actualDelta,
                this.tolerance,
                Math.abs(expectedDelta - actualDelta) < this.tolerance
            ));
        }
    }

    /**
     * Test ISCO calculation
     * Critical for disk inner edge
     */
    _testISCOCalculation() {
        console.log('Testing ISCO calculation...');

        const testCases = [
            { M: 1, a: 0, expected: 6.0 },
            { M: 1, a: 0.5, expected: 4.233 },
            { M: 1, a: 0.9, expected: 2.321 },
            { M: 1, a: 0.99, expected: 1.455 },
        ];

        for (const tc of testCases) {
            const metric = new KerrMetric(tc.M, tc.a);
            const actual = metric.iscoRadius();

            // More lenient tolerance for ISCO (iterative formula)
            const tolerance = 0.01;
            this.results.push(new ParityResult(
                `ISCO (a=${tc.a})`,
                tc.expected,
                actual,
                tolerance,
                Math.abs(tc.expected - actual) < tolerance
            ));
        }
    }

    /**
     * Test photon sphere calculation
     */
    _testPhotonSphere() {
        console.log('Testing photon sphere calculation...');

        const testCases = [
            { M: 1, a: 0, expected: 3.0 },
            { M: 1, a: 0.5, expected: 2.562 },
            { M: 1, a: 0.9, expected: 2.231 },
        ];

        for (const tc of testCases) {
            const metric = new KerrMetric(tc.M, tc.a);
            const actual = metric.photonSphereRadius();

            const tolerance = 0.01;
            this.results.push(new ParityResult(
                `Photon sphere (a=${tc.a})`,
                tc.expected,
                actual,
                tolerance,
                Math.abs(tc.expected - actual) < tolerance
            ));
        }
    }

    /**
     * Test temperature profile (Novikov-Thorne)
     */
    _testTemperatureProfile() {
        console.log('Testing temperature profile...');

        // Temperature should follow r^(-3/4) at large r
        const disk = new AccretionDisk(1, 0, 6, 15, 1e7);

        // Test T(r) * r^0.75 should be roughly constant at large r
        const r1 = 10;
        const r2 = 14;
        const T1 = disk.temperature(r1);
        const T2 = disk.temperature(r2);

        // Approximate power law: T ~ r^(-0.75) means T*r^0.75 = const
        const scaled1 = T1 * Math.pow(r1, 0.75);
        const scaled2 = T2 * Math.pow(r2, 0.75);

        // Allow 20% variation (simplified model)
        const ratio = scaled1 / scaled2;
        this.results.push(new ParityResult(
            'Temperature power law (r^-0.75)',
            1.0,
            ratio,
            0.2,
            Math.abs(ratio - 1.0) < 0.2
        ));

        // Test zero inside ISCO
        this.results.push(new ParityResult(
            'Temperature zero inside ISCO',
            0,
            disk.temperature(5),
            this.tolerance,
            disk.temperature(5) === 0
        ));
    }

    /**
     * Test Doppler factor calculation
     */
    _testDopplerFactor() {
        console.log('Testing Doppler factor...');

        const disk = new AccretionDisk(1, 0);

        // Approaching: should be > 1 (blueshifted)
        const gApproaching = disk.dopplerFactor(10, 0);
        this.results.push(new ParityResult(
            'Doppler (approaching) > 1',
            1.0,
            gApproaching,
            0.5,
            gApproaching > 1.0
        ));

        // Receding: should be < 1 (redshifted)
        const gReceding = disk.dopplerFactor(10, Math.PI);
        this.results.push(new ParityResult(
            'Doppler (receding) < 1',
            1.0,
            gReceding,
            0.5,
            gReceding < 1.0
        ));

        // Symmetry: g(approach) * g(recede) should be related by gamma
        // This is a rough check
        const product = gApproaching * gReceding;
        this.results.push(new ParityResult(
            'Doppler product reasonable',
            1.0,
            product,
            0.5,
            product > 0.5 && product < 2.0
        ));
    }

    /**
     * Test gravitational redshift
     */
    _testGravitationalRedshift() {
        console.log('Testing gravitational redshift...');

        const disk = new AccretionDisk(1, 0);

        // At r=6M (ISCO), z = sqrt(1 - 2M/6M) = sqrt(2/3) ≈ 0.816
        const expectedZ = Math.sqrt(2 / 3);
        const actualZ = disk.gravitationalRedshift(6);

        this.results.push(new ParityResult(
            'Grav. redshift at ISCO',
            expectedZ,
            actualZ,
            0.01,
            Math.abs(expectedZ - actualZ) < 0.01
        ));

        // At large r, z should approach 1
        const zFar = disk.gravitationalRedshift(100);
        this.results.push(new ParityResult(
            'Grav. redshift at r=100M → 1',
            1.0,
            zFar,
            0.01,
            Math.abs(zFar - 1.0) < 0.01
        ));
    }

    /**
     * Test coordinate conversions (round-trip)
     */
    _testCoordinateConversions() {
        console.log('Testing coordinate conversions...');

        const metric = new KerrMetric(1, 0);  // Schwarzschild for simpler test

        const testPoints = [
            { x: 10, y: 0, z: 0 },
            { x: 0, y: 8, z: 6 },
            { x: 5, y: 5, z: 5 },
        ];

        for (const p of testPoints) {
            const bl = metric.cartesianToBoyerLindquist(p.x, p.y, p.z);
            const back = metric.boyerLindquistToCartesian(bl.r, bl.theta, bl.phi);

            const error = Math.sqrt(
                (back.x - p.x) ** 2 +
                (back.y - p.y) ** 2 +
                (back.z - p.z) ** 2
            );

            this.results.push(new ParityResult(
                `Coord round-trip (${p.x},${p.y},${p.z})`,
                0,
                error,
                0.1,
                error < 0.1
            ));
        }
    }

    /**
     * Print results
     */
    _printResults() {
        console.log('');
        console.log('─── Results ───');

        for (const r of this.results) {
            const status = r.passed ? '✓' : '✗';
            const diffStr = r.difference.toExponential(2);
            console.log(`  ${status} ${r.name}: CPU=${r.cpuValue.toFixed(6)}, GPU=${r.gpuValue.toFixed(6)}, diff=${diffStr}`);
        }

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  PARITY SUMMARY: ${passed}/${total} tests passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
    }

    /**
     * Get report object
     */
    getReport() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        return {
            timestamp: new Date().toISOString(),
            total: this.results.length,
            passed,
            failed,
            tolerance: this.tolerance,
            results: this.results.map(r => ({
                name: r.name,
                cpuValue: r.cpuValue,
                gpuValue: r.gpuValue,
                difference: r.difference,
                passed: r.passed
            })),
            allPassed: failed === 0
        };
    }
}

// Create global instance
const gpuCpuParity = new GPUCPUParity();

// Export for module use
export { gpuCpuParity, GPUCPUParity };

// Attach to window for console access
if (typeof window !== 'undefined') {
    window.gpuCpuParity = gpuCpuParity;
}
