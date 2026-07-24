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
              class="bg-petrol! text-paper! fixed! inset-0! z-50! h-dvh! w-full! max-w-none! translate-none! transform-none! gap-0! overflow-y-auto! rounded-none! p-0! ring-0! outline-none! motion-reduce:animate-none!"
              showCloseButton={false}
              onOpenAutoFocus={event => {
                event.preventDefault()
                search.focusInput()
              }}
            >
              <header class="border-paper-clean bg-ink flex min-h-24 items-start justify-between gap-4 border-b-4 p-[clamp(1rem,3vw,2.5rem)]">
                <div>
                  <DialogTitle class="texture-paper clip-cut font-body text-ink inline-block px-4 py-2 text-[clamp(2rem,7vw,4rem)] leading-[0.9] font-black tracking-[-0.035em]">
                    ЮУ СОНСОХ ВЭ?
                  </DialogTitle>
                  <DialogDescription class="text-paper! mt-2 mb-0 font-extrabold">
                    IEM, DAC эсвэл брэндийн нэрээр хайна уу.
                  </DialogDescription>
                </div>
                <DialogClose
                  as={Button}
                  variant="outline"
                  class="border-paper-clean bg-paper-clean text-ink min-h-12 min-w-20 rounded-none border-3 font-black"
                  aria-label="Хайлт хаах"
                >
                  ХААХ ×
                </DialogClose>
              </header>
              <label
                class="border-cyan bg-paper-clean text-ink grid min-h-22 grid-cols-[auto_1fr] items-center gap-4 border-b-4 px-[clamp(1rem,3vw,2.5rem)] py-3"
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
                      placeholder="IEM, DAC, брэнд…"
                      autocomplete="off"
                    />
                  )}
                </CatalogSearch.Input>
              </label>
              <div class="grid gap-0 p-[clamp(0.75rem,2vw,1.5rem)]" aria-live="polite">
                <CatalogSearch.Summary>
                  {summary => (
                    <Show when={summary.count() !== undefined}>
                      <p class="border-paper/35 text-cyan m-0 border-b py-3 font-black">
                        {summary.count()} ҮР ДҮН
                      </p>
                    </Show>
                  )}
                </CatalogSearch.Summary>
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
                  error={(_error, retry) => (
                    <div class="m-0 grid min-h-48 place-items-center text-center text-xl font-extrabold">
                      <p>Хайлт ажилласангүй.</p>
                      <Button
                        class="pressable border-cyan bg-ink text-cyan rounded-none border-2"
                        type="button"
                        onClick={retry}
                      >
                        ДАХИН ОРОЛДОХ →
                      </Button>
                    </div>
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
                        class="texture-paper text-ink border-ink hover:bg-paper focus-visible:bg-paper pressable mt-3 grid min-h-30 grid-cols-[9rem_minmax(0,1fr)_auto] items-center gap-[clamp(0.75rem,2vw,1.5rem)] border-4 p-3 no-underline transition-[transform,background-color] duration-150 max-md:grid-cols-[7rem_minmax(0,1fr)] max-md:[clip-path:polygon(1%_0,100%_3%,98%_100%,0_96%)]"
                        href={`/products/${product.slug}`}
                      >
                        <Show when={image}>
                          {item => (
                            <ProductImage
                              class="bg-petrol h-24 w-36 object-contain max-md:h-22 max-md:w-28"
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
                        <b class="border-ink bg-cyan text-ink border-3 p-2 text-lg tabular-nums max-md:col-2 max-md:justify-self-start">
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
