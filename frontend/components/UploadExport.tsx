"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";

/** Upload a Spectora export. On success, open its import report; on refusal, say why and what to do. */
export function UploadExport() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: api.importFile,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/import/?id=${created.import_run_id}`);
    },
  });
  const error = upload.error instanceof ApiError ? upload.error : undefined;
  const missing = (error?.details.missing_headers as string[] | undefined) ?? [];

  return (
    <section aria-labelledby="upload-heading" className="rounded-md border border-zinc-200 bg-white p-5">
      <h2 id="upload-heading" className="font-semibold text-zinc-900">
        Import from Spectora
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        In Spectora, open the template and choose <strong>Export to spreadsheet → Export HTML Text</strong>. Then
        choose the file it downloads. Nothing is saved unless every comment checks out.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <label className="cursor-pointer rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-700 hover:bg-teal-800">
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
          <p role="status" className="text-sm text-zinc-600">
            Importing and checking every comment…
          </p>
        )}
      </div>
      {upload.isError && (
        <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-medium">This file wasn&apos;t imported.</p>
          <p className="mt-1">{upload.error.message}</p>
          {missing.length > 0 && <p className="mt-1">Missing columns: {missing.join(", ")}.</p>}
        </div>
      )}
    </section>
  );
}
