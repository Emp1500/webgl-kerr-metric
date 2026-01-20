/**
 * Visual Validation Framework (Phase 7)
 *
 * Provides tools for capturing reference screenshots and comparing
 * rendered output for visual regression testing.
 *
 * Usage:
 *   In browser console:
 *   visualValidation.capture()  // Capture current render as reference
 *   visualValidation.compare()  // Compare current render to reference
 */

/**
 * Visual Validation Suite
 */
class VisualValidation {
    constructor() {
        this.referenceImage = null;
        this.referenceData = null;
        this.lastComparison = null;
        this.canvas = null;
    }

    /**
     * Initialize with canvas reference
     */
    init(simulation) {
        this.simulation = simulation;
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) {
            console.error('Canvas not found');
            return;
        }
        console.log('Visual validation initialized');
    }

    /**
     * Capture current render as reference image
     */
    capture() {
        if (!this.canvas) {
            console.error('Visual validation not initialized');
            return null;
        }

        console.log('Capturing reference image...');

        // Get canvas data
        const ctx = this.canvas.getContext('webgl2');
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Read pixels from WebGL context
        const pixels = new Uint8Array(width * height * 4);
        ctx.readPixels(0, 0, width, height, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);

        // Store reference
        this.referenceData = {
            pixels: pixels,
            width: width,
            height: height,
            timestamp: new Date().toISOString(),
            params: this._getCurrentParams()
        };

        // Create image data URL for preview
        this.referenceImage = this._pixelsToDataURL(pixels, width, height);

        console.log(`Reference captured: ${width}x${height}`);
        console.log('Params:', this.referenceData.params);

        return this.referenceImage;
    }

    /**
     * Compare current render to reference
     */
    compare() {
        if (!this.referenceData) {
            console.error('No reference image captured. Run visualValidation.capture() first.');
            return null;
        }

        if (!this.canvas) {
            console.error('Visual validation not initialized');
            return null;
        }

        console.log('Comparing to reference...');

        const ctx = this.canvas.getContext('webgl2');
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Check dimensions match
        if (width !== this.referenceData.width || height !== this.referenceData.height) {
            console.warn(`Resolution mismatch: current ${width}x${height}, reference ${this.referenceData.width}x${this.referenceData.height}`);
        }

        // Read current pixels
        const currentPixels = new Uint8Array(width * height * 4);
        ctx.readPixels(0, 0, width, height, ctx.RGBA, ctx.UNSIGNED_BYTE, currentPixels);

        // Compare
        const comparison = this._comparePixels(
            this.referenceData.pixels,
            currentPixels,
            Math.min(width, this.referenceData.width),
            Math.min(height, this.referenceData.height)
        );

        this.lastComparison = comparison;

        // Print results
        this._printComparison(comparison);

        return comparison;
    }

    /**
     * Compare two pixel arrays
     */
    _comparePixels(ref, current, width, height) {
        let totalDiff = 0;
        let maxDiff = 0;
        let diffCount = 0;
        const diffPixels = new Uint8Array(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;

                // Calculate per-channel difference
                const rDiff = Math.abs(ref[i] - current[i]);
                const gDiff = Math.abs(ref[i + 1] - current[i + 1]);
                const bDiff = Math.abs(ref[i + 2] - current[i + 2]);

                const pixelDiff = (rDiff + gDiff + bDiff) / 3;

                totalDiff += pixelDiff;
                maxDiff = Math.max(maxDiff, pixelDiff);

                if (pixelDiff > 1) {
                    diffCount++;
                }

                // Create diff visualization (highlight differences in red)
                if (pixelDiff > 5) {
                    diffPixels[i] = 255;      // R
                    diffPixels[i + 1] = 0;    // G
                    diffPixels[i + 2] = 0;    // B
                    diffPixels[i + 3] = 255;  // A
                } else {
                    diffPixels[i] = current[i];
                    diffPixels[i + 1] = current[i + 1];
                    diffPixels[i + 2] = current[i + 2];
                    diffPixels[i + 3] = 255;
                }
            }
        }

        const totalPixels = width * height;
        const mae = totalDiff / totalPixels;  // Mean Absolute Error
        const diffPercentage = (diffCount / totalPixels) * 100;

        return {
            width,
            height,
            totalPixels,
            diffCount,
            diffPercentage: diffPercentage.toFixed(2) + '%',
            meanAbsoluteError: mae.toFixed(2),
            maxDifference: maxDiff,
            passed: mae < 5,  // Threshold for passing
            diffImage: this._pixelsToDataURL(diffPixels, width, height)
        };
    }

    /**
     * Convert pixel array to data URL
     */
    _pixelsToDataURL(pixels, width, height) {
        // Create a temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // Create ImageData (flip vertically since WebGL is bottom-up)
        const imageData = tempCtx.createImageData(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcI = ((height - 1 - y) * width + x) * 4;
                const dstI = (y * width + x) * 4;
                imageData.data[dstI] = pixels[srcI];
                imageData.data[dstI + 1] = pixels[srcI + 1];
                imageData.data[dstI + 2] = pixels[srcI + 2];
                imageData.data[dstI + 3] = pixels[srcI + 3];
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        return tempCanvas.toDataURL('image/png');
    }

    /**
     * Get current simulation parameters for reference
     */
    _getCurrentParams() {
        if (!this.simulation) return {};

        return {
            spin: this.simulation.params.blackHole.spin,
            mass: this.simulation.params.blackHole.mass,
            cameraDistance: this.simulation.params.camera.distance,
            cameraTheta: this.simulation.params.camera.theta,
            cameraPhi: this.simulation.params.camera.phi,
            diskEnabled: this.simulation.params.accretionDisk.enabled,
            jetsEnabled: this.simulation.params.advancedFeatures.showJets,
            photonRingEnabled: this.simulation.params.advancedFeatures.showPhotonRing,
            quality: this.simulation.qualityManager?.getCurrentQuality()
        };
    }

    /**
     * Print comparison results
     */
    _printComparison(comparison) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('              VISUAL COMPARISON RESULTS                         ');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`  Resolution: ${comparison.width}x${comparison.height}`);
        console.log(`  Total pixels: ${comparison.totalPixels}`);
        console.log(`  Pixels with difference: ${comparison.diffCount} (${comparison.diffPercentage})`);
        console.log(`  Mean Absolute Error: ${comparison.meanAbsoluteError}`);
        console.log(`  Max Difference: ${comparison.maxDifference}`);
        console.log('');
        console.log(`  Result: ${comparison.passed ? '✓ PASS' : '✗ FAIL'}`);
        console.log('');
        console.log('  To view diff image: visualValidation.showDiff()');
        console.log('═══════════════════════════════════════════════════════════════');
    }

    /**
     * Show diff image in new window
     */
    showDiff() {
        if (!this.lastComparison || !this.lastComparison.diffImage) {
            console.error('No comparison available. Run visualValidation.compare() first.');
            return;
        }

        // Open in new window
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
            <head><title>Visual Diff</title></head>
            <body style="margin:0; background:#000;">
                <img src="${this.lastComparison.diffImage}" style="max-width:100%; max-height:100vh;">
            </body>
            </html>
        `);
    }

    /**
     * Show reference image in new window
     */
    showReference() {
        if (!this.referenceImage) {
            console.error('No reference image. Run visualValidation.capture() first.');
            return;
        }

        const win = window.open('', '_blank');
        win.document.write(`
            <html>
            <head><title>Reference Image</title></head>
            <body style="margin:0; background:#000;">
                <img src="${this.referenceImage}" style="max-width:100%; max-height:100vh;">
            </body>
            </html>
        `);
    }

    /**
     * Save reference to localStorage
     */
    saveReference() {
        if (!this.referenceData) {
            console.error('No reference to save');
            return;
        }

        try {
            // Can't store full pixel array in localStorage (too large)
            // Store metadata and image data URL instead
            const saveData = {
                timestamp: this.referenceData.timestamp,
                width: this.referenceData.width,
                height: this.referenceData.height,
                params: this.referenceData.params,
                image: this.referenceImage
            };

            localStorage.setItem('visualValidation_reference', JSON.stringify(saveData));
            console.log('Reference saved to localStorage');
        } catch (e) {
            console.error('Failed to save reference:', e.message);
        }
    }

    /**
     * Load reference from localStorage
     */
    loadReference() {
        try {
            const data = localStorage.getItem('visualValidation_reference');
            if (!data) {
                console.log('No saved reference found');
                return false;
            }

            const saveData = JSON.parse(data);
            this.referenceImage = saveData.image;
            this.referenceData = {
                timestamp: saveData.timestamp,
                width: saveData.width,
                height: saveData.height,
                params: saveData.params,
                pixels: null  // Not stored due to size
            };

            console.log('Reference loaded from localStorage');
            console.log('  Timestamp:', saveData.timestamp);
            console.log('  Resolution:', `${saveData.width}x${saveData.height}`);
            console.log('  Note: Pixel comparison unavailable (only image stored)');
            return true;
        } catch (e) {
            console.error('Failed to load reference:', e.message);
            return false;
        }
    }

    /**
     * Get validation status
     */
    getStatus() {
        return {
            hasReference: !!this.referenceData,
            referenceTimestamp: this.referenceData?.timestamp,
            referenceResolution: this.referenceData ? `${this.referenceData.width}x${this.referenceData.height}` : null,
            lastComparison: this.lastComparison ? {
                passed: this.lastComparison.passed,
                mae: this.lastComparison.meanAbsoluteError,
                diffPercentage: this.lastComparison.diffPercentage
            } : null
        };
    }
}

// Create global instance
const visualValidation = new VisualValidation();

// Export for module use
export { visualValidation, VisualValidation };

// Attach to window for console access
if (typeof window !== 'undefined') {
    window.visualValidation = visualValidation;
}
