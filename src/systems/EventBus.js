/**
 * EventBus - Global event system for decoupled communication
 * 
 * Allows systems to communicate without direct dependencies.
 * Critical for scaling the project with new features.
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @param {Object} context - Optional 'this' context
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const listener = { callback, context };
        this.listeners.get(event).push(listener);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @param {Object} context - Optional 'this' context
     */
    once(event, callback, context = null) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback.apply(context, args);
        };
        this.on(event, wrapper, context);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        const index = listeners.findIndex(l => l.callback === callback);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }
        
        if (listeners.length === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to handlers
     */
    emit(event, ...args) {
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        listeners.forEach(({ callback, context }) => {
            try {
                callback.apply(context, args);
            } catch (error) {
                console.error(`Error in event handler for "${event}":`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} event - Optional event name
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get count of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Listener count
     */
    listenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }
}

// Singleton instance for global events
export const globalEvents = new EventBus();

// Named events for type safety and autocomplete
export const Events = {
    // Input events
    INPUT_LOCK: 'input:lock',
    INPUT_UNLOCK: 'input:unlock',
    
    // Player events
    PLAYER_JUMP: 'player:jump',
    PLAYER_LAND: 'player:land',
    PLAYER_SPRINT_START: 'player:sprint:start',
    PLAYER_SPRINT_END: 'player:sprint:end',
    PLAYER_MOVE: 'player:move',
    PLAYER_CROUCH_START: 'player:crouch:start',
    PLAYER_CROUCH_END: 'player:crouch:end',
    PLAYER_SLIDE_START: 'player:slide:start',
    PLAYER_SLIDE_END: 'player:slide:end',
    
    // Game state events
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    STATE_CHANGE: 'state:change',
    
    // Menu events
    MENU_MAIN_SHOW: 'menu:main:show',
    MENU_MAIN_HIDE: 'menu:main:hide',
    MENU_PAUSE_SHOW: 'menu:pause:show',
    MENU_PAUSE_HIDE: 'menu:pause:hide',
    
    // World events
    WORLD_LOADED: 'world:loaded',
    
    // Parkour events
    PARKOUR_CHUNK_GENERATED: 'parkour:chunk:generated',
    PARKOUR_CHUNK_DISPOSED: 'parkour:chunk:disposed',
    PARKOUR_RESTART: 'parkour:restart',
    
    // Debug events
    DEBUG_TOGGLE: 'debug:toggle',
};

export default EventBus;

