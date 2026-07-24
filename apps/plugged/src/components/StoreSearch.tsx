/* oxlint-disable tailwindcss/no-unknown-classes */
import { formatMnt } from '@store-kit/storefront/format'
import { CatalogSearch } from '@store-kit/storefront/search'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Input,
} from '@store-kit/ui'
import { Show } from 'solid-js'

import { ProductImage } from './ProductImage'
import StoreIcon from './StoreIcon'

export function StoreSearch(props: { initialOpen: boolean }) {
  return (
    <CatalogSearch.Root initialOpen={props.initialOpen}>
      <CatalogSearch.DialogState>
        {search => (
          <Dialog open={search.open()} onOpenChange={search.setOpen}>
            <DialogTrigger
              as={Button}
              variant="ghost"
              data-store-navigation-item
              ref={search.setTriggerElement}
              aria-label="Хайх"
            >
              <StoreIcon name="search" size={24} />
              <small>Хайх</small>
            </DialogTrigger>
            <DialogContent
              class="bg-orange! text-ink! fixed! inset-0! z-50! h-dvh! w-full! max-w-none! translate-none! transform-none! gap-0! overflow-y-auto! rounded-none! p-0! ring-0! outline-none! motion-reduce:animate-none!"
              showCloseButton={false}
              onOpenAutoFocus={event => {
                event.preventDefault()
                search.focusInput()
              }}
            >
              <header class="border-ink flex min-h-30 items-start justify-between gap-4 border-b-[5px] p-[clamp(1rem,3vw,2.5rem)]">
                <div>
                  <DialogTitle class="font-display text-[clamp(3.8rem,10vw,6rem)] leading-[0.72] tracking-[-0.02em]">
                    ЮУ СОНСОХ ВЭ?
                  </DialogTitle>
                  <DialogDescription class="text-ink! mt-2 mb-0 font-extrabold">
                    IEM, DAC эсвэл cable нэрээр хайна уу.
                  </DialogDescription>
                </div>
                <DialogClose
                  as={Button}
                  variant="outline"
                  class="border-ink bg-paper-clean text-ink min-h-12 min-w-20 rounded-none border-3 font-black"
                  aria-label="Хайлт хаах"
                >
                  ХААХ ×
                </DialogClose>
              </header>
              <label
                class="border-ink bg-paper-clean grid min-h-22 grid-cols-[auto_1fr] items-center gap-4 border-b-[5px] px-[clamp(1rem,3vw,2.5rem)] py-3"
                for="store-search"
              >
                <span class="sr-only">Бараа хайх</span>
                <StoreIcon name="search" size={30} />
                <CatalogSearch.Input>
                  {input => (
                    <Input
                      ref={input.setInputElement}
                      class="text-ink placeholder:text-ink/75 min-h-11 min-w-0 rounded-none border-0 bg-transparent text-[clamp(1.5rem,5vw,3rem)] font-black shadow-none outline-none"
                      id="store-search"
                      value={input.value()}
                      onInput={input.onInput}
                      placeholder="IEM, DAC, cable…"
                      autocomplete="off"
                    />
                  )}
                </CatalogSearch.Input>
              </label>
              <div class="grid gap-0 p-[clamp(0.75rem,2vw,1.5rem)]" aria-live="polite">
                <CatalogSearch.Results
                  prompt={() => (
                    <p class="m-0 grid min-h-48 place-items-center text-center text-xl font-extrabold">
                      Хоёр ба түүнээс олон үсэг бичнэ үү.
                    </p>
                  )}
                  pending={() => (
                    <p class="m-0 grid min-h-48 place-items-center text-center text-xl font-extrabold">
                      Каталог ухаж байна…
                    </p>
                  )}
                  error={() => (
                    <p class="m-0 grid min-h-48 place-items-center text-center text-xl font-extrabold">
                      Хайлт ажилласангүй. Дахин оролдоно уу.
                    </p>
                  )}
                  empty={() => (
                    <p class="m-0 grid min-h-48 place-items-center text-center text-xl font-extrabold">
                      Тохирох бараа олдсонгүй.
                    </p>
                  )}
                >
                  {product => {
                    const image = product.images[0]
                    const variant = product.variants[0]
                    return (
                      <a
                        class="border-ink bg-paper-clean hover:bg-acid focus-visible:bg-acid grid min-h-30 grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-[clamp(0.75rem,2vw,1.5rem)] border-4 border-b-0 p-3 no-underline last:border-b-4 max-md:grid-cols-[5.5rem_minmax(0,1fr)]"
                        href={`/products/${product.slug}`}
                      >
                        <Show when={image}>
                          {item => (
                            <ProductImage
                              class="h-22.5 w-30 object-contain max-md:h-16.5 max-md:w-22"
                              image={item()}
                              layout="thumbnail"
                            />
                          )}
                        </Show>
                        <span class="grid min-w-0">
                          <strong class="text-[clamp(1.1rem,3vw,1.8rem)] leading-[1.05]">
                            {product.name}
                          </strong>
                          <small class="overflow-hidden text-ellipsis whitespace-nowrap">
                            {product.shortDescription}
                          </small>
                        </span>
                        <b class="border-ink bg-acid border-3 p-2 tabular-nums max-md:col-2 max-md:justify-self-start">
                          {variant ? formatMnt(variant.priceMnt) : '—'}
                        </b>
                      </a>
                    )
                  }}
                </CatalogSearch.Results>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CatalogSearch.DialogState>
    </CatalogSearch.Root>
  )
}
