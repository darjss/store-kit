import { Button, Skeleton, Spinner } from '@store-kit/ui'
import { useMutation, useQuery } from '@tanstack/solid-query'
import { For, Match, Show, Switch } from 'solid-js'
import type { JSX } from 'solid-js'

import { authCommand } from './auth-client'
import { RetryState } from './components/foundation'
import { ApprovedWorkspace } from './navigation'
import { adminMutation, adminQuery } from './query-options/session'
import { AdminRouterProvider } from './router'

const pageClass = 'store-kit-admin min-h-dvh bg-background text-base text-foreground'

function CenteredPanel(props: { children: JSX.Element }) {
  return (
    <main class={`${pageClass} grid place-items-center px-4 py-10`}>
      <section class="w-full max-w-sm border-y bg-card px-1 py-6 sm:rounded-xl sm:border sm:px-6">
        {props.children}
      </section>
    </main>
  )
}

function SignIn(props: { storeName: string }) {
  const signIn = useMutation(() => ({ mutationFn: authCommand.signInWithGoogle }))

  return (
    <CenteredPanel>
      <p class="text-sm font-medium text-primary">{props.storeName}</p>
      <h1 class="mt-1 text-xl leading-7 font-semibold tracking-[-0.015em]">Админд нэвтрэх</h1>
      <p class="mt-2 max-w-[36ch] text-base leading-6 text-muted-foreground">
        Баталгаажсан Google бүртгэлээрээ үргэлжлүүлнэ үү.
      </p>
      <Button
        class="mt-6 w-full"
        disabled={signIn.isPending}
        onClick={() => signIn.mutate()}
        type="button"
      >
        <Show when={signIn.isPending}>
          <Spinner aria-hidden="true" />
        </Show>
        {signIn.isPending ? 'Шилжүүлж байна…' : 'Google-ээр нэвтрэх'}
      </Button>
      <Show when={signIn.isError}>
        <p class="mt-4 text-sm text-destructive" role="alert">
          Нэвтрэх үйлдэл эхэлсэнгүй. Дахин оролдоно уу.
        </p>
      </Show>
    </CenteredPanel>
  )
}

function ApprovalRequired(props: { storeName: string }) {
  const signOut = useMutation(() => adminMutation.signOut())

  return (
    <CenteredPanel>
      <p class="text-sm font-medium text-(--admin-warning-foreground)">{props.storeName}</p>
      <h1 class="mt-1 text-xl leading-7 font-semibold tracking-[-0.015em]">
        Зөвшөөрөл шаардлагатай
      </h1>
      <p class="mt-2 max-w-[40ch] text-base leading-6 text-muted-foreground">
        Google бүртгэлээр нэвтэрсэн байна. Админ хэсгийг нээхийн өмнө эрх бүхий ажилтан таны
        бүртгэлийг зөвшөөрөх шаардлагатай.
      </p>
      <Button
        class="mt-6 w-full"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
        type="button"
        variant="outline"
      >
        <Show when={signOut.isPending}>
          <Spinner aria-hidden="true" />
        </Show>
        {signOut.isPending ? 'Гарч байна…' : 'Гарах'}
      </Button>
      <Show when={signOut.isError}>
        <p class="mt-4 text-sm text-destructive" role="alert">
          Системээс гарсангүй. Дахин оролдоно уу.
        </p>
      </Show>
    </CenteredPanel>
  )
}

function SessionSkeleton() {
  return (
    <main aria-busy="true" class={`${pageClass} lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]`}>
      <span class="sr-only" role="status">
        Админ хэсгийг ачаалж байна…
      </span>
      <aside class="hidden h-dvh border-r border-sidebar-border bg-sidebar lg:block">
        <div class="flex h-14 flex-col justify-center gap-1 border-b border-sidebar-border px-4">
          <Skeleton class="h-3.5 w-24" />
          <Skeleton class="h-3 w-16" />
        </div>
        <div class="space-y-1 p-2">
          <Skeleton class="h-9 w-full" />
          <Skeleton class="h-9 w-full" />
          <Skeleton class="h-9 w-full" />
          <Skeleton class="h-9 w-full" />
        </div>
      </aside>
      <div class="min-w-0 bg-background pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header
          class="flex items-center justify-between border-b bg-(--admin-topbar) px-3 sm:px-4 lg:px-5"
          data-admin-topbar
        >
          <div class="space-y-1 lg:space-y-0">
            <Skeleton class="h-3 w-20 lg:hidden" />
            <Skeleton class="h-4 w-24" />
          </div>
          <div class="flex gap-1.5">
            <Skeleton class="size-11 lg:w-52" />
            <Skeleton class="size-11 rounded-full lg:hidden" />
          </div>
        </header>
        <section class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-7">
          <Skeleton class="h-6 w-40" />
          <Skeleton class="mt-2 h-4 w-full max-w-md" />
          <div class="mt-4 border-t pt-5">
            <Skeleton class="h-32 w-full" />
          </div>
        </section>
        <div
          aria-hidden="true"
          class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background lg:hidden"
          data-admin-bottom-navigation
        >
          <For each={[0, 1, 2, 3]}>
            {() => (
              <div class="flex min-h-15 items-center justify-center">
                <Skeleton class="h-3.5 w-12" />
              </div>
            )}
          </For>
        </div>
      </div>
    </main>
  )
}

export function AdminSessionBoundary(props: { storeName: string }) {
  const session = useQuery(() => adminQuery.session())

  return (
    <Switch>
      <Match when={session.isPending}>
        <SessionSkeleton />
      </Match>
      <Match when={session.isError}>
        <CenteredPanel>
          <RetryState
            message="Холболтоо шалгаад админ эрхийн мэдээллийг дахин ачаална уу."
            onRetry={() => {
              void session.refetch()
            }}
            pending={session.isFetching}
          />
        </CenteredPanel>
      </Match>
      <Match when={session.data?._tag === 'Unauthenticated'}>
        <SignIn storeName={props.storeName} />
      </Match>
      <Match when={session.data?._tag === 'ApprovalRequired'}>
        <ApprovalRequired storeName={props.storeName} />
      </Match>
      <Match when={session.data?._tag === 'AdminSession' ? session.data : undefined}>
        {data => (
          <AdminRouterProvider>
            <ApprovedWorkspace session={data()} storeName={props.storeName} />
          </AdminRouterProvider>
        )}
      </Match>
    </Switch>
  )
}
