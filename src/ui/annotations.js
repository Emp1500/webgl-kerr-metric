/**
 * Annotation Overlay System
 *
 * Displays educational text, scene titles, and physics explanations
 * during the animated tour.
 */

/**
 * Annotation Manager
 * Creates and manages overlay UI elements
 */
export class AnnotationManager {
    constructor() {
        this.container = null;
        this.titleElement = null;
        this.descriptionElement = null;
        this.progressElement = null;
        this.controlsElement = null;

        this.isVisible = false;
        this.currentScene = null;

        this._createOverlay();
    }

    /**
     * Create the overlay DOM elements
     */
    _createOverlay() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'annotation-overlay';
        this.container.innerHTML = `
            <div class="annotation-content">
                <div class="scene-indicator">
                    <span class="scene-number"></span>
                    <span class="scene-title"></span>
                </div>
                <div class="scene-description"></div>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-time"></div>
                </div>
            </div>
            <div class="annotation-controls">
                <button class="control-btn" data-action="play-pause" title="Play/Pause (Space)">
                    <span class="play-icon">▶</span>
                    <span class="pause-icon">❚❚</span>
                </button>
                <button class="control-btn" data-action="stop" title="Stop">◼</button>
                <button class="control-btn" data-action="prev" title="Previous Scene">⏮</button>
                <button class="control-btn" data-action="next" title="Next Scene">⏭</button>
                <div class="speed-control">
                    <label>Speed:</label>
                    <select data-action="speed">
                        <option value="0.5">0.5x</option>
                        <option value="1" selected>1x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                    </select>
                </div>
            </div>
            <div class="scene-nav">
                <span class="nav-label">Jump to:</span>
                <div class="scene-buttons"></div>
            </div>
        `;

        // Add styles
        this._addStyles();

        // Get references
        this.titleElement = this.container.querySelector('.scene-title');
        this.numberElement = this.container.querySelector('.scene-number');
        this.descriptionElement = this.container.querySelector('.scene-description');
        this.progressFill = this.container.querySelector('.progress-fill');
        this.progressTime = this.container.querySelector('.progress-time');
        this.controlsElement = this.container.querySelector('.annotation-controls');
        this.sceneButtons = this.container.querySelector('.scene-buttons');

        // Initially hidden
        this.container.classList.add('hidden');

        // Add to document
        document.body.appendChild(this.container);
    }

    /**
     * Add CSS styles for the overlay
     */
    _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #annotation-overlay {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.8) 30%);
                padding: 60px 30px 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #fff;
                transition: opacity 0.3s, transform 0.3s;
                z-index: 1000;
            }

            #annotation-overlay.hidden {
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
            }

            .annotation-content {
                max-width: 800px;
                margin: 0 auto;
            }

            .scene-indicator {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }

            .scene-number {
                background: rgba(255,255,255,0.2);
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }

            .scene-title {
                font-size: 24px;
                font-weight: 600;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }

            .scene-description {
                font-size: 14px;
                line-height: 1.6;
                color: rgba(255,255,255,0.9);
                margin-bottom: 15px;
                max-width: 600px;
            }

            .progress-container {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }

            .progress-bar {
                flex: 1;
                height: 4px;
                background: rgba(255,255,255,0.2);
                border-radius: 2px;
                overflow: hidden;
                cursor: pointer;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4a9eff, #00d4ff);
                width: 0%;
                transition: width 0.1s linear;
            }

            .progress-time {
                font-size: 12px;
                font-family: 'Courier New', monospace;
                color: rgba(255,255,255,0.7);
                min-width: 80px;
            }

            .annotation-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            .control-btn {
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.3);
                color: #fff;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s, transform 0.1s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .control-btn:hover {
                background: rgba(255,255,255,0.2);
            }

            .control-btn:active {
                transform: scale(0.95);
            }

            .control-btn .pause-icon {
                display: none;
                font-size: 10px;
            }

            .control-btn.playing .play-icon {
                display: none;
            }

            .control-btn.playing .pause-icon {
                display: inline;
            }

            .speed-control {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: 20px;
                font-size: 12px;
                color: rgba(255,255,255,0.7);
            }

            .speed-control select {
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.3);
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
            }

            .speed-control select option {
                background: #333;
            }

            .scene-nav {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .nav-label {
                font-size: 12px;
                color: rgba(255,255,255,0.6);
            }

            .scene-buttons {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }

            .scene-btn {
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.7);
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .scene-btn:hover {
                background: rgba(255,255,255,0.2);
                color: #fff;
            }

            .scene-btn.active {
                background: rgba(74, 158, 255, 0.3);
                border-color: #4a9eff;
                color: #fff;
            }

            /* Help hint */
            .help-hint {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0,0,0,0.7);
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 12px;
                color: rgba(255,255,255,0.8);
                z-index: 1001;
            }

            .help-hint kbd {
                background: rgba(255,255,255,0.2);
                padding: 2px 6px;
                border-radius: 3px;
                margin: 0 2px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Initialize with scene list
     * @param {Array} scenes - Array of scene objects
     */
    initializeScenes(scenes) {
        this.sceneButtons.innerHTML = '';

        scenes.forEach((scene, index) => {
            const btn = document.createElement('button');
            btn.className = 'scene-btn';
            btn.dataset.sceneIndex = index + 1;
            btn.textContent = `${index + 1}. ${scene.title}`;
            this.sceneButtons.appendChild(btn);
        });
    }

    /**
     * Show the overlay
     */
    show() {
        this.isVisible = true;
        this.container.classList.remove('hidden');
    }

    /**
     * Hide the overlay
     */
    hide() {
        this.isVisible = false;
        this.container.classList.add('hidden');
    }

    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Update scene display
     * @param {Object} scene - Scene object with title and description
     * @param {number} sceneIndex - Current scene index (1-based)
     * @param {number} totalScenes - Total number of scenes
     */
    updateScene(scene, sceneIndex, totalScenes) {
        if (!scene) {
            this.titleElement.textContent = '';
            this.numberElement.textContent = '';
            this.descriptionElement.textContent = '';
            return;
        }

        this.currentScene = scene;
        this.numberElement.textContent = `${sceneIndex}/${totalScenes}`;
        this.titleElement.textContent = scene.title;
        this.descriptionElement.textContent = scene.description;

        // Update active button
        this.sceneButtons.querySelectorAll('.scene-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === sceneIndex - 1);
        });
    }

    /**
     * Update progress display
     * @param {number} currentTime - Current time in seconds
     * @param {number} duration - Total duration in seconds
     */
    updateProgress(currentTime, duration) {
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        this.progressFill.style.width = `${progress}%`;

        const formatTime = (t) => {
            const mins = Math.floor(t / 60);
            const secs = Math.floor(t % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        this.progressTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }

    /**
     * Update play/pause button state
     * @param {boolean} isPlaying
     */
    updatePlayState(isPlaying) {
        const playBtn = this.container.querySelector('[data-action="play-pause"]');
        if (playBtn) {
            playBtn.classList.toggle('playing', isPlaying);
        }
    }

    /**
     * Set up event handlers
     * @param {Object} handlers - Event handler callbacks
     */
    setEventHandlers(handlers) {
        // Control buttons
        this.container.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (handlers[action]) {
                    handlers[action]();
                }
            });
        });

        // Speed control
        const speedSelect = this.container.querySelector('[data-action="speed"]');
        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => {
                if (handlers.speed) {
                    handlers.speed(parseFloat(e.target.value));
                }
            });
        }

        // Scene buttons
        this.sceneButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('scene-btn')) {
                const index = parseInt(e.target.dataset.sceneIndex);
                if (handlers.jumpToScene) {
                    handlers.jumpToScene(index);
                }
            }
        });

        // Progress bar seeking
        const progressBar = this.container.querySelector('.progress-bar');
        if (progressBar && handlers.seek) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                handlers.seek(ratio);
            });
        }
    }

    /**
     * Clean up
     */
    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

/**
 * Create a help hint overlay
 */
export function createHelpHint() {
    const hint = document.createElement('div');
    hint.className = 'help-hint';
    hint.innerHTML = `
        <kbd>Space</kbd> Play/Pause &nbsp;
        <kbd>1-7</kbd> Jump to scene &nbsp;
        <kbd>T</kbd> Start tour &nbsp;
        <kbd>H</kbd> Toggle UI
    `;
    document.body.appendChild(hint);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        hint.style.transition = 'opacity 1s';
        hint.style.opacity = '0';
        setTimeout(() => hint.remove(), 1000);
    }, 5000);

    return hint;
}
