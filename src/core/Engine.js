/**
 * Engine - Core game engine
 * 
 * Manages the main loop, Three.js setup, and system coordination.
 */

import * as THREE from 'three';
import { CAMERA, WORLD, RENDER, PARKOUR } from '../config/Constants.js';
import { inputManager } from '../systems/InputManager.js';
import { globalEvents, Events } from '../systems/EventBus.js';
import { gameStateManager, GameState, GameMode } from '../systems/GameStateManager.js';
import { Player } from '../entities/Player.js';
import { World } from '../world/World.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { SandboxUI } from '../ui/SandboxUI.js';

// InfiniteWorld loaded dynamically to prevent blocking main menu if parkour fails
let InfiniteWorldClass = null;

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
        this.infiniteWorld = null;
        this.activeWorld = null;
        this.hud = null;
        this.mainMenu = null;
        this.pauseMenu = null;
        this.sandboxUI = null;
        
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
        this.deathCooldown = 0; // Prevent rapid death/respawn cycles
        
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
        this.infiniteWorld = null; // Created on demand
        this.hud = new HUD();
        
        // Initialize menus
        this.mainMenu = new MainMenu();
        this.pauseMenu = new PauseMenu();
        this.sandboxUI = new SandboxUI();
        this.mainMenu.init();
        this.pauseMenu.init();
        this.sandboxUI.init();
        
        // Build sandbox world (default)
        this.world.build();
        this.activeWorld = this.world;
        
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
                // Only setup game mode when coming from main menu (not from pause)
                if (from === GameState.MAIN_MENU) {
                    this.setupGameMode();
                }
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
     * Setup the game based on current mode
     */
    async setupGameMode() {
        const mode = gameStateManager.getMode();
        console.log(`[Engine] Setting up game mode: ${mode}`);
        
        if (mode === GameMode.PARKOUR) {
            // Dispose sandbox world if active
            if (this.activeWorld === this.world && this.world.isLoaded) {
                this.world.dispose();
                this.world.isLoaded = false;
            }
            
            // Dynamically load InfiniteWorld if not already loaded
            if (!InfiniteWorldClass) {
                try {
                    const module = await import('../world/parkour/InfiniteWorld.js');
                    InfiniteWorldClass = module.InfiniteWorld;
                } catch (error) {
                    console.error('[Engine] Failed to load InfiniteWorld:', error);
                    // Fall back to sandbox mode
                    gameStateManager.setMode(GameMode.SANDBOX);
                    this.setupGameMode();
                    return;
                }
            }
            
            // Create or reset infinite world
            if (!this.infiniteWorld) {
                this.infiniteWorld = new InfiniteWorldClass(this.scene);
                this.infiniteWorld.build();
            } else {
                this.infiniteWorld.reset();
            }
            
            this.activeWorld = this.infiniteWorld;
            
            // Reset player position for parkour - spawn on top of starting checkpoint
            // Checkpoint is at y=0 with height 0.6, so top surface is at y=0.3
            // Spawn player slightly above to ensure proper ground detection
            this.player.setPosition(0, 0.5, 5);
            this.player.setObstacles(this.infiniteWorld.getObstacles());
            
            console.log('[Engine] PARKOUR MODE INITIALIZED');
            console.log('[Engine] - InfiniteWorld:', !!this.infiniteWorld);
            console.log('[Engine] - ActiveWorld:', !!this.activeWorld);
            console.log('[Engine] - Player position:', this.player.position.x, this.player.position.y, this.player.position.z);
            console.log('[Engine] - Death threshold: Y < -30');
            
            // Hide sandbox UI in parkour mode
            if (this.sandboxUI) {
                this.sandboxUI.hide();
            }
            
        } else {
            // Sandbox mode
            if (this.activeWorld === this.infiniteWorld && this.infiniteWorld) {
                this.infiniteWorld.dispose();
                this.infiniteWorld = null;
            }
            
            // Rebuild sandbox world if needed
            if (!this.world.isLoaded) {
                this.world.build();
            }
            
            this.activeWorld = this.world;
            this.player.setPosition(0, 0, 0);
            this.player.setObstacles(this.world.getObstacles());
            
            // Set player reference for werewolf AI
            this.world.setPlayer(this.player);
            
            // Show sandbox UI
            if (this.sandboxUI) {
                this.sandboxUI.setWorld(this.world);
                this.sandboxUI.show();
            }
            
            console.log('[Engine] SANDBOX MODE INITIALIZED');
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
            
            // Update active world (animations, etc.)
            if (this.activeWorld) {
                const isParkour = gameStateManager.isParkourMode();
                const hasInfiniteWorld = !!this.infiniteWorld;
                
                if (isParkour && hasInfiniteWorld) {
                    // Update infinite world with player position
                    this.infiniteWorld.update(this.deltaTime, this.player.position);
                    
                    // Update obstacles as chunks change
                    this.player.setObstacles(this.infiniteWorld.getObstacles());
                    
                    // Update death cooldown
                    if (this.deathCooldown > 0) {
                        this.deathCooldown -= this.deltaTime;
                    }
                    
                    // Log player Y position when low (for debugging)
                    const playerY = this.player.position.y;
                    if (playerY < -10) {
                        console.log('[Engine] Player falling! Y:', playerY.toFixed(1), 
                            'Cooldown:', this.deathCooldown.toFixed(2),
                            'Death threshold: -30');
                    }
                    
                    // Check for death (with cooldown to prevent rapid respawns)
                    const isDead = this.infiniteWorld.checkDeath(playerY);
                    if (this.deathCooldown <= 0 && isDead) {
                        console.log('[Engine] DEATH DETECTED! Calling handleParkourDeath()');
                        this.handleParkourDeath();
                        this.deathCooldown = 1.0; // 1 second cooldown after respawn
                    }
                } else {
                    this.activeWorld.update(this.deltaTime);
                }
            }
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
     * Handle player death in parkour mode
     */
    handleParkourDeath() {
        console.log('');
        console.log('╔══════════════════════════════════════════╗');
        console.log('║           PLAYER DEATH TRIGGERED         ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log('[Engine] Player fell at Y:', this.player.position.y.toFixed(2));
        console.log('[Engine] Player was at position:', 
            this.player.position.x.toFixed(2), 
            this.player.position.y.toFixed(2), 
            this.player.position.z.toFixed(2));
        
        globalEvents.emit(Events.PLAYER_DEATH);
        
        if (this.infiniteWorld) {
            const hasCP = this.infiniteWorld.hasCheckpoint();
            const respawnPos = this.infiniteWorld.getRespawnPosition();
            const activeCP = this.infiniteWorld.activeCheckpoint;
            
            console.log('[Engine] Has saved checkpoint:', hasCP);
            console.log('[Engine] Active checkpoint:', activeCP ? `#${activeCP.checkpointId}` : 'NONE');
            console.log('[Engine] Respawn position:', 
                respawnPos.x.toFixed(2), 
                respawnPos.y.toFixed(2), 
                respawnPos.z.toFixed(2));
            
            // Teleport player to respawn position
            this.player.setPosition(respawnPos.x, respawnPos.y, respawnPos.z);
            
            // Reset player state
            this.player.velocity.set(0, 0, 0);
            this.player.isGrounded = true;
            
            console.log('[Engine] Player RESPAWNED at:', 
                this.player.position.x.toFixed(2), 
                this.player.position.y.toFixed(2), 
                this.player.position.z.toFixed(2));
        } else {
            console.log('[Engine] ERROR: No infinite world! Using default spawn.');
            this.player.setPosition(0, 0.5, 5);
        }
        
        console.log('════════════════════════════════════════════');
        console.log('');
        globalEvents.emit(Events.PLAYER_RESPAWN);
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        const playerInfo = this.player.getDebugInfo();
        
        const info = {
            fps: this.fps,
            position: playerInfo.position,
            velocity: playerInfo.velocity,
            speed: playerInfo.speed,
            isGrounded: playerInfo.isGrounded,
            isSprinting: playerInfo.isSprinting,
        };
        
        // Add parkour-specific info
        if (gameStateManager.isParkourMode() && this.infiniteWorld) {
            info.distance = Math.floor(this.infiniteWorld.getDistance());
        }
        
        return info;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stop();
        
        window.removeEventListener('resize', this._onResize);
        inputManager.dispose();
        
        if (this.world) this.world.dispose();
        if (this.infiniteWorld) this.infiniteWorld.dispose();
        this.renderer.dispose();
        
        if (this.mainMenu) this.mainMenu.dispose();
        if (this.pauseMenu) this.pauseMenu.dispose();
        if (this.sandboxUI) this.sandboxUI.dispose();
        
        globalEvents.clear();
    }
}

export default Engine;

