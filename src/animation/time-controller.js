/**
 * Time Controller for Animation System
 *
 * Orchestrates playback of tours and manages animation state.
 */

import { KeyframeManager, Easing } from './keyframe-manager.js';
import { educationalTour, quickDemos } from './tour-sequences.js';

/**
 * Animation state enum
 */
export const AnimationState = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused'
};

/**
 * Time Controller
 * Manages animation playback and integrates with the simulation
 */
export class TimeController {
    /**
     * @param {Object} simulation - Reference to main simulation
     */
    constructor(simulation) {
        this.simulation = simulation;
        this.keyframeManager = new KeyframeManager();

        this.state = AnimationState.IDLE;
        this.currentTour = null;
        this.currentScene = null;

        // Callbacks
        this.onSceneChange = null;
        this.onTourComplete = null;
        this.onStateChange = null;

        // Setup keyframe manager callbacks
        this.keyframeManager.onUpdate = (values, time) => this._handleUpdate(values, time);
        this.keyframeManager.onComplete = () => this._handleComplete();
    }

    /**
     * Load and start the educational tour
     */
    startEducationalTour() {
        this.loadTour(educationalTour);
        this.play();
        console.log('Starting Educational Tour');
        console.log('Duration:', educationalTour.totalDuration, 'seconds');
        console.log('Scenes:', educationalTour.scenes.length);
    }

    /**
     * Load a quick demo
     * @param {string} demoName - Name of demo ('spinComparison', 'diskTemperature', 'jetPower')
     */
    startQuickDemo(demoName) {
        const demo = quickDemos[demoName];
        if (!demo) {
            console.error('Unknown demo:', demoName);
            return;
        }

        this.keyframeManager.clear();
        this.keyframeManager.addKeyframes(demo.keyframes);
        this.currentTour = demo;
        this.currentScene = null;

        console.log(`Starting demo: ${demo.name}`);
        console.log(demo.description);

        this.play();
    }

    /**
     * Load a tour
     * @param {Object} tour - Tour definition
     */
    loadTour(tour) {
        this.keyframeManager.clear();
        this.keyframeManager.addKeyframes(tour.getAllKeyframes());
        this.currentTour = tour;
        this.currentScene = null;
    }

    /**
     * Start or resume playback
     */
    play() {
        this.state = AnimationState.PLAYING;
        this.keyframeManager.play();
        this._notifyStateChange();
    }

    /**
     * Pause playback
     */
    pause() {
        this.state = AnimationState.PAUSED;
        this.keyframeManager.pause();
        this._notifyStateChange();
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.state === AnimationState.PLAYING) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Stop and reset
     */
    stop() {
        this.state = AnimationState.IDLE;
        this.keyframeManager.stop();
        this.currentScene = null;
        this._notifyStateChange();
    }

    /**
     * Seek to time
     * @param {number} time - Time in seconds
     */
    seek(time) {
        this.keyframeManager.seek(time);
        // Apply values at new time
        const values = this.keyframeManager.getValuesAtTime(time);
        this._applyAnimationValues(values);
        this._updateCurrentScene(time);
    }

    /**
     * Jump to a specific scene
     * @param {string} sceneId - Scene identifier
     */
    jumpToScene(sceneId) {
        if (!this.currentTour || !this.currentTour.scenes) return;

        const scene = this.currentTour.scenes.find(s => s.id === sceneId);
        if (scene) {
            this.seek(scene.startTime);
            console.log(`Jumped to scene: ${scene.title}`);
        }
    }

    /**
     * Jump to scene by index (1-based for user convenience)
     * @param {number} index - Scene index (1-7 for educational tour)
     */
    jumpToSceneIndex(index) {
        if (!this.currentTour || !this.currentTour.scenes) return;

        const scene = this.currentTour.scenes[index - 1];
        if (scene) {
            this.seek(scene.startTime);
            console.log(`Jumped to scene ${index}: ${scene.title}`);
        }
    }

    /**
     * Set playback speed
     * @param {number} speed - Playback speed multiplier
     */
    setSpeed(speed) {
        this.keyframeManager.playbackSpeed = speed;
        console.log(`Playback speed: ${speed}x`);
    }

    /**
     * Enable/disable looping
     * @param {boolean} loop - Whether to loop
     */
    setLooping(loop) {
        this.keyframeManager.isLooping = loop;
        console.log(`Looping: ${loop ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update - call each frame
     * @param {number} timestamp - Frame timestamp
     */
    update(timestamp) {
        if (this.state !== AnimationState.PLAYING) return;

        const values = this.keyframeManager.update(timestamp);
        this._applyAnimationValues(values);
        this._updateCurrentScene(this.keyframeManager.currentTime);
    }

    /**
     * Apply animated values to simulation
     */
    _applyAnimationValues(values) {
        const params = this.simulation.params;

        for (const [path, value] of Object.entries(values)) {
            this.keyframeManager.setNestedProperty(params, path, value);
        }

        // Special handling for camera - need to rebuild position
        if (values['camera.distance'] !== undefined ||
            values['camera.theta'] !== undefined ||
            values['camera.phi'] !== undefined) {
            this.simulation._setupCamera();
        }
    }

    /**
     * Handle keyframe update
     */
    _handleUpdate(values, time) {
        // Already handled in update()
    }

    /**
     * Handle tour completion
     */
    _handleComplete() {
        this.state = AnimationState.IDLE;
        console.log('Tour complete!');

        if (this.onTourComplete) {
            this.onTourComplete();
        }

        this._notifyStateChange();
    }

    /**
     * Update current scene tracking
     */
    _updateCurrentScene(time) {
        if (!this.currentTour || !this.currentTour.getSceneAtTime) return;

        const newScene = this.currentTour.getSceneAtTime(time);

        if (newScene !== this.currentScene) {
            this.currentScene = newScene;

            if (newScene && this.onSceneChange) {
                this.onSceneChange(newScene);
            }

            if (newScene) {
                console.log(`Scene: ${newScene.title}`);
            }
        }
    }

    /**
     * Notify state change
     */
    _notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    /**
     * Get current progress info
     * @returns {Object}
     */
    getProgress() {
        return {
            time: this.keyframeManager.currentTime,
            duration: this.keyframeManager.duration,
            progress: this.keyframeManager.getProgress(),
            state: this.state,
            scene: this.currentScene ? {
                id: this.currentScene.id,
                title: this.currentScene.title,
                description: this.currentScene.description
            } : null
        };
    }

    /**
     * Get available tours
     * @returns {Array}
     */
    static getAvailableTours() {
        return [
            {
                id: 'educational',
                name: educationalTour.name,
                description: educationalTour.description,
                duration: educationalTour.totalDuration,
                scenes: educationalTour.scenes.map(s => ({
                    id: s.id,
                    title: s.title,
                    startTime: s.startTime
                }))
            }
        ];
    }

    /**
     * Get available quick demos
     * @returns {Array}
     */
    static getAvailableDemos() {
        return Object.entries(quickDemos).map(([id, demo]) => ({
            id,
            name: demo.name,
            description: demo.description,
            duration: demo.duration
        }));
    }
}
