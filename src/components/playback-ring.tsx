import { type RefObject, useEffect, useRef } from "react"

export function PlaybackRing({
  audio,
  url,
  count,
  index,
}: {
  audio: RefObject<HTMLAudioElement | null>
  url: string
  count: number
  index: number
}) {
  const fill = useRef<SVGCircleElement>(null)
  const segment = 100 / count
  const gap = count > 1 ? 4 : 0
  const length = segment - gap

  useEffect(() => {
    const player = audio.current!
    const arc = fill.current!
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0

    function draw() {
      cancelAnimationFrame(frame)
      const hasProgress =
        player.getAttribute("src") === url &&
        !player.error &&
        Number.isFinite(player.duration) &&
        player.duration > 0 &&
        !player.ended
      const elapsed = hasProgress
        ? Math.min(1, player.currentTime / player.duration)
        : 0
      arc.setAttribute("stroke-dasharray", `${elapsed * length} 100`)
      arc.toggleAttribute("data-filled", elapsed > 0)
      if (hasProgress && !player.paused && !reduced.matches)
        frame = requestAnimationFrame(draw)
    }

    const events = [
      "loadedmetadata",
      "timeupdate",
      "durationchange",
      "playing",
      "pause",
      "ended",
      "emptied",
      "error",
    ]
    for (const event of events) player.addEventListener(event, draw)
    reduced.addEventListener("change", draw)
    draw()
    return () => {
      cancelAnimationFrame(frame)
      for (const event of events) player.removeEventListener(event, draw)
      reduced.removeEventListener("change", draw)
    }
  }, [audio, url, length])

  return (
    <svg
      className="playback-ring size-10"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, track) => (
        <circle
          key={track}
          cx="20"
          cy="20"
          r="18"
          pathLength="100"
          className="playback-ring-track"
          strokeDasharray={count > 1 ? `${length} 100` : undefined}
          strokeDashoffset={-(track * segment + gap / 2)}
        />
      ))}
      <circle
        ref={fill}
        cx="20"
        cy="20"
        r="18"
        pathLength="100"
        className="playback-ring-fill"
        strokeDashoffset={-((count > 1 ? index : 0) * segment + gap / 2)}
      />
    </svg>
  )
}
