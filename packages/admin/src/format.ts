const mntNumber = new Intl.NumberFormat('mn-MN', {
  maximumFractionDigits: 0,
})

export const formatMnt = (value: number) => `${mntNumber.format(value)} ₮`
