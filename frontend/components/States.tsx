import Link from "next/link";
import type { ReactNode } from "react";

export function PageMessage({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24" role="status">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      <div className="mt-2 text-sm text-zinc-600">{children}</div>
      {action && <div className="mt-6 flex gap-3">{action}</div>}
    </main>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      {children}
    </Link>
  );
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      Try again
    </button>
  );
}

export function TemplateSkeleton() {
  return (
    <div className="flex h-screen flex-col" aria-busy="true" aria-label="Loading the template">
      <div className="h-20 border-b border-zinc-200 bg-white" />
      <div className="flex flex-1">
        <div className="w-80 space-y-2 border-r border-zinc-200 bg-zinc-50 p-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-zinc-200" />
          ))}
        </div>
        <div className="flex-1 space-y-4 p-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-zinc-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
