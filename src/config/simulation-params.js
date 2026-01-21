/**
 * Simulation parameters for Kerr black hole visualization
 */

export const defaultParams = {
    // Black hole parameters
    blackHole: {
        mass: 1.0,           // Normalized mass (M = 1)
        spin: 0.9,           // Spin parameter a/M (0 = Schwarzschild, 1 = extremal Kerr)
    },

    // Camera parameters - edge-on view to show gravitational lensing
    camera: {
        distance: 25.0,      // Distance from black hole in units of M
        theta: Math.PI / 2.3, // Slightly above equator for dramatic disk-wrapping view
        phi: 0.0,            // Azimuthal angle
        fov: 45.0,           // Narrower FOV for cinematic view
    },

    // Ray marching parameters
    rayMarching: {
        maxSteps: 500,       // Maximum integration steps
        stepSize: 0.1,       // Initial step size in units of M
        minStepSize: 0.001,  // Minimum step size near horizon
        maxDistance: 100.0,  // Maximum ray distance before termination
        escapeRadius: 50.0,  // Radius at which ray is considered escaped
    },

    // Geodesic integrator parameters (Phase 2)
    integrator: {
        method: 'rk4',       // Integration method (rk4)
        stepSize: 0.15,      // Base step size in units of M
        adaptiveSteps: true, // Use adaptive step sizing
        maxSteps: 800,       // Maximum integration steps per ray
    },

    // Accretion disk parameters (Phase 3) - NASA visualization style
    accretionDisk: {
        enabled: true,       // Enable/disable disk rendering
        innerRadius: null,   // Will be set to ISCO automatically
        outerRadius: 25.0,   // Outer edge in units of M (wide disk for dramatic effect)
        temperature: 3e7,    // Peak temperature in Kelvin (30 million K for bright disk)
        thickness: 0.02,     // Disk half-thickness ratio (h/r) - very thin for sharp rings
    },

    // Rendering parameters
    rendering: {
        resolution: 1.0,     // Resolution multiplier (1.0 = native)
        gammaCorrection: 2.2,
        exposure: 1.0,
        bloomEnabled: false,
        bloomIntensity: 0.5,
    },

    // Animation parameters
    animation: {
        autoRotate: false,
        rotationSpeed: 0.1,  // Radians per second
        diskRotation: true,
        diskAngularVelocity: 0.5, // Relative to Keplerian
    },

    // Advanced features (Phase 4)
    advancedFeatures: {
        showJets: true,           // Relativistic jets from poles
        showPhotonRing: true,     // Photon ring / light ring effect
    },

    // Debug parameters
    debug: {
        showEventHorizon: true,
        showPhotonSphere: false,
        showErgosphere: true,     // Now with enhanced frame-dragging visualization
        showISCO: false,
        showCoordinateGrid: false,
        logPerformance: false,
    },

    // Quality presets (Phase 6)
    quality: {
        currentLevel: 'high',    // Current active quality level
        adaptiveEnabled: true,   // Enable adaptive quality
        targetFps: 60,           // Target framerate for adaptive quality
        minFps: 30,              // Minimum acceptable framerate
        adaptiveCooldown: 2000,  // Cooldown between quality changes (ms)
    }
};

/**
 * Quality preset definitions (Phase 6)
 * Each preset defines resolution multiplier, integration steps, and feature flags
 */
export const qualityPresets = {
    ultra: {
        name: 'Ultra',
        resolution: 2.0,
        maxSteps: 1000,
        stepSize: 0.1,
        features: {
            showJets: true,
            showPhotonRing: true,
            showErgosphere: true,
            diskEnabled: true
        }
    },
    high: {
        name: 'High',
        resolution: 1.0,
        maxSteps: 800,
        stepSize: 0.15,
        features: {
            showJets: true,
            showPhotonRing: true,
            showErgosphere: true,
            diskEnabled: true
        }
    },
    medium: {
        name: 'Medium',
        resolution: 0.75,
        maxSteps: 500,
        stepSize: 0.2,
        features: {
            showJets: true,
            showPhotonRing: true,
            showErgosphere: false,
            diskEnabled: true
        }
    },
    low: {
        name: 'Low',
        resolution: 0.5,
        maxSteps: 300,
        stepSize: 0.3,
        features: {
            showJets: false,
            showPhotonRing: true,
            showErgosphere: false,
            diskEnabled: true
        }
    },
    potato: {
        name: 'Potato',
        resolution: 0.33,
        maxSteps: 150,
        stepSize: 0.4,
        features: {
            showJets: false,
            showPhotonRing: false,
            showErgosphere: false,
            diskEnabled: true
        }
    }
};

/**
 * Get ordered list of quality levels (highest to lowest)
 */
export function getQualityLevels() {
    return ['ultra', 'high', 'medium', 'low', 'potato'];
}

/**
 * Create a copy of params with custom overrides
 */
export function createParams(overrides = {}) {
    return deepMerge(structuredClone(defaultParams), overrides);
}

/**
 * Deep merge helper
 */
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = target[key] || {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}
