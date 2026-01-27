/**
 * Engine - Core game engine
 * 
 * Manages the main loop, Three.js setup, and system coordination.
 */

import * as THREE from 'three';
import { CAMERA, WORLD, RENDER } from '../config/Constants.js';
import { inputManager } from '../systems/InputManager.js';
import { globalEvents, Events } from '../systems/EventBus.js';
import { gameStateManager, GameState } from '../systems/GameStateManager.js';
import { Player } from '../entities/Player.js';
import { World } from '../world/World.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { PauseMenu } from '../ui/PauseMenu.js';

export class Engine {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        
        // Game systems
        this.player = null;
        this.world = null;
        this.hud = null;
        this.mainMenu = null;
        this.pauseMenu = null;
        
        // Time tracking
        this.clock = new THREE.Clock();
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.frameCount = 0;
        
        // Performance tracking
        this.fps = 0;
        this.fpsUpdateTime = 0;
        this.fpsFrameCount = 0;
        
        // State
        this.isRunning = false;
        this.isPaused = false;
        
        // Bound methods
        this._update = this._update.bind(this);
        this._onResize = this._onResize.bind(this);
    }

    /**
     * Initialize the engine
     */
    async init() {
        console.log('[Engine] Initializing...');
        
        // Setup Three.js
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        
        // Initialize state manager
        gameStateManager.init();
        
        // Initialize input
        inputManager.init(this.canvas);
        
        // Create game systems
        this.player = new Player(this.camera);
        this.world = new World(this.scene);
        this.hud = new HUD();
        
        // Initialize menus
        this.mainMenu = new MainMenu();
        this.pauseMenu = new PauseMenu();
        this.mainMenu.init();
        this.pauseMenu.init();
        
        // Build the world
        this.world.build();
        
        // Give player access to obstacles for collision detection
        this.player.setObstacles(this.world.getObstacles());
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Handle window resize
        window.addEventListener('resize', this._onResize);
        
        console.log('[Engine] Initialization complete');
        
        return this;
    }

    /**
     * Setup Three.js renderer
     */
    setupRenderer() {
        this.canvas = document.getElementById('game-canvas');
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: RENDER.ANTIALIAS,
            powerPreference: 'high-performance',
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.PIXEL_RATIO_MAX));
        
        // Enable shadows
        if (RENDER.ENABLE_SHADOWS) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Set output color space
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Tone mapping for better visuals
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    /**
     * Setup Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(WORLD.SKY_COLOR);
        
        // Add fog for depth
        this.scene.fog = new THREE.Fog(
            WORLD.FOG_COLOR,
            WORLD.FOG_NEAR,
            WORLD.FOG_FAR
        );
    }

    /**
     * Setup camera
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            CAMERA.NEAR,
            CAMERA.FAR
        );
        
        this.camera.position.set(0, 2, 0);
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Handle pointer lock changes for HUD
        globalEvents.on(Events.INPUT_LOCK, () => {
            // Only update HUD when playing
            if (gameStateManager.isPlaying()) {
                this.hud.onLock();
            }
        });
        
        globalEvents.on(Events.INPUT_UNLOCK, () => {
            // Only show instructions when playing (not in menus)
            if (gameStateManager.isPlaying()) {
                this.hud.onUnlock();
            }
        });
        
        // Player events for HUD
        globalEvents.on(Events.PLAYER_SPRINT_START, () => {
            this.hud.showSprintIndicator(true);
        });
        
        globalEvents.on(Events.PLAYER_SPRINT_END, () => {
            this.hud.showSprintIndicator(false);
        });
        
        // State change events
        globalEvents.on(Events.STATE_CHANGE, ({ from, to }) => {
            this._onStateChange(from, to);
        });
    }

    /**
     * Handle game state changes
     */
    _onStateChange(from, to) {
        console.log(`[Engine] State changed: ${from} → ${to}`);
        
        switch (to) {
            case GameState.MAIN_MENU:
                this.isPaused = true;
                this.hud.onUnlock();
                // Hide instructions when in main menu
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    instructions.classList.add('hidden');
                    instructions.classList.remove('visible');
                }
                break;
                
            case GameState.PLAYING:
                this.isPaused = false;
                // Request pointer lock when entering play mode
                if (!inputManager.isPointerLocked()) {
                    inputManager.requestPointerLock();
                }
                break;
                
            case GameState.PAUSED:
                this.isPaused = true;
                break;
        }
    }

    /**
     * Handle window resize
     */
    _onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;
        
        console.log('[Engine] Starting game loop');
        this.isRunning = true;
        this.clock.start();
        
        globalEvents.emit(Events.GAME_START);
        
        this._update();
    }

    /**
     * Pause the game
     */
    pause() {
        this.isPaused = true;
        globalEvents.emit(Events.GAME_PAUSE);
    }

    /**
     * Resume the game
     */
    resume() {
        this.isPaused = false;
        globalEvents.emit(Events.GAME_RESUME);
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Main update loop
     */
    _update() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(this._update);
        
        // Calculate delta time
        this.deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap at 100ms
        this.elapsedTime = this.clock.getElapsedTime();
        this.frameCount++;
        
        // Update FPS counter
        this.updateFPS();
        
        // Only update game logic when playing and pointer is locked
        const shouldUpdate = gameStateManager.isPlaying() && inputManager.isPointerLocked();
        
        if (shouldUpdate) {
            // Update player (includes physics and camera)
            this.player.update(this.deltaTime);
            
            // Update world (animations, etc.)
            this.world.update(this.deltaTime);
        }
        
        // Update HUD only when in playing state
        if (gameStateManager.isPlaying()) {
            this.hud.update(this.getDebugInfo());
        }
        
        // Clear input state for next frame
        inputManager.update();
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update FPS counter
     */
    updateFPS() {
        this.fpsFrameCount++;
        this.fpsUpdateTime += this.deltaTime;
        
        if (this.fpsUpdateTime >= 0.5) {
            this.fps = Math.round(this.fpsFrameCount / this.fpsUpdateTime);
            this.fpsFrameCount = 0;
            this.fpsUpdateTime = 0;
        }
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        const playerInfo = this.player.getDebugInfo();
        
        return {
            fps: this.fps,
            position: playerInfo.position,
            velocity: playerInfo.velocity,
            speed: playerInfo.speed,
            isGrounded: playerInfo.isGrounded,
            isSprinting: playerInfo.isSprinting,
        };
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stop();
        
        window.removeEventListener('resize', this._onResize);
        inputManager.dispose();
        
        this.world.dispose();
        this.renderer.dispose();
        
        if (this.mainMenu) this.mainMenu.dispose();
        if (this.pauseMenu) this.pauseMenu.dispose();
        
        globalEvents.clear();
    }
}

export default Engine;

