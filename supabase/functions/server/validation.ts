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

export function isOwner(user: { email?: string; email_confirmed_at?: string | null }, ownerEmail: string) {
  return Boolean(user.email_confirmed_at && user.email &&
    user.email.toLowerCase() === ownerEmail.trim().toLowerCase());
}

export type Role = "owner" | "admin" | "moderator";
export function canAccess(role: Role, path: string): boolean {
  if (path.includes("/admin/team")) return role === "owner";
  if (path.includes("/admin/submissions")) return role !== "moderator";
  return true;
}

export function validContent(value: unknown): boolean {
  if (!record(value) || JSON.stringify(value).length > 1000000) return false;
  return text(value.heroTitle) && text(value.heroDescription) && image(value.campusImage) &&
    list(value.events, item => fields(item, ["title", "type"])) &&
    list(value.executives, item => fields(item, ["name", "designation", "studentId", "batch"]) &&
      record(item) && image(item.image)) &&
    record(value.leadership) && Object.entries(value.leadership).every(([key, members]) =>
      ["former-presidents", "former-general-secretaries", "previous-executive-committees", "faculty-advisors"].includes(key) &&
      list(members, item => fields(item, ["name", "designation", "session"]) && record(item) && image(item.image))) &&
    list(value.archiveYears, item => record(item) && text(item.year) &&
      list(item.members, member => fields(member, ["name", "designation", "studentId", "batch"])));
}
