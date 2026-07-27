import { describe, expect, test } from 'vite-plus/test'

import { catalogSeedTarget } from './catalog-seed-target.ts'

describe('catalog seed target selection', () => {
  test('accepts local D1 data without a remote bucket', () => {
    expect(catalogSeedTarget(['--environment', 'local', '--only', 'data'], {})).toEqual({
      environment: 'local',
      scope: 'data',
    })
  })

  test('accepts isolated ДУНД remote data without a media bucket', () => {
    expect(
      catalogSeedTarget(['--environment', 'production', '--only', 'data'], {}, 'demo-solid-store'),
    ).toEqual({ environment: 'production', scope: 'data' })
  })

  test('accepts local and remote ДУНД static media synchronization without an R2 bucket', () => {
    expect(
      catalogSeedTarget(['--environment', 'local', '--only', 'media'], {}, 'demo-solid-store'),
    ).toEqual({ environment: 'local', scope: 'media' })
    expect(
      catalogSeedTarget(['--environment', 'production', '--only', 'media'], {}, 'demo-solid-store'),
    ).toEqual({ environment: 'production', scope: 'media' })
  })

  test('requires an explicit development environment and bucket', () => {
    expect(
      catalogSeedTarget(['--environment', 'development', '--only', 'media'], {
        PLUGGED_MEDIA_BUCKET: 'plugged-development-media',
      }),
    ).toEqual({
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

  test('accepts production only with a bucket-specific confirmation', () => {
    expect(
      catalogSeedTarget(['--environment', 'production', '--only', 'data'], {
        PLUGGED_MEDIA_BUCKET: 'plugged',
        PLUGGED_PRODUCTION_CONFIRMATION: 'production:plugged',
      }),
    ).toEqual({ environment: 'production', scope: 'data', bucket: 'plugged' })
  })
})
