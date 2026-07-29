type DatabaseModule = typeof import('@store-kit/db')
type CommerceModule = typeof import('./index')

export const provePublicNamespacesCompile = (db: DatabaseModule, storeKit: CommerceModule) => {
  void db.database.query.catalog.listPublishedProducts
  void db.database.query.catalog.createAdminProduct
  void db.database.query.catalog.attachAdminImage
  void db.database.query.cart.findVariants
  void db.database.query.checkout.insertOrder
  void db.database.query.dashboard.getOverview
  void db.database.query.orders.findPrivate
  void db.database.query.payments.findByOrderId
  void db.database.query.settings.getStore

  void storeKit.commerce.catalog.listProducts
  void storeKit.commerce.catalog.createAdminProduct
  void storeKit.commerce.catalog.createAdminVariant
  void storeKit.commerce.catalog.uploadAdminImage
  void storeKit.commerce.cart.validate
  void storeKit.commerce.checkout.createOrder
  void storeKit.commerce.dashboard.getOverview
  void storeKit.commerce.orders.getPrivateStatus
  void storeKit.commerce.payments.claimBankTransfer
  void storeKit.commerce.settings.getStore
  void storeKit.commerce.payments.refreshQPayPayment
  void storeKit.commerce.payments.handleQPayCallback
}
