import { queryOptions } from '@tanstack/solid-query'

import { api } from '../client'
import { unwrapEdenResult } from '../result'

export const systemStatusOptions = () =>
  queryOptions({
    queryKey: ['system', 'status'],
    queryFn: async () => unwrapEdenResult(await api.api.system.status.get()),
  })
