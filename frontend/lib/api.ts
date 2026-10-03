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
export type DuplicateCreated = Schemas["DuplicateCreated"];
export type AuthConfig = Schemas["AuthConfig"];
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

// Set once the sign-in client exists (lib/auth.tsx). Every data route needs the signed-in user's token (ADR-009).
type AuthHooks = { token: () => Promise<string | undefined>; onUnauthorized: () => void };
let auth: AuthHooks | undefined;

export function configureApiAuth(hooks: AuthHooks) {
  auth = hooks;
}

async function send(path: string, init?: RequestInit, signedIn = true): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = signedIn ? await auth?.token() : undefined;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK", "Couldn't reach the server. Check your connection and try again.");
  }
  // The session ended or was revoked: sign out here too, which sends the browser to the sign-in page.
  if (response.status === 401 && signedIn) auth?.onUnauthorized();
  if (!response.ok) {
    const error = (await response.json().catch(() => null))?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNEXPECTED",
      error?.message ?? "Something went wrong on the server. Try again in a moment.",
      error?.details ?? {},
    );
  }
  return response;
}

async function request<T>(path: string, init?: RequestInit, signedIn = true): Promise<T> {
  const response = await send(path, init, signedIn);
  return (await response.json().catch(() => null)) as T;
}

/** A link can't carry the token, so the file is fetched with it and saved from memory. */
async function download(path: string, filename: string) {
  const blob = await (await send(path)).blob();
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function patch(body: unknown): RequestInit {
  return { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const api = {
  health: () => request<Health>("/api/health", undefined, false),
  authConfig: () => request<AuthConfig>("/api/auth/config", undefined, false),
  listTemplates: () => request<TemplateSummary[]>("/api/templates"),
  getTemplate: (id: string) => request<TemplateTree>(`/api/templates/${encodeURIComponent(id)}`),
  importFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ImportCreated>("/api/imports", { method: "POST", body: form });
  },
  getImport: (id: string) => request<ImportRun>(`/api/imports/${encodeURIComponent(id)}`),
  downloadImportFile: (id: string, filename: string) => download(`/api/imports/${encodeURIComponent(id)}/file`, filename),
  duplicateTemplate: (id: string) => request<DuplicateCreated>(`/api/templates/${id}/duplicate`, { method: "POST" }),
  renameTemplate: (id: string, name: string) => request<Named>(`/api/templates/${id}`, patch({ name })),
  renameSection: (id: string, name: string) => request<Named>(`/api/sections/${id}`, patch({ name })),
  renameItem: (id: string, name: string) => request<Named>(`/api/items/${id}`, patch({ name })),
  editComment: (id: string, change: CommentChange) => request<Comment>(`/api/comments/${id}`, patch(change)),
};
