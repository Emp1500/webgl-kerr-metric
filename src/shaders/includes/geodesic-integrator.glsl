// ============================================================================
// Geodesic Integrator for Kerr Spacetime
// ============================================================================
//
// Implements 4th-order Runge-Kutta integration of null geodesics
// using the Hamiltonian formulation with conserved quantities.
//
// For photons in Kerr spacetime, we have three conserved quantities:
// - E: Energy (from time translation symmetry)
// - L_z: Angular momentum about spin axis (from axial symmetry)
// - Q: Carter constant (from hidden Killing tensor symmetry)
//
// The equations of motion in Boyer-Lindquist coordinates:
// Σ(dr/dλ) = ±√R(r)
// Σ(dθ/dλ) = ±√Θ(θ)
// Σ(dφ/dλ) = -aE + L_z/sin²θ + a/Δ[(r² + a²)E - aL_z]
//
// ============================================================================

// Ray termination status codes
#define RAY_ACTIVE 0
#define RAY_CAPTURED 1
#define RAY_ESCAPED 2
#define RAY_MAX_STEPS 3

// ============================================================================
// Potential Functions
// ============================================================================

/**
 * R(r) potential function
 * R = [(r² + a²)E - aL_z]² - Δ[(L_z - aE)² + Q]
 *
 * For null geodesics with E normalized to 1.
 */
float R_potential(float r, float E, float Lz, float Q, float M, float a) {
    float r2 = r * r;
    float a2 = a * a;
    float del = r2 - 2.0 * M * r + a2;  // Δ

    float term1 = (r2 + a2) * E - a * Lz;
    float term2 = Lz - a * E;

    return term1 * term1 - del * (term2 * term2 + Q);
}

/**
 * Θ(θ) potential function
 * Θ = Q - cos²θ[a²(1 - E²) + L_z²/sin²θ]
 *
 * For null geodesics (using E² term, but for photons we can simplify)
 * Θ = Q + a²E²cos²θ - L_z²cot²θ
 */
float Theta_potential(float theta, float E, float Lz, float Q, float a) {
    float cosTheta = cos(theta);
    float sinTheta = sin(theta);
    float cos2 = cosTheta * cosTheta;
    float sin2 = sinTheta * sinTheta;

    // Avoid division by zero at poles
    if (sin2 < EPSILON) {
        return Q + a * a * E * E * cos2;
    }

    float cot2 = cos2 / sin2;
    return Q + a * a * E * E * cos2 - Lz * Lz * cot2;
}

// ============================================================================
// Conserved Quantities from Initial Conditions
// ============================================================================

/**
 * Calculate conserved quantities from position and 4-velocity direction
 *
 * Given a photon at position (r, θ, φ) with coordinate velocity direction,
 * compute E, L_z, Q. We normalize E = 1 for convenience.
 *
 * The 4-momentum components are related to coordinate velocities by:
 * p_t = g_tt * dt/dλ + g_tφ * dφ/dλ = -E
 * p_φ = g_tφ * dt/dλ + g_φφ * dφ/dλ = L_z
 * p_r = g_rr * dr/dλ
 * p_θ = g_θθ * dθ/dλ
 */
void computeConservedQuantities(
    float r, float theta,
    float dr_dlambda, float dtheta_dlambda, float dphi_dlambda,
    float M, float a,
    out float E, out float Lz, out float Q
) {
    float r2 = r * r;
    float a2 = a * a;
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);
    float sin2 = sinTheta * sinTheta;
    float cos2 = cosTheta * cosTheta;

    // Metric components
    float sig = r2 + a2 * cos2;  // Σ
    float del = r2 - 2.0 * M * r + a2;  // Δ
    float A = (r2 + a2) * (r2 + a2) - a2 * del * sin2;

    // For a photon, the null condition gives us E in terms of the other quantities
    // We normalize by setting E = 1 and scaling everything else
    E = 1.0;

    // From the geodesic equations, we can derive L_z and Q
    // Using the asymptotic behavior: at large r, dφ/dλ ≈ L_z/(r²sin²θ)
    // and dr/dλ² + r²dθ/dλ² ≈ 1 (for E=1 photon)

    // Impact parameters: b = L_z/E, q² = Q/E²
    // From the direction of the ray at the camera position

    // Angular momentum from dφ/dλ
    // Σ dφ/dλ = -aE + Lz/sin²θ + a(r² + a²)E/Δ - a²Lz/Δ
    // Solving for Lz:
    float omega = a * (r2 + a2) / del - a;  // coefficient of E
    float coeff = 1.0 / sin2 - a2 / del;    // coefficient of Lz

    if (abs(coeff) > EPSILON) {
        Lz = (sig * dphi_dlambda - omega * E) / coeff;
    } else {
        Lz = 0.0;
    }

    // Carter constant from dθ/dλ
    // Σ² (dθ/dλ)² = Θ(θ) = Q + a²E²cos²θ - L_z²cot²θ
    float sig_dtheta = sig * dtheta_dlambda;
    Q = sig_dtheta * sig_dtheta - a2 * E * E * cos2;
    if (sin2 > EPSILON) {
        Q += Lz * Lz * cos2 / sin2;
    }
}

/**
 * Initialize geodesic from camera ray in Cartesian coordinates
 *
 * Converts camera position and ray direction to Boyer-Lindquist coordinates
 * and computes the conserved quantities.
 */
void initializeGeodesic(
    vec3 camPos, vec3 rayDir,
    float M, float a,
    out float r, out float theta, out float phi,
    out float pr, out float ptheta,
    out float E, out float Lz, out float Q
) {
    // Convert camera position to Boyer-Lindquist
    vec3 bl = cartesianToBoyerLindquist(camPos, a);
    r = bl.x;
    theta = bl.y;
    phi = bl.z;

    // Clamp theta away from poles for numerical stability
    theta = clamp(theta, 0.01, PI - 0.01);

    float sinTheta = sin(theta);
    float cosTheta = cos(theta);

    // Convert ray direction to BL coordinate velocities
    // This requires the Jacobian of the coordinate transformation

    // For the direction vector, we use the fact that at the camera (far from BH),
    // the metric is approximately flat, so we can use:
    // dr/dλ ≈ rayDir · r_hat
    // dθ/dλ ≈ rayDir · θ_hat / r
    // dφ/dλ ≈ rayDir · φ_hat / (r sin θ)

    // Unit vectors in BL coords (approximately Cartesian far from BH)
    vec3 rHat = normalize(camPos);

    // θ_hat points in direction of increasing θ (toward equator from poles)
    vec3 zAxis = vec3(0.0, 0.0, 1.0);
    vec3 thetaHat = normalize(cosTheta * rHat - zAxis / max(sinTheta, EPSILON));

    // Correct theta hat calculation
    float rxy = sqrt(camPos.x * camPos.x + camPos.y * camPos.y);
    if (rxy > EPSILON) {
        thetaHat = vec3(
            camPos.z * camPos.x / (r * rxy),
            camPos.z * camPos.y / (r * rxy),
            -rxy / r
        );
    } else {
        thetaHat = vec3(1.0, 0.0, 0.0);
    }

    // φ_hat = z × r_hat (normalized), points in direction of increasing φ
    vec3 phiHat = normalize(cross(zAxis, rHat));
    if (length(cross(zAxis, rHat)) < EPSILON) {
        phiHat = vec3(0.0, 1.0, 0.0);
    }

    // Project ray direction onto coordinate basis
    float dr_dl = dot(rayDir, rHat);
    float dtheta_dl = dot(rayDir, thetaHat) / r;
    float dphi_dl = dot(rayDir, phiHat) / (r * sinTheta + EPSILON);

    // Compute conserved quantities
    computeConservedQuantities(r, theta, dr_dl, dtheta_dl, dphi_dl, M, a, E, Lz, Q);

    // Initialize momenta (with correct signs)
    float sig = sigma(r, theta, a);

    // pr = ±√R / Σ
    float R = R_potential(r, E, Lz, Q, M, a);
    pr = sign(dr_dl) * safeSqrt(max(R, 0.0)) / sig;

    // ptheta = ±√Θ / Σ
    float Th = Theta_potential(theta, E, Lz, Q, a);
    ptheta = sign(dtheta_dl) * safeSqrt(max(Th, 0.0)) / sig;
}

// ============================================================================
// Geodesic Derivatives
// ============================================================================

/**
 * Compute derivatives for geodesic integration
 * Returns (dr/dλ, dθ/dλ, dφ/dλ)
 */
vec3 geodesicDerivatives(
    float r, float theta, float pr, float ptheta,
    float E, float Lz, float Q,
    float M, float a
) {
    float r2 = r * r;
    float a2 = a * a;
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);
    float sin2 = sinTheta * sinTheta;
    float cos2 = cosTheta * cosTheta;

    float sig = r2 + a2 * cos2;  // Σ
    float del = r2 - 2.0 * M * r + a2;  // Δ

    // dr/dλ = pr (this is Σ * dr/dλ_proper, normalized)
    float dr_dl = pr * sig;

    // dθ/dλ = ptheta
    float dtheta_dl = ptheta * sig;

    // dφ/dλ from the geodesic equation
    // Σ dφ/dλ = -a + Lz/sin²θ + a(r² + a²)/Δ - a²Lz/(Δ sin²θ) ... simplified:
    // Σ dφ/dλ = a(E(r² + a²)/Δ - 1) + Lz(1/sin²θ - a²/Δ)/sin²θ...

    // Simpler form:
    // Σ dφ/dλ = -(aE - Lz/sin²θ) + a/Δ * [(r² + a²)E - aLz]
    float dphi_dl;
    if (sin2 > EPSILON) {
        float P = (r2 + a2) * E - a * Lz;
        dphi_dl = (-a * E + Lz / sin2 + a * P / del) / sig;
    } else {
        dphi_dl = 0.0;
    }

    return vec3(dr_dl, dtheta_dl, dphi_dl);
}

/**
 * Compute momentum derivatives (for tracking sign changes)
 */
vec2 momentumDerivatives(
    float r, float theta, float pr, float ptheta,
    float E, float Lz, float Q,
    float M, float a
) {
    float r2 = r * r;
    float a2 = a * a;
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);
    float sin2 = sinTheta * sinTheta;
    float cos2 = cosTheta * cosTheta;

    float sig = r2 + a2 * cos2;

    // d(pr)/dλ from Hamilton's equations: dpr/dλ = -∂H/∂r
    // This involves derivatives of R(r)
    float del = r2 - 2.0 * M * r + a2;
    float dDel_dr = 2.0 * r - 2.0 * M;

    float P = (r2 + a2) * E - a * Lz;
    float dP_dr = 2.0 * r * E;

    float term2 = Lz - a * E;
    float R = P * P - del * (term2 * term2 + Q);

    float dR_dr = 2.0 * P * dP_dr - dDel_dr * (term2 * term2 + Q);

    // d(Σ pr)/dλ involves dR/dr / (2Σ)
    float dSigPr_dl = dR_dr / (2.0 * sig);

    // d(ptheta)/dλ from Hamilton's equations
    // Involves derivatives of Θ(θ)
    float dTheta_dtheta = -2.0 * a2 * E * E * cosTheta * sinTheta;
    if (sin2 > EPSILON) {
        dTheta_dtheta += 2.0 * Lz * Lz * cosTheta / (sinTheta * sin2);
    }

    float dSigPth_dl = dTheta_dtheta / (2.0 * sig);

    return vec2(dSigPr_dl / sig, dSigPth_dl / sig);
}

// ============================================================================
// RK4 Integration Step
// ============================================================================

/**
 * Single RK4 integration step
 * Updates position (r, θ, φ) and momenta (pr, pθ)
 */
void rk4Step(
    inout float r, inout float theta, inout float phi,
    inout float pr, inout float ptheta,
    float E, float Lz, float Q,
    float M, float a,
    float h
) {
    // k1
    vec3 k1_pos = geodesicDerivatives(r, theta, pr, ptheta, E, Lz, Q, M, a);
    vec2 k1_mom = momentumDerivatives(r, theta, pr, ptheta, E, Lz, Q, M, a);

    // k2
    float r2 = r + 0.5 * h * k1_pos.x;
    float th2 = theta + 0.5 * h * k1_pos.y;
    float pr2 = pr + 0.5 * h * k1_mom.x;
    float pth2 = ptheta + 0.5 * h * k1_mom.y;
    th2 = clamp(th2, 0.001, PI - 0.001);

    vec3 k2_pos = geodesicDerivatives(r2, th2, pr2, pth2, E, Lz, Q, M, a);
    vec2 k2_mom = momentumDerivatives(r2, th2, pr2, pth2, E, Lz, Q, M, a);

    // k3
    float r3 = r + 0.5 * h * k2_pos.x;
    float th3 = theta + 0.5 * h * k2_pos.y;
    float pr3 = pr + 0.5 * h * k2_mom.x;
    float pth3 = ptheta + 0.5 * h * k2_mom.y;
    th3 = clamp(th3, 0.001, PI - 0.001);

    vec3 k3_pos = geodesicDerivatives(r3, th3, pr3, pth3, E, Lz, Q, M, a);
    vec2 k3_mom = momentumDerivatives(r3, th3, pr3, pth3, E, Lz, Q, M, a);

    // k4
    float r4 = r + h * k3_pos.x;
    float th4 = theta + h * k3_pos.y;
    float pr4 = pr + h * k3_mom.x;
    float pth4 = ptheta + h * k3_mom.y;
    th4 = clamp(th4, 0.001, PI - 0.001);

    vec3 k4_pos = geodesicDerivatives(r4, th4, pr4, pth4, E, Lz, Q, M, a);
    vec2 k4_mom = momentumDerivatives(r4, th4, pr4, pth4, E, Lz, Q, M, a);

    // Update
    r += h * (k1_pos.x + 2.0 * k2_pos.x + 2.0 * k3_pos.x + k4_pos.x) / 6.0;
    theta += h * (k1_pos.y + 2.0 * k2_pos.y + 2.0 * k3_pos.y + k4_pos.y) / 6.0;
    phi += h * (k1_pos.z + 2.0 * k2_pos.z + 2.0 * k3_pos.z + k4_pos.z) / 6.0;

    pr += h * (k1_mom.x + 2.0 * k2_mom.x + 2.0 * k3_mom.x + k4_mom.x) / 6.0;
    ptheta += h * (k1_mom.y + 2.0 * k2_mom.y + 2.0 * k3_mom.y + k4_mom.y) / 6.0;

    // Clamp theta to valid range
    theta = clamp(theta, 0.001, PI - 0.001);

    // Handle turning points: if R or Θ goes negative, flip momentum sign
    float R = R_potential(r, E, Lz, Q, M, a);
    float Th = Theta_potential(theta, E, Lz, Q, a);

    if (R < 0.0) {
        pr = -pr;
    }
    if (Th < 0.0) {
        ptheta = -ptheta;
    }
}

// ============================================================================
// Full Geodesic Integration
// ============================================================================

/**
 * Integrate geodesic from camera to termination
 *
 * Returns: RAY_CAPTURED, RAY_ESCAPED, or RAY_MAX_STEPS
 * finalDir: direction of ray when it escaped (for starfield lookup)
 */
int integrateGeodesic(
    vec3 camPos, vec3 rayDir,
    float M, float a,
    int maxSteps, float escapeRadius, float stepSize,
    out vec3 finalDir
) {
    // Initialize
    float r, theta, phi, pr, ptheta, E, Lz, Q;
    initializeGeodesic(camPos, rayDir, M, a, r, theta, phi, pr, ptheta, E, Lz, Q);

    float rH = eventHorizonRadius(M, a);
    float rPh = photonSphereRadius(M, a);

    finalDir = rayDir;

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
            float sig = sigma(r, theta, a);
            vec3 vel = geodesicDerivatives(r, theta, pr, ptheta, E, Lz, Q, M, a);

            finalDir = normalize(
                vel.x * rHat +
                r * vel.y * thetaHat +
                r * sinTheta * vel.z * phiHat
            );

            return RAY_ESCAPED;
        }

        // Adaptive step size
        float distToHorizon = r - rH;
        float h = stepSize * clamp(distToHorizon / rPh, 0.01, 1.0);

        // Near photon sphere, use smaller steps
        if (abs(r - rPh) < rPh * 0.5) {
            h *= 0.5;
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
