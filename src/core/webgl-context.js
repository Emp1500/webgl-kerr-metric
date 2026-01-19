/**
 * WebGL 2.0 Context Manager
 * Handles canvas initialization, context creation, and resize management
 */

export class WebGLContext {
    constructor(canvasId = 'canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }

        this.gl = null;
        this.extensions = {};
        this.resizeCallbacks = [];
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        this._init();
        this._setupResize();
    }

    _init() {
        // Request WebGL 2.0 context
        const contextAttributes = {
            alpha: false,
            depth: false,
            stencil: false,
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
        };

        this.gl = this.canvas.getContext('webgl2', contextAttributes);

        if (!this.gl) {
            throw new Error(
                'WebGL 2.0 is not available. Please use a modern browser with WebGL 2.0 support.'
            );
        }

        // Check for required extensions
        this._checkExtensions();

        // Initial resize
        this._resize();

        // Set default GL state
        this._setDefaultState();

        console.log('WebGL 2.0 context initialized');
        console.log('Renderer:', this.gl.getParameter(this.gl.RENDERER));
        console.log('Vendor:', this.gl.getParameter(this.gl.VENDOR));
        console.log('Max texture size:', this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
    }

    _checkExtensions() {
        const gl = this.gl;

        // Optional extensions that improve quality/performance
        const optionalExtensions = [
            'EXT_color_buffer_float',
            'OES_texture_float_linear',
            'EXT_float_blend'
        ];

        for (const extName of optionalExtensions) {
            const ext = gl.getExtension(extName);
            if (ext) {
                this.extensions[extName] = ext;
                console.log(`Extension ${extName}: available`);
            } else {
                console.log(`Extension ${extName}: not available`);
            }
        }
    }

    _setDefaultState() {
        const gl = this.gl;

        // Clear color to black
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Disable depth testing (not needed for ray marching)
        gl.disable(gl.DEPTH_TEST);

        // Disable blending initially
        gl.disable(gl.BLEND);

        // Disable face culling (full-screen quad)
        gl.disable(gl.CULL_FACE);
    }

    _setupResize() {
        // Use ResizeObserver for more reliable resize detection
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                this._resize();
            });
            resizeObserver.observe(this.canvas);
        } else {
            // Fallback to window resize event
            window.addEventListener('resize', () => this._resize());
        }
    }

    _resize() {
        const displayWidth = Math.floor(this.canvas.clientWidth * this.pixelRatio);
        const displayHeight = Math.floor(this.canvas.clientHeight * this.pixelRatio);

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, displayWidth, displayHeight);

            // Notify callbacks
            for (const callback of this.resizeCallbacks) {
                callback(displayWidth, displayHeight);
            }
        }
    }

    /**
     * Register a callback to be called on resize
     */
    onResize(callback) {
        this.resizeCallbacks.push(callback);
        // Call immediately with current size
        callback(this.canvas.width, this.canvas.height);
    }

    /**
     * Get current canvas dimensions
     */
    getSize() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Get aspect ratio
     */
    getAspectRatio() {
        return this.canvas.width / this.canvas.height;
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    /**
     * Check if an extension is available
     */
    hasExtension(name) {
        return !!this.extensions[name];
    }

    /**
     * Get the WebGL context
     */
    getContext() {
        return this.gl;
    }
}
