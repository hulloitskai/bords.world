import type { CSSProperties } from "react"

export const cardArtwork = { width: 629, height: 880 } as const

const cardRatio = cardArtwork.height / cardArtwork.width
const visibleDistance = 3.7
const tiltPerCard = 8
const backScale = 0.86
const frontLift = 0.09
const fanSpread = 1.48

// Measure the fan in units of card width, so the same geometry works at any size.
function cardPose(offset: number) {
  const proximity = Math.max(0, 1 - Math.abs(offset))
  const angle = offset * 0.4
  return {
    x: Math.sin(angle) * fanSpread,
    y: 0.68 * (1 - Math.cos(angle)) - proximity * frontLift,
    rotation: offset * tiltPerCard,
    scale: backScale + (1 - backScale) * proximity,
  }
}

function cardExtents(offset: number) {
  const { x, y, rotation, scale } = cardPose(offset)
  const radians = (rotation * Math.PI) / 180
  const sin = Math.sin(radians)
  const cos = Math.cos(radians)

  return {
    right: x + (scale * (cos + cardRatio * sin)) / 2,
    bottom: y + (scale * (sin + cardRatio * cos)) / 2,
  }
}

// Beyond one card, the projected extents grow up to the visibility cutoff.
const outer = cardExtents(visibleDistance)
const restingOuter = cardExtents(Math.ceil(visibleDistance) - 1)
// Lift drops faster than rotation raises a corner, and scaled back cards sit lower.
const top = cardRatio / 2 + frontLift
const centerY = (top - restingOuter.bottom) / 2

export const fanSizing: CSSProperties & Record<`--${string}`, string | number> =
  {
    // Display the @2x artwork at half its pixel width.
    "--card-max-width": `${cardArtwork.width / 2}px`,
    "--card-aspect-ratio": `${cardArtwork.width} / ${cardArtwork.height}`,
    "--fan-width": 2 * outer.right,
    "--resting-fan-height": top + restingOuter.bottom,
    "--motion-clearance": outer.bottom - restingOuter.bottom,
    // Retain the visual allowance around the Selected Card at the half-step.
    "--mobile-focus-width": Math.max(1.69, 2 * cardExtents(0.5).right),
  }

export function cardStyleAt(offset: number, selected: boolean, count: number) {
  const distance = Math.abs(offset)
  const opacity = Math.min(1, Math.max(0, (visibleDistance - distance) * 2))
  const { x, y, rotation, scale } = cardPose(offset)
  const translateY = ((y + centerY) / cardRatio) * 100
  // Center the mobile Selected Card and taper the shift to zero at the fan's edge.
  const centerOffset =
    ((frontLift - centerY) / cardRatio) *
    100 *
    Math.max(0, 1 - (distance / visibleDistance) ** 2)

  return {
    opacity,
    pointerEvents: opacity > 0 ? "auto" : "none",
    transform:
      opacity === 0
        ? "none"
        : `translate(${x * 100}%, calc(${translateY}% + ${centerOffset}% * var(--center-selected-card, 0))) rotate(${rotation}deg) scale(${scale})`,
    zIndex: selected ? count * 100 + 1 : Math.round((count - distance) * 100),
  }
}
