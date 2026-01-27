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
     * Create upward arrow indicator
     */
    createArrow() {
        const arrowShape = new THREE.Shape();
        const size = 0.5;
        
        arrowShape.moveTo(0, size);
        arrowShape.lineTo(size * 0.6, 0);
        arrowShape.lineTo(size * 0.2, 0);
        arrowShape.lineTo(size * 0.2, -size * 0.5);
        arrowShape.lineTo(-size * 0.2, -size * 0.5);
        arrowShape.lineTo(-size * 0.2, 0);
        arrowShape.lineTo(-size * 0.6, 0);
        arrowShape.closePath();
        
        const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
        
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });
        
        const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrowMesh.rotation.x = -Math.PI / 2;
        arrowMesh.position.y = 0.12;
        
        this.group.add(arrowMesh);
        this.arrowMesh = arrowMesh;
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
        
        // Float the arrow slightly
        if (this.arrowMesh) {
            this.arrowMesh.position.y = 0.12 + Math.sin(this.time * 3) * 0.05;
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
            this.arrowMesh.geometry.dispose();
            this.arrowMesh.material.dispose();
        }
    }
}

export default BouncePad;

