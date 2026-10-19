import type { SupabaseClient } from "@supabase/supabase-js"

export const adminSignInUrl = "https://ebclubiiuc.pages.dev/admin"
export const passwordResetUrl = `${adminSignInUrl}/reset-password`

export type AccountProfile = {
  name: string
  matricId: string
  email: string
  batch: string
}

export function normalizeAdminEmail(value: string): string {
  const email = value.trim().toLowerCase()
  if (email.length > 250 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.")
  }
  return email
}

export function validatePassword(password: string, confirmation: string) {
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
    throw new Error(
      "Use a password of at least 8 characters and no more than 72 bytes.",
    )
  }
  if (password !== confirmation) throw new Error("The passwords do not match.")
}

export async function registerAccount(
  auth: Pick<SupabaseClient["auth"], "signUp">,
  profile: AccountProfile,
  password: string,
  confirmation: string,
) {
  const email = normalizeAdminEmail(profile.email)
  const name = profile.name.trim()
  const matricId = profile.matricId.trim()
  const batch = profile.batch.trim()
  if (
    !name ||
    name.length > 100 ||
    !matricId ||
    matricId.length > 40 ||
    !batch ||
    batch.length > 50
  ) {
    throw new Error(
      "Enter your name, Matric ID and batch within the field limits.",
    )
  }
  validatePassword(password, confirmation)
  const { error } = await auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: adminSignInUrl,
      data: {
        full_name: name,
        matric_id: matricId,
        batch,
        club_access_request: true,
      },
    },
  })
  if (error) throw new Error(error.message)
}

export async function requestPasswordReset(
  auth: Pick<SupabaseClient["auth"], "resetPasswordForEmail">,
  email: string,
) {
  const { error } = await auth.resetPasswordForEmail(
    normalizeAdminEmail(email),
    {
      redirectTo: passwordResetUrl,
    },
  )
  if (error) throw new Error(error.message)
}

export async function saveResetPassword(
  auth: Pick<SupabaseClient["auth"], "getSession" | "updateUser">,
  password: string,
  confirmation: string,
) {
  validatePassword(password, confirmation)
  const { data, error: sessionError } = await auth.getSession()
  if (sessionError || !data.session)
    throw new Error("This reset link is invalid or expired. Request a new one.")
  const { error } = await auth.updateUser({ password })
  if (error) throw new Error(error.message)
}
