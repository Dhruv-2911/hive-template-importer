"use client";

import { FileText, LogOut, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth";

import { ui } from "./styles";

/** The left rail on every signed-in page: the app, its two destinations, and who is signed in (docs/design.md). */
export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const importing = pathname.startsWith("/upload");
  const email = auth.status === "signed-in" ? auth.session.user.email : undefined;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
        <Link href="/" className={`m-3 flex items-center gap-2.5 rounded-control p-1.5 ${ui.focus}`}>
          <span aria-hidden className="flex size-8 items-center justify-center rounded-control bg-accent text-sm font-bold text-white">
            S
          </span>
          <span className="text-sm font-semibold leading-tight text-ink">
            Spectora
            <br />
            template importer
          </span>
        </Link>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-2">
          <NavLink href="/templates/" icon={FileText} current={!importing}>
            Templates
          </NavLink>
          <NavLink href="/upload/" icon={Upload} current={importing}>
            Import from Spectora
          </NavLink>
        </nav>
        <div className="border-t border-line p-4">
          <p className="text-xs text-meta">Signed in as</p>
          <p className="truncate text-sm font-medium text-ink" title={email}>
            {email}
          </p>
          {auth.status === "signed-in" && (
            <button
              type="button"
              onClick={() => void auth.client.auth.signOut({ scope: "local" })}
              className={`mt-3 w-full ${ui.smallButton}`}
            >
              <LogOut aria-hidden className="size-3.5" />
              Sign out
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
      aria-current={current ? "page" : undefined}
      className={`flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${ui.focus} ${
        current ? "bg-tint text-accent" : "text-muted hover:bg-page hover:text-ink"
      }`}
    >
      <Icon aria-hidden className="size-4" />
      {children}
    </Link>
  );
}
