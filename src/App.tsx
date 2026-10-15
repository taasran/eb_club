import { useEffect, useRef, useState } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"
import AdminPage from "./AdminPage"
import { serverUrl, publicAnonKey } from "./supabase"
import EconomicsBackdrop from "./EconomicsBackdrop"
import EconomicsLoader from "./EconomicsLoader"

const committee = [
  ["President", "Guiding the club’s vision and bringing our community together."],
  ["Vice President", "Supporting the team and turning shared ideas into action."],
  ["General Secretary", "Keeping our activities, communication, and plans connected."],
  ["Treasurer", "Supporting responsible planning and club resource management."],
  ["Joint Secretary", "Helping coordinate initiatives and everyday club operations."],
  ["Organizing Secretary", "Creating meaningful events and experiences for our members."],
  ...Array.from({ length: 24 }, (_, index) => [
    `Executive slot ${String(index + 7).padStart(2, "0")}`,
    "Role and profile details to be announced.",
  ]),
]

const createArchiveProfiles = (designations: string[]) => designations.map((designation, index) => ({
  name: "Name to be announced",
  designation,
  session: "Session to be announced",
  index: index + 1,
}))

const archivePages = [
  { slug: "former-presidents", title: "Former Presidents", description: "A record of the club presidents whose leadership helped shape our community.", profiles: createArchiveProfiles(["Former President", "Former President", "Former President", "Former President", "Former President"]) },
  { slug: "former-general-secretaries", title: "Former General Secretaries", description: "A record of the general secretaries who kept the club’s work and communication moving forward.", profiles: createArchiveProfiles(["Former General Secretary", "Former General Secretary", "Former General Secretary", "Former General Secretary", "Former General Secretary"]) },
  { slug: "previous-executive-committees", title: "Previous Executive Committees", description: "A year-by-year archive of the executive teams who served the club.", profiles: createArchiveProfiles(["President", "Vice President", "General Secretary", "Treasurer", "Executive Member"]) },
  { slug: "faculty-advisors", title: "Faculty Advisors", description: "The faculty members whose guidance supports the club’s direction and growth.", profiles: createArchiveProfiles(["Faculty Advisor", "Faculty Advisor", "Faculty Advisor", "Faculty Advisor", "Faculty Advisor"]) },
  { slug: "committee-wise-archive", title: "Committee-wise Archive", description: "Explore the club’s leadership history by committee and academic term.", profiles: createArchiveProfiles(["Committee Chair", "Committee Secretary", "Finance Coordinator", "Organizing Coordinator", "Committee Member"]) },
]

const leadershipTopics = [
  { title: "Current Executive Committee", to: "/#executives" },
  ...archivePages.map(page => ({ title: page.title, to: `/leadership/${page.slug}` })),
]

const defaultArchiveYears = ["2024–25", "2023–24", "2022–23", "2021–22", "2020–21"].map(year => ({
  year,
  members: ["President", "Vice President", "General Secretary", "Treasurer", "Organizing Secretary"].map(designation => ({
    designation,
    name: "Name to be announced",
    id: "ID to be announced",
    batch: "Batch to be announced",
  })),
}))

type ManagedExecutive = { name?: string; designation?: string; studentId?: string; batch?: string; image?: string }

function ExecutiveCard({ role, description, index, person }: { role: string; description: string; index: number; person?: ManagedExecutive }) {
  const name = person?.name?.trim() && person.name !== "Name to be announced" ? person.name : "Name to be announced"
  const details = [person?.studentId && `ID: ${person.studentId}`, person?.batch && `Batch: ${person.batch}`].filter(Boolean).join(" · ")
  return <article className={index < 4 ? "executive-card leadership-card" : "executive-card"} aria-label={`${role}, profile ${index + 1} of 30`}>
    <div className="executive-portrait" aria-hidden="true">
      {person?.image ? <img src={person.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} /> : <span className="executive-profile"><Icon name="people" /></span>}
      <span className="executive-index">{String(index + 1).padStart(2, "0")}</span>
      {!person?.image && <span className="executive-portrait-label">PORTRAIT TO COME</span>}
    </div>
    <div className="executive-info">
      <div className="eyebrow">{role}</div>
      <h3>{name}</h3>
      <p>{details || description}</p>
    </div>
  </article>
}

const aboutTopics = [
  { title: "Club History & Background", id: "club-history", text: "The Economics & Banking Club brings together students of the Department of Economics & Banking at IIUC. The official founding date, history, and milestones will be added once confirmed by the club." },
  { title: "Vision, Mission & Objectives", id: "club-vision", text: "Our website highlights learning beyond the classroom, connecting students, and developing leadership. The club’s officially approved vision, mission, and objectives will be published here once provided." },
  { title: "Club Constitution", id: "club-constitution", text: "The official club constitution is not yet available on this website. The approved document will be added here when provided by the club administration." },
  { title: "Rules & Regulations", id: "club-rules", text: "Official membership requirements, participation guidelines, and club rules will be published after confirmation by the club administration." },
  { title: "Club Activities", id: "activities" },
  { title: "Organizational Structure", id: "executives" },
  { title: "Faculty Advisor & Club Administration", id: "club-administration", text: "Faculty advisor names, administrative responsibilities, and official contact details will be added once confirmed by the Department of Economics & Banking." },
]

const activities = [
  {
    category: "Learning",
    title: "Ideas that go beyond the classroom.",
    text: "Explore economic issues, financial markets, and the world of banking through seminars and thoughtful conversations.",
    icon: "chart",
    label: "Seminars & discussions",
  },
  {
    category: "Growth",
    title: "Build skills. Find your direction.",
    text: "Connect theory with practice through skill-building workshops, case studies, and career-focused learning.",
    icon: "briefcase",
    label: "Workshops & career development",
  },
  {
    category: "Community",
    title: "Better together, by design.",
    text: "Meet like-minded students, exchange perspectives, and create meaningful experiences with your campus community.",
    icon: "people",
    label: "Networking & club life",
  },
]

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "facebook" ? (
        <path
          fill="currentColor"
          stroke="none"
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.02 10.125 11.927v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"
        />
      ) : name === "instagram" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
        </>
      ) : name === "chevron" ? (
        <path d="m6 9 6 6 6-6" />
      ) : name === "arrow" ? (
        <>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </>
      ) : name === "chart" ? (
        <>
          <path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4" />
        </>
      ) : name === "briefcase" ? (
        <>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V4h8v3M3 12a26 26 0 0 0 18 0M10 12v3h4v-3" />
        </>
      ) : name === "people" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5" />
        </>
      ) : (
        <>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4m8-4v4M4 11h16" />
        </>
      )}
    </svg>
  )
}

function NotFoundPage() {
  return (
    <main className="admin-page">
      <section className="admin-login">
        <div className="eyebrow">PAGE NOT FOUND</div>
        <h1>That page is unavailable.</h1>
        <p>Use the website home page or open the club admin dashboard.</p>
        <div className="hero-actions">
          <a className="button primary" href="/">Go to home</a>
          <a className="button secondary" href="/admin">Open admin</a>
        </div>
      </section>
    </main>
  )
}

const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/admin", Component: AdminPage },
  ...archivePages.map(page => ({
    path: `/leadership/${page.slug}`,
    Component: () => <ArchivePage page={page} />,
  })),
  { path: "*", Component: NotFoundPage },
])

// Counts one page view per load, and one unique visitor per browser per day.
let visitTracked = false
function trackVisit() {
  if (visitTracked) return
  visitTracked = true
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return
  const today = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10)
  let newVisitor = false
  try {
    newVisitor = localStorage.getItem("eb-last-visit") !== today
    localStorage.setItem("eb-last-visit", today)
  } catch { /* storage unavailable */ }
  fetch(`${serverUrl}/public/visit`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` }, body: JSON.stringify({ newVisitor, path: window.location.pathname }) }).catch(() => undefined)
}

export default function App() {
  useEffect(() => { trackVisit() }, [])
  return <RouterProvider router={router} />
}

type ManagedLeadership = {
  leadership?: Record<string, { name: string; designation: string; session: string; image?: string }[]>
  archiveYears?: { year: string; members: { name: string; designation: string; studentId: string; batch: string }[] }[]
}

function useLeadershipContent() {
  const [content, setContent] = useState<ManagedLeadership>({})
  useEffect(() => {
    fetch(`${serverUrl}/public/content`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(response => response.json())
      .then(({ content }) => setContent(content ?? {}))
      .catch(() => undefined)
  }, [])
  return content
}

function CommitteeWiseArchive({ managedYears }: { managedYears?: ManagedLeadership["archiveYears"] }) {
  const committeeArchiveYears = managedYears?.length
    ? managedYears.map(item => ({ year: item.year, members: item.members.map(member => ({ ...member, id: member.studentId || "ID to be announced", batch: member.batch || "Batch to be announced" })) }))
    : defaultArchiveYears
  const [chosenYear, setSelectedYear] = useState<string | null>(null)
  const selectedYear = chosenYear ?? committeeArchiveYears[0]?.year
  const committee = committeeArchiveYears.find(item => item.year === selectedYear) ?? committeeArchiveYears[0]

  return (
    <section className="committee-archive" aria-labelledby="committee-archive-title">
      <div className="eyebrow">YEAR-WISE EXECUTIVE COMMITTEE</div>
      <h2 id="committee-archive-title">Choose a session.</h2>
      <p>Select a year to view that session’s executive committee, including each member’s name, ID, batch, and designation.</p>
      <div className="committee-year-list" role="tablist" aria-label="Committee sessions">
        {committeeArchiveYears.map(item => (
          <button className={item.year === selectedYear ? "committee-year selected" : "committee-year"} key={item.year} onClick={() => setSelectedYear(item.year)} role="tab" aria-selected={item.year === selectedYear}>
            {item.year}
          </button>
        ))}
      </div>
      <div className="committee-member-list" role="tabpanel" aria-label={`${committee.year} executive committee`}>
        <div className="committee-member-heading"><span>Name</span><span>Student ID</span><span>Batch</span><span>Designation</span></div>
        {committee.members.map(member => (
          <div className="committee-member-row" key={`${committee.year}-${member.designation}-${member.name}`}>
            <strong>{member.name}</strong>
            <span>{member.id}</span>
            <span>{member.batch}</span>
            <span>{member.designation}</span>
          </div>
        ))}
      </div>
      <small className="archive-note">Add more members to a year’s record as official committee information becomes available.</small>
    </section>
  )
}

function ArchivePage({ page }: { page: (typeof archivePages)[number] }) {
  const managed = useLeadershipContent()
  const savedProfiles = managed.leadership?.[page.slug]
  const profiles = savedProfiles?.length ? savedProfiles.map((profile, index) => ({ ...profile, index: index + 1 })) : page.profiles.map(profile => ({ ...profile, image: "" }))
  return (
    <div className="site-shell">
      <EconomicsBackdrop />
      <div className="topline">
        <span>A community of curious minds. A future of possibilities.</span>
        <span>International Islamic University Chittagong <span className="tiny-arrow">↗</span></span>
      </div>
      <header className="header">
        <a href="/" className="brand" aria-label="Economics and Banking Club home">
          <img src="/images/club-logo.png" alt="IIUC Economics and Banking Club logo" />
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
            <summary>Leadership & Committees <Icon name="chevron" className="about-chevron" /></summary>
            <div className="about-submenu">
              {leadershipTopics.map(topic => (
                <a key={topic.to} href={topic.to}>
                  {topic.title}<Icon name="arrow" />
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
        <div className="archive-directory" aria-label="Leadership and committee archive">
          {archivePages.map(item => (
            <a className={item.slug === page.slug ? "archive-link current" : "archive-link"} href={`/leadership/${item.slug}`} key={item.slug}>
              <span>{item.title}</span><Icon name="arrow" />
            </a>
          ))}
        </div>
        {page.slug === "committee-wise-archive" ? <CommitteeWiseArchive managedYears={managed.archiveYears} /> : <section className="archive-records" aria-labelledby="archive-records-title">
          <div className="eyebrow">PROFILE DIRECTORY</div>
          <h2 id="archive-records-title">{page.title} at a glance.</h2>
          <p>Each listing includes a portrait, designation, name, and session. Replace the placeholders with verified club records when available.</p>
          <div className="archive-profile-grid">
            {profiles.map(profile => (
              <article className="archive-profile-card" key={`${profile.designation}-${profile.index}`}>
                <div className="archive-profile-portrait" aria-hidden="true">
                  {profile.image ? <img src={profile.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} /> : <><span><Icon name="people" /></span><small>PHOTO TO COME</small></>}
                </div>
                <div className="archive-profile-info">
                  <div className="eyebrow">{profile.designation}</div>
                  <h3>{profile.name}</h3>
                  <p>{profile.session}</p>
                </div>
              </article>
            ))}
          </div>
          <a className="button secondary" href="/#executives">View current executive committee <Icon name="arrow" /></a>
        </section>}
      </main>
    </div>
  )
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [filter, setFilter] = useState("All activities")
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [ambientPaused, setAmbientPaused] = useState(false)
  const [managedContent, setManagedContent] = useState<{ heroTitle?: string; heroDescription?: string; campusImage?: string; events?: { title: string; type: string }[]; executives?: ManagedExecutive[] }>({})
  const committeeRef = useRef<HTMLDivElement>(null)
  const [autoSlide, setAutoSlide] = useState(true)
  const [sliderHovered, setSliderHovered] = useState(false)
  const [sliderFocused, setSliderFocused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [committeePosition, setCommitteePosition] = useState({ first: 0, atEnd: false })
  const sliderRunning = autoSlide && !sliderHovered && !sliderFocused && !reducedMotion
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])
  useEffect(() => {
    fetch(`${serverUrl}/public/content`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(response => response.json())
      .then(({ content }) => setManagedContent(content ?? {}))
      .catch(() => undefined)
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
      const step = card.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0)
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 3
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: "smooth" })
    }, 4000)
    return () => window.clearInterval(timer)
  }, [sliderRunning])
  const moveCommittee = (direction: number) => {
    setAutoSlide(false)
    const track = committeeRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
  }
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (preference.matches || !("IntersectionObserver" in window)) return
    const animations = new Set<Animation>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        observer.unobserve(entry.target)
        if (preference.matches) return
        const animation = entry.target.animate(
          [{ opacity: 0, translate: "0 20px" }, { opacity: 1, translate: "0 0" }],
          { duration: 600, easing: "cubic-bezier(.2,.7,.3,1)" },
        )
        animations.add(animation)
        animation.onfinish = () => animations.delete(animation)
      })
    }, { threshold: 0.08 })
    mainRef.current?.querySelectorAll(".about, .about-resources, .section-heading, .activity-card, .executive-card, .event-row, .join-banner").forEach(element => observer.observe(element))
    const stopMotion = () => {
      if (preference.matches) {
        observer.disconnect()
        animations.forEach(animation => animation.cancel())
        animations.clear()
      }
    }
    preference.addEventListener("change", stopMotion)
    return () => {
      observer.disconnect()
      animations.forEach(animation => animation.cancel())
      preference.removeEventListener("change", stopMotion)
    }
  }, [])
  const [formError, setFormError] = useState("")
  const [sending, setSending] = useState(false)
  const submitForm = async (type: "join" | "newsletter", data: Record<string, string>) => {
    setSending(true)
    setFormError("")
    try {
      const response = await fetch(`${serverUrl}/public/submit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` }, body: JSON.stringify({ type, data }) })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? "Something went wrong.")
      return true
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
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

  return (
    <div className={ambientPaused ? "site-shell motion-paused [zoom:1.06]" : "site-shell [zoom:1.06]"}>
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
          ].map(([name, target]) => (
            name === "About us" ? (
              <details className="about-dropdown" key={name} onKeyDown={event => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false
                  event.currentTarget.querySelector("summary")?.focus()
                }
              }}>
                <summary>About us <Icon name="chevron" className="about-chevron" /></summary>
                <div className="about-submenu">
                  {aboutTopics.map(topic => (
                    <a key={topic.id} href={`#${topic.id}`} onClick={event => {
                      const dropdown = event.currentTarget.closest("details")
                      if (dropdown) dropdown.open = false
                      const panel = document.getElementById(topic.id)
                      if (panel instanceof HTMLDetailsElement) panel.open = true
                      setMenuOpen(false)
                    }}>{topic.title}<Icon name="arrow" /></a>
                  ))}
                </div>
              </details>
            ) : name === "Leadership & Committees" ? (
              <details className="about-dropdown leadership-dropdown" key={name} onKeyDown={event => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false
                  event.currentTarget.querySelector("summary")?.focus()
                }
              }}>
                <summary>Leadership & Committees <Icon name="chevron" className="about-chevron" /></summary>
                <div className="about-submenu">
                  {leadershipTopics.map(topic => (
                    <a key={topic.to} href={topic.to} onClick={() => setMenuOpen(false)}>
                      {topic.title}<Icon name="arrow" />
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
            )
          ))}
          <a className="button secondary small" href="/admin" onClick={() => setMenuOpen(false)}>
            Admin
          </a>
          <button className="button primary small" onClick={openJoin}>
            Join the club <Icon name="arrow" />
          </button>
        </nav>
      </header>

      <main ref={mainRef}>
        <section className={ambientPaused ? "hero wrap ambient-paused" : "hero wrap"}>
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> LEARN. CONNECT. LEAD.
            </div>
            <h1>{managedContent.heroTitle ?? <>Where curious minds<br />meet <em>possibility.</em></>}</h1>
            <p className="hero-description">
              {managedContent.heroDescription ?? "A home for the thinkers, changemakers, and future leaders of economics and banking. Together, we learn beyond the classroom and grow beyond expectations."}
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
              src={managedContent.campusImage ?? "https://images.unsplash.com/photo-1638636214032-581196ffd400?auto=format&fit=crop&w=1400&q=85"}
              alt="A green university campus with academic buildings, illustrating campus life"
            />
            <div className="image-shade" />
            <div className="hero-club-seal !bg-transparent">
              <img src="/images/club-logo.png" alt="Economics & Banking Club, IIUC" />
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
            {aboutTopics.filter(topic => topic.text).map(topic => (
              <details className="about-panel" id={topic.id} key={topic.id}>
                <summary>{topic.title}<span aria-hidden="true">+</span></summary>
                <p>{topic.text}</p>
              </details>
            ))}
          </div>
          <div className="about-quicklinks">
            <a className="text-link" href="#activities">Club Activities <Icon name="arrow" /></a>
            <a className="text-link" href="#executives">Organizational Structure <Icon name="arrow" /></a>
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
          <div className="event-row">
            <span className="event-icon">
              <Icon name="calendar" />
            </span>
            <div className="event-title">
              <small>{managedContent.events?.[0]?.type?.toUpperCase() ?? "PROPOSED SEMINAR"} · DATE TO BE ANNOUNCED</small>
              <h3>{managedContent.events?.[0]?.title ?? "Economics in a changing world"}</h3>
            </div>
            <span className="event-location">IIUC campus</span>
            <button
              className="round-button"
              aria-label="View Economics in a changing world event"
              onClick={() => setSelectedEvent("Economics in a changing world")}
            >
              <Icon name="arrow" />
            </button>
          </div>
          <div className="event-row">
            <span className="event-icon">
              <Icon name="briefcase" />
            </span>
            <div className="event-title">
              <small>{managedContent.events?.[1]?.type?.toUpperCase() ?? "PROPOSED WORKSHOP"} · DATE TO BE ANNOUNCED</small>
              <h3>{managedContent.events?.[1]?.title ?? "Your first step into banking"}</h3>
            </div>
            <span className="event-location">IIUC campus</span>
            <button
              className="round-button"
              aria-label="View Your first step into banking event"
              onClick={() => setSelectedEvent("Your first step into banking")}
            >
              <Icon name="arrow" />
            </button>
          </div>
        </section>

        <section className="wrap section executives-section" id="executives" aria-labelledby="executives-title">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE PEOPLE BEHIND THE PURPOSE</div>
              <h2 id="executives-title">Leading with <em>community.</em></h2>
            </div>
            <p>A shared vision. A dedicated team.<br />Meet the leadership of our club.</p>
          </div>
          <div className="eyebrow leadership-heading">CLUB LEADERSHIP</div>
          <div className="compact-leadership">
            {committee.slice(0, 4).map(([role, description], index) => <ExecutiveCard key={role} role={managedContent.executives?.[index]?.designation || role} description={description} index={index} person={managedContent.executives?.[index]} />)}
          </div>
          <div className={sliderRunning ? "committee-carousel is-running" : "committee-carousel"} onMouseEnter={() => setSliderHovered(true)} onMouseLeave={() => setSliderHovered(false)} onFocusCapture={() => setSliderFocused(true)} onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setSliderFocused(false)
          }}>
          <div className="committee-toolbar">
            <div><div className="eyebrow">EXECUTIVE TEAM <span className="slider-status-dot" aria-hidden="true" /></div><p>26 profiles · Automatic showcase · Swipe to explore</p></div>
            <div className="committee-controls">
              <span aria-live={sliderRunning ? "off" : "polite"}>Profile {committeePosition.first + 5} / 30</span>
              <button className="round-button previous-slide" aria-label="Previous executive profiles" aria-controls="committee-slider" disabled={committeePosition.first === 0} onClick={() => moveCommittee(-1)}><Icon name="arrow" /></button>
              <button className="round-button" aria-label="Next executive profiles" aria-controls="committee-slider" disabled={committeePosition.atEnd} onClick={() => moveCommittee(1)}><Icon name="arrow" /></button>
            </div>
          </div>
          <div className="committee-slider" id="committee-slider" ref={committeeRef} role="region" aria-label="Executive team profiles" aria-roledescription="carousel" tabIndex={0} onTouchStart={() => setAutoSlide(false)} onKeyDown={event => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault()
              moveCommittee(event.key === "ArrowRight" ? 1 : -1)
            }
          }} onScroll={event => {
            const track = event.currentTarget
            const card = track.firstElementChild as HTMLElement | null
            if (!card) return
            const gap = parseFloat(getComputedStyle(track).columnGap) || 0
            setCommitteePosition({ first: Math.min(25, Math.round(track.scrollLeft / (card.offsetWidth + gap))), atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 3 })
          }}>
            {committee.slice(4).map(([role, description], index) => <ExecutiveCard key={role} role={managedContent.executives?.[index + 4]?.designation || role} description={description} index={index + 4} person={managedContent.executives?.[index + 4]} />)}
          </div>
          </div>
        </section>

        <section className="join-banner wrap" style={{ backgroundColor: "#C26029" }}>
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
              {formError && !joinOpen ? formError : "We'll only use your email for club updates."}
            </small>
          </form>
        </div>
        <div className="footer-socials">
          <span>Stay connected with our community</span>
          <div>
            <a href="https://www.facebook.com/profile.php?id=61566081578577" target="_blank" rel="noopener noreferrer" aria-label="Club Facebook page (opens in a new tab)"><Icon name="facebook" />Facebook<Icon name="arrow" /></a>
            <a href="https://instagram.com/ebclub_iiuc?xtok=MXNpcDkwbW83ZDVrYg%3D%3D" target="_blank" rel="noopener noreferrer" aria-label="Club Instagram profile (opens in a new tab)"><Icon name="instagram" />Instagram<Icon name="arrow" /></a>
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
          <div>Developed by <strong>Tasranur Rahaman</strong></div>
          <div>Batch 26th <span aria-hidden="true">·</span> EB253022</div>
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
                  Tell us a little about yourself and the club team will
                  get in touch.
                </p>
                <form
                  className="join-form"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const form = new FormData(e.currentTarget)
                    const data = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]))
                    if (await submitForm("join", data)) setSubmitted(true)
                  }}
                >
                  <label>
                    Your name
                    <input name="name" autoFocus required placeholder="Full name" />
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
                    <input name="studentId" required placeholder="e.g. EB253022" />
                  </label>
                  <label>
                    Batch
                    <input name="batch" required placeholder="e.g. 26th" />
                  </label>
                  <button className="button primary" type="submit" disabled={sending}>
                    {sending ? <><EconomicsLoader variant="inline" /> Sending…</> : <>Express my interest <Icon name="arrow" /></>}
                  </button>
                  <small>
                    {formError || "Your details are shared only with the club admins."}
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
