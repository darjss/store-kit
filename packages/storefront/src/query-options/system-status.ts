import { queryOptions } from '@tanstack/solid-query'

import { api, resultRequest } from '../client'

export const systemStatusOptions = () =>
  queryOptions({
    queryKey: ['system', 'status'],
    queryFn: () => resultRequest(api.api.system.status.get()),
  })
