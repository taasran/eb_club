import { useEffect, useRef, useState } from "react"
import { serverUrl, publicAnonKey } from "../supabase"
import EconomicsBackdrop from "../EconomicsBackdrop"
import EconomicsLoader from "../EconomicsLoader"
import useSiteContent from "../useSiteContent"
import AdminControls from "../AdminControls"
import Icon from "../components/Icon"
import type { ManagedExecutive } from "../components/ExecutiveCard"
import ExecutiveShowcase from "../components/ExecutiveShowcase"
import LegacySlideshow from "../components/LegacySlideshow"
import { currentClubTeam, type ClubEvent } from "../contentClient"
import {
  committee,
  aboutTopics,
  activities,
  activityCategories,
  clubFacts,
  heroAchievements,
  leadershipTopics,
  legacyMilestones,
} from "../data/club"

const { Div, P, Span, Small, H3, Button } = AdminControls

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [filter, setFilter] = useState("All activities")
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [ambientPaused, setAmbientPaused] = useState(false)
  const [welcomeExpanded, setWelcomeExpanded] = useState(false)
  const [openMilestone, setOpenMilestone] = useState<number | null>(0)
  const managedContent = useSiteContent()
  const displayedExecutives: ManagedExecutive[] =
    managedContent.executives ??
    committee.map(([designation]) => ({ designation }))
  const team = currentClubTeam<ManagedExecutive>(
    displayedExecutives,
    managedContent.clubLeadership,
  )
  const displayedEvents: ClubEvent[] = managedContent.events ?? [
    {
      title: "Economics in a changing world",
      type: "Proposed seminar",
      status: "Coming Soon",
    },
    {
      title: "Your first step into banking",
      type: "Proposed workshop",
      status: "Coming Soon",
    },
  ]
  const displayedLegacy = managedContent.legacy ?? legacyMilestones
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (preference.matches || !("IntersectionObserver" in window)) return
    const animations = new Set<Animation>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          observer.unobserve(entry.target)
          if (preference.matches) return
          const animation = entry.target.animate(
            [
              { opacity: 0, translate: "0 20px" },
              { opacity: 1, translate: "0 0" },
            ],
            { duration: 600, easing: "cubic-bezier(.2,.7,.3,1)" },
          )
          animations.add(animation)
          animation.onfinish = () => animations.delete(animation)
        })
      },
      { threshold: 0.08 },
    )
    mainRef.current
      ?.querySelectorAll(
        ".achievement-strip, .welcome-message, .about, .about-resources, .section-heading, .activity-card, .legacy-item, .executive-card, .event-row, .join-banner, .footer-columns",
      )
      .forEach((element) => observer.observe(element))
    const stopMotion = () => {
      if (preference.matches) {
        observer.disconnect()
        animations.forEach((animation) => animation.cancel())
        animations.clear()
      }
    }
    preference.addEventListener("change", stopMotion)
    return () => {
      observer.disconnect()
      animations.forEach((animation) => animation.cancel())
      preference.removeEventListener("change", stopMotion)
    }
  }, [])
  const [formError, setFormError] = useState("")
  const [sending, setSending] = useState(false)
  const submitForm = async (
    type: "join" | "newsletter",
    data: Record<string, string>,
  ) => {
    setSending(true)
    setFormError("")
    try {
      const response = await fetch(`${serverUrl}/public/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ type, data }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? "Something went wrong.")
      return true
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      )
      return false
    } finally {
      setSending(false)
    }
  }

  const openJoin = () => {
    setSubmitted(false)
    setJoinOpen(true)
    setMenuOpen(false)
  }
  const isPreviewHost =
    typeof window !== "undefined" &&
    window.location.hostname !== "ebclubiiuc.pages.dev"

  return (
    <div
      className={ambientPaused ? "site-shell motion-paused" : "site-shell"}
    >
      <EconomicsBackdrop />
      {isPreviewHost && (
        <div className="topline">
          <span>
            <strong>Owner:</strong> Tasranur Rahaman (Batch 26th · EB253022)
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <a
              className="button primary small"
              href="/downloads/iiuc-eb-club-figma-design.svg"
              download="iiuc-eb-club-figma-design.svg"
            >
              Download Figma Design (.svg)
            </a>
            <a
              className="button secondary small"
              href="/downloads/iiuc-eb-club-design-package.zip"
              download="iiuc-eb-club-design-package.zip"
            >
              Download Design Package (.zip)
            </a>
            <a className="button secondary small" href="/admin">
              Owner Admin Panel
            </a>
          </span>
        </div>
      )}
      <div className="topline">
        <span>A community of curious minds. A future of possibilities.</span>
        <span>
          International Islamic University Chittagong{" "}
          <span className="tiny-arrow">↗</span>
        </span>
      </div>
      <header className="header">
        <a
          href="#"
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
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
        <nav className={menuOpen ? "nav open" : "nav"}>
          {[
            ["Home", "#"],
            ["About us", "#about"],
            ["Activities", "#activities"],
            ["Events", "#events"],
            ["Leadership & Committees", "#executives"],
          ].map(([name, target]) =>
            name === "About us" ? (
              <details
                className="about-dropdown"
                key={name}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.open = false
                    event.currentTarget.querySelector("summary")?.focus()
                  }
                }}
              >
                <summary>
                  About us <Icon name="chevron" className="about-chevron" />
                </summary>
                <div className="about-submenu">
                  {aboutTopics.map((topic) => (
                    <a
                      key={topic.id}
                      href={`#${topic.id}`}
                      onClick={(event) => {
                        const dropdown = event.currentTarget.closest("details")
                        if (dropdown) dropdown.open = false
                        const panel = document.getElementById(topic.id)
                        if (panel instanceof HTMLDetailsElement)
                          panel.open = true
                        setMenuOpen(false)
                      }}
                    >
                      {topic.title}
                      <Icon name="arrow" />
                    </a>
                  ))}
                </div>
              </details>
            ) : name === "Leadership & Committees" ? (
              <details
                className="about-dropdown leadership-dropdown"
                key={name}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.open = false
                    event.currentTarget.querySelector("summary")?.focus()
                  }
                }}
              >
                <summary>
                  Leadership & Committees{" "}
                  <Icon name="chevron" className="about-chevron" />
                </summary>
                <div className="about-submenu">
                  {leadershipTopics.map((topic) => (
                    <a
                      key={topic.to}
                      href={topic.to}
                      onClick={() => setMenuOpen(false)}
                    >
                      {topic.title}
                      <Icon name="arrow" />
                    </a>
                  ))}
                </div>
              </details>
            ) : (
              <a
                key={name}
                className={name === "Home" ? "active" : ""}
                href={target}
                onClick={() => setMenuOpen(false)}
              >
                {name}
              </a>
            ),
          )}
          <a
            className="button secondary small"
            href="/admin"
            onClick={() => setMenuOpen(false)}
          >
            Admin
          </a>
          <button className="button primary small" onClick={openJoin}>
            Join the club <Icon name="arrow" />
          </button>
        </nav>
      </header>

      <main ref={mainRef}>
        <section
          className={ambientPaused ? "hero wrap ambient-paused" : "hero wrap"}
        >
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> WELCOME TO IIUC EB CLUB
            </div>
            <h1>
              {managedContent.heroTitle ?? (
                <>
                  Learn together.
                  <br />
                  Lead with <em>purpose.</em>
                </>
              )}
            </h1>
            <div className="hero-est">
              <span className="hero-est-line" aria-hidden="true" />
              EST. IIUC
              <span className="hero-est-divider" aria-hidden="true">
                ·
              </span>
              DEPARTMENT OF ECONOMICS &amp; BANKING
            </div>
            <p className="hero-description">
              {managedContent.heroDescription ??
                "Welcome to IIUC Economics & Banking Club—a vibrant student community where learning, connection, and leadership help every member move forward."}
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={openJoin}>
                Become a member <Icon name="arrow" />
              </button>
              <a className="button outline" href="#activities">
                Explore our activities <Icon name="arrow" />
              </a>
            </div>
            <ul className="hero-chips" aria-label="Club highlights">
              {heroAchievements.map((item) => (
                <li key={item}>
                  <span className="hero-chip-dot" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="hero-affiliation">
              <img src="/images/iiuc-logo.png" alt="IIUC university crest" />
              <div>
                Rooted in knowledge. Driven by purpose.
                <small>Department of Economics & Banking, IIUC</small>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <img
              className="campus-image"
              src={
                managedContent.campusImage ??
                "https://images.unsplash.com/photo-1638636214032-581196ffd400?auto=format&fit=crop&w=1400&q=85"
              }
              alt="A green university campus with academic buildings, illustrating campus life"
            />
            <div className="image-shade" />
            <div className="hero-club-seal !bg-transparent">
              <img
                src="/images/club-logo.png"
                alt="Economics & Banking Club, IIUC"
              />
              <span>ECONOMICS & BANKING CLUB</span>
            </div>
            <div className="photo-caption">
              <span className="caption-line" /> A place to belong.
              <br />
              <span className="caption-subtitle">A space to become.</span>
            </div>
            <div className="floating-card">
              <span className="floating-icon club-mark">
                <img src="/images/club-logo.png" alt="" />
              </span>
              <div>
                More than a club.
                <small>A community that moves you forward.</small>
              </div>
              <span className="floating-icon club-mark ml-auto">
                <img src="/images/iiuc-logo.png" alt="IIUC university crest" />
              </span>
            </div>
            <div className="vertical-label">
              KNOWLEDGE · CONNECTION · IMPACT
            </div>
          </div>
        </section>

        <section
          className="principles achievement-strip wrap"
          aria-label="The club at a glance"
        >
          <div className="principle-intro">
            Big ideas.
            <br />
            <em>Shared ambitions.</em>
          </div>
          {clubFacts.map((fact) => (
            <div key={fact.label}>
              <span className="strip-value">{fact.value}</span>
              <span>
                <strong>{fact.label}</strong>
                <small>{fact.text}</small>
              </span>
            </div>
          ))}
        </section>

        <section
          id="welcome"
          className="welcome-message wrap section"
          aria-labelledby="welcome-title"
        >
          <div className="welcome-message-heading">
            <div className="eyebrow">A MESSAGE FROM EB CLUB</div>
            <p className="welcome-invocation">
              <span className="welcome-ornament" aria-hidden="true" />
              Bismillahir Rahmanir Rahim
              <span className="welcome-ornament" aria-hidden="true" />
            </p>
            <p className="welcome-greeting">Assalamu Alaikum</p>
            <h2 id="welcome-title">
              Welcome to Economics &amp; Banking Club, <em>IIUC.</em>
            </h2>
          </div>
          <div className="welcome-message-copy">
            <p className="welcome-lead">
              The Economics &amp; Banking Club (EB Club) is the departmental
              club of the Department of Economics and Banking at the
              International Islamic University Chittagong (IIUC). The club
              serves as a platform for students to learn, grow, develop their
              skills, and build meaningful connections beyond the classroom.
            </p>
            <p>
              Our primary goal is to work for the welfare of the students and
              the overall development of the department. We are committed to
              preparing students for their future careers by creating
              opportunities to enhance their academic knowledge, practical
              skills, leadership abilities, and professional experience.
            </p>
            <div
              id="welcome-more"
              className={
                welcomeExpanded ? "welcome-more is-open" : "welcome-more"
              }
              inert={!welcomeExpanded}
            >
              <div>
                <p>
                  A new executive committee is generally formed at the
                  beginning of each year, with each committee serving a
                  one-year term. Throughout the year, EB Club organizes
                  departmental tours, cricket and football tournaments,
                  research and debate workshops, industrial visits, health
                  camps, leadership development programmes, and other
                  academic, cultural, and extracurricular events.
                </p>
                <p>
                  Among the most remarkable initiatives of EB Club are EB Day
                  2020 and EB Winter Fest 2025. Both programmes received
                  significant attention across IIUC and remain memorable
                  milestones in the club&apos;s journey.
                </p>
                <p>
                  Beyond organizing events, EB Club actively supports
                  departmental activities and works closely with students,
                  faculty members, and the department to create a more
                  engaging, supportive, and opportunity-driven academic
                  environment.
                </p>
                <p>
                  As we move forward, our commitment remains the same: to
                  serve our department, empower our students, and build a
                  stronger future for the Economics and Banking community at
                  IIUC.
                </p>
                <p className="welcome-signoff">
                  — Executive Committee, EB Club IIUC
                </p>
              </div>
            </div>
            <button
              type="button"
              className="text-link welcome-toggle"
              aria-expanded={welcomeExpanded}
              aria-controls="welcome-more"
              onClick={() => setWelcomeExpanded((current) => !current)}
            >
              {welcomeExpanded ? "Show less" : "Read full message"}
              <Icon name="chevron" className="welcome-toggle-icon" />
            </button>
          </div>
          <div className="welcome-message-pillars">
            <article>
              <span className="pillar-icon">
                <Icon name="target" />
              </span>
              <div className="eyebrow">OUR MISSION</div>
              <p>
                To empower the students of the Department of Economics and
                Banking at IIUC through academic excellence, professional skill
                development, leadership, research, and collaboration, while
                fostering an inclusive environment in which every member can
                realise their potential and prepare for future challenges.
              </p>
            </article>
            <article>
              <span className="pillar-icon">
                <Icon name="eye" />
              </span>
              <div className="eyebrow">OUR VISION</div>
              <p>
                To establish the EB Club as a leading departmental student
                organization at IIUC, recognized for its dedication to student
                development, innovation, and leadership, and for nurturing
                confident, skilled, responsible, and future-ready graduates.
              </p>
            </article>
            <article className="welcome-commitment">
              <span className="pillar-icon">
                <Icon name="handshake" />
              </span>
              <div className="eyebrow">OUR COMMITMENT</div>
              <p>
                Together, we commit to learning, growing, and building the
                future of Economics and Banking.
              </p>
            </article>
          </div>
        </section>

        <section id="about" className="about wrap section">
          <div>
            <div className="eyebrow">THE CLUB, THE COMMUNITY</div>
            <h2>
              A shared passion.
              <br />
              An extraordinary <em>journey.</em>
            </h2>
          </div>
          <div className="about-copy">
            <p>
              We are the Economics & Banking Club of IIUC — a student community
              united by a curiosity for how economies work and a vision for what
              they can become.
            </p>
            <p>
              From your first campus conversation to your next big idea, this is
              a space to learn, build confidence, and find people who inspire
              you.
            </p>
            <a className="text-link" href="#activities">
              Discover what brings us together <Icon name="arrow" />
            </a>
          </div>
        </section>

        <section className="wrap about-resources" aria-label="About our club">
          <div className="eyebrow">GET TO KNOW US</div>
          <div className="about-panels">
            {aboutTopics
              .filter((topic) => topic.text)
              .map((topic) => (
                <details className="about-panel" id={topic.id} key={topic.id}>
                  <summary>
                    {topic.title}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{topic.text}</p>
                  {topic.id === "our-legacy" && displayedLegacy.length > 0 && (
                    <a className="text-link about-panel-link" href="#legacy">
                      Explore the legacy timeline <Icon name="arrow" />
                    </a>
                  )}
                </details>
              ))}
          </div>
          <div className="about-quicklinks">
            <a className="text-link" href="#activities">
              Club Activities <Icon name="arrow" />
            </a>
            <a className="text-link" href="#executives">
              Organizational Structure <Icon name="arrow" />
            </a>
          </div>
        </section>

        <section id="activities" className="activities-section">
          <div className="wrap section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">BEYOND THE CLASSROOM</div>
                <h2>Find your spark.</h2>
              </div>
              <p>
                Real experiences. New perspectives.
                <br />
                Countless ways to grow.
              </p>
            </div>
            <div className="filters" aria-label="Filter activities">
              {["All activities", ...activityCategories].map((item) => (
                <button
                  key={item}
                  className={filter === item ? "filter selected" : "filter"}
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="activity-grid">
              {activities
                .filter(
                  (item) =>
                    filter === "All activities" || item.category === filter,
                )
                .map((item) => (
                  <article className="activity-card" key={item.id}>
                    <div className="activity-photo">
                      <img
                        src={
                          managedContent.activityImages?.[item.id] || item.image
                        }
                        alt={item.alt}
                        loading="lazy"
                      />
                      <span className="activity-photo-label">
                        <Icon name={item.icon} />
                        {item.category}
                      </span>
                    </div>
                    <div className="card-category">{item.label}</div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <button
                      className="text-link"
                      onClick={() => setSelectedEvent(item.label)}
                    >
                      Explore {item.label.toLowerCase()} <Icon name="arrow" />
                    </button>
                  </article>
                ))}
            </div>
          </div>
        </section>

        {displayedLegacy.length > 0 && (
          <section
            className="wrap section legacy-section"
            id="legacy"
            aria-labelledby="legacy-title"
          >
            <div className="section-heading">
              <div>
                <div className="eyebrow">OUR LEGACY</div>
                <h2 id="legacy-title">
                  Milestones that <em>shaped us.</em>
                </h2>
              </div>
              <p>
                Moments that brought our department together
                <br />
                and inspire every new chapter.
              </p>
            </div>
            <ol className="legacy-timeline">
              {displayedLegacy.map((milestone, index) => {
                const open = openMilestone === index
                const highlights = (milestone.highlights ?? []).filter(
                  (item) => item.trim(),
                )
                return (
                  <li
                    className={open ? "legacy-item is-open" : "legacy-item"}
                    key={index}
                  >
                    <span className="legacy-year">{milestone.year}</span>
                    <span className="legacy-marker" aria-hidden="true" />
                    <article className="legacy-card">
                      <h3>
                        <button
                          type="button"
                          className="legacy-toggle"
                          aria-expanded={open}
                          aria-controls={`legacy-panel-${index}`}
                          onClick={() =>
                            setOpenMilestone(open ? null : index)
                          }
                        >
                          <span>{milestone.title}</span>
                          <span className="legacy-toggle-hint">
                            {open ? "Hide details" : "View highlights"}
                            <Icon name="chevron" />
                          </span>
                        </button>
                      </h3>
                      <div
                        className="legacy-panel"
                        id={`legacy-panel-${index}`}
                        inert={!open}
                      >
                        <div className="legacy-panel-inner">
                          <LegacySlideshow milestone={milestone} active={open && !ambientPaused} />
                          <div className="legacy-details">
                            {milestone.text && <p>{milestone.text}</p>}
                            {highlights.length > 0 && (
                              <>
                                <div className="eyebrow">EVENT HIGHLIGHTS</div>
                                <ul>
                                  {highlights.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
              <li className="legacy-item legacy-next">
                <span className="legacy-year">Next</span>
                <span className="legacy-marker" aria-hidden="true" />
                <article className="legacy-card">
                  <div>
                    <h3>The next chapter is yours to write.</h3>
                    <p>
                      Join the club and help create the moments the next batch
                      will remember.
                    </p>
                    <button className="text-link" onClick={openJoin}>
                      Become part of the story <Icon name="arrow" />
                    </button>
                  </div>
                </article>
              </li>
            </ol>
          </section>
        )}

        <section className="wrap section" id="events">
          <div className="section-heading">
            <div>
              <div className="eyebrow">MAKE ROOM FOR WHAT'S NEXT</div>
              <h2>Good things are coming.</h2>
            </div>
            <span className="pill">On the horizon</span>
          </div>
          {displayedEvents.map((event, index) => {
            const status = event.status ?? "Coming Soon"
            return (
              <Div className="event-row" key={index}>
                <Span className="event-icon">
                  <Icon name={index % 2 === 0 ? "calendar" : "briefcase"} />
                </Span>
                <Div className="event-title">
                  <Small>
                    {event.type.toUpperCase()} ·{" "}
                    {event.date?.trim()
                      ? event.date.toUpperCase()
                      : "DATE TO BE ANNOUNCED"}
                  </Small>
                  <H3>{event.title}</H3>
                  <Div className="event-meta">
                    <Span>
                      <Icon name="pin" /> {event.venue?.trim() || "IIUC campus"}
                    </Span>
                    {event.deadline?.trim() && (
                      <Span>
                        <Icon name="clock" /> Register by {event.deadline}
                      </Span>
                    )}
                  </Div>
                </Div>
                <Span
                  className={`event-status status-${status
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  {status}
                </Span>
                <Button
                  className="round-button"
                  aria-label={`View ${event.title} event`}
                  onClick={() => setSelectedEvent(event.title)}
                >
                  <Icon name="arrow" />
                </Button>
              </Div>
            )
          })}
          {displayedEvents.length === 0 && (
            <P>No upcoming events have been published yet.</P>
          )}
        </section>

        <section
          className="wrap section executives-section"
          id="executives"
          aria-labelledby="executives-title"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE PEOPLE BEHIND THE PURPOSE</div>
              <h2 id="executives-title">
                Leading with <em>community.</em>
              </h2>
            </div>
            <p>
              A shared vision. A dedicated team.
              <br />
              Meet the leadership of our club.
            </p>
          </div>
          <ExecutiveShowcase profiles={team.executives} leaders={team.clubLeadership} paused={ambientPaused} />
        </section>

        <section
          className="join-banner wrap"
          style={{ backgroundColor: "#C26029" }}
        >
          <div>
            <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
            <h2>
              Bring your curiosity.
              <br />
              We'll bring the <em>community.</em>
            </h2>
            <p>
              You don't need to have it all figured out. Just be ready to grow.
            </p>
          </div>
          <button className="button cream" onClick={openJoin}>
            Find your place. Join us. <Icon name="arrow" />
          </button>
        </section>
      </main>
      <footer className="wrap site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#" className="brand">
              <img
                src="/images/club-logo.png"
                alt="Economics and Banking Club"
              />
              <div>
                Economics & Banking Club
                <small>Learn together. Grow together.</small>
              </div>
            </a>
            <p className="footer-made-for">
              Made for the Economics &amp; Banking community at IIUC.
            </p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (await submitForm("newsletter", { email })) setSubscribed(true)
            }}
          >
            <label htmlFor="newsletter">
              {subscribed
                ? "You’re on the list — thank you for your interest."
                : "A little inspiration, straight to your inbox."}
            </label>
            <div className="newsletter">
              <input
                id="newsletter"
                type="email"
                placeholder="Your email address"
                aria-label="Your email address"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSubscribed(false)
                }}
              />
              <button aria-label="Subscribe to club updates" type="submit">
                <Icon name="arrow" />
              </button>
            </div>
            <small className="form-note">
              {formError && !joinOpen
                ? formError
                : "We'll only use your email for club updates."}
            </small>
          </form>
        </div>
        <div className="footer-columns">
          <nav aria-label="Footer quick links">
            <div className="eyebrow">QUICK LINKS</div>
            <ul>
              {[
                ["About us", "#about"],
                ["Activities", "#activities"],
                ["Our legacy", "#legacy"],
                ["Events", "#events"],
                ["Leadership", "#executives"],
              ].map(([label, target]) => (
                <li key={target}>
                  <a href={target}>{label}</a>
                </li>
              ))}
              <li>
                <button type="button" onClick={openJoin}>
                  Join the club
                </button>
              </li>
            </ul>
          </nav>
          <div>
            <div className="eyebrow">CONTACT</div>
            <ul className="footer-contact">
              <li>
                <Icon name="mail" />
                {managedContent.contactEmail ? (
                  <a href={`mailto:${managedContent.contactEmail}`}>
                    {managedContent.contactEmail}
                  </a>
                ) : (
                  <a
                    href="https://www.facebook.com/profile.php?id=61566081578577"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message us on Facebook
                  </a>
                )}
              </li>
              <li>
                <Icon name="pin" />
                <address>
                  Department of Economics &amp; Banking
                  <br />
                  International Islamic University Chittagong
                  <br />
                  Kumira, Chattogram 4318, Bangladesh
                </address>
              </li>
            </ul>
          </div>
          <div className="footer-follow">
            <div className="eyebrow">FOLLOW US</div>
            <div>
              <a
                href="https://www.facebook.com/profile.php?id=61566081578577"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Club Facebook page (opens in a new tab)"
              >
                <Icon name="facebook" />
                Facebook
                <Icon name="arrow" />
              </a>
              <a
                href="https://instagram.com/ebclub_iiuc?xtok=MXNpcDkwbW83ZDVrYg%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Club Instagram profile (opens in a new tab)"
              >
                <Icon name="instagram" />
                Instagram
                <Icon name="arrow" />
              </a>
              {managedContent.linkedinUrl && (
                <a
                  href={managedContent.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Club LinkedIn page (opens in a new tab)"
                >
                  <Icon name="linkedin" />
                  LinkedIn
                  <Icon name="arrow" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Economics & Banking Club, IIUC
          </span>
          <span>Built on knowledge. United by community.</span>
          <a href="#about">About the club ↗</a>
        </div>
        <div className="developer-credit">
          <div>
            Owner &amp; Developed by <strong>Tasranur Rahaman</strong>
          </div>
          <div>
            Batch 26th <span aria-hidden="true">·</span> EB253022
          </div>
        </div>
      </footer>

      {(joinOpen || selectedEvent) && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            // Close only when the dark backdrop itself is clicked, not the form inside it.
            if (event.target !== event.currentTarget) return
            setJoinOpen(false)
            setSelectedEvent(null)
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => {
                setJoinOpen(false)
                setSelectedEvent(null)
              }}
            >
              ×
            </button>
            {selectedEvent ? (
              <>
                <div className="eyebrow">LEARN. CONNECT. LEAD.</div>
                <h2 id="modal-title">{selectedEvent}</h2>
                <p>
                  This is a preview of the experiences our club can offer.
                  Dates, facilitators, and registration details will be
                  announced by the club.
                </p>
                <p>
                  Interested in taking part? Introduce yourself and tell us what
                  you would love to explore.
                </p>
                <button
                  className="button primary"
                  onClick={() => {
                    setSelectedEvent(null)
                    openJoin()
                  }}
                >
                  Express your interest <Icon name="arrow" />
                </button>
              </>
            ) : submitted ? (
              <>
                <div className="eyebrow">YOUR JOURNEY STARTS HERE</div>
                <h2 id="modal-title">You're in good company.</h2>
                <p>
                  Thank you for your interest! Your details have reached the
                  club team, and we'll be in touch about membership soon.
                </p>
                <button
                  className="button primary"
                  onClick={() => setJoinOpen(false)}
                >
                  Back to exploring <Icon name="arrow" />
                </button>
              </>
            ) : (
              <>
                <div className="eyebrow">FIND YOUR PEOPLE</div>
                <h2 id="modal-title">Let’s grow together.</h2>
                <p>
                  Tell us a little about yourself and the club team will get in
                  touch.
                </p>
                <form
                  className="join-form"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const form = new FormData(e.currentTarget)
                    const data = Object.fromEntries(
                      [...form.entries()].map(([key, value]) => [
                        key,
                        String(value),
                      ]),
                    )
                    if (await submitForm("join", data)) setSubmitted(true)
                  }}
                >
                  <label>
                    Your name
                    <input
                      name="name"
                      autoFocus
                      required
                      placeholder="Full name"
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    Student ID
                    <input
                      name="studentId"
                      required
                      placeholder="e.g. EB253022"
                    />
                  </label>
                  <label>
                    Batch
                    <input name="batch" required placeholder="e.g. 26th" />
                  </label>
                  <button
                    className="button primary"
                    type="submit"
                    disabled={sending}
                  >
                    {sending ? (
                      <>
                        <EconomicsLoader variant="inline" /> Sending…
                      </>
                    ) : (
                      <>
                        Express my interest <Icon name="arrow" />
                      </>
                    )}
                  </button>
                  <small>
                    {formError ||
                      "Your details are shared only with the club admins."}
                  </small>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
