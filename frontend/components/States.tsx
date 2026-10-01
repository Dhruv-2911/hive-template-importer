import Link from "next/link";
import type { ReactNode } from "react";

import { ui } from "./styles";

export function PageMessage({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-24" role="status">
      <div className={`p-8 ${ui.card}`}>
        <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
        <div className="mt-2 text-sm text-muted">{children}</div>
        {action && <div className="mt-6 flex gap-4">{action}</div>}
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
      <div className="space-y-2 px-6 pb-5 pt-4">
        <div className="h-4 w-24 animate-pulse rounded-full neu-pressed-sm" />
        <div className="h-7 w-96 animate-pulse rounded-full neu-pressed-sm" />
      </div>
      <div className="flex min-h-0 flex-1 gap-8 pb-6 pl-6 pr-8">
        <div className={`w-80 space-y-3 p-5 ${ui.card}`}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-6 animate-pulse rounded-control neu-pressed-sm" />
          ))}
        </div>
        <div className="flex-1 space-y-5 pt-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`h-28 animate-pulse ${ui.card}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
