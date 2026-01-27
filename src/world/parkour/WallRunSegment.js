/**
 * WallRunSegment - Wall section for wall-running
 * 
 * A vertical wall that the player can run along.
 */

import * as THREE from 'three';
import { PARKOUR, RENDER } from '../../config/Constants.js';

export class WallRunSegment {
    /**
     * @param {Object} config - Wall configuration
     * @param {number} config.length - Wall length (along running direction)
     * @param {number} config.height - Wall height
     * @param {THREE.Vector3} config.position - World position (base center)
     * @param {number} config.rotation - Y rotation in radians
     * @param {string} config.side - 'left' or 'right' relative to path
     */
    constructor(config) {
        this.length = config.length || 10;
        this.height = config.height || 5;
        this.thickness = 0.5;
        this.position = config.position || new THREE.Vector3();
        this.rotation = config.rotation || 0;
        this.side = config.side || 'left';
        
        this.mesh = null;
        this.group = new THREE.Group();
        this.time = 0;
        
        this.build();
    }

    /**
     * Build the wall geometry
     */
    build() {
        // Main wall
        const geometry = new THREE.BoxGeometry(this.thickness, this.height, this.length);
        
        const material = new THREE.MeshStandardMaterial({
            color: PARKOUR.WALL_COLOR,
            roughness: 0.8,
            metalness: 0.2,
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = this.height / 2;
        this.mesh.castShadow = RENDER.ENABLE_SHADOWS;
        this.mesh.receiveShadow = RENDER.ENABLE_SHADOWS;
        
        this.group.add(this.mesh);
        
        // Add glowing strips
        this.createGlowStrips();
        
        // Position and rotate
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
    }

    /**
     * Create animated glow strips on the wall
     */
    createGlowStrips() {
        const stripCount = 3;
        const stripHeight = 0.1;
        const spacing = this.height / (stripCount + 1);
        
        this.strips = [];
        
        for (let i = 0; i < stripCount; i++) {
            const stripGeometry = new THREE.BoxGeometry(
                this.thickness + 0.05,
                stripHeight,
                this.length
            );
            
            const stripMaterial = new THREE.MeshBasicMaterial({
                color: PARKOUR.PLATFORM_EDGE_COLOR,
                transparent: true,
                opacity: 0.7,
            });
            
            const strip = new THREE.Mesh(stripGeometry, stripMaterial);
            strip.position.y = spacing * (i + 1);
            
            this.group.add(strip);
            this.strips.push(strip);
        }
        
        // Add edge glow lines
        this.createEdgeGlow();
    }

    /**
     * Create edge glow effect
     */
    createEdgeGlow() {
        const hw = this.thickness / 2 + 0.02;
        const hh = this.height;
        const hl = this.length / 2;
        
        // Vertical edge lines
        const points = [
            // Front edge
            new THREE.Vector3(hw, 0, -hl),
            new THREE.Vector3(hw, hh, -hl),
            new THREE.Vector3(hw, hh, hl),
            new THREE.Vector3(hw, 0, hl),
        ];
        
        const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: PARKOUR.PLATFORM_EDGE_COLOR,
            transparent: true,
            opacity: 0.5,
        });
        
        const edgeMesh = new THREE.Line(edgeGeometry, edgeMaterial);
        this.group.add(edgeMesh);
        this.edgeMesh = edgeMesh;
    }

    /**
     * Get the Three.js group
     */
    getObject3D() {
        return this.group;
    }

    /**
     * Get collision mesh
     */
    getCollisionMesh() {
        return this.mesh;
    }

    /**
     * Update animation
     */
    update(deltaTime) {
        this.time += deltaTime;
        
        // Animate strips with flowing effect
        if (this.strips) {
            this.strips.forEach((strip, i) => {
                const phase = this.time * 2 + i * 0.5;
                strip.material.opacity = 0.4 + Math.sin(phase) * 0.3;
            });
        }
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.strips) {
            this.strips.forEach(strip => {
                strip.geometry.dispose();
                strip.material.dispose();
            });
        }
        if (this.edgeMesh) {
            this.edgeMesh.geometry.dispose();
            this.edgeMesh.material.dispose();
        }
    }
}

export default WallRunSegment;

