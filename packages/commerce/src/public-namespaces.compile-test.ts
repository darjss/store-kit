type DatabaseModule = typeof import('@store-kit/db')
type CommerceModule = typeof import('./index')

export const provePublicNamespacesCompile = (db: DatabaseModule, storeKit: CommerceModule) => {
  void db.database.query.catalog.listPublishedProducts
  void db.database.query.cart.findVariants
  void db.database.query.checkout.insertOrder
  void db.database.query.orders.findPrivate
  void db.database.query.payments.findByOrderId

  void storeKit.commerce.catalog.listProducts
  void storeKit.commerce.cart.validate
  void storeKit.commerce.checkout.createOrder
  void storeKit.commerce.orders.getPrivateStatus
  void storeKit.commerce.payments.claimBankTransfer
  void storeKit.commerce.payments.refreshQPayPayment
  void storeKit.commerce.payments.handleQPayCallback
}
