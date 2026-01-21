/**
 * HUD - Heads-up display system
 * 
 * Manages on-screen UI elements like crosshair and debug info.
 */

import { DEBUG } from '../config/Constants.js';

export class HUD {
    constructor() {
        // DOM elements
        this.crosshair = document.getElementById('crosshair');
        this.instructions = document.getElementById('instructions');
        this.debugInfo = document.getElementById('debug-info');
        
        // State
        this.isLocked = false;
        this.debugEnabled = DEBUG.SHOW_FPS || DEBUG.SHOW_POSITION || DEBUG.SHOW_VELOCITY;
    }

    /**
     * Called when pointer is locked
     */
    onLock() {
        this.isLocked = true;
        
        // Show crosshair
        if (this.crosshair) {
            this.crosshair.classList.add('visible');
        }
        
        // Hide instructions
        if (this.instructions) {
            this.instructions.classList.add('hidden');
        }
    }

    /**
     * Called when pointer is unlocked
     */
    onUnlock() {
        this.isLocked = false;
        
        // Hide crosshair
        if (this.crosshair) {
            this.crosshair.classList.remove('visible');
        }
        
        // Show instructions
        if (this.instructions) {
            this.instructions.classList.remove('hidden');
        }
    }

    /**
     * Show/hide sprint indicator
     * @param {boolean} show - Whether to show the indicator
     */
    showSprintIndicator(show) {
        const indicator = document.getElementById('sprint-indicator');
        if (indicator) {
            indicator.classList.toggle('visible', show);
        }
    }

    /**
     * Update HUD with current game state
     * @param {Object} data - Debug data to display
     */
    update(data) {
        if (!this.debugEnabled || !this.debugInfo) return;
        
        const lines = [];
        
        if (DEBUG.SHOW_FPS) {
            lines.push(`FPS: ${data.fps}`);
        }
        
        if (DEBUG.SHOW_POSITION && data.position) {
            lines.push(`POS: ${data.position.x.toFixed(1)}, ${data.position.y.toFixed(1)}, ${data.position.z.toFixed(1)}`);
        }
        
        if (DEBUG.SHOW_VELOCITY && data.velocity) {
            lines.push(`VEL: ${data.speed} u/s`);
            lines.push(`GND: ${data.isGrounded ? 'YES' : 'NO'} | SPR: ${data.isSprinting ? 'YES' : 'NO'}`);
        }
        
        this.debugInfo.innerHTML = lines.join('<br>');
    }

    /**
     * Toggle debug display
     */
    toggleDebug() {
        this.debugEnabled = !this.debugEnabled;
        
        if (this.debugInfo) {
            this.debugInfo.classList.toggle('hidden', !this.debugEnabled);
        }
    }

    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {number} duration - Duration in ms
     */
    showNotification(message, duration = 3000) {
        // Future: implement toast notifications
        console.log(`[HUD Notification] ${message}`);
    }

    /**
     * Update crosshair style (for different states)
     * @param {string} state - State name ('default', 'interact', 'hit')
     */
    setCrosshairState(state) {
        if (!this.crosshair) return;
        
        // Remove all state classes
        this.crosshair.classList.remove('interact', 'hit');
        
        // Add new state
        if (state !== 'default') {
            this.crosshair.classList.add(state);
        }
    }

    /**
     * Clean up HUD
     */
    dispose() {
        // Reset DOM elements
        if (this.crosshair) {
            this.crosshair.classList.remove('visible');
        }
        
        if (this.instructions) {
            this.instructions.classList.remove('hidden');
        }
        
        if (this.debugInfo) {
            this.debugInfo.innerHTML = '';
        }
    }
}

export default HUD;

