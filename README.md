# Procedural Koi — Three.js

A WebGL procedural koi simulation. Three.js draws colorful generated koi patterns, dynamic fish geometry, subtle shadows, a procedural pond bed, and refractive click ripples at a fixed 480 × 270 resolution.


https://github.com/user-attachments/assets/34549f7d-41cf-4cf6-af0a-95074bc631d2


## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tune

Edit `src/config.ts` to change fish counts and sizes, koi colors, water colors,
lotus leaves, flowers, and shadow strength.

## Controls

- Click or tap to call the fish.
- Press `Space` to scatter them.
- Press `[` or `]` to change the fish count.
- Press `D` to show the procedural spine.
- Press `H` to hide the interface.
- Press `R` to reset the simulation.
