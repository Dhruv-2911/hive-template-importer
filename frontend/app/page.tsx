"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LinkButton, PageMessage, RetryButton } from "@/components/States";
import { api } from "@/lib/api";

/** The live app opens on the sample template (SPEC.md US7). */
export default function Home() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["templates"], queryFn: api.listTemplates });
  const sample = query.data?.find((template) => template.is_sample);

  useEffect(() => {
    if (sample) router.replace(`/template/?id=${sample.id}`);
    else if (query.data) router.replace("/templates/");
  }, [sample, query.data, router]);

  if (query.isError) {
    return (
      <PageMessage
        title="The templates couldn't be loaded"
        action={
          <>
            <RetryButton onRetry={() => query.refetch()} />
            <LinkButton href="/templates/">See all templates</LinkButton>
          </>
        }
      >
        {query.error.message}
      </PageMessage>
    );
  }
  return <PageMessage title="Opening the sample template…">Loading the imported Spectora template.</PageMessage>;
}
