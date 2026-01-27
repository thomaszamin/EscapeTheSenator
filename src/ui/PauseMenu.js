/**
 * PauseMenu - Pause menu UI component
 * 
 * Displays when game is paused, shows controls and resume/main menu options.
 */

import { gameStateManager, GameState } from '../systems/GameStateManager.js';
import { inputManager } from '../systems/InputManager.js';
import { MenuBase } from './MenuBase.js';

export class PauseMenu extends MenuBase {
    constructor() {
        super('pause-menu', GameState.PAUSED);
    }

    /**
     * Initialize the pause menu
     */
    init() {
        super.init();

        // Register button handlers
        this.registerButton('btn-resume', this._onResumeClick);
        this.registerButton('btn-main-menu', this._onMainMenuClick);

        // Hide menu initially
        this.hide();
    }

    /**
     * Show the pause menu
     */
    show() {
        super.show();
        
        // Exit pointer lock when showing pause menu
        if (inputManager.isPointerLocked()) {
            inputManager.exitPointerLock();
        }
    }

    /**
     * Handle Resume button click
     */
    _onResumeClick() {
        console.log('[PauseMenu] Resume clicked');
        gameStateManager.resume();
        
        // Request pointer lock to resume gameplay
        inputManager.requestPointerLock();
    }

    /**
     * Handle Main Menu button click
     */
    _onMainMenuClick() {
        console.log('[PauseMenu] Main Menu clicked');
        gameStateManager.returnToMainMenu();
    }
}

export default PauseMenu;
