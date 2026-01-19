/**
 * Kerr Black Hole Simulation - Main Entry Point
 *
 * Phase 1: Foundation
 * - WebGL 2.0 context initialization
 * - Shader loading and compilation
 * - Basic render loop with Kerr metric
 *
 * Phase 2: Geodesic Integration
 * - RK4 integrator for null geodesics
 * - Proper gravitational lensing
 * - Background star distortion
 *
 * Phase 3: Accretion Disk
 * - Thin disk geometry (ISCO to outer radius)
 * - Novikov-Thorne temperature profile
 * - Relativistic Doppler shifting and beaming
 * - Gravitational redshift
 *
 * Phase 4: Advanced Features
 * - Photon ring / light ring visualization
 * - Relativistic jets (Blandford-Znajek mechanism)
 * - Enhanced ergosphere with frame-dragging effects
 *
 * Phase 5: Animation System
 * - Keyframe-based animation with easing
 * - Educational tour with 7 guided scenes
 * - Quick demos for specific features
 * - Interactive UI with annotations
 */

import { WebGLContext } from './core/webgl-context.js';
import { ShaderManager } from './core/shader-manager.js';
import { BufferManager } from './core/buffer-manager.js';
import { KerrMetric } from './physics/kerr-metric.js';
import { defaultParams, createParams } from './config/simulation-params.js';
import { TimeController, AnimationState } from './animation/time-controller.js';
import { educationalTour } from './animation/tour-sequences.js';
import { AnnotationManager, createHelpHint } from './ui/annotations.js';
import { ControlsManager } from './ui/controls.js';

/**
 * Main simulation class
 */
class BlackHoleSimulation {
    constructor() {
        this.params = createParams();
        this.kerrMetric = null;
        this.webglContext = null;
        this.shaderManager = null;
        this.bufferManager = null;

        this.isRunning = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;

        // Camera state
        this.cameraPos = [0, 0, 0];
        this.cameraTarget = [0, 0, 0];

        // Animation system (Phase 5)
        this.timeController = null;
        this.annotationManager = null;
        this.controlsManager = null;

        this._init();
    }

    async _init() {
        try {
            this._showLoading('Initializing WebGL...');

            // Initialize WebGL context
            this.webglContext = new WebGLContext('canvas');
            const gl = this.webglContext.getContext();

            this._showLoading('Loading shaders...');

            // Initialize shader manager
            this.shaderManager = new ShaderManager(gl);

            // Load main shader program
            await this.shaderManager.loadProgram(
                'vertex-shader.glsl',
                'fragment-shader.glsl',
                'main'
            );

            this._showLoading('Setting up geometry...');

            // Initialize buffer manager
            this.bufferManager = new BufferManager(gl);

            // Initialize physics
            this.kerrMetric = new KerrMetric(
                this.params.blackHole.mass,
                this.params.blackHole.spin
            );

            // Setup camera
            this._setupCamera();

            // Handle resize
            this.webglContext.onResize(() => this._onResize());

            // Run validation tests
            this._validatePhysics();

            // Initialize animation system (Phase 5)
            this._initAnimationSystem();

            // Hide loading, start rendering
            this._hideLoading();
            this._start();

            // Export for debugging
            this._exportGlobals();

            // Show help hint
            createHelpHint();

            console.log('Black Hole Simulation initialized successfully');
            console.log('Key radii:', this.kerrMetric.getKeyRadii());
            console.log('Press T to start educational tour, H for help');

        } catch (error) {
            this._showError(error.message);
            console.error('Initialization failed:', error);
        }
    }

    _setupCamera() {
        const { distance, theta, phi } = this.params.camera;

        // Convert spherical to Cartesian
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        this.cameraPos = [
            distance * sinTheta * cosPhi,
            distance * sinTheta * sinPhi,
            distance * cosTheta
        ];

        this.cameraTarget = [0, 0, 0];
    }

    _onResize() {
        // Update any size-dependent state
        console.log('Resized to:', this.webglContext.getSize());
    }

    _initAnimationSystem() {
        // Create time controller
        this.timeController = new TimeController(this);

        // Create annotation manager
        this.annotationManager = new AnnotationManager();
        this.annotationManager.initializeScenes(educationalTour.scenes);

        // Set up time controller callbacks
        this.timeController.onSceneChange = (scene) => {
            const sceneIndex = educationalTour.scenes.findIndex(s => s.id === scene.id) + 1;
            this.annotationManager.updateScene(
                scene,
                sceneIndex,
                educationalTour.scenes.length
            );
        };

        this.timeController.onStateChange = (state) => {
            this.annotationManager.updatePlayState(state === AnimationState.PLAYING);
        };

        this.timeController.onTourComplete = () => {
            console.log('Tour complete! Press T to replay.');
        };

        // Set up annotation event handlers
        this.annotationManager.setEventHandlers({
            'play-pause': () => this.timeController.togglePlayPause(),
            'stop': () => {
                this.timeController.stop();
                this.annotationManager.hide();
            },
            'prev': () => {
                const progress = this.timeController.getProgress();
                if (progress.scene) {
                    const currentIndex = educationalTour.scenes.findIndex(
                        s => s.id === progress.scene.id
                    );
                    if (currentIndex > 0) {
                        this.timeController.jumpToSceneIndex(currentIndex);
                    }
                }
            },
            'next': () => {
                const progress = this.timeController.getProgress();
                if (progress.scene) {
                    const currentIndex = educationalTour.scenes.findIndex(
                        s => s.id === progress.scene.id
                    );
                    if (currentIndex < educationalTour.scenes.length - 1) {
                        this.timeController.jumpToSceneIndex(currentIndex + 2);
                    }
                }
            },
            'speed': (speed) => this.timeController.setSpeed(speed),
            'jumpToScene': (index) => this.timeController.jumpToSceneIndex(index),
            'seek': (ratio) => {
                const duration = this.timeController.keyframeManager.duration;
                this.timeController.seek(ratio * duration);
            }
        });

        // Create controls manager
        this.controlsManager = new ControlsManager(
            this,
            this.timeController,
            this.annotationManager
        );

        console.log('Animation system initialized');
        console.log('Available tours:', TimeController.getAvailableTours());
        console.log('Available demos:', TimeController.getAvailableDemos());
    }

    _validatePhysics() {
        console.log('Running physics validation...');
        const results = KerrMetric.validate();

        let allPassed = true;
        for (const result of results) {
            const status = result.pass ? 'PASS' : 'FAIL';
            console.log(`  [${status}] ${result.test}: expected ${result.expected}, got ${result.actual.toFixed(6)}`);
            if (!result.pass) allPassed = false;
        }

        if (allPassed) {
            console.log('All physics validation tests passed');
        } else {
            console.warn('Some physics validation tests failed');
        }
    }

    _start() {
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this._renderLoop();
    }

    _stop() {
        this.isRunning = false;
    }

    _renderLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        // Update FPS
        this.frameCount++;
        if (this.frameCount % 30 === 0) {
            this.fps = Math.round(1 / deltaTime);
            this._updateInfo();
        }

        // Update animation
        this._update(currentTime / 1000, deltaTime);

        // Render
        this._render();

        // Next frame
        requestAnimationFrame(() => this._renderLoop());
    }

    _update(time, deltaTime) {
        // Update animation system
        if (this.timeController) {
            this.timeController.update(performance.now());

            // Update progress display
            if (this.timeController.state === AnimationState.PLAYING) {
                const progress = this.timeController.getProgress();
                this.annotationManager.updateProgress(progress.time, progress.duration);
            }
        }

        // Auto-rotate camera if enabled (and not in tour mode)
        if (this.params.animation.autoRotate &&
            this.timeController.state !== AnimationState.PLAYING) {
            const phi = this.params.camera.phi + this.params.animation.rotationSpeed * deltaTime;
            this.params.camera.phi = phi % (2 * Math.PI);
            this._setupCamera();
        }
    }

    _render() {
        const gl = this.webglContext.getContext();

        // Clear
        this.webglContext.clear();

        // Use shader program
        this.shaderManager.useProgram('main');

        // Set uniforms
        const { width, height } = this.webglContext.getSize();

        // Calculate disk inner radius (ISCO) if not set
        const diskInnerRadius = this.params.accretionDisk.innerRadius ||
                                this.kerrMetric.iscoRadius();

        this.shaderManager.setUniforms('main', {
            u_resolution: [width, height],
            u_time: performance.now() / 1000,
            u_mass: this.params.blackHole.mass,
            u_spin: this.params.blackHole.spin,
            u_cameraPos: this.cameraPos,
            u_cameraTarget: this.cameraTarget,
            u_fov: this.params.camera.fov * Math.PI / 180,
            u_maxDistance: this.params.rayMarching.maxDistance,
            u_escapeRadius: this.params.rayMarching.escapeRadius,
            u_stepSize: this.params.integrator.stepSize,
            // Accretion disk uniforms
            u_showDisk: this.params.accretionDisk.enabled,
            u_diskInnerRadius: diskInnerRadius,
            u_diskOuterRadius: this.params.accretionDisk.outerRadius,
            u_diskTemperature: this.params.accretionDisk.temperature,
            u_diskThickness: this.params.accretionDisk.thickness,
            // Advanced features (Phase 4)
            u_showJets: this.params.advancedFeatures.showJets,
            u_showPhotonRing: this.params.advancedFeatures.showPhotonRing,
            // Debug flags
            u_showHorizon: this.params.debug.showEventHorizon,
            u_showPhotonSphere: this.params.debug.showPhotonSphere,
            u_showErgosphere: this.params.debug.showErgosphere
        });

        this.shaderManager.setUniformInt('main', 'u_maxSteps', this.params.integrator.maxSteps);

        // Draw full-screen quad
        this.bufferManager.draw();
    }

    _updateInfo() {
        const fpsElement = document.getElementById('fps');
        const paramsElement = document.getElementById('params');

        if (fpsElement) {
            fpsElement.textContent = `FPS: ${this.fps}`;
        }

        if (paramsElement) {
            const radii = this.kerrMetric.getKeyRadii();
            paramsElement.textContent = [
                `M=${this.params.blackHole.mass} a=${this.params.blackHole.spin.toFixed(2)}`,
                `r+=${radii.eventHorizon.toFixed(3)} ISCO=${radii.isco.toFixed(3)}`
            ].join(' | ');
        }
    }

    _showLoading(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.textContent = message;
            loadingElement.classList.remove('hidden');
        }
    }

    _hideLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    _showError(message) {
        const errorElement = document.getElementById('error');
        const loadingElement = document.getElementById('loading');

        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }

        if (errorElement) {
            errorElement.textContent = `Error: ${message}`;
            errorElement.classList.add('visible');
        }
    }

    _exportGlobals() {
        // Export for console debugging
        window.simulation = this;
        window.kerrMetric = this.kerrMetric;
        window.params = this.params;
        window.tour = this.timeController;

        console.log('Debug objects exported to window:');
        console.log('  - simulation: Main simulation instance');
        console.log('  - kerrMetric: Kerr metric calculator');
        console.log('  - params: Simulation parameters');
        console.log('  - tour: Animation/tour controller');
        console.log('');
        console.log('Black hole controls:');
        console.log('  simulation.setBlackHoleParams(mass, spin)');
        console.log('  simulation.setCameraPosition(distance, theta, phi)');
        console.log('  simulation.toggleAutoRotate()');
        console.log('');
        console.log('Accretion disk controls:');
        console.log('  simulation.toggleDisk()');
        console.log('  simulation.setDiskParams(outerRadius, temperature, thickness)');
        console.log('');
        console.log('Advanced features (Phase 4):');
        console.log('  simulation.toggleJets()        // Relativistic jets');
        console.log('  simulation.togglePhotonRing()  // Photon ring effect');
        console.log('  simulation.toggleErgosphere()  // Ergosphere visualization');
        console.log('');
        console.log('Animation controls (Phase 5):');
        console.log('  simulation.startTour()         // Start educational tour');
        console.log('  simulation.startDemo(name)     // Start quick demo');
        console.log('  tour.play() / tour.pause()     // Control playback');
        console.log('  tour.jumpToSceneIndex(n)       // Jump to scene 1-7');
        console.log('');
        console.log('Keyboard: T=tour, Space=play/pause, 1-7=scenes, H=help');
    }

    /**
     * Update black hole parameters
     */
    setBlackHoleParams(mass, spin) {
        this.params.blackHole.mass = mass;
        this.params.blackHole.spin = spin;
        this.kerrMetric.setParameters(mass, spin);
        console.log('Updated black hole params:', this.kerrMetric.getKeyRadii());
    }

    /**
     * Update camera position
     */
    setCameraPosition(distance, theta, phi) {
        this.params.camera.distance = distance;
        this.params.camera.theta = theta;
        this.params.camera.phi = phi;
        this._setupCamera();
    }

    /**
     * Toggle auto-rotation
     */
    toggleAutoRotate() {
        this.params.animation.autoRotate = !this.params.animation.autoRotate;
        console.log('Auto-rotate:', this.params.animation.autoRotate);
    }

    /**
     * Toggle accretion disk visibility
     */
    toggleDisk() {
        this.params.accretionDisk.enabled = !this.params.accretionDisk.enabled;
        console.log('Accretion disk:', this.params.accretionDisk.enabled ? 'enabled' : 'disabled');
    }

    /**
     * Set accretion disk parameters
     */
    setDiskParams(outerRadius, temperature, thickness) {
        if (outerRadius !== undefined) {
            this.params.accretionDisk.outerRadius = outerRadius;
        }
        if (temperature !== undefined) {
            this.params.accretionDisk.temperature = temperature;
        }
        if (thickness !== undefined) {
            this.params.accretionDisk.thickness = thickness;
        }
        console.log('Disk params updated:', {
            innerRadius: this.kerrMetric.iscoRadius().toFixed(3) + ' (ISCO)',
            outerRadius: this.params.accretionDisk.outerRadius,
            temperature: this.params.accretionDisk.temperature,
            thickness: this.params.accretionDisk.thickness
        });
    }

    /**
     * Toggle relativistic jets visibility
     */
    toggleJets() {
        this.params.advancedFeatures.showJets = !this.params.advancedFeatures.showJets;
        console.log('Relativistic jets:', this.params.advancedFeatures.showJets ? 'enabled' : 'disabled');
    }

    /**
     * Toggle photon ring visibility
     */
    togglePhotonRing() {
        this.params.advancedFeatures.showPhotonRing = !this.params.advancedFeatures.showPhotonRing;
        console.log('Photon ring:', this.params.advancedFeatures.showPhotonRing ? 'enabled' : 'disabled');
    }

    /**
     * Toggle ergosphere visualization
     */
    toggleErgosphere() {
        this.params.debug.showErgosphere = !this.params.debug.showErgosphere;
        console.log('Ergosphere:', this.params.debug.showErgosphere ? 'enabled' : 'disabled');
    }

    /**
     * Start the educational tour
     */
    startTour() {
        this.timeController.startEducationalTour();
        this.annotationManager.show();
    }

    /**
     * Start a quick demo
     * @param {string} name - Demo name ('spinComparison', 'diskTemperature', 'jetPower')
     */
    startDemo(name) {
        this.timeController.startQuickDemo(name);
        this.annotationManager.show();
    }

    /**
     * Get help text for controls
     */
    help() {
        console.log(ControlsManager.getHelpText());
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new BlackHoleSimulation();
});
