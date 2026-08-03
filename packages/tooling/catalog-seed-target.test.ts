import { describe, expect, test } from 'vite-plus/test'

import { catalogSeedTarget } from './catalog-seed-target.ts'

describe('catalog seed target selection', () => {
  test('accepts local D1 data without a remote bucket', () => {
    expect(catalogSeedTarget(['--environment', 'local', '--only', 'data'], {})).toEqual({
      app: 'plugged',
      environment: 'local',
      scope: 'data',
    })
  })

  test('requires an explicit development environment and bucket', () => {
    expect(
      catalogSeedTarget(['--environment', 'development', '--only', 'media'], {
        PLUGGED_MEDIA_BUCKET: 'plugged-development-media',
      }),
    ).toEqual({
      app: 'plugged',
      environment: 'development',
      scope: 'media',
      bucket: 'plugged-development-media',
    })
  })

  test.each([
    [[], {}],
    [['--environment', 'local', '--only', 'media'], {}],
    [['--environment', 'development', '--only', 'media'], {}],
    [['--environment', 'production', '--only', 'media'], { PLUGGED_MEDIA_BUCKET: 'plugged' }],
    [
      ['--environment', 'production', '--only', 'media'],
      {
        PLUGGED_MEDIA_BUCKET: 'plugged',
        PLUGGED_PRODUCTION_CONFIRMATION: 'production:another-bucket',
      },
    ],
  ])('rejects missing or mismatched target selection', (args, environment) => {
    expect(() => catalogSeedTarget(args, environment)).toThrow()
  })

  test('rejects a different development bucket', () => {
    expect(() =>
      catalogSeedTarget(['--environment', 'development', '--only', 'media'], {
        PLUGGED_MEDIA_BUCKET: 'plugged',
      }),
    ).toThrow('Development media must use plugged-development-media')
  })

  test('selects the template-store target from --app', () => {
    expect(
      catalogSeedTarget(
        ['--environment', 'development', '--only', 'media', '--app', 'template-store'],
        { TEMPLATE_STORE_MEDIA_BUCKET: 'template-development-media' },
      ),
    ).toEqual({
      app: 'template-store',
      environment: 'development',
      scope: 'media',
      bucket: 'template-development-media',
    })
    expect(() =>
      catalogSeedTarget(
        ['--environment', 'production', '--only', 'media', '--app', 'unregistered-app'],
        { UNREGISTERED_APP_MEDIA_BUCKET: 'anything' },
      ),
    ).toThrow()
  })

  test('accepts production only with a bucket-specific confirmation', () => {
    expect(
      catalogSeedTarget(['--environment', 'production', '--only', 'data'], {
        PLUGGED_MEDIA_BUCKET: 'plugged',
        PLUGGED_PRODUCTION_CONFIRMATION: 'production:plugged',
      }),
    ).toEqual({ app: 'plugged', environment: 'production', scope: 'data', bucket: 'plugged' })
  })
})
