/* oxlint-disable tailwindcss/no-unknown-classes */
import { CloseCircle, Magnifer } from '@solar-icons/solid/Outline'
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
import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { ProductImage } from './ProductImage'

export function SearchDialog(props: {
  initialOpen: boolean
  trigger: JSX.Element
  triggerClass?: string
}) {
  return (
    <CatalogSearch.Root initialOpen={props.initialOpen}>
      <CatalogSearch.DialogState>
        {search => (
          <Dialog open={search.open()} onOpenChange={search.setOpen}>
            <DialogTrigger
              as={Button}
              variant="ghost"
              class={props.triggerClass}
              ref={search.setTriggerElement}
              aria-label="Хайх"
            >
              {props.trigger}
            </DialogTrigger>
            <DialogContent
              class="bg-surface! text-ink! fixed! inset-0! z-50! h-dvh! w-full! max-w-none! translate-none! transform-none! gap-0! overflow-y-auto! rounded-none! p-0! shadow-none! ring-0! outline-none! motion-reduce:animate-none!"
              showCloseButton={false}
              onOpenAutoFocus={event => {
                event.preventDefault()
                search.focusInput()
              }}
            >
              <div class="px-gutter mx-auto w-full max-w-3xl">
                <header class="border-line flex items-start justify-between gap-4 border-b py-5">
                  <div>
                    <DialogTitle class="text-2xl font-extrabold tracking-tight">
                      Бараа хайх
                    </DialogTitle>
                    <DialogDescription class="mt-1 mb-0 text-sm text-muted">
                      Нэр, тайлбар эсвэл ангиллаар хайна уу.
                    </DialogDescription>
                  </div>
                  <DialogClose
                    as={Button}
                    variant="outline"
                    class="border-line bg-panel rounded-action min-h-11 gap-2 font-bold"
                    aria-label="Хайлт хаах"
                  >
                    <CloseCircle size={18} />
                    Хаах
                  </DialogClose>
                </header>
                <label
                  class="border-line grid grid-cols-[auto_1fr] items-center gap-3 border-b py-4"
                  for="store-search"
                >
                  <span class="sr-only">Бараа хайх</span>
                  <span class="text-muted">
                    <Magnifer size={24} />
                  </span>
                  <CatalogSearch.Input>
                    {input => (
                      <Input
                        ref={input.setInputElement}
                        class="text-ink min-h-11 min-w-0 border-0 bg-transparent text-xl font-bold shadow-none outline-none placeholder:text-muted md:text-2xl"
                        id="store-search"
                        value={input.value()}
                        onInput={input.onInput}
                        placeholder="Цамц, юүдэн, өнгө…"
                        autocomplete="off"
                      />
                    )}
                  </CatalogSearch.Input>
                </label>
                <div class="py-4" aria-live="polite">
                  <CatalogSearch.Summary>
                    {summary => (
                      <Show when={summary.count() !== undefined}>
                        <p class="border-line m-0 border-b pb-3 text-xs font-bold tracking-widest text-muted uppercase">
                          {summary.count()} илэрц
                        </p>
                      </Show>
                    )}
                  </CatalogSearch.Summary>
                  <CatalogSearch.Results
                    prompt={() => (
                      <p class="m-0 grid min-h-48 place-items-center text-center font-bold text-muted">
                        Хоёр ба түүнээс олон үсэг бичнэ үү.
                      </p>
                    )}
                    pending={() => (
                      <p class="m-0 grid min-h-48 place-items-center text-center font-bold text-muted">
                        Хайж байна…
                      </p>
                    )}
                    error={(_error, retry) => (
                      <div class="m-0 grid min-h-48 place-items-center gap-3 text-center">
                        <p class="font-bold">Хайлт ажилласангүй.</p>
                        <Button
                          class="text-on-accent rounded-action min-h-11 bg-accent px-5 font-bold"
                          type="button"
                          onClick={retry}
                        >
                          Дахин оролдох
                        </Button>
                      </div>
                    )}
                    empty={() => (
                      <p class="m-0 grid min-h-48 place-items-center text-center font-bold text-muted">
                        Тохирох бараа олдсонгүй.
                      </p>
                    )}
                  >
                    {product => {
                      const image = product.images[0]
                      const variant = product.variants[0]
                      return (
                        <a
                          class="border-line hover:bg-panel focus-visible:bg-panel grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 border-b py-3 no-underline transition-colors"
                          href={`/products/${product.slug}`}
                        >
                          <Show when={image}>
                            {item => (
                              <ProductImage
                                class="bg-surface rounded-action aspect-4/5 w-18 object-cover"
                                image={item()}
                                layout="thumbnail"
                              />
                            )}
                          </Show>
                          <span class="grid min-w-0 gap-0.5">
                            <strong class="text-base leading-snug wrap-break-word">
                              {product.name}
                            </strong>
                            <small class="overflow-hidden text-ellipsis whitespace-nowrap text-muted">
                              {product.shortDescription}
                            </small>
                          </span>
                          <b class="font-number text-base">
                            {variant ? formatMnt(variant.priceMnt) : '—'}
                          </b>
                        </a>
                      )
                    }}
                  </CatalogSearch.Results>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CatalogSearch.DialogState>
    </CatalogSearch.Root>
  )
}
