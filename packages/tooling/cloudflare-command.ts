import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { remoteMediaBaseUrl } from '@store-kit/contracts/media'
import { parse } from 'jsonc-parser'

type DeploymentEnvironment = 'development' | 'production'
type Operation = 'deploy' | 'dry-run' | 'migrate' | 'rollback' | 'secret-names'

type WranglerEnvironment = {
  name?: string
  d1_databases?: { binding?: string; database_name?: string; database_id?: string }[]
  kv_namespaces?: { binding?: string; id?: string }[]
  vars?: Record<string, string>
}

type WranglerConfig = {
  env?: Record<string, WranglerEnvironment>
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const pluggedDirectory = resolve(projectRoot, 'apps/plugged')
const wranglerConfigPath = resolve(pluggedDirectory, 'wrangler.jsonc')
const productionMediaBaseUrl = 'https://plugged.storekitcdn.darjs.dev/'
const secretNames = [
  'QPAY_USERNAME',
  'QPAY_PASSWORD',
  'QPAY_INVOICE_CODE',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_ADMIN_USER_ID',
] as const

const argumentValue = (args: string[], name: string) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const args = process.argv.slice(2)
const environment = argumentValue(args, '--environment')
const operation = argumentValue(args, '--operation')
if (
  (environment !== 'development' && environment !== 'production') ||
  !['deploy', 'dry-run', 'migrate', 'rollback', 'secret-names'].includes(operation ?? '')
) {
  throw new Error(
    'Usage: cloudflare-command.ts --environment <development|production> --operation <deploy|dry-run|migrate|rollback|secret-names>',
  )
}

const selectedEnvironment: DeploymentEnvironment = environment
const selectedOperation = operation as Operation

if (
  selectedEnvironment === 'production' &&
  selectedOperation !== 'secret-names' &&
  process.env.PLUGGED_PRODUCTION_CONFIRMATION !== `production:${selectedOperation}`
) {
  throw new Error(
    `Production ${selectedOperation} requires PLUGGED_PRODUCTION_CONFIRMATION=production:${selectedOperation}`,
  )
}

const run = (
  command: string,
  commandArgs: string[],
  cwd = pluggedDirectory,
  environmentVariables = process.env,
) =>
  new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env: environmentVariables,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise()
      else
        reject(
          new Error(
            `${command} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`,
          ),
        )
    })
  })

if (selectedOperation === 'secret-names') {
  process.stdout.write(
    `${secretNames
      .map(
        name =>
          `vp exec wrangler secret put ${name} --env ${selectedEnvironment} --config apps/plugged/wrangler.jsonc`,
      )
      .join('\n')}\n`,
  )
  process.exit(0)
}

const config = parse(await readFile(wranglerConfigPath, 'utf8')) as WranglerConfig
const target = config.env?.[selectedEnvironment]
if (!target) {
  throw new Error(
    `wrangler.jsonc is missing env.${selectedEnvironment}; add explicit Worker, D1, KV, and media-domain configuration before running ${selectedOperation}.`,
  )
}

const d1 = target.d1_databases?.find(database => database.binding === 'DB')
const kvByBinding = new Map(target.kv_namespaces?.map(namespace => [namespace.binding, namespace]))
const missing = [
  !target.name && 'Worker name',
  (!d1?.database_name || !d1.database_id) && 'D1 database_name/database_id',
  !kvByBinding.get('CACHE')?.id && 'CACHE KV id',
  !kvByBinding.get('AUTH_KV')?.id && 'AUTH_KV id',
  !kvByBinding.get('SESSION')?.id && 'SESSION KV id',
  target.vars?.DEPLOYMENT_ENV !== selectedEnvironment && 'DEPLOYMENT_ENV',
  !target.vars?.PUBLIC_APP_URL && 'PUBLIC_APP_URL',
  !target.vars?.PUBLIC_MEDIA_BASE_URL && 'PUBLIC_MEDIA_BASE_URL',
  !target.vars?.QPAY_BASE_URL && 'QPAY_BASE_URL',
].filter(Boolean)
if (missing.length > 0) {
  throw new Error(`env.${selectedEnvironment} is not explicit. Missing: ${missing.join(', ')}.`)
}

const mediaBaseUrl = remoteMediaBaseUrl(target.vars!.PUBLIC_MEDIA_BASE_URL!)
if (
  (selectedEnvironment === 'production' && mediaBaseUrl !== productionMediaBaseUrl) ||
  (selectedEnvironment === 'development' && mediaBaseUrl === productionMediaBaseUrl)
) {
  throw new Error(`env.${selectedEnvironment} has an invalid media origin: ${mediaBaseUrl}`)
}

const wranglerEnvironmentArgs = ['--env', selectedEnvironment, '--config', wranglerConfigPath]

if (selectedOperation === 'migrate') {
  await run('vp', [
    'exec',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--remote',
    ...wranglerEnvironmentArgs,
  ])
} else if (selectedOperation === 'rollback') {
  const version = process.env.PLUGGED_ROLLBACK_VERSION?.trim()
  if (!version) throw new Error('PLUGGED_ROLLBACK_VERSION must name the Worker version to restore.')
  await run('vp', ['exec', 'wrangler', 'rollback', version, ...wranglerEnvironmentArgs])
} else {
  const bucket = process.env.PLUGGED_MEDIA_BUCKET?.trim()
  if (!bucket) throw new Error('PLUGGED_MEDIA_BUCKET must name the selected remote R2 bucket.')

  await run('vp', ['exec', 'wrangler', 'r2', 'bucket', 'info', bucket])
  await run('vp', ['exec', 'astro', 'build'], pluggedDirectory, {
    ...process.env,
    CLOUDFLARE_ENV: selectedEnvironment,
  })
  await run('vp', [
    'exec',
    'wrangler',
    'deploy',
    '--strict',
    ...(selectedOperation === 'dry-run'
      ? ['--dry-run', '--outdir', `.wrangler/dry-run/${selectedEnvironment}`]
      : []),
    ...wranglerEnvironmentArgs,
  ])
}
