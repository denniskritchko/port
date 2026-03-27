# Dennis Kritchko — Portfolio

Personal portfolio site featuring an interactive 3D spiral staircase built with React, Three.js, and TypeScript.

## Tech Stack

- **React 19** + TypeScript
- **Three.js** — 3D staircase scene, PBR materials, scroll-driven camera, raycasting
- **Vite** — dev server and production build
- **Tailwind CSS 4** — utility styling for overlays and modals

## Features

- Cinematic swoop intro animation descending into the staircase
- Scroll-snapped navigation: each scroll step moves the camera from one project painting to the next
- Per-project paintings with real project images, correct aspect ratios, and emissive glow illuminating surrounding walls
- FitPicifiy displayed as a double-wide diptych (two screenshots side by side)
- Mutect painting uses YouTube thumbnail; clicking opens a GitHub + demo video link
- Adaptive lerp camera: snaps instantly on fast scroll to avoid perspective warping
- PBR texture materials: stained pine treads, cracked concrete column, sandstone brick outer wall
- Floor cap uses matching pine wood texture
- Gold frame bars around each painting
- Click any painting to open a project detail modal

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview production build
npm run lint      # ESLint
```

## Project Structure

```
src/
├── App.tsx                    # Root layout, project data, modal
├── components/
│   └── StaircaseScene.tsx     # Three.js scene — all 3D logic
├── assets/                    # Textures, project images
└── index.css                  # Tailwind import, scroll-snap, base resets
```
