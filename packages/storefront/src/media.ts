export const mediaUrl = (r2Key: string) =>
  `/media/${r2Key.split('/').map(encodeURIComponent).join('/')}`
