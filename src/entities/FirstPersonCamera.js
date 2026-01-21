/**
 * FirstPersonCamera - FPS-style camera controller
 * 
 * Handles mouse look with pitch/yaw and follows player position.
 */

import * as THREE from 'three';
import { CAMERA, PLAYER } from '../config/Constants.js';
import { inputManager } from '../systems/InputManager.js';

export class FirstPersonCamera {
    constructor(camera) {
        this.camera = camera;
        
        // Rotation state (Euler angles)
        this.pitch = 0; // Up/down rotation (X axis)
        this.yaw = 0;   // Left/right rotation (Y axis)
        
        // Position offset from player
        this.eyeOffset = new THREE.Vector3(0, PLAYER.EYE_HEIGHT, 0);
        
        // Smoothing (optional, for future use)
        this.smoothing = false;
        this.smoothFactor = 0.15;
        
        // Target position for smoothing
        this.targetPosition = new THREE.Vector3();
        
        // Head bob state (future feature)
        this.bobTime = 0;
        this.bobActive = false;
    }

    /**
     * Update camera rotation based on mouse input
     * @param {number} deltaTime - Time since last frame
     */
    updateRotation(deltaTime) {
        if (!inputManager.isPointerLocked()) return;
        
        const mouseDelta = inputManager.getMouseDelta();
        
        // Apply mouse movement to rotation
        this.yaw -= mouseDelta.x;
        this.pitch -= mouseDelta.y;
        
        // Clamp pitch to prevent over-rotation
        this.pitch = Math.max(
            -CAMERA.PITCH_LIMIT,
            Math.min(CAMERA.PITCH_LIMIT, this.pitch)
        );
        
        // Apply rotation to camera
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.y = this.yaw;
    }

    /**
     * Update camera position to follow player
     * @param {THREE.Vector3} playerPosition - Player's current position
     * @param {number} deltaTime - Time since last frame
     */
    updatePosition(playerPosition, deltaTime) {
        // Calculate target position
        this.targetPosition.copy(playerPosition).add(this.eyeOffset);
        
        if (this.smoothing) {
            // Smooth interpolation
            this.camera.position.lerp(this.targetPosition, this.smoothFactor);
        } else {
            // Direct positioning
            this.camera.position.copy(this.targetPosition);
        }
    }

    /**
     * Get the forward direction vector (horizontal only)
     * @returns {THREE.Vector3} Normalized forward direction
     */
    getForwardDirection() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        return forward.normalize();
    }

    /**
     * Get the right direction vector (horizontal only)
     * @returns {THREE.Vector3} Normalized right direction
     */
    getRightDirection() {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        return right.normalize();
    }

    /**
     * Get the look direction including pitch
     * @returns {THREE.Vector3} Normalized look direction
     */
    getLookDirection() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        return direction;
    }

    /**
     * Update head bob effect based on movement
     * @param {boolean} isMoving - Is the player moving
     * @param {boolean} isRunning - Is the player running
     * @param {number} deltaTime - Time since last frame
     */
    updateHeadBob(isMoving, isRunning, deltaTime) {
        if (!isMoving) {
            this.bobTime = 0;
            return;
        }
        
        const frequency = CAMERA.BOB_FREQUENCY * (isRunning ? 1.5 : 1);
        const amplitude = CAMERA.BOB_AMPLITUDE * (isRunning ? 1.3 : 1);
        
        this.bobTime += deltaTime * frequency * Math.PI * 2;
        
        const bobOffset = Math.sin(this.bobTime) * amplitude;
        this.eyeOffset.y = PLAYER.EYE_HEIGHT + bobOffset;
    }

    /**
     * Reset camera to default state
     */
    reset() {
        this.pitch = 0;
        this.yaw = 0;
        this.bobTime = 0;
        this.camera.rotation.set(0, 0, 0);
    }

    /**
     * Set camera rotation directly
     * @param {number} pitch - Pitch angle in radians
     * @param {number} yaw - Yaw angle in radians
     */
    setRotation(pitch, yaw) {
        this.pitch = Math.max(-CAMERA.PITCH_LIMIT, Math.min(CAMERA.PITCH_LIMIT, pitch));
        this.yaw = yaw;
        
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.y = this.yaw;
    }
}

export default FirstPersonCamera;

