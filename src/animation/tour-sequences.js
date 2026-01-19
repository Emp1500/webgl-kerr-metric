/**
 * Educational Tour Sequences for Black Hole Simulation
 *
 * Predefined camera paths and feature demonstrations that
 * showcase the physics of Kerr black holes.
 */

import { Keyframe, Easing } from './keyframe-manager.js';

/**
 * Tour scene definition
 */
export class TourScene {
    /**
     * @param {string} id - Unique scene identifier
     * @param {string} title - Display title
     * @param {string} description - Educational description
     * @param {number} startTime - Start time in seconds
     * @param {number} duration - Duration in seconds
     * @param {Array<Keyframe>} keyframes - Animation keyframes
     */
    constructor(id, title, description, startTime, duration, keyframes) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.startTime = startTime;
        this.duration = duration;
        this.keyframes = keyframes;
    }

    get endTime() {
        return this.startTime + this.duration;
    }
}

/**
 * Complete educational tour of Kerr black hole features
 */
export const educationalTour = {
    name: 'Educational Tour',
    description: 'A guided journey through the physics of rotating black holes',
    totalDuration: 60,

    scenes: [
        // Scene 1: Orbital Overview (0-10s)
        new TourScene(
            'orbital-overview',
            'Orbital Overview',
            'A complete orbit around the black hole reveals its symmetric structure. ' +
            'The bright accretion disk glows with material heated to millions of degrees ' +
            'as it spirals inward. Notice how one side appears brighter due to relativistic effects.',
            0, 10,
            [
                new Keyframe(0, {
                    'camera.distance': 20,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': 0,
                    'accretionDisk.enabled': true,
                    'advancedFeatures.showJets': true,
                    'advancedFeatures.showPhotonRing': true,
                    'debug.showErgosphere': false
                }, Easing.easeOutCubic),
                new Keyframe(10, {
                    'camera.distance': 20,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': Math.PI * 2,
                }, Easing.linear)
            ]
        ),

        // Scene 2: Photon Sphere (10-20s)
        new TourScene(
            'photon-sphere',
            'The Photon Sphere',
            'At 1.5 times the event horizon radius lies the photon sphere - ' +
            'a region where light can orbit the black hole. Photons here are ' +
            'on unstable circular orbits; the slightest perturbation sends them ' +
            'either into the black hole or out to infinity.',
            10, 10,
            [
                new Keyframe(10, {
                    'camera.distance': 20,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': 0,
                    'advancedFeatures.showPhotonRing': true,
                    'debug.showPhotonSphere': true
                }, Easing.easeInOutCubic),
                new Keyframe(13, {
                    'camera.distance': 8,
                    'camera.theta': Math.PI / 2.2,
                    'camera.phi': Math.PI / 4,
                }, Easing.easeInOutCubic),
                new Keyframe(17, {
                    'camera.distance': 6,
                    'camera.theta': Math.PI / 2,
                    'camera.phi': Math.PI / 2,
                }, Easing.easeInOutCubic),
                new Keyframe(20, {
                    'camera.distance': 10,
                    'camera.theta': Math.PI / 2.5,
                    'camera.phi': Math.PI,
                    'debug.showPhotonSphere': false
                }, Easing.easeInOutCubic)
            ]
        ),

        // Scene 3: Doppler Effects (20-30s)
        new TourScene(
            'doppler-effects',
            'Relativistic Doppler Effect',
            'The accretion disk appears asymmetric because of the Doppler effect. ' +
            'Material approaching us is blue-shifted and appears brighter, while ' +
            'material moving away is red-shifted and dimmer. This "relativistic beaming" ' +
            'causes intensity to vary as the fourth power of the Doppler factor.',
            20, 10,
            [
                new Keyframe(20, {
                    'camera.distance': 10,
                    'camera.theta': Math.PI / 2.5,
                    'camera.phi': Math.PI,
                    'accretionDisk.enabled': true
                }, Easing.easeInOutCubic),
                new Keyframe(22, {
                    'camera.distance': 12,
                    'camera.theta': Math.PI / 2.1,  // Nearly edge-on
                    'camera.phi': Math.PI * 1.25,
                }, Easing.easeInOutCubic),
                new Keyframe(26, {
                    'camera.distance': 12,
                    'camera.theta': Math.PI / 2.1,
                    'camera.phi': Math.PI * 1.75,
                }, Easing.easeInOutSine),
                new Keyframe(30, {
                    'camera.distance': 15,
                    'camera.theta': Math.PI / 2.3,
                    'camera.phi': Math.PI * 2,
                }, Easing.easeInOutCubic)
            ]
        ),

        // Scene 4: Ergosphere (30-38s)
        new TourScene(
            'ergosphere',
            'The Ergosphere',
            'The ergosphere is where spacetime itself rotates. Even light cannot ' +
            'remain stationary here - everything is dragged along with the spinning ' +
            'black hole. This "frame-dragging" effect was predicted by the Kerr solution ' +
            'and has been confirmed by satellite experiments around Earth.',
            30, 8,
            [
                new Keyframe(30, {
                    'camera.distance': 15,
                    'camera.theta': Math.PI / 2.3,
                    'camera.phi': 0,
                    'debug.showErgosphere': true,
                    'advancedFeatures.showJets': false,
                    'accretionDisk.enabled': false
                }, Easing.easeInOutCubic),
                new Keyframe(32, {
                    'camera.distance': 8,
                    'camera.theta': Math.PI / 4,  // From above
                    'camera.phi': Math.PI / 2,
                }, Easing.easeInOutCubic),
                new Keyframe(35, {
                    'camera.distance': 6,
                    'camera.theta': Math.PI / 2,  // Equatorial
                    'camera.phi': Math.PI,
                }, Easing.easeInOutCubic),
                new Keyframe(38, {
                    'camera.distance': 10,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': Math.PI * 1.5,
                    'debug.showErgosphere': false,
                    'accretionDisk.enabled': true
                }, Easing.easeInOutCubic)
            ]
        ),

        // Scene 5: Relativistic Jets (38-46s)
        new TourScene(
            'relativistic-jets',
            'Relativistic Jets',
            'Powerful jets of plasma shoot from the poles at nearly the speed of light. ' +
            'The Blandford-Znajek mechanism extracts rotational energy from the black hole ' +
            'via magnetic fields. Jet power scales with spin squared, making rapidly ' +
            'rotating black holes the most energetic engines in the universe.',
            38, 8,
            [
                new Keyframe(38, {
                    'camera.distance': 10,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': Math.PI * 1.5,
                    'advancedFeatures.showJets': true,
                    'blackHole.spin': 0.9
                }, Easing.easeInOutCubic),
                new Keyframe(40, {
                    'camera.distance': 25,
                    'camera.theta': Math.PI / 6,  // Looking down jet axis
                    'camera.phi': Math.PI * 1.75,
                }, Easing.easeInOutCubic),
                new Keyframe(43, {
                    'camera.distance': 30,
                    'camera.theta': Math.PI / 2.5,
                    'camera.phi': Math.PI * 2,
                }, Easing.easeInOutCubic),
                new Keyframe(46, {
                    'camera.distance': 20,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': Math.PI * 2.25,
                }, Easing.easeInOutCubic)
            ]
        ),

        // Scene 6: Gravitational Lensing (46-52s)
        new TourScene(
            'gravitational-lensing',
            'Gravitational Lensing',
            'The intense gravity bends light from background stars, creating ' +
            'distorted and multiple images. Einstein\'s general relativity predicts ' +
            'this effect precisely. The Event Horizon Telescope used these predictions ' +
            'to image the black hole in M87 galaxy.',
            46, 6,
            [
                new Keyframe(46, {
                    'camera.distance': 20,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': Math.PI * 2.25,
                    'accretionDisk.enabled': false,
                    'advancedFeatures.showJets': false,
                    'advancedFeatures.showPhotonRing': true
                }, Easing.easeInOutCubic),
                new Keyframe(48, {
                    'camera.distance': 30,
                    'camera.theta': Math.PI / 2.5,
                    'camera.phi': Math.PI * 2.5,
                }, Easing.easeInOutCubic),
                new Keyframe(52, {
                    'camera.distance': 25,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': Math.PI * 3,
                    'accretionDisk.enabled': true
                }, Easing.easeInOutCubic)
            ]
        ),

        // Scene 7: Event Horizon Approach (52-60s)
        new TourScene(
            'event-horizon',
            'Approaching the Event Horizon',
            'The event horizon is the point of no return. Beyond this boundary, ' +
            'nothing - not even light - can escape. For a rotating black hole, ' +
            'the horizon is smaller than for a non-rotating one of the same mass. ' +
            'Time dilation becomes extreme as we approach.',
            52, 8,
            [
                new Keyframe(52, {
                    'camera.distance': 25,
                    'camera.theta': Math.PI / 3,
                    'camera.phi': Math.PI * 3,
                    'accretionDisk.enabled': true,
                    'advancedFeatures.showJets': true,
                    'advancedFeatures.showPhotonRing': true,
                    'debug.showHorizon': true
                }, Easing.easeInOutCubic),
                new Keyframe(55, {
                    'camera.distance': 10,
                    'camera.theta': Math.PI / 2.5,
                    'camera.phi': Math.PI * 3.25,
                }, Easing.easeInCubic),
                new Keyframe(58, {
                    'camera.distance': 5,
                    'camera.theta': Math.PI / 2.2,
                    'camera.phi': Math.PI * 3.5,
                }, Easing.easeInCubic),
                new Keyframe(60, {
                    'camera.distance': 3.5,
                    'camera.theta': Math.PI / 2,
                    'camera.phi': Math.PI * 3.75,
                }, Easing.easeInExpo)
            ]
        )
    ],

    /**
     * Get the scene active at a given time
     * @param {number} time - Time in seconds
     * @returns {TourScene|null}
     */
    getSceneAtTime(time) {
        for (const scene of this.scenes) {
            if (time >= scene.startTime && time < scene.endTime) {
                return scene;
            }
        }
        return null;
    },

    /**
     * Get all keyframes from all scenes
     * @returns {Array<Keyframe>}
     */
    getAllKeyframes() {
        const allKeyframes = [];
        for (const scene of this.scenes) {
            allKeyframes.push(...scene.keyframes);
        }
        return allKeyframes;
    }
};

/**
 * Quick demonstration sequences for specific features
 */
export const quickDemos = {
    /**
     * Quick spin comparison demo
     */
    spinComparison: {
        name: 'Spin Comparison',
        description: 'Compare Schwarzschild (non-rotating) to extremal Kerr',
        duration: 15,
        keyframes: [
            new Keyframe(0, {
                'camera.distance': 15,
                'camera.theta': Math.PI / 3,
                'camera.phi': 0,
                'blackHole.spin': 0,
                'accretionDisk.enabled': true
            }, Easing.easeOutCubic),
            new Keyframe(5, {
                'blackHole.spin': 0,
                'camera.phi': Math.PI
            }, Easing.linear),
            new Keyframe(7.5, {
                'blackHole.spin': 0.5
            }, Easing.easeInOutCubic),
            new Keyframe(10, {
                'blackHole.spin': 0.9,
                'camera.phi': Math.PI * 2
            }, Easing.easeInOutCubic),
            new Keyframe(15, {
                'blackHole.spin': 0.99,
                'camera.phi': Math.PI * 3
            }, Easing.easeInOutCubic)
        ]
    },

    /**
     * Disk temperature visualization
     */
    diskTemperature: {
        name: 'Accretion Disk',
        description: 'Observe the temperature structure of the accretion disk',
        duration: 10,
        keyframes: [
            new Keyframe(0, {
                'camera.distance': 12,
                'camera.theta': Math.PI / 2.5,
                'camera.phi': 0,
                'accretionDisk.enabled': true,
                'advancedFeatures.showJets': false
            }, Easing.easeOutCubic),
            new Keyframe(5, {
                'camera.distance': 8,
                'camera.theta': Math.PI / 2.1,
                'camera.phi': Math.PI
            }, Easing.easeInOutCubic),
            new Keyframe(10, {
                'camera.distance': 12,
                'camera.theta': Math.PI / 3,
                'camera.phi': Math.PI * 2
            }, Easing.easeInOutCubic)
        ]
    },

    /**
     * Jet power demonstration
     */
    jetPower: {
        name: 'Jet Power',
        description: 'Watch jets strengthen with increasing spin',
        duration: 12,
        keyframes: [
            new Keyframe(0, {
                'camera.distance': 30,
                'camera.theta': Math.PI / 4,
                'camera.phi': 0,
                'blackHole.spin': 0.3,
                'advancedFeatures.showJets': true
            }, Easing.easeOutCubic),
            new Keyframe(4, {
                'blackHole.spin': 0.6,
                'camera.phi': Math.PI / 2
            }, Easing.easeInOutCubic),
            new Keyframe(8, {
                'blackHole.spin': 0.9,
                'camera.phi': Math.PI
            }, Easing.easeInOutCubic),
            new Keyframe(12, {
                'blackHole.spin': 0.99,
                'camera.phi': Math.PI * 1.5,
                'camera.distance': 25
            }, Easing.easeInOutCubic)
        ]
    }
};
