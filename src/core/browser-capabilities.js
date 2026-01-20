/**
 * Browser Capabilities Detection (Phase 6)
 *
 * Detects browser features, WebGL capabilities, and device characteristics
 * to optimize quality settings and provide compatibility information.
 */

/**
 * GPU Tier levels for quality recommendations
 */
export const GPUTier = {
    INTEGRATED: 'integrated',
    MID_RANGE: 'mid-range',
    HIGH_END: 'high-end',
    UNKNOWN: 'unknown'
};

/**
 * Browser Capabilities Detector
 */
export class BrowserCapabilities {
    constructor(gl) {
        this.gl = gl;
        this.capabilities = this._detect();
    }

    /**
     * Detect all browser and WebGL capabilities
     */
    _detect() {
        const gl = this.gl;

        return {
            browser: this._detectBrowser(),
            device: this._detectDevice(),
            webgl: this._detectWebGL(gl),
            gpu: this._detectGPU(gl),
            memory: this._detectMemory(),
            features: this._detectFeatures(gl),
            recommendedQuality: null  // Set after all detection
        };
    }

    /**
     * Detect browser name and version
     */
    _detectBrowser() {
        const ua = navigator.userAgent;
        let browser = { name: 'Unknown', version: '0' };

        if (ua.includes('Firefox/')) {
            browser.name = 'Firefox';
            browser.version = ua.match(/Firefox\/(\d+)/)?.[1] || '0';
        } else if (ua.includes('Edg/')) {
            browser.name = 'Edge';
            browser.version = ua.match(/Edg\/(\d+)/)?.[1] || '0';
        } else if (ua.includes('Chrome/')) {
            browser.name = 'Chrome';
            browser.version = ua.match(/Chrome\/(\d+)/)?.[1] || '0';
        } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
            browser.name = 'Safari';
            browser.version = ua.match(/Version\/(\d+)/)?.[1] || '0';
        }

        browser.isModern = parseInt(browser.version) >= this._getMinVersion(browser.name);

        return browser;
    }

    /**
     * Get minimum recommended browser version
     */
    _getMinVersion(browserName) {
        const minVersions = {
            Chrome: 90,
            Firefox: 90,
            Safari: 15,
            Edge: 90
        };
        return minVersions[browserName] || 0;
    }

    /**
     * Detect device type
     */
    _detectDevice() {
        const ua = navigator.userAgent;
        let type = 'desktop';

        if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
            if (/iPad|Tablet/i.test(ua) || (navigator.maxTouchPoints > 0 && screen.width >= 768)) {
                type = 'tablet';
            } else {
                type = 'mobile';
            }
        }

        return {
            type,
            isMobile: type === 'mobile',
            isTablet: type === 'tablet',
            isDesktop: type === 'desktop',
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth: screen.width,
            screenHeight: screen.height,
            touchEnabled: navigator.maxTouchPoints > 0
        };
    }

    /**
     * Detect WebGL capabilities
     */
    _detectWebGL(gl) {
        return {
            version: 2,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
            maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
            maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            maxCombinedTextureUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
            maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
            aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)
        };
    }

    /**
     * Detect GPU information
     */
    _detectGPU(gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

        let vendor = 'Unknown';
        let renderer = 'Unknown';

        if (debugInfo) {
            vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        } else {
            vendor = gl.getParameter(gl.VENDOR);
            renderer = gl.getParameter(gl.RENDERER);
        }

        const tier = this._estimateGPUTier(renderer, vendor);

        return {
            vendor,
            renderer,
            tier,
            isIntegrated: tier === GPUTier.INTEGRATED,
            isHighEnd: tier === GPUTier.HIGH_END
        };
    }

    /**
     * Estimate GPU tier based on renderer string
     */
    _estimateGPUTier(renderer, vendor) {
        const r = renderer.toLowerCase();
        const v = vendor.toLowerCase();

        // High-end discrete GPUs
        const highEnd = [
            'rtx 30', 'rtx 40', 'rtx 50',
            'rx 6', 'rx 7',
            'radeon pro',
            'geforce gtx 10', 'geforce gtx 16',
            'quadro',
            'apple m1 pro', 'apple m1 max', 'apple m2', 'apple m3'
        ];

        // Mid-range GPUs
        const midRange = [
            'gtx 9', 'gtx 1050', 'gtx 1060',
            'rx 5', 'rx 4',
            'apple m1',
            'radeon rx',
            'geforce mx'
        ];

        // Integrated graphics
        const integrated = [
            'intel', 'intel(r) hd', 'intel(r) uhd', 'intel(r) iris',
            'adreno', 'mali', 'powervr',
            'apple gpu',  // Older iOS
            'llvmpipe', 'swiftshader', 'mesa'  // Software rendering
        ];

        for (const pattern of highEnd) {
            if (r.includes(pattern)) return GPUTier.HIGH_END;
        }

        for (const pattern of midRange) {
            if (r.includes(pattern)) return GPUTier.MID_RANGE;
        }

        for (const pattern of integrated) {
            if (r.includes(pattern)) return GPUTier.INTEGRATED;
        }

        // Default to mid-range if unknown
        return GPUTier.UNKNOWN;
    }

    /**
     * Detect available memory
     */
    _detectMemory() {
        const memory = {
            deviceMemory: navigator.deviceMemory || null,  // Device RAM in GB
            jsHeapLimit: null,
            jsHeapUsed: null
        };

        if (performance.memory) {
            memory.jsHeapLimit = performance.memory.jsHeapSizeLimit / (1024 * 1024);
            memory.jsHeapUsed = performance.memory.usedJSHeapSize / (1024 * 1024);
        }

        return memory;
    }

    /**
     * Detect WebGL2 feature support
     */
    _detectFeatures(gl) {
        const features = {
            floatTextures: !!gl.getExtension('EXT_color_buffer_float'),
            floatBlend: !!gl.getExtension('EXT_float_blend'),
            floatLinear: !!gl.getExtension('OES_texture_float_linear'),
            gpuTiming: !!gl.getExtension('EXT_disjoint_timer_query_webgl2'),
            drawBuffers: true,  // Built into WebGL2
            vertexArrayObjects: true,  // Built into WebGL2
            instancedArrays: true,  // Built into WebGL2
            colorBufferHalfFloat: !!gl.getExtension('EXT_color_buffer_half_float'),
            textureFilterAnisotropic: !!gl.getExtension('EXT_texture_filter_anisotropic'),
            compressedTextures: !!gl.getExtension('WEBGL_compressed_texture_s3tc')
        };

        return features;
    }

    /**
     * Get recommended quality level based on detected capabilities
     */
    getRecommendedQuality() {
        const { device, gpu, memory, webgl } = this.capabilities;

        // Mobile devices
        if (device.isMobile) {
            return gpu.tier === GPUTier.HIGH_END ? 'low' : 'potato';
        }

        // Tablets
        if (device.isTablet) {
            return gpu.tier === GPUTier.HIGH_END ? 'medium' : 'low';
        }

        // Desktop - based on GPU tier
        switch (gpu.tier) {
            case GPUTier.HIGH_END:
                return 'ultra';
            case GPUTier.MID_RANGE:
                return 'high';
            case GPUTier.INTEGRATED:
                return 'medium';
            default:
                // Check memory as fallback
                if (memory.deviceMemory && memory.deviceMemory >= 8) {
                    return 'high';
                }
                return 'medium';
        }
    }

    /**
     * Get all capabilities
     */
    getCapabilities() {
        // Calculate recommended quality if not yet done
        if (!this.capabilities.recommendedQuality) {
            this.capabilities.recommendedQuality = this.getRecommendedQuality();
        }
        return this.capabilities;
    }

    /**
     * Get summary string
     */
    getSummary() {
        const c = this.capabilities;
        return [
            `Browser: ${c.browser.name} ${c.browser.version}`,
            `Device: ${c.device.type} (${c.device.screenWidth}x${c.device.screenHeight})`,
            `GPU: ${c.gpu.renderer} (${c.gpu.tier})`,
            `Max Texture: ${c.webgl.maxTextureSize}`,
            `Recommended: ${this.getRecommendedQuality()}`
        ].join(' | ');
    }

    /**
     * Log all capabilities to console
     */
    logCapabilities() {
        const c = this.getCapabilities();

        console.group('Browser Capabilities');
        console.log('Browser:', c.browser);
        console.log('Device:', c.device);
        console.log('GPU:', c.gpu);
        console.log('WebGL:', c.webgl);
        console.log('Memory:', c.memory);
        console.log('Features:', c.features);
        console.log('Recommended Quality:', c.recommendedQuality);
        console.groupEnd();
    }

    /**
     * Check if browser is compatible
     */
    isCompatible() {
        return this.capabilities.browser.isModern &&
               this.capabilities.webgl.version >= 2;
    }

    /**
     * Get compatibility warnings
     */
    getWarnings() {
        const warnings = [];
        const c = this.capabilities;

        if (!c.browser.isModern) {
            warnings.push(`Browser version ${c.browser.version} is outdated. Consider updating ${c.browser.name}.`);
        }

        if (c.gpu.tier === GPUTier.INTEGRATED) {
            warnings.push('Integrated graphics detected. Performance may be limited.');
        }

        if (c.device.isMobile) {
            warnings.push('Mobile device detected. Quality settings have been reduced.');
        }

        if (c.memory.deviceMemory && c.memory.deviceMemory < 4) {
            warnings.push('Low device memory. Some features may be disabled.');
        }

        if (!c.features.floatTextures) {
            warnings.push('Float textures not supported. Visual quality may be reduced.');
        }

        return warnings;
    }
}
