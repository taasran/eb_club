type AccountUser = {
  id: string
  email?: string
  email_confirmed_at?: string | null
  created_at: string
  user_metadata?: Record<string, unknown>
}
type Grant = {
  email: string
  userId?: string
  role?: string | null
  status?: string
  updatedAt?: string
}
type ApiError = { message: string }
type PageOptions = {
  page: number
  perPage: number
}
type UsersAdmin = {
  listUsers(options: PageOptions): Promise<{
    data: { users: AccountUser[] } | null
    error: ApiError | null
  }>
  getUserById(id: string): Promise<{
    data: { user: AccountUser | null }
    error: ApiError | null
  }>
  deleteUser(id: string): Promise<{ error: ApiError | null }>
}
type Store = {
  get(key: string): Promise<Grant | undefined>
  set(key: string, value: unknown): Promise<void>
  getByPrefix(prefix: string): Promise<Grant[]>
}

export class AccountAccessError extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 404 | 502,
  ) {
    super(message)
  }
}

// Never trust user_metadata for roles. Approval is a server-only, user-ID-bound grant.
export function approvedAccountRole(user: AccountUser, grant?: Grant) {
  if (!grant || (grant.role !== "admin" && grant.role !== "moderator"))
    return null
  if (grant.status && grant.status !== "approved") return null
  if (grant.userId) return grant.userId === user.id ? grant.role : null
  // Preserve existing accounts approved by the previous email-only flow.
  // A newly-created account must not inherit an older email-only grant.
  return !grant.status &&
    Date.parse(user.created_at) <= Date.parse(grant.updatedAt ?? "")
    ? grant.role
    : null
}

function profileText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 150) : ""
}

export async function listAccountReviews(
  admin: UsersAdmin,
  store: Store,
  ownerEmail: string,
) {
  const grants = new Map(
    (await store.getByPrefix("eb:team:")).map((grant) => [grant.email, grant]),
  )
  const accounts = []
  // Auth is the source of registered accounts; no password or token is returned.
  for (let page = 1; ; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 100 })
    if (error || !data)
      throw new AccountAccessError("Unable to load registered accounts.", 502)
    for (const user of data.users) {
      const email = user.email?.trim().toLowerCase()
      if (!email || email === ownerEmail.toLowerCase()) continue
      const grant = grants.get(email)
      const requested = user.user_metadata?.club_access_request === true
      if (!requested && !grant) continue
      const role = approvedAccountRole(user, grant)
      const removed = grant?.userId === user.id && grant.status === "removed"
      accounts.push({
        userId: user.id,
        email,
        name: profileText(user.user_metadata?.full_name),
        matricId: profileText(user.user_metadata?.matric_id),
        batch: profileText(user.user_metadata?.batch),
        status: role ? "approved" : removed ? "removed" : "pending",
        role,
        emailConfirmed: Boolean(user.email_confirmed_at),
        createdAt: user.created_at,
      })
    }
    if (data.users.length < 100) break
  }
  return accounts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function approveAccount(
  admin: UsersAdmin,
  store: Store,
  ownerEmail: string,
  userId: unknown,
  role: unknown,
) {
  if (
    typeof userId !== "string" ||
    !userId ||
    (role !== "admin" && role !== "moderator")
  ) {
    throw new AccountAccessError(
      "Choose a registered account and a valid role.",
      400,
    )
  }
  const { data, error } = await admin.getUserById(userId)
  if (error || !data.user?.email)
    throw new AccountAccessError("Registered account not found.", 404)
  const user = data.user
  const email = user.email!.trim().toLowerCase()
  if (email === ownerEmail.toLowerCase())
    throw new AccountAccessError("The owner's role is protected.", 403)
  const existing = await store.get(`eb:team:${email}`)
  if (user.user_metadata?.club_access_request !== true && !existing) {
    throw new AccountAccessError(
      "This account has not submitted an access request.",
      400,
    )
  }
  if (
    user.user_metadata?.club_access_request === true &&
    !["full_name", "matric_id", "batch"].every((key) =>
      profileText(user.user_metadata?.[key]),
    )
  ) {
    throw new AccountAccessError(
      "This registration is missing required profile details.",
      400,
    )
  }
  await store.set(`eb:team:${email}`, {
    email,
    userId: user.id,
    role,
    status: "approved",
    updatedAt: new Date().toISOString(),
    grantedBy: ownerEmail,
  })
}

export async function deleteAccount(
  admin: UsersAdmin,
  store: Store,
  ownerEmail: string,
  userId: string,
) {
  const { data, error } = await admin.getUserById(userId)
  if (error || !data.user?.email)
    throw new AccountAccessError(
      "Registered account not found. Refresh the list.",
      404,
    )
  const email = data.user.email.trim().toLowerCase()
  if (email === ownerEmail.toLowerCase())
    throw new AccountAccessError("The owner cannot be deleted.", 403)
  const existing = await store.get(`eb:team:${email}`)
  if (data.user.user_metadata?.club_access_request !== true && !existing) {
    throw new AccountAccessError("This is not a club dashboard account.", 400)
  }
  // Revoke access first: a failed Auth deletion must never leave active permissions.
  await store.set(`eb:team:${email}`, {
    email,
    userId,
    role: null,
    status: "removed",
    updatedAt: new Date().toISOString(),
  })
  const { error: deletionError } = await admin.deleteUser(userId)
  if (deletionError) {
    throw new AccountAccessError(
      "Access was revoked, but account deletion failed. Refresh and retry deleting the account.",
      502,
    )
  }
}
