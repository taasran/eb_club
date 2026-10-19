import AdminControls from "../AdminControls"

const { Article } = AdminControls

export type ManagedExecutive = {
  name?: string
  designation?: string
  studentId?: string
  batch?: string
  image?: string
  quote?: string
  imageZoom?: number
  imageX?: number
  imageY?: number
}

// One illustrated avatar for every profile without a photo keeps the roster consistent.
function IllustratedAvatar() {
  return (
    <svg
      className="executive-avatar"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="60" cy="60" r="58" className="avatar-ring" />
      <circle cx="60" cy="60" r="52" className="avatar-bg" />
      <path
        className="avatar-body"
        d="M22 104c4-20 20-31 38-31s34 11 38 31a52 52 0 0 1-76 0Z"
      />
      <path className="avatar-collar" d="M50 74l10 13 10-13" />
      <circle cx="60" cy="47" r="17" className="avatar-head" />
      <path
        className="avatar-hair"
        d="M43 45c0-11 8-18 17-18s17 7 17 18c-5-6-11-8-17-8s-12 2-17 8Z"
      />
    </svg>
  )
}

export default function ExecutiveCard({
  role,
  description,
  index,
  person,
  total,
  leadership = index < 3,
}: {
  role: string
  description: string
  index: number
  person?: ManagedExecutive
  total: number
  leadership?: boolean
}) {
  const name =
    person?.name?.trim() && person.name !== "Name to be announced"
      ? person.name
      : "Name to be announced"
  const details = [
    person?.studentId && `ID: ${person.studentId}`,
    person?.batch && `Batch: ${person.batch}`,
  ]
    .filter(Boolean)
    .join(" · ")
  const quote = person?.quote?.trim()
  return (
    <Article
      className={
        leadership ? "executive-card leadership-card" : "executive-card"
      }
      aria-label={`${role}, profile ${index + 1} of ${total}`}
      tabIndex={leadership ? 0 : undefined}
    >
      <div className="executive-portrait">
        {person?.image ? (
          <img
            className="executive-photo"
            src={person.image}
            alt=""
            style={{
              objectPosition: `${person.imageX ?? 50}% ${person.imageY ?? 20}%`,
              transformOrigin: `${person.imageX ?? 50}% ${person.imageY ?? 20}%`,
              transform: person.imageZoom && person.imageZoom > 1 ? `scale(${person.imageZoom})` : undefined,
            }}
          />
        ) : (
          <IllustratedAvatar />
        )}
        <div className="executive-reveal">
          <span className="executive-reveal-label">
            {quote ? "In their words" : "Responsibility"}
          </span>
          <p>{quote ? `“${quote}”` : description}</p>
        </div>
      </div>
      <div className="executive-info">
        <div className="eyebrow">{role}</div>
        <h3>{name}</h3>
        <p>{details || description}</p>
      </div>
    </Article>
  )
}
