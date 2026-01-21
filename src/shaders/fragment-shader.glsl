#version 300 es
precision highp float;

// ============================================================================
// Fragment Shader for Kerr Black Hole Ray Marching
// Phase 4: Advanced Features (Photon Ring, Jets, Ergosphere)
// ============================================================================

// Include utility functions
#include "includes/utils.glsl"

// Include Kerr metric implementation
#include "includes/kerr-metric.glsl"

// Include geodesic integrator
#include "includes/geodesic-integrator.glsl"

// Include accretion disk physics
#include "includes/accretion-disk.glsl"

// Include advanced features (jets, ergosphere, photon ring)
#include "includes/advanced-features.glsl"

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

// Advanced features
uniform bool u_showJets;
uniform bool u_showPhotonRing;

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
 * Background - pure black void like NASA visualization
 * No stars, just the dark emptiness of space
 */
vec3 starfield(vec3 dir) {
    // Pure black background - matches NASA/scientific visualizations
    return vec3(0.0);
}

// ============================================================================
// Main Ray Marching with Geodesic Integration and All Features
// ============================================================================

/**
 * Integrate geodesic with all feature sampling
 * Returns accumulated colors from disk, jets, ergosphere, and photon ring data
 */
int integrateGeodesicWithFeatures(
    vec3 camPos, vec3 rayDir,
    float M, float a,
    int maxSteps, float escapeRadius, float stepSize,
    float time,
    out vec3 finalDir,
    out vec3 diskColor,
    out float diskAlpha,
    out vec3 jetColor,
    out vec3 ergoColor,
    out float minRadius,
    out float totalPhiChange
) {
    // Initialize
    float r, theta, phi, pr, ptheta, E, Lz, Q;
    initializeGeodesic(camPos, rayDir, M, a, r, theta, phi, pr, ptheta, E, Lz, Q);

    float rH = eventHorizonRadius(M, a);
    float rPh = photonSphereRadius(M, a);

    finalDir = rayDir;
    diskColor = vec3(0.0);
    diskAlpha = 0.0;
    jetColor = vec3(0.0);
    ergoColor = vec3(0.0);
    minRadius = r;
    totalPhiChange = 0.0;

    float prevTheta = theta;
    float prevR = r;
    float prevPhi = phi;

    for (int i = 0; i < 1000; i++) {
        if (i >= maxSteps) {
            return RAY_MAX_STEPS;
        }

        // Track minimum radius for photon ring calculation
        minRadius = min(minRadius, r);

        // Track total phi change (for counting orbits)
        float dPhi = phi - prevPhi;
        if (dPhi > PI) dPhi -= TWO_PI;
        if (dPhi < -PI) dPhi += TWO_PI;
        totalPhiChange += abs(dPhi);

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

        // Get current position in Cartesian for feature sampling
        vec3 currentPos = boyerLindquistToCartesian(vec3(r, theta, phi), a);

        // Sample relativistic jets
        if (u_showJets) {
            vec3 jetSample = sampleJet(currentPos, rayDir, M, a, time);
            jetColor += jetSample * (1.0 - diskAlpha);
        }

        // Sample ergosphere visualization
        if (u_showErgosphere) {
            vec3 ergoSample = ergosphereVisualization(currentPos, rayDir, M, a, time);
            ergoColor += ergoSample * 0.1;
        }

        // Sample accretion disk - enhanced for NASA-style gravitational lensing
        // Shows disk wrapping around both top AND bottom of black hole
        if (u_showDisk && diskAlpha < 0.995) {
            // Check if we crossed the equatorial plane
            bool crossedEquator = (theta - HALF_PI) * (prevTheta - HALF_PI) < 0.0;

            // Or if we're very close to it
            float distFromEquator = abs(theta - HALF_PI);
            bool nearEquator = distFromEquator < u_diskThickness * 4.0;

            if ((crossedEquator || nearEquator) &&
                r >= u_diskInnerRadius * 0.95 && r <= u_diskOuterRadius * 1.1) {

                // Calculate disk emission at this point
                vec3 emission = diskEmission(
                    r, HALF_PI, phi, rayDir,
                    u_diskInnerRadius, u_diskOuterRadius,
                    u_diskTemperature, M, a
                );

                // Optical depth calculation
                float pathLength = nearEquator ? distFromEquator / u_diskThickness : 1.0;
                float opticalDepth = 1.0 - exp(-pathLength * 10.0);

                // === GRAVITATIONAL LENSING BOOST ===
                // Rays that cross the equator multiple times are seeing the back of the disk
                // wrapped around the black hole - these should be BRIGHT
                float lensBoost = 1.0;

                if (crossedEquator) {
                    // How steep is the crossing? Shallower = more tangent = brighter
                    float crossingAngle = abs(prevTheta - theta);
                    float tangentFactor = smoothstep(0.15, 0.005, crossingAngle);

                    // Significant boost for tangent crossings
                    lensBoost = 1.0 + tangentFactor * 4.0;

                    // Extra boost if this isn't the first crossing (back side of disk)
                    if (totalPhiChange > PI * 0.5) {
                        lensBoost *= 1.5;  // Lensed light from back
                    }
                }

                // Inner edge is very bright
                float innerBoost = 1.0 + smoothstep(u_diskOuterRadius * 0.4, u_diskInnerRadius, r) * 2.5;

                // Accumulate with front-to-back compositing
                float alpha = opticalDepth * (1.0 - diskAlpha);
                alpha = min(alpha, 0.95);  // Prevent complete opacity

                diskColor += emission * alpha * lensBoost * innerBoost;
                diskAlpha += alpha * 0.8;  // Slight transparency to see layers
            }
        }

        // Store previous position for crossing detection
        prevTheta = theta;
        prevR = r;
        prevPhi = phi;

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

        // Near jets, use smaller steps
        if (u_showJets && abs(currentPos.z) > rH * 2.0) {
            float cylR = length(currentPos.xy);
            float jetRadius = 0.5 * M + abs(currentPos.z) * 0.1;
            if (cylR < jetRadius * 2.0) {
                h *= 0.7;
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

    // Integrate geodesic with all feature sampling
    vec3 finalDir;
    vec3 diskColor;
    float diskAlpha;
    vec3 jetColor;
    vec3 ergoColor;
    float minRadius;
    float totalPhiChange;

    int result = integrateGeodesicWithFeatures(
        rayOrigin, rayDir,
        M, a,
        u_maxSteps, u_escapeRadius, u_stepSize,
        u_time,
        finalDir,
        diskColor,
        diskAlpha,
        jetColor,
        ergoColor,
        minRadius,
        totalPhiChange
    );

    vec3 backgroundColor;
    if (result == RAY_CAPTURED) {
        // Fell into black hole - black background
        backgroundColor = vec3(0.0);
    } else {
        // Escaped - sample starfield with final (lensed) direction
        backgroundColor = starfield(finalDir);
    }

    // Calculate photon ring contribution
    vec3 photonRingColor = vec3(0.0);
    if (u_showPhotonRing) {
        float numOrbits = totalPhiChange / TWO_PI;
        photonRingColor = calculatePhotonRing(minRadius, numOrbits, M, a);
    }

    // Add dramatic inner glow at the shadow edge
    // This creates the "light spilling over" effect at the event horizon boundary
    float rH = eventHorizonRadius(M, a);
    vec3 shadowEdgeGlow = vec3(0.0);
    if (result == RAY_CAPTURED && minRadius < rH * 1.5) {
        // Ray was captured but got close to horizon edge
        float edgeProximity = (minRadius - rH) / (rH * 0.5);
        if (edgeProximity > 0.0 && edgeProximity < 1.0) {
            float glowIntensity = pow(1.0 - edgeProximity, 3.0) * 2.0;
            vec3 glowColor = vec3(1.0, 0.6, 0.3); // Orange glow at shadow edge
            shadowEdgeGlow = glowColor * glowIntensity;
        }
    }

    // Composite all layers (back to front):
    // 1. Background (starfield or black)
    // 2. Shadow edge glow
    // 3. Ergosphere glow
    // 4. Jets
    // 5. Photon ring
    // 6. Accretion disk

    vec3 finalColor = backgroundColor;

    // Add shadow edge glow (for rays that just barely got captured)
    finalColor += shadowEdgeGlow;

    // Add ergosphere visualization
    finalColor += ergoColor;

    // Add jets (additive blending)
    finalColor += jetColor;

    // Add photon ring glow
    finalColor += photonRingColor;

    // Composite disk over everything (it's in front)
    finalColor = mix(finalColor, diskColor, diskAlpha);

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
// Post-Processing Effects
// ============================================================================

/**
 * Glow effect for bright areas (disk and photon ring)
 */
vec3 applyGlow(vec3 color, float intensity) {
    float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float glowThreshold = 0.6;

    if (brightness > glowThreshold) {
        float glowAmount = (brightness - glowThreshold) / (1.0 - glowThreshold);
        glowAmount = pow(glowAmount, 0.7);
        color += color * glowAmount * intensity;
    }

    return color;
}

/**
 * Subtle vignette - very light darkening at edges
 */
vec3 applyVignette(vec3 color, vec2 uv, float strength) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    float vignette = 1.0 - smoothstep(0.5, 1.0, dist) * strength;
    return color * vignette;
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

    // Apply glow to bright areas (disk, photon ring)
    color = applyGlow(color, 0.4);

    // Very subtle vignette
    color = applyVignette(color, v_uv, 0.15);

    // Tone mapping - preserve deep blacks while handling bright areas
    color = toneMapACES(color);

    // Gamma correction
    color = gammaCorrect(color, 2.2);

    // Slight saturation boost for the orange colors
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luminance), color, 1.1);

    // Ensure deep blacks stay black
    color = max(color, vec3(0.0));

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
