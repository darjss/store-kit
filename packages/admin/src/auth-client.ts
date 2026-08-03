import { createAuthClient } from 'better-auth/client'

const client = createAuthClient({
  baseURL: globalThis.location?.origin ?? 'http://localhost',
})

const assertSuccess = (error: { message?: string } | null) => {
  if (error) throw new Error(error.message ?? 'Authentication command failed.')
}

const signInWithGoogle = async () => {
  const { error } = await client.signIn.social({
    provider: 'google',
    callbackURL: '/admin',
  })

  assertSuccess(error)
}

const signOut = async () => {
  const { error } = await client.signOut()
  assertSuccess(error)
}

export const authCommand = { signInWithGoogle, signOut }
