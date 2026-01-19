/**
 * Keyframe Manager for Black Hole Simulation
 *
 * Handles keyframe-based animations with smooth interpolation.
 * Supports camera position, black hole parameters, and feature toggles.
 */

/**
 * Easing functions for smooth transitions
 */
export const Easing = {
    linear: t => t,

    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
    easeOutSine: t => Math.sin(t * Math.PI / 2),
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

    easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutExpo: t => {
        if (t === 0 || t === 1) return t;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
    }
};

/**
 * Keyframe definition
 */
export class Keyframe {
    /**
     * Create a keyframe
     * @param {number} time - Time in seconds
     * @param {Object} properties - Properties to animate
     * @param {Function} easing - Easing function for transition TO this keyframe
     */
    constructor(time, properties, easing = Easing.easeInOutCubic) {
        this.time = time;
        this.properties = properties;
        this.easing = easing;
    }
}

/**
 * Animation track for a single property path
 */
class AnimationTrack {
    constructor(propertyPath) {
        this.propertyPath = propertyPath;
        this.keyframes = [];
    }

    addKeyframe(time, value, easing) {
        this.keyframes.push({ time, value, easing });
        this.keyframes.sort((a, b) => a.time - b.time);
    }

    getValue(time) {
        if (this.keyframes.length === 0) return null;
        if (this.keyframes.length === 1) return this.keyframes[0].value;

        // Find surrounding keyframes
        let prevKf = this.keyframes[0];
        let nextKf = this.keyframes[this.keyframes.length - 1];

        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (time >= this.keyframes[i].time && time < this.keyframes[i + 1].time) {
                prevKf = this.keyframes[i];
                nextKf = this.keyframes[i + 1];
                break;
            }
        }

        // Before first keyframe
        if (time <= prevKf.time) return prevKf.value;
        // After last keyframe
        if (time >= nextKf.time) return nextKf.value;

        // Interpolate
        const duration = nextKf.time - prevKf.time;
        const elapsed = time - prevKf.time;
        const t = elapsed / duration;
        const easedT = nextKf.easing(t);

        return this.interpolate(prevKf.value, nextKf.value, easedT);
    }

    interpolate(a, b, t) {
        // Handle different types
        if (typeof a === 'number' && typeof b === 'number') {
            return a + (b - a) * t;
        }
        if (typeof a === 'boolean') {
            return t < 0.5 ? a : b;
        }
        if (Array.isArray(a) && Array.isArray(b)) {
            return a.map((v, i) => v + (b[i] - v) * t);
        }
        // For non-interpolatable values, switch at midpoint
        return t < 0.5 ? a : b;
    }
}

/**
 * Keyframe Manager
 * Manages multiple animation tracks and provides unified playback control
 */
export class KeyframeManager {
    constructor() {
        this.tracks = new Map();
        this.duration = 0;
        this.currentTime = 0;
        this.isPlaying = false;
        this.isLooping = false;
        this.playbackSpeed = 1.0;

        this.onUpdate = null;
        this.onComplete = null;
        this.onKeyframeHit = null;

        this._lastUpdateTime = 0;
    }

    /**
     * Add a keyframe for a property
     * @param {string} propertyPath - Dot-separated path (e.g., 'camera.distance')
     * @param {number} time - Time in seconds
     * @param {*} value - Value at this keyframe
     * @param {Function} easing - Easing function
     */
    addKeyframe(propertyPath, time, value, easing = Easing.easeInOutCubic) {
        if (!this.tracks.has(propertyPath)) {
            this.tracks.set(propertyPath, new AnimationTrack(propertyPath));
        }
        this.tracks.get(propertyPath).addKeyframe(time, value, easing);
        this.duration = Math.max(this.duration, time);
    }

    /**
     * Add multiple keyframes from a scene definition
     * @param {Array<Keyframe>} keyframes - Array of Keyframe objects
     */
    addKeyframes(keyframes) {
        for (const kf of keyframes) {
            for (const [path, value] of Object.entries(kf.properties)) {
                this.addKeyframe(path, kf.time, value, kf.easing);
            }
        }
    }

    /**
     * Get all property values at a given time
     * @param {number} time - Time in seconds
     * @returns {Object} Object with property paths as keys
     */
    getValuesAtTime(time) {
        const values = {};
        for (const [path, track] of this.tracks) {
            const value = track.getValue(time);
            if (value !== null) {
                values[path] = value;
            }
        }
        return values;
    }

    /**
     * Apply values to a target object
     * @param {Object} target - Target object to update
     * @param {Object} values - Values from getValuesAtTime
     */
    applyValues(target, values) {
        for (const [path, value] of Object.entries(values)) {
            this.setNestedProperty(target, path, value);
        }
    }

    /**
     * Set a nested property using dot notation
     */
    setNestedProperty(obj, path, value) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] === undefined) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = value;
    }

    /**
     * Get a nested property using dot notation
     */
    getNestedProperty(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === undefined) return undefined;
            current = current[part];
        }

        return current;
    }

    /**
     * Start playback
     */
    play() {
        this.isPlaying = true;
        this._lastUpdateTime = performance.now();
    }

    /**
     * Pause playback
     */
    pause() {
        this.isPlaying = false;
    }

    /**
     * Stop and reset to beginning
     */
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
    }

    /**
     * Seek to a specific time
     * @param {number} time - Time in seconds
     */
    seek(time) {
        this.currentTime = Math.max(0, Math.min(time, this.duration));
    }

    /**
     * Update animation state
     * @param {number} timestamp - Current timestamp (from requestAnimationFrame)
     * @returns {Object} Current property values
     */
    update(timestamp) {
        if (!this.isPlaying) {
            return this.getValuesAtTime(this.currentTime);
        }

        const deltaTime = (timestamp - this._lastUpdateTime) / 1000;
        this._lastUpdateTime = timestamp;

        this.currentTime += deltaTime * this.playbackSpeed;

        // Handle looping or completion
        if (this.currentTime >= this.duration) {
            if (this.isLooping) {
                this.currentTime = this.currentTime % this.duration;
            } else {
                this.currentTime = this.duration;
                this.isPlaying = false;
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        }

        const values = this.getValuesAtTime(this.currentTime);

        if (this.onUpdate) {
            this.onUpdate(values, this.currentTime);
        }

        return values;
    }

    /**
     * Get current progress (0-1)
     */
    getProgress() {
        return this.duration > 0 ? this.currentTime / this.duration : 0;
    }

    /**
     * Clear all keyframes
     */
    clear() {
        this.tracks.clear();
        this.duration = 0;
        this.currentTime = 0;
    }
}
