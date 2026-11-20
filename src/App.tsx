import { useLayoutEffect, useRef, useState } from "react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  RecordingControls,
  type RecordingControlsHandle,
} from "@/components/recording-controls"
import { Button } from "@/components/ui/button"
import birds from "./birds.json"
import { cardArtwork, cardStyleAt, fanSizing } from "./deck-geometry"
import { connectDeckNavigation, wrapDeckPosition } from "./deck-navigation"

const images = import.meta.glob<string>("./assets/cards/*.png", {
  eager: true,
  import: "default",
  query: "?url",
})
const count = birds.length

export function App() {
  const stage = useRef<HTMLDivElement>(null)
  const recordingControls = useRef<RecordingControlsHandle>(null)
  const navigation = useRef<HTMLDivElement>(null)
  const step = useRef<(direction: number, instant: boolean) => void>(() => {})
  const [selected, setSelected] = useState(0)
  const bird = birds[selected]

  useLayoutEffect(() => {
    const deck = stage.current!
    const cards = Array.from(deck.querySelectorAll("img"))
    const controls = navigation.current!
    const layout = controls.parentElement!

    function measureControls() {
      layout.style.setProperty(
        "--controls-height",
        controls.getBoundingClientRect().height + "px"
      )
    }

    measureControls()
    const controlsObserver = new ResizeObserver(measureControls)
    controlsObserver.observe(controls)
    let observedHash = window.location.hash

    function syncPage(index: number) {
      const { id, name } = birds[index]
      document.title = `${name} | bords.world`
      const hash = `#${id}`
      // Native fragment navigation can change the URL before hashchange fires.
      if (hash === observedHash || window.location.hash !== observedHash) return
      window.history.replaceState(window.history.state, "", hash)
      observedHash = hash
    }

    const deckNavigation = connectDeckNavigation(deck, cards, {
      onPosition(value, front) {
        cards.forEach((card, index) => {
          const offset =
            wrapDeckPosition(index - value + count / 2, count) - count / 2
          Object.assign(card.style, cardStyleAt(offset, index === front, count))
        })
      },
      onSelect(front) {
        recordingControls.current?.reset()
        setSelected(front)
        syncPage(front)
      },
      onSettle(index) {
        recordingControls.current?.onCardSettled(birds[index])
      },
    })
    step.current = deckNavigation.step

    function onHashChange() {
      observedHash = window.location.hash
      const next = Math.max(
        0,
        birds.findIndex(({ id }) => `#${id}` === observedHash)
      )
      deckNavigation.jumpTo(next)
      syncPage(next)
    }

    onHashChange()
    window.addEventListener("hashchange", onHashChange)
    return () => {
      deckNavigation.disconnect()
      controlsObserver.disconnect()
      window.removeEventListener("hashchange", onHashChange)
    }
  }, [])

  return (
    <main
      className="bird-carousel"
      aria-label="Bird card carousel"
      style={fanSizing}
    >
      <div className="bird-stage" aria-hidden="true">
        <div className="bird-deck" ref={stage}>
          {birds.map(({ cardBackground }, index) => (
            <img
              key={cardBackground}
              className="bird-card"
              src={images[cardBackground]}
              alt=""
              width={cardArtwork.width}
              height={cardArtwork.height}
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
        <RecordingControls
          bird={bird}
          onNextBird={() => step.current(1, false)}
          ref={recordingControls}
        />
      </div>
    </main>
  )
}
