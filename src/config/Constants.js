/**
 * Game Constants
 * Centralized configuration for easy tuning and scaling
 */

export const PHYSICS = {
    GRAVITY: -30,
    TERMINAL_VELOCITY: -50,
    GROUND_FRICTION: 10,
    AIR_RESISTANCE: 2,
};

export const PLAYER = {
    HEIGHT: 1.8,
    EYE_HEIGHT: 1.6,
    RADIUS: 0.4,
    
    // Movement speeds (units per second)
    WALK_SPEED: 6,
    RUN_SPEED: 12,
    ACCELERATION: 50,
    DECELERATION: 40,
    AIR_CONTROL: 0.3,
    
    // Jumping
    JUMP_FORCE: 10,
    JUMP_COOLDOWN: 0.1,
    COYOTE_TIME: 0.15,  // Time after leaving ground where jump still works
    JUMP_BUFFER: 0.1,   // Pre-jump input buffer
};

export const CAMERA = {
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000,
    
    // Mouse look
    SENSITIVITY: 0.002,
    PITCH_LIMIT: Math.PI / 2 - 0.1, // Just under 90 degrees
    
    // Head bob (future feature)
    BOB_FREQUENCY: 2,
    BOB_AMPLITUDE: 0.05,
};

export const WORLD = {
    // Ground plane
    GROUND_SIZE: 100,
    GRID_DIVISIONS: 50,
    
    // Boundaries
    BOUNDARY_SIZE: 50,
    BOUNDARY_HEIGHT: 10,
    
    // Colors
    SKY_COLOR: 0x0a0a1a,
    GROUND_COLOR: 0x1a1a2e,
    FOG_COLOR: 0x0a0a1a,
    FOG_NEAR: 10,
    FOG_FAR: 80,
};

export const LIGHTING = {
    AMBIENT_COLOR: 0x404060,
    AMBIENT_INTENSITY: 0.4,
    
    DIRECTIONAL_COLOR: 0xffffff,
    DIRECTIONAL_INTENSITY: 0.8,
    DIRECTIONAL_POSITION: { x: 10, y: 20, z: 10 },
    
    HEMISPHERE_SKY: 0x6688cc,
    HEMISPHERE_GROUND: 0x1a1a2e,
    HEMISPHERE_INTENSITY: 0.6,
};

export const INPUT = {
    // Key bindings (KeyboardEvent.code values)
    BINDINGS: {
        FORWARD: 'KeyW',
        BACKWARD: 'KeyS',
        LEFT: 'KeyA',
        RIGHT: 'KeyD',
        JUMP: 'Space',
        SPRINT: 'ShiftLeft',
        CROUCH: 'KeyC',
        INTERACT: 'KeyE',
    },
    
    // Alternative bindings
    ALT_BINDINGS: {
        FORWARD: 'ArrowUp',
        BACKWARD: 'ArrowDown',
        LEFT: 'ArrowLeft',
        RIGHT: 'ArrowRight',
        SPRINT: 'ShiftRight',
    },
};

export const DEBUG = {
    SHOW_FPS: true,
    SHOW_POSITION: true,
    SHOW_VELOCITY: true,
};

export const RENDER = {
    ANTIALIAS: true,
    PIXEL_RATIO_MAX: 2,
    SHADOW_MAP_SIZE: 2048,
    ENABLE_SHADOWS: true,
};

