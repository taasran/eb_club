// Role taglines and default reflections shown on member profile pages.
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

// Default three-line reflections by role.
const roleSpeeches: Record<string, string[]> = {
  president: [
    "Good student leadership starts by listening to every batch.",
    "Our priority this term is practical learning, unity, and open doors.",
    "Every member who steps forward makes this club stronger.",
  ],
  "vice president": [
    "A strong committee works best when everyone shares the credit and the load.",
    "We are here to back bold student ideas with steady execution.",
    "When one batch grows, the whole department moves ahead.",
  ],
  "general secretary": [
    "I believe clear communication builds trust.",
    "My aim is to connect people and plans.",
    "Together, we can make every effort count.",
  ],
  "assistant general secretary": [
    "Smooth events happen when the small details are handled early.",
    "Keeping teams aligned across batches is at the heart of this role.",
    "Consistent follow-through turns good plans into real campus moments.",
  ],
  "joint secretary": [
    "Bridging conversations between members and the committee keeps us grounded.",
    "Collaboration across wings makes even ambitious programmes feel effortless.",
    "Good teamwork always leaves room for new voices.",
  ],
  treasurer: [
    "Clear budgets let our teams plan bigger programmes with confidence.",
    "Stewardship means every contribution goes directly toward student value.",
    "Sound planning today builds trust for the committees that follow.",
  ],
  "assistant treasurer": [
    "Careful records behind the scenes keep every club initiative on track.",
    "Good financial discipline gives creative ideas a solid foundation.",
    "Accountability is how we honour the trust of our department.",
  ],
  "organizing secretary": [
    "From seminars to tournaments, every event is a chance to bring batches closer.",
    "Thoughtful preparation lets students focus on learning and enjoying the moment.",
    "Our best programmes are the ones members remember long after graduation.",
  ],
  "assistant organizing secretary": [
    "Great campus events rely on energy, patience, and logistics that just work.",
    "We want every participant and guest to feel welcomed from the first minute.",
    "Hands-on coordination is where teamwork really comes alive.",
  ],
  "office secretary": [
    "Well-kept records and schedules give every wing the clarity to move fast.",
    "Institutional memory helps each new committee build on past work.",
    "Quiet organization keeps the whole club running smoothly.",
  ],
  "public relations secretary": [
    "Strong ties with faculty, alumni, and guests open new doors for students.",
    "Every conversation is an opportunity to represent our department with pride.",
    "Lasting relationships are the true measure of outreach.",
  ],
  "publicity secretary": [
    "A great workshop or competition only matters if students hear about it in time.",
    "Clear, creative outreach brings more classmates into the conversation.",
    "Sharing our work invites the whole campus to take part.",
  ],
  "publication secretary": [
    "Thoughtful writing turns classroom theory into living campus dialogue.",
    "Curating student perspectives preserves the intellectual spirit of our club.",
    "Good publications give young economists a place to be read.",
  ],
  "media secretary": [
    "Every photograph and reel preserves a piece of our department's history.",
    "Visual storytelling lets alumni and new batches feel part of the same journey.",
    "Capturing candid moments keeps the spirit of EB Club alive.",
  ],
  "it secretary": [
    "Reliable digital tools make registration, updates, and archives effortless.",
    "Technology should stay out of the way and help students connect faster.",
    "Building clean systems today serves the club for years to come.",
  ],
  "research secretary": [
    "Curious questions and honest data are the heart of economics and banking.",
    "Workshops and study circles help members look beyond textbooks.",
    "Rigorous inquiry prepares us for real policy and market challenges.",
  ],
  "cultural secretary": [
    "Shared celebrations and creative stages turn classmates into a real community.",
    "Making space for culture and expression balances academic life.",
    "Traditions like EB Day and Winter Fest belong to every batch.",
  ],
  "sports secretary": [
    "Nothing unites batches faster than a competitive match on the field.",
    "Fair play, energy, and camaraderie matter just as much as the trophy.",
    "Sports keep our department active, connected, and spirited.",
  ],
  "faculty advisor": [
    "Student-led initiatives thrive when academic rigour meets real-world curiosity.",
    "Mentorship is about giving young leaders the confidence to test their ideas.",
    "Watching each committee grow into capable professionals is a privilege.",
  ],
  "executive member": [
    "Showing up, helping out, and learning from seniors is how every journey starts.",
    "Active participation turns a departmental society into a second home.",
    "Every small task contributes to the larger success of our club.",
  ],
  "committee chair": [
    "Focused discussions and clear priorities help a committee deliver its best work.",
    "Good chairing means making sure every member's perspective is heard.",
    "Steady direction turns collective energy into results.",
  ],
  "committee secretary": [
    "Clear notes and timely reminders keep our plans moving between meetings.",
    "Good coordination ensures no idea gets lost along the way.",
    "Reliable communication is the backbone of every committee.",
  ],
  "finance coordinator": [
    "Practical budgeting helps us deliver memorable events without waste.",
    "Matching resources to student priorities keeps our programmes sustainable.",
    "Transparent numbers make decision-making easier for the whole team.",
  ],
  "organizing coordinator": [
    "Bringing venues, schedules, and volunteers together takes steady teamwork.",
    "When logistics run smoothly, speakers and students can focus on what matters.",
    "Every well-run programme builds momentum for the next one.",
  ],
  "committee member": [
    "Working alongside peers from different batches is the best part of club life.",
    "Consistent effort and shared responsibility make every initiative count.",
    "Strong communities are built one event at a time.",
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
