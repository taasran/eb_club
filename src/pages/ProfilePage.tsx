import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router"
import AdminControls from "../AdminControls"
import EconomicsBackdrop from "../EconomicsBackdrop"
import Icon from "../components/Icon"
import ThemeToggle from "../components/ThemeToggle"
import { IllustratedAvatar } from "../components/ExecutiveCard"
import {
  findProfile,
  profileDirectory,
  type ProfileEntry,
} from "../profileDirectory"
import { useSiteContentState } from "../useSiteContent"
import roleQuote, { roleSpeech } from "../data/roleQuotes"

const {
  Div,
  Main,
  Section,
  Article,
  H1,
  H2,
  P,
  Span,
  Small,
  Strong,
  Img,
  Link,
  Button,
  Input,
} = AdminControls
const clubFacebook = "https://www.facebook.com/profile.php?id=61566081578577"

export function ProfileContent({
  entry,
  contactEmail,
  previous,
  next,
}: {
  entry: ProfileEntry
  contactEmail?: string
  previous?: ProfileEntry
  next?: ProfileEntry
}) {
  const { person } = entry
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">(
    "idle",
  )
  const [shareUrl, setShareUrl] = useState("")
  const name = person.name?.trim() || "Name to be announced"
  const words = name.split(/\s+/)
  const accentName = words.length > 1 ? words.pop() : ""
  const firstName = words.join(" ")
  const role = person.designation || "Club Member"
  const speech = roleSpeech(role)
  const isCurrent = entry.group === "leadership" || entry.group === "executives"
  const facts = [
    { label: "Student ID", value: person.studentId },
    { label: "Batch", value: person.batch },
    { label: "Session", value: person.session },
  ].filter((fact) => fact.value?.trim())

  const copyLink = async () => {
    const url = window.location.href
    setShareUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState("copied")
    } catch {
      setCopyState("manual")
    }
  }

  return (
    <>
      <Div className="member-page-toolbar">
        <Link className="member-back" href={entry.backHref}>
          <Icon name="arrow" /> {entry.backLabel}
        </Link>
        <Span className="member-directory-label">
          THE PEOPLE BEHIND OUR COMMUNITY
        </Span>
        <Button className="member-share" type="button" onClick={copyLink}>
          <Icon name="copy" />
          {copyState === "copied" ? "Link copied" : "Copy profile link"}
        </Button>
      </Div>
      <Div className="member-copy-feedback" role="status" aria-live="polite">
        {copyState === "copied" && "Profile link copied to clipboard."}
        {copyState === "manual" && (
          <>
            <P>Copy this profile link to share:</P>
            <Input
              aria-label="Profile link"
              value={shareUrl}
              readOnly
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
            />
          </>
        )}
      </Div>
      <Article className="member-poster" aria-labelledby="member-name">
        <Div className="member-poster-masthead">
          <Span>ECONOMICS &amp; BANKING CLUB</Span>
          <Span>IIUC · PEOPLE &amp; PURPOSE</Span>
        </Div>
        <Div className="member-poster-layout">
          <Div className="member-portrait-column">
            <Div className="member-portrait-card">
              <Div className="member-portrait">
                {person.image ? (
                  <Img
                    src={person.image}
                    alt={`Portrait of ${name}`}
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
                  <Div className="member-portrait-placeholder">
                    <IllustratedAvatar />
                    <Small>PORTRAIT TO BE ADDED</Small>
                  </Div>
                )}
              </Div>
              <Span className="member-portrait-caption">ROLE INSPIRATION</Span>
              <P className="member-role-quote">“{roleQuote(role)}”</P>
              <Div className="member-portrait-signature">
                <Span className="member-crest">
                  <Img src="/images/club-logo.png" alt="" />
                </Span>
                <Span>
                  Economics &amp; Banking Club
                  <Small>INTERNATIONAL ISLAMIC UNIVERSITY CHITTAGONG</Small>
                </Span>
              </Div>
            </Div>
            <Div className="member-location">
              <Icon name="pin" />
              <Span>
                Kumira, Chattogram<Small>Bangladesh</Small>
              </Span>
            </Div>
          </Div>
          <Div className="member-introduction">
            <P className="member-kicker">
              <Span /> {entry.label} · Profile
            </P>
            <P className="member-meet">Meet</P>
            <H1 id="member-name">
              {firstName}
              {accentName && <Span>{accentName}</Span>}
            </H1>
            <Div className="member-role">
              <Span />
              {role}
            </Div>
            <P className="member-affiliation">
              Economics &amp; Banking Club
              <Span>International Islamic University Chittagong</Span>
            </P>
            {facts.length > 0 && (
              <Div
                className="member-facts"
                aria-label="Published profile details"
              >
                {facts.map((fact) => (
                  <Div key={fact.label}>
                    <Small>{fact.label}</Small>
                    <Strong>{fact.value}</Strong>
                  </Div>
                ))}
              </Div>
            )}
            <Div className="member-purpose">
              <P className="member-kicker">IN THEIR WORDS</P>
              <P className="member-quote">“{speech}”</P>
              <Small className="member-speech-note">
                Suggested role-based message
              </Small>
            </Div>
            <Div className="member-poster-footer">
              <Icon name={isCurrent ? "people" : "clock"} />
              <Span>
                {isCurrent
                  ? "Part of our club community"
                  : "From our leadership archive"}
              </Span>
            </Div>
          </Div>
        </Div>
      </Article>
      <Section
        className="member-details-section"
        aria-labelledby="member-details-title"
      >
        <Div className="member-section-heading">
          <Div>
            <P className="eyebrow">BEYOND THE PORTRAIT</P>
            <H2 id="member-details-title">A little more about the profile.</H2>
          </Div>
          <P>People. Purpose. Possibilities.</P>
        </Div>
        <Div className="member-detail-grid">
          <Article className="member-detail-card">
            <Span className="member-detail-icon">
              <Icon name="briefcase" />
            </Span>
            <P className="eyebrow">CLUB ROLE</P>
            <H2>{role}</H2>
            <P>{entry.description}</P>
            <Span className="member-detail-tag">{entry.label}</Span>
          </Article>
          <Article className="member-detail-card">
            <Span className="member-detail-icon">
              <Icon name="chart" />
            </Span>
            <P className="eyebrow">CLUB AFFILIATION</P>
            <H2>Rooted in knowledge.</H2>
            <P>
              Department of Economics &amp; Banking
              <br />
              International Islamic University Chittagong
            </P>
            <P className="member-detail-note">
              A community for learning, leadership and meaningful connections.
            </P>
          </Article>
          <Article className="member-detail-card">
            <Span className="member-detail-icon">
              <Icon name="mail" />
            </Span>
            <P className="eyebrow">GET IN TOUCH</P>
            <H2>Start a conversation.</H2>
            <P>
              For club enquiries, collaborations or a message for{" "}
              {name === "Name to be announced" ? "this member" : name}, please
              contact the club team.
            </P>
            <Link
              className="text-link member-contact"
              href={contactEmail ? `mailto:${contactEmail}` : clubFacebook}
              {...(!contactEmail
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {contactEmail ? "Email the club" : "Message the club"}
              <Icon name="arrow" />
            </Link>
            <Small className="member-detail-note">
              Club contact, not a personal contact address.
            </Small>
          </Article>
        </Div>
      </Section>
      <Div className="member-pagination" aria-label="Explore more profiles">
        {previous ? (
          <Link
            href={previous.href}
            className="member-pagination-link member-previous"
          >
            <Icon name="arrow" />
            <Span>
              <Small>PREVIOUS PROFILE</Small>
              {previous.person.name ||
                previous.person.designation ||
                "Club member"}
            </Span>
          </Link>
        ) : (
          <Span />
        )}
        <Link className="member-directory-link" href={entry.backHref}>
          <Icon name="people" />
          <Span>All profiles</Span>
        </Link>
        {next ? (
          <Link href={next.href} className="member-pagination-link member-next">
            <Span>
              <Small>NEXT PROFILE</Small>
              {next.person.name || next.person.designation || "Club member"}
            </Span>
            <Icon name="arrow" />
          </Link>
        ) : (
          <Span />
        )}
      </Div>
    </>
  )
}

export default function ProfilePage() {
  const { group = "", profileKey = "" } = useParams()
  const { content, status } = useSiteContentState()
  const entries = profileDirectory(content)
  const entry = findProfile(entries, group, profileKey)
  const siblings = entries.filter((item) => item.group === entry?.group)
  const index = entry ? siblings.indexOf(entry) : -1
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
    mainRef.current?.focus({ preventScroll: true })
  }, [group, profileKey])

  return (
    <Div className="site-shell member-page">
      <EconomicsBackdrop />
      <Div className="topline">
        <Span>A community of curious minds. A future of possibilities.</Span>
        <Span>International Islamic University Chittagong</Span>
        <ThemeToggle className="theme-toggle-on-brand" />
      </Div>
      <Div className="header member-header" role="banner">
        <Link
          className="brand"
          href="/"
          aria-label="Economics and Banking Club home"
        >
          <Img
            src="/images/club-logo.png"
            alt="IIUC Economics and Banking Club logo"
          />
          <Div>
            Economics &amp; Banking Club
            <Small>INTERNATIONAL ISLAMIC UNIVERSITY CHITTAGONG</Small>
          </Div>
        </Link>
        <Link className="text-link" href="/#executives">
          Meet our team <Icon name="arrow" />
        </Link>
      </Div>
      <Main
        className="wrap member-main"
        ref={mainRef}
        tabIndex={-1}
        aria-busy={status === "loading"}
      >
        {status === "loading" ? (
          <Section className="member-unavailable" role="status">
            <P className="eyebrow">OUR COMMUNITY</P>
            <H1>Opening the profile…</H1>
            <P>Loading the latest published club information.</P>
          </Section>
        ) : entry ? (
          <ProfileContent
            key={`${entry.group}/${entry.key}`}
            entry={entry}
            contactEmail={content.contactEmail}
            previous={siblings[index - 1]}
            next={siblings[index + 1]}
          />
        ) : (
          <Section className="member-unavailable">
            <P className="eyebrow">
              {status === "error"
                ? "CONNECTION UNAVAILABLE"
                : "PROFILE UNAVAILABLE"}
            </P>
            <H1>
              {status === "error"
                ? "We couldn’t load this profile."
                : "This profile is no longer listed."}
            </H1>
            <P>
              {status === "error"
                ? "Please check your connection and try again."
                : "The profile may have been updated or removed from the published directory."}
            </P>
            <Div className="hero-actions">
              {status === "error" && (
                <Button
                  type="button"
                  className="button primary"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </Button>
              )}
              <Link className="button secondary" href="/#executives">
                Back to our team <Icon name="arrow" />
              </Link>
            </Div>
          </Section>
        )}
      </Main>
      <Div className="wrap member-page-footer" role="contentinfo">
        <Span>
          © {new Date().getFullYear()} Economics &amp; Banking Club, IIUC
        </Span>
        <Span>Built on knowledge. United by community.</Span>
      </Div>
    </Div>
  )
}
