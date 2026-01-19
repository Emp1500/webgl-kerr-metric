// ============================================================================
// Kerr Metric Implementation
// ============================================================================
//
// The Kerr metric describes spacetime around a rotating black hole.
// In Boyer-Lindquist coordinates (t, r, theta, phi):
//
// ds² = -(1 - 2Mr/Σ)dt² + (Σ/Δ)dr² + Σdθ²
//       + [(r² + a²)² - a²Δsin²θ]sin²θ/Σ dφ² - 4aMr sin²θ/Σ dt dφ
//
// Where:
//   M = black hole mass
//   a = angular momentum per unit mass (spin parameter, 0 ≤ a ≤ M)
//   Σ = r² + a²cos²θ
//   Δ = r² - 2Mr + a²
//
// ============================================================================

// Black hole parameters (set as uniforms in main shader)
// uniform float u_mass;      // M
// uniform float u_spin;      // a

// ============================================================================
// Metric Components
// ============================================================================

/**
 * Calculate Σ (Sigma) = r² + a²cos²θ
 */
float sigma(float r, float theta, float a) {
    float cosTheta = cos(theta);
    return r * r + a * a * cosTheta * cosTheta;
}

/**
 * Calculate Δ (Delta) = r² - 2Mr + a²
 */
float delta(float r, float M, float a) {
    return r * r - 2.0 * M * r + a * a;
}

/**
 * Calculate A = (r² + a²)² - a²Δsin²θ
 * Used in gφφ component
 */
float metricA(float r, float theta, float M, float a) {
    float r2 = r * r;
    float a2 = a * a;
    float del = delta(r, M, a);
    float sinTheta = sin(theta);
    float sin2 = sinTheta * sinTheta;
    float sum = r2 + a2;
    return sum * sum - a2 * del * sin2;
}

// ============================================================================
// Event Horizon and Ergosphere
// ============================================================================

/**
 * Calculate event horizon radius r+
 * r+ = M + sqrt(M² - a²)
 *
 * Returns the outer event horizon radius.
 * For Schwarzschild (a=0): r+ = 2M
 * For extremal Kerr (a=M): r+ = M
 */
float eventHorizonRadius(float M, float a) {
    return M + safeSqrt(M * M - a * a);
}

/**
 * Calculate inner (Cauchy) horizon radius r-
 * r- = M - sqrt(M² - a²)
 */
float innerHorizonRadius(float M, float a) {
    return M - safeSqrt(M * M - a * a);
}

/**
 * Calculate ergosphere outer boundary
 * r_ergo = M + sqrt(M² - a²cos²θ)
 *
 * The ergosphere extends from the event horizon to this radius.
 * At the equator (θ = π/2): r_ergo = 2M
 * At the poles (θ = 0, π): r_ergo = r+ (coincides with horizon)
 */
float ergosphereRadius(float theta, float M, float a) {
    float cosTheta = cos(theta);
    return M + safeSqrt(M * M - a * a * cosTheta * cosTheta);
}

/**
 * Check if a point is inside the event horizon
 */
bool isInsideHorizon(float r, float M, float a) {
    return r < eventHorizonRadius(M, a);
}

/**
 * Check if a point is inside the ergosphere (but outside horizon)
 */
bool isInErgosphere(float r, float theta, float M, float a) {
    float rH = eventHorizonRadius(M, a);
    float rE = ergosphereRadius(theta, M, a);
    return r >= rH && r < rE;
}

// ============================================================================
// Important Orbits
// ============================================================================

/**
 * Calculate ISCO (Innermost Stable Circular Orbit) radius
 * For prograde orbits around a Kerr black hole
 *
 * Simplified formula for equatorial prograde orbits:
 * r_ISCO = M * (3 + Z2 - sqrt((3-Z1)(3+Z1+2*Z2)))
 * where Z1 and Z2 are functions of a/M
 */
float iscoRadius(float M, float a) {
    float chi = a / M;  // Dimensionless spin
    float chi2 = chi * chi;

    // Z1 = 1 + (1 - chi²)^(1/3) * [(1+chi)^(1/3) + (1-chi)^(1/3)]
    float oneMinusChi2_13 = pow(1.0 - chi2, 1.0/3.0);
    float onePlusChi_13 = pow(1.0 + chi, 1.0/3.0);
    float oneMinusChi_13 = pow(abs(1.0 - chi), 1.0/3.0);

    float Z1 = 1.0 + oneMinusChi2_13 * (onePlusChi_13 + oneMinusChi_13);
    float Z2 = safeSqrt(3.0 * chi2 + Z1 * Z1);

    // Prograde ISCO
    return M * (3.0 + Z2 - safeSqrt((3.0 - Z1) * (3.0 + Z1 + 2.0 * Z2)));
}

/**
 * Calculate photon sphere radius (unstable circular photon orbits)
 * For Schwarzschild: r_ph = 3M
 * For Kerr, depends on spin and orbit direction
 *
 * Prograde photon orbit:
 * r_ph = 2M * (1 + cos(2/3 * arccos(-a/M)))
 */
float photonSphereRadius(float M, float a) {
    if (abs(a) < EPSILON) {
        return 3.0 * M;  // Schwarzschild
    }
    float chi = clamp(a / M, -1.0, 1.0);
    return 2.0 * M * (1.0 + cos(2.0/3.0 * acos(-chi)));
}

// ============================================================================
// Metric Tensor Components (for geodesic integration)
// ============================================================================

/**
 * Get the metric tensor components at a point
 * Returns: g_tt, g_rr, g_thth, g_phph, g_tph
 * (Stored in a mat3x2 to avoid array issues)
 */
void getMetricComponents(
    float r, float theta, float M, float a,
    out float g_tt, out float g_rr, out float g_thth,
    out float g_phph, out float g_tph
) {
    float sig = sigma(r, theta, a);
    float del = delta(r, M, a);
    float sinTheta = sin(theta);
    float sin2 = sinTheta * sinTheta;
    float r2 = r * r;
    float a2 = a * a;

    // g_tt = -(1 - 2Mr/Σ)
    g_tt = -(1.0 - 2.0 * M * r / sig);

    // g_rr = Σ/Δ
    g_rr = sig / del;

    // g_θθ = Σ
    g_thth = sig;

    // g_φφ = [(r² + a²)² - a²Δsin²θ]sin²θ/Σ
    float A = (r2 + a2) * (r2 + a2) - a2 * del * sin2;
    g_phph = A * sin2 / sig;

    // g_tφ = -2aMr sin²θ/Σ (cross term)
    g_tph = -2.0 * a * M * r * sin2 / sig;
}

/**
 * Calculate the lapse function α
 * α² = -g^tt = Δ Σ / A
 */
float lapseFunction(float r, float theta, float M, float a) {
    float sig = sigma(r, theta, a);
    float del = delta(r, M, a);
    float A = metricA(r, theta, M, a);
    return safeSqrt(del * sig / A);
}

/**
 * Calculate the frame-dragging angular velocity ω
 * ω = -g_tφ/g_φφ = 2aMr / A
 */
float frameDragging(float r, float theta, float M, float a) {
    float A = metricA(r, theta, M, a);
    return 2.0 * a * M * r / A;
}
