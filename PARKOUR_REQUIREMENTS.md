# Infinite Parkour World - Requirements Document

## Overview
An infinite, procedurally-generated first-person parkour experience with a cyberpunk/neon aesthetic inspired by Mirror's Edge. The world generates ahead of the player with slight curves and bends, creating a flowing parkour path.

---

## Core Requirements

### 1. World Generation
| Requirement | Specification |
|-------------|---------------|
| Direction | Slight curves/bends - winding road style |
| Generation Type | Semi-random with repeating pattern chunks |
| Performance | Prioritize smooth performance over visual complexity |
| Chunk System | Generate ahead, dispose behind player |

### 2. Camera & Perspective
| Requirement | Specification |
|-------------|---------------|
| View | First-person (existing camera system) |
| Controls | Existing mouse look system |

### 3. Platform Types
| Type | Description | Priority |
|------|-------------|----------|
| Basic Platforms | Simple jumping between blocks | High |
| Stairs/Ramps | Height variations, inclines | High |
| Bouncy/Launch Pads | Spring player higher/further | Medium |
| Wall-Running Segments | Run along walls | Medium |

### 4. Movement Mechanics
| Requirement | Specification |
|-------------|---------------|
| Base Movement | Use existing WASD movement |
| Sprint | Use existing sprint (Shift) |
| Jump | Use existing jump (Space) |
| Additional Abilities | None for now (keep current mechanics) |

### 5. Gameplay Rules
| Rule | Specification |
|------|---------------|
| Death Condition | Falling off platforms |
| Death Result | Instant restart from beginning |
| Scoring | None |
| Collectibles | None |
| Objectives | None (pure parkour experience) |

### 6. Visual Style
| Element | Specification |
|---------|---------------|
| Theme | Cyberpunk/neon (match menu aesthetic) |
| Lighting | No specific preference |
| Platform Spacing | Mix of tight and spread out sections |
| Difficulty | Consistent throughout (no progression) |

---

## Technical Architecture

### Chunk-Based World System
```
ChunkManager
├── Generates chunks ahead of player
├── Disposes chunks behind player
├── Manages chunk transitions
└── Handles curve/bend calculations

Chunk
├── Contains multiple platforms
├── Has entry/exit points for seamless connection
├── Stores platform type data
└── Handles own geometry and collisions
```

### File Structure (New Files)
```
src/
├── world/
│   ├── InfiniteWorld.js      # Main infinite world manager
│   ├── ChunkManager.js       # Chunk generation/disposal
│   ├── ChunkGenerator.js     # Platform pattern generation
│   └── platforms/
│       ├── Platform.js       # Base platform class
│       ├── BasicPlatform.js  # Standard jumping platforms
│       ├── RampPlatform.js   # Stairs and ramps
│       ├── BouncePad.js      # Launch pads
│       └── WallRunSegment.js # Wall-running sections
```

### Game Mode System
```
GameModeManager
├── SANDBOX mode (existing)
└── PARKOUR mode (new)
    ├── Uses InfiniteWorld instead of Terrain
    ├── Enables death on fall
    └── Handles restart logic
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create `InfiniteWorld.js` - Main world container
- [ ] Create `ChunkManager.js` - Chunk lifecycle management
- [ ] Create `ChunkGenerator.js` - Basic platform patterns
- [ ] Create `BasicPlatform.js` - Simple platform geometry
- [ ] Integrate with existing physics/collision system

### Phase 2: Core Platforms
- [ ] Implement `RampPlatform.js` - Stairs and inclines
- [ ] Implement `BouncePad.js` - Launch mechanics
- [ ] Implement `WallRunSegment.js` - Wall-running zones

### Phase 3: World Flow
- [ ] Implement curve/bend generation algorithm
- [ ] Create seamless chunk transitions
- [ ] Add platform spacing variation

### Phase 4: Game Rules
- [ ] Add fall detection and death trigger
- [ ] Implement instant restart mechanism
- [ ] Create game mode switching (Sandbox ↔ Parkour)

### Phase 5: Visual Polish
- [ ] Apply cyberpunk/neon materials
- [ ] Add platform edge glow effects
- [ ] Implement fog/atmosphere

---

## Constants & Configuration

```javascript
// Chunk settings
CHUNK_LENGTH: 50,           // Units per chunk
CHUNK_RENDER_DISTANCE: 3,   // Chunks ahead to generate
CHUNK_DISPOSE_DISTANCE: 2,  // Chunks behind to dispose

// Platform settings
PLATFORM_MIN_WIDTH: 3,
PLATFORM_MAX_WIDTH: 8,
PLATFORM_HEIGHT: 0.5,
GAP_MIN: 2,
GAP_MAX: 6,

// Curve settings
MAX_CURVE_ANGLE: 15,        // Degrees per chunk
CURVE_FREQUENCY: 0.3,       // Chance of curve per chunk

// Bounce pad settings
BOUNCE_FORCE: 20,
BOUNCE_PAD_CHANCE: 0.15,

// Death settings
DEATH_Y_THRESHOLD: -20,     // Y position that triggers death
```

---

## Integration Points

### With Existing Systems
1. **Engine.js** - Add game mode awareness
2. **Player.js** - Add death/respawn logic
3. **PhysicsSystem.js** - Already handles collisions
4. **GameStateManager.js** - Add PARKOUR game mode state
5. **MainMenu.js** - "Start Game" triggers parkour mode
6. **EventBus.js** - Add parkour-specific events

### New Events
- `parkour:death` - Player fell to death
- `parkour:restart` - Game restarting
- `parkour:chunk:generated` - New chunk created
- `parkour:chunk:disposed` - Old chunk removed

---

## Success Criteria
- [ ] Player can run through infinitely generating world
- [ ] World has slight curves creating a winding path
- [ ] All 4 platform types are present and functional
- [ ] Falling triggers instant death and restart
- [ ] Performance remains smooth (60fps target)
- [ ] Cyberpunk aesthetic is consistent
- [ ] Seamless integration with existing menu system

---

*This document serves as the implementation guide. Begin with Phase 1.*

