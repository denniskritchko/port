import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import pineDiff      from '../assets/stained_pine_4k.blend/textures/stained_pine_diff_4k.jpg'
import pineNor       from '../assets/stained_pine_4k.blend/textures/stained_pine_nor_gl_4k.exr'
import pineRough     from '../assets/stained_pine_4k.blend/textures/stained_pine_rough_4k.exr'
import concreteDiff  from '../assets/cracked_concrete_wall_4k.blend/textures/cracked_concrete_wall_diff_4k.jpg'
import concreteNor   from '../assets/cracked_concrete_wall_4k.blend/textures/cracked_concrete_wall_nor_gl_4k.exr'
import concreteRough from '../assets/cracked_concrete_wall_4k.blend/textures/cracked_concrete_wall_rough_4k.exr'
import stoneDiff     from '../assets/white_sandstone_bricks_4k.blend/textures/white_sandstone_bricks_diff_4k.jpg'
import stoneNor      from '../assets/white_sandstone_bricks_4k.blend/textures/white_sandstone_bricks_nor_gl_4k.exr'
import stoneRough    from '../assets/white_sandstone_bricks_4k.blend/textures/white_sandstone_bricks_rough_4k.jpg'
import fitpicify1Url from '../assets/fitpicify1.jpg'
import fitpicify2Url from '../assets/fitpicify2.jpg'
import fastFashionUrl from '../assets/Fastfashionanalysis.png'
import noscrollUrl    from '../assets/noscroll.png'
import tictactoeUrl   from '../assets/3dtictactoe.jpeg'
import mutectUrl      from '../assets/mutect.jpg'

// ─── Staircase constants ───────────────────────────────────────────────────
const STEPS_PER_REV  = 10
const TOTAL_STEPS    = 66                              // extended: ~30 extra intro steps above paintings
const TOTAL_REVS     = TOTAL_STEPS / STEPS_PER_REV    // 6.6 — derived so camera spiral matches steps
const STEP_RISE      = 0.65
const INNER_R        = 1.5
const OUTER_R        = 7.0
const MID_R          = (INNER_R + OUTER_R) / 2
const STEP_WIDTH     = OUTER_R - INNER_R
const CAMERA_R       = 4.5
const EYE_H          = 3.2
const TOTAL_DEPTH    = TOTAL_STEPS * STEP_RISE        // 42.9

// Landing position for the about-me section (no paintings yet — stairwell stretches above)
const ABOUT_ANCHOR_STEP   = 16
// Project camera stops and painting positions (30 steps deeper than before)
const CAMERA_ANCHOR_STEPS = [46, 50, 54, 58, 61]
const PROJECT_STEPS       = [50, 54, 58, 62, 65]

// Swoop lands at the about-me anchor; scroll-0 is the about section
const INITIAL_P     = ABOUT_ANCHOR_STEP / TOTAL_STEPS
const INITIAL_ANGLE = INITIAL_P * TOTAL_REVS * Math.PI * 2
const INITIAL_DEPTH = INITIAL_P * TOTAL_DEPTH

// 7 anchors → 6 scroll sections: about-me → proj1 → proj2 → proj3 → proj4 → proj5 → end
const ANCHORS = [
  INITIAL_P,
  ...CAMERA_ANCHOR_STEPS.map(s => s / TOTAL_STEPS),
  PROJECT_STEPS[PROJECT_STEPS.length - 1] / TOTAL_STEPS,
]

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
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
    scene.add(new THREE.HemisphereLight(0xfff8e8, 0xc8a46a, 0.55))

    const sun = new THREE.DirectionalLight(0xfff9ee, 2.8)
    sun.position.set(2, 40, 4)
    sun.target.position.set(0, 0, 0)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left   = -15
    sun.shadow.camera.right  =  15
    sun.shadow.camera.top    =  15
    sun.shadow.camera.bottom = -15
    sun.shadow.camera.near   = 1
    sun.shadow.camera.far    = 60
    sun.shadow.bias = -0.0008
    scene.add(sun)
    scene.add(sun.target)

    // Warm sconces along the descent
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
    // manager.onLoad is set after texture loads are queued below

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

    // Cracked concrete — column
    const colMat = new THREE.MeshStandardMaterial({
      map:          tex(tl,  concreteDiff,  4, 8, true),
      normalMap:    tex(exr, concreteNor,   4, 8),
      roughnessMap: tex(exr, concreteRough, 4, 8),
      metalness: 0,
    })

    // White sandstone bricks — outer wall
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

    // Floor — pine wood matching the treads (tiled across the circle)
    const floorMat = new THREE.MeshStandardMaterial({
      map:          tex(tl,  pineDiff,  6, 6, true),
      normalMap:    tex(exr, pineNor,   6, 6),
      roughnessMap: tex(exr, pineRough, 6, 6),
      metalness: 0,
    })

    // ── Load project painting textures via the manager ─────────────────────
    // Textures are ready by manager.onLoad; paintings are built there so we
    // can read image.width/height for correct aspect ratios.
    function applyFlip(t: THREE.Texture) {
      t.wrapS = THREE.RepeatWrapping
      t.repeat.x = -1
      t.offset.x = 1
      return t
    }

    const fit1Tex  = tl.load(fitpicify1Url);  fit1Tex.colorSpace  = THREE.SRGBColorSpace
    const fit2Tex  = tl.load(fitpicify2Url);  fit2Tex.colorSpace  = THREE.SRGBColorSpace
    const fastTex  = tl.load(fastFashionUrl); applyFlip(fastTex);  fastTex.colorSpace  = THREE.SRGBColorSpace
    const nosTex   = tl.load(noscrollUrl);    applyFlip(nosTex);   nosTex.colorSpace   = THREE.SRGBColorSpace
    const tttTex   = tl.load(tictactoeUrl);   applyFlip(tttTex);   tttTex.colorSpace   = THREE.SRGBColorSpace
    const mutTex   = tl.load(mutectUrl);      applyFlip(mutTex);   mutTex.colorSpace   = THREE.SRGBColorSpace

    // ── Central column ────────────────────────────────────────────────────
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(INNER_R, INNER_R, TOTAL_DEPTH + 6, 20),
      colMat,
    )
    col.position.y = -TOTAL_DEPTH / 2
    col.castShadow = col.receiveShadow = true
    scene.add(col)

    // ── Outer wall ────────────────────────────────────────────────────────
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(OUTER_R + 0.6, OUTER_R + 0.6, TOTAL_DEPTH + 6, 40, 1, true),
      wallMat,
    )
    wall.position.y = -TOTAL_DEPTH / 2
    wall.receiveShadow = true
    scene.add(wall)

    // ── Floor cap — pine texture matches treads ────────────────────────────
    const floor = new THREE.Mesh(new THREE.CircleGeometry(OUTER_R + 0.6, 40), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -TOTAL_DEPTH - 0.5
    floor.receiveShadow = true
    scene.add(floor)

    // ── Steps + posts — merged into 3 draw calls ──────────────────────────
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

      const tg = treadTemplate.clone()
      tg.applyMatrix4(mat4.compose(
        new THREE.Vector3(Math.cos(angle) * MID_R, y, Math.sin(angle) * MID_R),
        rot.clone(), unit,
      ))
      treadGeos.push(tg)

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

      const pg = postTemplate.clone()
      pg.applyMatrix4(mat4.compose(
        new THREE.Vector3(Math.cos(angle) * (OUTER_R - 0.9), y + 0.55, Math.sin(angle) * (OUTER_R - 0.9)),
        new THREE.Quaternion(), unit,
      ))
      postGeos.push(pg)
    }

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
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(railCurve, TOTAL_STEPS * 6, 0.045, 8, false),
      railMat,
    )
    rail.castShadow = true
    scene.add(rail)

    // ── Canvas meshes for raycasting (built in manager.onLoad) ────────────
    const paintMeshes: THREE.Mesh[] = []

    // ── Swoop intro state (referenced in manager.onLoad) ──────────────────
    const swoop = { active: false, t0: 0 }
    const swoopFromPos  = new THREE.Vector3(3, 10, 0)
    const swoopFromLook = new THREE.Vector3(OUTER_R - 0.4, 8, 0)
    const swoopToPos    = new THREE.Vector3(Math.cos(INITIAL_ANGLE) * CAMERA_R, -INITIAL_DEPTH + EYE_H, Math.sin(INITIAL_ANGLE) * CAMERA_R)
    const swoopToLook   = new THREE.Vector3(Math.cos(INITIAL_ANGLE + 0.45) * 2.2, -INITIAL_DEPTH + EYE_H - 0.55, Math.sin(INITIAL_ANGLE + 0.45) * 2.2)
    const camLerped     = { pos: swoopToPos.clone(), look: swoopToLook.clone() }
    const targetPos     = new THREE.Vector3()
    const targetLook    = new THREE.Vector3()

    // ── manager.onLoad: build paintings then compile shaders ──────────────
    manager.onLoad = () => {
      onStage?.('Building scene')

      // Composite fitpicify1 + fitpicify2 side by side.
      // Draw img1 left / img2 right on the canvas; after the horizontal flip
      // (repeat.x=-1) applied to all painting textures, this renders as
      // fitpicify1 on the LEFT and fitpicify2 on the RIGHT from inside the cylinder.
      const img1 = fit1Tex.image as HTMLImageElement
      const img2 = fit2Tex.image as HTMLImageElement
      const compW = img1.width + img2.width
      const compH = Math.max(img1.height, img2.height)
      const compCanvas = document.createElement('canvas')
      compCanvas.width  = compW
      compCanvas.height = compH
      const ctx = compCanvas.getContext('2d')!
      ctx.drawImage(img1, 0, 0)
      ctx.drawImage(img2, img1.width, 0)
      const fitTex = new THREE.CanvasTexture(compCanvas)
      fitTex.colorSpace = THREE.SRGBColorSpace
      applyFlip(fitTex)

      // Per-painting: texture, arc width (world units)
      // FitPicifiy gets 2× width to show both images at a reasonable scale
      const PW      = 3.8
      const PW_FIT  = PW * 2
      const FT      = 0.14
      const SEGS    = 32
      const PAINT_R = OUTER_R + 0.57
      const FRAME_R = OUTER_R + 0.50

      const paintingDefs = [
        { tex: fitTex, pw: PW_FIT, ar: compW / compH },
        { tex: fastTex, pw: PW, ar: (fastTex.image as HTMLImageElement).width / (fastTex.image as HTMLImageElement).height },
        { tex: nosTex,  pw: PW, ar: (nosTex.image  as HTMLImageElement).width / (nosTex.image  as HTMLImageElement).height },
        { tex: tttTex,  pw: PW, ar: (tttTex.image  as HTMLImageElement).width / (tttTex.image  as HTMLImageElement).height },
        { tex: mutTex,  pw: PW, ar: (mutTex.image  as HTMLImageElement).width / (mutTex.image  as HTMLImageElement).height || 16/9 },
      ]

      const frameMatCurved = new THREE.MeshStandardMaterial({
        color: 0xb8925a, roughness: 0.2, metalness: 0.65, side: THREE.BackSide,
      })

      PROJECT_STEPS.forEach((stepIdx, paintIdx) => {
        const angle = (stepIdx / STEPS_PER_REV) * Math.PI * 2
        const y     = -(paintIdx + 0.5) * TOTAL_DEPTH / PROJECT_STEPS.length

        const { tex: paintTex, pw, ar } = paintingDefs[paintIdx]
        const ph = pw / ar

        const paintArc = pw / PAINT_R
        const sideArc  = FT / FRAME_R
        const topArc   = (pw + FT * 2) / FRAME_R

        // Canvas with emissive so the painting illuminates itself
        const canvasMat = new THREE.MeshStandardMaterial({
          map:             paintTex,
          emissiveMap:     paintTex,
          emissive:        new THREE.Color(0xffffff),
          emissiveIntensity: 0.35,
          roughness:       0.7,
          side:            THREE.DoubleSide,
        })

        const canvasGeo = new THREE.CylinderGeometry(PAINT_R, PAINT_R, ph, SEGS, 1, true, angle - paintArc / 2, paintArc)
        const canvas = new THREE.Mesh(canvasGeo, canvasMat)
        canvas.position.y = y
        scene.add(canvas)
        paintMeshes.push(canvas)

        // Frame bars
        const topGeo = new THREE.CylinderGeometry(FRAME_R, FRAME_R, FT, SEGS, 1, true, angle - topArc / 2, topArc)
        const topBar = new THREE.Mesh(topGeo, frameMatCurved)
        topBar.position.y = y + ph / 2 + FT / 2
        scene.add(topBar)

        const botBar = topBar.clone()
        botBar.position.y = y - ph / 2 - FT / 2
        scene.add(botBar)

        const leftGeo = new THREE.CylinderGeometry(FRAME_R, FRAME_R, ph + FT * 2, SEGS, 1, true, angle - paintArc / 2 - sideArc, sideArc)
        const leftBar = new THREE.Mesh(leftGeo, frameMatCurved)
        leftBar.position.y = y
        scene.add(leftBar)

        const rightGeo = new THREE.CylinderGeometry(FRAME_R, FRAME_R, ph + FT * 2, SEGS, 1, true, angle + paintArc / 2, sideArc)
        const rightBar = new THREE.Mesh(rightGeo, frameMatCurved)
        rightBar.position.y = y
        scene.add(rightBar)

        // Point light — painting illuminates surrounding stone wall
        const pLight = new THREE.PointLight(0xfff0cc, 1.5, 8)
        pLight.position.set(Math.cos(angle) * 5.5, y, Math.sin(angle) * 5.5)
        scene.add(pLight)
      })

      onStage?.('Compiling shaders')
      renderer.compileAsync(scene, camera).then(() => {
        onStage?.('Warming up renderer')
        let remaining = 12
        const warmup = () => {
          renderer.render(scene, camera)
          if (--remaining > 0) {
            requestAnimationFrame(warmup)
          } else {
            onLoaded?.()
            swoop.active = true
            swoop.t0     = performance.now()
          }
        }
        requestAnimationFrame(warmup)
      })
    }

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
        if (idx >= 0) onProjectClick?.(idx)
      }
    }

    const onCanvasMove = (e: MouseEvent) => {
      toNDC(e)
      raycaster.setFromCamera(mouseNDC, camera)
      const hits = raycaster.intersectObjects(paintMeshes)
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default'
    }

    renderer.domElement.addEventListener('click',     onCanvasClick)
    renderer.domElement.addEventListener('mousemove', onCanvasMove)

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      w = mount.clientWidth
      h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ── Animation loop ────────────────────────────────────────────────────
    const SWOOP_MS   = 2200
    const SWOOP_FOV  = 88
    const NORMAL_FOV = 72
    let frameId: number
    const tmpLook = new THREE.Vector3()

    const animate = () => {
      frameId = requestAnimationFrame(animate)

      if (swoop.active) {
        // Time-driven cinematic intro
        const raw = Math.min((performance.now() - swoop.t0) / SWOOP_MS, 1)
        const t   = 1 - Math.pow(1 - raw, 3)   // easeOutCubic

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
          camLerped.pos.copy(swoopToPos)
          camLerped.look.copy(swoopToLook)
        }

      } else {
        // Scroll-driven camera — one anchor per project
        const maxScroll   = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
        const numSections = ANCHORS.length - 1
        const rawSection  = Math.min(scroll.y / maxScroll, 1) * numSections
        const sIdx        = Math.min(Math.floor(rawSection), numSections - 1)
        const t           = easeInOut(rawSection - sIdx)
        const p           = ANCHORS[sIdx] + (ANCHORS[sIdx + 1] - ANCHORS[sIdx]) * t

        const angle = p * TOTAL_REVS * Math.PI * 2
        const depth = p * TOTAL_DEPTH

        targetPos.set(Math.cos(angle) * CAMERA_R, -depth + EYE_H, Math.sin(angle) * CAMERA_R)
        targetLook.set(Math.cos(angle + 0.45) * 2.2, -depth + EYE_H - 0.55, Math.sin(angle + 0.45) * 2.2)

        // Snap instantly when far away (fast scroll), smooth when close.
        // Prevents camera swimming through walls on multi-section jumps.
        const dist = camLerped.pos.distanceTo(targetPos)
        const lf   = dist > 4.0 ? 1.0 : 0.12
        camLerped.pos.lerp(targetPos, lf)
        camLerped.look.lerp(targetLook, lf)
        camera.position.copy(camLerped.pos)
        camera.lookAt(camLerped.look)

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
      renderer.domElement.removeEventListener('click',     onCanvasClick)
      renderer.domElement.removeEventListener('mousemove', onCanvasMove)
      document.body.style.overflow = ''
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 w-full h-full" />
}
