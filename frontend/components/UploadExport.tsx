"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";

import { ApiError, api } from "@/lib/api";

import { ui } from "./styles";

const STEPS = [
  "In Spectora, open the template you want to bring across.",
  "Choose Export to spreadsheet → Export HTML Text.",
  "Choose the file it downloads below, or drop it here.",
];

/** Upload a Spectora export. On success, open its import report; on refusal, say why and what to do. */
export function UploadExport() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const upload = useMutation({
    mutationFn: api.importFile,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/import/?id=${created.import_run_id}`);
    },
  });
  const error = upload.error instanceof ApiError ? upload.error : undefined;
  const missing = (error?.details.missing_headers as string[] | undefined) ?? [];

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !upload.isPending) upload.mutate(file);
  }

  return (
    <section aria-labelledby="upload-heading" className={`mt-6 p-6 ${ui.card}`}>
      <h2 id="upload-heading" className={ui.sectionHeading}>
        Export it from Spectora, then choose the file
      </h2>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`mt-5 flex flex-col items-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors motion-reduce:transition-none ${
          dragging ? "border-accent bg-tint" : "border-line bg-page"
        }`}
      >
        <FileSpreadsheet aria-hidden className="size-8 text-meta" />
        <p className="mt-3 text-sm text-muted">Spectora names the file .xls. Either .xls or .xlsx works.</p>
        <label className={`mt-4 ${ui.primary} ${ui.focusWithin} has-disabled:cursor-wait has-disabled:opacity-60`}>
          Choose export file…
          <input
            type="file"
            accept=".xls,.xlsx"
            aria-label="Choose a Spectora export"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = ""; // choosing the same file again should upload it again
              if (file) upload.mutate(file);
            }}
          />
        </label>
        {upload.isPending && (
          <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent" />
            Importing and checking every comment…
          </p>
        )}
      </div>
      <p className="mt-3 text-xs text-meta">Nothing is saved unless every comment checks out.</p>
      {upload.isError && (
        <div role="alert" className="mt-4 rounded-control border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-ink">
          <p className="font-semibold text-danger">This file wasn&apos;t imported.</p>
          <p className="mt-1">{upload.error.message}</p>
          {missing.length > 0 && <p className="mt-1">Missing columns: {missing.join(", ")}.</p>}
        </div>
      )}
    </section>
  );
}
