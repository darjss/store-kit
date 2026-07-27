import {
  DangerTriangle,
  Home2,
  Login3,
  Logout2,
  Refresh,
  ShieldCheck,
} from '@solar-icons/solid/Linear'
import type { AdminSession } from '@store-kit/contracts/admin'
import { Button, Spinner } from '@store-kit/ui'
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/solid-query'
import { Match, Switch } from 'solid-js'
import type { JSX } from 'solid-js'

import { authCommand } from './auth-client'
import { adminMutation, adminQuery } from './query-options/session'
import { AdminRouter, adminNavigation } from './router'

const pageClass = 'min-h-dvh bg-background text-foreground'

function CenteredPanel(props: { children: JSX.Element }) {
  return (
    <main class={`${pageClass} grid place-items-center px-5 py-12`}>
      <section class="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        {props.children}
      </section>
    </main>
  )
}

function SignIn() {
  const signIn = useMutation(() => ({ mutationFn: authCommand.signInWithGoogle }))

  return (
    <CenteredPanel>
      <div class="mb-6 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck size={24} />
      </div>
      <h1 class="text-2xl font-semibold tracking-tight">Store Kit Admin</h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">
        Sign in with your approved Google account to continue.
      </p>
      <Button
        class="mt-7 w-full"
        disabled={signIn.isPending}
        onClick={() => signIn.mutate()}
        type="button"
      >
        {signIn.isPending ? <Spinner aria-hidden="true" /> : <Login3 size={16} />}
        {signIn.isPending ? 'Redirecting…' : 'Continue with Google'}
      </Button>
      <Switch>
        <Match when={signIn.isError}>
          <p class="mt-4 text-sm text-destructive" role="alert">
            Sign-in could not start. Try again.
          </p>
        </Match>
      </Switch>
    </CenteredPanel>
  )
}

function ApprovalRequired() {
  const signOut = useMutation(() => adminMutation.signOut())

  return (
    <CenteredPanel>
      <div class="mb-6 flex size-11 items-center justify-center rounded-lg bg-muted">
        <DangerTriangle size={24} />
      </div>
      <h1 class="text-2xl font-semibold tracking-tight">Approval required</h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">
        Your Google account is signed in, but an operator must approve it before you can open the
        admin workspace.
      </p>
      <Button
        class="mt-7 w-full"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
        type="button"
        variant="outline"
      >
        {signOut.isPending ? <Spinner aria-hidden="true" /> : <Logout2 size={16} />}
        {signOut.isPending ? 'Signing out…' : 'Sign out'}
      </Button>
      <Switch>
        <Match when={signOut.isError}>
          <p class="mt-4 text-sm text-destructive" role="alert">
            Sign-out failed. Try again.
          </p>
        </Match>
      </Switch>
    </CenteredPanel>
  )
}

function Approved(props: { session: AdminSession }) {
  const signOut = useMutation(() => adminMutation.signOut())

  return (
    <div class={`${pageClass} lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]`}>
      <aside class="border-b bg-sidebar text-sidebar-foreground lg:min-h-dvh lg:border-r lg:border-b-0">
        <div class="flex min-h-16 items-center justify-between gap-4 px-5 lg:min-h-20 lg:px-6">
          <a
            class="font-semibold tracking-tight"
            href="/admin"
            onClick={event => {
              event.preventDefault()
              void adminNavigation.dashboard()
            }}
          >
            Store Kit
          </a>
          <span class="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
            Admin
          </span>
        </div>
        <nav aria-label="Admin navigation" class="border-t p-3 lg:border-t-0">
          <a
            aria-current="page"
            class="flex min-h-10 items-center gap-3 rounded-md bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground"
            href="/admin"
            onClick={event => {
              event.preventDefault()
              void adminNavigation.dashboard()
            }}
          >
            <Home2 size={16} />
            Dashboard
          </a>
        </nav>
      </aside>

      <div class="min-w-0">
        <header class="flex min-h-16 items-center justify-between gap-4 border-b bg-background px-5 sm:px-8">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{props.session.user.name}</p>
            <p class="truncate text-xs text-muted-foreground">{props.session.user.email}</p>
          </div>
          <Button
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
            size="sm"
            type="button"
            variant="outline"
          >
            {signOut.isPending ? <Spinner aria-hidden="true" /> : <Logout2 size={16} />}
            <span class="max-sm:sr-only">{signOut.isPending ? 'Signing out…' : 'Sign out'}</span>
          </Button>
        </header>
        <Switch>
          <Match when={signOut.isError}>
            <p
              class="border-b bg-destructive/10 px-5 py-3 text-sm text-destructive sm:px-8"
              role="alert"
            >
              Sign-out failed. Try again.
            </p>
          </Match>
        </Switch>
        <AdminRouter />
      </div>
    </div>
  )
}

function SessionContent() {
  const session = useQuery(() => adminQuery.session())

  return (
    <Switch>
      <Match when={session.isPending}>
        <main class={`${pageClass} grid place-items-center`} aria-busy="true">
          <div class="flex items-center gap-3 text-sm text-muted-foreground" role="status">
            <Spinner aria-hidden="true" />
            Loading admin session…
          </div>
        </main>
      </Match>
      <Match when={session.isError}>
        <CenteredPanel>
          <div class="mb-6 flex size-11 items-center justify-center rounded-lg bg-muted">
            <DangerTriangle size={24} />
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">Admin could not load</h1>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            Check your connection, then try the session request again.
          </p>
          <Button class="mt-7" onClick={() => session.refetch()} type="button">
            <Refresh size={16} />
            Retry
          </Button>
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
    <QueryClientProvider client={queryClient}>
      <SessionContent />
    </QueryClientProvider>
  )
}
