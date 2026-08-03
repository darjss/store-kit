import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { createId, entityIdPrefixes } from '../ids'
import { typeIdCheck } from './typeid-check'

export const user = sqliteTable(
  'user',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => createId('authUser')),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  table => [
    primaryKey({ name: 'user_pk', columns: [table.id] }),
    uniqueIndex('user_email_unique').on(table.email),
    check('user_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.authUser)),
  ],
)

export const session = sqliteTable(
  'session',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => createId('authSession')),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  table => [
    primaryKey({ name: 'session_pk', columns: [table.id] }),
    uniqueIndex('session_token_unique').on(table.token),
    index('session_user_id_index').on(table.userId),
    check('session_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.authSession)),
  ],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => createId('authAccount')),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  table => [
    primaryKey({ name: 'account_pk', columns: [table.id] }),
    uniqueIndex('account_provider_account_unique').on(table.providerId, table.accountId),
    index('account_user_id_index').on(table.userId),
    check('account_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.authAccount)),
  ],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text('id')
      .notNull()
      .$defaultFn(() => createId('authVerification')),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  table => [
    primaryKey({ name: 'verification_pk', columns: [table.id] }),
    index('verification_identifier_index').on(table.identifier),
    check('verification_id_typeid_check', typeIdCheck(table.id, entityIdPrefixes.authVerification)),
  ],
)

export const authSchema = { user, session, account, verification }
