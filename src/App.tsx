import {
  type ReactNode,
  type RefObject,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SkipForwardIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BillRattleIcon } from "@/components/bill-rattle-icon"
import { BirdCallIcon } from "@/components/bird-call-icon"
import { BirdsongIcon } from "@/components/birdsong-icon"
import { PlaybackRing } from "@/components/playback-ring"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import birds from "./birds.json"
import { cardArtwork, cardStyleAt, fanSizing } from "./deck-geometry"
import { connectDeckNavigation, wrapDeckPosition } from "./deck-navigation"

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

function SoundButton({
  paths,
  label,
  icon,
  audio,
  playing,
  onToggle,
  onPlay,
}: {
  paths: string[]
  label: string
  icon: ReactNode
  audio: RefObject<HTMLAudioElement | null>
  playing: string | null
  onToggle: (url: string) => void
  onPlay: (url: string) => void
}) {
  const [index, setIndex] = useState(0)
  const [announcement, setAnnouncement] = useState("")
  const multiple = paths.length > 1
  const title = multiple ? `${label} ${index + 1} of ${paths.length}` : label
  const url = recordings[paths[index]]
  const active = playing === url

  function playNext() {
    const next = (index + 1) % paths.length
    setIndex(next)
    setAnnouncement(`${label} ${next + 1} of ${paths.length}`)
    onPlay(recordings[paths[next]])
  }

  return (
    <div className="flex items-center">
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
              onClick={() => onToggle(url)}
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
      {multiple && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="group/skip h-11 hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0 active:not-aria-[haspopup]:translate-y-0 dark:hover:bg-transparent"
          aria-label={`Play next ${label.toLowerCase()} recording`}
          onClick={playNext}
        >
          <HugeiconsIcon
            icon={SkipForwardIcon}
            aria-hidden="true"
            className="size-4 text-black/50 group-hover/skip:text-black/85 group-focus-visible/skip:text-black/85 forced-colors:group-focus-visible/skip:[forced-color-adjust:none] forced-colors:group-focus-visible/skip:text-[Highlight]"
          />
        </Button>
      )}
    </div>
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
  const [autoPlay, setAutoPlay] = useState({ enabled: false, activation: 0 })
  const bird = birds[selected]

  function playSound(url: string) {
    const player = audio.current!
    setFailed(false)
    if (player.getAttribute("src") !== url || player.error) player.src = url
    void player.play().catch((error) => {
      if (error.name !== "AbortError" && player.getAttribute("src") === url) {
        setPlaying(null)
        setFailed(true)
      }
    })
  }

  function toggleSound(url: string) {
    const player = audio.current!
    if (player.getAttribute("src") === url && !player.paused) player.pause()
    else playSound(url)
  }

  function playFirstSound(index: number) {
    for (const { key } of soundTypes) {
      const url = recordings[birds[index][key][0]]
      if (url) {
        playSound(url)
        return
      }
    }
  }

  const playSettledBird = useEffectEvent((index: number) => {
    if (autoPlay.enabled) playFirstSound(index)
  })

  useLayoutEffect(() => {
    const deck = stage.current!
    const player = audio.current!
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
        player.pause()
        player.removeAttribute("src")
        player.load()
        setPlaying(null)
        setFailed(false)
        setSelected(front)
        syncPage(front)
      },
      onSettle: playSettledBird,
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
      player.pause()
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
        <div
          className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center"
          role="group"
          aria-label={`${bird.name} recordings`}
        >
          <div
            className="col-start-2 flex items-center gap-3 sm:gap-4"
            key={`${bird.cardBackground}-${autoPlay.activation}`}
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
                      onPlay={playSound}
                    />
                  )
              )}
            </Tooltip.Provider>
          </div>
          <label
            htmlFor="auto-play"
            className="col-start-3 mt-1 ml-4 inline-flex min-h-12 w-11 cursor-pointer flex-col items-center justify-center gap-1 justify-self-start text-[9px]/none whitespace-nowrap select-none sm:ml-6"
          >
            <Switch
              id="auto-play"
              size="sm"
              nativeButton
              render={<button type="button" />}
              checked={autoPlay.enabled}
              onCheckedChange={(enabled) => {
                setAutoPlay(({ activation }) => ({
                  enabled,
                  activation: activation + Number(enabled),
                }))
                if (enabled) playFirstSound(selected)
              }}
            />
            Auto-play
          </label>
        </div>
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
