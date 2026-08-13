/**
 * The camera journey.
 *
 * `t` runs 0 → 1 across the whole trip. Up to STAIRS_T it rides the helix, at
 * the same eye height and look-ahead the original stairwell used. After that it
 * walks out through the door into the bedroom.
 *
 * The walk-out is deliberately a straight line. TOTAL_STEPS is chosen so the
 * descent ends on a bearing of 36°, where the tangent of the helix already
 * points at the doorway — so the camera simply keeps going and passes through
 * the middle of the opening, rather than swinging around to line itself up.
 * Only the gaze turns: it pans off the central column onto the walk before the
 * door arrives, holds through the opening, then settles down the room.
 *
 * ANCHORS holds one value of `t` per scroll section. The page is scroll-snapped,
 * so every resting position lands on one of these — which is what puts each
 * painting in frame instead of halfway past it.
 */
import * as THREE from 'three'
import {
  ABOUT_STEP, CAMERA_R, DOOR_Z, EYE_H, FLOOR_Y, LOOK_DROP, LOOK_LEAD, LOOK_R,
  PROJECT_ANCHORS, STAIRS_T, STEP_ANGLE, TOTAL_STEPS,
} from './layout'

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

/** Shortest-path angle blend, so a turn never spins the long way round. */
function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

/** Position and look target on the helix at a given step. */
function helix(step: number, pos: THREE.Vector3, look: THREE.Vector3) {
  const angle = step * STEP_ANGLE
  pos.set(Math.cos(angle) * CAMERA_R, -step + EYE_H, Math.sin(angle) * CAMERA_R)
  look.set(
    Math.cos(angle + LOOK_LEAD) * LOOK_R,
    -step + EYE_H - LOOK_DROP,
    Math.sin(angle + LOOK_LEAD) * LOOK_R,
  )
}

// ─── The walk out ───────────────────────────────────────────────────────────

const EYE_Y = FLOOR_Y + EYE_H

const footOfStairs = new THREE.Vector3()
const footLook = new THREE.Vector3()
helix(TOTAL_STEPS, footOfStairs, footLook)

/** Middle of the doorway, halfway through the thickness of the wall. */
const doorCentre = new THREE.Vector3(0, EYE_Y, DOOR_Z + 0.8)

const walk = doorCentre.clone().sub(footOfStairs).normalize()
const toDoor = doorCentre.distanceTo(footOfStairs)
const along = (d: number) => footOfStairs.clone().addScaledVector(walk, d)

/**
 * Four collinear points carry the camera from the foot of the stairs, through
 * the centre of the doorway, and out the far side — a Catmull-Rom through
 * collinear points is a straight line, so the door transit has no curvature at
 * all. Only once well inside the room does it ease onto the centreline.
 */
const APPROACH_POINTS = [
  footOfStairs.clone(),
  along(toDoor * 0.5),
  along(toDoor),
  along(toDoor * 1.5),
  new THREE.Vector3(-3, EYE_Y, 21.5),
  new THREE.Vector3(0, EYE_Y, 28),
]

const approach = new THREE.CatmullRomCurve3(APPROACH_POINTS, false, 'centripetal')

const handoff = footLook.clone().sub(footOfStairs)
const YAW_STAIRS = Math.atan2(handoff.z, handoff.x)
const PITCH_STAIRS = Math.asin(handoff.y / handoff.length())

/** Heading of the walk itself, and of the room beyond it. */
const YAW_WALK = Math.atan2(walk.z, walk.x)
const YAW_ROOM = Math.PI / 2

/**
 * Where the gaze points across the walk out. It is on the walk well before the
 * doorway (u ≈ 0.4) and holds there until the camera is fully inside.
 */
const YAW_KEYS: [number, number][] = [
  [0, YAW_STAIRS],
  [0.3, YAW_WALK],
  [0.55, YAW_WALK],
  [1, YAW_ROOM],
]

function yawAt(u: number) {
  for (let i = 1; i < YAW_KEYS.length; i++) {
    const [u1, a1] = YAW_KEYS[i]
    if (u > u1) continue
    const [u0, a0] = YAW_KEYS[i - 1]
    return lerpAngle(a0, a1, easeInOut(clamp01((u - u0) / (u1 - u0))))
  }
  return YAW_ROOM
}

export function journey(t: number, pos: THREE.Vector3, look: THREE.Vector3) {
  if (t <= STAIRS_T) {
    helix(ABOUT_STEP + (TOTAL_STEPS - ABOUT_STEP) * (t / STAIRS_T), pos, look)
    return
  }
  const u = clamp01((t - STAIRS_T) / (1 - STAIRS_T))
  approach.getPoint(u, pos)

  const yaw = yawAt(u)
  const pitch = PITCH_STAIRS + (-0.1 - PITCH_STAIRS) * easeInOut(clamp01(u / 0.3))
  look.set(
    pos.x + Math.cos(yaw) * Math.cos(pitch) * 14,
    pos.y + Math.sin(pitch) * 14,
    pos.z + Math.sin(yaw) * Math.cos(pitch) * 14,
  )
}

// ─── Scroll anchors ─────────────────────────────────────────────────────────

const tOfStep = (step: number) =>
  ((step - ABOUT_STEP) / (TOTAL_STEPS - ABOUT_STEP)) * STAIRS_T

/**
 * One anchor per scroll section. The last one sits inside the bedroom, not at
 * the foot of the stairs, so the final section runs the bottom of the descent
 * and the walk through the door together as one continuous move.
 */
export const ANCHORS = [
  0,                                  // about-me landing
  ...PROJECT_ANCHORS.map(tOfStep),    // one per painting
  1,                                  // down the last flight and into the bedroom
]

/** Scroll fraction → journey position, walking the anchor list. */
export function tFromScroll(frac: number) {
  const span = clamp01(frac) * (ANCHORS.length - 1)
  const i = Math.min(Math.floor(span), ANCHORS.length - 2)
  return ANCHORS[i] + (ANCHORS[i + 1] - ANCHORS[i]) * (span - i)
}

/**
 * How far the double door has swung open, in radians. It swings while the
 * camera is panning onto the walk, and is fully open before the camera reaches
 * the wall at u ≈ 0.36, so the way through is never blocked.
 */
export function doorSwing(t: number) {
  const u = (t - STAIRS_T) / (1 - STAIRS_T)
  return easeInOut(clamp01((u - 0.05) / 0.25)) * (Math.PI / 2)
}
