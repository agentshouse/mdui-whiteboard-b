import { describe, it, expect } from 'vitest'
import { strokeOutline } from '../vendor/quickdraw/freehand.js'

const finite = (arr) => arr.every((v) => Number.isFinite(v))

describe('strokeOutline', () => {
  it('empty input -> empty outline', () => {
    expect(strokeOutline([])).toEqual([])
  })

  it('a tap leaves a dot (12-gon around the point)', () => {
    const out = strokeOutline([10, 20, 0.5], { size: 8 })
    expect(out.length).toBe(24)
    expect(finite(out)).toBe(true)
    for (let i = 0; i < out.length; i += 2) {
      expect(Math.hypot(out[i] - 10, out[i + 1] - 20)).toBeCloseTo(4)
    }
  })

  it('a straight stroke produces a closed outline around the spine', () => {
    const pts = []
    for (let i = 0; i <= 20; i++) pts.push(i * 5, 0, 0.5)
    const out = strokeOutline(pts, { size: 6 })
    expect(out.length).toBeGreaterThan(40)
    expect(out.length % 2).toBe(0)
    expect(finite(out)).toBe(true)
    // outline hugs the spine: every point within size of y=0, x within range
    for (let i = 0; i < out.length; i += 2) {
      expect(Math.abs(out[i + 1])).toBeLessThanOrEqual(6)
      expect(out[i]).toBeGreaterThanOrEqual(-6)
      expect(out[i]).toBeLessThanOrEqual(106)
    }
  })

  it('pressure widens the stroke', () => {
    const mk = (p) => {
      const pts = []
      for (let i = 0; i <= 20; i++) pts.push(i * 5, 0, p)
      return strokeOutline(pts, { size: 8, taper: false })
    }
    const spanY = (out) => {
      let lo = Infinity, hi = -Infinity
      for (let i = 0; i < out.length; i += 2) {
        lo = Math.min(lo, out[i + 1])
        hi = Math.max(hi, out[i + 1])
      }
      return hi - lo
    }
    expect(spanY(mk(0.95))).toBeGreaterThan(spanY(mk(0.15)))
  })

  it('taper thins the tips relative to the middle', () => {
    const pts = []
    for (let i = 0; i <= 30; i++) pts.push(i * 5, 0, 0.8)
    const out = strokeOutline(pts, { size: 10, taper: true })
    const widthNear = (x) => {
      let w = 0
      for (let i = 0; i < out.length; i += 2) {
        if (Math.abs(out[i] - x) < 6) w = Math.max(w, Math.abs(out[i + 1]))
      }
      return w
    }
    expect(widthNear(2)).toBeLessThan(widthNear(75))
  })

  it('duplicate points do not blow up (no NaN)', () => {
    const out = strokeOutline([5, 5, 0.5, 5, 5, 0.5, 5, 5, 0.5, 6, 5, 0.5], { size: 4 })
    expect(finite(out)).toBe(true)
    expect(out.length).toBeGreaterThan(0)
  })

  it('velocity simulation kicks in when pressure is the 0.5 sentinel', () => {
    // same geometry, one slow (dense points) one fast (sparse points)
    const slow = [], fast = []
    for (let i = 0; i <= 100; i++) slow.push(i, 0, 0.5)
    for (let i = 0; i <= 10; i++) fast.push(i * 10, 0, 0.5)
    // measure width mid-stroke: the very first points start at full radius
    // for both (velocity has not accumulated yet)
    const w = (out) => {
      let hi = 0
      for (let i = 0; i < out.length; i += 2) {
        if (out[i] > 40 && out[i] < 60) hi = Math.max(hi, Math.abs(out[i + 1]))
      }
      return hi
    }
    const ws = w(strokeOutline(slow, { size: 8, taper: false }))
    const wf = w(strokeOutline(fast, { size: 8, taper: false }))
    expect(ws).toBeGreaterThan(wf) // fast = thin, like a real pen
  })
})
