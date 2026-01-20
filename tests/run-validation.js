#!/usr/bin/env node
/**
 * Automated Validation Test Runner
 *
 * Runs physics validation tests directly in Node.js (no browser required).
 * The physics modules work without WebGL.
 *
 * Usage:
 *   npm test           # Run full validation suite
 *   npm run test:quick # Run quick validation only
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

function log(message, color = '') {
    console.log(`${color}${message}${colors.reset}`);
}

function logHeader(title) {
    console.log('');
    log('═'.repeat(65), colors.cyan);
    log(`  ${title}`, colors.bright + colors.cyan);
    log('═'.repeat(65), colors.cyan);
    console.log('');
}

function logSection(title) {
    console.log('');
    log(`─── ${title} ───`, colors.dim);
}

const QUICK_MODE = process.argv.includes('--quick');

/**
 * Import physics modules dynamically
 */
async function importModules() {
    const { KerrMetric } = await import('../src/physics/kerr-metric.js');
    const { AccretionDisk } = await import('../src/physics/accretion-disk.js');
    const referenceData = await import('./reference-data.js');

    return { KerrMetric, AccretionDisk, referenceData };
}

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
 * Run KerrMetric validation tests
 */
function runKerrMetricTests(KerrMetric) {
    const results = KerrMetric.validate();
    return results.map(r => new TestResult(
        'KerrMetric',
        r.test,
        r.expected,
        r.actual,
        r.pass
    ));
}

/**
 * Run AccretionDisk validation tests
 */
function runAccretionDiskTests(AccretionDisk) {
    const results = AccretionDisk.validate();
    return results.map(r => new TestResult(
        'AccretionDisk',
        r.test,
        r.expected,
        r.actual,
        r.pass
    ));
}

/**
 * Run reference data tests
 */
function runReferenceDataTests(KerrMetric, referenceData) {
    const results = [];
    const configs = referenceData.getAllTestConfigs();

    for (const config of configs) {
        const metric = new KerrMetric(config.mass, config.spin);

        // Event horizon
        const horizon = metric.eventHorizonRadius();
        results.push(new TestResult(
            'Reference Data',
            `${config.name}: Event Horizon`,
            config.eventHorizon,
            horizon,
            Math.abs(horizon - config.eventHorizon) < config.tolerance,
            config.tolerance
        ));

        // Inner horizon
        const inner = metric.innerHorizonRadius();
        results.push(new TestResult(
            'Reference Data',
            `${config.name}: Inner Horizon`,
            config.innerHorizon,
            inner,
            Math.abs(inner - config.innerHorizon) < config.tolerance,
            config.tolerance
        ));

        // Photon sphere
        const photon = metric.photonSphereRadius();
        results.push(new TestResult(
            'Reference Data',
            `${config.name}: Photon Sphere`,
            config.photonSphere,
            photon,
            Math.abs(photon - config.photonSphere) < config.tolerance,
            config.tolerance
        ));

        // ISCO
        const isco = metric.iscoRadius();
        results.push(new TestResult(
            'Reference Data',
            `${config.name}: ISCO (prograde)`,
            config.isco,
            isco,
            Math.abs(isco - config.isco) < config.tolerance,
            config.tolerance
        ));

        // Ergosphere at equator
        const ergo = metric.ergosphereRadius(Math.PI / 2);
        results.push(new TestResult(
            'Reference Data',
            `${config.name}: Ergosphere (equator)`,
            config.ergosphereEquator,
            ergo,
            Math.abs(ergo - config.ergosphereEquator) < config.tolerance,
            config.tolerance
        ));
    }

    return results;
}

/**
 * Run monotonicity tests
 */
function runMonotonicityTests(KerrMetric) {
    const results = [];
    const spins = [0, 0.3, 0.5, 0.7, 0.9, 0.95, 0.99];
    let prevHorizon = Infinity;
    let prevISCO = Infinity;

    for (const spin of spins) {
        const metric = new KerrMetric(1, spin);
        const horizon = metric.eventHorizonRadius();
        const isco = metric.iscoRadius();

        // Event horizon should decrease with spin
        results.push(new TestResult(
            'Monotonicity',
            `r+ decreases: a=${spin}`,
            true,
            horizon < prevHorizon,
            horizon < prevHorizon
        ));

        // ISCO should decrease with spin (prograde)
        results.push(new TestResult(
            'Monotonicity',
            `ISCO decreases: a=${spin}`,
            true,
            isco < prevISCO,
            isco < prevISCO
        ));

        prevHorizon = horizon;
        prevISCO = isco;
    }

    return results;
}

/**
 * Run boundary condition tests
 */
function runBoundaryTests(KerrMetric) {
    const results = [];

    // Test spin > M should throw
    let threwError = false;
    try {
        new KerrMetric(1, 1.5);  // Invalid: a > M
    } catch (e) {
        threwError = true;
    }
    results.push(new TestResult(
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
    results.push(new TestResult(
        'Boundary',
        'mass <= 0 throws error',
        true,
        threwError,
        threwError
    ));

    // Test negative spin
    try {
        const metric = new KerrMetric(1, -0.5);  // Valid: retrograde
        const horizon = metric.eventHorizonRadius();
        results.push(new TestResult(
            'Boundary',
            'negative spin (retrograde) valid',
            true,
            horizon > 0,
            horizon > 0
        ));
    } catch (e) {
        results.push(new TestResult(
            'Boundary',
            'negative spin (retrograde) valid',
            true,
            false,
            false
        ));
    }

    return results;
}

/**
 * Run GPU/CPU parity tests (what can be tested without GPU)
 */
function runParityTests(KerrMetric, AccretionDisk, referenceData) {
    const results = [];
    const tolerance = referenceData.TOLERANCES.GPU_PARITY;

    // Test metric tensor components
    const testCases = [
        { M: 1, a: 0, r: 6, theta: Math.PI / 2 },
        { M: 1, a: 0.5, r: 4, theta: Math.PI / 3 },
        { M: 1, a: 0.9, r: 3, theta: Math.PI / 4 },
    ];

    for (const tc of testCases) {
        const metric = new KerrMetric(tc.M, tc.a);

        // Test Sigma = r^2 + a^2*cos^2(theta)
        const expectedSigma = tc.r * tc.r + tc.a * tc.a * Math.cos(tc.theta) ** 2;
        const actualSigma = metric.sigma(tc.r, tc.theta);
        results.push(new TestResult(
            'GPU/CPU Parity',
            `Sigma (a=${tc.a}, r=${tc.r})`,
            expectedSigma,
            actualSigma,
            Math.abs(expectedSigma - actualSigma) < tolerance,
            tolerance
        ));

        // Test Delta = r^2 - 2Mr + a^2
        const expectedDelta = tc.r * tc.r - 2 * tc.M * tc.r + tc.a * tc.a;
        const actualDelta = metric.delta(tc.r);
        results.push(new TestResult(
            'GPU/CPU Parity',
            `Delta (a=${tc.a}, r=${tc.r})`,
            expectedDelta,
            actualDelta,
            Math.abs(expectedDelta - actualDelta) < tolerance,
            tolerance
        ));
    }

    // Test temperature profile
    const disk = new AccretionDisk(1, 0, 6, 15, 1e7);

    // Zero inside ISCO
    results.push(new TestResult(
        'GPU/CPU Parity',
        'Temperature zero inside ISCO',
        0,
        disk.temperature(5),
        disk.temperature(5) === 0
    ));

    // Doppler factors
    const gApproaching = disk.dopplerFactor(10, 0);
    results.push(new TestResult(
        'GPU/CPU Parity',
        'Doppler (approaching) > 1',
        true,
        gApproaching > 1.0,
        gApproaching > 1.0
    ));

    const gReceding = disk.dopplerFactor(10, Math.PI);
    results.push(new TestResult(
        'GPU/CPU Parity',
        'Doppler (receding) < 1',
        true,
        gReceding < 1.0,
        gReceding < 1.0
    ));

    // Gravitational redshift at ISCO
    const expectedZ = Math.sqrt(2 / 3);
    const actualZ = disk.gravitationalRedshift(6);
    results.push(new TestResult(
        'GPU/CPU Parity',
        'Grav. redshift at ISCO',
        expectedZ,
        actualZ,
        Math.abs(expectedZ - actualZ) < 0.01,
        0.01
    ));

    // Coordinate round-trip
    const metric = new KerrMetric(1, 0);
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

        results.push(new TestResult(
            'GPU/CPU Parity',
            `Coord round-trip (${p.x},${p.y},${p.z})`,
            0,
            error,
            error < 0.1,
            0.1
        ));
    }

    return results;
}

/**
 * Print results
 */
function printResults(results) {
    // Group by category
    const categories = {};
    for (const result of results) {
        if (!categories[result.category]) {
            categories[result.category] = [];
        }
        categories[result.category].push(result);
    }

    // Print each category
    for (const [category, catResults] of Object.entries(categories)) {
        logSection(category);

        for (const r of catResults) {
            const status = r.passed ? '✓' : '✗';
            const color = r.passed ? colors.green : colors.red;

            if (typeof r.expected === 'number' && typeof r.actual === 'number') {
                log(`  ${status} ${r.name}: expected ${r.expected.toFixed(6)}, got ${r.actual.toFixed(6)}`, color);
            } else {
                log(`  ${status} ${r.name}`, color);
            }
        }
    }

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log('');
    log('═'.repeat(65), colors.cyan);
    const summaryColor = failed === 0 ? colors.green : colors.red;
    log(`  SUMMARY: ${passed}/${total} tests passed (${failed} failed)`, summaryColor + colors.bright);
    log('═'.repeat(65), colors.cyan);

    if (failed > 0) {
        console.log('');
        log('FAILED TESTS:', colors.red);
        for (const r of results.filter(r => !r.passed)) {
            log(`  ✗ [${r.category}] ${r.name}`, colors.red);
        }
    }

    console.log('');

    return failed === 0;
}

/**
 * Main entry point
 */
async function main() {
    logHeader(`KERR BLACK HOLE VALIDATION SUITE ${QUICK_MODE ? '(Quick)' : '(Full)'}`);

    const startTime = performance.now();

    try {
        log('Loading physics modules...', colors.dim);
        const { KerrMetric, AccretionDisk, referenceData } = await importModules();

        let allResults = [];

        // Run core tests
        log('Running KerrMetric tests...', colors.dim);
        allResults = allResults.concat(runKerrMetricTests(KerrMetric));

        log('Running AccretionDisk tests...', colors.dim);
        allResults = allResults.concat(runAccretionDiskTests(AccretionDisk));

        if (!QUICK_MODE) {
            // Full suite
            log('Running reference data tests...', colors.dim);
            allResults = allResults.concat(runReferenceDataTests(KerrMetric, referenceData));

            log('Running monotonicity tests...', colors.dim);
            allResults = allResults.concat(runMonotonicityTests(KerrMetric));

            log('Running boundary tests...', colors.dim);
            allResults = allResults.concat(runBoundaryTests(KerrMetric));

            log('Running GPU/CPU parity tests...', colors.dim);
            allResults = allResults.concat(runParityTests(KerrMetric, AccretionDisk, referenceData));
        }

        const endTime = performance.now();
        const allPassed = printResults(allResults);

        log(`Duration: ${(endTime - startTime).toFixed(2)}ms`, colors.dim);
        console.log('');

        if (allPassed) {
            log('All validation tests passed!', colors.green + colors.bright);
            console.log('');
            log('To run in browser with visual validation:', colors.dim);
            log('  1. Open http://localhost:8000', colors.dim);
            log('  2. Open browser console', colors.dim);
            log('  3. Run: physicsValidation.run()', colors.dim);
            console.log('');
            process.exit(0);
        } else {
            log('Some validation tests failed.', colors.red + colors.bright);
            process.exit(1);
        }

    } catch (error) {
        log(`Error: ${error.message}`, colors.red);
        console.error(error);
        process.exit(1);
    }
}

main();
