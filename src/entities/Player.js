/**
 * Player - First-person player controller
 * 
 * Handles movement, physics, and state for the player character.
 */

import * as THREE from 'three';
import { PLAYER, PHYSICS } from '../config/Constants.js';
import { inputManager } from '../systems/InputManager.js';
import { globalEvents, Events } from '../systems/EventBus.js';
import { FirstPersonCamera } from './FirstPersonCamera.js';

export class Player {
    constructor(camera) {
        // Position and physics
        this.position = new THREE.Vector3(0, PLAYER.HEIGHT, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // Movement state
        this.isGrounded = true;
        this.isSprinting = false;
        this.isMoving = false;
        
        // Jump mechanics
        this.canJump = true;
        this.jumpCooldown = 0;
        this.coyoteTime = 0;      // Grace period after leaving ground
        this.jumpBufferTime = 0;   // Pre-landing jump buffer
        
        // Camera controller
        this.camera = new FirstPersonCamera(camera);
        
        // Movement vectors (reusable to avoid GC)
        this._moveDirection = new THREE.Vector3();
        this._tempVector = new THREE.Vector3();
        
        // Sprint tracking for events
        this._wasSprinting = false;
    }

    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Update timers
        this.updateTimers(deltaTime);
        
        // Process input and movement
        this.handleMovement(deltaTime);
        this.handleJump(deltaTime);
        
        // Apply physics
        this.applyGravity(deltaTime);
        this.applyVelocity(deltaTime);
        
        // Ground check
        this.checkGround();
        
        // Update camera
        this.camera.updateRotation(deltaTime);
        this.camera.updatePosition(this.position, deltaTime);
        
        // Emit sprint events
        this.checkSprintEvents();
    }

    /**
     * Update cooldown and grace period timers
     */
    updateTimers(deltaTime) {
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }
        
        if (!this.isGrounded && this.coyoteTime > 0) {
            this.coyoteTime -= deltaTime;
        }
        
        if (this.jumpBufferTime > 0) {
            this.jumpBufferTime -= deltaTime;
        }
    }

    /**
     * Handle WASD movement input
     */
    handleMovement(deltaTime) {
        const input = inputManager.getMovementInput();
        
        // Check if moving
        this.isMoving = input.x !== 0 || input.z !== 0;
        
        // Check sprint
        this.isSprinting = this.isMoving && inputManager.isAction('SPRINT');
        
        // Get movement speed
        const speed = this.isSprinting ? PLAYER.RUN_SPEED : PLAYER.WALK_SPEED;
        
        // Get camera-relative directions
        const forward = this.camera.getForwardDirection();
        const right = this.camera.getRightDirection();
        
        // Calculate desired movement direction
        this._moveDirection.set(0, 0, 0);
        
        if (input.z !== 0) {
            this._tempVector.copy(forward).multiplyScalar(-input.z);
            this._moveDirection.add(this._tempVector);
        }
        
        if (input.x !== 0) {
            this._tempVector.copy(right).multiplyScalar(input.x);
            this._moveDirection.add(this._tempVector);
        }
        
        // Apply movement
        if (this.isMoving) {
            // Acceleration towards desired velocity
            const accel = this.isGrounded ? PLAYER.ACCELERATION : PLAYER.ACCELERATION * PLAYER.AIR_CONTROL;
            
            const targetVelX = this._moveDirection.x * speed;
            const targetVelZ = this._moveDirection.z * speed;
            
            this.velocity.x = THREE.MathUtils.lerp(
                this.velocity.x,
                targetVelX,
                1 - Math.exp(-accel * deltaTime)
            );
            
            this.velocity.z = THREE.MathUtils.lerp(
                this.velocity.z,
                targetVelZ,
                1 - Math.exp(-accel * deltaTime)
            );
        } else {
            // Deceleration when not moving
            const decel = this.isGrounded ? PLAYER.DECELERATION : PLAYER.DECELERATION * PLAYER.AIR_CONTROL;
            
            this.velocity.x = THREE.MathUtils.lerp(
                this.velocity.x,
                0,
                1 - Math.exp(-decel * deltaTime)
            );
            
            this.velocity.z = THREE.MathUtils.lerp(
                this.velocity.z,
                0,
                1 - Math.exp(-decel * deltaTime)
            );
        }
    }

    /**
     * Handle jump input
     */
    handleJump(deltaTime) {
        // Buffer jump input
        if (inputManager.isActionPressed('JUMP')) {
            this.jumpBufferTime = PLAYER.JUMP_BUFFER;
        }
        
        // Check if can jump (grounded or coyote time, plus cooldown)
        const canJumpNow = (this.isGrounded || this.coyoteTime > 0) && 
                          this.jumpCooldown <= 0;
        
        // Execute jump if buffered and possible
        if (this.jumpBufferTime > 0 && canJumpNow) {
            this.jump();
        }
    }

    /**
     * Execute jump
     */
    jump() {
        this.velocity.y = PLAYER.JUMP_FORCE;
        this.isGrounded = false;
        this.canJump = false;
        this.jumpCooldown = PLAYER.JUMP_COOLDOWN;
        this.coyoteTime = 0;
        this.jumpBufferTime = 0;
        
        globalEvents.emit(Events.PLAYER_JUMP);
    }

    /**
     * Apply gravity to vertical velocity
     */
    applyGravity(deltaTime) {
        if (!this.isGrounded) {
            this.velocity.y += PHYSICS.GRAVITY * deltaTime;
            
            // Terminal velocity
            if (this.velocity.y < PHYSICS.TERMINAL_VELOCITY) {
                this.velocity.y = PHYSICS.TERMINAL_VELOCITY;
            }
        }
    }

    /**
     * Apply velocity to position
     */
    applyVelocity(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
    }

    /**
     * Check if player is on ground
     */
    checkGround() {
        const wasGrounded = this.isGrounded;
        
        // Simple ground check at y = 0
        // TODO: Replace with proper collision detection
        if (this.position.y <= PLAYER.HEIGHT) {
            this.position.y = PLAYER.HEIGHT;
            
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
            
            this.isGrounded = true;
            this.canJump = true;
            this.coyoteTime = PLAYER.COYOTE_TIME;
            
            // Emit land event
            if (!wasGrounded) {
                globalEvents.emit(Events.PLAYER_LAND);
            }
        } else {
            this.isGrounded = false;
        }
    }

    /**
     * Check and emit sprint state change events
     */
    checkSprintEvents() {
        if (this.isSprinting && !this._wasSprinting) {
            globalEvents.emit(Events.PLAYER_SPRINT_START);
        } else if (!this.isSprinting && this._wasSprinting) {
            globalEvents.emit(Events.PLAYER_SPRINT_END);
        }
        this._wasSprinting = this.isSprinting;
    }

    /**
     * Get current movement speed
     */
    getCurrentSpeed() {
        return Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    }

    /**
     * Teleport player to position
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.velocity.set(0, 0, 0);
    }

    /**
     * Get player state for debugging
     */
    getDebugInfo() {
        return {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            speed: this.getCurrentSpeed().toFixed(2),
            isGrounded: this.isGrounded,
            isSprinting: this.isSprinting,
        };
    }
}

export default Player;

