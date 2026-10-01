import { TemplateList } from "@/components/TemplateList";
import { UploadExport } from "@/components/UploadExport";
import { ui } from "@/components/styles";

export default function TemplatesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Templates</h1>
        <p className="mt-2 text-sm text-muted">
          Bring a template across from Spectora, check it arrived intact, then edit it here.
        </p>
      </header>
      <UploadExport />
      <section aria-labelledby="list-heading" className="space-y-5">
        <h2 id="list-heading" className={ui.sectionHeading}>
          Your templates
        </h2>
        <TemplateList />
      </section>
    </main>
  );
}
