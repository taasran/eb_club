import { useState } from "react"
import EconomicsBackdrop from "../EconomicsBackdrop"
import useSiteContent from "../useSiteContent"
import AdminControls from "../AdminControls"
import Icon from "../components/Icon"
import {
  archivePages,
  leadershipTopics,
  defaultArchiveYears,
} from "../data/club"

const { Div, P } = AdminControls

type ManagedLeadership = {
  leadership?: Record<string, {
    name: string
    designation: string
    session: string
    image?: string
  }[]>
  archiveYears?: {
    year: string
    members: {
      name: string
      designation: string
      studentId: string
      batch: string
    }[]
  }[]
}

function CommitteeWiseArchive({
  managedYears,
}: {
  managedYears?: ManagedLeadership["archiveYears"]
}) {
  const committeeArchiveYears =
    managedYears !== undefined
      ? managedYears.map((item) => ({
          year: item.year,
          members: item.members.map((member) => ({
            ...member,
            id: member.studentId || "ID to be announced",
            batch: member.batch || "Batch to be announced",
          })),
        }))
      : defaultArchiveYears
  const [chosenYear, setSelectedYear] = useState<string | null>(null)
  const selectedYear = chosenYear ?? committeeArchiveYears[0]?.year
  const committee =
    committeeArchiveYears.find((item) => item.year === selectedYear) ??
    committeeArchiveYears[0]

  return (
    <section
      className="committee-archive"
      aria-labelledby="committee-archive-title"
    >
      <div className="eyebrow">YEAR-WISE EXECUTIVE COMMITTEE</div>
      <h2 id="committee-archive-title">Choose a session.</h2>
      <p>
        Select a year to view that session’s executive committee, including each
        member’s name, ID, batch, and designation.
      </p>
      <div
        className="committee-year-list"
        role="tablist"
        aria-label="Committee sessions"
      >
        {committeeArchiveYears.map((item) => (
          <button
            className={
              item.year === selectedYear
                ? "committee-year selected"
                : "committee-year"
            }
            key={item.year}
            onClick={() => setSelectedYear(item.year)}
            role="tab"
            aria-selected={item.year === selectedYear}
          >
            {item.year}
          </button>
        ))}
      </div>
      <Div
        className="committee-member-list"
        role="tabpanel"
        aria-label={
          committee
            ? `${committee.year} executive committee`
            : "No published sessions"
        }
      >
        <div className="committee-member-heading">
          <span>Name</span>
          <span>Student ID</span>
          <span>Batch</span>
          <span>Designation</span>
        </div>
        {committee?.members.map((member) => (
          <div
            className="committee-member-row"
            key={`${committee.year}-${member.designation}-${member.name}`}
          >
            <strong>{member.name}</strong>
            <span>{member.id}</span>
            <span>{member.batch}</span>
            <span>{member.designation}</span>
          </div>
        ))}
        {!committee && <P>No committee sessions are currently published.</P>}
      </Div>
      <small className="archive-note">
        Add more members to a year’s record as official committee information
        becomes available.
      </small>
    </section>
  )
}

export default function ArchivePage({
  page,
}: {
  page: typeof archivePages[number]
}) {
  const managed = useSiteContent()
  const savedProfiles = managed.leadership?.[page.slug]
  const profiles =
    savedProfiles !== undefined
      ? savedProfiles.map((profile, index) => ({
          ...profile,
          index: index + 1,
        }))
      : page.profiles.map((profile) => ({ ...profile, image: "" }))
  return (
    <div className="site-shell">
      <EconomicsBackdrop />
      <div className="topline">
        <span>A community of curious minds. A future of possibilities.</span>
        <span>
          International Islamic University Chittagong{" "}
          <span className="tiny-arrow">↗</span>
        </span>
      </div>
      <header className="header">
        <a
          href="/"
          className="brand"
          aria-label="Economics and Banking Club home"
        >
          <img
            src="/images/club-logo.png"
            alt="IIUC Economics and Banking Club logo"
          />
          <div>
            Economics & Banking Club
            <small>INTERNATIONAL ISLAMIC UNIVERSITY CHITTAGONG</small>
          </div>
        </a>
        <nav className="nav archive-nav">
          <a href="/#about">About us</a>
          <a href="/#activities">Activities</a>
          <a href="/#events">Events</a>
          <details className="about-dropdown leadership-dropdown">
            <summary>
              Leadership & Committees{" "}
              <Icon name="chevron" className="about-chevron" />
            </summary>
            <div className="about-submenu">
              {leadershipTopics.map((topic) => (
                <a key={topic.to} href={topic.to}>
                  {topic.title}
                  <Icon name="arrow" />
                </a>
              ))}
            </div>
          </details>
        </nav>
      </header>
      <main className="archive-page wrap section">
        <div className="eyebrow">LEADERSHIP & COMMITTEES · ARCHIVE</div>
        <h1>{page.title}</h1>
        <p className="archive-intro">{page.description}</p>
        <div
          className="archive-directory"
          aria-label="Leadership and committee archive"
        >
          {archivePages.map((item) => (
            <a
              className={
                item.slug === page.slug
                  ? "archive-link current"
                  : "archive-link"
              }
              href={`/leadership/${item.slug}`}
              key={item.slug}
            >
              <span>{item.title}</span>
              <Icon name="arrow" />
            </a>
          ))}
        </div>
        {page.slug === "committee-wise-archive" ? (
          <CommitteeWiseArchive managedYears={managed.archiveYears} />
        ) : (
          <section
            className="archive-records"
            aria-labelledby="archive-records-title"
          >
            <div className="eyebrow">PROFILE DIRECTORY</div>
            <h2 id="archive-records-title">{page.title} at a glance.</h2>
            <p>
              Each listing includes a portrait, designation, name, and session.
              Replace the placeholders with verified club records when
              available.
            </p>
            <div className="archive-profile-grid">
              {profiles.map((profile) => (
                <article
                  className="archive-profile-card"
                  key={`${profile.designation}-${profile.index}`}
                >
                  <div className="archive-profile-portrait" aria-hidden="true">
                    {profile.image ? (
                      <img
                        src={profile.image}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center 20%",
                        }}
                      />
                    ) : (
                      <>
                        <span>
                          <Icon name="people" />
                        </span>
                        <small>PHOTO TO COME</small>
                      </>
                    )}
                  </div>
                  <div className="archive-profile-info">
                    <div className="eyebrow">{profile.designation}</div>
                    <h3>{profile.name}</h3>
                    <p>{profile.session}</p>
                  </div>
                </article>
              ))}
            </div>
            <a className="button secondary" href="/#executives">
              View current executive committee <Icon name="arrow" />
            </a>
          </section>
        )}
      </main>
    </div>
  )
}
