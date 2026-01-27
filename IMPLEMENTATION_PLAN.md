# Escape The Senator - Implementation Plan

## Overview
A scalable 3D first-person experience built with Three.js, designed for future expansion into a full game.

---

## Architecture Philosophy

### Design Principles
1. **Modularity** - Each system is self-contained and can be modified independently
2. **Event-Driven** - Systems communicate via events, reducing tight coupling
3. **Component-Based Entities** - Easy to add new entity types and behaviors
4. **Separation of Concerns** - Physics, rendering, and logic run independently
5. **Configuration-Driven** - Constants and settings externalized for easy tuning

---

## Project Structure

```
EscapeTheSenator/
├── src/
│   ├── core/
│   │   ├── Engine.js           # Main game loop & orchestration
│   │   ├── SceneManager.js     # Scene/level management
│   │   └── AssetLoader.js      # Centralized asset loading
│   │
│   ├── systems/
│   │   ├── InputManager.js     # Keyboard/mouse input handling
│   │   ├── PhysicsSystem.js    # Collision & physics simulation
│   │   └── EventBus.js         # Global event system
│   │
│   ├── entities/
│   │   ├── Entity.js           # Base entity class
│   │   ├── Player.js           # Player state & logic
│   │   └── FirstPersonCamera.js # FPS camera controller
│   │
│   ├── world/
│   │   ├── World.js            # World container & management
│   │   ├── Environment.js      # Lighting, fog, skybox
│   │   └── Terrain.js          # Ground, obstacles, structures
│   │
│   ├── ui/
│   │   ├── HUD.js              # Heads-up display
│   │   └── Crosshair.js        # Aim crosshair
│   │
│   ├── config/
│   │   └── Constants.js        # All game constants
│   │
│   └── main.js                 # Application entry point
│
├── public/
│   ├── index.html              # Main HTML file
│   └── assets/                 # Textures, models, audio (future)
│
├── styles/
│   └── main.css                # Styles
│
└── package.json
```

---

## Core Systems

### 1. Engine (`core/Engine.js`)
The heart of the application. Manages the game loop and coordinates all systems.

**Responsibilities:**
- Initialize Three.js renderer, scene, camera
- Run the update loop (requestAnimationFrame)
- Calculate delta time for frame-independent movement
- Coordinate system updates in correct order

**Update Order:**
1. Input polling
2. Physics update (fixed timestep)
3. Entity updates
4. Camera update
5. Render

### 2. Input Manager (`systems/InputManager.js`)
Centralizes all input handling with rebindable controls.

**Features:**
- Keyboard state tracking (pressed, held, released)
- Mouse movement with Pointer Lock API
- Configurable key bindings
- Input buffering for responsive controls

**Default Bindings:**
| Action | Key |
|--------|-----|
| Forward | W |
| Backward | S |
| Strafe Left | A |
| Strafe Right | D |
| Jump | Space |
| Sprint | Shift |
| Look | Mouse Movement |

### 3. Physics System (`systems/PhysicsSystem.js`)
Handles movement physics and collision detection.

**Features:**
- Gravity simulation
- Ground detection
- Velocity-based movement
- Friction/drag
- Future: Full collision system with world geometry

**Physics Constants:**
- Gravity: -30 units/sec²
- Jump velocity: 12 units/sec
- Walk speed: 5 units/sec
- Run speed: 10 units/sec
- Mouse sensitivity: 0.002

### 4. Event Bus (`systems/EventBus.js`)
Decoupled communication between systems.

**Events:**
- `player:jump` - Player initiated jump
- `player:land` - Player landed on ground
- `player:sprint:start` - Sprint began
- `player:sprint:end` - Sprint ended
- `input:lock` - Pointer locked
- `input:unlock` - Pointer unlocked

---

## Player System

### Player Controller (`entities/Player.js`)
Manages player state and movement logic.

**State:**
- Position (Vector3)
- Velocity (Vector3)
- isGrounded (boolean)
- isSprinting (boolean)
- canJump (boolean)

**Movement Implementation:**
```
1. Get input direction from InputManager
2. Calculate movement vector relative to camera facing
3. Apply speed modifier (walk/run)
4. Apply velocity to position
5. Apply gravity if not grounded
6. Check ground collision
7. Update camera position
```

### First Person Camera (`entities/FirstPersonCamera.js`)
Handles view rotation and position.

**Features:**
- Pitch (up/down) clamped to ±85°
- Yaw (left/right) unlimited
- Smooth position following
- Head bob (future enhancement)

---

## World System

### Environment (`world/Environment.js`)
Scene atmosphere and lighting.

**Components:**
- Ambient light (soft fill)
- Directional light (sun)
- Hemisphere light (sky/ground)
- Fog (depth atmosphere)
- Skybox (future)

### Terrain (`world/Terrain.js`)
Physical world geometry.

**Initial Implementation:**
- Flat ground plane with grid texture
- Boundary walls
- Simple obstacles (cubes) for testing

**Future:**
- Heightmap terrain
- Procedural generation
- Detailed level geometry

---

## Scalability Roadmap

### Phase 1: Foundation (Current)
- [x] Core engine loop
- [x] Input system with pointer lock
- [x] First-person camera
- [x] WASD movement
- [x] Sprint modifier
- [x] Jump with gravity
- [x] Basic environment

### Phase 2: World Building
- [ ] Asset loading system
- [ ] Multiple scene support
- [x] Collision with world geometry
- [ ] Interactive objects
- [ ] Doors/triggers

### Phase 3: Gameplay
- [ ] Enemy entities
- [ ] Health system
- [ ] Inventory
- [ ] Save/load state
- [ ] Audio system

### Phase 4: Polish
- [ ] Advanced lighting
- [ ] Particle effects
- [ ] Post-processing
- [ ] Performance optimization
- [ ] Mobile support

---

## Technical Notes

### Frame-Independent Movement
All movement calculations use `deltaTime` to ensure consistent speed regardless of frame rate:
```javascript
position.x += velocity.x * deltaTime;
```

### Fixed Physics Timestep
Physics updates run at a fixed rate (e.g., 60Hz) independent of render frame rate to ensure deterministic behavior.

### Pointer Lock API
Required for FPS-style mouse look. Handles:
- Lock request on click
- Unlock on Escape
- Movement delta capture

### Performance Considerations
- Object pooling for frequently created/destroyed objects
- Frustum culling (built into Three.js)
- Level-of-detail (LOD) for distant objects
- Texture atlasing
- Instanced rendering for repeated geometry

---

## File Dependencies

```
main.js
├── Engine.js
│   ├── InputManager.js
│   ├── EventBus.js
│   ├── Player.js
│   │   └── FirstPersonCamera.js
│   ├── World.js
│   │   ├── Environment.js
│   │   └── Terrain.js
│   └── HUD.js
└── Constants.js
```

---

## Getting Started

```bash
npm install
npm run dev
```

Click the screen to lock your mouse and enable controls.
Press Escape to unlock.

---

*This document will be updated as the project evolves.*

