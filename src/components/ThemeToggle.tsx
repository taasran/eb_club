import { useEffect, useState } from "react"
import AdminControls from "../AdminControls"
import { changeTheme, getTheme, subscribeTheme } from "../theme"
import Icon from "./Icon"

const { Button, Span } = AdminControls

export default function ThemeToggle({
  className = "",
}: {
  className?: string
}) {
  const [theme, setTheme] = useState(getTheme)
  useEffect(() => {
    const update = () => setTheme(getTheme())
    update()
    return subscribeTheme(update)
  }, [])
  const dark = theme === "dark"
  return (
    <Button
      type="button"
      className={`theme-toggle ${className}`}
      role="switch"
      aria-label="Night mode"
      aria-checked={dark}
      title={dark ? "Switch to day mode" : "Switch to night mode"}
      onClick={() => changeTheme(dark ? "light" : "dark")}
    >
      <Span className="theme-option theme-day" aria-hidden="true">
        <Icon name="sun" />
        <Span className="theme-option-label">Day</Span>
      </Span>
      <Span className="theme-option theme-night" aria-hidden="true">
        <Icon name="moon" />
        <Span className="theme-option-label">Night</Span>
      </Span>
    </Button>
  )
}
