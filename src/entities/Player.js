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
        // Position and physics (position.y = feet/base position, camera is at position.y + EYE_HEIGHT)
        this.position = new THREE.Vector3(0, 0, 0);
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
        this._raycaster = new THREE.Raycaster();
        this._downDirection = new THREE.Vector3(0, -1, 0);
        
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
     * Detect if player is near a wall using raycasting
     * @returns {Object} { isNearWall: boolean, normal: THREE.Vector3 }
     */
    detectWall() {
        const result = { isNearWall: false, normal: new THREE.Vector3() };
        if (this.obstacles.length === 0) return result;
        
        const wallCheckDistance = PLAYER.RADIUS + PLAYER.HEIGHT * 0.15; // Scales with player height (was 0.6)
        
        // Check all four directions for walls
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
        ];
        
        // Check at mid-body height (use full height for better wall detection range)
        const feetY = this.position.y;
        const checkHeight = feetY + PLAYER.HEIGHT * 0.5; // Mid-body based on full height
        const origin = new THREE.Vector3(this.position.x, checkHeight, this.position.z);
        
        for (const dir of directions) {
            this._raycaster.set(origin, dir);
            this._raycaster.far = wallCheckDistance;
            
            const intersects = this._raycaster.intersectObjects(this.obstacles, false);
            
            if (intersects.length > 0) {
                // Check that the wall is tall enough (not just a low platform)
                const hitPoint = intersects[0].point;
                const hitNormal = intersects[0].face ? intersects[0].face.normal.clone() : dir.clone().negate();
                
                // Transform normal to world space if needed
                if (intersects[0].object.matrixWorld) {
                    hitNormal.transformDirection(intersects[0].object.matrixWorld);
                }
                
                // Only consider it a wall if the surface is mostly vertical
                if (Math.abs(hitNormal.y) < 0.5) {
                    result.isNearWall = true;
                    result.normal.copy(hitNormal);
                    // Ensure normal is horizontal
                    result.normal.y = 0;
                    result.normal.normalize();
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
        // Apply Y movement (vertical) with collision check for upward movement
        const moveY = this.velocity.y * deltaTime;
        if (moveY !== 0) {
            this.position.y += moveY;
            
            // Check for ceiling/overhead collision when moving up
            if (moveY > 0 && this.checkCeilingCollision()) {
                this.position.y -= moveY;
                this.velocity.y = 0;
            }
        }
        
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
     * Check for ceiling/overhead collision when moving upward
     * @returns {boolean} True if collision detected above player
     */
    checkCeilingCollision() {
        if (this.obstacles.length === 0) return false;
        
        // Camera is at position.y + EYE_HEIGHT, so check from camera height upward
        // The actual top of the player's head/collision volume should be at camera height + some offset
        const cameraY = this.position.y + PLAYER.EYE_HEIGHT;
        const headTopY = cameraY + (PLAYER.HEIGHT - PLAYER.EYE_HEIGHT); // Top of head above camera
        
        const checkPoints = [
            new THREE.Vector3(this.position.x, headTopY, this.position.z),
            new THREE.Vector3(this.position.x + PLAYER.RADIUS * 0.7, headTopY, this.position.z),
            new THREE.Vector3(this.position.x - PLAYER.RADIUS * 0.7, headTopY, this.position.z),
            new THREE.Vector3(this.position.x, headTopY, this.position.z + PLAYER.RADIUS * 0.7),
            new THREE.Vector3(this.position.x, headTopY, this.position.z - PLAYER.RADIUS * 0.7),
        ];
        
        const upDirection = new THREE.Vector3(0, 1, 0);
        const checkDistance = PLAYER.HEIGHT * 0.15; // Check distance scales with player height
        
        for (const point of checkPoints) {
            this._raycaster.set(point, upDirection);
            this._raycaster.far = checkDistance;
            
            const intersects = this._raycaster.intersectObjects(this.obstacles, false);
            
            if (intersects.length > 0) {
                // Hit something above us
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if player collides with any obstacle (horizontal movement)
     * Uses raycasting for more accurate collision with rotated objects
     * @returns {boolean} True if collision detected
     */
    checkCollision() {
        if (this.obstacles.length === 0) return false;
        
        const stepHeight = PLAYER.HEIGHT * 0.25; // Height we can step over / stand on (scales with player height)
        
        // Cast rays in the movement direction from multiple heights
        // Camera is at position.y + EYE_HEIGHT, so we need to account for that
        // Feet are at position.y (since position.y represents feet/base position)
        const feetY = this.position.y;
        const cameraY = this.position.y + PLAYER.EYE_HEIGHT;
        const headTopY = cameraY + (PLAYER.HEIGHT - PLAYER.EYE_HEIGHT); // Top of head above camera
        
        // Check at dense intervals from above step height to top of head
        // Heights scale proportionally with player height
        // Use many check points with small gaps to prevent objects from slipping through
        const checkHeights = [];
        const checkCount = Math.ceil(PLAYER.HEIGHT * 2); // More checks for taller players
        const startHeight = feetY + stepHeight + PLAYER.HEIGHT * 0.05;
        const endHeight = headTopY;
        const heightRange = endHeight - startHeight;
        
        // Generate evenly spaced check points
        for (let i = 0; i <= checkCount; i++) {
            const t = i / checkCount;
            const height = startHeight + heightRange * t;
            checkHeights.push(height);
        }
        
        // Check in 8 directions (cardinal + diagonal) for better coverage
        const sqrt2 = Math.SQRT1_2;
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(sqrt2, 0, sqrt2),
            new THREE.Vector3(sqrt2, 0, -sqrt2),
            new THREE.Vector3(-sqrt2, 0, sqrt2),
            new THREE.Vector3(-sqrt2, 0, -sqrt2),
        ];
        
        const checkDistance = PLAYER.RADIUS + PLAYER.HEIGHT * 0.0375; // Scales with player height (was 0.15)
        
        for (const height of checkHeights) {
            for (const dir of directions) {
                const origin = new THREE.Vector3(this.position.x, height, this.position.z);
                this._raycaster.set(origin, dir);
                this._raycaster.far = checkDistance;
                
                const intersects = this._raycaster.intersectObjects(this.obstacles, false);
                
                if (intersects.length > 0) {
                    // Any hit above step height is a wall we can't walk through
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check if player is on ground (floor or obstacle)
     */
    checkGround() {
        const wasGrounded = this.isGrounded;
        
        // Check floor at y = 0 (position.y represents feet/base position)
        if (this.position.y <= 0) {
            this.position.y = 0;
            
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
        
        // Check if standing on an obstacle (using raycast result)
        const groundResult = this.getGroundHeightWithInfo();
        
        if (groundResult.height !== null && this.position.y <= groundResult.height + PLAYER.HEIGHT * 0.0375) {
            this.position.y = groundResult.height;
            
            // Check for bounce pad
            if (groundResult.isBouncy && this.velocity.y <= 0) {
                // Apply bounce force
                this.velocity.y = groundResult.bounceForce;
                this.isGrounded = false;
                globalEvents.emit(Events.PLAYER_JUMP);
                return;
            }
            
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
     * Get the height of the ground/obstacle beneath the player using raycasting
     * This properly handles rotated objects like ramps
     * @returns {number|null} The Y position of the ground, or null if none found
     */
    getGroundHeight() {
        const result = this.getGroundHeightWithInfo();
        return result.height;
    }

    /**
     * Get ground height with additional info (bounce pads, etc.)
     * @returns {Object} { height: number|null, isBouncy: boolean, bounceForce: number }
     */
    getGroundHeightWithInfo() {
        const result = { height: null, isBouncy: false, bounceForce: 0 };
        if (this.obstacles.length === 0) return result;
        
        let highestHit = null;
        
        // Cast multiple rays from player's feet area for better coverage
        // position.y represents feet/base position
        const feetY = this.position.y;
        const rayStartY = feetY + PLAYER.HEIGHT * 0.25; // Start rays proportionally above feet
        
        const rayOrigins = [
            new THREE.Vector3(this.position.x, rayStartY, this.position.z),
            new THREE.Vector3(this.position.x + PLAYER.RADIUS * 0.7, rayStartY, this.position.z),
            new THREE.Vector3(this.position.x - PLAYER.RADIUS * 0.7, rayStartY, this.position.z),
            new THREE.Vector3(this.position.x, rayStartY, this.position.z + PLAYER.RADIUS * 0.7),
            new THREE.Vector3(this.position.x, rayStartY, this.position.z - PLAYER.RADIUS * 0.7),
        ];
        
        for (const origin of rayOrigins) {
            this._raycaster.set(origin, this._downDirection);
            this._raycaster.far = PLAYER.HEIGHT * 0.75; // Check distance scales with player height (covers step-up scenarios)
            
            const intersects = this._raycaster.intersectObjects(this.obstacles, false);
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                const hitY = hit.point.y;
                
                if (result.height === null || hitY > result.height) {
                    result.height = hitY;
                    highestHit = hit;
                }
            }
        }
        
        // Check if the highest ground is a bounce pad
        if (highestHit && highestHit.object && highestHit.object.userData) {
            if (highestHit.object.userData.isBouncy) {
                result.isBouncy = true;
                result.bounceForce = highestHit.object.userData.bounceForce || 18;
            }
        }
        
        return result;
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

