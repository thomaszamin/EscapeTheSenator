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
        
        // Crouch/Slide state
        this.isCrouching = false;
        this.isSliding = false;
        this.slideTime = 0;           // Current slide duration
        this.slideCooldown = 0;       // Cooldown before next slide
        this.slideDirection = new THREE.Vector3(); // Direction of slide
        this.currentHeight = PLAYER.HEIGHT;        // Current player height (for collision)
        
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
        
        // Sprint tracking for events and slide requirement
        this._wasSprinting = false;
        this.sprintTime = 0;  // How long player has been continuously sprinting
        
        // Crouch/Slide tracking for events
        this._wasCrouching = false;
        this._wasSliding = false;
        
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
        this.handleCrouchSlide(deltaTime);
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
        this.camera.updateEyeHeight(deltaTime);
        this.camera.updateHeadBob(this.isMoving, this.isSprinting, this.isGrounded, this.isWallRunning, deltaTime);
        this.camera.updatePosition(this.position, deltaTime);
        
        // Emit state events
        this.checkSprintEvents();
        this.checkCrouchSlideEvents();
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
        
        if (this.slideCooldown > 0) {
            this.slideCooldown -= deltaTime;
        }
    }

    /**
     * Handle WASD movement input
     */
    handleMovement(deltaTime) {
        // No movement control while sliding (momentum-based)
        if (this.isSliding) {
            this.isMoving = true; // Consider sliding as moving for head bob
            this.isSprinting = false;
            return;
        }
        
        const input = inputManager.getMovementInput();
        
        // Check if moving
        this.isMoving = input.x !== 0 || input.z !== 0;
        
        // Check sprint (can't sprint while crouching)
        this.isSprinting = this.isMoving && inputManager.isAction('SPRINT') && !this.isCrouching;
        
        // Track continuous sprint time for slide requirement
        if (this.isSprinting) {
            this.sprintTime += deltaTime;
        } else {
            this.sprintTime = 0;
        }
        
        // Get movement speed based on state
        let speed;
        if (this.isCrouching) {
            speed = PLAYER.CROUCH_SPEED;
        } else if (this.isSprinting) {
            speed = PLAYER.RUN_SPEED;
        } else {
            speed = PLAYER.WALK_SPEED;
        }
        
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
        
        // Cancel crouch/slide on jump
        if (this.isCrouching || this.isSliding) {
            this.endCrouchSlide();
        }
        
        globalEvents.emit(Events.PLAYER_JUMP);
    }

    /**
     * Handle crouch and slide input/state
     */
    handleCrouchSlide(deltaTime) {
        const crouchPressed = inputManager.isActionPressed('CROUCH');
        const crouchHeld = inputManager.isAction('CROUCH');
        
        // Can't crouch/slide while wall running
        if (this.isWallRunning) {
            if (this.isSliding) {
                this.endSlide();
            }
            return;
        }
        
        // Handle air state - slides can continue briefly in air (for small bumps)
        // but can't start new crouch/slide while airborne
        if (!this.isGrounded && !this.isSliding && !this.isCrouching) {
            return;
        }
        
        // Handle sliding
        if (this.isSliding) {
            this.slideTime += deltaTime;
            
            // Apply slide velocity with momentum-based friction
            const slideSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
            
            // Dynamic friction: faster speeds = lower friction for longer slides
            // At high speeds, friction is reduced; at low speeds, friction increases
            const momentumFactor = Math.max(0.3, slideSpeed / PLAYER.SLIDE_SPEED);
            const effectiveFriction = PLAYER.SLIDE_FRICTION / momentumFactor;
            
            // Decelerate slide with momentum-based friction
            const decelAmount = effectiveFriction * deltaTime;
            const newSpeed = Math.max(0, slideSpeed - decelAmount);
            
            if (newSpeed > 0 && slideSpeed > 0) {
                const ratio = newSpeed / slideSpeed;
                this.velocity.x *= ratio;
                this.velocity.z *= ratio;
            }
            
            // End slide if too slow - transition to crouch
            if (newSpeed < PLAYER.SLIDE_MIN_SPEED) {
                this.endSlide();
                this.startCrouch(); // Always transition to crouch after slide
            }
            
            // Cancel slide early ONLY by pressing crouch again
            if (crouchPressed) {
                this.endSlide();
                // Stand up if possible, otherwise stay crouched
                if (!this.canStandUp()) {
                    this.startCrouch();
                }
            }
            
            return;
        }
        
        // Start slide: sprinting for minimum duration + press crouch + not on cooldown
        const hasSprintedEnough = this.sprintTime >= PLAYER.SLIDE_MIN_SPRINT_TIME;
        if (crouchPressed && this.isSprinting && hasSprintedEnough && this.slideCooldown <= 0 && this.isGrounded) {
            this.startSlide();
            return;
        }
        
        // Toggle crouch on press (if not starting a slide)
        if (crouchPressed && this.isGrounded) {
            if (this.isCrouching) {
                // Try to stand up (check for obstacles above)
                if (this.canStandUp()) {
                    this.endCrouch();
                }
            } else {
                this.startCrouch();
            }
        }
        
        // Update camera target height based on state
        this.updateCrouchHeight();
    }

    /**
     * Start crouching
     */
    startCrouch() {
        this.isCrouching = true;
        this.currentHeight = PLAYER.CROUCH_HEIGHT;
        this.camera.setTargetEyeHeight(PLAYER.CROUCH_EYE_HEIGHT);
    }

    /**
     * End crouching
     */
    endCrouch() {
        this.isCrouching = false;
        this.currentHeight = PLAYER.HEIGHT;
        this.camera.setTargetEyeHeight(PLAYER.EYE_HEIGHT);
    }

    /**
     * Start sliding
     */
    startSlide() {
        this.isSliding = true;
        this.isCrouching = false; // Sliding is separate from crouching
        this.slideTime = 0;
        this.currentHeight = PLAYER.CROUCH_HEIGHT;
        this.camera.setTargetEyeHeight(PLAYER.CROUCH_EYE_HEIGHT);
        
        // Capture current movement direction for slide
        const speed = this.getCurrentSpeed();
        if (speed > 0) {
            this.slideDirection.set(this.velocity.x, 0, this.velocity.z).normalize();
            
            // Momentum-based slide: faster entry = faster slide
            // Add a boost proportional to current speed above walk speed
            const momentumBoost = Math.max(0, (speed - PLAYER.WALK_SPEED) * 0.3);
            const slideSpeed = Math.max(speed, PLAYER.SLIDE_SPEED) + momentumBoost;
            
            this.velocity.x = this.slideDirection.x * slideSpeed;
            this.velocity.z = this.slideDirection.z * slideSpeed;
        } else {
            // Slide in facing direction if stationary
            const forward = this.camera.getForwardDirection();
            this.slideDirection.copy(forward);
            this.velocity.x = forward.x * PLAYER.SLIDE_SPEED;
            this.velocity.z = forward.z * PLAYER.SLIDE_SPEED;
        }
        
        globalEvents.emit(Events.PLAYER_SLIDE_START);
    }

    /**
     * End sliding
     */
    endSlide() {
        this.isSliding = false;
        this.slideCooldown = PLAYER.SLIDE_COOLDOWN;
        
        globalEvents.emit(Events.PLAYER_SLIDE_END);
    }

    /**
     * End both crouch and slide states
     */
    endCrouchSlide() {
        if (this.isSliding) {
            this.endSlide();
        }
        if (this.isCrouching) {
            this.endCrouch();
        }
    }

    /**
     * Update camera height based on crouch/slide state
     */
    updateCrouchHeight() {
        if (this.isSliding || this.isCrouching) {
            this.currentHeight = PLAYER.CROUCH_HEIGHT;
            this.camera.setTargetEyeHeight(PLAYER.CROUCH_EYE_HEIGHT);
        } else {
            this.currentHeight = PLAYER.HEIGHT;
            this.camera.setTargetEyeHeight(PLAYER.EYE_HEIGHT);
        }
    }

    /**
     * Check if player can stand up from crouch (no obstacle above)
     */
    canStandUp() {
        if (this.obstacles.length === 0) return true;
        
        const halfWidth = PLAYER.RADIUS;
        const standBox = new THREE.Box3();
        
        // Check the space between crouch height and stand height
        standBox.min.set(
            this.position.x - halfWidth,
            this.position.y - PLAYER.CROUCH_HEIGHT,
            this.position.z - halfWidth
        );
        standBox.max.set(
            this.position.x + halfWidth,
            this.position.y - PLAYER.CROUCH_HEIGHT + PLAYER.HEIGHT,
            this.position.z + halfWidth
        );
        
        for (const obstacle of this.obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (standBox.intersectsBox(obstacleBox)) {
                return false; // Can't stand up, obstacle in the way
            }
        }
        
        return true;
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
                this.position.y - this.currentHeight + 0.5, // Check mid-body
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
        
        // Use currentHeight which changes when crouching
        this._playerBox.min.set(
            this.position.x - halfWidth,
            this.position.y - this.currentHeight + stepHeight, // Start above feet
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
        
        // Check floor at y = 0 (use currentHeight for crouch)
        if (this.position.y <= this.currentHeight) {
            this.position.y = this.currentHeight;
            
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
        
        if (groundY !== null && this.position.y <= groundY + this.currentHeight + 0.1) {
            this.position.y = groundY + this.currentHeight;
            
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
            this.position.y - this.currentHeight - 0.2, // Check slightly below feet
            this.position.z - halfWidth
        );
        feetBox.max.set(
            this.position.x + halfWidth,
            this.position.y - this.currentHeight + 0.1,
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
     * Check and emit crouch/slide state change events
     */
    checkCrouchSlideEvents() {
        // Crouch events
        if (this.isCrouching && !this._wasCrouching) {
            globalEvents.emit(Events.PLAYER_CROUCH_START);
        } else if (!this.isCrouching && this._wasCrouching) {
            globalEvents.emit(Events.PLAYER_CROUCH_END);
        }
        this._wasCrouching = this.isCrouching;
        
        // Slide events are emitted in startSlide/endSlide directly
        this._wasSliding = this.isSliding;
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
            isCrouching: this.isCrouching,
            isSliding: this.isSliding,
            isWallRunning: this.isWallRunning,
            wallRunTime: this.wallRunTime.toFixed(1),
        };
    }
}

export default Player;

