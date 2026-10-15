export default function EconomicsBackdrop() {
  return <div className="economics-backdrop" aria-hidden="true">
    <svg viewBox="0 0 1440 960" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <g className="econ-forest" transform="translate(45 130) rotate(-12)">
        <g className="econ-drift">
          <path d="M0 100V0M0 100h125M15 77l25-22 22 10 30-39 25-14" />
          <path className="econ-draw" pathLength="1" d="m15 77 25-22 22 10 30-39 25-14" />
          <path d="M101 12h16v16" /><circle className="econ-accent-dot" cx="40" cy="55" r="3" /><circle className="econ-accent-dot" cx="92" cy="26" r="3" />
        </g>
      </g>
      <g className="econ-gold" transform="translate(1250 90) rotate(10)">
        <g className="econ-drift econ-delay">
          <path d="m0 35 60-32 60 32H0ZM8 43h104M8 120h104M0 130h120M20 45v65m27-65v65m27-65v65m27-65v65" />
          <circle className="econ-accent-dot" cx="60" cy="23" r="6" />
        </g>
      </g>
      <g className="econ-copper" transform="translate(80 660)">
        <g className="econ-drift econ-delay">
          <ellipse cx="48" cy="95" rx="43" ry="12" /><path d="M5 95v15c0 16 86 16 86 0V95M5 80v15M91 80v15" /><ellipse cx="48" cy="80" rx="43" ry="12" />
          <circle cx="50" cy="33" r="30" /><circle cx="50" cy="33" r="23" /><path d="M58 19H46a7 7 0 0 0 0 14h8a7 7 0 0 1 0 14H42M50 13v40" />
        </g>
      </g>
      <g className="econ-forest" transform="translate(1250 660) rotate(-8)">
        <g className="econ-drift">
          <path d="M0 118h125M12 118V85h23v33m14 0V60h23v58m14 0V25h23v93" />
          <path className="econ-draw" pathLength="1" d="m10 65 30-20 27 5 37-40m-17 0h17v17" />
        </g>
      </g>
      <g className="econ-teal" transform="translate(720 820)">
        <g className="econ-drift econ-delay">
          <circle cx="0" cy="0" r="50" /><ellipse cx="0" cy="0" rx="22" ry="50" /><path d="M-50 0H50M-43-25h86m-86 50h86" />
        </g>
      </g>
      <g className="econ-copper" transform="translate(715 80)">
        <g className="econ-drift"><path d="M0 40V0M0 40h90M10 8l60 26M10 33 60 4" /><circle cx="43" cy="20" r="5" /></g>
      </g>
      <g className="econ-gold" transform="translate(330 270)">
        <g className="econ-drift econ-currency-pop">
          <circle cx="0" cy="0" r="38" />
          <path className="econ-symbol" d="M10-22c-5-4-11-6-18-6-11 0-19 6-19 15 0 8 7 12 19 15 10 2 15 5 15 11 0 7-7 12-17 12-8 0-16-3-21-8M-8-36v72" />
        </g>
      </g>
      <g className="econ-copper" transform="translate(1080 240)">
        <g className="econ-drift econ-coin-spin">
          <circle cx="0" cy="0" r="43" />
          <circle cx="0" cy="0" r="35" />
          <text className="econ-coin-letter" x="0" y="14" textAnchor="middle">₿</text>
        </g>
      </g>
      <g className="econ-teal" transform="translate(420 790)">
        <g className="econ-drift econ-currency-pop econ-delay">
          <circle cx="0" cy="0" r="39" />
          <circle cx="0" cy="0" r="31" />
          <text className="econ-coin-letter" x="0" y="10" textAnchor="middle">৳</text>
          <text className="econ-coin-label" x="0" y="24" textAnchor="middle">BD</text>
        </g>
      </g>
      <g className="econ-orbits econ-gold"><circle className="econ-accent-dot" cx="200" cy="470" r="4" /><circle className="econ-accent-dot" cx="1210" cy="410" r="5" /><circle className="econ-accent-dot" cx="1080" cy="850" r="3" /><path d="M160 345h12m-6-6v12M1320 500h14m-7-7v14M365 850h10m-5-5v10" /></g>
    </svg>
  </div>
}
