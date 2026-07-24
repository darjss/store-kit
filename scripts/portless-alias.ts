import { execFileSync } from 'node:child_process'

const routeName = process.argv[2]
if (!routeName || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(routeName)) {
  throw new Error('Usage: portless-alias.ts <route-name>')
}

const status = execFileSync('vp', ['exec', 'astro', 'dev', 'status'], {
  encoding: 'utf8',
})
const url = status.match(/https?:\/\/[^:\s]+:(\d+)/)
if (!url?.[1]) {
  throw new Error('Astro is not running in background mode. Start it before you register a route.')
}

execFileSync('vp', ['exec', 'portless', 'alias', routeName, url[1], '--force'], {
  stdio: 'inherit',
})
