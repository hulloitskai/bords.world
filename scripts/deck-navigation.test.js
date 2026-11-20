import { expect, test } from "bun:test"
import { connectDeckNavigation } from "../src/deck-navigation.ts"

test("Deck navigation interrupts motion and settles only the final Selected Card", () => {
  let frame
  const view = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: false }),
    performance: { now: () => 0 },
    requestAnimationFrame(callback) {
      frame = callback
      return 1
    },
    cancelAnimationFrame() {
      frame = undefined
    },
    setTimeout,
    clearTimeout,
  })
  const captured = new Set()
  const deck = Object.assign(new EventTarget(), {
    ownerDocument: {
      defaultView: view,
      documentElement: { scrollHeight: 800, clientHeight: 800 },
    },
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
  })
  const selected = []
  const settled = []
  const cards = Array.from({ length: 5 }, () => ({ offsetWidth: 200 }))
  const navigation = connectDeckNavigation(deck, cards, {
    onPosition() {},
    onSelect: (index) => selected.push(index),
    onSettle: (index) => settled.push(index),
  })

  function input(target, type, properties, hit = target) {
    const event = new Event(type, { cancelable: true })
    Object.defineProperty(event, "target", { value: hit })
    target.dispatchEvent(Object.assign(event, properties))
    return event
  }

  try {
    navigation.step(-1, false)
    frame(130)
    expect(selected).toEqual([4])
    expect(settled).toEqual([])

    input(view, "wheel", { deltaX: 0, deltaY: 120, deltaMode: 0 })
    expect(frame).toBeUndefined()
    input(view, "keydown", { key: "ArrowRight" })
    expect(selected).toEqual([4, 0, 1])
    expect(settled).toEqual([1])

    input(deck, "pointerdown", {
      pointerId: 7,
      clientX: 200,
      isPrimary: true,
      button: 0,
    })
    input(deck, "pointermove", { pointerId: 7, clientX: 80 })
    navigation.step(1, true)
    expect(selected).toEqual([4, 0, 1, 2])
    expect(settled).toEqual([1])

    navigation.jumpTo(3)
    input(deck, "pointerup", { pointerId: 7, clientX: 0 })
    expect(captured.size).toBe(0)
    expect(selected).toEqual([4, 0, 1, 2, 3])
    expect(settled).toEqual([1, 3])

    navigation.jumpTo(0)
    const pointer = { pointerId: 8, clientX: 200, clientY: 100 }
    const press = { ...pointer, isPrimary: true, button: 0 }

    input(deck, "pointerdown", press, cards[4])
    input(deck, "pointerup", pointer)
    frame(65)
    expect(selected.at(-1)).toBe(4)
    frame(260)
    expect(settled.at(-1)).toBe(4)

    input(deck, "pointerdown", press, cards[2])
    input(deck, "pointermove", { ...pointer, clientX: 20 })
    input(deck, "pointerup", { ...pointer, clientX: 20 })
    frame(260)
    expect(settled.at(-1)).toBe(1)
  } finally {
    navigation.disconnect()
  }
})
