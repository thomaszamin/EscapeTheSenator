/**
 * MenuBase - Base class for menu UI components
 * 
 * Provides common functionality for all menus: show/hide, state management, disposal.
 */

import { globalEvents, Events } from '../systems/EventBus.js';
import { GameState } from '../systems/GameStateManager.js';

// App version - single source of truth
export const APP_VERSION = 'v0.1.0';

/**
 * Template helpers for consistent UI components
 */
export const MenuTemplates = {
    /**
     * Corner decorations for menu panels
     */
    cornerDecorations() {
        return `
            <div class="corner-decor top-left"></div>
            <div class="corner-decor top-right"></div>
            <div class="corner-decor bottom-left"></div>
            <div class="corner-decor bottom-right"></div>
        `;
    },

    /**
     * Title with glitch effect
     * @param {string} text - Title text
     */
    title(text) {
        return `
            <div class="title-container">
                <div class="title-glitch" data-text="${text}">
                    <h1 class="menu-title">${text}</h1>
                </div>
                <div class="title-underline"></div>
            </div>
        `;
    },

    /**
     * Subtitle with brackets
     * @param {string} text - Subtitle text
     */
    subtitle(text) {
        return `
            <p class="menu-subtitle">
                <span class="subtitle-bracket">[</span>
                ${text}
                <span class="subtitle-bracket">]</span>
            </p>
        `;
    },

    /**
     * Decorative divider
     */
    divider() {
        return `
            <div class="menu-divider">
                <span class="divider-dot"></span>
                <span class="divider-line"></span>
                <span class="divider-dot"></span>
            </div>
        `;
    },

    /**
     * Menu button
     * @param {Object} options - Button options
     * @param {string} options.id - Button ID
     * @param {string} options.icon - Button icon
     * @param {string} options.text - Button text
     * @param {boolean} [options.secondary=false] - Whether it's a secondary button
     */
    button({ id, icon, text, secondary = false }) {
        const secondaryClass = secondary ? ' menu-btn-secondary' : '';
        return `
            <button id="${id}" class="menu-btn${secondaryClass}">
                <span class="btn-icon">${icon}</span>
                <span class="btn-text">${text}</span>
                <span class="btn-arrow">→</span>
            </button>
        `;
    },

    /**
     * Menu footer with version and status
     */
    footer() {
        return `
            <div class="menu-footer">
                <span class="version">${APP_VERSION}</span>
                <span class="status-indicator">
                    <span class="status-dot"></span>
                    SYSTEM ONLINE
                </span>
            </div>
        `;
    },

    /**
     * Wrap buttons in container
     * @param {string} buttonsHtml - Button HTML strings
     */
    buttonContainer(buttonsHtml) {
        return `<div class="menu-buttons">${buttonsHtml}</div>`;
    }
};

/**
 * Base class for menu components
 */
export class MenuBase {
    /**
     * @param {string} containerId - DOM element ID for the menu container
     * @param {string} visibleState - GameState value when this menu should be visible
     */
    constructor(containerId, visibleState) {
        this.container = document.getElementById(containerId);
        this.visibleState = visibleState;
        this.buttons = new Map(); // Store button references and handlers
        
        // Bound handlers
        this._onStateChange = this._onStateChange.bind(this);
    }

    /**
     * Initialize the menu - override in subclass to add button handlers
     */
    init() {
        if (!this.container) {
            console.error(`[${this.constructor.name}] Container element not found`);
            return;
        }

        // Listen for state changes
        globalEvents.on(Events.STATE_CHANGE, this._onStateChange);
        
        console.log(`[${this.constructor.name}] Initialized`);
    }

    /**
     * Register a button with its click handler
     * @param {string} buttonId - Button element ID
     * @param {Function} handler - Click handler function
     */
    registerButton(buttonId, handler) {
        const button = document.getElementById(buttonId);
        if (button) {
            const boundHandler = handler.bind(this);
            button.addEventListener('click', boundHandler);
            this.buttons.set(buttonId, { element: button, handler: boundHandler });
        }
    }

    /**
     * Unregister a button
     * @param {string} buttonId - Button element ID
     */
    unregisterButton(buttonId) {
        const buttonData = this.buttons.get(buttonId);
        if (buttonData) {
            buttonData.element.removeEventListener('click', buttonData.handler);
            this.buttons.delete(buttonId);
        }
    }

    /**
     * Show the menu
     */
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            this.container.classList.add('visible');
        }
    }

    /**
     * Hide the menu
     */
    hide() {
        if (this.container) {
            this.container.classList.remove('visible');
            this.container.classList.add('hidden');
        }
    }

    /**
     * Handle state changes
     */
    _onStateChange({ from, to }) {
        if (to === this.visibleState) {
            this.show();
        } else if (from === this.visibleState) {
            this.hide();
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Remove all button listeners
        for (const [buttonId] of this.buttons) {
            this.unregisterButton(buttonId);
        }
        
        // Remove state change listener
        globalEvents.off(Events.STATE_CHANGE, this._onStateChange);
    }
}

export default MenuBase;

