import AdminControls from "./AdminControls"

const { Div, Span, Img, P } = AdminControls

type Props = {
  /** A branded loading scene, or a current-color indicator for buttons. */
  variant?: "page" | "inline"
  label?: string
}

export default function EconomicsLoader({
  variant = "page",
  label = "Loading your club experience",
}: Props) {
  if (variant === "inline") {
    return (
      <Span className="eco-loader-inline" role="status" aria-label={label}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="eco-inline-track" cx="12" cy="12" r="10" />
          <circle className="eco-inline-orbit" cx="12" cy="12" r="10" />
          <path className="eco-inline-trend" d="m6 14 4-4 3 3 5-6" />
        </svg>
      </Span>
    )
  }

  return (
    <Div className="eco-loader" role="status" aria-label={label}>
      <Div className="eco-loader-scene" aria-hidden="true">
        <Div className="eco-loader-grid" />
        <Span className="eco-loader-coordinate eco-loader-coordinate-top">
          KNOWLEDGE
        </Span>
        <Span className="eco-loader-coordinate eco-loader-coordinate-bottom">
          IN MOTION
        </Span>
        <svg className="eco-loader-orbits" viewBox="0 0 240 240" fill="none">
          <circle className="eco-loader-orbit-track" cx="120" cy="120" r="103" />
          <circle className="eco-loader-ticks" cx="120" cy="120" r="94" />
          <g className="eco-loader-orbit">
            <circle className="eco-loader-orbit-arc" cx="120" cy="120" r="103" />
            <circle className="eco-loader-orbit-dot" cx="120" cy="17" r="3" />
          </g>
          <g className="eco-loader-orbit eco-loader-orbit-inner">
            <circle className="eco-loader-inner-arc" cx="120" cy="120" r="81" />
            <circle className="eco-loader-inner-dot" cx="120" cy="39" r="2" />
          </g>
          <path className="eco-loader-crosshair" d="M120 4v5m0 222v5M4 120h5m222 0h5" />
        </svg>
        <Div className="eco-loader-emblem">
          <Img
            src="/images/club-logo.png"
            alt=""
            width={88}
            height={88}
            decoding="async"
          />
        </Div>
        <Div className="eco-loader-growth">
          <svg viewBox="0 0 144 40" fill="none">
            <path className="eco-loader-growth-axis" d="M4 35h136M4 20h136M4 5h136" />
            <path
              className="eco-loader-growth-trace"
              pathLength="1"
              d="m4 30 18-6 16 3 18-12 15 5 20-11 14 5 18-12 17 3"
            />
            <circle className="eco-loader-growth-point" cx="140" cy="5" r="3" />
          </svg>
        </Div>
      </Div>
      <Div className="eco-loader-identity" aria-hidden="true">
        <P className="eco-loader-kicker">IIUC · STUDENT COMMUNITY</P>
        <P className="eco-loader-name">
          Economics &amp;
          <br />
          Banking Club<Span className="eco-loader-period">.</Span>
        </P>
      </Div>
      <Div className="eco-loader-status">
        <Span className="eco-loader-status-dot" aria-hidden="true" />
        <Span>{label}</Span>
      </Div>
      <Div className="eco-loader-progress" aria-hidden="true">
        <Span />
      </Div>
    </Div>
  )
}
