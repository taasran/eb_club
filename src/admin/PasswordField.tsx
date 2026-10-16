import { useState } from "react"
import AdminControls from "../AdminControls"

const { Div, Label, Input, Button } = AdminControls

export default function PasswordField({
  id = "admin-password",
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
}: {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: "current-password" | "new-password"
}) {
  const [visible, setVisible] = useState(false)
  return (
    <Div className="admin-field">
      <Label htmlFor={id} className="admin-field-label">
        {label}
      </Label>
      <Div className="flex items-center gap-2">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          required
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="button"
          className="admin-btn ghost"
          aria-controls={id}
          aria-pressed={visible}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </Button>
      </Div>
    </Div>
  )
}
