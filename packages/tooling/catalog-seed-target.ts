export type CatalogSeedEnvironment = 'local' | 'development' | 'production'
export type CatalogSeedRemoteEnvironment = Exclude<CatalogSeedEnvironment, 'local'>

export const pluggedDevelopmentMediaBucket = 'plugged-development-media'
export const pluggedDevelopmentMediaBaseUrl = 'https://storekitcdn.plugged.darjs.dev/'
export type CatalogSeedScope = 'data' | 'media'

export const developmentMediaBuckets: Record<string, string> = {
  'plugged': 'plugged-development-media',
  'template-store': 'template-development-media',
}

export type CatalogSeedTarget =
  | { app: string; environment: 'local'; scope: 'data' }
  | {
      app: string
      environment: CatalogSeedRemoteEnvironment
      scope: CatalogSeedScope
      bucket: string
    }

const argumentValue = (args: string[], name: string) => {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  if (args[index + 1] === undefined || args[index + 1]?.startsWith('--')) {
    throw new Error(`${name} requires a value.`)
  }
  if (args.includes(name, index + 1)) {
    throw new Error(`${name} may be provided only once.`)
  }
  return args[index + 1]
}

export const catalogSeedTarget = (
  args: string[],
  environment: Record<string, string | undefined>,
): CatalogSeedTarget => {
  const selectedEnvironment = argumentValue(args, '--environment')
  const scope = argumentValue(args, '--only')
  const app = argumentValue(args, '--app') ?? 'plugged'
  const allowedArguments = new Set(['--environment', '--only', '--app'])
  const unknown = args.filter(
    (argument, index) => !allowedArguments.has(argument) && !allowedArguments.has(args[index - 1]!),
  )

  if (
    unknown.length > 0 ||
    (selectedEnvironment !== 'local' &&
      selectedEnvironment !== 'development' &&
      selectedEnvironment !== 'production') ||
    (scope !== 'data' && scope !== 'media')
  ) {
    throw new Error(
      'Usage: catalog-seed.ts --environment <local|development|production> --only <data|media> [--app <name>]',
    )
  }
  if (!/^[a-z0-9-]+$/.test(app)) {
    throw new Error(`--app must match apps/<name>: ${app}`)
  }

  if (selectedEnvironment === 'local') {
    if (scope !== 'data') throw new Error('Local catalog seeding writes D1 data only.')
    return { app, environment: selectedEnvironment, scope }
  }

  const variablePrefix = app.toUpperCase().replaceAll('-', '_')
  const bucketVariable = `${variablePrefix}_MEDIA_BUCKET`
  const bucket = environment[bucketVariable]?.trim()
  if (!bucket) {
    throw new Error(`${bucketVariable} must name the selected remote R2 bucket.`)
  }

  const developmentBucket = developmentMediaBuckets[app]
  if (selectedEnvironment === 'development') {
    if (!developmentBucket) {
      throw new Error(`No development media bucket pin for app: ${app}`)
    }
    if (bucket !== developmentBucket) {
      throw new Error(`Development media must use ${developmentBucket}.`)
    }
  }

  if (selectedEnvironment === 'production') {
    const expectedConfirmation = `production:${bucket}`
    const confirmationVariable = `${variablePrefix}_PRODUCTION_CONFIRMATION`
    if (environment[confirmationVariable] !== expectedConfirmation) {
      throw new Error(`Production requires ${confirmationVariable}=${expectedConfirmation}`)
    }
  }

  return { app, environment: selectedEnvironment, scope, bucket }
}
