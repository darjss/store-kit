import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { remoteMediaBaseUrl } from '@store-kit/contracts/media'

const appDirectory = resolve(import.meta.dirname, '../../apps/plugged')
const stateDirectory = resolve(appDirectory, '.astro/local-worker')
const pidPath = resolve(stateDirectory, 'pid')
const logPath = resolve(stateDirectory, 'worker.log')
const envPath = resolve(stateDirectory, 'worker.vars')
const localUrl = 'http://127.0.0.1:4321'
const productionMediaBaseUrl = 'https://plugged.storekitcdn.darjs.dev/'
const command = process.argv[2]

const readPid = () => {
  if (!existsSync(pidPath)) return undefined
  const pid = Number.parseInt(readFileSync(pidPath, 'utf8'), 10)
  return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined
}

const isRunning = (pid: number | undefined) => {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const waitForHealth = async (attempt = 0) => {
  try {
    const response = await fetch(`${localUrl}/api/system/status`)
    if (response.ok) return
  } catch {
    // Wrangler is still starting.
  }
  if (attempt >= 59) throw new Error(`Local Worker did not become healthy. Read ${logPath}.`)
  await new Promise(resolveDelay => setTimeout(resolveDelay, 250))
  return waitForHealth(attempt + 1)
}

const start = async () => {
  const currentPid = readPid()
  if (isRunning(currentPid))
    throw new Error(`Local Worker is already running with PID ${currentPid}.`)

  const mediaBaseUrl = remoteMediaBaseUrl(process.env.PLUGGED_LOCAL_MEDIA_BASE_URL ?? '')
  if (mediaBaseUrl === productionMediaBaseUrl) {
    throw new Error('Local browser development must not use the production media origin.')
  }

  const build = spawnSync('vp', ['exec', 'astro', 'build'], {
    cwd: appDirectory,
    stdio: 'inherit',
  })
  if (build.status !== 0) throw new Error('Astro build failed.')

  mkdirSync(stateDirectory, { recursive: true })
  writeFileSync(
    envPath,
    [
      'DEPLOYMENT_ENV=development',
      `PUBLIC_APP_URL=${localUrl}`,
      `PUBLIC_MEDIA_BASE_URL=${mediaBaseUrl}`,
      'QPAY_BASE_URL=https://merchant-sandbox.qpay.mn',
      '',
    ].join('\n'),
  )
  const log = openSync(logPath, 'w')
  const worker = spawn(
    'vp',
    [
      'exec',
      'wrangler',
      'dev',
      '--local',
      '--ip',
      '127.0.0.1',
      '--port',
      '4321',
      '--persist-to',
      '.wrangler/state',
      '--env-file',
      envPath,
      '--show-interactive-dev-session=false',
    ],
    {
      cwd: appDirectory,
      detached: true,
      stdio: ['ignore', log, log],
    },
  )
  if (!worker.pid) throw new Error('Wrangler did not return a process ID.')
  worker.unref()
  writeFileSync(pidPath, `${worker.pid}\n`)

  try {
    await waitForHealth()
  } catch (error) {
    process.kill(-worker.pid, 'SIGTERM')
    rmSync(pidPath, { force: true })
    throw error
  }
  process.stdout.write(`Local Worker is healthy at ${localUrl} (PID ${worker.pid}).\n`)
}

const status = () => {
  const pid = readPid()
  if (!isRunning(pid)) {
    rmSync(pidPath, { force: true })
    throw new Error('Local Worker is not running.')
  }
  process.stdout.write(`Local Worker is running at ${localUrl} (PID ${pid}).\n`)
}

const health = async () => {
  status()
  const response = await fetch(`${localUrl}/api/system/status`)
  if (!response.ok) throw new Error(`Local Worker health returned HTTP ${response.status}.`)
  process.stdout.write(`Health check passed with HTTP ${response.status}.\n`)
}

const logs = () => {
  if (!existsSync(logPath)) throw new Error('Local Worker has no log file.')
  process.stdout.write(readFileSync(logPath))
}

const stop = () => {
  const pid = readPid()
  if (!pid || !isRunning(pid)) {
    rmSync(pidPath, { force: true })
    throw new Error('Local Worker is not running.')
  }
  process.kill(-pid, 'SIGTERM')
  rmSync(pidPath, { force: true })
  process.stdout.write(`Stopped local Worker PID ${pid}.\n`)
}

switch (command) {
  case 'start':
    await start()
    break
  case 'status':
    status()
    break
  case 'health':
    await health()
    break
  case 'logs':
    logs()
    break
  case 'stop':
    stop()
    break
  default:
    throw new Error('Usage: plugged-local-worker.ts <start|status|health|logs|stop>')
}
