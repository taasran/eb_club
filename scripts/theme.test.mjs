import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import vm from "node:vm"
import ts from "typescript"

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "club-theme-"))
const original = {
  window: globalThis.window,
  document: globalThis.document,
  getComputedStyle: globalThis.getComputedStyle,
}
const source = fs.readFileSync("src/theme.ts", "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText
const key = "eb-club-theme"
let moduleNumber = 0

async function environment({ dark = false, saved, blocked = false } = {}) {
  const values = new Map(saved ? [[key, saved]] : [])
  const media = new EventTarget()
  media.matches = dark
  const window = new EventTarget()
  window.matchMedia = () => media
  window.localStorage = {
    getItem: (name) => {
      if (blocked) throw new Error("Storage unavailable")
      return values.get(name) ?? null
    },
    setItem: (name, value) => {
      if (blocked) throw new Error("Storage unavailable")
      values.set(name, value)
    },
  }
  const meta = {}
  const document = {
    documentElement: { dataset: {} },
    querySelector: () => ({
      setAttribute: (name, value) => {
        meta[name] = value
      },
    }),
  }
  Object.assign(globalThis, {
    window,
    document,
    getComputedStyle: () => ({
      getPropertyValue: () =>
        document.documentElement.dataset.theme === "dark"
          ? "night-chrome"
          : "day-chrome",
    }),
  })
  const file = path.join(directory, `${moduleNumber++}.mjs`)
  fs.writeFileSync(file, compiled)
  const theme = await import(pathToFileURL(file).href)
  return { theme, window, media, values, document, meta }
}

try {
  let env = await environment({ dark: true })
  env.theme.initializeTheme()
  assert.equal(env.theme.getTheme(), "dark", "First visit follows the OS.")
  assert.equal(env.meta.content, "night-chrome")
  let notifications = 0
  const unsubscribe = env.theme.subscribeTheme(() => notifications++)
  env.theme.changeTheme("light")
  assert.equal(env.theme.getTheme(), "light")
  assert.equal(env.values.get(key), "light")
  assert.equal(env.meta.content, "day-chrome")
  assert.equal(notifications, 1, "Same-tab controls update together.")
  env.media.dispatchEvent(new Event("change"))
  assert.equal(
    env.theme.getTheme(),
    "light",
    "Explicit choice overrides the OS.",
  )

  env.values.set(key, "dark")
  const storage = new Event("storage")
  Object.assign(storage, { key, newValue: "dark" })
  env.window.dispatchEvent(storage)
  assert.equal(
    env.theme.getTheme(),
    "dark",
    "Cross-tab preferences synchronize.",
  )
  env.values.clear()
  env.media.matches = false
  const cleared = new Event("storage")
  Object.assign(cleared, { key: null, newValue: null })
  env.window.dispatchEvent(cleared)
  assert.equal(
    env.theme.getTheme(),
    "light",
    "Cleared preferences return to OS mode.",
  )
  env.media.matches = true
  env.media.dispatchEvent(new Event("change"))
  assert.equal(
    env.theme.getTheme(),
    "dark",
    "OS changes work without an override.",
  )
  const beforeUnsubscribe = notifications
  unsubscribe()
  env.theme.changeTheme("light")
  env.media.dispatchEvent(new Event("change"))
  env.window.dispatchEvent(storage)
  assert.equal(notifications, beforeUnsubscribe, "Subscriptions clean up.")

  env = await environment({ dark: true, saved: "light" })
  env.theme.initializeTheme()
  assert.equal(
    env.theme.getTheme(),
    "light",
    "Saved selection survives a reload.",
  )
  env = await environment({ saved: "invalid" })
  env.theme.initializeTheme()
  assert.equal(
    env.theme.getTheme(),
    "light",
    "Invalid stored values are ignored.",
  )
  env = await environment({ blocked: true })
  assert.doesNotThrow(() => env.theme.initializeTheme())
  assert.doesNotThrow(() => env.theme.changeTheme("dark"))
  assert.equal(
    env.theme.getTheme(),
    "dark",
    "Blocked storage does not break switching.",
  )

  const html = fs.readFileSync("index.html", "utf8")
  const bootstrap = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(
    (match) => match[1].includes(key),
  )?.[1]
  assert(bootstrap, "Theme bootstrap must run before the app renders.")
  for (const scenario of [
    { dark: true },
    { dark: true, saved: "light" },
    { saved: "dark" },
    { dark: true, blocked: true },
  ]) {
    env = await environment(scenario)
    vm.runInNewContext(bootstrap, {
      window: env.window,
      document: env.document,
    })
    const bootstrapped = env.document.documentElement.dataset.theme
    env.theme.initializeTheme()
    assert.equal(
      bootstrapped,
      env.theme.getTheme(),
      "Bootstrap and app agree without a theme flash.",
    )
  }
  console.log(
    "PASS: OS defaults, saved choice, cross-tab sync, browser chrome, blocked storage, cleanup and no-flash bootstrap.",
  )
} finally {
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[name]
    else globalThis[name] = value
  }
  fs.rmSync(directory, { recursive: true, force: true })
}
