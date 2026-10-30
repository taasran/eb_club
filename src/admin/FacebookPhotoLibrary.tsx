import { useEffect, useRef, useState } from "react"
import AdminControls from "../AdminControls"
import Icon from "../components/Icon"
import ManagedImage from "../components/ManagedImage"
import { activities, activityCategories } from "../data/club"
import activityPhotos, {
  activityIconOptions,
  builtInActivityIds,
  createCustomActivity,
  eventPhotos,
  maxActivities,
  maxActivityPhotos,
  presetClubActivities,
  presetEventTemplates,
  resolveActivities,
  type ActivityPhoto,
  type ClubActivity,
} from "../activityMedia"
import {
  eventStatuses,
  type ClubEvent,
  type EventStatus,
  type SiteContent,
} from "../contentClient"
import {
  appendEventPhoto,
  createEventFromArchivePost,
  importArchivePhoto,
  mergeArchivePosts,
  readArchive,
  setActivityGallery,
  setEventGallery,
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
  Textarea,
  Strong,
  Article,
  Header,
} = AdminControls

function PostPhotos({
  post,
  availableActivities,
  events,
  mode = "activity",
  disabled,
  onImport,
}: {
  post: ArchivePost
  availableActivities: readonly ClubActivity[]
  events: readonly ClubEvent[]
  mode?: "activity" | "event"
  disabled: boolean
  onImport: (
    post: ArchivePost,
    photoId: string,
    target: string,
    kind: "photo" | "poster",
  ) => Promise<void>
}) {
  const suggestion = suggestActivity(post.message, availableActivities)
  const defaultTarget =
    mode === "event"
      ? events.length > 0
        ? "event:0"
        : "new-event"
      : suggestion
  const [target, setTarget] = useState(defaultTarget)
  const [kind, setKind] = useState<"photo" | "poster">("photo")
  const [expanded, setExpanded] = useState(false)
  const validTarget =
    target === "new-event" ||
    (target.startsWith("event:") &&
      Number.isInteger(Number(target.slice(6))) &&
      Number(target.slice(6)) >= 0 &&
      Number(target.slice(6)) < events.length) ||
    availableActivities.some((item) => item.id === target)
  const selectedTarget = validTarget ? target : defaultTarget
  const actionLabel =
    selectedTarget === "new-event"
      ? "Create event with photo"
      : selectedTarget.startsWith("event:")
        ? "Add to event"
        : "Add to activity"
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
          <Span>
            {mode === "event"
              ? "Choose event or activity"
              : "Review activity"}
          </Span>
          <Select
            value={selectedTarget}
            onChange={(event) => setTarget(event.target.value)}
            disabled={disabled}
          >
            <Option value="">Choose an activity</Option>
            {mode === "event" && (
              <Option value="new-event">
                + Create new event from this post
              </Option>
            )}
            {events.map((eventItem, index) => (
              <Option key={`event-${index}`} value={`event:${index}`}>
                Event {String(index + 1).padStart(2, "0")} ·{" "}
                {eventItem.title || "Untitled event"}
              </Option>
            ))}
            {availableActivities.map((item) => (
              <Option key={item.id} value={item.id}>
                {item.category} · {item.label}
              </Option>
            ))}
            {mode !== "event" && (
              <Option value="new-event">
                + Create new event from this post
              </Option>
            )}
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
      {suggestion && mode !== "event" && (
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
              disabled={disabled || !selectedTarget}
              onClick={() =>
                void onImport(post, photo.id, selectedTarget, kind)
              }
            >
              {actionLabel}
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
  onAddEvent,
  onCreateEvent,
  onPending,
  mode = "activity",
}: {
  request: ArchiveRequest
  content: SiteContent
  disabled: boolean
  onAdd: (id: string, photo: ActivityPhoto) => void
  onAddEvent?: (eventIndex: number, photo: ActivityPhoto) => void
  onCreateEvent?: (post: ArchivePost, photo: ActivityPhoto) => void
  onPending: (change: number) => void
  mode?: "activity" | "event"
}) {
  const currentActivities = resolveActivities(
    activities,
    content.activities,
    true,
  )
  const currentEvents = content.events ?? []
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
    target: string,
    kind: "photo" | "poster",
  ) => {
    if (disabled || importing || scanning) return
    if (target === "new-event") {
      if (!onCreateEvent) return
      setImporting(true)
      onPending(1)
      setError("")
      setMessage("Copying photo and creating a new event draft…")
      try {
        const photo = await importArchivePhoto(request, photoId)
        onCreateEvent(post, {
          ...photo,
          kind,
          alt: `Official club event photo from ${new Date(post.createdAt).toLocaleDateString("en-GB")}`,
        })
        setMessage(
          "Photo copied to club storage and added to a new event draft. Save changes to publish.",
        )
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "The photo import failed.",
        )
      } finally {
        onPending(-1)
        setImporting(false)
      }
      return
    }
    if (target.startsWith("event:")) {
      const eventIndex = Number(target.slice(6))
      const eventItem = currentEvents[eventIndex]
      if (!eventItem || !onAddEvent) return
      if (eventPhotos(eventItem).length >= maxActivityPhotos) {
        setError(
          `This event already has ${maxActivityPhotos} photos. Remove one before adding another.`,
        )
        return
      }
      setImporting(true)
      onPending(1)
      setError("")
      setMessage("Copying the selected photo to club storage…")
      try {
        const photo = await importArchivePhoto(request, photoId)
        onAddEvent(eventIndex, {
          ...photo,
          kind,
          alt: `${eventItem.title || "Club event"} — official photo from ${new Date(post.createdAt).toLocaleDateString("en-GB")}`,
        })
        setMessage(
          `Photo copied to club storage and added to "${eventItem.title || "Event"}". Save changes to publish.`,
        )
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "The photo import failed.",
        )
      } finally {
        onPending(-1)
        setImporting(false)
      }
      return
    }
    const id = target
    const activity = currentActivities.find((item) => item.id === id)
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
        currentActivities
          .find(
            (item) =>
              item.id === suggestActivity(post.message, currentActivities),
          )
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
          <H3 id="fb-library-title">
            {mode === "event"
              ? "Import event photos or create events from your Page history."
              : "Find photos in your Page history."}
          </H3>
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
          availableActivities={currentActivities}
          events={currentEvents}
          mode={mode}
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
  onUploadPhoto,
}: {
  activity: Pick<ClubActivity, "id" | "label">
  photos: ActivityPhoto[]
  disabled: boolean
  onChange: (photos: ActivityPhoto[]) => void
  onReset: () => void
  onUploadPhoto?: (
    file: File | undefined,
    kind: "photo" | "poster",
  ) => void
}) {
  const [newKind, setNewKind] = useState<"photo" | "poster">("photo")
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const full = photos.length >= maxActivityPhotos
  const move = (index: number, direction: number) => {
    const next = [...photos]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  const addLinkPhoto = () => {
    const src = linkUrl.trim()
    if (!src || full || photos.some((item) => item.src === src)) return
    onChange([
      ...photos,
      {
        src,
        kind: newKind,
        alt: `${activity.label} at the IIUC Economics & Banking Club`,
      },
    ])
    setLinkUrl("")
    setShowLinkInput(false)
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
      <Div className="fb-gallery-add-bar">
        <Select
          value={newKind}
          onChange={(event) =>
            setNewKind(event.target.value as "photo" | "poster")
          }
          disabled={disabled || full}
          aria-label={`Display style for new ${activity.label} photo`}
        >
          <Option value="photo">New photo: Fill frame</Option>
          <Option value="poster">New photo: Full poster</Option>
        </Select>
        {onUploadPhoto && (
          <Label className="admin-btn ghost">
            <Span>+ Upload to gallery</Span>
            <Input
              type="file"
              accept="image/*"
              hidden
              disabled={disabled || full}
              onChange={(event) => {
                onUploadPhoto(event.target.files?.[0], newKind)
                event.target.value = ""
              }}
            />
          </Label>
        )}
        <Button
          type="button"
          className="admin-link"
          disabled={disabled || full}
          onClick={() => setShowLinkInput((value) => !value)}
        >
          {showLinkInput ? "Hide image link" : "+ Add photo link"}
        </Button>
      </Div>
      {showLinkInput && (
        <Div className="fb-gallery-link-row">
          <Input
            value={linkUrl}
            placeholder="https://…"
            disabled={disabled || full}
            onChange={(event) => setLinkUrl(event.target.value)}
          />
          <Button
            type="button"
            className="admin-btn ghost"
            disabled={disabled || full || !/^https?:\/\/\S+$/i.test(linkUrl.trim())}
            onClick={addLinkPhoto}
          >
            Add photo
          </Button>
        </Div>
      )}
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
                disabled={disabled}
                onClick={() =>
                  onChange(
                    photos.map((item, position) =>
                      position === index
                        ? {
                            ...item,
                            kind: item.kind === "poster" ? "photo" : "poster",
                          }
                        : item,
                    ),
                  )
                }
              >
                {photo.kind === "poster" ? "Use photo fit" : "Use poster fit"}
              </Button>
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

export function SparkActivityManager({
  content,
  disabled,
  onChangeContent,
  onUploadImage,
  notify,
}: {
  content: SiteContent
  disabled: boolean
  onChangeContent: (updater: (current: SiteContent) => SiteContent) => void
  onUploadImage: (file: File | undefined, apply: (url: string) => void) => void
  notify: (message: string, tone?: "info" | "success" | "error") => void
}) {
  const [selectedId, setSelectedId] = useState<string>("all")
  const configured = resolveActivities(activities, content.activities, true)
  const activeCount = configured.filter((item) => item.enabled !== false).length
  const existingIds = new Set(configured.map((item) => item.id))
  const availableTemplates = [...activities, ...presetClubActivities].filter(
    (template) => !existingIds.has(template.id),
  )

  const updateActivities = (
    updater: (items: ClubActivity[]) => ClubActivity[],
  ) => {
    onChangeContent((current) => {
      const base = resolveActivities(activities, current.activities, true)
      return {
        ...current,
        activities: updater(base).slice(0, maxActivities),
      }
    })
  }

  const addActivity = (template?: Partial<ClubActivity>) => {
    if (disabled) return
    if (configured.length >= maxActivities) {
      notify(
        `Find your spark already has ${maxActivities} activities. Remove one before adding another.`,
        "error",
      )
      return
    }
    const created = createCustomActivity(
      configured.map((item) => item.id),
      template,
    )
    updateActivities((items) => [...items, created])
    setSelectedId(created.id)
    notify(
      `"${created.label}" added to Find your spark. Edit its details or photos below, then click Save changes.`,
      "info",
    )
  }

  const toggleActivity = (id: string) => {
    if (disabled) return
    updateActivities((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: item.enabled === false } : item,
      ),
    )
  }

  const patchActivity = (id: string, patch: Partial<ClubActivity>) => {
    updateActivities((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  const moveActivity = (index: number, direction: -1 | 1) => {
    updateActivities((items) => {
      const next = [...items]
      const target = index + direction
      if (target < 0 || target >= next.length) return items
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeActivity = (item: ClubActivity) => {
    if (disabled) return
    const name = item.label.trim() || "this activity"
    if (
      !window.confirm(
        `Remove "${name}" from Find your spark? You can re-add templates anytime before saving.`,
      )
    )
      return
    onChangeContent((current) => {
      const base = resolveActivities(activities, current.activities, true)
      return {
        ...current,
        activities: base.filter((entry) => entry.id !== item.id),
      }
    })
    if (selectedId === item.id) setSelectedId("all")
    notify(`"${name}" removed from your draft. Save changes to publish.`)
  }

  const resetAllActivities = () => {
    if (disabled) return
    if (
      !window.confirm(
        "Restore the 6 default Find your spark activities in your draft?",
      )
    )
      return
    onChangeContent((current) => {
      const next = { ...current }
      delete next.activities
      return next
    })
    setSelectedId("all")
    notify("Restored the 6 default activities in your draft.")
  }

  const visibleActivities =
    selectedId === "all" || !existingIds.has(selectedId)
      ? configured
      : configured.filter((item) => item.id === selectedId)

  return (
    <>
      <Section
        className="admin-card fb-spark-chooser"
        aria-labelledby="spark-chooser-title"
      >
        <Header className="fb-library-heading">
          <Div>
            <P className="admin-eyebrow">FIND YOUR SPARK · CHOOSE &amp; ADD</P>
            <H3 id="spark-chooser-title">
              Choose which activities appear on the website, or add new ones.
            </H3>
          </Div>
          <Span className="admin-badge">
            {activeCount} shown · {configured.length} total
          </Span>
        </Header>
        <P className="admin-muted">
          Click an activity below to show or hide it in the public &ldquo;Find
          your spark&rdquo; section, add ready-made club activity templates in
          one click, or create a custom activity with its own photo gallery.
        </P>

        <Div className="fb-spark-group">
          <Small className="admin-field-label">
            1. Choose visible activities (click to show or hide on the website)
          </Small>
          <Div className="fb-spark-pills" role="group" aria-label="Choose visible activities">
            {configured.map((item) => {
              const shown = item.enabled !== false
              return (
                <Button
                  type="button"
                  key={item.id}
                  disabled={disabled}
                  aria-pressed={shown}
                  className={
                    shown ? "fb-spark-pill is-shown" : "fb-spark-pill is-hidden"
                  }
                  onClick={() => toggleActivity(item.id)}
                >
                  <Icon name={item.icon} />
                  <Span>{item.label || "Untitled activity"}</Span>
                  <Small>{shown ? "Shown" : "Hidden"}</Small>
                </Button>
              )
            })}
          </Div>
        </Div>

        {availableTemplates.length > 0 && (
          <Div className="fb-spark-group">
            <Small className="admin-field-label">
              2. Quick-add club activity templates
            </Small>
            <Div className="fb-spark-pills">
              {availableTemplates.map((template) => (
                <Button
                  type="button"
                  key={template.id}
                  disabled={disabled || configured.length >= maxActivities}
                  className="fb-spark-pill is-template"
                  onClick={() => addActivity(template)}
                >
                  <Icon name={template.icon} />
                  <Span>+ {template.label}</Span>
                  <Small>{template.category}</Small>
                </Button>
              ))}
            </Div>
          </Div>
        )}

        <Div className="fb-scan-actions">
          <Button
            type="button"
            className="admin-btn primary"
            disabled={disabled || configured.length >= maxActivities}
            onClick={() => addActivity()}
          >
            + Add custom activity
          </Button>
          {content.activities !== undefined && (
            <Button
              type="button"
              className="admin-btn ghost"
              disabled={disabled}
              onClick={resetAllActivities}
            >
              Restore default 6 activities
            </Button>
          )}
        </Div>
      </Section>

      <Div className="admin-segment" role="group" aria-label="Choose activity to edit">
        <Button
          type="button"
          className={
            selectedId === "all" || !existingIds.has(selectedId) ? "active" : ""
          }
          onClick={() => setSelectedId("all")}
        >
          All activities <Span>{configured.length}</Span>
        </Button>
        {configured.map((item) => (
          <Button
            type="button"
            key={item.id}
            className={selectedId === item.id ? "active" : ""}
            onClick={() => setSelectedId(item.id)}
          >
            {item.label || "Untitled"}
          </Button>
        ))}
      </Div>

      <Div className="admin-people">
        {visibleActivities.map((activity) => {
          const index = configured.findIndex((item) => item.id === activity.id)
          const shown = activity.enabled !== false
          const photos = activityPhotos(
            activity,
            content.activityImages?.[activity.id],
            content.activityGalleries?.[activity.id],
          )
          return (
            <Article className="admin-card fb-activity-editor-card" key={activity.id}>
              <Div className="fb-activity-card-head">
                <Div className="fb-activity-card-title">
                  <Icon name={activity.icon} />
                  <Div>
                    <Strong>{activity.label || "Untitled activity"}</Strong>
                    <Small className="block">
                      {activity.category} · {shown ? "Shown on website" : "Hidden on website"}
                    </Small>
                  </Div>
                </Div>
                <Div className="fb-thumbnail-actions">
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleActivity(activity.id)}
                  >
                    {shown ? "Hide on site" : "Show on site"}
                  </Button>
                  <Button
                    type="button"
                    disabled={disabled || index <= 0}
                    aria-label={`Move ${activity.label} earlier`}
                    onClick={() => moveActivity(index, -1)}
                  >
                    Earlier
                  </Button>
                  <Button
                    type="button"
                    disabled={disabled || index >= configured.length - 1}
                    aria-label={`Move ${activity.label} later`}
                    onClick={() => moveActivity(index, 1)}
                  >
                    Later
                  </Button>
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeActivity(activity)}
                  >
                    Remove
                  </Button>
                </Div>
              </Div>

              <Div className="fb-post-options">
                <Label className="admin-field">
                  <Span>Activity name (badge)</Span>
                  <Input
                    value={activity.label}
                    disabled={disabled}
                    placeholder="e.g. Seminars & workshops"
                    onChange={(event) =>
                      patchActivity(activity.id, {
                        label: event.target.value,
                        alt: `Economics & Banking Club ${event.target.value.trim().toLowerCase() || "activity"}`,
                      })
                    }
                  />
                </Label>
                <Label className="admin-field">
                  <Span>Filter category</Span>
                  <Select
                    value={activity.category}
                    disabled={disabled}
                    onChange={(event) =>
                      patchActivity(activity.id, {
                        category: event.target.value,
                      })
                    }
                  >
                    {activityCategories.map((category) => (
                      <Option key={category} value={category}>
                        {category}
                      </Option>
                    ))}
                  </Select>
                </Label>
              </Div>

              <Div className="fb-post-options">
                <Label className="admin-field">
                  <Span>Card headline</Span>
                  <Input
                    value={activity.title}
                    disabled={disabled}
                    placeholder="e.g. Learning beyond the classroom."
                    onChange={(event) =>
                      patchActivity(activity.id, { title: event.target.value })
                    }
                  />
                </Label>
                <Label className="admin-field">
                  <Span>Card icon</Span>
                  <Select
                    value={activity.icon}
                    disabled={disabled}
                    onChange={(event) =>
                      patchActivity(activity.id, { icon: event.target.value })
                    }
                  >
                    {activityIconOptions.map((icon) => (
                      <Option key={icon.id} value={icon.id}>
                        {icon.label}
                      </Option>
                    ))}
                  </Select>
                </Label>
              </Div>

              <Label className="admin-field">
                <Span>Description</Span>
                <Textarea
                  value={activity.text}
                  disabled={disabled}
                  placeholder="Describe what members experience in this activity…"
                  onChange={(event) =>
                    patchActivity(activity.id, { text: event.target.value })
                  }
                />
              </Label>

              <ActivityGalleryEditor
                activity={activity}
                photos={photos}
                disabled={disabled}
                onUploadPhoto={(file, kind) =>
                  onUploadImage(file, (url) =>
                    onChangeContent((current) =>
                      setActivityGallery(current, activity.id, [
                        ...activityPhotos(
                          activity,
                          current.activityImages?.[activity.id],
                          current.activityGalleries?.[activity.id],
                        ),
                        {
                          src: url,
                          kind,
                          alt: `${activity.label} at the IIUC Economics & Banking Club`,
                        },
                      ]),
                    ),
                  )
                }
                onChange={(nextPhotos) =>
                  onChangeContent((current) =>
                    setActivityGallery(current, activity.id, nextPhotos),
                  )
                }
                onReset={() =>
                  onChangeContent((current) => {
                    const activityGalleries = { ...current.activityGalleries }
                    const activityImages = { ...current.activityImages }
                    delete activityGalleries[activity.id]
                    delete activityImages[activity.id]
                    const isBuiltIn = (
                      builtInActivityIds as readonly string[]
                    ).includes(activity.id)
                    const nextActivities = current.activities?.map((item) => {
                      if (item.id !== activity.id) return item
                      const copy = { ...item }
                      delete copy.gallery
                      if (isBuiltIn) {
                        const fallback = activities.find(
                          (entry) => entry.id === activity.id,
                        )
                        if (fallback) {
                          copy.image = fallback.image
                          copy.imageKind = fallback.imageKind
                          copy.imageSource = fallback.imageSource
                        }
                      }
                      return copy
                    })
                    return {
                      ...current,
                      ...(nextActivities ? { activities: nextActivities } : {}),
                      activityGalleries,
                      activityImages,
                    }
                  })
                }
              />
            </Article>
          )
        })}
      </Div>
    </>
  )
}
export function EventProgrammesManager({
  content,
  disabled,
  onChangeContent,
  onUploadImage,
  notify,
}: {
  content: SiteContent
  disabled: boolean
  onChangeContent: (updater: (current: SiteContent) => SiteContent) => void
  onUploadImage: (file: File | undefined, apply: (url: string) => void) => void
  notify: (message: string, tone?: "info" | "success" | "error") => void
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | "all">("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const events = content.events ?? []

  const updateEvent = (index: number, patch: Partial<ClubEvent>) => {
    onChangeContent((current) => ({
      ...current,
      events: current.events.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  const moveEvent = (index: number, direction: -1 | 1) => {
    onChangeContent((current) => {
      const next = [...current.events]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, events: next }
    })
    if (typeof selectedIndex === "number") {
      const target = selectedIndex + direction
      if (target >= 0 && target < events.length) setSelectedIndex(target)
    }
  }

  const addEvent = (template?: Partial<ClubEvent>) => {
    if (disabled) return
    const nextEvent: ClubEvent = {
      title: template?.title ?? "",
      type: template?.type ?? "Seminar",
      status: template?.status ?? "Upcoming",
      date: template?.date ?? "",
      venue: template?.venue ?? "IIUC campus",
      deadline: template?.deadline ?? "",
      description: template?.description ?? "",
      image: template?.image ?? "",
      ...(template?.gallery ? { gallery: [...template.gallery] } : {}),
    }
    onChangeContent((current) => ({
      ...current,
      events: [nextEvent, ...current.events],
    }))
    setSelectedIndex(0)
    setStatusFilter("all")
    notify(
      `"${nextEvent.title || "New event"}" added at the top of Events (featured on the home page). Edit details or add photos below, then click Save changes.`,
      "info",
    )
  }

  const removeEvent = (index: number) => {
    if (disabled) return
    const item = events[index]
    const label = item?.title.trim() || `Event ${index + 1}`
    if (!window.confirm(`Remove "${label}" from your events draft?`)) return
    onChangeContent((current) => ({
      ...current,
      events: current.events.filter((_, itemIndex) => itemIndex !== index),
    }))
    setSelectedIndex("all")
    notify(`"${label}" removed from your draft. Save changes to publish.`)
  }

  const visibleEntries = events
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => {
      if (typeof selectedIndex === "number" && selectedIndex < events.length) {
        return index === selectedIndex
      }
      if (statusFilter !== "all") {
        return (item.status ?? "Coming Soon") === statusFilter
      }
      return true
    })

  return (
    <>
      <Section
        className="admin-card fb-spark-chooser"
        aria-labelledby="events-studio-title"
      >
        <Header className="fb-library-heading">
          <Div>
            <P className="admin-eyebrow">EVENTS STUDIO · CHOOSE &amp; ADD</P>
            <H3 id="events-studio-title">
              Add upcoming or completed events, and attach photos from Facebook
              or your device.
            </H3>
          </Div>
          <Span className="admin-badge">
            {events.length} {events.length === 1 ? "event" : "events"} · Top 2
            featured on home
          </Span>
        </Header>
        <P className="admin-muted">
          Use a one-click template below, add a custom event, or scan the
          Official Page Archive above to import event photos and create events
          directly from Facebook posts.
        </P>

        <Div className="fb-spark-group">
          <Small className="admin-field-label">
            Quick-add event templates (places the new event at #01)
          </Small>
          <Div className="fb-spark-pills">
            {presetEventTemplates.map((template) => (
              <Button
                type="button"
                key={template.title}
                disabled={disabled}
                className="fb-spark-pill is-template"
                onClick={() => addEvent(template)}
              >
                <Icon name="calendar" />
                <Span>+ {template.title}</Span>
                <Small>{template.status}</Small>
              </Button>
            ))}
          </Div>
        </Div>

        <Div className="fb-scan-actions">
          <Button
            type="button"
            className="admin-btn primary"
            disabled={disabled}
            onClick={() => addEvent()}
          >
            + Add custom event
          </Button>
        </Div>
      </Section>

      {events.length > 0 && (
        <Div className="admin-inbox-tools">
          <Div
            className="admin-segment"
            role="group"
            aria-label="Choose event to edit"
          >
            <Button
              type="button"
              className={selectedIndex === "all" ? "active" : ""}
              onClick={() => setSelectedIndex("all")}
            >
              All events <Span>{events.length}</Span>
            </Button>
            {events.map((item, index) => (
              <Button
                type="button"
                key={index}
                className={selectedIndex === index ? "active" : ""}
                onClick={() => setSelectedIndex(index)}
              >
                {String(index + 1).padStart(2, "0")} ·{" "}
                {item.title.trim() || "Untitled"}
              </Button>
            ))}
          </Div>
          {selectedIndex === "all" && (
            <Div
              className="admin-segment compact"
              role="group"
              aria-label="Filter events by status"
            >
              <Button
                type="button"
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All statuses
              </Button>
              {eventStatuses.map((status) => (
                <Button
                  type="button"
                  key={status}
                  className={statusFilter === status ? "active" : ""}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </Button>
              ))}
            </Div>
          )}
        </Div>
      )}

      {events.length === 0 ? (
        <Div className="admin-empty">
          No events yet. Choose a template above, click + Add custom event, or
          import a post from the Official Page Archive.
        </Div>
      ) : visibleEntries.length === 0 ? (
        <Div className="admin-empty">
          No events match the selected status filter.
        </Div>
      ) : (
        <Div className="admin-people">
          {visibleEntries.map(({ item, index }) => {
            const photos = eventPhotos(item)
            const status = item.status ?? "Coming Soon"
            return (
              <Article
                className="admin-card fb-activity-editor-card"
                key={index}
              >
                <Div className="fb-activity-card-head">
                  <Div className="fb-activity-card-title">
                    <Span className="admin-index">
                      {String(index + 1).padStart(2, "0")}
                    </Span>
                    <Div>
                      <Strong>{item.title || "Untitled event"}</Strong>
                      <Small className="block">
                        {item.type || "Event"} · {status}
                        {index < 2 ? " · Featured on home page" : ""}
                      </Small>
                    </Div>
                  </Div>
                  <Div className="fb-thumbnail-actions">
                    <Button
                      type="button"
                      disabled={disabled || index === 0}
                      aria-label={`Move ${item.title || "event"} earlier`}
                      onClick={() => moveEvent(index, -1)}
                    >
                      Earlier
                    </Button>
                    <Button
                      type="button"
                      disabled={disabled || index >= events.length - 1}
                      aria-label={`Move ${item.title || "event"} later`}
                      onClick={() => moveEvent(index, 1)}
                    >
                      Later
                    </Button>
                    <Button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeEvent(index)}
                    >
                      Remove
                    </Button>
                  </Div>
                </Div>

                <Div className="fb-post-options">
                  <Label className="admin-field">
                    <Span>Event title</Span>
                    <Input
                      value={item.title}
                      disabled={disabled}
                      placeholder="e.g. Economics in a changing world"
                      onChange={(event) =>
                        updateEvent(index, { title: event.target.value })
                      }
                    />
                  </Label>
                  <Label className="admin-field">
                    <Span>Event type</Span>
                    <Input
                      value={item.type}
                      disabled={disabled}
                      placeholder="e.g. Seminar, Workshop, Competition"
                      onChange={(event) =>
                        updateEvent(index, { type: event.target.value })
                      }
                    />
                  </Label>
                </Div>

                <Div className="fb-post-options">
                  <Label className="admin-field">
                    <Span>Status</Span>
                    <Select
                      value={status}
                      disabled={disabled}
                      onChange={(event) =>
                        updateEvent(index, {
                          status: event.target.value as EventStatus,
                        })
                      }
                    >
                      {eventStatuses.map((statusOption) => (
                        <Option key={statusOption} value={statusOption}>
                          {statusOption}
                        </Option>
                      ))}
                    </Select>
                  </Label>
                  <Label className="admin-field">
                    <Span>Date &amp; time</Span>
                    <Input
                      value={item.date ?? ""}
                      disabled={disabled}
                      placeholder="e.g. 12 May 2026, 10:00 AM"
                      onChange={(event) =>
                        updateEvent(index, { date: event.target.value })
                      }
                    />
                  </Label>
                </Div>

                <Div className="fb-post-options">
                  <Label className="admin-field">
                    <Span>Venue</Span>
                    <Input
                      value={item.venue ?? ""}
                      disabled={disabled}
                      placeholder="e.g. IIUC Auditorium"
                      onChange={(event) =>
                        updateEvent(index, { venue: event.target.value })
                      }
                    />
                  </Label>
                  <Label className="admin-field">
                    <Span>Registration deadline</Span>
                    <Input
                      value={item.deadline ?? ""}
                      disabled={disabled}
                      placeholder="e.g. 10 May 2026"
                      onChange={(event) =>
                        updateEvent(index, { deadline: event.target.value })
                      }
                    />
                  </Label>
                </Div>

                <Label className="admin-field">
                  <Span>Event description (shown when visitors open the event)</Span>
                  <Textarea
                    value={item.description ?? ""}
                    disabled={disabled}
                    placeholder="Share speaker details, agenda, or participation instructions…"
                    onChange={(event) =>
                      updateEvent(index, { description: event.target.value })
                    }
                  />
                </Label>

                <ActivityGalleryEditor
                  activity={{
                    id: `event-${index}`,
                    label: item.title.trim() || `Event ${index + 1}`,
                  }}
                  photos={photos}
                  disabled={disabled}
                  onUploadPhoto={(file, kind) =>
                    onUploadImage(file, (url) =>
                      onChangeContent((current) =>
                        appendEventPhoto(current, index, {
                          src: url,
                          kind,
                          alt: `${item.title.trim() || "Club event"} — Economics & Banking Club, IIUC`,
                        }),
                      ),
                    )
                  }
                  onChange={(nextPhotos) =>
                    onChangeContent((current) =>
                      setEventGallery(current, index, nextPhotos),
                    )
                  }
                  onReset={() =>
                    onChangeContent((current) =>
                      setEventGallery(current, index, []),
                    )
                  }
                />
              </Article>
            )
          })}
        </Div>
      )}
    </>
  )
}
