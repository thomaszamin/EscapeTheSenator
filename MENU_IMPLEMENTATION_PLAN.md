# Menu System Implementation Plan

## Overview
Implement a main menu and pause menu system with proper state management for "Escape The Senator".

---

## Features

### 1. Main Menu
- **Title**: "ESCAPE THE SENATOR" with stylized design
- **Buttons**:
  - **Sandbox** - Enter the current sandbox experience
  - **Quit** - Close/redirect the application
- **Visual Style**: Consistent with existing cyberpunk aesthetic

### 2. Pause Menu (In-Game)
- **Trigger**: Press `ESC` while in sandbox mode
- **Displays**:
  - Game controls reference
  - **Resume** button - Return to gameplay
  - **Main Menu** button - Return to main menu
- **Behavior**: Pauses game updates while open

---

## State Management Architecture

### Game States
```
MAIN_MENU    → User at main menu (initial state)
PLAYING      → Actively in sandbox mode
PAUSED       → Game paused, pause menu visible
```

### State Transitions
```
MAIN_MENU  --[Sandbox Click]-->     PLAYING
PLAYING    --[ESC Press]-->         PAUSED
PAUSED     --[Resume Click]-->      PLAYING
PAUSED     --[Main Menu Click]-->   MAIN_MENU
PLAYING    --[Pointer Unlock]-->    (remains PLAYING, shows click-to-continue)
```

### State Manager Implementation

**Location**: `src/systems/GameStateManager.js`

```javascript
// State enum
export const GameState = {
    MAIN_MENU: 'main_menu',
    PLAYING: 'playing',
    PAUSED: 'paused'
};
```

**Responsibilities**:
- Track current game state
- Emit state change events via EventBus
- Validate state transitions
- Provide state query methods

---

## Component Changes

### 1. New Files

| File | Purpose |
|------|---------|
| `src/systems/GameStateManager.js` | Central state management |
| `src/ui/MainMenu.js` | Main menu UI logic |
| `src/ui/PauseMenu.js` | Pause menu UI logic |

### 2. Modified Files

| File | Changes |
|------|---------|
| `index.html` | Add main menu and pause menu DOM structure |
| `styles/main.css` | Add menu styling |
| `src/systems/EventBus.js` | Add new state events |
| `src/core/Engine.js` | Integrate GameStateManager |
| `src/systems/InputManager.js` | Handle ESC for pause toggle |
| `src/main.js` | Initialize with main menu state |

---

## Implementation Steps

### Phase 1: State Infrastructure
1. **Create GameStateManager**
   - Define state enum
   - Implement state transition logic
   - Connect to EventBus

2. **Add Events to EventBus**
   ```javascript
   STATE_CHANGE: 'state:change',
   MENU_MAIN_SHOW: 'menu:main:show',
   MENU_MAIN_HIDE: 'menu:main:hide',
   MENU_PAUSE_SHOW: 'menu:pause:show',
   MENU_PAUSE_HIDE: 'menu:pause:hide',
   ```

### Phase 2: UI Components
3. **Add HTML Structure**
   - Main menu container with title + buttons
   - Pause menu overlay with controls + buttons

4. **Add CSS Styles**
   - Menu containers (centered, dark background)
   - Button styles (hover effects, transitions)
   - Animation for menu appear/disappear

### Phase 3: Integration
5. **Create MainMenu.js**
   - Handle Sandbox button → transition to PLAYING
   - Handle Quit button → close/redirect

6. **Create PauseMenu.js**
   - Handle Resume → transition to PLAYING
   - Handle Main Menu → transition to MAIN_MENU

7. **Update Engine.js**
   - Initialize GameStateManager
   - React to state changes
   - Control game loop based on state

8. **Update InputManager.js**
   - ESC key toggles pause when PLAYING
   - Prevent default ESC pointer unlock behavior when needed

### Phase 4: Polish
9. **Test state transitions**
10. **Ensure pointer lock behavior correct**
11. **Verify game pause/resume correctly**

---

## Detailed Component Specifications

### GameStateManager.js
```javascript
class GameStateManager {
    constructor() {
        this.currentState = GameState.MAIN_MENU;
    }
    
    setState(newState) {
        const oldState = this.currentState;
        this.currentState = newState;
        globalEvents.emit(Events.STATE_CHANGE, { from: oldState, to: newState });
    }
    
    getState() {
        return this.currentState;
    }
    
    isPlaying() {
        return this.currentState === GameState.PLAYING;
    }
    
    isPaused() {
        return this.currentState === GameState.PAUSED;
    }
    
    isInMenu() {
        return this.currentState === GameState.MAIN_MENU;
    }
}
```

### MainMenu.js
- Get DOM element references
- Attach click handlers to buttons
- Show/hide based on state events
- Sandbox button: `gameStateManager.setState(GameState.PLAYING)`
- Quit button: `window.close()` or redirect

### PauseMenu.js
- Get DOM element references
- Attach click handlers to buttons
- Show/hide based on state events
- Display controls reference
- Resume: `gameStateManager.setState(GameState.PLAYING)`
- Main Menu: `gameStateManager.setState(GameState.MAIN_MENU)`

---

## HTML Structure

```html
<!-- Main Menu -->
<div id="main-menu">
    <div class="menu-content">
        <h1>ESCAPE THE SENATOR</h1>
        <div class="menu-buttons">
            <button id="btn-sandbox">SANDBOX</button>
            <button id="btn-quit">QUIT</button>
        </div>
    </div>
</div>

<!-- Pause Menu -->
<div id="pause-menu" class="hidden">
    <div class="menu-content">
        <h2>PAUSED</h2>
        <div class="controls-display">
            <!-- Control keys list -->
        </div>
        <div class="menu-buttons">
            <button id="btn-resume">RESUME</button>
            <button id="btn-main-menu">MAIN MENU</button>
        </div>
    </div>
</div>
```

---

## ESC Key Behavior

### Current Behavior
- ESC releases pointer lock
- Instructions overlay shown

### New Behavior
- **PLAYING state + Pointer locked**: ESC → Open pause menu, release pointer lock
- **PLAYING state + Pointer unlocked**: Click to regain pointer lock
- **PAUSED state**: ESC → Resume game
- **MAIN_MENU state**: ESC → No action

### Implementation
1. Listen for ESC keydown in InputManager
2. Check current game state
3. Dispatch appropriate state change
4. Prevent default only when needed

---

## State-Dependent UI Visibility

| State | Main Menu | Pause Menu | Instructions | Crosshair | Game Canvas |
|-------|-----------|------------|--------------|-----------|-------------|
| MAIN_MENU | ✓ Visible | Hidden | Hidden | Hidden | Hidden/Dimmed |
| PLAYING (locked) | Hidden | Hidden | Hidden | ✓ Visible | ✓ Visible |
| PLAYING (unlocked) | Hidden | Hidden | ✓ Visible | Hidden | ✓ Visible |
| PAUSED | Hidden | ✓ Visible | Hidden | Hidden | ✓ Visible (frozen) |

---

## Testing Checklist

- [ ] Main menu shows on page load
- [ ] Sandbox button starts gameplay
- [ ] Quit button closes/redirects
- [ ] ESC opens pause menu during gameplay
- [ ] Resume returns to gameplay
- [ ] Main Menu button returns to main menu
- [ ] Game properly pauses (no updates)
- [ ] Pointer lock works correctly in all states
- [ ] Controls display correctly in pause menu
- [ ] Smooth transitions between states
- [ ] No memory leaks on state changes

---

## Notes

- The existing `#instructions` overlay will be repurposed for the "click to continue" state when pointer is unlocked during PLAYING
- Main menu is a new full-screen overlay that covers the canvas
- Pause menu is a semi-transparent overlay over the game
- Game state persists when going to pause menu (player position, etc.)
- Going to main menu should NOT reset game state (user can resume)

---

*Implementation follows existing architecture patterns: event-driven, modular, separation of concerns.*

