import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { bodyLimit } from "npm:hono/body-limit";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
import { validContent, isOwner, canAccess, type Role } from "./validation.ts";
import { describeContentChange, type ActivityEntry } from "./audit.ts";
import { approvedAccountRole, listAccountReviews, approveAccount, deleteAccount, AccountAccessError } from "./account_access.ts";
import { createFacebookFeed } from "./facebook.ts";

const app = new Hono<{ Variables: { ownerEmail: string; role: Role; actorName: string } }>();
const base = "/make-server-ad6cf477";
const contentKey = "eb:content";
const bucket = "make-ad6cf477-club-images";
const activityLimit = 500;
const db = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use("/*", bodyLimit({
  maxSize: 6 * 1024 * 1024,
  onError: (c) => c.json({ error: "Request is too large." }, 413),
}));
app.onError((error, c) => {
  if (error instanceof AccountAccessError) return c.json({ error: error.message }, error.status);
  // Never send database details or credentials to the browser.
  console.error("Club API request failed:", error.message);
  return c.json({ error: "The server could not complete this request. Please try again." }, 500);
});
app.notFound((c) => c.json({ error: "API route not found. Deploy the latest club backend." }, 404));

app.get(`${base}/health`, (c) => c.json({ status: "ok", version: "club-admin-v4" }));

const getFacebookFeed = createFacebookFeed({
  config: () => ({
    pageId: Deno.env.get("FACEBOOK_PAGE_ID"),
    token: Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN"),
  }),
  cache: kv,
});
app.get(`${base}/public/facebook`, async (c) => {
  c.header("Cache-Control", "no-store");
  const { feed, status } = await getFacebookFeed();
  return c.json(feed, status);
});

// Authentication and authorization are separate: signing up never grants admin access.
app.use(`${base}/admin/*`, async (c, next) => {
  c.header("Cache-Control", "no-store");
  const token = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return c.json({ error: "Please sign in." }, 401);
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) return c.json({ error: "Your session has expired. Please sign in again." }, 401);
  const ownerEmail = Deno.env.get("ADMIN_OWNER_EMAIL") ?? "tasranurrahaman@gmail.com";
  const email = data.user.email?.trim().toLowerCase();
  if (!email || !data.user.email_confirmed_at) {
    return c.json({ error: "This verified account is not authorised to administer the club." }, 403);
  }
  const member = isOwner(data.user, ownerEmail) ? null : await kv.get(`eb:team:${email}`);
  const role: Role | null = isOwner(data.user, ownerEmail) ? "owner" : approvedAccountRole(data.user, member);
  if (!role || !canAccess(role, c.req.path)) {
    return c.json({ error: role ? "Only the owner can review accounts or change team access."
      : member?.status === "removed" && member?.userId === data.user.id ? "Your dashboard access has been removed."
      : "Your account is awaiting owner approval. You cannot access the dashboard until it is approved." }, 403);
  }
  c.set("ownerEmail", email);
  c.set("role", role);
  c.set("actorName", String(data.user.user_metadata?.full_name ?? "").trim().slice(0, 100));
  await next();
});

// Best-effort audit trail; a logging failure must never block the admin's action.
async function logActivity(c: { get(key: "ownerEmail" | "role" | "actorName"): string }, action: string, area: string, details: string[] = []) {
  try {
    const at = new Date().toISOString();
    const id = `${at}-${crypto.randomUUID().slice(0, 8)}`;
    const entry: ActivityEntry = { id, at, actor: c.get("ownerEmail"), actorName: c.get("actorName"), role: c.get("role"), action, area, details };
    await kv.set(`eb:audit:${id}`, entry);
  } catch (error) {
    console.error("Activity log failed:", (error as Error).message);
  }
}

app.get(`${base}/admin/activity`, async (c) => {
  const entries: ActivityEntry[] = await kv.getByPrefix("eb:audit:");
  entries.sort((a, b) => b.at.localeCompare(a.at));
  return c.json({ entries: entries.slice(0, activityLimit) });
});

app.get(`${base}/admin/session`, (c) =>
  c.json({ email: c.get("ownerEmail"), role: c.get("role") }));

app.get(`${base}/admin/team`, async (c) => {
  return c.json({ accounts: await listAccountReviews(db().auth.admin, kv, c.get("ownerEmail")) });
});

app.put(`${base}/admin/team`, async (c) => {
  const body = await c.req.json().catch(() => null);
  await approveAccount(db().auth.admin, kv, c.get("ownerEmail"), body?.userId, body?.role);
  const target = await db().auth.admin.getUserById(String(body?.userId));
  await logActivity(c, `Set ${body?.role} access`, "Team access", [target.data.user?.email ?? String(body?.userId)]);
  return c.json({ ok: true });
});

app.delete(`${base}/admin/team/:userId`, async (c) => {
  const userId = c.req.param("userId");
  const target = await db().auth.admin.getUserById(userId);
  await deleteAccount(db().auth.admin, kv, c.get("ownerEmail"), userId);
  await logActivity(c, "Deleted account", "Team access", [target.data.user?.email ?? userId]);
  return c.json({ ok: true });
});

app.get(`${base}/public/content`, async (c) => {
  c.header("Cache-Control", "no-store, max-age=0");
  return c.json({ content: (await kv.get(contentKey)) ?? null });
});

app.put(`${base}/admin/content`, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!validContent(body?.content)) return c.json({ error: "Invalid website content." }, 400);
  const previous = await kv.get(contentKey);
  await kv.set(contentKey, body.content);
  const { area, details } = describeContentChange(previous ?? null, body.content);
  if (details.length) await logActivity(c, "Saved website changes", area, details);
  return c.json({ ok: true });
});

app.post(`${base}/public/submit`, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !["join", "newsletter"].includes(body.type)) {
    return c.json({ error: "Invalid submission type." }, 400);
  }
  const fields = body.type === "join" ? ["name", "email", "studentId", "batch"] : ["email"];
  const data: Record<string, string> = {};
  for (const key of fields) {
    const value = body.data?.[key];
    if (typeof value !== "string" || !value.trim() || value.length > 250) {
      return c.json({ error: `Please enter a valid ${key}.` }, 400);
    }
    data[key] = value.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return c.json({ error: "Please enter a valid email address." }, 400);
  }
  // Stable keys deduplicate repeat submissions without exposing the email in keys.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.email.toLowerCase()));
  const id = `${body.type}-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
  const key = `eb:submission:${id}`;
  if (!await kv.get(key)) {
    await kv.set(key, { id, type: body.type, data, createdAt: new Date().toISOString() });
  }
  return c.json({ ok: true });
});

app.get(`${base}/admin/submissions`, async (c) => {
  const submissions = await kv.getByPrefix("eb:submission:");
  submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return c.json({ submissions });
});

app.delete(`${base}/admin/submissions/:id`, async (c) => {
  const id = c.req.param("id");
  if (!/^(join|newsletter)-[a-f0-9]{64}$/.test(id)) return c.json({ error: "Invalid submission ID." }, 400);
  const removed = await kv.get(`eb:submission:${id}`);
  await kv.del(`eb:submission:${id}`);
  await logActivity(c, "Deleted inbox entry", "Inbox", [
    `${removed?.type === "join" ? "Join request" : "Newsletter subscriber"}: ${removed?.data?.email ?? id}`]);
  return c.json({ ok: true });
});

app.post(`${base}/public/visit`, async (c) => {
  const body = await c.req.json().catch(() => null);
  const paths = ["/", "/leadership/former-presidents", "/leadership/former-general-secretaries",
    "/leadership/previous-executive-committees", "/leadership/faculty-advisors"];
  if (!body || !paths.includes(body.path) || typeof body.newVisitor !== "boolean") {
    return c.json({ error: "Invalid page visit." }, 400);
  }
  const date = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
  // Independent records avoid lost increments when visitors arrive simultaneously.
  // No IP address, email, or browser fingerprint is stored.
  await kv.set(`eb:visit:${date}:${crypto.randomUUID()}`, {
    date, path: body.path, newVisitor: body.newVisitor,
  });
  return c.json({ ok: true });
});

app.get(`${base}/admin/visits`, async (c) => {
  const count = Number(c.req.query("days") ?? 30);
  if (!Number.isInteger(count) || count < 1 || count > 90) {
    return c.json({ error: "Choose between 1 and 90 days." }, 400);
  }
  const now = Date.now() + 6 * 3600 * 1000;
  const days = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const date = new Date(now - (count - 1 - index) * 86400000).toISOString().slice(0, 10);
    const visits = await kv.getByPrefix(`eb:visit:${date}:`);
    const pages: Record<string, number> = {};
    for (const visit of visits) pages[visit.path] = (pages[visit.path] ?? 0) + 1;
    return { date, views: visits.length, visitors: visits.filter(visit => visit.newVisitor).length, pages };
  }));
  return c.json({ days });
});

app.post(`${base}/admin/upload`, async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    return c.json({ error: "Choose an image up to 5 MB." }, 400);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!isPng && !isJpeg) return c.json({ error: "Please upload a JPG or PNG image." }, 400);
  const storage = db().storage;
  const { data: existing, error: lookupError } = await storage.getBucket(bucket);
  if (!existing) {
    const { error } = await storage.createBucket(bucket, {
      public: true, fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png"],
    });
    // Another simultaneous upload may have created the bucket.
    if (error) {
      const { data: created } = await storage.getBucket(bucket);
      if (!created) throw new Error(error.message || lookupError?.message);
    }
  }
  const path = `${crypto.randomUUID()}.${isPng ? "png" : "jpg"}`;
  const { error } = await storage.from(bucket).upload(path, bytes, {
    contentType: isPng ? "image/png" : "image/jpeg", upsert: false,
  });
  if (error) throw error;
  await logActivity(c, "Uploaded image", "Uploads", [`${isPng ? "PNG" : "JPG"} · ${Math.round(file.size / 1024)} KB`]);
  return c.json({ url: storage.from(bucket).getPublicUrl(path).data.publicUrl });
});

Deno.serve(app.fetch);
