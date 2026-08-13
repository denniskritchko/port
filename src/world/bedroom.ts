/**
 * The bedroom at the bottom of the stairwell.
 *
 * ─── Editing this room ──────────────────────────────────────────────────────
 * Everything below is plain block placement on an integer grid, so you can
 * rearrange it freely:
 *
 *   world.set(x, y, z, 'oak_planks')                    one block
 *   world.fill(x0, y0, z0, x1, y1, z1, 'red_wool')      solid box (inclusive)
 *   world.fill(x0, y0, z0, x1, y1, z1, null)            erase a box
 *   world.shell(x0, y0, z0, x1, y1, z1, 'stone_bricks') hollow box
 *
 * Coordinates, with the tower doorway at the origin end of the room:
 *
 *   x   -20 (left wall) … +19 (right wall)     — facing into the room
 *   z    12 (doorway end) … 47 (far wall)
 *   y   -90 (floor surface) … -77 (below the ceiling)
 *
 * Block names live in BLOCKS in `src/lib/voxel.ts`; add a new one there and it
 * is instantly available here. Anything with `light` set glows and is baked
 * into the vertex lighting automatically.
 */
import { VoxelWorld } from '../lib/voxel'
import {
  FLOOR_CELL, FLOOR_Y, OUTER_R, ROOM_H, ROOM_X0, ROOM_X1, ROOM_Z0, ROOM_Z1,
} from './layout'

// Shell coordinates derived from the interior.
const WALL_L = ROOM_X0 - 1          // -21
const WALL_R = ROOM_X1 + 1          //  20
const WALL_BACK = ROOM_Z1 + 1       //  48
const CEIL = FLOOR_Y + ROOM_H       // -76, the ceiling slab
const TOP = FLOOR_Y + ROOM_H - 1    // -77, highest interior cell

// ─── Furniture layout — tweak these and everything below follows ────────────
const BED_X0 = -7
const BED_X1 = 6
const BED_Z0 = 32
const BED_Z1 = 46
const BED_POST_TOP = -80

const RUG_X0 = -12
const RUG_X1 = 11
const RUG_Z0 = 16
const RUG_Z1 = 30

const FIRE_Z0 = 22
const FIRE_Z1 = 28

export function buildBedroom(world: VoxelWorld) {
  buildShell(world)
  buildFloorAndCeiling(world)
  buildPillarsAndBeams(world)
  buildWindows(world)
  buildBed(world)
  buildFireplace(world)
  buildBookshelves(world)
  buildDesk(world)
  buildLighting(world)
}

// ─── Structure ──────────────────────────────────────────────────────────────

function buildShell(world: VoxelWorld) {
  // Side and back walls, banded like the tower so the two read as one build.
  for (let y = FLOOR_Y; y <= TOP; y++) {
    const band = ((y % 8) + 8) % 8
    const block = band === 0 ? 'cut_sandstone' : band === 4 ? 'smooth_sandstone' : 'sandstone'
    world.fill(WALL_L, y, ROOM_Z0 - 3, WALL_L, y, WALL_BACK, block)
    world.fill(WALL_R, y, ROOM_Z0 - 3, WALL_R, y, WALL_BACK, block)
    world.fill(WALL_L, y, WALL_BACK, WALL_R, y, WALL_BACK, block)

    // Front wall, packed into the wedge between the round tower and the room.
    // Cells that fall inside the shaft are left alone so the stairwell stays open.
    for (let x = WALL_L; x <= WALL_R; x++) {
      for (let z = 9; z <= ROOM_Z0 - 1; z++) {
        if (Math.hypot(x + 0.5, z + 0.5) < OUTER_R - 0.3) continue
        world.set(x, y, z, block)
      }
    }
  }
}

/**
 * Lay a full-footprint slab, skipping any cell that falls inside the stairwell
 * so the room never grows a floor or ceiling across the open shaft.
 */
function plate(world: VoxelWorld, y: number, type: string) {
  for (let x = WALL_L; x <= WALL_R; x++) {
    for (let z = ROOM_Z0 - 3; z <= WALL_BACK; z++) {
      if (z < ROOM_Z0 && Math.hypot(x + 0.5, z + 0.5) < OUTER_R - 0.3) continue
      world.set(x, y, z, type)
    }
  }
}

function buildFloorAndCeiling(world: VoxelWorld) {
  // Spruce boards underfoot, with a stone border along the walls.
  plate(world, FLOOR_CELL, 'spruce_planks')
  world.fill(WALL_L, FLOOR_CELL, ROOM_Z0, WALL_L + 1, FLOOR_CELL, WALL_BACK, 'polished_andesite')
  world.fill(WALL_R - 1, FLOOR_CELL, ROOM_Z0, WALL_R, FLOOR_CELL, WALL_BACK, 'polished_andesite')
  world.fill(WALL_L, FLOOR_CELL, WALL_BACK - 1, WALL_R, FLOOR_CELL, WALL_BACK, 'polished_andesite')

  // Rug, inlaid flush with the boards.
  world.fill(RUG_X0, FLOOR_CELL, RUG_Z0, RUG_X1, FLOOR_CELL, RUG_Z1, 'brown_wool')
  world.fill(RUG_X0 + 1, FLOOR_CELL, RUG_Z0 + 1, RUG_X1 - 1, FLOOR_CELL, RUG_Z1 - 1, 'red_wool')
  world.fill(RUG_X0 + 3, FLOOR_CELL, RUG_Z0 + 3, RUG_X1 - 3, FLOOR_CELL, RUG_Z1 - 3, 'brown_wool')

  // Runner leading in across the threshold.
  world.fill(-2, FLOOR_CELL, ROOM_Z0 - 4, 1, FLOOR_CELL, RUG_Z0 - 1, 'light_gray_wool')

  // Dark ceiling boards.
  plate(world, CEIL, 'dark_oak_planks')
}

function buildPillarsAndBeams(world: VoxelWorld) {
  // Oak columns down both long walls.
  for (let z = ROOM_Z0; z <= ROOM_Z1; z += 8) {
    world.fill(ROOM_X0, FLOOR_Y, z, ROOM_X0, TOP, z, 'oak_log')
    world.fill(ROOM_X1, FLOOR_Y, z, ROOM_X1, TOP, z, 'oak_log')
  }

  // Beams spanning the ceiling between them.
  for (let z = ROOM_Z0; z <= ROOM_Z1; z += 8) {
    world.fill(ROOM_X0, TOP, z, ROOM_X1, TOP, z, 'oak_log')
  }
}

function buildWindows(world: VoxelWorld) {
  // Two tall lights on the far wall, glazed over a bright cavity so they read
  // as daylight even though the room is ninety blocks underground.
  for (const [x0, x1] of [[-18, -11], [10, 17]] as const) {
    world.fill(x0, FLOOR_Y + 3, WALL_BACK, x1, FLOOR_Y + 10, WALL_BACK, 'glass')
    // Light well behind the glass. Only a scattering of the backing is glowstone
    // — a solid slab of it would flood the whole room to a flat maximum.
    world.fill(x0 - 1, FLOOR_Y + 2, WALL_BACK + 1, x1 + 1, FLOOR_Y + 11, WALL_BACK + 2, 'smooth_sandstone')
    for (let x = x0; x <= x1; x += 3) {
      for (let y = FLOOR_Y + 4; y <= FLOOR_Y + 10; y += 3) {
        world.set(x, y, WALL_BACK + 1, 'glowstone')
      }
    }
    // Oak surround.
    world.fill(x0 - 1, FLOOR_Y + 2, WALL_BACK, x1 + 1, FLOOR_Y + 2, WALL_BACK, 'oak_log')
    world.fill(x0 - 1, FLOOR_Y + 11, WALL_BACK, x1 + 1, FLOOR_Y + 11, WALL_BACK, 'oak_log')
    world.fill(x0 - 1, FLOOR_Y + 2, WALL_BACK, x0 - 1, FLOOR_Y + 11, WALL_BACK, 'oak_log')
    world.fill(x1 + 1, FLOOR_Y + 2, WALL_BACK, x1 + 1, FLOOR_Y + 11, WALL_BACK, 'oak_log')
    // Curtains.
    world.fill(x0 - 2, FLOOR_Y + 3, WALL_BACK - 1, x0 - 2, FLOOR_Y + 11, WALL_BACK - 1, 'blue_wool')
    world.fill(x1 + 2, FLOOR_Y + 3, WALL_BACK - 1, x1 + 2, FLOOR_Y + 11, WALL_BACK - 1, 'blue_wool')
  }
}

// ─── Furniture ──────────────────────────────────────────────────────────────

function buildBed(world: VoxelWorld) {
  // Frame and headboard.
  world.fill(BED_X0, FLOOR_Y, BED_Z0, BED_X1, FLOOR_Y + 1, BED_Z1, 'spruce_planks')
  world.fill(BED_X0, FLOOR_Y, BED_Z1, BED_X1, FLOOR_Y + 6, BED_Z1, 'dark_oak_planks')
  world.fill(BED_X0, FLOOR_Y, BED_Z1, BED_X0, FLOOR_Y + 6, BED_Z1, 'oak_log')
  world.fill(BED_X1, FLOOR_Y, BED_Z1, BED_X1, FLOOR_Y + 6, BED_Z1, 'oak_log')

  // Mattress, blanket, pillows.
  world.fill(BED_X0 + 1, FLOOR_Y + 2, BED_Z0 + 1, BED_X1 - 1, FLOOR_Y + 2, BED_Z1 - 1, 'white_wool')
  world.fill(BED_X0 + 1, FLOOR_Y + 3, BED_Z0 + 1, BED_X1 - 1, FLOOR_Y + 3, BED_Z1 - 6, 'red_wool')
  world.fill(BED_X0 + 2, FLOOR_Y + 3, BED_Z1 - 4, BED_X1 - 2, FLOOR_Y + 3, BED_Z1 - 2, 'white_wool')

  // Four posts and a canopy.
  for (const x of [BED_X0, BED_X1]) {
    for (const z of [BED_Z0, BED_Z1]) {
      world.fill(x, FLOOR_Y, z, x, BED_POST_TOP, z, 'oak_log')
    }
  }
  world.fill(BED_X0, BED_POST_TOP, BED_Z0, BED_X1, BED_POST_TOP, BED_Z0, 'oak_log')
  world.fill(BED_X0, BED_POST_TOP, BED_Z1, BED_X1, BED_POST_TOP, BED_Z1, 'oak_log')
  world.fill(BED_X0, BED_POST_TOP, BED_Z0, BED_X0, BED_POST_TOP, BED_Z1, 'oak_log')
  world.fill(BED_X1, BED_POST_TOP, BED_Z0, BED_X1, BED_POST_TOP, BED_Z1, 'oak_log')
  world.fill(BED_X0 + 1, BED_POST_TOP, BED_Z0 + 1, BED_X1 - 1, BED_POST_TOP, BED_Z1 - 1, 'red_wool')

  // Nightstands with a lantern on each.
  for (const x of [BED_X0 - 3, BED_X1 + 3]) {
    world.fill(x - 1, FLOOR_Y, BED_Z1 - 3, x + 1, FLOOR_Y + 1, BED_Z1 - 1, 'oak_planks')
    world.set(x, FLOOR_Y + 2, BED_Z1 - 2, 'lantern')
  }
}

function buildFireplace(world: VoxelWorld) {
  // Brick chimney breast set into the right-hand wall.
  world.fill(ROOM_X1, FLOOR_Y, FIRE_Z0, ROOM_X1, TOP, FIRE_Z1, 'bricks')
  world.fill(WALL_R, FLOOR_Y, FIRE_Z0, WALL_R + 2, CEIL, FIRE_Z1, 'bricks')

  // Firebox.
  world.fill(ROOM_X1, FLOOR_Y, FIRE_Z0 + 2, WALL_R + 1, FLOOR_Y + 4, FIRE_Z1 - 2, null)
  world.fill(WALL_R + 1, FLOOR_Y, FIRE_Z0 + 2, WALL_R + 1, FLOOR_Y + 4, FIRE_Z1 - 2, 'bricks')
  world.fill(ROOM_X1, FLOOR_Y, FIRE_Z0 + 2, WALL_R, FLOOR_Y, FIRE_Z1 - 2, 'fire')

  // Hearth and mantel.
  world.fill(ROOM_X1 - 1, FLOOR_CELL, FIRE_Z0 + 1, ROOM_X1 - 1, FLOOR_CELL, FIRE_Z1 - 1, 'polished_andesite')
  world.fill(ROOM_X1 - 1, FLOOR_Y + 5, FIRE_Z0, ROOM_X1, FLOOR_Y + 5, FIRE_Z1, 'oak_log')
}

function buildBookshelves(world: VoxelWorld) {
  // Two bays of shelving between the columns on the left-hand wall.
  for (const [z0, z1] of [[ROOM_Z0 + 1, ROOM_Z0 + 7], [ROOM_Z0 + 9, ROOM_Z0 + 15]] as const) {
    world.fill(ROOM_X0, FLOOR_Y, z0, ROOM_X0, FLOOR_Y + 6, z1, 'bookshelf')
    world.fill(ROOM_X0, FLOOR_Y + 7, z0, ROOM_X0, FLOOR_Y + 7, z1, 'oak_log')
  }
}

function buildDesk(world: VoxelWorld) {
  // Writing desk on the left wall, past the shelving.
  const z0 = ROOM_Z0 + 18
  world.fill(ROOM_X0, FLOOR_Y, z0, ROOM_X0 + 3, FLOOR_Y + 2, z0 + 5, 'oak_planks')
  world.fill(ROOM_X0, FLOOR_Y + 3, z0, ROOM_X0 + 4, FLOOR_Y + 3, z0 + 5, 'spruce_planks')
  world.set(ROOM_X0 + 4, FLOOR_Y + 4, z0 + 1, 'lantern')
  world.fill(ROOM_X0 + 1, FLOOR_Y + 4, z0 + 3, ROOM_X0 + 2, FLOOR_Y + 4, z0 + 4, 'bookshelf')

  // A pair of chests by the doorway.
  for (const x of [ROOM_X0 + 6, ROOM_X1 - 8]) {
    world.fill(x, FLOOR_Y, ROOM_Z0 + 1, x + 3, FLOOR_Y + 2, ROOM_Z0 + 4, 'oak_planks')
    world.fill(x, FLOOR_Y + 3, ROOM_Z0 + 1, x + 3, FLOOR_Y + 3, ROOM_Z0 + 4, 'dark_oak_planks')
    world.set(x + 1, FLOOR_Y + 2, ROOM_Z0, 'iron_block')
    world.set(x + 2, FLOOR_Y + 2, ROOM_Z0, 'iron_block')
  }
}

function buildLighting(world: VoxelWorld) {
  // Chandelier over the rug.
  const cz = Math.round((RUG_Z0 + RUG_Z1) / 2)
  world.fill(0, TOP - 1, cz, 0, TOP, cz, 'oak_log')
  world.fill(-1, TOP - 2, cz - 1, 1, TOP - 2, cz + 1, 'oak_log')
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    world.set(dx * 2, TOP - 2, cz + dz * 2, 'glowstone')
    world.set(dx, TOP - 3, cz + dz, 'glowstone')
  }

  // Wall lanterns down both sides, set into the masonry.
  for (let z = ROOM_Z0 + 4; z <= ROOM_Z1; z += 8) {
    world.set(ROOM_X0, FLOOR_Y + 8, z, 'lantern')
    world.set(ROOM_X1, FLOOR_Y + 8, z, 'lantern')
  }
  // And a pair either side of the door as you come in.
  world.set(-5, FLOOR_Y + 6, ROOM_Z0, 'lantern')
  world.set(4, FLOOR_Y + 6, ROOM_Z0, 'lantern')
}

/**
 * One leaf of the double door. Built in local space with the hinge at the
 * origin so the scene can swing it open; `mirror` flips it for the right leaf.
 */
export function buildDoorLeaf(mirror: boolean, height: number, width: number): VoxelWorld {
  const leaf = new VoxelWorld()
  const at = (x: number, y: number, type: string) => leaf.set(mirror ? -x - 1 : x, y, 0, type)

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const border = x === 0 || x === width - 1 || y === 0 || y === height - 1
      at(x, y, border ? 'oak_log' : 'oak_planks')
    }
  }

  // Glazed panel near the top, and an iron handle on the free edge.
  for (let x = 1; x < width - 1; x++) {
    for (let y = height - 4; y < height - 2; y++) at(x, y, 'glass')
  }
  at(width - 1, Math.floor(height / 2), 'iron_block')
  // Hinges on the hung edge.
  at(0, 1, 'iron_block')
  at(0, height - 2, 'iron_block')

  return leaf
}
