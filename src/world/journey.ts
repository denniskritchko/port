/**
 * The camera journey.
 *
 * `t` runs 0 → 1 across the whole trip. Up to STAIRS_T it rides the helix, at
 * the same eye height and look-ahead the original stairwell used. After that it
 * hands over to a hand-laid curve that turns away from the column, walks
 * through the door and settles in the bedroom.
 *
 * ANCHORS holds one value of `t` per scroll section. The page is scroll-snapped,
 * so every resting position lands on one of these — which is what puts each
 * painting in frame instead of halfway past it.
 */
import * as THREE from 'three'
import {
  ABOUT_STEP, CAMERA_R, EYE_H, FLOOR_Y, LOOK_DROP, LOOK_LEAD, LOOK_R,
  PROJECT_ANCHORS, STAIRS_T, STEP_ANGLE, TOTAL_STEPS,
} from './layout'

const tOfStep = (step: number) =>
  ((step - ABOUT_STEP) / (TOTAL_STEPS - ABOUT_STEP)) * STAIRS_T

export const ANCHORS = [
  0,                                  // about-me landing
  ...PROJECT_ANCHORS.map(tOfStep),    // one per painting
  STAIRS_T,                           // bottom of the stairs
  STAIRS_T + (1 - STAIRS_T) * 0.4,    // framed in the doorway
  STAIRS_T + (1 - STAIRS_T) * 0.7,    // over the threshold
  1,                                  // settled in the bedroom
]

const endAngle = TOTAL_STEPS * STEP_ANGLE

/** Waypoints from the foot of the stairs to the middle of the bedroom. */
const APPROACH_POINTS = [
  new THREE.Vector3(Math.cos(endAngle) * CAMERA_R, FLOOR_Y + EYE_H, Math.sin(endAngle) * CAMERA_R),
  new THREE.Vector3(1.2, FLOOR_Y + EYE_H, 8.2),
  new THREE.Vector3(0,   FLOOR_Y + EYE_H, 10.5),
  new THREE.Vector3(0,   FLOOR_Y + EYE_H, 15),
  new THREE.Vector3(0,   FLOOR_Y + EYE_H, 20),
  new THREE.Vector3(0,   FLOOR_Y + EYE_H, 26),
]

const approach = new THREE.CatmullRomCurve3(APPROACH_POINTS, false, 'centripetal')

/** Shortest-path angle blend, so the turn to the door never spins the long way. */
function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

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

// Heading the helix ends on. The walk to the door pans away from exactly this,
// so the hand-off off the stairs has no visible snap.
const handoffPos = new THREE.Vector3()
const handoffLook = new THREE.Vector3()
helix(TOTAL_STEPS, handoffPos, handoffLook)
const handoff = handoffLook.clone().sub(handoffPos)
const YAW_0 = Math.atan2(handoff.z, handoff.x)
const PITCH_0 = Math.asin(handoff.y / handoff.length())

/** How far through the approach the pan to the doorway completes. */
const TURN_U = 0.55

export function journey(t: number, pos: THREE.Vector3, look: THREE.Vector3) {
  if (t <= STAIRS_T) {
    helix(ABOUT_STEP + (TOTAL_STEPS - ABOUT_STEP) * (t / STAIRS_T), pos, look)
    return
  }
  const u = clamp01((t - STAIRS_T) / (1 - STAIRS_T))
  approach.getPoint(u, pos)

  const turn = easeInOut(clamp01(u / TURN_U))
  const yaw = lerpAngle(YAW_0, Math.PI / 2, turn)
  const pitch = PITCH_0 + (-0.1 - PITCH_0) * turn
  look.set(
    pos.x + Math.cos(yaw) * Math.cos(pitch) * 14,
    pos.y + Math.sin(pitch) * 14,
    pos.z + Math.sin(yaw) * Math.cos(pitch) * 14,
  )
}

/** Scroll fraction → journey position, walking the anchor list. */
export function tFromScroll(frac: number) {
  const span = clamp01(frac) * (ANCHORS.length - 1)
  const i = Math.min(Math.floor(span), ANCHORS.length - 2)
  return ANCHORS[i] + (ANCHORS[i + 1] - ANCHORS[i]) * (span - i)
}

/** How far the double door has swung open, in radians, at journey position `t`. */
export function doorSwing(t: number) {
  const u = (t - STAIRS_T) / (1 - STAIRS_T)
  return easeInOut(clamp01((u - 0.05) / 0.38)) * (Math.PI / 2)
}
