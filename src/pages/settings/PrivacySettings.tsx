
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PrivacyControls } from "@/components/settings/PrivacyControls";

export default function PrivacySettings() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center mb-6 gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Privacidad</h1>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Configuración de privacidad</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Controla quién puede ver tu información y cómo se muestra tu perfil.
          </p>
          <PrivacyControls />
        </div>
      </div>
    </div>
  );
}
