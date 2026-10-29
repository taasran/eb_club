// Run: node supabase/functions/server/validation.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./validation.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { isOwner, validContent, canAccess } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const owner = "tasranurrahaman@gmail.com";
assert.equal(isOwner({ email: owner, email_confirmed_at: "2026-01-01" }, owner), true);
assert.equal(isOwner({ email: owner }, owner), false);
assert.equal(isOwner({ email: "other@example.com", email_confirmed_at: "2026-01-01" }, owner), false);
assert.equal(isOwner({ email: owner.toUpperCase(), email_confirmed_at: "2026-01-01" }, owner), true);
for (const role of ["owner", "admin", "moderator"]) {
  assert.equal(canAccess(role, "/make-server-ad6cf477/admin/content"), true);
  assert.equal(canAccess(role, "/make-server-ad6cf477/admin/visits"), true);
  assert.equal(canAccess(role, "/make-server-ad6cf477/admin/team"), role === "owner");
  assert.equal(canAccess(role, "/make-server-ad6cf477/admin/team/user@example.com"), role === "owner");
  assert.equal(canAccess(role, "/make-server-ad6cf477/admin/submissions"), role !== "moderator");
  assert.equal(canAccess(role, "/make-server-ad6cf477/admin/submissions/join-123"), role !== "moderator");
}

const content = {
  heroTitle: "Club", heroDescription: "Welcome", campusImage: "https://example.com/image.jpg",
  events: [], executives: [], leadership: {}, archiveYears: [],
};
assert.equal(validContent(content), true);
for (const invalid of [
  null, {}, { ...content, campusImage: "javascript:alert(1)" },
  { ...content, events: [{}] }, { ...content, leadership: { bad: [] } },
  { ...content, executives: [{ name: "A" }] }, { ...content, heroTitle: "x".repeat(10001) },
  { ...content, clubLeadership: [{ name: "A" }] },
  { ...content, clubLeadership: "invalid" },
  { ...content, clubLeadership: [{ name: "A", designation: "President", studentId: "", batch: "", image: "", imageZoom: 4 }] },
  { ...content, legacy: [{ year: "2020", title: "EB Day" }] },
  { ...content, legacy: [{ year: "2020", title: "EB Day", text: "", image: "javascript:alert(1)" }] },
  { ...content, legacy: [{ year: "2020", title: "EB Day", text: "", image: "", images: Array(16).fill("https://example.com/a.jpg") }] },
  { ...content, legacy: [{ year: "2020", title: "EB Day", text: "", image: "", images: ["javascript:alert(1)"] }] },
  { ...content, legacy: [{ year: "2020", title: "EB Day", text: "", image: "", images: "invalid" }] },
  { ...content, activityImages: { "bad key!": "" } },
  { ...content, events: [{ title: "A", type: "B", status: "Cancelled" }] },
  { ...content, contactEmail: "not-an-email" },
  { ...content, linkedinUrl: "javascript:alert(1)" },
]) assert.equal(validContent(invalid), false);
assert.equal(validContent({
  ...content,
  legacy: [{ year: "2020", title: "EB Day 2020", text: "Milestone", image: "" }],
  activityImages: { workshops: "https://example.com/a.jpg", tours: "" },
}), true);
assert.equal(validContent({
  ...content,
  events: [{ title: "Seminar", type: "Seminar", status: "Registration Open", date: "12 May", venue: "IIUC", deadline: "10 May" }],
  executives: [{ name: "A", designation: "President", studentId: "", batch: "", image: "", quote: "Lead together." }],
  legacy: [{ year: "2020", title: "EB Day", text: "", image: "", highlights: ["One", "Two"] }],
  contactEmail: "club@example.com", linkedinUrl: "https://www.linkedin.com/company/example",
}), true);
assert.equal(validContent({
  ...content,
  leadership: { "former-presidents": [{ name: "A", designation: "President", session: "2025", image: "" }] },
}), true);
assert.equal(validContent({
  ...content,
  leadership: {
    "former-assistant-general-secretaries": [
      { name: "A", designation: "Assistant General Secretary", session: "2025", image: "" },
    ],
  },
}), true);
assert.equal(validContent({
  ...content,
  clubLeadership: [{ name: "A", designation: "President", studentId: "EB1", batch: "26", image: "", imageZoom: 1.5, imageX: 50, imageY: 20 }],
  legacy: [{ year: "2020", title: "EB Day", text: "", image: "", images: Array(15).fill("https://example.com/a.jpg") }],
}), true);
assert.equal(validContent({ ...content, clubLeadership: [], legacy: [{ year: "2020", title: "EB Day", text: "", image: "", images: [] }] }), true);
console.log("PASS: confirmed owner, non-owner and unconfirmed rejection, role permissions, content validation.");
await import("./account_access.test.mjs");
await import("./facebook.test.mjs");
await import("./facebook-diagnostics.test.mjs");
await import("./facebook-shared.test.mjs");
