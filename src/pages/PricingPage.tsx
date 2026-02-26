import { Button } from '@/components/ui/button';

export default function PricingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-3">
        <h1 className="text-2xl font-bold">Premium no disponible</h1>
        <p className="text-sm text-muted-foreground">
          El sistema de suscripciones/premium fue descartado y esta sección fue deshabilitada.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Volver
        </Button>
      </div>
    </div>
  );
}
