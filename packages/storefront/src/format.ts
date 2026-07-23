const mntFormatter = new Intl.NumberFormat('mn-MN', {
  style: 'currency',
  currency: 'MNT',
  maximumFractionDigits: 0,
})

export const formatMnt = (amount: number) => mntFormatter.format(amount)
