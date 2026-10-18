import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { unzipSync, strFromU8, zipSync } from "fflate"
import { exportProjectSource } from "./export-source.mjs"

const root = fs.mkdtempSync(path.join(os.tmpdir(), "club-source-export-"))
const put = (name, value) => {
  const file = path.join(root, name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, value)
}
try {
  for (const [name, value] of Object.entries({
    "package.json": '{"name":"fixture"}',
    "pnpm-lock.yaml": "lockfileVersion: '9.0'",
    "src/App.tsx": "export default function App() { return null }",
    "src/new-file.ts": "export const uncommitted = true",
    "supabase/functions/server/index.tsx":
      'const health = { version: "club-admin-v3" }',
    ".figma/make/site.json": "{}",
    ".github/workflows/deploy.yml": "name: Fixture",
    "utils/supabase/info.tsx": 'export const projectId = "testproject"',
    "netlify/functions/project-source.mjs": "export const handler = () => {}",
    ".env": "PRIVATE_TOKEN=do-not-export",
    "src/.env.local": "PRIVATE_TOKEN=do-not-export",
    ".git/config": "private-git-config",
    ".figaro/state": "private-platform-state",
    "public/downloads/old.zip": "old nested archive",
    "public/downloads/eb-club-source.zip": "old public source",
    "public/downloads/eb-club-website.zip": "old public build",
    "public/downloads/iiuc-eb-club-website.zip": "old public source alias",
    "src/private.key": "private key file",
  }))
    put(name, value)
  put(
    "public/downloads/iiuc-eb-club-design-package.zip",
    zipSync({
      "design.svg": new TextEncoder().encode("<svg />"),
      "src/App.tsx": new TextEncoder().encode("private project code"),
    }),
  )
  const first = exportProjectSource(root)
  let files = unzipSync(
    fs.readFileSync(path.join(root, "private-downloads/eb-club-source.zip")),
  )
  assert.equal(first.backendVersion, "club-admin-v3")
  const snapshot = await import(
    pathToFileURL(path.join(root, "private-downloads/source-snapshot.mjs")).href
  )
  assert.deepEqual(
    Buffer.from(snapshot.sourceArchive, "base64"),
    fs.readFileSync(path.join(root, "private-downloads/eb-club-source.zip")),
  )
  assert.equal(snapshot.sourceInfo.sha256, first.sha256)
  assert.equal(
    strFromU8(files["src/new-file.ts"]),
    "export const uncommitted = true",
  )
  assert(files[".github/workflows/deploy.yml"])
  assert(files["netlify/functions/project-source.mjs"])
  for (const oldName of [
    "eb-club-source.zip",
    "eb-club-website.zip",
    "iiuc-eb-club-website.zip",
  ]) {
    assert.equal(
      fs.existsSync(path.join(root, "public/downloads", oldName)),
      false,
    )
  }
  const design = unzipSync(
    fs.readFileSync(
      path.join(root, "public/downloads/iiuc-eb-club-design-package.zip"),
    ),
  )
  assert(design["design.svg"])
  assert.equal(design["src/App.tsx"], undefined)
  for (const forbidden of [
    ".env",
    "src/.env.local",
    ".git/config",
    ".figaro/state",
    "public/downloads/old.zip",
    "src/private.key",
    "public/downloads/eb-club-source.zip",
    "public/downloads/eb-club-source.json",
  ])
    assert.equal(files[forbidden], undefined, forbidden)
  put("src/App.tsx", "export default function UpdatedApp() { return null }")
  const second = exportProjectSource(root)
  files = unzipSync(
    fs.readFileSync(path.join(root, "private-downloads/eb-club-source.zip")),
  )
  assert.notEqual(second.sha256, first.sha256)
  assert.match(strFromU8(files["src/App.tsx"]), /UpdatedApp/)
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(root, "private-downloads/eb-club-source.json")),
    ).sha256,
    second.sha256,
  )
  put(
    "src/leaked.ts",
    `export const token = "${["ghp", "A".repeat(32)].join("_")}"`,
  )
  assert.throws(() => exportProjectSource(root), /Possible private credential/)
  fs.rmSync(path.join(root, "src/leaked.ts"))
  fs.rmSync(path.join(root, "src/App.tsx"))
  assert.throws(() => exportProjectSource(root), /Required source file/)
  console.log(
    "PASS: source snapshots refresh current files, preserve paths, exclude credentials/history/archives, and reject missing files or exposed tokens.",
  )
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
