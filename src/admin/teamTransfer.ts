import {
  currentClubTeam,
  type ExecutiveProfile,
  type SiteContent,
} from "../contentClient"

export type TeamSection = "executives" | "clubLeadership"

// Matches the backend's per-list content validation limit.
export const maxTeamProfiles = 300

export const teamSectionLabels: Record<TeamSection, string> = {
  executives: "Club Executives",
  clubLeadership: "Club Leadership",
}

export function otherTeamSection(section: TeamSection): TeamSection {
  return section === "executives" ? "clubLeadership" : "executives"
}

/** Transfer the selected object atomically; stale clicks cannot move its neighbour. */
export function moveTeamProfile(
  content: SiteContent,
  source: TeamSection,
  profile: ExecutiveProfile,
): SiteContent {
  const team = currentClubTeam(content.executives, content.clubLeadership)
  const destination = otherTeamSection(source)
  const index = team[source].indexOf(profile)
  if (index < 0 || team[destination].length >= maxTeamProfiles) return content
  return {
    ...content,
    ...team,
    [source]: team[source].filter((_, itemIndex) => itemIndex !== index),
    [destination]: [...team[destination], profile],
  }
}
