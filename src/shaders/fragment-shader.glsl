#version 300 es
precision highp float;

// ============================================================================
// Fragment Shader for Kerr Black Hole Ray Marching
// Phase 3: Accretion Disk with Relativistic Effects
// ============================================================================

// Include utility functions
#include "includes/utils.glsl"

// Include Kerr metric implementation
#include "includes/kerr-metric.glsl"

// Include geodesic integrator
#include "includes/geodesic-integrator.glsl"

// Include accretion disk physics
#include "includes/accretion-disk.glsl"

// ============================================================================
// Uniforms
// ============================================================================

// Resolution
uniform vec2 u_resolution;

// Time for animation
uniform float u_time;

// Black hole parameters
uniform float u_mass;        // M (normalized to 1)
uniform float u_spin;        // a (0 to M)

// Camera parameters
uniform vec3 u_cameraPos;    // Camera position in Cartesian coords
uniform vec3 u_cameraTarget; // Look-at target
uniform float u_fov;         // Field of view in radians

// Integrator parameters
uniform int u_maxSteps;
uniform float u_maxDistance;
uniform float u_escapeRadius;
uniform float u_stepSize;

// Accretion disk parameters
uniform bool u_showDisk;
uniform float u_diskInnerRadius;
uniform float u_diskOuterRadius;
uniform float u_diskTemperature;
uniform float u_diskThickness;

// Debug flags
uniform bool u_showHorizon;
uniform bool u_showPhotonSphere;
uniform bool u_showErgosphere;

// ============================================================================
// Input/Output
// ============================================================================

in vec2 v_uv;
out vec4 fragColor;

// ============================================================================
// Camera and Ray Generation
// ============================================================================

/**
 * Build camera matrix from position and target
 */
mat3 buildCameraMatrix(vec3 pos, vec3 target, vec3 up) {
    vec3 forward = normalize(target - pos);
    vec3 right = normalize(cross(forward, up));
    vec3 upVec = cross(right, forward);
    return mat3(right, upVec, forward);
}

/**
 * Generate ray direction for current pixel
 */
vec3 getRayDirection(vec2 uv, float fov, float aspect) {
    // Convert UV from [0,1] to [-1,1]
    vec2 ndc = uv * 2.0 - 1.0;

    // Apply aspect ratio
    ndc.x *= aspect;

    // Calculate ray direction in camera space
    float tanHalfFov = tan(fov * 0.5);
    vec3 rayDir = normalize(vec3(ndc * tanHalfFov, 1.0));

    return rayDir;
}

// ============================================================================
// Enhanced Starfield
// ============================================================================

/**
 * Hash function for procedural noise
 */
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

/**
 * Multi-layer procedural starfield with Milky Way band
 */
vec3 starfield(vec3 dir) {
    // Convert direction to spherical coordinates
    vec3 sph = cartesianToSpherical(dir);
    float theta = sph.y;  // Polar angle
    float phi = sph.z;    // Azimuthal angle

    // Base dark sky color
    vec3 skyColor = vec3(0.0, 0.0, 0.015);

    // Milky Way band - a brighter region along the galactic plane
    // Place it roughly at theta ≈ π/2 (equatorial) with some tilt
    float galacticAngle = theta + 0.3 * sin(phi * 2.0);
    float milkyWay = exp(-pow((galacticAngle - HALF_PI) * 3.0, 2.0));
    skyColor += vec3(0.02, 0.015, 0.025) * milkyWay * 0.5;

    // Add some galactic dust variation
    float dust = hash21(vec2(phi * 10.0, theta * 10.0));
    skyColor += vec3(0.01, 0.008, 0.012) * dust * milkyWay;

    // Multiple star layers for depth
    vec3 starLight = vec3(0.0);

    // Layer 1: Dense small stars
    {
        vec2 starUV = vec2(phi * 200.0, theta * 100.0);
        vec2 starCell = floor(starUV);
        vec2 starFrac = fract(starUV);

        float h = hash21(starCell);
        vec2 starPos = vec2(hash21(starCell + 0.1), hash21(starCell + 0.2));
        float dist = length(starFrac - starPos);

        // Star brightness based on hash
        float brightness = smoothstep(0.98, 1.0, h);
        float star = smoothstep(0.05, 0.0, dist) * brightness;

        // Slight color variation
        vec3 starColor = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.95, 0.8), hash21(starCell + 0.5));
        starLight += starColor * star * 0.5;
    }

    // Layer 2: Medium stars
    {
        vec2 starUV = vec2(phi * 80.0, theta * 40.0);
        vec2 starCell = floor(starUV);
        vec2 starFrac = fract(starUV);

        float h = hash21(starCell + 100.0);
        vec2 starPos = vec2(hash21(starCell + 100.1), hash21(starCell + 100.2));
        float dist = length(starFrac - starPos);

        float brightness = smoothstep(0.95, 1.0, h);
        float star = smoothstep(0.08, 0.0, dist) * brightness;

        vec3 starColor = mix(vec3(1.0, 0.9, 0.8), vec3(0.7, 0.8, 1.0), hash21(starCell + 100.5));
        starLight += starColor * star * 0.8;
    }

    // Layer 3: Bright stars (sparse)
    {
        vec2 starUV = vec2(phi * 30.0, theta * 15.0);
        vec2 starCell = floor(starUV);
        vec2 starFrac = fract(starUV);

        float h = hash21(starCell + 200.0);
        vec2 starPos = vec2(hash21(starCell + 200.1), hash21(starCell + 200.2));
        float dist = length(starFrac - starPos);

        float brightness = smoothstep(0.97, 1.0, h);
        float star = smoothstep(0.12, 0.0, dist) * brightness;

        // Add glow to bright stars
        float glow = smoothstep(0.3, 0.0, dist) * brightness * 0.1;

        vec3 starColor = mix(vec3(1.0, 0.95, 0.9), vec3(0.9, 0.95, 1.0), hash21(starCell + 200.5));
        starLight += starColor * (star + glow);
    }

    return skyColor + starLight;
}

// ============================================================================
// Main Ray Marching with Geodesic Integration and Accretion Disk
// ============================================================================

/**
 * Integrate geodesic with accretion disk sampling
 * Returns disk color accumulated along the path
 */
int integrateGeodesicWithDisk(
    vec3 camPos, vec3 rayDir,
    float M, float a,
    int maxSteps, float escapeRadius, float stepSize,
    out vec3 finalDir,
    out vec3 diskColor,
    out float diskAlpha
) {
    // Initialize
    float r, theta, phi, pr, ptheta, E, Lz, Q;
    initializeGeodesic(camPos, rayDir, M, a, r, theta, phi, pr, ptheta, E, Lz, Q);

    float rH = eventHorizonRadius(M, a);
    float rPh = photonSphereRadius(M, a);

    finalDir = rayDir;
    diskColor = vec3(0.0);
    diskAlpha = 0.0;

    float prevTheta = theta;
    float prevR = r;

    for (int i = 0; i < 1000; i++) {
        if (i >= maxSteps) {
            return RAY_MAX_STEPS;
        }

        // Check termination: captured
        if (r < rH * 1.001) {
            return RAY_CAPTURED;
        }

        // Check termination: escaped
        if (r > escapeRadius) {
            // Compute final direction from current position and momentum
            vec3 pos = boyerLindquistToCartesian(vec3(r, theta, phi), a);

            // Direction from velocity components
            float sinTheta = sin(theta);
            float cosTheta = cos(theta);

            // Convert BL velocities back to Cartesian direction
            vec3 rHat = normalize(pos);
            vec3 zAxis = vec3(0.0, 0.0, 1.0);
            vec3 phiHat = normalize(cross(zAxis, rHat));
            if (length(cross(zAxis, rHat)) < EPSILON) {
                phiHat = vec3(0.0, 1.0, 0.0);
            }

            float rxy = length(pos.xy);
            vec3 thetaHat;
            if (rxy > EPSILON) {
                thetaHat = vec3(
                    pos.z * pos.x / (r * rxy),
                    pos.z * pos.y / (r * rxy),
                    -rxy / r
                );
            } else {
                thetaHat = vec3(1.0, 0.0, 0.0);
            }

            // Reconstruct direction
            vec3 vel = geodesicDerivatives(r, theta, pr, ptheta, E, Lz, Q, M, a);

            finalDir = normalize(
                vel.x * rHat +
                r * vel.y * thetaHat +
                r * sinTheta * vel.z * phiHat
            );

            return RAY_ESCAPED;
        }

        // Sample accretion disk if enabled
        if (u_showDisk && diskAlpha < 0.99) {
            // Check if we crossed the equatorial plane
            bool crossedEquator = (theta - HALF_PI) * (prevTheta - HALF_PI) < 0.0;

            // Or if we're very close to it
            float distFromEquator = abs(theta - HALF_PI);
            bool nearEquator = distFromEquator < u_diskThickness * 2.0;

            if ((crossedEquator || nearEquator) &&
                r >= u_diskInnerRadius && r <= u_diskOuterRadius) {

                // Calculate disk emission at this point
                vec3 emission = diskEmission(
                    r, HALF_PI, phi, rayDir,
                    u_diskInnerRadius, u_diskOuterRadius,
                    u_diskTemperature, M, a
                );

                // Optical depth based on how we're passing through
                float pathLength = nearEquator ? distFromEquator / u_diskThickness : 1.0;
                float opticalDepth = 1.0 - exp(-pathLength * 5.0);

                // Accumulate with front-to-back compositing
                float alpha = opticalDepth * (1.0 - diskAlpha);
                diskColor += emission * alpha;
                diskAlpha += alpha;
            }
        }

        // Store previous position for crossing detection
        prevTheta = theta;
        prevR = r;

        // Adaptive step size
        float distToHorizon = r - rH;
        float h = stepSize * clamp(distToHorizon / rPh, 0.01, 1.0);

        // Near photon sphere, use smaller steps
        if (abs(r - rPh) < rPh * 0.5) {
            h *= 0.5;
        }

        // Near disk, use smaller steps for better sampling
        if (u_showDisk && r >= u_diskInnerRadius * 0.9 && r <= u_diskOuterRadius * 1.1) {
            float diskProximity = abs(theta - HALF_PI) / u_diskThickness;
            if (diskProximity < 5.0) {
                h *= max(0.2, diskProximity / 5.0);
            }
        }

        // RK4 step
        rk4Step(r, theta, phi, pr, ptheta, E, Lz, Q, M, a, h);

        // Safety: if r becomes invalid
        if (r < 0.0 || r != r) {  // r != r checks for NaN
            return RAY_CAPTURED;
        }
    }

    return RAY_MAX_STEPS;
}

/**
 * Ray march through curved spacetime using geodesic integration
 */
vec4 rayMarch(vec3 rayOrigin, vec3 rayDir) {
    float M = u_mass;
    float a = u_spin;

    // Integrate geodesic with disk sampling
    vec3 finalDir;
    vec3 diskColor;
    float diskAlpha;

    int result = integrateGeodesicWithDisk(
        rayOrigin, rayDir,
        M, a,
        u_maxSteps, u_escapeRadius, u_stepSize,
        finalDir,
        diskColor,
        diskAlpha
    );

    vec3 backgroundColor;
    if (result == RAY_CAPTURED) {
        // Fell into black hole - black background
        backgroundColor = vec3(0.0);
    } else {
        // Escaped - sample starfield with final (lensed) direction
        backgroundColor = starfield(finalDir);
    }

    // Composite disk over background
    vec3 finalColor = mix(backgroundColor, diskColor, diskAlpha);

    return vec4(finalColor, 1.0);
}

// ============================================================================
// Debug Visualization
// ============================================================================

/**
 * Add debug overlays for event horizon, photon sphere, etc.
 */
vec3 addDebugOverlays(vec3 color, vec3 rayOrigin, vec3 rayDir) {
    float M = u_mass;
    float a = u_spin;

    // Calculate critical radii
    float rH = eventHorizonRadius(M, a);
    float rPh = photonSphereRadius(M, a);

    // Simple sphere intersection for debug visualization
    if (u_showHorizon) {
        vec3 oc = rayOrigin;
        float b = dot(oc, rayDir);
        float c = dot(oc, oc) - rH * rH;
        float discriminant = b * b - c;

        if (discriminant > 0.0) {
            float t = -b - sqrt(discriminant);
            if (t > 0.0) {
                color = mix(color, vec3(0.3, 0.0, 0.0), 0.2);
            }
        }
    }

    if (u_showPhotonSphere) {
        vec3 oc = rayOrigin;
        float b = dot(oc, rayDir);
        float c = dot(oc, oc) - rPh * rPh;
        float discriminant = b * b - c;

        if (discriminant > 0.0) {
            float t1 = -b - sqrt(discriminant);
            float t2 = -b + sqrt(discriminant);
            if (t1 > 0.0 || t2 > 0.0) {
                color += vec3(0.1, 0.1, 0.0) * 0.3;
            }
        }
    }

    if (u_showErgosphere) {
        // Ergosphere at equator is at r = 2M
        float rErgo = 2.0 * M;
        vec3 oc = rayOrigin;
        float b = dot(oc, rayDir);
        float c = dot(oc, oc) - rErgo * rErgo;
        float discriminant = b * b - c;

        if (discriminant > 0.0) {
            float t = -b - sqrt(discriminant);
            if (t > 0.0) {
                vec3 hitPos = rayOrigin + t * rayDir;
                // Only show where ergosphere extends beyond horizon
                float hitR = length(hitPos);
                if (hitR > rH && hitR < rErgo) {
                    color += vec3(0.0, 0.1, 0.1) * 0.3;
                }
            }
        }
    }

    return color;
}

// ============================================================================
// Main
// ============================================================================

void main() {
    // Calculate aspect ratio
    float aspect = u_resolution.x / u_resolution.y;

    // Build camera matrix
    vec3 up = vec3(0.0, 0.0, 1.0);
    mat3 cameraMat = buildCameraMatrix(u_cameraPos, u_cameraTarget, up);

    // Get ray direction in world space
    vec3 rayDirCam = getRayDirection(v_uv, u_fov, aspect);
    vec3 rayDir = cameraMat * rayDirCam;

    // Ray march with geodesic integration
    vec4 result = rayMarch(u_cameraPos, rayDir);
    vec3 color = result.rgb;

    // Add debug overlays if enabled
    color = addDebugOverlays(color, u_cameraPos, rayDir);

    // Tone mapping and gamma correction
    color = toneMapACES(color);
    color = gammaCorrect(color, 2.2);

    fragColor = vec4(color, 1.0);
}
