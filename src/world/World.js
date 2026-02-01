/**
 * World - Main world container and manager
 * 
 * Coordinates environment, terrain, and all world objects.
 */

import * as THREE from 'three';
import { Environment } from './Environment.js';
import { Terrain } from './Terrain.js';
import { globalEvents, Events } from '../systems/EventBus.js';
import { Werewolf } from '../entities/Werewolf.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        
        // World components
        this.environment = new Environment(scene);
        this.terrain = new Terrain(scene);
        
        // Entities and objects
        this.entities = [];
        this.interactables = [];
        this.werewolves = [];
        
        // Player reference for enemy AI
        this.playerRef = null;
        
        // World state
        this.isLoaded = false;
    }
    
    /**
     * Set the player reference for enemy AI
     */
    setPlayer(player) {
        this.playerRef = player;
        
        // Update existing werewolves
        this.werewolves.forEach(wolf => {
            wolf.setTarget(player);
        });
    }
    
    /**
     * Spawn a werewolf at a position (or random if not specified)
     */
    spawnWerewolf(position = null) {
        // Default spawn position: random location around the player
        if (!position && this.playerRef) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 10;
            position = new THREE.Vector3(
                this.playerRef.position.x + Math.cos(angle) * distance,
                0,
                this.playerRef.position.z + Math.sin(angle) * distance
            );
        } else if (!position) {
            position = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                0,
                (Math.random() - 0.5) * 20
            );
        }
        
        const werewolf = new Werewolf(position);
        werewolf.setObstacles(this.getObstacles());
        
        if (this.playerRef) {
            werewolf.setTarget(this.playerRef);
        }
        
        this.werewolves.push(werewolf);
        this.scene.add(werewolf.mesh);
        
        console.log('[World] Werewolf spawned at:', position.x.toFixed(1), position.y.toFixed(1), position.z.toFixed(1));
        
        return werewolf;
    }
    
    /**
     * Remove a werewolf from the world
     */
    removeWerewolf(werewolf) {
        const index = this.werewolves.indexOf(werewolf);
        if (index !== -1) {
            this.werewolves.splice(index, 1);
            this.scene.remove(werewolf.mesh);
            werewolf.dispose();
        }
    }
    
    /**
     * Clear all werewolves
     */
    clearWerewolves() {
        this.werewolves.forEach(wolf => {
            this.scene.remove(wolf.mesh);
            wolf.dispose();
        });
        this.werewolves = [];
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
        
        // Update werewolves
        this.werewolves.forEach(wolf => {
            wolf.update(deltaTime);
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
            this.particles = null;
        }
        
        this.entities.forEach(entity => {
            if (entity.dispose) {
                entity.dispose();
            }
        });
        
        // Clean up werewolves
        this.clearWerewolves();
        
        this.entities = [];
        this.interactables = [];
        this.isLoaded = false;
    }
}

export default World;

