# Dennis Kritchko — Portfolio

Personal portfolio site: an interactive Minecraft-style voxel world built with React, Three.js and TypeScript. You spiral down a blocky sandstone tower past five project paintings, then walk through a double door into a bedroom at the bottom.

## Tech Stack

- **React 19** + TypeScript
- **Three.js** — voxel world, baked lighting, scroll-driven camera, raycasting
- **Vite** — dev server and production build
- **Tailwind CSS 4** — utility styling for overlays and modals

## How the Minecraft rendering works

There are no lights in the scene and no texture files in the repo. Both are the point.

- **Procedural texture pack** (`src/lib/mcTextures.ts`) — every block texture is drawn pixel-by-pixel onto a 16×16 canvas at load time and uploaded with `NearestFilter`. Sandstone, stone brick, oak planks, bookshelves, glowstone and wool are all generated from a seeded PRNG, so the pack is identical on every load and ships as zero bytes.
- **Face meshing with ambient occlusion** (`src/lib/voxel.ts`) — the world is a sparse map of integer cells. Only faces touching air are emitted, each vertex gets an AO term from its three diagonal neighbours (the standard voxel AO algorithm), and each gets a baked light colour from nearby glowing blocks plus a sky term that fades with depth. All of it lands in the vertex colour, so blocks render with an unlit `MeshBasicMaterial` — exactly how Minecraft draws a chunk, and effectively free at runtime.
- **Minecraft face shading** — top faces render brightest, sides dimmer, undersides darkest, baked in alongside the AO.

The whole world is ~31,000 blocks and meshes down to ~86,000 triangles across 25 draw calls.

## Features

- Cinematic swoop intro dropping into the top of the tower
- Ten scroll-snapped sections, one per camera anchor: the hero, five paintings, the foot of the stairs, the doorway, the threshold, the bedroom
- Project paintings hang in flat alcoves carved out of the round wall, sized to fit the clear span between two passes of the staircase so the stairs never clip a canvas
- Screenshots are downsampled and given a hand-drawn wooden border, so they read as Minecraft paintings rather than photos on a wall
- FitPicifiy keeps its double-wide diptych; Mutect links to a demo video as well as GitHub
- Click any painting to open the project detail modal
- A double oak door swings open as the camera comes off the stairs and glides into the bedroom
- Field of view widens on narrow viewports so the paintings stay in frame

## Editing the bedroom

`src/world/bedroom.ts` is written to be edited. It is plain block placement on an integer grid:

```ts
world.set(x, y, z, 'oak_planks')                     // one block
world.fill(x0, y0, z0, x1, y1, z1, 'red_wool')       // solid box, inclusive
world.fill(x0, y0, z0, x1, y1, z1, null)             // erase a box
world.shell(x0, y0, z0, x1, y1, z1, 'stone_bricks')  // hollow box
```

Coordinates, facing into the room from the doorway:

| axis | range                                  |
|------|----------------------------------------|
| `x`  | −20 (left wall) … +19 (right wall)     |
| `z`  | 12 (doorway end) … 47 (far wall)       |
| `y`  | −92 (floor surface) … −79 (below ceiling) |

Block names live in `BLOCKS` in `src/lib/voxel.ts`; add one there and it is immediately available. Anything with `light` set glows and is baked into the vertex lighting automatically.

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build (outputs to docs/ for GitHub Pages)
npm run preview   # preview production build
npm run lint      # ESLint
```

## Project Structure

```
src/
├── App.tsx                    # Root layout, project data, modal
├── components/
│   └── StaircaseScene.tsx     # Scene assembly, paintings, door, render loop
├── lib/
│   ├── mcTextures.ts          # Procedural 16×16 block textures
│   └── voxel.ts               # Block registry, world storage, lighting bake, mesher
├── world/
│   ├── layout.ts              # Shared dimensions for the whole build
│   ├── tower.ts               # Stairwell: column, shell, spiral stairs, sconces
│   ├── bedroom.ts             # The room at the bottom — edit this one
│   └── journey.ts             # Camera path and scroll anchors
├── assets/                    # Project screenshots
└── index.css                  # Tailwind import, scroll-snap, base resets
```
