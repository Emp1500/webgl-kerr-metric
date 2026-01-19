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
 */

import { WebGLContext } from './core/webgl-context.js';
import { ShaderManager } from './core/shader-manager.js';
import { BufferManager } from './core/buffer-manager.js';
import { KerrMetric } from './physics/kerr-metric.js';
import { defaultParams, createParams } from './config/simulation-params.js';

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

            // Hide loading, start rendering
            this._hideLoading();
            this._start();

            // Export for debugging
            this._exportGlobals();

            console.log('Black Hole Simulation initialized successfully');
            console.log('Key radii:', this.kerrMetric.getKeyRadii());

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
        // Auto-rotate camera if enabled
        if (this.params.animation.autoRotate) {
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

        console.log('Debug objects exported to window:');
        console.log('  - simulation: Main simulation instance');
        console.log('  - kerrMetric: Kerr metric calculator');
        console.log('  - params: Simulation parameters');
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
        console.log('Quick examples:');
        console.log('  params.blackHole.spin = 0.5  // Change spin');
        console.log('  params.accretionDisk.temperature = 5e6  // Cooler disk');
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
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new BlackHoleSimulation();
});
