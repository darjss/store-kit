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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@store-kit/ui'
import { For, Match, Show, Switch, createUniqueId, mergeProps } from 'solid-js'
import type { JSX } from 'solid-js'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: JSX.Element
  titleId?: string
}

export function PageHeader(props: PageHeaderProps) {
  const titleId = props.titleId ?? `admin-page-title-${createUniqueId()}`

  return (
    <header class="flex min-h-14 flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-xl leading-7 font-semibold tracking-[-0.015em] text-balance" id={titleId}>
          {props.title}
        </h1>
        <Show when={props.description}>
          {description => (
            <p class="mt-0.5 max-w-[70ch] text-[13px] leading-[1.4] text-pretty text-muted-foreground">
              {description()}
            </p>
          )}
        </Show>
      </div>
      <Show when={props.actions}>
        <div class="flex shrink-0 flex-wrap items-center gap-1.5">{props.actions}</div>
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
    <Empty class="border-0 bg-card px-4 py-5! sm:px-5!">
      <EmptyHeader>
        <Show when={props.icon}>
          <EmptyMedia class="mb-0!" variant="icon">
            {props.icon}
          </EmptyMedia>
        </Show>
        <EmptyTitle class="text-sm">{props.title}</EmptyTitle>
        <EmptyDescription class="max-w-xl">{props.description}</EmptyDescription>
      </EmptyHeader>
      <Show when={props.action}>
        <EmptyContent class="mt-1">{props.action}</EmptyContent>
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
          {props.pending ? 'Retrying…' : 'Retry'}
        </Button>
      }
      title="Could not load this content"
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
    <div aria-busy="true" class="overflow-hidden rounded-lg border bg-card" role="status">
      <span class="sr-only">Loading table data…</span>
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
  )
}
