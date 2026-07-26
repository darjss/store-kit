const mnt = new Intl.NumberFormat('mn-MN', {
  style: 'currency',
  currency: 'MNT',
  maximumFractionDigits: 0,
})

export const formatMnt = (value: number) => mnt.format(value)
