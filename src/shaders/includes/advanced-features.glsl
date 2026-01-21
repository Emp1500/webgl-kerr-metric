// ============================================================================
// Advanced Features for Kerr Black Hole Visualization
// Phase 4: Photon Sphere, Relativistic Jets, Ergosphere
// ============================================================================

// ============================================================================
// Photon Sphere / Light Ring Visualization
// ============================================================================
//
// The photon sphere is a region of unstable circular photon orbits.
// Light grazing this region creates the characteristic "light ring" that
// appears as a bright ring around the black hole shadow.
//
// For Kerr black holes, there are actually multiple photon orbits depending
// on the direction (prograde vs retrograde) and inclination.

/**
 * Calculate the photon ring contribution
 *
 * Photons that graze the photon sphere complete partial orbits,
 * creating a bright ring effect. The closer to the critical impact
 * parameter, the more orbits and the brighter the ring.
 *
 * @param r Current radius
 * @param minR Minimum radius reached during ray trace
 * @param rPh Photon sphere radius
 * @param M Black hole mass
 * @param a Spin parameter
 * @return Photon ring intensity (0-1)
 */
float photonRingIntensity(float r, float minR, float rPh, float M, float a) {
    // The closer minR is to rPh, the more the photon "lingers" and the brighter
    float proximity = abs(minR - rPh) / rPh;

    // Exponential falloff - very bright when grazing photon sphere
    float intensity = exp(-proximity * 8.0);

    // Additional boost for rays that got very close
    if (proximity < 0.1) {
        intensity += (0.1 - proximity) * 5.0;
    }

    return clamp(intensity, 0.0, 1.0);
}

/**
 * Calculate photon ring color
 *
 * The ring has a characteristic color from accumulated disk light
 * plus gravitationally lensed starlight.
 */
vec3 photonRingColor(float intensity, float r, float theta, float M, float a) {
    // Base color: hot white-blue from accumulated disk emission
    vec3 hotColor = vec3(0.9, 0.95, 1.0);

    // Add slight orange tinge from redshifted inner disk
    vec3 warmColor = vec3(1.0, 0.8, 0.6);

    // Mix based on proximity to horizon
    float rH = eventHorizonRadius(M, a);
    float horizonProximity = clamp((r - rH) / (3.0 * M), 0.0, 1.0);

    vec3 color = mix(warmColor, hotColor, horizonProximity);

    return color * intensity;
}

// ============================================================================
// Relativistic Jets
// ============================================================================
//
// Jets are highly collimated outflows of relativistic plasma from the
// poles of the black hole. They are powered by:
// 1. Blandford-Znajek mechanism (magnetic extraction of BH rotational energy)
// 2. Blandford-Payne mechanism (magneto-centrifugal acceleration from disk)
//
// The jet structure includes:
// - Core: highly relativistic, narrow beam
// - Sheath: slower outer layer
// - Knots: bright spots from internal shocks

/**
 * Jet geometry parameters
 */
struct JetParams {
    float baseRadius;      // Jet radius at base (near horizon)
    float openingAngle;    // Half-opening angle in radians
    float length;          // Jet length in units of M
    float coreFraction;    // Core radius as fraction of total
    float power;           // Jet luminosity parameter
};

/**
 * Default jet parameters based on spin
 */
JetParams getJetParams(float M, float a) {
    JetParams params;

    // Jet power scales with spin squared (Blandford-Znajek)
    float spinFactor = (a / M) * (a / M);

    params.baseRadius = 0.5 * M;
    params.openingAngle = 0.1;  // ~6 degrees half-angle
    params.length = 30.0 * M;
    params.coreFraction = 0.3;
    params.power = spinFactor * 2.0;  // More spin = more powerful jets

    return params;
}

/**
 * Check if a point is inside the jet cone
 * Jets emerge from both poles along the spin axis (z-axis)
 *
 * @param pos Position in Cartesian coordinates
 * @param params Jet parameters
 * @param M Black hole mass
 * @param a Spin parameter
 * @param jetFraction Output: 0 at edge, 1 at core
 * @param distAlongJet Output: distance along jet axis
 * @return true if inside jet
 */
bool isInJet(vec3 pos, JetParams params, float M, float a,
             out float jetFraction, out float distAlongJet) {
    // Jet axis is along z (spin axis)
    float z = pos.z;
    float rCyl = length(pos.xy);  // Cylindrical radius

    // Distance from black hole center along spin axis
    distAlongJet = abs(z);

    // Must be above/below the disk plane
    float rH = eventHorizonRadius(M, a);
    if (distAlongJet < rH * 2.0) {
        return false;  // Too close to equator
    }

    // Jet radius increases with distance (conical shape)
    float jetRadius = params.baseRadius + distAlongJet * tan(params.openingAngle);

    // Check if inside jet cone
    if (rCyl > jetRadius || distAlongJet > params.length) {
        return false;
    }

    // Calculate fraction (1 at core, 0 at edge)
    jetFraction = 1.0 - rCyl / jetRadius;

    // Boost core region
    if (jetFraction > (1.0 - params.coreFraction)) {
        jetFraction = 1.0;
    } else {
        jetFraction = jetFraction / (1.0 - params.coreFraction);
    }

    return true;
}

/**
 * Calculate jet emission at a point
 *
 * Includes:
 * - Synchrotron emission from relativistic electrons
 * - Knot structures from internal shocks
 * - Doppler boosting based on jet velocity
 */
vec3 jetEmission(vec3 pos, vec3 rayDir, JetParams params, float M, float a, float time) {
    float jetFraction, distAlongJet;

    if (!isInJet(pos, params, M, a, jetFraction, distAlongJet)) {
        return vec3(0.0);
    }

    // Base emission color (synchrotron - blue-white)
    vec3 coreColor = vec3(0.7, 0.8, 1.0);
    vec3 sheathColor = vec3(0.5, 0.6, 0.9);
    vec3 baseColor = mix(sheathColor, coreColor, jetFraction);

    // Intensity falloff along jet
    float falloff = exp(-distAlongJet / (params.length * 0.5));

    // Intensity increases toward core
    float coreBoost = 1.0 + jetFraction * 2.0;

    // Add knots (bright spots from shocks)
    float knotFreq = 5.0;
    float knotPhase = distAlongJet / M * knotFreq + time * 0.5;
    float knots = pow(0.5 + 0.5 * sin(knotPhase), 4.0);
    knots *= smoothstep(0.5, 1.0, jetFraction);  // Knots mainly in core

    // Relativistic Doppler boosting
    // Jet velocity is primarily along z-axis
    float jetVelocity = 0.9 * jetFraction;  // Core moves at ~0.9c
    vec3 jetDir = vec3(0.0, 0.0, sign(pos.z));
    float cosAngle = dot(rayDir, jetDir);

    // Doppler factor: approaching jet is boosted, receding is dimmed
    float gamma = 1.0 / sqrt(1.0 - jetVelocity * jetVelocity + EPSILON);
    float doppler = 1.0 / (gamma * (1.0 - jetVelocity * cosAngle));
    float dopplerBoost = pow(clamp(doppler, 0.1, 10.0), 3.0);

    // Combine all factors
    float intensity = params.power * falloff * coreBoost * (1.0 + knots * 0.5) * dopplerBoost;

    // Apply optical depth (jets are somewhat transparent)
    float opticalDepth = 0.3 * jetFraction;
    intensity *= opticalDepth;

    return baseColor * intensity * 0.5;
}

/**
 * Sample jet contribution along a ray segment
 */
vec3 sampleJet(vec3 pos, vec3 rayDir, float M, float a, float time) {
    // Only render jets if black hole is spinning
    if (abs(a) < 0.1 * M) {
        return vec3(0.0);
    }

    JetParams params = getJetParams(M, a);
    return jetEmission(pos, rayDir, params, M, a, time);
}

// ============================================================================
// Ergosphere Visualization
// ============================================================================
//
// The ergosphere is the region between the event horizon and the static limit,
// where spacetime itself is dragged around the black hole so strongly that
// nothing can remain stationary relative to distant stars.
//
// Shape: Oblate spheroid
// - At equator: r_ergo = 2M (same as Schwarzschild horizon)
// - At poles: r_ergo = r_horizon (ergosphere touches horizon)

/**
 * Calculate ergosphere boundary at given theta
 * r_ergo = M + sqrt(M² - a²cos²θ)
 */
float ergosphereRadiusAtTheta(float theta, float M, float a) {
    float cosTheta = cos(theta);
    return M + sqrt(M * M - a * a * cosTheta * cosTheta);
}

/**
 * Check if point is in ergosphere (between horizon and static limit)
 */
bool isInErgosphere(vec3 pos, float M, float a) {
    vec3 bl = cartesianToBoyerLindquist(pos, a);
    float r = bl.x;
    float theta = bl.y;

    float rH = eventHorizonRadius(M, a);
    float rE = ergosphereRadiusAtTheta(theta, M, a);

    return r > rH && r < rE;
}

/**
 * Calculate frame-dragging angular velocity at a point
 * ω = 2aMr / [(r² + a²)² - a²Δsin²θ]
 */
float frameDraggingOmega(float r, float theta, float M, float a) {
    float r2 = r * r;
    float a2 = a * a;
    float sinTheta = sin(theta);
    float sin2 = sinTheta * sinTheta;

    float del = r2 - 2.0 * M * r + a2;
    float A = (r2 + a2) * (r2 + a2) - a2 * del * sin2;

    if (A < EPSILON) return 0.0;

    return 2.0 * a * M * r / A;
}

/**
 * Visualize ergosphere with frame-dragging effect
 *
 * Creates a subtle glow showing the ergosphere boundary and
 * visualizes frame-dragging through color/pattern shifts.
 */
vec3 ergosphereVisualization(vec3 pos, vec3 rayDir, float M, float a, float time) {
    vec3 bl = cartesianToBoyerLindquist(pos, a);
    float r = bl.x;
    float theta = bl.y;
    float phi = bl.z;

    float rH = eventHorizonRadius(M, a);
    float rE = ergosphereRadiusAtTheta(theta, M, a);

    // Not in ergosphere region
    if (r <= rH || r >= rE * 1.2) {
        return vec3(0.0);
    }

    vec3 color = vec3(0.0);

    // Distance into ergosphere (0 at static limit, 1 at horizon)
    float depth = 1.0 - (r - rH) / (rE - rH);
    depth = clamp(depth, 0.0, 1.0);

    // Ergosphere boundary glow
    float boundaryDist = abs(r - rE) / M;
    float boundaryGlow = exp(-boundaryDist * 10.0) * 0.3;

    // Frame-dragging visualization
    float omega = frameDraggingOmega(r, theta, M, a);
    float dragStrength = omega * M;  // Normalized drag strength

    // Swirling pattern to show frame-dragging
    float swirl = sin(phi * 3.0 + time * omega * 10.0 + depth * 5.0);
    swirl = swirl * 0.5 + 0.5;

    // Color based on depth and drag strength
    // Cyan/teal for ergosphere, more intense deeper in
    vec3 ergoColor = vec3(0.0, 0.4, 0.5);
    vec3 deepColor = vec3(0.1, 0.3, 0.4);

    color = mix(ergoColor, deepColor, depth);
    color *= (boundaryGlow + depth * 0.1 + swirl * 0.05 * depth);

    // Fade at equator where ergosphere is largest
    float equatorFade = 1.0 - abs(theta - HALF_PI) / HALF_PI;
    color *= 0.3 + 0.7 * equatorFade;

    return color * 0.5;
}

// ============================================================================
// Combined Advanced Features Sampling
// ============================================================================

/**
 * Sample all advanced features at a point during ray marching
 *
 * @param pos Position in Cartesian coordinates
 * @param rayDir Ray direction
 * @param M Black hole mass
 * @param a Spin parameter
 * @param time Animation time
 * @param showJets Enable jet rendering
 * @param showErgosphere Enable ergosphere visualization
 * @return Combined emission from advanced features
 */
vec3 sampleAdvancedFeatures(
    vec3 pos, vec3 rayDir,
    float M, float a, float time,
    bool showJets, bool showErgosphere
) {
    vec3 emission = vec3(0.0);

    // Relativistic jets
    if (showJets) {
        emission += sampleJet(pos, rayDir, M, a, time);
    }

    // Ergosphere visualization
    if (showErgosphere) {
        emission += ergosphereVisualization(pos, rayDir, M, a, time);
    }

    return emission;
}

/**
 * Calculate photon ring contribution for a ray
 * Creates the bright thin ring at the shadow edge seen in NASA visualizations
 *
 * @param minRadius Minimum radius the ray reached
 * @param numOrbits Approximate number of orbits around BH
 * @param M Black hole mass
 * @param a Spin parameter
 * @return Photon ring color contribution
 */
vec3 calculatePhotonRing(float minRadius, float numOrbits, float M, float a) {
    float rPh = photonSphereRadius(M, a);
    float rH = eventHorizonRadius(M, a);

    // Only contributes if ray got close to photon sphere
    float proximity = (minRadius - rH) / (rPh - rH);
    if (proximity < 0.0 || proximity > 4.0) {
        return vec3(0.0);
    }

    float criticalProximity = abs(minRadius - rPh) / M;

    // === SHARP INNER RING (the bright arc at shadow edge) ===
    // Very sharp, bright ring right at the photon sphere
    float sharpRing = exp(-pow(criticalProximity * 8.0, 2.0)) * 5.0;

    // === SECONDARY RING ===
    float secondaryRing = exp(-pow(criticalProximity * 4.0, 2.0)) * 2.0;

    // === SOFT OUTER GLOW ===
    float softGlow = exp(-criticalProximity * 2.0) * 0.8;

    float intensity = sharpRing + secondaryRing + softGlow;

    // Boost significantly for rays that orbited (lensed light from back of disk)
    intensity *= (1.0 + numOrbits * 2.5);

    // Extra boost very close to shadow edge
    float edgeBoost = smoothstep(rH * 1.4, rH * 1.02, minRadius) * 4.0;
    intensity += edgeBoost;

    // === COLORS - Match the orange-red disk palette ===
    vec3 brightColor = vec3(1.0, 0.8, 0.4);    // Bright yellow-orange
    vec3 warmColor = vec3(1.0, 0.5, 0.1);      // Orange
    vec3 deepColor = vec3(0.9, 0.3, 0.05);     // Deep orange-red

    vec3 color = brightColor * (sharpRing + edgeBoost) +
                 warmColor * secondaryRing +
                 deepColor * softGlow;

    // Normalize
    float totalIntensity = sharpRing + secondaryRing + softGlow + edgeBoost;
    if (totalIntensity > 0.01) {
        color = color / totalIntensity * intensity;
    }

    return color;
}
