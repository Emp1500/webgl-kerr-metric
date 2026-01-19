/**
 * Performance Monitor for Black Hole Simulation
 *
 * Tracks FPS, frame times, GPU load estimates, and provides
 * data for adaptive quality adjustments.
 */

/**
 * Performance metrics structure
 */
export class PerformanceMetrics {
    constructor() {
        this.fps = 0;
        this.frameTime = 0;
        this.avgFrameTime = 0;
        this.minFrameTime = Infinity;
        this.maxFrameTime = 0;
        this.frameTimeVariance = 0;
        this.gpuTime = 0;  // Estimated from frame time
        this.memoryUsage = 0;
        this.qualityLevel = 'high';
        this.resolution = { width: 0, height: 0 };
        this.pixelCount = 0;
        this.stepsPerRay = 0;
    }
}

/**
 * Performance Monitor
 * Collects and analyzes frame timing data
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = new PerformanceMetrics();

        // Frame timing
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.frameTimes = [];
        this.maxSamples = 60;  // 1 second at 60fps

        // FPS calculation
        this.fpsUpdateInterval = 500;  // Update FPS every 500ms
        this.lastFpsUpdate = 0;
        this.framesSinceLastUpdate = 0;

        // Performance thresholds
        this.targetFps = 60;
        this.minAcceptableFps = 30;
        this.criticalFps = 20;

        // GPU timing (if available)
        this.gpuTimerQuery = null;
        this.gpuTimingAvailable = false;

        // Callbacks
        this.onPerformanceWarning = null;
        this.onPerformanceCritical = null;

        // State
        this.isMonitoring = true;
        this.performanceState = 'good';  // 'good', 'warning', 'critical'
    }

    /**
     * Initialize GPU timing extension if available
     * @param {WebGL2RenderingContext} gl
     */
    initGPUTiming(gl) {
        const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
        if (ext) {
            this.gpuTimingAvailable = true;
            this.gpuTimerExt = ext;
            console.log('GPU timing available');
        } else {
            console.log('GPU timing not available - using frame time estimates');
        }
    }

    /**
     * Begin frame timing
     * @param {number} timestamp - Performance.now() timestamp
     */
    beginFrame(timestamp) {
        if (!this.isMonitoring) return;

        this.frameStartTime = timestamp;

        // Start GPU timer if available
        if (this.gpuTimingAvailable && !this.gpuTimerQuery) {
            // GPU timing would go here
        }
    }

    /**
     * End frame timing and update metrics
     * @param {number} timestamp - Performance.now() timestamp
     */
    endFrame(timestamp) {
        if (!this.isMonitoring) return;

        const frameTime = timestamp - this.frameStartTime;
        this.frameCount++;
        this.framesSinceLastUpdate++;

        // Store frame time
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxSamples) {
            this.frameTimes.shift();
        }

        // Update metrics
        this.metrics.frameTime = frameTime;
        this.metrics.minFrameTime = Math.min(this.metrics.minFrameTime, frameTime);
        this.metrics.maxFrameTime = Math.max(this.metrics.maxFrameTime, frameTime);

        // Calculate average and variance
        if (this.frameTimes.length > 0) {
            const sum = this.frameTimes.reduce((a, b) => a + b, 0);
            this.metrics.avgFrameTime = sum / this.frameTimes.length;

            // Variance for jitter detection
            const squaredDiffs = this.frameTimes.map(t => Math.pow(t - this.metrics.avgFrameTime, 2));
            this.metrics.frameTimeVariance = squaredDiffs.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        }

        // Update FPS periodically
        if (timestamp - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            const elapsed = timestamp - this.lastFpsUpdate;
            this.metrics.fps = Math.round((this.framesSinceLastUpdate / elapsed) * 1000);

            this.framesSinceLastUpdate = 0;
            this.lastFpsUpdate = timestamp;

            // Check performance state
            this._updatePerformanceState();
        }

        this.lastFrameTime = timestamp;
    }

    /**
     * Update performance state and trigger callbacks
     */
    _updatePerformanceState() {
        const fps = this.metrics.fps;
        let newState = 'good';

        if (fps < this.criticalFps) {
            newState = 'critical';
        } else if (fps < this.minAcceptableFps) {
            newState = 'warning';
        }

        if (newState !== this.performanceState) {
            this.performanceState = newState;

            if (newState === 'critical' && this.onPerformanceCritical) {
                this.onPerformanceCritical(this.metrics);
            } else if (newState === 'warning' && this.onPerformanceWarning) {
                this.onPerformanceWarning(this.metrics);
            }
        }
    }

    /**
     * Update resolution info
     * @param {number} width
     * @param {number} height
     */
    updateResolution(width, height) {
        this.metrics.resolution = { width, height };
        this.metrics.pixelCount = width * height;
    }

    /**
     * Update ray marching steps info
     * @param {number} steps
     */
    updateStepsPerRay(steps) {
        this.metrics.stepsPerRay = steps;
    }

    /**
     * Get current metrics
     * @returns {PerformanceMetrics}
     */
    getMetrics() {
        // Estimate memory usage if available
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
        }

        return this.metrics;
    }

    /**
     * Get performance summary string
     * @returns {string}
     */
    getSummary() {
        const m = this.metrics;
        return [
            `FPS: ${m.fps}`,
            `Frame: ${m.frameTime.toFixed(1)}ms (avg: ${m.avgFrameTime.toFixed(1)}ms)`,
            `Resolution: ${m.resolution.width}x${m.resolution.height}`,
            `Quality: ${m.qualityLevel}`,
            `State: ${this.performanceState}`
        ].join(' | ');
    }

    /**
     * Get detailed stats for display
     * @returns {Object}
     */
    getDetailedStats() {
        const m = this.metrics;
        return {
            fps: {
                current: m.fps,
                target: this.targetFps,
                status: this.performanceState
            },
            timing: {
                current: m.frameTime.toFixed(2),
                average: m.avgFrameTime.toFixed(2),
                min: m.minFrameTime === Infinity ? 0 : m.minFrameTime.toFixed(2),
                max: m.maxFrameTime.toFixed(2),
                jitter: Math.sqrt(m.frameTimeVariance).toFixed(2)
            },
            resolution: m.resolution,
            quality: m.qualityLevel,
            memory: m.memoryUsage.toFixed(1)
        };
    }

    /**
     * Reset statistics
     */
    reset() {
        this.frameTimes = [];
        this.metrics.minFrameTime = Infinity;
        this.metrics.maxFrameTime = 0;
        this.frameCount = 0;
    }

    /**
     * Start/stop monitoring
     */
    setMonitoring(enabled) {
        this.isMonitoring = enabled;
        if (enabled) {
            this.reset();
        }
    }
}
