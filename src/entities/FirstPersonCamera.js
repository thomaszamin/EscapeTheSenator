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
        this.roll = 0;  // Tilt rotation (Z axis) - for wall running
        this.targetRoll = 0; // Target roll for smooth interpolation
        
        // Position offset from player
        this.eyeOffset = new THREE.Vector3(0, PLAYER.EYE_HEIGHT, 0);
        this.baseEyeHeight = PLAYER.EYE_HEIGHT;     // Current base eye height (without bob)
        this.targetEyeHeight = PLAYER.EYE_HEIGHT;   // Target eye height for smooth transitions
        
        // Smoothing (optional, for future use)
        this.smoothing = false;
        this.smoothFactor = 0.15;
        
        // Target position for smoothing
        this.targetPosition = new THREE.Vector3();
        
        // Head bob state - procedural view bobbing
        this.bobPhase = 0;           // Current phase in bob cycle
        this.bobIntensity = 0;       // Current intensity (0-1), smoothly interpolated
        this.targetBobIntensity = 0; // Target intensity based on movement state
        this.bobVertical = 0;        // Current vertical offset
        this.bobHorizontal = 0;      // Current horizontal offset
        this.bobRoll = 0;            // Current roll for bob
        
        // Wall run tilt settings
        this.wallRunTiltAngle = 0.25; // About 15 degrees in radians
        this.tiltSmoothSpeed = 8; // How fast to transition tilt
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
        
        // Smoothly interpolate roll towards target
        this.roll = THREE.MathUtils.lerp(
            this.roll,
            this.targetRoll,
            1 - Math.exp(-this.tiltSmoothSpeed * deltaTime)
        );
        
        // Apply rotation to camera (YXZ order, then add roll)
        // Combine wall run tilt with head bob roll
        const totalRoll = this.roll + this.bobRoll;
        
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.z = totalRoll;
    }

    /**
     * Set wall run tilt based on wall normal
     * @param {boolean} isWallRunning - Whether currently wall running
     * @param {THREE.Vector3} wallNormal - Normal of the wall (pointing away from wall)
     */
    setWallRunTilt(isWallRunning, wallNormal) {
        if (!isWallRunning) {
            this.targetRoll = 0;
            return;
        }
        
        // Calculate which side the wall is on relative to camera
        const right = this.getRightDirection();
        const dot = right.dot(wallNormal);
        
        // If wall is on the right (normal points right), tilt left (negative roll)
        // If wall is on the left (normal points left), tilt right (positive roll)
        this.targetRoll = -dot * this.wallRunTiltAngle;
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
     * Set the target eye height for crouch/slide transitions
     * @param {number} height - Target eye height
     */
    setTargetEyeHeight(height) {
        this.targetEyeHeight = height;
    }
    
    /**
     * Update eye height transition (call before updateHeadBob)
     * @param {number} deltaTime - Time since last frame
     */
    updateEyeHeight(deltaTime) {
        // Smooth transition to target eye height
        this.baseEyeHeight = THREE.MathUtils.lerp(
            this.baseEyeHeight,
            this.targetEyeHeight,
            1 - Math.exp(-PLAYER.CROUCH_TRANSITION_SPEED * deltaTime)
        );
    }

    /**
     * Update procedural head bob effect based on movement
     * @param {boolean} isMoving - Is the player moving
     * @param {boolean} isSprinting - Is the player sprinting
     * @param {boolean} isGrounded - Is the player on the ground
     * @param {boolean} isWallRunning - Is the player wall running
     * @param {number} deltaTime - Time since last frame
     */
    updateHeadBob(isMoving, isSprinting, isGrounded, isWallRunning, deltaTime) {
        // Bob settings for different states
        const walkFrequency = 7;      // Steps per second while walking
        const sprintFrequency = 9;    // Steps per second while sprinting (reduced)
        const wallRunFrequency = 6;   // Slower, smoother rhythm for wall running
        const walkVertical = 0.025;   // Subtle vertical amplitude
        const sprintVertical = 0.032; // Reduced vertical when sprinting
        const wallRunVertical = 0.02; // Subtle vertical for wall run
        const walkHorizontal = 0.012; // Subtle horizontal sway
        const sprintHorizontal = 0.015; // Reduced sway when sprinting
        const wallRunHorizontal = 0.015; // Gentle horizontal for wall run
        const walkRoll = 0.008;       // Subtle roll
        const sprintRoll = 0.010;     // Reduced roll when sprinting
        const wallRunRollBob = 0.006; // Subtle roll bob during wall run
        
        // Determine target intensity and frequency
        let targetIntensity = 0;
        let frequency = walkFrequency;
        let verticalAmpBase = walkVertical;
        let horizontalAmpBase = walkHorizontal;
        let rollAmpBase = walkRoll;
        
        if (isWallRunning) {
            // Wall running gets its own bob profile
            targetIntensity = 1.0;
            frequency = wallRunFrequency;
            verticalAmpBase = wallRunVertical;
            horizontalAmpBase = wallRunHorizontal;
            rollAmpBase = wallRunRollBob;
        } else if (isMoving && isGrounded) {
            if (isSprinting) {
                targetIntensity = 1.0;
                frequency = sprintFrequency;
                verticalAmpBase = sprintVertical;
                horizontalAmpBase = sprintHorizontal;
                rollAmpBase = sprintRoll;
            } else {
                targetIntensity = 0.5; // Walking is half intensity
                frequency = walkFrequency;
                verticalAmpBase = walkVertical;
                horizontalAmpBase = walkHorizontal;
                rollAmpBase = walkRoll;
            }
        }
        
        this.targetBobIntensity = targetIntensity;
        
        // Smoothly blend intensity (fast ramp up, slower ramp down)
        const blendSpeed = this.bobIntensity < this.targetBobIntensity ? 12 : 6;
        this.bobIntensity = THREE.MathUtils.lerp(
            this.bobIntensity,
            this.targetBobIntensity,
            1 - Math.exp(-blendSpeed * deltaTime)
        );
        
        // Only advance phase when there's intensity
        if (this.bobIntensity > 0.01) {
            this.bobPhase += deltaTime * frequency * Math.PI * 2;
        } else {
            // Smoothly reset phase to 0 when stopped
            this.bobPhase *= 0.9;
        }
        
        // Calculate bob values using sine waves with current amplitudes
        // Vertical: up-down motion
        this.bobVertical = Math.sin(this.bobPhase) * verticalAmpBase * this.bobIntensity;
        
        // Horizontal: left-right sway (half frequency, offset phase)
        this.bobHorizontal = Math.sin(this.bobPhase * 0.5) * horizontalAmpBase * this.bobIntensity;
        
        // Roll: slight head tilt with sway
        this.bobRoll = Math.sin(this.bobPhase * 0.5 + 0.5) * rollAmpBase * this.bobIntensity;
        
        // Apply to eye offset (position-based bob)
        this.eyeOffset.x = this.bobHorizontal;
        this.eyeOffset.y = this.baseEyeHeight + this.bobVertical;
    }
    
    /**
     * Get the current bob roll for camera rotation
     * @returns {number} Roll angle in radians from head bob
     */
    getBobRoll() {
        return this.bobRoll;
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

