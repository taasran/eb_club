import { useEffect, useState } from "react"
import AdminControls from "../AdminControls"
import { downloadProjectSource, requestProjectSource } from "./projectSource"

const { Div, P, Strong, Button, Span } = AdminControls
type SourceInfo = {
  generatedAt: string
  backendVersion: string
  sha256: string
}

export default function ProjectDownload() {
  const [info, setInfo] = useState<SourceInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    void requestProjectSource(true)
      .then((response) => response.json())
      .then((value) => {
        if (
          active &&
          typeof value?.generatedAt === "string" &&
          typeof value?.backendVersion === "string" &&
          /^[a-f0-9]{64}$/.test(value?.sha256 ?? "")
        )
          setInfo(value)
      })
      .catch(() => {
        /* Download errors are shown when the user requests the archive. */
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <Div className="admin-card" id="project-source">
      <Div className="flex flex-wrap items-center justify-between gap-4">
        <Div>
          <P className="admin-eyebrow">PROJECT FILES</P>
          <Strong className="admin-card-title">Latest project code</Strong>
          <P className="admin-muted">
            Complete frontend, backend, GitHub workflow and tests in one ZIP. A
            fresh snapshot is generated on every production build.
          </P>
        </Div>
        <Button
          type="button"
          disabled={busy}
          className="admin-btn primary"
          onClick={() => {
            setBusy(true)
            setError("")
            void downloadProjectSource()
              .catch((error) =>
                setError(
                  error instanceof Error
                    ? error.message
                    : "Unable to download source.",
                ),
              )
              .finally(() => setBusy(false))
          }}
        >
          {busy ? "Preparing download…" : "Download latest project code (.zip)"}
        </Button>
      </Div>
      {info && (
        <P className="admin-muted">
          <Span>Backend source: {info.backendVersion}</Span>
          <Span className="block">
            Snapshot: {new Date(info.generatedAt).toLocaleString()}
          </Span>
        </P>
      )}
      {error && (
        <P className="admin-status error" role="status">
          {error}
        </P>
      )}
      <P className="admin-muted">
        Source code only—not a database, account or uploaded-media backup.
        Private environment files and Git history are excluded. The source
        version does not indicate which backend is live. Every download requires
        an approved owner, admin or moderator session.
      </P>
    </Div>
  )
}
