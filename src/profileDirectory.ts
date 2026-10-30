import type { ManagedExecutive } from "./components/ExecutiveCard"
import { currentClubTeam, type SiteContent } from "./contentClient"
import { archivePages, committee } from "./data/club"

export type DirectoryPerson = ManagedExecutive & { session?: string }
export type ProfileEntry = {
  person: DirectoryPerson
  group: string
  key: string
  href: string
  label: string
  backHref: string
  backLabel: string
  description: string
}

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")

export function profileKey(person: DirectoryPerson, index: number) {
  if (person.studentId?.trim()) return `id-${slug(person.studentId)}`
  if (person.name?.trim() && person.name !== "Name to be announced")
    return slug(
      [person.name, person.designation, person.session]
        .filter(Boolean)
        .join("-"),
    )
  return `slot-${index + 1}-${slug(person.designation ?? "member")}`
}

export function profileHref(
  person: DirectoryPerson,
  group: string,
  index: number,
) {
  return `/profiles/${encodeURIComponent(group)}/${encodeURIComponent(profileKey(person, index))}`
}

export function profileDirectory(
  content: Partial<SiteContent>,
): ProfileEntry[] {
  const team = currentClubTeam<DirectoryPerson>(
    content.executives ?? committee.map(([designation]) => ({ designation })),
    content.clubLeadership,
  )
  const entries: ProfileEntry[] = []
  const add = (
    people: DirectoryPerson[],
    group: string,
    label: string,
    backHref: string,
    backLabel: string,
  ) => {
    people.forEach((person, index) =>
      entries.push({
        person,
        group,
        key: profileKey(person, index),
        href: profileHref(person, group, index),
        label,
        backHref,
        backLabel,
        description:
          committee.find(([role]) => role === person.designation)?.[1] ??
          (group === "leadership" || group === "executives"
            ? "Part of the Economics & Banking Club team, supporting its learning initiatives, activities and student community."
            : "Part of the Economics & Banking Club leadership archive, preserving the people and roles behind our community."),
      }),
    )
  }
  add(
    team.clubLeadership,
    "leadership",
    "Club Leadership",
    "/#executives",
    "Back to our team",
  )
  add(
    team.executives,
    "executives",
    "Club Executives",
    "/#executives",
    "Back to our team",
  )
  archivePages
    .filter((page) => page.slug !== "committee-wise-archive")
    .forEach((page) => {
      add(
        content.leadership?.[page.slug] ?? page.profiles,
        page.slug,
        page.title,
        `/leadership/${page.slug}`,
        "Back to the directory",
      )
    })
  return entries
}

export function findProfile(
  entries: ProfileEntry[],
  group: string,
  key: string,
) {
  const exact = entries.find(
    (entry) => entry.group === group && entry.key === key,
  )
  // An existing link continues to work after an admin moves a current team member.
  return (
    exact ??
    (["leadership", "executives"].includes(group)
      ? entries.find(
          (entry) =>
            ["leadership", "executives"].includes(entry.group) &&
            entry.key === key,
        )
      : undefined)
  )
}
