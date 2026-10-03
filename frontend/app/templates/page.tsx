import { Upload } from "lucide-react";
import Link from "next/link";

import { TemplateList } from "@/components/TemplateList";
import { ui } from "@/components/styles";

export default function TemplatesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={ui.pageTitle}>Templates</h1>
          <p className="mt-1 text-sm text-muted">
            Templates brought across from Spectora. Open one to check what came across and edit it.
          </p>
        </div>
        <Link href="/upload/" className={ui.primary}>
          <Upload aria-hidden className="size-4" />
          Import from Spectora
        </Link>
      </header>
      <section aria-label="Your templates" className="mt-6">
        <TemplateList />
      </section>
    </main>
  );
}
