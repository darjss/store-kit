import { Logout2, Magnifer } from '@solar-icons/solid/Linear'
import type { AdminSession } from '@store-kit/contracts/admin'
import {
  Button,
  ColorModeProvider,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Sheet,
  Skeleton,
  Spinner,
  Toaster,
} from '@store-kit/ui'
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/solid-query'
import { Link, useLocation } from '@tanstack/solid-router'
import { ErrorBoundary, For, Match, Show, Switch, createSignal, onCleanup, onMount } from 'solid-js'
import type { JSX } from 'solid-js'

import { authCommand } from './auth-client'
import { InlineAlert, RetryState } from './components/foundation'
import { adminMutation, adminQuery } from './query-options/session'
import { AdminRouter, AdminRouterProvider, adminNavigation } from './router'

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

const navigationLinkClass =
  'admin-navigation-link flex items-center rounded-md px-3 text-sm font-medium text-sidebar-foreground outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/70 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground'

function AdminNavigation() {
  return (
    <nav aria-label="Админ цэс" class="space-y-1 px-2 py-4" lang="mn">
      <Link activeOptions={{ exact: true }} class={navigationLinkClass} to="/">
        Нүүр
      </Link>
      <Link class={navigationLinkClass} to="/catalog">
        Бараа
      </Link>
      <Link class={navigationLinkClass} to="/orders">
        Захиалга
      </Link>
      <Link class={navigationLinkClass} to="/settings">
        Тохиргоо
      </Link>
    </nav>
  )
}

function AdminBottomNavigation() {
  return (
    <nav
      aria-label="Үндсэн цэс"
      class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background lg:hidden"
      data-admin-bottom-navigation
      lang="mn"
    >
      <Link
        activeOptions={{ exact: true }}
        class="flex items-center justify-center px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        data-admin-bottom-navigation-link
        to="/"
      >
        Нүүр
      </Link>
      <Link
        class="flex items-center justify-center px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        data-admin-bottom-navigation-link
        to="/catalog"
      >
        Бараа
      </Link>
      <Link
        class="flex items-center justify-center px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        data-admin-bottom-navigation-link
        to="/orders"
      >
        Захиалга
      </Link>
      <Link
        class="flex items-center justify-center px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        data-admin-bottom-navigation-link
        to="/settings"
      >
        Тохиргоо
      </Link>
    </nav>
  )
}

type SidebarAccountProps = {
  session: AdminSession
  pending: boolean
  onSignOut: () => void
}

function SidebarAccount(props: SidebarAccountProps) {
  return (
    <div class="mt-auto border-t border-sidebar-border p-3">
      <p class="truncate text-sm font-semibold text-sidebar-foreground">
        {props.session.user.name}
      </p>
      <p class="mt-0.5 truncate text-xs text-muted-foreground" title={props.session.user.email}>
        {props.session.user.email}
      </p>
      <Button
        class="mt-3 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        disabled={props.pending}
        onClick={() => props.onSignOut()}
        size="sm"
        type="button"
        variant="ghost"
      >
        {props.pending ? <Spinner aria-hidden="true" /> : <Logout2 aria-hidden="true" size={16} />}
        {props.pending ? 'Гарч байна…' : 'Гарах'}
      </Button>
    </div>
  )
}

function SidebarBrand(props: { storeName: string }) {
  return (
    <div class="flex h-14 shrink-0 flex-col justify-center border-b border-sidebar-border px-4">
      <p class="truncate text-sm font-semibold text-sidebar-foreground">{props.storeName}</p>
      <p class="text-xs text-muted-foreground">Store Kit</p>
    </div>
  )
}

function DesktopSidebar(props: { storeName: string } & SidebarAccountProps) {
  return (
    <aside class="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarBrand storeName={props.storeName} />
      <AdminNavigation />
      <SidebarAccount onSignOut={props.onSignOut} pending={props.pending} session={props.session} />
    </aside>
  )
}

type MobileAccountProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeName: string
} & SidebarAccountProps

function MobileAccount(props: MobileAccountProps) {
  return (
    <Sheet.Root onOpenChange={props.onOpenChange} open={props.open}>
      <Sheet.Trigger
        aria-label={`${props.session.user.name} бүртгэлийг нээх`}
        as={Button}
        class="rounded-full! border border-border bg-muted text-sm font-semibold text-foreground lg:hidden"
        size="icon-sm"
        variant="ghost"
      >
        {props.session.user.name.charAt(0).toUpperCase()}
      </Sheet.Trigger>
      <Sheet.Content
        class="w-[min(22rem,calc(100vw-1rem))]! max-w-none gap-0 bg-background! p-0"
        overlayClass="backdrop-blur-none!"
      >
        <Sheet.Header class="border-b px-5 py-5 pr-16">
          <Sheet.Title>Бүртгэл</Sheet.Title>
          <Sheet.Description>{props.storeName}</Sheet.Description>
        </Sheet.Header>
        <div class="px-5 py-5">
          <p class="font-semibold text-foreground">{props.session.user.name}</p>
          <p class="mt-1 text-sm break-all text-muted-foreground">{props.session.user.email}</p>
        </div>
        <Sheet.Footer class="border-t p-4">
          <Button
            class="w-full"
            disabled={props.pending}
            onClick={() => props.onSignOut()}
            type="button"
            variant="outline"
          >
            {props.pending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <Logout2 aria-hidden="true" size={16} />
            )}
            {props.pending ? 'Гарч байна…' : 'Системээс гарах'}
          </Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  )
}

function AdminCommandPalette(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const run = (command: () => Promise<unknown>) => {
    props.onOpenChange(false)
    void command()
  }

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent
        class="max-w-lg gap-0 overflow-hidden border bg-popover p-0"
        showCloseButton={false}
      >
        <DialogHeader class="sr-only">
          <DialogTitle>Админ үйлдэл</DialogTitle>
          <DialogDescription>Админ хэсгийн хуудас руу шилжинэ.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Үйлдэл хайх…" />
          <CommandList class="p-1" lang="mn">
            <CommandEmpty>Илэрц олдсонгүй.</CommandEmpty>
            <CommandGroup heading="Шилжих">
              <CommandItem onSelect={() => run(adminNavigation.dashboard)}>
                Нүүр
                <CommandShortcut>G D</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.catalog)}>
                Бараа
                <CommandShortcut>G C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.newProduct)}>
                Шинэ бараа
                <CommandShortcut>G N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.orders)}>
                Захиалга
                <CommandShortcut>G O</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.settings)}>
                Тохиргоо
                <CommandShortcut>G S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function RoutedContent() {
  return (
    <ErrorBoundary
      fallback={(_error, reset) => (
        <section class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-7">
          <RetryState
            message="Админ хуудас ажиллахаа болилоо. Энэ хуудсыг дахин нээнэ үү."
            onRetry={reset}
          />
        </section>
      )}
    >
      <AdminRouter />
    </ErrorBoundary>
  )
}

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]'))

function ApprovedWorkspace(props: { session: AdminSession; storeName: string }) {
  const signOut = useMutation(() => adminMutation.signOut())
  const location = useLocation()
  const [mobileAccountOpen, setMobileAccountOpen] = createSignal(false)
  const [commandOpen, setCommandOpen] = createSignal(false)
  const currentPage = () => {
    const pathname = location().pathname.replace(/^\/admin/, '')
    if (pathname === '/catalog/new') return 'Шинэ бараа'
    if (pathname.startsWith('/catalog')) return 'Бараа'
    if (pathname.startsWith('/orders')) return 'Захиалга'
    if (pathname.startsWith('/settings')) return 'Тохиргоо'
    return 'Нүүр'
  }

  onMount(() => {
    let goTimer: ReturnType<typeof setTimeout> | undefined
    let goPending = false
    const resetGoShortcut = () => {
      goPending = false
      if (goTimer) clearTimeout(goTimer)
      goTimer = undefined
    }
    const goCommands = {
      d: adminNavigation.dashboard,
      c: adminNavigation.catalog,
      n: adminNavigation.newProduct,
      o: adminNavigation.orders,
      s: adminNavigation.settings,
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(open => !open)
        return
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey && !isEditableTarget(event.target)) {
        const key = event.key.toLowerCase()
        if (key === 'g') {
          event.preventDefault()
          resetGoShortcut()
          goPending = true
          goTimer = setTimeout(resetGoShortcut, 750)
          return
        }
        if (goPending && key in goCommands) {
          event.preventDefault()
          const command = goCommands[key as keyof typeof goCommands]
          resetGoShortcut()
          void command()
          return
        }
        resetGoShortcut()
      }

      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        const search = document.querySelector<HTMLElement>('[data-admin-list-search]')
        if (!search) return
        event.preventDefault()
        search.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    onCleanup(() => {
      resetGoShortcut()
      document.removeEventListener('keydown', onKeyDown)
    })
  })

  return (
    <div class={`${pageClass} lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]`}>
      <DesktopSidebar
        onSignOut={() => signOut.mutate()}
        pending={signOut.isPending}
        session={props.session}
        storeName={props.storeName}
      />
      <div class="min-w-0 bg-background pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header
          class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-(--admin-topbar) px-3 sm:px-4 lg:px-5"
          data-admin-topbar
        >
          <div class="min-w-0" lang="mn">
            <p class="truncate text-xs text-muted-foreground lg:hidden">{props.storeName}</p>
            <p class="truncate text-base font-semibold text-foreground lg:text-sm">
              {currentPage()}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <Button
              aria-label="Үйлдэл хайх"
              class="size-11 justify-center gap-2 border-border bg-card text-muted-foreground hover:bg-muted lg:w-52 lg:justify-start lg:px-2.5"
              onClick={() => setCommandOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Magnifer aria-hidden="true" size={16} />
              <span class="hidden flex-1 text-left lg:inline">Үйлдэл хайх</span>
              <kbd
                class="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-sans text-xs leading-none text-muted-foreground"
                data-admin-shortcut-hint
              >
                ⌘ K
              </kbd>
            </Button>
            <MobileAccount
              onOpenChange={setMobileAccountOpen}
              onSignOut={() => signOut.mutate()}
              open={mobileAccountOpen()}
              pending={signOut.isPending}
              session={props.session}
              storeName={props.storeName}
            />
          </div>
        </header>
        <Show when={signOut.isError}>
          <div class="border-b px-4 py-3 sm:px-6 lg:px-7">
            <InlineAlert title="Системээс гарсангүй" tone="destructive">
              Холболт сэргэсний дараа дахин оролдоно уу.
            </InlineAlert>
          </div>
        </Show>
        <RoutedContent />
        <AdminCommandPalette onOpenChange={setCommandOpen} open={commandOpen()} />
        <AdminBottomNavigation />
      </div>
    </div>
  )
}

function Approved(props: { session: AdminSession; storeName: string }) {
  return (
    <AdminRouterProvider>
      <ApprovedWorkspace session={props.session} storeName={props.storeName} />
    </AdminRouterProvider>
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

function SessionContent(props: { storeName: string }) {
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
        {data => <Approved session={data()} storeName={props.storeName} />}
      </Match>
    </Switch>
  )
}

export function AdminShell(props: { storeName: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
  })

  return (
    <ColorModeProvider initialColorMode="light">
      <QueryClientProvider client={queryClient}>
        <SessionContent storeName={props.storeName} />
        <Toaster />
      </QueryClientProvider>
    </ColorModeProvider>
  )
}
