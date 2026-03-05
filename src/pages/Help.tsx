import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";

export default function Help() {
  return (
    <FullScreenPageLayout title="Ayuda">
      <div className="w-full px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-foreground">Centro de ayuda</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Próximamente.
          </p>
        </div>
      </div>
    </FullScreenPageLayout>
  );
}
