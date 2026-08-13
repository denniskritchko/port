/**
 * A tiny Minecraft-style voxel engine.
 *
 * `VoxelWorld` is a sparse map of integer cells → block name. `meshWorld` turns
 * it into geometry the way Minecraft itself does:
 *
 *   • only faces touching air are emitted (interior blocks cost nothing),
 *   • each vertex gets an ambient-occlusion term from its 3 diagonal neighbours
 *     (the standard 0fps.net algorithm), and
 *   • each vertex gets a baked light colour from nearby light-emitting blocks
 *     plus a sky term that fades with depth.
 *
 * Both land in the vertex colour, so the blocks render with an unlit
 * MeshBasicMaterial — exactly like Minecraft, and effectively free at runtime.
 */
import * as THREE from 'three'
import type { TextureSet } from './mcTextures'

// ─── Block registry ─────────────────────────────────────────────────────────

export interface BlockDef {
  /** Texture for every face, unless overridden below. */
  all?: string
  top?: string
  bottom?: string
  side?: string
  /** 0–15, Minecraft-style. Anything > 0 also renders at full brightness. */
  light?: number
  /** Doesn't hide the faces of the block behind it (glass). */
  transparent?: boolean
}

export const BLOCKS: Record<string, BlockDef> = {
  sandstone:             { top: 'sandstone_top', bottom: 'sandstone_top', side: 'sandstone' },
  smooth_sandstone:      { all: 'smooth_sandstone' },
  cut_sandstone:         { all: 'cut_sandstone' },
  chiseled_sandstone:    { top: 'sandstone_top', bottom: 'sandstone_top', side: 'chiseled_sandstone' },
  stone:                 { all: 'stone' },
  cobblestone:           { all: 'cobblestone' },
  stone_bricks:          { all: 'stone_bricks' },
  mossy_stone_bricks:    { all: 'mossy_stone_bricks' },
  chiseled_stone_bricks: { all: 'chiseled_stone_bricks' },
  polished_andesite:     { all: 'polished_andesite' },
  oak_planks:            { all: 'oak_planks' },
  spruce_planks:         { all: 'spruce_planks' },
  birch_planks:          { all: 'birch_planks' },
  dark_oak_planks:       { all: 'dark_oak_planks' },
  oak_log:               { top: 'oak_log_top', bottom: 'oak_log_top', side: 'oak_log' },
  bookshelf:             { top: 'oak_planks', bottom: 'oak_planks', side: 'bookshelf' },
  bricks:                { all: 'bricks' },
  iron_block:            { all: 'iron_block' },
  glowstone:             { all: 'glowstone', light: 15 },
  lantern:               { all: 'lantern', light: 14 },
  fire:                  { all: 'fire', light: 15 },
  glass:                 { all: 'glass', transparent: true },
  white_wool:            { all: 'white_wool' },
  light_gray_wool:       { all: 'light_gray_wool' },
  red_wool:              { all: 'red_wool' },
  brown_wool:            { all: 'brown_wool' },
  blue_wool:             { all: 'blue_wool' },
  green_wool:            { all: 'green_wool' },
}

// ─── World storage ──────────────────────────────────────────────────────────

/** Coordinates are clamped to ±256 so a cell packs into one safe integer. */
const OFF = 256
const SPAN = 512
const key = (x: number, y: number, z: number) =>
  ((x + OFF) * SPAN + (y + OFF)) * SPAN + (z + OFF)

export class VoxelWorld {
  readonly cells = new Map<number, string>()

  set(x: number, y: number, z: number, type: string) {
    this.cells.set(key(x | 0, y | 0, z | 0), type)
  }

  get(x: number, y: number, z: number): string | undefined {
    return this.cells.get(key(x | 0, y | 0, z | 0))
  }

  clear(x: number, y: number, z: number) {
    this.cells.delete(key(x | 0, y | 0, z | 0))
  }

  /** Solid box, inclusive of both corners. Pass `null` to erase instead. */
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, type: string | null) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
          if (type === null) this.clear(x, y, z)
          else this.set(x, y, z, type)
        }
      }
    }
  }

  /** Box shell only — the six outer faces, hollow inside. */
  shell(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, type: string) {
    const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)]
    const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)]
    const [az, bz] = [Math.min(z0, z1), Math.max(z0, z1)]
    for (let x = ax; x <= bx; x++) {
      for (let y = ay; y <= by; y++) {
        for (let z = az; z <= bz; z++) {
          const onEdge = x === ax || x === bx || y === ay || y === by || z === az || z === bz
          if (onEdge) this.set(x, y, z, type)
        }
      }
    }
  }

  /** Every light-emitting block currently placed, in world coordinates. */
  emitters(): Emitter[] {
    const out: Emitter[] = []
    for (const [k, type] of this.cells) {
      const level = BLOCKS[type]?.light ?? 0
      if (!level) continue
      const z = (k % SPAN) - OFF
      const rest = (k - (z + OFF)) / SPAN
      const y = (rest % SPAN) - OFF
      const x = (rest - (y + OFF)) / SPAN - OFF
      out.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5, level: level / 15 })
    }
    return out
  }
}

// ─── Baked lighting ─────────────────────────────────────────────────────────

export interface Emitter {
  x: number
  y: number
  z: number
  /** 0–1 */
  level: number
}

export interface LightOptions {
  /** Radius in blocks a full-strength emitter reaches. */
  radius: number
  ambient: THREE.Color
  /** Colour the open sky contributes at the top of the shaft. */
  sky: THREE.Color
  skyTop: number
  skyBottom: number
  /** Sky term never drops below this, so deep areas stay readable. */
  skyFloor: number
  torch: THREE.Color
}

export type LightSampler = (x: number, y: number, z: number, out: THREE.Color) => void

/**
 * Build a light sampler. Emitters are bucketed into a coarse spatial hash so
 * each vertex only tests the handful of lights that can possibly reach it.
 */
export function createLighting(emitters: Emitter[], o: LightOptions): LightSampler {
  const cell = o.radius
  const buckets = new Map<string, Emitter[]>()
  const bkey = (x: number, y: number, z: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`

  for (const e of emitters) {
    const k = bkey(e.x, e.y, e.z)
    const list = buckets.get(k)
    if (list) list.push(e)
    else buckets.set(k, [e])
  }

  const skySpan = Math.max(o.skyTop - o.skyBottom, 1)

  return (x, y, z, out) => {
    let level = 0
    const bx = Math.floor(x / cell)
    const by = Math.floor(y / cell)
    const bz = Math.floor(z / cell)
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          const list = buckets.get(`${bx + i},${by + j},${bz + k}`)
          if (!list) continue
          for (const e of list) {
            const d = Math.hypot(x - e.x, y - e.y, z - e.z)
            const r = o.radius * e.level
            if (d >= r) continue
            const f = 1 - d / r
            if (f > level) level = f
          }
        }
      }
    }
    // Smoothstep the falloff so light pools have soft edges.
    level = level * level * (3 - 2 * level)

    const t = Math.min(Math.max((y - o.skyBottom) / skySpan, 0), 1)
    const skyAmount = o.skyFloor + (1 - o.skyFloor) * Math.pow(t, 0.8)

    out.setRGB(
      Math.min(1, o.ambient.r + o.sky.r * skyAmount + o.torch.r * level),
      Math.min(1, o.ambient.g + o.sky.g * skyAmount + o.torch.g * level),
      Math.min(1, o.ambient.b + o.sky.b * skyAmount + o.torch.b * level),
    )
  }
}

// ─── Mesher ─────────────────────────────────────────────────────────────────

interface Face {
  n: [number, number, number]
  /** Minecraft's fixed per-direction brightness: top brightest, bottom darkest. */
  shade: number
  corners: [number, number, number][]
  uvs: [number, number][]
}

const FACES: Face[] = [
  { n: [ 1, 0, 0], shade: 0.62, corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], uvs: [[1,0],[1,1],[0,1],[0,0]] },
  { n: [-1, 0, 0], shade: 0.62, corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], uvs: [[1,0],[1,1],[0,1],[0,0]] },
  { n: [ 0, 1, 0], shade: 1.00, corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uvs: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [ 0,-1, 0], shade: 0.46, corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uvs: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [ 0, 0, 1], shade: 0.82, corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], uvs: [[0,0],[1,0],[1,1],[0,1]] },
  { n: [ 0, 0,-1], shade: 0.82, corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], uvs: [[0,0],[1,0],[1,1],[0,1]] },
]

/** Ambient-occlusion brightness for 0–3 exposed diagonals. */
const AO_LEVELS = [0.44, 0.66, 0.84, 1.0]

function faceTexture(def: BlockDef, faceIndex: number): string {
  if (faceIndex === 2) return def.top ?? def.side ?? def.all!
  if (faceIndex === 3) return def.bottom ?? def.side ?? def.all!
  return def.side ?? def.all!
}

interface Bucket {
  pos: number[]
  uv: number[]
  col: number[]
  idx: number[]
  verts: number
}

export interface MeshResult {
  group: THREE.Group
  /** Triangle count, handy for the loading readout. */
  triangles: number
  dispose(): void
}

/**
 * Turn a world into one Mesh per texture. `origin` shifts the sampled light
 * position, which lets detached props (door leaves) be built in local space
 * while still being lit as if they were standing where they belong.
 */
export function meshWorld(
  world: VoxelWorld,
  textures: TextureSet,
  light: LightSampler,
  origin: THREE.Vector3 = new THREE.Vector3(),
): MeshResult {
  const buckets = new Map<string, Bucket>()
  const bucketFor = (name: string) => {
    let b = buckets.get(name)
    if (!b) {
      b = { pos: [], uv: [], col: [], idx: [], verts: 0 }
      buckets.set(name, b)
    }
    return b
  }

  const solid = (x: number, y: number, z: number) => {
    const t = world.get(x, y, z)
    return t !== undefined && !BLOCKS[t]?.transparent
  }

  const lit = new THREE.Color()
  const ao = [0, 0, 0, 0]

  for (const [k, type] of world.cells) {
    const def = BLOCKS[type]
    if (!def) continue

    // Unpack the cell key back into coordinates.
    const z = (k % SPAN) - OFF
    const r1 = (k - (z + OFF)) / SPAN
    const y = (r1 % SPAN) - OFF
    const x = (r1 - (y + OFF)) / SPAN - OFF

    const emissive = (def.light ?? 0) > 0

    for (let f = 0; f < 6; f++) {
      const face = FACES[f]
      const nx = x + face.n[0]
      const ny = y + face.n[1]
      const nz = z + face.n[2]
      const neighbour = world.get(nx, ny, nz)
      // Hidden behind a solid block, or an interior seam between two panes.
      if (neighbour !== undefined && (!BLOCKS[neighbour]?.transparent || neighbour === type)) continue

      const bucket = bucketFor(faceTexture(def, f))
      const base = bucket.verts

      // Which two axes lie in the plane of this face.
      const planeAxes: number[] = []
      for (let a = 0; a < 3; a++) if (face.n[a] === 0) planeAxes.push(a)

      for (let c = 0; c < 4; c++) {
        const corner = face.corners[c]
        const vx = x + corner[0]
        const vy = y + corner[1]
        const vz = z + corner[2]

        // ── Ambient occlusion: sample the 3 neighbours diagonal to this vertex.
        let occ = 3
        if (!emissive) {
          const p: number[] = [nx, ny, nz]
          const s0 = corner[planeAxes[0]] ? 1 : -1
          const s1 = corner[planeAxes[1]] ? 1 : -1
          const a1 = p.slice(); a1[planeAxes[0]] += s0
          const a2 = p.slice(); a2[planeAxes[1]] += s1
          const ac = p.slice(); ac[planeAxes[0]] += s0; ac[planeAxes[1]] += s1
          const b1 = solid(a1[0], a1[1], a1[2]) ? 1 : 0
          const b2 = solid(a2[0], a2[1], a2[2]) ? 1 : 0
          const bc = solid(ac[0], ac[1], ac[2]) ? 1 : 0
          occ = b1 && b2 ? 0 : 3 - (b1 + b2 + bc)
        }
        ao[c] = occ

        // ── Baked light, sampled just outside the face.
        if (emissive) {
          lit.setRGB(1, 1, 1)
        } else {
          light(
            vx + origin.x + face.n[0] * 0.4,
            vy + origin.y + face.n[1] * 0.4,
            vz + origin.z + face.n[2] * 0.4,
            lit,
          )
        }

        const shade = emissive ? 1 : face.shade * AO_LEVELS[occ]
        bucket.pos.push(vx, vy, vz)
        bucket.uv.push(face.uvs[c][0], face.uvs[c][1])
        bucket.col.push(lit.r * shade, lit.g * shade, lit.b * shade)
      }

      // Flip the quad's diagonal when AO is stronger across the other one —
      // otherwise corners shade as an obvious lopsided triangle.
      if (ao[0] + ao[2] > ao[1] + ao[3]) {
        bucket.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base + 0)
      } else {
        bucket.idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
      }
      bucket.verts += 4
    }
  }

  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  let triangles = 0

  for (const [name, b] of buckets) {
    if (!b.verts) continue
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3))
    geo.setIndex(b.idx)
    geo.computeBoundingSphere()

    const map = textures[name]
    const transparent = name === 'glass'
    const mat = new THREE.MeshBasicMaterial({
      map,
      vertexColors: true,
      transparent,
      opacity: transparent ? 0.72 : 1,
      side: THREE.FrontSide,
      fog: true,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = true
    mesh.renderOrder = transparent ? 1 : 0
    group.add(mesh)

    geometries.push(geo)
    materials.push(mat)
    triangles += b.idx.length / 3
  }

  return {
    group,
    triangles,
    dispose() {
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
    },
  }
}
