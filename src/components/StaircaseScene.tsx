import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { buildBlockTextures } from '../lib/mcTextures'
import { createLighting, meshWorld, VoxelWorld } from '../lib/voxel'
import type { Emitter, MeshResult } from '../lib/voxel'
import { buildBedroom, buildDoorLeaf } from '../world/bedroom'
import { doorSwing, journey, tFromScroll } from '../world/journey'
import { buildTower, carveDoorway, carvePaintingNiche } from '../world/tower'
import {
  DOOR_H, DOOR_HALF_W, DOOR_Z, FLOOR_Y, PAINT_ANGLE, PAINT_R, PAINT_Y_LEAD,
  paintingSize, PROJECT_ANCHORS, TOP_Y,
} from '../world/layout'
import fitpicify1Url  from '../assets/fitpicify1.jpg'
import fitpicify2Url  from '../assets/fitpicify2.jpg'
import fastFashionUrl from '../assets/Fastfashionanalysis.png'
import noscrollUrl    from '../assets/noscroll.png'
import tictactoeUrl   from '../assets/3dtictactoe.jpeg'
import mutectUrl      from '../assets/mutect.jpg'

// ─── Painting artwork ───────────────────────────────────────────────────────
// Project screenshots are downsampled to a low pixel count and drawn inside a
// hand-painted wooden border, so they read as Minecraft paintings rather than
// photographs pasted onto a block wall.

const ART_PIXELS = 108   // longest edge of the artwork, in texture pixels
const ART_BORDER = 4     // frame thickness, in the same pixels

/** Downsample an image so its longest edge is `maxEdge` pixels. */
function pixelate(img: HTMLImageElement, maxEdge: number) {
  const ar = img.width / img.height
  const w = Math.max(1, Math.round(ar >= 1 ? maxEdge : maxEdge * ar))
  const h = Math.max(1, Math.round(ar >= 1 ? maxEdge / ar : maxEdge))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return c
}

/** Wrap artwork in a bevelled oak border, the way a Minecraft painting is drawn. */
function frameArtwork(art: HTMLCanvasElement) {
  const b = ART_BORDER
  const c = document.createElement('canvas')
  c.width = art.width + b * 2
  c.height = art.height + b * 2
  const ctx = c.getContext('2d')!

  const wood = (v: number) => `rgb(${152 + v},${120 + v},${70 + v})`
  ctx.fillStyle = wood(0)
  ctx.fillRect(0, 0, c.width, c.height)
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (x >= b && x < c.width - b && y >= b && y < c.height - b) continue
      const grain = ((x * 7 + y * 13) % 5) - 2
      const bevel = x < 2 || y < 2 ? 16 : x >= c.width - 2 || y >= c.height - 2 ? -22 : 0
      ctx.fillStyle = wood(grain * 4 + bevel)
      ctx.fillRect(x, y, 1, 1)
    }
  }
  // Dark rebate where the canvas sits in the frame.
  ctx.fillStyle = 'rgb(64,46,24)'
  ctx.fillRect(b - 1, b - 1, art.width + 2, 1)
  ctx.fillRect(b - 1, b - 1, 1, art.height + 2)
  ctx.fillRect(b - 1, b + art.height, art.width + 2, 1)
  ctx.fillRect(b + art.width, b - 1, 1, art.height + 2)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(art, b, b)
  return c
}

/**
 * Vertical FOV for a viewport shape. Paintings are framed against a 16:9
 * horizontal field, so on narrower screens the vertical FOV opens up to hold
 * roughly the same horizontal view rather than cropping the canvas away.
 */
const BASE_FOV = 72
const BASE_ASPECT = 16 / 9
const H_FOV = 2 * Math.atan(Math.tan((BASE_FOV * Math.PI) / 360) * BASE_ASPECT)

function fovFor(aspect: number) {
  const v = (2 * Math.atan(Math.tan(H_FOV / 2) / Math.max(aspect, 0.35)) * 180) / Math.PI
  return Math.min(Math.max(v, BASE_FOV), 100)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

interface Props {
  onProgress?:     (p: number) => void
  onStage?:        (stage: string) => void
  onLoaded?:       () => void
  onProjectClick?: (index: number) => void
}

export default function StaircaseScene({ onProgress, onStage, onLoaded, onProjectClick }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current!
    let w = mount.clientWidth
    let h = mount.clientHeight
    let disposed = false

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.setClearColor(0xf7f5f0)
    mount.appendChild(renderer.domElement)

    // ── Scene / camera ────────────────────────────────────────────────────
    // Everything is lit by baked vertex colour, so the scene carries no lights
    // at all — exactly how Minecraft renders a chunk.
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0xf7f5f0, 26, 74)

    const camera = new THREE.PerspectiveCamera(fovFor(w / h), w / h, 0.1, 200)
    camera.position.set(6, 20, 0)
    camera.lookAt(0, 4, 0)

    document.body.style.overflow = 'hidden'

    // ── Shared state used by the loop ─────────────────────────────────────
    const paintMeshes: THREE.Mesh[] = []
    const paintProject: number[] = []
    const doors: THREE.Group[] = []
    const disposables: MeshResult[] = []
    const textureList: THREE.Texture[] = []

    const swoop = { active: false, t0: 0 }
    const swoopFromPos  = new THREE.Vector3(4.6, TOP_Y + 8, 0)
    const swoopFromLook = new THREE.Vector3(10.4, TOP_Y + 4, 0)
    const swoopToPos    = new THREE.Vector3()
    const swoopToLook   = new THREE.Vector3()

    const tmpPos = new THREE.Vector3()
    const tmpLook = new THREE.Vector3()

    // The intro swoop lands exactly on the first scroll anchor.
    journey(0, swoopToPos, swoopToLook)

    // ── Build ─────────────────────────────────────────────────────────────
    const idle = () => new Promise(resolve => setTimeout(resolve, 16))

    async function build() {
      onStage?.('Loading artwork')
      onProgress?.(0.04)
      const [fit1, fit2, fast, nos, ttt, mut] = await Promise.all(
        [fitpicify1Url, fitpicify2Url, fastFashionUrl, noscrollUrl, tictactoeUrl, mutectUrl].map(loadImage),
      )
      if (disposed) return

      onStage?.('Generating texture pack')
      onProgress?.(0.16)
      await idle()
      const textures = buildBlockTextures(renderer.capabilities.getMaxAnisotropy())
      textureList.push(...Object.values(textures))

      onStage?.('Placing blocks')
      onProgress?.(0.3)
      await idle()
      const world = new VoxelWorld()
      buildTower(world)

      onStage?.('Furnishing the bedroom')
      onProgress?.(0.46)
      await idle()
      buildBedroom(world)
      carveDoorway(world, FLOOR_Y)

      // ── Paintings ──
      // FitPicifiy keeps its diptych: both screenshots on one canvas.
      const diptych = document.createElement('canvas')
      const p1 = pixelate(fit1, ART_PIXELS)
      const p2 = pixelate(fit2, ART_PIXELS)
      diptych.width = p1.width + p2.width
      diptych.height = Math.max(p1.height, p2.height)
      const dctx = diptych.getContext('2d')!
      dctx.imageSmoothingEnabled = false
      dctx.drawImage(p1, 0, 0)
      dctx.drawImage(p2, p1.width, 0)

      const artworks = [
        diptych,
        pixelate(fast, ART_PIXELS),
        pixelate(nos, ART_PIXELS),
        pixelate(ttt, ART_PIXELS),
        pixelate(mut, ART_PIXELS),
      ]

      const nx = Math.cos(PAINT_ANGLE)
      const nz = Math.sin(PAINT_ANGLE)
      const extraLights: Emitter[] = []

      const placed = artworks.map((art, i) => {
        const framedArt = frameArtwork(art)
        // Fit inside the clear span between two passes of the staircase.
        const { width, height } = paintingSize(framedArt.width / framedArt.height)
        const centreY = -PROJECT_ANCHORS[i] + PAINT_Y_LEAD

        carvePaintingNiche(world, PAINT_ANGLE, centreY, width / 2, height / 2)

        // The canvas washes the alcove and the nearby treads with light.
        extraLights.push({ x: nx * 9.5, y: centreY, z: nz * 9.5, level: 0.75 })

        return { framedArt, width, height, centreY }
      })

      onStage?.('Baking light')
      onProgress?.(0.6)
      await idle()
      const lighting = createLighting([...world.emitters(), ...extraLights], {
        radius: 24,
        ambient: new THREE.Color(0.3, 0.29, 0.27),
        sky: new THREE.Color(0.55, 0.55, 0.54),
        skyTop: TOP_Y + 2,
        skyBottom: -62,
        skyFloor: 0.26,
        torch: new THREE.Color(0.62, 0.42, 0.18),
      })

      onStage?.('Meshing chunks')
      onProgress?.(0.72)
      await idle()
      const mesh = meshWorld(world, textures, lighting)
      disposables.push(mesh)
      scene.add(mesh.group)

      // ── Double door, hung so it can swing open on approach ──
      const leafW = DOOR_HALF_W
      for (const mirror of [false, true]) {
        const leaf = buildDoorLeaf(mirror, DOOR_H, leafW)
        const pivot = new THREE.Group()
        pivot.position.set(mirror ? DOOR_HALF_W : -DOOR_HALF_W, FLOOR_Y, DOOR_Z)
        const built = meshWorld(leaf, textures, lighting, pivot.position)
        disposables.push(built)
        pivot.add(built.group)
        scene.add(pivot)
        doors.push(pivot)
      }

      // ── Hang the paintings ──
      for (let i = 0; i < placed.length; i++) {
        const { framedArt, width, height, centreY } = placed[i]
        const tex = new THREE.CanvasTexture(framedArt)
        tex.magFilter = THREE.NearestFilter
        tex.minFilter = THREE.NearestMipmapLinearFilter
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
        textureList.push(tex)

        const canvasMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(width, height),
          new THREE.MeshBasicMaterial({ map: tex, fog: true }),
        )
        canvasMesh.position.set(nx * PAINT_R, centreY, nz * PAINT_R)
        canvasMesh.lookAt(0, centreY, 0)
        scene.add(canvasMesh)
        paintMeshes.push(canvasMesh)
        paintProject.push(i)
      }

      // ── Warm up ──
      onStage?.('Compiling shaders')
      onProgress?.(0.88)
      await renderer.compileAsync(scene, camera)
      if (disposed) return

      onStage?.('Warming up')
      onProgress?.(0.96)
      let remaining = 10
      const warm = () => {
        if (disposed) return
        renderer.render(scene, camera)
        if (--remaining > 0) {
          requestAnimationFrame(warm)
        } else {
          onProgress?.(1)
          onLoaded?.()
          swoop.active = true
          swoop.t0 = performance.now()
        }
      }
      requestAnimationFrame(warm)
    }

    build()

    // ── Scroll → camera ───────────────────────────────────────────────────
    const scroll = { y: 0 }
    const onScroll = () => { scroll.y = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── Painting click / hover ────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouseNDC  = new THREE.Vector2()

    const toNDC = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
    }

    const onCanvasClick = (e: MouseEvent) => {
      toNDC(e)
      raycaster.setFromCamera(mouseNDC, camera)
      const hits = raycaster.intersectObjects(paintMeshes)
      if (hits.length > 0) {
        const idx = paintMeshes.indexOf(hits[0].object as THREE.Mesh)
        if (idx >= 0) onProjectClick?.(paintProject[idx])
      }
    }

    const onCanvasMove = (e: MouseEvent) => {
      toNDC(e)
      raycaster.setFromCamera(mouseNDC, camera)
      renderer.domElement.style.cursor =
        raycaster.intersectObjects(paintMeshes).length > 0 ? 'pointer' : 'default'
    }

    renderer.domElement.addEventListener('click',     onCanvasClick)
    renderer.domElement.addEventListener('mousemove', onCanvasMove)

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      w = mount.clientWidth
      h = mount.clientHeight
      camera.aspect = w / h
      camera.fov = fovFor(camera.aspect)
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ── Animation loop ────────────────────────────────────────────────────
    const SWOOP_MS   = 2200
    /** The intro swoop pulls the field of view wide, then settles back. */
    const SWOOP_WIDEN = 16
    let frameId = 0
    const swoopLook = new THREE.Vector3()

    const animate = () => {
      frameId = requestAnimationFrame(animate)

      if (swoop.active) {
        const raw = Math.min((performance.now() - swoop.t0) / SWOOP_MS, 1)
        const t = 1 - Math.pow(1 - raw, 3)

        camera.position.lerpVectors(swoopFromPos, swoopToPos, t)
        swoopLook.lerpVectors(swoopFromLook, swoopToLook, t)
        camera.lookAt(swoopLook)
        const settled = fovFor(camera.aspect)
        camera.fov = THREE.MathUtils.lerp(settled + SWOOP_WIDEN, settled, t)
        camera.updateProjectionMatrix()

        if (raw >= 1) {
          swoop.active = false
          document.body.style.overflow = ''
          window.scrollTo({ top: 0, behavior: 'instant' })
          scroll.y = 0
        }
      } else {
        // Scroll fraction walks the anchor list, so every snap point lands the
        // camera exactly on a framed view.
        const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
        const t = tFromScroll(scroll.y / maxScroll)

        journey(t, tmpPos, tmpLook)
        camera.position.copy(tmpPos)
        camera.lookAt(tmpLook)

        const settled = fovFor(camera.aspect)
        if (camera.fov !== settled) {
          camera.fov = settled
          camera.updateProjectionMatrix()
        }

        // Swing the doors open as the camera comes off the stairs.
        if (doors.length === 2) {
          const open = doorSwing(t)
          doors[0].rotation.y = -open
          doors[1].rotation.y = open
        }
      }

      renderer.render(scene, camera)
    }
    requestAnimationFrame(animate)

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click',     onCanvasClick)
      renderer.domElement.removeEventListener('mousemove', onCanvasMove)
      document.body.style.overflow = ''
      for (const d of disposables) d.dispose()
      for (const m of paintMeshes) {
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
      }
      for (const t of textureList) t.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 w-full h-full" />
}
