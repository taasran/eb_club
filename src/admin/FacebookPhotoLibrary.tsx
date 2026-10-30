import { useEffect, useRef, useState } from "react"
import AdminControls from "../AdminControls"
import Icon from "../components/Icon"
import ManagedImage from "../components/ManagedImage"
import { activities } from "../data/club"
import activityPhotos, {
  maxActivityPhotos,
  type ActivityPhoto,
} from "../activityMedia"
import type { SiteContent } from "../contentClient"
import {
  importArchivePhoto,
  mergeArchivePosts,
  readArchive,
  suggestActivity,
  type ArchivePost,
  type ArchiveRequest,
} from "./facebookArchive"

const {
  Section,
  Div,
  H3,
  P,
  Span,
  Small,
  Button,
  Link,
  Label,
  Input,
  Select,
  Option,
} = AdminControls

function PostPhotos({
  post,
  disabled,
  onImport,
}: {
  post: ArchivePost
  disabled: boolean
  onImport: (
    post: ArchivePost,
    photoId: string,
    activity: string,
    kind: "photo" | "poster",
  ) => Promise<void>
}) {
  const suggestion = suggestActivity(post.message)
  const [activity, setActivity] = useState(suggestion)
  const [kind, setKind] = useState<"photo" | "poster">("photo")
  const [expanded, setExpanded] = useState(false)
  return (
    <Div className="fb-archive-post">
      <Div className="fb-post-heading">
        <Small>{new Date(post.createdAt).toLocaleDateString("en-GB")}</Small>
        <Link href={post.url} target="_blank" rel="noopener noreferrer">
          View original post <Icon name="arrow" />
        </Link>
      </Div>
      <P className="fb-original-caption">
        {post.message || "No caption was available for this post."}
      </P>
      <Div className="fb-post-options">
        <Label>
          <Span>Review activity</Span>
          <Select
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            disabled={disabled}
          >
            <Option value="">Choose an activity</Option>
            {activities.map((item) => (
              <Option key={item.id} value={item.id}>
                {item.label}
              </Option>
            ))}
          </Select>
        </Label>
        <Label>
          <Span>Image display</Span>
          <Select
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
            disabled={disabled}
          >
            <Option value="photo">Photograph — fill frame</Option>
            <Option value="poster">Poster — show full image</Option>
          </Select>
        </Label>
      </Div>
      {suggestion && (
        <Small className="admin-muted">
          Activity suggested from the caption. Check the image before adding it.
        </Small>
      )}
      <Div className="fb-photo-grid">
        {post.images.slice(0, expanded ? undefined : 12).map((photo) => (
          <Div className="fb-photo-candidate" key={photo.id}>
            <Div className="fb-photo-preview">
              <ManagedImage
                src={photo.url}
                alt="Facebook post photo for administrator review"
                referrerPolicy="no-referrer"
              />
            </Div>
            {photo.preview && <Small>Post preview — review carefully</Small>}
            <Button
              type="button"
              className="admin-btn ghost block"
              disabled={disabled || !activity}
              onClick={() => void onImport(post, photo.id, activity, kind)}
            >
              Add to activity
            </Button>
          </Div>
        ))}
      </Div>
      {post.images.length > 12 && (
        <Button
          className="admin-link"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? "Show fewer photos"
            : `Show all ${post.images.length} photos`}
        </Button>
      )}
    </Div>
  )
}

export default function FacebookPhotoLibrary({
  request,
  content,
  disabled,
  onAdd,
  onPending,
}: {
  request: ArchiveRequest
  content: SiteContent
  disabled: boolean
  onAdd: (id: string, photo: ActivityPhoto) => void
  onPending: (change: number) => void
}) {
  const [posts, setPosts] = useState<ArchivePost[]>([])
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [complete, setComplete] = useState(false)
  const [partial, setPartial] = useState(false)
  const [requests, setRequests] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(20)
  const cursor = useRef<string | undefined>(undefined)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  const scan = async (restart = false) => {
    if (scanning || disabled || importing) return
    if (restart) {
      cursor.current = undefined
      setPosts([])
      setComplete(false)
      setPartial(false)
      setRequests(0)
    }
    const current = new AbortController()
    controller.current = current
    setScanning(true)
    setError("")
    setMessage(
      "Scanning accessible Page posts and album pages. You may pause and continue.",
    )
    try {
      while (!current.signal.aborted) {
        const timeout = window.setTimeout(() => current.abort(), 30000)
        let batch
        try {
          batch = await readArchive(request, cursor.current, current.signal)
        } finally {
          window.clearTimeout(timeout)
        }
        setPosts((previous) => mergeArchivePosts(previous, batch.posts))
        setPartial(batch.partial)
        setComplete(batch.complete)
        setRequests(batch.requestsScanned)
        cursor.current = batch.nextCursor ?? undefined
        if (batch.complete) {
          setMessage(
            batch.partial
              ? "Reached the end of accessible history, but some album pages could not be read. This is a partial media scan."
              : "Reached the end of the history Facebook made available. Review photos before adding them.",
          )
          break
        }
        await new Promise((resolve) => window.setTimeout(resolve, 350))
      }
    } catch (failure) {
      if (!current.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "The scan paused unexpectedly.",
        )
    } finally {
      if (current.signal.aborted)
        setMessage("Scan paused. Continue to retry the current batch.")
      controller.current = null
      setScanning(false)
    }
  }
  const add = async (
    post: ArchivePost,
    photoId: string,
    id: string,
    kind: "photo" | "poster",
  ) => {
    if (disabled || importing || scanning) return
    const activity = activities.find((item) => item.id === id)
    if (!activity) return
    if (
      activityPhotos(
        activity,
        content.activityImages?.[id],
        content.activityGalleries?.[id],
      ).length >= maxActivityPhotos
    ) {
      setError(
        `This gallery already has ${maxActivityPhotos} photos. Remove one before adding another.`,
      )
      return
    }
    setImporting(true)
    onPending(1)
    setError("")
    setMessage("Copying the selected photo to club storage…")
    try {
      const photo = await importArchivePhoto(request, photoId)
      onAdd(id, {
        ...photo,
        kind,
        alt: `${activity.label} — official club photo from ${new Date(post.createdAt).toLocaleDateString("en-GB")}`,
      })
      setMessage(
        `Photo copied to club storage and added to the ${activity.label} draft. Save changes to publish.`,
      )
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "The photo import failed.",
      )
    } finally {
      onPending(-1)
      setImporting(false)
    }
  }
  const visible = posts.filter(
    (post) =>
      post.images.length &&
      (!query ||
        post.message.toLowerCase().includes(query.toLowerCase()) ||
        activities
          .find((item) => item.id === suggestActivity(post.message))
          ?.label.toLowerCase()
          .includes(query.toLowerCase())),
  )
  return (
    <Section
      className="admin-card fb-library"
      aria-labelledby="fb-library-title"
    >
      <Div className="fb-library-heading">
        <Div>
          <P className="admin-eyebrow">
            <Icon name="facebook" /> OFFICIAL PAGE ARCHIVE
          </P>
          <H3 id="fb-library-title">Find photos in your Page history.</H3>
        </Div>
        <Span className="admin-badge">Review before publishing</Span>
      </Div>
      <P className="admin-muted">
        Read older posts and album pages using the existing server-side Page
        token. Selected photos are copied to club storage, not linked to
        expiring Facebook images. Nothing is published until you save changes.
      </P>
      <Div className="fb-scan-actions">
        <Button
          type="button"
          className="admin-btn primary"
          disabled={disabled || scanning || importing}
          onClick={() => void scan(true)}
        >
          Start new history scan
        </Button>
        {!complete && cursor.current && (
          <Button
            type="button"
            className="admin-btn ghost"
            disabled={disabled || scanning || importing}
            onClick={() => void scan()}
          >
            Continue scan
          </Button>
        )}
        {scanning && (
          <Button
            type="button"
            className="admin-btn ghost"
            onClick={() => controller.current?.abort()}
          >
            Pause scan
          </Button>
        )}
      </Div>
      <Div className="fb-scan-progress" role="status" aria-live="polite">
        <Span>{posts.length} posts reviewed</Span>
        <Span>
          {posts.reduce((count, post) => count + post.images.length, 0)} photo
          candidates
        </Span>
        <Span>{requests} API pages read</Span>
        <Span>
          {complete
            ? partial
              ? "Finished with missing media"
              : "Accessible history scanned"
            : scanning
              ? "Scanning…"
              : "Not complete"}
        </Span>
      </Div>
      {message && <P className="admin-muted">{message}</P>}
      {error && (
        <Div className="admin-status error" role="alert">
          {error}
        </Div>
      )}
      {posts.length > 0 && (
        <Label className="admin-field">
          <Span>Filter captions or suggested activities</Span>
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(20)
            }}
            placeholder="Search captions, sports, tours, workshops…"
          />
        </Label>
      )}
      {visible.slice(0, limit).map((post) => (
        <PostPhotos
          key={post.id}
          post={post}
          disabled={disabled || scanning || importing}
          onImport={add}
        />
      ))}
      {visible.length > limit && (
        <Button
          type="button"
          className="admin-btn ghost"
          onClick={() => setLimit((value) => value + 20)}
        >
          Show 20 more posts
        </Button>
      )}
      {complete && !visible.length && (
        <P className="admin-muted">
          No matching photo candidates are available. Deleted, restricted or
          unavailable posts cannot be recovered through this scan.
        </P>
      )}
    </Section>
  )
}

export function ActivityGalleryEditor({
  activity,
  photos,
  disabled,
  onChange,
  onReset,
}: {
  activity: typeof activities[number]
  photos: ActivityPhoto[]
  disabled: boolean
  onChange: (photos: ActivityPhoto[]) => void
  onReset: () => void
}) {
  const move = (index: number, direction: number) => {
    const next = [...photos]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  return (
    <Div className="fb-gallery-editor">
      <Div className="fb-gallery-editor-heading">
        <Small>
          {photos.length} / {maxActivityPhotos} gallery photos
        </Small>
        <Button
          type="button"
          className="admin-link"
          disabled={disabled}
          onClick={onReset}
        >
          Use curated defaults
        </Button>
      </Div>
      <Div className="fb-gallery-thumbnails">
        {photos.map((photo, index) => (
          <Div className="fb-gallery-thumbnail" key={`${index}-${photo.src}`}>
            <Div className="fb-photo-preview">
              <ManagedImage src={photo.src} alt={photo.alt} />
            </Div>
            <Small>
              {index + 1}.{" "}
              {photo.kind === "poster" ? "Full poster" : "Photograph"}
            </Small>
            <Div className="fb-thumbnail-actions">
              <Button
                type="button"
                disabled={disabled || index === 0}
                aria-label={`Move ${activity.label} photo ${index + 1} earlier`}
                onClick={() => move(index, -1)}
              >
                Earlier
              </Button>
              <Button
                type="button"
                disabled={disabled || index === photos.length - 1}
                aria-label={`Move ${activity.label} photo ${index + 1} later`}
                onClick={() => move(index, 1)}
              >
                Later
              </Button>
              <Button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(photos.filter((_, position) => position !== index))
                }
              >
                Remove
              </Button>
            </Div>
          </Div>
        ))}
      </Div>
      {!photos.length && (
        <P className="admin-muted">
          No photos selected. Add a reviewed Facebook photo above, upload a
          single image, or restore the curated defaults.
        </P>
      )}
    </Div>
  )
}
