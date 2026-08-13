/**
 * Shared dimensions for the whole build, in blocks (1 block = 1 world unit).
 *
 * The stairwell is a voxelised circular tower: a solid column in the middle,
 * a sandstone shell outside, and a helical staircase filling the ring between
 * them. Each step drops exactly one block and ten steps make a full turn, so
 * every tenth step sits at the same bearing — which is what keeps the project
 * paintings stacked on one wall as you spiral past them.
 *
 * Because the treads tile the ring in ten 36° wedges, the wall between two
 * consecutive passes of the same wedge is clear for eight blocks. Paintings are
 * sized and placed to sit inside that gap, so the stairs never cut across one.
 */

// ─── Stairwell ──────────────────────────────────────────────────────────────
export const STEPS_PER_REV = 10
export const TOTAL_STEPS   = 92                 // 9.2 turns down to the floor
export const STEP_ANGLE    = (Math.PI * 2) / STEPS_PER_REV

export const INNER_R = 2.6                      // central column radius
export const OUTER_R = 11                       // inner face of the outer wall
export const WALL_T  = 1.6                      // wall thickness
export const TOP_Y   = 8                        // shell rises this high above step 0

/** Walking surface at the bottom of the shaft; floor blocks sit one cell below. */
export const FLOOR_Y    = -TOTAL_STEPS
export const FLOOR_CELL = FLOOR_Y - 1

// ─── Camera rig (proportions carried over from the original stairwell) ──────
export const CAMERA_R  = 7
export const EYE_H     = 5
export const LOOK_R    = 3.4
export const LOOK_LEAD = 0.45                   // radians ahead the camera looks
export const LOOK_DROP = 0.85

// ─── Journey ────────────────────────────────────────────────────────────────
export const ABOUT_STEP      = 36               // where the intro swoop lands
export const PROJECT_ANCHORS = [42, 52, 62, 72, 82]

/**
 * Painting placement relative to the camera anchor that frames it: 126° further
 * round the spiral puts the canvas ~14° left of centre and 17 blocks out, and a
 * +1 block rise centres it in the clear span between two passes of the stairs.
 */
export const PAINT_ANGLE_LEAD = (126 * Math.PI) / 180
export const PAINT_Y_LEAD     = 1
export const PAINT_R          = 11.6            // canvas face, recessed into the wall

/**
 * Every painting is scaled to fit this box, preserving its aspect.
 *
 * The height is what the treads allow: a canvas this size clears the flights
 * above and below it even where it laps a block into the neighbouring wedge,
 * whose stairs sit one block offset. The width keeps the alcove inside the
 * shell. Both are load-bearing — grow them and the stairs will clip a canvas.
 */
export const PAINT_MAX_W = 7.4
export const PAINT_MAX_H = 5.8

/** Scale a framed artwork's aspect ratio into that box. */
export function paintingSize(aspect: number) {
  const width = Math.min(PAINT_MAX_W, PAINT_MAX_H * aspect)
  return { width, height: width / aspect }
}

/** Bearing shared by all five paintings — one wall, a full turn apart. */
export const PAINT_ANGLE = PROJECT_ANCHORS[0] * STEP_ANGLE + PAINT_ANGLE_LEAD

/** Fraction of the scroll spent descending, before the walk to the bedroom. */
export const STAIRS_T = 0.78

// ─── Bedroom ────────────────────────────────────────────────────────────────
// The room hangs off the +Z side of the tower. Interior cells span
// x ∈ [ROOM_X0, ROOM_X1], z ∈ [ROOM_Z0, ROOM_Z1], y ∈ [FLOOR_Y, FLOOR_Y + ROOM_H - 1].
export const ROOM_X0 = -20
export const ROOM_X1 = 19
export const ROOM_Z0 = 12
export const ROOM_Z1 = 47
export const ROOM_H  = 14

/**
 * Doorway punched through the tower wall on the +Z axis. Eight blocks tall is
 * exactly the headroom under the last flight of stairs passing overhead.
 */
export const DOOR_HALF_W = 3                    // opening spans cells x = -3 … 2
export const DOOR_H      = 8
export const DOOR_Z      = 11                   // cell the door leaves hang in

/** Angle of a step, and the walking surface it leads to. */
export const stepAngle = (step: number) => step * STEP_ANGLE
export const stepY     = (step: number) => -step
