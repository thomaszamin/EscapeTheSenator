/**
 * RampPlatform - Inclined platform for height transitions
 * 
 * Creates a ramp/stairs element for parkour sequences.
 */

import * as THREE from 'three';
import { PARKOUR, RENDER } from '../../config/Constants.js';

export class RampPlatform {
    /**
     * @param {Object} config - Platform configuration
     * @param {number} config.width - Platform width
     * @param {number} config.length - Platform length (run)
     * @param {number} config.heightStart - Starting height
     * @param {number} config.heightEnd - Ending height
     * @param {THREE.Vector3} config.position - World position (at start)
     * @param {number} config.rotation - Y rotation in radians
     */
    constructor(config) {
        this.width = config.width || 4;
        this.length = config.length || 8;
        this.heightStart = config.heightStart || 0;
        this.heightEnd = config.heightEnd || 3;
        this.position = config.position || new THREE.Vector3();
        this.rotation = config.rotation || 0;
        
        this.mesh = null;
        this.group = new THREE.Group();
        
        this.build();
    }

    /**
     * Build the ramp geometry
     * Position represents the CENTER of the ramp (consistent with BasicPlatform)
     */
    build() {
        const rise = this.heightEnd - this.heightStart;
        const thickness = 0.3;
        
        // Create ramp as a rotated box
        const rampLength = Math.sqrt(this.length * this.length + rise * rise);
        const angle = Math.atan2(rise, this.length);
        
        const geometry = new THREE.BoxGeometry(this.width, thickness, rampLength);
        
        const material = new THREE.MeshStandardMaterial({
            color: PARKOUR.RAMP_COLOR,
            roughness: 0.6,
            metalness: 0.4,
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -angle;
        // Position mesh at local origin (0, 0, 0) so group position = center of ramp
        this.mesh.position.set(0, 0, 0);
        this.mesh.castShadow = RENDER.ENABLE_SHADOWS;
        this.mesh.receiveShadow = RENDER.ENABLE_SHADOWS;
        
        this.group.add(this.mesh);
        
        // Add edge glow
        this.createEdgeGlow(angle, rampLength, thickness);
        
        // Position at the center height between start and end
        const centerY = (this.heightStart + this.heightEnd) / 2;
        this.group.position.set(
            this.position.x,
            centerY,
            this.position.z
        );
        this.group.rotation.y = this.rotation;
    }

    /**
     * Create glowing edge effect
     */
    createEdgeGlow(angle, rampLength, thickness) {
        const hw = this.width / 2;
        const ht = thickness / 2;
        const hl = rampLength / 2;
        
        // Edge points in local ramp space
        const points = [
            new THREE.Vector3(-hw, ht, -hl),
            new THREE.Vector3(hw, ht, -hl),
            new THREE.Vector3(hw, ht, hl),
            new THREE.Vector3(-hw, ht, hl),
            new THREE.Vector3(-hw, ht, -hl),
        ];
        
        const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: PARKOUR.PLATFORM_EDGE_COLOR,
            transparent: true,
            opacity: 0.6,
        });
        
        const edgeMesh = new THREE.Line(edgeGeometry, edgeMaterial);
        edgeMesh.rotation.x = -angle;
        // Position at local origin to match mesh
        edgeMesh.position.set(0, 0, 0);
        
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
     * Get the end height of this ramp
     */
    getEndHeight() {
        return this.heightEnd;
    }

    /**
     * Update (for animations)
     */
    update(deltaTime) {
        // Ramps don't animate
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.edgeMesh) {
            this.edgeMesh.geometry.dispose();
            this.edgeMesh.material.dispose();
        }
    }
}

export default RampPlatform;

