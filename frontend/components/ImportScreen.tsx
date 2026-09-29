"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ApiError, api } from "@/lib/api";

import { LinkButton, PageMessage, RetryButton } from "./States";

export function ImportScreen() {
  const id = useSearchParams().get("id");
  const query = useQuery({ queryKey: ["import", id], queryFn: () => api.getImport(id!), enabled: !!id });

  if (!id || (query.error instanceof ApiError && query.error.code === "NOT_FOUND")) {
    return (
      <PageMessage title="This import doesn't exist" action={<LinkButton href="/templates/">See all templates</LinkButton>}>
        It may have been deleted, or the link is incomplete.
      </PageMessage>
    );
  }
  if (query.isPending) return <PageMessage title="Loading the import report…">One moment.</PageMessage>;
  if (query.isError) {
    return (
      <PageMessage title="The import report couldn't be loaded" action={<RetryButton onRetry={() => query.refetch()} />}>
        {query.error.message}
      </PageMessage>
    );
  }

  const run = query.data;
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <header>
        <Link href="/templates/" className="text-sm text-teal-700 hover:underline">
          Templates
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Import report</h1>
        <p className="mt-1 text-sm text-zinc-600">{run.filename}</p>
      </header>
      <p className="text-sm text-zinc-700">{run.status === "succeeded" ? "Imported." : run.error?.message}</p>
    </main>
  );
}
