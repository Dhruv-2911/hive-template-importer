"use client";

import { useEffect, useState } from "react";

import { getHealth } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState("checking…");

  useEffect(() => {
    getHealth()
      .then((health) => setStatus(health.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Spectora template importer</h1>
      <p className="mt-4">
        API status: <span data-testid="api-status">{status}</span>
      </p>
    </main>
  );
}
