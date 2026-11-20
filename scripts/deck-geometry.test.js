import { expect, test } from "bun:test"
import { cardStyleAt, fanSizing } from "../src/deck-geometry.ts"

test("the fan reserves swipe clearance and centers the resting Selected Card on mobile", () => {
  expect(fanSizing["--fan-width"]).toBeCloseTo(4.29)
  expect(fanSizing["--resting-fan-height"]).toBeCloseTo(1.95)
  expect(fanSizing["--motion-clearance"]).toBeCloseTo(0.196, 3)
  expect(fanSizing["--mobile-focus-width"]).toBe(1.69)

  const { transform } = cardStyleAt(0, true, 12)
  const [, translateY, centerOffset] =
    transform.match(/calc\(([-.\d]+)% \+ ([-.\d]+)% \*/) ?? []
  expect(Number(translateY) + Number(centerOffset)).toBeCloseTo(0)
})
