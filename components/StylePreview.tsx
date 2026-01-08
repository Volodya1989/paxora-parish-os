import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function StylePreview() {
  return (
    <div className="page-padding py-8">
      <div className="section-gap">
        <section className="space-y-3">
          <p className="text-caption uppercase tracking-wide text-ink-500">Typography</p>
          <h1 className="text-h1">Heading One</h1>
          <h2 className="text-h2">Heading Two</h2>
          <h3 className="text-h3">Heading Three</h3>
          <p className="text-body">
            Body text shows the default paragraph style for calm, readable copy.
          </p>
          <p className="text-caption">Caption text for secondary hints.</p>
        </section>

        <section className="space-y-3">
          <p className="text-caption uppercase tracking-wide text-ink-500">Buttons</p>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-caption uppercase tracking-wide text-ink-500">Card</p>
          <Card>
            <h3 className="text-h3">Card Title</h3>
            <p className="text-body mt-2">
              Cards use the Direction A radius, shadow, and neutral borders.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
