import { useEffect, useRef, useState } from "react"
import AdminControls from "../AdminControls"
import { legacyPhotos, slideshowInterval, type LegacyMilestone } from "../contentClient"

const { Div, Img, Span } = AdminControls

export default function LegacySlideshow({
  milestone,
  active,
}: {
  milestone: LegacyMilestone
  active: boolean
}) {
  const photos = legacyPhotos(milestone)
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const mediaRef = useRef<HTMLDivElement>(null)
  const photoKey = JSON.stringify(photos)

  useEffect(() => {
    setIndex(0)
  }, [photoKey])

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!active || hovered || focused || reducedMotion || photos.length < 2) return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      const bounds = mediaRef.current?.getBoundingClientRect()
      if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
      setIndex(current => (current + 1) % photos.length)
    }, slideshowInterval)
    return () => window.clearInterval(timer)
  }, [active, hovered, focused, reducedMotion, photoKey])

  const current = index % (photos.length || 1)
  return (
    <Div
      className="legacy-media relative"
      ref={mediaRef}
      role={photos.length > 1 ? "region" : undefined}
      aria-label={`${milestone.title} programme photos`}
      aria-roledescription={photos.length > 1 ? "slideshow" : undefined}
      tabIndex={photos.length > 1 ? 0 : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={event => {
        if (photos.length < 2) return
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault()
          setIndex(current => (current + (event.key === "ArrowRight" ? 1 : -1) + photos.length) % photos.length)
        }
      }}
    >
      {photos.length ? (
        <>
          {photos.map((url, photoIndex) => (
            <Img
              key={`${photoIndex}-${url}`}
              src={url}
              alt={photoIndex === current ? `${milestone.title} — photo ${photoIndex + 1}` : ""}
              aria-hidden={photoIndex !== current}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${photoIndex === current ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          {photos.length > 1 && (
            <Span className="absolute right-3 bottom-3 rounded-full bg-(--forest) px-3 py-1 text-xs text-(--ivory)">
              {current + 1} / {photos.length}
            </Span>
          )}
        </>
      ) : (
        <Div className="legacy-media-placeholder">
          <Img src="/images/club-logo.png" alt="" />
          <Span>Photos coming soon</Span>
        </Div>
      )}
    </Div>
  )
}
