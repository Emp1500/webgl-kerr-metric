// ============================================================================
// Utility Functions for Kerr Black Hole Simulation
// ============================================================================

// Constants
#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define HALF_PI 1.57079632679
#define EPSILON 1e-6

// ============================================================================
// Mathematical Utilities
// ============================================================================

/**
 * Safe square root that handles small negative values from numerical errors
 */
float safeSqrt(float x) {
    return sqrt(max(x, 0.0));
}

/**
 * Safe inverse (avoid division by zero)
 */
float safeInverse(float x) {
    return 1.0 / (abs(x) < EPSILON ? sign(x) * EPSILON : x);
}

/**
 * Clamp angle to [0, 2*PI]
 */
float wrapAngle(float angle) {
    return mod(angle, TWO_PI);
}

/**
 * Sign function that returns 1 for x >= 0
 */
float signPositive(float x) {
    return x >= 0.0 ? 1.0 : -1.0;
}

// ============================================================================
// Coordinate Transformations
// ============================================================================

/**
 * Convert Cartesian (x, y, z) to spherical (r, theta, phi)
 * theta: polar angle from z-axis [0, PI]
 * phi: azimuthal angle in xy-plane [0, 2*PI]
 */
vec3 cartesianToSpherical(vec3 p) {
    float r = length(p);
    if (r < EPSILON) {
        return vec3(0.0, 0.0, 0.0);
    }
    float theta = acos(clamp(p.z / r, -1.0, 1.0));
    float phi = atan(p.y, p.x);
    if (phi < 0.0) phi += TWO_PI;
    return vec3(r, theta, phi);
}

/**
 * Convert spherical (r, theta, phi) to Cartesian (x, y, z)
 */
vec3 sphericalToCartesian(vec3 sph) {
    float r = sph.x;
    float theta = sph.y;
    float phi = sph.z;
    float sinTheta = sin(theta);
    return vec3(
        r * sinTheta * cos(phi),
        r * sinTheta * sin(phi),
        r * cos(theta)
    );
}

/**
 * Convert Cartesian to Boyer-Lindquist coordinates
 * For Kerr metric: x² + y² + z² = r² + a² - a²*z²/(r²)
 * This is an implicit equation; we solve iteratively
 */
vec3 cartesianToBoyerLindquist(vec3 p, float a) {
    float x = p.x;
    float y = p.y;
    float z = p.z;

    // For a = 0 (Schwarzschild), this reduces to spherical coords
    if (abs(a) < EPSILON) {
        return cartesianToSpherical(p);
    }

    float a2 = a * a;
    float rho2 = x*x + y*y + z*z;

    // Solve r^4 - (rho² - a²)*r² - a²*z² = 0
    // Let u = r², solve quadratic: u² - (rho² - a²)*u - a²*z² = 0
    float b = rho2 - a2;
    float c = -a2 * z * z;
    float discriminant = b * b - 4.0 * c;
    float r2 = (b + safeSqrt(discriminant)) * 0.5;
    float r = safeSqrt(r2);

    // theta from cos(theta) = z/r
    float cosTheta = r > EPSILON ? z / r : 0.0;
    float theta = acos(clamp(cosTheta, -1.0, 1.0));

    // phi from tan(phi) = y/x (adjusted for BL)
    float phi = atan(y, x);
    if (phi < 0.0) phi += TWO_PI;

    return vec3(r, theta, phi);
}

/**
 * Convert Boyer-Lindquist to Cartesian
 * x = sqrt(r² + a²) * sin(theta) * cos(phi)
 * y = sqrt(r² + a²) * sin(theta) * sin(phi)
 * z = r * cos(theta)
 */
vec3 boyerLindquistToCartesian(vec3 bl, float a) {
    float r = bl.x;
    float theta = bl.y;
    float phi = bl.z;

    float sinTheta = sin(theta);
    float cosTheta = cos(theta);
    float rho = safeSqrt(r * r + a * a);

    return vec3(
        rho * sinTheta * cos(phi),
        rho * sinTheta * sin(phi),
        r * cosTheta
    );
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Convert temperature (Kelvin) to RGB color using Planck's law approximation
 * Based on approximation by Tanner Helland
 */
vec3 temperatureToRGB(float tempKelvin) {
    float temp = clamp(tempKelvin, 1000.0, 40000.0) / 100.0;
    vec3 color;

    // Red
    if (temp <= 66.0) {
        color.r = 1.0;
    } else {
        color.r = 1.29293618606 * pow(temp - 60.0, -0.1332047592);
    }

    // Green
    if (temp <= 66.0) {
        color.g = 0.390081578769 * log(temp) - 0.631841443788;
    } else {
        color.g = 1.12989086089 * pow(temp - 60.0, -0.0755148492);
    }

    // Blue
    if (temp >= 66.0) {
        color.b = 1.0;
    } else if (temp <= 19.0) {
        color.b = 0.0;
    } else {
        color.b = 0.543206789110 * log(temp - 10.0) - 1.19625408914;
    }

    return clamp(color, 0.0, 1.0);
}

/**
 * Apply gamma correction
 */
vec3 gammaCorrect(vec3 color, float gamma) {
    return pow(color, vec3(1.0 / gamma));
}

/**
 * Apply tone mapping (Reinhard)
 */
vec3 toneMapReinhard(vec3 color) {
    return color / (color + vec3(1.0));
}

/**
 * Apply ACES filmic tone mapping
 */
vec3 toneMapACES(vec3 color) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}
