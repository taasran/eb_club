import { useRef, useState } from "react"
import AdminControls from "../AdminControls"
import activityPhotos, {
  type ActivityMedia,
  type ActivityPhoto,
} from "../activityMedia"
import ManagedImage from "./ManagedImage"
import Icon from "./Icon"

const { Div, Span, Button, Link } = AdminControls

type GalleryActivity = ActivityMedia & {
  category: string
  icon: string
}

type TouchPosition = {
  x: number
  y: number
}

export default function ActivityGallery({
  activity,
  publishedImage,
  publishedGallery,
  pending = false,
}: {
  activity: GalleryActivity
  publishedImage?: string
  publishedGallery?: readonly ActivityPhoto[]
  pending?: boolean
}) {
  const photos = activityPhotos(activity, publishedImage, publishedGallery)
  const [index, setIndex] = useState(0)
  const touchStart = useRef<TouchPosition | null>(null)
  const current = index % (photos.length || 1)
  const photo = photos[current]
  const canBrowse = !pending && photos.length > 1
  const move = (direction: number) => {
    if (photos.length < 2) return
    setIndex((value) => (value + direction + photos.length) % photos.length)
  }

  return (
    <>
      <Div
        className={`activity-photo activity-gallery${
          photo?.kind === "poster" ? " activity-photo-poster" : ""
        }`}
        role={canBrowse ? "region" : undefined}
        aria-label={`${activity.label} photos`}
        aria-roledescription={canBrowse ? "carousel" : undefined}
        tabIndex={canBrowse ? 0 : undefined}
        onKeyDown={(event) => {
          if (canBrowse && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.preventDefault()
            move(event.key === "ArrowRight" ? 1 : -1)
          }
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0]
          if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current
          touchStart.current = null
          const end = event.changedTouches[0]
          if (!canBrowse || !start || !end) return
          const dx = end.clientX - start.x
          const dy = end.clientY - start.y
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy))
            move(dx < 0 ? 1 : -1)
        }}
      >
        <ManagedImage
          key={photo?.src ?? "empty"}
          src={photo?.src}
          alt={photo?.alt ?? activity.alt}
          pending={pending}
          placeholder={`Official ${activity.label.toLowerCase()} photo to be added.`}
          icon={activity.icon}
        />
        <Span className="activity-photo-label">
          <Icon name={activity.icon} />
          {activity.category}
        </Span>
        {canBrowse && (
          <Div className="activity-gallery-controls">
            <Button
              type="button"
              className="activity-gallery-previous"
              aria-label={`Previous ${activity.label.toLowerCase()} photo`}
              onClick={() => move(-1)}
            >
              <Icon name="arrow" />
            </Button>
            <Span role="status" aria-live="polite" aria-atomic="true">
              {current + 1} / {photos.length}
            </Span>
            <Button
              type="button"
              aria-label={`Next ${activity.label.toLowerCase()} photo`}
              onClick={() => move(1)}
            >
              <Icon name="arrow" />
            </Button>
          </Div>
        )}
      </Div>
      {!pending && photo?.source && (
        <Link
          className="activity-photo-source"
          href={photo.source}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source: club Facebook post <Icon name="arrow" />
        </Link>
      )}
    </>
  )
}
