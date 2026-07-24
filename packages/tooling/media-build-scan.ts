import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const buildDirectory = resolve(projectRoot, 'apps/plugged/dist')
const legacyMediaPath = ['/media', '/'].join('')

const entries = await readdir(buildDirectory, { recursive: true })
const outputFiles = entries
  .filter(entry => /\.(css|html|js|json|mjs)$/.test(entry))
  .map(entry => join(buildDirectory, entry))

if (outputFiles.length === 0) {
  throw new Error('Plugged build output is empty.')
}

const output = await Promise.all(
  outputFiles.map(async path => ({ path, source: await readFile(path, 'utf8') })),
)
const offenders = output
  .filter(({ source }) => source.includes(legacyMediaPath) || source.includes('handleMediaRequest'))
  .map(({ path }) => path)
const hasCloudflareTransformation = output.some(({ source }) => source.includes('/cdn-cgi/image/'))

if (offenders.length > 0) {
  throw new Error(`Legacy Worker media delivery found in build output:\n${offenders.join('\n')}`)
}
if (!hasCloudflareTransformation) {
  throw new Error('Cloudflare image transformation code is missing from the Plugged build.')
}

process.stdout.write(
  `Scanned ${outputFiles.length} Plugged build files; media delivery is direct.\n`,
)
