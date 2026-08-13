/**
 * The stairwell: central column, sandstone shell, helical staircase and the
 * wall sconces that light the descent.
 */
import { VoxelWorld } from '../lib/voxel'
import {
  DOOR_H, DOOR_HALF_W, FLOOR_CELL, INNER_R, OUTER_R, PAINT_R, STEPS_PER_REV,
  STEP_ANGLE, TOP_Y, TOTAL_STEPS, WALL_T,
} from './layout'

const TAU = Math.PI * 2

/** Distance from the tower axis to the centre of cell (x, z). */
const radius = (x: number, z: number) => Math.hypot(x + 0.5, z + 0.5)

/** Bearing of cell (x, z), normalised to [0, 2π). */
function bearing(x: number, z: number) {
  const a = Math.atan2(z + 0.5, x + 0.5)
  return a < 0 ? a + TAU : a
}

/**
 * Ten wedge templates, one per step in a revolution. Together they tile the
 * ring between column and wall exactly once, so consecutive steps interlock
 * into a continuous spiral with no gaps and no overlap.
 */
function stairWedges() {
  const wedges: { x: number; z: number }[][] = Array.from({ length: STEPS_PER_REV }, () => [])
  const reach = Math.ceil(OUTER_R) + 1
  for (let x = -reach; x <= reach; x++) {
    for (let z = -reach; z <= reach; z++) {
      const r = radius(x, z)
      if (r < INNER_R || r >= OUTER_R) continue
      const k = Math.floor(bearing(x, z) / STEP_ANGLE) % STEPS_PER_REV
      wedges[k].push({ x, z })
    }
  }
  return wedges
}

/** Outermost empty cell along a bearing — i.e. flush against the wall. */
export function wallCell(world: VoxelWorld, angle: number, y: number) {
  for (let r = OUTER_R + 0.5; r > OUTER_R - 4; r -= 0.25) {
    const x = Math.floor(Math.cos(angle) * r)
    const z = Math.floor(Math.sin(angle) * r)
    if (!world.get(x, y, z)) return { x, z }
  }
  return null
}

export function buildTower(world: VoxelWorld) {
  const reach = Math.ceil(OUTER_R + WALL_T) + 1
  const wallOuter = OUTER_R + WALL_T

  // ── Shell and column, from the battlements down to the floor slab ──
  for (let y = TOP_Y; y >= FLOOR_CELL; y--) {
    for (let x = -reach; x <= reach; x++) {
      for (let z = -reach; z <= reach; z++) {
        const r = radius(x, z)

        if (r >= OUTER_R && r < wallOuter) {
          // Banded sandstone: a cut course every eight blocks reads as masonry
          // coursing when you sweep past it.
          const band = ((y % 8) + 8) % 8
          world.set(x, y, z, band === 0 ? 'cut_sandstone' : band === 4 ? 'smooth_sandstone' : 'sandstone')
        } else if (r < INNER_R) {
          const band = ((y % 10) + 10) % 10
          world.set(x, y, z, band === 0 ? 'chiseled_stone_bricks' : 'stone_bricks')
        }
      }
    }
  }

  // ── Crenellated rim, so the open top reads as a tower and not a cut-off tube ──
  for (let x = -reach; x <= reach; x++) {
    for (let z = -reach; z <= reach; z++) {
      const r = radius(x, z)
      if (r < OUTER_R || r >= wallOuter) continue
      const merlon = Math.floor(bearing(x, z) / (TAU / 32)) % 2 === 0
      if (merlon) {
        world.set(x, TOP_Y + 1, z, 'sandstone')
        world.set(x, TOP_Y + 2, z, 'cut_sandstone')
      }
    }
  }

  // ── Floor slab at the bottom of the shaft ──
  for (let x = -reach; x <= reach; x++) {
    for (let z = -reach; z <= reach; z++) {
      const r = radius(x, z)
      if (r >= wallOuter) continue
      if (r < INNER_R) continue
      // Concentric rings of polished stone with a darker inlay.
      const ring = Math.floor(r) % 3
      world.set(x, FLOOR_CELL, z, ring === 0 ? 'polished_andesite' : ring === 1 ? 'stone' : 'cut_sandstone')
    }
  }

  // ── Staircase ──
  const wedges = stairWedges()
  for (let step = 0; step < TOTAL_STEPS; step++) {
    const cells = wedges[step % STEPS_PER_REV]
    const yTop = -step - 1
    for (const { x, z } of cells) {
      const r = radius(x, z)
      // Oak treads with a darker border where they meet column and wall.
      const edge = r < INNER_R + 1.3 || r > OUTER_R - 1.3
      world.set(x, yTop, z, edge ? 'spruce_planks' : 'oak_planks')
      world.set(x, yTop - 1, z, 'spruce_planks')
    }
  }

  // ── Wall sconces every other step ──
  for (let step = 2; step < TOTAL_STEPS; step += 2) {
    const angle = (step + 0.5) * STEP_ANGLE
    const bracketY = -step + 2
    const bracket = wallCell(world, angle, bracketY)
    const lampCell = wallCell(world, angle, bracketY + 1)
    if (bracket) world.set(bracket.x, bracketY, bracket.z, 'oak_log')
    if (lampCell) world.set(lampCell.x, bracketY + 1, lampCell.z, 'glowstone')
  }
}

/** Treads are never cut into by a niche — a painting must never eat the stairs. */
const STAIR_BLOCKS = new Set(['oak_planks', 'spruce_planks'])

/**
 * Flatten the curved wall behind a painting.
 *
 * The canvas is a flat plane but the wall is a voxelised circle, so blocks that
 * poke in front of the plane are cleared and the space behind is packed with
 * sandstone. That leaves a flat-faced alcove whose ragged edges are hidden by
 * the painting's own wooden border, with the surviving wall either side reading
 * as the jambs of a recess.
 *
 * The bearing is not axis-aligned, so a block whose *centre* clears the plane
 * can still have a *corner* in front of it — and a block whose centre sits
 * outside the canvas band can still overlap it. Both margins are the projection
 * of a unit cell onto the relevant canvas axis, which is what mAlong and mDepth
 * below are. Getting these wrong either clips the artwork or opens a hole
 * straight through the tower wall.
 */
export function carvePaintingNiche(
  world: VoxelWorld,
  angle: number,
  centreY: number,
  halfWidth: number,
  halfHeight: number,
) {
  const nx = Math.cos(angle)
  const nz = Math.sin(angle)
  const tx = -nz
  const tz = nx

  const mAlong = (Math.abs(tx) + Math.abs(tz)) / 2
  const mDepth = (Math.abs(nx) + Math.abs(nz)) / 2

  const clearBand = halfWidth + mAlong          // cells overlapping the canvas
  const sealBand  = clearBand + 2.5             // …plus the shoulder that re-seals it
  const face      = PAINT_R + mDepth + 0.05     // nothing in front of this stays
  const backTo    = face + 3

  const y0 = Math.floor(centreY - halfHeight)
  const y1 = Math.ceil(centreY + halfHeight) - 1
  const reach = Math.ceil(backTo) + 2

  for (let x = -reach; x <= reach; x++) {
    for (let z = -reach; z <= reach; z++) {
      const cx = x + 0.5
      const cz = z + 0.5
      const along = cx * tx + cz * tz
      const depth = cx * nx + cz * nz
      const radius = Math.hypot(cx, cz)
      if (Math.abs(along) > sealBand) continue
      if (depth < OUTER_R - 2 || depth > backTo) continue

      // One row past the canvas top and bottom, so the cut is capped rather
      // than left open to the void outside the shell.
      for (let y = y0 - 1; y <= y1 + 1; y++) {
        const here = world.get(x, y, z)
        if (here && STAIR_BLOCKS.has(here)) continue

        const inCanvas = y >= y0 && y <= y1 && Math.abs(along) <= clearBand && depth < face
        if (inCanvas) {
          world.clear(x, y, z)
        } else if (radius >= OUTER_R || depth >= face) {
          world.set(x, y, z, 'sandstone')
        }
      }
    }
  }
}

/** Punch the doorway through the tower wall on the +Z axis. */
export function carveDoorway(world: VoxelWorld, floorY: number) {
  for (let x = -DOOR_HALF_W; x < DOOR_HALF_W; x++) {
    for (let y = floorY; y < floorY + DOOR_H; y++) {
      for (let z = 6; z <= 14; z++) world.clear(x, y, z)
    }
  }

  // Dress the opening with an oak frame and a lintel.
  for (let y = floorY; y < floorY + DOOR_H; y++) {
    for (let z = 10; z <= 12; z++) {
      world.set(-DOOR_HALF_W - 1, y, z, 'oak_log')
      world.set(DOOR_HALF_W, y, z, 'oak_log')
    }
  }
  for (let x = -DOOR_HALF_W - 1; x <= DOOR_HALF_W; x++) {
    for (let z = 10; z <= 12; z++) world.set(x, floorY + DOOR_H, z, 'oak_log')
  }
  world.set(-DOOR_HALF_W - 2, floorY + DOOR_H, 11, 'glowstone')
  world.set(DOOR_HALF_W + 1, floorY + DOOR_H, 11, 'glowstone')
}
