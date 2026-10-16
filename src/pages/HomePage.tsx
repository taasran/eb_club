import { useEffect, useRef, useState } from "react"
import { serverUrl, publicAnonKey } from "../supabase"
import EconomicsBackdrop from "../EconomicsBackdrop"
import EconomicsLoader from "../EconomicsLoader"
import useSiteContent from "../useSiteContent"
import AdminControls from "../AdminControls"
import Icon from "../components/Icon"
import ExecutiveCard, {
  type ManagedExecutive,
} from "../components/ExecutiveCard"
import {
  committee,
  aboutTopics,
  activities,
  leadershipTopics,
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
  const managedContent = useSiteContent()
  const displayedExecutives: ManagedExecutive[] =
    managedContent.executives ??
    committee.map(([designation]) => ({ designation }))
  const displayedEvents = managedContent.events ?? [
    { title: "Economics in a changing world", type: "Proposed seminar" },
    { title: "Your first step into banking", type: "Proposed workshop" },
  ]
  const renderExecutive = (person: ManagedExecutive, index: number) => (
    <ExecutiveCard
      key={index}
      role={person.designation ?? "Executive Member"}
      description={
        committee.find(([role]) => role === person.designation)?.[1] ??
        "Economics & Banking Club executive team."
      }
      index={index}
      person={person}
      total={displayedExecutives.length}
    />
  )
  const committeeRef = useRef<HTMLDivElement>(null)
  const [autoSlide, setAutoSlide] = useState(true)
  const [sliderHovered, setSliderHovered] = useState(false)
  const [sliderFocused, setSliderFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [committeePosition, setCommitteePosition] = useState({
    first: 0,
    atEnd: false,
  })
  const sliderRunning =
    autoSlide && !sliderHovered && !sliderFocused && !reducedMotion
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])
  useEffect(() => {
    if (!sliderRunning) return
    const timer = window.setInterval(() => {
      const track = committeeRef.current
      if (!track || document.hidden) return
      const bounds = track.getBoundingClientRect()
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return
      const card = track.firstElementChild as HTMLElement | null
      if (!card) return
      const step =
        card.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0)
      const atEnd =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 3
      track.scrollTo({
        left: atEnd ? 0 : track.scrollLeft + step,
        behavior: "smooth",
      })
    }, 4000)
    return () => window.clearInterval(timer)
  }, [sliderRunning])
  const moveCommittee = (direction: number) => {
    setAutoSlide(false)
    const track = committeeRef.current
    if (!track) return
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    })
  }
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
        ".about, .about-resources, .section-heading, .activity-card, .executive-card, .event-row, .join-banner",
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
    window.location.hostname !== "ebclubiiuc.netlify.app"

  return (
    <div
      className={
        ambientPaused
          ? "site-shell motion-paused [zoom:1.06]"
          : "site-shell [zoom:1.06]"
      }
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
            <a
              className="button primary small"
              href="/downloads/eb-club-source.zip"
              download="iiuc-eb-club-full-website.zip"
            >
              Download Full Website (.zip)
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
              <span className="dot" /> LEARN. CONNECT. LEAD.
            </div>
            <h1>
              {managedContent.heroTitle ?? (
                <>
                  Where curious minds
                  <br />
                  meet <em>possibility.</em>
                </>
              )}
            </h1>
            <p className="hero-description">
              {managedContent.heroDescription ??
                "A home for the thinkers, changemakers, and future leaders of economics and banking. Together, we learn beyond the classroom and grow beyond expectations."}
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={openJoin}>
                Become a member <Icon name="arrow" />
              </button>
              <a className="button secondary" href="#activities">
                Explore our activities <Icon name="arrow" />
              </a>
            </div>
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
              <span className="floating-star">✳</span>
            </div>
            <div className="vertical-label">
              KNOWLEDGE · CONNECTION · IMPACT
            </div>
          </div>
        </section>

        <section className="principles wrap" aria-label="Our values">
          <div className="principle-intro">
            Big ideas.
            <br />
            <em>Shared ambitions.</em>
          </div>
          <div>
            <span className="number">01</span>
            <span>
              <strong>Learn with purpose</strong>
              <small>Turn curiosity into understanding.</small>
            </span>
          </div>
          <div>
            <span className="number">02</span>
            <span>
              <strong>Connect with people</strong>
              <small>Find your circle. Broaden your world.</small>
            </span>
          </div>
          <div>
            <span className="number">03</span>
            <span>
              <strong>Lead with impact</strong>
              <small>Make a difference that matters.</small>
            </span>
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
              {["All activities", "Learning", "Growth", "Community"].map(
                (item) => (
                  <button
                    key={item}
                    className={filter === item ? "filter selected" : "filter"}
                    aria-pressed={filter === item}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <div className="activity-grid">
              {activities
                .filter(
                  (item) =>
                    filter === "All activities" || item.category === filter,
                )
                .map((item, i) => (
                  <article className="activity-card" key={item.category}>
                    <div className="card-top">
                      <span className="activity-icon">
                        <Icon name={item.icon} />
                      </span>
                      <span className="card-number">
                        0{activities.indexOf(item) + 1}
                      </span>
                    </div>
                    <div className="card-category">{item.label}</div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <button
                      className="text-link"
                      onClick={() => setSelectedEvent(item.label)}
                    >
                      Explore {item.category.toLowerCase()}{" "}
                      <Icon name="arrow" />
                    </button>
                  </article>
                ))}
            </div>
          </div>
        </section>

        <section className="wrap section" id="events">
          <div className="section-heading">
            <div>
              <div className="eyebrow">MAKE ROOM FOR WHAT'S NEXT</div>
              <h2>Good things are coming.</h2>
            </div>
            <span className="pill">On the horizon</span>
          </div>
          {displayedEvents.map((event, index) => (
            <Div className="event-row" key={index}>
              <Span className="event-icon">
                <Icon name={index % 2 === 0 ? "calendar" : "briefcase"} />
              </Span>
              <Div className="event-title">
                <Small>{event.type.toUpperCase()} · DATE TO BE ANNOUNCED</Small>
                <H3>{event.title}</H3>
              </Div>
              <Span className="event-location">IIUC campus</Span>
              <Button
                className="round-button"
                aria-label={`View ${event.title} event`}
                onClick={() => setSelectedEvent(event.title)}
              >
                <Icon name="arrow" />
              </Button>
            </Div>
          ))}
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
          <div className="eyebrow leadership-heading">CLUB LEADERSHIP</div>
          <div className="compact-leadership">
            {displayedExecutives.slice(0, 4).map(renderExecutive)}
          </div>
          {displayedExecutives.length > 4 && (
            <Div
              className={
                sliderRunning
                  ? "committee-carousel is-running"
                  : "committee-carousel"
              }
              onMouseEnter={() => setSliderHovered(true)}
              onMouseLeave={() => setSliderHovered(false)}
              onFocusCapture={() => setSliderFocused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setSliderFocused(false)
              }}
            >
              <div className="committee-toolbar">
                <Div>
                  <Div className="eyebrow">
                    EXECUTIVE TEAM{" "}
                    <Span className="slider-status-dot" aria-hidden="true" />
                  </Div>
                  <P>
                    {displayedExecutives.length - 4} profiles · Automatic
                    showcase · Swipe to explore
                  </P>
                </Div>
                <div className="committee-controls">
                  <Span aria-live={sliderRunning ? "off" : "polite"}>
                    Profile{" "}
                    {Math.min(
                      committeePosition.first + 5,
                      displayedExecutives.length,
                    )}{" "}
                    / {displayedExecutives.length}
                  </Span>
                  <button
                    className="round-button previous-slide"
                    aria-label="Previous executive profiles"
                    aria-controls="committee-slider"
                    disabled={committeePosition.first === 0}
                    onClick={() => moveCommittee(-1)}
                  >
                    <Icon name="arrow" />
                  </button>
                  <button
                    className="round-button"
                    aria-label="Next executive profiles"
                    aria-controls="committee-slider"
                    disabled={committeePosition.atEnd}
                    onClick={() => moveCommittee(1)}
                  >
                    <Icon name="arrow" />
                  </button>
                </div>
              </div>
              <div
                className="committee-slider"
                id="committee-slider"
                ref={committeeRef}
                role="region"
                aria-label="Executive team profiles"
                aria-roledescription="carousel"
                tabIndex={0}
                onTouchStart={() => setAutoSlide(false)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    event.preventDefault()
                    moveCommittee(event.key === "ArrowRight" ? 1 : -1)
                  }
                }}
                onScroll={(event) => {
                  const track = event.currentTarget
                  const card = track.firstElementChild as HTMLElement | null
                  if (!card) return
                  const gap = parseFloat(getComputedStyle(track).columnGap) || 0
                  setCommitteePosition({
                    first: Math.min(
                      displayedExecutives.length - 5,
                      Math.round(track.scrollLeft / (card.offsetWidth + gap)),
                    ),
                    atEnd:
                      track.scrollLeft + track.clientWidth >=
                      track.scrollWidth - 3,
                  })
                }}
              >
                {displayedExecutives
                  .slice(4)
                  .map((person, index) => renderExecutive(person, index + 4))}
              </div>
            </Div>
          )}
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
      <footer className="wrap">
        <div className="footer-main">
          <a href="#" className="brand">
            <img src="/images/club-logo.png" alt="Economics and Banking Club" />
            <div>
              Economics & Banking Club
              <small>Learn together. Grow together.</small>
            </div>
          </a>
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
        <div className="footer-socials">
          <span>Stay connected with our community</span>
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
