import { useState } from "react"
import Controls from "../AdminControls"
import Icon from "./Icon"
import useFacebookFeed from "../useFacebookFeed"
import { facebookPageUrl, type FacebookPost } from "../facebookClient"

const { Section, Div, Span, P, H2, H3, Em, Small, Link, Img, Article } =
  Controls
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
})

function facebookVideoEmbedUrl(postUrl: string): string {
  const embedUrl = new URL("https://www.facebook.com/plugins/video.php")
  embedUrl.searchParams.set("href", postUrl)
  embedUrl.searchParams.set("show_text", "false")
  embedUrl.searchParams.set("width", "500")
  return embedUrl.href
}

function PostCard({ post }: { post: FacebookPost }) {
  const [imageFailed, setImageFailed] = useState(false)
  const date = dateFormat.format(new Date(post.createdAt))
  const isVideo = post.mediaType === "video"
  return (
    <Article className="activity-card">
      <Div className={isVideo ? "activity-photo activity-video" : "activity-photo"}>
        {isVideo ? (
          <iframe
            className="facebook-video"
            src={facebookVideoEmbedUrl(post.url)}
            title={`Facebook video from ${date}`}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            {post.image && !imageFailed ? (
              <Img
                src={post.image}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <Div className="grid h-full place-items-center text-[var(--ivory)]">
                <Icon name="facebook" className="size-10 opacity-40" />
              </Div>
            )}
            <Span className="activity-photo-label">
              <Icon name="facebook" /> From our Facebook Page
            </Span>
          </>
        )}
      </Div>
      <Small className="card-category">
        {date}
      </Small>
      <H3>From our community.</H3>
      <P>
        {post.message ||
          "Another moment from our club. Discover the full story on our Facebook Page."}
      </P>
      <Link
        className="text-link"
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read the Facebook post from ${date} (opens in a new tab)`}
      >
        Read on Facebook <Icon name="arrow" />
      </Link>
    </Article>
  )
}

export default function FacebookUpdates() {
  const { feed, loading, failed } = useFacebookFeed()
  const posts = feed?.posts ?? []
  const stale = failed || feed?.stale
  return (
    <Section
      className="activities-section"
      id="club-updates"
      aria-labelledby="club-updates-title"
    >
      <Div className="wrap section">
        <Div className="section-heading">
          <Div>
            <Div className="eyebrow">
              <Icon name="facebook" /> CONNECTED BY COMMUNITY
            </Div>
            <H2 id="club-updates-title">
              The latest <Em>from our club.</Em>
            </H2>
          </Div>
          <Link
            className="button secondary small"
            href={feed?.pageUrl ?? facebookPageUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit our Facebook Page <Icon name="arrow" />
          </Link>
        </Div>
        <Div role="status" aria-live="polite">
          {loading && (
            <P className="executives-note">
              Loading the latest club updates...
            </P>
          )}
          {!loading && !posts.length && (
            <P className="executives-note">
              {failed
                ? "Facebook updates are temporarily unavailable. You can still catch up on our Facebook Page."
                : "There are no recent posts to show. Stay connected with us on Facebook."}
            </P>
          )}
          {posts.length > 0 && (
            <P className="executives-note">
              {stale
                ? "Showing our last available updates. Visit Facebook for the newest posts."
                : "Stories, highlights and moments, shared directly from our Facebook Page."}
            </P>
          )}
        </Div>
        <Div className="activity-grid" aria-busy={loading}>
          {posts.map((post) => (
            <PostCard key={`${post.id}:${post.image}`} post={post} />
          ))}
        </Div>
        {feed?.updatedAt && (
          <P className="mt-6 text-xs text-[var(--muted)]">
            Last checked: {dateFormat.format(new Date(feed.updatedAt))}. Updates
            refresh automatically while this page is open.
          </P>
        )}
      </Div>
    </Section>
  )
}
