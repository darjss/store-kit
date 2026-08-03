import { eq } from 'drizzle-orm'

import { db } from '../client'
import { user } from '../schema/auth'

const isApproved = async (userId: string) => {
  const [record] = await db
    .select({ approved: user.approved })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return record?.approved ?? false
}

export const authQuery = { isApproved }
