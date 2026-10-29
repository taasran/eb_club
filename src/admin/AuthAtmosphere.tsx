import AdminControls from "../AdminControls"
import Icon from "../components/Icon"

const { Div, Span, Img, Small, Strong } = AdminControls

/** Decorative club artwork: no live analytics or account information. */
export default function AuthAtmosphere() {
  return (
    <Div className="auth-atmosphere" aria-hidden="true">
      <Div className="auth-ambient-glow" />
      <svg className="auth-orbit-map" viewBox="0 0 560 360" fill="none">
        <g className="auth-orbit-grid">
          <path d="M0 90h560M0 180h560M0 270h560M140 0v360M280 0v360M420 0v360" />
          <circle cx="280" cy="180" r="140" />
          <circle cx="280" cy="180" r="104" />
          <path d="M140 180h280M280 40v280" />
        </g>
        <g className="auth-orbit-track">
          <ellipse
            cx="280"
            cy="180"
            rx="220"
            ry="91"
            transform="rotate(-24 280 180)"
          />
          <ellipse
            cx="280"
            cy="180"
            rx="185"
            ry="121"
            transform="rotate(32 280 180)"
          />
        </g>
        <g className="auth-orbit-satellite">
          <circle cx="280" cy="180" r="140" strokeDasharray="2 14" />
          <circle className="auth-orbit-star" cx="280" cy="40" r="5" />
          <circle
            className="auth-orbit-star secondary"
            cx="280"
            cy="320"
            r="4"
          />
        </g>
        <g className="auth-orbit-details">
          <path d="M86 78h12m-6-6v12M451 274h12m-6-6v12M454 80h8m-4-4v8" />
          <circle cx="97" cy="265" r="3" />
          <circle cx="460" cy="123" r="2" />
        </g>
      </svg>
      <Div className="auth-crest">
        <Div className="auth-crest-inner">
          <Img src="/images/club-logo.png" alt="" />
        </Div>
      </Div>
      <Div className="auth-floating-note auth-note-learning">
        <Span className="auth-note-icon">
          <Icon name="chart" />
        </Span>
        <Div>
          <Small>THE NEXT CHAPTER</Small>
          <Strong>Ideas into impact.</Strong>
        </Div>
        <Div className="auth-mini-chart">
          <Span />
          <Span />
          <Span />
          <Span />
          <Span />
        </Div>
      </Div>
      <Div className="auth-floating-note auth-note-community">
        <Span className="auth-note-icon">
          <Icon name="people" />
        </Span>
        <Div>
          <Small>ONE COMMUNITY</Small>
          <Strong>Built to grow, together.</Strong>
        </Div>
        <Span className="auth-note-dot" />
      </Div>
      <Span className="auth-orbit-caption">
        LEARNING · LEADERSHIP · COMMUNITY
      </Span>
    </Div>
  )
}
