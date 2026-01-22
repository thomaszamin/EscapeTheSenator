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
        
        // Collision detection
        this.obstacles = [];
        this._playerBox = new THREE.Box3();
        
        // Wall running
        this.isWallRunning = false;
        this.wallRunTime = 0;
        this.wallRunMaxTime = 5.0; // 5 seconds max wall run
        this.wallRunDirection = new THREE.Vector3(); // Direction along the wall
        this.wallNormal = new THREE.Vector3(); // Normal of the wall we're running on
        this.wallRunCooldown = 0; // Prevent immediate re-attach after jumping off
        this.wallRunSpeed = 10; // Speed while wall running
    }

    /**
     * Set obstacles for collision detection
     * @param {Array} obstacles - Array of THREE.Mesh objects to collide with
     */
    setObstacles(obstacles) {
        this.obstacles = obstacles;
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
        
        // Check for wall running (before gravity so we can cancel it)
        this.handleWallRun(deltaTime);
        
        // Apply physics
        this.applyGravity(deltaTime);
        this.applyVelocity(deltaTime);
        
        // Ground check
        this.checkGround();
        
        // Update camera
        this.camera.updateRotation(deltaTime);
        this.camera.updateHeadBob(this.isMoving, this.isSprinting, this.isGrounded, this.isWallRunning, deltaTime);
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
        
        if (this.wallRunCooldown > 0) {
            this.wallRunCooldown -= deltaTime;
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
        
        // Wall jump - if wall running and jump pressed
        if (this.isWallRunning && this.jumpBufferTime > 0) {
            this.wallJump();
            return;
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
     * Execute wall jump - jump away from wall
     */
    wallJump() {
        // Jump up and away from wall
        this.velocity.y = PLAYER.JUMP_FORCE * 0.9;
        
        // Push away from wall
        this.velocity.x += this.wallNormal.x * 8;
        this.velocity.z += this.wallNormal.z * 8;
        
        // End wall run
        this.endWallRun();
        this.wallRunCooldown = 0.5; // Longer cooldown after wall jump
        
        this.jumpBufferTime = 0;
        this.jumpCooldown = PLAYER.JUMP_COOLDOWN;
        
        globalEvents.emit(Events.PLAYER_JUMP);
    }

    /**
     * Apply gravity to vertical velocity
     */
    applyGravity(deltaTime) {
        // No gravity while wall running
        if (this.isWallRunning) {
            // Slight downward drift while wall running
            this.velocity.y = -1;
            return;
        }
        
        if (!this.isGrounded) {
            this.velocity.y += PHYSICS.GRAVITY * deltaTime;
            
            // Terminal velocity
            if (this.velocity.y < PHYSICS.TERMINAL_VELOCITY) {
                this.velocity.y = PHYSICS.TERMINAL_VELOCITY;
            }
        }
    }

    /**
     * Handle wall running detection and physics
     */
    handleWallRun(deltaTime) {
        // Reset wall run if grounded
        if (this.isGrounded) {
            if (this.isWallRunning) {
                this.endWallRun();
            }
            this.wallRunTime = 0;
            // Reset camera tilt when grounded
            this.camera.setWallRunTilt(false, this.wallNormal);
            return;
        }
        
        // Check if currently wall running
        if (this.isWallRunning) {
            this.wallRunTime += deltaTime;
            
            // Update camera tilt while wall running
            this.camera.setWallRunTilt(true, this.wallNormal);
            
            // Force end wall run after max time
            if (this.wallRunTime >= this.wallRunMaxTime) {
                this.endWallRun();
                return;
            }
            
            // Check if still next to wall
            const wallCheck = this.detectWall();
            if (!wallCheck.isNearWall) {
                this.endWallRun();
                return;
            }
            
            // Continue wall running - move along the wall
            const forward = this.camera.getForwardDirection();
            
            // Project forward direction onto the wall plane
            const dot = forward.dot(this.wallNormal);
            this.wallRunDirection.copy(forward).sub(
                this._tempVector.copy(this.wallNormal).multiplyScalar(dot)
            ).normalize();
            
            // Apply wall run velocity
            this.velocity.x = this.wallRunDirection.x * this.wallRunSpeed;
            this.velocity.z = this.wallRunDirection.z * this.wallRunSpeed;
            
            return;
        }
        
        // Not wall running - check if we should start
        if (this.wallRunCooldown > 0) return;
        if (!this.isMoving) return;
        
        const wallCheck = this.detectWall();
        if (wallCheck.isNearWall) {
            this.startWallRun(wallCheck.normal);
        }
    }

    /**
     * Detect if player is near a wall
     * @returns {Object} { isNearWall: boolean, normal: THREE.Vector3 }
     */
    detectWall() {
        const result = { isNearWall: false, normal: new THREE.Vector3() };
        if (this.obstacles.length === 0) return result;
        
        const halfWidth = PLAYER.RADIUS;
        const wallCheckDistance = 0.3; // How close to wall to trigger
        
        // Check all four directions for walls
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
        ];
        
        for (const dir of directions) {
            // Create a box slightly extended in this direction
            const checkBox = new THREE.Box3();
            checkBox.min.set(
                this.position.x - halfWidth + (dir.x > 0 ? halfWidth : dir.x < 0 ? -wallCheckDistance : 0),
                this.position.y - PLAYER.HEIGHT + 0.5, // Check mid-body
                this.position.z - halfWidth + (dir.z > 0 ? halfWidth : dir.z < 0 ? -wallCheckDistance : 0)
            );
            checkBox.max.set(
                this.position.x + halfWidth + (dir.x > 0 ? wallCheckDistance : dir.x < 0 ? -halfWidth : 0),
                this.position.y - 0.5,
                this.position.z + halfWidth + (dir.z > 0 ? wallCheckDistance : dir.z < 0 ? -halfWidth : 0)
            );
            
            for (const obstacle of this.obstacles) {
                const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                
                if (checkBox.intersectsBox(obstacleBox)) {
                    result.isNearWall = true;
                    result.normal.copy(dir).negate(); // Normal points away from wall
                    return result;
                }
            }
        }
        
        return result;
    }

    /**
     * Start wall running
     */
    startWallRun(wallNormal) {
        this.isWallRunning = true;
        this.wallNormal.copy(wallNormal);
        this.wallRunTime = 0;
        
        // Cancel downward velocity
        if (this.velocity.y < 0) {
            this.velocity.y = 2; // Small upward boost when starting
        }
        
        globalEvents.emit(Events.PLAYER_JUMP); // Reuse jump event for now
    }

    /**
     * End wall running
     */
    endWallRun() {
        this.isWallRunning = false;
        this.wallRunCooldown = 0.3; // Brief cooldown before can wall run again
        
        // Reset camera tilt
        this.camera.setWallRunTilt(false, this.wallNormal);
    }

    /**
     * Apply velocity to position with collision detection
     */
    applyVelocity(deltaTime) {
        // Apply Y movement (vertical) separately
        this.position.y += this.velocity.y * deltaTime;
        
        // Apply X movement with collision check
        const moveX = this.velocity.x * deltaTime;
        if (moveX !== 0) {
            this.position.x += moveX;
            if (this.checkCollision()) {
                this.position.x -= moveX;
                this.velocity.x = 0;
            }
        }
        
        // Apply Z movement with collision check
        const moveZ = this.velocity.z * deltaTime;
        if (moveZ !== 0) {
            this.position.z += moveZ;
            if (this.checkCollision()) {
                this.position.z -= moveZ;
                this.velocity.z = 0;
            }
        }
    }

    /**
     * Check if player collides with any obstacle (horizontal movement)
     * Uses a slightly elevated box to allow walking on surfaces
     * @returns {boolean} True if collision detected
     */
    checkCollision() {
        if (this.obstacles.length === 0) return false;
        
        // Create player bounding box, but start above step height
        // This allows player to walk on obstacles without the surface blocking them
        const halfWidth = PLAYER.RADIUS;
        const stepHeight = 0.35; // Height we can step over / stand on
        
        this._playerBox.min.set(
            this.position.x - halfWidth,
            this.position.y - PLAYER.HEIGHT + stepHeight, // Start above feet
            this.position.z - halfWidth
        );
        this._playerBox.max.set(
            this.position.x + halfWidth,
            this.position.y,
            this.position.z + halfWidth
        );
        
        // Check against all obstacles
        for (const obstacle of this.obstacles) {
            // Get world bounding box of obstacle
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            
            if (this._playerBox.intersectsBox(obstacleBox)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if player is on ground (floor or obstacle)
     */
    checkGround() {
        const wasGrounded = this.isGrounded;
        
        // Check floor at y = 0
        if (this.position.y <= PLAYER.HEIGHT) {
            this.position.y = PLAYER.HEIGHT;
            
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
            
            this.isGrounded = true;
            this.canJump = true;
            this.coyoteTime = PLAYER.COYOTE_TIME;
            
            if (!wasGrounded) {
                globalEvents.emit(Events.PLAYER_LAND);
            }
            return;
        }
        
        // Check if standing on an obstacle
        const groundY = this.getGroundHeight();
        
        if (groundY !== null && this.position.y <= groundY + PLAYER.HEIGHT + 0.1) {
            this.position.y = groundY + PLAYER.HEIGHT;
            
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
            }
            
            this.isGrounded = true;
            this.canJump = true;
            this.coyoteTime = PLAYER.COYOTE_TIME;
            
            if (!wasGrounded) {
                globalEvents.emit(Events.PLAYER_LAND);
            }
        } else {
            // Player is in the air
            this.isGrounded = false;
            
            // Clear jump buffer when walking off an edge (not jumping)
            // This prevents auto-jump when falling off obstacles
            if (wasGrounded && this.velocity.y <= 0) {
                this.jumpBufferTime = 0;
            }
        }
    }

    /**
     * Get the height of the ground/obstacle beneath the player
     * @returns {number|null} The Y position of the ground, or null if none found
     */
    getGroundHeight() {
        if (this.obstacles.length === 0) return null;
        
        const halfWidth = PLAYER.RADIUS;
        let highestGround = null;
        
        // Create a thin box at player's feet extending downward
        const feetBox = new THREE.Box3();
        feetBox.min.set(
            this.position.x - halfWidth,
            this.position.y - PLAYER.HEIGHT - 0.2, // Check slightly below feet
            this.position.z - halfWidth
        );
        feetBox.max.set(
            this.position.x + halfWidth,
            this.position.y - PLAYER.HEIGHT + 0.1,
            this.position.z + halfWidth
        );
        
        for (const obstacle of this.obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            
            // Check if player is above this obstacle and within horizontal bounds
            if (feetBox.intersectsBox(obstacleBox)) {
                const topY = obstacleBox.max.y;
                if (highestGround === null || topY > highestGround) {
                    highestGround = topY;
                }
            }
        }
        
        return highestGround;
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
            isWallRunning: this.isWallRunning,
            wallRunTime: this.wallRunTime.toFixed(1),
        };
    }
}

export default Player;

