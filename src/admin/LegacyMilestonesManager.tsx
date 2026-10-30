import { useState } from "react"
import AdminControls from "../AdminControls"
import Icon from "../components/Icon"
import { legacyMilestones } from "../data/club"
import {
  legacyGallery,
  maxLegacyPhotos,
  type LegacyMilestone,
  type SiteContent,
} from "../contentClient"
import { ActivityGalleryEditor } from "./FacebookPhotoLibrary"
import { appendLegacyPhoto, setLegacyGallery } from "./facebookArchive"

const {
  Section,
  Div,
  Header,
  H3,
  P,
  Span,
  Small,
  Strong,
  Button,
  Article,
  Label,
  Input,
  Textarea,
} = AdminControls

export default function LegacyMilestonesManager({
  content,
  disabled,
  onChangeContent,
  onUploadImage,
  notify,
}: {
  content: SiteContent
  disabled: boolean
  onChangeContent: (update: (current: SiteContent) => SiteContent) => void
  onUploadImage: (file: File | undefined, apply: (url: string) => void) => void
  notify: (message: string) => void
}) {
  const [selected, setSelected] = useState<number | "all">("all")
  const milestones = content.legacy ?? []
  const templates = legacyMilestones.filter(
    (template) => !milestones.some((item) => item.title === template.title),
  )
  const full = milestones.length >= 300
  const add = (template?: LegacyMilestone) => {
    if (disabled || full) return
    onChangeContent((current) => ({
      ...current,
      legacy: [
        ...(current.legacy ?? []),
        template
          ? structuredClone(template)
          : {
              year: "",
              title: "",
              text: "",
              image: "",
              highlights: [],
            },
      ],
    }))
    setSelected(milestones.length)
    notify(
      "Milestone added to your draft. Add details and photos, then Save changes.",
    )
  }
  const patch = (index: number, update: Partial<LegacyMilestone>) =>
    onChangeContent((current) => ({
      ...current,
      legacy: (current.legacy ?? []).map((item, position) =>
        position === index ? { ...item, ...update } : item,
      ),
    }))
  const move = (index: number, direction: -1 | 1) => {
    onChangeContent((current) => {
      const next = [...(current.legacy ?? [])]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, legacy: next }
    })
    if (selected !== "all") setSelected(index + direction)
  }
  const remove = (index: number) => {
    if (
      !window.confirm(
        `Remove "${milestones[index].title || "this milestone"}" and its photos from your draft?`,
      )
    )
      return
    onChangeContent((current) => ({
      ...current,
      legacy: (current.legacy ?? []).filter(
        (_, position) => position !== index,
      ),
    }))
    setSelected("all")
    notify("Milestone removed from the draft. Save changes to publish.")
  }

  return (
    <>
      <Section
        className="admin-card fb-spark-chooser"
        aria-labelledby="legacy-studio-title"
      >
        <Header className="fb-library-heading">
          <Div>
            <P className="admin-eyebrow">OUR LEGACY · MILESTONE STUDIO</P>
            <H3 id="legacy-studio-title">
              Keep the moments that shaped our club.
            </H3>
          </Div>
          <Span className="admin-badge">{milestones.length} milestones</Span>
        </Header>
        <P className="admin-muted">
          Add a milestone, choose one to edit, and build its photo gallery.
          Upload from your device, use an image link, or import official
          Facebook photos below. Nothing is published until you Save changes.
        </P>
        {templates.length > 0 && (
          <Div className="fb-spark-group">
            <Small className="admin-field-label">
              Quick-add milestone templates · review before publishing
            </Small>
            <Div className="fb-spark-pills">
              {templates.map((template) => (
                <Button
                  key={template.title}
                  type="button"
                  className="fb-spark-pill is-template"
                  disabled={disabled || full}
                  onClick={() => add(template)}
                >
                  <Icon name="flag" />
                  <Span>+ {template.title}</Span>
                  <Small>{template.year}</Small>
                </Button>
              ))}
            </Div>
          </Div>
        )}
        <Div className="fb-scan-actions">
          <Button
            type="button"
            className="admin-btn primary"
            disabled={disabled || full}
            onClick={() => add()}
          >
            + Add custom milestone
          </Button>
        </Div>
      </Section>

      <Div
        className="admin-segment"
        role="group"
        aria-label="Choose milestone to edit"
      >
        <Button
          type="button"
          className={selected === "all" ? "active" : ""}
          onClick={() => setSelected("all")}
        >
          All milestones · {milestones.length}
        </Button>
        {milestones.map((item, index) => (
          <Button
            type="button"
            key={index}
            className={selected === index ? "active" : ""}
            onClick={() => setSelected(index)}
          >
            {item.year} · {item.title || "Untitled milestone"}
          </Button>
        ))}
      </Div>

      {!milestones.length && (
        <Div className="admin-empty">
          Start with a template or add a custom milestone. You can also create
          one from a Facebook post below.
        </Div>
      )}
      <Div className="admin-people">
        {milestones
          .map((item, index) => ({ item, index }))
          .filter(
            ({ index }) =>
              selected === "all" ||
              selected >= milestones.length ||
              selected === index,
          )
          .map(({ item, index }) => (
            <Article className="admin-card fb-activity-editor-card" key={index}>
              <Div className="fb-activity-card-head">
                <Div className="fb-activity-card-title">
                  <Icon name="flag" />
                  <Div>
                    <Strong>{item.title || "Untitled milestone"}</Strong>
                    <Small className="block">
                      {item.year || "Add a year"} · Our Legacy
                    </Small>
                  </Div>
                </Div>
                <Div className="fb-thumbnail-actions">
                  <Button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${item.title || "milestone"} earlier`}
                  >
                    Earlier
                  </Button>
                  <Button
                    type="button"
                    disabled={disabled || index === milestones.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${item.title || "milestone"} later`}
                  >
                    Later
                  </Button>
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </Div>
              </Div>
              <ActivityGalleryEditor
                activity={{
                  id: `legacy-${index}`,
                  label: item.title || "Club milestone",
                }}
                title="Milestone photos"
                maxPhotos={maxLegacyPhotos}
                resetLabel="Clear photos"
                emptyMessage="Add your first milestone photo using Upload milestone photo, Add photo link, or the Facebook archive below."
                photos={legacyGallery(item)}
                disabled={disabled}
                onChange={(photos) =>
                  onChangeContent((current) =>
                    setLegacyGallery(current, index, photos),
                  )
                }
                onReset={() => {
                  if (
                    window.confirm(
                      "Clear this milestone's photo gallery from the draft?",
                    )
                  ) {
                    onChangeContent((current) =>
                      setLegacyGallery(current, index, []),
                    )
                  }
                }}
                onUploadPhoto={(file, kind) =>
                  onUploadImage(file, (src) =>
                    onChangeContent((current) =>
                      appendLegacyPhoto(current, index, {
                        src,
                        kind,
                        alt: `${item.title || "Club milestone"} — programme photo`.slice(
                          0,
                          500,
                        ),
                      }),
                    ),
                  )
                }
              />
              <Div className="fb-post-options">
                <Label className="admin-field">
                  <Span>Year / session</Span>
                  <Input
                    value={item.year}
                    disabled={disabled}
                    placeholder="e.g. 2025"
                    onChange={(event) =>
                      patch(index, { year: event.target.value })
                    }
                  />
                </Label>
                <Label className="admin-field">
                  <Span>Milestone title</Span>
                  <Input
                    value={item.title}
                    disabled={disabled}
                    placeholder="e.g. EB Winter Fest 2025"
                    onChange={(event) =>
                      patch(index, { title: event.target.value })
                    }
                  />
                </Label>
              </Div>
              <Label className="admin-field">
                <Span>Description</Span>
                <Textarea
                  value={item.text}
                  disabled={disabled}
                  placeholder="What happened and why it mattered"
                  onChange={(event) =>
                    patch(index, { text: event.target.value })
                  }
                />
              </Label>
              <Label className="admin-field">
                <Span>Highlights · one per line</Span>
                <Textarea
                  value={(item.highlights ?? []).join("\n")}
                  disabled={disabled}
                  placeholder={"Campus-wide celebration\nCultural programme"}
                  onChange={(event) =>
                    patch(index, {
                      highlights: event.target.value
                        ? event.target.value.split("\n")
                        : [],
                    })
                  }
                />
              </Label>
            </Article>
          ))}
      </Div>
    </>
  )
}
