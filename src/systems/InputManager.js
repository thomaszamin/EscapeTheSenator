/**
 * InputManager - Centralized input handling system
 * 
 * Handles keyboard, mouse, and pointer lock for FPS controls.
 * Supports rebindable keys and input state queries.
 */

import { INPUT, CAMERA } from '../config/Constants.js';
import { globalEvents, Events } from './EventBus.js';

class InputManager {
    constructor() {
        // Keyboard state
        this.keys = new Map();
        this.keysPressed = new Set();  // Just pressed this frame
        this.keysReleased = new Set(); // Just released this frame
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            locked: false,
        };
        
        // Bindings (can be remapped)
        this.bindings = { ...INPUT.BINDINGS };
        this.altBindings = { ...INPUT.ALT_BINDINGS };
        
        // Sensitivity
        this.sensitivity = CAMERA.SENSITIVITY;
        
        // Bound handlers (for removal)
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);
        this._onClick = this._onClick.bind(this);
        
        this.canvas = null;
    }

    /**
     * Initialize input listeners
     * @param {HTMLCanvasElement} canvas - The game canvas
     */
    init(canvas) {
        this.canvas = canvas;
        
        // Keyboard events
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        
        // Mouse events
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        
        // Click to lock
        canvas.addEventListener('click', this._onClick);
        
        console.log('[InputManager] Initialized');
    }

    /**
     * Clean up listeners
     */
    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        
        if (this.canvas) {
            this.canvas.removeEventListener('click', this._onClick);
        }
    }

    /**
     * Reset per-frame input state (call at end of frame)
     */
    update() {
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
    }

    // ==================== Key State Queries ====================

    /**
     * Check if a key is currently held
     * @param {string} code - KeyboardEvent.code value
     */
    isKeyDown(code) {
        return this.keys.get(code) === true;
    }

    /**
     * Check if a key was just pressed this frame
     * @param {string} code - KeyboardEvent.code value
     */
    isKeyPressed(code) {
        return this.keysPressed.has(code);
    }

    /**
     * Check if a key was just released this frame
     * @param {string} code - KeyboardEvent.code value
     */
    isKeyReleased(code) {
        return this.keysReleased.has(code);
    }

    // ==================== Action Queries ====================

    /**
     * Check if an action is active (supports alt bindings)
     * @param {string} action - Action name from bindings
     */
    isAction(action) {
        const primary = this.bindings[action];
        const alt = this.altBindings[action];
        
        return this.isKeyDown(primary) || (alt && this.isKeyDown(alt));
    }

    /**
     * Check if an action was just triggered
     * @param {string} action - Action name from bindings
     */
    isActionPressed(action) {
        const primary = this.bindings[action];
        const alt = this.altBindings[action];
        
        return this.isKeyPressed(primary) || (alt && this.isKeyPressed(alt));
    }

    /**
     * Get movement input as normalized vector components
     * @returns {{ x: number, z: number }} Movement direction
     */
    getMovementInput() {
        let x = 0;
        let z = 0;
        
        if (this.isAction('FORWARD')) z -= 1;
        if (this.isAction('BACKWARD')) z += 1;
        if (this.isAction('LEFT')) x -= 1;
        if (this.isAction('RIGHT')) x += 1;
        
        // Normalize diagonal movement
        const length = Math.sqrt(x * x + z * z);
        if (length > 0) {
            x /= length;
            z /= length;
        }
        
        return { x, z };
    }

    // ==================== Mouse & Pointer Lock ====================

    /**
     * Get mouse delta for this frame
     */
    getMouseDelta() {
        return {
            x: this.mouse.deltaX * this.sensitivity,
            y: this.mouse.deltaY * this.sensitivity,
        };
    }

    /**
     * Request pointer lock
     */
    requestPointerLock() {
        if (this.canvas && !this.mouse.locked) {
            this.canvas.requestPointerLock();
        }
    }

    /**
     * Exit pointer lock
     */
    exitPointerLock() {
        if (this.mouse.locked) {
            document.exitPointerLock();
        }
    }

    /**
     * Check if pointer is locked
     */
    isPointerLocked() {
        return this.mouse.locked;
    }

    // ==================== Event Handlers ====================

    _onKeyDown(event) {
        // Prevent default for game keys
        if (Object.values(this.bindings).includes(event.code) ||
            Object.values(this.altBindings).includes(event.code)) {
            event.preventDefault();
        }
        
        if (!this.keys.get(event.code)) {
            this.keysPressed.add(event.code);
        }
        this.keys.set(event.code, true);
    }

    _onKeyUp(event) {
        this.keys.set(event.code, false);
        this.keysReleased.add(event.code);
    }

    _onMouseMove(event) {
        if (this.mouse.locked) {
            this.mouse.deltaX += event.movementX;
            this.mouse.deltaY += event.movementY;
        }
        
        this.mouse.x = event.clientX;
        this.mouse.y = event.clientY;
    }

    _onPointerLockChange() {
        const wasLocked = this.mouse.locked;
        this.mouse.locked = document.pointerLockElement === this.canvas;
        
        if (this.mouse.locked && !wasLocked) {
            globalEvents.emit(Events.INPUT_LOCK);
        } else if (!this.mouse.locked && wasLocked) {
            globalEvents.emit(Events.INPUT_UNLOCK);
        }
    }

    _onClick() {
        if (!this.mouse.locked) {
            this.requestPointerLock();
        }
    }

    // ==================== Configuration ====================

    /**
     * Rebind an action to a new key
     * @param {string} action - Action name
     * @param {string} code - New key code
     */
    rebind(action, code) {
        if (this.bindings.hasOwnProperty(action)) {
            this.bindings[action] = code;
        }
    }

    /**
     * Set mouse sensitivity
     * @param {number} value - Sensitivity multiplier
     */
    setSensitivity(value) {
        this.sensitivity = value;
    }
}

// Singleton export
export const inputManager = new InputManager();
export default InputManager;

