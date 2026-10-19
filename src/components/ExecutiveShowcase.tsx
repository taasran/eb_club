import { useEffect, useRef, useState } from "react"
import AdminControls from "../AdminControls"
import { committee } from "../data/club"
import ExecutiveCard, { type ManagedExecutive } from "./ExecutiveCard"
import Icon from "./Icon"

const { Div, P, Span, Button } = AdminControls
export const executiveSlideInterval = 4000

export function nextExecutiveOffset(
  left: number,
  viewport: number,
  width: number,
  step: number,
) {
  if (width <= viewport || step <= 0) return left
  return left + viewport >= width - 3
    ? 0
    : Math.min(left + step, width - viewport)
}

export default function ExecutiveShowcase({
  profiles,
}: {
  profiles: ManagedExecutive[]
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [autoSlide, setAutoSlide] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [position, setPosition] = useState({
    first: 0,
    atEnd: false,
    overflowing: false,
  })
  const running =
    autoSlide && !hovered && !focused && !reducedMotion && profiles.length > 1
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])
  const measure = () => {
    const track = trackRef.current
    const card = track?.firstElementChild as HTMLElement | null
    if (!track || !card) return
    const step =
      card.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0)
    if (step <= 0) return
    setPosition({
      first: Math.max(
        0,
        Math.min(profiles.length - 1, Math.round(track.scrollLeft / step)),
      ),
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 3,
      overflowing: track.scrollWidth > track.clientWidth + 3,
    })
  }
  useEffect(() => {
    measure()
    const track = trackRef.current
    if (!track) return
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    observer?.observe(track)
    window.addEventListener("resize", measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [profiles.length])
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      const track = trackRef.current
      const card = track?.firstElementChild as HTMLElement | null
      if (!track || !card || document.hidden) return
      const bounds = track.getBoundingClientRect()
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
      const step =
        card.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0)
      const left = nextExecutiveOffset(
        track.scrollLeft,
        track.clientWidth,
        track.scrollWidth,
        step,
      )
      if (left !== track.scrollLeft)
        track.scrollTo({ left, behavior: "smooth" })
    }, executiveSlideInterval)
    return () => window.clearInterval(timer)
  }, [running, profiles.length])
  const move = (direction: number) => {
    setAutoSlide(false)
    const track = trackRef.current
    const card = track?.firstElementChild as HTMLElement | null
    if (!track || !card) return
    const step =
      card.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0)
    track.scrollBy({
      left: direction * step,
      behavior: reducedMotion ? "auto" : "smooth",
    })
  }
  const card = (
    person: ManagedExecutive,
    index: number,
    leadership: boolean,
  ) => (
    <ExecutiveCard
      key={index}
      role={person.designation || "Executive Member"}
      description={
        committee.find(([role]) => role === person.designation)?.[1] ??
        "Economics & Banking Club executive team."
      }
      index={index}
      person={person}
      total={profiles.length}
      leadership={leadership}
    />
  )
  return (
    <Div>
      <Div className="eyebrow leadership-heading">CLUB LEADERSHIP</Div>
      {/* President, Vice President and General Secretary are featured. */}
      <Div className="compact-leadership">
        {profiles.slice(0, 3).map((person, index) => card(person, index, true))}
      </Div>
      <Div
        className={
          running && position.overflowing
            ? "committee-carousel is-running"
            : "committee-carousel"
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setFocused(false)
        }}
      >
        <Div className="committee-toolbar">
          <Div>
            <Div className="eyebrow">
              CLUB EXECUTIVES{" "}
              <Span className="slider-status-dot" aria-hidden="true" />
            </Div>
            <P>
              {profiles.length} profiles · Full committee details · Swipe to
              explore
            </P>
          </Div>
          {profiles.length > 0 && (
            <Div className="committee-controls">
              <Span aria-live={running ? "off" : "polite"}>
                Profile {Math.min(position.first + 1, profiles.length)} /{" "}
                {profiles.length}
              </Span>
              <Button
                type="button"
                className="slider-play-toggle"
                aria-pressed={autoSlide}
                disabled={reducedMotion || !position.overflowing}
                onClick={() => setAutoSlide((current) => !current)}
              >
                {autoSlide ? "Pause auto-slide" : "Resume auto-slide"}
              </Button>
              <Button
                type="button"
                className="round-button previous-slide"
                aria-label="Previous executive profiles"
                aria-controls="committee-slider"
                disabled={!position.overflowing || position.first === 0}
                onClick={() => move(-1)}
              >
                <Icon name="arrow" />
              </Button>
              <Button
                type="button"
                className="round-button"
                aria-label="Next executive profiles"
                aria-controls="committee-slider"
                disabled={!position.overflowing || position.atEnd}
                onClick={() => move(1)}
              >
                <Icon name="arrow" />
              </Button>
            </Div>
          )}
        </Div>
        {profiles.length === 0 ? (
          <P className="executives-note">
            No executive profiles are currently published.
          </P>
        ) : (
          <Div
            className="committee-slider"
            id="committee-slider"
            ref={trackRef}
            role="region"
            aria-label="Club executives — complete committee profiles"
            aria-roledescription="carousel"
            tabIndex={0}
            onTouchStart={() => setAutoSlide(false)}
            onScroll={measure}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault()
                move(event.key === "ArrowRight" ? 1 : -1)
              }
            }}
          >
            {profiles.map((person, index) => card(person, index, false))}
          </Div>
        )}
      </Div>
    </Div>
  )
}
