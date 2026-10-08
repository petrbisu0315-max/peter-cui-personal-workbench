import { describe, expect, it } from 'vitest'
import { PAPER_CLEARANCE_X, PAPER_EDGE_MARGIN_X, PAPER_GAP_X, planDeskPapers } from './deskLayout'

// Measured from peter-hero-current-safe.glb: PROP_Desk_GLB spans these bounds, and the
// laptop ends at X 0.426. The research stack and the résumé slot are turned 90° so their
// long sides run away from the chair, which is what these footprints describe.
const DESK = { minX: -2.955, maxX: 1.897, minZ: -1.47, maxZ: 0.044 }
const LAPTOP_MAX_X = 0.426
const RESEARCH = { widthX: 0.684, depthZ: 0.985 }
// Wider than the nominal sheet because the résumé keeps a slight casual tilt.
const RESUME = { widthX: 0.44, depthZ: 0.607 }

describe('desk paper placement', () => {
  it('keeps both papers on the desktop, clear of the edge and of the laptop', () => {
    const plan = planDeskPapers(DESK, LAPTOP_MAX_X, RESEARCH, RESUME)
    expect(plan.research.leftX).toBeGreaterThanOrEqual(LAPTOP_MAX_X + PAPER_CLEARANCE_X)
    expect(plan.research.leftX + RESEARCH.widthX).toBeLessThan(plan.resume.leftX)
    expect(plan.resume.leftX - (plan.research.leftX + RESEARCH.widthX)).toBeCloseTo(PAPER_GAP_X, 6)
    // The résumé is the last item, so its right edge is what used to overhang the desk.
    expect(plan.resume.leftX + RESUME.widthX).toBeLessThanOrEqual(DESK.maxX - PAPER_EDGE_MARGIN_X + 1e-9)
  })

  it('centres the pair in the space the desk actually has', () => {
    const plan = planDeskPapers(DESK, LAPTOP_MAX_X, RESEARCH, RESUME)
    const before = plan.research.leftX - (LAPTOP_MAX_X + PAPER_CLEARANCE_X)
    const after = DESK.maxX - PAPER_EDGE_MARGIN_X - (plan.resume.leftX + RESUME.widthX)
    expect(before).toBeCloseTo(after, 6)
  })

  it('places both papers in the same band across the desk depth', () => {
    const plan = planDeskPapers(DESK, LAPTOP_MAX_X, RESEARCH, RESUME)
    expect(plan.research.centerZ).toBe(plan.resume.centerZ)
    expect(plan.research.centerZ).toBeCloseTo((DESK.minZ + DESK.maxZ) / 2, 6)
    expect(plan.research.centerZ - RESEARCH.depthZ / 2).toBeGreaterThan(DESK.minZ)
    expect(plan.research.centerZ + RESEARCH.depthZ / 2).toBeLessThan(DESK.maxZ)
  })

  it('stays on a narrow desk by giving up the laptop clearance, not the right edge', () => {
    const narrow = { ...DESK, maxX: 1.35 }
    const plan = planDeskPapers(narrow, LAPTOP_MAX_X, RESEARCH, RESUME)
    // The right edge is the hard limit; the pair slides left instead of hanging over.
    expect(plan.resume.leftX + RESUME.widthX).toBeCloseTo(narrow.maxX - PAPER_EDGE_MARGIN_X, 6)
    expect(plan.research.leftX).toBeLessThan(LAPTOP_MAX_X + PAPER_CLEARANCE_X)
    expect(plan.resume.leftX - (plan.research.leftX + RESEARCH.widthX)).toBeCloseTo(PAPER_GAP_X, 6)
  })
})
