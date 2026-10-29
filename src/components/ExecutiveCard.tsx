import AdminControls from "../AdminControls"
import Icon from "./Icon"

const { Article, Div, Img, Span, P, H3, Details, Summary } = AdminControls

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
        leadership
          ? "executive-card leadership-card profile-card"
          : "executive-card profile-card"
      }
      aria-label={`${role}, profile ${index + 1} of ${total}`}
    >
      <Div className="profile-portrait-stage">
        <Div className="executive-portrait">
          {person?.image ? (
            <Img
              className="executive-photo"
              src={person.image}
              alt=""
              style={{
                objectPosition: `${person.imageX ?? 50}% ${person.imageY ?? 20}%`,
                transformOrigin: `${person.imageX ?? 50}% ${person.imageY ?? 20}%`,
                transform:
                  person.imageZoom && person.imageZoom > 1
                    ? `scale(${person.imageZoom})`
                    : undefined,
              }}
            />
          ) : (
            <IllustratedAvatar />
          )}
        </Div>
        <Span className="profile-club-seal" aria-hidden="true">
          <Img src="/images/club-logo.png" alt="" />
        </Span>
      </Div>
      <Div className="executive-info">
        <Div className="profile-registry">
          <Span>
            {leadership
              ? "Leadership Economics & Banking Club"
              : "Executives Economics & Banking Club"}
          </Span>
        </Div>
        <H3>{name}</H3>
        <P className="profile-role">{role}</P>
        <Details className="profile-disclosure">
          <Summary
            className="profile-details-toggle"
            aria-label={`View profile details for ${name}${
              details ? `, ${details}` : ""
            }`}
          >
            <Span className="executive-details">{details || "IIUC"}</Span>
            <Span className="profile-details-pill">
              View profile <Icon name="chevron" />
            </Span>
          </Summary>
          <Div
            className={
              quote ? "executive-reveal profile-quote" : "executive-reveal"
            }
          >
            <Span className="executive-reveal-label">
              {quote ? "In their words" : "Responsibility"}
            </Span>
            <P>{quote ? `“${quote}”` : description}</P>
          </Div>
        </Details>
      </Div>
    </Article>
  )
}
