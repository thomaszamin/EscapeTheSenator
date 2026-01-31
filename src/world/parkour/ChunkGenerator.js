/**
 * ChunkGenerator - Generates platform patterns for chunks
 * 
 * Creates semi-random patterns of platforms with variations.
 * Ensures proper spacing between all obstacles to prevent overlaps.
 */

import * as THREE from 'three';
import { PARKOUR } from '../../config/Constants.js';
import { BasicPlatform } from './BasicPlatform.js';
import { RampPlatform } from './RampPlatform.js';
import { BouncePad } from './BouncePad.js';
import { WallRunSegment } from './WallRunSegment.js';
import { CheckpointPlatform } from './CheckpointPlatform.js';

// Pattern types for semi-random generation
const PatternType = {
    STRAIGHT: 'straight',
    STEPPING_STONES: 'stepping_stones',
    RAMP_UP: 'ramp_up',
    RAMP_DOWN: 'ramp_down',
    BOUNCE_JUMP: 'bounce_jump',
    WALL_RUN: 'wall_run',
    ZIGZAG: 'zigzag',
};

// Spacing constants for running jump obstacles
// Running jump physics: speed=15, jump_time=0.8s, max_distance=~12 units
const SPACING = {
    // Minimum gap between platform edges - easy running jump
    MIN_EDGE_GAP: 5.0,
    // Maximum gap between platform edges - challenging but achievable running jump
    MAX_EDGE_GAP: 9.0,
    // Minimum X distance to consider platforms as "different lanes"
    LANE_SEPARATION: 5,
    // Buffer zone to prevent any overlaps
    OVERLAP_BUFFER: 0.5,
    // Approach distance needed before a running jump
    APPROACH_DISTANCE: 6,
    // Wall run approach distance
    WALL_RUN_APPROACH: 8,
};

// Checkpoint configuration
const CHECKPOINT = {
    // Place a checkpoint every N chunks
    CHUNK_INTERVAL: 3,
    // Platform size - VERY wide to catch players from any X position
    WIDTH: 20,
    LENGTH: 14,
};

export class ChunkGenerator {
    constructor() {
        this.patterns = Object.values(PatternType);
        this.lastPattern = null;
        this.chunkCount = 0;          // Track chunks generated
        this.checkpointCount = 0;      // Track checkpoints created
        this.checkpoints = [];         // Store all checkpoint references
    }

    /**
     * Check if two platforms would overlap or be too close
     * @param {Object} plat1 - First platform {x, z, width, length}
     * @param {Object} plat2 - Second platform {x, z, width, length}
     * @returns {boolean} True if platforms are too close
     */
    checkOverlap(plat1, plat2) {
        // Calculate bounding boxes with buffer
        const p1MinX = plat1.x - plat1.width / 2 - SPACING.OVERLAP_BUFFER;
        const p1MaxX = plat1.x + plat1.width / 2 + SPACING.OVERLAP_BUFFER;
        const p1MinZ = plat1.z - plat1.length / 2 - SPACING.OVERLAP_BUFFER;
        const p1MaxZ = plat1.z + plat1.length / 2 + SPACING.OVERLAP_BUFFER;

        const p2MinX = plat2.x - plat2.width / 2 - SPACING.OVERLAP_BUFFER;
        const p2MaxX = plat2.x + plat2.width / 2 + SPACING.OVERLAP_BUFFER;
        const p2MinZ = plat2.z - plat2.length / 2 - SPACING.OVERLAP_BUFFER;
        const p2MaxZ = plat2.z + plat2.length / 2 + SPACING.OVERLAP_BUFFER;

        // Check for overlap
        const overlapX = p1MinX < p2MaxX && p1MaxX > p2MinX;
        const overlapZ = p1MinZ < p2MaxZ && p1MaxZ > p2MinZ;

        return overlapX && overlapZ;
    }

    /**
     * Calculate the safe Z position for the next platform
     * @param {number} currentZ - Current Z position (center of last platform)
     * @param {number} lastLength - Length of the last platform
     * @param {number} nextLength - Length of the next platform
     * @returns {number} Safe Z position for next platform center
     */
    getSafeNextZ(currentZ, lastLength, nextLength) {
        // Edge of last platform + gap + half of next platform
        const gap = this.randomRange(SPACING.MIN_EDGE_GAP, SPACING.MAX_EDGE_GAP);
        return currentZ + lastLength / 2 + gap + nextLength / 2;
    }

    /**
     * Create a checkpoint platform
     * @param {THREE.Vector3} position - Position for the checkpoint
     * @param {number} rotation - Y rotation
     * @returns {CheckpointPlatform} The created checkpoint
     */
    createCheckpoint(position, rotation) {
        this.checkpointCount++;
        
        const checkpoint = new CheckpointPlatform({
            width: CHECKPOINT.WIDTH,
            length: CHECKPOINT.LENGTH,
            position: position,
            rotation: rotation,
            checkpointId: this.checkpointCount,
        });
        
        this.checkpoints.push(checkpoint);
        return checkpoint;
    }

    /**
     * Check if a checkpoint should be placed in this chunk
     * @returns {boolean}
     */
    shouldPlaceCheckpoint() {
        return this.chunkCount > 0 && this.chunkCount % CHECKPOINT.CHUNK_INTERVAL === 0;
    }

    /**
     * Get all checkpoints created so far
     * @returns {Array<CheckpointPlatform>}
     */
    getCheckpoints() {
        return this.checkpoints;
    }

    /**
     * Reset checkpoint tracking (for game restart)
     */
    resetCheckpoints() {
        this.chunkCount = 0;
        this.checkpointCount = 0;
        this.checkpoints = [];
    }

    /**
     * Generate platforms for a chunk
     * @param {Object} config - Chunk configuration
     * @param {number} config.startZ - Starting Z position
     * @param {number} config.length - Chunk length
     * @param {number} config.startHeight - Starting height
     * @param {number} config.rotation - Current path rotation
     * @param {number} config.curveAmount - Amount of curve in this chunk
     * @returns {Object} Generated chunk data
     */
    generateChunk(config) {
        const { startZ, length, startHeight, rotation, curveAmount } = config;
        
        this.chunkCount++;
        
        const chunk = {
            platforms: [],
            obstacles: [],
            checkpoints: [],  // Track checkpoints in this chunk
            endHeight: startHeight,
            endZ: startZ + length,
        };
        
        // Check if we should place a checkpoint at the start of this chunk
        if (this.shouldPlaceCheckpoint()) {
            const checkpointZ = startZ + CHECKPOINT.LENGTH / 2;
            const checkpoint = this.createCheckpoint(
                new THREE.Vector3(0, startHeight, checkpointZ),
                rotation
            );
            
            chunk.platforms.push(checkpoint);
            chunk.obstacles.push(checkpoint.getCollisionMesh());
            chunk.checkpoints.push(checkpoint);
            
            // Modify config to start pattern after checkpoint
            const modifiedConfig = {
                ...config,
                startZ: checkpointZ + CHECKPOINT.LENGTH / 2 + SPACING.MIN_EDGE_GAP,
                length: length - (CHECKPOINT.LENGTH + SPACING.MIN_EDGE_GAP),
            };
            
            // Generate pattern after checkpoint
            this.generatePatternForChunk(chunk, modifiedConfig);
        } else {
            // No checkpoint, generate normal pattern
            this.generatePatternForChunk(chunk, config);
        }
        
        return chunk;
    }

    /**
     * Generate the pattern content for a chunk
     */
    generatePatternForChunk(chunk, config) {
        // Choose pattern (avoid repeating same pattern)
        let pattern = this.selectPattern();
        
        // Generate based on pattern
        switch (pattern) {
            case PatternType.STRAIGHT:
                this.generateStraightPattern(chunk, config);
                break;
            case PatternType.STEPPING_STONES:
                this.generateSteppingStonesPattern(chunk, config);
                break;
            case PatternType.RAMP_UP:
                this.generateRampPattern(chunk, config, true);
                break;
            case PatternType.RAMP_DOWN:
                this.generateRampPattern(chunk, config, false);
                break;
            case PatternType.BOUNCE_JUMP:
                this.generateBouncePattern(chunk, config);
                break;
            case PatternType.WALL_RUN:
                this.generateWallRunPattern(chunk, config);
                break;
            case PatternType.ZIGZAG:
                this.generateZigzagPattern(chunk, config);
                break;
            default:
                this.generateStraightPattern(chunk, config);
        }
        
        this.lastPattern = pattern;
    }

    /**
     * Select next pattern (avoiding repetition)
     */
    selectPattern() {
        let available = this.patterns.filter(p => p !== this.lastPattern);
        return available[Math.floor(Math.random() * available.length)];
    }

    /**
     * Generate a straight platform run with running jump spacing
     */
    generateStraightPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        let currentZ = startZ;
        let currentHeight = startHeight;
        let lastPlatLength = 0;
        
        // Use larger platforms for running jump landings (need runway space)
        const minPlatLength = 8;  // Long enough for approach run
        const maxPlatLength = 12;
        const minPlatWidth = 5;
        const maxPlatWidth = 8;
        
        while (currentZ < startZ + length - maxPlatLength - SPACING.MAX_EDGE_GAP) {
            const platLength = this.randomRange(minPlatLength, maxPlatLength);
            const platWidth = this.randomRange(minPlatWidth, maxPlatWidth);
            
            // Calculate platform center position with running jump spacing
            const platCenterZ = lastPlatLength === 0 
                ? currentZ + platLength / 2 
                : this.getSafeNextZ(currentZ, lastPlatLength, platLength);
            
            const platform = new BasicPlatform({
                width: platWidth,
                length: platLength,
                position: new THREE.Vector3(0, currentHeight, platCenterZ),
                rotation: rotation,
            });
            
            chunk.platforms.push(platform);
            chunk.obstacles.push(platform.getCollisionMesh());
            
            // Update current Z to the center of this platform for next iteration
            currentZ = platCenterZ;
            lastPlatLength = platLength;
        }
        
        chunk.endHeight = currentHeight;
    }

    /**
     * Generate stepping stones pattern with running jump spacing
     */
    generateSteppingStonesPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        let currentZ = startZ;
        let currentHeight = startHeight;
        let lastPlatLength = 0;
        let lastX = 0;
        
        // Larger stones for running jump landings
        const minStoneSize = 5;
        const maxStoneSize = 7;
        const avgGap = (SPACING.MIN_EDGE_GAP + SPACING.MAX_EDGE_GAP) / 2;
        const stoneCount = Math.floor(length / (minStoneSize + avgGap));
        
        for (let i = 0; i < stoneCount && currentZ < startZ + length - maxStoneSize - SPACING.MIN_EDGE_GAP; i++) {
            const stoneWidth = this.randomRange(minStoneSize, maxStoneSize);
            const stoneLength = this.randomRange(minStoneSize, maxStoneSize);
            
            // Alternate sides with wider separation for diagonal running jumps
            const targetX = (i % 2 === 0 ? 1 : -1) * this.randomRange(3, 5);
            
            // Calculate the 3D distance for diagonal jumps
            const xDistance = Math.abs(targetX - lastX);
            
            // Calculate platform center position with running jump spacing
            let platCenterZ;
            if (lastPlatLength === 0) {
                platCenterZ = currentZ + stoneLength / 2;
            } else {
                // For diagonal jumps, account for X distance in total jump distance
                // Total jump distance = sqrt(xDist^2 + zDist^2), max ~12 units
                // So if xDist is large, reduce zDist proportionally
                const maxTotalDist = 10; // Leave some margin from max 12
                const maxZDist = Math.sqrt(maxTotalDist * maxTotalDist - xDistance * xDistance);
                const minZGap = SPACING.MIN_EDGE_GAP * 0.7; // Smaller Z gap since diagonal
                const maxZGap = Math.min(SPACING.MAX_EDGE_GAP * 0.8, maxZDist);
                const gap = this.randomRange(minZGap, Math.max(minZGap, maxZGap));
                platCenterZ = currentZ + lastPlatLength / 2 + gap + stoneLength / 2;
            }
            
            // Slight height variation
            const heightChange = this.randomRange(-0.5, 1);
            currentHeight = Math.max(0, Math.min(PARKOUR.HEIGHT_MAX, currentHeight + heightChange));
            
            const platform = new BasicPlatform({
                width: stoneWidth,
                length: stoneLength,
                position: new THREE.Vector3(targetX, currentHeight, platCenterZ),
                rotation: rotation,
            });
            
            chunk.platforms.push(platform);
            chunk.obstacles.push(platform.getCollisionMesh());
            
            // Update state for next iteration
            currentZ = platCenterZ;
            lastPlatLength = stoneLength;
            lastX = targetX;
        }
        
        chunk.endHeight = currentHeight;
    }

    /**
     * Generate ramp pattern with running approach
     * Ramps connect directly to platforms, with space for running before jumps
     */
    generateRampPattern(chunk, config, goingUp) {
        const { startZ, length, startHeight, rotation } = config;
        
        // Platform dimensions - larger for running approach
        const startPlatLength = 10;  // Enough room to build up running speed
        const startPlatWidth = 6;
        const endPlatLength = 10;    // Landing platform with room to continue running
        const endPlatWidth = 6;
        const rampWidth = 5;
        
        // Calculate ramp length for comfortable running
        const connectionOverlap = 0.5; // Overlap for seamless transition
        const minRampLength = 12;
        const availableLength = length - startPlatLength - endPlatLength + connectionOverlap * 2;
        const rampLength = Math.max(minRampLength, Math.min(18, availableLength * 0.6));
        
        // Position calculations - platforms and ramp connect seamlessly
        const startPlatZ = startZ + startPlatLength / 2;
        // Ramp starts where start platform ends (with overlap for smooth running)
        const rampStartZ = startPlatZ + startPlatLength / 2 - connectionOverlap;
        const rampZ = rampStartZ + rampLength / 2; // Center of ramp
        // End platform starts where ramp ends (with overlap)
        const endPlatZ = rampZ + rampLength / 2 - connectionOverlap + endPlatLength / 2;
        
        // Height calculations
        const heightChange = goingUp ? this.randomRange(3, 5) : -this.randomRange(3, 5);
        const endHeight = Math.max(0.5, Math.min(PARKOUR.HEIGHT_MAX, startHeight + heightChange));
        
        // Starting platform - long enough for approach run
        const startPlat = new BasicPlatform({
            width: startPlatWidth,
            length: startPlatLength,
            position: new THREE.Vector3(0, startHeight, startPlatZ),
            rotation: rotation,
        });
        chunk.platforms.push(startPlat);
        chunk.obstacles.push(startPlat.getCollisionMesh());
        
        // Ramp - connects start platform to end platform
        const ramp = new RampPlatform({
            width: rampWidth,
            length: rampLength,
            heightStart: startHeight + PARKOUR.PLATFORM_HEIGHT / 2,
            heightEnd: endHeight + PARKOUR.PLATFORM_HEIGHT / 2,
            position: new THREE.Vector3(0, 0, rampZ),
            rotation: rotation,
        });
        chunk.platforms.push(ramp);
        chunk.obstacles.push(ramp.getCollisionMesh());
        
        // End platform - large for running continuation
        const endPlat = new BasicPlatform({
            width: endPlatWidth,
            length: endPlatLength,
            position: new THREE.Vector3(0, endHeight, endPlatZ),
            rotation: rotation,
        });
        chunk.platforms.push(endPlat);
        chunk.obstacles.push(endPlat.getCollisionMesh());
        
        // Add a follow-up platform with running jump gap
        const followUpLength = 8;
        const followUpZ = endPlatZ + endPlatLength / 2 + SPACING.MIN_EDGE_GAP + followUpLength / 2;
        if (followUpZ < startZ + length - followUpLength) {
            const followUpPlat = new BasicPlatform({
                width: 6,
                length: followUpLength,
                position: new THREE.Vector3(0, endHeight, followUpZ),
                rotation: rotation,
            });
            chunk.platforms.push(followUpPlat);
            chunk.obstacles.push(followUpPlat.getCollisionMesh());
        }
        
        chunk.endHeight = endHeight;
    }

    /**
     * Generate bounce pad pattern with running approach
     */
    generateBouncePattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        // Platform dimensions - larger for running approach
        const approachPlatLength = 12; // Long approach for running jump onto bounce pad
        const approachPlatWidth = 6;
        const bouncePadLength = 4;
        const bouncePadWidth = 4;
        const landingPlatLength = 10; // Large landing zone
        const landingPlatWidth = 8;
        const endPlatLength = 8;
        const endPlatWidth = 6;
        
        // Position calculations with running jump spacing
        const approachPlatZ = startZ + approachPlatLength / 2;
        
        // Bounce pad after running jump from approach platform
        const bouncePadZ = approachPlatZ + approachPlatLength / 2 + SPACING.MIN_EDGE_GAP + bouncePadLength / 2;
        
        // Landing platform for the high bounce - bounce covers significant distance
        const bounceDistance = 15; // Running + bounce distance
        const landingPlatZ = bouncePadZ + bouncePadLength / 2 + bounceDistance + landingPlatLength / 2;
        
        // End platform with running jump spacing from landing
        const endPlatZ = landingPlatZ + landingPlatLength / 2 + SPACING.MIN_EDGE_GAP + endPlatLength / 2;
        
        // Approach platform - long runway before bounce pad
        const approachPlat = new BasicPlatform({
            width: approachPlatWidth,
            length: approachPlatLength,
            position: new THREE.Vector3(0, startHeight, approachPlatZ),
            rotation: rotation,
        });
        chunk.platforms.push(approachPlat);
        chunk.obstacles.push(approachPlat.getCollisionMesh());
        
        // Bounce pad - player runs and jumps onto this
        const bouncePad = new BouncePad({
            width: bouncePadWidth,
            length: bouncePadLength,
            position: new THREE.Vector3(0, startHeight + 0.3, bouncePadZ),
            rotation: rotation,
            bounceForce: PARKOUR.BOUNCE_FORCE,
        });
        chunk.platforms.push(bouncePad);
        chunk.obstacles.push(bouncePad.getCollisionMesh());
        
        // High landing platform - elevated target
        const landingHeight = startHeight + 5;
        const landingPlat = new BasicPlatform({
            width: landingPlatWidth,
            length: landingPlatLength,
            position: new THREE.Vector3(0, landingHeight, landingPlatZ),
            rotation: rotation,
        });
        chunk.platforms.push(landingPlat);
        chunk.obstacles.push(landingPlat.getCollisionMesh());
        
        // End platform with running jump gap
        if (endPlatZ < startZ + length - endPlatLength / 2) {
            const endPlat = new BasicPlatform({
                width: endPlatWidth,
                length: endPlatLength,
                position: new THREE.Vector3(0, landingHeight, endPlatZ),
                rotation: rotation,
            });
            chunk.platforms.push(endPlat);
            chunk.obstacles.push(endPlat.getCollisionMesh());
        }
        
        chunk.endHeight = landingHeight;
    }

    /**
     * Generate wall run pattern with running approach
     */
    generateWallRunPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        // Platform dimensions - larger for running momentum
        const approachPlatLength = 12; // Long runway to build speed for wall run
        const approachPlatWidth = 6;
        const wallLength = 18;  // Longer wall for satisfying wall run
        const wallHeight = 7;
        const landingPlatLength = 10; // Large landing zone
        const landingPlatWidth = 6;
        const endPlatLength = 8;
        const endPlatWidth = 6;
        
        // Position calculations with running approach
        const approachPlatZ = startZ + approachPlatLength / 2;
        
        // Wall run segment (on left or right randomly)
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const wallX = side === 'left' ? -3 : 3; // Wall closer to center for easier access
        
        // Wall starts with approach distance for running jump onto wall
        const wallApproach = SPACING.WALL_RUN_APPROACH;
        const wallZ = approachPlatZ + approachPlatLength / 2 + wallApproach + wallLength / 2;
        
        // Landing platform on the opposite side, positioned for wall run exit
        const landingX = side === 'left' ? 3 : -3;
        const landingPlatZ = wallZ + wallLength / 2 + 2 + landingPlatLength / 2;
        
        // End platform with running jump spacing
        const endPlatZ = landingPlatZ + landingPlatLength / 2 + SPACING.MIN_EDGE_GAP + endPlatLength / 2;
        
        // Approach platform - long runway for building speed
        const approachPlat = new BasicPlatform({
            width: approachPlatWidth,
            length: approachPlatLength,
            position: new THREE.Vector3(0, startHeight, approachPlatZ),
            rotation: rotation,
        });
        chunk.platforms.push(approachPlat);
        chunk.obstacles.push(approachPlat.getCollisionMesh());
        
        // Wall run segment
        const wall = new WallRunSegment({
            length: wallLength,
            height: wallHeight,
            position: new THREE.Vector3(wallX, startHeight, wallZ),
            rotation: rotation,
            side: side,
        });
        chunk.platforms.push(wall);
        chunk.obstacles.push(wall.getCollisionMesh());
        
        // Landing platform on the opposite side
        const landingPlat = new BasicPlatform({
            width: landingPlatWidth,
            length: landingPlatLength,
            position: new THREE.Vector3(landingX, startHeight, landingPlatZ),
            rotation: rotation,
        });
        chunk.platforms.push(landingPlat);
        chunk.obstacles.push(landingPlat.getCollisionMesh());
        
        // End platform back to center with running jump gap
        if (endPlatZ < startZ + length - endPlatLength / 2) {
            const endPlat = new BasicPlatform({
                width: endPlatWidth,
                length: endPlatLength,
                position: new THREE.Vector3(0, startHeight, endPlatZ),
                rotation: rotation,
            });
            chunk.platforms.push(endPlat);
            chunk.obstacles.push(endPlat.getCollisionMesh());
        }
        
        chunk.endHeight = startHeight;
    }

    /**
     * Generate zigzag pattern with running jump spacing
     */
    generateZigzagPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        let currentZ = startZ;
        let currentHeight = startHeight;
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        // Platform dimensions - larger for running jump landings
        const platWidth = 6;
        const platLength = 8; // Long enough for running approach
        
        // Calculate spacing for diagonal running jumps
        // Platforms are offset on X, so total jump distance = sqrt(xDist^2 + zDist^2)
        const xSeparation = 7; // Total X distance between alternating platforms
        const maxTotalJumpDist = 11; // Leave margin from max ~12 units
        const maxZDist = Math.sqrt(maxTotalJumpDist * maxTotalJumpDist - xSeparation * xSeparation);
        
        const minZGap = 4; // Minimum Z gap for diagonal running jump
        const maxZGap = Math.min(7, maxZDist); // Cap based on diagonal distance
        
        // Calculate how many platforms fit
        const avgSpacing = platLength + (minZGap + maxZGap) / 2;
        const platformCount = Math.floor((length - platLength) / avgSpacing);
        
        let lastPlatLength = 0;
        
        for (let i = 0; i < platformCount && currentZ < startZ + length - platLength - minZGap; i++) {
            // Zigzag X position - alternating sides
            const xOffset = direction * (i % 2 === 0 ? xSeparation / 2 : -xSeparation / 2);
            
            // Calculate platform center position with diagonal running jump spacing
            let platCenterZ;
            if (lastPlatLength === 0) {
                platCenterZ = currentZ + platLength / 2;
            } else {
                const gap = this.randomRange(minZGap, maxZGap);
                platCenterZ = currentZ + lastPlatLength / 2 + gap + platLength / 2;
            }
            
            const platform = new BasicPlatform({
                width: platWidth,
                length: platLength,
                position: new THREE.Vector3(xOffset, currentHeight, platCenterZ),
                rotation: rotation,
            });
            
            chunk.platforms.push(platform);
            chunk.obstacles.push(platform.getCollisionMesh());
            
            currentZ = platCenterZ;
            lastPlatLength = platLength;
        }
        
        chunk.endHeight = currentHeight;
    }

    /**
     * Generate the starting chunk (larger, safer) with running jump training
     */
    generateStartChunk() {
        // Starting checkpoint dimensions - large for player spawn
        const startCheckpointLength = 15; // Extra large start checkpoint
        const startCheckpointWidth = 12;
        const easyPlatLength = 10; // Long platforms for running
        const easyPlatWidth = 7;
        
        // Position checkpoint so player spawn (z=5) is on it
        // Checkpoint centered at z=5 means it spans z=-2.5 to z=12.5
        const startCheckpointZ = 5;
        const startCheckpointEndZ = startCheckpointZ + startCheckpointLength / 2;
        
        // Easy platforms with comfortable running jump gaps
        const easyGap = SPACING.MIN_EDGE_GAP;
        const easy1Z = startCheckpointEndZ + easyGap + easyPlatLength / 2;
        const easy2Z = easy1Z + easyPlatLength / 2 + easyGap + easyPlatLength / 2;
        const easy3Z = easy2Z + easyPlatLength / 2 + easyGap * 1.2 + easyPlatLength / 2;
        
        const chunk = {
            platforms: [],
            obstacles: [],
            checkpoints: [],
            endHeight: 0,
            endZ: easy3Z + easyPlatLength / 2 + SPACING.MIN_EDGE_GAP,
        };
        
        // Create a large checkpoint as the starting platform
        // Use a custom-sized checkpoint for the start
        this.checkpointCount++;
        const startCheckpoint = new CheckpointPlatform({
            width: startCheckpointWidth,
            length: startCheckpointLength,
            position: new THREE.Vector3(0, 0, startCheckpointZ),
            rotation: 0,
            checkpointId: this.checkpointCount,
        });
        this.checkpoints.push(startCheckpoint);
        
        chunk.platforms.push(startCheckpoint);
        chunk.obstacles.push(startCheckpoint.getCollisionMesh());
        chunk.checkpoints.push(startCheckpoint);
        
        console.log('[ChunkGenerator] Start checkpoint created at z=5, checkpoints total:', this.checkpoints.length);
        
        // Easy platforms leading out - training for running jumps
        const easyPlatforms = [
            { x: 0, z: easy1Z, w: easyPlatWidth, l: easyPlatLength },
            { x: 0, z: easy2Z, w: easyPlatWidth, l: easyPlatLength },
            { x: 0, z: easy3Z, w: easyPlatWidth, l: easyPlatLength },
        ];
        
        easyPlatforms.forEach(p => {
            const platform = new BasicPlatform({
                width: p.w,
                length: p.l,
                position: new THREE.Vector3(p.x, 0, p.z),
                rotation: 0,
            });
            chunk.platforms.push(platform);
            chunk.obstacles.push(platform.getCollisionMesh());
        });
        
        return chunk;
    }

    /**
     * Random range helper
     */
    randomRange(min, max) {
        return min + Math.random() * (max - min);
    }
}

export default ChunkGenerator;

