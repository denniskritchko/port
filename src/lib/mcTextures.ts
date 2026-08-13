/**
 * Procedural 16×16 Minecraft-style block textures.
 *
 * Every texture is drawn pixel-by-pixel onto a 16×16 canvas and uploaded with
 * NearestFilter, which is the whole trick behind the Minecraft look: chunky,
 * un-smoothed texels that stay crisp no matter how close the camera gets.
 *
 * Nothing is fetched from the network — the whole texture pack is generated at
 * runtime in a few milliseconds, so the scene has zero image dependencies.
 */
import * as THREE from 'three'

export const TILE = 16

/** Deterministic PRNG so every reload draws an identical texture pack. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type RGB = [number, number, number]

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))
const lift = (c: RGB, d: number): RGB => [c[0] + d, c[1] + d, c[2] + d]
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/** A 16×16 pixel canvas plus the handful of drawing primitives block art needs. */
class Tile {
  readonly canvas: HTMLCanvasElement
  readonly rand: () => number
  private ctx: CanvasRenderingContext2D

  constructor(seed: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = TILE
    this.canvas.height = TILE
    this.ctx = this.canvas.getContext('2d')!
    this.rand = mulberry32(seed)
  }

  px(x: number, y: number, c: RGB, alpha = 1) {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return
    this.ctx.fillStyle = `rgba(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])},${alpha})`
    this.ctx.fillRect(x, y, 1, 1)
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, alpha = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c, alpha)
  }

  clear() {
    this.ctx.clearRect(0, 0, TILE, TILE)
  }

  /** Flat base colour with per-pixel brightness jitter — the classic block grain. */
  noise(base: RGB, amount: number) {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        this.px(x, y, lift(base, (this.rand() * 2 - 1) * amount))
      }
    }
  }

  /** Scatter `n` blobs of `c` — used for cobble lumps, moss, glow clusters. */
  blobs(n: number, c: RGB, size: number, jitter = 10) {
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(this.rand() * TILE)
      const cy = Math.floor(this.rand() * TILE)
      const r = size * (0.6 + this.rand() * 0.8)
      for (let y = -3; y <= 3; y++) {
        for (let x = -3; x <= 3; x++) {
          if (Math.hypot(x, y) > r) continue
          const t = lift(c, (this.rand() * 2 - 1) * jitter)
          this.px((cx + x + TILE) % TILE, (cy + y + TILE) % TILE, t)
        }
      }
    }
  }

  /**
   * Horizontal courses of bricks with mortar lines, offset row by row.
   * Drives stone_bricks, bricks and cut_sandstone.
   */
  courses(base: RGB, mortar: RGB, rowH: number, jitter: number) {
    this.noise(base, jitter)
    for (let row = 0; row * rowH < TILE; row++) {
      const y = row * rowH + rowH - 1
      this.rect(0, y, TILE, 1, mortar)
      // Vertical joint, staggered every other course.
      const jx = row % 2 === 0 ? TILE / 2 - 1 : TILE - 1
      this.rect(jx, row * rowH, 1, rowH, mortar)
      if (row % 2 === 1) this.rect(TILE / 4 - 1, row * rowH, 1, rowH, mortar)
    }
  }

  /** Vertical wood grain used by planks and logs. */
  grain(base: RGB, dark: RGB, streaks: number) {
    for (let i = 0; i < streaks; i++) {
      const x = Math.floor(this.rand() * TILE)
      const y0 = Math.floor(this.rand() * TILE)
      const len = 3 + Math.floor(this.rand() * 10)
      for (let y = y0; y < y0 + len; y++) {
        this.px(x, y % TILE, mix(base, dark, 0.35 + this.rand() * 0.4))
      }
    }
  }
}

// ─── Texture painters ───────────────────────────────────────────────────────
// Warm off-white palette: sandstone / oak / stone brick, matching the site's
// #f7f5f0 background and #c8b89a accent rather than Minecraft's stock greys.

const SAND: RGB = [222, 212, 170]
const SAND_DARK: RGB = [196, 184, 141]
const STONE: RGB = [138, 137, 132]
const OAK: RGB = [166, 133, 80]
const OAK_DARK: RGB = [118, 91, 49]
const SPRUCE: RGB = [116, 86, 51]

type Painter = (t: Tile) => void

const PAINTERS: Record<string, Painter> = {
  // ── Sandstone family — the tower shell ──
  sandstone: t => {
    t.noise(SAND, 9)
    for (let y = 0; y < TILE; y++) if (t.rand() < 0.3) t.rect(0, y, TILE, 1, SAND_DARK, 0.35)
    t.rect(0, 0, TILE, 1, SAND_DARK, 0.5)
  },
  sandstone_top: t => t.noise(lift(SAND, 6), 7),
  smooth_sandstone: t => t.noise(lift(SAND, 4), 4),
  cut_sandstone: t => {
    t.noise(SAND, 7)
    // Two-by-two carved panels.
    for (const oy of [0, 8]) {
      for (const ox of [0, 8]) {
        t.rect(ox, oy, 8, 1, SAND_DARK)
        t.rect(ox, oy + 7, 8, 1, SAND_DARK)
        t.rect(ox, oy, 1, 8, SAND_DARK)
        t.rect(ox + 7, oy, 1, 8, SAND_DARK)
        t.rect(ox + 1, oy + 1, 6, 1, lift(SAND, 12), 0.6)
      }
    }
  },
  chiseled_sandstone: t => {
    t.noise(SAND, 6)
    t.rect(0, 0, TILE, 1, SAND_DARK)
    t.rect(0, TILE - 1, TILE, 1, SAND_DARK)
    t.rect(0, 0, 1, TILE, SAND_DARK)
    t.rect(TILE - 1, 0, 1, TILE, SAND_DARK)
    // Carved arch motif.
    const ink = lift(SAND_DARK, -22)
    t.rect(5, 4, 6, 1, ink)
    t.rect(4, 5, 1, 8, ink)
    t.rect(11, 5, 1, 8, ink)
    t.rect(7, 6, 2, 5, ink)
    t.rect(5, 12, 6, 1, ink)
  },

  // ── Stone family — the central column ──
  stone: t => t.noise(STONE, 15),
  cobblestone: t => {
    t.noise(lift(STONE, -34), 10)
    t.blobs(9, lift(STONE, 8), 2.6, 16)
  },
  stone_bricks: t => t.courses(STONE, lift(STONE, -34), 4, 9),
  mossy_stone_bricks: t => {
    t.courses(STONE, lift(STONE, -34), 4, 9)
    t.blobs(5, [96, 122, 66], 2.2, 18)
  },
  chiseled_stone_bricks: t => {
    t.noise(STONE, 8)
    const ink = lift(STONE, -36)
    t.rect(0, 0, TILE, 1, ink)
    t.rect(0, TILE - 1, TILE, 1, ink)
    t.rect(0, 0, 1, TILE, ink)
    t.rect(TILE - 1, 0, 1, TILE, ink)
    t.rect(4, 3, 8, 1, ink)
    t.rect(4, 12, 8, 1, ink)
    t.rect(7, 4, 2, 8, ink)
    t.rect(4, 7, 8, 1, ink)
  },
  polished_andesite: t => t.noise([146, 147, 145], 5),

  // ── Wood ──
  oak_planks: t => plankPainter(t, OAK, OAK_DARK),
  spruce_planks: t => plankPainter(t, SPRUCE, lift(SPRUCE, -28)),
  birch_planks: t => plankPainter(t, [199, 180, 126], [166, 146, 96]),
  dark_oak_planks: t => plankPainter(t, [74, 48, 22], [50, 31, 13]),
  oak_log: t => {
    t.noise([106, 84, 51], 10)
    t.grain([106, 84, 51], [66, 50, 26], 26)
    t.rect(0, 0, 1, TILE, [72, 55, 30], 0.5)
    t.rect(TILE - 1, 0, 1, TILE, [72, 55, 30], 0.5)
  },
  oak_log_top: t => {
    t.noise([176, 145, 87], 8)
    // Concentric growth rings.
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5)
        if (Math.round(d) % 3 === 0) t.px(x, y, lift([176, 145, 87], -26 + t.rand() * 8))
      }
    }
  },
  bookshelf: t => {
    plankPainter(t, OAK, OAK_DARK)
    t.rect(0, 3, TILE, 10, [58, 42, 24])
    const spines: RGB[] = [
      [150, 60, 55], [70, 90, 140], [90, 120, 70],
      [150, 120, 60], [120, 70, 110], [180, 160, 120],
    ]
    let x = 0
    while (x < TILE) {
      const w = 1 + Math.floor(t.rand() * 2)
      if (t.rand() > 0.13) {
        const c = spines[Math.floor(t.rand() * spines.length)]
        const top = 3 + Math.floor(t.rand() * 2)
        t.rect(x, top, w, 13 - top, lift(c, (t.rand() * 2 - 1) * 14))
        t.rect(x, top, w, 1, lift(c, 26))
      }
      x += w
    }
  },

  // ── Light sources ──
  glowstone: t => {
    t.noise([150, 118, 62], 12)
    t.blobs(7, [255, 231, 150], 2.2, 20)
    for (let i = 0; i < 14; i++) {
      t.px(Math.floor(t.rand() * TILE), Math.floor(t.rand() * TILE), [255, 246, 200])
    }
  },
  lantern: t => {
    t.noise([206, 200, 188], 8)
    t.rect(0, 0, TILE, 2, [92, 88, 82])
    t.rect(0, TILE - 2, TILE, 2, [92, 88, 82])
    t.rect(2, 2, 12, 12, [255, 214, 130])
    t.rect(4, 4, 8, 8, [255, 244, 196])
    for (const x of [2, 7, 13]) t.rect(x, 2, 1, 12, [92, 88, 82])
  },
  fire: t => {
    t.noise([214, 96, 30], 22)
    t.blobs(6, [255, 196, 74], 2.4, 26)
    t.blobs(3, [255, 240, 170], 1.4, 18)
  },

  // ── Decoration ──
  bricks: t => t.courses([152, 98, 84], [178, 166, 158], 4, 8),
  iron_block: t => {
    t.noise([214, 214, 214], 7)
    t.rect(0, 0, TILE, 1, [176, 176, 176])
    t.rect(0, TILE - 1, TILE, 1, [176, 176, 176])
    for (const p of [3, 12]) {
      t.rect(p, 3, 1, 10, [190, 190, 190])
      t.rect(3, p, 10, 1, [190, 190, 190])
    }
  },
  glass: t => {
    t.clear()
    const pane: RGB = [222, 243, 246]
    t.rect(0, 0, TILE, 1, pane, 0.9)
    t.rect(0, TILE - 1, TILE, 1, pane, 0.9)
    t.rect(0, 0, 1, TILE, pane, 0.9)
    t.rect(TILE - 1, 0, 1, TILE, pane, 0.9)
    t.rect(1, 1, 14, 14, pane, 0.14)
    for (let i = 0; i < 5; i++) t.px(3 + i, 4 + i, pane, 0.5)
    for (let i = 0; i < 3; i++) t.px(9 + i, 3 + i, pane, 0.35)
  },
}

function plankPainter(t: Tile, base: RGB, dark: RGB) {
  t.noise(base, 8)
  t.grain(base, dark, 18)
  // Four horizontal boards with staggered end joints.
  for (let row = 0; row < 4; row++) {
    const y = row * 4 + 3
    t.rect(0, y, TILE, 1, dark)
    const jx = [11, 4, 8, 1][row]
    t.rect(jx, row * 4, 1, 4, dark)
    t.rect(0, row * 4, TILE, 1, lift(base, 10), 0.35)
  }
}

/** Wool comes in many colours; generate them from one painter. */
const WOOLS: Record<string, RGB> = {
  white_wool: [232, 230, 224],
  light_gray_wool: [172, 168, 160],
  red_wool: [154, 60, 56],
  brown_wool: [120, 84, 52],
  blue_wool: [70, 86, 132],
  green_wool: [96, 118, 74],
}

export type TextureSet = Record<string, THREE.Texture>

/**
 * Build the full texture pack. Returns a name → THREE.Texture map ready to be
 * handed to the mesher.
 */
export function buildBlockTextures(anisotropy: number): TextureSet {
  const out: TextureSet = {}
  let seed = 1

  const register = (name: string, painter: Painter) => {
    const tile = new Tile(seed++ * 2654435761)
    painter(tile)
    const tex = new THREE.CanvasTexture(tile.canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestMipmapLinearFilter
    tex.generateMipmaps = true
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = anisotropy
    tex.needsUpdate = true
    out[name] = tex
  }

  for (const [name, painter] of Object.entries(PAINTERS)) register(name, painter)
  for (const [name, colour] of Object.entries(WOOLS)) {
    register(name, t => {
      t.noise(colour, 11)
      // Fibrous weave.
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(t.rand() * TILE)
        const y = Math.floor(t.rand() * TILE)
        t.px(x, y, lift(colour, 16))
        t.px((x + 1) % TILE, y, lift(colour, -14))
      }
    })
  }

  return out
}
