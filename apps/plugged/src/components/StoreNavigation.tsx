/* oxlint-disable tailwindcss/no-unknown-classes */
import type { JSX } from 'solid-js'

export function StoreNavigation(props: {
  home?: JSX.Element
  shop?: JSX.Element
  search: JSX.Element
  cart: JSX.Element
}) {
  return (
    <nav
      class="border-ink bg-paper-clean text-ink max-md:border-orange max-md:bg-ink max-md:text-paper fixed top-[0.45rem] right-3 z-30 flex border-3 *:data-store-navigation-item:wrap-anywhere max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:grid max-md:min-h-[calc(68px+env(safe-area-inset-bottom))] max-md:grid-cols-4 max-md:border-0 max-md:border-t-4 max-md:pb-[env(safe-area-inset-bottom)] [&>[data-store-navigation-item]]:relative [&>[data-store-navigation-item]]:grid [&>[data-store-navigation-item]]:min-h-11 [&>[data-store-navigation-item]]:min-w-24 [&>[data-store-navigation-item]]:place-items-center [&>[data-store-navigation-item]]:content-center [&>[data-store-navigation-item]]:rounded-none [&>[data-store-navigation-item]]:border-0 [&>[data-store-navigation-item]]:border-r [&>[data-store-navigation-item]]:border-white/25 [&>[data-store-navigation-item]]:bg-transparent [&>[data-store-navigation-item]]:px-2 [&>[data-store-navigation-item]]:py-1 [&>[data-store-navigation-item]]:text-center [&>[data-store-navigation-item]]:leading-tight [&>[data-store-navigation-item]]:text-inherit [&>[data-store-navigation-item]]:no-underline [&>[data-store-navigation-item]]:shadow-none max-md:[&>[data-store-navigation-item]]:min-h-16 max-md:[&>[data-store-navigation-item]]:min-w-0 max-md:[&>[data-store-navigation-item]]:px-1 [&>[data-store-navigation-item]>small]:max-w-full [&>[data-store-navigation-item]>small]:font-extrabold [&>[data-store-navigation-item]>small]:wrap-anywhere [&>[data-store-navigation-secondary]]:hidden max-md:[&>[data-store-navigation-secondary]]:grid"
      aria-label="Үндсэн цэс"
    >
      <a data-store-navigation-item data-store-navigation-secondary href="/" aria-label="Нүүр">
        {props.home}
        <small>Нүүр</small>
      </a>
      <a
        data-store-navigation-item
        data-store-navigation-secondary
        href="/products"
        aria-label="Дэлгүүр"
      >
        {props.shop}
        <small>Дэлгүүр</small>
      </a>
      {props.search}
      {props.cart}
    </nav>
  )
}
