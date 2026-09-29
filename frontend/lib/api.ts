// Empty in production: the API is served from the same origin (ADR-008). In `next dev` it points at uvicorn.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type Health = { status: "ok" | "unavailable" };

export async function getHealth(): Promise<Health> {
  const response = await fetch(`${API_BASE}/api/health`);
  return (await response.json()) as Health;
}
