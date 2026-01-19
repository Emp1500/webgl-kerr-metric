// ============================================================================
// Accretion Disk Physics for Kerr Black Hole
// ============================================================================
//
// Implements a geometrically thin, optically thick accretion disk using
// the Novikov-Thorne model for temperature distribution.
//
// Relativistic effects include:
// - Doppler shifting (approaching side blue-shifted, receding red-shifted)
// - Relativistic beaming (intensity boosted by g^4)
// - Gravitational redshift (light loses energy climbing out of potential well)
//
// ============================================================================

// Accretion disk parameters (set as uniforms)
// uniform float u_diskInnerRadius;  // Inner edge (ISCO)
// uniform float u_diskOuterRadius;  // Outer edge
// uniform float u_diskTemperature;  // Peak temperature in Kelvin
// uniform float u_diskThickness;    // Half-thickness ratio h/r

// ============================================================================
// Disk Geometry
// ============================================================================

/**
 * Check if a point (in Boyer-Lindquist coords) intersects the disk
 * The disk is a thin equatorial structure from r_inner to r_outer
 *
 * Returns: true if in disk, false otherwise
 * diskR: radial position in disk (if hit)
 * diskPhi: azimuthal position in disk (if hit)
 */
bool isDiskIntersection(
    float r, float theta, float phi,
    float innerRadius, float outerRadius, float thickness,
    out float diskR, out float diskPhi
) {
    // Disk is at theta ≈ π/2 (equatorial plane)
    // With thickness h, the disk extends from θ = π/2 - arctan(h/r) to π/2 + arctan(h/r)

    float equator = HALF_PI;
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);

    // Height above equatorial plane: z = r * cos(theta)
    float z = r * abs(cosTheta);

    // Cylindrical radius: rho = r * sin(theta)
    float rho = r * sinTheta;

    // Disk half-thickness at this radius
    float h = thickness * rho;

    // Check if within disk bounds
    if (z < h && rho >= innerRadius && rho <= outerRadius) {
        diskR = rho;
        diskPhi = phi;
        return true;
    }

    return false;
}

/**
 * Ray-disk intersection test
 * Given a ray in BL coordinates, find where it crosses the equatorial plane
 *
 * Returns distance to intersection (negative if no intersection)
 */
float rayDiskIntersection(
    float r, float theta, float phi,
    float dr, float dtheta, float dphi,
    float innerRadius, float outerRadius,
    float M, float a
) {
    // The equatorial plane is at theta = π/2
    // We need to find λ such that theta + λ * dtheta = π/2

    float targetTheta = HALF_PI;
    float deltaTheta = targetTheta - theta;

    // If moving away from equator and already past it, no intersection
    if (abs(dtheta) < EPSILON) {
        return -1.0;
    }

    float lambda = deltaTheta / dtheta;

    // Only interested in forward intersections
    if (lambda < 0.0) {
        return -1.0;
    }

    // Estimate r at intersection (linear approximation for small steps)
    float rAtIntersection = r + lambda * dr;

    // Check if within disk radial bounds
    if (rAtIntersection >= innerRadius && rAtIntersection <= outerRadius) {
        return lambda;
    }

    return -1.0;
}

// ============================================================================
// Temperature Profile (Novikov-Thorne Model)
// ============================================================================

/**
 * Calculate disk temperature using Novikov-Thorne thin disk model
 *
 * T(r) = T_0 * (M/r³)^0.25 * [1 - (r_ISCO/r)^0.5]^0.25
 *
 * This gives the effective temperature that would produce the local
 * radiative flux from the disk surface.
 */
float diskTemperature(float r, float rISCO, float T0, float M) {
    if (r <= rISCO) {
        return 0.0;  // No emission inside ISCO
    }

    // Novikov-Thorne temperature profile
    float x = r / M;
    float xISCO = rISCO / M;

    // T ∝ (M/r³)^0.25 * f(r)^0.25
    // where f(r) = 1 - sqrt(r_ISCO/r) (simplified)
    float f = 1.0 - sqrt(xISCO / x);

    if (f <= 0.0) {
        return 0.0;
    }

    // Temperature profile
    float temp = T0 * pow(1.0 / (x * x * x), 0.25) * pow(f, 0.25);

    return temp;
}

/**
 * Full Novikov-Thorne temperature with relativistic corrections
 * Includes the Page-Thorne efficiency factor
 */
float diskTemperatureNT(float r, float rISCO, float T0, float M, float a) {
    if (r <= rISCO * 1.001) {
        return 0.0;
    }

    float x = sqrt(r / M);
    float xISCO = sqrt(rISCO / M);

    // Kerr parameter
    float aStar = a / M;

    // Characteristic radii in x coordinates
    float x1 = 2.0 * cos((acos(aStar) - PI) / 3.0);
    float x2 = 2.0 * cos((acos(aStar) + PI) / 3.0);
    float x3 = -2.0 * cos(acos(aStar) / 3.0);

    // Page-Thorne Q function (radiative efficiency)
    float Q = 0.0;

    // Simplified version for visualization
    float f = 1.0 - xISCO / x;
    if (f <= 0.0) return 0.0;

    // Add relativistic correction factor
    float y = x * x;  // r/M
    float correction = 1.0 + aStar / (y * sqrt(y));

    Q = f * correction;

    // Temperature from Stefan-Boltzmann: F = σT⁴
    // T ∝ (F)^0.25 ∝ (Q / r³)^0.25
    float temp = T0 * pow(max(Q, 0.0) / (y * y * y), 0.25);

    return clamp(temp, 0.0, 50000.0);  // Cap at 50,000K for numerical stability
}

// ============================================================================
// Relativistic Effects
// ============================================================================

/**
 * Calculate the Keplerian orbital velocity at radius r
 * For a particle in circular orbit in Kerr spacetime:
 * Ω = dφ/dt = ±M^0.5 / (r^1.5 ± a*M^0.5)
 *
 * Sign: + for prograde, - for retrograde
 * We assume prograde disk rotation.
 */
float keplerianOmega(float r, float M, float a) {
    float sqrtM = sqrt(M);
    float r15 = r * sqrt(r);
    return sqrtM / (r15 + a * sqrtM);
}

/**
 * Calculate orbital velocity v/c at radius r
 * v = r * sin(theta) * Ω (in coordinate time)
 *
 * For relativistic calculations, we need the proper velocity
 */
float orbitalVelocity(float r, float theta, float M, float a) {
    float omega = keplerianOmega(r, M, a);
    float sinTheta = sin(theta);

    // Coordinate velocity
    float vCoord = r * sinTheta * omega;

    // Convert to proper velocity using the metric
    // This is approximate for the equatorial plane
    float sig = sigma(r, theta, a);
    float del = delta(r, M, a);

    // Proper velocity factor (Lorentz-like)
    float gtt = -(1.0 - 2.0 * M * r / sig);
    float gtphi = -2.0 * a * M * r * sinTheta * sinTheta / sig;
    float gphiphi = ((r * r + a * a) * (r * r + a * a) - a * a * del * sinTheta * sinTheta)
                     * sinTheta * sinTheta / sig;

    // Proper angular velocity
    float v = sqrt(gphiphi) * omega / sqrt(-gtt - 2.0 * gtphi * omega - gphiphi * omega * omega + EPSILON);

    return clamp(v, 0.0, 0.999);  // Cap below c
}

/**
 * Calculate the Doppler factor g for a disk element
 *
 * g = 1 / [γ(1 - v·n̂)]
 *
 * where γ = 1/√(1-v²), v is orbital velocity, n̂ is direction to observer
 *
 * g > 1: blue-shifted (approaching)
 * g < 1: red-shifted (receding)
 */
float dopplerFactor(
    float r, float theta, float phi,
    vec3 rayDir, float M, float a
) {
    // Orbital velocity direction (perpendicular to radius, in phi direction)
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);
    float sinPhi = sin(phi);
    float cosPhi = cos(phi);

    // Velocity direction (tangent to circular orbit) in Cartesian
    // v_hat = d(position)/d(phi) / |d(position)/d(phi)|
    // = (-sin(phi), cos(phi), 0) for equatorial orbit
    vec3 velDir = vec3(-sinPhi, cosPhi, 0.0);

    // Orbital velocity magnitude
    float v = orbitalVelocity(r, theta, M, a);

    // Velocity vector
    vec3 velocity = v * velDir;

    // Ray direction (from disk to observer)
    // Note: rayDir points from camera to disk, so we negate for disk-to-observer
    vec3 toObserver = -rayDir;

    // Radial velocity component (v · n̂)
    float vRadial = dot(velocity, toObserver);

    // Lorentz factor
    float gamma = 1.0 / sqrt(1.0 - v * v + EPSILON);

    // Doppler factor
    float g = 1.0 / (gamma * (1.0 - vRadial));

    return clamp(g, 0.1, 10.0);  // Clamp for numerical stability
}

/**
 * Calculate gravitational redshift factor
 *
 * The redshift from gravitational time dilation:
 * z_grav = √(-g_tt) at emission / √(-g_tt) at observer
 *
 * For distant observer, √(-g_tt) ≈ 1
 * At the disk: √(-g_tt) = √(1 - 2Mr/Σ)
 */
float gravitationalRedshift(float r, float theta, float M, float a) {
    float sig = sigma(r, theta, a);
    float gtt = 1.0 - 2.0 * M * r / sig;

    // Redshift factor (ratio of frequencies)
    return sqrt(max(gtt, EPSILON));
}

/**
 * Combined relativistic factor
 * Total observed frequency/intensity shift
 *
 * g_total = g_doppler * g_grav
 *
 * Intensity scales as g^4 (relativistic beaming)
 */
float relativisticFactor(
    float r, float theta, float phi,
    vec3 rayDir, float M, float a
) {
    float gDoppler = dopplerFactor(r, theta, phi, rayDir, M, a);
    float gGrav = gravitationalRedshift(r, theta, M, a);

    return gDoppler * gGrav;
}

// ============================================================================
// Disk Emission and Color
// ============================================================================

/**
 * Calculate disk emission color and intensity
 *
 * Uses blackbody emission with relativistic corrections:
 * - Temperature from Novikov-Thorne model
 * - Color shifted by Doppler effect
 * - Intensity boosted by g^4
 */
vec3 diskEmission(
    float r, float theta, float phi,
    vec3 rayDir,
    float innerRadius, float outerRadius,
    float T0, float M, float a
) {
    // Check bounds
    if (r < innerRadius || r > outerRadius) {
        return vec3(0.0);
    }

    // Get local temperature
    float rISCO = iscoRadius(M, a);
    float T = diskTemperatureNT(r, rISCO, T0, M, a);

    if (T < 100.0) {
        return vec3(0.0);
    }

    // Calculate relativistic factor
    float g = relativisticFactor(r, theta, phi, rayDir, M, a);

    // Observed temperature is shifted by Doppler factor
    float Tobs = T * g;

    // Convert to RGB color
    vec3 color = temperatureToRGB(Tobs);

    // Intensity scaling:
    // - Blackbody intensity ∝ T^4
    // - Relativistic beaming ∝ g^4
    // Combined: Iobs ∝ (T*g)^4 / T^4 = g^4 * original intensity

    // Base intensity from temperature (normalized)
    float intensity = pow(T / T0, 4.0);

    // Apply relativistic beaming
    float g4 = g * g * g * g;
    intensity *= g4;

    // Radial falloff (dimmer at outer edges)
    float radialFalloff = sqrt(innerRadius / r);

    // Final intensity
    intensity *= radialFalloff;

    // Clamp for display
    intensity = clamp(intensity, 0.0, 10.0);

    return color * intensity;
}

/**
 * Sample disk color with anti-aliasing consideration
 */
vec3 sampleDisk(
    float r, float theta, float phi,
    vec3 rayDir,
    float innerRadius, float outerRadius,
    float thickness, float T0, float M, float a
) {
    // Check if we're actually in the disk
    float diskR, diskPhi;
    if (!isDiskIntersection(r, theta, phi, innerRadius, outerRadius, thickness, diskR, diskPhi)) {
        return vec3(0.0);
    }

    // Get emission
    return diskEmission(diskR, HALF_PI, diskPhi, rayDir, innerRadius, outerRadius, T0, M, a);
}

// ============================================================================
// Disk Rendering Integration
// ============================================================================

/**
 * Accumulate disk contribution along a ray step
 *
 * Called during geodesic integration when ray passes through disk region
 */
vec3 accumulateDiskEmission(
    float r, float theta, float phi,
    float prevTheta,
    vec3 rayDir,
    float innerRadius, float outerRadius,
    float thickness, float T0, float M, float a,
    inout float diskAlpha
) {
    vec3 emission = vec3(0.0);

    // Check if we crossed the equatorial plane
    bool crossedEquator = (theta - HALF_PI) * (prevTheta - HALF_PI) < 0.0;

    if (crossedEquator && r >= innerRadius && r <= outerRadius) {
        // Calculate emission at this point
        emission = diskEmission(r, HALF_PI, phi, rayDir, innerRadius, outerRadius, T0, M, a);

        // Optical depth (simplified)
        float opticalDepth = 1.0 - exp(-thickness * 10.0);
        diskAlpha = max(diskAlpha, opticalDepth);
    }

    return emission;
}

/**
 * Check if point is near disk and accumulate emission
 * Used during ray marching
 */
vec4 sampleDiskAtPoint(
    float r, float theta, float phi,
    vec3 rayDir,
    float innerRadius, float outerRadius,
    float thickness, float T0, float M, float a
) {
    // Distance from equatorial plane
    float distFromEquator = abs(theta - HALF_PI);

    // Disk angular thickness at this radius
    float angularThickness = atan(thickness);

    if (distFromEquator > angularThickness * 2.0) {
        return vec4(0.0);
    }

    // Check radial bounds
    if (r < innerRadius || r > outerRadius) {
        return vec4(0.0);
    }

    // Calculate emission
    vec3 emission = diskEmission(r, theta, phi, rayDir, innerRadius, outerRadius, T0, M, a);

    // Alpha based on proximity to midplane
    float alpha = exp(-distFromEquator * distFromEquator / (angularThickness * angularThickness));
    alpha *= (1.0 - smoothstep(innerRadius, innerRadius * 1.1, r));  // Fade at inner edge
    alpha *= smoothstep(outerRadius, outerRadius * 0.9, r);  // Fade at outer edge
    alpha = 1.0 - alpha;  // Invert so disk is opaque
    alpha = clamp(1.0 - exp(-10.0 * (1.0 - alpha)), 0.0, 1.0);

    return vec4(emission, alpha);
}
