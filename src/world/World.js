/**
 * World - Main world container and manager
 * 
 * Coordinates environment, terrain, and all world objects.
 */

import * as THREE from 'three';
import { Environment } from './Environment.js';
import { Terrain } from './Terrain.js';
import { globalEvents, Events } from '../systems/EventBus.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        
        // World components
        this.environment = new Environment(scene);
        this.terrain = new Terrain(scene);
        
        // Entities and objects
        this.entities = [];
        this.interactables = [];
        
        // World state
        this.isLoaded = false;
    }

    /**
     * Build the entire world
     */
    build() {
        console.log('[World] Building world...');
        
        // Build lighting and atmosphere
        this.environment.build();
        
        // Build terrain and obstacles
        this.terrain.build();
        
        // Add some visual interest
        this.createParticles();
        
        this.isLoaded = true;
        globalEvents.emit(Events.WORLD_LOADED);
        
        console.log('[World] World built successfully');
    }

    /**
     * Create floating particles for atmosphere
     */
    createParticles() {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const color1 = new THREE.Color(0x00ff88);
        const color2 = new THREE.Color(0x00d4ff);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position in world
            positions[i3] = (Math.random() - 0.5) * 80;
            positions[i3 + 1] = Math.random() * 20 + 1;
            positions[i3 + 2] = (Math.random() - 0.5) * 80;
            
            // Random color between two accent colors
            const mixFactor = Math.random();
            const color = color1.clone().lerp(color2, mixFactor);
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
        
        // Store initial positions for animation
        this.particlePositions = positions;
    }

    /**
     * Update world elements
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Update environment (lighting changes, etc.)
        this.environment.update(deltaTime);
        
        // Update terrain (animated elements)
        this.terrain.update(deltaTime);
        
        // Animate particles
        this.updateParticles(deltaTime);
        
        // Update entities
        this.entities.forEach(entity => {
            if (entity.update) {
                entity.update(deltaTime);
            }
        });
    }

    /**
     * Animate floating particles
     */
    updateParticles(deltaTime) {
        if (!this.particles) return;
        
        const positions = this.particles.geometry.attributes.position.array;
        const time = performance.now() * 0.001;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Gentle floating motion
            positions[i + 1] += Math.sin(time + positions[i]) * 0.002;
            
            // Wrap around if too high or low
            if (positions[i + 1] > 25) positions[i + 1] = 1;
            if (positions[i + 1] < 0) positions[i + 1] = 20;
        }
        
        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Add an entity to the world
     * @param {Object} entity - Entity to add
     */
    addEntity(entity) {
        this.entities.push(entity);
        
        if (entity.mesh) {
            this.scene.add(entity.mesh);
        }
    }

    /**
     * Remove an entity from the world
     * @param {Object} entity - Entity to remove
     */
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
            
            if (entity.mesh) {
                this.scene.remove(entity.mesh);
            }
            
            if (entity.dispose) {
                entity.dispose();
            }
        }
    }

    /**
     * Get obstacles for collision detection
     */
    getObstacles() {
        return this.terrain.getObstacles();
    }

    /**
     * Clean up world resources
     */
    dispose() {
        this.environment.dispose();
        this.terrain.dispose();
        
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
        
        this.entities.forEach(entity => {
            if (entity.dispose) {
                entity.dispose();
            }
        });
        
        this.entities = [];
        this.interactables = [];
    }
}

export default World;

