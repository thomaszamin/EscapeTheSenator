/**
 * Escape The Senator
 * 
 * Main entry point - initializes and starts the game engine.
 */

import { Engine } from './core/Engine.js';

// Global engine reference (useful for debugging)
let engine = null;

/**
 * Initialize and start the game
 */
async function main() {
    console.log('╔════════════════════════════════════╗');
    console.log('║     ESCAPE THE SENATOR             ║');
    console.log('║     A Three.js Experience          ║');
    console.log('╚════════════════════════════════════╝');
    
    try {
        // Create and initialize engine
        engine = new Engine();
        await engine.init();
        
        // Start the game loop
        engine.start();
        
        // Expose engine to window for debugging
        if (import.meta.env?.DEV) {
            window.engine = engine;
            window.THREE = await import('three');
            console.log('[Debug] Engine exposed as window.engine');
        }
        
    } catch (error) {
        console.error('[Fatal] Failed to initialize game:', error);
        showErrorScreen(error);
    }
}

/**
 * Show error screen if initialization fails
 */
function showErrorScreen(error) {
    const container = document.getElementById('game-container');
    if (container) {
        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: #0a0a0f;
                color: #ff3366;
                font-family: 'Rajdhani', monospace;
                text-align: center;
                padding: 2rem;
            ">
                <h1 style="font-size: 2rem; margin-bottom: 1rem;">SYSTEM ERROR</h1>
                <p style="color: #888; margin-bottom: 1rem;">Failed to initialize game engine</p>
                <code style="
                    background: rgba(255,51,102,0.1);
                    padding: 1rem;
                    border-radius: 4px;
                    max-width: 600px;
                    overflow: auto;
                ">${error.message}</code>
                <button onclick="location.reload()" style="
                    margin-top: 2rem;
                    padding: 0.75rem 2rem;
                    background: transparent;
                    border: 1px solid #00ff88;
                    color: #00ff88;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 1rem;
                ">RETRY</button>
            </div>
        `;
    }
}

/**
 * Handle page unload
 */
window.addEventListener('beforeunload', () => {
    if (engine) {
        engine.dispose();
    }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

