/**
 * BouncePad - Launch platform that propels player upward
 * 
 * A special platform that bounces the player when landed on.
 */

import * as THREE from 'three';
import { PARKOUR, RENDER } from '../../config/Constants.js';

export class BouncePad {
    /**
     * @param {Object} config - Platform configuration
     * @param {number} config.width - Pad width
     * @param {number} config.length - Pad length
     * @param {THREE.Vector3} config.position - World position
     * @param {number} config.rotation - Y rotation in radians
     * @param {number} config.bounceForce - Force of the bounce
     */
    constructor(config) {
        this.width = config.width || 3;
        this.length = config.length || 3;
        this.position = config.position || new THREE.Vector3();
        this.rotation = config.rotation || 0;
        this.bounceForce = config.bounceForce || PARKOUR.BOUNCE_FORCE;
        
        this.mesh = null;
        this.glowMesh = null;
        this.group = new THREE.Group();
        this.time = 0;
        
        this.isBouncy = true; // Flag for collision system
        
        this.build();
    }

    /**
     * Build the bounce pad geometry
     */
    build() {
        const height = 0.2;
        
        // Base platform
        const geometry = new THREE.BoxGeometry(this.width, height, this.length);
        
        const material = new THREE.MeshStandardMaterial({
            color: PARKOUR.BOUNCE_PAD_COLOR,
            roughness: 0.3,
            metalness: 0.7,
            emissive: PARKOUR.BOUNCE_PAD_COLOR,
            emissiveIntensity: 0.3,
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = RENDER.ENABLE_SHADOWS;
        this.mesh.receiveShadow = RENDER.ENABLE_SHADOWS;
        
        // Mark this mesh as a bounce pad for collision detection
        this.mesh.userData.isBouncy = true;
        this.mesh.userData.bounceForce = this.bounceForce;
        
        this.group.add(this.mesh);
        
        // Add pulsing glow effect
        this.createGlowEffect();
        
        // Add directional arrow
        this.createArrow();
        
        // Position and rotate
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
    }

    /**
     * Create a pulsing glow ring
     */
    createGlowEffect() {
        const ringGeometry = new THREE.RingGeometry(
            Math.min(this.width, this.length) * 0.3,
            Math.min(this.width, this.length) * 0.45,
            32
        );
        
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: PARKOUR.BOUNCE_PAD_COLOR,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });
        
        this.glowMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        this.glowMesh.rotation.x = -Math.PI / 2;
        this.glowMesh.position.y = 0.15;
        
        this.group.add(this.glowMesh);
    }

    /**
     * Create upward arrow indicator (3D arrow pointing up in world Y)
     */
    createArrow() {
        // Create a 3D arrow pointing upward using a cone for the head and cylinder for stem
        const arrowGroup = new THREE.Group();
        
        // Arrow head (cone pointing up)
        const headGeometry = new THREE.ConeGeometry(0.25, 0.4, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
        });
        const headMesh = new THREE.Mesh(headGeometry, arrowMaterial);
        headMesh.position.y = 0.6;
        arrowGroup.add(headMesh);
        
        // Arrow stem (cylinder)
        const stemGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
        const stemMesh = new THREE.Mesh(stemGeometry, arrowMaterial);
        stemMesh.position.y = 0.25;
        arrowGroup.add(stemMesh);
        
        // Position the arrow group above the pad
        arrowGroup.position.y = 0.2;
        
        this.group.add(arrowGroup);
        this.arrowMesh = arrowGroup;
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
        
        // Pulse the glow
        if (this.glowMesh) {
            const pulse = 0.4 + Math.sin(this.time * 4) * 0.3;
            this.glowMesh.material.opacity = pulse;
            
            const scale = 1 + Math.sin(this.time * 4) * 0.1;
            this.glowMesh.scale.set(scale, scale, 1);
        }
        
        // Float and pulse the 3D arrow
        if (this.arrowMesh) {
            this.arrowMesh.position.y = 0.2 + Math.sin(this.time * 3) * 0.15;
            const arrowScale = 1 + Math.sin(this.time * 4) * 0.1;
            this.arrowMesh.scale.set(arrowScale, arrowScale, arrowScale);
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
        if (this.glowMesh) {
            this.glowMesh.geometry.dispose();
            this.glowMesh.material.dispose();
        }
        if (this.arrowMesh) {
            // Arrow is now a group with children
            this.arrowMesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }
}

export default BouncePad;

