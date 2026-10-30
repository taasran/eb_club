type Json = Record<string, unknown>
export type ActivityEntry = {
  id: string
  at: string
  actor: string
  actorName: string
  role: string
  action: string
  area: string
  details: string[]
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const label = (item: unknown, keys: string[]) => {
  const record = (item ?? {}) as Json
  for (const key of keys) if (typeof record[key] === "string" && record[key]) return String(record[key]).slice(0, 60)
  return "Untitled"
}

function diffList(name: string, before: unknown[], after: unknown[], keys: string[]) {
  const out: string[] = []
  const used = new Set<number>()
  for (const item of after) {
    const name_ = label(item, keys)
    const index = before.findIndex((old, i) => !used.has(i) && label(old, keys) === name_)
    if (index === -1) out.push(`${name}: added "${name_}"`)
    else {
      used.add(index)
      if (!same(before[index], item)) out.push(`${name}: edited "${name_}"`)
    }
  }
  before.forEach((old, i) => { if (!used.has(i)) out.push(`${name}: removed "${label(old, keys)}"`) })
  if (!out.length && !same(before, after)) out.push(`${name}: reordered`)
  return out
}

export function describeContentChange(before: Json | null, after: Json): { area: string; details: string[] } {
  const old = before ?? {}
  const details: string[] = []
  const simple: [string, string][] = [
    ["heroTitle", "Home page hero title"], ["heroDescription", "Home page hero text"],
    ["campusImage", "Campus photo"], ["contactEmail", "Contact email"], ["linkedinUrl", "LinkedIn link"],
  ]
  for (const [key, title] of simple) if (!same(old[key], after[key])) details.push(`${title} changed`)
  details.push(...diffList("Events", (old.events as unknown[]) ?? [], (after.events as unknown[]) ?? [], ["title"]))
  details.push(...diffList("Executive Committee", (old.executives as unknown[]) ?? [], (after.executives as unknown[]) ?? [], ["name"]))
  details.push(...diffList("Club Leadership", (old.clubLeadership as unknown[]) ?? [], (after.clubLeadership as unknown[]) ?? [], ["name"]))
  details.push(...diffList("Our Legacy", (old.legacy as unknown[]) ?? [], (after.legacy as unknown[]) ?? [], ["title", "year"]))
  if (Array.isArray(old.activities) || Array.isArray(after.activities)) {
    details.push(...diffList("Find your spark activities", (old.activities as unknown[]) ?? [], (after.activities as unknown[]) ?? [], ["label", "title"]))
  }
  details.push(...diffList("Committee archive", (old.archiveYears as unknown[]) ?? [], (after.archiveYears as unknown[]) ?? [], ["year"]))
  const oldLeaders = (old.leadership ?? {}) as Json
  const newLeaders = (after.leadership ?? {}) as Json
  for (const slug of new Set([...Object.keys(oldLeaders), ...Object.keys(newLeaders)])) {
    details.push(...diffList(`Leadership (${slug.replaceAll("-", " ")})`,
      (oldLeaders[slug] as unknown[]) ?? [], (newLeaders[slug] as unknown[]) ?? [], ["name"]))
  }
  if (!same(old.activityImages, after.activityImages)) details.push("Activity photos changed")
  if (!same(old.activityGalleries, after.activityGalleries)) details.push("Activity photo galleries changed")
  return { area: "Website content", details: details.slice(0, 40) }
}
