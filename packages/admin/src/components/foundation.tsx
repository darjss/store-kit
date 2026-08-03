import {
  DangerCircle,
  DangerTriangle,
  InfoCircle,
  Refresh,
  ShieldCheck,
} from '@solar-icons/solid/Linear'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Skeleton,
  Spinner,
  Switch as ZaidanSwitch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@store-kit/ui'
import { For, Match, Show, Switch, createUniqueId, mergeProps } from 'solid-js'
import type { JSX } from 'solid-js'

const adminSwitchClass = 'admin-switch'

export function AdminSwitch(props: {
  checked: boolean
  id: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label class={adminSwitchClass}>
      <ZaidanSwitch {...props} />
    </label>
  )
}

type PageHeaderProps = {
  title: string
  description?: string
  actions?: JSX.Element
  titleId?: string
}

export function PageHeader(props: PageHeaderProps) {
  const generatedTitleId = `admin-page-title-${createUniqueId()}`
  const titleId = () => props.titleId ?? generatedTitleId

  return (
    <header class="flex min-h-16 flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-xl leading-7 font-semibold tracking-[-0.015em] text-balance" id={titleId()}>
          {props.title}
        </h1>
        <Show when={props.description}>
          {description => (
            <p class="mt-1 max-w-[70ch] text-sm leading-5 text-pretty text-muted-foreground">
              {description()}
            </p>
          )}
        </Show>
      </div>
      <Show when={props.actions}>
        <div class="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto [&_.z-button]:flex-1 sm:[&_.z-button]:flex-none">
          {props.actions}
        </div>
      </Show>
    </header>
  )
}

export type AdminSemanticTone = 'information' | 'warning' | 'success' | 'destructive'

const semanticToneClass: Record<AdminSemanticTone, string> = {
  information:
    'border-(--admin-information-border) bg-(--admin-information-surface) text-(--admin-information-foreground)',
  warning:
    'border-(--admin-warning-border) bg-(--admin-warning-surface) text-(--admin-warning-foreground)',
  success:
    'border-(--admin-success-border) bg-(--admin-success-surface) text-(--admin-success-foreground)',
  destructive:
    'border-(--admin-destructive-border) bg-(--admin-destructive-surface) text-destructive',
}

function SemanticIcon(props: { tone: AdminSemanticTone }) {
  return (
    <Switch>
      <Match when={props.tone === 'information'}>
        <InfoCircle aria-hidden="true" />
      </Match>
      <Match when={props.tone === 'warning'}>
        <DangerTriangle aria-hidden="true" />
      </Match>
      <Match when={props.tone === 'success'}>
        <ShieldCheck aria-hidden="true" />
      </Match>
      <Match when={props.tone === 'destructive'}>
        <DangerCircle aria-hidden="true" />
      </Match>
    </Switch>
  )
}

type InlineAlertProps = {
  title: string
  children: JSX.Element
  action?: JSX.Element
  tone?: AdminSemanticTone
}

export function InlineAlert(props: InlineAlertProps) {
  const merged = mergeProps({ tone: 'information' as const }, props)

  return (
    <Alert class={semanticToneClass[merged.tone]}>
      <SemanticIcon tone={merged.tone} />
      <AlertTitle>{merged.title}</AlertTitle>
      <AlertDescription class="text-current!">
        <div>{merged.children}</div>
        <Show when={merged.action}>
          <div class="mt-2 flex flex-wrap items-center gap-1.5">{merged.action}</div>
        </Show>
      </AlertDescription>
    </Alert>
  )
}

export type StatusTone = 'neutral' | AdminSemanticTone

const statusToneClass: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  information:
    'border-(--admin-information-border) bg-(--admin-information-surface) text-(--admin-information-foreground)',
  warning:
    'border-(--admin-warning-border) bg-(--admin-warning-surface) text-(--admin-warning-foreground)',
  success:
    'border-(--admin-success-border) bg-(--admin-success-surface) text-(--admin-success-foreground)',
  destructive:
    'border-(--admin-destructive-border) bg-(--admin-destructive-surface) text-destructive',
}

type StatusBadgeProps = {
  children: JSX.Element
  tone?: StatusTone
}

export function StatusBadge(props: StatusBadgeProps) {
  const merged = mergeProps({ tone: 'neutral' as const }, props)

  return (
    <Badge class={statusToneClass[merged.tone]} variant="outline">
      {merged.children}
    </Badge>
  )
}

type AdminEmptyStateProps = {
  title: string
  description: string
  icon?: JSX.Element
  action?: JSX.Element
}

export function AdminEmptyState(props: AdminEmptyStateProps) {
  return (
    <Empty class="border-y bg-card px-4 py-8! sm:px-5!">
      <EmptyHeader>
        <Show when={props.icon}>
          <EmptyMedia class="mb-0!" variant="icon">
            {props.icon}
          </EmptyMedia>
        </Show>
        <EmptyTitle>{props.title}</EmptyTitle>
        <EmptyDescription class="max-w-xl">{props.description}</EmptyDescription>
      </EmptyHeader>
      <Show when={props.action}>
        <EmptyContent class="mt-1 w-full sm:w-auto [&_.z-button]:w-full sm:[&_.z-button]:w-auto">
          {props.action}
        </EmptyContent>
      </Show>
    </Empty>
  )
}

type RetryStateProps = {
  message: string
  onRetry: () => void
  pending?: boolean
}

export function RetryState(props: RetryStateProps) {
  return (
    <InlineAlert
      action={
        <Button
          class="w-28"
          disabled={props.pending}
          onClick={() => props.onRetry()}
          size="sm"
          type="button"
          variant="outline"
        >
          {props.pending ? <Spinner aria-hidden="true" /> : <Refresh aria-hidden="true" />}
          {props.pending ? 'Дахин ачаалж байна…' : 'Дахин оролдох'}
        </Button>
      }
      title="Мэдээллийг ачаалж чадсангүй"
      tone="destructive"
    >
      {props.message}
    </InlineAlert>
  )
}

export type TableSkeletonColumn = {
  label: string
  class?: string
}

type TableSkeletonProps = {
  columns: readonly TableSkeletonColumn[]
  rows?: number
}

export function TableSkeleton(props: TableSkeletonProps) {
  const rows = () => Array.from({ length: props.rows ?? 5 }, (_, index) => index)

  return (
    <div aria-busy="true" class="bg-card" role="status">
      <span class="sr-only">Хүснэгтийн мэдээллийг ачаалж байна…</span>
      <div class="border-y lg:hidden">
        <For each={rows()}>
          {() => (
            <div class="flex min-h-20 items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <Skeleton class="size-12 shrink-0 rounded-md" />
              <div class="min-w-0 flex-1 space-y-2">
                <Skeleton class="h-4 w-2/3 max-w-48" />
                <Skeleton class="h-3.5 w-1/3 max-w-28" />
              </div>
              <div class="w-16 space-y-2">
                <Skeleton class="ml-auto h-4 w-14" />
                <Skeleton class="ml-auto h-3.5 w-10" />
              </div>
            </div>
          )}
        </For>
      </div>
      <div class="hidden overflow-hidden rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <For each={props.columns}>
                {column => <TableHead class={column.class}>{column.label}</TableHead>}
              </For>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={rows()}>
              {() => (
                <TableRow class="hover:bg-transparent">
                  <For each={props.columns}>
                    {(column, index) => (
                      <TableCell class={column.class}>
                        <Skeleton
                          class={index() === 0 ? 'h-4 w-32 max-w-full' : 'h-4 w-20 max-w-full'}
                        />
                      </TableCell>
                    )}
                  </For>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
