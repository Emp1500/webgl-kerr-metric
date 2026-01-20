/**
 * Performance Benchmarks for Kerr Black Hole Simulation (Phase 6)
 *
 * Automated benchmarks to test rendering performance at different
 * quality levels and resolutions.
 *
 * Usage:
 *   In browser console: performanceBenchmarks.run()
 *   Or: performanceBenchmarks.runQuick()
 */

import { qualityPresets, getQualityLevels } from '../src/config/simulation-params.js';

/**
 * Benchmark result structure
 */
class BenchmarkResult {
    constructor(name) {
        this.name = name;
        this.fps = 0;
        this.avgFrameTime = 0;
        this.minFrameTime = Infinity;
        this.maxFrameTime = 0;
        this.frameTimeVariance = 0;
        this.frames = 0;
        this.duration = 0;
        this.resolution = { width: 0, height: 0 };
        this.qualityLevel = '';
        this.maxSteps = 0;
    }

    toJSON() {
        return {
            name: this.name,
            fps: Math.round(this.fps),
            avgFrameTime: this.avgFrameTime.toFixed(2) + 'ms',
            minFrameTime: this.minFrameTime.toFixed(2) + 'ms',
            maxFrameTime: this.maxFrameTime.toFixed(2) + 'ms',
            jitter: Math.sqrt(this.frameTimeVariance).toFixed(2) + 'ms',
            frames: this.frames,
            duration: (this.duration / 1000).toFixed(1) + 's',
            resolution: `${this.resolution.width}x${this.resolution.height}`,
            qualityLevel: this.qualityLevel,
            maxSteps: this.maxSteps
        };
    }
}

/**
 * Performance Benchmark Suite
 */
class PerformanceBenchmarks {
    constructor() {
        this.simulation = null;
        this.results = [];
        this.isRunning = false;
        this.warmupFrames = 30;
        this.benchmarkFrames = 120;  // 2 seconds at 60fps
    }

    /**
     * Initialize benchmark suite
     */
    init(simulation) {
        this.simulation = simulation;
        console.log('Performance benchmarks initialized');
    }

    /**
     * Run full benchmark suite
     */
    async run() {
        if (!this.simulation) {
            console.error('Benchmarks not initialized. Call performanceBenchmarks.init(simulation) first.');
            return null;
        }

        if (this.isRunning) {
            console.warn('Benchmark already running');
            return null;
        }

        this.isRunning = true;
        this.results = [];

        console.log('Starting full benchmark suite...');
        console.log('This will cycle through all quality levels.');
        console.log('');

        const levels = getQualityLevels();

        for (const level of levels) {
            const result = await this._benchmarkQualityLevel(level);
            this.results.push(result);
        }

        this.isRunning = false;

        this._printResults();
        return this.results;
    }

    /**
     * Run quick benchmark (current quality only)
     */
    async runQuick() {
        if (!this.simulation) {
            console.error('Benchmarks not initialized');
            return null;
        }

        if (this.isRunning) {
            console.warn('Benchmark already running');
            return null;
        }

        this.isRunning = true;

        const currentLevel = this.simulation.qualityManager.getCurrentQuality();
        console.log(`Running quick benchmark at ${currentLevel} quality...`);

        const result = await this._benchmarkQualityLevel(currentLevel);

        this.isRunning = false;

        console.log('Quick Benchmark Result:');
        console.table([result.toJSON()]);

        return result;
    }

    /**
     * Benchmark a specific quality level
     */
    async _benchmarkQualityLevel(level) {
        const result = new BenchmarkResult(`Quality: ${level}`);
        result.qualityLevel = level;

        // Set quality level
        this.simulation.qualityManager.setQuality(level);

        // Wait for quality change to take effect
        await this._delay(100);

        // Get current settings
        const { width, height } = this.simulation.webglContext.getSize();
        result.resolution = { width, height };
        result.maxSteps = this.simulation.params.integrator.maxSteps;

        console.log(`Benchmarking ${level}... (${width}x${height}, ${result.maxSteps} steps)`);

        // Warmup phase
        await this._runFrames(this.warmupFrames);

        // Benchmark phase
        const frameTimes = await this._collectFrameTimes(this.benchmarkFrames);

        // Calculate statistics
        result.frames = frameTimes.length;
        result.duration = frameTimes.reduce((a, b) => a + b, 0);

        if (frameTimes.length > 0) {
            const sum = frameTimes.reduce((a, b) => a + b, 0);
            result.avgFrameTime = sum / frameTimes.length;
            result.fps = 1000 / result.avgFrameTime;
            result.minFrameTime = Math.min(...frameTimes);
            result.maxFrameTime = Math.max(...frameTimes);

            // Calculate variance
            const squaredDiffs = frameTimes.map(t => Math.pow(t - result.avgFrameTime, 2));
            result.frameTimeVariance = squaredDiffs.reduce((a, b) => a + b, 0) / frameTimes.length;
        }

        return result;
    }

    /**
     * Run a number of frames without collecting data (warmup)
     */
    async _runFrames(count) {
        return new Promise(resolve => {
            let framesLeft = count;
            const tick = () => {
                if (framesLeft <= 0) {
                    resolve();
                    return;
                }
                framesLeft--;
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    /**
     * Collect frame times for a number of frames
     */
    async _collectFrameTimes(count) {
        return new Promise(resolve => {
            const frameTimes = [];
            let lastTime = performance.now();
            let framesLeft = count;

            const tick = () => {
                const now = performance.now();
                frameTimes.push(now - lastTime);
                lastTime = now;

                framesLeft--;
                if (framesLeft <= 0) {
                    resolve(frameTimes);
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    /**
     * Delay helper
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Print benchmark results
     */
    _printResults() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('                    BENCHMARK RESULTS                       ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        const tableData = this.results.map(r => r.toJSON());
        console.table(tableData);

        console.log('');
        console.log('Summary:');

        // Find best and worst performing levels
        const sorted = [...this.results].sort((a, b) => b.fps - a.fps);
        console.log(`  Best:  ${sorted[0].qualityLevel} (${Math.round(sorted[0].fps)} FPS)`);
        console.log(`  Worst: ${sorted[sorted.length - 1].qualityLevel} (${Math.round(sorted[sorted.length - 1].fps)} FPS)`);

        // Find recommended level (highest quality with >= 55 FPS)
        const recommended = sorted.find(r => r.fps >= 55) || sorted[0];
        console.log(`  Recommended: ${recommended.qualityLevel} (${Math.round(recommended.fps)} FPS)`);

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
    }

    /**
     * Export results as JSON
     */
    exportJSON() {
        if (this.results.length === 0) {
            console.warn('No benchmark results to export. Run benchmarks first.');
            return null;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            browser: this.simulation.browserCapabilities?.getCapabilities()?.browser || {},
            gpu: this.simulation.browserCapabilities?.getCapabilities()?.gpu || {},
            results: this.results.map(r => r.toJSON())
        };

        const json = JSON.stringify(exportData, null, 2);
        console.log('Exported benchmark results:');
        console.log(json);

        return exportData;
    }

    /**
     * Run shader compilation benchmark
     */
    async benchmarkShaderCompilation() {
        if (!this.simulation?.shaderManager) {
            console.error('Shader manager not available');
            return null;
        }

        console.log('Benchmarking shader compilation...');

        const start = performance.now();

        // Force shader recompilation by reloading
        await this.simulation.shaderManager.loadProgram(
            'vertex-shader.glsl',
            'fragment-shader.glsl',
            'benchmark-test'
        );

        const compilationTime = performance.now() - start;

        console.log(`Shader compilation: ${compilationTime.toFixed(2)}ms`);

        return {
            compilationTime: compilationTime.toFixed(2) + 'ms'
        };
    }

    /**
     * Stress test - run at maximum quality for extended time
     */
    async stressTest(durationSeconds = 30) {
        if (!this.simulation) {
            console.error('Benchmarks not initialized');
            return null;
        }

        console.log(`Starting ${durationSeconds}s stress test at ultra quality...`);

        this.simulation.qualityManager.setQuality('ultra');
        await this._delay(100);

        const targetFrames = durationSeconds * 60;
        const frameTimes = [];
        const startMemory = performance.memory?.usedJSHeapSize || 0;

        const startTime = performance.now();
        let lastTime = startTime;

        while (performance.now() - startTime < durationSeconds * 1000) {
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    const now = performance.now();
                    frameTimes.push(now - lastTime);
                    lastTime = now;
                    resolve();
                });
            });
        }

        const endMemory = performance.memory?.usedJSHeapSize || 0;
        const totalTime = performance.now() - startTime;

        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const fps = 1000 / avgFrameTime;

        // Check for performance degradation
        const firstHalf = frameTimes.slice(0, Math.floor(frameTimes.length / 2));
        const secondHalf = frameTimes.slice(Math.floor(frameTimes.length / 2));
        const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const degradation = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

        console.log('');
        console.log('Stress Test Results:');
        console.log(`  Duration: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`  Frames: ${frameTimes.length}`);
        console.log(`  Average FPS: ${fps.toFixed(1)}`);
        console.log(`  Memory growth: ${((endMemory - startMemory) / (1024 * 1024)).toFixed(1)}MB`);
        console.log(`  Performance degradation: ${degradation.toFixed(1)}%`);
        console.log('');

        return {
            duration: totalTime,
            frames: frameTimes.length,
            avgFps: fps,
            memoryGrowthMB: (endMemory - startMemory) / (1024 * 1024),
            degradationPercent: degradation
        };
    }
}

// Create global instance
const performanceBenchmarks = new PerformanceBenchmarks();

// Export for module use
export { performanceBenchmarks, PerformanceBenchmarks };

// Also attach to window for console access
if (typeof window !== 'undefined') {
    window.performanceBenchmarks = performanceBenchmarks;
}
