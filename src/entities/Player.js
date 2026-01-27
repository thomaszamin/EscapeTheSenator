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
        
        // Cast rays upward from crouch height to stand height
        const crouchTopY = this.position.y + PLAYER.CROUCH_HEIGHT;
        const standTopY = this.position.y + PLAYER.HEIGHT;
        
        const checkPoints = [
            new THREE.Vector3(this.position.x, crouchTopY, this.position.z),
            new THREE.Vector3(this.position.x + halfWidth * 0.7, crouchTopY, this.position.z),
            new THREE.Vector3(this.position.x - halfWidth * 0.7, crouchTopY, this.position.z),
            new THREE.Vector3(this.position.x, crouchTopY, this.position.z + halfWidth * 0.7),
            new THREE.Vector3(this.position.x, crouchTopY, this.position.z - halfWidth * 0.7),
        ];
        
        const upDirection = new THREE.Vector3(0, 1, 0);
        const checkDistance = standTopY - crouchTopY;
        
        for (const point of checkPoints) {
            this._raycaster.set(point, upDirection);
            this._raycaster.far = checkDistance;
            
            const intersects = this._raycaster.intersectObjects(this.obstacles, false);
            
            if (intersects.length > 0) {
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
        
        // Check at mid-body height (use current height for better wall detection range)
        const feetY = this.position.y;
        const checkHeight = feetY + this.currentHeight * 0.5; // Mid-body based on current height
        const origin = new THREE.Vector3(this.position.x, checkHeight, this.position.z);
        
        const halfWidth = PLAYER.RADIUS;
        
        for (const dir of directions) {
            this._raycaster.set(origin, dir);
            this._raycaster.far = wallCheckDistance;
            
            const intersects = this._raycaster.intersectObjects(this.obstacles, false);
            
            if (intersects.length > 0) {
                // Check that the wall is tall enough (not just a low platform)
                const hitPoint = intersects[0].point;
                let hitNormal = dir.clone().negate(); // Default normal
                
                // Try to get face normal if available
                if (intersects[0].face) {
                    hitNormal = intersects[0].face.normal.clone();
                    // Transform normal to world space if needed
                    if (intersects[0].object.matrixWorld) {
                        hitNormal.transformDirection(intersects[0].object.matrixWorld);
                    }
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
        
        // Camera is at position.y + current eye height, so check from camera height upward
        // The actual top of the player's head/collision volume should be at camera height + some offset
        const currentEyeHeight = this.isCrouching || this.isSliding ? PLAYER.CROUCH_EYE_HEIGHT : PLAYER.EYE_HEIGHT;
        const cameraY = this.position.y + currentEyeHeight;
        const headTopY = cameraY + (this.currentHeight - currentEyeHeight); // Top of head above camera
        
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
        
        const stepHeight = this.currentHeight * 0.25; // Height we can step over / stand on (scales with current height)
        
        // Cast rays in the movement direction from multiple heights
        // position.y represents feet/base position
        const feetY = this.position.y;
        const currentEyeHeight = this.isCrouching || this.isSliding ? PLAYER.CROUCH_EYE_HEIGHT : PLAYER.EYE_HEIGHT;
        const cameraY = this.position.y + currentEyeHeight;
        const headTopY = cameraY + (this.currentHeight - currentEyeHeight); // Top of head above camera
        
        // Check at dense intervals from above step height to top of head
        // Heights scale proportionally with current height
        const checkHeights = [];
        const checkCount = Math.ceil(this.currentHeight * 2); // More checks for taller players
        const startHeight = feetY + stepHeight + this.currentHeight * 0.05;
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
        
        const checkDistance = PLAYER.RADIUS + this.currentHeight * 0.0375; // Scales with current height
        
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
        
        // groundResult.height is the Y position of the platform surface
        // this.position.y is the feet/base position, so it should equal groundResult.height when on platform
        if (groundResult.height !== null && this.position.y <= groundResult.height + 0.1) {
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
        const rayStartY = feetY + this.currentHeight * 0.25; // Start rays proportionally above feet
        
        const rayOrigins = [
            new THREE.Vector3(this.position.x, rayStartY, this.position.z),
            new THREE.Vector3(this.position.x + PLAYER.RADIUS * 0.7, rayStartY, this.position.z),
            new THREE.Vector3(this.position.x - PLAYER.RADIUS * 0.7, rayStartY, this.position.z),
            new THREE.Vector3(this.position.x, rayStartY, this.position.z + PLAYER.RADIUS * 0.7),
            new THREE.Vector3(this.position.x, rayStartY, this.position.z - PLAYER.RADIUS * 0.7),
        ];
        
        for (const origin of rayOrigins) {
            this._raycaster.set(origin, this._downDirection);
            this._raycaster.far = this.currentHeight * 0.75; // Check distance scales with current height (covers step-up scenarios)
            
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

