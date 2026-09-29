import { TemplateList } from "@/components/TemplateList";
import { UploadExport } from "@/components/UploadExport";

export default function TemplatesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Templates</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Bring a template across from Spectora, check it arrived intact, then edit it here.
        </p>
      </header>
      <UploadExport />
      <section aria-labelledby="list-heading" className="space-y-3">
        <h2 id="list-heading" className="font-semibold text-zinc-900">
          Your templates
        </h2>
        <TemplateList />
      </section>
    </main>
  );
}
