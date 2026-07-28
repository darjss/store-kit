export const moshpitHomeCopy = 'Утастай сонсгол'
export const moshpitProductSlug = 'tangzu-waner-2-red-lion'
export const moshpitCutoutPath = `/cut/${moshpitProductSlug}.webp`

const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const requiredMoshpitCutout = (homeHtml: string) => {
  if (!homeHtml.includes(moshpitHomeCopy)) {
    throw new Error(`Home HTML is missing the moshpit copy: ${moshpitHomeCopy}.`)
  }

  const cutout = homeHtml.match(
    new RegExp(`<img\\b[^>]*\\bsrc=(["'])(${escapeForRegex(moshpitCutoutPath)})\\1`, 'u'),
  )?.[2]
  if (!cutout) {
    throw new Error(`Home HTML is missing the moshpit cutout: ${moshpitCutoutPath}.`)
  }
  return cutout
}

export const remoteCatalogImage = (catalogText: string, mediaBaseUrl: string) => {
  if (!catalogText.includes(moshpitProductSlug)) {
    throw new Error(`Catalog response is missing ${moshpitProductSlug}.`)
  }

  const image = catalogText.match(new RegExp(`${escapeForRegex(mediaBaseUrl)}[^"\\\\]+`))?.[0]
  if (!image) throw new Error('Catalog response contains no selected remote R2 image.')
  return image
}
