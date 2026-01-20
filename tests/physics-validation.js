/**
 * Physics Validation Test Suite (Phase 7)
 *
 * Comprehensive test runner for physics calculations in the Kerr black hole simulation.
 * Tests both KerrMetric and AccretionDisk modules against reference data.
 *
 * Usage:
 *   In browser console: physicsValidation.run()
 *   Or: physicsValidation.runQuick()
 */

import { KerrMetric } from '../src/physics/kerr-metric.js';
import { AccretionDisk } from '../src/physics/accretion-disk.js';
import {
    TOLERANCES,
    SCHWARZSCHILD,
    KERR_MODERATE,
    KERR_HIGH_SPIN,
    KERR_NEAR_EXTREMAL,
    getAllTestConfigs,
    expectedEventHorizon,
    expectedInnerHorizon,
    expectedErgosphere
} from './reference-data.js';

/**
 * Test result structure
 */
class TestResult {
    constructor(category, name, expected, actual, passed, tolerance = null) {
        this.category = category;
        this.name = name;
        this.expected = expected;
        this.actual = actual;
        this.passed = passed;
        this.tolerance = tolerance;
        this.error = passed ? null : Math.abs(expected - actual);
    }
}

/**
 * Physics Validation Suite
 */
class PhysicsValidation {
    constructor() {
        this.results = [];
        this.startTime = 0;
        this.endTime = 0;
    }

    /**
     * Run full validation suite
     */
    run() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('           PHYSICS VALIDATION SUITE (Phase 7)                   ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        this.results = [];
        this.startTime = performance.now();

        // Run all test categories
        this._runKerrMetricTests();
        this._runAccretionDiskTests();
        this._runReferenceDataTests();
        this._runMonotonicityTests();
        this._runBoundaryTests();

        this.endTime = performance.now();

        // Print results
        this._printResults();

        return this.getReport();
    }

    /**
     * Run quick validation (essential tests only)
     */
    runQuick() {
        console.log('Running quick physics validation...');

        this.results = [];
        this.startTime = performance.now();

        // Run built-in validators
        const kerrResults = KerrMetric.validate();
        const diskResults = AccretionDisk.validate();

        // Convert to our format
        kerrResults.forEach(r => {
            this.results.push(new TestResult(
                'KerrMetric',
                r.test,
                r.expected,
                r.actual,
                r.pass
            ));
        });

        diskResults.forEach(r => {
            this.results.push(new TestResult(
                'AccretionDisk',
                r.test,
                r.expected,
                r.actual,
                r.pass
            ));
        });

        this.endTime = performance.now();

        this._printSummary();

        return this.getReport();
    }

    /**
     * Run KerrMetric tests
     */
    _runKerrMetricTests() {
        console.log('Testing KerrMetric...');

        const kerrResults = KerrMetric.validate();
        kerrResults.forEach(r => {
            this.results.push(new TestResult(
                'KerrMetric',
                r.test,
                r.expected,
                r.actual,
                r.pass
            ));
        });
    }

    /**
     * Run AccretionDisk tests
     */
    _runAccretionDiskTests() {
        console.log('Testing AccretionDisk...');

        const diskResults = AccretionDisk.validate();
        diskResults.forEach(r => {
            this.results.push(new TestResult(
                'AccretionDisk',
                r.test,
                r.expected,
                r.actual,
                r.pass
            ));
        });
    }

    /**
     * Run tests against reference data
     */
    _runReferenceDataTests() {
        console.log('Testing against reference data...');

        const configs = getAllTestConfigs();

        for (const config of configs) {
            const metric = new KerrMetric(config.mass, config.spin);

            // Event horizon
            this.results.push(new TestResult(
                'Reference Data',
                `${config.name}: Event Horizon`,
                config.eventHorizon,
                metric.eventHorizonRadius(),
                Math.abs(metric.eventHorizonRadius() - config.eventHorizon) < config.tolerance,
                config.tolerance
            ));

            // Inner horizon
            this.results.push(new TestResult(
                'Reference Data',
                `${config.name}: Inner Horizon`,
                config.innerHorizon,
                metric.innerHorizonRadius(),
                Math.abs(metric.innerHorizonRadius() - config.innerHorizon) < config.tolerance,
                config.tolerance
            ));

            // Photon sphere
            this.results.push(new TestResult(
                'Reference Data',
                `${config.name}: Photon Sphere`,
                config.photonSphere,
                metric.photonSphereRadius(),
                Math.abs(metric.photonSphereRadius() - config.photonSphere) < config.tolerance,
                config.tolerance
            ));

            // ISCO
            this.results.push(new TestResult(
                'Reference Data',
                `${config.name}: ISCO (prograde)`,
                config.isco,
                metric.iscoRadius(),
                Math.abs(metric.iscoRadius() - config.isco) < config.tolerance,
                config.tolerance
            ));

            // Ergosphere at equator
            this.results.push(new TestResult(
                'Reference Data',
                `${config.name}: Ergosphere (equator)`,
                config.ergosphereEquator,
                metric.ergosphereRadius(Math.PI / 2),
                Math.abs(metric.ergosphereRadius(Math.PI / 2) - config.ergosphereEquator) < config.tolerance,
                config.tolerance
            ));
        }
    }

    /**
     * Run monotonicity tests (properties that must vary consistently with spin)
     */
    _runMonotonicityTests() {
        console.log('Testing monotonicity...');

        const spins = [0, 0.3, 0.5, 0.7, 0.9, 0.95, 0.99];
        let prevHorizon = Infinity;
        let prevISCO = Infinity;

        for (const spin of spins) {
            const metric = new KerrMetric(1, spin);
            const horizon = metric.eventHorizonRadius();
            const isco = metric.iscoRadius();

            // Event horizon should decrease with spin
            this.results.push(new TestResult(
                'Monotonicity',
                `r+ decreases: a=${spin}`,
                true,
                horizon < prevHorizon,
                horizon < prevHorizon
            ));

            // ISCO should decrease with spin (prograde)
            this.results.push(new TestResult(
                'Monotonicity',
                `ISCO decreases: a=${spin}`,
                true,
                isco < prevISCO,
                isco < prevISCO
            ));

            prevHorizon = horizon;
            prevISCO = isco;
        }
    }

    /**
     * Run boundary condition tests
     */
    _runBoundaryTests() {
        console.log('Testing boundary conditions...');

        // Test spin > M should throw
        let threwError = false;
        try {
            new KerrMetric(1, 1.5);  // Invalid: a > M
        } catch (e) {
            threwError = true;
        }
        this.results.push(new TestResult(
            'Boundary',
            'spin > M throws error',
            true,
            threwError,
            threwError
        ));

        // Test mass <= 0 should throw
        threwError = false;
        try {
            new KerrMetric(0, 0);  // Invalid: M = 0
        } catch (e) {
            threwError = true;
        }
        this.results.push(new TestResult(
            'Boundary',
            'mass <= 0 throws error',
            true,
            threwError,
            threwError
        ));

        // Test negative spin
        threwError = false;
        try {
            const metric = new KerrMetric(1, -0.5);  // Valid: retrograde
            const horizon = metric.eventHorizonRadius();
            this.results.push(new TestResult(
                'Boundary',
                'negative spin (retrograde) valid',
                true,
                horizon > 0,
                horizon > 0
            ));
        } catch (e) {
            threwError = true;
            this.results.push(new TestResult(
                'Boundary',
                'negative spin (retrograde) valid',
                true,
                false,
                false
            ));
        }
    }

    /**
     * Print detailed results
     */
    _printResults() {
        // Group by category
        const categories = {};
        for (const result of this.results) {
            if (!categories[result.category]) {
                categories[result.category] = [];
            }
            categories[result.category].push(result);
        }

        // Print each category
        for (const [category, results] of Object.entries(categories)) {
            console.log('');
            console.log(`─── ${category} ───`);

            for (const r of results) {
                const status = r.passed ? '✓' : '✗';
                const color = r.passed ? '' : '⚠️ ';
                if (typeof r.expected === 'number' && typeof r.actual === 'number') {
                    console.log(`  ${status} ${color}${r.name}: expected ${r.expected.toFixed(6)}, got ${r.actual.toFixed(6)}`);
                } else {
                    console.log(`  ${status} ${color}${r.name}`);
                }
            }
        }

        this._printSummary();
    }

    /**
     * Print summary
     */
    _printSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const total = this.results.length;
        const duration = (this.endTime - this.startTime).toFixed(2);

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  SUMMARY: ${passed}/${total} tests passed (${failed} failed)`);
        console.log(`  Duration: ${duration}ms`);
        console.log('═══════════════════════════════════════════════════════════════');

        if (failed > 0) {
            console.log('');
            console.log('FAILED TESTS:');
            for (const r of this.results.filter(r => !r.passed)) {
                console.log(`  ✗ [${r.category}] ${r.name}`);
            }
        }

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
            duration: this.endTime - this.startTime,
            total: this.results.length,
            passed,
            failed,
            passRate: (passed / this.results.length * 100).toFixed(1) + '%',
            results: this.results.map(r => ({
                category: r.category,
                name: r.name,
                passed: r.passed,
                expected: r.expected,
                actual: r.actual,
                error: r.error
            })),
            allPassed: failed === 0
        };
    }

    /**
     * Export results as JSON
     */
    exportJSON() {
        const report = this.getReport();
        const json = JSON.stringify(report, null, 2);
        console.log('Physics Validation Report:');
        console.log(json);
        return report;
    }
}

// Create global instance
const physicsValidation = new PhysicsValidation();

// Export for module use
export { physicsValidation, PhysicsValidation };

// Attach to window for console access
if (typeof window !== 'undefined') {
    window.physicsValidation = physicsValidation;
}
