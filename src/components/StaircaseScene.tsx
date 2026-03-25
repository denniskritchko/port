import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js'
import maratUrl from '../assets/Death-of-Marat-Jacques-Louis-David-Royal-Museums-1793.png'
import pineDiff  from '../assets/stained_pine_4k.blend/textures/stained_pine_diff_4k.jpg'
import pineNor   from '../assets/stained_pine_4k.blend/textures/stained_pine_nor_gl_4k.exr'
import pineRough from '../assets/stained_pine_4k.blend/textures/stained_pine_rough_4k.exr'

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
const EYE_H          = 1.7    // eye height above tread
const TOTAL_DEPTH    = TOTAL_STEPS * STEP_RISE       // 19.5 total descent

// painting at every 3rd step
const PAINTING_STEPS = Array.from({ length: 10 }, (_, i) => 2 + i * 3)

// Phase 0→INTRO_END: pull from bird's-eye down to stairs entry
const INTRO_END = 0.12

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export default function StaircaseScene() {
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
    scene.add(new THREE.AmbientLight(0xffe8cc, 0.35))

    // ── God light — dramatic spot above the staircase entrance ────────────
    const godLight = new THREE.SpotLight(0xfff5d0, 18, 28, Math.PI / 7, 0.45, 1.8)
    godLight.position.set(0, 4, 0)
    godLight.target.position.set(0, -6, 0)
    godLight.castShadow = true
    godLight.shadow.mapSize.width  = 2048
    godLight.shadow.mapSize.height = 2048
    godLight.shadow.camera.near = 0.5
    godLight.shadow.camera.far  = 30
    godLight.shadow.bias = -0.001
    scene.add(godLight)
    scene.add(godLight.target)

    // Visible light shaft (additive transparent cone)
    const shaftGeo = new THREE.CylinderGeometry(0.12, 4.2, 10, 40, 1, true)
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xfff0b0,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const shaft = new THREE.Mesh(shaftGeo, shaftMat)
    shaft.position.set(0, -1, 0)   // center of the 10-unit cone (top at y=4, base at y=-6)
    scene.add(shaft)

    // Dim wall sconces for depth further down
    for (let i = 1; i < 6; i++) {
      const t     = i / 5
      const angle = t * TOTAL_REVS * Math.PI * 2
      const y     = -t * TOTAL_DEPTH
      const l     = new THREE.PointLight(0xffc86e, 0.45, 7)
      l.position.set(Math.cos(angle) * (OUTER_R - 0.8), y + 2.0, Math.sin(angle) * (OUTER_R - 0.8))
      scene.add(l)
    }

    // ── Materials ─────────────────────────────────────────────────────────
    // ── Wood texture (stained pine) ───────────────────────────────────────
    const tl  = new THREE.TextureLoader()
    const exr = new EXRLoader()
    const maxAniso = renderer.capabilities.getMaxAnisotropy()

    function woodTex(loader: THREE.TextureLoader | EXRLoader, url: string, sRGB = false) {
      const t = loader.load(url)
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(3, 1)           // 3 planks across the tread width, 1 along depth
      t.anisotropy = maxAniso
      if (sRGB) t.colorSpace = THREE.SRGBColorSpace
      return t
    }

    // Wood treads — stained pine PBR
    const stepMat = new THREE.MeshStandardMaterial({
      map:          woodTex(tl,  pineDiff,  true),
      normalMap:    woodTex(exr, pineNor),
      roughnessMap: woodTex(exr, pineRough),
      metalness:    0,
    })
    // Concrete column — cool grey, very rough
    const colMat  = new THREE.MeshStandardMaterial({ color: 0x888886, roughness: 0.97, metalness: 0.0 })
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xede8df, roughness: 0.92, side: THREE.BackSide })
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

    // ── Steps ─────────────────────────────────────────────────────────────
    const treadGeo = new THREE.BoxGeometry(STEP_WIDTH, 0.1, 1.9)
    const riserGeo = new THREE.BoxGeometry(STEP_WIDTH, STEP_RISE - 0.1, 0.08)

    for (let i = 0; i < TOTAL_STEPS; i++) {
      const angle = (i / STEPS_PER_REV) * Math.PI * 2
      const y     = -i * STEP_RISE

      // Tread
      const tread = new THREE.Mesh(treadGeo, stepMat)
      tread.position.set(Math.cos(angle) * MID_R, y, Math.sin(angle) * MID_R)
      tread.rotation.y = -angle
      tread.castShadow    = true
      tread.receiveShadow = true
      scene.add(tread)

      // Riser (front vertical face of each step)
      const riser = new THREE.Mesh(riserGeo, stepMat)
      riser.position.set(
        Math.cos(angle) * MID_R + Math.cos(angle - Math.PI / 2) * 0.95,
        y - (STEP_RISE - 0.1) / 2,
        Math.sin(angle) * MID_R + Math.sin(angle - Math.PI / 2) * 0.95,
      )
      riser.rotation.y = -angle
      riser.castShadow    = true
      riser.receiveShadow = true
      scene.add(riser)
    }

    // ── Railing posts ─────────────────────────────────────────────────────
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8)
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const angle = (i / STEPS_PER_REV) * Math.PI * 2
      const y     = -i * STEP_RISE
      const post  = new THREE.Mesh(postGeo, railMat)
      post.position.set(
        Math.cos(angle) * (OUTER_R - 0.9),
        y + 0.55,
        Math.sin(angle) * (OUTER_R - 0.9),
      )
      post.castShadow = true
      scene.add(post)
    }

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

    // ── Animation loop ────────────────────────────────────────────────────
    let frameId: number
    const tmpLook = new THREE.Vector3()
    const startPos = new THREE.Vector3(4, 18, 8)
    const entryPos = new THREE.Vector3(CAMERA_R, EYE_H, 0)

    const animate = () => {
      frameId = requestAnimationFrame(animate)

      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const overall   = Math.min(scroll.y / maxScroll, 1)

      if (overall < INTRO_END) {
        // ── Phase 1: bird's-eye zoom-in ──────────────────────────────────
        const t = easeInOut(overall / INTRO_END)
        camera.position.lerpVectors(startPos, entryPos, t)
        tmpLook.set(
          THREE.MathUtils.lerp(0, Math.cos(0.4) * 2, t),
          THREE.MathUtils.lerp(2, EYE_H - 0.5, t),
          THREE.MathUtils.lerp(0, Math.sin(0.4) * 2, t),
        )
        camera.lookAt(tmpLook)
      } else {
        // ── Phase 2: helix descent ────────────────────────────────────────
        const p     = (overall - INTRO_END) / (1 - INTRO_END)
        const angle = p * TOTAL_REVS * Math.PI * 2
        const depth = p * TOTAL_DEPTH

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
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 w-full h-full" />
}
