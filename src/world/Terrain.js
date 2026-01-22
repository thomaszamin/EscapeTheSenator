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
     * Create obstacle boxes for testing collision and movement
     */
    createObstacles() {
        const obstacleData = [
            // Position [x, y, z], Scale [w, h, d], Color
            { pos: [5, 1.5, -10], scale: [3, 3, 3], color: 0x4a5568 },
            { pos: [-8, 1, -5], scale: [2, 2, 2], color: 0x4a5568 },
            { pos: [12, 0.75, 8], scale: [4, 1.5, 2], color: 0x553c9a },
            { pos: [-15, 2, -15], scale: [5, 4, 1], color: 0x2d3748 },
            { pos: [0, 0.5, 15], scale: [8, 1, 1], color: 0x2d4a2d },
            { pos: [-20, 3, 5], scale: [2, 6, 2], color: 0x4a3c2d },
            { pos: [20, 1.25, -5], scale: [3, 2.5, 3], color: 0x3c4a5a },
            
            // Stepping stones
            { pos: [8, 0.25, 5], scale: [2, 0.5, 2], color: 0x6b7280 },
            { pos: [10, 0.5, 7], scale: [2, 1, 2], color: 0x6b7280 },
            { pos: [12, 0.75, 9], scale: [2, 1.5, 2], color: 0x6b7280 },
            
            // Ramp-like structure
            { pos: [-5, 0.5, 10], scale: [4, 1, 6], color: 0x4a4a6a },
        ];
        
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

