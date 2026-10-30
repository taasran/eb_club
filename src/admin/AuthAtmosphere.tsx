import AdminControls from "../AdminControls"
import Icon from "../components/Icon"

const { Div, Span, Small, Strong } = AdminControls

/** Decorative club artwork: no live analytics or account information. */
export default function AuthAtmosphere() {
  return (
    <Div className="auth-atmosphere" aria-hidden="true">
      <Div className="auth-ambient-glow" />
      <svg className="auth-market-graph" viewBox="0 0 560 360" fill="none">
        <text className="auth-graph-heading" x="70" y="30">
          MARKET EQUILIBRIUM
        </text>
        <g className="auth-graph-grid">
          <path d="M70 78h430M70 120h430M70 162h430M70 204h430M70 246h430M112 56v214M196 56v214M280 56v214M364 56v214M448 56v214" />
        </g>
        <g className="auth-graph-axes">
          <path d="M70 56v214h430M65 63l5-7 5 7M493 265l7 5-7 5" />
        </g>
        <g className="auth-graph-guides">
          <path d="M70 162h210v108" />
        </g>
        <path
          className="auth-market-curve auth-supply-curve"
          pathLength="1"
          d="M90 246 470 78"
        />
        <path
          className="auth-market-curve auth-demand-curve"
          pathLength="1"
          d="M90 78 470 246"
        />
        <g className="auth-graph-labels">
          <text x="24" y="55">
            PRICE
          </text>
          <text x="415" y="302">
            QUANTITY
          </text>
          <text className="auth-supply-label" x="478" y="80">
            S
          </text>
          <text className="auth-demand-label" x="478" y="251">
            D
          </text>
          <text x="40" y="167">
            P*
          </text>
          <text x="273" y="290">
            Q*
          </text>
          <text x="56" y="289">
            0
          </text>
        </g>
        <g className="auth-equilibrium-point">
          <circle cx="280" cy="162" r="12" className="auth-equilibrium-halo" />
          <circle cx="280" cy="162" r="4" />
          <rect x="294" y="126" width="107" height="25" rx="6" />
          <text x="306" y="142">
            EQUILIBRIUM
          </text>
        </g>
      </svg>
      <Div className="auth-floating-note auth-note-learning">
        <Span className="auth-note-icon">
          <Icon name="chart" />
        </Span>
        <Div>
          <Small>ECONOMICS &amp; BANKING</Small>
          <Strong>Understanding markets.</Strong>
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
      <Span className="auth-graph-caption">
        ILLUSTRATIVE ECONOMICS GRAPH · NOT LIVE DATA
      </Span>
    </Div>
  )
}
