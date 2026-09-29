import type { NextConfig } from "next";

// Static export served by FastAPI from the same origin (ADR-008). trailingSlash makes the export write
// template/index.html, which FastAPI's StaticFiles(html=True) serves at /template/.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
