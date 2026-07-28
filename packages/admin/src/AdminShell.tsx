import {
  Box,
  ClipboardList,
  DangerTriangle,
  HamburgerMenu,
  Home2,
  Login3,
  Logout2,
  Settings,
  ShieldCheck,
} from '@solar-icons/solid/Linear'
import type { AdminSession } from '@store-kit/contracts/admin'
import { Button, ColorModeProvider, Sheet, Skeleton, Spinner, Toaster } from '@store-kit/ui'
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/solid-query'
import { Link } from '@tanstack/solid-router'
import { ErrorBoundary, Match, Show, Switch, createSignal } from 'solid-js'
import type { JSX } from 'solid-js'

import { authCommand } from './auth-client'
import { InlineAlert, RetryState } from './components/foundation'
import { adminMutation, adminQuery } from './query-options/session'
import { AdminRouter, AdminRouterProvider, adminNavigation } from './router'

const pageClass = 'store-kit-admin min-h-dvh bg-background text-foreground'

function CenteredPanel(props: { children: JSX.Element }) {
  return (
    <main class={`${pageClass} grid place-items-center px-5 py-12`}>
      <section class="w-full max-w-md rounded-lg border bg-card p-6 sm:p-8">
        {props.children}
      </section>
    </main>
  )
}

function SignIn() {
  const signIn = useMutation(() => ({ mutationFn: authCommand.signInWithGoogle }))

  return (
    <CenteredPanel>
      <div class="mb-5 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck aria-hidden="true" size={20} />
      </div>
      <h1 class="text-2xl leading-8 font-semibold tracking-[-0.02em]">Store Kit Admin</h1>
      <p class="mt-2 text-sm leading-5 text-muted-foreground">
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
        <p class="mt-4 text-sm text-destructive" role="alert">
          Sign-in could not start. Try again.
        </p>
      </Show>
    </CenteredPanel>
  )
}

function ApprovalRequired() {
  const signOut = useMutation(() => adminMutation.signOut())

  return (
    <CenteredPanel>
      <div class="mb-5 flex size-10 items-center justify-center rounded-lg bg-(--admin-warning-surface) text-(--admin-warning-foreground)">
        <DangerTriangle aria-hidden="true" size={20} />
      </div>
      <h1 class="text-2xl leading-8 font-semibold tracking-[-0.02em]">Approval required</h1>
      <p class="mt-2 text-sm leading-5 text-muted-foreground">
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
        <p class="mt-4 text-sm text-destructive" role="alert">
          Sign-out failed. Try again.
        </p>
      </Show>
    </CenteredPanel>
  )
}

const navigationLinkClass =
  'flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-sidebar-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground'

function AdminNavigation(props: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin navigation" class="space-y-1 p-3">
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

function DesktopSidebar() {
  return (
    <aside class="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border px-4">
        <a
          class="rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
          href="/admin"
          onClick={event => {
            event.preventDefault()
            void adminNavigation.dashboard()
          }}
        >
          Store Kit
        </a>
        <span class="rounded-md border border-sidebar-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Admin
        </span>
      </div>
      <AdminNavigation />
    </aside>
  )
}

function MobileNavigation(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
        class="w-[min(15rem,calc(100vw-3rem))]! max-w-none gap-0 bg-sidebar! p-0 text-sidebar-foreground shadow-none!"
        overlayClass="backdrop-blur-none!"
        side="left"
      >
        <div class="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-4 pr-12">
          <Sheet.Title class="text-sm font-semibold tracking-tight">Store Kit</Sheet.Title>
          <span class="rounded-md border border-sidebar-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Admin
          </span>
        </div>
        <AdminNavigation onNavigate={() => props.onOpenChange(false)} />
      </Sheet.Content>
    </Sheet.Root>
  )
}

function RoutedContent() {
  return (
    <ErrorBoundary
      fallback={(_error, reset) => (
        <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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

function ApprovedWorkspace(props: { session: AdminSession }) {
  const signOut = useMutation(() => adminMutation.signOut())
  const [mobileNavigationOpen, setMobileNavigationOpen] = createSignal(false)

  return (
    <div class={`${pageClass} lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]`}>
      <DesktopSidebar />
      <div class="min-w-0 bg-background">
        <header class="flex h-14 items-center justify-between gap-3 border-b bg-background px-4 sm:px-6 lg:px-8">
          <div class="flex min-w-0 items-center gap-2">
            <MobileNavigation
              onOpenChange={setMobileNavigationOpen}
              open={mobileNavigationOpen()}
            />
            <div class="min-w-0 max-sm:hidden">
              <p class="truncate text-sm font-medium">{props.session.user.name}</p>
              <p class="truncate text-xs text-muted-foreground">{props.session.user.email}</p>
            </div>
            <span class="text-sm font-semibold sm:hidden lg:hidden">Store Kit</span>
          </div>
          <Button
            class="w-8 sm:w-28"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
            size="sm"
            type="button"
            variant="outline"
          >
            {signOut.isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <Logout2 aria-hidden="true" size={16} />
            )}
            <span class="max-sm:sr-only">{signOut.isPending ? 'Signing out…' : 'Sign out'}</span>
          </Button>
        </header>
        <Show when={signOut.isError}>
          <div class="border-b px-4 py-3 sm:px-6 lg:px-8">
            <InlineAlert title="Sign-out failed" tone="destructive">
              Try again when your connection is available.
            </InlineAlert>
          </div>
        </Show>
        <RoutedContent />
      </div>
    </div>
  )
}

function Approved(props: { session: AdminSession }) {
  return (
    <AdminRouterProvider>
      <ApprovedWorkspace session={props.session} />
    </AdminRouterProvider>
  )
}

function SessionSkeleton() {
  return (
    <main aria-busy="true" class={`${pageClass} lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]`}>
      <span class="sr-only" role="status">
        Loading admin session…
      </span>
      <aside class="hidden h-dvh border-r border-sidebar-border bg-sidebar lg:block">
        <div class="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Skeleton class="h-4 w-20" />
          <Skeleton class="h-5 w-12" />
        </div>
        <div class="p-3">
          <Skeleton class="h-9 w-full" />
        </div>
      </aside>
      <div class="min-w-0 bg-background">
        <header class="flex h-14 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-2">
            <Skeleton class="size-8 lg:hidden" />
            <div class="space-y-1.5 max-sm:hidden">
              <Skeleton class="h-3.5 w-28" />
              <Skeleton class="h-3 w-40" />
            </div>
          </div>
          <Skeleton class="h-8 w-20" />
        </header>
        <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton class="h-7 w-40" />
          <Skeleton class="mt-2 h-4 w-full max-w-md" />
          <div class="mt-5 border-t pt-6">
            <Skeleton class="h-32 w-full rounded-lg" />
          </div>
        </section>
      </div>
    </main>
  )
}

function SessionContent() {
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
        <SignIn />
      </Match>
      <Match when={session.data?._tag === 'ApprovalRequired'}>
        <ApprovalRequired />
      </Match>
      <Match when={session.data?._tag === 'AdminSession' ? session.data : undefined}>
        {data => <Approved session={data()} />}
      </Match>
    </Switch>
  )
}

export function AdminShell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
  })

  return (
    <ColorModeProvider initialColorMode="light">
      <QueryClientProvider client={queryClient}>
        <SessionContent />
        <Toaster />
      </QueryClientProvider>
    </ColorModeProvider>
  )
}
