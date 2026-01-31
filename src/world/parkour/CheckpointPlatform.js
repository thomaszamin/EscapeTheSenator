/**
 * CheckpointPlatform - Bright yellow checkpoint for respawning
 * 
 * When the player steps on this platform, it becomes their respawn point.
 */

import * as THREE from 'three';
import { PARKOUR, RENDER } from '../../config/Constants.js';

// Checkpoint colors
const CHECKPOINT_COLORS = {
    MAIN: 0xffdd00,        // Bright yellow
    GLOW: 0xffff00,        // Pure yellow glow
    EDGE: 0xffffff,        // White edge
    ACTIVATED: 0x00ff88,   // Green when activated
};

export class CheckpointPlatform {
    /**
     * @param {Object} config - Platform configuration
     * @param {number} config.width - Platform width
     * @param {number} config.length - Platform length
     * @param {THREE.Vector3} config.position - World position
     * @param {number} config.rotation - Y rotation in radians
     * @param {number} config.checkpointId - Unique identifier for this checkpoint
     */
    constructor(config) {
        this.width = config.width || 8;
        this.length = config.length || 8;
        this.height = 0.6; // Slightly thicker than regular platforms
        this.position = config.position || new THREE.Vector3();
        this.rotation = config.rotation || 0;
        this.checkpointId = config.checkpointId || 0;
        
        this.mesh = null;
        this.glowMesh = null;
        this.beaconLight = null;
        this.group = new THREE.Group();
        this.time = 0;
        
        // Checkpoint state
        this.isActivated = false;
        this.isCheckpoint = true; // Flag for collision system
        
        this.build();
    }

    /**
     * Build the checkpoint platform geometry
     */
    build() {
        // Main platform body
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.length);
        
        const material = new THREE.MeshStandardMaterial({
            color: CHECKPOINT_COLORS.MAIN,
            roughness: 0.3,
            metalness: 0.6,
            emissive: CHECKPOINT_COLORS.MAIN,
            emissiveIntensity: 0.4,
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = RENDER.ENABLE_SHADOWS;
        this.mesh.receiveShadow = RENDER.ENABLE_SHADOWS;
        
        // Mark this mesh as a checkpoint for collision detection
        this.mesh.userData.isCheckpoint = true;
        this.mesh.userData.checkpointId = this.checkpointId;
        this.mesh.userData.checkpointRef = this;
        
        this.group.add(this.mesh);
        
        // Add glowing edge effect
        this.createEdgeGlow();
        
        // Add beacon light effect
        this.createBeacon();
        
        // Add pulsing ring effect on top
        this.createPulsingRing();
        
        // Position and rotate the group
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
    }

    /**
     * Create glowing edge lines
     */
    createEdgeGlow() {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const hl = this.length / 2;
        
        // Create edge geometry (top edges)
        const points = [
            new THREE.Vector3(-hw, hh, -hl),
            new THREE.Vector3(hw, hh, -hl),
            new THREE.Vector3(hw, hh, hl),
            new THREE.Vector3(-hw, hh, hl),
            new THREE.Vector3(-hw, hh, -hl),
        ];
        
        const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: CHECKPOINT_COLORS.EDGE,
            transparent: true,
            opacity: 0.9,
            linewidth: 2,
        });
        
        this.edgeMesh = new THREE.Line(edgeGeometry, edgeMaterial);
        this.group.add(this.edgeMesh);
    }

    /**
     * Create a vertical beacon light
     */
    createBeacon() {
        // Beacon cylinder going upward
        const beaconGeometry = new THREE.CylinderGeometry(0.3, 0.8, 15, 8, 1, true);
        const beaconMaterial = new THREE.MeshBasicMaterial({
            color: CHECKPOINT_COLORS.GLOW,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
        });
        
        this.beaconLight = new THREE.Mesh(beaconGeometry, beaconMaterial);
        this.beaconLight.position.y = 8; // Above the platform
        
        this.group.add(this.beaconLight);
    }

    /**
     * Create pulsing ring on top of platform
     */
    createPulsingRing() {
        const ringGeometry = new THREE.RingGeometry(
            Math.min(this.width, this.length) * 0.25,
            Math.min(this.width, this.length) * 0.4,
            32
        );
        
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: CHECKPOINT_COLORS.GLOW,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
        });
        
        this.ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ringMesh.rotation.x = -Math.PI / 2;
        this.ringMesh.position.y = this.height / 2 + 0.05;
        
        this.group.add(this.ringMesh);
    }

    /**
     * Activate this checkpoint (player stepped on it)
     */
    activate() {
        if (this.isActivated) return;
        
        this.isActivated = true;
        
        // Change colors to show activation
        if (this.mesh) {
            this.mesh.material.emissive.setHex(CHECKPOINT_COLORS.ACTIVATED);
            this.mesh.material.emissiveIntensity = 0.6;
        }
        
        if (this.beaconLight) {
            this.beaconLight.material.color.setHex(CHECKPOINT_COLORS.ACTIVATED);
            this.beaconLight.material.opacity = 0.25;
        }
        
        if (this.ringMesh) {
            this.ringMesh.material.color.setHex(CHECKPOINT_COLORS.ACTIVATED);
        }
    }

    /**
     * Deactivate this checkpoint (another one was activated)
     */
    deactivate() {
        this.isActivated = false;
        
        // Restore original colors
        if (this.mesh) {
            this.mesh.material.emissive.setHex(CHECKPOINT_COLORS.MAIN);
            this.mesh.material.emissiveIntensity = 0.4;
        }
        
        if (this.beaconLight) {
            this.beaconLight.material.color.setHex(CHECKPOINT_COLORS.GLOW);
            this.beaconLight.material.opacity = 0.15;
        }
        
        if (this.ringMesh) {
            this.ringMesh.material.color.setHex(CHECKPOINT_COLORS.GLOW);
        }
    }

    /**
     * Get the respawn position for this checkpoint
     * @returns {THREE.Vector3} Position to respawn at
     */
    getRespawnPosition() {
        // Use group.position for accurate world coordinates
        // Respawn slightly above the platform's top surface
        const pos = this.group.position;
        return new THREE.Vector3(
            pos.x,
            pos.y + this.height / 2 + 0.5,
            pos.z
        );
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
     * Update platform animations
     */
    update(deltaTime) {
        this.time += deltaTime;
        
        // Pulse the ring
        if (this.ringMesh) {
            const pulse = 0.5 + Math.sin(this.time * 3) * 0.3;
            this.ringMesh.material.opacity = pulse;
            
            const scale = 1 + Math.sin(this.time * 2) * 0.1;
            this.ringMesh.scale.set(scale, scale, 1);
        }
        
        // Animate beacon
        if (this.beaconLight) {
            const beaconPulse = 0.1 + Math.sin(this.time * 2) * 0.08;
            this.beaconLight.material.opacity = this.isActivated ? beaconPulse + 0.1 : beaconPulse;
            this.beaconLight.rotation.y = this.time * 0.5;
        }
        
        // Subtle platform glow pulse
        if (this.mesh) {
            const glowPulse = 0.3 + Math.sin(this.time * 2) * 0.15;
            this.mesh.material.emissiveIntensity = this.isActivated ? glowPulse + 0.3 : glowPulse;
        }
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
        if (this.beaconLight) {
            this.beaconLight.geometry.dispose();
            this.beaconLight.material.dispose();
        }
        if (this.ringMesh) {
            this.ringMesh.geometry.dispose();
            this.ringMesh.material.dispose();
        }
    }
}

export default CheckpointPlatform;
