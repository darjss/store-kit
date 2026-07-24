import { api } from '~/client'

import { resultQueryOptions } from './result'

export const systemStatusOptions = () =>
  resultQueryOptions({
    queryKey: ['system', 'status'] as const,
    request: () => api.api.system.status.get(),
    mapValue: value => value,
  })
