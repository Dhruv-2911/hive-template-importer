"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api";

export function Providers({ children }: { children: ReactNode }) {
  // No refetch on window focus: it would overwrite what the inspector sees while they're editing.
  // One retry for network or server errors; a 4xx (e.g. not found) won't change on a second try.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failures, error) => failures < 1 && !(error instanceof ApiError && error.status < 500 && error.status > 0),
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
