import { app } from '../packages/api/src/index'

export default {
  fetch: (request: Request) => app.handle(request),
}
