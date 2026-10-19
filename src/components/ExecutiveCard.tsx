import Icon from "./Icon"
import AdminControls from "../AdminControls"

const { Article } = AdminControls

export type ManagedExecutive = {
  name?: string
  designation?: string
  studentId?: string
  batch?: string
  image?: string
}

export default function ExecutiveCard({
  role,
  description,
  index,
  person,
  total,
  leadership = index < 4,
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
  return (
    <Article
      className={
        leadership ? "executive-card leadership-card" : "executive-card"
      }
      aria-label={`${role}, profile ${index + 1} of ${total}`}
    >
      <div className="executive-portrait" aria-hidden="true">
        {person?.image ? (
          <img
            src={person.image}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 20%",
            }}
          />
        ) : (
          <span className="executive-profile">
            <Icon name="people" />
          </span>
        )}
        {!person?.image && (
          <span className="executive-portrait-label">PORTRAIT TO COME</span>
        )}
      </div>
      <div className="executive-info">
        <div className="eyebrow">{role}</div>
        <h3>{name}</h3>
        <p>{details || description}</p>
      </div>
    </Article>
  )
}
