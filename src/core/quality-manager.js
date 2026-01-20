/**
 * Quality Manager for Black Hole Simulation (Phase 6)
 *
 * Manages rendering quality levels and applies presets to simulation parameters.
 * Supports manual quality selection and adaptive quality based on performance.
 */

import { qualityPresets, getQualityLevels } from '../config/simulation-params.js';

/**
 * Quality Manager
 * Handles quality preset application and adaptive quality adjustments
 */
export class QualityManager {
    /**
     * @param {Object} simulation - Reference to BlackHoleSimulation instance
     * @param {Object} performanceMonitor - Reference to PerformanceMonitor instance
     */
    constructor(simulation, performanceMonitor) {
        this.simulation = simulation;
        this.performanceMonitor = performanceMonitor;
        this.params = simulation.params;

        // Current state
        this.currentLevel = this.params.quality.currentLevel || 'high';
        this.previousLevel = this.currentLevel;

        // Adaptive quality state
        this.adaptiveEnabled = this.params.quality.adaptiveEnabled;
        this.targetFps = this.params.quality.targetFps;
        this.minFps = this.params.quality.minFps;
        this.cooldown = this.params.quality.adaptiveCooldown;
        this.lastAdjustmentTime = 0;

        // Performance tracking for adaptive quality
        this.lowFpsFrames = 0;
        this.highFpsFrames = 0;
        this.lowFpsThreshold = 60;  // Frames of low FPS before downgrade
        this.highFpsThreshold = 300; // Frames of high FPS before upgrade (5s at 60fps)

        // Callbacks
        this.onQualityChange = null;

        // Set up performance monitor callbacks
        this._setupPerformanceCallbacks();

        console.log(`Quality Manager initialized at level: ${this.currentLevel}`);
    }

    /**
     * Set up performance monitor callbacks for adaptive quality
     */
    _setupPerformanceCallbacks() {
        this.performanceMonitor.onPerformanceWarning = (metrics) => {
            if (this.adaptiveEnabled) {
                this._handlePerformanceWarning(metrics);
            }
        };

        this.performanceMonitor.onPerformanceCritical = (metrics) => {
            if (this.adaptiveEnabled) {
                this._handlePerformanceCritical(metrics);
            }
        };
    }

    /**
     * Handle performance warning (FPS below acceptable)
     */
    _handlePerformanceWarning(metrics) {
        console.log(`Performance warning: FPS=${metrics.fps}`);
        this.lowFpsFrames++;

        if (this.lowFpsFrames >= this.lowFpsThreshold) {
            this.downgrade();
            this.lowFpsFrames = 0;
        }
    }

    /**
     * Handle critical performance (FPS very low)
     */
    _handlePerformanceCritical(metrics) {
        console.log(`Performance critical: FPS=${metrics.fps}`);
        // Immediately downgrade on critical
        this.downgrade();
        this.lowFpsFrames = 0;
    }

    /**
     * Update adaptive quality (called each frame)
     */
    update() {
        if (!this.adaptiveEnabled) return;

        const metrics = this.performanceMonitor.getMetrics();
        const currentTime = performance.now();

        // Check cooldown
        if (currentTime - this.lastAdjustmentTime < this.cooldown) {
            return;
        }

        // Track high performance for potential upgrade
        if (metrics.fps >= this.targetFps - 5) {
            this.highFpsFrames++;
            this.lowFpsFrames = 0;

            if (this.highFpsFrames >= this.highFpsThreshold) {
                this.upgrade();
                this.highFpsFrames = 0;
            }
        } else if (metrics.fps < this.minFps) {
            this.lowFpsFrames++;
            this.highFpsFrames = 0;
        }
    }

    /**
     * Set quality level
     * @param {string} level - Quality level: 'ultra', 'high', 'medium', 'low', 'potato'
     */
    setQuality(level) {
        const levels = getQualityLevels();
        if (!levels.includes(level)) {
            console.error(`Invalid quality level: ${level}. Valid levels: ${levels.join(', ')}`);
            return;
        }

        if (level === this.currentLevel) {
            console.log(`Already at quality level: ${level}`);
            return;
        }

        this.previousLevel = this.currentLevel;
        this.currentLevel = level;
        this.lastAdjustmentTime = performance.now();

        this._applyQualityPreset(level);

        console.log(`Quality changed: ${this.previousLevel} -> ${this.currentLevel}`);

        if (this.onQualityChange) {
            this.onQualityChange(level, this.previousLevel);
        }
    }

    /**
     * Apply quality preset to simulation parameters
     */
    _applyQualityPreset(level) {
        const preset = qualityPresets[level];
        if (!preset) return;

        // Update integrator settings
        this.params.integrator.maxSteps = preset.maxSteps;
        this.params.integrator.stepSize = preset.stepSize;

        // Update rendering resolution
        this.params.rendering.resolution = preset.resolution;

        // Update feature flags
        this.params.advancedFeatures.showJets = preset.features.showJets;
        this.params.advancedFeatures.showPhotonRing = preset.features.showPhotonRing;
        this.params.debug.showErgosphere = preset.features.showErgosphere;
        this.params.accretionDisk.enabled = preset.features.diskEnabled;

        // Update quality state
        this.params.quality.currentLevel = level;

        // Update performance monitor
        this.performanceMonitor.metrics.qualityLevel = level;

        // Notify WebGL context to resize if resolution changed
        if (this.simulation.webglContext) {
            this.simulation.webglContext.updateResolution(preset.resolution);
        }
    }

    /**
     * Get current quality level
     * @returns {string}
     */
    getCurrentQuality() {
        return this.currentLevel;
    }

    /**
     * Get current quality preset
     * @returns {Object}
     */
    getCurrentPreset() {
        return qualityPresets[this.currentLevel];
    }

    /**
     * Get all available quality levels
     * @returns {string[]}
     */
    getAvailableLevels() {
        return getQualityLevels();
    }

    /**
     * Downgrade quality by one level
     * @returns {boolean} True if downgraded, false if already at lowest
     */
    downgrade() {
        const levels = getQualityLevels();
        const currentIndex = levels.indexOf(this.currentLevel);

        if (currentIndex < levels.length - 1) {
            this.setQuality(levels[currentIndex + 1]);
            return true;
        }

        console.log('Already at lowest quality level');
        return false;
    }

    /**
     * Upgrade quality by one level
     * @returns {boolean} True if upgraded, false if already at highest
     */
    upgrade() {
        const levels = getQualityLevels();
        const currentIndex = levels.indexOf(this.currentLevel);

        if (currentIndex > 0) {
            this.setQuality(levels[currentIndex - 1]);
            return true;
        }

        console.log('Already at highest quality level');
        return false;
    }

    /**
     * Cycle through quality levels
     * @param {boolean} reverse - Cycle in reverse (upgrade instead of downgrade)
     */
    cycleQuality(reverse = false) {
        const levels = getQualityLevels();
        const currentIndex = levels.indexOf(this.currentLevel);

        let newIndex;
        if (reverse) {
            newIndex = (currentIndex - 1 + levels.length) % levels.length;
        } else {
            newIndex = (currentIndex + 1) % levels.length;
        }

        this.setQuality(levels[newIndex]);
    }

    /**
     * Enable or disable adaptive quality
     * @param {boolean} enabled
     */
    setAdaptiveEnabled(enabled) {
        this.adaptiveEnabled = enabled;
        this.params.quality.adaptiveEnabled = enabled;
        console.log(`Adaptive quality: ${enabled ? 'enabled' : 'disabled'}`);

        // Reset counters
        this.lowFpsFrames = 0;
        this.highFpsFrames = 0;
    }

    /**
     * Toggle adaptive quality
     */
    toggleAdaptive() {
        this.setAdaptiveEnabled(!this.adaptiveEnabled);
    }

    /**
     * Get quality status info
     * @returns {Object}
     */
    getStatus() {
        return {
            currentLevel: this.currentLevel,
            previousLevel: this.previousLevel,
            preset: this.getCurrentPreset(),
            adaptiveEnabled: this.adaptiveEnabled,
            targetFps: this.targetFps,
            minFps: this.minFps
        };
    }
}
