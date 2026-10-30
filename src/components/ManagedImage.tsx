import { useState } from "react"
import AdminControls from "../AdminControls"
import Icon from "./Icon"

const { Div, Img, Span } = AdminControls

/** Never request a demo image while the published media selection is loading. */
export default function ManagedImage({
  src,
  alt,
  pending = false,
  className = "",
  placeholder = "Official club photo to be added.",
  eager = false,
  icon = "chart",
  referrerPolicy,
}: {
  src?: string
  alt: string
  pending?: boolean
  className?: string
  placeholder?: string
  eager?: boolean
  icon?: string
  referrerPolicy?: "no-referrer"
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const unavailable = !!src && failedSource === src
  if (pending || !src || unavailable) {
    const label = pending
      ? "Loading the latest photo…"
      : unavailable
        ? "Photo temporarily unavailable."
        : placeholder
    return (
      <Div
        className={`${className} club-media-placeholder`}
        role="img"
        aria-label={label}
        aria-busy={pending}
      >
        <Icon name={icon} />
        <Span>{label}</Span>
      </Div>
    )
  }
  return (
    <Img
      className={className}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      referrerPolicy={referrerPolicy}
      onError={() => setFailedSource(src)}
    />
  )
}
