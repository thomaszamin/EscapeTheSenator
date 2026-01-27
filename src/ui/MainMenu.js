/**
 * MainMenu - Main menu UI component
 * 
 * Displays the initial menu with Sandbox and Quit options.
 */

import { gameStateManager, GameState, GameMode } from '../systems/GameStateManager.js';
import { MenuBase, MenuTemplates } from './MenuBase.js';

export class MainMenu extends MenuBase {
    constructor() {
        super('main-menu', GameState.MAIN_MENU);
    }

    /**
     * Initialize the main menu
     */
    init() {
        super.init();
        
        // Register button handlers
        this.registerButton('btn-start-game', this._onStartGameClick);
        this.registerButton('btn-sandbox', this._onSandboxClick);
        this.registerButton('btn-quit', this._onQuitClick);

        // Show menu initially
        this.show();
    }

    /**
     * Handle Start Game button click - starts parkour mode
     */
    _onStartGameClick() {
        console.log('[MainMenu] Start Game clicked - starting parkour mode');
        gameStateManager.startPlaying(GameMode.PARKOUR);
    }

    /**
     * Handle Sandbox button click - starts sandbox mode
     */
    _onSandboxClick() {
        console.log('[MainMenu] Sandbox clicked - starting sandbox mode');
        gameStateManager.startPlaying(GameMode.SANDBOX);
    }

    /**
     * Handle Quit button click
     */
    _onQuitClick() {
        console.log('[MainMenu] Quit clicked');
        
        // Try to close the window (works if opened via script)
        // Otherwise show a message or redirect
        if (window.opener || window.history.length === 1) {
            window.close();
        } else {
            this._showQuitMessage();
        }
    }

    /**
     * Show quit message when window.close() doesn't work
     */
    _showQuitMessage() {
        const content = this.container.querySelector('.menu-content');
        if (!content) return;

        // Unregister current buttons
        this.unregisterButton('btn-start-game');
        this.unregisterButton('btn-sandbox');
        this.unregisterButton('btn-quit');

        // Build quit screen using templates
        content.innerHTML = [
            MenuTemplates.cornerDecorations(),
            MenuTemplates.title('THANKS FOR PLAYING'),
            MenuTemplates.subtitle('You can safely close this tab'),
            MenuTemplates.divider(),
            MenuTemplates.buttonContainer(
                MenuTemplates.button({ id: 'btn-back', icon: '←', text: 'BACK' })
            ),
            MenuTemplates.footer()
        ].join('');

        // Register back button
        this.registerButton('btn-back', this._restoreMenu);
    }

    /**
     * Restore the menu content
     */
    _restoreMenu() {
        const content = this.container.querySelector('.menu-content');
        if (!content) return;

        // Unregister back button
        this.unregisterButton('btn-back');

        // Build main menu using templates
        content.innerHTML = [
            MenuTemplates.cornerDecorations(),
            MenuTemplates.title('ESCAPE THE SENATOR'),
            MenuTemplates.subtitle('A Three.js Experience'),
            MenuTemplates.divider(),
            MenuTemplates.buttonContainer([
                MenuTemplates.button({ id: 'btn-start-game', icon: '▶', text: 'START GAME' }),
                MenuTemplates.button({ id: 'btn-sandbox', icon: '◈', text: 'SANDBOX' }),
                MenuTemplates.button({ id: 'btn-quit', icon: '✕', text: 'QUIT', secondary: true })
            ].join('')),
            MenuTemplates.footer()
        ].join('');

        // Re-register main buttons
        this.registerButton('btn-start-game', this._onStartGameClick);
        this.registerButton('btn-sandbox', this._onSandboxClick);
        this.registerButton('btn-quit', this._onQuitClick);
    }
}

export default MainMenu;
