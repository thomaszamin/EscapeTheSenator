/**
 * Terrain - Ground and world geometry
 * 
 * Creates the physical world the player interacts with.
 */

import * as THREE from 'three';
import { WORLD, RENDER } from '../config/Constants.js';

export class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.obstacles = [];
    }

    /**
     * Build the terrain
     */
    build() {
        this.createGround();
        this.createGrid();
        this.createObstacles();
        this.createBoundaryWalls();
    }

    /**
     * Create the ground plane
     */
    createGround() {
        const geometry = new THREE.PlaneGeometry(
            WORLD.GROUND_SIZE,
            WORLD.GROUND_SIZE
        );
        
        const material = new THREE.MeshStandardMaterial({
            color: WORLD.GROUND_COLOR,
            roughness: 0.9,
            metalness: 0.1,
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = RENDER.ENABLE_SHADOWS;
        
        this.scene.add(ground);
        this.meshes.push(ground);
    }

    /**
     * Create a visual grid overlay
     */
    createGrid() {
        const grid = new THREE.GridHelper(
            WORLD.GROUND_SIZE,
            WORLD.GRID_DIVISIONS,
            0x00ff88,
            0x1a3a2e
        );
        
        grid.position.y = 0.01; // Slightly above ground
        grid.material.opacity = 0.3;
        grid.material.transparent = true;
        
        this.scene.add(grid);
        this.meshes.push(grid);
    }

    /**
     * Create parkour-focused obstacles for testing movement mechanics
     */
    createObstacles() {
        const obstacleData = [];
        
        // ============================================
        // ZONE 1: WALL RUN CORRIDOR (Center-North)
        // Two parallel walls for wall jumping between
        // ============================================
        const wallRunColor = 0x3d5a80;
        // Left wall
        obstacleData.push({ pos: [-4, 4, -15], scale: [0.5, 8, 20], color: wallRunColor });
        // Right wall
        obstacleData.push({ pos: [4, 4, -15], scale: [0.5, 8, 20], color: wallRunColor });
        // End platform to land on
        obstacleData.push({ pos: [0, 2, -26], scale: [10, 4, 2], color: 0x4a6fa5 });
        
        // ============================================
        // ZONE 2: UNDERPASS TUNNELS (East side)
        // Low ceilings to slide/crouch under
        // ============================================
        const underpassColor = 0x5c4d7d;
        // Underpass 1 - slide under
        obstacleData.push({ pos: [20, 0.5, 0], scale: [8, 1, 3], color: underpassColor }); // Floor raised
        obstacleData.push({ pos: [20, 1.3, 0], scale: [8, 0.4, 3], color: underpassColor }); // Ceiling (crouch height)
        // Pillars on sides
        obstacleData.push({ pos: [16, 0.85, 0], scale: [0.5, 1.7, 3], color: 0x4a3d6d });
        obstacleData.push({ pos: [24, 0.85, 0], scale: [0.5, 1.7, 3], color: 0x4a3d6d });
        
        // Underpass 2 - longer tunnel
        obstacleData.push({ pos: [20, 0.5, 8], scale: [6, 1, 8], color: underpassColor });
        obstacleData.push({ pos: [20, 1.3, 8], scale: [6, 0.4, 8], color: underpassColor });
        obstacleData.push({ pos: [17, 0.85, 8], scale: [0.5, 1.7, 8], color: 0x4a3d6d });
        obstacleData.push({ pos: [23, 0.85, 8], scale: [0.5, 1.7, 8], color: 0x4a3d6d });
        
        // Underpass 3 - with jump after
        obstacleData.push({ pos: [20, 0.5, -10], scale: [6, 1, 4], color: underpassColor });
        obstacleData.push({ pos: [20, 1.3, -10], scale: [6, 0.4, 4], color: underpassColor });
        obstacleData.push({ pos: [20, 1.5, -14], scale: [4, 3, 2], color: 0x6d5a8d }); // Platform after
        
        // ============================================
        // ZONE 3: CLIMBING PLATFORMS (West side)
        // Ascending platforms for parkour
        // ============================================
        const platformColor = 0x2d6a4f;
        // Stepping platforms going up
        obstacleData.push({ pos: [-15, 0.5, 0], scale: [4, 1, 4], color: platformColor });
        obstacleData.push({ pos: [-18, 1.2, 3], scale: [3, 0.6, 3], color: 0x40916c });
        obstacleData.push({ pos: [-15, 2, 6], scale: [3, 0.6, 3], color: 0x52b788 });
        obstacleData.push({ pos: [-18, 2.8, 9], scale: [3, 0.6, 3], color: 0x40916c });
        obstacleData.push({ pos: [-15, 3.6, 12], scale: [4, 0.6, 4], color: platformColor });
        // High platform destination
        obstacleData.push({ pos: [-18, 4.5, 15], scale: [6, 0.8, 6], color: 0x1b4332 });
        
        // ============================================
        // ZONE 4: LONG WALL RUN (South side)
        // Extended single wall for long wall runs
        // ============================================
        const longWallColor = 0x9d4edd;
        obstacleData.push({ pos: [0, 4, 25], scale: [40, 8, 0.5], color: longWallColor });
        // Landing platforms along the wall
        obstacleData.push({ pos: [-15, 1, 22], scale: [3, 2, 3], color: 0x7b2cbf });
        obstacleData.push({ pos: [0, 1.5, 22], scale: [3, 3, 3], color: 0x7b2cbf });
        obstacleData.push({ pos: [15, 1, 22], scale: [3, 2, 3], color: 0x7b2cbf });
        
        // ============================================
        // ZONE 5: ZIGZAG WALL JUMP COURSE (Northeast)
        // Alternating walls to wall jump across
        // ============================================
        const zigzagColor = 0xe07a5f;
        obstacleData.push({ pos: [25, 3, -20], scale: [0.5, 6, 6], color: zigzagColor });
        obstacleData.push({ pos: [30, 3, -14], scale: [0.5, 6, 6], color: 0xf2cc8f });
        obstacleData.push({ pos: [25, 3, -8], scale: [0.5, 6, 6], color: zigzagColor });
        obstacleData.push({ pos: [30, 3, -2], scale: [0.5, 6, 6], color: 0xf2cc8f });
        // Start and end platforms
        obstacleData.push({ pos: [27.5, 0.5, -24], scale: [6, 1, 4], color: 0x81b29a });
        obstacleData.push({ pos: [27.5, 0.5, 2], scale: [6, 1, 4], color: 0x81b29a });
        
        // ============================================
        // ZONE 6: OBSTACLE COURSE (Northwest)
        // Mixed challenges - slide, jump, wall run
        // ============================================
        const courseColor = 0x457b9d;
        // Start platform
        obstacleData.push({ pos: [-25, 0.5, -15], scale: [5, 1, 5], color: courseColor });
        // Slide under barrier
        obstacleData.push({ pos: [-25, 1.3, -10], scale: [5, 0.4, 2], color: 0x1d3557 });
        obstacleData.push({ pos: [-27, 0.85, -10], scale: [0.5, 1.7, 2], color: 0x1d3557 });
        obstacleData.push({ pos: [-23, 0.85, -10], scale: [0.5, 1.7, 2], color: 0x1d3557 });
        // Jump gap with wall on right
        obstacleData.push({ pos: [-22, 3, -5], scale: [0.5, 6, 8], color: courseColor });
        // Landing pad
        obstacleData.push({ pos: [-25, 0.5, 0], scale: [4, 1, 4], color: 0xa8dadc });
        // Wall run section
        obstacleData.push({ pos: [-28, 3, 5], scale: [0.5, 6, 10], color: courseColor });
        // Final platform
        obstacleData.push({ pos: [-25, 1, 12], scale: [5, 2, 4], color: 0x1d3557 });
        
        // ============================================
        // ZONE 7: CENTER HUB (Spawn area)
        // Low obstacles for basic practice
        // ============================================
        const hubColor = 0x6c757d;
        obstacleData.push({ pos: [5, 0.4, 5], scale: [2, 0.8, 2], color: hubColor });
        obstacleData.push({ pos: [-5, 0.4, 5], scale: [2, 0.8, 2], color: hubColor });
        obstacleData.push({ pos: [5, 0.4, -5], scale: [2, 0.8, 2], color: hubColor });
        obstacleData.push({ pos: [-5, 0.4, -5], scale: [2, 0.8, 2], color: hubColor });
        
        // ============================================
        // ZONE 8: PILLAR FOREST (Southeast)
        // Tall pillars for wall running between
        // ============================================
        const pillarColor = 0x774936;
        for (let x = 0; x < 4; x++) {
            for (let z = 0; z < 4; z++) {
                const offsetX = 15 + x * 5 + (z % 2) * 2.5;
                const offsetZ = 15 + z * 5;
                const height = 4 + Math.random() * 4;
                obstacleData.push({ 
                    pos: [offsetX, height / 2, offsetZ], 
                    scale: [1.5, height, 1.5], 
                    color: x % 2 === z % 2 ? pillarColor : 0x8b5a2b 
                });
            }
        }
        
        // ============================================
        // ZONE 9: ELEVATED HIGHWAY (Across map)
        // Raised platform with underpasses
        // ============================================
        const highwayColor = 0x495057;
        // Main elevated platform
        obstacleData.push({ pos: [-10, 3, -30], scale: [8, 0.5, 20], color: highwayColor });
        // Support pillars
        obstacleData.push({ pos: [-13, 1.5, -35], scale: [1, 3, 1], color: 0x343a40 });
        obstacleData.push({ pos: [-7, 1.5, -35], scale: [1, 3, 1], color: 0x343a40 });
        obstacleData.push({ pos: [-13, 1.5, -25], scale: [1, 3, 1], color: 0x343a40 });
        obstacleData.push({ pos: [-7, 1.5, -25], scale: [1, 3, 1], color: 0x343a40 });
        // Ramp up to highway
        obstacleData.push({ pos: [-10, 1.5, -18], scale: [6, 0.5, 6], color: 0x6c757d });
        obstacleData.push({ pos: [-10, 0.75, -15], scale: [6, 0.5, 4], color: 0x6c757d });
        
        // Create all obstacles
        obstacleData.forEach(data => {
            const geometry = new THREE.BoxGeometry(
                data.scale[0],
                data.scale[1],
                data.scale[2]
            );
            
            const material = new THREE.MeshStandardMaterial({
                color: data.color,
                roughness: 0.7,
                metalness: 0.2,
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(data.pos[0], data.pos[1], data.pos[2]);
            mesh.castShadow = RENDER.ENABLE_SHADOWS;
            mesh.receiveShadow = RENDER.ENABLE_SHADOWS;
            
            this.scene.add(mesh);
            this.meshes.push(mesh);
            this.obstacles.push(mesh);
        });
    }

    /**
     * Create boundary walls
     */
    createBoundaryWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.9,
            metalness: 0.1,
            transparent: true,
            opacity: 0.3,
        });
        
        const wallGeometry = new THREE.BoxGeometry(
            WORLD.BOUNDARY_SIZE * 2,
            WORLD.BOUNDARY_HEIGHT,
            0.5
        );
        
        // Create 4 walls
        const positions = [
            { x: 0, z: -WORLD.BOUNDARY_SIZE, rot: 0 },
            { x: 0, z: WORLD.BOUNDARY_SIZE, rot: 0 },
            { x: -WORLD.BOUNDARY_SIZE, z: 0, rot: Math.PI / 2 },
            { x: WORLD.BOUNDARY_SIZE, z: 0, rot: Math.PI / 2 },
        ];
        
        positions.forEach(pos => {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
            wall.position.set(pos.x, WORLD.BOUNDARY_HEIGHT / 2, pos.z);
            wall.rotation.y = pos.rot;
            
            this.scene.add(wall);
            this.meshes.push(wall);
            this.obstacles.push(wall); // Add walls to obstacles for collision detection
        });
    }

    /**
     * Add glow markers at key points
     */
    createMarkers() {
        const markerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8,
        });
        
        const positions = [
            [0, 0.5, 0],
            [10, 0.5, 0],
            [-10, 0.5, 0],
            [0, 0.5, 10],
            [0, 0.5, -10],
        ];
        
        positions.forEach(pos => {
            const marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
            marker.position.set(...pos);
            this.scene.add(marker);
            this.meshes.push(marker);
        });
    }

    /**
     * Get all obstacles for collision detection
     */
    getObstacles() {
        return this.obstacles;
    }

    /**
     * Update terrain (for animated elements)
     */
    update(deltaTime) {
        // Future: animate elements, grass movement, etc.
    }

    /**
     * Dispose of terrain meshes
     */
    dispose() {
        this.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        this.meshes = [];
        this.obstacles = [];
    }
}

export default Terrain;

