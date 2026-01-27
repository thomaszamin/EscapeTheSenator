/**
 * ChunkManager - Manages chunk lifecycle and world progression
 * 
 * Handles generating chunks ahead of the player and disposing old ones.
 */

import * as THREE from 'three';
import { PARKOUR } from '../../config/Constants.js';
import { ChunkGenerator } from './ChunkGenerator.js';
import { globalEvents, Events } from '../../systems/EventBus.js';

export class ChunkManager {
    constructor(scene) {
        this.scene = scene;
        this.generator = new ChunkGenerator();
        
        // Active chunks
        this.chunks = [];
        
        // World state
        this.currentZ = 0;
        this.currentHeight = 0;
        this.currentRotation = 0;
        this.totalDistance = 0;
        
        // All collision obstacles
        this.allObstacles = [];
    }

    /**
     * Initialize with starting chunk
     */
    init() {
        // Generate starting chunk
        const startChunk = this.generator.generateStartChunk();
        this.addChunk(startChunk, 0);
        
        this.currentZ = startChunk.endZ;
        this.currentHeight = startChunk.endHeight;
        
        // Generate initial chunks ahead
        for (let i = 0; i < PARKOUR.CHUNKS_AHEAD; i++) {
            this.generateNextChunk();
        }
        
        console.log('[ChunkManager] Initialized with', this.chunks.length, 'chunks');
    }

    /**
     * Generate the next chunk
     */
    generateNextChunk() {
        // Calculate curve for this chunk
        const shouldCurve = Math.random() < PARKOUR.CURVE_FREQUENCY;
        const curveAmount = shouldCurve 
            ? (Math.random() - 0.5) * 2 * PARKOUR.MAX_CURVE_ANGLE * (Math.PI / 180)
            : 0;
        
        // Generate chunk
        const chunkData = this.generator.generateChunk({
            startZ: this.currentZ,
            length: PARKOUR.CHUNK_LENGTH,
            startHeight: this.currentHeight,
            rotation: this.currentRotation,
            curveAmount: curveAmount,
        });
        
        // Apply curve to rotation
        this.currentRotation += curveAmount;
        
        // Add chunk to world
        this.addChunk(chunkData, this.currentZ);
        
        // Update state
        this.currentZ = chunkData.endZ;
        this.currentHeight = chunkData.endHeight;
        
        globalEvents.emit(Events.PARKOUR_CHUNK_GENERATED, {
            z: this.currentZ,
            height: this.currentHeight,
        });
    }

    /**
     * Add a chunk to the scene
     */
    addChunk(chunkData, startZ) {
        const chunk = {
            startZ: startZ,
            endZ: chunkData.endZ,
            platforms: chunkData.platforms,
            obstacles: chunkData.obstacles,
            group: new THREE.Group(),
        };
        
        // Add all platforms to the group
        chunkData.platforms.forEach(platform => {
            chunk.group.add(platform.getObject3D());
        });
        
        // Add group to scene
        this.scene.add(chunk.group);
        
        // Track obstacles for collision
        this.allObstacles.push(...chunkData.obstacles);
        
        this.chunks.push(chunk);
    }

    /**
     * Update chunks based on player position
     */
    update(playerZ) {
        // Check if we need to generate new chunks
        const furthestZ = this.currentZ;
        const distanceAhead = furthestZ - playerZ;
        
        if (distanceAhead < PARKOUR.CHUNKS_AHEAD * PARKOUR.CHUNK_LENGTH) {
            this.generateNextChunk();
        }
        
        // Check if we need to dispose old chunks
        const chunksToRemove = [];
        
        this.chunks.forEach((chunk, index) => {
            if (chunk.endZ < playerZ - PARKOUR.CHUNKS_BEHIND * PARKOUR.CHUNK_LENGTH) {
                chunksToRemove.push(index);
            }
        });
        
        // Remove old chunks (in reverse to maintain indices)
        chunksToRemove.reverse().forEach(index => {
            this.disposeChunk(index);
        });
        
        // Update animated platforms
        this.chunks.forEach(chunk => {
            chunk.platforms.forEach(platform => {
                if (platform.update) {
                    platform.update(0.016); // Approximate delta
                }
            });
        });
        
        // Update total distance
        this.totalDistance = Math.max(this.totalDistance, playerZ);
    }

    /**
     * Dispose a chunk
     */
    disposeChunk(index) {
        const chunk = this.chunks[index];
        if (!chunk) return;
        
        // Remove obstacles from collision list
        chunk.obstacles.forEach(obstacle => {
            const obsIndex = this.allObstacles.indexOf(obstacle);
            if (obsIndex !== -1) {
                this.allObstacles.splice(obsIndex, 1);
            }
        });
        
        // Dispose platforms
        chunk.platforms.forEach(platform => {
            if (platform.dispose) {
                platform.dispose();
            }
        });
        
        // Remove from scene
        this.scene.remove(chunk.group);
        
        // Remove from array
        this.chunks.splice(index, 1);
        
        globalEvents.emit(Events.PARKOUR_CHUNK_DISPOSED);
    }

    /**
     * Get all obstacles for collision detection
     */
    getObstacles() {
        return this.allObstacles;
    }

    /**
     * Get current total distance traveled
     */
    getDistance() {
        return this.totalDistance;
    }

    /**
     * Reset the chunk manager for a new game
     */
    reset() {
        // Dispose all chunks
        while (this.chunks.length > 0) {
            this.disposeChunk(0);
        }
        
        // Reset state
        this.currentZ = 0;
        this.currentHeight = 0;
        this.currentRotation = 0;
        this.totalDistance = 0;
        this.allObstacles = [];
        
        // Regenerate
        this.init();
    }

    /**
     * Dispose all resources
     */
    dispose() {
        while (this.chunks.length > 0) {
            this.disposeChunk(0);
        }
        this.allObstacles = [];
    }
}

export default ChunkManager;

