import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"

const { outputText } = ts.transpileModule(
  readFileSync(new URL("./account_access.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
)
const {
  approvedAccountRole,
  listAccountReviews,
  approveAccount,
  deleteAccount,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
)

const ownerEmail = "owner@example.com"
const applicant = {
  id: "applicant-id",
  email: "applicant@example.com",
  created_at: "2026-01-01",
  email_confirmed_at: "2026-01-01",
  user_metadata: {
    club_access_request: true,
    full_name: "Applicant",
    matric_id: "EB123",
    batch: "26",
    role: "owner",
    password: "must-never-be-returned",
  },
}
const owner = {
  id: "owner-id",
  email: ownerEmail,
  created_at: "2025-01-01",
  user_metadata: {},
}
const users = new Map([
  [applicant.id, applicant],
  [owner.id, owner],
])
const grants = new Map()
const operations = []
const store = {
  async get(key) {
    return grants.get(key)
  },
  async set(key, value) {
    operations.push("revoke-or-approve")
    grants.set(key, value)
  },
  async getByPrefix(prefix) {
    return [...grants]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
  },
}
const admin = {
  async listUsers({ page, perPage }) {
    return {
      data: {
        users: [...users.values()].slice((page - 1) * perPage, page * perPage),
      },
      error: null,
    }
  },
  async getUserById(id) {
    return {
      data: { user: users.get(id) ?? null },
      error: users.has(id) ? null : { message: "Not found" },
    }
  },
  async deleteUser(id) {
    operations.push("delete-auth")
    users.delete(id)
    return { error: null }
  },
}
assert.equal(approvedAccountRole(applicant), null)
let reviews = await listAccountReviews(admin, store, ownerEmail)
assert.equal(reviews.length, 1)
assert.equal(reviews[0].status, "pending")
assert.equal(reviews[0].matricId, "EB123")
assert.equal(reviews[0].role, null)
assert(!JSON.stringify(reviews).includes("must-never-be-returned"))
assert(!JSON.stringify(reviews).includes("user_metadata"))
await assert.rejects(
  approveAccount(admin, store, ownerEmail, applicant.id, "owner"),
  /valid role/,
)
await assert.rejects(
  approveAccount(admin, store, ownerEmail, owner.id, "admin"),
  /protected/,
)
await assert.rejects(
  deleteAccount(admin, store, ownerEmail, owner.id),
  /cannot be deleted/,
)
await approveAccount(admin, store, ownerEmail, applicant.id, "moderator")
let grant = await store.get(`eb:team:${applicant.email}`)
assert.equal(grant.userId, applicant.id)
assert.equal(approvedAccountRole(applicant, grant), "moderator")
assert.equal(
  approvedAccountRole({ ...applicant, id: "recreated-id" }, grant),
  null,
)
reviews = await listAccountReviews(admin, store, ownerEmail)
assert.equal(reviews[0].status, "approved")

operations.length = 0
await assert.rejects(
  deleteAccount(
    {
      ...admin,
      async deleteUser() {
        operations.push("delete-auth")
        return { error: { message: "Provider failure" } }
      },
    },
    store,
    ownerEmail,
    applicant.id,
  ),
  /Access was revoked/,
)
assert.deepEqual(operations, ["revoke-or-approve", "delete-auth"])
grant = await store.get(`eb:team:${applicant.email}`)
assert.equal(approvedAccountRole(applicant, grant), null)
assert.equal(
  (await listAccountReviews(admin, store, ownerEmail))[0].status,
  "removed",
)
await deleteAccount(admin, store, ownerEmail, applicant.id)
assert.equal(users.has(applicant.id), false)
assert.equal((await listAccountReviews(admin, store, ownerEmail)).length, 0)
const recreated = { ...applicant, id: "recreated-id" }
users.set(recreated.id, recreated)
assert.equal(approvedAccountRole(recreated, grant), null)
assert.equal(
  (await listAccountReviews(admin, store, ownerEmail))[0].status,
  "pending",
)

const legacy = {
  email: applicant.email,
  role: "admin",
  updatedAt: "2026-02-01",
}
assert.equal(approvedAccountRole(applicant, legacy), "admin")
assert.equal(
  approvedAccountRole({ ...applicant, created_at: "2026-03-01" }, legacy),
  null,
)
assert.equal(
  approvedAccountRole(applicant, { ...legacy, status: "removed" }),
  null,
)
const unrequested = {
  id: "unrequested",
  email: "unrequested@example.com",
  created_at: "2026-01-01",
  user_metadata: { role: "admin" },
}
users.set(unrequested.id, unrequested)
await assert.rejects(
  approveAccount(admin, store, ownerEmail, unrequested.id, "admin"),
  /not submitted/,
)
assert(
  !(await listAccountReviews(admin, store, ownerEmail)).some(
    (account) => account.userId === unrequested.id,
  ),
)
const incomplete = {
  ...applicant,
  id: "incomplete",
  email: "incomplete@example.com",
  user_metadata: { club_access_request: true },
}
users.set(incomplete.id, incomplete)
await assert.rejects(
  approveAccount(admin, store, ownerEmail, incomplete.id, "admin"),
  /missing required profile/,
)

const pages = []
await listAccountReviews(
  {
    ...admin,
    async listUsers({ page }) {
      pages.push(page)
      return {
        data: {
          users:
            page === 1
              ? Array.from({ length: 100 }, (_, index) => ({
                  ...unrequested,
                  id: `${index}`,
                }))
              : [recreated],
        },
        error: null,
      }
    },
  },
  store,
  ownerEmail,
)
assert.deepEqual(pages, [1, 2])
console.log(
  "PASS: pending/approved access, owner protection, ID-bound grants, private profile review, pagination, revocation-before-delete and deletion failures.",
)
