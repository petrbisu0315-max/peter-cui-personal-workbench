/**
 * Where the two flat papers sit on the right-hand side of the desk.
 *
 * The research stack and the résumé are placed from the desk's own measured footprint
 * instead of from hand-authored coordinates. A fixed coordinate is what let the résumé
 * hang past the desk's right edge, because the props were modelled against a different
 * desk; deriving the pair from the footprint keeps both of them on the desktop.
 */

export type DeskArea = { minX: number; maxX: number; minZ: number; maxZ: number }
/** Footprint of a flat paper stack lying on the desk, in model units. */
export type PaperFootprint = { widthX: number; depthZ: number }
export type PaperPlacement = { leftX: number; centerZ: number }

/** Clearance kept from the desk's right edge, so nothing hangs over it. */
export const PAPER_EDGE_MARGIN_X = 0.08
/** Gap between the research stack and the résumé laid beside it. */
export const PAPER_GAP_X = 0.09
/** Clearance kept to the right of the laptop, which shares the desktop. */
export const PAPER_CLEARANCE_X = 0.08

export type DeskPaperPlan = {
  research: PaperPlacement
  resume: PaperPlacement
}

export function planDeskPapers(
  desk: DeskArea,
  laptopMaxX: number,
  research: PaperFootprint,
  resume: PaperFootprint,
): DeskPaperPlan {
  const bandLeft = laptopMaxX + PAPER_CLEARANCE_X
  const bandRight = desk.maxX - PAPER_EDGE_MARGIN_X
  const available = Math.max(0, bandRight - bandLeft)
  const span = research.widthX + PAPER_GAP_X + resume.widthX
  // On a desk too narrow for the pair, keep the gap and give up the laptop clearance
  // instead: hanging over the right edge is the failure this layout exists to prevent.
  const startX = available >= span ? bandLeft + (available - span) / 2 : bandRight - span
  const centerZ = (desk.minZ + desk.maxZ) / 2
  return {
    research: { leftX: startX, centerZ },
    resume: { leftX: startX + research.widthX + PAPER_GAP_X, centerZ },
  }
}
