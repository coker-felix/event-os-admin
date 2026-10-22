import { useState } from 'react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { ArrowClockwise, Bug, Check, Copy, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function getErrorDetails(error: unknown) {
  const candidate = error && typeof error === 'object' ? error as {
    message?: unknown
    stack?: unknown
    code?: unknown
    status?: unknown
    statusCode?: unknown
    digest?: unknown
  } : {}

  for (const value of [candidate.code, candidate.statusCode, candidate.status, candidate.digest]) {
    if (typeof value === 'string' && value.trim()) return {
      code: value.trim(),
      message: typeof candidate.message === 'string' ? candidate.message : 'An unexpected error occurred.',
      stack: typeof candidate.stack === 'string' ? candidate.stack : undefined,
    }
    if (typeof value === 'number' && Number.isFinite(value)) return {
      code: String(value),
      message: typeof candidate.message === 'string' ? candidate.message : 'An unexpected error occurred.',
      stack: typeof candidate.stack === 'string' ? candidate.stack : undefined,
    }
  }

  return {
    code: 'UNHANDLED_ERROR',
    message: typeof candidate.message === 'string' ? candidate.message : 'An unexpected error occurred.',
    stack: typeof candidate.stack === 'string' ? candidate.stack : undefined,
  }
}

export function AppErrorBoundary({ error, reset }: ErrorComponentProps) {
  if (import.meta.env.PROD) {
    return <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
              <WarningCircle aria-hidden="true" size={20} />
            </span>
            <CardTitle className="text-lg">Something went wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-muted">We couldn’t display this page. Please try again.</p>
          <div className="flex justify-end">
            <Button type="button" onClick={reset}>
              <ArrowClockwise aria-hidden="true" size={16} />
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  }

  return <DevelopmentError error={error} reset={reset} />
}

function DevelopmentError({ error, reset }: ErrorComponentProps) {
  const [copied, setCopied] = useState(false)
  const [copiedDetails, setCopiedDetails] = useState(false)
  const { code, message, stack } = getErrorDetails(error)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function copyTechnicalDetails() {
    if (!stack) return
    try {
      await navigator.clipboard.writeText(stack)
      setCopiedDetails(true)
      window.setTimeout(() => setCopiedDetails(false), 1800)
    } catch {
      setCopiedDetails(false)
    }
  }

  return <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
            <Bug aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Development error</p>
            <CardTitle className="mt-1 text-lg">This page could not be rendered</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-ink-muted">Use this error code when reporting the issue. The details below are available in development only.</p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">Error code</p>
            <code className="mt-1 block break-all font-mono text-sm font-semibold">{code}</code>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyCode()} aria-label={copied ? 'Error code copied' : 'Copy error code'}>
            {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
            {copied ? 'Copied' : 'Copy code'}
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger-soft/40 p-4">
          <div className="flex items-start gap-2 text-sm font-medium text-danger">
            <WarningCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
            <span className="break-words">{message}</span>
          </div>
          {stack && <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-ink-muted">Technical details</summary>
            <div className="mt-2 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyTechnicalDetails()} aria-label={copiedDetails ? 'Technical details copied' : 'Copy technical details'}>
                {copiedDetails ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                {copiedDetails ? 'Copied' : 'Copy details'}
              </Button>
            </div>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background/70 p-3 font-mono text-xs text-foreground">{stack}</pre>
          </details>}
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={reset}>
            <ArrowClockwise aria-hidden="true" size={16} />
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  </main>
}
