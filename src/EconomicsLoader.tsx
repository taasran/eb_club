type Props = {
  /** "page" shows the club-crest scene; "inline" is a compact bar chart for buttons and status text. */
  variant?: "page" | "inline"
  label?: string
}

// Laurel leaves placed along an arc, mirroring the wreath in the club logo.
const CX = 60
const CY = 64
const R = 44
const LEAVES = 9
const leaves = Array.from({ length: LEAVES }, (_, index) => {
  const angle = (112 + index * 14) * (Math.PI / 180)
  const x = CX + R * Math.cos(angle)
  const y = CY + R * Math.sin(angle)
  const tangent = (112 + index * 14 + 90) % 360
  return { x, y, rotate: tangent + (index % 2 ? 28 : -28), offset: index % 2 ? 3 : -3, index }
})

export default function EconomicsLoader({ variant = "page", label }: Props) {
  if (variant === "inline") {
    return <span className="eco-loader-inline" role="status" aria-label={label ?? "Loading"}>
      <i /><i /><i /><i />
    </span>
  }

  return <div className="eco-loader" role="status" aria-live="polite">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      {/* Laurel wreath, both branches growing leaf by leaf */}
      {[1, -1].map(side => <g key={side} className="eco-wreath" transform={side === -1 ? `translate(120 0) scale(-1 1)` : undefined}>
        <path className="eco-stem" d={`M ${CX + R * Math.cos(112 * Math.PI / 180)} ${CY + R * Math.sin(112 * Math.PI / 180)} A ${R} ${R} 0 0 1 ${CX + R * Math.cos(224 * Math.PI / 180)} ${CY + R * Math.sin(224 * Math.PI / 180)}`} />
        {leaves.map(leaf => <ellipse key={leaf.index} className="eco-leaf" style={{ animationDelay: `${leaf.index * 0.09}s` }} cx={leaf.x + leaf.offset} cy={leaf.y} rx="6.5" ry="2.6" transform={`rotate(${leaf.rotate} ${leaf.x + leaf.offset} ${leaf.y})`} />)}
      </g>)}

      {/* Spinning Taka coin */}
      <g className="eco-coin">
        <circle cx="60" cy="30" r="10" />
        <text x="60" y="34.5" textAnchor="middle">৳</text>
      </g>

      {/* Open book with EB, as in the crest */}
      <g className="eco-book">
        <path className="eco-page left" d="M60 52 C52 47 42 47 36 49 V77 C42 75 52 75 60 80 Z" />
        <path className="eco-page right" d="M60 52 C68 47 78 47 84 49 V77 C78 75 68 75 60 80 Z" />
        <line x1="60" y1="52" x2="60" y2="80" className="eco-spine" />
        <text x="48" y="69" textAnchor="middle" className="eco-letter">E</text>
        <text x="72" y="69" textAnchor="middle" className="eco-letter">B</text>
      </g>
      <text x="60" y="94" textAnchor="middle" className="eco-iiuc">IIUC</text>
    </svg>
    {label && <span>{label}</span>}
  </div>
}
