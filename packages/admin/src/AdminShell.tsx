import {
  AddCircle,
  Box,
  ClipboardList,
  DangerTriangle,
  HamburgerMenu,
  Home2,
  Login3,
  Logout2,
  Magnifer,
  Settings,
  ShieldCheck,
} from '@solar-icons/solid/Linear'
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
import { ErrorBoundary, Match, Show, Switch, createSignal, onCleanup, onMount } from 'solid-js'
import type { JSX } from 'solid-js'

import { authCommand } from './auth-client'
import { InlineAlert, RetryState } from './components/foundation'
import { adminMutation, adminQuery } from './query-options/session'
import { AdminRouter, AdminRouterProvider, adminNavigation } from './router'

const pageClass =
  'store-kit-admin min-h-dvh bg-background text-[13px] leading-[1.45] text-foreground'

function CenteredPanel(props: { children: JSX.Element }) {
  return (
    <main class={`${pageClass} grid place-items-center px-4 py-10`}>
      <section class="w-full max-w-sm rounded-lg border bg-card p-5 shadow-[0_4px_8px_oklch(0.05_0.01_270/35%)] sm:p-6">
        {props.children}
      </section>
    </main>
  )
}

function SignIn(props: { storeName: string }) {
  const signIn = useMutation(() => ({ mutationFn: authCommand.signInWithGoogle }))

  return (
    <CenteredPanel>
      <div class="mb-5 flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheck aria-hidden="true" size={18} />
      </div>
      <p class="text-xs font-medium text-muted-foreground">{props.storeName}</p>
      <h1 class="mt-1 text-xl leading-7 font-semibold tracking-[-0.015em]">Store Kit Admin</h1>
      <p class="mt-2 text-[13px] leading-5 text-muted-foreground">
        Sign in with your approved Google account to continue.
      </p>
      <Button
        class="mt-6 w-full"
        disabled={signIn.isPending}
        onClick={() => signIn.mutate()}
        type="button"
      >
        {signIn.isPending ? (
          <Spinner aria-hidden="true" />
        ) : (
          <Login3 aria-hidden="true" size={16} />
        )}
        {signIn.isPending ? 'Redirecting…' : 'Continue with Google'}
      </Button>
      <Show when={signIn.isError}>
        <p class="mt-4 text-[13px] text-destructive" role="alert">
          Sign-in could not start. Try again.
        </p>
      </Show>
    </CenteredPanel>
  )
}

function ApprovalRequired(props: { storeName: string }) {
  const signOut = useMutation(() => adminMutation.signOut())

  return (
    <CenteredPanel>
      <div class="mb-5 flex size-9 items-center justify-center rounded-md bg-(--admin-warning-surface) text-(--admin-warning-foreground)">
        <DangerTriangle aria-hidden="true" size={18} />
      </div>
      <p class="text-xs font-medium text-muted-foreground">{props.storeName}</p>
      <h1 class="mt-1 text-xl leading-7 font-semibold tracking-[-0.015em]">Approval required</h1>
      <p class="mt-2 text-[13px] leading-5 text-muted-foreground">
        Your Google account is signed in, but an operator must approve it before you can open the
        admin workspace.
      </p>
      <Button
        class="mt-6 w-full"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
        type="button"
        variant="outline"
      >
        {signOut.isPending ? (
          <Spinner aria-hidden="true" />
        ) : (
          <Logout2 aria-hidden="true" size={16} />
        )}
        {signOut.isPending ? 'Signing out…' : 'Sign out'}
      </Button>
      <Show when={signOut.isError}>
        <p class="mt-4 text-[13px] text-destructive" role="alert">
          Sign-out failed. Try again.
        </p>
      </Show>
    </CenteredPanel>
  )
}

const navigationLinkClass =
  'flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-sidebar-foreground/80 outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/70 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground'

function AdminNavigation(props: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin navigation" class="space-y-0.5 px-2 py-3">
      <Link
        activeOptions={{ exact: true }}
        class={navigationLinkClass}
        onClick={() => props.onNavigate?.()}
        to="/"
      >
        <Home2 aria-hidden="true" size={16} />
        Dashboard
      </Link>
      <Link class={navigationLinkClass} onClick={() => props.onNavigate?.()} to="/catalog">
        <Box aria-hidden="true" size={16} />
        Catalog
      </Link>
      <Link class={navigationLinkClass} onClick={() => props.onNavigate?.()} to="/orders">
        <ClipboardList aria-hidden="true" size={16} />
        Orders
      </Link>
      <Link class={navigationLinkClass} onClick={() => props.onNavigate?.()} to="/settings">
        <Settings aria-hidden="true" size={16} />
        Settings
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
    <div class="mt-auto border-t border-sidebar-border p-2">
      <div class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5">
        <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
          {props.session.user.name.charAt(0).toUpperCase()}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium text-sidebar-foreground">
            {props.session.user.name}
          </p>
          <p class="truncate text-[11px] text-sidebar-foreground/60">{props.session.user.email}</p>
        </div>
        <Button
          aria-label={props.pending ? 'Signing out' : 'Sign out'}
          class="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          disabled={props.pending}
          onClick={() => props.onSignOut()}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {props.pending ? (
            <Spinner aria-hidden="true" />
          ) : (
            <Logout2 aria-hidden="true" size={15} />
          )}
        </Button>
      </div>
    </div>
  )
}

function SidebarBrand(props: { storeName: string }) {
  return (
    <div class="flex h-12 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3">
      <div class="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Box aria-hidden="true" size={16} />
      </div>
      <div class="min-w-0">
        <p class="truncate text-[13px] font-semibold text-sidebar-foreground">{props.storeName}</p>
        <p class="text-[11px] text-sidebar-foreground/55">Store Kit admin</p>
      </div>
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

type MobileNavigationProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeName: string
} & SidebarAccountProps

function MobileNavigation(props: MobileNavigationProps) {
  return (
    <Sheet.Root onOpenChange={props.onOpenChange} open={props.open}>
      <Sheet.Trigger
        aria-label="Open admin navigation"
        as={Button}
        class="lg:hidden"
        size="icon-sm"
        variant="ghost"
      >
        <HamburgerMenu aria-hidden="true" size={18} />
      </Sheet.Trigger>
      <Sheet.Content
        class="w-[min(14rem,calc(100vw-2rem))]! max-w-none gap-0 bg-sidebar! p-0 text-sidebar-foreground"
        overlayClass="backdrop-blur-none!"
        side="left"
      >
        <SidebarBrand storeName={props.storeName} />
        <AdminNavigation onNavigate={() => props.onOpenChange(false)} />
        <SidebarAccount
          onSignOut={props.onSignOut}
          pending={props.pending}
          session={props.session}
        />
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
          <DialogTitle>Admin commands</DialogTitle>
          <DialogDescription>Navigate to an admin workspace page.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search commands…" />
          <CommandList class="p-1">
            <CommandEmpty>No matching command.</CommandEmpty>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => run(adminNavigation.dashboard)}>
                <Home2 aria-hidden="true" />
                Dashboard
                <CommandShortcut>G D</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.catalog)}>
                <Box aria-hidden="true" />
                Catalog
                <CommandShortcut>G C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.newProduct)}>
                <AddCircle aria-hidden="true" />
                New product
                <CommandShortcut>G N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.orders)}>
                <ClipboardList aria-hidden="true" />
                Orders
                <CommandShortcut>G O</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(adminNavigation.settings)}>
                <Settings aria-hidden="true" />
                Settings
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
            message="The admin page stopped rendering. Retry this view."
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
  const [mobileNavigationOpen, setMobileNavigationOpen] = createSignal(false)
  const [commandOpen, setCommandOpen] = createSignal(false)
  const currentPage = () => {
    const pathname = location().pathname.replace(/^\/admin/, '')
    if (pathname === '/catalog/new') return 'New product'
    if (pathname.startsWith('/catalog')) return 'Catalog'
    if (pathname.startsWith('/orders')) return 'Orders'
    if (pathname.startsWith('/settings')) return 'Settings'
    return 'Dashboard'
  }

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(open => !open)
        return
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
    onCleanup(() => document.removeEventListener('keydown', onKeyDown))
  })

  return (
    <div class={`${pageClass} lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]`}>
      <DesktopSidebar
        onSignOut={() => signOut.mutate()}
        pending={signOut.isPending}
        session={props.session}
        storeName={props.storeName}
      />
      <div class="min-w-0 bg-background">
        <header class="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b bg-(--admin-topbar) px-3 sm:px-4 lg:px-5">
          <div class="flex min-w-0 items-center gap-2">
            <MobileNavigation
              onOpenChange={setMobileNavigationOpen}
              onSignOut={() => signOut.mutate()}
              open={mobileNavigationOpen()}
              pending={signOut.isPending}
              session={props.session}
              storeName={props.storeName}
            />
            <div class="flex min-w-0 items-center gap-1.5 text-xs">
              <span class="truncate text-muted-foreground max-sm:hidden">{props.storeName}</span>
              <span aria-hidden="true" class="text-border max-sm:hidden">
                /
              </span>
              <span class="truncate font-medium text-foreground">{currentPage()}</span>
            </div>
          </div>
          <Button
            aria-label="Open command palette"
            class="w-8 justify-start gap-2 border-border bg-card text-muted-foreground hover:bg-muted sm:w-52 sm:px-2.5"
            onClick={() => setCommandOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Magnifer aria-hidden="true" size={15} />
            <span class="hidden flex-1 text-left sm:inline">Search commands</span>
            <kbd class="hidden rounded-sm border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] leading-none text-muted-foreground sm:inline">
              ⌘ K
            </kbd>
          </Button>
        </header>
        <Show when={signOut.isError}>
          <div class="border-b px-4 py-2.5 sm:px-6 lg:px-7">
            <InlineAlert title="Sign-out failed" tone="destructive">
              Try again when your connection is available.
            </InlineAlert>
          </div>
        </Show>
        <RoutedContent />
        <AdminCommandPalette onOpenChange={setCommandOpen} open={commandOpen()} />
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
    <main aria-busy="true" class={`${pageClass} lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]`}>
      <span class="sr-only" role="status">
        Loading admin session…
      </span>
      <aside class="hidden h-dvh border-r border-sidebar-border bg-sidebar lg:block">
        <div class="flex h-12 items-center gap-2.5 border-b border-sidebar-border px-3">
          <Skeleton class="size-7" />
          <div class="space-y-1">
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-2.5 w-16" />
          </div>
        </div>
        <div class="space-y-1 p-2">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
        </div>
      </aside>
      <div class="min-w-0 bg-background">
        <header class="flex h-12 items-center justify-between border-b bg-(--admin-topbar) px-3 sm:px-4 lg:px-5">
          <div class="flex items-center gap-2">
            <Skeleton class="size-7 lg:hidden" />
            <Skeleton class="h-3.5 w-24" />
          </div>
          <Skeleton class="h-8 w-8 sm:w-52" />
        </header>
        <section class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-7">
          <Skeleton class="h-6 w-40" />
          <Skeleton class="mt-1.5 h-3.5 w-full max-w-md" />
          <div class="mt-4 border-t pt-5">
            <Skeleton class="h-32 w-full rounded-lg" />
          </div>
        </section>
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
            message="Check your connection, then retry the admin session request."
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
    <ColorModeProvider initialColorMode="dark">
      <QueryClientProvider client={queryClient}>
        <SessionContent storeName={props.storeName} />
        <Toaster />
      </QueryClientProvider>
    </ColorModeProvider>
  )
}
