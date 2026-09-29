import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spectora template importer",
  description: "Import a Spectora template export, check it came across intact, and edit it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
