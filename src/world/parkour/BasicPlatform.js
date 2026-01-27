/**
 * BasicPlatform - Standard parkour platform
 * 
 * A simple rectangular platform with cyberpunk styling and edge glow.
 */

import * as THREE from 'three';
import { PARKOUR, RENDER } from '../../config/Constants.js';

export class BasicPlatform {
    /**
     * @param {Object} config - Platform configuration
     * @param {number} config.width - Platform width
     * @param {number} config.length - Platform length  
     * @param {number} config.height - Platform thickness
     * @param {THREE.Vector3} config.position - World position
     * @param {number} config.rotation - Y rotation in radians
     */
    constructor(config) {
        this.width = config.width || 5;
        this.length = config.length || 5;
        this.height = config.height || PARKOUR.PLATFORM_HEIGHT;
        this.position = config.position || new THREE.Vector3();
        this.rotation = config.rotation || 0;
        
        this.mesh = null;
        this.edgeMesh = null;
        this.group = new THREE.Group();
        
        this.build();
    }

    /**
     * Build the platform geometry and materials
     */
    build() {
        // Main platform body
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.length);
        
        const material = new THREE.MeshStandardMaterial({
            color: PARKOUR.PLATFORM_COLOR,
            roughness: 0.7,
            metalness: 0.3,
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = RENDER.ENABLE_SHADOWS;
        this.mesh.receiveShadow = RENDER.ENABLE_SHADOWS;
        
        this.group.add(this.mesh);
        
        // Add glowing edge effect
        this.createEdgeGlow();
        
        // Position and rotate the group
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
    }

    /**
     * Create glowing edge lines for cyberpunk effect
     */
    createEdgeGlow() {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const hl = this.length / 2;
        
        // Create edge geometry (top edges only for performance)
        const points = [
            // Top rectangle
            new THREE.Vector3(-hw, hh, -hl),
            new THREE.Vector3(hw, hh, -hl),
            new THREE.Vector3(hw, hh, hl),
            new THREE.Vector3(-hw, hh, hl),
            new THREE.Vector3(-hw, hh, -hl),
        ];
        
        const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: PARKOUR.PLATFORM_EDGE_COLOR,
            transparent: true,
            opacity: 0.8,
        });
        
        this.edgeMesh = new THREE.Line(edgeGeometry, edgeMaterial);
        this.group.add(this.edgeMesh);
    }

    /**
     * Get the Three.js group for this platform
     */
    getObject3D() {
        return this.group;
    }

    /**
     * Get the collision mesh
     */
    getCollisionMesh() {
        return this.mesh;
    }

    /**
     * Get world bounding box
     */
    getBoundingBox() {
        const box = new THREE.Box3().setFromObject(this.group);
        return box;
    }

    /**
     * Get the top Y position of this platform
     */
    getTopY() {
        return this.position.y + this.height / 2;
    }

    /**
     * Update platform (for animations)
     */
    update(deltaTime) {
        // Basic platforms don't animate
    }

    /**
     * Dispose of resources
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

export default BasicPlatform;

