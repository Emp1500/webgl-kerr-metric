/**
 * User Controls for Black Hole Simulation
 *
 * Handles keyboard and mouse input for camera control and animation.
 */

/**
 * Controls Manager
 * Handles user input and maps to simulation actions
 */
export class ControlsManager {
    /**
     * @param {Object} simulation - Reference to main simulation
     * @param {Object} timeController - Reference to time controller
     * @param {Object} annotationManager - Reference to annotation manager
     */
    constructor(simulation, timeController = null, annotationManager = null) {
        this.simulation = simulation;
        this.timeController = timeController;
        this.annotationManager = annotationManager;

        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.mouseSensitivity = 0.005;
        this.zoomSensitivity = 0.1;

        this._setupKeyboardControls();
        this._setupMouseControls();
    }

    /**
     * Set up keyboard event handlers
     */
    _setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.code) {
                // Animation controls
                case 'Space':
                    e.preventDefault();
                    if (this.timeController) {
                        this.timeController.togglePlayPause();
                        if (this.annotationManager) {
                            this.annotationManager.updatePlayState(
                                this.timeController.state === 'playing'
                            );
                        }
                    }
                    break;

                case 'KeyT':
                    // Start educational tour
                    if (this.timeController) {
                        this.timeController.startEducationalTour();
                        if (this.annotationManager) {
                            this.annotationManager.show();
                        }
                    }
                    break;

                case 'Escape':
                    // Stop tour
                    if (this.timeController) {
                        this.timeController.stop();
                    }
                    if (this.annotationManager) {
                        this.annotationManager.hide();
                    }
                    break;

                // Scene jumping (1-7)
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                case 'Digit7':
                    if (this.timeController) {
                        const sceneIndex = parseInt(e.code.slice(-1));
                        this.timeController.jumpToSceneIndex(sceneIndex);
                    }
                    break;

                // Camera controls
                case 'ArrowUp':
                    e.preventDefault();
                    this._adjustCameraTheta(-0.05);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    this._adjustCameraTheta(0.05);
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    this._adjustCameraPhi(-0.05);
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    this._adjustCameraPhi(0.05);
                    break;

                case 'Equal':
                case 'NumpadAdd':
                    // Zoom in
                    this._adjustCameraDistance(-1);
                    break;

                case 'Minus':
                case 'NumpadSubtract':
                    // Zoom out
                    this._adjustCameraDistance(1);
                    break;

                // Reset camera
                case 'KeyR':
                    this._resetCamera();
                    break;

                // Toggle UI
                case 'KeyH':
                    if (this.annotationManager) {
                        this.annotationManager.toggle();
                    }
                    break;

                // Toggle features
                case 'KeyD':
                    this.simulation.toggleDisk();
                    break;

                case 'KeyJ':
                    this.simulation.toggleJets();
                    break;

                case 'KeyP':
                    this.simulation.togglePhotonRing();
                    break;

                case 'KeyE':
                    this.simulation.toggleErgosphere();
                    break;

                case 'KeyA':
                    this.simulation.toggleAutoRotate();
                    break;

                // Quality controls (Phase 6)
                case 'KeyQ':
                    if (e.shiftKey) {
                        // Toggle adaptive quality
                        if (this.simulation.qualityManager) {
                            this.simulation.qualityManager.toggleAdaptive();
                        }
                    } else {
                        // Cycle through quality levels
                        if (this.simulation.qualityManager) {
                            this.simulation.qualityManager.cycleQuality();
                        }
                    }
                    break;

                // Quick demos
                case 'F1':
                    e.preventDefault();
                    if (this.timeController) {
                        this.timeController.startQuickDemo('spinComparison');
                        if (this.annotationManager) {
                            this.annotationManager.show();
                        }
                    }
                    break;

                case 'F2':
                    e.preventDefault();
                    if (this.timeController) {
                        this.timeController.startQuickDemo('diskTemperature');
                        if (this.annotationManager) {
                            this.annotationManager.show();
                        }
                    }
                    break;

                case 'F3':
                    e.preventDefault();
                    if (this.timeController) {
                        this.timeController.startQuickDemo('jetPower');
                        if (this.annotationManager) {
                            this.annotationManager.show();
                        }
                    }
                    break;
            }
        });
    }

    /**
     * Set up mouse event handlers
     */
    _setupMouseControls() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        // Mouse drag for camera rotation
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {  // Left button
                this.isDragging = true;
                this.lastMousePos = { x: e.clientX, y: e.clientY };
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const deltaX = e.clientX - this.lastMousePos.x;
            const deltaY = e.clientY - this.lastMousePos.y;

            this._adjustCameraPhi(deltaX * this.mouseSensitivity);
            this._adjustCameraTheta(deltaY * this.mouseSensitivity);

            this.lastMousePos = { x: e.clientX, y: e.clientY };
        });

        // Mouse wheel for zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1 : -1;
            this._adjustCameraDistance(delta * this.zoomSensitivity * this.simulation.params.camera.distance);
        }, { passive: false });

        // Touch controls for mobile
        let touchStartDist = 0;
        let touchStartPos = { x: 0, y: 0 };

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartPos = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            } else if (e.touches.length === 2) {
                touchStartDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (e.touches.length === 1) {
                // Rotate
                const deltaX = e.touches[0].clientX - touchStartPos.x;
                const deltaY = e.touches[0].clientY - touchStartPos.y;

                this._adjustCameraPhi(deltaX * this.mouseSensitivity);
                this._adjustCameraTheta(deltaY * this.mouseSensitivity);

                touchStartPos = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            } else if (e.touches.length === 2) {
                // Pinch zoom
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = touchStartDist - dist;
                this._adjustCameraDistance(delta * 0.05);
                touchStartDist = dist;
            }
        }, { passive: false });
    }

    /**
     * Adjust camera theta (polar angle)
     */
    _adjustCameraTheta(delta) {
        const params = this.simulation.params;
        params.camera.theta = Math.max(0.1, Math.min(Math.PI - 0.1,
            params.camera.theta + delta));
        this.simulation._setupCamera();
    }

    /**
     * Adjust camera phi (azimuthal angle)
     */
    _adjustCameraPhi(delta) {
        const params = this.simulation.params;
        params.camera.phi = (params.camera.phi + delta) % (Math.PI * 2);
        this.simulation._setupCamera();
    }

    /**
     * Adjust camera distance
     */
    _adjustCameraDistance(delta) {
        const params = this.simulation.params;
        const rH = this.simulation.kerrMetric.eventHorizonRadius();
        params.camera.distance = Math.max(rH * 1.5, Math.min(100,
            params.camera.distance + delta));
        this.simulation._setupCamera();
    }

    /**
     * Reset camera to default position
     */
    _resetCamera() {
        const params = this.simulation.params;
        params.camera.distance = 15;
        params.camera.theta = Math.PI / 3;
        params.camera.phi = 0;
        this.simulation._setupCamera();
        console.log('Camera reset');
    }

    /**
     * Get control help text
     */
    static getHelpText() {
        return `
Keyboard Controls:
  Space     - Play/Pause tour
  T         - Start educational tour
  Escape    - Stop tour
  1-7       - Jump to scene
  Arrows    - Rotate camera
  +/-       - Zoom in/out
  R         - Reset camera
  H         - Toggle UI

Feature Toggles:
  D - Accretion disk
  J - Relativistic jets
  P - Photon ring
  E - Ergosphere
  A - Auto-rotate

Quality Controls (Phase 6):
  Q         - Cycle quality (ultra/high/medium/low/potato)
  Shift+Q   - Toggle adaptive quality

Quick Demos:
  F1 - Spin comparison
  F2 - Disk temperature
  F3 - Jet power

Mouse Controls:
  Drag      - Rotate camera
  Scroll    - Zoom
        `.trim();
    }
}
