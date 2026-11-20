import {
  type ReactNode,
  type Ref,
  type RefObject,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Tooltip } from "@base-ui/react/tooltip"
import { Forward02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BillRattleIcon } from "@/components/bill-rattle-icon"
import { BirdCallIcon } from "@/components/bird-call-icon"
import { BirdsongIcon } from "@/components/birdsong-icon"
import { PlaybackRing } from "@/components/playback-ring"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import "./recording-controls.css"

const recordings = import.meta.glob<string>("./assets/sounds/*.mp3", {
  base: "../",
  eager: true,
  import: "default",
  query: "?url",
})
const soundTypes = [
  { key: "songs", label: "Song", icon: <BirdsongIcon /> },
  { key: "calls", label: "Call", icon: <BirdCallIcon /> },
  { key: "billRattles", label: "Bill rattle", icon: <BillRattleIcon /> },
] as const

function SoundButton({
  paths,
  index,
  label,
  icon,
  audio,
  playing,
  playbackTooltip,
  onDismissPlaybackTooltip,
  onToggle,
  onSkip,
}: {
  paths: string[]
  index: number
  label: string
  icon: ReactNode
  audio: RefObject<HTMLAudioElement | null>
  playing: string | null
  playbackTooltip: string | null
  onDismissPlaybackTooltip: () => void
  onToggle: (url: string) => void
  onSkip: (index: number) => void
}) {
  const [announcement, setAnnouncement] = useState("")
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const multiple = paths.length > 1
  const title = multiple ? `${label} ${index + 1} of ${paths.length}` : label
  const url = recordings[paths[index]]
  const active = paths.some((path) => recordings[path] === playing)
  const showPlaybackTooltip = playing === url && playbackTooltip === url

  function playNext() {
    const next = (index + 1) % paths.length
    setAnnouncement(`${label} ${next + 1} of ${paths.length}`)
    onSkip(next)
  }

  return (
    <div
      className="sound-control flex items-center"
      data-skip-visible={multiple ? active : undefined}
    >
      <Tooltip.Root
        open={tooltipOpen || showPlaybackTooltip}
        onOpenChange={(open, { reason }) => {
          setTooltipOpen(open)
          if (showPlaybackTooltip && reason === "escape-key") {
            onDismissPlaybackTooltip()
          }
        }}
      >
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
              {multiple ? `${label} #${index + 1}` : label}
              <Tooltip.Arrow className="size-2 rotate-45 bg-primary data-[side=bottom]:-top-1 data-[side=left]:-right-1 data-[side=right]:-left-1 data-[side=top]:-bottom-1" />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      {multiple && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="sound-skip size-11 rounded-full focus-visible:border-transparent focus-visible:ring-0 active:not-aria-[haspopup]:translate-y-0"
          aria-label={`Play next ${label.toLowerCase()} recording`}
          inert={!active}
          onClick={playNext}
        >
          <HugeiconsIcon
            icon={Forward02Icon}
            aria-hidden="true"
            className="size-4 -translate-x-2"
          />
        </Button>
      )}
    </div>
  )
}

type BirdRecordings = Record<(typeof soundTypes)[number]["key"], string[]>

function playableSounds(bird: BirdRecordings) {
  return soundTypes
    .flatMap(({ key }) =>
      bird[key].map((path, index) => ({ key, index, url: recordings[path] }))
    )
    .filter(({ url }) => url)
}

export type RecordingControlsHandle = {
  reset: () => void
  onCardSettled: (bird: BirdRecordings) => void
}

export function RecordingControls({
  bird,
  onNextBird,
  ref,
}: {
  bird: BirdRecordings & { id: string; name: string }
  onNextBird: () => void
  ref: Ref<RecordingControlsHandle>
}) {
  const audio = useRef<HTMLAudioElement>(null)
  const playbackTooltipTimeout = useRef<number>(undefined)
  const skipPending = useRef(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const [playbackTooltip, setPlaybackTooltip] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [indices, setIndices] = useState<
    Partial<Record<keyof BirdRecordings, number>>
  >({})
  const [autoPlay, setAutoPlay] = useState({ enabled: false, activation: 0 })

  function clearPlaybackTooltip() {
    window.clearTimeout(playbackTooltipTimeout.current)
    setPlaybackTooltip(null)
  }

  function stopPlayback() {
    skipPending.current = false
    setPlaying(null)
    clearPlaybackTooltip()
  }

  function playSound(url: string) {
    const player = audio.current!
    setFailed(false)
    if (player.getAttribute("src") !== url || player.error) player.src = url
    void player.play().catch((error) => {
      if (error.name !== "AbortError" && player.getAttribute("src") === url) {
        stopPlayback()
        setFailed(true)
      }
    })
  }

  function toggleSound(url: string) {
    const player = audio.current!
    skipPending.current = false
    if (player.getAttribute("src") === url && !player.paused) player.pause()
    else playSound(url)
  }

  function skipTo(url: string) {
    skipPending.current = true
    playSound(url)
  }

  function playFirstSound(bird: BirdRecordings) {
    const first = playableSounds(bird)[0]
    skipPending.current = false
    setIndices(first ? { [first.key]: first.index } : {})
    if (first) playSound(first.url)
  }

  function onSoundEnded(player: HTMLAudioElement) {
    if (!player.ended) return
    stopPlayback()
    if (!autoPlay.enabled) return

    const sounds = playableSounds(bird)
    const finished = sounds.findIndex(
      ({ url }) => url === player.getAttribute("src")
    )
    if (finished === -1) return

    const next = sounds[finished + 1]
    if (next) {
      setIndices((current) => ({ ...current, [next.key]: next.index }))
      playSound(next.url)
    } else {
      onNextBird()
    }
  }

  useImperativeHandle(ref, () => ({
    reset() {
      const player = audio.current!
      player.pause()
      player.removeAttribute("src")
      player.load()
      stopPlayback()
      setIndices({})
      setFailed(false)
    },
    onCardSettled(bird) {
      if (autoPlay.enabled) playFirstSound(bird)
    },
  }))

  useLayoutEffect(() => {
    const player = audio.current!
    return () => {
      window.clearTimeout(playbackTooltipTimeout.current)
      player.pause()
    }
  }, [])

  return (
    <>
      <div
        className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center"
        role="group"
        aria-label={`${bird.name} recordings`}
      >
        <div
          className="col-start-2 flex items-center gap-3 sm:gap-4"
          key={`${bird.id}-${autoPlay.activation}`}
        >
          <Tooltip.Provider>
            {soundTypes.map(
              ({ key, label, icon }) =>
                bird[key].length > 0 && (
                  <SoundButton
                    key={key}
                    paths={bird[key]}
                    index={indices[key] ?? 0}
                    label={label}
                    icon={icon}
                    audio={audio}
                    playing={playing}
                    playbackTooltip={playbackTooltip}
                    onDismissPlaybackTooltip={clearPlaybackTooltip}
                    onToggle={toggleSound}
                    onSkip={(index) => {
                      setIndices((current) => ({ ...current, [key]: index }))
                      skipTo(recordings[bird[key][index]])
                    }}
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
              if (enabled) playFirstSound(bird)
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
        onPlaying={(event) => {
          const player = event.currentTarget
          const url = player.getAttribute("src")
          if (player.paused || !url) return
          const wasSkipping = skipPending.current
          skipPending.current = false
          if (url === playing && !wasSkipping) return
          setPlaying(url)
          setPlaybackTooltip(url)
          window.clearTimeout(playbackTooltipTimeout.current)
          playbackTooltipTimeout.current = window.setTimeout(
            () => setPlaybackTooltip(null),
            1600
          )
        }}
        onPause={(event) => {
          // Keep Skip focused while its replacement source loads.
          if (event.currentTarget.paused && !skipPending.current) stopPlayback()
        }}
        onEnded={(event) => onSoundEnded(event.currentTarget)}
        onError={stopPlayback}
      />
    </>
  )
}
