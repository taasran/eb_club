// Editorial role inspiration, not statements attributed to individual members.
const roleQuotes: Record<string, string> = {
  president: "Lead with purpose. Inspire progress together.",
  "vice president": "Support the vision. Strengthen the team.",
  "general secretary": "Clear communication turns shared plans into progress.",
  "assistant general secretary":
    "Every detail matters. Every effort moves us forward.",
  "joint secretary": "Shared effort makes every initiative stronger.",
  treasurer: "Build trust through responsible stewardship.",
  "assistant treasurer": "Careful records today. Confident decisions tomorrow.",
  "organizing secretary": "Thoughtful planning creates meaningful experiences.",
  "assistant organizing secretary":
    "Behind every great event is a team that cares.",
  "office secretary": "Good organization gives great ideas room to grow.",
  "public relations secretary":
    "Build connections that bring our community closer.",
  "publicity secretary":
    "Share the story. Help every initiative reach further.",
  "publication secretary": "Give knowledge a voice. Let ideas travel.",
  "media secretary": "Capture the moments that tell our community’s story.",
  "it secretary": "Use technology to make participation simpler for everyone.",
  "research secretary": "Ask better questions. Discover deeper insights.",
  "cultural secretary": "Celebrate expression. Bring people together.",
  "sports secretary": "Play with spirit. Grow through teamwork.",
  "faculty advisor": "Guide with wisdom. Help the next generation flourish.",
  "executive member": "Small contributions build a stronger community.",
  "committee chair": "Bring people together around a shared purpose.",
  "committee secretary": "Keep every conversation connected to action.",
  "finance coordinator":
    "Thoughtful resources make sustainable progress possible.",
  "organizing coordinator":
    "Connect the details. Create a seamless experience.",
  "committee member": "Show up with commitment. Make teamwork count.",
}

// Suggested designation-based messages for every profile, not verified quotations.
const roleSpeeches: Record<string, string[]> = {
  president: [
    "I believe leadership begins with listening.",
    "My focus is unity, opportunity and growth.",
    "Together, we can build a stronger club.",
  ],
  "vice president": [
    "I believe strong teams lift one another.",
    "My aim is to support our shared vision.",
    "Together, we can turn plans into progress.",
  ],
  "general secretary": [
    "I believe clear communication builds trust.",
    "My aim is to connect people and plans.",
    "Together, we can make every effort count.",
  ],
  "assistant general secretary": [
    "I believe progress depends on the details.",
    "My aim is to keep our work coordinated.",
    "Together, we can turn commitment into action.",
  ],
  "joint secretary": [
    "I believe shared effort makes us stronger.",
    "My focus is cooperation and coordination.",
    "Together, we can help good ideas take shape.",
  ],
  treasurer: [
    "I believe every resource deserves care.",
    "My focus is transparency and accountability.",
    "Together, we can build trust that lasts.",
  ],
  "assistant treasurer": [
    "I believe accuracy supports good decisions.",
    "My focus is careful records and planning.",
    "Together, we can manage resources responsibly.",
  ],
  "organizing secretary": [
    "I believe great events begin with teamwork.",
    "My aim is to make every experience meaningful.",
    "Together, we can bring our community closer.",
  ],
  "assistant organizing secretary": [
    "I believe every detail shapes an experience.",
    "My aim is to support smooth, welcoming events.",
    "Together, we can make participation rewarding.",
  ],
  "office secretary": [
    "I believe good organization helps everyone.",
    "My focus is clear records and reliable support.",
    "Together, we can keep our club moving forward.",
  ],
  "public relations secretary": [
    "I believe meaningful connections build trust.",
    "My aim is to open conversations and partnerships.",
    "Together, we can connect our club with opportunity.",
  ],
  "publicity secretary": [
    "I believe good initiatives deserve to be seen.",
    "My aim is to share our work clearly and creatively.",
    "Together, we can help our message reach further.",
  ],
  "publication secretary": [
    "I believe knowledge grows when it is shared.",
    "My focus is thoughtful writing and clear ideas.",
    "Together, we can give our community a voice.",
  ],
  "media secretary": [
    "I believe every meaningful moment tells a story.",
    "My aim is to share those stories with care.",
    "Together, we can celebrate our community.",
  ],
  "it secretary": [
    "I believe technology should make life simpler.",
    "My aim is to make our digital spaces accessible.",
    "Together, we can connect, learn and participate.",
  ],
  "research secretary": [
    "I believe discovery begins with a good question.",
    "My focus is curiosity, evidence and discussion.",
    "Together, we can turn learning into insight.",
  ],
  "cultural secretary": [
    "I believe creativity brings people together.",
    "My aim is to make space for every expression.",
    "Together, we can celebrate our diversity.",
  ],
  "sports secretary": [
    "I believe teamwork matters beyond the classroom.",
    "My focus is fair play, wellbeing and participation.",
    "Together, we can grow through a sporting spirit.",
  ],
  "faculty advisor": [
    "I believe guidance should nurture independent thought.",
    "My aim is to encourage curiosity and integrity.",
    "Together, we can help future leaders grow.",
  ],
  "executive member": [
    "I believe every contribution can make a difference.",
    "My aim is to learn, participate and support others.",
    "Together, we can strengthen our club community.",
  ],
  "committee chair": [
    "I believe a shared purpose brings out our best.",
    "My aim is to guide fair and focused discussions.",
    "Together, we can turn decisions into progress.",
  ],
  "committee secretary": [
    "I believe good communication keeps teams connected.",
    "My focus is clear records and timely follow-up.",
    "Together, we can put our decisions into action.",
  ],
  "finance coordinator": [
    "I believe thoughtful planning protects opportunity.",
    "My aim is to align resources with our priorities.",
    "Together, we can support sustainable initiatives.",
  ],
  "organizing coordinator": [
    "I believe smooth experiences depend on cooperation.",
    "My aim is to connect people, tasks and timelines.",
    "Together, we can make every initiative welcoming.",
  ],
  "committee member": [
    "I believe a good team values every perspective.",
    "My aim is to contribute with care and commitment.",
    "Together, we can make our shared work meaningful.",
  ],
  "former president": [
    "I believe the value of leadership lies in service.",
    "My hope is to see new leaders grow with confidence.",
    "May our club keep moving forward together.",
  ],
  "former general secretary": [
    "I believe strong connections outlast any committee.",
    "My hope is for open communication and shared purpose.",
    "May every new team build on that spirit.",
  ],
  "former assistant general secretary": [
    "I believe dedicated support strengthens every team.",
    "My hope is for thoughtful work and lasting cooperation.",
    "May future members carry that commitment forward.",
  ],
}

function normalizedDesignation(designation: string) {
  return designation
    .trim()
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\badviser\b/g, "advisor")
}

export default function roleQuote(designation: string) {
  const role = normalizedDesignation(designation).replace(
    /^(?:former|acting|ex)\s+/,
    "",
  )
  return Object.prototype.hasOwnProperty.call(roleQuotes, role)
    ? roleQuotes[role]
    : !role || role === "club member" || /^executive slot \d+$/.test(role)
      ? roleQuotes["executive member"]
      : `Every contribution as ${designation.trim()} can strengthen our community.`
}

export function roleSpeech(designation: string) {
  const exact = normalizedDesignation(designation)
  const role = exact.replace(/^(?:former|acting|ex)\s+/, "")
  const lines = Object.prototype.hasOwnProperty.call(roleSpeeches, exact)
    ? roleSpeeches[exact]
    : Object.prototype.hasOwnProperty.call(roleSpeeches, role)
      ? roleSpeeches[role]
      : !role || role === "club member" || /^executive slot \d+$/.test(role)
        ? roleSpeeches["executive member"]
        : [
            `I hope to contribute thoughtfully as ${designation.trim()}.`,
            "My focus is learning, teamwork and responsibility.",
            "Together, we can help our community grow.",
          ]
  return lines.join("\n")
}
