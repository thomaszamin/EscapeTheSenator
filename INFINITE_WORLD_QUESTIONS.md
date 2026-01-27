# Infinite World Generation - Design Questions

Before implementing the infinite parkour world, I need to understand your vision better. Please answer the following questions to help me build exactly what you want.

---

## 🗺️ World Layout & Direction

### Q1: What does "generally straight" mean to you?
- **A)** Perfectly straight corridor - always forward
- **B)** Slight curves/bends - like a winding road
- **C)** Occasional turns - player must turn 90° sometimes
- **D)** Something else? (describe)

### Q2: Camera perspective?
- **A)** First-person (like the current sandbox)
- **B)** Third-person behind the player
- **C)** Side-scroller view (2.5D style)

---

## 🏃 Parkour Elements

### Q3: What types of platforms/obstacles do you want?
Select all that apply:
- [x] **Basic platforms** - Simple jumping between blocks
- [ ] **Moving platforms** - Platforms that slide or rotate
- [ ] **Disappearing platforms** - Platforms that fade after you land
- [x] **Bouncy/launch pads** - Spring you higher/further
- [x] **Wall-running segments** - Run along walls
- [ ] **Gaps/voids** - Sections you must jump over
- [x] **Stairs/ramps** - Varying height progressions
- [ ] **Narrow beams** - Precision balance sections
- [ ] **Swinging elements** - Ropes, pendulums
- [ ] Other: ___________

### Q4: Platform spacing?
- **A)** Tight/compact - lots of small quick jumps
- **B)** Spread out - big jumps with room to breathe
- **C)** Mix of both - varies with difficulty

---

## 📈 Difficulty & Progression

### Q5: Should difficulty increase over time?
- **A)** Yes - starts easy, gets progressively harder
- **B)** No - consistent difficulty throughout
- **C)** Wave-based - cycles between easy and hard sections

### Q6: What happens when the player falls?
- **A)** Instant death - restart from beginning
- **B)** Checkpoint system - respawn at last checkpoint
- **C)** No fall death - teleport back to last safe platform
- **D)** Lives system - limited respawns

---

## 🎯 Objectives & Scoring

### Q7: What's the goal/purpose?
- **A)** Distance traveled - go as far as possible
- **B)** Time-based - survive as long as possible
- **C)** Collect items - gather pickups along the way
- **D)** Escape something - being chased by an entity
- **E)** Story-driven - reach certain milestones
- **F)** Combination: ___________

### Q8: Do you want a scoring system?
- **A)** Yes - show score/distance during gameplay
- **B)** Yes - but only show at game over
- **C)** No scoring - just the experience

### Q9: Should there be collectibles/powerups?
- **A)** No - pure parkour
- **B)** Yes - coins/points items
- **C)** Yes - powerups (speed boost, higher jump, etc.)
- **D)** Yes - both coins AND powerups

---

## 🎨 Visual Style

### Q10: What aesthetic/theme for the world?
- **A)** Cyberpunk/neon - matches current menu style
- **B)** Abstract/minimal - simple geometric shapes
- **C)** Space/void - floating platforms in space
- **D)** Nature/organic - floating islands, vines
- **E)** Industrial/factory - pipes, machinery, metal
- **F)** Glitch/digital - matrix-like, data corruption visual
- **G)** Other: ___________

### Q11: Day/night or lighting preferences?
- **A)** Dark with glowing elements
- **B)** Bright and colorful
- **C)** Dynamic lighting that changes
- **D)** No preference

---

## ⚡ Movement & Speed

### Q12: Player movement style?
- **A)** Auto-run - player always moves forward automatically
- **B)** Manual control - player controls all movement (WASD)
- **C)** Hybrid - auto-run but can slow down/speed up

### Q13: Base movement speed?
- **A)** Fast-paced - quick reflexes required
- **B)** Moderate - balanced timing
- **C)** Slow and methodical - precision over speed

### Q14: Additional movement abilities?
- [ ] Double jump
- [ ] Dash/air dash
- [ ] Wall jump
- [ ] Slide/crouch slide
- [ ] Grappling hook
- [ ] Gliding
- [ ] Other: ___________

---

## 🔧 Technical Preferences

### Q15: How should the world generate?
- **A)** Procedural/random - different every time
- **B)** Semi-random - patterns that repeat with variations
- **C)** Hand-crafted chunks - designed sections that connect randomly
- **D)** Seeded random - same seed = same world

### Q16: Performance priority?
- **A)** Smooth performance - simpler visuals ok
- **B)** Visual quality - some frame drops acceptable
- **C)** Balance both

---

## 🎮 Game Feel

### Q17: What games inspire this vision?
Examples: Temple Run, Subway Surfers, Mirror's Edge, Super Meat Boy, Celeste, Geometry Dash, etc.

Answer: ___________

### Q18: Any specific features or mechanics you definitely want?
(Free form - describe anything not covered above)

___________

### Q19: Any features you definitely DON'T want?
(Things to avoid)

___________

---

## Quick Summary Template

Feel free to copy and fill this out:

```
Q1 (Direction): B
Q2 (Camera): A
Q3 (Platforms): selected all that applied
Q4 (Spacing): C
Q5 (Difficulty): B
Q6 (Fall): A
Q7 (Goal): For now there is no goal, just implement it
Q8 (Scoring): C
Q9 (Collectibles): A
Q10 (Visual): A
Q11 (Lighting): D
Q12 (Movement): Current movement mechanics
Q13 (Speed): Current movement mechanics
Q14 (Abilities): Current movement mechanics
Q15 (Generation): B
Q16 (Performance): A
Q17 (Inspiration): Mirrors Edge
Q18 (Must have): N/A
Q19 (Must avoid): N/A
```

---

*Once you answer these questions, I'll create a detailed implementation plan and start building!*

