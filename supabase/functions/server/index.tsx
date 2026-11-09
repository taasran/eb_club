import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { bodyLimit } from "npm:hono/body-limit";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
import { validContent, isOwner, canAccess, type Role } from "./validation.ts";
import { describeContentChange, type ActivityEntry } from "./audit.ts";
import { approvedAccountRole, listAccountReviews, approveAccount, deleteAccount, AccountAccessError } from "./account_access.ts";
import { createFacebookFeed } from "./facebook.ts";
import { createFacebookArchive, FacebookArchiveError } from "./facebook_archive.ts";
import { createRequestLimiter, publicQuota, adminQuota, SecurityLimitError, validSubmission } from "./security.ts";

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

const limitRequest = createRequestLimiter({
  slots: async (prefix) => {
    const { data, error } = await db().from("kv_store_ad6cf477").select("key").like("key", `${prefix}%`);
    if (error) throw new Error("Quota lookup failed.");
    return (data ?? []).map((row) => row.key);
  },
  reserve: async (key) => {
    const { error } = await db().from("kv_store_ad6cf477").insert({ key, value: true });
    if (error?.code === "23505") return false;
    if (error) throw new Error("Quota reservation failed.");
    return true;
  },
  prune: async (before) => {
    const { error } = await db().from("kv_store_ad6cf477").delete().gte("key", "eb:security:rate:").lt("key", before);
    if (error) throw new Error("Quota cleanup failed.");
  },
});

app.use("/*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  c.header("Cache-Control", "no-store");
  await next();
});
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Retry-After"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use("/*", bodyLimit({
  maxSize: 6 * 1024 * 1024,
  onError: (c) => c.json({ error: "Request is too large." }, 413),
}));
app.onError((error, c) => {
  if (error instanceof SecurityLimitError) {
    c.header("Retry-After", String(error.retryAfter));
    return c.json({ error: error.message }, error.status);
  }
  if (error instanceof AccountAccessError) return c.json({ error: error.message }, error.status);
  if (error instanceof FacebookArchiveError) return c.json({ error: error.message }, error.status);
  // Never send database details or credentials to the browser.
  console.error("Club API request failed.");
  return c.json({ error: "The server could not complete this request. Please try again." }, 500);
});
app.notFound((c) => c.json({ error: "API route not found. Deploy the latest club backend." }, 404));

app.use(`${base}/public/*`, bodyLimit({
  maxSize: 4096,
  onError: (c) => c.json({ error: "Public form requests must be smaller than 4 KB." }, 413),
}));
app.use(`${base}/public/*`, async (c, next) => {
  if (c.req.method === "POST") {
    const quota = publicQuota(c.req.path);
    if (quota) {
      if (!c.req.header("Content-Type")?.toLowerCase().startsWith("application/json")) {
        return c.json({ error: "Send this request as JSON." }, 415);
      }
      await limitRequest(quota);
    }
  }
  await next();
});

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
  if (token.length > 8192) return c.json({ error: "Invalid session." }, 401);
  // Bound Auth lookups too; origin headers are not an authorization mechanism.
  await limitRequest({ scope: "admin-auth", limit: 600, windowMs: 60000 });
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
  await limitRequest(adminQuota(c.req.path, c.req.method), data.user.id);
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
    console.error("Activity log failed.");
  }
}

const facebookArchive = createFacebookArchive({
  config: () => ({
    pageId: Deno.env.get("FACEBOOK_PAGE_ID"),
    token: Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN"),
  }),
  cache: kv,
  storeImage: async (bytes, contentType, filename) => {
    const storage = db().storage;
    const options = {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    };
    const { data: existing } = await storage.getBucket(bucket);
    if (!existing) {
      const { error } = await storage.createBucket(bucket, options);
      if (error && !(await storage.getBucket(bucket)).data) throw new Error("Image storage could not be prepared.");
    } else if (!existing.allowed_mime_types?.includes("image/webp")) {
      const { error } = await storage.updateBucket(bucket, options);
      if (error) throw new Error("Image storage could not be updated.");
    }
    const { error } = await storage.from(bucket).upload(filename, bytes, { contentType, upsert: true });
    if (error) throw new Error("The Facebook image could not be saved to club storage.");
    return storage.from(bucket).getPublicUrl(filename).data.publicUrl;
  },
});

// Both archive routes are behind the existing verified/approved admin middleware.
app.get(`${base}/admin/facebook/history`, async (c) =>
  c.json(await facebookArchive.read(c.get("ownerEmail"), c.req.query("cursor"))));

app.post(`${base}/admin/facebook/import`, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (typeof body?.photoId !== "string") return c.json({ error: "Choose a scanned Facebook photo." }, 400);
  const photo = await facebookArchive.importPhoto(body.photoId);
  await logActivity(c, "Imported Facebook photo", "Activity photos", [body.photoId]);
  return c.json({ photo });
});

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
  const submission = validSubmission(body);
  if (!submission) return c.json({ error: "Please enter valid submission details without control characters." }, 400);
  const { type, data } = submission;
  // Stable keys deduplicate repeat submissions without exposing the email in keys.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.email.toLowerCase()));
  const id = `${type}-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
  const key = `eb:submission:${id}`;
  const { error } = await db().from("kv_store_ad6cf477").upsert(
    { key, value: { id, type, data, createdAt: new Date().toISOString() } },
    { onConflict: "key", ignoreDuplicates: true },
  );
  if (error) throw new Error("Submission could not be stored.");
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
