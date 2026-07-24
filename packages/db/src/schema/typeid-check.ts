import { sql } from 'drizzle-orm'
import type { SQLWrapper } from 'drizzle-orm'

import type { EntityIdPrefix } from '../ids.ts'

const suffixCharacters = '0123456789abcdefghjkmnpqrstvwxyz'

export const typeIdCheck = (column: SQLWrapper, prefix: EntityIdPrefix) => {
  const prefixWithSeparator = `${prefix}_`
  const suffixStart = prefixWithSeparator.length + 1
  const suffixRestStart = suffixStart + 1
  const totalLength = prefixWithSeparator.length + 26

  return sql`length(${column}) = ${sql.raw(String(totalLength))}
    and substr(${column}, 1, ${sql.raw(String(prefixWithSeparator.length))}) = ${sql.raw(`'${prefixWithSeparator}'`)}
    and substr(${column}, ${sql.raw(String(suffixStart))}, 1) glob '[0-7]'
    and substr(${column}, ${sql.raw(String(suffixRestStart))}) not glob ${sql.raw(`'*[^${suffixCharacters}]*'`)}`
}
