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
const activityIds = ["workshops", "industrial-visits", "leadership", "tournaments", "health-camp", "tours"];
const activityKey = (value: unknown) => typeof value === "string" && /^[a-z0-9-]{1,40}$/i.test(value);
const activityIcons = ["chart", "briefcase", "people", "flag", "heart", "pin", "target", "handshake", "clock"];
const galleryPhoto = (item: unknown) => {
  if (!record(item) || typeof item.src !== "string" || !item.src ||
    !(image(item.src) || /^\/images\/activities\/[a-z0-9-]+\.webp$/.test(item.src)) ||
    typeof item.alt !== "string" || item.alt.length > 500 || !["photo", "poster"].includes(String(item.kind))) return false;
  if (!item.src.startsWith("/")) {
    try {
      const src = new URL(item.src);
      if (src.username || src.password || [...src.searchParams.keys()].some(key => /token|secret/i.test(key))) return false;
    } catch { return false; }
  }
  if (item.source === undefined || item.source === "") return true;
  try {
    if (typeof item.source !== "string" || item.source.length > 2000) return false;
    const url = new URL(item.source);
    return url.protocol === "https:" && ["facebook.com", "www.facebook.com", "m.facebook.com"].includes(url.hostname) &&
      !url.username && !url.password && ![...url.searchParams.keys()].some(key => /token|secret/i.test(key));
  } catch { return false; }
};
const clubActivity = (item: unknown) =>
  record(item) &&
  activityKey(item.id) &&
  fields(item, ["category", "label", "title", "text", "icon", "alt"]) &&
  activityIcons.includes(String(item.icon)) &&
  optional(item.enabled, enabled => typeof enabled === "boolean") &&
  (item.image === "" || image(item.image) || /^\/images\/activities\/[a-z0-9-]+\.webp$/.test(String(item.image))) &&
  ["photo", "poster"].includes(String(item.imageKind ?? "photo")) &&
  optional(item.imageSource, text) &&
  optional(item.additionalImages, photos => Array.isArray(photos) && photos.length <= 30 && photos.every(galleryPhoto)) &&
  optional(item.gallery, photos => Array.isArray(photos) && photos.length <= 30 && photos.every(galleryPhoto));

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
  const validIds = new Set([
    ...activityIds,
    ...(Array.isArray(value.activities)
      ? value.activities
          .filter(clubActivity)
          .map((item) => String((item as RecordValue).id))
      : []),
  ]);
  return text(value.heroTitle) && text(value.heroDescription) && image(value.campusImage) &&
    list(value.events, item => fields(item, ["title", "type"]) &&
      optionalFields(item, ["date", "venue", "deadline", "description"]) && record(item) &&
      optional(item.image, image) &&
      optional(item.gallery, photos => Array.isArray(photos) && photos.length <= 30 && photos.every(galleryPhoto)) &&
      optional(item.status, status => eventStatuses.includes(status as string))) &&
    list(value.executives, executive) &&
    optional(value.clubLeadership, leaders => list(leaders, executive)) &&
    record(value.leadership) && Object.entries(value.leadership).every(([key, members]) =>
      ["former-presidents", "former-general-secretaries", "former-assistant-general-secretaries", "previous-executive-committees", "faculty-advisors"].includes(key) &&
      list(members, item => fields(item, ["name", "designation", "session"]) && record(item) && image(item.image))) &&
    list(value.archiveYears, item => record(item) && text(item.year) &&
      list(item.members, member => fields(member, ["name", "designation", "studentId", "batch"]))) &&
    optional(value.legacy, legacy => list(legacy, item =>
      fields(item, ["year", "title", "text"]) && record(item) && image(item.image) &&
      optional(item.images, images => Array.isArray(images) && images.length <= 15 && images.every(image)) &&
      optional(item.gallery, photos => Array.isArray(photos) && photos.length <= 15 && photos.every(galleryPhoto)) &&
      optional(item.highlights, highlights => list(highlights, text)))) &&
    optional(value.activities, items => Array.isArray(items) && items.length <= 24 && items.every(clubActivity)) &&
    optional(value.activityImages, images => record(images) && Object.keys(images).length <= 20 &&
      Object.entries(images).every(([key, url]) => activityKey(key) && image(url))) &&
    optional(value.activityGalleries, galleries => record(galleries) && Object.keys(galleries).length <= validIds.size &&
      Object.entries(galleries).every(([key, photos]) => validIds.has(key) &&
        Array.isArray(photos) && photos.length <= 30 && photos.every(galleryPhoto))) &&
    optional(value.contactEmail, email) && optional(value.linkedinUrl, image);
}
