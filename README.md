# algo-visualizer

## Algo Visualizer (C/Wasm)

### Overview
This project visualizes grid-based pathfinding in the browser.
The path computation is implemented in C and compiled to WebAssembly.

### Tech Stack
- HTML / CSS / JavaScript (UI & Visualization)
- C (Pathfinding logic)
- WebAssembly (Performance-critical computation)
- GitHub Actions (CI build)
- GitHub Pages (Hosting)

### Architecture
JS(UI) -> WASM(C solver) -> JS(rendering)

### Why WebAssembly?
- Performance
- Environment-independent build via CI
- Clear separation of concerns
