"use client";

import { FileText, LogOut, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth";

import { ui } from "./styles";

/**
 * The left rail on every signed-in page: the app, its two destinations, and who is signed in (docs/design.md).
 * Below 1280px it narrows to icons; the labels stay as accessible names and tooltips.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const importing = pathname.startsWith("/upload");
  const email = auth.status === "signed-in" ? auth.session.user.email : undefined;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-line bg-surface xl:w-60">
        <Link href="/" title="Spectora template importer" className={`m-3 flex items-center gap-2.5 rounded-control p-1.5 ${ui.focus}`}>
          <span aria-hidden className="flex size-8 items-center justify-center rounded-control bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="sr-only text-sm font-semibold leading-tight text-ink xl:not-sr-only">
            Spectora
            <br />
            template importer
          </span>
        </Link>
        <nav aria-label="Main" className="flex-1 space-y-1 px-2 py-2 xl:px-3">
          <NavLink href="/templates/" icon={FileText} current={!importing}>
            Templates
          </NavLink>
          <NavLink href="/upload/" icon={Upload} current={importing}>
            Import from Spectora
          </NavLink>
        </nav>
        <div className="border-t border-line p-2 xl:p-4">
          <div className="hidden xl:block">
            <p className="text-xs text-meta">Signed in as</p>
            <p className="truncate text-sm font-medium text-ink" title={email}>
              {email}
            </p>
          </div>
          {auth.status === "signed-in" && (
            <button
              type="button"
              onClick={() => void auth.client.auth.signOut({ scope: "local" })}
              title={`Sign out ${email ?? ""}`.trim()}
              className={`w-full py-2 xl:mt-3 xl:py-1 ${ui.smallButton}`}
            >
              <LogOut aria-hidden className="size-4 xl:size-3.5" />
              <span className="sr-only xl:not-sr-only">Sign out</span>
            </button>
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function NavLink({ href, icon: Icon, current, children }: { href: string; icon: LucideIcon; current: boolean; children: string }) {
  return (
    <Link
      href={href}
      title={children}
      aria-current={current ? "page" : undefined}
      className={`flex items-center justify-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none xl:justify-start xl:py-2 ${ui.focus} ${
        current ? "bg-tint text-accent" : "text-muted hover:bg-page hover:text-ink"
      }`}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="sr-only xl:not-sr-only">{children}</span>
    </Link>
  );
}
