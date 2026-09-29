import { Suspense } from "react";

import { TemplateScreen } from "@/components/TemplateScreen";
import { TemplateSkeleton } from "@/components/States";

// The id comes from the query string (static export, ADR-008), which is only known in the browser.
export default function TemplatePage() {
  return (
    <Suspense fallback={<TemplateSkeleton />}>
      <TemplateScreen />
    </Suspense>
  );
}
