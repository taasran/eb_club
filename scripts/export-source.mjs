import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createHash } from "node:crypto"
import { strToU8, unzipSync, zipSync } from "fflate"

const sourceFolders = [
  "src",
  "supabase",
  "utils",
  "public",
  "scripts",
  "docs",
  "guidelines",
  ".github",
  "netlify",
]
const rootFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "index.html",
  "netlify.toml",
  "tsconfig.json",
  "tsconfig.types.json",
  "vite.config.ts",
  "vite.config.lib.ts",
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  ".gitignore",
  ".gitattributes",
  ".mise.toml",
  ".figma/make/site.json",
]
const skippedFolders = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "logs",
])
const skippedExtension = /\.(?:zip|tar|gz|log|pem|key|p12|pfx|sqlite|db)$/i

function removePublicSourceCopies(root) {
  const downloads = path.join(root, "public/downloads")
  for (const name of [
    "eb-club-source.zip",
    "eb-club-source.json",
    "eb-club-website.zip",
    "iiuc-eb-club-website.zip",
  ]) {
    fs.rmSync(path.join(downloads, name), { force: true })
  }
  const designPath = path.join(downloads, "iiuc-eb-club-design-package.zip")
  if (fs.existsSync(designPath)) {
    // An old "design" package also contained TSX/CSS source. Keep only design assets.
    const designs = Object.fromEntries(
      Object.entries(unzipSync(fs.readFileSync(designPath))).filter(([name]) =>
        /\.(?:svg|png|jpe?g|webp|pdf)$/i.test(name),
      ),
    )
    fs.writeFileSync(designPath, zipSync(designs, { level: 9 }))
  }
}

function assertNoCredential(data, filename) {
  const text = data.toString("utf8")
  const token = /(?:ghp_|github_pat_|sbp_|sb_secret_|nfp_)[A-Za-z0-9_-]{25,}/
  const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  const serviceRole = [
    ...text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g),
  ].some(([jwt]) => {
    try {
      return (
        JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString())
          .role === "service_role"
      )
    } catch {
      return false
    }
  })
  if (token.test(text) || privateKey.test(text) || serviceRole) {
    throw new Error(
      `Possible private credential in ${filename}; source export stopped. Remove it before publishing.`,
    )
  }
}

/** Export code, not runtime data, credentials, Git history or recursive archives. */
export function exportProjectSource(root, { write = true } = {}) {
  const files = {}
  const add = (relative) => {
    const full = path.join(root, relative)
    if (!fs.existsSync(full) || !fs.lstatSync(full).isFile()) return
    const data = fs.readFileSync(full)
    assertNoCredential(data, relative)
    files[relative.split(path.sep).join("/")] = data
  }
  const walk = (relative) => {
    const directory = path.join(root, relative)
    if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory())
      return
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".") || skippedFolders.has(entry.name)) continue
      const next = path.join(relative, entry.name)
      if (entry.isDirectory()) walk(next)
      else if (
        entry.isFile() &&
        !skippedExtension.test(entry.name) &&
        !["eb-club-source.json", "SOURCE_EXPORT.md"].includes(entry.name)
      )
        add(next)
    }
  }
  sourceFolders.forEach(walk)
  rootFiles.forEach(add)
  // Never silently publish a partial project archive.
  for (const required of [
    "package.json",
    "pnpm-lock.yaml",
    "src/App.tsx",
    "supabase/functions/server/index.tsx",
    ".figma/make/site.json",
  ]) {
    if (!files[required])
      throw new Error(`Required source file is missing: ${required}`)
  }
  const generatedAt = new Date().toISOString()
  const backendVersion =
    files["supabase/functions/server/index.tsx"]
      .toString()
      .match(/version:\s*["']([^"']+)/)?.[1] ?? "unknown"
  files["SOURCE_EXPORT.md"] = strToU8(`# Project source snapshot

Generated: ${generatedAt}
Backend source version: ${backendVersion}

Includes frontend, backend, workflow, tests and static assets. Does not include
database records, Auth accounts, uploaded storage files, .env files, Git history,
dependencies, build output or nested downloadable archives.

The Supabase browser anon key is public configuration, not a service-role key.
Never add private credentials to this archive. Downloads require an approved
club owner, admin or moderator session through the Netlify function.

Extract first and preserve the project folder structure. Do not delete your
cloned repository's .git folder. Review changes before committing and pushing.
A source snapshot or frontend build does not prove its backend is deployed.
`)
  const archive = zipSync(files, { level: 9 })
  const publicConfig = files["utils/supabase/info.tsx"]?.toString() ?? ""
  const projectId = publicConfig.match(
    /projectId\s*=\s*["']([a-z0-9]+)["']/,
  )?.[1]
  if (!projectId)
    throw new Error("Missing public Supabase project configuration.")
  const info = {
    generatedAt,
    backendVersion,
    files: Object.keys(files).length,
    sha256: createHash("sha256").update(archive).digest("hex"),
    serverUrl: `https://${projectId}.supabase.co/functions/v1/make-server-ad6cf477`,
  }
  // The Make preview builds a fresh in-memory snapshot without touching files.
  if (!write) return { info, archive }
  const destination = path.join(root, "private-downloads")
  fs.mkdirSync(destination, { recursive: true })
  fs.writeFileSync(path.join(destination, "eb-club-source.zip"), archive)
  fs.writeFileSync(
    path.join(destination, "eb-club-source.json"),
    `${JSON.stringify(info, null, 2)}\n`,
  )
  fs.writeFileSync(
    path.join(destination, "source-snapshot.mjs"),
    `export const sourceInfo = ${JSON.stringify(info)};\nexport const sourceArchive = ${JSON.stringify(Buffer.from(archive).toString("base64"))};\n`,
  )
  removePublicSourceCopies(root)
  return info
}

const projectRoot = fileURLToPath(new URL("../", import.meta.url))
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = exportProjectSource(projectRoot)
    console.log(
      `Source snapshot refreshed: ${result.files} files; backend source ${result.backendVersion}.`,
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
