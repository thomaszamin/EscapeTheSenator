/**
 * Werewolf - Enemy entity that chases the player
 * 
 * A 3D werewolf model made from primitives with AI for chasing,
 * walking animation, and jumping over obstacles.
 */

import * as THREE from 'three';
import { PHYSICS } from '../config/Constants.js';

// Werewolf configuration
const WEREWOLF = {
    // Movement
    WALK_SPEED: 6,
    RUN_SPEED: 10,
    JUMP_FORCE: 12,
    CHASE_DISTANCE: 50,      // Start chasing within this distance
    ATTACK_DISTANCE: 2,      // Attack when this close
    
    // Physics - bigger than player, intimidating presence
    HEIGHT: 4.5,
    RADIUS: 0.8,
    SCALE: 2.2,              // Scale factor for model - bigger than player
    
    // AI
    OBSTACLE_CHECK_DISTANCE: 2,
    JUMP_COOLDOWN: 1.0,
    
    // Colors
    FUR_COLOR: 0x3d2817,      // Dark brown fur
    SKIN_COLOR: 0x2a1a0a,     // Darker skin
    EYE_COLOR: 0xff3300,      // Glowing red eyes
    CLAW_COLOR: 0x1a1a1a,     // Dark claws
};

export class Werewolf {
    constructor(position = new THREE.Vector3(0, 0, 0)) {
        // Position and physics
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y rotation facing direction
        
        // State
        this.isGrounded = true;
        this.isChasing = false;
        this.isJumping = false;
        this.jumpCooldown = 0;
        this.animationTime = 0;
        
        // Target (player reference set externally)
        this.target = null;
        this.obstacles = [];
        
        // 3D model
        this.mesh = new THREE.Group();
        this.bodyParts = {};
        
        // Raycaster for obstacle detection
        this._raycaster = new THREE.Raycaster();
        this._forwardDirection = new THREE.Vector3();
        
        this.buildModel();
    }

    /**
     * Build the werewolf 3D model from primitives
     */
    buildModel() {
        const furMaterial = new THREE.MeshStandardMaterial({
            color: WEREWOLF.FUR_COLOR,
            roughness: 0.9,
            metalness: 0.0,
        });
        
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: WEREWOLF.SKIN_COLOR,
            roughness: 0.7,
            metalness: 0.1,
        });
        
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: WEREWOLF.EYE_COLOR,
            emissive: WEREWOLF.EYE_COLOR,
            emissiveIntensity: 0.8,
        });
        
        const clawMaterial = new THREE.MeshStandardMaterial({
            color: WEREWOLF.CLAW_COLOR,
            roughness: 0.3,
            metalness: 0.5,
        });

        // ===== TORSO (muscular, broad) =====
        const torsoGeom = new THREE.BoxGeometry(1.1, 1.2, 0.7);
        const torso = new THREE.Mesh(torsoGeom, furMaterial);
        torso.position.y = 1.2;
        torso.castShadow = true;
        this.mesh.add(torso);
        this.bodyParts.torso = torso;
        
        // Chest muscles (bulging pectorals)
        const chestGeom = new THREE.SphereGeometry(0.25, 8, 8);
        const leftChest = new THREE.Mesh(chestGeom, furMaterial);
        leftChest.position.set(-0.25, 1.4, 0.3);
        leftChest.scale.set(1.2, 0.8, 0.6);
        leftChest.castShadow = true;
        this.mesh.add(leftChest);
        
        const rightChest = new THREE.Mesh(chestGeom, furMaterial);
        rightChest.position.set(0.25, 1.4, 0.3);
        rightChest.scale.set(1.2, 0.8, 0.6);
        rightChest.castShadow = true;
        this.mesh.add(rightChest);
        
        // Shoulder muscles
        const shoulderGeom = new THREE.SphereGeometry(0.22, 8, 8);
        const leftShoulder = new THREE.Mesh(shoulderGeom, furMaterial);
        leftShoulder.position.set(-0.6, 1.55, 0);
        leftShoulder.scale.set(1.0, 0.8, 0.9);
        leftShoulder.castShadow = true;
        this.mesh.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeom, furMaterial);
        rightShoulder.position.set(0.6, 1.55, 0);
        rightShoulder.scale.set(1.0, 0.8, 0.9);
        rightShoulder.castShadow = true;
        this.mesh.add(rightShoulder);

        // ===== HEAD (fierce, wolf-like) =====
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 2.1, 0.15);
        
        // Main head (larger, more angular)
        const headGeom = new THREE.BoxGeometry(0.6, 0.55, 0.65);
        const head = new THREE.Mesh(headGeom, furMaterial);
        head.castShadow = true;
        headGroup.add(head);
        
        // Brow ridge (makes it look more menacing)
        const browGeom = new THREE.BoxGeometry(0.55, 0.12, 0.25);
        const brow = new THREE.Mesh(browGeom, furMaterial);
        brow.position.set(0, 0.2, 0.2);
        headGroup.add(brow);
        
        // Snout (longer, more wolf-like)
        const snoutGeom = new THREE.BoxGeometry(0.35, 0.28, 0.5);
        const snout = new THREE.Mesh(snoutGeom, skinMaterial);
        snout.position.set(0, -0.1, 0.5);
        snout.castShadow = true;
        headGroup.add(snout);
        
        // Nose
        const noseGeom = new THREE.SphereGeometry(0.06, 6, 6);
        const nose = new THREE.Mesh(noseGeom, clawMaterial);
        nose.position.set(0, -0.02, 0.78);
        headGroup.add(nose);
        
        // Eyes (glowing red, larger)
        const eyeGeom = new THREE.SphereGeometry(0.1, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeom, eyeMaterial);
        leftEye.position.set(-0.18, 0.12, 0.28);
        headGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeom, eyeMaterial);
        rightEye.position.set(0.18, 0.12, 0.28);
        headGroup.add(rightEye);
        
        // Ears (pointed, larger)
        const earGeom = new THREE.ConeGeometry(0.12, 0.35, 4);
        const leftEar = new THREE.Mesh(earGeom, furMaterial);
        leftEar.position.set(-0.25, 0.42, -0.05);
        leftEar.rotation.z = -0.25;
        headGroup.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeom, furMaterial);
        rightEar.position.set(0.25, 0.42, -0.05);
        rightEar.rotation.z = 0.25;
        headGroup.add(rightEar);
        
        // Fangs
        const fangGeom = new THREE.ConeGeometry(0.025, 0.1, 4);
        const leftFang = new THREE.Mesh(fangGeom, new THREE.MeshStandardMaterial({ color: 0xffffee }));
        leftFang.position.set(-0.1, -0.22, 0.65);
        leftFang.rotation.x = Math.PI;
        headGroup.add(leftFang);
        
        const rightFang = new THREE.Mesh(fangGeom, new THREE.MeshStandardMaterial({ color: 0xffffee }));
        rightFang.position.set(0.1, -0.22, 0.65);
        rightFang.rotation.x = Math.PI;
        headGroup.add(rightFang);
        
        this.mesh.add(headGroup);
        this.bodyParts.head = headGroup;

        // ===== ARMS (thick, muscular) =====
        // Left arm
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.65, 1.5, 0);
        
        // Bicep (thick upper arm)
        const upperArmGeom = new THREE.BoxGeometry(0.35, 0.55, 0.32);
        const leftUpperArm = new THREE.Mesh(upperArmGeom, furMaterial);
        leftUpperArm.position.y = -0.25;
        leftUpperArm.castShadow = true;
        leftArmGroup.add(leftUpperArm);
        
        // Bicep bulge
        const bicepGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const leftBicep = new THREE.Mesh(bicepGeom, furMaterial);
        leftBicep.position.set(0, -0.2, 0.1);
        leftBicep.scale.set(1.0, 1.2, 0.8);
        leftArmGroup.add(leftBicep);
        
        // Forearm (slightly thinner)
        const lowerArmGeom = new THREE.BoxGeometry(0.28, 0.55, 0.25);
        const leftLowerArm = new THREE.Mesh(lowerArmGeom, furMaterial);
        leftLowerArm.position.y = -0.75;
        leftLowerArm.castShadow = true;
        leftArmGroup.add(leftLowerArm);
        
        // Hand
        const handGeom = new THREE.BoxGeometry(0.22, 0.15, 0.18);
        const leftHand = new THREE.Mesh(handGeom, skinMaterial);
        leftHand.position.set(0, -1.05, 0.05);
        leftHand.castShadow = true;
        leftArmGroup.add(leftHand);
        
        // Claws (bigger, scarier)
        const clawGeom = new THREE.ConeGeometry(0.04, 0.2, 4);
        for (let i = 0; i < 4; i++) {
            const claw = new THREE.Mesh(clawGeom, clawMaterial);
            claw.position.set(-0.08 + i * 0.055, -1.2, 0.08);
            claw.rotation.x = 0.4;
            leftArmGroup.add(claw);
        }
        
        this.mesh.add(leftArmGroup);
        this.bodyParts.leftArm = leftArmGroup;

        // Right arm (mirror of left)
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.65, 1.5, 0);
        
        const rightUpperArm = new THREE.Mesh(upperArmGeom, furMaterial);
        rightUpperArm.position.y = -0.25;
        rightUpperArm.castShadow = true;
        rightArmGroup.add(rightUpperArm);
        
        const rightBicep = new THREE.Mesh(bicepGeom, furMaterial);
        rightBicep.position.set(0, -0.2, 0.1);
        rightBicep.scale.set(1.0, 1.2, 0.8);
        rightArmGroup.add(rightBicep);
        
        const rightLowerArm = new THREE.Mesh(lowerArmGeom, furMaterial);
        rightLowerArm.position.y = -0.75;
        rightLowerArm.castShadow = true;
        rightArmGroup.add(rightLowerArm);
        
        const rightHand = new THREE.Mesh(handGeom, skinMaterial);
        rightHand.position.set(0, -1.05, 0.05);
        rightHand.castShadow = true;
        rightArmGroup.add(rightHand);
        
        for (let i = 0; i < 4; i++) {
            const claw = new THREE.Mesh(clawGeom, clawMaterial);
            claw.position.set(-0.08 + i * 0.055, -1.2, 0.08);
            claw.rotation.x = 0.4;
            rightArmGroup.add(claw);
        }
        
        this.mesh.add(rightArmGroup);
        this.bodyParts.rightArm = rightArmGroup;

        // ===== LEGS (powerful, muscular) =====
        // Left leg
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.3, 0.7, 0);
        
        // Thigh (thick, powerful)
        const upperLegGeom = new THREE.BoxGeometry(0.38, 0.55, 0.35);
        const leftUpperLeg = new THREE.Mesh(upperLegGeom, furMaterial);
        leftUpperLeg.position.y = -0.25;
        leftUpperLeg.castShadow = true;
        leftLegGroup.add(leftUpperLeg);
        
        // Thigh muscle bulge
        const thighGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const leftThigh = new THREE.Mesh(thighGeom, furMaterial);
        leftThigh.position.set(0, -0.2, 0.15);
        leftThigh.scale.set(1.0, 1.3, 0.7);
        leftLegGroup.add(leftThigh);
        
        // Calf (muscular)
        const lowerLegGeom = new THREE.BoxGeometry(0.3, 0.55, 0.28);
        const leftLowerLeg = new THREE.Mesh(lowerLegGeom, furMaterial);
        leftLowerLeg.position.y = -0.75;
        leftLowerLeg.castShadow = true;
        leftLegGroup.add(leftLowerLeg);
        
        // Calf muscle
        const calfGeom = new THREE.SphereGeometry(0.12, 8, 8);
        const leftCalf = new THREE.Mesh(calfGeom, furMaterial);
        leftCalf.position.set(0, -0.65, -0.12);
        leftCalf.scale.set(0.9, 1.2, 0.8);
        leftLegGroup.add(leftCalf);
        
        // Foot (beast-like)
        const footGeom = new THREE.BoxGeometry(0.3, 0.12, 0.4);
        const leftFoot = new THREE.Mesh(footGeom, skinMaterial);
        leftFoot.position.set(0, -1.0, 0.12);
        leftFoot.castShadow = true;
        leftLegGroup.add(leftFoot);
        
        // Toe claws
        const toeClawGeom = new THREE.ConeGeometry(0.03, 0.12, 4);
        for (let i = 0; i < 3; i++) {
            const toeClaw = new THREE.Mesh(toeClawGeom, clawMaterial);
            toeClaw.position.set(-0.08 + i * 0.08, -1.05, 0.35);
            toeClaw.rotation.x = 0.5;
            leftLegGroup.add(toeClaw);
        }
        
        this.mesh.add(leftLegGroup);
        this.bodyParts.leftLeg = leftLegGroup;

        // Right leg (mirror of left)
        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.3, 0.7, 0);
        
        const rightUpperLeg = new THREE.Mesh(upperLegGeom, furMaterial);
        rightUpperLeg.position.y = -0.25;
        rightUpperLeg.castShadow = true;
        rightLegGroup.add(rightUpperLeg);
        
        const rightThigh = new THREE.Mesh(thighGeom, furMaterial);
        rightThigh.position.set(0, -0.2, 0.15);
        rightThigh.scale.set(1.0, 1.3, 0.7);
        rightLegGroup.add(rightThigh);
        
        const rightLowerLeg = new THREE.Mesh(lowerLegGeom, furMaterial);
        rightLowerLeg.position.y = -0.75;
        rightLowerLeg.castShadow = true;
        rightLegGroup.add(rightLowerLeg);
        
        const rightCalf = new THREE.Mesh(calfGeom, furMaterial);
        rightCalf.position.set(0, -0.65, -0.12);
        rightCalf.scale.set(0.9, 1.2, 0.8);
        rightLegGroup.add(rightCalf);
        
        const rightFoot = new THREE.Mesh(footGeom, skinMaterial);
        rightFoot.position.set(0, -1.0, 0.12);
        rightFoot.castShadow = true;
        rightLegGroup.add(rightFoot);
        
        for (let i = 0; i < 3; i++) {
            const toeClaw = new THREE.Mesh(toeClawGeom, clawMaterial);
            toeClaw.position.set(-0.08 + i * 0.08, -1.05, 0.35);
            toeClaw.rotation.x = 0.5;
            rightLegGroup.add(toeClaw);
        }
        
        this.mesh.add(rightLegGroup);
        this.bodyParts.rightLeg = rightLegGroup;

        // ===== TAIL (bushy) =====
        const tailGeom = new THREE.CylinderGeometry(0.1, 0.2, 0.8, 8);
        const tail = new THREE.Mesh(tailGeom, furMaterial);
        tail.position.set(0, 0.85, -0.45);
        tail.rotation.x = -0.7;
        tail.castShadow = true;
        this.mesh.add(tail);
        this.bodyParts.tail = tail;
        
        // Tail fur tuft
        const tailTuftGeom = new THREE.SphereGeometry(0.12, 6, 6);
        const tailTuft = new THREE.Mesh(tailTuftGeom, furMaterial);
        tailTuft.position.set(0, 0.5, -0.75);
        tailTuft.scale.set(0.8, 1.2, 1.0);
        this.mesh.add(tailTuft);

        // Scale up the entire model to match player height
        this.mesh.scale.set(WEREWOLF.SCALE, WEREWOLF.SCALE, WEREWOLF.SCALE);
        
        // Position the entire mesh
        this.mesh.position.copy(this.position);
    }

    /**
     * Set the target to chase (usually the player)
     */
    setTarget(target) {
        this.target = target;
    }

    /**
     * Set obstacles for collision/jumping detection
     */
    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    /**
     * Update werewolf AI and animation
     */
    update(deltaTime) {
        if (!this.target) return;

        this.animationTime += deltaTime;
        
        // Update cooldowns
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }

        // Calculate distance to target
        const toTarget = new THREE.Vector3();
        toTarget.subVectors(this.target.position, this.position);
        toTarget.y = 0; // Ignore vertical difference for distance
        const distance = toTarget.length();

        // Check if should chase
        this.isChasing = distance < WEREWOLF.CHASE_DISTANCE && distance > WEREWOLF.ATTACK_DISTANCE;

        if (this.isChasing) {
            // Face the target
            this.rotation = Math.atan2(toTarget.x, toTarget.z);
            
            // Check for obstacles ahead
            const hasObstacle = this.checkObstacleAhead();
            
            if (hasObstacle && this.isGrounded && this.jumpCooldown <= 0) {
                // Jump over obstacle
                this.jump();
            }
            
            // Move towards target
            if (this.isGrounded || this.isJumping) {
                const speed = this.isJumping ? WEREWOLF.RUN_SPEED : WEREWOLF.WALK_SPEED;
                const moveDirection = toTarget.normalize();
                this.velocity.x = moveDirection.x * speed;
                this.velocity.z = moveDirection.z * speed;
            }
        } else {
            // Slow down when not chasing
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }

        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y += PHYSICS.GRAVITY * deltaTime;
        }

        // Apply velocity
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;

        // Ground check
        this.checkGround();

        // Update mesh position and rotation
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        // Animate
        this.animate(deltaTime);
    }

    /**
     * Check if there's an obstacle in front
     */
    checkObstacleAhead() {
        if (this.obstacles.length === 0) return false;

        // Cast ray forward at knee height (scaled)
        const origin = new THREE.Vector3(
            this.position.x,
            this.position.y + 1.0,
            this.position.z
        );
        
        this._forwardDirection.set(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );

        this._raycaster.set(origin, this._forwardDirection);
        this._raycaster.far = WEREWOLF.OBSTACLE_CHECK_DISTANCE;

        const intersects = this._raycaster.intersectObjects(this.obstacles, false);
        return intersects.length > 0;
    }

    /**
     * Make the werewolf jump
     */
    jump() {
        if (!this.isGrounded) return;
        
        this.velocity.y = WEREWOLF.JUMP_FORCE;
        this.isGrounded = false;
        this.isJumping = true;
        this.jumpCooldown = WEREWOLF.JUMP_COOLDOWN;
    }

    /**
     * Check if werewolf is on ground
     */
    checkGround() {
        // Simple ground check at Y = 0
        if (this.position.y <= 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.isJumping = false;
            return;
        }

        // Check obstacles below
        if (this.obstacles.length === 0) {
            this.isGrounded = false;
            return;
        }

        const origin = new THREE.Vector3(
            this.position.x,
            this.position.y + 1.0,
            this.position.z
        );

        this._raycaster.set(origin, new THREE.Vector3(0, -1, 0));
        this._raycaster.far = 1.5;

        const intersects = this._raycaster.intersectObjects(this.obstacles, false);
        
        if (intersects.length > 0) {
            const groundY = intersects[0].point.y;
            if (this.position.y <= groundY + 0.1) {
                this.position.y = groundY;
                this.velocity.y = 0;
                this.isGrounded = true;
                this.isJumping = false;
            }
        } else {
            this.isGrounded = false;
        }
    }

    /**
     * Animate the werewolf (walking, idle)
     */
    animate(deltaTime) {
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        const isMoving = speed > 0.5;

        if (isMoving && this.isGrounded) {
            // Walking animation
            const walkCycle = this.animationTime * 8;
            const legSwing = Math.sin(walkCycle) * 0.5;
            const armSwing = Math.sin(walkCycle) * 0.4;

            // Legs swing opposite to each other
            if (this.bodyParts.leftLeg) {
                this.bodyParts.leftLeg.rotation.x = legSwing;
            }
            if (this.bodyParts.rightLeg) {
                this.bodyParts.rightLeg.rotation.x = -legSwing;
            }

            // Arms swing opposite to legs
            if (this.bodyParts.leftArm) {
                this.bodyParts.leftArm.rotation.x = -armSwing;
            }
            if (this.bodyParts.rightArm) {
                this.bodyParts.rightArm.rotation.x = armSwing;
            }

            // Slight body bob
            if (this.bodyParts.torso) {
                this.bodyParts.torso.position.y = 1.2 + Math.abs(Math.sin(walkCycle * 2)) * 0.05;
            }

            // Head bob
            if (this.bodyParts.head) {
                this.bodyParts.head.rotation.x = Math.sin(walkCycle * 2) * 0.05;
            }

            // Tail wag
            if (this.bodyParts.tail) {
                this.bodyParts.tail.rotation.y = Math.sin(walkCycle * 1.5) * 0.3;
            }
        } else if (this.isJumping) {
            // Jumping pose - arms forward, legs back
            if (this.bodyParts.leftArm) {
                this.bodyParts.leftArm.rotation.x = -0.8;
            }
            if (this.bodyParts.rightArm) {
                this.bodyParts.rightArm.rotation.x = -0.8;
            }
            if (this.bodyParts.leftLeg) {
                this.bodyParts.leftLeg.rotation.x = 0.4;
            }
            if (this.bodyParts.rightLeg) {
                this.bodyParts.rightLeg.rotation.x = 0.4;
            }
        } else {
            // Idle animation - subtle breathing
            const breathe = Math.sin(this.animationTime * 2) * 0.02;
            
            if (this.bodyParts.torso) {
                this.bodyParts.torso.scale.y = 1 + breathe;
            }

            // Reset limb positions smoothly
            ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'].forEach(part => {
                if (this.bodyParts[part]) {
                    this.bodyParts[part].rotation.x *= 0.9;
                }
            });

            // Idle tail sway
            if (this.bodyParts.tail) {
                this.bodyParts.tail.rotation.y = Math.sin(this.animationTime) * 0.2;
            }
        }
    }

    /**
     * Get the bounding box for collision
     */
    getBoundingBox() {
        return new THREE.Box3().setFromObject(this.mesh);
    }

    /**
     * Check if werewolf is near the target (for attack)
     */
    isNearTarget() {
        if (!this.target) return false;
        const distance = this.position.distanceTo(this.target.position);
        return distance < WEREWOLF.ATTACK_DISTANCE;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.mesh.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}

export default Werewolf;
