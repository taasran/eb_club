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
]) assert.equal(validContent(invalid), false);
assert.equal(validContent({
  ...content,
  leadership: { "former-presidents": [{ name: "A", designation: "President", session: "2025", image: "" }] },
}), true);
console.log("PASS: confirmed owner, non-owner and unconfirmed rejection, role permissions, content validation.");
