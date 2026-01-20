# Validation Guide (Phase 7)

This document describes the validation framework for the Kerr Black Hole Simulation, including how to run tests, interpret results, and understand the physics accuracy of the simulation.

## Overview

The validation framework consists of four main components:

1. **Physics Validation** - Tests core physics calculations against known analytical values
2. **GPU/CPU Parity** - Ensures JavaScript and GLSL shader calculations match
3. **Visual Validation** - Screenshot comparison for visual regression testing
4. **Reference Data** - Validated values from scientific literature

## Quick Start

Open the browser console and run:

```javascript
// Run full physics validation suite
physicsValidation.run()

// Run quick validation (essential tests)
physicsValidation.runQuick()

// Test GPU/CPU calculation parity
gpuCpuParity.run()

// Capture reference screenshot
visualValidation.capture()

// Compare current render to reference
visualValidation.compare()
```

## Physics Validation

### Running Tests

```javascript
// Full suite with detailed output
physicsValidation.run()

// Quick essential tests
physicsValidation.runQuick()

// Export results as JSON
physicsValidation.exportJSON()
```

### Test Categories

#### KerrMetric Tests
Tests for the Kerr metric calculations including:

| Test | Description | Expected |
|------|-------------|----------|
| Event Horizon | r+ = M + √(M² - a²) | Exact formula |
| Inner Horizon | r- = M - √(M² - a²) | Exact formula |
| ISCO (prograde) | Innermost stable circular orbit | Bardeen formula |
| ISCO (retrograde) | Retrograde orbit ISCO | Bardeen formula |
| Photon Sphere | Unstable photon orbit radius | Bardeen formula |
| Ergosphere | Frame-dragging boundary | r_ergo(θ) formula |
| Frame Dragging | Angular velocity ω | Kerr metric |

#### AccretionDisk Tests
Tests for disk physics calculations:

| Test | Description | Expected |
|------|-------------|----------|
| Temperature Profile | Novikov-Thorne model | T ~ r^(-3/4) |
| Zero Inside ISCO | No emission inside ISCO | T = 0 for r < r_ISCO |
| Orbital Velocity | Keplerian orbit | v < c |
| Gravitational Redshift | Time dilation factor | 0 < z ≤ 1 |
| Doppler Factor | Relativistic Doppler | g > 1 approaching, g < 1 receding |

### Reference Values

The simulation is validated against the following reference cases:

#### Schwarzschild (a = 0, M = 1)
```
Event Horizon:    2.0 M
Inner Horizon:    0.0 M
Photon Sphere:    3.0 M
ISCO:             6.0 M
```

#### Kerr High Spin (a = 0.9M, M = 1)
```
Event Horizon:    1.436 M
Inner Horizon:    0.564 M
Photon Sphere:    2.23 M
ISCO (prograde):  2.32 M
ISCO (retrograde): 8.72 M
```

#### Near-Extremal (a = 0.99M, M = 1)
```
Event Horizon:    ~1.14 M
ISCO (prograde):  ~1.45 M
```

### Tolerance Levels

| Calculation Type | Tolerance | Reason |
|-----------------|-----------|--------|
| Exact analytical | 1e-10 | Float64 precision |
| Numerical formulas | 1e-6 | Iterative convergence |
| GPU calculations | 1e-4 | Float32 precision |
| Disk physics | 1% | Simplified model |
| Near-extremal | 1% | Numerical instability |

## GPU/CPU Parity Validation

Ensures GLSL shader calculations match JavaScript reference implementations.

### Running Tests

```javascript
gpuCpuParity.run()
```

### What's Tested

- Metric tensor components (Sigma, Delta)
- ISCO calculation
- Photon sphere calculation
- Temperature profile
- Doppler factor
- Gravitational redshift
- Coordinate conversions (round-trip)

### Interpretation

- **Passed**: Difference < tolerance (1e-4 for float32)
- **Failed**: May indicate bug or precision issue

## Visual Validation

Screenshot-based comparison for visual regression testing.

### Usage

```javascript
// 1. Capture reference image (when render is correct)
visualValidation.capture()

// 2. Make changes to code...

// 3. Compare current render to reference
visualValidation.compare()

// 4. View difference image
visualValidation.showDiff()

// Optional: Save/load reference
visualValidation.saveReference()
visualValidation.loadReference()
```

### Metrics

- **Mean Absolute Error (MAE)**: Average pixel difference
- **Diff Percentage**: Percentage of pixels with differences
- **Max Difference**: Largest single-pixel difference

### Pass/Fail Criteria

- **Pass**: MAE < 5 (out of 255)
- **Fail**: MAE ≥ 5 indicates significant visual change

## Known Limitations

### Physics Approximations

1. **Thin Disk Model**: The Novikov-Thorne model assumes an infinitely thin disk
2. **No Self-Shadowing**: Disk doesn't shadow itself
3. **Simplified Temperature**: Peak temperature capped for numerical stability
4. **Equatorial Plane**: Disk confined to θ = π/2

### Numerical Limitations

1. **Float32 Precision**: GLSL shaders use 32-bit floats
2. **Near-Extremal Spin**: a > 0.99M may have numerical issues
3. **Ray Termination**: Integration stops after max steps

### Visual Limitations

1. **Resolution Dependent**: Visual accuracy depends on resolution
2. **Adaptive Quality**: Lower quality settings reduce accuracy
3. **Browser Differences**: Minor variations between browsers

## Scientific References

1. **Kerr, R. P.** (1963). "Gravitational Field of a Spinning Mass" - Original metric
2. **Bardeen, Press & Teukolsky** (1972). "Rotating Black Holes" - ISCO, photon sphere formulas
3. **Cunningham & Bardeen** (1973). "Optical Appearance of Stars Orbiting" - Visual appearance
4. **Novikov & Thorne** (1973). "Astrophysics of Black Holes" - Disk temperature model
5. **EHT Collaboration** (2019). "First M87 Event Horizon Telescope Results" - Observational validation

## Validation Checklist

Before release, verify:

- [ ] `physicsValidation.run()` - All tests pass
- [ ] `gpuCpuParity.run()` - All parity checks pass
- [ ] Visual comparison matches expectations
- [ ] No console errors during validation
- [ ] Tests pass on Chrome, Firefox, Safari
- [ ] Performance acceptable at each quality level

## Troubleshooting

### Test Failures

1. **KerrMetric test fails**
   - Check `src/physics/kerr-metric.js` formulas
   - Verify against reference data

2. **AccretionDisk test fails**
   - Check `src/physics/accretion-disk.js` formulas
   - Verify temperature profile implementation

3. **GPU/CPU parity fails**
   - Check GLSL shader in `src/shaders/includes/`
   - May indicate float32 precision issue

4. **Visual validation fails**
   - Check if intentional change
   - Capture new reference if change is correct

### Getting Help

- Console: `simulation.help()` for controls
- Physics: Check `tests/reference-data.js` for expected values
- Issues: Report at project repository
