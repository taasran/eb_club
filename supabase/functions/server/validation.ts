type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown) => typeof value === "string" && value.length <= 10000;
const image = (value: unknown) => typeof value === "string" &&
  (value === "" || /^https?:\/\/[^\s]+$/i.test(value));
const list = (value: unknown, check: (item: unknown) => boolean) =>
  Array.isArray(value) && value.length <= 300 && value.every(check);
const fields = (value: unknown, keys: string[]) =>
  record(value) && keys.every(key => text(value[key]));
const optional = (value: unknown, check: (item: unknown) => boolean) => value === undefined || check(value);
const optionalFields = (value: unknown, keys: string[]) =>
  record(value) && keys.every(key => optional(value[key], text));
const email = (value: unknown) => text(value) &&
  (value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string));
const eventStatuses = ["Upcoming", "Registration Open", "Coming Soon", "Completed"];
const executive = (item: unknown) => fields(item, ["name", "designation", "studentId", "batch"]) &&
  optionalFields(item, ["quote"]) && record(item) && image(item.image) &&
  optional(item.imageZoom, n => typeof n === "number" && n >= 1 && n <= 3) &&
  optional(item.imageX, n => typeof n === "number" && n >= 0 && n <= 100) &&
  optional(item.imageY, n => typeof n === "number" && n >= 0 && n <= 100);

export function isOwner(user: { email?: string; email_confirmed_at?: string | null }, ownerEmail: string) {
  return Boolean(user.email_confirmed_at && user.email &&
    user.email.toLowerCase() === ownerEmail.trim().toLowerCase());
}

export type Role = "owner" | "admin" | "moderator";
export function canAccess(role: Role, path: string): boolean {
  if (path.includes("/admin/team") || path.includes("/admin/activity")) return role === "owner";
  if (path.includes("/admin/submissions")) return role !== "moderator";
  return true;
}

export function validContent(value: unknown): boolean {
  if (!record(value) || JSON.stringify(value).length > 1000000) return false;
  return text(value.heroTitle) && text(value.heroDescription) && image(value.campusImage) &&
    list(value.events, item => fields(item, ["title", "type"]) &&
      optionalFields(item, ["date", "venue", "deadline"]) && record(item) &&
      optional(item.status, status => eventStatuses.includes(status as string))) &&
    list(value.executives, executive) &&
    optional(value.clubLeadership, leaders => list(leaders, executive)) &&
    record(value.leadership) && Object.entries(value.leadership).every(([key, members]) =>
      ["former-presidents", "former-general-secretaries", "previous-executive-committees", "faculty-advisors"].includes(key) &&
      list(members, item => fields(item, ["name", "designation", "session"]) && record(item) && image(item.image))) &&
    list(value.archiveYears, item => record(item) && text(item.year) &&
      list(item.members, member => fields(member, ["name", "designation", "studentId", "batch"]))) &&
    optional(value.legacy, legacy => list(legacy, item =>
      fields(item, ["year", "title", "text"]) && record(item) && image(item.image) &&
      optional(item.images, images => Array.isArray(images) && images.length <= 15 && images.every(image)) &&
      optional(item.highlights, highlights => list(highlights, text)))) &&
    optional(value.activityImages, images => record(images) && Object.keys(images).length <= 20 &&
      Object.entries(images).every(([key, url]) => /^[a-z0-9-]{1,40}$/i.test(key) && image(url))) &&
    optional(value.contactEmail, email) && optional(value.linkedinUrl, image);
}
