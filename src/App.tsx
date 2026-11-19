import {
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Tooltip } from "@base-ui/react/tooltip"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BillRattleIcon } from "@/components/bill-rattle-icon"
import { BirdCallIcon } from "@/components/bird-call-icon"
import { BirdsongIcon } from "@/components/birdsong-icon"
import { PlaybackRing } from "@/components/playback-ring"
import { Button } from "@/components/ui/button"
import birds from "./birds.json"

const images = import.meta.glob<string>("./assets/cards/*.png", {
  eager: true,
  import: "default",
  query: "?url",
})
const recordings = import.meta.glob<string>("./assets/sounds/*.mp3", {
  eager: true,
  import: "default",
  query: "?url",
})
const soundTypes = [
  { key: "songs", label: "Song", icon: <BirdsongIcon /> },
  { key: "calls", label: "Call", icon: <BirdCallIcon /> },
  { key: "billRattles", label: "Bill rattle", icon: <BillRattleIcon /> },
] as const
const count = birds.length
const wrap = (index: number) => ((index % count) + count) % count

const cardRatio = 880 / 629
const visibleDistance = 3.7
const tiltPerCard = 8
const backScale = 0.86
const frontLift = 0.09
const fanSpread = 1.48

// Measure the fan in units of card width, so the same geometry works at any size.
function cardPose(offset: number, spread: number) {
  const proximity = Math.max(0, 1 - Math.abs(offset))
  const angle = offset * 0.4
  return {
    x: Math.sin(angle) * spread,
    y: 0.68 * (1 - Math.cos(angle)) - proximity * frontLift,
    rotation: offset * tiltPerCard,
    scale: backScale + (1 - backScale) * proximity,
  }
}

function fanBounds(spread: number) {
  const outer = cardPose(visibleDistance, spread)
  const radians = (outer.rotation * Math.PI) / 180
  const sin = Math.sin(radians)
  const cos = Math.cos(radians)

  // Beyond one card the scale is constant, and both projected half-extents
  // and outward shifts grow up to the visibility cutoff.
  const right = outer.x + (outer.scale * (cos + cardRatio * sin)) / 2
  const bottom = outer.y + (outer.scale * (sin + cardRatio * cos)) / 2

  // Inside one card, the lift drops faster than rotation can raise a corner.
  // Outside that range, the scaled half-diagonal is shorter than this depth.
  const top = cardRatio / 2 + frontLift

  const restingOuter = cardPose(Math.ceil(visibleDistance) - 1, spread)
  const restingAngle = (restingOuter.rotation * Math.PI) / 180
  const restingBottom =
    restingOuter.y +
    (restingOuter.scale *
      (Math.sin(restingAngle) + cardRatio * Math.cos(restingAngle))) /
      2
  const centerY = (top - restingBottom) / 2

  return {
    width: 2 * right,
    restingHeight: top + restingBottom,
    motionClearance: bottom - restingBottom,
    centerY,
  }
}

function SoundButton({
  paths,
  label,
  icon,
  audio,
  playing,
  onToggle,
}: {
  paths: string[]
  label: string
  icon: ReactNode
  audio: RefObject<HTMLAudioElement | null>
  playing: string | null
  onToggle: (url: string) => void
}) {
  const [index, setIndex] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  const press = useRef<{
    id: number
    x: number
    y: number
    time: number
  } | null>(null)
  const pointerAction = useRef<"next" | "ignore" | null>(null)
  const multiple = paths.length > 1
  const title = multiple ? `${label} ${index + 1} of ${paths.length}` : label
  const url = recordings[paths[index]]
  const active = playing === url

  function cancelPress() {
    if (!press.current) return
    press.current = null
    pointerAction.current = "ignore"
  }

  function playNext() {
    const next = (index + 1) % paths.length
    setIndex(next)
    setAnnouncement(`${label} ${next + 1}`)
    onToggle(recordings[paths[next]])
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        delay={250}
        closeOnClick={false}
        render={
          <Button
            size="icon-xl"
            variant="filled"
            className="sound-button relative rounded-full motion-reduce:transition-none"
            aria-label={title}
            aria-pressed={active}
            data-playing={active}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return
              pointerAction.current = null
              press.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                time: event.timeStamp,
              }
            }}
            onPointerMove={(event) => {
              const start = press.current
              if (
                start?.id === event.pointerId &&
                Math.hypot(event.clientX - start.x, event.clientY - start.y) >
                  10
              ) {
                cancelPress()
              }
            }}
            onPointerUp={(event) => {
              const start = press.current
              if (start?.id !== event.pointerId) return
              press.current = null
              if (multiple && event.timeStamp - start.time >= 500)
                pointerAction.current = "next"
            }}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onLostPointerCapture={cancelPress}
            onBlur={cancelPress}
            onContextMenu={(event) => {
              if (press.current) event.preventDefault()
            }}
            onClick={(event) => {
              const action = event.detail > 0 ? pointerAction.current : null
              pointerAction.current = null
              if (action === "next") playNext()
              if (action === null) onToggle(url)
            }}
          />
        }
      >
        {icon}
        <PlaybackRing
          audio={audio}
          url={url}
          count={paths.length}
          index={index}
        />
      </Tooltip.Trigger>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={8} className="z-10">
          <Tooltip.Popup
            role="tooltip"
            className="sound-tooltip rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
          >
            {title}
            <Tooltip.Arrow className="size-2 rotate-45 bg-primary data-[side=bottom]:-top-1 data-[side=left]:-right-1 data-[side=right]:-left-1 data-[side=top]:-bottom-1" />
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function App() {
  const stage = useRef<HTMLDivElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const navigation = useRef<HTMLDivElement>(null)
  const step = useRef<(direction: number, instant: boolean) => void>(() => {})
  const [selected, setSelected] = useState(0)
  const [playing, setPlaying] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const bird = birds[selected]

  function toggleSound(url: string) {
    const player = audio.current!
    if (player.getAttribute("src") === url && !player.paused) {
      player.pause()
      return
    }
    setFailed(false)
    if (player.getAttribute("src") !== url || player.error) player.src = url
    void player.play().catch((error) => {
      if (error.name !== "AbortError" && player.getAttribute("src") === url) {
        setPlaying(null)
        setFailed(true)
      }
    })
  }

  useLayoutEffect(() => {
    const deck = stage.current!
    const player = audio.current!
    const cards = Array.from(deck.querySelectorAll("img"))
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const controls = navigation.current!
    const layout = controls.parentElement!
    const bounds = fanBounds(fanSpread)
    layout.style.setProperty("--fan-width", String(bounds.width))
    layout.style.setProperty(
      "--resting-fan-height",
      String(bounds.restingHeight)
    )
    layout.style.setProperty(
      "--motion-clearance",
      String(bounds.motionClearance)
    )

    function measureControls() {
      layout.style.setProperty(
        "--controls-height",
        controls.getBoundingClientRect().height + "px"
      )
    }

    measureControls()
    const controlsObserver = new ResizeObserver(measureControls)
    controlsObserver.observe(controls)
    let position = 0
    let target = 0
    let current = 0
    let frame = 0
    let wheelTimer: number | undefined
    let wheelPosition = 0
    let drag:
      | {
          id: number
          origin: number
          x: number
          lastX: number
          time: number
          speed: number
          pixelsPerCard: number
        }
      | undefined

    function draw(value: number) {
      position = value
      const front = wrap(Math.round(value))
      cards.forEach((card, index) => {
        const offset = wrap(index - value + count / 2) - count / 2
        const distance = Math.abs(offset)
        const opacity = Math.min(
          1,
          Math.max(0, (visibleDistance - distance) * 2)
        )
        const { x, y, rotation, scale } = cardPose(offset, fanSpread)
        card.style.opacity = String(opacity)
        card.style.transform =
          opacity === 0
            ? "none"
            : `translate(${x * 100}%, ${((y + bounds.centerY) / cardRatio) * 100}%) rotate(${rotation}deg) scale(${scale})`
        card.style.zIndex = String(
          index === front
            ? count * 100 + 1
            : Math.round((count - distance) * 100)
        )
      })
      if (current !== front) {
        current = front
        player.pause()
        player.removeAttribute("src")
        player.load()
        setPlaying(null)
        setFailed(false)
        setSelected(front)
      }
    }

    function stop() {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(wheelTimer)
      wheelTimer = undefined
    }

    function settle(next: number, instant = false) {
      stop()
      target = next
      const origin = position
      if (instant || reduced.matches || origin === next) {
        draw(wrap(next))
        target = position
        return
      }
      const start = performance.now()
      function tick(now: number) {
        const progress = Math.min(1, (now - start) / 260)
        if (progress === 1) {
          draw(wrap(next))
          target = position
          return
        }
        draw(origin + (next - origin) * (1 - (1 - progress) ** 3))
        frame = window.requestAnimationFrame(tick)
      }
      frame = window.requestAnimationFrame(tick)
    }

    step.current = (direction, instant) => {
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
      step.current(event.key === "ArrowLeft" ? -1 : 1, true)
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey || drag) return
      const page = document.documentElement
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
        event.deltaMode === 1
          ? 40
          : event.deltaMode === 2
            ? deck.clientWidth
            : 1
      wheelPosition += Math.max(-1.5, Math.min(1.5, (delta * unit) / 120))
      if (!reduced.matches) draw(wheelPosition)
      wheelTimer = window.setTimeout(
        () => settle(Math.round(wheelPosition)),
        110
      )
    }

    function onDown(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return
      stop()
      drag = {
        id: event.pointerId,
        origin: position,
        x: event.clientX,
        lastX: event.clientX,
        time: event.timeStamp,
        speed: 0,
        pixelsPerCard: Math.max(cards[0].offsetWidth * 0.55, 110),
      }
      deck.setPointerCapture(event.pointerId)
    }

    function onMove(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return
      drag.speed =
        (drag.lastX - event.clientX) / Math.max(8, event.timeStamp - drag.time)
      drag.lastX = event.clientX
      drag.time = event.timeStamp
      if (!reduced.matches)
        draw(drag.origin + (drag.x - event.clientX) / drag.pixelsPerCard)
    }

    function onEnd(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return
      const flick =
        event.timeStamp - drag.time < 65
          ? Math.max(-70, Math.min(70, drag.speed * 90))
          : 0
      const next =
        event.type === "pointerup"
          ? Math.round(
              drag.origin +
                (drag.x - event.clientX + flick) / drag.pixelsPerCard
            )
          : Math.round(position)
      drag = undefined
      settle(next)
    }

    draw(0)
    window.addEventListener("keydown", onKey)
    window.addEventListener("wheel", onWheel, { passive: false })
    deck.addEventListener("pointerdown", onDown)
    deck.addEventListener("pointermove", onMove)
    deck.addEventListener("pointerup", onEnd)
    deck.addEventListener("pointercancel", onEnd)
    deck.addEventListener("lostpointercapture", onEnd)
    return () => {
      stop()
      player.pause()
      controlsObserver.disconnect()
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("wheel", onWheel)
      deck.removeEventListener("pointerdown", onDown)
      deck.removeEventListener("pointermove", onMove)
      deck.removeEventListener("pointerup", onEnd)
      deck.removeEventListener("pointercancel", onEnd)
      deck.removeEventListener("lostpointercapture", onEnd)
    }
  }, [])

  return (
    <main className="bird-carousel" aria-label="Bird card carousel">
      <div className="bird-stage" aria-hidden="true">
        <div className="bird-deck" ref={stage}>
          {birds.map(({ cardBackground }, index) => (
            <img
              key={cardBackground}
              className="bird-card"
              src={images[cardBackground]}
              alt=""
              width={629}
              height={880}
              fetchPriority={index === 0 ? "high" : "auto"}
              draggable={false}
            />
          ))}
        </div>
      </div>
      <div className="bird-navigation" ref={navigation}>
        <div className="bird-heading">
          <div className="bird-title-row">
            <Button
              variant="outline"
              size="icon-lg"
              className="size-11 rounded-full motion-reduce:transition-none"
              aria-label="Previous bird"
              onClick={(event) => step.current(-1, event.detail === 0)}
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                aria-hidden="true"
                className="size-5"
              />
            </Button>
            <p className="bird-name" aria-live="polite" aria-atomic="true">
              {bird.name}
            </p>
            <Button
              variant="outline"
              size="icon-lg"
              className="size-11 rounded-full motion-reduce:transition-none"
              aria-label="Next bird"
              onClick={(event) => step.current(1, event.detail === 0)}
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                aria-hidden="true"
                className="size-5"
              />
            </Button>
          </div>
        </div>
        <div
          key={bird.cardBackground}
          className="mt-3 flex flex-wrap justify-center gap-4"
          role="group"
          aria-label={`${bird.name} recordings`}
          aria-describedby="sound-instructions"
        >
          <Tooltip.Provider>
            {soundTypes.map(
              ({ key, label, icon }) =>
                bird[key].length > 0 && (
                  <SoundButton
                    key={key}
                    paths={bird[key]}
                    label={label}
                    icon={icon}
                    audio={audio}
                    playing={playing}
                    onToggle={toggleSound}
                  />
                )
            )}
          </Tooltip.Provider>
        </div>
        <p
          id="sound-instructions"
          className="sound-instructions mt-2 text-center text-xs text-muted-foreground/80"
        >
          tap to play/pause; long-hold to play next
        </p>
        {failed && (
          <p className="text-center text-sm" role="status">
            Couldn’t play the recording.
          </p>
        )}
        <audio
          ref={audio}
          preload="none"
          onPlay={(event) =>
            setPlaying(event.currentTarget.getAttribute("src"))
          }
          onPause={(event) => {
            if (event.currentTarget.paused) setPlaying(null)
          }}
          onEnded={() => setPlaying(null)}
        />
      </div>
    </main>
  )
}
