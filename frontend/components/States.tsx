import Link from "next/link";
import type { ReactNode } from "react";

import { ui } from "./styles";

export function PageMessage({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-24" role="status">
      <div className={`p-8 ${ui.card}`}>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <div className="mt-2 text-sm text-muted">{children}</div>
        {action && <div className="mt-6 flex gap-3">{action}</div>}
      </div>
    </main>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={ui.button}>
      {children}
    </Link>
  );
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button type="button" onClick={onRetry} className={ui.primary}>
      Try again
    </button>
  );
}

export function TemplateSkeleton() {
  return (
    <div className="flex h-screen flex-col" aria-busy="true" aria-label="Loading the template">
      <div className="flex items-center gap-4 border-b border-line bg-surface px-6 py-3">
        <div className="h-9 w-96 animate-pulse rounded-control bg-page" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-80 space-y-3 border-r border-line bg-surface p-5">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-6 animate-pulse rounded-control bg-page" />
          ))}
        </div>
        <div className="flex-1 space-y-5 px-10 py-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`h-28 animate-pulse ${ui.card}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
