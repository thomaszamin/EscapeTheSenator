/**
 * InfiniteWorld - Main container for the parkour infinite world
 * 
 * Manages the infinite generation, environment, and game rules.
 */

import * as THREE from 'three';
import { PARKOUR, WORLD, LIGHTING } from '../../config/Constants.js';
import { ChunkManager } from './ChunkManager.js';
import { globalEvents, Events } from '../../systems/EventBus.js';

export class InfiniteWorld {
    constructor(scene) {
        this.scene = scene;
        this.chunkManager = new ChunkManager(scene);
        
        // Visual elements
        this.particles = null;
        this.ambientLight = null;
        this.directionalLight = null;
        
        // State
        this.isLoaded = false;
    }

    /**
     * Build the infinite world
     */
    build() {
        console.log('[InfiniteWorld] Building...');
        
        // Setup environment
        this.createLighting();
        this.createAtmosphere();
        this.createParticles();
        
        // Initialize chunk manager
        this.chunkManager.init();
        
        this.isLoaded = true;
        globalEvents.emit(Events.WORLD_LOADED);
        
        console.log('[InfiniteWorld] Built successfully');
    }

    /**
     * Create lighting for the parkour world
     */
    createLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(
            LIGHTING.AMBIENT_COLOR,
            LIGHTING.AMBIENT_INTENSITY
        );
        this.scene.add(this.ambientLight);
        
        // Directional light (follows player somewhat)
        this.directionalLight = new THREE.DirectionalLight(
            LIGHTING.DIRECTIONAL_COLOR,
            LIGHTING.DIRECTIONAL_INTENSITY
        );
        this.directionalLight.position.set(
            LIGHTING.DIRECTIONAL_POSITION.x,
            LIGHTING.DIRECTIONAL_POSITION.y,
            LIGHTING.DIRECTIONAL_POSITION.z
        );
        this.directionalLight.castShadow = true;
        this.scene.add(this.directionalLight);
        
        // Hemisphere light for better ambient
        const hemiLight = new THREE.HemisphereLight(
            LIGHTING.HEMISPHERE_SKY,
            LIGHTING.HEMISPHERE_GROUND,
            LIGHTING.HEMISPHERE_INTENSITY
        );
        this.scene.add(hemiLight);
        this.hemiLight = hemiLight;
    }

    /**
     * Create atmosphere (fog, background)
     */
    createAtmosphere() {
        // Deep void fog
        this.scene.fog = new THREE.Fog(
            0x050510,
            20,
            120
        );
        
        // Dark background
        this.scene.background = new THREE.Color(0x050510);
    }

    /**
     * Create floating particles for atmosphere
     */
    createParticles() {
        const particleCount = 800;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const color1 = new THREE.Color(0x00ff88);
        const color2 = new THREE.Color(0xff00ff);
        const color3 = new THREE.Color(0x00d4ff);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Spread particles in a cylinder around origin
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 30;
            
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.random() * 30 - 5;
            positions[i3 + 2] = Math.random() * 200 - 50;
            
            // Random color between accent colors
            const colorChoice = Math.random();
            let color;
            if (colorChoice < 0.33) {
                color = color1;
            } else if (colorChoice < 0.66) {
                color = color2;
            } else {
                color = color3;
            }
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        this.particleBasePositions = positions.slice();
    }

    /**
     * Update the world
     * @param {number} deltaTime - Time since last frame
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, playerPosition) {
        // Update chunks based on player Z position
        this.chunkManager.update(playerPosition.z);
        
        // Move directional light with player
        if (this.directionalLight) {
            this.directionalLight.position.z = playerPosition.z + LIGHTING.DIRECTIONAL_POSITION.z;
            this.directionalLight.target.position.z = playerPosition.z;
        }
        
        // Update particles
        this.updateParticles(deltaTime, playerPosition);
    }

    /**
     * Animate particles
     */
    updateParticles(deltaTime, playerPosition) {
        if (!this.particles) return;
        
        const positions = this.particles.geometry.attributes.position.array;
        const time = performance.now() * 0.001;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Keep particles relative to player Z
            let relativeZ = positions[i + 2] - playerPosition.z;
            
            // Wrap particles that are too far behind
            if (relativeZ < -50) {
                positions[i + 2] += 250;
            } else if (relativeZ > 200) {
                positions[i + 2] -= 250;
            }
            
            // Gentle floating motion
            positions[i + 1] += Math.sin(time + positions[i]) * 0.003;
            
            // Wrap Y
            if (positions[i + 1] > 30) positions[i + 1] = -5;
            if (positions[i + 1] < -10) positions[i + 1] = 25;
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Check if player has fallen to death
     * @param {number} playerY - Player Y position
     * @returns {boolean} True if player is dead
     */
    checkDeath(playerY) {
        return playerY < PARKOUR.DEATH_Y_THRESHOLD;
    }

    /**
     * Get obstacles for collision detection
     */
    getObstacles() {
        return this.chunkManager.getObstacles();
    }

    /**
     * Get current distance traveled
     */
    getDistance() {
        return this.chunkManager.getDistance();
    }

    /**
     * Reset the world for a new game
     */
    reset() {
        this.chunkManager.reset();
    }

    /**
     * Dispose all resources
     */
    dispose() {
        this.chunkManager.dispose();
        
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }
        
        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
        }
        
        if (this.hemiLight) {
            this.scene.remove(this.hemiLight);
        }
    }
}

export default InfiniteWorld;

