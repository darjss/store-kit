export const createQPayCallbackUrl = (appUrl: string, paymentLookupId: string) => {
  const callbackUrl = new URL('/api/webhooks/qpay', appUrl)
  callbackUrl.searchParams.set('payment_id', paymentLookupId)
  return callbackUrl.toString()
}

export const qpayPaymentCheckBody = (invoiceId: string) => ({
  object_type: 'INVOICE' as const,
  object_id: invoiceId,
  offset: { page_number: 1, page_limit: 100 },
})
