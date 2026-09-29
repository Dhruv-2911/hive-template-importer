import { readFileSync } from "node:fs";
import path from "node:path";

import type { APIRequestContext } from "@playwright/test";

const REPO = path.resolve(__dirname, "..", "..");

export const COMMERCIAL_EXPORT = path.join(REPO, "InterNACHI Commercial Template-2026-09-28.xls");
export const RESIDENTIAL_EXPORT = path.join(REPO, "InterNACHI Residential -2026-09-28.xls");

/** Upload through the API (faster than the UI) and return what it created or why it refused. */
export async function importViaApi(request: APIRequestContext, file: string | { name: string; buffer: Buffer }) {
  const upload =
    typeof file === "string"
      ? { name: path.basename(file), mimeType: "application/vnd.ms-excel", buffer: readFileSync(file) }
      : { ...file, mimeType: "application/octet-stream" };
  const response = await request.post("/api/imports", { multipart: { file: upload } });
  return { status: response.status(), body: await response.json() };
}
