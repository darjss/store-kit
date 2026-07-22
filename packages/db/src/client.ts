import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'

import { catalogRelations } from './relations/catalog'

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
    }
  }
}

export const db = drizzle(env.DB, { relations: catalogRelations })
