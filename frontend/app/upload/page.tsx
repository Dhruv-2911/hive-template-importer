import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { UploadExport } from "@/components/UploadExport";
import { ui } from "@/components/styles";

export default function UploadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-8">
      <Link href="/templates/" className={`inline-flex items-center gap-1.5 text-sm ${ui.link}`}>
        <ArrowLeft aria-hidden className="size-4" />
        Back to Templates
      </Link>
      <h1 className={`mt-3 ${ui.pageTitle}`}>Import from Spectora</h1>
      <p className="mt-1 text-sm text-muted">
        Bring a template across from Spectora, check it arrived intact, then edit it here.
      </p>
      <UploadExport />
    </main>
  );
}
