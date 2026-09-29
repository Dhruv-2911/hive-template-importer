import type { components } from "./api-types";

// Empty in production: the API is served from the same origin (ADR-008). In `next dev` it points at uvicorn.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type Schemas = components["schemas"];
export type TemplateSummary = Schemas["TemplateSummary"];
export type TemplateTree = Schemas["TemplateTree"];
export type Section = Schemas["SectionOut"];
export type Item = Schemas["ItemOut"];
export type Comment = Schemas["CommentOut"];
export type ImportCreated = Schemas["ImportCreated"];
export type ImportRun = Schemas["ImportRunOut"];
export type ImportReport = Schemas["ImportReport"];
export type Notice = Schemas["Notice"];
export type Named = Schemas["NamedOut"];
export type CommentChange = Schemas["CommentChange"];
export type Health = { status: "ok" | "unavailable" };

/** The API's error shape: {"error": {"code", "message", "details"}}. The message is written for the inspector. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(0, "NETWORK", "Couldn't reach the server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNEXPECTED",
      error?.message ?? "Something went wrong on the server. Try again in a moment.",
      error?.details ?? {},
    );
  }
  return body as T;
}

function patch(body: unknown): RequestInit {
  return { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const api = {
  health: () => request<Health>("/api/health"),
  listTemplates: () => request<TemplateSummary[]>("/api/templates"),
  getTemplate: (id: string) => request<TemplateTree>(`/api/templates/${encodeURIComponent(id)}`),
  importFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ImportCreated>("/api/imports", { method: "POST", body: form });
  },
  getImport: (id: string) => request<ImportRun>(`/api/imports/${encodeURIComponent(id)}`),
  importFileUrl: (id: string) => `${API_BASE}/api/imports/${encodeURIComponent(id)}/file`,
  renameTemplate: (id: string, name: string) => request<Named>(`/api/templates/${id}`, patch({ name })),
  renameSection: (id: string, name: string) => request<Named>(`/api/sections/${id}`, patch({ name })),
  renameItem: (id: string, name: string) => request<Named>(`/api/items/${id}`, patch({ name })),
  editComment: (id: string, change: CommentChange) => request<Comment>(`/api/comments/${id}`, patch(change)),
};
