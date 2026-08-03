import type {
  AdminCatalogProductDetail,
  AdminCatalogVariant,
} from '@store-kit/contracts/admin-catalog'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@store-kit/ui'
import { Show } from 'solid-js'

import { InlineAlert } from '../components/foundation'
import { VariantForm } from './variant-form'

type VariantInspectorProps = {
  product: AdminCatalogProductDetail
  selection: string | undefined
  onClose: () => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function VariantInspector(props: VariantInspectorProps) {
  const variant = () => props.product.variants.find(item => item.id === props.selection)
  const creating = () => props.selection === 'new'

  return (
    <Sheet.Root
      open={props.selection !== undefined}
      onOpenChange={open => !open && props.onClose()}
    >
      <SheetContent class="w-full! max-w-full! gap-0 sm:max-w-xl!" side="right">
        <Show
          when={creating() || variant()}
          fallback={
            <div class="flex min-h-0 flex-1 flex-col p-4 pt-14">
              <InlineAlert title="Хувилбар олдсонгүй" tone="destructive">
                Энэ хувилбар барааны одоогийн мэдээлэлд байхгүй байна.
              </InlineAlert>
              <Button class="mt-4 min-h-11! self-start" onClick={props.onClose} variant="outline">
                Хаах
              </Button>
            </div>
          }
        >
          <SheetHeader class="border-b pr-14">
            <SheetTitle>{creating() ? 'Хувилбар нэмэх' : 'Хувилбар засах'}</SheetTitle>
            <SheetDescription>
              {creating()
                ? 'Өөр үнэ, үлдэгдэл эсвэл сонголттой хувилбар нэмнэ.'
                : `${variant()?.name ?? ''} · ${variant()?.sku ?? ''}`}
            </SheetDescription>
          </SheetHeader>
          <Show
            when={creating()}
            fallback={
              <Show when={variant()} keyed>
                {(value: AdminCatalogVariant) => (
                  <VariantForm
                    product={props.product}
                    variant={value}
                    onClose={props.onClose}
                    onReload={props.onReload}
                  />
                )}
              </Show>
            }
          >
            <VariantForm
              product={props.product}
              onClose={props.onClose}
              onReload={props.onReload}
            />
          </Show>
        </Show>
      </SheetContent>
    </Sheet.Root>
  )
}
