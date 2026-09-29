import { Suspense } from "react";

import { ImportScreen } from "@/components/ImportScreen";

export default function ImportPage() {
  return (
    <Suspense>
      <ImportScreen />
    </Suspense>
  );
}
