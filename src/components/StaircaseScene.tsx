import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import maratUrl      from '../assets/Death-of-Marat-Jacques-Louis-David-Royal-Museums-1793.png'
import pineDiff      from '../assets/stained_pine_4k.blend/textures/stained_pine_diff_4k.jpg'
import pineNor       from '../assets/stained_pine_4k.blend/textures/stained_pine_nor_gl_4k.exr'
import pineRough     from '../assets/stained_pine_4k.blend/textures/stained_pine_rough_4k.exr'
import concreteDiff  from '../assets/cracked_concrete_wall_4k.blend/textures/cracked_concrete_wall_diff_4k.jpg'
import concreteNor   from '../assets/cracked_concrete_wall_4k.blend/textures/cracked_concrete_wall_nor_gl_4k.exr'
import concreteRough from '../assets/cracked_concrete_wall_4k.blend/textures/cracked_concrete_wall_rough_4k.exr'
import stoneDiff     from '../assets/white_sandstone_bricks_4k.blend/textures/white_sandstone_bricks_diff_4k.jpg'
import stoneNor      from '../assets/white_sandstone_bricks_4k.blend/textures/white_sandstone_bricks_nor_gl_4k.exr'
import stoneRough    from '../assets/white_sandstone_bricks_4k.blend/textures/white_sandstone_bricks_rough_4k.jpg'

// ─── Staircase constants ───────────────────────────────────────────────────
const STEPS_PER_REV  = 10
const TOTAL_REVS     = 3
const TOTAL_STEPS    = STEPS_PER_REV * TOTAL_REVS   // 30
const STEP_RISE      = 0.65
const INNER_R        = 1.5    // central column radius
const OUTER_R        = 7.0    // outer wall radius
const MID_R          = (INNER_R + OUTER_R) / 2
const STEP_WIDTH     = OUTER_R - INNER_R              // radial span of each tread
const CAMERA_R       = 4.5    // orbit radius for the camera
const EYE_H          = 3.2    // eye height above tread
const TOTAL_DEPTH    = TOTAL_STEPS * STEP_RISE       // 19.5 total descent

// painting at every 3rd step
const PAINTING_STEPS = Array.from({ length: 10 }, (_, i) => 2 + i * 3)

// Phase 0→INTRO_END: pull from bird's-eye down to stairs entry
const INTRO_END = 0.12

// Scroll ratio at which the swoop ends — puts camera clearly inside the stairwell
const INITIAL_P     = 0.08
const INITIAL_ANGLE = INITIAL_P * TOTAL_REVS * Math.PI * 2
const INITIAL_DEPTH = INITIAL_P * TOTAL_DEPTH

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

interface Props {
  onProgress?: (p: number) => void
  onStage?:    (stage: string) => void
  onLoaded?: () => void
}

export default function StaircaseScene({ onProgress, onStage, onLoaded }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current!
    let w = mount.clientWidth
    let h = mount.clientHeight

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.setClearColor(0xf7f5f0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // ── Scene / Camera ────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0xf7f5f0, 12, 32)

    const camera = new THREE.PerspectiveCamera(72, w / h, 0.1, 80)
    camera.position.set(4, 18, 8)
    camera.lookAt(0, 2, 0)

    // ── Lighting ──────────────────────────────────────────────────────────

    // Hemisphere: warm sky above, warm tan from ground bounce — makes every
    // surface feel like it lives in a real environment rather than flat ambient
    scene.add(new THREE.HemisphereLight(0xfff8e8, 0xc8a46a, 0.55))

    // Sun — DirectionalLight has no visible origin; parallel rays from directly
    // above, like light falling through a skylight. Covers the full scene.
    const sun = new THREE.DirectionalLight(0xfff9ee, 2.8)
    sun.position.set(2, 40, 4)          // high up — angle barely noticeable
    sun.target.position.set(0, 0, 0)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left   = -12
    sun.shadow.camera.right  =  12
    sun.shadow.camera.top    =  12
    sun.shadow.camera.bottom = -12
    sun.shadow.camera.near   = 1
    sun.shadow.camera.far    = 60
    sun.shadow.bias = -0.0008
    scene.add(sun)
    scene.add(sun.target)

    // Warm sconces along the descent — now the primary mood light lower down
    for (let i = 1; i < 6; i++) {
      const t     = i / 5
      const angle = t * TOTAL_REVS * Math.PI * 2
      const y     = -t * TOTAL_DEPTH
      const l     = new THREE.PointLight(0xffb84a, 0.9, 9)
      l.position.set(Math.cos(angle) * (OUTER_R - 0.8), y + 2.0, Math.sin(angle) * (OUTER_R - 0.8))
      scene.add(l)
    }

    // ── Materials ─────────────────────────────────────────────────────────
    const manager = new THREE.LoadingManager()
    manager.onStart    = () => onStage?.('Loading textures')
    manager.onProgress = (_url, loaded, total) => onProgress?.(loaded / total)
    manager.onLoad     = () => {
      onStage?.('Compiling shaders')
      renderer.compileAsync(scene, camera).then(() => {
        onStage?.('Warming up renderer')
        // Render several frames behind the overlay to flush all lazy GPU uploads
        // before revealing the scene to the user.
        let remaining = 12
        const warmup = () => {
          renderer.render(scene, camera)
          if (--remaining > 0) {
            requestAnimationFrame(warmup)
          } else {
            onLoaded?.()
            // Kick off the cinematic swoop — starts as the overlay fades out
            swoop.active = true
            swoop.t0     = performance.now()
          }
        }
        requestAnimationFrame(warmup)
      })
    }

    // Prevent scrolling during the swoop intro; restored when swoop ends
    document.body.style.overflow = 'hidden'

    const tl  = new THREE.TextureLoader(manager)
    const exr = new EXRLoader(manager)
    const maxAniso = renderer.capabilities.getMaxAnisotropy()

    type AnyLoader = THREE.TextureLoader | EXRLoader
    function tex(loader: AnyLoader, url: string, ru: number, rv: number, sRGB = false) {
      const t = loader.load(url)
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(ru, rv)
      t.anisotropy = maxAniso
      if (sRGB) t.colorSpace = THREE.SRGBColorSpace
      return t
    }

    // Wood treads — stained pine
    const stepMat = new THREE.MeshStandardMaterial({
      map:          tex(tl,  pineDiff,      3, 1, true),
      normalMap:    tex(exr, pineNor,       3, 1),
      roughnessMap: tex(exr, pineRough,     3, 1),
      metalness: 0,
    })

    // Cracked concrete — column (4 tiles around circumference, 8 down height)
    const colMat = new THREE.MeshStandardMaterial({
      map:          tex(tl,  concreteDiff,  4, 8, true),
      normalMap:    tex(exr, concreteNor,   4, 8),
      roughnessMap: tex(exr, concreteRough, 4, 8),
      metalness: 0,
    })

    // White sandstone bricks — outer wall (12 tiles around, 5 down)
    // normalScale Y negated for BackSide so bumps light correctly from inside
    const wallMat = new THREE.MeshStandardMaterial({
      map:          tex(tl,  stoneDiff,  12, 5, true),
      normalMap:    tex(exr, stoneNor,   12, 5),
      roughnessMap: tex(tl,  stoneRough, 12, 5),
      normalScale:  new THREE.Vector2(1, -1),
      metalness: 0,
      side: THREE.BackSide,
    })
    // Brushed dark metal railing
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1e1e20, roughness: 0.12, metalness: 0.95 })
    const framMat = new THREE.MeshStandardMaterial({ color: 0xb8925a, roughness: 0.25, metalness: 0.6 })
    const texture = new THREE.TextureLoader().load(maratUrl)
    texture.colorSpace = THREE.SRGBColorSpace
    // Flip horizontally so image reads correctly from inside the cylinder (BackSide)
    texture.wrapS = THREE.RepeatWrapping
    texture.repeat.x = -1
    texture.offset.x = 1
    const canvMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.BackSide })
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.8 })

    // ── Central column ────────────────────────────────────────────────────
    const colGeo = new THREE.CylinderGeometry(INNER_R, INNER_R, TOTAL_DEPTH + 6, 20)
    const col = new THREE.Mesh(colGeo, colMat)
    col.position.y = -TOTAL_DEPTH / 2
    col.castShadow    = true
    col.receiveShadow = true
    scene.add(col)

    // ── Outer wall ────────────────────────────────────────────────────────
    const wallGeo = new THREE.CylinderGeometry(OUTER_R + 0.6, OUTER_R + 0.6, TOTAL_DEPTH + 6, 40, 1, true)
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.y = -TOTAL_DEPTH / 2
    wall.receiveShadow = true
    scene.add(wall)

    // floor cap
    const floorGeo = new THREE.CircleGeometry(OUTER_R + 0.6, 40)
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -TOTAL_DEPTH - 0.5
    floor.receiveShadow = true
    scene.add(floor)

    // ── Steps + posts — collected then merged into 3 draw calls ───────────
    const treadTemplate = new THREE.BoxGeometry(STEP_WIDTH, 0.1, 1.9)
    const riserTemplate = new THREE.BoxGeometry(STEP_WIDTH, STEP_RISE - 0.1, 0.08)
    const postTemplate  = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8)

    const treadGeos: THREE.BufferGeometry[] = []
    const riserGeos: THREE.BufferGeometry[] = []
    const postGeos:  THREE.BufferGeometry[] = []

    const mat4 = new THREE.Matrix4()
    const quat = new THREE.Quaternion()
    const unit = new THREE.Vector3(1, 1, 1)

    for (let i = 0; i < TOTAL_STEPS; i++) {
      const angle = (i / STEPS_PER_REV) * Math.PI * 2
      const y     = -i * STEP_RISE
      const rot   = quat.setFromEuler(new THREE.Euler(0, -angle, 0))

      // Tread
      const tg = treadTemplate.clone()
      tg.applyMatrix4(mat4.compose(
        new THREE.Vector3(Math.cos(angle) * MID_R, y, Math.sin(angle) * MID_R),
        rot.clone(), unit,
      ))
      treadGeos.push(tg)

      // Riser
      const rg = riserTemplate.clone()
      rg.applyMatrix4(mat4.compose(
        new THREE.Vector3(
          Math.cos(angle) * MID_R + Math.cos(angle - Math.PI / 2) * 0.95,
          y - (STEP_RISE - 0.1) / 2,
          Math.sin(angle) * MID_R + Math.sin(angle - Math.PI / 2) * 0.95,
        ),
        rot.clone(), unit,
      ))
      riserGeos.push(rg)

      // Post (cylinder — no rotation needed)
      const pg = postTemplate.clone()
      pg.applyMatrix4(mat4.compose(
        new THREE.Vector3(Math.cos(angle) * (OUTER_R - 0.9), y + 0.55, Math.sin(angle) * (OUTER_R - 0.9)),
        new THREE.Quaternion(), unit,
      ))
      postGeos.push(pg)
    }

    // One mesh per group — 3 draw calls instead of 90
    const mergedTreads = new THREE.Mesh(mergeGeometries(treadGeos), stepMat)
    mergedTreads.castShadow = mergedTreads.receiveShadow = true
    scene.add(mergedTreads)

    const mergedRisers = new THREE.Mesh(mergeGeometries(riserGeos), stepMat)
    mergedRisers.castShadow = mergedRisers.receiveShadow = true
    scene.add(mergedRisers)

    const mergedPosts = new THREE.Mesh(mergeGeometries(postGeos), railMat)
    mergedPosts.castShadow = true
    scene.add(mergedPosts)

    // ── Helical handrail ──────────────────────────────────────────────────
    const railPts: THREE.Vector3[] = []
    for (let i = 0; i <= TOTAL_STEPS * 6; i++) {
      const t     = i / (TOTAL_STEPS * 6)
      const angle = t * TOTAL_REVS * Math.PI * 2
      const y     = -t * TOTAL_DEPTH
      railPts.push(new THREE.Vector3(
        Math.cos(angle) * (OUTER_R - 0.9),
        y + 1.05,
        Math.sin(angle) * (OUTER_R - 0.9),
      ))
    }
    const railCurve = new THREE.CatmullRomCurve3(railPts)
    const railGeo   = new THREE.TubeGeometry(railCurve, TOTAL_STEPS * 6, 0.045, 8, false)
    const rail = new THREE.Mesh(railGeo, railMat)
    rail.castShadow = true
    scene.add(rail)

    // ── Paintings (curved arcs following the wall) ────────────────────────
    const PW      = 2.1    // painting width in world units
    const PH      = 1.5    // painting height in world units
    const FT      = 0.14   // frame bar width in world units
    const SEGS    = 32     // arc smoothness
    const PAINT_R = OUTER_R + 0.57   // canvas sits just inside the wall
    const FRAME_R = OUTER_R + 0.50   // frame sits proud of canvas (more inward)

    const frameMatCurved = new THREE.MeshStandardMaterial({
      color: 0xb8925a, roughness: 0.2, metalness: 0.65, side: THREE.BackSide,
    })

    PAINTING_STEPS.forEach((stepIdx) => {
      const angle    = (stepIdx / STEPS_PER_REV) * Math.PI * 2
      const y        = -stepIdx * STEP_RISE + 0.6

      const paintArc = PW / PAINT_R                   // arc angle spanning the canvas
      const sideArc  = FT / FRAME_R                   // arc angle for left/right bars
      const topArc   = (PW + FT * 2) / FRAME_R        // arc angle for top/bottom bars

      // Canvas
      const canvasGeo = new THREE.CylinderGeometry(
        PAINT_R, PAINT_R, PH, SEGS, 1, true,
        angle - paintArc / 2, paintArc,
      )
      const canvas = new THREE.Mesh(canvasGeo, canvMat)
      canvas.position.y = y
      scene.add(canvas)

      // Frame — top bar
      const topGeo = new THREE.CylinderGeometry(
        FRAME_R, FRAME_R, FT, SEGS, 1, true,
        angle - topArc / 2, topArc,
      )
      const topBar = new THREE.Mesh(topGeo, frameMatCurved)
      topBar.position.y = y + PH / 2 + FT / 2
      scene.add(topBar)

      // Frame — bottom bar
      const botBar = topBar.clone()
      botBar.position.y = y - PH / 2 - FT / 2
      scene.add(botBar)

      // Frame — left bar
      const sideGeo = new THREE.CylinderGeometry(
        FRAME_R, FRAME_R, PH + FT * 2, SEGS, 1, true,
        angle - paintArc / 2 - sideArc, sideArc,
      )
      const leftBar = new THREE.Mesh(sideGeo, frameMatCurved)
      leftBar.position.y = y
      scene.add(leftBar)

      // Frame — right bar
      const rightGeo = new THREE.CylinderGeometry(
        FRAME_R, FRAME_R, PH + FT * 2, SEGS, 1, true,
        angle + paintArc / 2, sideArc,
      )
      const rightBar = new THREE.Mesh(rightGeo, frameMatCurved)
      rightBar.position.y = y
      scene.add(rightBar)
    })

    // ── Scroll → camera ───────────────────────────────────────────────────
    const scroll = { y: 0 }
    const onScroll = () => { scroll.y = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      w = mount.clientWidth
      h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ── Swoop intro (time-based, triggered after warmup) ──────────────────
    const SWOOP_MS    = 2200
    const SWOOP_FOV   = 88
    const NORMAL_FOV  = 72
    const swoopFromPos  = new THREE.Vector3(3, 10, 0)
    // Look toward the outer wall, mostly horizontal — fills frame with brick
    const swoopFromLook = new THREE.Vector3(OUTER_R - 0.4, 8, 0)
    const swoopToPos    = new THREE.Vector3(Math.cos(INITIAL_ANGLE) * CAMERA_R, -INITIAL_DEPTH + EYE_H, Math.sin(INITIAL_ANGLE) * CAMERA_R)
    const swoopToLook   = new THREE.Vector3(Math.cos(INITIAL_ANGLE + 0.45) * 2.2, -INITIAL_DEPTH + EYE_H - 0.55, Math.sin(INITIAL_ANGLE + 0.45) * 2.2)

    // Mutable state — lives in the closure, not React state
    const swoop = { active: false, t0: 0 }

    // ── Animation loop ────────────────────────────────────────────────────
    let frameId: number
    const tmpLook = new THREE.Vector3()

    const animate = () => {
      frameId = requestAnimationFrame(animate)

      if (swoop.active) {
        // ── Swoop: time-driven cinematic intro ────────────────────────────
        const raw   = Math.min((performance.now() - swoop.t0) / SWOOP_MS, 1)
        const t     = 1 - Math.pow(1 - raw, 3)   // easeOutCubic — fast then settle

        camera.position.lerpVectors(swoopFromPos, swoopToPos, t)
        tmpLook.lerpVectors(swoopFromLook, swoopToLook, t)
        camera.lookAt(tmpLook)
        camera.fov = THREE.MathUtils.lerp(SWOOP_FOV, NORMAL_FOV, t)
        camera.updateProjectionMatrix()

        if (raw >= 1) {
          swoop.active = false
          document.body.style.overflow = ''
          window.scrollTo({ top: 0, behavior: 'instant' })
          scroll.y = 0
        }

      } else {
        // ── Scroll-driven camera ──────────────────────────────────────────
        // Remap so scroll=0 lands at INITIAL_DEPTH (walls fill screen) and
        // scroll=max reaches the bottom of the stairwell.
        const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
        const overall   = Math.min(scroll.y / maxScroll, 1)
        const angle = INITIAL_ANGLE + overall * (TOTAL_REVS * Math.PI * 2 - INITIAL_ANGLE)
        const depth = INITIAL_DEPTH + overall * (TOTAL_DEPTH - INITIAL_DEPTH)

        camera.position.set(
          Math.cos(angle) * CAMERA_R,
          -depth + EYE_H,
          Math.sin(angle) * CAMERA_R,
        )
        camera.lookAt(
          Math.cos(angle + 0.45) * 2.2,
          -depth + EYE_H - 0.55,
          Math.sin(angle + 0.45) * 2.2,
        )

        // Reset FOV in case it drifted
        if (camera.fov !== NORMAL_FOV) {
          camera.fov = NORMAL_FOV
          camera.updateProjectionMatrix()
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.body.style.overflow = ''
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 w-full h-full" />
}
