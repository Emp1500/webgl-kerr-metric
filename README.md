# Kerr Black Hole Simulation

A scientifically accurate 3D visualization of a rotating (Kerr) black hole using pure WebGL with ray marching through curved spacetime.

## Overview

This project simulates the appearance of a rotating black hole with realistic physics including:
- **Gravitational lensing** of background starlight
- **Accretion disk** with relativistic Doppler shifting
- **Black hole shadow** (validated against Event Horizon Telescope observations)
- **Photon sphere** visualization
- **Ergosphere** and frame-dragging effects
- **Relativistic jets** from the poles

## Physics Background

### The Kerr Metric

The simulation uses the **Kerr metric** in Boyer-Lindquist coordinates to describe the curved spacetime around a rotating black hole:

```
ds² = -(1 - 2Mr/Σ)dt² + (Σ/Δ)dr² + Σdθ² + [(r² + a²)² - a²Δsin²θ]sin²θ/Σ dφ² - 4aMr sin²θ/Σ dt dφ
```

Where:
- **M**: Black hole mass
- **a**: Spin parameter (0 ≤ a ≤ M)
- **Σ = r² + a²cos²θ**
- **Δ = r² - 2Mr + a²**

### Key Features

#### Event Horizon
The event horizon radius is given by:
```
r₊ = M + √(M² - a²)
```
- Schwarzschild (non-rotating): r₊ = 2M
- Extremal Kerr (maximum spin): r₊ = M

#### Innermost Stable Circular Orbit (ISCO)
The closest stable orbit for matter depends on spin:
- Schwarzschild: r_ISCO = 6M
- Extremal Kerr (prograde): r_ISCO = M
- Extremal Kerr (retrograde): r_ISCO = 9M

#### Photon Sphere
Unstable circular orbits for photons:
- Schwarzschild: r_photon = 3M
- Spin-dependent for Kerr black holes

#### Ergosphere
Region where spacetime itself is dragged around the black hole:
```
r_ergo = M + √(M² - a²cos²θ)
```

### Geodesic Integration

Light paths are calculated by numerically integrating the **geodesic equations** using a 4th-order Runge-Kutta (RK4) method. For null geodesics (photon paths), we use conserved quantities:
- **E**: Energy
- **L_z**: Angular momentum (z-component)
- **Q**: Carter constant

The equations of motion are:
```
Σ(dr/dλ) = ±√R(r)
Σ(dθ/dλ) = ±√Θ(θ)
```

Where R(r) and Θ(θ) are polynomial functions of the conserved quantities.

### Accretion Disk

The accretion disk uses the **Novikov-Thorne model** for temperature distribution:
```
T(r) = T₀ × (M/r³)^0.25 × [1 - (r_ISCO/r)^0.5]^0.25
```

**Relativistic effects** include:
1. **Doppler shifting**: The approaching side appears blue-shifted and brighter
2. **Relativistic beaming**: Emission is boosted by factor g⁴ where g is the Doppler factor
3. **Gravitational redshift**: Light loses energy climbing out of the gravitational well

## Technical Architecture

### Technology Stack
- **Pure WebGL 2.0** with custom GLSL shaders
- **Ray marching** through curved spacetime
- **RK4 integrator** for geodesic equations in GLSL
- **Vanilla JavaScript** (no frameworks)

### Project Structure
```
/Cosmos/
├── index.html                          # Main entry point
├── src/
│   ├── main.js                        # Application initialization
│   ├── config/
│   │   ├── constants.js              # Physical constants (G, c, M☉)
│   │   └── simulation-params.js      # Simulation parameters
│   ├── core/
│   │   ├── webgl-context.js         # WebGL setup
│   │   ├── shader-manager.js        # Shader compilation
│   │   └── buffer-manager.js        # Geometry buffers
│   ├── physics/
│   │   ├── kerr-metric.js           # Metric calculations
│   │   ├── geodesic-calculator.js   # Geodesic helpers
│   │   └── accretion-disk.js        # Disk physics model
│   ├── shaders/
│   │   ├── vertex-shader.glsl       # Vertex shader
│   │   ├── fragment-shader.glsl     # Main ray marching
│   │   └── includes/
│   │       ├── kerr-metric.glsl    # Kerr metric implementation
│   │       ├── geodesic-rk4.glsl   # Geodesic integrator
│   │       ├── color-mapping.glsl   # Temperature/color mapping
│   │       └── utils.glsl           # Utility functions
│   ├── rendering/
│   │   ├── ray-marcher.js           # Ray marching orchestration
│   │   ├── camera.js                # Camera system
│   │   ├── starfield.js             # Background stars
│   │   ├── accretion-renderer.js    # Disk rendering
│   │   └── jet-renderer.js          # Jet visualization
│   ├── animation/
│   │   ├── time-controller.js       # Animation system
│   │   ├── interpolation.js         # Smooth transitions
│   │   └── keyframe-manager.js      # Keyframe sequences
│   └── ui/
│       ├── annotations.js           # Educational overlays
│       ├── info-panel.js            # Stats display
│       └── controls.js              # User controls
└── tests/
    ├── physics-validation.js        # Physics tests
    └── performance-benchmarks.js    # Performance tests
```

## Installation & Usage

### Prerequisites
- Modern web browser with WebGL 2.0 support (Chrome, Firefox, Safari, Edge)
- Local web server (for development)

### Running the Simulation

1. Clone the repository:
```bash
git clone <repository-url>
cd Cosmos
```

2. Start a local web server:
```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js
npx http-server -p 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

### Controls

- **Mouse drag**: Rotate camera
- **Mouse wheel**: Zoom in/out
- **Space**: Play/pause animation
- **Arrow keys**: Manual camera control
- **1-5 keys**: Jump to specific scenes
- **R**: Reset camera
- **H**: Toggle UI help

## Educational Features

The simulation includes an **automated tour** that demonstrates:

1. **Orbital Overview** (0-10s): Complete orbit around the black hole
2. **Photon Sphere** (10-20s): Close-up of unstable photon orbits
3. **Doppler Effects** (20-30s): Asymmetric accretion disk brightness
4. **Ergosphere** (30-35s): Frame-dragging region
5. **Gravitational Lensing** (35-45s): Background star distortion
6. **Event Horizon Approach** (45-60s): Journey toward the point of no return

Each scene includes **annotations** explaining the physics being demonstrated.

## Validation

### Physics Validation
The simulation has been validated against:
- Event Horizon Telescope M87* observations (a ≈ 0.94, i ≈ 17°)
- Analytical predictions for event horizon radius
- ISCO calculations for various spin parameters
- Conservation of geodesic constants (E, L_z, Q)

### Visual Validation
Cross-referenced with:
- Kip Thorne's DNGR code (used for Interstellar film)
- NASA black hole visualizations
- Published research simulations

## Performance

**Target Performance:**
- 60 FPS at 1920×1080 resolution
- Adaptive quality scaling for lower-end devices
- Maximum 1000 ray marching steps
- GPU memory usage < 500MB

**Optimization Techniques:**
- Early ray termination (inside horizon or escaped)
- Adaptive step sizing near event horizon
- Level-of-detail system for distant features
- Efficient GLSL code with minimal branching

## Scientific References

1. **Kerr, R. P.** (1963). "Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics." *Physical Review Letters*.

2. **Cunningham, C. T. & Bardeen, J. M.** (1973). "The Optical Appearance of a Star Orbiting an Extreme Kerr Black Hole." *The Astrophysical Journal*.

3. **Novikov, I. D. & Thorne, K. S.** (1973). "Astrophysics of Black Holes." *Black Holes (Les Astres Occlus)*.

4. **Event Horizon Telescope Collaboration** (2019). "First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole." *The Astrophysical Journal Letters*.

5. **James, O., von Tunzelmann, E., Franklin, P., & Thorne, K. S.** (2015). "Gravitational lensing by spinning black holes in astrophysics, and in the movie Interstellar." *Classical and Quantum Gravity*.

## Educational Value

This simulation demonstrates fundamental concepts in:
- **General Relativity**: Curved spacetime and its effects on light
- **Black Hole Physics**: Event horizons, singularities, and information paradox
- **Astrophysics**: Accretion disks, jets, and active galactic nuclei
- **Observational Astronomy**: Techniques used by Event Horizon Telescope
- **Computational Physics**: Numerical integration and GPU computing

## Development Roadmap

### Phase 1: Foundation ✓
- [x] Project structure
- [x] WebGL context setup
- [x] Kerr metric implementation

### Phase 2: Geodesic Integration ✓
- [x] RK4 integrator in GLSL
- [x] Ray marching pipeline
- [x] Background star lensing

### Phase 3: Accretion Disk ✓
- [x] Disk geometry (thin equatorial disk from ISCO to outer radius)
- [x] Temperature profile (Novikov-Thorne model)
- [x] Relativistic effects (Doppler shifting, beaming, gravitational redshift)

### Phase 4: Advanced Features ✓
- [x] Photon ring / light ring visualization
- [x] Relativistic jets (Blandford-Znajek mechanism, Doppler boosting)
- [x] Enhanced ergosphere with frame-dragging visualization

### Phase 5: Animation System ✓
- [x] Keyframe controller with easing functions
- [x] Educational tour (7 guided scenes, 60 seconds)
- [x] Quick demos (spin comparison, disk temperature, jet power)
- [x] Annotation overlay system with scene descriptions
- [x] Interactive controls (play/pause, seek, scene jump)

### Phase 6: Optimization ✓
- [x] Performance monitoring (PerformanceMonitor class integrated)
- [x] Adaptive quality (QualityManager with 5 presets: ultra/high/medium/low/potato)
- [x] Cross-browser testing (BrowserCapabilities detection, testing checklist)

### Phase 7: Validation ✓
- [x] Physics tests (35+ tests for KerrMetric and AccretionDisk)
- [x] Visual comparison (screenshot capture and diff framework)
- [x] Documentation (docs/VALIDATION.md with methodology and tolerances)

## Contributing

Contributions are welcome! Areas of interest:
- Performance optimization
- Additional relativistic effects
- Educational content
- Mobile device support
- Alternative coordinate systems (Kerr-Schild, etc.)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **Kip Thorne**: For pioneering work on black hole visualization
- **Event Horizon Telescope Team**: For providing validation data
- **NASA**: For educational resources and reference visualizations
- **WebGL Community**: For technical resources and examples

---

**Note**: This is a simulation for educational purposes. While scientifically accurate within the limits of general relativity, it represents a classical view and does not include quantum effects near the singularity.
