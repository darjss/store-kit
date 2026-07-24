export type CatalogSeedEnvironment = 'local' | 'development' | 'production'
export type CatalogSeedRemoteEnvironment = Exclude<CatalogSeedEnvironment, 'local'>
export type CatalogSeedScope = 'data' | 'media'

export type CatalogSeedTarget =
  | { environment: 'local'; scope: 'data' }
  | {
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
  const allowedArguments = new Set(['--environment', '--only'])
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
      'Usage: catalog-seed.ts --environment <local|development|production> --only <data|media>',
    )
  }

  if (selectedEnvironment === 'local') {
    if (scope !== 'data') throw new Error('Local catalog seeding writes D1 data only.')
    return { environment: selectedEnvironment, scope }
  }

  const bucket = environment.PLUGGED_MEDIA_BUCKET?.trim()
  if (!bucket) {
    throw new Error('PLUGGED_MEDIA_BUCKET must name the selected remote R2 bucket.')
  }

  if (selectedEnvironment === 'production') {
    const expectedConfirmation = `production:${bucket}`
    if (environment.PLUGGED_PRODUCTION_CONFIRMATION !== expectedConfirmation) {
      throw new Error(`Production requires PLUGGED_PRODUCTION_CONFIRMATION=${expectedConfirmation}`)
    }
  }

  return { environment: selectedEnvironment, scope, bucket }
}
