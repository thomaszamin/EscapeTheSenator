/**
 * Environment - Scene lighting and atmosphere
 * 
 * Manages all lighting, fog, and atmospheric effects.
 */

import * as THREE from 'three';
import { LIGHTING, RENDER } from '../config/Constants.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.lights = [];
    }

    /**
     * Build the environment lighting
     */
    build() {
        this.createAmbientLight();
        this.createHemisphereLight();
        this.createDirectionalLight();
    }

    /**
     * Create ambient light for base illumination
     */
    createAmbientLight() {
        const ambient = new THREE.AmbientLight(
            LIGHTING.AMBIENT_COLOR,
            LIGHTING.AMBIENT_INTENSITY
        );
        
        this.scene.add(ambient);
        this.lights.push(ambient);
    }

    /**
     * Create hemisphere light for sky/ground color variation
     */
    createHemisphereLight() {
        const hemisphere = new THREE.HemisphereLight(
            LIGHTING.HEMISPHERE_SKY,
            LIGHTING.HEMISPHERE_GROUND,
            LIGHTING.HEMISPHERE_INTENSITY
        );
        
        this.scene.add(hemisphere);
        this.lights.push(hemisphere);
    }

    /**
     * Create directional light (sun) with shadows
     */
    createDirectionalLight() {
        const directional = new THREE.DirectionalLight(
            LIGHTING.DIRECTIONAL_COLOR,
            LIGHTING.DIRECTIONAL_INTENSITY
        );
        
        directional.position.set(
            LIGHTING.DIRECTIONAL_POSITION.x,
            LIGHTING.DIRECTIONAL_POSITION.y,
            LIGHTING.DIRECTIONAL_POSITION.z
        );
        
        // Enable shadows
        if (RENDER.ENABLE_SHADOWS) {
            directional.castShadow = true;
            directional.shadow.mapSize.width = RENDER.SHADOW_MAP_SIZE;
            directional.shadow.mapSize.height = RENDER.SHADOW_MAP_SIZE;
            directional.shadow.camera.near = 0.5;
            directional.shadow.camera.far = 100;
            directional.shadow.camera.left = -30;
            directional.shadow.camera.right = 30;
            directional.shadow.camera.top = 30;
            directional.shadow.camera.bottom = -30;
            directional.shadow.bias = -0.0001;
        }
        
        this.scene.add(directional);
        this.lights.push(directional);
    }

    /**
     * Update environment (for day/night cycles, etc.)
     */
    update(deltaTime) {
        // Future: animate sun position, change lighting over time
    }

    /**
     * Dispose of lights
     */
    dispose() {
        this.lights.forEach(light => {
            this.scene.remove(light);
            if (light.dispose) light.dispose();
        });
        this.lights = [];
    }
}

export default Environment;

