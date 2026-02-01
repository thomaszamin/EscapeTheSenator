/**
 * SandboxUI - UI controls for sandbox mode
 * 
 * Provides buttons for spawning enemies and other sandbox features.
 */

import { globalEvents, Events } from '../systems/EventBus.js';

export class SandboxUI {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.world = null;
    }

    /**
     * Initialize the sandbox UI
     */
    init() {
        this.createUI();
        this.setupEventListeners();
    }

    /**
     * Set the world reference for spawning
     */
    setWorld(world) {
        this.world = world;
    }

    /**
     * Create the UI elements
     */
    createUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'sandbox-ui';
        this.container.className = 'sandbox-ui hidden';
        
        // Title
        const title = document.createElement('div');
        title.className = 'sandbox-title';
        title.textContent = 'Sandbox Controls';
        this.container.appendChild(title);
        
        // Spawn werewolf button
        const spawnBtn = document.createElement('button');
        spawnBtn.className = 'sandbox-btn spawn-werewolf';
        spawnBtn.innerHTML = `
            <span class="btn-icon">🐺</span>
            <span class="btn-text">Spawn Werewolf</span>
        `;
        spawnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.spawnWerewolf();
        });
        this.container.appendChild(spawnBtn);
        
        // Clear werewolves button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'sandbox-btn clear-werewolves';
        clearBtn.innerHTML = `
            <span class="btn-icon">🗑️</span>
            <span class="btn-text">Clear All</span>
        `;
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clearWerewolves();
        });
        this.container.appendChild(clearBtn);
        
        // Werewolf count display
        this.countDisplay = document.createElement('div');
        this.countDisplay.className = 'werewolf-count';
        this.countDisplay.textContent = 'Werewolves: 0';
        this.container.appendChild(this.countDisplay);
        
        document.body.appendChild(this.container);
        
        // Add styles
        this.addStyles();
    }

    /**
     * Add CSS styles for the sandbox UI
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .sandbox-ui {
                position: fixed;
                top: 100px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid #00ff88;
                border-radius: 12px;
                padding: 15px;
                z-index: 100;
                font-family: 'Segoe UI', sans-serif;
                min-width: 180px;
                box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
            }
            
            .sandbox-ui.hidden {
                display: none;
            }
            
            .sandbox-title {
                color: #00ff88;
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 15px;
                text-align: center;
                border-bottom: 1px solid rgba(0, 255, 136, 0.3);
                padding-bottom: 10px;
            }
            
            .sandbox-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 12px 15px;
                margin-bottom: 10px;
                background: rgba(0, 255, 136, 0.1);
                border: 1px solid #00ff88;
                border-radius: 8px;
                color: #ffffff;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .sandbox-btn:hover {
                background: rgba(0, 255, 136, 0.3);
                transform: translateX(3px);
                box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
            }
            
            .sandbox-btn:active {
                transform: translateX(1px);
            }
            
            .sandbox-btn .btn-icon {
                font-size: 18px;
            }
            
            .sandbox-btn .btn-text {
                flex: 1;
                text-align: left;
            }
            
            .spawn-werewolf {
                border-color: #ff6600;
                background: rgba(255, 102, 0, 0.1);
            }
            
            .spawn-werewolf:hover {
                background: rgba(255, 102, 0, 0.3);
                box-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
            }
            
            .clear-werewolves {
                border-color: #ff3333;
                background: rgba(255, 51, 51, 0.1);
            }
            
            .clear-werewolves:hover {
                background: rgba(255, 51, 51, 0.3);
                box-shadow: 0 0 10px rgba(255, 51, 51, 0.5);
            }
            
            .werewolf-count {
                color: #aaaaaa;
                font-size: 12px;
                text-align: center;
                margin-top: 5px;
            }
        `;
        document.head.appendChild(style);
        this.styleElement = style;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for state changes
        globalEvents.on(Events.STATE_CHANGE, ({ from, to }) => {
            // Show UI when playing in sandbox mode
            // Hide when paused or in menu
        });
    }

    /**
     * Spawn a werewolf
     */
    spawnWerewolf() {
        if (!this.world) {
            console.warn('[SandboxUI] No world reference set');
            return;
        }
        
        this.world.spawnWerewolf();
        this.updateCount();
    }

    /**
     * Clear all werewolves
     */
    clearWerewolves() {
        if (!this.world) return;
        
        this.world.clearWerewolves();
        this.updateCount();
    }

    /**
     * Update the werewolf count display
     */
    updateCount() {
        if (!this.world || !this.countDisplay) return;
        
        const count = this.world.werewolves.length;
        this.countDisplay.textContent = `Werewolves: ${count}`;
    }

    /**
     * Show the UI
     */
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            this.isVisible = true;
            this.updateCount();
        }
    }

    /**
     * Hide the UI
     */
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
            this.isVisible = false;
        }
    }

    /**
     * Update the UI (call each frame if needed)
     */
    update() {
        if (this.isVisible) {
            this.updateCount();
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.styleElement && this.styleElement.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
        }
    }
}

export default SandboxUI;
