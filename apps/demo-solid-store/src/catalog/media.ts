export const mediaUrl = (key: string) =>
  `/media/${key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')}`
