type DatabaseModule = typeof import('@store-kit/db')
type CommerceModule = typeof import('./index')

export const provePublicNamespacesCompile = (db: DatabaseModule, storeKit: CommerceModule) => {
  void db.query.catalog.listPublishedProducts
  void db.query.cart.findVariants
  void db.query.checkout.insertOrder
  void db.query.orders.findPrivate
  void db.query.payments.findByOrderId

  void storeKit.commerce.catalog.listProducts
  void storeKit.commerce.cart.validate
  void storeKit.commerce.checkout.createOrder
  void storeKit.commerce.orders.getPrivateStatus
  void storeKit.commerce.payments.claimBankTransfer
  void storeKit.commerce.payments.refreshQPayPayment
  void storeKit.commerce.payments.handleQPayCallback
}
