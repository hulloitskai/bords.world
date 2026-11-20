export function wrapDeckPosition(position: number, count: number) {
  return ((position % count) + count) % count
}

export function connectDeckNavigation(
  deck: HTMLElement,
  cards: readonly HTMLElement[],
  {
    onPosition,
    onSelect,
    onSettle,
  }: {
    onPosition: (position: number, selected: number) => void
    onSelect: (index: number) => void
    onSettle: (index: number) => void
  }
) {
  const view = deck.ownerDocument.defaultView!
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)")
  const count = cards.length
  let position = 0
  let target = 0
  let current = 0
  let settled = 0
  let frame = 0
  let wheelTimer: number | undefined
  let wheelPosition = 0
  const tapSlop = 6
  let drag:
    | {
        id: number
        origin: number
        x: number
        y: number
        cardIndex: number
        lastX: number
        time: number
        speed: number
        pixelsPerCard: number
      }
    | undefined

  function draw(value: number) {
    position = value
    const front = wrapDeckPosition(Math.round(value), count)
    onPosition(value, front)
    if (current !== front) {
      current = front
      onSelect(front)
    }
  }

  function stop() {
    view.cancelAnimationFrame(frame)
    view.clearTimeout(wheelTimer)
    wheelTimer = undefined
  }

  function finishSettling(next: number) {
    const index = wrapDeckPosition(next, count)
    draw(index)
    target = position
    if (index !== settled) {
      settled = index
      onSettle(index)
    }
  }

  function settle(next: number, instant = false) {
    stop()
    target = next
    const origin = position
    if (instant || reduced.matches || origin === next) {
      finishSettling(next)
      return
    }
    const start = view.performance.now()
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / 260)
      if (progress === 1) {
        finishSettling(next)
        return
      }
      draw(origin + (next - origin) * (1 - (1 - progress) ** 3))
      frame = view.requestAnimationFrame(tick)
    }
    frame = view.requestAnimationFrame(tick)
  }

  function step(direction: number, instant: boolean) {
    if (!drag)
      settle(
        (wheelTimer === undefined ? target : Math.round(wheelPosition)) +
          direction,
        instant
      )
  }

  function onKey(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    step(event.key === "ArrowLeft" ? -1 : 1, true)
  }

  function onWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey || drag) return
    const page = deck.ownerDocument.documentElement
    if (page.scrollHeight > page.clientHeight) return
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY
    if (!delta) return
    event.preventDefault()
    if (wheelTimer === undefined) wheelPosition = position
    stop()
    const unit =
      event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? deck.clientWidth : 1
    wheelPosition += Math.max(-1.5, Math.min(1.5, (delta * unit) / 120))
    if (!reduced.matches) draw(wheelPosition)
    wheelTimer = view.setTimeout(() => settle(Math.round(wheelPosition)), 110)
  }

  function onDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return
    stop()
    drag = {
      id: event.pointerId,
      origin: position,
      x: event.clientX,
      y: event.clientY,
      cardIndex: cards.indexOf(event.target as HTMLElement),
      lastX: event.clientX,
      time: event.timeStamp,
      speed: 0,
      pixelsPerCard: Math.max(cards[0].offsetWidth * 0.55, 110),
    }
    deck.setPointerCapture(event.pointerId)
  }

  function onMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    if (drag.cardIndex >= 0) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= tapSlop)
        return
      drag.cardIndex = -1
    }
    drag.speed =
      (drag.lastX - event.clientX) / Math.max(8, event.timeStamp - drag.time)
    drag.lastX = event.clientX
    drag.time = event.timeStamp
    if (!reduced.matches)
      draw(drag.origin + (drag.x - event.clientX) / drag.pixelsPerCard)
  }

  function onEnd(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    if (
      event.type === "pointerup" &&
      drag.cardIndex >= 0 &&
      Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= tapSlop
    ) {
      const offset =
        wrapDeckPosition(drag.cardIndex - position + count / 2, count) -
        count / 2
      drag = undefined
      settle(Math.round(position + offset))
      return
    }
    const flick =
      event.timeStamp - drag.time < 65
        ? Math.max(-70, Math.min(70, drag.speed * 90))
        : 0
    const next =
      event.type === "pointerup"
        ? Math.round(
            drag.origin + (drag.x - event.clientX + flick) / drag.pixelsPerCard
          )
        : Math.round(position)
    drag = undefined
    settle(next)
  }

  function jumpTo(next: number) {
    const pointerId = drag?.id
    drag = undefined
    if (pointerId !== undefined && deck.hasPointerCapture(pointerId)) {
      deck.releasePointerCapture(pointerId)
    }
    settle(next, true)
  }

  view.addEventListener("keydown", onKey)
  view.addEventListener("wheel", onWheel, { passive: false })
  deck.addEventListener("pointerdown", onDown)
  deck.addEventListener("pointermove", onMove)
  deck.addEventListener("pointerup", onEnd)
  deck.addEventListener("pointercancel", onEnd)
  deck.addEventListener("lostpointercapture", onEnd)

  function disconnect() {
    stop()
    view.removeEventListener("keydown", onKey)
    view.removeEventListener("wheel", onWheel)
    deck.removeEventListener("pointerdown", onDown)
    deck.removeEventListener("pointermove", onMove)
    deck.removeEventListener("pointerup", onEnd)
    deck.removeEventListener("pointercancel", onEnd)
    deck.removeEventListener("lostpointercapture", onEnd)
  }

  return { step, jumpTo, disconnect }
}
