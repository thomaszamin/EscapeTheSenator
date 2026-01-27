/**
 * GameStateManager - Centralized game state management
 * 
 * Manages game states (MAIN_MENU, PLAYING, PAUSED) and state transitions.
 * Uses EventBus for decoupled communication.
 */

import { globalEvents, Events } from './EventBus.js';

/**
 * Game state enum
 */
export const GameState = {
    MAIN_MENU: 'main_menu',
    PLAYING: 'playing',
    PAUSED: 'paused'
};

/**
 * Game mode enum
 */
export const GameMode = {
    SANDBOX: 'sandbox',
    PARKOUR: 'parkour'
};

class GameStateManager {
    constructor() {
        this.currentState = GameState.MAIN_MENU;
        this.previousState = null;
        this.currentMode = GameMode.SANDBOX;
    }

    /**
     * Initialize the state manager
     */
    init() {
        console.log('[GameStateManager] Initialized with state:', this.currentState);
    }

    /**
     * Set the current game state
     * @param {string} newState - The new state from GameState enum
     */
    setState(newState) {
        if (!Object.values(GameState).includes(newState)) {
            console.error(`[GameStateManager] Invalid state: ${newState}`);
            return;
        }

        if (newState === this.currentState) {
            return;
        }

        const oldState = this.currentState;
        this.previousState = oldState;
        this.currentState = newState;

        console.log(`[GameStateManager] State change: ${oldState} → ${newState}`);

        // Emit state change event
        globalEvents.emit(Events.STATE_CHANGE, { 
            from: oldState, 
            to: newState 
        });

        // Emit specific state events
        switch (newState) {
            case GameState.MAIN_MENU:
                globalEvents.emit(Events.MENU_MAIN_SHOW);
                break;
            case GameState.PLAYING:
                globalEvents.emit(Events.GAME_RESUME);
                break;
            case GameState.PAUSED:
                globalEvents.emit(Events.MENU_PAUSE_SHOW);
                globalEvents.emit(Events.GAME_PAUSE);
                break;
        }

        // Emit hide events for old state
        switch (oldState) {
            case GameState.MAIN_MENU:
                globalEvents.emit(Events.MENU_MAIN_HIDE);
                break;
            case GameState.PAUSED:
                globalEvents.emit(Events.MENU_PAUSE_HIDE);
                break;
        }
    }

    /**
     * Get the current state
     * @returns {string} Current game state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Get the previous state
     * @returns {string|null} Previous game state
     */
    getPreviousState() {
        return this.previousState;
    }

    /**
     * Check if currently playing
     * @returns {boolean}
     */
    isPlaying() {
        return this.currentState === GameState.PLAYING;
    }

    /**
     * Check if currently paused
     * @returns {boolean}
     */
    isPaused() {
        return this.currentState === GameState.PAUSED;
    }

    /**
     * Check if in main menu
     * @returns {boolean}
     */
    isInMenu() {
        return this.currentState === GameState.MAIN_MENU;
    }

    /**
     * Toggle pause state (only valid when PLAYING or PAUSED)
     */
    togglePause() {
        if (this.currentState === GameState.PLAYING) {
            this.setState(GameState.PAUSED);
        } else if (this.currentState === GameState.PAUSED) {
            this.setState(GameState.PLAYING);
        }
    }

    /**
     * Start playing from main menu
     * @param {string} mode - Optional game mode (defaults to current mode)
     */
    startPlaying(mode = null) {
        if (mode) {
            this.currentMode = mode;
        }
        if (this.currentState === GameState.MAIN_MENU) {
            this.setState(GameState.PLAYING);
        }
    }

    /**
     * Get current game mode
     * @returns {string} Current game mode
     */
    getMode() {
        return this.currentMode;
    }

    /**
     * Set game mode
     * @param {string} mode - Game mode from GameMode enum
     */
    setMode(mode) {
        if (Object.values(GameMode).includes(mode)) {
            this.currentMode = mode;
        }
    }

    /**
     * Check if in parkour mode
     * @returns {boolean}
     */
    isParkourMode() {
        return this.currentMode === GameMode.PARKOUR;
    }

    /**
     * Check if in sandbox mode
     * @returns {boolean}
     */
    isSandboxMode() {
        return this.currentMode === GameMode.SANDBOX;
    }

    /**
     * Return to main menu
     */
    returnToMainMenu() {
        this.setState(GameState.MAIN_MENU);
    }

    /**
     * Resume from pause
     */
    resume() {
        if (this.currentState === GameState.PAUSED) {
            this.setState(GameState.PLAYING);
        }
    }
}

// Singleton export
export const gameStateManager = new GameStateManager();
export default GameStateManager;

