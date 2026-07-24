import { describe, expect, test } from 'vite-plus/test'

import { catalogSeedTarget } from './catalog-seed-target.ts'

describe('catalog seed target selection', () => {
  test('accepts local D1 data without a remote bucket', () => {
    expect(catalogSeedTarget(['--environment', 'local', '--only', 'data'], {})).toEqual({
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

  test('accepts production only with a bucket-specific confirmation', () => {
    expect(
      catalogSeedTarget(['--environment', 'production', '--only', 'data'], {
        PLUGGED_MEDIA_BUCKET: 'plugged',
        PLUGGED_PRODUCTION_CONFIRMATION: 'production:plugged',
      }),
    ).toEqual({ environment: 'production', scope: 'data', bucket: 'plugged' })
  })
})
