/**
 * ChunkGenerator - Generates platform patterns for chunks
 * 
 * Creates semi-random patterns of platforms with variations.
 */

import * as THREE from 'three';
import { PARKOUR } from '../../config/Constants.js';
import { BasicPlatform } from './BasicPlatform.js';
import { RampPlatform } from './RampPlatform.js';
import { BouncePad } from './BouncePad.js';
import { WallRunSegment } from './WallRunSegment.js';

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

export class ChunkGenerator {
    constructor() {
        this.patterns = Object.values(PatternType);
        this.lastPattern = null;
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
        
        const chunk = {
            platforms: [],
            obstacles: [],
            endHeight: startHeight,
            endZ: startZ + length,
        };
        
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
        return chunk;
    }

    /**
     * Select next pattern (avoiding repetition)
     */
    selectPattern() {
        let available = this.patterns.filter(p => p !== this.lastPattern);
        return available[Math.floor(Math.random() * available.length)];
    }

    /**
     * Generate a straight platform run
     */
    generateStraightPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        let currentZ = startZ;
        let currentHeight = startHeight;
        
        while (currentZ < startZ + length - PARKOUR.PLATFORM_MIN_LENGTH) {
            const platLength = this.randomRange(PARKOUR.PLATFORM_MIN_LENGTH, PARKOUR.PLATFORM_MAX_LENGTH);
            const platWidth = this.randomRange(PARKOUR.PLATFORM_MIN_WIDTH, PARKOUR.PLATFORM_MAX_WIDTH);
            
            const platform = new BasicPlatform({
                width: platWidth,
                length: platLength,
                position: new THREE.Vector3(0, currentHeight, currentZ + platLength / 2),
                rotation: rotation,
            });
            
            chunk.platforms.push(platform);
            chunk.obstacles.push(platform.getCollisionMesh());
            
            currentZ += platLength + this.randomRange(PARKOUR.GAP_MIN, PARKOUR.GAP_MAX);
        }
        
        chunk.endHeight = currentHeight;
    }

    /**
     * Generate stepping stones pattern
     */
    generateSteppingStonesPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        let currentZ = startZ;
        let currentHeight = startHeight;
        let currentX = 0;
        
        const stoneCount = Math.floor(length / 6);
        
        for (let i = 0; i < stoneCount; i++) {
            // Alternate sides slightly
            currentX = (i % 2 === 0 ? 1 : -1) * this.randomRange(0, 2);
            
            // Slight height variation
            const heightChange = this.randomRange(-0.5, 1);
            currentHeight = Math.max(0, Math.min(PARKOUR.HEIGHT_MAX, currentHeight + heightChange));
            
            const platform = new BasicPlatform({
                width: this.randomRange(2, 4),
                length: this.randomRange(2, 4),
                position: new THREE.Vector3(currentX, currentHeight, currentZ),
                rotation: rotation,
            });
            
            chunk.platforms.push(platform);
            chunk.obstacles.push(platform.getCollisionMesh());
            
            currentZ += this.randomRange(3, 5);
        }
        
        chunk.endHeight = currentHeight;
    }

    /**
     * Generate ramp pattern
     */
    generateRampPattern(chunk, config, goingUp) {
        const { startZ, length, startHeight, rotation } = config;
        
        // Starting platform
        const startPlat = new BasicPlatform({
            width: 5,
            length: 4,
            position: new THREE.Vector3(0, startHeight, startZ + 2),
            rotation: rotation,
        });
        chunk.platforms.push(startPlat);
        chunk.obstacles.push(startPlat.getCollisionMesh());
        
        // Ramp
        const rampLength = Math.min(10, length - 10);
        const heightChange = goingUp ? this.randomRange(2, 4) : -this.randomRange(2, 4);
        const endHeight = Math.max(0, Math.min(PARKOUR.HEIGHT_MAX, startHeight + heightChange));
        
        const ramp = new RampPlatform({
            width: 4,
            length: rampLength,
            heightStart: startHeight,
            heightEnd: endHeight,
            position: new THREE.Vector3(0, 0, startZ + 5),
            rotation: rotation,
        });
        chunk.platforms.push(ramp);
        chunk.obstacles.push(ramp.getCollisionMesh());
        
        // End platform
        const endPlat = new BasicPlatform({
            width: 5,
            length: 4,
            position: new THREE.Vector3(0, endHeight, startZ + 5 + rampLength + 3),
            rotation: rotation,
        });
        chunk.platforms.push(endPlat);
        chunk.obstacles.push(endPlat.getCollisionMesh());
        
        chunk.endHeight = endHeight;
    }

    /**
     * Generate bounce pad pattern
     */
    generateBouncePattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        // Starting platform
        const startPlat = new BasicPlatform({
            width: 5,
            length: 5,
            position: new THREE.Vector3(0, startHeight, startZ + 2.5),
            rotation: rotation,
        });
        chunk.platforms.push(startPlat);
        chunk.obstacles.push(startPlat.getCollisionMesh());
        
        // Bounce pad
        const bouncePad = new BouncePad({
            width: 3,
            length: 3,
            position: new THREE.Vector3(0, startHeight + 0.3, startZ + 10),
            rotation: rotation,
            bounceForce: PARKOUR.BOUNCE_FORCE,
        });
        chunk.platforms.push(bouncePad);
        chunk.obstacles.push(bouncePad.getCollisionMesh());
        
        // High landing platform
        const landingHeight = startHeight + 4;
        const landingPlat = new BasicPlatform({
            width: 6,
            length: 6,
            position: new THREE.Vector3(0, landingHeight, startZ + 22),
            rotation: rotation,
        });
        chunk.platforms.push(landingPlat);
        chunk.obstacles.push(landingPlat.getCollisionMesh());
        
        // Continuation platforms at landing height
        const endPlat = new BasicPlatform({
            width: 5,
            length: 5,
            position: new THREE.Vector3(0, landingHeight, startZ + length - 3),
            rotation: rotation,
        });
        chunk.platforms.push(endPlat);
        chunk.obstacles.push(endPlat.getCollisionMesh());
        
        chunk.endHeight = landingHeight;
    }

    /**
     * Generate wall run pattern
     */
    generateWallRunPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        // Starting platform
        const startPlat = new BasicPlatform({
            width: 5,
            length: 5,
            position: new THREE.Vector3(0, startHeight, startZ + 2.5),
            rotation: rotation,
        });
        chunk.platforms.push(startPlat);
        chunk.obstacles.push(startPlat.getCollisionMesh());
        
        // Wall run segment (on left or right randomly)
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const wallX = side === 'left' ? -4 : 4;
        
        const wall = new WallRunSegment({
            length: 15,
            height: 6,
            position: new THREE.Vector3(wallX, startHeight, startZ + 15),
            rotation: rotation,
            side: side,
        });
        chunk.platforms.push(wall);
        chunk.obstacles.push(wall.getCollisionMesh());
        
        // Landing platform on the opposite side
        const landingX = side === 'left' ? 2 : -2;
        const landingPlat = new BasicPlatform({
            width: 5,
            length: 6,
            position: new THREE.Vector3(landingX, startHeight, startZ + 28),
            rotation: rotation,
        });
        chunk.platforms.push(landingPlat);
        chunk.obstacles.push(landingPlat.getCollisionMesh());
        
        // End platform back to center
        const endPlat = new BasicPlatform({
            width: 5,
            length: 5,
            position: new THREE.Vector3(0, startHeight, startZ + length - 3),
            rotation: rotation,
        });
        chunk.platforms.push(endPlat);
        chunk.obstacles.push(endPlat.getCollisionMesh());
        
        chunk.endHeight = startHeight;
    }

    /**
     * Generate zigzag pattern
     */
    generateZigzagPattern(chunk, config) {
        const { startZ, length, startHeight, rotation } = config;
        
        let currentZ = startZ;
        let currentX = 0;
        let currentHeight = startHeight;
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        const platformCount = 5;
        const spacing = length / platformCount;
        
        for (let i = 0; i < platformCount; i++) {
            // Zigzag X position
            currentX = direction * (i % 2 === 0 ? 3 : -3);
            
            const platform = new BasicPlatform({
                width: 4,
                length: 4,
                position: new THREE.Vector3(currentX, currentHeight, currentZ + spacing / 2),
                rotation: rotation,
            });
            
            chunk.platforms.push(platform);
            chunk.obstacles.push(platform.getCollisionMesh());
            
            currentZ += spacing;
        }
        
        chunk.endHeight = currentHeight;
    }

    /**
     * Generate the starting chunk (larger, safer)
     */
    generateStartChunk() {
        const chunk = {
            platforms: [],
            obstacles: [],
            endHeight: 0,
            endZ: PARKOUR.START_PLATFORM_LENGTH + 10,
        };
        
        // Large starting platform
        const startPlatform = new BasicPlatform({
            width: PARKOUR.START_PLATFORM_WIDTH,
            length: PARKOUR.START_PLATFORM_LENGTH,
            position: new THREE.Vector3(0, 0, PARKOUR.START_PLATFORM_LENGTH / 2),
            rotation: 0,
        });
        
        chunk.platforms.push(startPlatform);
        chunk.obstacles.push(startPlatform.getCollisionMesh());
        
        // A few easy platforms leading out
        const easyPlatforms = [
            { x: 0, z: PARKOUR.START_PLATFORM_LENGTH + 4, w: 5, l: 5 },
            { x: 0, z: PARKOUR.START_PLATFORM_LENGTH + 12, w: 5, l: 5 },
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

