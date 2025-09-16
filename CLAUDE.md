# CLAUDE.md

## Project: Numberwang (Playable Edition)

This project is a browser-based game inspired by Mitchell & Webb’s "Numberwang" sketch.  
The spirit of the game is nonsense and randomness, but with enough rules to make it playable.

---

## Requirements

### Core Gameplay
- Two players.
- 10 rounds total.
- Each round is **10 seconds per player**.
- Each round presents ~12 numbers (mix of integers, decimals, irrational-like values: π, √2, e, etc.).
- Player clicks numbers to "call them out".
- Behind the scenes, the game decides if that number triggers **"That's Numberwang!"**
- If triggered:
  - The announcer text shows **"That's Numberwang!"**
  - Player scores 1 point.
  - Their turn ends immediately.
- If time runs out, no points are awarded.

### Numberwang Logic (the "mystery rule")
- Should feel arbitrary, but weighted:
  - ~20% random chance overall.
  - If number ends in 7 → guaranteed Numberwang.
  - If prime number → slightly higher chance.
  - If irrational value (π, √2, e) → slightly lower chance.
- Enough randomness to keep the game silly.

### Scoring
- 1 point for each Numberwang hit.
- After 10 rounds, highest score wins.
- If tied → sudden-death round ("Wangernumb"): whoever hits first wins.

---

## UI/UX
- Clean HTML/CSS layout:
  - Header with game title.
  - Scoreboard showing Player 1 vs Player 2.
  - Round/Timer display.
  - A grid of clickable numbers.
  - Announcer text area.
- Fun, bright colors to match the absurd tone.
- CSS animations for:
  - Numbers board shuffling.
  - Announcer shouting "That's Numberwang!" (flash effect).
- Optional: add silly in-between round messages ("Rotate the board!", "Reverse Wang!").

---

## Technical Implementation
- **HTML/CSS/JS only** (no frameworks).
- Use a single-page structure (`index.html`, `style.css`, `script.js`).
- Encapsulate game state in JS object:
  ```js
  {
    round: 1,
    currentPlayer: 1,
    scores: {1: 0, 2: 0},
    timer: 10,
    numbers: []
  }
