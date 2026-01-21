# Escape The Senator

A 3D first-person experience built with Three.js, featuring smooth FPS-style controls, physics-based movement, and a scalable architecture designed for future expansion.

![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## 🎮 Controls

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` | Move |
| `SHIFT` | Sprint |
| `SPACE` | Jump |
| `MOUSE` | Look around |
| `ESC` | Unlock cursor |
| `Click` | Lock cursor / Start |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Architecture

This project is built with scalability in mind, using a modular architecture that separates concerns:

```
src/
├── core/           # Engine and main loop
├── systems/        # Input, events, physics
├── entities/       # Player, camera, game objects
├── world/          # Environment, terrain, lighting
├── ui/             # HUD, menus, crosshair
└── config/         # Constants and configuration
```

### Key Systems

- **Engine** - Orchestrates the game loop and coordinates all systems
- **InputManager** - Handles keyboard/mouse with rebindable controls
- **EventBus** - Decoupled communication between systems
- **Player** - Physics-based movement with sprint and jump
- **FirstPersonCamera** - Smooth FPS camera with mouse look

## ✨ Features

- ✅ Smooth first-person camera controls
- ✅ WASD movement with sprint modifier
- ✅ Physics-based jumping with gravity
- ✅ Coyote time (grace period for jumping)
- ✅ Jump buffering (pre-land input)
- ✅ Pointer lock for immersive experience
- ✅ Modern lighting with shadows
- ✅ Atmospheric fog and particles
- ✅ Debug overlay with FPS counter
- ✅ Modular, scalable architecture

## 🗺️ Roadmap

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the full roadmap.

### Upcoming Features

- [ ] Collision detection with world geometry
- [ ] Asset loading system
- [ ] Multiple scenes/levels
- [ ] Interactive objects
- [ ] Audio system
- [ ] Enemy entities
- [ ] Health & inventory systems

## 🛠️ Development

### Adding New Features

1. **New Entity**: Create class in `src/entities/`, add to world via `world.addEntity()`
2. **New System**: Create in `src/systems/`, initialize in `Engine.init()`
3. **New World Element**: Add to `World.js` or create submodule in `src/world/`

### Configuration

All tunable values are in `src/config/Constants.js`:

- Movement speeds
- Physics values
- Camera settings
- Input bindings
- Lighting parameters

## 📄 License

MIT
